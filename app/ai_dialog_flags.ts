/**
 * Флаги ИИ-диалогов (Фаза 0).
 * Самодостаточный модуль (по образцу remote_flags): env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 */

export const FREE_DIALOGS_PER_DAY_DEFAULT = 10;

function numFromEnv(name: string): number | undefined {
  const raw = name === 'EXPO_PUBLIC_FREE_DIALOGS' ? process.env.EXPO_PUBLIC_FREE_DIALOGS : undefined;
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function boolFromEnv(name: string): boolean | undefined {
  const raw = name === 'EXPO_PUBLIC_AI_DIALOG_ENABLED' ? process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED : undefined;
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Сколько бесплатных диалогов в день для не-premium. */
export function getFreeDialogsPerDay(): number {
  const v = numFromEnv('EXPO_PUBLIC_FREE_DIALOGS');
  return v != null && v >= 0 ? Math.floor(v) : FREE_DIALOGS_PER_DAY_DEFAULT;
}

/** Включена ли фича (когортный rollout). Дефолт true; env может выключить вход. */
export function isAiDialogEnabled(): boolean {
  return boolFromEnv('EXPO_PUBLIC_AI_DIALOG_ENABLED') ?? true;
}
