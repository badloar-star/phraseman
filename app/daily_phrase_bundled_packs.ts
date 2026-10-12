/**
 * Встроенные пакеты фразы дня для es/de/it (D163).
 *
 * зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ»): принятые пакеты
 * 2026.10.04.editorial-accepted-dev-v1 раньше качались из облака только в dev-сборке. Теперь они в сборке
 * (constants/daily_phrase_packs/<цель>.json, генератор scripts/build_daily_phrase_bundled_packs.mjs) — без сети и без чтений
 * Firestore. `require` внутри функции: Metro inlineRequires исполняет JSON только при первом обращении (как каталог идиом),
 * поэтому первый кадр Главной не платит за ~0,7 МБ данных другого языка.
 */
export type BundledDailyPhraseTarget = 'es' | 'de' | 'it';

export type BundledDailyPhraseEntry = Readonly<{
  id?: string;
  order?: number;
  targetText?: string;
  literal_ru?: string;
  meaning_ru?: string;
  text_ru?: string;
  literal_uk?: string;
  meaning_uk?: string;
  text_uk?: string;
  quiz_ru?: unknown;
  quiz_uk?: unknown;
  allowSave?: boolean;
  scheduledDate?: string;
}>;

export type BundledDailyPhrasePack = Readonly<{
  schemaVersion: string;
  studyTarget: BundledDailyPhraseTarget;
  contentVersion: string;
  decision: string;
  sourcePayloadSha256: Readonly<{ ru: string; uk: string }>;
  entries: readonly BundledDailyPhraseEntry[];
}>;

export const BUNDLED_DAILY_PHRASE_TARGETS: readonly BundledDailyPhraseTarget[] = Object.freeze(['es', 'de', 'it']);

export function hasBundledDailyPhrasePack(target: unknown): target is BundledDailyPhraseTarget {
  return target === 'es' || target === 'de' || target === 'it';
}

const loaded = new Map<BundledDailyPhraseTarget, BundledDailyPhrasePack | null>();

export function loadBundledDailyPhrasePack(target: BundledDailyPhraseTarget): BundledDailyPhrasePack | null {
  if (loaded.has(target)) return loaded.get(target) ?? null;
  const startedAt = Date.now();
  let pack: BundledDailyPhrasePack | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    if (target === 'es') pack = require('../constants/daily_phrase_packs/es.json') as BundledDailyPhrasePack;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    else if (target === 'de') pack = require('../constants/daily_phrase_packs/de.json') as BundledDailyPhrasePack;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    else if (target === 'it') pack = require('../constants/daily_phrase_packs/it.json') as BundledDailyPhrasePack;
  } catch (error) {
    console.warn('[DAILY-PHRASE-GATE] bundled pack require failed', JSON.stringify({ target, message: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
    pack = null;
  }
  if (pack && (pack.studyTarget !== target || !Array.isArray(pack.entries))) {
    console.warn('[DAILY-PHRASE-GATE] bundled pack rejected — header mismatch', JSON.stringify({ target, packTarget: pack.studyTarget, hasEntries: Array.isArray(pack.entries) })); // guard-ok: ранний выход называет причину
    pack = null;
  }
  console.log('[DAILY-PHRASE-GATE] bundled pack loaded', JSON.stringify({ target, ok: pack !== null, rows: pack?.entries.length ?? 0, version: pack?.contentVersion ?? null, ms: Date.now() - startedAt }));
  loaded.set(target, pack);
  return pack;
}

export default function __DailyPhraseBundledPacksRouteShim() {
  return null;
}
