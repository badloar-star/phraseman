// Дедупликация «выученных фраз» внутри экземпляра плана.
//
// Проблема, которую решает этот модуль: один день плана состоит из нескольких
// заданий (вставь слово / выбор фразы / на слух / вспомни / произношение),
// и ВСЕ они построены по ОДНИМ И ТЕМ ЖЕ фразам дня (одинаковые contentUnitId).
// Раньше каждое завершённое задание прибавляло в lifetime-метрику phrases_learned
// СВОИ correctIds.length, поэтому одна фраза засчитывалась столько раз, сколько
// заданий (и добавленных бонус-заданий) по ней прошёл пользователь — счётчик
// «выученных фраз» раздувался кратно.
//
// Здесь мы ведём по planInstanceId множество id фраз, уже зачтённых в
// phrases_learned. При завершении задания в статистику уходит ТОЛЬКО число
// НОВЫХ (ещё не зачтённых) фраз. Повтор той же фразы в другом задании дня, в
// бонус-задании «ещё» или при повторном проходе даёт +0 к «выучено».
//
// Хранилище идемпотентно и сериализовано: параллельные/быстрые вызовы не теряют
// друг друга (общая read-modify-write очередь), запись физически завершается до
// возврата управления.
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUNTED_PHRASES_KEY = 'personal_plan_counted_phrases_v1';

type CountedMap = Record<string, string[]>;

// Сериализация всех мутаций хранилища: каждый markPhrasesCounted дожидается
// предыдущего, поэтому read-modify-write не перетирают друг друга при гонке
// (как было с прогрессом задания до фикса).
let writeChain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<CountedMap> {
  try {
    const raw = await AsyncStorage.getItem(COUNTED_PHRASES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as CountedMap;
  } catch {
    return {};
  }
}

function normalizeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

/**
 * Отметить набор id фраз как зачтённых в phrases_learned для данного плана и
 * вернуть число ТОЛЬКО НОВЫХ (раньше не встречавшихся) фраз — именно столько
 * нужно прибавить в lifetime-статистику. Возврат 0 — ничего нового, статистику
 * трогать не нужно.
 *
 * Best-effort: при ошибке хранилища возвращаем 0 (лучше недосчитать, чем
 * раздуть), поток прохождения задания этим не блокируется.
 */
export async function markPhrasesCounted(
  planInstanceId: string | null | undefined,
  phraseIds: readonly string[],
): Promise<number> {
  const instanceId = (planInstanceId ?? '').trim();
  const incoming = normalizeIds(phraseIds);
  if (!instanceId || incoming.length === 0) return 0;

  const run = writeChain.then(async (): Promise<number> => {
    try {
      const map = await readAll();
      const already = new Set(map[instanceId] ?? []);
      const fresh = incoming.filter((id) => !already.has(id));
      if (fresh.length === 0) return 0;
      const next: CountedMap = {
        ...map,
        [instanceId]: [...already, ...fresh],
      };
      await AsyncStorage.setItem(COUNTED_PHRASES_KEY, JSON.stringify(next));
      return fresh.length;
    } catch {
      return 0;
    }
  });

  // Цепочку держим даже при отказе одного звена, чтобы следующий вызов не падал.
  writeChain = run.catch(() => undefined);
  return run;
}

/** Сколько уникальных фраз уже зачтено для плана (для тестов/диагностики). */
export async function readCountedPhraseCount(planInstanceId: string): Promise<number> {
  const instanceId = planInstanceId.trim();
  if (!instanceId) return 0;
  const map = await readAll();
  return (map[instanceId] ?? []).length;
}

/** Полностью очистить учёт зачтённых фраз для плана (напр. при сбросе плана). */
export async function clearCountedPhrases(planInstanceId: string | null | undefined): Promise<void> {
  const instanceId = (planInstanceId ?? '').trim();
  if (!instanceId) return;
  const run = writeChain.then(async () => {
    try {
      const map = await readAll();
      if (!(instanceId in map)) return;
      const next = { ...map };
      delete next[instanceId];
      await AsyncStorage.setItem(COUNTED_PHRASES_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  });
  writeChain = run.catch(() => undefined);
  await run;
}
