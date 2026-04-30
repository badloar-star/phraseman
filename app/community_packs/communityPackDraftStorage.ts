import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMMUNITY_PACK_CARD_COUNT_MAX,
  COMMUNITY_PACK_PRICE_SHARDS_MAX,
  COMMUNITY_PACK_PRICE_SHARDS_MIN,
} from './schema';
import { UGC_CARD_THEME_IDS } from './ugcCardThemePresets';

const STORAGE_KEY = 'community_pack_create_draft_v1';

export type CommunityPackCreateDraftRow = { id: string; en: string; ru: string; uk: string };

export type CommunityPackCreateDraftV1 = {
  v: 1;
  title: string;
  description: string;
  priceShards: number;
  themeIdx: number;
  rows: CommunityPackCreateDraftRow[];
  addCardFormOpen: boolean;
  draftEn: string;
  draftRu: string;
  draftNote: string;
};

function clampPriceShards(n: number): number {
  const step = 10;
  const x = Math.round(n / step) * step;
  return Math.min(COMMUNITY_PACK_PRICE_SHARDS_MAX, Math.max(COMMUNITY_PACK_PRICE_SHARDS_MIN, x));
}

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
    typeof o.uk === 'string'
  );
}

export function communityPackCreateDraftIsMeaningful(d: CommunityPackCreateDraftV1): boolean {
  return (
    d.rows.length > 0 ||
    d.title.trim().length > 0 ||
    d.description.trim().length > 0 ||
    d.priceShards !== COMMUNITY_PACK_PRICE_SHARDS_MIN ||
    d.themeIdx !== 0 ||
    d.addCardFormOpen ||
    d.draftEn.trim().length > 0 ||
    d.draftRu.trim().length > 0 ||
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
      priceShards: clampPriceShards(typeof o.priceShards === 'number' ? o.priceShards : COMMUNITY_PACK_PRICE_SHARDS_MIN),
      themeIdx: clampThemeIdx(typeof o.themeIdx === 'number' ? o.themeIdx : 0),
      rows,
      addCardFormOpen: o.addCardFormOpen === true,
      draftEn: typeof o.draftEn === 'string' ? o.draftEn : '',
      draftRu: typeof o.draftRu === 'string' ? o.draftRu : '',
      draftNote: typeof o.draftNote === 'string' ? o.draftNote : '',
    };
  } catch {
    return null;
  }
}

export async function loadCommunityPackCreateDraft(): Promise<CommunityPackCreateDraftV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return parseDraft(raw);
  } catch {
    return null;
  }
}

export async function hasMeaningfulCommunityPackCreateDraft(): Promise<boolean> {
  const d = await loadCommunityPackCreateDraft();
  return !!d && communityPackCreateDraftIsMeaningful(d);
}

export async function saveCommunityPackCreateDraft(d: Omit<CommunityPackCreateDraftV1, 'v'>): Promise<void> {
  const body: CommunityPackCreateDraftV1 = {
    v: 1,
    title: d.title,
    description: d.description,
    priceShards: clampPriceShards(d.priceShards),
    themeIdx: clampThemeIdx(d.themeIdx),
    rows: d.rows.slice(0, COMMUNITY_PACK_CARD_COUNT_MAX).map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })),
    addCardFormOpen: d.addCardFormOpen,
    draftEn: d.draftEn,
    draftRu: d.draftRu,
    draftNote: d.draftNote,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  } catch {
    /* ignore */
  }
}

export async function clearCommunityPackCreateDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
