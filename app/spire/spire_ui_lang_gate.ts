/**
 * Шпиль только для интерфейса ru и uk — первый выпуск.
 *
 * зачем (владелец 11.10 через координатора, по симуляции SPIRE_SIMULATION_2026-10-11): задания Шпиля и его пуши
 * пока существуют только по-русски (и пуши — по-украински). Человек с интерфейсом en/es/pt-BR/vi/id/tr/pl увидел бы
 * чужой язык, поэтому для него Шпиль скрыт целиком. Список языков — единственное место, которое расширяется,
 * когда появятся переводы.
 */
export const SPIRE_UI_LANGS: readonly string[] = Object.freeze(['ru', 'uk']);

export type SpireUiLangDecision = Readonly<{ allowed: boolean; lang: string | null; reason: 'ui_lang_allowed' | 'ui_lang_not_supported' | 'ui_lang_unknown' }>;

/** Решение по языку интерфейса. Язык ещё не известен (первый кадр холодного старта) — скрыт: лучше на кадр позже, чем чужой язык. */
export function spireUiLangDecision(lang: string | null | undefined): SpireUiLangDecision {
  if (typeof lang !== 'string' || lang.length === 0) return { allowed: false, lang: null, reason: 'ui_lang_unknown' };
  return SPIRE_UI_LANGS.includes(lang)
    ? { allowed: true, lang, reason: 'ui_lang_allowed' }
    : { allowed: false, lang, reason: 'ui_lang_not_supported' };
}

let lastLogged: string | null = null;

/** [SPIRE-GATE] — одна строка при каждой смене решения (не на каждый вызов: замок читается часто). */
export function logSpireUiLangGate(decision: SpireUiLangDecision, where: string): void {
  const key = `${decision.lang}:${decision.allowed}`;
  if (key === lastLogged) return;
  lastLogged = key;
  console.log('[SPIRE-GATE]', JSON.stringify({ lang: decision.lang, allowed: decision.allowed, reason: decision.reason, where }));
}

/** Только для тестов. */
export function __resetSpireUiLangGateLogForTests(): void {
  lastLogged = null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
