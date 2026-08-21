import type { MistakeEvent, MistakeFacet, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
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
  readonly topMistakes: readonly MistakePracticeInsightItem[];
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
  for (const event of captures30) {
    counts.set(event.mistakeId, (counts.get(event.mistakeId) ?? 0) + 1);
    const facet = event.payload.facet;
    if (typeof facet === 'string') {
      facets.set(facet as MistakeFacet, (facets.get(facet as MistakeFacet) ?? 0) + 1);
    }
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
