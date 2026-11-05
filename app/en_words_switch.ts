// en_words_switch.ts — перенос прогресса «Слов урока» английского курса со старого банка на словарь курса (glossary.json).
// зачем (координатор 05.11, правило владельца «прогресс не теряется никогда»): с включением en в ClassicWordsLang слова урока N
// теперь «только новые леммы урока N» (без повторов), и многие слова переехали между уроками. Прогресс лежит по урокам
// (`lessonWordsKey(id,'en')` → { слово: сколько раз верно }). Здесь выученное по ТЕКСТУ слова (без регистра) переносится
// в тот урок, где слово теперь живёт. Старые записи НЕ удаляются и НЕ уменьшаются — только дополняются.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lessonWordsKey } from './target_storage_keys';

const LOG = '[EN-WORDS-SWITCH]';
const LESSON_COUNT = 32;
export const EN_WORDS_REQUIRED = 3;

export type EnWordCounts = Record<string, number>;
export interface EnWordsProjection {
  next: Record<number, EnWordCounts>;
  /** сколько слов нового банка получили счёт больше прежнего (перенесено/дополнено) */
  carried: number;
  /** слова с прогрессом, которых нет ни в одном уроке нового банка (хранятся как есть) */
  unmatched: string[];
  /** уроки, чей набор записей изменился */
  changedLessons: number[];
}

/** Чистая функция: stored — прежние счётчики по урокам, bank — слова нового банка по урокам. Ничего не удаляет и не уменьшает. */
export function projectEnglishWordCounts(stored: Record<number, EnWordCounts>, bank: Record<number, readonly string[]>): EnWordsProjection {
  const best = new Map<string, number>();
  for (const counts of Object.values(stored)) {
    for (const [word, raw] of Object.entries(counts ?? {})) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      const k = word.trim().toLocaleLowerCase();
      if (n > (best.get(k) ?? 0)) best.set(k, n);
    }
  }
  const next: Record<number, EnWordCounts> = {};
  const inBank = new Set<string>();
  const changed: number[] = [];
  let carried = 0;
  for (let lesson = 1; lesson <= LESSON_COUNT; lesson += 1) {
    const cur: EnWordCounts = { ...(stored[lesson] ?? {}) };
    let touched = false;
    for (const word of bank[lesson] ?? []) {
      const k = word.trim().toLocaleLowerCase();
      inBank.add(k);
      const want = best.get(k) ?? 0;
      if (want > (Number(cur[word]) || 0)) {
        cur[word] = want;
        touched = true;
        carried += 1;
      }
    }
    next[lesson] = cur;
    if (touched) changed.push(lesson);
  }
  const unmatched = [...best.keys()].filter((k) => !inBank.has(k)).sort();
  return { next, carried, unmatched, changedLessons: changed };
}

function parseStored(raw: string | null): EnWordCounts {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (Array.isArray(data)) return Object.fromEntries(data.filter((w): w is string => typeof w === 'string').map((w) => [w, EN_WORDS_REQUIRED]));
    if (data && typeof data === 'object') return data as EnWordCounts;
  } catch (error: unknown) {
    console.warn(LOG, 'не разобрал сохранённый прогресс — оставляю как есть', error instanceof Error ? error.message : String(error)); // guard-ok: причина пропуска записи
  }
  return {};
}

let started = false;

/** Один раз за запуск: читает прогресс en по урокам, переносит по тексту слова в новый банк, дописывает изменённые уроки. */
export function scheduleEnglishWordsSwitch(bankOf: (lessonId: number) => readonly string[]): void {
  if (started) return;
  started = true;
  void (async () => {
    const t0 = Date.now();
    try {
      const ids = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1);
      const entries = await AsyncStorage.multiGet(ids.map((id) => lessonWordsKey(id, 'en')));
      const stored: Record<number, EnWordCounts> = {};
      entries.forEach(([, raw], i) => { stored[ids[i]!] = parseStored(raw); });
      const bank: Record<number, readonly string[]> = {};
      for (const id of ids) bank[id] = bankOf(id);
      const res = projectEnglishWordCounts(stored, bank);
      console.log(LOG, `перенесено=${res.carried} не_сопоставлено=${res.unmatched.length} изменено_уроков=${res.changedLessons.length} за=${Date.now() - t0}мс`); // guard-ok: трасса переноса
      if (res.unmatched.length) console.log(LOG, 'не сопоставились (сохранены как есть):', res.unmatched.slice(0, 40).join(', ')); // guard-ok: какие слова остались на старых местах
      if (!res.changedLessons.length) return;
      await AsyncStorage.multiSet(res.changedLessons.map((id) => [lessonWordsKey(id, 'en'), JSON.stringify(res.next[id])] as [string, string]));
      console.log(LOG, 'записано уроков:', res.changedLessons.join(',')); // guard-ok: итог записи
    } catch (error: unknown) {
      started = false; // повторим при следующем обращении
      console.warn(LOG, 'перенос не удался — прежний прогресс не тронут', error instanceof Error ? error.message : String(error)); // guard-ok: причина
    }
  })();
}

export default function __EnWordsSwitchRouteShim() {
  return null;
}
