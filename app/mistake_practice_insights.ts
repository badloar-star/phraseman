import type { MistakeEvent, MistakeFacet, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes, type MistakeProjectionStatus } from '../modules/mistake-practice/projection';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { reconcileMutableMistakeContent } from './mistake_practice_content_reconciliation';
import type { MistakeEventJournal } from './mistake_practice_cloud_merge';
import { loadMistakeEventJournal } from './mistake_practice_store';
import { getStableId } from './stable_id';

const assertCurrentAccount = (
  generation: ReturnType<typeof captureAccountGeneration>,
  accountScope: string,
): void => {
  if (!isCurrentAccountGeneration(generation, accountScope)) {
    throw new Error('stale_account_generation');
  }
};

async function loadCurrentMistakeJournal(
  studyTarget: MistakeStudyTarget,
  reconcileMutableContent = false,
): Promise<MistakeEventJournal> {
  const accountScope = await getStableId();
  const generation = captureAccountGeneration();
  assertCurrentAccount(generation, accountScope);
  const loadedJournal = await loadMistakeEventJournal({ accountScope, studyTarget });
  assertCurrentAccount(generation, accountScope);
  if (!reconcileMutableContent) return loadedJournal;
  const reconciled = await reconcileMutableMistakeContent({
    accountScope,
    studyTarget,
    journal: loadedJournal,
  });
  assertCurrentAccount(generation, accountScope);
  return reconciled.journal;
}

export async function getMistakePracticeReadyCount(
  studyTarget: MistakeStudyTarget,
  input: Readonly<{ lessonId?: string; nowMs?: number }> = {},
): Promise<number> {
  const journal = await loadCurrentMistakeJournal(studyTarget, true);
  const nowMs = input.nowMs ?? Date.now();
  return [...projectMistakes(journal.events).items.values()].filter((item) =>
    item.status === 'active'
    && item.dueAtMs <= nowMs
    && (!input.lessonId || item.lessonId === input.lessonId),
  ).length;
}

export interface MistakePracticeHomeCounts {
  /** Все неисправленные ошибки - счётчик на кнопке Главной. */
  readonly active: number;
  /** Из них готовы к отработке прямо сейчас (dueAt наступил). */
  readonly ready: number;
}

/**
 * Счётчики для кнопки на Главной. Одно чтение журнала, без сети.
 * зачем (владелец 2026-09-14): кнопка «всегда показывает, сколько ошибок
 * сейчас», а пульс тем быстрее, чем их больше - нужна именно сумма активных,
 * а не только готовых сегодня.
 */
export async function getMistakePracticeHomeCounts(
  studyTarget: MistakeStudyTarget,
  nowMs = Date.now(),
): Promise<MistakePracticeHomeCounts> {
  const journal = await loadCurrentMistakeJournal(studyTarget, true);
  const items = [...projectMistakes(journal.events).items.values()];
  const active = items.filter((item) => item.status === 'active');
  return Object.freeze({
    active: active.length,
    ready: active.filter((item) => item.dueAtMs <= nowMs).length,
  });
}

export interface MistakePracticeInsightItem {
  readonly mistakeId: string;
  readonly phrase: string;
  readonly count: number;
  readonly facet: MistakeFacet;
  readonly lessonId: string | null;
}

export interface MistakePracticeInsights {
  readonly active: number;
  readonly corrected: number;
  readonly correctedPhrases: number;
  readonly hidden: number;
  readonly overdue: number;
  readonly totalTracked: number;
  readonly dueWords: number;
  readonly duePhrases: number;
  readonly mistakeCount7d: number;
  readonly mistakeCount30d: number;
  readonly mistakeCountPrevious7d: number;
  readonly uniqueMistakes30d: number;
  readonly uniqueMistakes7d: number;
  readonly frequentFacets: readonly Readonly<{ facet: MistakeFacet; count: number }>[];
  /** Откуда приходят ошибки за 30 дней: уроки, арена, карточки, экзамены… */
  readonly frequentSources: readonly Readonly<{ source: MistakeSourceGroup; count: number }>[];
  readonly topMistakes: readonly MistakePracticeInsightItem[];
}

/** Группы источников для карты слабых мест (sourceKind → понятная группа). */
export type MistakeSourceGroup = 'lessons' | 'arena' | 'cards' | 'exams' | 'other';

export function mistakeSourceGroupFor(sourceKind: string | null | undefined): MistakeSourceGroup {
  switch (sourceKind) {
    case 'lesson_phrase':
    case 'lesson_word':
    case 'irregular_verb':
    case 'learning_v2':
    case 'personal_plan':
      return 'lessons';
    case 'flashcard':
      return 'cards';
    case 'diagnostic_test':
    case 'level_exam':
    case 'exam':
      return 'exams';
    case 'voice_review':
    case 'diagnosis_coach':
      return 'other';
    default:
      // Арена пишет sourceKind вида `arena_*` через свой адаптер; всё
      // незнакомое честно падает в «другое», а не в уроки.
      return typeof sourceKind === 'string' && sourceKind.startsWith('arena') ? 'arena' : 'other';
  }
}

export function buildMistakePracticeInsights(
  events: readonly MistakeEvent[],
  nowMs = Date.now(),
): MistakePracticeInsights {
  const projection = projectMistakes(events);
  const items = [...projection.items.values()];
  const dayMs = 86_400_000;
  const captures30 = events.filter((event) =>
    event.type === 'captured'
    && event.occurredAtMs >= nowMs - 30 * dayMs
    && event.occurredAtMs <= nowMs,
  );
  const captures7 = captures30.filter((event) => event.occurredAtMs >= nowMs - 7 * dayMs);
  const capturesPrevious7 = captures30.filter((event) =>
    event.occurredAtMs < nowMs - 7 * dayMs && event.occurredAtMs >= nowMs - 14 * dayMs,
  );
  const counts = new Map<string, number>();
  const facets = new Map<MistakeFacet, number>();
  const sources = new Map<MistakeSourceGroup, number>();
  for (const event of captures30) {
    counts.set(event.mistakeId, (counts.get(event.mistakeId) ?? 0) + 1);
    const facet = event.payload.facet;
    if (typeof facet === 'string') {
      facets.set(facet as MistakeFacet, (facets.get(facet as MistakeFacet) ?? 0) + 1);
    }
    const sourceKind = typeof event.payload.sourceKind === 'string'
      ? event.payload.sourceKind
      : projection.items.get(event.mistakeId)?.sourceKind;
    const group = mistakeSourceGroupFor(sourceKind);
    sources.set(group, (sources.get(group) ?? 0) + 1);
  }
  const due = items.filter((item) => item.status === 'active' && item.dueAtMs <= nowMs);
  return Object.freeze({
    active: items.filter((item) => item.status === 'active').length,
    corrected: items.filter((item) => item.status === 'corrected').length,
    correctedPhrases: items.filter((item) => item.status === 'corrected' && /\s/.test(item.canonicalTarget.trim())).length,
    hidden: items.filter((item) => item.status === 'hidden').length,
    overdue: due.filter((item) => item.dueAtMs < nowMs).length,
    totalTracked: items.length,
    dueWords: due.filter((item) => !/\s/.test(item.canonicalTarget.trim())).length,
    duePhrases: due.filter((item) => /\s/.test(item.canonicalTarget.trim())).length,
    mistakeCount7d: captures7.length,
    mistakeCount30d: captures30.length,
    mistakeCountPrevious7d: capturesPrevious7.length,
    uniqueMistakes30d: counts.size,
    uniqueMistakes7d: new Set(captures7.map((event) => event.mistakeId)).size,
    frequentFacets: Object.freeze([...facets.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([facet, count]) => Object.freeze({ facet, count }))),
    frequentSources: Object.freeze([...sources.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([source, count]) => Object.freeze({ source, count }))),
    topMistakes: Object.freeze([...counts.entries()]
      .map(([mistakeId, count]) => {
        const item = projection.items.get(mistakeId);
        return item ? Object.freeze({
          mistakeId,
          phrase: item.canonicalTarget,
          count,
          facet: item.facet,
          lessonId: item.lessonId,
        }) : null;
      })
      .filter((item): item is MistakePracticeInsightItem => item !== null)
      .sort((left, right) => right.count - left.count || left.phrase.localeCompare(right.phrase))
      .slice(0, 10)),
  });
}

export async function loadMistakePracticeInsights(
  studyTarget: MistakeStudyTarget,
  nowMs = Date.now(),
): Promise<MistakePracticeInsights> {
  const journal = await loadCurrentMistakeJournal(studyTarget);
  return buildMistakePracticeInsights(journal.events, nowMs);
}

/** Одна строка списка ошибок в хабе: без деталей заданий, только суть. */
export interface MistakePracticeListItem {
  readonly mistakeId: string;
  readonly phrase: string;
  readonly meaning: string | null;
  readonly facet: MistakeFacet;
  readonly lessonId: string | null;
  readonly status: MistakeProjectionStatus;
  /** Сколько раз промахивался за всё время. */
  readonly captureCount: number;
  /** Верных «самостоятельных» дней в текущем цикле (0..3) - три точки в списке. */
  readonly qualifyingDays: number;
  readonly ready: boolean;
  readonly dueAtMs: number;
  readonly correctedAtMs: number | null;
  readonly firstCapturedAtMs: number;
}

export interface MistakePracticeHubSnapshot {
  readonly insights: MistakePracticeInsights;
  readonly readyCount: number;
  readonly items: readonly MistakePracticeListItem[];
}

/**
 * Всё, что нужно хабу и списку, одним чтением журнала (без сети).
 * зачем (владелец 2026-09-14): хаб открывается мгновенно из локального
 * журнала; никаких спиннеров на весь экран и лишних чтений Firestore.
 */
export function buildMistakePracticeHubSnapshot(
  events: readonly MistakeEvent[],
  nowMs = Date.now(),
): MistakePracticeHubSnapshot {
  const insights = buildMistakePracticeInsights(events, nowMs);
  const items = [...projectMistakes(events).items.values()]
    .filter((item) => item.status === 'active' || item.status === 'corrected')
    .map((item) => Object.freeze({
      mistakeId: item.mistakeId,
      phrase: item.canonicalTarget,
      meaning: item.sourceMeaning ?? null,
      facet: item.facet,
      lessonId: item.lessonId,
      status: item.status,
      captureCount: item.captureCount,
      qualifyingDays: Math.min(3, item.qualifyingDays.length),
      ready: item.status === 'active' && item.dueAtMs <= nowMs,
      dueAtMs: item.dueAtMs,
      correctedAtMs: item.correctedAtMs,
      firstCapturedAtMs: item.firstCapturedAtMs,
    }))
    // Готовые сверху, чаще промахивались - выше; исправленные - по свежести.
    .sort((left, right) =>
      Number(right.ready) - Number(left.ready)
      || Number(left.status === 'corrected') - Number(right.status === 'corrected')
      || (left.status === 'corrected'
        ? (right.correctedAtMs ?? 0) - (left.correctedAtMs ?? 0)
        : right.captureCount - left.captureCount || left.dueAtMs - right.dueAtMs)
      || left.phrase.localeCompare(right.phrase));
  return Object.freeze({
    insights,
    readyCount: items.filter((item) => item.ready).length,
    items: Object.freeze(items),
  });
}

export async function loadMistakePracticeHubSnapshot(
  studyTarget: MistakeStudyTarget,
  nowMs = Date.now(),
): Promise<MistakePracticeHubSnapshot> {
  const startedAt = Date.now();
  const journal = await loadCurrentMistakeJournal(studyTarget, true);
  const snapshot = buildMistakePracticeHubSnapshot(journal.events, nowMs);
  console.log('[MISTAKES-HUB] snapshot', JSON.stringify({
    studyTarget,
    events: journal.events.length,
    active: snapshot.insights.active,
    ready: snapshot.readyCount,
    corrected: snapshot.insights.corrected,
    ms: Date.now() - startedAt,
  }));
  return snapshot;
}

export interface MistakePracticeAchievementSnapshot {
  readonly corrected: number;
  readonly voiceCorrected: number;
  readonly independentDays: number;
}

export async function getMistakePracticeAchievementSnapshot(
  studyTarget: MistakeStudyTarget,
): Promise<MistakePracticeAchievementSnapshot> {
  const journal = await loadCurrentMistakeJournal(studyTarget);
  const rewardedCycles = new Set<string>();
  const pronunciationCycles = new Set<string>();
  const correctedMistakes = new Set<string>();
  const voiceCorrectedMistakes = new Set<string>();
  const independentDays = new Set<string>();
  for (const event of journal.events) {
    const cycleKey = `${event.mistakeId}:${event.cycleId}`;
    if (event.type === 'captured' && event.payload.facet === 'pronunciation') {
      pronunciationCycles.add(cycleKey);
    }
    if (event.type === 'practice_answered'
      && event.payload.correct === true
      && event.payload.independent === true
      && typeof event.payload.localDay === 'string') {
      independentDays.add(event.payload.localDay);
    }
    if (event.type === 'correction_rewarded') rewardedCycles.add(cycleKey);
  }
  for (const cycleKey of rewardedCycles) {
    const mistakeId = cycleKey.slice(0, cycleKey.lastIndexOf(':mistake-cycle:'));
    correctedMistakes.add(mistakeId);
    if (pronunciationCycles.has(cycleKey)) voiceCorrectedMistakes.add(mistakeId);
  }
  return Object.freeze({
    corrected: correctedMistakes.size,
    voiceCorrected: voiceCorrectedMistakes.size,
    independentDays: independentDays.size,
  });
}
