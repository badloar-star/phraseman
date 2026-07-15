/**
 * Флаги ИИ-диалогов (Фаза 0).
 * Самодостаточный модуль (по образцу remote_flags): env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 */

/**
 * Legacy-совместимость старых клиентов. Диалоги теперь целиком входят в Plus,
 * поэтому бесплатных пожизненных попыток нет. Сервер независимо проверяет Plus
 * до вызова AI-провайдера, а этот ноль не даёт старому локальному UX показать trial.
 */
export const FREE_DIALOGS_LIFETIME_DEFAULT = 0;

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
