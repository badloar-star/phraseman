import { TOURNAMENT_MODES } from './tournament_pool_plan';
import {
  validateTournamentTaskForNewRoom,
  type TournamentTask,
} from './tournament_core';

type TournamentTaskSnapshot = {
  id: string;
  data(): FirebaseFirestore.DocumentData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function eligibleTournamentCellCounts(docs: TournamentTaskSnapshot[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const mode of TOURNAMENT_MODES) {
    for (const difficulty of [1, 2, 3]) counts[`${mode}:${difficulty}`] = 0;
  }
  for (const doc of docs) {
    const data = doc.data();
    const task: TournamentTask = {
      taskId: doc.id,
      mode: typeof data.mode === 'string' ? data.mode : '',
      isVoice: data.isVoice === true,
      difficulty: Number(data.difficulty),
      payload: isRecord(data.payload) ? data.payload : {},
      explanation: isRecord(data.explanation)
        ? {
          ruleNote: String(data.explanation.ruleNote ?? ''),
          example: String(data.explanation.example ?? ''),
          // New rooms require a reason for every wrong option.  Preserve the
          // stored array while checking eligibility instead of silently
          // reconstructing an older, incomplete explanation shape.
          ...(Array.isArray(data.explanation.wrongOptionReasons)
            ? { wrongOptionReasons: data.explanation.wrongOptionReasons }
            : {}),
        }
        : undefined,
      tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      verified: data.verified === true,
    };
    if (data.source !== 'ai' || !validateTournamentTaskForNewRoom(task).ok) continue;
    const key = `${task.mode}:${task.difficulty}`;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

/**
 * зачем 2026-08-24: админка в разделе «Турниры» показывала «сервер временно не
 * ответил». Замер на проде: пул вырос до 8000 заданий, и этот запрос тянул их
 * ЦЕЛИКОМ — 19 МБ сырых данных, +91 МБ heap при лимите функции 256 МБ и 25.8 с
 * только на выкачку. Функция не укладывалась в дефолтные 60 с и падала как
 * internal. Плюс это 8000 чтений Firestore на КАЖДОЕ открытие вкладки, а
 * вызывается загрузчик из трёх мест (статистика, расписание, батч v11).
 *
 * Считать агрегатом count() нельзя: валидность задания известна только из его
 * содержимого (payload/explanation прогоняются через
 * validateTournamentTaskForNewRoom), а не из индексируемых полей.
 *
 * Поэтому кэш в памяти инстанса: одобренный пул меняет человек и меняет редко,
 * а вкладку открывают часто. Три вызова подряд внутри одного запроса теперь
 * стоят одну выборку вместо трёх. Кэш живёт в инстансе, отдельная коллекция и
 * правила Firestore не нужны; после холодного старта он просто наполнится снова.
 */
const CELL_COUNTS_TTL_MS = 5 * 60 * 1000;
let cellCountsCache: { value: Record<string, number>; at: number } | null = null;
let cellCountsInFlight: Promise<Record<string, number>> | null = null;

/** Сбрасывает кэш после записи в пул, чтобы админка не показывала старые цифры. */
export function invalidateEligibleTournamentCellCounts(): void {
  cellCountsCache = null;
}

export async function loadEligibleTournamentCellCounts(
  collection: FirebaseFirestore.CollectionReference,
  options?: { readonly forceFresh?: boolean },
): Promise<Record<string, number>> {
  const forceFresh = options?.forceFresh === true;
  const now = Date.now();
  if (forceFresh) cellCountsCache = null;
  const cached = cellCountsCache;
  if (!forceFresh && cached && now - cached.at < CELL_COUNTS_TTL_MS) return cached.value;

  // зачем: параллельные вызовы внутри одного запроса (статистика зовёт
  // загрузчик дважды) не должны выкачивать пул дважды — второй ждёт первого.
  // forceFresh намеренно НЕ переиспользует чужой запрос: тот мог стартовать до
  // интересующей нас записи и вернул бы как раз те данные, ради обхода которых
  // просили свежие.
  if (!forceFresh && cellCountsInFlight) return cellCountsInFlight;

  cellCountsInFlight = (async () => {
    try {
      const snap = await collection
        .where('verified', '==', true)
        .where('source', '==', 'ai')
        // Только поля, которые читает eligibleTournamentCellCounts: остальное
        // (история правок, служебные метки) по сети не едет.
        .select('mode', 'isVoice', 'difficulty', 'payload', 'explanation', 'tags', 'verified', 'source')
        .get();
      const value = eligibleTournamentCellCounts(snap.docs);
      cellCountsCache = { value, at: Date.now() };
      return value;
    } finally {
      cellCountsInFlight = null;
    }
  })();

  return cellCountsInFlight;
}
