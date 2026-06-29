/**
 * Флаги ИИ-диалогов (Фаза 0).
 * Самодостаточный модуль (по образцу remote_flags): env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 */

/**
 * Сколько ПОЛНЫХ бесплатных диалогов получает не-premium за ВСЮ жизнь аккаунта.
 * Было ровно 1 (одна попытка — слишком мало, чтобы «влюбиться» в фичу); подняли
 * до 2, чтобы дать почувствовать ценность до пейвола. Реплики ВНУТРИ диалога
 * по-прежнему без лимита.
 *
 * СЕРВЕР — источник правды: functions/src/premium_dialog.ts → enforceLifetimeFreeDialog()
 * считает потраченные бесплатные диалоги (freeDialogCount) и сравнивает с тем же
 * лимитом. Это число и серверный лимит ДОЛЖНЫ совпадать — иначе клиент покажет
 * «ещё есть», а сервер откажет (или наоборот). Меняешь тут — меняй и там.
 */
export const FREE_DIALOGS_LIFETIME_DEFAULT = 2;

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
