/**
 * Встроенные пакеты фразы дня для es/de/it (D163).
 *
 * зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ»): принятые пакеты
 * 2026.10.04.editorial-accepted-dev-v1 раньше качались из облака только в dev-сборке. Теперь они в сборке — без сети и без
 * чтений Firestore (генератор scripts/build_daily_phrase_bundled_packs.mjs).
 * зачем ресурс-файл (координатор 12.10): как JS-модули (constants/*.json) пакеты давали +2,27 МБ байт-кода в бандле. Теперь это
 * assets/daily_phrase_packs/<цель>.dpk — читается с диска при первом открытии фразы дня (app/daily_phrase_pack_assets.ts),
 * разбирается один раз и держится в памяти процесса.
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

// Удачная загрузка держится до конца процесса; отказ НЕ кэшируется — следующий заход попробует снова (сбой чтения бывает разовым).
const loaded = new Map<BundledDailyPhraseTarget, BundledDailyPhrasePack>();
const inFlight = new Map<BundledDailyPhraseTarget, Promise<BundledDailyPhrasePack | null>>();

export function loadBundledDailyPhrasePack(target: BundledDailyPhraseTarget): Promise<BundledDailyPhrasePack | null> {
  const cached = loaded.get(target);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(target);
  if (pending) return pending;
  const run = readAndParseBundledDailyPhrasePack(target).finally(() => { inFlight.delete(target); });
  inFlight.set(target, run);
  return run;
}

async function readAndParseBundledDailyPhrasePack(target: BundledDailyPhraseTarget): Promise<BundledDailyPhrasePack | null> {
  const startedAt = Date.now();
  let pack: BundledDailyPhrasePack | null = null;
  // зачем динамический импорт: модуль ресурсов тянет expo-asset/expo-file-system и ссылку на .dpk. Отдельный кусок бандла
  // грузится только при открытии фразы дня es/de/it; а в dev, пока сборщик не перезапущен с новым типом файла, отказ
  // ограничится фразой дня, не уронив сборку всего приложения.
  let text: string | null = null;
  try {
    const assets = await import('./daily_phrase_pack_assets');
    text = await assets.readDailyPhrasePackText(target);
  } catch (error) {
    console.warn('[DAILY-PHRASE-GATE] bundled pack module import failed', JSON.stringify({ target, message: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
  }
  if (text) {
    try {
      pack = JSON.parse(text) as BundledDailyPhrasePack;
    } catch (error) {
      console.warn('[DAILY-PHRASE-GATE] bundled pack parse failed', JSON.stringify({ target, message: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
      pack = null;
    }
  }
  if (pack && (pack.studyTarget !== target || !Array.isArray(pack.entries))) {
    console.warn('[DAILY-PHRASE-GATE] bundled pack rejected — header mismatch', JSON.stringify({ target, packTarget: pack.studyTarget, hasEntries: Array.isArray(pack.entries) })); // guard-ok: ранний выход называет причину
    pack = null;
  }
  console.log('[DAILY-PHRASE-GATE] bundled pack loaded', JSON.stringify({ target, ok: pack !== null, rows: pack?.entries.length ?? 0, version: pack?.contentVersion ?? null, ms: Date.now() - startedAt }));
  if (pack) loaded.set(target, pack);
  return pack;
}

export default function __DailyPhraseBundledPacksRouteShim() {
  return null;
}
