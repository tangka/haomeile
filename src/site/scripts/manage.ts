import { currentLocale, localePath, tr } from '../../shared/i18n';
import type { TombInput, TombstoneRow } from '../../worker/types';
import { api, ApiRequestError } from './api';
import { readCredential, type Credential } from './browser';
import { getLabels } from './labels';
import { toast } from './toast';
const labels = getLabels();
type OwnerTomb = Omit<
  TombstoneRow,
  'secret_hash' | 'flags' | 'pending_patch'
> & { pending_patch: TombInput | null };
const form = document.querySelector<HTMLFormElement>('#cred-form')!;
const idInput = document.querySelector<HTMLInputElement>('#c-id')!,
  secretInput = document.querySelector<HTMLInputElement>('#c-secret')!;
const error = document.querySelector<HTMLElement>('#cred-error')!,
  card = document.querySelector<HTMLElement>('#status')!;
const edit = document.querySelector<HTMLAnchorElement>('#s-edit')!,
  view = document.querySelector<HTMLAnchorElement>('#s-view')!,
  withdraw = document.querySelector<HTMLButtonElement>('#s-withdraw')!;
let credential: Credential | undefined;
let current: OwnerTomb | undefined;
const TEXT = {
  pending: tr('正在等审核，通常一天内处理完。审核前你还可以修改。'),
  approved: tr('已经公开在纪念墙上。'),
  approved_patch: tr('墙上现在显示的是旧版本，你的修改正在等审核。'),
  rejected: tr(
    '没有通过审核。常见原因是含有隐私信息、灰产内容，或者和账号出事无关。可以修改后重新提交。',
  ),
  hidden: tr('暂时隐藏了，正在复核。通常是因为收到了多人举报。'),
  withdrawn: tr('已经撤回，碑文已清空。'),
};
function show(tomb: OwnerTomb): void {
  current = tomb;
  const pill = document.querySelector<HTMLElement>('#pill')!;
  const state =
    tomb.status === 'approved' && tomb.pending_patch
      ? 'approved_patch'
      : tomb.status;
  pill.dataset.status = tomb.status;
  pill.textContent =
    state === 'approved_patch'
      ? tr('已公开，修改审核中')
      : labels.status[tomb.status];
  document.querySelector('#status-text')!.textContent = TEXT[state];
  document.querySelector('#s-name')!.textContent =
    tomb.status === 'withdrawn'
      ? tr(`编号 ${tomb.id}`)
      : `${tomb.codename}${currentLocale() === 'en' ? ' ' : ''}${tr(`（编号 ${tomb.id}）`)}`;
  edit.hidden = tomb.status === 'withdrawn' || tomb.status === 'hidden';
  edit.href = localePath('/submit?mode=edit');
  view.hidden = tomb.status !== 'approved';
  view.href = localePath(`/t/${tomb.id}`);
  withdraw.hidden = tomb.status === 'withdrawn';
  card.hidden = false;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  card.hidden = true;
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  button.disabled = true;
  try {
    const candidate = {
      id: idInput.value.trim(),
      secret: secretInput.value.trim(),
    };
    const tomb = await api<OwnerTomb>('/api/manage/status', candidate);
    credential = candidate;
    show(tomb);
  } catch (failure) {
    error.replaceChildren();
    const title = document.createElement('strong');
    title.textContent =
      failure instanceof ApiRequestError &&
      failure.code === 'INVALID_CREDENTIALS'
        ? tr('编号或密钥不对')
        : tr('暂时没能查看');
    error.append(
      title,
      document.createTextNode(
        failure instanceof Error
          ? failure.message
          : tr('检查一下有没有多复制空格。凭据丢了没法找回，可以重新立一块。'),
      ),
    );
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
});
const saved = readCredential();
const useSaved = document.querySelector<HTMLButtonElement>('#use-saved')!;
useSaved.hidden = !saved;
useSaved.addEventListener('click', () => {
  if (!saved) return;
  idInput.value = saved.id;
  secretInput.value = saved.secret;
  form.requestSubmit();
});
const dialog = document.querySelector<HTMLDialogElement>('#withdraw')!;
withdraw.addEventListener('click', () => dialog.showModal());
dialog.addEventListener('close', async () => {
  if (dialog.returnValue !== 'yes' || !credential) return;
  withdraw.disabled = true;
  try {
    await api('/api/manage/withdraw', credential);
    if (current)
      show({
        ...current,
        status: 'withdrawn',
        codename: '',
        nickname: '',
        story: '',
        epitaph: '',
        pending_patch: null,
      });
    credential = undefined;
    secretInput.value = '';
    toast(tr('已撤回'));
  } catch (failure) {
    toast(
      failure instanceof Error
        ? failure.message
        : tr('撤回没成功，请稍后再试。'),
    );
  } finally {
    withdraw.disabled = false;
  }
});
