export interface MistakeExplainMessage {
  role: 'system' | 'user';
  content: string;
}

export interface MistakeExplanationBundle {
  full: string;
  eli5: string;
}

const FULL_OPEN = '<PHRASEMAN_FULL_V1>';
const FULL_CLOSE = '</PHRASEMAN_FULL_V1>';
const ELI5_OPEN = '<PHRASEMAN_ELI5_V1>';
const ELI5_CLOSE = '</PHRASEMAN_ELI5_V1>';

const ALL_MARKERS = [FULL_OPEN, FULL_CLOSE, ELI5_OPEN, ELI5_CLOSE] as const;

function markerCount(value: string, marker: string): number {
  return value.split(marker).length - 1;
}

function invalidBundle(): never {
  throw new Error('mistake_explain_invalid_bundle');
}

export function parseMistakeExplanationBundle(raw: string): MistakeExplanationBundle {
  const value = String(raw ?? '');
  if (ALL_MARKERS.some((marker) => markerCount(value, marker) !== 1)) invalidBundle();

  const fullOpenAt = value.indexOf(FULL_OPEN);
  const fullContentAt = fullOpenAt + FULL_OPEN.length;
  const fullCloseAt = value.indexOf(FULL_CLOSE, fullContentAt);
  const eli5OpenAt = value.indexOf(ELI5_OPEN, fullCloseAt + FULL_CLOSE.length);
  const eli5ContentAt = eli5OpenAt + ELI5_OPEN.length;
  const eli5CloseAt = value.indexOf(ELI5_CLOSE, eli5ContentAt);

  if (
    fullOpenAt < 0
    || fullCloseAt < fullContentAt
    || eli5OpenAt < fullCloseAt + FULL_CLOSE.length
    || eli5CloseAt < eli5ContentAt
  ) invalidBundle();

  const prefix = value.slice(0, fullOpenAt).trim();
  const between = value.slice(fullCloseAt + FULL_CLOSE.length, eli5OpenAt).trim();
  const suffix = value.slice(eli5CloseAt + ELI5_CLOSE.length).trim();
  const full = value.slice(fullContentAt, fullCloseAt).trim();
  const eli5 = value.slice(eli5ContentAt, eli5CloseAt).trim();

  if (prefix || between || suffix || !full || !eli5) invalidBundle();
  return { full, eli5 };
}

const BUNDLE_SYSTEM_INSTRUCTIONS = `

OUTPUT CONTRACT — TWO VERSIONS IN ONE RESPONSE:
Return exactly these two sections and no text before, between, or after their markers:
${FULL_OPEN}
[the full explanation required above]
${FULL_CLOSE}
${ELI5_OPEN}
[a simpler explanation]
${ELI5_CLOSE}

The FULL section must follow every instruction above. The ELI5 section must use the same interface language,
explain the same one real difference in 2–4 very short sentences under 55 words, avoid school grammar words,
use only target-language words that occur in LEARNER_ANSWER or CORRECT_ANSWER, and end with the correct phrase.
The markers are protocol text: output each exactly once and never put a marker inside either explanation.`;

const BUNDLE_USER_INSTRUCTIONS = `

Produce both requested versions now. Do not omit either marked section and do not add commentary outside them.`;

export function buildMistakeBundleMessages(
  baseMessages: ReadonlyArray<MistakeExplainMessage>,
): MistakeExplainMessage[] {
  if (
    baseMessages.length !== 2
    || baseMessages[0]?.role !== 'system'
    || baseMessages[1]?.role !== 'user'
  ) {
    throw new Error('mistake_explain_bundle_messages_required');
  }

  return [
    { ...baseMessages[0], content: `${baseMessages[0].content}${BUNDLE_SYSTEM_INSTRUCTIONS}` },
    { ...baseMessages[1], content: `${baseMessages[1].content}${BUNDLE_USER_INSTRUCTIONS}` },
  ];
}
