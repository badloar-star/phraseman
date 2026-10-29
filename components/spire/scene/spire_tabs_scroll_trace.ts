// ═══════════════════════════════════════════════════════════════════════════
// spire_tabs_scroll_trace.ts — журнал [SPIRE-TABS-SCROLL]: что происходит с вкладками «Друзья · Пик · Наборы», пока прокручивается Пик.
//
// зачем (владелец 29.10: «когда прокручиваешь Пик, верхние кнопки перекашиваются и наезжают друг на друга»; правило «сперва логи, потом починка»):
// гадать нельзя — журнал показывает позицию прокрутки, x/ширину/высоту каждой вкладки, признак наложения соседних вкладок и решение шапки
// (поверх сцены или блоком). Владелец или Сверка воспроизводит, причина ставится по фактам. Только память процесса, сеть и хранилище не трогаются.
// Прокрутка пишется не чаще раза в 250 мс (покадровых записей нет); после починки сэмплер прокрутки убрать, остальное оставить на ранних выходах.
// ═══════════════════════════════════════════════════════════════════════════
const LOG = '[SPIRE-TABS-SCROLL]';
const SCROLL_SAMPLE_MS = 250;

type Box = Readonly<{ x: number; y: number; w: number; h: number }>;

const boxes = new Map<string, Box>();
let lastScrollLogAt = 0;
let lastScrollY = 0;
let lastHeaderKey = '';

const round = (n: number): number => Math.round(n * 10) / 10;

/** Соседние вкладки по оси x: имя пары → на сколько dp правая заходит под левую (>0 — наложение). */
function overlaps(): Record<string, number> {
  const sorted = [...boxes.entries()].sort((a, b) => a[1].x - b[1].x);
  const out: Record<string, number> = {};
  for (let i = 1; i < sorted.length; i += 1) {
    const [prevKey, prev] = sorted[i - 1];
    const [key, cur] = sorted[i];
    out[`${prevKey}>${key}`] = round(prev.x + prev.w - cur.x);
  }
  return out;
}

function snapshot(): Record<string, Box> {
  const out: Record<string, Box> = {};
  boxes.forEach((box, key) => { out[key] = box; });
  return out;
}

/** Раскладка одной вкладки (onLayout): пишем на каждое изменение — это и есть «перекос». */
export function traceSpireTabLayout(key: string, layout: Readonly<{ x: number; y: number; width: number; height: number }>): void {
  const next: Box = { x: round(layout.x), y: round(layout.y), w: round(layout.width), h: round(layout.height) };
  const prev = boxes.get(key);
  if (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h) return;
  boxes.set(key, next);
  console.log(LOG, 'tab_layout', JSON.stringify({ key, prev: prev ?? null, next, scrollY: Math.round(lastScrollY), overlap: overlaps() })); // guard-ok: одна строка на смену раскладки вкладки
}

/** Решение шапки «Сообщества» (поверх сцены или блоком): пишем только при смене. */
export function traceSpireTabsHeader(info: Readonly<{ section: string; overScene: boolean; sceneTint: string | null; topInset: number; headerH: number }>): void {
  const key = JSON.stringify(info);
  if (key === lastHeaderKey) return;
  lastHeaderKey = key;
  console.log(LOG, 'header', JSON.stringify({ ...info, scrollY: Math.round(lastScrollY), tabs: snapshot(), overlap: overlaps() })); // guard-ok: одна строка на смену решения шапки
}

/** Прокрутка Пика: сэмпл раз в 250 мс — позиция и текущая раскладка вкладок. */
export function traceSpireTabsScroll(y: number): void {
  lastScrollY = y;
  const now = Date.now();
  if (now - lastScrollLogAt < SCROLL_SAMPLE_MS) return;
  lastScrollLogAt = now;
  console.log(LOG, 'scroll', JSON.stringify({ y: Math.round(y), tabs: snapshot(), overlap: overlaps() })); // guard-ok: сэмпл не чаще раза в 250 мс
}
