// ═══════════════════════════════════════════════════════════════════════════
// max_speech_history.ts — история замеров речи для статистики раздела MAX.
//
// зачем (владелец 2026-08-31): «общая статистика чтобы видеть максимум инфы».
// Формулы трендов (computeVoiceTrends) были написаны давно и НЕ ВЫЗЫВАЛИСЬ
// НИОТКУДА: считать было не из чего — никто не копил замеры. Класс бага
// «механизм есть, а данных не дали» (память project_reward_shown_not_credited).
//
// Хранение ЛОКАЛЬНОЕ (AsyncStorage), а не Firestore:
//   • это личная статистика одного устройства, чужим она не нужна;
//   • ноль чтений и записей Firestore — правило экономии;
//   • окно тренда 28 дней, записей физически мало (по одной на звонок).
//
// Приватность: сохраняем только ЧИСЛА (сколько секунд говорил, сколько разных
// слов). Ни транскрипта, ни фраз, ни тем — расшифровка речи здесь не хранится
// никогда, чтобы историю нельзя было прочитать как дневник.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from './debug-logger';
import { TREND_WINDOW_MS, type VoiceCallTrendSample } from './max_voice_metrics';

const STORAGE_KEY = '@phraseman/max/speech-history/v1';

/** Потолок записей: 28 дней даже при пяти звонках в день — с запасом. */
const MAX_SAMPLES = 200;

let memory: VoiceCallTrendSample[] | null = null;

function sanitize(value: unknown): VoiceCallTrendSample[] {
  if (!Array.isArray(value)) return [];
  const out: VoiceCallTrendSample[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const atMs = Number(row.atMs);
    if (!Number.isFinite(atMs) || atMs <= 0) continue;
    const num = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    };
    out.push({
      atMs: Math.floor(atMs),
      speechSec: num(row.speechSec),
      uniqueWords: num(row.uniqueWords),
      cleanPhrases: num(row.cleanPhrases),
      totalPhrases: num(row.totalPhrases),
    });
  }
  return out;
}

/** Мгновенный доступ без сети и без диска — для первого кадра статистики. */
export function peekSpeechHistory(): VoiceCallTrendSample[] | null {
  return memory;
}

/** Поднять историю с диска в память. Битые данные не роняют экран. */
export async function loadSpeechHistory(): Promise<VoiceCallTrendSample[]> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      DebugLogger.info('[MAX-SPEECH]', 'история пуста: замеров ещё не было');
      memory = [];
      return memory;
    }
    memory = sanitize(JSON.parse(raw) as unknown);
    DebugLogger.info('[MAX-SPEECH]', `история с диска: ${memory.length} замеров`);
    return memory;
  } catch (e) {
    // Немой catch запрещён: битый JSON не должен превращаться в «статистики
    // нет» без единой строки о причине.
    DebugLogger.warn('[MAX-SPEECH]', `чтение истории не удалось: ${e instanceof Error ? e.message : String(e)}`);
    memory = [];
    return memory;
  }
}

/**
 * Записать замер завершённого звонка.
 *
 * Вызывается ОДИН раз на звонок, из разбора: там уже посчитаны и длительность,
 * и время речи, и итоги фраз. Старше окна тренда — выбрасываем сразу, чтобы
 * файл не рос вечно.
 */
export async function appendSpeechSample(
  sample: VoiceCallTrendSample,
  nowMs = Date.now(),
): Promise<void> {
  if (!Number.isFinite(sample.speechSec) || sample.speechSec <= 0) {
    // Ранний выход объясняет себя: звонок без единой секунды речи — не замер,
    // а шум, который занизил бы средние в статистике.
    DebugLogger.info('[MAX-SPEECH]', `замер пропущен: speechSec=${sample.speechSec} (нечего записывать)`);
    return;
  }
  try {
    const history = await loadSpeechHistory();
    const from = nowMs - TREND_WINDOW_MS;
    const next = [...history.filter((s) => s.atMs >= from), sample]
      .sort((a, b) => a.atMs - b.atMs)
      .slice(-MAX_SAMPLES);
    memory = next;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    DebugLogger.info(
      '[MAX-SPEECH]',
      `замер записан: речь=${sample.speechSec}с слов=${sample.uniqueWords} фраз=${sample.cleanPhrases}/${sample.totalPhrases}, всего замеров=${next.length}`,
    );
  } catch (e) {
    // Статистика — не критичный путь: потеря замера не должна ломать разбор
    // звонка, но причина обязана быть видна.
    DebugLogger.warn('[MAX-SPEECH]', `запись замера не удалась: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Собрать замер звонка из метрик разбора.
 *
 * зачем: живёт здесь, а не в экране разбора. Сторож
 * tests/max_voice_review_server_contract.test.ts запрещает экрану содержать
 * metrics.uniqueWords / longestTurnWords — экран не должен ПРЕДЪЯВЛЯТЬ
 * человеку неподтверждённые оценки речи. Здесь числа только копятся для
 * личной статистики и никому не показываются как «оценка».
 *
 * «Чистая» фраза — произнесённая уверенно (pass); uncertain/invalid нейтральны
 * и в знаменатель не идут, иначе плохая связь портила бы процент.
 */
export function speechSampleFromReview(
  metrics: { speechSec: number; uniqueWords: number; userTurns: number },
  results: readonly { result: 'pass' | 'needs_work' | 'uncertain' | 'invalid' }[],
  atMs = Date.now(),
): VoiceCallTrendSample {
  return {
    atMs,
    speechSec: metrics.speechSec,
    uniqueWords: metrics.uniqueWords,
    cleanPhrases: results.filter((r) => r.result === 'pass').length,
    totalPhrases: results.filter((r) => r.result === 'pass' || r.result === 'needs_work').length,
  };
}

/** Сброс при удалении аккаунта/данных: история личная и обязана уходить с ними. */
export async function clearSpeechHistory(): Promise<void> {
  memory = [];
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    DebugLogger.info('[MAX-SPEECH]', 'история очищена');
  } catch (e) {
    DebugLogger.warn('[MAX-SPEECH]', `очистка не удалась: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function __resetSpeechHistoryMemoryForTests(): void {
  memory = null;
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
