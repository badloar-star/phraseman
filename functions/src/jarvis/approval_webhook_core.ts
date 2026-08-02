import { timingSafeEqual } from 'node:crypto';
import { parseCallbackData, type ApprovalAction, type ApprovalRejectReason } from './approval_token';

/**
 * Чистая логика обработки нажатия кнопки в Telegram.
 *
 * зачем отдельно от HTTP: это граница доверия — сюда приходит запрос из
 * интернета. Логику отказов надо проверять тестами целиком, а не через
 * поднятый сервер, поэтому здесь нет ни Firestore, ни сети: хранилище
 * приходит функцией `consume`.
 *
 * Порядок проверок принципиален: сначала секрет вебхука (кто вообще
 * стучится), потом личность нажавшего, и только затем — обращение к базе.
 * Так посторонний не может нагрузить Firestore, подбирая nonce.
 */

/** Минимум по runbook: 32 символа случайности. */
const MIN_SECRET_LEN = 32;

export interface OwnerConfig {
  readonly webhookSecret: string;
  readonly ownerTelegramUserId: string;
  readonly ownerTelegramChatId: string;
  /** Проверочная ветка выдачи кнопки. По умолчанию ВЫКЛЮЧЕНА. */
  readonly selftestEnabled: boolean;
}

/**
 * Разбор секрета из Secret Manager.
 *
 * зачем не брать chatId из admin_config/alerts: тот документ редактируется из
 * браузера. Кто угодно с доступом к админке подменил бы получателя и стал бы
 * «владельцем» для approvals. Полномочия подтверждать действия обязаны идти
 * из серверного секрета.
 */
export function parseOwnerConfig(raw: unknown): OwnerConfig | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const webhookSecret = String(parsed.webhookSecret ?? '');
    const ownerTelegramUserId = String(parsed.ownerTelegramUserId ?? '');
    const ownerTelegramChatId = String(parsed.ownerTelegramChatId ?? '');
    if (webhookSecret.length < MIN_SECRET_LEN) return null;
    if (!ownerTelegramUserId || !ownerTelegramChatId) return null;
    // зачем строгое === true: любое другое значение (строка "false", 1,
    // отсутствие поля) обязано читаться как «выключено». Проверочная ветка
    // в боевой функции открывается только явным намерением.
    const selftestEnabled = parsed.selftestEnabled === true;
    return Object.freeze({ webhookSecret, ownerTelegramUserId, ownerTelegramChatId, selftestEnabled });
  } catch {
    return null;
  }
}

/** Сравнение секретов, устойчивое ко времени — как и для nonce. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export type ConsumeFn = (input: {
  readonly nonce: string;
  readonly fromTelegramUserId: string;
  readonly fromTelegramChatId: string;
  readonly nowMs: number;
}) => Promise<
  // зачем поля обязательные: журнал подтверждений берёт их отсюда. С
  // необязательными он молча писал бы пустоту при рефакторинге хранилища.
  | {
    readonly ok: true;
    readonly doc: {
      readonly department: string;
      readonly action: ApprovalAction;
      readonly decisionHash: string;
    };
  }
  | { readonly ok: false; readonly reason: ApprovalRejectReason | 'storage_error' }
>;

export interface HandleApprovalCallbackInput {
  readonly body: unknown;
  readonly providedSecret: string | undefined;
  readonly config: OwnerConfig;
  readonly consume: ConsumeFn;
  readonly nowMs: number;
}

export interface HandleApprovalCallbackResult {
  readonly status: number;
  /** Текст всплывающего ответа в Telegram. Пусто — отвечать нечего. */
  readonly answerText?: string;
  readonly callbackQueryId?: string;
}

/** Одинаковый ответ всем посторонним: не подсказываем, что именно не так. */
const STRANGER_ANSWER = 'Эта кнопка не для вас.';

const REASON_ANSWER: Record<string, string> = {
  expired: 'Кнопка устарела — запросите свежую сводку.',
  already_used: 'Это уже подтверждено.',
  unknown_nonce: 'Кнопка недействительна.',
  wrong_user: STRANGER_ANSWER,
  wrong_chat: STRANGER_ANSWER,
  storage_error: 'Не удалось сохранить — попробуйте ещё раз.',
};

export async function handleApprovalCallback(
  input: HandleApprovalCallbackInput,
): Promise<HandleApprovalCallbackResult> {
  // 1. Секрет вебхука. Без него запрос не от Telegram — дальше не идём.
  if (!input.providedSecret || !safeEqual(input.providedSecret, input.config.webhookSecret)) {
    return { status: 401 };
  }

  const body = (input.body ?? {}) as Record<string, unknown>;
  const callback = body.callback_query as Record<string, unknown> | undefined;
  // Обычные сообщения нас не касаются: 200, чтобы Telegram не повторял доставку.
  if (!callback) return { status: 200 };

  const callbackQueryId = typeof callback.id === 'string' ? callback.id : undefined;

  const parsed = parseCallbackData(callback.data);
  // Чужой формат (в т.ч. ao1 снесённого слоя) молча игнорируем.
  if (!parsed) return { status: 200, callbackQueryId };

  const from = (callback.from ?? {}) as Record<string, unknown>;
  const message = (callback.message ?? {}) as Record<string, unknown>;
  const chat = (message.chat ?? {}) as Record<string, unknown>;
  const fromUserId = String(from.id ?? '');
  const fromChatId = String(chat.id ?? '');

  // 2. Личность — ДО обращения к базе, чтобы посторонний не нагружал Firestore.
  if (fromUserId !== input.config.ownerTelegramUserId || fromChatId !== input.config.ownerTelegramChatId) {
    return { status: 200, callbackQueryId, answerText: STRANGER_ANSWER };
  }

  // 3. И только теперь — погашение токена.
  const outcome = await input.consume({
    nonce: parsed.nonce,
    fromTelegramUserId: fromUserId,
    fromTelegramChatId: fromChatId,
    nowMs: input.nowMs,
  });

  if (!outcome.ok) {
    return { status: 200, callbackQueryId, answerText: REASON_ANSWER[outcome.reason] ?? 'Не получилось.' };
  }

  const answerText = parsed.action === 'approve' ? 'Принято, подтверждено.' : 'Принято, отклонено.';
  return { status: 200, callbackQueryId, answerText };
}
