import type { Lang } from '../constants/i18n';
import { FLASHCARDS_MARKET_DEV_ROUTE } from '../constants/devRoutes';
import type { CardItem } from './flashcards/types';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import {
  getCachedFrenchRemoteFlashcards,
  getCachedFrenchRemoteMarketplacePacks,
} from './french_flashcard_remote_runtime';
import { getCachedCourseReleaseFlashcards } from './language_runtime/course_release_flashcard_loader';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type FlashcardsSourceGatedSurface =
  | 'system_cards'
  | 'official_marketplace_packs'
  | 'community_packs';

export type FlashcardsSourceGate = {
  enabled: boolean;
  studyTarget: string;
  surface: FlashcardsSourceGatedSurface;
  reason?:
    | 'french_flashcards_source_gate'
    | 'french_flashcards_server_system_cards_available'
    | 'french_flashcards_server_marketplace_packs_available'
    | 'course_release_flashcards_available';
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
  if (target === 'en') {
    return {
      enabled: true,
      studyTarget: 'en',
      surface,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  const canonicalCardsAvailable = getCachedCourseReleaseFlashcards(target, String(sourceLocale ?? 'ru')).length > 0;
  const legacyFrenchCardsAvailable = target === 'fr' && getCachedFrenchRemoteFlashcards(sourceLocale).length > 0;
  // French system cards are server-delivered. Keep the route open while its
  // cache warms; an empty synchronous peek must not hide the entry point.
  const systemCardsEnabled = surface === 'system_cards' && (target === 'fr' || canonicalCardsAvailable || legacyFrenchCardsAvailable);
  const marketplacePacksEnabled =
    target === 'fr' &&
    surface === 'official_marketplace_packs' &&
    getCachedFrenchRemoteMarketplacePacks(sourceLocale).length > 0;
  const enabled = systemCardsEnabled || marketplacePacksEnabled;
  return {
    enabled,
    studyTarget: target,
    surface,
    reason: canonicalCardsAvailable && surface === 'system_cards'
      ? 'course_release_flashcards_available'
      : systemCardsEnabled
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
  const target = storageStudyTarget(studyTarget);
  if (target === 'en') return [...cards];
  const canonical = getCachedCourseReleaseFlashcards(target, String(sourceLocale ?? 'ru'));
  if (canonical.length > 0) return canonical;
  if (target === 'fr') return getCachedFrenchRemoteFlashcards(sourceLocale);
  return [];
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
