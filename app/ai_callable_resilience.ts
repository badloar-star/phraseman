/**
 * Устойчивость вызовов платных ИИ-функций (explainPhrase / explainMistake /
 * premiumDialogSend / premiumDialogTranslate / premiumDialogReview).
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ (инцидент 2026-08-04, алерт Cloud Monitoring
 * «AI Cloud Run no available instance», policy «Phraseman: AI function has no
 * available instance»): все три платные ИИ-функции держат `minInstances: 0` —
 * это осознанная экономия, закреплённая сторожем
 * tests/ai_functions_warm_instance_contract.test.ts. Платить ~$10–15/мес за
 * функцию ради тёплого инстанса владелец отказался.
 *
 * Цена такой экономии — холодный старт. Обычно он безобиден (запрос просто ждёт
 * 2–5 сек, пока Cloud Run поднимет инстанс), но изредка Cloud Run отклоняет
 * запрос с «no available instance», и пользователь видит ошибку на пустом месте.
 *
 * Лечим тремя слоями, ни один из которых не стоит денег:
 *   1) warmAiFunction() — будим инстанс ЗАРАНЕЕ, по намерению пользователя
 *      (открыл карточку фразы / ошибся в упражнении / открыл экран диалога),
 *      пока он читает или печатает. К моменту реального вызова инстанс тёплый.
 *   2) withAiCallableRetry() — тихий фоновый повтор ОДИН раз для сбоев,
 *      похожих на холодный старт. Пользователь ошибки не видит.
 *   3) UI-слой (ai_wait_copy.ts) — сменные подписи под скелетоном, чтобы
 *      ожидание не читалось как зависание.
 *
 * ВАЖНО про идемпотентность: повторяем ТОЛЬКО вызовы, безопасные к повтору.
 * Диалог (premiumDialogSend) тратит квоту и пишет историю, поэтому повтор там
 * разрешён исключительно для ошибок, при которых сервер заведомо НЕ начал
 * работу (инстанса не было / соединение не установилось). См. isColdStartLike().
 */

/** Сколько ждать перед единственным повтором. Холодный старт Cloud Run — 2–5 сек. */
const RETRY_DELAY_MS = 1600;

/** Инстанс Cloud Run живёт ~15 мин без нагрузки. Чаще будить бессмысленно и расточительно. */
const WARM_TTL_MS = 9 * 60 * 1000;

/**
 * Ошибки, при которых повтор безопасен и осмыслен: сервер до нашей полезной
 * нагрузки НЕ добрался, значит побочных эффектов (списанной квоты, записанной
 * истории, потраченного OpenAI-токена) быть не могло.
 *
 * Намеренно НЕ повторяем: resource-exhausted (лимиты и квоты), unauthenticated,
 * permission-denied, failed-precondition, invalid-argument — там повтор либо
 * бесполезен, либо вреден (второе списание). Также не повторяем 'internal':
 * сервер уже вошёл в тело функции и мог потратить деньги на OpenAI.
 *
 * ⚠️ ГРАНИЦА ДВУХ КЛАССОВ (важно, разбор аудита 2026-08-04):
 * таймаут — это НЕ «сервер не начал». Таймаут означает «мы не знаем, что там
 * происходит»: запрос мог дойти, списать квоту и в этот момент генерировать
 * ответ. Для идемпотентных вызовов (объяснение, разбор — они только читают и
 * кэшируют) повтор по таймауту безвреден. Для вызовов, которые СПИСЫВАЮТ
 * (premiumDialogSend списывает дневную квоту ДО обращения к OpenAI, см.
 * functions/src/premium_dialog.ts → enforceDailyQuota), повтор по таймауту
 * снял бы квоту второй раз — там нужен isDefinitelyNotStarted().
 */
export function isColdStartLike(error: unknown): boolean {
  if (isDefinitelyNotStarted(error)) return true;

  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const text = `${code} ${message}`;

  // Неопределённость: сервер мог уже работать. Повторять можно ТОЛЬКО там, где
  // повторный вызов ничего не списывает.
  if (text.includes('deadline-exceeded')) return true;
  if (text.includes('explain_callable_timeout')) return true;
  return false;
}

/**
 * Строгая проверка: сервер ГАРАНТИРОВАННО не начал обработку — инстанса не было
 * или соединение не поднялось. Побочных эффектов быть не могло даже теоретически.
 *
 * зачем: для не-идемпотентных вызовов (отправка сообщения в диалоге) это
 * единственное безопасное условие повтора. Всё, что «возможно, дошло», здесь
 * отсекается — лучше показать пользователю честную ошибку, чем молча списать
 * вторую единицу дневной квоты.
 */
export function isDefinitelyNotStarted(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const text = `${code} ${message}`;

  // Ровно та ошибка из алерта Cloud Monitoring: Cloud Run отказал на входе.
  if (text.includes('no available instance')) return true;
  // Инстанса нет / сервис не поднят — запрос отклонён до тела функции.
  if (text.includes('unavailable')) return true;
  // Сетевые обрывы RN/Firebase SDK до установления соединения.
  if (text.includes('network request failed')) return true;
  if (text.includes('econnreset') || text.includes('etimedout')) return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

export interface AiCallableRetryOptions {
  /** Метка для логов и тестов (имя callable). */
  label: string;
  /**
   * Разрешён ли повтор для этого вызова вообще. Для не-идемпотентных вызовов
   * (диалог тратит квоту) вызывающий может сузить условие ещё сильнее.
   * По умолчанию — только «похоже на холодный старт».
   */
  shouldRetry?: (error: unknown) => boolean;
  /** Задержка перед повтором; вынесена ради детерминированных тестов. */
  retryDelayMs?: number;
  /** Колбэк на момент начала повтора — UI подменяет подпись под скелетоном. */
  onRetryStart?: () => void;
}

/**
 * Насколько короче ждать на ВТОРОЙ попытке (доля от обычного таймаута).
 *
 * зачем (разбор аудита 2026-08-04): без этого худший случай складывался в
 * 35с (таймаут) + 1.6с (пауза) + 35с (второй таймаут) ≈ 72 секунды до показа
 * ошибки. Столько ждать нельзя — пользователь решит, что приложение умерло.
 * На повторе инстанс уже разбужен первой попыткой, поэтому либо ответ придёт
 * быстро, либо не придёт вовсе: длинное окно там ничего не спасает.
 */
export const AI_RETRY_TIMEOUT_FACTOR = 0.5;

/**
 * Выполняет вызов и при «холодном» сбое ОДИН раз тихо повторяет его.
 *
 * Ровно один повтор, а не экспоненциальный backoff: второй холодный старт
 * подряд означает, что дело не в засыпании инстанса, а в реальной поломке —
 * дальнейшие попытки только тянут ожидание и жгут деньги.
 *
 * `call` — фабрика, а не готовый промис: повтор обязан создать НОВЫЙ вызов,
 * переиспользовать отклонённый промис нельзя. В неё передаётся номер попытки
 * (1 или 2), чтобы вызывающий мог укоротить таймаут второй попытки.
 */
export async function withAiCallableRetry<T>(
  call: (attempt: 1 | 2) => Promise<T>,
  options: AiCallableRetryOptions,
): Promise<T> {
  const shouldRetry = options.shouldRetry ?? isColdStartLike;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;

  try {
    return await call(1);
  } catch (error) {
    if (!shouldRetry(error)) throw error;
    options.onRetryStart?.();
    await delay(retryDelayMs);
    // Второй сбой уходит наверх как есть — UI показывает честную ошибку.
    return call(2);
  }
}

/**
 * Таймаут для попытки: вторая ждёт вдвое меньше первой.
 * Держим общее ожидание в разумных рамках — см. AI_RETRY_TIMEOUT_FACTOR.
 */
export function aiAttemptTimeoutMs(baseMs: number, attempt: 1 | 2): number {
  return attempt === 1 ? baseMs : Math.round(baseMs * AI_RETRY_TIMEOUT_FACTOR);
}

// ── Прогрев по намерению ────────────────────────────────────────────────────

/** Когда каждую функцию будили в последний раз (мс epoch). */
const lastWarmAtMs = new Map<string, number>();
/** Идущие прогревы — второй тап по той же функции не плодит второй вызов. */
const warmInFlight = new Map<string, Promise<void>>();

/** Для тестов: сбросить состояние прогрева между кейсами. */
export function __resetAiWarmStateForTests(): void {
  lastWarmAtMs.clear();
  warmInFlight.clear();
}

/**
 * Нужно ли будить инстанс прямо сейчас. Чистая функция — тестируется без таймеров.
 * Внутри TTL считаем инстанс тёплым и сеть не трогаем: лишний вызов стоит денег
 * (пусть и сотые доли цента), а на большой аудитории это заметный трафик.
 */
export function shouldWarmNow(
  lastAtMs: number | undefined,
  nowMs: number,
  ttlMs = WARM_TTL_MS,
): boolean {
  if (typeof lastAtMs !== 'number') return true;
  return nowMs - lastAtMs >= ttlMs;
}

/**
 * Будит инстанс Cloud Run ЗАРАНЕЕ — до того, как пользователь нажмёт кнопку.
 *
 * зачем: владелец отказался платить за постоянно тёплый инстанс, но хочет
 * мгновенный отклик. Прогрев переносит холодный старт в паузу, когда человек
 * и так занят (читает свою ошибку, печатает сообщение) — для него задержка
 * исчезает, а счёт не растёт: инстанс погаснет сам через ~15 минут.
 *
 * Контракт вызова: НИКОГДА не бросает и ничего не возвращает. Прогрев —
 * необязательная оптимизация; его провал не должен ломать экран. Вызывать
 * через `void warmAiFunction(...)`, не дожидаясь.
 */
export function warmAiFunction(
  key: string,
  ping: () => Promise<unknown>,
  nowMs: number = Date.now(),
): Promise<void> {
  const existing = warmInFlight.get(key);
  if (existing) return existing;
  if (!shouldWarmNow(lastWarmAtMs.get(key), nowMs)) return Promise.resolve();

  // Метку ставим ДО await: иначе два синхронных вызова подряд оба прошли бы
  // проверку TTL и разбудили инстанс дважды.
  lastWarmAtMs.set(key, nowMs);

  const run = ping()
    .then(() => undefined)
    .catch(() => {
      // Прогрев провалился (нет сети, App Check не готов) — молча забываем.
      // Метку НЕ откатываем: при отсутствии сети повторные попытки бессмысленны
      // и только жгли бы батарею; следующий шанс придёт после TTL.
      return undefined;
    })
    .finally(() => {
      warmInFlight.delete(key);
    });

  warmInFlight.set(key, run);
  return run;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
