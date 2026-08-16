export const SUPPORT_COMMUNICATION_BIBLE_VERSION = 2;

export type SupportHumanVoiceViolation =
  | 'internal_process_language'
  | 'generic_receipt_boilerplate'
  | 'blanket_diagnostic_request'
  | 'irrelevant_security_warning'
  | 'mixed_language_signature'
  | 'too_many_questions'
  | 'wrong_language'
  | 'first_person_singular';

const INTERNAL_PROCESS_LANGUAGE = /(?:\b(?:snapshot|repository|repo|commit|sha|branch|pull request|build artifact|deployment|deploy|evidence|grounded|fingerprint|revision|prompt|reviewer|council|model|firestore|cron|source code|codebase)\b|(?:сним(?:ок|ка|ке|ком|ку|ки|ков)(?:\s+(?:продукта|сборки|репозитория))?|репозитор(?:ий|ия|ии)|коммит|ветк[аи]|ревизи[яи]|отпечаток|доказательств[а]?|исходн(?:ый|ого)\s+код|кодовая\s+база|модел[ьи]|промпт|ревьюер|проверяющ(?:ий|ая)|совет\s+агентов))/iu;
const GENERIC_RECEIPT = /(?:мы получили ваше сообщение|we (?:have )?received your message|hemos recibido tu mensaje)/iu;
const BLANKET_DIAGNOSTICS = /(?:верс(?:ией|ию) приложения.{0,80}(?:iphone|android|платформ)|app version.{0,80}platform.{0,80}(?:already tried|steps)|versi[oó]n de la app.{0,80}plataforma)/iu;
const SECURITY_WARNING = /(?:никогда не (?:присылайте|отправляйте).{0,80}(?:парол|код|данные карты)|never (?:send|share).{0,80}(?:password|sign-in code|card details)|nunca env[ií]es.{0,80}(?:contrase|tarjeta|c[oó]digo))/iu;
const EN_SIGNATURE_IN_CYRILLIC = /(?:thanks so much|the phraseman team|just reply here)/iu;

export const SUPPORT_COMMUNICATION_BIBLE_PROMPT = Object.freeze([
  'Write for a real person, not for engineers or an audit log.',
  'Answer the exact question in the first two meaningful sentences.',
  'Acknowledge the specific situation; never use a generic receipt as the opening.',
  'Use warm, calm, plain everyday language. Be friendly, never rude, sarcastic, defensive, or patronizing.',
  'Show only the useful conclusion. Never mention internal tools, source retrieval, snapshots, repositories, commits, builds, evidence, models, prompts, reviewers, policies, confidence, or infrastructure.',
  'Distinguish clearly between what exists now, what existed before, and what is merely planned. Do not invent a reason for a product change.',
  'Give one useful next step or alternative. Ask a question only when its answer changes that next step.',
  'Never ask for version, platform, and troubleshooting history as a blanket list. Ask at most one necessary question in ordinary cases.',
  'Do not add password, card, or security warnings unless the customer is actually discussing credentials, payment data, or account security.',
  'Use the customer language consistently. Do not add a closing or signature; the delivery layer handles it.',
].join('\n'));

function questionCount(text: string): number {
  return (text.match(/[?？]/g) ?? []).length;
}

/**
 * На каком языке написан текст.
 *
 * зачем (живой прогон 25 писем, 2026-08-16): модель отвечала ПО-РУССКИ на
 * английское «Where should I begin?» и на испанское «¿Cuántos minutos?».
 * Правило «отвечай на языке клиента» в своде было, но модель его молча
 * игнорировала, а проверки на это не существовало вовсе — ответ уходил бы
 * человеку, который его не поймёт.
 */
function detectLanguage(text: string): 'ru' | 'es' | 'en' | 'unknown' {
  const t = String(text ?? '');
  if (/[а-яё]/iu.test(t)) return 'ru';
  if (/[áéíóúñ¿¡]/iu.test(t)) return 'es';
  if (/[a-z]/i.test(t)) return 'en';
  return 'unknown';
}

/**
 * Поддержка пишет от «мы», а не от «я».
 *
 * зачем: в живом прогоне модель отвечала «Рад, что вы начали», «я помогу»,
 * «пишите мне» — обещание личной помощи от лица одного человека. Это и
 * ложное обещание (никто конкретный не закреплён за письмом), и разрыв с
 * голосом продукта, где поддержка говорит от команды.
 */
const FIRST_PERSON_SINGULAR = /(?:^|[\s,.!?])(?:я\s+(?:помогу|подскажу|проверю|рад|рада|всегда)|мне\s+сюда|напишите\s+мне|пишите\s+мне|скажите\s+мне|i\s+(?:will\s+help|can\s+help|am\s+glad|will\s+check))/iu;

export function findSupportHumanVoiceViolations(
  reply: unknown,
  issue: unknown = '',
): readonly SupportHumanVoiceViolation[] {
  const text = String(reply ?? '').trim();
  const customerIssue = String(issue ?? '');
  const violations: SupportHumanVoiceViolation[] = [];
  if (INTERNAL_PROCESS_LANGUAGE.test(text)) violations.push('internal_process_language');
  if (GENERIC_RECEIPT.test(text)) violations.push('generic_receipt_boilerplate');
  if (BLANKET_DIAGNOSTICS.test(text)) violations.push('blanket_diagnostic_request');
  const securityRelevant = /(?:парол|код входа|данн(?:ые|ых) карт|password|sign-in code|card details|credential|security|безопасност|оплат|payment)/iu.test(customerIssue);
  if (!securityRelevant && SECURITY_WARNING.test(text)) violations.push('irrelevant_security_warning');
  if (/[а-яёіїєґ]/iu.test(text) && EN_SIGNATURE_IN_CYRILLIC.test(text)) violations.push('mixed_language_signature');
  if (questionCount(text) > 2) violations.push('too_many_questions');
  // зачем сверять язык с письмом клиента (живой прогон 2026-08-16): модель
  // отвечала по-русски англичанину и испанцу. Проверяем только когда язык
  // письма распознан уверенно — иначе короткое «ок» ловилось бы ложно.
  const issueLang = detectLanguage(customerIssue);
  const replyLang = detectLanguage(text);
  if (issueLang !== 'unknown' && replyLang !== 'unknown' && issueLang !== replyLang) {
    violations.push('wrong_language');
  }
  if (FIRST_PERSON_SINGULAR.test(text)) violations.push('first_person_singular');
  return Object.freeze([...new Set(violations)]);
}

/**
 * A holding reply is the safe fallback voice: it answers the customer without
 * asserting any product fact, so it never needs repository grounding. It still
 * has to pass every human-voice rule below before it may reach a customer.
 */
export function supportReplyIsCustomerReady(input: {
  readonly reply: unknown;
  readonly issue?: unknown;
  readonly grounded: boolean;
  readonly ownerManual?: boolean;
  readonly holding?: boolean;
}): boolean {
  if (!input.ownerManual && !input.holding && !input.grounded) return false;
  return findSupportHumanVoiceViolations(input.reply, input.issue).length === 0;
}
