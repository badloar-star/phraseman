import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import type { CardItem } from './flashcards/types';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import {
  getCachedFrenchRemoteFlashcards,
} from './french_flashcard_remote_runtime';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { isStudyTarget, type StudyTarget } from './study_target';

export type FlashcardsSourceGatedSurface =
  | 'system_cards'
  | 'official_marketplace_packs'
  | 'community_packs';

export type FlashcardsSourceGate = {
  enabled: boolean;
  studyTarget: StudyTarget;
  surface: FlashcardsSourceGatedSurface;
  reason?:
    | 'french_flashcards_source_gate'
    | 'french_flashcards_server_system_cards_available'
    | 'french_flashcards_server_marketplace_packs_available'
    | 'unsupported_flashcards_target'
    | 'no_native_system_cards';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export const FRENCH_FLASHCARDS_REQUIRED_EVIDENCE = Object.freeze([
  'french_flashcard_system_bank',
  'french_flashcard_marketplace_pack_review',
  'french_flashcard_community_pack_policy',
  'ru_uk_flashcard_prompt_review',
]);

/**
 * зачем (D160, владелец 04.10 «правильно он и сделал, доведи правку»): закрываем ТОЛЬКО то, чего
 * реально нет. Встроенный банк SYSTEM_CARDS — английский; немецкому/испанскому/итальянскому
 * ученику его не подставляем (раньше любой язык молча получал английские слова). Но раздел карточек,
 * свои наборы и наборы маркета у этих языков открыты (D129/D130). Пустой/неизвестный язык — это
 * не «неготовый язык», а недочитанное значение: трактуем как язык по умолчанию, иначе карточки
 * пропали бы у всех.
 */
const FC_TARGET_GATE_LOGGED = new Set<string>();

function logFlashcardsTargetGate(event: string, details: Record<string, unknown>): void {
  // зачем: гейт зовут из useMemo при каждой смене языка — пишем каждый ИСХОД один раз, без флуда.
  const key = `${event}|${JSON.stringify(details)}`;
  if (FC_TARGET_GATE_LOGGED.has(key)) return;
  FC_TARGET_GATE_LOGGED.add(key);
  console.warn('[FC-TARGET-GATE]', event, JSON.stringify(details));
}

/** Языки без родного системного банка: встроенный английский банк им не показываем. */
const NO_NATIVE_SYSTEM_CARDS_TARGETS: ReadonlySet<StudyTarget> = new Set<StudyTarget>(['es', 'de', 'it']);

function resolveFlashcardsTarget(studyTarget: RuntimeStudyTarget, surface: FlashcardsSourceGatedSurface): StudyTarget {
  if (isStudyTarget(studyTarget)) return studyTarget;
  const fallback = storageStudyTarget(studyTarget);
  logFlashcardsTargetGate('target:unresolved_fallback_default', {
    raw: studyTarget === undefined ? 'undefined' : studyTarget,
    fallback,
    surface,
  });
  return fallback;
}

export function flashcardsSourceGateForTarget(
  studyTarget: RuntimeStudyTarget,
  surface: FlashcardsSourceGatedSurface,
  sourceLocale?: unknown,
): FlashcardsSourceGate {
  void sourceLocale;
  const target = resolveFlashcardsTarget(studyTarget, surface);
  if (surface === 'official_marketplace_packs') {
    logFlashcardsTargetGate('exit:official_packs_retired', { target, surface });
    return {
      enabled: false,
      studyTarget: target,
      surface,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }
  if (target === 'en') {
    return {
      enabled: true,
      studyTarget: 'en',
      surface,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }
  if (target !== 'fr') {
    // Свои и маркетные наборы у языка свои — их не закрываем; закрыт только английский системный банк.
    const enabled = surface === 'community_packs';
    const reason = NO_NATIVE_SYSTEM_CARDS_TARGETS.has(target)
      ? 'no_native_system_cards'
      : 'unsupported_flashcards_target';
    if (!enabled) logFlashcardsTargetGate('exit:system_cards_closed', { target, surface, reason });
    return {
      enabled,
      studyTarget: target,
      surface,
      reason: enabled ? undefined : reason,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  const systemCardsEnabled = surface === 'system_cards';
  const enabled = systemCardsEnabled || surface === 'community_packs';
  return {
    enabled,
    studyTarget: 'fr',
    surface,
    reason: systemCardsEnabled
      ? 'french_flashcards_server_system_cards_available'
      : 'french_flashcards_source_gate',
    blockedRoutes: enabled ? [] : ['/flashcards_collection', '/flashcards_swipe', '/flashcards_truefalse_session', '/pack_opening', '/shards_shop'],
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
  void studyTarget;
  void sourceLocale;
  return false;
}

export function flashcardsCommunityPacksAvailableForTarget(studyTarget: RuntimeStudyTarget): boolean {
  return flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'community_packs');
}

export function flashcardsSystemCardsForTarget(
  cards: readonly CardItem[],
  studyTarget: RuntimeStudyTarget,
  sourceLocale?: unknown,
): CardItem[] {
  if (studyTarget === 'fr') return getCachedFrenchRemoteFlashcards(sourceLocale);
  if (!flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'system_cards')) {
    logFlashcardsTargetGate('exit:system_cards_empty', { target: studyTarget ?? 'undefined', cards: cards.length });
    return [];
  }
  return [...cards];
}

export function frenchFlashcardsGateCopy(lang: Lang): { title: string; body: string } {
  return {
    title: triLang(lang, { ru: 'Французские наборы карточек ещё проверяются', uk: 'Французькі набори карток ще перевіряються', en: 'French flashcard packs are still being reviewed', es: 'Los packs de tarjetas en francés aún se están revisando', 'pt-BR': 'Os pacotes de cartões em francês ainda estão em revisão', vi: 'Các bộ thẻ tiếng Pháp vẫn đang được kiểm tra', id: 'Paket kartu bahasa Prancis masih ditinjau', tr: 'Fransızca kart paketleri hâlâ inceleniyor', pl: 'Francuskie zestawy fiszek są jeszcze w trakcie weryfikacji' }),
    body: triLang(lang, { ru: 'Английские наборы скрыты в режиме French, чтобы не смешивать язык, прогресс и ошибки. Они появятся после проверки французских карточек и подсказок.', uk: 'Англійські набори приховано в режимі French, щоб не змішувати мову, прогрес і помилки. Вони з’являться після перевірки французьких карток і підказок.', en: 'English packs are hidden in French mode so language, progress, and mistakes don\'t mix. They\'ll appear once French cards and hints have been reviewed.', es: 'Los packs en inglés están ocultos en el modo French para no mezclar idiomas, progreso ni errores. Aparecerán cuando se revisen las tarjetas y pistas en francés.', 'pt-BR': 'Os pacotes em inglês ficam ocultos no modo French para não misturar idioma, progresso e erros. Eles aparecerão após a revisão dos cartões e dicas em francês.', vi: 'Các bộ thẻ tiếng Anh được ẩn ở chế độ French để không trộn lẫn ngôn ngữ, tiến độ và lỗi. Chúng sẽ xuất hiện sau khi thẻ và gợi ý tiếng Pháp được kiểm tra.', id: 'Paket bahasa Inggris disembunyikan dalam mode French agar bahasa, progres, dan kesalahan tidak tercampur. Paket akan tersedia setelah kartu dan petunjuk bahasa Prancis ditinjau.', tr: 'İngilizce paketler, dilin, ilerlemenin ve hataların karışmaması için French modunda gizlenir. Fransızca kartlar ve ipuçları incelendikten sonra açılacaktır.', pl: 'Zestawy angielskie są ukryte w trybie French, aby nie mieszać języka, postępów i błędów. Pojawią się po sprawdzeniu francuskich fiszek i podpowiedzi.' }),
  };
}

export const FRENCH_FLASHCARDS_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_FLASHCARDS_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __FlashcardsTargetGateRouteShim() {
  return null;
}
