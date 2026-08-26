import Ionicons from '@expo/vector-icons/Ionicons';
import {
  fetchCommunityPackCards,
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
} from '../community_packs/communityFirestore';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { triLang, type Lang } from '../../constants/i18n';
import { loadFlashcards, type Flashcard } from '../../hooks/use-flashcards';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  loadAccessiblePackIds,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from '../flashcards_target_gate';
import { readCustomCards } from './storage';
import type { CardItem } from './types';

export type SourceKind = 'saved' | 'custom' | 'official' | 'community';

export type TrainingSource = {
  id: string;
  kind: SourceKind;
  title: string;
  subtitle: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  cards?: CardItem[];
  loadCards?: () => Promise<CardItem[]>;
};

export type TrainingCard<TMemory = unknown> = CardItem & {
  trainingKey: string;
  trainingSourceId: string;
  trainingSourceTitle: string;
  memory?: TMemory;
};

export type TrainingSourceInfo = {
  totalPool: number;
  due: number;
  weak: number;
  fresh: number;
};

export const SOURCE_ACCENTS: Record<SourceKind, string> = {
  saved: '#7CDAFF',
  custom: '#FFB84D',
  official: '#7CFF92',
  community: '#D6A4FF',
};

export function cleanString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function cardCountLabel(lang: Lang, count: number): string {
  return `${count} ${triLang(lang, {
    ru: 'карточек',
    uk: 'карток',
    en: 'cards',
    es: 'tarjetas',
    'pt-BR': 'cartões',
    vi: 'thẻ',
    id: 'kartu',
    tr: 'kart',
    pl: 'fiszek',
  })}`;
}

export function flashcardToCardItem(card: Flashcard): CardItem {
  return {
    id: card.id,
    en: card.en,
    ru: card.ru,
    uk: card.uk,
    es: card.es,
    sourceLocales: {
      'pt-BR': card.sourceLocales?.['pt-BR'],
      vi: card.sourceLocales?.vi,
      id: card.sourceLocales?.id,
      tr: card.sourceLocales?.tr,
      pl: card.sourceLocales?.pl,
    },
    transcription: card.transcription,
    categoryId: 'saved',
    isSystem: false,
    source: card.source,
    sourceId: card.sourceId,
    literalRu: card.literalRu,
    literalUk: card.literalUk,
    literalEs: card.literalEs,
    explanationRu: card.explanationRu,
    explanationUk: card.explanationUk,
    explanationEs: card.explanationEs,
    exampleEn: card.exampleEn,
    exampleRu: card.exampleRu,
    exampleUk: card.exampleUk,
    exampleEs: card.exampleEs,
    usageNoteRu: card.usageNoteRu,
    usageNoteUk: card.usageNoteUk,
    usageNoteEs: card.usageNoteEs,
    register: card.register,
    level: card.level,
  };
}

export function filterCardsForRoute(cards: CardItem[], filter: string): CardItem[] {
  if (!filter || filter === 'all') return cards;
  if (filter.startsWith('lesson:')) {
    const sourceId = filter.slice(7);
    return cards.filter((card) => card.source === 'lesson' && card.sourceId === sourceId);
  }
  return cards.filter((card) => card.source === filter);
}

export function customRawToCardItems(rawCards: unknown[]): CardItem[] {
  const out: CardItem[] = [];
  for (let i = 0; i < rawCards.length; i += 1) {
    const raw = rawCards[i];
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const en = cleanString(c.en);
    const ru = cleanString(c.ru);
    const uk = cleanString(c.uk) || ru;
    const es = cleanString(c.es);
    if (!en || (!ru && !uk && !es)) continue;
    const sourceLocales = c.sourceLocales && typeof c.sourceLocales === 'object'
      ? c.sourceLocales as Record<string, unknown>
      : {};
    out.push({
      id: cleanString(c.id) || `custom_${i + 1}`,
      en,
      ru,
      uk,
      es: es || undefined,
      sourceLocales: {
        'pt-BR': cleanString(sourceLocales['pt-BR']) || undefined,
        vi: cleanString(sourceLocales.vi) || undefined,
        id: cleanString(sourceLocales.id) || undefined,
        tr: cleanString(sourceLocales.tr) || undefined,
        pl: cleanString(sourceLocales.pl) || undefined,
      },
      description: cleanString(c.description) || undefined,
      transcription: cleanString(c.transcription) || undefined,
      categoryId: 'custom',
      isSystem: false,
      source: cleanString(c.source) || 'custom',
      sourceId: cleanString(c.sourceId) || undefined,
      literalRu: cleanString(c.literalRu) || undefined,
      literalUk: cleanString(c.literalUk) || undefined,
      literalEs: cleanString(c.literalEs) || undefined,
      explanationRu: cleanString(c.explanationRu) || undefined,
      explanationUk: cleanString(c.explanationUk) || undefined,
      explanationEs: cleanString(c.explanationEs) || undefined,
      exampleEn: cleanString(c.exampleEn) || undefined,
      exampleRu: cleanString(c.exampleRu) || undefined,
      exampleUk: cleanString(c.exampleUk) || undefined,
      exampleEs: cleanString(c.exampleEs) || undefined,
      usageNoteRu: cleanString(c.usageNoteRu) || undefined,
      usageNoteUk: cleanString(c.usageNoteUk) || undefined,
      usageNoteEs: cleanString(c.usageNoteEs) || undefined,
      register: cleanString(c.register) || undefined,
      level: cleanString(c.level) || undefined,
    });
  }
  return out;
}

export function packKey(pack: FlashcardMarketPack): string {
  return `${pack.isCommunityUgc ? 'community' : 'official'}:${pack.id}`;
}

export function routeParamString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function parseRouteIdList(value: string | string[] | undefined): string[] {
  const raw = routeParamString(value).trim();
  if (!raw) return [];
  return [...new Set(
    raw
      .split(/[|,;]/)
      .map((id) => id.trim())
      .filter(Boolean),
  )];
}

export function officialSourceSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Official pack',
    uk: 'Official pack',
    en: 'Official pack',
    es: 'Official pack',
    'pt-BR': 'Official pack',
    vi: 'Official pack',
    id: 'Official pack',
    tr: 'Official pack',
    pl: 'Official pack',
  });
}

export function savedSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Сохранённые карточки',
    uk: 'Збережені картки',
    en: 'Saved cards',
    es: 'Tarjetas guardadas',
    'pt-BR': 'Cartões salvos',
    vi: 'Thẻ đã lưu',
    id: 'Kartu tersimpan',
    tr: 'Kaydedilen kartlar',
    pl: 'Zapisane fiszki',
  });
}

export function customSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Свои карточки',
    uk: 'Свої картки',
    en: 'My cards',
    es: 'Tarjetas propias',
    'pt-BR': 'Seus cartões',
    vi: 'Thẻ của bạn',
    id: 'Kartu sendiri',
    tr: 'Kendi kartların',
    pl: 'Własne fiszki',
  });
}

export function personalListSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Личный список',
    uk: 'Особистий список',
    en: 'Personal list',
    es: 'Lista personal',
    'pt-BR': 'Lista pessoal',
    vi: 'Danh sách cá nhân',
    id: 'Daftar pribadi',
    tr: 'Kişisel liste',
    pl: 'Lista osobista',
  });
}

export function manualCardsSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Созданные вручную',
    uk: 'Створені вручну',
    en: 'Created manually',
    es: 'Creadas a mano',
    'pt-BR': 'Criadas manualmente',
    vi: 'Tạo thủ công',
    id: 'Dibuat manual',
    tr: 'Elle oluşturuldu',
    pl: 'Utworzone ręcznie',
  });
}

export function buildOfficialTrainingSourcesFromIds(
  ownedIds: string[],
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): TrainingSource[] {
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)) return [];
  return bundledPacksForOwned(ownedIds, studyTarget, lang)
    .map((pack) => {
      const cards = buildMarketplaceOwnedCards([pack], lang, studyTarget);
      return {
        id: packKey(pack),
        kind: 'official' as const,
        title: packTitleForInterface(pack, lang),
        subtitle: officialSourceSubtitle(lang),
        count: cards.length,
        icon: 'albums-outline' as const,
        accent: SOURCE_ACCENTS.official,
        cards,
      };
    })
    .filter((source) => source.count > 0);
}

export function buildCachedTrainingSources(
  lang: Lang,
  savedRaw: Flashcard[] | null,
  customRaw: unknown[] | null,
  officialOwnedIds: string[],
  requestedSourceId: string,
  requestedFilter: string,
  studyTarget?: RuntimeStudyTarget,
): TrainingSource[] {
  const next: TrainingSource[] = [];
  if (savedRaw !== null) {
    const savedCards = filterCardsForRoute(
      savedRaw.map(flashcardToCardItem).filter((card) => cleanString(card.en)),
      requestedSourceId === 'saved:all' ? requestedFilter : '',
    );
    if (savedCards.length > 0) {
      next.push({
        id: 'saved:all',
        kind: 'saved',
        title: savedSourceTitle(lang),
        subtitle: personalListSubtitle(lang),
        count: savedCards.length,
        icon: 'bookmark-outline',
        accent: SOURCE_ACCENTS.saved,
        cards: savedCards,
      });
    }
  }
  if (customRaw !== null) {
    const customCards = filterCardsForRoute(
      customRawToCardItems(customRaw),
      requestedSourceId === 'custom:all' ? requestedFilter : '',
    );
    if (customCards.length > 0) {
      next.push({
        id: 'custom:all',
        kind: 'custom',
        title: customSourceTitle(lang),
        subtitle: manualCardsSubtitle(lang),
        count: customCards.length,
        icon: 'create-outline',
        accent: SOURCE_ACCENTS.custom,
        cards: customCards,
      });
    }
  }
  next.push(...buildOfficialTrainingSourcesFromIds(officialOwnedIds, lang, studyTarget));
  return next;
}

export function initialSelectionForSources(sources: TrainingSource[], requestedSourceId: string): Set<string> {
  const valid = new Set(sources.map((source) => source.id));
  if (requestedSourceId && valid.has(requestedSourceId)) return new Set([requestedSourceId]);
  return valid;
}

export function reconcileSelectedSourceIds(
  current: Set<string>,
  sources: TrainingSource[],
  requestedSourceId: string,
): Set<string> {
  const valid = new Set(sources.map((source) => source.id));
  if (requestedSourceId && valid.has(requestedSourceId)) return new Set([requestedSourceId]);
  const kept = new Set([...current].filter((id) => valid.has(id)));
  return kept.size > 0 ? kept : valid;
}

export function optimisticSessionInfoForSources(
  sources: TrainingSource[],
  selectedIds: Set<string>,
): TrainingSourceInfo {
  const totalPool = sources.reduce(
    (sum, source) => (selectedIds.has(source.id) ? sum + Math.max(0, source.count) : sum),
    0,
  );
  return { totalPool, due: 0, weak: 0, fresh: totalPool };
}

export async function buildCommunitySources(
  lang: Lang,
  inheritedOwnedPackIds: string[],
  studyTarget?: RuntimeStudyTarget,
): Promise<TrainingSource[]> {
  if (!flashcardsCommunityPacksAvailableForTarget(studyTarget)) return [];
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return [];
  try {
    const [ownedCommunityIds, published, stableId] = await Promise.all([
      loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[]),
      loadPublishedCommunityMarketPacks(studyTarget).catch(() => [] as FlashcardMarketPack[]),
      getCanonicalUserId().catch(() => null as string | null),
    ]);
    const owned = new Set([...ownedCommunityIds, ...inheritedOwnedPackIds]);
    const minePublished = published.filter(
      (p) => owned.has(p.id) || (!!stableId && !!p.authorStableId && p.authorStableId === stableId),
    );
    const pendingMine = stableId
      ? await loadAuthorCommunityPacksPendingUpdate(stableId, studyTarget).catch(() => [] as FlashcardMarketPack[])
      : [];
    const visibleIds = new Set([...minePublished, ...pendingMine].map((p) => p.id));
    const missingOwned = [...owned].filter((id) => !visibleIds.has(id));
    const missingMeta = await Promise.all(missingOwned.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)));
    const byId = new Map<string, FlashcardMarketPack>();
    for (const pack of [...minePublished, ...pendingMine, ...missingMeta]) {
      if (pack?.isCommunityUgc) byId.set(pack.id, pack);
    }
    return [...byId.values()].map((pack) => ({
      id: packKey(pack),
      kind: 'community',
      title: packTitleForInterface(pack, lang),
      subtitle: triLang(lang, {
        ru: 'Community pack',
        uk: 'Community pack',
        en: 'Community pack',
        es: 'Community pack',
        'pt-BR': 'Pacote da comunidade',
        vi: 'Gói cộng đồng',
        id: 'Paket komunitas',
        tr: 'Topluluk paketi',
        pl: 'Pakiet społeczności',
      }),
      count: pack.cardCount,
      icon: 'people-outline',
      accent: SOURCE_ACCENTS.community,
      loadCards: () => fetchCommunityPackCards(pack.id, studyTarget),
    }));
  } catch {
    return [];
  }
}

export async function loadTrainingSources(input: {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  officialPacksEnabled: boolean;
  communityPacksEnabled: boolean;
  requestedSourceId: string;
  requestedFilter: string;
}): Promise<TrainingSource[]> {
  const [savedRaw, customRaw, officialOwnedIds] = await Promise.all([
    loadFlashcards(input.studyTarget).catch(() => [] as Flashcard[]),
    readCustomCards(input.studyTarget).catch(() => [] as unknown[]),
    input.officialPacksEnabled
      ? loadAccessiblePackIds(input.studyTarget).catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ]);
  const next = buildCachedTrainingSources(
    input.lang,
    savedRaw,
    customRaw,
    input.officialPacksEnabled ? officialOwnedIds : [],
    input.requestedSourceId,
    input.requestedFilter,
    input.studyTarget,
  );
  if (input.communityPacksEnabled) {
    next.push(...(await buildCommunitySources(input.lang, officialOwnedIds, input.studyTarget)));
  }
  return next;
}

export async function buildTrainingCardsFromSources<TMemory = unknown>(
  sources: TrainingSource[],
  answerFor: (card: CardItem) => string,
  memoryForCard?: (trainingKey: string) => TMemory,
): Promise<TrainingCard<TMemory>[]> {
  const chunks = await Promise.all(
    sources.map(async (source) => {
      const cards = source.cards ?? (await source.loadCards?.().catch(() => [] as CardItem[])) ?? [];
      return cards
        .filter((card) => cleanString(card.en) && answerFor(card))
        .map((card) => {
          const trainingKey = `${source.id}:${card.id}`;
          return {
            ...card,
            trainingKey,
            trainingSourceId: source.id,
            trainingSourceTitle: source.title,
            ...(memoryForCard ? { memory: memoryForCard(trainingKey) } : {}),
          };
        });
    }),
  );
  const byKey = new Map<string, TrainingCard<TMemory>>();
  for (const card of chunks.flat()) byKey.set(card.trainingKey, card);
  return [...byKey.values()];
}

export default function __RouteShim() { return null; }
