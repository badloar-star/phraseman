import type { CardItem } from '../../types';

/** Поля ES для маркетплейс-карток (мержаться у `mapVictoriaRowsToCardItems`). */
export type MarketplaceEsOverlay = Pick<
  CardItem,
  'es' | 'literalEs' | 'explanationEs' | 'exampleEs' | 'usageNoteEs'
>;
