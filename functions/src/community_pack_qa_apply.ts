// ════════════════════════════════════════════════════════════════════════════
// community_pack_qa_apply.ts — применение AI-правок к payload заявки UGC-набора.
//
// Зачем: владелец запускает AI-проверку, видит «было → стало» по каждой карточке,
// снимает галочки с ненужных правок и жмёт «Применить и опубликовать». Здесь —
// ЧИСТАЯ функция этого применения: без Firestore и без сети, чтобы её можно было
// покрыть тестами и чтобы callable остался тонким.
//
// Главное правило: правка применяется ТОЛЬКО если текущее значение поля совпадает
// с `before`, которое видел владелец. Иначе правка пропускается. Так поздний
// «Применить» не затирает заявку, которую автор успел переотправить, и не
// применяет правку вслепую к тексту, которого владелец не видел.
// ════════════════════════════════════════════════════════════════════════════

/** Поля карточки, которые AI имеет право править. Всё остальное неприкосновенно. */
export const QA_EDITABLE_CARD_FIELDS = Object.freeze([
  'en', 'fr', 'ru', 'uk', 'es', 'tr', 'pl', 'vi', 'de', 'it', 'description',
] as const);

/** Поля набора (заголовки и описания), которые AI имеет право править. */
const PACK_FIELD_RE = /^(?:title|description)(?:[A-Z][A-Za-z]*)?$/;

const MAX_FIXES = 200;
const MAX_TEXT_CHARS = 500;

export type QaFix = {
  /** 'card' — правка поля карточки, 'pack' — правка заголовка/описания набора. */
  scope: 'card' | 'pack';
  /** Для scope='card': индекс карточки в payload.cards. */
  cardIndex?: number;
  /** Для scope='card': id карточки на момент проверки (страховка от сдвига индексов). */
  cardId?: string;
  /** Имя поля: 'en' | 'ru' | ... для карточки; 'titleRu' | 'descriptionUk' | ... для набора. */
  field: string;
  /** Значение, которое владелец видел в колонке «было». */
  before: string;
  /** Значение, которое владелец утвердил в колонке «стало». */
  after: string;
};

export type QaApplySkip = {
  field: string;
  cardIndex?: number;
  /** Почему правка не применена — попадает в ответ владельцу, не глотается молча. */
  reason:
    | 'field_not_editable'
    | 'card_missing'
    | 'card_id_mismatch'
    | 'before_mismatch'
    | 'empty_after'
    | 'no_change'
    | 'text_too_long';
};

export type QaApplyResult = {
  /** Новый payload. Исходный объект НЕ мутируется (правило иммутабельности). */
  payload: Record<string, unknown>;
  appliedCount: number;
  skipped: QaApplySkip[];
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Применяет принятые владельцем правки к payload заявки.
 *
 * Чистая функция: возвращает НОВЫЙ payload, исходный не меняет.
 * Каждая непринятая правка объясняется в `skipped` — немых пропусков нет.
 */
export function applyQaFixesToPayload(
  rawPayload: unknown,
  rawFixes: readonly QaFix[],
): QaApplyResult {
  const payload: Record<string, unknown> = isPlainObject(rawPayload) ? { ...rawPayload } : {};
  const skipped: QaApplySkip[] = [];
  const fixes = rawFixes.slice(0, MAX_FIXES);

  // Карточки копируем поверхностно один раз; внутрь копируем только те, что правим.
  const sourceCards = Array.isArray(payload.cards) ? payload.cards : [];
  const cards = sourceCards.slice();
  let appliedCount = 0;
  let cardsTouched = false;

  for (const fix of fixes) {
    const field = String(fix?.field ?? '').trim();
    const before = asText(fix?.before);
    const after = asText(fix?.after).trim();
    const cardIndex = Number(fix?.cardIndex);

    if (!after) {
      skipped.push({ field, cardIndex: fix?.scope === 'card' ? cardIndex : undefined, reason: 'empty_after' });
      continue;
    }
    if (after.length > MAX_TEXT_CHARS) {
      skipped.push({ field, cardIndex: fix?.scope === 'card' ? cardIndex : undefined, reason: 'text_too_long' });
      continue;
    }
    if (after === before) {
      skipped.push({ field, cardIndex: fix?.scope === 'card' ? cardIndex : undefined, reason: 'no_change' });
      continue;
    }

    if (fix?.scope === 'pack') {
      if (!PACK_FIELD_RE.test(field)) {
        skipped.push({ field, reason: 'field_not_editable' });
        continue;
      }
      if (asText(payload[field]).trim() !== before.trim()) {
        skipped.push({ field, reason: 'before_mismatch' });
        continue;
      }
      payload[field] = after;
      appliedCount += 1;
      continue;
    }

    // scope === 'card'
    if (!(QA_EDITABLE_CARD_FIELDS as readonly string[]).includes(field)) {
      skipped.push({ field, cardIndex, reason: 'field_not_editable' });
      continue;
    }
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= cards.length) {
      skipped.push({ field, cardIndex, reason: 'card_missing' });
      continue;
    }
    const current = cards[cardIndex];
    if (!isPlainObject(current)) {
      skipped.push({ field, cardIndex, reason: 'card_missing' });
      continue;
    }
    // зачем: индексы могли сдвинуться, если автор переотправил заявку между
    // проверкой и применением. id — вторая независимая опора адресации.
    const expectedId = String(fix?.cardId ?? '').trim();
    if (expectedId && String(current.id ?? '').trim() !== expectedId) {
      skipped.push({ field, cardIndex, reason: 'card_id_mismatch' });
      continue;
    }
    if (asText(current[field]).trim() !== before.trim()) {
      skipped.push({ field, cardIndex, reason: 'before_mismatch' });
      continue;
    }
    cards[cardIndex] = { ...current, [field]: after };
    cardsTouched = true;
    appliedCount += 1;
  }

  if (cardsTouched) payload.cards = cards;
  return { payload, appliedCount, skipped };
}
