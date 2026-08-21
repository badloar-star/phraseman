import { englishRecallSurface } from '../phrase_target_utils';
import { projectMistakes, type MistakeProjectionItem } from '../../modules/mistake-practice/projection';
import { loadMistakeEventJournal } from '../mistake_practice_store';
import { getStableId } from '../stable_id';
import { storageStudyTarget } from '../target_storage_keys';

export type WordStrength = 'weak' | 'medium' | 'strong';
export type WordStrengthMap = Map<string, WordStrength>;

const STRENGTH_RANK: Record<WordStrength, number> = { weak: 1, medium: 2, strong: 3 };

/** Число точек для UI (1/2/3). */
export function strengthDotCount(s: WordStrength): 1 | 2 | 3 {
  return STRENGTH_RANK[s] as 1 | 2 | 3;
}

export function strongerOf(a: WordStrength, b: WordStrength): WordStrength {
  return STRENGTH_RANK[a] >= STRENGTH_RANK[b] ? a : b;
}

/** Нормализованный ключ EN-текста карточки/фразы. */
export function strengthKey(en: string): string {
  return englishRecallSurface(en ?? '').toLowerCase();
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

/** Сила карточки по её EN; null — «не тренировалась» (точки не рисуем). */
export function strengthFor(en: string, map: WordStrengthMap | null | undefined): WordStrength | null {
  if (!map) return null;
  return map.get(strengthKey(en)) ?? null;
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** Прочитать оба SRS-источника из AsyncStorage и собрать карту (fail-soft → пустая). */
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
