/**
 * Флаги фичи «Объясни как для 5-летнего» (Фаза 5).
 * Самодостаточный модуль по образцу ai_dialog_flags.ts: env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 *
 * Дефолт OFF — когортный rollout: фича скрыта, пока EXPO_PUBLIC_EXPLAIN_ENABLED не
 * выставлен явно в 'true'/'1'. Клиент НИКОГДА не решает «годен/не годен» контент —
 * флаг лишь показывает/прячет кнопку.
 */

/** Дефолт видимости фичи: выключена, пока env явно не включит. */
export const EXPLAIN_ENABLED_DEFAULT = false;

function numFromEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function boolFromEnv(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Включена ли фича (когортный rollout). Дефолт false. */
export function isExplainEnabled(): boolean {
  return boolFromEnv('EXPO_PUBLIC_EXPLAIN_ENABLED') ?? EXPLAIN_ENABLED_DEFAULT;
}
