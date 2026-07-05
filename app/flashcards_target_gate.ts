import type { Lang } from '../constants/i18n';
import { FLASHCARDS_MARKET_DEV_ROUTE } from '../constants/devRoutes';
import type { CardItem } from './flashcards/types';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import {
  getCachedFrenchRemoteFlashcards,
  getCachedFrenchRemoteMarketplacePacks,
} from './french_flashcard_remote_runtime';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type FlashcardsSourceGatedSurface =
  | 'system_cards'
  | 'official_marketplace_packs'
  | 'community_packs';

export type FlashcardsSourceGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  surface: FlashcardsSourceGatedSurface;
  reason?:
    | 'french_flashcards_source_gate'
    | 'french_flashcards_server_system_cards_available'
    | 'french_flashcards_server_marketplace_packs_available';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export const FRENCH_FLASHCARDS_REQUIRED_EVIDENCE = Object.freeze([
  'french_flashcard_system_bank',
  'french_flashcard_marketplace_pack_review',
  'french_flashcard_community_pack_policy',
  'ru_uk_flashcard_prompt_review',
]);

export function flashcardsSourceGateForTarget(
  studyTarget: RuntimeStudyTarget,
  surface: FlashcardsSourceGatedSurface,
  sourceLocale?: unknown,
): FlashcardsSourceGate {
  const target = storageStudyTarget(studyTarget);
  if (target !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      surface,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  const systemCardsEnabled = surface === 'system_cards';
  const marketplacePacksEnabled =
    surface === 'official_marketplace_packs' &&
    getCachedFrenchRemoteMarketplacePacks(sourceLocale).length > 0;
  const enabled = systemCardsEnabled || marketplacePacksEnabled;
  return {
    enabled,
    studyTarget: 'fr',
    surface,
    reason: systemCardsEnabled
      ? 'french_flashcards_server_system_cards_available'
      : marketplacePacksEnabled
        ? 'french_flashcards_server_marketplace_packs_available'
        : 'french_flashcards_source_gate',
    blockedRoutes: enabled ? [] : ['/flashcards_collection', '/flashcards_swipe', '/flashcards_audio', FLASHCARDS_MARKET_DEV_ROUTE, '/pack_opening', '/shards_shop'],
    requiredEvidence: FRENCH_FLASHCARDS_REQUIRED_EVIDENCE,
  };
}

export function flashcardsSourceGatedContentAvailableForTarget(
  studyTarget: RuntimeStudyTarget,
  surface: FlashcardsSourceGatedSurface,
  sourceLocale?: unknown,
): boolean {
  return flashcardsSourceGateForTarget(studyTarget, surface, sourceLocale).enabled;
}

export function flashcardsOfficialPacksAvailableForTarget(studyTarget: RuntimeStudyTarget, sourceLocale?: unknown): boolean {
  return flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'official_marketplace_packs', sourceLocale);
}

export function flashcardsCommunityPacksAvailableForTarget(studyTarget: RuntimeStudyTarget): boolean {
  return flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'community_packs');
}

export function flashcardsSystemCardsForTarget(
  cards: readonly CardItem[],
  studyTarget: RuntimeStudyTarget,
  sourceLocale?: unknown,
): CardItem[] {
  if (storageStudyTarget(studyTarget) === 'fr') return getCachedFrenchRemoteFlashcards(sourceLocale);
  if (!flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'system_cards')) return [];
  return [...cards];
}

export function frenchFlashcardsGateCopy(lang: Lang): { title: string; body: string } {
  const uk = lang === 'uk';
  return uk
    ? {
        title: 'Французькі набори карток ще на перевірці',
        body: 'Англійські системні, маркет- і community-набори приховано в режимі French. Вони відкриються тільки після окремого французького flashcards source gate з перевіреними підказками українською/російською.',
      }
    : {
        title: 'Французские наборы карточек ещё на проверке',
        body: 'Английские системные, маркет- и community-наборы скрыты в режиме French. Они откроются только после отдельного французского flashcards source gate с проверенными подсказками на русском/украинском.',
      };
}

export const FRENCH_FLASHCARDS_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_FLASHCARDS_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __FlashcardsTargetGateRouteShim() {
  return null;
}
