// Удобство №2 (владелец одобрил 04.11): второе нажатие на кнопку звука той же фразы в течение ~3 секунд проигрывает её медленнее — 0,7×.
// Работает только на системном голосе (готовые клипы играют в оригинальной длине — решение владельца 24.08), поэтому медленный повтор
// принудительно идёт через системный голос. Метка — короткий тост «Медленнее 0,7×» без мелких подписей. Строки — docs/work/ux_conveniences_strings_9lang.md.
import { actionToastTri, emitAppEvent } from './events';

export const SLOW_REPEAT_RATE = 0.7;
export const SLOW_REPEAT_WINDOW_MS = 3000;
/** Ниже этого интервала — двойной тап/дубль вызова (его гасит дедуп озвучки), а не осознанный повтор. */
export const SLOW_REPEAT_MIN_GAP_MS = 220;

/** Чистое правило: тот же текст, интервал внутри окна повтора и не меньше защитного. */
export function isSlowRepeat(input: Readonly<{ sameText: boolean; sinceLastMs: number }>): boolean {
  return input.sameText && input.sinceLastMs >= SLOW_REPEAT_MIN_GAP_MS && input.sinceLastMs < SLOW_REPEAT_WINDOW_MS;
}

/** Тост «Медленнее 0,7×» на языке интерфейса (9 языков). */
export function emitSlowRepeatToast(): void {
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Медленнее 0,7×',
    uk: 'Повільніше 0,7×',
    en: 'Slower 0.7×',
    es: 'Más lento 0,7×',
    'pt-BR': 'Mais devagar 0,7×',
    vi: 'Chậm hơn 0,7×',
    id: 'Lebih lambat 0,7×',
    tr: 'Daha yavaş 0,7×',
    pl: 'Wolniej 0,7×',
  }));
}
