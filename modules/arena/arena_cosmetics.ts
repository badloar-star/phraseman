import type { ArenaCosmeticSlot } from './expansion_contract';

export type ArenaCosmeticDefinition = Readonly<{
  itemId: string;
  slot: ArenaCosmeticSlot;
  treatment: 'text' | 'preset_reactions' | 'result_midnight' | 'result_lime' | 'result_gold' | 'stamp' | 'entry_trail' | 'entry_burst' | 'entry_crown';
}>;

export const ARENA_COSMETICS: readonly ArenaCosmeticDefinition[] = Object.freeze([
  { itemId: 'title_rising_challenger', slot: 'title', treatment: 'text' },
  { itemId: 'title_clutch_player', slot: 'title', treatment: 'text' },
  { itemId: 'title_wordsmith', slot: 'title', treatment: 'text' },
  { itemId: 'reactions_respect', slot: 'reaction_pack', treatment: 'preset_reactions' },
  { itemId: 'reactions_comeback', slot: 'reaction_pack', treatment: 'preset_reactions' },
  { itemId: 'result_midnight', slot: 'result_theme', treatment: 'result_midnight' },
  { itemId: 'result_lime', slot: 'result_theme', treatment: 'result_lime' },
  { itemId: 'result_champion_gold', slot: 'result_theme', treatment: 'result_gold' },
  { itemId: 'victory_clean_sweep', slot: 'victory_stamp', treatment: 'stamp' },
  { itemId: 'victory_clutch', slot: 'victory_stamp', treatment: 'stamp' },
  { itemId: 'entry_cyan_trail', slot: 'entry', treatment: 'entry_trail' },
  { itemId: 'entry_gold_burst', slot: 'entry', treatment: 'entry_burst' },
  { itemId: 'entry_legend_crown', slot: 'entry', treatment: 'entry_crown' },
]);

const BY_ID = new Map(ARENA_COSMETICS.map((item) => [item.itemId, item]));
export const arenaCosmeticDefinition = (itemId: string | undefined): ArenaCosmeticDefinition | null => itemId ? BY_ID.get(itemId) ?? null : null;

export function arenaResultTheme(itemId: string | undefined): Readonly<{ backgroundColor: string; borderColor: string; foreground: string }> | null {
  const treatment = arenaCosmeticDefinition(itemId)?.treatment;
  if (treatment === 'result_midnight') return { backgroundColor: '#10182B', borderColor: '#2B3A5B', foreground: '#F5F7FF' };
  if (treatment === 'result_lime') return { backgroundColor: '#C9FF53', borderColor: '#07110A', foreground: '#07110A' };
  if (treatment === 'result_gold') return { backgroundColor: '#F7C948', borderColor: '#07110A', foreground: '#07110A' };
  return null;
}
