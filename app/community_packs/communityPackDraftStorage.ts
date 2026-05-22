import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMUNITY_PACK_CARD_COUNT_MAX, COMMUNITY_PACK_PRICE_SHARDS } from './schema';
import { UGC_CARD_THEME_IDS } from './ugcCardThemePresets';
import { UGC_CARD_BACK_IDS } from '../flashcards/cardBackCatalog';
import {
  communityPackCreateDraftKey,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from '../target_storage_keys';

export type CommunityPackCreateDraftRow = {
  id: string;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: {
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  };
};

export type CommunityPackCreateDraftV1 = {
  v: 1;
  title: string;
  description: string;
  /** Всегда `COMMUNITY_PACK_PRICE_SHARDS`; поле сохраняется для совместимости черновиков. */
  priceShards: number;
  themeIdx: number;
  cardBackIdx: number;
  rows: CommunityPackCreateDraftRow[];
  addCardFormOpen: boolean;
  draftEn: string;
  draftRu: string;
  draftEs: string;
  draftPlannedTranslation: string;
  draftNote: string;
};

function clampThemeIdx(i: number): number {
  const n = UGC_CARD_THEME_IDS.length;
  if (n <= 0) return 0;
  return ((Math.floor(i) % n) + n) % n;
}

function isRow(x: unknown): x is CommunityPackCreateDraftRow {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.en === 'string' &&
    typeof o.ru === 'string' &&
    typeof o.uk === 'string' &&
    (o.es === undefined || typeof o.es === 'string') &&
    (o.sourceLocales === undefined || typeof o.sourceLocales === 'object')
  );
}

function clampCardBackIdx(i: number): number {
  const n = UGC_CARD_BACK_IDS.length;
  if (n <= 0) return 0;
  return ((Math.floor(i) % n) + n) % n;
}

export function communityPackCreateDraftIsMeaningful(d: CommunityPackCreateDraftV1): boolean {
  return (
    d.rows.length > 0 ||
    d.title.trim().length > 0 ||
    d.description.trim().length > 0 ||
    d.themeIdx !== 0 ||
    d.cardBackIdx !== 0 ||
    d.addCardFormOpen ||
    d.draftEn.trim().length > 0 ||
    d.draftRu.trim().length > 0 ||
    d.draftEs.trim().length > 0 ||
    d.draftPlannedTranslation.trim().length > 0 ||
    d.draftNote.trim().length > 0
  );
}

function parseDraft(raw: string | null): CommunityPackCreateDraftV1 | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    if (o.v !== 1) return null;
    const rowsIn = Array.isArray(o.rows) ? o.rows.filter(isRow) : [];
    const rows = rowsIn.slice(0, COMMUNITY_PACK_CARD_COUNT_MAX).map((r, i) => ({
      ...r,
      id: typeof r.id === 'string' && r.id ? r.id : `c${i + 1}`,
    }));
    return {
      v: 1,
      title: typeof o.title === 'string' ? o.title : '',
      description: typeof o.description === 'string' ? o.description : '',
      priceShards: COMMUNITY_PACK_PRICE_SHARDS,
      themeIdx: clampThemeIdx(typeof o.themeIdx === 'number' ? o.themeIdx : 0),
      cardBackIdx: clampCardBackIdx(typeof o.cardBackIdx === 'number' ? o.cardBackIdx : 0),
      rows,
      addCardFormOpen: o.addCardFormOpen === true,
      draftEn: typeof o.draftEn === 'string' ? o.draftEn : '',
      draftRu: typeof o.draftRu === 'string' ? o.draftRu : '',
      draftEs: typeof o.draftEs === 'string' ? o.draftEs : '',
      draftPlannedTranslation: typeof o.draftPlannedTranslation === 'string' ? o.draftPlannedTranslation : '',
      draftNote: typeof o.draftNote === 'string' ? o.draftNote : '',
    };
  } catch {
    return null;
  }
}

export async function loadCommunityPackCreateDraft(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<CommunityPackCreateDraftV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(communityPackCreateDraftKey(studyTarget, sourceLocale));
    return parseDraft(raw);
  } catch {
    return null;
  }
}

export async function hasMeaningfulCommunityPackCreateDraft(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<boolean> {
  const d = await loadCommunityPackCreateDraft(studyTarget, sourceLocale);
  return !!d && communityPackCreateDraftIsMeaningful(d);
}

export async function saveCommunityPackCreateDraft(
  d: Omit<CommunityPackCreateDraftV1, 'v'>,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<void> {
  const body: CommunityPackCreateDraftV1 = {
    v: 1,
    title: d.title,
    description: d.description,
    priceShards: COMMUNITY_PACK_PRICE_SHARDS,
    themeIdx: clampThemeIdx(d.themeIdx),
    cardBackIdx: clampCardBackIdx(d.cardBackIdx),
    rows: d.rows.slice(0, COMMUNITY_PACK_CARD_COUNT_MAX).map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })),
    addCardFormOpen: d.addCardFormOpen,
    draftEn: d.draftEn,
    draftRu: d.draftRu,
    draftEs: d.draftEs,
    draftPlannedTranslation: d.draftPlannedTranslation,
    draftNote: d.draftNote,
  };
  try {
    await AsyncStorage.setItem(communityPackCreateDraftKey(studyTarget, sourceLocale), JSON.stringify(body));
  } catch {
    /* ignore */
  }
}

export async function clearCommunityPackCreateDraft(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(communityPackCreateDraftKey(studyTarget, sourceLocale));
  } catch {
    /* ignore */
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
