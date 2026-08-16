export const SUPPORT_COMMUNICATION_BIBLE_VERSION = 2;

export type SupportHumanVoiceViolation =
  | 'internal_process_language'
  | 'generic_receipt_boilerplate'
  | 'blanket_diagnostic_request'
  | 'irrelevant_security_warning'
  | 'mixed_language_signature'
  | 'too_many_questions'
  | 'wrong_language'
  | 'first_person_singular'
  | 'too_short'
  | 'repeated_greeting';

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
  // зачем переписано (владелец, 2026-08-16: «он должен задавать наводящие
  // вопросы и общаться с юзерами! ответы должны быть полными, а не
  // коротышками»): прежние правила ПРЯМО запрещали спрашивать — «максимум
  // один вопрос», «спрашивай, только если ответ меняет шаг». Живой прогон
  // показал результат: отписки в три строки без единого вопроса. Человек
  // из поддержки так себя не ведёт — он уточняет, чтобы помочь по делу.
  'Write a complete, unhurried reply: 4-8 sentences. A three-line brush-off is worse than no reply.',
  'Acknowledge the specific feeling behind the letter — confusion, frustration, excitement — before moving to the substance.',
  'Give a concrete next step, and explain briefly WHY it helps. Add one alternative when the first step may not fit.',
  'Ask one or two genuinely useful clarifying questions that move the case forward. Never interrogate: no blanket list of version, platform and history.',
  'End by inviting the person to write back — support is a conversation, not a ticket that closes itself.',
  // зачем (владелец, 2026-08-16): «повторно говорить здравствуйте можно
  // только если это следующий день; в тот же день повторно не надо».
  // В живом прогоне каждый второй ответ в одном треде начинался с
  // «Здравствуйте!» — так пишет автоответчик, а не человек, который
  // помнит, что уже разговаривает с тобой десять минут.
  'Greet only in the FIRST reply of the day. Later in the same conversation continue without "Hello" — you are already talking.',
  'Do not add password, card, or security warnings unless the customer is actually discussing credentials, payment data, or account security.',
  'Use the customer language consistently. Do not add a closing or signature; the delivery layer handles it.',
].join('\n'));

/**
 * Ниже этого — отписка, а не ответ.
 *
 * зачем 35 слов (владелец, 2026-08-16: «ответы должны быть полными, а не
 * коротышками»): реальный ответ из живого прогона — «Здравствуйте! Очень
 * рад слышать. Если понадобится помощь — обращайтесь» — это 12 слов.
 * Четыре-восемь предложений живого ответа дают 45-90 слов, поэтому 35 —
 * нижняя граница, отсекающая отписку, но не мешающая краткому по существу
 * ответу на совсем простой вопрос.
 */
export const MIN_REPLY_WORDS = 35;

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
 * Приветствие в начале ответа.
 *
 * зачем (владелец, 2026-08-16): «повторно говорить здравствуйте можно
 * только если это следующий день». В живом прогоне каждый ответ в треде
 * начинался с «Здравствуйте!» — на пятом сообщении подряд это выдаёт
 * автоответчик. Живой человек здоровается один раз за день.
 */
// зачем без \b у русских слов и с допуском «¡» в начале (2026-08-16):
// в JavaScript граница слова не работает с кириллицей — с ней регулярка
// не ловила ни «Здравствуйте», ни «Добрый день». Тот же класс дефекта уже
// находился в запрете ложных утверждений. Испанское «¡Hola!» отсекалось
// якорем начала строки, потому что перевёрнутый знак идёт перед словом.
const GREETING_OPENER = /^\s*[¡¿]?\s*(?:здравствуйте|здравствуй|добрый (?:день|вечер)|доброе утро|привет|\bhello\b|\bhi\b|\bhey\b|good (?:morning|afternoon|evening)|hola|buenos d[ií]as)/iu;

export function replyOpensWithGreeting(reply: unknown): boolean {
  return GREETING_OPENER.test(String(reply ?? ''));
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
  /**
   * Мы уже здоровались с этим человеком СЕГОДНЯ.
   *
   * зачем отдельный параметр, а не вывод из истории внутри функции: модуль
   * чистый, без доступа к базе. Признак вычисляет вызывающий код, который
   * и так читает переписку.
   */
  alreadyGreetedToday = false,
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
  // зачем порог поднят с 2 до 4 (владелец, 2026-08-16): два вопроса — это
  // норма живого разговора, а не нарушение. Ограничение остаётся, чтобы
  // ответ не превратился в допрос анкетой.
  if (questionCount(text) > 4) violations.push('too_many_questions');
  // зачем (владелец, 2026-08-16): «в тот же день повторно здравствуйте
  // говорить не надо». Пятое «Здравствуйте!» подряд в одной переписке
  // выдаёт автоответчик — живой человек здоровается один раз за день.
  if (alreadyGreetedToday && replyOpensWithGreeting(text)) violations.push('repeated_greeting');
  // зачем проверка на короткий ответ: живой прогон дал отписки в три
  // строки — «попробуйте паузы», и всё. Человек с проблемой получает
  // ощущение, что от него отмахнулись. Порог по СЛОВАМ, а не символам:
  // кириллица и латиница дают разную длину при одинаковом содержании.
  const words = text.split(/\s+/u).filter(Boolean).length;
  if (words > 0 && words < MIN_REPLY_WORDS) violations.push('too_short');
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
  const violations = findSupportHumanVoiceViolations(input.reply, input.issue);
  // зачем послабления для ручного текста (найдено тестом 2026-08-16):
  // правила «не короче 35 слов» и «отвечай на языке клиента» написаны
  // против МОДЕЛИ — она отписывалась в три строки и отвечала русским
  // текстом англичанам. Владелец же вправе и ответить коротко
  // («Проверил, всё восстановил»), и написать на другом языке, если так
  // понятнее конкретному человеку. Правила перекрывали ему отправку
  // собственного текста. Запреты на ЛОЖЬ (мы проверили, вернём деньги,
  // внутренняя кухня) для ручного текста остаются в силе — их проверяет
  // отдельный слой в selectFinalAutoReply.
  const OWNER_EXEMPT: readonly SupportHumanVoiceViolation[] = ['too_short', 'wrong_language'];
  const effective = input.ownerManual
    ? violations.filter((v) => !OWNER_EXEMPT.includes(v))
    : violations;
  return effective.length === 0;
}
