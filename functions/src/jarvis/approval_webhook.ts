import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { ADMIN_ALERT_BOT_TOKEN } from '../admin_alerts';
import {
  buildApprovalAuditEntry,
  JARVIS_APPROVAL_AUDIT_COLLECTION,
  type ApprovalAuditEntry,
} from './approval_audit';
import { consumeApprovalToken } from './approval_store';
import { handleApprovalCallback, parseOwnerConfig } from './approval_webhook_core';

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
 * Вебхук ставится ВРУЧНУЮ (docs/guides/jarvis-telegram-approvals.md).
 * В коде установки нет намеренно: деплой не должен перебивать вебхук бота,
 * общего с алертами.
 */

export const JARVIS_TELEGRAM_CONFIG = defineSecret('JARVIS_TELEGRAM_CONFIG');

const REGION = 'us-central1';

/** Заголовок, которым Telegram передаёт секрет вебхука. */
const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

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

export const jarvisTelegramApprovalWebhook = onRequest(
  {
    region: REGION,
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

    const nowMs = Date.now();
    let audit: ApprovalAuditEntry | null = null;

    const result = await handleApprovalCallback({
      body: req.body,
      providedSecret,
      config,
      nowMs,
      consume: async (input) => {
        const outcome = await consumeApprovalToken({ db, ...input });
        // зачем ловить здесь: только тут известны и департамент, и вердикт.
        // Отказы пишем тоже — попытка нажать чужую кнопку это свидетельство.
        audit = buildApprovalAuditEntry({
          action: outcome.ok ? outcome.doc.action : 'approve',
          department: outcome.ok ? outcome.doc.department : 'unknown',
          decisionHash: outcome.ok ? outcome.doc.decisionHash : '',
          outcome: outcome.ok ? 'accepted' : outcome.reason,
          nowMs,
        });
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

    if (result.callbackQueryId && result.answerText) {
      await answerCallbackQuery(ADMIN_ALERT_BOT_TOKEN.value(), result.callbackQueryId, result.answerText);
    }

    // 200 обязателен, иначе Telegram будет повторять доставку.
    res.status(200).send('');
  },
);
