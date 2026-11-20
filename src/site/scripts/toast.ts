let timer: ReturnType<typeof setTimeout>;
export function toast(message: string): void {
  const element = document.querySelector<HTMLElement>('.toast');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    element.hidden = true;
  }, 3000);
}
