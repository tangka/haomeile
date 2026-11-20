import {
  PRODUCT_PLANS,
  type TombInput,
  type TombstoneRow,
  type Vendor,
} from '../../worker/types';
import { validateTombInput } from '../../worker/lib/validate';
import { checkPrivacy } from '../../worker/lib/privacy';
import { ApiError } from '../../worker/lib/errors';
import { api, ApiRequestError } from './api';
import {
  downloadText,
  readCredential,
  rememberCredential,
  shanghaiDate,
  type Credential,
} from './browser';
import { toast } from './toast';
import { mountTurnstile, type Challenge } from './turnstile';
import { LABELS, LEGACY_PLAN_LABELS } from './labels';
type OwnerTomb = Omit<
  TombstoneRow,
  'secret_hash' | 'flags' | 'pending_patch'
> & { pending_patch: TombInput | null };
const form = document.querySelector<HTMLFormElement>('#tomb-form')!;
const editMode = new URLSearchParams(location.search).get('mode') === 'edit';
const errorBox = document.querySelector<HTMLElement>('#submit-error')!;
const submit = document.querySelector<HTMLButtonElement>('#submit-button')!;
const challengeContainer = document.querySelector<HTMLElement>('#turnstile')!;
const died = document.querySelector<HTMLInputElement>('#died')!;
const product = document.querySelector<HTMLSelectElement>('#vendor')!;
const plan = document.querySelector<HTMLSelectElement>('#plan')!;
const planHint = document.querySelector<HTMLElement>('#plan-hint')!;
function syncPlans(preferred = plan.value): void {
  const choices: readonly string[] = Object.hasOwn(PRODUCT_PLANS, product.value)
    ? PRODUCT_PLANS[product.value as Vendor]
    : ['unknown'];
  const selected = choices.includes(preferred) ? preferred : 'unknown';
  plan.replaceChildren(
    ...choices.map(
      (key) =>
        new Option(
          LABELS.plan[key as keyof typeof LABELS.plan],
          key,
          key === 'unknown',
          key === selected,
        ),
    ),
  );
  planHint.textContent = !product.value
    ? '先选择产品，再选择对应套餐。'
    : Object.hasOwn(LEGACY_PLAN_LABELS, preferred)
      ? '旧记录没有注明具体档位，请重新选择；不记得可以保持“不详或不想说”。'
      : '选填，不记得可以保持“不详或不想说”。';
}
product.addEventListener('change', () => syncPlans());
syncPlans();
const born = document.querySelector<HTMLInputElement>('#born')!;
const bornPrecision =
  document.querySelector<HTMLSelectElement>('#born-precision')!;
type BornPrecision = TombInput['born_precision'];
function setBornPrecision(precision: BornPrecision): void {
  const previous = born.value;
  bornPrecision.value = precision;
  born.type = precision === 'day' ? 'date' : 'month';
  born.hidden = precision === 'none';
  born.disabled = precision === 'none';
  born.required = precision !== 'none';
  born.max = precision === 'day' ? shanghaiDate() : shanghaiDate().slice(0, 7);
  // Keeping a known month never invents a registration day.
  if (precision === 'none' || (precision === 'day' && previous.length === 7))
    born.value = '';
  else born.value = precision === 'month' ? previous.slice(0, 7) : previous;
}
bornPrecision.addEventListener('change', () =>
  setBornPrecision(bornPrecision.value as BornPrecision),
);
form.addEventListener('reset', () =>
  queueMicrotask(() => {
    setBornPrecision(bornPrecision.value as BornPrecision);
    syncPlans();
  }),
);
died.max = shanghaiDate();
died.value = shanghaiDate();
let credential: Credential | undefined;
let challenge: Challenge | undefined;
function banner(message: string, success = false): void {
  errorBox.textContent = message;
  errorBox.className = `banner ${success ? 'banner-ok' : 'banner-error'}`;
  errorBox.hidden = false;
}
const names: Record<string, string> = {
  event_type: 'event',
  appeal_status: 'appeal',
  card_style: 'style',
  born_at: 'born_at',
  died_at: 'died_at',
  consent: 'consent',
};
function clearErrors(): void {
  form
    .querySelectorAll('.has-error')
    .forEach((field) => field.classList.remove('has-error'));
  form
    .querySelectorAll('[aria-invalid]')
    .forEach((input) => input.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach((error) => error.remove());
  document.querySelector<HTMLElement>('#story-error')!.hidden = true;
  errorBox.hidden = true;
}
function showFields(fields: Record<string, string>): void {
  for (const [field, message] of Object.entries(fields)) {
    const input = form.querySelector<HTMLElement>(
      `[name="${CSS.escape(names[field] || field)}"]`,
    );
    if (!input) continue;
    const wrapper = input.closest('.field') || input.parentElement;
    wrapper?.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    const error = document.createElement('p');
    error.className = 'error field-error';
    error.id = `error-${field}`;
    error.textContent = message;
    input.setAttribute('aria-describedby', `${input.id}-hint ${error.id}`);
    wrapper?.append(error);
  }
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
function fill(tomb: OwnerTomb): void {
  const values = tomb.pending_patch || tomb;
  // Set the input type before assigning a precise date; month inputs clear day values.
  setBornPrecision(values.born_precision);
  product.value = values.vendor;
  syncPlans(values.plan);
  for (const [field, value] of Object.entries(values)) {
    if (field === 'vendor' || field === 'plan') continue;
    const name = names[field] || field;
    const controls = form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(`[name="${CSS.escape(name)}"]`);
    controls.forEach((control) => {
      if (control instanceof HTMLInputElement && control.type === 'radio')
        control.checked = control.value === value;
      else if (
        control instanceof HTMLInputElement &&
        control.type === 'checkbox'
      )
        control.checked = false;
      else control.value = value == null ? '' : String(value);
    });
  }
  updateCount();
}
function updateCount(): void {
  const story = document.querySelector<HTMLTextAreaElement>('#story')!;
  const count = story.closest('.field')?.querySelector('.count');
  if (count) count.textContent = `${Array.from(story.value).length} / 800`;
}
form.addEventListener('input', (event) => {
  updateCount();
  const target = event.target;
  if (
    !(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) ||
    !['codename', 'nickname', 'story', 'epitaph'].includes(target.name)
  )
    return;
  const privacy = checkPrivacy(target.value);
  const existing = target.closest('.field')?.querySelector('.field-error');
  existing?.remove();
  target.closest('.field')?.classList.remove('has-error');
  target.removeAttribute('aria-invalid');
  if (privacy) showFields({ [target.name]: privacy.message });
});
if (editMode) {
  document.title = '修改墓碑 · 号没了';
  document.querySelector('#submit-title')!.textContent = '修改墓碑';
  document.querySelector('#submit-description')!.textContent =
    '修改后需要重新审核。审核通过前，墙上继续显示旧版本。';
  submit.textContent = '提交修改';
  challengeContainer.hidden = true;
  form.hidden = true;
  const editForm = document.querySelector<HTMLFormElement>(
    '#edit-credential-form',
  )!;
  editForm.hidden = false;
  const saved = readCredential();
  const idInput = document.querySelector<HTMLInputElement>('#edit-id')!,
    secretInput = document.querySelector<HTMLInputElement>('#edit-secret')!;
  if (saved) {
    idInput.value = saved.id;
    secretInput.value = saved.secret;
  }
  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.querySelector<HTMLElement>('#edit-error')!;
    error.hidden = true;
    const button = editForm.querySelector<HTMLButtonElement>('button')!;
    button.disabled = true;
    try {
      const candidate = {
        id: idInput.value.trim(),
        secret: secretInput.value.trim(),
      };
      const tomb = await api<OwnerTomb>('/api/manage/status', candidate);
      if (tomb.status === 'withdrawn' || tomb.status === 'hidden')
        throw new Error('这块碑目前不能修改，请先查看管理页的状态。');
      credential = candidate;
      fill(tomb);
      form.hidden = false;
      editForm.hidden = true;
    } catch (failure) {
      error.textContent =
        failure instanceof Error ? failure.message : '编号或密钥不对';
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
} else {
  void mountTurnstile(challengeContainer)
    .then((value) => {
      challenge = value;
    })
    .catch((error: unknown) =>
      banner(
        error instanceof Error
          ? error.message
          : '人机验证没能加载，请刷新页面。',
      ),
    );
}
const dialog = document.querySelector<HTMLDialogElement>('#cred')!;
const savedBox = document.querySelector<HTMLInputElement>('#saved')!;
const remember = document.querySelector<HTMLInputElement>('#remember')!;
const closeButton = document.querySelector<HTMLButtonElement>('#close-cred')!;
let created: Credential | undefined;
function credentialText(): string {
  return `号没了 · 墓碑凭据\n编号：${created?.id || ''}\n密钥：${created?.secret || ''}\n管理地址：https://haomeile.rip/manage\n只显示一次，丢了没法找回。`;
}
dialog.addEventListener('cancel', (event) => {
  if (!savedBox.checked) event.preventDefault();
});
savedBox.addEventListener('change', () => {
  closeButton.disabled = !savedBox.checked;
});
closeButton.addEventListener('click', () => {
  if (savedBox.checked) dialog.close();
});
dialog.addEventListener('close', () => {
  if (remember.checked && created && !rememberCredential(created))
    toast('这个浏览器没能记住凭据，请保留下载的文件。');
  created = undefined;
  document.querySelector('#credential-id')!.textContent = '';
  document.querySelector('#credential-secret')!.textContent = '';
  form.reset();
  syncPlans('unknown');
  died.value = shanghaiDate();
  updateCount();
});
document.querySelector('#copy-cred')!.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(credentialText());
    const button = document.querySelector('#copy-cred')!;
    button.textContent = '已复制';
    toast('凭据已复制');
  } catch {
    toast('没能复制，请手动抄下编号和密钥。');
  }
});
document.querySelector('#dl-cred')!.addEventListener('click', () => {
  if (created) downloadText(credentialText(), `号没了-凭据-${created.id}.txt`);
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  const data = new FormData(form);
  const born = String(data.get('born_at') || '');
  const input = {
    codename: data.get('codename'),
    nickname: data.get('nickname'),
    vendor: data.get('vendor'),
    event_type: data.get('event'),
    plan: data.get('plan'),
    born_at: born || null,
    born_precision: bornPrecision.value,
    died_at: data.get('died_at'),
    story: data.get('story'),
    epitaph: data.get('epitaph'),
    appeal_status: data.get('appeal'),
    card_style: data.get('style'),
    consent: document.querySelector<HTMLInputElement>('#agree')!.checked,
  };
  submit.disabled = true;
  try {
    const validated = validateTombInput(input);
    if (editMode) {
      if (!credential) throw new Error('请先读取你的墓碑。');
      await api('/api/manage/patch', { ...credential, patch: validated });
      banner('修改已提交。审核通过前，墙上继续显示旧版本。', true);
    } else {
      const token = challenge?.token();
      if (!token)
        throw new Error('人机验证没通过。刷新一下验证框，再点一次提交。');
      created = await api<Credential>('/api/tombstones', {
        ...validated,
        turnstile_token: token,
      });
      document.querySelector('#credential-id')!.textContent = created.id;
      document.querySelector('#credential-secret')!.textContent =
        created.secret;
      savedBox.checked = false;
      remember.checked = false;
      closeButton.disabled = true;
      document.querySelector('#copy-cred')!.textContent = '复制凭据';
      dialog.showModal();
    }
  } catch (error) {
    if (
      (error instanceof ApiError || error instanceof ApiRequestError) &&
      error.fields
    )
      showFields(error.fields);
    banner(
      error instanceof Error
        ? error.message
        : '服务器出了点问题。过几分钟再试，碑文不会丢。',
    );
  } finally {
    submit.disabled = false;
    if (!editMode) challenge?.reset();
  }
});
