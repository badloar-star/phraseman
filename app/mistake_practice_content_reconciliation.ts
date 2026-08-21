import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import type { MistakeEvent, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import {
  projectMistakes,
  type MistakeProjectionItem,
} from '../modules/mistake-practice/projection';
import { readCustomCards } from './flashcards/storage';
import type { MistakeEventJournal } from './mistake_practice_cloud_merge';
import {
  mergeMistakeEvents,
  type MistakePracticeStorage,
} from './mistake_practice_store';

type MutableCard = Readonly<{
  id: string;
  en: string;
  ru?: string;
  uk?: string;
  es?: string;
  sourceLocales?: Readonly<Record<string, string | undefined>>;
}>;

export interface MutableMistakeContentDependencies {
  readonly loadCustomCards?: (studyTarget: MistakeStudyTarget) => Promise<readonly unknown[]>;
  readonly nowMs?: () => number;
}

const text = (value: unknown): string => typeof value === 'string'
  ? value.normalize('NFC').replace(/\s+/g, ' ').trim()
  : '';

const isMutableCard = (value: unknown): value is MutableCard => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const card = value as Partial<MutableCard>;
  return !!text(card.id) && !!text(card.en);
};

const currentMeanings = (card: MutableCard): ReadonlySet<string> => new Set([
  text(card.ru),
  text(card.uk),
  text(card.es),
  ...Object.values(card.sourceLocales ?? {}).map(text),
].filter(Boolean));

const unavailableReason = (
  item: MistakeProjectionItem,
  card: MutableCard | undefined,
): 'deleted' | 'changed' | null => {
  if (!card) return 'deleted';
  if (text(card.en) !== text(item.canonicalTarget)) return 'changed';
  const capturedMeaning = text(item.sourceMeaning);
  if (capturedMeaning && !currentMeanings(card).has(capturedMeaning)) return 'changed';
  return null;
};

export async function reconcileMutableMistakeContent(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  journal: MistakeEventJournal;
  storage?: MistakePracticeStorage;
}>, dependencies: MutableMistakeContentDependencies = {}): Promise<Readonly<{
  unavailableCount: number;
  journal: MistakeEventJournal;
}>> {
  const activeCustomItems = [...projectMistakes(input.journal.events).items.values()].filter(
    (item) => item.status === 'active'
      && item.sourceKind === 'flashcard'
      && typeof item.sourceId === 'string'
      && item.sourceId.startsWith('custom_'),
  );
  if (activeCustomItems.length === 0) {
    return Object.freeze({ unavailableCount: 0, journal: input.journal });
  }

  const rawCards = await (dependencies.loadCustomCards ?? readCustomCards)(input.studyTarget);
  const cards = new Map(
    rawCards.filter(isMutableCard).map((card) => [text(card.id), card] as const),
  );
  const occurredAtMs = Math.floor((dependencies.nowMs ?? Date.now)());
  const unavailableEvents: MistakeEvent[] = [];
  for (const item of activeCustomItems) {
    const reason = unavailableReason(item, cards.get(item.sourceId ?? ''));
    if (!reason) continue;
    unavailableEvents.push(Object.freeze({
      eventId: `mistake-content-unavailable:v1:${sha256Utf8(canonicalJsonV1({
        contentFingerprint: item.contentFingerprint,
        cycleId: item.cycleId,
        mistakeId: item.mistakeId,
        type: 'content_unavailable',
      }))}`,
      mistakeId: item.mistakeId,
      cycleId: item.cycleId,
      type: 'content_unavailable',
      occurredAtMs,
      studyTarget: input.studyTarget,
      payload: Object.freeze({
        contentFingerprint: item.contentFingerprint,
        reason,
        sourceId: item.sourceId,
        sourceKind: item.sourceKind,
      }),
    }));
  }
  if (unavailableEvents.length === 0) {
    return Object.freeze({ unavailableCount: 0, journal: input.journal });
  }
  const result = await mergeMistakeEvents({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    storage: input.storage,
    events: [...input.journal.events, ...unavailableEvents],
  });
  return Object.freeze({
    unavailableCount: unavailableEvents.length,
    journal: result.journal,
  });
}
