#!/usr/bin/env python3
"""Deploy only Haomeile to the existing Singapore host; never replace other sites."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shlex
import stat
import time
import paramiko

HOST = '188.239.17.169'
KEY = Path.home() / '.ssh/haomeile-deploy-sg'
ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / 'artifacts/private'
BEGIN, END = '# BEGIN HAOMEILE MANAGED SITE', '# END HAOMEILE MANAGED SITE'


def execute(client, command):
    _, out, err = client.exec_command(command, timeout=40)
    result = out.read().decode()
    code = out.channel.recv_exit_status()
    if code:
        # Existing Caddy configuration may contain private subscription paths.
        # Never print arbitrary command errors or full configuration bodies.
        raise RuntimeError(f'Remote step failed with exit code {code}')
    return result


def upload(sftp, source, target, mode=0o644):
    temp = target + '.haomeile-incoming'
    sftp.put(str(source), temp)
    sftp.chmod(temp, mode)
    sftp.posix_rename(temp, target)


def install_app(client, sftp, archive):
    version = archive.name.removesuffix('.tar.gz')
    if not re.fullmatch(r'\d{14}-[a-f0-9]{7,40}', version):
        raise RuntimeError('Invalid release archive name')
    base = '/opt/haomeile'
    release = base + '/releases/' + version
    execute(client, "getent passwd haomeile >/dev/null || useradd --system --home-dir /var/lib/haomeile --no-create-home --shell /usr/sbin/nologin haomeile")
    execute(client, 'install -d -m 0755 /opt/haomeile/releases; install -d -m 0750 /etc/haomeile; install -d -m 0700 -o haomeile -g haomeile /var/lib/haomeile /var/backups/haomeile')
    remote_archive = base + '/releases/' + archive.name
    sftp.put(str(archive), remote_archive)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    actual = execute(client, 'sha256sum ' + shlex.quote(remote_archive)).split()[0]
    if actual != digest:
        raise RuntimeError('Uploaded release checksum mismatch')
    # Back up an existing database before switching code or running new migrations.
    execute(client, "python3 - <<'PY'\nimport sqlite3,pathlib,os,datetime\np=pathlib.Path('/var/lib/haomeile/haomeile.sqlite')\nif p.exists():\n out='/var/backups/haomeile/before-release-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')+'.sqlite'\n with sqlite3.connect(str(p)) as source,sqlite3.connect(out) as target:source.backup(target)\n os.chmod(out,0o600)\nPY")
    execute(client, 'install -d -m 0755 ' + shlex.quote(release) + '; tar -xzf ' + shlex.quote(remote_archive) + ' -C ' + shlex.quote(release) + '; chmod 0755 ' + shlex.quote(release + '/haomeile-server'))
    env_path = '/etc/haomeile/haomeile.env'
    try:
        sftp.stat(env_path)
        initialized = True
    except FileNotFoundError:
        initialized = False
    if not initialized:
        upload(sftp, PRIVATE / 'haomeile.env', env_path, 0o600)
    else:
        # Update release labels only; preserve every existing production secret.
        with sftp.open(env_path, 'r') as source:
            existing_env = source.read().decode()
        release_metadata = json.loads((archive.parent / version / 'release.json').read_text())
        updated_env = re.sub(r'^(?:APP_VERSION|BUILD_TIMESTAMP)=.*\n?', '', existing_env, flags=re.MULTILINE)
        updated_env = updated_env.rstrip('\n') + '\nAPP_VERSION=' + json.dumps(version) + '\nBUILD_TIMESTAMP=' + json.dumps(release_metadata['builtAt']) + '\n'
        pending_env = env_path + '.metadata-pending'
        with sftp.open(pending_env, 'w') as target:
            target.write(updated_env)
        sftp.chmod(pending_env, 0o600)
        sftp.posix_rename(pending_env, env_path)
    for name in ['haomeile.service', 'haomeile-maintenance.service', 'haomeile-maintenance.timer']:
        upload(sftp, ROOT / 'ops/systemd' / name, '/etc/systemd/system/' + name)
    previous = execute(client, 'readlink -f /opt/haomeile/current 2>/dev/null || true').strip()
    execute(client, 'ln -s ' + shlex.quote(release) + ' /opt/haomeile/current.next; mv -Tf /opt/haomeile/current.next /opt/haomeile/current; systemctl daemon-reload; systemctl enable haomeile.service haomeile-maintenance.timer; systemctl start haomeile-maintenance.timer; systemctl restart haomeile.service')
    healthy = False
    for _ in range(15):
        _, out, _ = client.exec_command('curl --fail --silent --max-time 3 http://127.0.0.1:8788/api/health')
        body = out.read().decode()
        if out.channel.recv_exit_status() == 0:
            try:
                healthy = json.loads(body).get('ok') is True
            except ValueError:
                pass
            if healthy:
                break
        time.sleep(1)
    if not healthy:
        if initialized:
            with sftp.open(env_path + '.metadata-rollback', 'w') as target:
                target.write(existing_env)
            sftp.chmod(env_path + '.metadata-rollback', 0o600)
            sftp.posix_rename(env_path + '.metadata-rollback', env_path)
        if previous and previous != '/opt/haomeile/current':
            execute(client, 'ln -s ' + shlex.quote(previous) + ' /opt/haomeile/current.rollback; mv -Tf /opt/haomeile/current.rollback /opt/haomeile/current; systemctl restart haomeile.service')
        raise RuntimeError('Application health check failed; previous release restored when available')
    return {'release': version, 'archiveSha256': digest, 'previousRelease': previous, 'healthy': True}


def configure_caddy(client, sftp, phase):
    path = '/etc/caddy/Caddyfile'
    metadata = sftp.stat(path)
    with sftp.open(path, 'rb') as source:
        previous = source.read()
    if BEGIN.encode() not in previous:
        if b'haomeile.rip' in previous:
            raise RuntimeError('Domain already exists outside the managed site block')
        baseline = previous
    else:
        baseline = re.sub(rb'\n?' + re.escape(BEGIN.encode()) + rb'[\s\S]*?' + re.escape(END.encode()) + rb'\n?', b'', previous)
    if phase == 'http':
        block = '''http://haomeile.rip {
    log {
        output discard
    }
    handle /api/health {
        reverse_proxy 127.0.0.1:8788 {
            header_up -CF-Connecting-IP
            header_up X-Haomeile-Client-IP {remote_host}
        }
    }
    handle {
        respond "HTTPS deployment in progress" 503
    }
}'''
    else:
        block = (ROOT / 'ops/Caddyfile.haomeile').read_text().split('\n', 1)[1].strip()
    updated = baseline + (b'' if baseline.endswith(b'\n') else b'\n') + b'\n' + BEGIN.encode() + b'\n' + block.encode() + b'\n' + END.encode() + b'\n'
    backup = path + '.before-haomeile-' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    with sftp.open(backup, 'wb') as out:
        out.write(previous)
    sftp.chmod(backup, 0o600)
    pending = path + '.haomeile-pending'
    with sftp.open(pending, 'wb') as out:
        out.write(updated)
    sftp.chmod(pending, stat.S_IMODE(metadata.st_mode))
    sftp.chown(pending, metadata.st_uid, metadata.st_gid)
    execute(client, 'caddy validate --config ' + shlex.quote(pending) + ' --adapter caddyfile >/dev/null 2>&1')
    sftp.posix_rename(pending, path)
    try:
        execute(client, 'systemctl reload caddy')
    except Exception:
        with sftp.open(path, 'wb') as out:
            out.write(previous)
        sftp.chmod(path, stat.S_IMODE(metadata.st_mode))
        sftp.chown(path, metadata.st_uid, metadata.st_gid)
        execute(client, 'systemctl reload caddy')
        raise
    return {'phase': phase, 'originalSitesPreserved': True, 'beforeSha256': hashlib.sha256(previous).hexdigest(), 'afterSha256': hashlib.sha256(updated).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['app', 'http', 'https'])
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    if args.phase == 'app' and (not args.archive or not args.archive.is_file()):
        parser.error('app phase requires a prepared release archive')
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    client.connect(HOST, username='root', key_filename=str(KEY), look_for_keys=False, allow_agent=False, timeout=10)
    try:
        with client.open_sftp() as sftp:
            receipt = install_app(client, sftp, args.archive) if args.phase == 'app' else configure_caddy(client, sftp, args.phase)
            receipt.update({'phase': args.phase, 'observedAt': datetime.now(timezone.utc).isoformat(), 'hostRegion': 'Singapore'})
            PRIVATE.mkdir(parents=True, exist_ok=True)
            file = PRIVATE / ('deployment-' + args.phase + '.json')
            file.write_text(json.dumps(receipt, indent=2) + '\n')
            file.chmod(0o600)
            print(json.dumps(receipt))
    finally:
        client.close()


if __name__ == '__main__':
    main()
