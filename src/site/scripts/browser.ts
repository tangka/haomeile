export interface Credential {
  id: string;
  secret: string;
}
const CREDENTIAL_KEY = 'haomeile:credential';
export function readCredential(): Credential | null {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CREDENTIAL_KEY) || 'null',
    );
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'secret' in parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.secret === 'string'
    )
      return { id: parsed.id, secret: parsed.secret };
  } catch {
    /* Storage is optional. */
  }
  return null;
}
export function rememberCredential(value: Credential): boolean {
  try {
    localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
let memoryVisitor: string | undefined;
export function visitorId(): string {
  try {
    const saved = localStorage.getItem('haomeile:visitor');
    if (saved) return saved;
  } catch {
    /* A page-local random ID still allows the form to work. */
  }
  const value = (memoryVisitor ||= crypto.randomUUID());
  try {
    localStorage.setItem('haomeile:visitor', value);
  } catch {
    /* Storage is optional. */
  }
  return value;
}
export function shanghaiDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
