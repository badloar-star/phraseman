import * as Crypto from 'expo-crypto';

import type { DailyPhrase, DailyPhraseQuiz } from './daily_phrase_system';
import {
  getDailyPhraseDevServerPackRegistration,
  normalizeDailyPhraseDevSourceLocale,
  normalizeDailyPhraseDevTarget,
  type DailyPhraseDevSourceLocale,
  type DailyPhraseDevTarget,
} from './daily_phrase_remote_registration';
import { hasBundledDailyPhrasePack, loadBundledDailyPhrasePack } from './daily_phrase_bundled_packs';

type TargetDailyPhraseEntry = {
  id?: string;
  order?: number;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  targetText?: string;
  literal?: string;
  meaning?: string;
  text?: string;
  literal_ru?: string;
  meaning_ru?: string;
  text_ru?: string;
  literal_uk?: string;
  meaning_uk?: string;
  text_uk?: string;
  allowSave?: boolean;
  active?: boolean;
  scheduledDate?: string;
  quiz_ru?: DailyPhraseQuiz;
  quiz_uk?: DailyPhraseQuiz;
};

type TargetDailyPhrasePayload = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  entries?: TargetDailyPhraseEntry[];
};

type TargetDailyPhraseManifest = {
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  sha256?: string;
  payloadSha256?: string;
  payloadShard?: string;
  entryIndex?: string;
  devOnly?: boolean;
  uploadPerformed?: boolean;
};

const LOAD_TIMEOUT_MS = 8000;
const payloadCache = new Map<string, Promise<readonly DailyPhrase[]>>();
const resolvedPayloadCache = new Map<string, readonly DailyPhrase[]>();

function cacheKey(target: DailyPhraseDevTarget, sourceLocale: DailyPhraseDevSourceLocale): string {
  return `${target}:${sourceLocale}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await withTimeout(fetch(url), LOAD_TIMEOUT_MS);
    if (!response?.ok) {
      console.warn('[DAILY-PHRASE-GATE] remote fetch not ok', JSON.stringify({ status: response?.status ?? 'timeout' })); // guard-ok: ранний выход называет причину
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn('[DAILY-PHRASE-GATE] remote fetch failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
    return null;
  }
}

function payloadFilename(manifest: TargetDailyPhraseManifest): string | null {
  const candidate = manifest.payloadShard || manifest.entryIndex;
  if (typeof candidate !== 'string') return null;
  return /^[A-Za-z0-9._-]+\.json$/.test(candidate) ? candidate : null;
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function required(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function entryToTargetDailyPhrase(
  entry: TargetDailyPhraseEntry,
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
  date: string,
): DailyPhrase | null {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (
    !studyTarget ||
    !sourceLocale ||
    entry.studyTarget !== studyTarget ||
    entry.sourceLocale !== sourceLocale ||
    entry.surface !== 'daily_phrase'
  ) return null;

  const targetText = required(entry.targetText);
  const literalRu = required(entry.literal_ru);
  const meaningRu = required(entry.meaning_ru);
  const textRu = required(entry.text_ru);
  const literalUk = required(entry.literal_uk);
  const meaningUk = required(entry.meaning_uk);
  const textUk = required(entry.text_uk);
  const literal = sourceLocale === 'uk' ? literalUk : literalRu;
  const meaning = sourceLocale === 'uk' ? meaningUk : meaningRu;
  const text = sourceLocale === 'uk' ? textUk : textRu;
  if (!targetText || !literal || !meaning || !text || !literalRu || !meaningRu || !textRu || !literalUk || !meaningUk || !textUk) {
    return null;
  }

  return {
    id: required(entry.id) || `${studyTarget}-daily-pack-${targetText}`,
    studyTarget,
    english: targetText,
    literal,
    meaning,
    text,
    literal_uk: literalUk,
    meaning_uk: meaningUk,
    text_uk: textUk,
    sourceLocales: undefined,
    date,
    scheduledDate: entry.scheduledDate || date,
    allowSave: entry.allowSave !== false,
    active: entry.active === true,
    order: typeof entry.order === 'number' ? entry.order : undefined,
    quiz_ru: entry.quiz_ru,
    quiz_uk: entry.quiz_uk,
  };
}

const EXPECTED_ROWS = 176;

function gateLog(step: string, data: Record<string, unknown>): void {
  console.log(`[DAILY-PHRASE-GATE] ${step}`, JSON.stringify(data)); // guard-ok: каждый шаг загрузки называет источник и причину
}

/**
 * зачем (владелец 12.10, D163: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ»): принятые пакеты es/de/it теперь
 * в сборке — без сети и без чтений на старте. Тексты те же, что прошли редакторскую приёмку; поля ru и uk в пакете одинаковы
 * для обоих языков источника. Отметка «активна» в принятом пакете стояла false (пакет ждал выпуска) — выпуск решён D163.
 */
async function bundledTargetDailyPhrases(
  studyTarget: DailyPhraseDevTarget,
  sourceLocale: DailyPhraseDevSourceLocale,
  today: string,
): Promise<readonly DailyPhrase[] | null> {
  if (!hasBundledDailyPhrasePack(studyTarget)) return null;
  const pack = await loadBundledDailyPhrasePack(studyTarget);
  if (!pack) {
    gateLog('bundled: no pack', { studyTarget, sourceLocale });
    return null;
  }
  const rows = pack.entries.map((entry) => entryToTargetDailyPhrase(
    { ...entry, studyTarget, sourceLocale, surface: 'daily_phrase', active: true } as TargetDailyPhraseEntry,
    studyTarget,
    sourceLocale,
    today,
  ));
  const invalid = rows.filter((row) => row == null).length;
  if (rows.length !== EXPECTED_ROWS || invalid > 0) {
    gateLog('bundled: rejected', { studyTarget, sourceLocale, rows: rows.length, invalid, expected: EXPECTED_ROWS });
    return null;
  }
  gateLog('bundled: ready', { studyTarget, sourceLocale, rows: rows.length, version: pack.contentVersion, decision: pack.decision });
  return Object.freeze(rows as DailyPhrase[]);
}

async function loadTargetDailyPhrasePayload(
  studyTarget: DailyPhraseDevTarget,
  sourceLocale: DailyPhraseDevSourceLocale,
): Promise<readonly DailyPhrase[]> {
  const today = new Date().toISOString().split('T')[0]!;
  const bundled = await bundledTargetDailyPhrases(studyTarget, sourceLocale, today);
  if (bundled) return bundled;

  // Запасной путь — только dev-сервер (dev-сборка): облачные пакеты не выложены (uploadPerformed: false).
  const registration = getDailyPhraseDevServerPackRegistration(studyTarget, sourceLocale);
  if (!registration) {
    gateLog('remote: skipped — dev server runtime off', { studyTarget, sourceLocale, source: 'none' });
    return [];
  }

  const manifestText = await fetchText(registration.manifestUrl);
  if (!manifestText) {
    gateLog('remote: manifest fetch failed', { studyTarget, sourceLocale });
    return [];
  }

  let manifest: TargetDailyPhraseManifest;
  try {
    manifest = JSON.parse(manifestText) as TargetDailyPhraseManifest;
  } catch (error) {
    gateLog('remote: manifest parse failed', { studyTarget, sourceLocale, message: error instanceof Error ? error.message : String(error) });
    return [];
  }
  if (
    manifest.studyTarget !== studyTarget ||
    manifest.sourceLocale !== sourceLocale ||
    manifest.surface !== 'daily_phrase' ||
    manifest.devOnly !== true ||
    manifest.uploadPerformed !== false
  ) {
    gateLog('remote: manifest header mismatch', { studyTarget, sourceLocale, manifestTarget: manifest.studyTarget, manifestLocale: manifest.sourceLocale });
    return [];
  }

  const expectedHash = required(manifest.payloadSha256 || manifest.sha256).toLowerCase();
  const filename = payloadFilename(manifest);
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !filename) {
    gateLog('remote: manifest has no valid hash or filename', { studyTarget, sourceLocale });
    return [];
  }

  const payloadText = await fetchText(registration.rowUrl(filename));
  if (!payloadText || (await sha256(payloadText)).toLowerCase() !== expectedHash) {
    gateLog('remote: payload missing or sha256 mismatch', { studyTarget, sourceLocale, fetched: Boolean(payloadText) });
    return [];
  }

  let payload: TargetDailyPhrasePayload;
  try {
    payload = JSON.parse(payloadText) as TargetDailyPhrasePayload;
  } catch (error) {
    gateLog('remote: payload parse failed', { studyTarget, sourceLocale, message: error instanceof Error ? error.message : String(error) });
    return [];
  }
  if (
    payload.studyTarget !== studyTarget ||
    payload.sourceLocale !== sourceLocale ||
    payload.surface !== 'daily_phrase'
  ) {
    gateLog('remote: payload header mismatch', { studyTarget, sourceLocale });
    return [];
  }

  const rows = (payload.entries ?? []).map((entry) => entryToTargetDailyPhrase(
    entry,
    studyTarget,
    sourceLocale,
    today,
  ));
  if (rows.length !== EXPECTED_ROWS || rows.some((row) => row == null)) {
    gateLog('remote: rows rejected', { studyTarget, sourceLocale, rows: rows.length });
    return [];
  }
  gateLog('remote: ready', { studyTarget, sourceLocale, rows: rows.length, source: 'remote' });
  return Object.freeze(rows as DailyPhrase[]);
}

export function prefetchTargetRemoteDailyPhrases(
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
): void {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (!studyTarget || !sourceLocale) return;
  const key = cacheKey(studyTarget, sourceLocale);
  if (payloadCache.has(key)) return;
  const task = loadTargetDailyPhrasePayload(studyTarget, sourceLocale)
    .then((rows) => {
      resolvedPayloadCache.set(key, rows);
      return rows;
    })
    .catch((error: unknown) => {
      gateLog('load failed', { studyTarget, sourceLocale, message: error instanceof Error ? error.message : String(error) });
      resolvedPayloadCache.set(key, []);
      return [];
    });
  payloadCache.set(key, task);
}

export async function ensureTargetRemoteDailyPhrases(
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
): Promise<void> {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (!studyTarget || !sourceLocale) return;
  const key = cacheKey(studyTarget, sourceLocale);
  prefetchTargetRemoteDailyPhrases(studyTarget, sourceLocale);
  await payloadCache.get(key);
}

export function getCachedTargetRemoteDailyPhraseForDay(
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
  dayIndex: number,
  date: string,
): DailyPhrase | null {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (!studyTarget || !sourceLocale) return null;
  const rows = resolvedPayloadCache.get(cacheKey(studyTarget, sourceLocale));
  if (!rows?.length) return null;
  const row = rows[Math.abs(dayIndex) % rows.length];
  return row ? { ...row, date, scheduledDate: date } : null;
}

export function getCachedTargetRemoteDailyPhrasePool(
  studyTargetInput: unknown,
  sourceLocaleInput: unknown,
): readonly DailyPhrase[] {
  const studyTarget = normalizeDailyPhraseDevTarget(studyTargetInput);
  const sourceLocale = normalizeDailyPhraseDevSourceLocale(sourceLocaleInput);
  if (!studyTarget || !sourceLocale) return [];
  return resolvedPayloadCache.get(cacheKey(studyTarget, sourceLocale)) ?? [];
}

export default function __MultilingualDailyPhraseRemoteRuntimeRouteShim() {
  return null;
}

