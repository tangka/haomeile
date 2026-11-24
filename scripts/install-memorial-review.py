#!/usr/bin/env python3
"""Install the published Haomeile review worker as one per-user macOS LaunchAgent."""
import argparse
from contextlib import suppress
import fcntl
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
LABEL = 'rip.haomeile.memorial-review'
FILES = ('memorial-review-worker.mjs', 'feishu-review-transport.mjs', 'judge-memorial.mjs')
SUPPORT = Path.home() / 'Library/Application Support/haomeile-review'
PLIST = Path.home() / 'Library/LaunchAgents' / (LABEL + '.plist')
CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'


def run(*args):
    proc = subprocess.run(args, cwd=ROOT, capture_output=True)
    if proc.returncode:
        # The command output might contain an account identity or credentials.
        raise RuntimeError(f'{Path(str(args[0])).name} {args[1]} failed ({proc.returncode})')
    return proc.stdout


def source_files():
    url = run('git', 'remote', 'get-url', 'origin').decode().strip()
    if not re.fullmatch(r'(https://github\.com/|(ssh://)?git@github\.com[:/])tangka/haomeile(?:\.git)?', url):
        raise ValueError('Expected origin tangka/haomeile')
    run('git', 'fetch', '--quiet', '--no-tags', 'origin', 'refs/heads/main:refs/remotes/origin/main')
    rev = run('git', 'rev-parse', 'refs/remotes/origin/main^{commit}').decode().strip()
    files = {}
    for name in FILES:
        try:
            files[name] = run('git', 'show', rev + ':scripts/' + name)
        except RuntimeError:
            raise ValueError(f'{name} is missing from published main {rev[:12]}') from None
    return rev, files


def binary(name):
    path = shutil.which(name)
    if not path:
        raise ValueError(f'Missing executable: {name}')
    return os.path.abspath(path)


def identity(cli, profile=None):
    args = ['--profile', profile] if profile else []
    result = json.loads(run(cli, *args, 'auth', 'status', '--json'))
    user = result.get('identities', {}).get('user', {})
    if (result.get('brand') != 'feishu' or not re.fullmatch(r'cli_[a-zA-Z0-9]+', result.get('appId', ''))
            or not re.fullmatch(r'ou_[a-zA-Z0-9]+', user.get('openId') or '')):
        raise ValueError('Expected the site owner’s existing Feishu app and user login')
    return result['appId'], user['openId']


def check_private(path):
    info = path.stat()
    if path.is_symlink() or info.st_uid != os.getuid() or (info.st_mode & 0o077):
        raise ValueError(f'Expected private owner-only permissions on {path.name}')


def config_for(args, cli):
    credentials = ROOT / 'artifacts/private/haomeile-admin.txt'
    check_private(credentials)
    if not credentials.is_file():
        raise ValueError('Missing local administrator credentials')
    path = SUPPORT / 'config.json'
    prior = None
    if path.exists():
        check_private(path)
        prior = json.loads(path.read_bytes())['feishu']
        if args.profile and args.profile != prior['profile']:
            raise ValueError('Refusing to change the registered moderator profile')
    elif not args.bind_current_user:
        raise ValueError('First install requires --bind-current-user')
    profile = prior['profile'] if prior else (args.profile or identity(cli)[0])
    app, user = identity(cli, profile)
    if prior and (prior['appId'], prior['reviewerOpenId']) != (app, user):
        raise ValueError('The Feishu app or moderator changed; existing binding preserved')
    return {'credentialsPath': str(credentials), 'feishu': {
        'profile': profile, 'cli': cli, 'appId': app, 'reviewerOpenId': user}}


def agent_spec(release, node, cli, codex):
    path = list(dict.fromkeys([str(Path(x).parent) for x in (node, cli, codex)] +
                              ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin']))
    env = {'HOME': str(Path.home()), 'PATH': ':'.join(path), 'HAOMEILE_CODEX_BIN': codex,
           'HAOMEILE_REVIEW_STATE': str(SUPPORT)}
    for key in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'):
        if key in os.environ:
            value = urlsplit(os.environ[key])
            if value.hostname in ('127.0.0.1', '::1', 'localhost') and not (value.username or value.password):
                env[key] = os.environ[key]
    for key in ('NO_PROXY', 'no_proxy'):
        if key in os.environ:
            env[key] = os.environ[key]
    return {'Label': LABEL, 'ProgramArguments': [node, str(release / FILES[0])],
            'WorkingDirectory': str(SUPPORT), 'EnvironmentVariables': env, 'RunAtLoad': True,
            'KeepAlive': True, 'ThrottleInterval': 15, 'Umask': 0o077,
            'StandardOutPath': str(SUPPORT / 'worker.log'), 'StandardErrorPath': str(SUPPORT / 'worker.err')}


def write_atomic(path, data):
    if data is None:
        path.unlink(missing_ok=True)
        return
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        tmp = Path(f.name)
        try:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)


def install(release, files, config, spec):
    base = 'gui/' + str(os.getuid())
    target = base + '/' + LABEL
    SUPPORT.mkdir(mode=0o700, parents=True, exist_ok=True)
    check_private(SUPPORT)
    with (SUPPORT / 'install.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        config_path = SUPPORT / 'config.json'
        # Another installer may have bound a recipient during preflight.
        if config_path.exists():
            current = json.loads(config_path.read_bytes())['feishu']
            if any(current[k] != config['feishu'][k] for k in ('profile', 'appId', 'reviewerOpenId')):
                raise ValueError('Moderator binding changed during installation')
        release.parent.mkdir(mode=0o700, exist_ok=True)
        if release.exists():
            if not all((release / n).read_bytes() == b for n,b in files.items()):
                raise ValueError('Existing release directory has different contents')
        else:
            with tempfile.TemporaryDirectory(dir=release.parent) as tmp:
                stage = Path(tmp) / 'release'
                stage.mkdir()
                for name, data in files.items():
                    (stage / name).write_bytes(data)
                stage.rename(release)
        PLIST.parent.mkdir(parents=True, exist_ok=True)
        old_plist = PLIST.read_bytes() if PLIST.exists() else None
        old_config = config_path.read_bytes() if config_path.exists() else None
        new_config = json.dumps(config, indent=2).encode() + b'\n'
        new_plist = plistlib.dumps(spec)
        loaded = subprocess.run(['launchctl', 'print', target], stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL).returncode == 0
        if loaded and new_plist == old_plist and new_config == old_config:
            return
        if loaded:
            run('launchctl', 'bootout', target)
        try:
            write_atomic(config_path, new_config)
            write_atomic(PLIST, new_plist)
            run('launchctl', 'bootstrap', base, PLIST)
            run('launchctl', 'print', target)
        except BaseException:
            with suppress(RuntimeError):
                run('launchctl', 'bootout', target)
            write_atomic(config_path, old_config)
            write_atomic(PLIST, old_plist)
            if loaded and old_plist:
                run('launchctl', 'bootstrap', base, PLIST)
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true', help='apply the plan (default: preflight only)')
    parser.add_argument('--bind-current-user', action='store_true', help='first install: bind the signed-in site owner')
    parser.add_argument('--profile', help='explicit Feishu CLI profile for initial owner binding')
    args = parser.parse_args()
    if sys.platform != 'darwin' or os.getuid() == 0:
        raise ValueError('Run as the logged-in macOS user')
    os.umask(0o077)
    if SUPPORT.exists():
        check_private(SUPPORT)
    node, cli = binary('node'), binary('lark-cli')
    codex = binary(os.environ.get('HAOMEILE_CODEX_BIN', CODEX))
    config = config_for(args, cli)
    rev, files = source_files()
    release = SUPPORT / 'releases' / rev
    spec = agent_spec(release, node, cli, codex)
    with tempfile.TemporaryDirectory() as tmp:
        for name, data in files.items():
            path = Path(tmp) / name
            path.write_bytes(data)
            run(node, '--check', path)
        run(node, '--input-type=module', '-e', "import 'node:sqlite'; await import(process.argv[1])",
            (Path(tmp) / FILES[0]).as_uri())
    if args.install:
        install(release, files, config, spec)
        print(f'Loaded {LABEL} from origin/main {rev[:12]}')
    else:
        print(f'Preflight passed: origin/main {rev[:12]}, {len(files)} modules, owner profile verified')


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, ValueError, KeyError) as exc:
        sys.exit(str(exc))
