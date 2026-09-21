import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMUNITY_PACK_CARD_COUNT_MAX } from './schema';

/**
 * Cards 2.1 §1.2: цены удалены — в черновике больше нет `priceShards`.
 * Старые черновики читаются как есть: лишнее поле просто игнорируется.
 */
import { UGC_CARD_THEME_IDS } from './ugcCardThemePresets';
import { UGC_CARD_BACK_IDS } from '../flashcards/cardBackCatalog';
import {
  communityPackCreateDraftKey,
  type RuntimeSourceLocale,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { DebugLogger } from '../debug-logger';
import { isPackLanguage, normalizePackLanguage, type PackLanguage } from '../flashcards/pack_languages';
import { captureAccountGeneration, isCurrentAccountGeneration, withAccountTransitionLock } from '../account_generation';

export type CommunityPackCreateDraftRow = {
  id: string;
  en: string;
  ru: string;
  uk: string;
  translationUk?: string;
  origin?: { source?: string; sourceId?: string; sourceTitle?: string };
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
  themeIdx: number;
  cardBackIdx: number;
  packLanguage?: PackLanguage;
  publishToCommunity?: boolean;
  /** Цена набора в рунах в незавершённом черновике (0 — бесплатный). */
  priceRunes?: number;
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
      id: typeof r.id === 'string' && r.id ? r.id: `c${i + 1}`,
    }));
    return {
      v: 1,
      title: typeof o.title === 'string' ? o.title : '',
      description: typeof o.description === 'string' ? o.description : '',
      themeIdx: clampThemeIdx(typeof o.themeIdx === 'number' ? o.themeIdx : 0),
      cardBackIdx: clampCardBackIdx(typeof o.cardBackIdx === 'number' ? o.cardBackIdx : 0),
      packLanguage: isPackLanguage(o.packLanguage) ? o.packLanguage : undefined,
      publishToCommunity: o.publishToCommunity === true,
      priceRunes: Math.max(0, Math.floor(Number(o.priceRunes ?? 0))) || 0,
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

// Keep the existing synced key and its v1 top-level shape. Other language drafts
// live alongside it, so switching the catalog flag never destroys an old draft.
function draftsByLanguage(raw: string | null, studyTarget?: RuntimeStudyTarget): Partial<Record<PackLanguage, CommunityPackCreateDraftV1>> {
  const drafts: Partial<Record<PackLanguage, CommunityPackCreateDraftV1>> = {};
  if (!raw) return drafts;
  try {
    const stored = JSON.parse(raw);
    for (const [language, value] of Object.entries(stored.draftsByPackLanguage ?? {})) {
      if (!isPackLanguage(language)) continue;
      const parsed = parseDraft(JSON.stringify(value));
      if (parsed) drafts[language] = parsed;
    }
    const latest = parseDraft(raw);
    if (latest) drafts[normalizePackLanguage(latest.packLanguage ?? studyTarget)] = latest;
  } catch { /* A malformed legacy draft must not prevent a new one. */ }
  return drafts;
}

let draftWrites: Promise<unknown> = Promise.resolve();
function serializeDraftWrite(operation: () => Promise<void>): Promise<void> {
  const token = captureAccountGeneration();
  const result = draftWrites.then(() => withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token)) throw new Error('Account changed');
    await operation();
  }));
  draftWrites = result.catch(() => undefined);
  return result;
}

export async function loadCommunityPackCreateDraft(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
  packLanguage?: PackLanguage,
): Promise<CommunityPackCreateDraftV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(communityPackCreateDraftKey(studyTarget, sourceLocale));
    return packLanguage ? draftsByLanguage(raw, studyTarget)[packLanguage] ?? null : parseDraft(raw);
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
    themeIdx: clampThemeIdx(d.themeIdx),
    cardBackIdx: clampCardBackIdx(d.cardBackIdx),
    packLanguage: isPackLanguage(d.packLanguage) ? d.packLanguage : undefined,
    publishToCommunity: d.publishToCommunity === true,
    priceRunes: Math.max(0, Math.floor(Number(d.priceRunes ?? 0))) || 0,
    rows: d.rows.slice(0, COMMUNITY_PACK_CARD_COUNT_MAX).map((r, i) => ({ ...r, id: r.id || `c${i + 1}` })),
    addCardFormOpen: d.addCardFormOpen,
    draftEn: d.draftEn,
    draftRu: d.draftRu,
    draftEs: d.draftEs,
    draftPlannedTranslation: d.draftPlannedTranslation,
    draftNote: d.draftNote,
  };
  try {
    await serializeDraftWrite(async () => {
      const key = communityPackCreateDraftKey(studyTarget, sourceLocale);
      const drafts = draftsByLanguage(await AsyncStorage.getItem(key), studyTarget);
      drafts[normalizePackLanguage(body.packLanguage ?? studyTarget)] = body;
      await AsyncStorage.setItem(key, JSON.stringify({ ...body, draftsByPackLanguage: drafts }));
    });
  } catch (e) {
      // ignore
      DebugLogger.error('communityPackDraftStorage:saveCommunityPackCreateDraft', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function clearCommunityPackCreateDraft(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
  packLanguage?: PackLanguage,
): Promise<void> {
  try {
    await serializeDraftWrite(async () => {
      const key = communityPackCreateDraftKey(studyTarget, sourceLocale);
      if (!packLanguage) { await AsyncStorage.removeItem(key); return; }
      const drafts = draftsByLanguage(await AsyncStorage.getItem(key), studyTarget);
      delete drafts[packLanguage];
      const remaining = Object.values(drafts)[0];
      if (!remaining) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify({ ...remaining, draftsByPackLanguage: drafts }));
    });
  } catch (e) {
      // ignore
      DebugLogger.error('communityPackDraftStorage:clearCommunityPackCreateDraft', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
