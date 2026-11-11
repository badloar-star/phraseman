// recall_prompt_fit.ts — размер фразы на карточке задания режима «Напиши».
//
// зачем (владелец 11.11.2026, жалоба Стеллы): фраза была жёстко 34/40 из макета шириной 390 и не уменьшалась ни на узком экране, ни при
// крупном системном шрифте — на маленьком телефоне вопрос занимал весь экран и вытеснял поле ввода под клавиатуру.
// Правило то же, что у карточек (владелец 18.10): длиннее текст или уже место — кегль меньше, перенос по словам, без «…» и без
// adjustsFontSizeToFit. Фраза, которая помещается в четыре строки макетного размера, остаётся 34/40 — вид совпадает с макетом.
import { effectiveFontScale } from '../../constants/font_scale_cap';
import { fitPhraseFontSize } from './fit_phrase_font';

export const RECALL_PROMPT_BASE_SIZE = 34;
export const RECALL_PROMPT_BASE_LINE = 40;
export const RECALL_PROMPT_MIN_SIZE = 20;
/** Поля экрана (20 + 20) и поля карточки (20 + 20) — из стилей экрана `content` и `focusCard`. */
export const RECALL_PROMPT_SIDE_INSETS = 80;
/** Высота под фразу: четыре строки макетного кегля по оценке подгонки (34 × 1.3 × 4 с запасом). */
export const RECALL_PROMPT_MAX_HEIGHT = 180;

export type RecallPromptFit = Readonly<{ fontSize: number; lineHeight: number }>;

export function recallPromptFit(input: Readonly<{ text: string; contentWidth: number; fontScale: number }>): RecallPromptFit {
  const scale = effectiveFontScale(input.fontScale);
  const widthPx = input.contentWidth - RECALL_PROMPT_SIDE_INSETS;
  const fontSize = fitPhraseFontSize({
    text: input.text,
    baseSize: RECALL_PROMPT_BASE_SIZE,
    minSize: RECALL_PROMPT_MIN_SIZE,
    widthPx,
    maxHeightPx: RECALL_PROMPT_MAX_HEIGHT,
    fontScale: scale,
  });
  // зачем: межстрочный держит пропорцию макета 40/34 и растёт вместе с системным шрифтом — иначе низ букв срезается (см. hooks/useLineScale).
  const baseLine = fontSize === RECALL_PROMPT_BASE_SIZE
    ? RECALL_PROMPT_BASE_LINE
    : Math.round((fontSize * RECALL_PROMPT_BASE_LINE) / RECALL_PROMPT_BASE_SIZE);
  const lineHeight = scale === 1 ? baseLine : Math.round(baseLine * scale * 10) / 10;
  return { fontSize, lineHeight };
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __RecallPromptFitRouteShim() {
  return null;
}
