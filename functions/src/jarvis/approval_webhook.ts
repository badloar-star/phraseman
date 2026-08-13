import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { ADMIN_ALERT_BOT_TOKEN } from '../admin_alerts';
import { handleSupportTelegramAction, handleSupportTelegramFeedback } from '../support_inbox';
import {
  buildApprovalAuditEntry,
  JARVIS_APPROVAL_AUDIT_COLLECTION,
  type ApprovalAuditEntry,
} from './approval_audit';
import { consumeApprovalToken } from './approval_store';
import { handleApprovalCallback, parseOwnerConfig } from './approval_webhook_core';
import { markRowDecided } from './approval_message_edit';
import { issueDecisionButtons } from './issue_decision_buttons';
import { recordPlanOwnerDecision } from './jarvis_plans_store';
import type { InlineKeyboard } from './telegram_buttons';
import { sendJarvisDigest } from './telegram_send';
import type { Decision } from './decision';
import { buildStatusText, type JarvisCommand } from './commands';
import { JARVIS_CONTROL_DOC, parseControl } from './control';
import { JARVIS_TELEGRAM_CONFIG } from './telegram_owner_config';

/**
 * HTTP-точка входа для кнопок Джарвиса в Telegram.
 *
 * Намеренно ТОНКАЯ: вся логика отказов живёт в approval_webhook_core.ts и
 * покрыта тестами целиком. Здесь только транспорт — распаковать запрос,
 * позвать логику, ответить Telegram.
 *
 * зачем отдельный секрет JARVIS_TELEGRAM_CONFIG: полномочия подтверждать
 * действия не должны зависеть от admin_config/alerts, который редактируется
 * из браузера. Иначе любой с доступом к админке подменил бы получателя и
 * стал бы «владельцем» для approvals.
 *
 * Функция ВЫКЛЮЧЕНА, пока секрет не задан: без конфига она отвечает 404 и
 * не трогает ни Firestore, ни Telegram — как требует runbook.
 *
 * Вебхук ставится ВРУЧНУЮ — см. docs/guides/jarvis-telegram-approvals.md
 * (там же модель безопасности, формат секрета и проверка после деплоя).
 * В коде установки нет намеренно: деплой не должен перебивать вебхук бота,
 * общего с алертами.
 */

export { JARVIS_TELEGRAM_CONFIG } from './telegram_owner_config';

const REGION = 'us-central1';

/** Заголовок, которым Telegram передаёт секрет вебхука. */
const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Фиктивное решение для самопроверки кнопок.
 * зачем department 'quality': реальный департамент, чтобы путь выдачи токена
 * был ровно тот же, что в суточном кроне, без особых веток.
 */
const SELFTEST_DECISION = {
  department: 'quality',
  finding: 'Проверка кнопок подтверждения.',
  recommendation: 'Проверка',
} as unknown as Decision;

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
  } catch (error) {
    // Не ответить на callback — некритично: действие уже выполнено.
    logger.warn('jarvis_approval: answerCallbackQuery failed', error);
  }
}

async function sendPlainMessage(botToken: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (error) {
    logger.warn('jarvis_approval: command reply failed', error);
  }
}

/**
 * зачем: без этого владелец не видит, что нажатие вообще случилось — только
 * секундный тост от answerCallbackQuery, который легко пропустить. Меняет
 * ТОЛЬКО клавиатуру (не текст) — это единственный правкой, который Telegram
 * позволяет без риска испортить исходное сообщение.
 */
async function editMessageReplyMarkup(
  botToken: string,
  chatId: string,
  messageId: number,
  keyboard: InlineKeyboard,
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: keyboard }),
    });
  } catch (error) {
    // Некритично: решение уже зафиксировано в Firestore, это только видимость.
    logger.warn('jarvis_approval: editMessageReplyMarkup failed', error);
  }
}

interface HandleCommandInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly command: JarvisCommand;
  readonly chatId: string;
  readonly botToken: string;
  readonly nowMs: number;
}

/**
 * Реакция на /status, /stop, /start (бриф в99, в267).
 *
 * зачем отдельно от consume: это не подтверждение решения по токену, а прямой
 * запрос состояния или изменение режима — команда не тратит approval-токен.
 */
async function handleCommand(input: HandleCommandInput): Promise<void> {
  const ref = input.db.doc(JARVIS_CONTROL_DOC);

  if (input.command === 'status') {
    const snap = await ref.get().catch(() => null);
    const control = parseControl(snap?.data());
    const text = buildStatusText({
      mode: control.mode,
      reason: control.reason,
      lastRunAtMs: control.lastRunAtMs,
      openDecisions: control.lastRunOpenDecisions ?? 0,
      nowMs: input.nowMs,
    });
    await sendPlainMessage(input.botToken, input.chatId, text);
    return;
  }

  // /stop и /start меняют режим. merge:true — не затираем lastRunAtMs и
  // прочие поля, которых нет в этом патче.
  const nextMode = input.command === 'stop' ? 'off' : 'observe';
  await ref.set(
    {
      mode: nextMode,
      reason: input.command === 'stop' ? 'остановлен командой /stop из Telegram' : null,
      changedBy: 'owner_telegram',
      changedAtMs: input.nowMs,
    },
    { merge: true },
  );
  // зачем отдельно от jarvis_control: то поле перезаписывается следующей
  // командой, а «кто и когда останавливал» обязано остаться в неизменяемой
  // истории (бриф в186, в235), не только в последнем известном значении.
  await input.db.collection(JARVIS_APPROVAL_AUDIT_COLLECTION).add(
    buildApprovalAuditEntry({
      action: input.command, department: 'jarvis', decisionHash: '',
      outcome: 'accepted', nowMs: input.nowMs,
    }),
  ).catch((error) => logger.warn('jarvis_approval: command audit write failed', error));
  await sendPlainMessage(
    input.botToken,
    input.chatId,
    input.command === 'stop'
      ? '⏸ Джарвис остановлен. Пришлите /start, чтобы возобновить.'
      : '▶️ Джарвис снова наблюдает.',
  );
}

export const jarvisTelegramApprovalWebhook = onRequest(
  {
    region: REGION,
    // Public webhook only authenticates and atomically enqueues. Gmail/OpenAI
    // secrets belong exclusively to the closed support worker.
    secrets: [JARVIS_TELEGRAM_CONFIG, ADMIN_ALERT_BOT_TOKEN],
    timeoutSeconds: 30,
    memory: '256MiB',
    // Вебхук зовёт Telegram, а не браузер — App Check неприменим.
    cors: false,
  },
  async (req, res) => {
    // Telegram шлёт только POST. Всё остальное — не наш запрос.
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const config = parseOwnerConfig(JARVIS_TELEGRAM_CONFIG.value());
    if (!config) {
      // Секрет не задан или битый — функция считается невключённой.
      res.status(404).send('Not Found');
      return;
    }

    const providedSecret = req.get(SECRET_HEADER) ?? undefined;
    const db = admin.firestore();

    // зачем самопроверка: без неё «работают ли кнопки» проверить нечем —
    // токен рождается только внутри суточного крона. Пригодится после каждого
    // рефакторинга approvals, поэтому не удалена, а закрыта выключателем.
    //
    // зачем ДВА условия: секрета мало. Он живёт в конфиге годами, а лишняя
    // дверь в боевой функции — это дверь. Чтобы открыть проверку, нужно
    // осознанно добавить selftestEnabled в секрет.
    if ((req.body as Record<string, unknown> | undefined)?.selftest === true) {
      if (!providedSecret || providedSecret !== config.webhookSecret) {
        res.status(401).send('');
        return;
      }
      if (!config.selftestEnabled) {
        // Выключена — ведём себя так, будто ветки нет вовсе.
        res.status(404).send('Not Found');
        return;
      }
      const keyboard = await issueDecisionButtons({
        db,
        decisions: [SELFTEST_DECISION],
        config,
        nowMs: Date.now(),
      });
      const sent = await sendJarvisDigest({
        botToken: ADMIN_ALERT_BOT_TOKEN.value(),
        chatId: config.ownerTelegramChatId,
        text: '🤖 <b>Джарвис</b> · проверка кнопок\n\nНажмите «Проверка» — рабочая кнопка должна ответить «Принято, подтверждено».',
        keyboard,
      });
      res.status(200).json({ ok: sent, hadKeyboard: keyboard !== null });
      return;
    }

    const nowMs = Date.now();
    let audit: ApprovalAuditEntry | null = null;

    const result = await handleApprovalCallback({
      body: req.body,
      providedSecret,
      config,
      nowMs,
      consume: async (input) => {
        const supportOutcome = await handleSupportTelegramAction({ db, ...input });
        const outcome = supportOutcome ?? await consumeApprovalToken({ db, ...input });
        // зачем ловить здесь: только тут известны и департамент, и вердикт.
        // Отказы пишем тоже — попытка нажать чужую кнопку это свидетельство.
        audit = buildApprovalAuditEntry({
          action: outcome.ok ? outcome.doc.action : 'approve',
          department: outcome.ok ? outcome.doc.department : 'unknown',
          decisionHash: outcome.ok ? outcome.doc.decisionHash : '',
          outcome: outcome.ok ? 'accepted' : outcome.reason,
          nowMs,
        });
        if (outcome.ok && !outcome.doc.department.startsWith('support_email:')) {
          await recordPlanOwnerDecision({
            db,
            approvalDecisionHash: outcome.doc.decisionHash,
            action: outcome.doc.action,
            nowMs,
          }).catch((error) => {
            // Approval audit остаётся источником истины даже если план временно
            // недоступен; Telegram не должен ретраить уже погашенный токен.
            logger.warn('jarvis_approval: plan lifecycle update failed', error);
          });
        }
        return outcome;
      },
    });

    if (audit) {
      // Журнал не должен ломать ответ Telegram: пишем «как получится».
      await db.collection(JARVIS_APPROVAL_AUDIT_COLLECTION).add(audit).catch((error) => {
        logger.warn('jarvis_approval: audit write failed', error);
      });
    }

    if (result.status !== 200) {
      // Молча: подробности отказа наружу не уходят.
      res.status(result.status).send('');
      return;
    }

    // зачем отдельная ветка: /status и /stop не проходят через consume —
    // это не подтверждение решения, а прямой запрос состояния/управления.
    if (result.command) {
      await handleCommand({
        db,
        command: result.command,
        chatId: config.ownerTelegramChatId,
        botToken: ADMIN_ALERT_BOT_TOKEN.value(),
        nowMs,
      });
      res.status(200).send('');
      return;
    }

    if (result.ownerText) {
      const feedback = await handleSupportTelegramFeedback({
        db, text: result.ownerText,
        fromTelegramUserId: config.ownerTelegramUserId,
        fromTelegramChatId: config.ownerTelegramChatId,
        nowMs,
      });
      if (feedback === 'queued') {
        await sendPlainMessage(ADMIN_ALERT_BOT_TOKEN.value(), config.ownerTelegramChatId, '✏️ Принял правки. Джарвис переписывает ответ и пришлёт новую версию с кнопками.');
      } else if (feedback === 'expired') {
        await sendPlainMessage(ADMIN_ALERT_BOT_TOKEN.value(), config.ownerTelegramChatId, 'Сессия правок устарела. Нажмите «Внести правки» у актуальной версии ещё раз.');
      }
      res.status(200).send('');
      return;
    }

    if (result.callbackQueryId && result.answerText) {
      await answerCallbackQuery(ADMIN_ALERT_BOT_TOKEN.value(), result.callbackQueryId, result.answerText);
    }

    // зачем отдельно от answerCallbackQuery: тост исчезает за секунду и легко
    // пропустить — владелец жаловался, что не видно, нажата кнопка или нет.
    // Правим ТОЛЬКО клавиатуру одной строки, текст сводки не трогаем.
    if (result.messageEdit) {
      const callback = (req.body as Record<string, unknown> | undefined)?.callback_query as
        Record<string, unknown> | undefined;
      const message = (callback?.message ?? {}) as Record<string, unknown>;
      const pressedCallbackData = typeof callback?.data === 'string' ? callback.data : '';
      const currentKeyboard = (message.reply_markup ?? null) as InlineKeyboard | null;
      const nextKeyboard = markRowDecided(currentKeyboard, pressedCallbackData, result.messageEdit.action);
      if (nextKeyboard) {
        await editMessageReplyMarkup(
          ADMIN_ALERT_BOT_TOKEN.value(),
          result.messageEdit.chatId,
          result.messageEdit.messageId,
          nextKeyboard,
        );
      }
    }

    // 200 обязателен, иначе Telegram будет повторять доставку.
    res.status(200).send('');
  },
);
