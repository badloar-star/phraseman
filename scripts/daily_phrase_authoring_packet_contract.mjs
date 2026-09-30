export const DAILY_PHRASE_REQUIRED_AUTHOR_FIELDS = Object.freeze([
  'targetExample',
  'literal_ru',
  'meaning_ru',
  'text_ru',
  'literal_uk',
  'meaning_uk',
  'text_uk',
  'quiz_ru',
  'quiz_uk',
]);

export const DAILY_PHRASE_OPTIONAL_AUTHOR_FIELDS = Object.freeze([
  'targetSurfaceForms',
]);

export const DAILY_PHRASE_REQUIRED_PACKET_ROW_FIELDS = Object.freeze([
  'id',
  'targetText',
  ...DAILY_PHRASE_REQUIRED_AUTHOR_FIELDS,
]);

export const DAILY_PHRASE_AUTHORABLE_PACKET_ROW_FIELDS = Object.freeze([
  ...DAILY_PHRASE_REQUIRED_PACKET_ROW_FIELDS,
  ...DAILY_PHRASE_OPTIONAL_AUTHOR_FIELDS,
]);

const DAILY_PHRASE_AUTHORABLE_PACKET_ROW_FIELD_SET = new Set(
  DAILY_PHRASE_AUTHORABLE_PACKET_ROW_FIELDS,
);

export function missingDailyPhrasePacketRowFields(row) {
  return DAILY_PHRASE_REQUIRED_PACKET_ROW_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(row ?? {}, field),
  );
}

export function unsupportedDailyPhrasePacketRowFields(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return ['__row__'];
  return Object.getOwnPropertyNames(row).filter(
    (field) => !DAILY_PHRASE_AUTHORABLE_PACKET_ROW_FIELD_SET.has(field),
  );
}

export function dailyPhrasePacketRowMatchesBank(packetRow, bankRow) {
  if (!packetRow || !bankRow) return false;
  return DAILY_PHRASE_AUTHORABLE_PACKET_ROW_FIELDS.every((field) => {
    const packetHasField = Object.prototype.hasOwnProperty.call(packetRow, field);
    const bankHasField = Object.prototype.hasOwnProperty.call(bankRow, field);
    return packetHasField === bankHasField
      && (!packetHasField || JSON.stringify(packetRow[field]) === JSON.stringify(bankRow[field]));
  });
}
