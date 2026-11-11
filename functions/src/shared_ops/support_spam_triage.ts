/**
 * Разбор писем поддержки на спам — чистая логика без сети и Firestore.
 *
 * зачем вообще: департамент «Поддержка» считал ждущими ВСЕ письма со
 * статусом 'new', включая спам, который владелец никогда не собирался
 * разбирать. Из-за этого Джарвис каждое утро врал: «14 человек ждут
 * ответа 6 дней», хотя реальная очередь была пуста (владелец 2026-08-04).
 *
 * Существующий classifyEmail (support_inbox.ts) смотрит только технические
 * заголовки рассылок (List-Unsubscribe/Precedence/Auto-Submitted) — ручной
 * спам он не ловит вовсе, тот попадает в 'human'/'unknown'. Поэтому здесь
 * решение принимает LLM по теме и тексту письма.
 *
 * ГЛАВНОЕ ПРАВИЛО (владелец 2026-08-04): архивируем ТОЛЬКО очевидный спам.
 * Всё сомнительное остаётся в очереди — потерянное письмо клиента стоит
 * дороже, чем лишняя строка спама в списке. Отсюда высокий порог
 * уверенности и fail-closed на любом непонятном ответе модели.
 */

/** Ниже этой уверенности письмо НЕ архивируется, даже если модель назвала его спамом. */
export const SPAM_ARCHIVE_MIN_CONFIDENCE = 0.9;

/** Обрезка текста письма для промпта: длинные простыни ничего не добавляют к решению. */
const MAX_BODY_CHARS = 1_500;
const MAX_SUBJECT_CHARS = 200;

export interface SpamVerdict {
  readonly isSpam: boolean;
  /** 0..1 — насколько модель уверена. Всё, что вне диапазона, считается битым. */
  readonly confidence: number;
  readonly reason: string;
}

export type SpamAction = 'archive' | 'keep';

export interface SpamTriageInput {
  readonly subject: string;
  readonly bodyText: string;
  readonly fromEmail: string;
}

/**
 * Единственное место, где решается судьба письма.
 *
 * зачем отдельно от парсинга: решение «архивировать» должно быть
 * тривиально читаемым в тестах и в ревью — одно условие, без разбора JSON.
 */
export function decideSpamAction(verdict: SpamVerdict | null): SpamAction {
  if (!verdict) return 'keep';
  if (!verdict.isSpam) return 'keep';
  return verdict.confidence >= SPAM_ARCHIVE_MIN_CONFIDENCE ? 'archive' : 'keep';
}

/**
 * Разбор ответа модели. Любая неполнота — null, а не догадка: непонятый
 * ответ не должен превращаться в решение архивировать чужое письмо.
 */
export function parseSpamVerdict(raw: unknown): SpamVerdict | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  // Модель иногда оборачивает JSON в ```json ... ``` — снимаем обёртку.
  const unwrapped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = unwrapped.indexOf('{');
  const end = unwrapped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(unwrapped.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof parsed.isSpam !== 'boolean') return null;
    const confidence = parsed.confidence;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return null;
    if (confidence < 0 || confidence > 1) return null;
    const reason = typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : '';
    return Object.freeze({ isSpam: parsed.isSpam, confidence, reason });
  } catch {
    return null;
  }
}

export function buildSpamTriagePrompt(input: SpamTriageInput): { system: string; user: string } {
  const system = 'Ты фильтр входящей почты поддержки приложения для изучения английского. '
    + 'Определи, является ли письмо спамом (массовая реклама, SEO-услуги, продажа ссылок, '
    + 'криптовалюта, фишинг, коммерческие предложения без отношения к приложению). '
    + 'НЕ спам: любые вопросы пользователей, жалобы, проблемы с оплатой, возвраты, '
    + 'предложения о сотрудничестве по существу, письма от магазинов приложений и платёжных систем. '
    + 'Если сомневаешься — отвечай isSpam=false. Будь консервативен: ошибочно помеченное '
    + 'спамом письмо реального человека потеряется навсегда. '
    + 'Ответь СТРОГО одним JSON: {"isSpam":boolean,"confidence":число от 0 до 1,"reason":"кратко по-русски"}';

  const user = [
    `Отправитель: ${input.fromEmail.slice(0, 120)}`,
    `Тема: ${input.subject.slice(0, MAX_SUBJECT_CHARS)}`,
    `Текст: ${input.bodyText.slice(0, MAX_BODY_CHARS)}`,
  ].join('\n');

  return { system, user };
}
