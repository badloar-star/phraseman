/**
 * Приведение текста разбора ошибки к виду макета «Почему» (docs/design/v2-app/mistakes-panel.html).
 *
 * зачем (сверка 15–18, координатор 04.10): ИИ-разбор приходил с отдельным абзацем, который просто повторял правильный
 * ответ («Grandchildren»), — а ответ уже стоит в строке «Правильно» ниже; и с «программистскими» кавычками "children"
 * вместо «ёлочек». Чистая функция: ничего не придумывает, только убирает дубль и меняет кавычки.
 */

const stripEdges = (value: string): string =>
  value.trim().replace(/^[\s"'«»„“”‘’.,:;!?—-]+|[\s"'«»„“”‘’.,:;!?—-]+$/g, '').toLowerCase();

/** Языки интерфейса, где основная кавычка — «ёлочка». */
const GUILLEMET_LANGS: ReadonlySet<string> = new Set(['ru', 'uk', 'es', 'pt-BR']);

/**
 * Парные «программистские» кавычки "…" и английские “…” → «…» для языков с ёлочкой; остальные языки — без изменений.
 * зачем (координатор 12.10, dialogs-020): разбор «Почему так» в Диалогах приходит от модели с прямыми кавычками —
 * та же беда, что у разбора ошибок; одна функция на оба экрана. Непарную кавычку не трогаем.
 */
export function localizeQuotes(text: string, lang: string): string {
  if (!GUILLEMET_LANGS.has(lang)) return text;
  return text.replace(/"([^"\n]+)"/g, '«$1»').replace(/“([^”\n]+)”/g, '«$1»');
}

export function cleanMistakeExplanation(
  text: string,
  options: Readonly<{ lang: string; answers: readonly string[] }>,
): string {
  const known = new Set(options.answers.map(stripEdges).filter((value) => value.length > 0));
  const paragraphs = text.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 0);
  // абзац, целиком повторяющий ответ (с кавычками/точкой или без), — дубль строки «Правильно»; единственный абзац не трогаем
  const kept = paragraphs.length > 1
    ? paragraphs.filter((line) => !known.has(stripEdges(line)))
    : paragraphs;
  const joined = (kept.length > 0 ? kept : paragraphs).join('\n');
  return localizeQuotes(joined, options.lang);
}
