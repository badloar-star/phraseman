import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
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
  return {
    title: triLang(lang, { ru: 'Французские наборы карточек ещё проверяются', uk: 'Французькі набори карток ще перевіряються', es: 'Los paquetes de tarjetas en francés aún se están revisando', 'pt-BR': 'Os pacotes de cartões em francês ainda estão em revisão', vi: 'Các bộ thẻ tiếng Pháp vẫn đang được kiểm tra', id: 'Paket kartu bahasa Prancis masih ditinjau', tr: 'Fransızca kart paketleri hâlâ inceleniyor', pl: 'Francuskie zestawy fiszek są jeszcze w trakcie weryfikacji' }),
    body: triLang(lang, { ru: 'Английские наборы скрыты в режиме French, чтобы не смешивать язык, прогресс и ошибки. Они появятся после проверки французских карточек и подсказок.', uk: 'Англійські набори приховано в режимі French, щоб не змішувати мову, прогрес і помилки. Вони з’являться після перевірки французьких карток і підказок.', es: 'Los paquetes en inglés están ocultos en el modo French para no mezclar idiomas, progreso ni errores. Aparecerán cuando se revisen las tarjetas y pistas en francés.', 'pt-BR': 'Os pacotes em inglês ficam ocultos no modo French para não misturar idioma, progresso e erros. Eles aparecerão após a revisão dos cartões e dicas em francês.', vi: 'Các bộ thẻ tiếng Anh được ẩn ở chế độ French để không trộn lẫn ngôn ngữ, tiến độ và lỗi. Chúng sẽ xuất hiện sau khi thẻ và gợi ý tiếng Pháp được kiểm tra.', id: 'Paket bahasa Inggris disembunyikan dalam mode French agar bahasa, progres, dan kesalahan tidak tercampur. Paket akan tersedia setelah kartu dan petunjuk bahasa Prancis ditinjau.', tr: 'İngilizce paketler, dilin, ilerlemenin ve hataların karışmaması için French modunda gizlenir. Fransızca kartlar ve ipuçları incelendikten sonra açılacaktır.', pl: 'Zestawy angielskie są ukryte w trybie French, aby nie mieszać języka, postępów i błędów. Pojawią się po sprawdzeniu francuskich fiszek i podpowiedzi.' }),
  };
}

export const FRENCH_FLASHCARDS_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_FLASHCARDS_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __FlashcardsTargetGateRouteShim() {
  return null;
}
