/**
 * Флаги ИИ-диалогов (Фаза 0).
 * Самодостаточный модуль (по образцу remote_flags): env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 */

/**
 * Сколько ПОЛНЫХ бесплатных диалогов получает не-premium за ВСЮ жизнь аккаунта.
 * Модель (запрос пользователя 2026-06-20): ровно ОДИН пробный диалог без лимита
 * реплик внутри, дальше полный премиум-замок. Это число держим синхронным с
 * сервером (functions/src/openai_dialog_model_config.ts → DIALOG_FREE_LIFETIME_*).
 * Меняешь тут — меняй и на сервере, иначе клиент и сервер разойдутся.
 */
export const FREE_DIALOGS_LIFETIME_DEFAULT = 1;

function boolFromEnv(name: string): boolean | undefined {
  const raw = name === 'EXPO_PUBLIC_AI_DIALOG_ENABLED' ? process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED : undefined;
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Сколько бесплатных диалогов за всю жизнь аккаунта (не в день) для не-premium. */
export function getFreeDialogsLifetime(): number {
  return FREE_DIALOGS_LIFETIME_DEFAULT;
}

/** Включена ли фича (когортный rollout). Дефолт true; env может выключить вход. */
export function isAiDialogEnabled(): boolean {
  return boolFromEnv('EXPO_PUBLIC_AI_DIALOG_ENABLED') ?? true;
}
