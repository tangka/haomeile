import { currentLocale } from '../../shared/i18n';
import { RADAR_PLATFORM_NAMES, type RadarTrendData } from '../../shared/radar';

const HOUR = 60 * 60 * 1000;
const locale = currentLocale() === 'en' ? 'en-GB' : 'zh-CN';
for (const updated of document.querySelectorAll<HTMLTimeElement>(
  '.radar-updated time, .radar-confirmed time',
)) {
  updated.textContent = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(updated.dateTime));
}

const chart = document.querySelector<HTMLCanvasElement>(
  'canvas[data-radar-trend]',
);
const history = chart?.closest<HTMLElement>('[data-ssr="radar-history"]');
const legend = history?.querySelector<HTMLUListElement>(
  '[data-radar-trend-legend]',
);
const readout = history?.querySelector<HTMLElement>(
  '[data-radar-trend-readout]',
);
if (chart?.dataset.radarTrend && legend && readout) {
  const data = JSON.parse(chart.dataset.radarTrend) as RadarTrendData;
  mountTrend(chart, legend, readout, data);
}

function mountTrend(
  canvas: HTMLCanvasElement,
  legend: HTMLUListElement,
  readout: HTMLElement,
  { generatedAt, series, resetEvents = [] }: RadarTrendData,
): void {
  const context = canvas.getContext('2d');
  const end = Date.parse(generatedAt);
  const start = end - 24 * HOUR;
  const visibleSeries = series
    .map((entry) => ({
      ...entry,
      points: entry.points.filter(({ time }) => time >= start && time <= end),
    }))
    .filter(({ points }) => points.length > 0);
  const markers = resetEvents.filter(
    ({ time }) => time >= start && time <= end,
  );
  if (!context || (!visibleSeries.length && !markers.length)) return;

  const entries = visibleSeries.map((entry) => {
    const item = document.createElement('li');
    item.dataset.radarPlatform = entry.id;
    item.textContent = entry.name;
    legend.append(item);
    return { ...entry, item };
  });
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });
  const clock = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const timestamp = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const eventsAt = new Map<number, { label: string; item: HTMLLIElement }[]>();
  for (const { platform, kind, time } of markers) {
    const action =
      locale === 'zh-CN'
        ? { reset: '额度重置', card: '重置卡' }[kind]
        : { reset: 'quota reset', card: 'reset card' }[kind];
    const label = `${RADAR_PLATFORM_NAMES[platform]} ${action}`;
    const eventItem = document.createElement('li');
    eventItem.dataset.radarPlatform = platform;
    eventItem.dataset.radarEvent = kind;
    eventItem.textContent = `${label} · ${timestamp.format(time)}`;
    legend.append(eventItem);
    eventsAt.set(time, [
      ...(eventsAt.get(time) ?? []),
      { label, item: eventItem },
    ]);
  }
  const times = [
    ...new Set([
      ...entries.flatMap(({ points }) => points.map(({ time }) => time)),
      ...eventsAt.keys(),
    ]),
  ].sort((a, b) => a - b);
  let selected: number | undefined;
  const left = 40;
  const right = 30;

  const timeX = (time: number, width: number): number =>
    left + ((time - start) / (24 * HOUR)) * (width - left - right);

  // Codex and Antigravity are both blue, so every platform also has a shape.
  const mark = (
    platform: string | undefined,
    cx: number,
    cy: number,
    size: number,
  ): void => {
    context.beginPath();
    if (platform === 'claude')
      context.rect(cx - size, cy - size, size * 2, size * 2);
    else if (platform === 'antigravity') {
      context.moveTo(cx, cy - size * 1.2);
      context.lineTo(cx + size * 1.1, cy + size);
      context.lineTo(cx - size * 1.1, cy + size);
      context.closePath();
    } else context.arc(cx, cy, size, 0, 2 * Math.PI);
    context.fill();
  };

  const draw = (): void => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width <= left + right || height <= 40) return;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const top = 12;
    const bottom = height - 44;
    const x = (time: number): number => timeX(time, width);
    const y = (probability: number): number =>
      bottom - (probability / 100) * (bottom - top);
    const foreground = getComputedStyle(canvas).color;
    context.font = '12px system-ui, sans-serif';
    context.fillStyle = foreground;
    context.strokeStyle = foreground;
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.lineWidth = 1;
    for (const probability of [0, 25, 50, 75, 100]) {
      const baseline = y(probability);
      context.fillText(`${probability}%`, left - 6, baseline);
      context.globalAlpha = 0.22;
      context.beginPath();
      context.moveTo(left, baseline);
      context.lineTo(width - right, baseline);
      context.stroke();
      context.globalAlpha = 1;
    }
    context.globalAlpha = 0.6;
    context.setLineDash([2, 3]);
    context.beginPath();
    context.moveTo(left, y(80));
    context.lineTo(width - right, y(80));
    context.stroke();
    context.setLineDash([]);
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(
      locale === 'zh-CN' ? '80% 提醒线' : '80% alert',
      left + 4,
      y(80) - 2,
    );
    context.textBaseline = 'middle';
    context.globalAlpha = 1;
    context.textAlign = 'center';
    const hourOffsets = width < 400 ? [24, 12, 0] : [24, 18, 12, 6, 0];
    for (const hours of hourOffsets) {
      const time = end - hours * HOUR;
      context.fillText(date.format(time), x(time), height - 25);
      context.fillText(clock.format(time), x(time), height - 9);
    }

    const activeTime = selected === undefined ? undefined : times[selected];
    if (activeTime !== undefined) {
      context.globalAlpha = 0.55;
      context.setLineDash([3, 4]);
      context.beginPath();
      context.moveTo(x(activeTime), top);
      context.lineTo(x(activeTime), bottom);
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
    }
    for (const { item, points } of entries) {
      const color = getComputedStyle(item, '::before').backgroundColor;
      context.fillStyle = color;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      points.forEach(({ time, probability }, index) => {
        if (index === 0) context.moveTo(x(time), y(probability));
        else context.lineTo(x(time), y(probability));
      });
      context.stroke();
      for (const { time, probability } of points) {
        mark(
          item.dataset.radarPlatform,
          x(time),
          y(probability),
          time === activeTime ? 5 : 3,
        );
      }
    }
    context.lineWidth = 2;
    for (const [time, events] of eventsAt) {
      // Coincident resets share one timestamp. Alternate their colored dashes.
      context.setLineDash([6, 10 * events.length - 6]);
      events.forEach(({ item }, index) => {
        context.strokeStyle = getComputedStyle(
          item,
          '::before',
        ).borderLeftColor;
        context.lineDashOffset = -index * 10;
        context.beginPath();
        context.moveTo(x(time), top);
        context.lineTo(x(time), bottom);
        context.stroke();
      });
    }
    context.setLineDash([]);
    context.lineDashOffset = 0;
  };

  const select = (index?: number): void => {
    if (index === selected) return;
    selected = index;
    const time = index === undefined ? undefined : times[index];
    if (time === undefined) readout.textContent = '';
    else {
      const samples = entries.flatMap(({ name, points }) => {
        const point = points.find((point) => point.time === time);
        return point ? [`${name} ${point.probability}%`] : [];
      });
      const events = (eventsAt.get(time) ?? []).map(({ label }) => label);
      readout.textContent = [
        timestamp.format(time),
        ...events,
        ...samples,
      ].join(' · ');
    }
    draw();
  };

  const inspectPointer = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    const pointer = event.clientX - bounds.left;
    let nearest: number | undefined;
    let distance = 24;
    let markerHit = false;
    times.forEach((time, index) => {
      const offset = Math.abs(timeX(time, bounds.width) - pointer);
      const onMarker = eventsAt.has(time) && offset <= 5;
      if (
        (onMarker && !markerHit) ||
        (onMarker === markerHit && offset < distance)
      ) {
        nearest = index;
        distance = offset;
        markerHit = onMarker;
      }
    });
    select(nearest);
  };
  canvas.addEventListener('pointerdown', inspectPointer);
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') inspectPointer(event);
  });
  canvas.addEventListener('keydown', (event) => {
    const last = times.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = selected === undefined ? last : Math.max(0, selected - 1);
        break;
      case 'ArrowRight':
        next = selected === undefined ? 0 : Math.min(last, selected + 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
  });
  new ResizeObserver(draw).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  draw();
}
