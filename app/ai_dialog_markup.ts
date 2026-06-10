/**
 * Разметка ключевых фраз в репликах Фила (ИИ-диалоги).
 *
 * Контракт с сервером (functions/src/premium_dialog.ts): Фил оборачивает
 * 1-3 полезные английские фразы в двойные квадратные скобки — `[[...]]`.
 * Маркер выбран потому, что (а) практически не встречается в естественном
 * английском тексте → нет ложных срабатываний, (б) тривиально парсится,
 * (в) легко вырезается для озвучки/перевода.
 *
 * Чистые функции без зависимостей — легко тестировать.
 */

/**
 * Маркер: [[фраза]] — нежадно. Допускаем пустое содержимое (`.*?`), чтобы
 * случайный пустой/пробельный маркер от модели вырезался, а не висел как `[[]]`.
 * Пустые фразы отбрасываются в parseKeyPhrases ниже.
 */
const KEY_PHRASE_RE = /\[\[(.*?)\]\]/g;

export interface DialogSegment {
  /** Текст сегмента БЕЗ маркеров (готов к показу и озвучке). */
  text: string;
  /** true — это помеченная ключевая фраза (подсветить + кликабельна). */
  isKey: boolean;
}

/**
 * Разбивает сырую реплику на последовательность сегментов.
 * Обычный текст и ключевые фразы чередуются в порядке появления.
 * Если маркеров нет — вернётся один сегмент с isKey:false.
 * Пустые куски (например, два маркера подряд) отбрасываются.
 */
export function parseKeyPhrases(raw: string): DialogSegment[] {
  const source = raw ?? '';
  const segments: DialogSegment[] = [];
  let lastIndex = 0;

  // Сбрасываем lastIndex глобального regex перед проходом (он stateful).
  KEY_PHRASE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KEY_PHRASE_RE.exec(source)) !== null) {
    const [full, inner] = match;
    const start = match.index;

    // Текст до маркера.
    if (start > lastIndex) {
      const plain = source.slice(lastIndex, start);
      if (plain.length > 0) segments.push({ text: plain, isKey: false });
    }

    const phrase = inner.trim();
    if (phrase.length > 0) segments.push({ text: phrase, isKey: true });

    lastIndex = start + full.length;

    // Защита от зацикливания на нулевой длине (теоретически невозможна с .+?).
    if (KEY_PHRASE_RE.lastIndex === start) KEY_PHRASE_RE.lastIndex += 1;
  }

  // Хвост после последнего маркера.
  if (lastIndex < source.length) {
    const tail = source.slice(lastIndex);
    if (tail.length > 0) segments.push({ text: tail, isKey: false });
  }

  // Пустой вход → один пустой сегмент, чтобы вызывающий код не падал на []? Нет:
  // лучше вернуть пустой массив, рендер сам решит. Но один сегмент удобнее.
  if (segments.length === 0) segments.push({ text: source, isKey: false });

  return segments;
}

/**
 * Убирает маркеры `[[ ]]`, оставляя чистый текст реплики.
 * Используется для озвучки всей реплики, перевода и пост-диалогового разбора —
 * везде, где маркеры не нужны.
 */
export function stripMarkers(raw: string): string {
  return (raw ?? '').replace(KEY_PHRASE_RE, (_full, inner: string) => inner).trim();
}

/** Список только ключевых фраз (например, для recap/аналитики). */
export function extractKeyPhrases(raw: string): string[] {
  return parseKeyPhrases(raw)
    .filter((s) => s.isKey)
    .map((s) => s.text);
}
