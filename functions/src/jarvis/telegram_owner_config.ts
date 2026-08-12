import { defineSecret } from 'firebase-functions/params';

/** Shared owner-only Telegram webhook configuration from Secret Manager. */
export const JARVIS_TELEGRAM_CONFIG = defineSecret('JARVIS_TELEGRAM_CONFIG');
