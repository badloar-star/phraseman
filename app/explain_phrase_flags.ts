import { DebugLogger } from './debug-logger';
/**
 * Флаги фичи «Объясни как для 5-летнего» (Фаза 5).
 * Самодостаточный модуль по образцу ai_dialog_flags.ts: env-override + дефолты.
 * Вынесен отдельно, т.к. общий remote_flags.ts в этой ветке ещё не закоммичен
 * параллельной сессией; при слиянии можно переехать в него без смены сигнатур.
 *
 * Дефолт ON (kill-switch): фича едет с релизом во всех сборках. Remote Config
 * (admin «Пульт») или env EXPO_PUBLIC_EXPLAIN_ENABLED='0'/'false' могут выключить
 * её явно. Клиент НИКОГДА не решает «годен/не годен» контент — флаг лишь
 * показывает/прячет кнопку.
 */

/** Дефолт видимости фичи: ВКЛЮЧЕНА (kill-switch). Раньше была false и пропадала
 *  в dev/preview EAS-сборках без EXPO_PUBLIC_EXPLAIN_ENABLED. Remote Config
 *  (admin «Пульт») и env могут выключить её явно. */
export const EXPLAIN_ENABLED_DEFAULT = true;

function explainEnabledFromEnv(): boolean | undefined {
  const raw = process.env.EXPO_PUBLIC_EXPLAIN_ENABLED;
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Включена ли фича (когортный rollout). Дефолт true (kill-switch, см. EXPLAIN_ENABLED_DEFAULT).
 *  Источники (любой включает): Remote Config (admin «Пульт») ИЛИ env QA-флаг. */
export function isExplainEnabled(): boolean {
  // Remote Config имеет приоритет: если админ включил — фича включена.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRemoteBool } = require('./remote_flags') as { getRemoteBool: (k: string) => boolean };
    if (getRemoteBool('explain_enabled')) return true;
  } catch (e) {
      // remote_flags недоступен — падаем на env
      DebugLogger.error('explain_phrase_flags:isExplainEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return explainEnabledFromEnv() ?? EXPLAIN_ENABLED_DEFAULT;
}
