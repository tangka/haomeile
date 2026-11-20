import { drawEpitaphCard, type EpitaphCardData } from './epitaph-card';
import { EPITAPHS } from './epitaphs';
import { shanghaiDate } from './browser';
import { toast } from './toast';
import { LABELS } from './labels';
const canvas = document.querySelector<HTMLCanvasElement>('#card')!;
const name = document.querySelector<HTMLInputElement>('#m-name')!;
const vendor = document.querySelector<HTMLSelectElement>('#m-vendor')!;
const born = document.querySelector<HTMLInputElement>('#m-born')!;
const died = document.querySelector<HTMLInputElement>('#m-died')!;
const epitaph = document.querySelector<HTMLInputElement>('#m-epitaph')!;
const maker = document.querySelector<HTMLFormElement>('#maker')!;
died.value = shanghaiDate();
died.max = shanghaiDate();
born.max = shanghaiDate();
let index = Math.floor(Math.random() * EPITAPHS.length);
epitaph.value = EPITAPHS[index];
function radio(name: string): string {
  return (
    document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)
      ?.value || ''
  );
}
function draw(): void {
  const data: EpitaphCardData = {
    codename: name.value,
    vendorLabel:
      LABELS.vendor[vendor.value as keyof typeof LABELS.vendor] ||
      LABELS.vendor.claude,
    born_at: born.value || null,
    born_precision: born.value ? 'day' : 'none',
    died_at: died.value,
    causeLabel: radio('cause'),
    epitaph: epitaph.value,
    card_style: radio('mstyle') as EpitaphCardData['card_style'],
    night: radio('mtime') === 'night',
  };
  try {
    drawEpitaphCard(canvas, data);
  } catch (error) {
    toast(
      error instanceof Error ? error.message : '没能生成图片，请换一个浏览器。',
    );
  }
}
document.querySelector('#m-shuffle')!.addEventListener('click', () => {
  // Move by a nonzero random offset, guaranteeing a different template.
  index =
    (index + 1 + Math.floor(Math.random() * (EPITAPHS.length - 1))) %
    EPITAPHS.length;
  epitaph.value = EPITAPHS[index];
  draw();
});
maker.addEventListener('submit', (event) => event.preventDefault());
maker.addEventListener('input', draw);
maker.addEventListener('change', draw);
document.querySelector('#m-download')!.addEventListener('click', () => {
  try {
    const link = document.createElement('a');
    const filename = (name.value.trim() || '无名氏').replace(
      /[\\/:*?"<>|]/g,
      '-',
    );
    link.download = `墓碑-${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    toast('没能下载图片，请换一个浏览器再试。');
  }
});
void document.fonts.ready.then(draw);
draw();
