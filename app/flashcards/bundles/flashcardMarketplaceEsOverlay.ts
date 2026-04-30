import type { MarketplaceEsOverlay } from './esOverlays/types';
import { DARK_LOGIC_ES_OVERLAY } from './esOverlays/darkLogic';
import { NEGOTIATOR_ES_OVERLAY } from './esOverlays/negotiator';
import { PEAKY_BLINDERS_ES_OVERLAY } from './esOverlays/peakyBlinders';
import { ROYAL_TEA_ES_OVERLAY } from './esOverlays/royalTea';
import { WILD_WEST_ES_OVERLAY } from './esOverlays/wildWest';

const MARKETPLACE_ES_OVERLAY_BY_CARD_ID: Record<string, MarketplaceEsOverlay> = {
  ...NEGOTIATOR_ES_OVERLAY,
  ...WILD_WEST_ES_OVERLAY,
  ...PEAKY_BLINDERS_ES_OVERLAY,
  ...DARK_LOGIC_ES_OVERLAY,
  ...ROYAL_TEA_ES_OVERLAY,
};

export function marketplaceEsOverlayForId(
  cardId: string,
): MarketplaceEsOverlay | undefined {
  return MARKETPLACE_ES_OVERLAY_BY_CARD_ID[cardId];
}
