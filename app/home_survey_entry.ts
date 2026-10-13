// ═══════════════════════════════════════════════════════════════════════════
// home_survey_entry.ts — загрузка активного опроса для строки «Сегодня» (Q90).
//
// зачем (координатор 01.10, §46 Q90): вход в опрос на Главной 2.0 — строкой в
// «Сегодня», и только когда опрос есть. Раньше запрос уходил на КАЖДЫЙ фокус
// Главной (3 попытки с паузой), а результат нигде не показывался. Теперь:
//   • один запрос при входе в приложение (процесс), а если на диске лежит свежий
//     ответ (< 6 часов) — сети нет вообще;
//   • кэш и в памяти, и в AsyncStorage (переживает перезапуск);
//   • «опроса нет» тоже кэшируется на 6 часов — иначе пустой ответ перезапрашивался бы.
// Приватность: на устройстве лежит только описание опроса (вопросы/тексты) и
// stableId владельца кэша; личных ответов здесь нет.
// Все ветки пишут [SURVEY-HOME] — ранние выходы и catch не немые.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { fetchActiveSurveyWithRetry, type ActiveSurvey } from './survey_client';

export const HOME_SURVEY_STORAGE_KEY = 'home_survey_entry_v1';
export const HOME_SURVEY_TTL_MS = 6 * 60 * 60_000;

type Entry = Readonly<{ stableId: string; lang: Lang; fetchedAtMs: number; survey: ActiveSurvey | null }>;

let memory: Entry | null = null;
let inFlight: { key: string; promise: Promise<ActiveSurvey | null> } | null = null;
let storageRead = false;
/** Ключи, по которым в ЭТОМ процессе сеть уже спрашивали (или кэш признан свежим). */
const settledThisProcess = new Set<string>();

function log(message: string, payload?: unknown): void {
  console.log(`[SURVEY-HOME] ${message}${payload === undefined ? '' : ` ${JSON.stringify(payload)}`}`); // guard-ok: ветки обязаны логироваться и в проде
}

/**
 * зачем (координатор 13.10, кадр 08:48Z: в uk-интерфейсе строка опроса по-русски): выложенный сервер при нехватке перевода
 * отдаёт ru (resolveLocalized → str.ru), а кэш строки живёт 6 ч — русский текст мог прийти до записи переводов и держаться.
 * Журнал [SURVEY-ROW] показывает язык интерфейса, источник (кэш/сеть), возраст и на каком письме реально пришёл заголовок.
 */
function surveyTitleScript(title: string | undefined): 'ru' | 'uk' | 'cyrillic' | 'latin' | 'none' {
  if (!title) return 'none';
  if (/[іїєґ]/i.test(title)) return 'uk';
  if (/[ыэъё]/i.test(title)) return 'ru';
  if (/[а-я]/i.test(title)) return 'cyrillic';
  return 'latin';
}

function logSurveyRow(lang: Lang, source: 'cache' | 'network', survey: ActiveSurvey | null, ageMs: number): void {
  const script = surveyTitleScript(survey?.title);
  const mismatch = Boolean(survey) && ((lang !== 'ru' && script === 'ru') || (lang !== 'uk' && script === 'uk') || (!['ru', 'uk'].includes(lang) && script === 'cyrillic'));
  console.log('[SURVEY-ROW]', JSON.stringify({ lang, source, ageMin: Math.round(ageMs / 60_000), surveyId: survey?.surveyId ?? null, titleScript: script, mismatch }));
}

function scopeKey(stableId: string, lang: Lang): string {
  return `${stableId}|${lang}`;
}

function isFresh(entry: Entry | null, stableId: string, lang: Lang, nowMs: number): entry is Entry {
  return entry !== null
    && entry.stableId === stableId
    && entry.lang === lang
    && nowMs - entry.fetchedAtMs >= 0
    && nowMs - entry.fetchedAtMs < HOME_SURVEY_TTL_MS;
}

async function readStorage(): Promise<void> {
  if (storageRead) return;
  storageRead = true;
  try {
    const raw = await AsyncStorage.getItem(HOME_SURVEY_STORAGE_KEY);
    if (!raw) { log('storage:empty'); return; }
    const parsed = JSON.parse(raw) as Partial<Entry> | null;
    if (!parsed || typeof parsed.stableId !== 'string' || typeof parsed.lang !== 'string'
      || typeof parsed.fetchedAtMs !== 'number') {
      log('storage:malformed → игнорируем');
      return;
    }
    if (!memory) {
      memory = {
        stableId: parsed.stableId,
        lang: parsed.lang as Lang,
        fetchedAtMs: parsed.fetchedAtMs,
        survey: parsed.survey && typeof parsed.survey === 'object' ? parsed.survey as ActiveSurvey : null,
      };
      log('storage:hit', { ageMs: Date.now() - parsed.fetchedAtMs, hasSurvey: Boolean(memory.survey) });
    }
  } catch (error) {
    log('storage:read_failed', String(error));
  }
}

function writeStorage(entry: Entry): void {
  // guard-ok: кэш описания опроса (не данные пользователя); ошибка записи логируется, потеря = лишний запрос через 6 ч
  AsyncStorage.setItem(HOME_SURVEY_STORAGE_KEY, JSON.stringify(entry))
    .catch((error: unknown) => log('storage:write_failed', String(error)));
}

/** Синхронно: свежий ответ из памяти процесса (без диска и сети) — для первого кадра. */
export function peekHomeSurvey(stableId: string, lang: Lang, nowMs = Date.now()): ActiveSurvey | null | undefined {
  return isFresh(memory, stableId, lang, nowMs) ? memory.survey : undefined;
}

/**
 * Активный опрос для строки «Сегодня»: null — опроса нет (или он уже пройден).
 * Сеть только если кэша < 6 ч нет И в этом процессе по ключу ещё не спрашивали.
 */
export async function loadHomeSurvey(input: {
  stableId: string;
  lang: Lang;
  platform: string;
  nowMs?: number;
}): Promise<ActiveSurvey | null> {
  const nowMs = input.nowMs ?? Date.now();
  const key = scopeKey(input.stableId, input.lang);
  await readStorage();
  if (isFresh(memory, input.stableId, input.lang, nowMs)) {
    settledThisProcess.add(key);
    log('cache:fresh → без сети', { ageMs: nowMs - memory.fetchedAtMs, hasSurvey: Boolean(memory.survey) });
    logSurveyRow(input.lang, 'cache', memory.survey, nowMs - memory.fetchedAtMs);
    return memory.survey;
  }
  if (settledThisProcess.has(key)) {
    // Кэш протух, но в этом процессе сеть уже спрашивали — следующая проверка при следующем входе в приложение.
    log('skip:already_asked_this_process', { key: `${input.stableId.slice(0, 4)}…|${input.lang}` });
    return null;
  }
  if (inFlight && inFlight.key === key) {
    log('join:in_flight');
    return inFlight.promise;
  }
  const promise = (async () => {
    const startedAt = Date.now();
    try {
      const result = await fetchActiveSurveyWithRetry({ stableId: input.stableId, platform: input.platform, lang: input.lang });
      const survey = result.survey && !result.completion ? result.survey : null;
      const entry: Entry = { stableId: input.stableId, lang: input.lang, fetchedAtMs: Date.now(), survey };
      memory = entry;
      settledThisProcess.add(key);
      writeStorage(entry);
      log('network:ok', {
        ms: Date.now() - startedAt,
        surveyId: result.survey?.surveyId ?? null,
        completed: Boolean(result.completion),
        shown: Boolean(survey),
      });
      logSurveyRow(input.lang, 'network', survey, 0);
      return survey;
    } catch (error) {
      // Ошибку сети НЕ кэшируем как «опроса нет»: следующий вход в приложение спросит заново.
      settledThisProcess.add(key);
      log('network:failed → строки не будет', { ms: Date.now() - startedAt, reason: String(error) });
      return null;
    } finally {
      inFlight = null;
    }
  })();
  inFlight = { key, promise };
  return promise;
}

/** После отправки ответов: опроса больше нет — строка исчезает и после перезапуска. */
export function markHomeSurveyCompleted(stableId: string, lang: Lang): void {
  const entry: Entry = { stableId, lang, fetchedAtMs: Date.now(), survey: null };
  memory = entry;
  settledThisProcess.add(scopeKey(stableId, lang));
  writeStorage(entry);
  log('completed → кэш «опроса нет»', { stableId: `${stableId.slice(0, 4)}…` });
}

export function resetHomeSurveyEntryForTests(): void {
  memory = null;
  inFlight = null;
  storageRead = false;
  settledThisProcess.clear();
}
