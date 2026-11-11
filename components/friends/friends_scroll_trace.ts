// ═══════════════════════════════════════════════════════════════════════════
// friends_scroll_trace.ts — ВРЕМЕННАЯ трассировка прокрутки списка «Друзья».
//
// зачем (владелец 11.11: «раздел друзья странно открывается где-то на середине скролл»; правило «сперва логи»): причина
// не доказана. Рабочая версия — список держит первую видимую строку, а когда над ней догружаются лента недели и заявки,
// уезжает вниз вместе с ней. Журнал показывает факты: позицию при входе, каждое изменение высоты содержимого и состава
// блоков над списком, и каждый скачок позиции БЕЗ пальца на экране. После починки файл и его вызовы убрать.
//
// Без имён и uid — только числа и флаги.
// ═══════════════════════════════════════════════════════════════════════════
const P = '[FRIENDS-SCROLL]';

/** Первые события после входа печатаются все, дальше — только скачки. */
const FIRST_EVENTS = 8;
const JUMP_PX = 60;

let enteredAt = Date.now();
let seen = 0;
let lastY: number | null = null;
let touching = false;

const sinceEnter = (): number => Date.now() - enteredAt;

function print(step: string, data: Record<string, unknown>): void {
  console.log(P, JSON.stringify({ step, t: sinceEnter(), ...data })); // guard-ok: числа и флаги, без имён и uid
}

/** Раздел «Друзья» стал видимым / скрылся: с этого момента отсчитывается время и заново печатаются первые события. */
export function traceFriendsVisible(visible: boolean): void {
  if (visible) { enteredAt = Date.now(); seen = 0; }
  print(visible ? 'visible' : 'hidden', { lastY });
}

/** Что сейчас стоит над строками списка — смена состава здесь меняет высоту шапки списка. */
export function traceFriendsHeader(data: Readonly<{
  rows: number; requests: number; weekRail: boolean; offlineStrip: boolean; settled: boolean; visible: boolean;
}>): void {
  print('header', { ...data, lastY });
}

/** Палец на экране: скачок позиции при touching=false — программный, а не прокрутка пользователем. */
export function traceFriendsTouch(phase: 'drag_begin' | 'drag_end' | 'momentum_end'): void {
  touching = phase === 'drag_begin';
  print(phase, { lastY });
}

export function traceFriendsContentSize(width: number, height: number): void {
  print('content_size', { width: Math.round(width), height: Math.round(height), lastY });
}

export function traceFriendsListLayout(height: number): void {
  print('list_layout', { height: Math.round(height), lastY });
}

export function traceFriendsScrollEvent(e: unknown): void {
  const native = (e as { nativeEvent?: { contentOffset?: { y?: number }; contentSize?: { height?: number }; layoutMeasurement?: { height?: number } } } | null)?.nativeEvent;
  const y = native?.contentOffset?.y;
  if (typeof y !== 'number') { print('scroll_no_offset', {}); return; }
  const dy = lastY === null ? 0 : y - lastY;
  if (seen < FIRST_EVENTS || Math.abs(dy) >= JUMP_PX) {
    print(Math.abs(dy) >= JUMP_PX && !touching ? 'JUMP_NO_TOUCH' : 'scroll', {
      n: seen, y: Math.round(y), dy: Math.round(dy), touching,
      contentH: Math.round(native?.contentSize?.height ?? -1), layoutH: Math.round(native?.layoutMeasurement?.height ?? -1),
    });
  }
  seen += 1;
  lastY = y;
}
