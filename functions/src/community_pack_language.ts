/**
 * Язык пользовательского набора карточек (сервер).
 *
 * зачем (D127, владелец 2026-09-30): наборы «без языка» — столицы, формулы,
 * термины. Значение 'none' хранится только если автор выбрал его явно; старые
 * наборы без поля остаются английскими. Такой набор НЕ озвучивается: любой
 * серверный путь TTS (в т.ч. озвучка при одобрении, D128) обязан спросить
 * `communityPackTtsLanguage` и пропустить набор, когда получил null.
 *
 * Зеркало клиентского `app/flashcards/pack_languages.ts` — держать списки
 * одинаковыми.
 */

export const COMMUNITY_STUDY_PACK_LANGUAGES = ['en', 'fr', 'de', 'es'] as const;
export type CommunityStudyPackLanguage = (typeof COMMUNITY_STUDY_PACK_LANGUAGES)[number];

export const COMMUNITY_NO_PACK_LANGUAGE = 'none' as const;
export type CommunityPackLanguage = CommunityStudyPackLanguage | typeof COMMUNITY_NO_PACK_LANGUAGE;

export const COMMUNITY_PACK_LANGUAGES: readonly CommunityPackLanguage[] = [
  ...COMMUNITY_STUDY_PACK_LANGUAGES,
  COMMUNITY_NO_PACK_LANGUAGE,
];

export function isCommunityPackLanguage(raw: unknown): raw is CommunityPackLanguage {
  return typeof raw === 'string' && (COMMUNITY_PACK_LANGUAGES as readonly string[]).includes(raw);
}

/** Missing / unknown values are legacy English packs; 'none' only when explicit. */
export function normalizeCommunityPackLanguage(raw: unknown): CommunityPackLanguage {
  return isCommunityPackLanguage(raw) ? raw : 'en';
}

/**
 * Язык озвучки набора или null, если набор озвучивать нельзя.
 * Любой вызов TTS для карточек набора обязан пройти через эту проверку.
 */
export function communityPackTtsLanguage(
  raw: unknown,
  context?: Readonly<{ packId?: string }>,
): CommunityStudyPackLanguage | null {
  const language = normalizeCommunityPackLanguage(raw);
  if (language === COMMUNITY_NO_PACK_LANGUAGE) {
    console.log(`[PACK-LANG] tts:skip pack=${context?.packId ?? '?'} packLanguage="none" — набор без языка не озвучивается`);
    return null;
  }
  return language;
}
