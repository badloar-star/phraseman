import { englishRecallSurface } from '../phrase_target_utils';
import { projectMistakes, type MistakeProjectionItem } from '../../modules/mistake-practice/projection';
import { loadMistakeEventJournal } from '../mistake_practice_store';
import { getStableId } from '../stable_id';
import { storageStudyTarget } from '../target_storage_keys';

export type WordStrength = 'weak' | 'medium' | 'strong';
export type WordStrengthMap = Map<string, WordStrength>;

const STRENGTH_RANK: Record<WordStrength, number> = { weak: 1, medium: 2, strong: 3 };

export function strengthDotCount(strength: WordStrength): 1 | 2 | 3 {
  return STRENGTH_RANK[strength] as 1 | 2 | 3;
}

export function strongerOf(left: WordStrength, right: WordStrength): WordStrength {
  return STRENGTH_RANK[left] >= STRENGTH_RANK[right] ? left : right;
}

export function strengthKey(value: string): string {
  return englishRecallSurface(value ?? '').toLowerCase();
}

export function strengthFromMistake(item: MistakeProjectionItem): WordStrength {
  if (item.status === 'corrected') return 'strong';
  if (item.qualifyingDays.length >= 1) return 'medium';
  return 'weak';
}

export function buildWordStrengthMap(items: readonly MistakeProjectionItem[]): WordStrengthMap {
  const map: WordStrengthMap = new Map();
  for (const item of items) {
    const key = strengthKey(item.canonicalTarget);
    if (!key) continue;
    const strength = strengthFromMistake(item);
    const prior = map.get(key);
    map.set(key, prior ? strongerOf(prior, strength) : strength);
  }
  return map;
}

export function strengthFor(value: string, map: WordStrengthMap | null | undefined): WordStrength | null {
  return map?.get(strengthKey(value)) ?? null;
}

export async function loadWordStrengthMap(): Promise<WordStrengthMap> {
  try {
    const studyTarget = storageStudyTarget();
    const accountScope = await getStableId();
    const journal = await loadMistakeEventJournal({ accountScope, studyTarget });
    return buildWordStrengthMap([...projectMistakes(journal.events).items.values()]);
  } catch {
    return new Map();
  }
}

export default function __RouteShim() { return null; }
