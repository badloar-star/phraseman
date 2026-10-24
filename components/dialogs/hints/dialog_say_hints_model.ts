// dialog_say_hints_model.ts — модель постоянных подсказок «Можно сказать…» над полем ввода Диалогов.
// зачем (владелец 24.10, дословно через координатора: «обязательно разработай подсказки, чтобы внизу над полем ввода появлялся у пользователя мелкий текст — что можно написать
// по контексту, с подсказкой, что это значит»; «постоянно должны быть подсказки, потому что я ноль, но хочу учиться, а как, если я не знаю, что говорить»):
// 1–3 фразы на изучаемом языке и смысл каждой на родном. Источник фраз — Ядро (поле в ответе хода или локальный набор по цели шага, без отдельного вызова на реплику);
// здесь только чистая очистка того, что пришло: пустое, повторы и слишком длинное не показываем, больше трёх не берём.

/** Сколько фраз показываем: 1–3 (слово владельца). */
export const DIALOG_SAY_HINTS_MAX = 3;
/** Длиннее — не фраза-подсказка для новичка, а абзац: такие не показываем (режем не по символам, чтобы не сломать слово). */
export const DIALOG_SAY_HINT_MAX_LENGTH = 120;

export type DialogSayHint = Readonly<{
  /** Фраза на изучаемом языке — её вставляем в поле. */
  text: string;
  /** Смысл на языке интерфейса (вторая строка); null — перевода нет, строку не рисуем. */
  meaning: string | null;
}>;

const CONTROL = /[\u0000-\u001f\u007f]/gu;

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(CONTROL, ' ').replace(/\s+/gu, ' ').trim() : '');

/** Очистка пришедшего списка: порядок сохраняем, повторы (без учёта регистра) и пустые убираем, не больше трёх. */
export function sanitizeDialogSayHints(raw: ReadonlyArray<Readonly<{ text?: unknown; meaning?: unknown }>> | null | undefined): readonly DialogSayHint[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const out: DialogSayHint[] = [];
  for (const item of raw) {
    const text = clean(item?.text);
    if (!text || text.length > DIALOG_SAY_HINT_MAX_LENGTH) continue;
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const meaning = clean(item?.meaning);
    out.push(Object.freeze({ text, meaning: meaning || null }));
    if (out.length >= DIALOG_SAY_HINTS_MAX) break;
  }
  return Object.freeze(out);
}

/** Собрать подсказки из двух параллельных списков (фразы и переводы, как отдаёт ответ хода). */
export function dialogSayHintsFromLists(phrases: readonly string[] | null | undefined, meanings: readonly string[] | null | undefined): readonly DialogSayHint[] {
  if (!phrases) return [];
  return sanitizeDialogSayHints(phrases.map((text, i) => ({ text, meaning: meanings?.[i] ?? null })));
}

/** Тап по фразе: вставить в поле. Если поле уже не пустое — фраза заменяет черновик (подсказка отвечает на текущий вопрос, дописывать к чужому тексту нечего). */
export function applyDialogSayHint(_currentDraft: string, hint: DialogSayHint): string {
  return hint.text;
}
