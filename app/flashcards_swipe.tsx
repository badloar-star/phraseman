import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import DuoPressable from '../components/DuoPressable';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { loadFlashcards, peekFlashcardsCache, type Flashcard } from '../hooks/use-flashcards';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  fetchCommunityPackCards,
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
} from './community_packs/communityFirestore';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  loadAccessiblePackIds,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  clearFlashcardsSwipeSessionDraft,
  loadFlashcardsSwipeSessionDraft,
  saveFlashcardsSwipeSessionDraft,
  type FlashcardsSwipePromptDraft,
  type FlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionScope,
} from './flashcards_swipe_session';
import { peekCustomCardsCache, readCustomCards } from './flashcards/storage';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './flashcards/types';
import { safeRouterBack } from './navigation_back';
import { flashcardContentLang } from './spanish_content_gate';
import { getCanonicalUserId } from './user_id_policy';
import { flashcardsSwipeMemoryKey, type RuntimeStudyTarget } from './target_storage_keys';
import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from './flashcards_target_gate';

type SourceKind = 'saved' | 'custom' | 'official' | 'community';
type Phase = 'select' | 'play';

type TrainingSource = {
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

type TrainingCard = CardItem & {
  trainingKey: string;
  trainingSourceId: string;
  trainingSourceTitle: string;
  memory?: CardMemory;
};

type Prompt = {
  id: string;
  card: TrainingCard;
  shownTranslation: string;
  trueTranslation: string;
  isMatch: boolean;
};

type CardProgress = {
  wrong: number;
  hints: number;
  attempts: number;
  recoveryCorrect: number;
  scoreAwarded: number;
};

type SessionStats = {
  total: number;
  answered: number;
  mastered: number;
  correctSwipes: number;
  wrong: number;
  hints: number;
  streak: number;
  bestStreak: number;
  score: number;
};

type FeedbackState = {
  kind: 'wrong' | 'hint';
  prompt: Prompt;
};

type CardMemory = {
  correct: number;
  wrong: number;
  hints: number;
  seen: number;
  mastered: number;
  lastSeenAt: number;
  nextDueAt: number;
  ease: number;
};

type SwipeMemory = Record<string, CardMemory>;

type SessionInfo = {
  totalPool: number;
  due: number;
  weak: number;
  fresh: number;
};

type SessionBuild = {
  cards: TrainingCard[];
  info: SessionInfo;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SOURCE_ACCENTS: Record<SourceKind, string> = {
  saved: '#7CDAFF',
  custom: '#FFB84D',
  official: '#7CFF92',
  community: '#D6A4FF',
};

function defaultMemory(): CardMemory {
  return {
    correct: 0,
    wrong: 0,
    hints: 0,
    seen: 0,
    mastered: 0,
    lastSeenAt: 0,
    nextDueAt: 0,
    ease: 2.2,
  };
}

function parseMemory(raw: string | null): SwipeMemory {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: SwipeMemory = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      out[key] = {
        correct: typeof row.correct === 'number' ? row.correct : 0,
        wrong: typeof row.wrong === 'number' ? row.wrong : 0,
        hints: typeof row.hints === 'number' ? row.hints : 0,
        seen: typeof row.seen === 'number' ? row.seen : 0,
        mastered: typeof row.mastered === 'number' ? row.mastered : 0,
        lastSeenAt: typeof row.lastSeenAt === 'number' ? row.lastSeenAt : 0,
        nextDueAt: typeof row.nextDueAt === 'number' ? row.nextDueAt : 0,
        ease: typeof row.ease === 'number' ? row.ease : 2.2,
      };
    }
    return out;
  } catch {
    return {};
  }
}

async function loadSwipeMemory(studyTarget?: RuntimeStudyTarget): Promise<SwipeMemory> {
  return parseMemory(await AsyncStorage.getItem(flashcardsSwipeMemoryKey(studyTarget)));
}

function compactMemory(memory: SwipeMemory): SwipeMemory {
  const entries = Object.entries(memory);
  if (entries.length <= 1200) return memory;
  return Object.fromEntries(
    entries
      .sort((a, b) => (b[1].lastSeenAt || 0) - (a[1].lastSeenAt || 0))
      .slice(0, 1200),
  );
}

async function saveSwipeMemory(memory: SwipeMemory, studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.setItem(flashcardsSwipeMemoryKey(studyTarget), JSON.stringify(compactMemory(memory)));
}

function memoryFor(memory: SwipeMemory, key: string): CardMemory {
  return memory[key] ?? defaultMemory();
}

function isWeakMemory(memory: CardMemory): boolean {
  return memory.wrong > 0 || memory.hints > 0 || memory.ease < 1.9;
}

function isDueMemory(memory: CardMemory, now: number): boolean {
  return memory.seen > 0 && memory.nextDueAt <= now;
}

function nextDueAfterMastery(memory: CardMemory, now: number): number {
  const intervals = [1, 3, 7, 14, 30, 60];
  const idx = Math.min(intervals.length - 1, Math.max(0, memory.mastered));
  const easeBoost = Math.max(0.75, Math.min(1.6, memory.ease / 2.2));
  return now + Math.round(intervals[idx] * easeBoost * DAY_MS);
}

function smartPriority(card: TrainingCard, now: number): number {
  const memory = card.memory ?? defaultMemory();
  const dueHours = memory.nextDueAt > 0 ? Math.max(0, (now - memory.nextDueAt) / HOUR_MS) : 0;
  const sourceBoost = card.trainingSourceId.startsWith('saved') ? 3 : 0;
  const weakBoost = isWeakMemory(memory) ? 34 + Math.min(18, memory.wrong * 4 + memory.hints * 3) : 0;
  const dueBoost = isDueMemory(memory, now) ? 26 + Math.min(20, dueHours / 6) : 0;
  const freshBoost = memory.seen === 0 ? 20 : 0;
  const masteredPenalty = !isDueMemory(memory, now) ? Math.min(22, memory.mastered * 5) : 0;
  return weakBoost + dueBoost + freshBoost + sourceBoost - masteredPenalty + Math.random() * 4;
}

function smartSortCards(cards: TrainingCard[], memory: SwipeMemory, now: number): TrainingCard[] {
  return cards
    .map((card) => ({ ...card, memory: memoryFor(memory, card.trainingKey) }))
    .map((card) => ({ card, priority: smartPriority(card, now) }))
    .sort((a, b) => b.priority - a.priority)
    .map(({ card }) => card);
}

function sessionInfoFor(cards: TrainingCard[], now: number): SessionInfo {
  return cards.reduce(
    (acc, card) => {
      const memory = card.memory ?? defaultMemory();
      acc.totalPool += 1;
      if (memory.seen === 0) acc.fresh += 1;
      if (isWeakMemory(memory)) acc.weak += 1;
      if (isDueMemory(memory, now)) acc.due += 1;
      return acc;
    },
    { totalPool: 0, due: 0, weak: 0, fresh: 0 },
  );
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function cardCountLabel(lang: Lang, count: number): string {
  return `${count} ${triLang(lang, {
    ru: 'карточек',
    uk: 'карток',
    es: 'tarjetas',
    'pt-BR': "cartões",
    vi: "thẻ",
    id: "kartu",
    tr: "kart",
    pl: "fiszek",
  })}`;
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[!?.,;:()[\]{}"'`]+/g, '')
    .replace(/\s+/g, ' ');
}

function shownAnswerNorm(prompt: Prompt | undefined): string {
  return prompt ? normalizeAnswer(prompt.shownTranslation) : '';
}

function adjacentShownNorms(queue: Prompt[], insertAt: number): Set<string> {
  const avoid = new Set<string>();
  const prev = shownAnswerNorm(queue[insertAt - 1]);
  const next = shownAnswerNorm(queue[insertAt]);
  if (prev) avoid.add(prev);
  if (next) avoid.add(next);
  return avoid;
}

function flashcardToCardItem(card: Flashcard): CardItem {
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

function filterCardsForRoute(cards: CardItem[], filter: string): CardItem[] {
  if (!filter || filter === 'all') return cards;
  if (filter.startsWith('lesson:')) {
    const sourceId = filter.slice(7);
    return cards.filter((card) => card.source === 'lesson' && card.sourceId === sourceId);
  }
  return cards.filter((card) => card.source === filter);
}

function customRawToCardItems(rawCards: unknown[]): CardItem[] {
  const out: CardItem[] = [];
  for (let i = 0; i < rawCards.length; i += 1) {
    const raw = rawCards[i];
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const en = s(c.en);
    const ru = s(c.ru);
    const uk = s(c.uk) || ru;
    const es = s(c.es);
    if (!en || (!ru && !uk && !es)) continue;
    out.push({
      id: s(c.id) || `custom_${i + 1}`,
      en,
      ru,
      uk,
      es: es || undefined,
      sourceLocales: {
        'pt-BR': s(c.sourceLocales && typeof c.sourceLocales === 'object' ? (c.sourceLocales as Record<string, unknown>)['pt-BR'] : undefined) || undefined,
        vi: s(c.sourceLocales && typeof c.sourceLocales === 'object' ? (c.sourceLocales as Record<string, unknown>).vi : undefined) || undefined,
        id: s(c.sourceLocales && typeof c.sourceLocales === 'object' ? (c.sourceLocales as Record<string, unknown>).id : undefined) || undefined,
        tr: s(c.sourceLocales && typeof c.sourceLocales === 'object' ? (c.sourceLocales as Record<string, unknown>).tr : undefined) || undefined,
        pl: s(c.sourceLocales && typeof c.sourceLocales === 'object' ? (c.sourceLocales as Record<string, unknown>).pl : undefined) || undefined,
      },
      description: s(c.description) || undefined,
      transcription: s(c.transcription) || undefined,
      categoryId: 'custom',
      isSystem: false,
      source: s(c.source) || 'custom',
      sourceId: s(c.sourceId) || undefined,
      literalRu: s(c.literalRu) || undefined,
      literalUk: s(c.literalUk) || undefined,
      literalEs: s(c.literalEs) || undefined,
      explanationRu: s(c.explanationRu) || undefined,
      explanationUk: s(c.explanationUk) || undefined,
      explanationEs: s(c.explanationEs) || undefined,
      exampleEn: s(c.exampleEn) || undefined,
      exampleRu: s(c.exampleRu) || undefined,
      exampleUk: s(c.exampleUk) || undefined,
      exampleEs: s(c.exampleEs) || undefined,
      usageNoteRu: s(c.usageNoteRu) || undefined,
      usageNoteUk: s(c.usageNoteUk) || undefined,
      usageNoteEs: s(c.usageNoteEs) || undefined,
      register: s(c.register) || undefined,
      level: s(c.level) || undefined,
    });
  }
  return out;
}

function localizedField(
  card: CardItem,
  lang: FlashcardContentLang,
  ru?: string,
  uk?: string,
  es?: string,
): string {
  if (lang === 'uk') return s(uk) || s(ru) || s(es);
  if (lang === 'es') return s(es) || s(ru) || s(uk);
  if (['pt-BR', 'vi', 'id', 'tr', 'pl'].includes(lang)) return '';
  return s(ru) || s(uk) || s(es);
}

function detailNoteForCard(card: CardItem, lang: FlashcardContentLang): string {
  const literal = localizedField(card, lang, card.literalRu, card.literalUk, card.literalEs);
  const explanation = localizedField(card, lang, card.explanationRu, card.explanationUk, card.explanationEs);
  const usage = localizedField(card, lang, card.usageNoteRu, card.usageNoteUk, card.usageNoteEs);
  const example = localizedField(card, lang, card.exampleRu, card.exampleUk, card.exampleEs);
  return [literal, explanation, usage, example || s(card.description)].filter(Boolean).slice(0, 2).join('\n');
}

function packKey(pack: FlashcardMarketPack): string {
  return `${pack.isCommunityUgc ? 'community' : 'official'}:${pack.id}`;
}

function routeParamString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseRouteIdList(value: string | string[] | undefined): string[] {
  const raw = routeParamString(value).trim();
  if (!raw) return [];
  return [...new Set(
    raw
      .split(/[|,;]/)
      .map((id) => id.trim())
      .filter(Boolean),
  )];
}

function officialSourceSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Official pack',
    uk: 'Official pack',
    es: 'Official pack',
    'pt-BR': 'Official pack',
    vi: 'Official pack',
    id: 'Official pack',
    tr: 'Official pack',
    pl: 'Official pack',
  });
}

function savedSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Сохранённые карточки',
    uk: 'Збережені картки',
    es: 'Tarjetas guardadas',
    'pt-BR': 'Cartões salvos',
    vi: 'Thẻ đã lưu',
    id: 'Kartu tersimpan',
    tr: 'Kaydedilen kartlar',
    pl: 'Zapisane fiszki',
  });
}

function customSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Свои карточки',
    uk: 'Свої картки',
    es: 'Tarjetas propias',
    'pt-BR': 'Seus cartões',
    vi: 'Thẻ của bạn',
    id: 'Kartu sendiri',
    tr: 'Kendi kartların',
    pl: 'Własne fiszki',
  });
}

function personalListSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Личный список',
    uk: 'Особистий список',
    es: 'Lista personal',
    'pt-BR': 'Lista pessoal',
    vi: 'Danh sách cá nhân',
    id: 'Daftar pribadi',
    tr: 'Kişisel liste',
    pl: 'Lista osobista',
  });
}

function manualCardsSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Созданные вручную',
    uk: 'Створені вручну',
    es: 'Creadas a mano',
    'pt-BR': 'Criadas manualmente',
    vi: 'Tạo thủ công',
    id: 'Dibuat manual',
    tr: 'Elle oluşturuldu',
    pl: 'Utworzone ręcznie',
  });
}

function buildOfficialTrainingSourcesFromIds(
  ownedIds: string[],
  lang: Lang,
  studyTarget?: RuntimeStudyTarget,
): TrainingSource[] {
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) return [];
  return bundledPacksForOwned(ownedIds)
    .map((pack) => {
      const cards = buildMarketplaceOwnedCards([pack]);
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

function buildCachedTrainingSources(
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
      savedRaw.map(flashcardToCardItem).filter((card) => s(card.en)),
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

function initialSelectionForSources(sources: TrainingSource[], requestedSourceId: string): Set<string> {
  const valid = new Set(sources.map((source) => source.id));
  if (requestedSourceId && valid.has(requestedSourceId)) return new Set([requestedSourceId]);
  return valid;
}

function optimisticSessionInfoForSources(sources: TrainingSource[], selectedIds: Set<string>): SessionInfo {
  const totalPool = sources.reduce(
    (sum, source) => (selectedIds.has(source.id) ? sum + Math.max(0, source.count) : sum),
    0,
  );
  return { totalPool, due: 0, weak: 0, fresh: totalPool };
}

async function buildCommunitySources(
  lang: Lang,
  inheritedOwnedPackIds: string[],
  studyTarget?: RuntimeStudyTarget,
): Promise<TrainingSource[]> {
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
        es: 'Community pack',
        'pt-BR': "Pacote da comunidade",
        vi: "Gói cộng đồng",
        id: "Paket komunitas",
        tr: "Topluluk paketi",
        pl: "Pakiet społeczności",
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

function initialStats(total: number): SessionStats {
  return {
    total,
    answered: 0,
    mastered: 0,
    correctSwipes: 0,
    wrong: 0,
    hints: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
  };
}

function insertLater(queue: Prompt[], makePromptAt: (insertAt: number) => Prompt): Prompt[] {
  const preferred = queue.length <= 1 ? queue.length : Math.min(queue.length, 3 + Math.floor(Math.random() * 3));
  const order: number[] = [preferred];
  for (let offset = 1; offset <= queue.length; offset += 1) {
    const after = preferred + offset;
    const before = preferred - offset;
    if (after <= queue.length) order.push(after);
    if (before >= 0) order.push(before);
  }

  let firstCandidate: { insertAt: number; prompt: Prompt } | null = null;
  for (const insertAt of order) {
    const prompt = makePromptAt(insertAt);
    const shown = shownAnswerNorm(prompt);
    const avoid = adjacentShownNorms(queue, insertAt);
    if (!firstCandidate) firstCandidate = { insertAt, prompt };
    if (!shown || !avoid.has(shown)) {
      return [...queue.slice(0, insertAt), prompt, ...queue.slice(insertAt)];
    }
  }

  const picked = firstCandidate ?? { insertAt: queue.length, prompt: makePromptAt(queue.length) };
  return [...queue.slice(0, picked.insertAt), picked.prompt, ...queue.slice(picked.insertAt)];
}

function emptyProgress(): CardProgress {
  return { wrong: 0, hints: 0, attempts: 0, recoveryCorrect: 0, scoreAwarded: 0 };
}

function promptToDraft(prompt: Prompt): FlashcardsSwipePromptDraft {
  return {
    id: prompt.id,
    cardKey: prompt.card.trainingKey,
    shownTranslation: prompt.shownTranslation,
    trueTranslation: prompt.trueTranslation,
    isMatch: prompt.isMatch,
  };
}

function promptFromDraft(
  draft: FlashcardsSwipePromptDraft,
  cardsByKey: Map<string, TrainingCard>,
): Prompt | null {
  const card = cardsByKey.get(draft.cardKey);
  if (!card) return null;
  return {
    id: draft.id,
    card,
    shownTranslation: draft.shownTranslation,
    trueTranslation: draft.trueTranslation,
    isMatch: draft.isMatch,
  };
}

function buildSessionDraft(input: {
  scope: FlashcardsSwipeSessionScope;
  trainingCards: TrainingCard[];
  queue: Prompt[];
  feedback: FeedbackState | null;
  stats: SessionStats;
  progress: Record<string, CardProgress>;
}): FlashcardsSwipeSessionDraft {
  return {
    version: 1,
    savedAt: Date.now(),
    sourceIds: input.scope.sourceIds,
    routeSource: input.scope.routeSource,
    routeFilter: input.scope.routeFilter,
    contentLang: input.scope.contentLang,
    trainingKeys: input.trainingCards.map((card) => card.trainingKey),
    queue: input.queue.map(promptToDraft),
    feedback: input.feedback
      ? { kind: input.feedback.kind, prompt: promptToDraft(input.feedback.prompt) }
      : null,
    stats: input.stats,
    progress: input.progress,
  };
}

function restoreSessionDraft(
  draft: FlashcardsSwipeSessionDraft,
  cards: TrainingCard[],
): {
  trainingCards: TrainingCard[];
  queue: Prompt[];
  feedback: FeedbackState | null;
  stats: SessionStats;
  progress: Record<string, CardProgress>;
} | null {
  const cardsByKey = new Map(cards.map((card) => [card.trainingKey, card]));
  const trainingCards = draft.trainingKeys.map((key) => cardsByKey.get(key));
  if (trainingCards.some((card) => !card)) return null;

  const queue = draft.queue.map((prompt) => promptFromDraft(prompt, cardsByKey));
  if (queue.some((prompt) => !prompt) || queue.length === 0) return null;

  const feedbackPrompt = draft.feedback
    ? promptFromDraft(draft.feedback.prompt, cardsByKey)
    : null;
  if (draft.feedback && !feedbackPrompt) return null;

  const validKeys = new Set(cards.map((card) => card.trainingKey));
  const progress = Object.fromEntries(
    Object.entries(draft.progress).filter(([key]) => validKeys.has(key)),
  );

  return {
    trainingCards: trainingCards as TrainingCard[],
    queue: queue as Prompt[],
    feedback: draft.feedback && feedbackPrompt ? { kind: draft.feedback.kind, prompt: feedbackPrompt } : null,
    stats: draft.stats,
    progress,
  };
}

export default function FlashcardsSwipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    quick?: string | string[];
    source?: string | string[];
    filter?: string | string[];
    owned?: string | string[];
    planFlashcardsTask?: string | string[];
    requiredCards?: string | string[];
    planTaskId?: string | string[];
    planInstanceId?: string | string[];
    planId?: string | string[];
    planDayIndex?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const topSafeInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const { width, height } = useWindowDimensions();
  const { lang } = useLang();
  const { theme: t, statusBarLight, f, ds } = useTheme();
  const { studyTarget } = useStudyTarget();
  const audio = useAudio();
  const { playCorrect } = useCorrectSound();

  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  const requestedSourceId = useMemo(() => {
    const raw = Array.isArray(params.source) ? params.source[0] : params.source;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [params.source]);
  const requestedFilter = useMemo(() => {
    const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [params.filter]);
  const requestedOfficialOwnedIds = useMemo(() => parseRouteIdList(params.owned), [params.owned]);
  const visibleRequestedOfficialOwnedIds = useMemo(
    () => (officialPacksEnabled ? requestedOfficialOwnedIds : []),
    [officialPacksEnabled, requestedOfficialOwnedIds],
  );
  const initialSources = useMemo(
    () => buildCachedTrainingSources(
      lang,
      peekFlashcardsCache(studyTarget),
      peekCustomCardsCache(studyTarget),
      visibleRequestedOfficialOwnedIds,
      requestedSourceId,
      requestedFilter,
      studyTarget,
    ),
    [lang, requestedFilter, requestedSourceId, studyTarget, visibleRequestedOfficialOwnedIds],
  );
  const initialSelectedIds = useMemo(
    () => initialSelectionForSources(initialSources, requestedSourceId),
    [initialSources, requestedSourceId],
  );
  const initialSessionInfo = useMemo(
    () => optimisticSessionInfoForSources(initialSources, initialSelectedIds),
    [initialSources, initialSelectedIds],
  );
  const [sources, setSources] = useState<TrainingSource[]>(() => initialSources);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => initialSelectedIds);
  const [loadingSources, setLoadingSources] = useState(() => initialSources.length === 0);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState<Phase>('select');
  const [trainingCards, setTrainingCards] = useState<TrainingCard[]>([]);
  const [queue, setQueue] = useState<Prompt[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [stats, setStats] = useState<SessionStats>(() => initialStats(0));
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(() => initialSessionInfo);
  const [settling, setSettling] = useState(false);
  const progressRef = useRef<Record<string, CardProgress>>({});
  const memoryRef = useRef<SwipeMemory>({});
  const settlingRef = useRef(false);
  const planFlashcardsCompletionTracked = useRef(false);
  const quickStartDoneRef = useRef(false);
  const draftRestoreAttemptedRef = useRef(false);
  const hasVisibleSourcesRef = useRef(initialSources.length > 0);
  const position = useRef(new Animated.ValueXY()).current;
  const topFadeScrollY = useRef(new Animated.Value(0)).current;
  const planFlashcardsTaskId = routeParamString(params.planFlashcardsTask) === '1' ? routeParamString(params.planTaskId) : '';
  const isPlanFlashcardsTask = Boolean(planFlashcardsTaskId);
  const planFlashcardsRequiredCards = Math.max(1, Math.min(50, parseInt(routeParamString(params.requiredCards) || '3', 10) || 3));
  const planFlashcardsDayIndex = Math.max(1, parseInt(routeParamString(params.planDayIndex) || '1', 10) || 1);
  // Normal training lands on setup; a plan task starts directly from the plan-selected source.
  const quickStart = Boolean(planFlashcardsTaskId);

  const selectedSourceIdsForDraft = useMemo(() => [...selectedIds].sort(), [selectedIds]);
  const sessionDraftScope = useMemo<FlashcardsSwipeSessionScope>(
    () => ({
      sourceIds: selectedSourceIdsForDraft,
      routeSource: requestedSourceId,
      routeFilter: requestedFilter,
      contentLang: cardContentLang,
    }),
    [cardContentLang, requestedFilter, requestedSourceId, selectedSourceIdsForDraft],
  );

  const text = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Тренировка карточек',
        uk: 'Тренування карток',
        es: 'Práctica de tarjetas',
        'pt-BR': "Treino de cartões",
        vi: "Luyện thẻ",
        id: "Latihan kartu",
        tr: "Kart alıştırması",
        pl: "Trening fiszek",
      }),
      settingsTitle: triLang(lang, {
        ru: 'Тренировка карточек',
        uk: 'Тренування карток',
        es: 'Práctica de tarjetas',
        'pt-BR': "Treino de cartões",
        vi: "Luyện thẻ",
        id: "Latihan kartu",
        tr: "Kart alıştırması",
        pl: "Trening fiszek",
      }),
      settings: triLang(lang, {
        ru: 'Настройки',
        uk: 'Налаштування',
        es: 'Ajustes',
        'pt-BR': "Configurações",
        vi: "Cài đặt",
        id: "Pengaturan",
        tr: "Ayarlar",
        pl: "Ustawienia",
      }),
      start: triLang(lang, {
        ru: 'Начать',
        uk: 'Почати',
        es: 'Empezar',
        'pt-BR': "Começar",
        vi: "Bắt đầu",
        id: "Mulai",
        tr: "Başla",
        pl: "Zacznij",
      }),
      reload: triLang(lang, {
        ru: 'Обновить',
        uk: 'Оновити',
        es: 'Actualizar',
        'pt-BR': "Atualizar",
        vi: "Cập nhật",
        id: "Perbarui",
        tr: "Yenile",
        pl: "Odśwież",
      }),
      empty: triLang(lang, {
        ru: 'Нет доступных наборов для тренировки.',
        uk: 'Немає доступних наборів для тренування.',
        es: 'No hay packs disponibles para practicar.',
        'pt-BR': "Não há pacotes disponíveis para praticar.",
        vi: "Không có gói nào để luyện tập.",
        id: "Tidak ada paket yang tersedia untuk latihan.",
        tr: "Pratik için kullanılabilir paket yok.",
        pl: "Brak pakietów dostępnych do ćwiczenia.",
      }),
      saved: triLang(lang, {
        ru: 'Сохранённые карточки',
        uk: 'Збережені картки',
        es: 'Tarjetas guardadas',
        'pt-BR': "Cartões salvos",
        vi: "Thẻ đã lưu",
        id: "Kartu tersimpan",
        tr: "Kaydedilen kartlar",
        pl: "Zapisane fiszki",
      }),
      custom: triLang(lang, {
        ru: 'Свои карточки',
        uk: 'Свої картки',
        es: 'Tarjetas propias',
        'pt-BR': "Cartões próprios",
        vi: "Thẻ của bạn",
        id: "Kartu sendiri",
        tr: "Kendi kartların",
        pl: "Własne fiszki",
      }),
      official: triLang(lang, {
        ru: 'Official pack',
        uk: 'Official pack',
        es: 'Official pack',
        'pt-BR': "Pacote oficial",
        vi: "Gói chính thức",
        id: "Paket resmi",
        tr: "Resmi paket",
        pl: "Pakiet oficjalny",
      }),
      match: triLang(lang, {
        ru: 'Да',
        uk: 'Так',
        es: 'Sí',
        'pt-BR': "Sim",
        vi: "Có",
        id: "Ya",
        tr: "Evet",
        pl: "Tak",
      }),
      mismatch: triLang(lang, {
        ru: 'Нет',
        uk: 'Ні',
        es: 'No',
        'pt-BR': "Não",
        vi: "Không",
        id: "Tidak",
        tr: "Hayır",
        pl: "Nie",
      }),
      matchAction: triLang(lang, {
        ru: 'Верно',
        uk: 'Вірно',
        es: 'Coincide',
        'pt-BR': "Certo",
        vi: "Đúng",
        id: "Benar",
        tr: "Doğru",
        pl: "Prawda",
      }),
      mismatchAction: triLang(lang, {
        ru: 'Неверно',
        uk: 'Невірно',
        es: 'Incorrecto',
        'pt-BR': "Errado",
        vi: "Sai",
        id: "Salah",
        tr: "Yanlış",
        pl: "Fałsz",
      }),
      matchHint: triLang(lang, {
        ru: 'перевод совпадает',
        uk: 'переклад збігається',
        es: 'traducción correcta',
        'pt-BR': "tradução correta",
        vi: "bản dịch đúng",
        id: "terjemahan benar",
        tr: "doğru çeviri",
        pl: "poprawne tłumaczenie",
      }),
      mismatchHint: triLang(lang, {
        ru: 'чужой перевод',
        uk: 'чужий переклад',
        es: 'traducción incorrecta',
        'pt-BR': "tradução incorreta",
        vi: "bản dịch sai",
        id: "terjemahan salah",
        tr: "yanlış çeviri",
        pl: "błędne tłumaczenie",
      }),
      reveal: triLang(lang, {
        ru: 'Показать ответ',
        uk: 'Показати відповідь',
        es: 'Mostrar respuesta',
        'pt-BR': "Mostrar resposta",
        vi: "Hiện đáp án",
        id: "Tampilkan jawaban",
        tr: "Cevabı göster",
        pl: "Pokaż odpowiedź",
      }),
      continue: triLang(lang, {
        ru: 'Дальше',
        uk: 'Далі',
        es: 'Siguiente',
        'pt-BR': "Próximo",
        vi: "Tiếp theo",
        id: "Berikutnya",
        tr: "Sonraki",
        pl: "Dalej",
      }),
      wrongTitle: triLang(lang, {
        ru: 'Разберём ответ',
        uk: 'Розберімо відповідь',
        es: 'Revisemos la respuesta',
        'pt-BR': "Vamos revisar a resposta",
        vi: "Cùng xem lại đáp án",
        id: "Mari tinjau jawabannya",
        tr: "Cevabı gözden geçirelim",
        pl: "Sprawdźmy odpowiedź",
      }),
      hintTitle: triLang(lang, {
        ru: 'Ответ открыт',
        uk: 'Відповідь відкрито',
        es: 'Respuesta mostrada',
        'pt-BR': "Resposta mostrada",
        vi: "Đáp án đã hiện",
        id: "Jawaban ditampilkan",
        tr: "Cevap gösterildi",
        pl: "Odpowiedź pokazana",
      }),
      recoveryNote: triLang(lang, {
        ru: 'Верну эту карточку чуть позже, чтобы закрепить.',
        uk: 'Поверну цю картку трохи пізніше, щоб закріпити.',
        es: 'La volveré a mostrar pronto para fijarla.',
        'pt-BR': "Vou mostrar de novo em breve para fixar.",
        vi: "Mình sẽ hiện lại sớm để bạn ghi nhớ.",
        id: "Akan ditampilkan lagi segera agar melekat.",
        tr: "Yerleşmesi için yakında tekrar göstereceğim.",
        pl: "Pokażę ją wkrótce ponownie, żeby się utrwaliła.",
      }),
      mastered: triLang(lang, {
        ru: 'Закреплено',
        uk: 'Закріплено',
        es: 'Fijadas',
        'pt-BR': "Fixados",
        vi: "Đã ghi nhớ",
        id: "Dikuasai",
        tr: "Pekişenler",
        pl: "Utrwalone",
      }),
      inQueue: triLang(lang, {
        ru: 'в очереди',
        uk: 'у черзі',
        es: 'en cola',
        'pt-BR': "na fila",
        vi: "trong hàng đợi",
        id: "dalam antrean",
        tr: "sırada",
        pl: "w kolejce",
      }),
      smartQueue: triLang(lang, {
        ru: 'Умная очередь',
        uk: 'Розумна черга',
        es: 'Cola inteligente',
        'pt-BR': "Fila inteligente",
        vi: "Hàng đợi thông minh",
        id: "Antrean pintar",
        tr: "Akıllı sıra",
        pl: "Inteligentna kolejka",
      }),
      correctChoice: triLang(lang, {
        ru: 'Правильный выбор',
        uk: 'Правильний вибір',
        es: 'Respuesta correcta',
        'pt-BR': "Resposta correta",
        vi: "Đáp án đúng",
        id: "Jawaban benar",
        tr: "Doğru cevap",
        pl: "Poprawna odpowiedź",
      }),
      shownTranslation: triLang(lang, {
        ru: 'Этот перевод подходит?',
        uk: 'Цей переклад підходить?',
        es: '¿Esta traducción coincide?',
        'pt-BR': "Esta tradução combina?",
        vi: "Bản dịch này có khớp không?",
        id: "Apakah terjemahan ini cocok?",
        tr: "Bu çeviri uyuyor mu?",
        pl: "Czy to tłumaczenie pasuje?",
      }),
      phraseLabel: triLang(lang, {
        ru: 'Фраза',
        uk: 'Фраза',
        es: 'Frase',
        'pt-BR': "Frase",
        vi: "Cụm từ",
        id: "Frasa",
        tr: "İfade",
        pl: "Zwrot",
      }),
      correctTranslation: triLang(lang, {
        ru: 'Правильный перевод',
        uk: 'Правильний переклад',
        es: 'Traducción correcta',
        'pt-BR': "Tradução correta",
        vi: "Bản dịch đúng",
        id: "Terjemahan benar",
        tr: "Doğru çeviri",
        pl: "Poprawne tłumaczenie",
      }),
      done: triLang(lang, {
        ru: 'Готово',
        uk: 'Готово',
        es: 'Listo',
        'pt-BR': "Pronto",
        vi: "Xong",
        id: "Selesai",
        tr: "Bitti",
        pl: "Gotowe",
      }),
      cleanDone: triLang(lang, {
        ru: 'Идеальный раунд',
        uk: 'Ідеальний раунд',
        es: 'Ronda perfecta',
        'pt-BR': "Rodada perfeita",
        vi: "Vòng hoàn hảo",
        id: "Ronde sempurna",
        tr: "Kusursuz tur",
        pl: "Perfekcyjna runda",
      }),
      cleanDoneSub: triLang(lang, {
        ru: 'Без ошибок и подсказок. Эти карточки уйдут на повтор позже.',
        uk: 'Без помилок і підказок. Ці картки підуть на повтор пізніше.',
        es: 'Sin errores ni pistas. Estas tarjetas volverán más tarde.',
        'pt-BR': "Sem erros nem pistas. Estes cartões voltarão mais tarde.",
        vi: "Không lỗi, không gợi ý. Các thẻ này sẽ quay lại sau.",
        id: "Tanpa kesalahan atau petunjuk. Kartu ini akan muncul lagi nanti.",
        tr: "Hata ya da ipucu yok. Bu kartlar daha sonra geri gelecek.",
        pl: "Bez błędów i podpowiedzi. Te fiszki wrócą później.",
      }),
      learnedDoneSub: triLang(lang, {
        ru: 'Слабые карточки останутся ближе в очереди, пока не закрепятся.',
        uk: 'Слабкі картки залишаться ближче в черзі, доки не закріпляться.',
        es: 'Las tarjetas débiles seguirán cerca hasta fijarse.',
        'pt-BR': "Os cartões fracos continuarão por perto até fixarem.",
        vi: "Thẻ yếu sẽ tiếp tục xuất hiện gần đây cho đến khi được ghi nhớ.",
        id: "Kartu lemah akan tetap dekat sampai dikuasai.",
        tr: "Zayıf kartlar pekişene kadar yakında kalacak.",
        pl: "Słabe fiszki pozostaną blisko, aż się utrwalą.",
      }),
      nextRound: triLang(lang, {
        ru: 'Ещё раунд',
        uk: 'Ще раунд',
        es: 'Otra ronda',
        'pt-BR': "Outra rodada",
        vi: "Vòng khác",
        id: "Ronde lain",
        tr: "Başka tur",
        pl: "Kolejna runda",
      }),
      again: triLang(lang, {
        ru: 'Повторить',
        uk: 'Повторити',
        es: 'Repetir',
        'pt-BR': "Repetir",
        vi: "Lặp lại",
        id: "Ulangi",
        tr: "Tekrarla",
        pl: "Powtórz",
      }),
      toSets: triLang(lang, {
        ru: 'Настроить',
        uk: 'Налаштувати',
        es: 'Ajustar',
        'pt-BR': "Ajustar",
        vi: "Điều chỉnh",
        id: "Sesuaikan",
        tr: "Ayarla",
        pl: "Dostosuj",
      }),
      scoreLabel: triLang(lang, {
        ru: 'Очки',
        uk: 'Очки',
        es: 'Puntos',
        'pt-BR': "Pontos",
        vi: "Điểm",
        id: "Poin",
        tr: "Puan",
        pl: "Punkty",
      }),
      streakLabel: triLang(lang, {
        ru: 'Серия',
        uk: 'Серія',
        es: 'Racha',
        'pt-BR': "Sequência",
        vi: "Chuỗi",
        id: "Rangkaian",
        tr: "Seri",
        pl: "Seria",
      }),
      mistakes: triLang(lang, {
        ru: 'Ошибки',
        uk: 'Помилки',
        es: 'Errores',
        'pt-BR': "Erros",
        vi: "Lỗi",
        id: "Kesalahan",
        tr: "Hatalar",
        pl: "Błędy",
      }),
      hints: triLang(lang, {
        ru: 'Подсказки',
        uk: 'Підказки',
        es: 'Pistas',
        'pt-BR': "Pistas",
        vi: "Gợi ý",
        id: "Petunjuk",
        tr: "İpuçları",
        pl: "Podpowiedzi",
      }),
      bestStreak: triLang(lang, {
        ru: 'Лучшая серия',
        uk: 'Найкраща серія',
        es: 'Mejor racha',
        'pt-BR': "Melhor sequência",
        vi: "Chuỗi tốt nhất",
        id: "Rangkaian terbaik",
        tr: "En iyi seri",
        pl: "Najlepsza seria",
      }),
      cardLimit: triLang(lang, {
        ru: 'Карточек в сессии',
        uk: 'Карток у сесії',
        es: 'Tarjetas en la sesión',
        'pt-BR': "Cartões na sessão",
        vi: "Thẻ trong buổi",
        id: "Kartu dalam sesi",
        tr: "Seanstaki kartlar",
        pl: "Fiszki w sesji",
      }),
      allCards: triLang(lang, {
        ru: 'Все',
        uk: 'Усі',
        es: 'Todas',
        'pt-BR': "Todas",
        vi: "Tất cả",
        id: "Semua",
        tr: "Tümü",
        pl: "Wszystkie",
      }),
      quickRound: triLang(lang, {
        ru: 'Быстро',
        uk: 'Швидко',
        es: 'Rápida',
        'pt-BR': "Rápida",
        vi: "Nhanh",
        id: "Cepat",
        tr: "Hızlı",
        pl: "Szybka",
      }),
      normalRound: triLang(lang, {
        ru: 'Нормально',
        uk: 'Звично',
        es: 'Normal',
        'pt-BR': "Normal",
        vi: "Bình thường",
        id: "Normal",
        tr: "Normal",
        pl: "Normalna",
      }),
      deepRound: triLang(lang, {
        ru: 'Глубоко',
        uk: 'Глибоко',
        es: 'Profunda',
        'pt-BR': "Profunda",
        vi: "Sâu",
        id: "Mendalam",
        tr: "Derin",
        pl: "Głęboka",
      }),
      minutes2: triLang(lang, {
        ru: '2 мин',
        uk: '2 хв',
        es: '2 min',
        'pt-BR': "2 min",
        vi: "2 phút",
        id: "2 mnt",
        tr: "2 dk",
        pl: "2 min",
      }),
      minutes5: triLang(lang, {
        ru: '5 мин',
        uk: '5 хв',
        es: '5 min',
        'pt-BR': "5 min",
        vi: "5 phút",
        id: "5 mnt",
        tr: "5 dk",
        pl: "5 min",
      }),
      minutes10: triLang(lang, {
        ru: '10 мин',
        uk: '10 хв',
        es: '10 min',
        'pt-BR': "10 min",
        vi: "10 phút",
        id: "10 mnt",
        tr: "10 dk",
        pl: "10 min",
      }),
      sourcesTitle: triLang(lang, {
        ru: 'Наборы',
        uk: 'Набори',
        es: 'Packs',
        'pt-BR': "Pacotes",
        vi: "Gói",
        id: "Paket",
        tr: "Paketler",
        pl: "Pakiety",
      }),
      noCardsTitle: triLang(lang, {
        ru: 'Нет карточек для тренировки',
        uk: 'Немає карток для тренування',
        es: 'No hay tarjetas para practicar',
        'pt-BR': "Não há cartões para praticar",
        vi: "Không có thẻ để luyện tập",
        id: "Tidak ada kartu untuk latihan",
        tr: "Alıştırma için kart yok",
        pl: "Brak fiszek do treningu",
      }),
      noCardsSub: triLang(lang, {
        ru: 'Сохрани карточки или добавь набор, и тренировка запустится отсюда в один тап.',
        uk: 'Збережи картки або додай набір, і тренування запускатиметься звідси в один дотик.',
        es: 'Guarda tarjetas o añade un pack, y la práctica arrancará desde aquí con un toque.',
        'pt-BR': "Salve cartões ou adicione um pacote, e o treino começará daqui com um toque.",
        vi: "Lưu thẻ hoặc thêm một gói, rồi buổi luyện tập sẽ bắt đầu từ đây chỉ với một lần chạm.",
        id: "Simpan kartu atau tambahkan paket, lalu latihan akan mulai dari sini dengan satu ketukan.",
        tr: "Kart kaydet ya da bir paket ekle; alıştırma buradan tek dokunuşla başlar.",
        pl: "Zapisz fiszki albo dodaj pakiet, a trening ruszy stąd jednym dotknięciem.",
      }),
      due: triLang(lang, {
        ru: 'к повтору',
        uk: 'до повтору',
        es: 'por repasar',
        'pt-BR': "para revisar",
        vi: "cần ôn",
        id: "perlu diulang",
        tr: "tekrar edilecek",
        pl: "do powtórki",
      }),
      weak: triLang(lang, {
        ru: 'слабые',
        uk: 'слабкі',
        es: 'débiles',
        'pt-BR': "fracos",
        vi: "yếu",
        id: "lemah",
        tr: "zayıf",
        pl: "słabe",
      }),
      fresh: triLang(lang, {
        ru: 'новые',
        uk: 'нові',
        es: 'nuevas',
        'pt-BR': "novos",
        vi: "mới",
        id: "baru",
        tr: "yeni",
        pl: "nowe",
      }),
      sessionSummary: triLang(lang, {
        ru: 'Слабые вернутся внутри сессии. Лёгкие уйдут на повтор позже.',
        uk: 'Слабкі повернуться в сесії. Легкі підуть на повтор пізніше.',
        es: 'Las débiles vuelven en la sesión. Las fáciles se repasan más tarde.',
        'pt-BR': "As fracas voltam na sessão. As fáceis serão revisadas mais tarde.",
        vi: "Thẻ yếu quay lại trong buổi này. Thẻ dễ sẽ được ôn sau.",
        id: "Yang lemah kembali dalam sesi. Yang mudah diulang nanti.",
        tr: "Zayıflar seans içinde geri döner. Kolaylar daha sonra tekrar edilir.",
        pl: "Słabe wrócą w sesji. Łatwe zostaną powtórzone później.",
      }),
    }),
    [lang],
  );

  const loadSources = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoadingSources(true);
    setLoadError('');
    try {
      const [savedRaw, customRaw, officialOwnedIds] = await Promise.all([
        loadFlashcards(studyTarget).catch(() => [] as Flashcard[]),
        readCustomCards(studyTarget).catch(() => [] as unknown[]),
        officialPacksEnabled ? loadAccessiblePackIds(studyTarget).catch(() => [] as string[]) : Promise.resolve([] as string[]),
      ]);
      const next: TrainingSource[] = [];
      const savedCards = filterCardsForRoute(
        savedRaw.map(flashcardToCardItem).filter((card) => s(card.en)),
        requestedSourceId === 'saved:all' ? requestedFilter : '',
      );
      const customCards = filterCardsForRoute(
        customRawToCardItems(customRaw),
        requestedSourceId === 'custom:all' ? requestedFilter : '',
      );
      if (savedCards.length > 0) {
        next.push({
          id: 'saved:all',
          kind: 'saved',
          title: text.saved,
          subtitle: triLang(lang, {
            ru: 'Личный список',
            uk: 'Особистий список',
            es: 'Lista personal',
            'pt-BR': "Lista pessoal",
            vi: "Danh sách cá nhân",
            id: "Daftar pribadi",
            tr: "Kişisel liste",
            pl: "Lista osobista",
          }),
          count: savedCards.length,
          icon: 'bookmark-outline',
          accent: SOURCE_ACCENTS.saved,
          cards: savedCards,
        });
      }
      if (customCards.length > 0) {
        next.push({
          id: 'custom:all',
          kind: 'custom',
          title: text.custom,
          subtitle: triLang(lang, {
            ru: 'Созданные вручную',
            uk: 'Створені вручну',
            es: 'Creadas a mano',
            'pt-BR': "Criados manualmente",
            vi: "Tạo thủ công",
            id: "Dibuat manual",
            tr: "Elle oluşturulanlar",
            pl: "Utworzone ręcznie",
          }),
          count: customCards.length,
          icon: 'create-outline',
          accent: SOURCE_ACCENTS.custom,
          cards: customCards,
        });
      }

      if (officialPacksEnabled) {
        next.push(...buildOfficialTrainingSourcesFromIds(officialOwnedIds, lang, studyTarget));
      }

      if (communityPacksEnabled) {
        next.push(...(await buildCommunitySources(lang, officialOwnedIds, studyTarget)));
      }
      hasVisibleSourcesRef.current = next.length > 0;
      setSources(next);
      setSelectedIds((cur) => {
        const valid = new Set(next.map((source) => source.id));
        if (requestedSourceId && valid.has(requestedSourceId)) return new Set([requestedSourceId]);
        const kept = new Set([...cur].filter((id) => valid.has(id)));
        return kept.size > 0 ? kept : valid;
      });
    } catch {
      setLoadError(
        triLang(lang, {
          ru: 'Наборы не загрузились.',
          uk: 'Не вдалося завантажити набори.',
          es: 'No se pudieron cargar los packs.',
          'pt-BR': "Não foi possível carregar os pacotes.",
          vi: "Không thể tải các gói.",
          id: "Paket tidak dapat dimuat.",
          tr: "Paketler yüklenemedi.",
          pl: "Nie udało się załadować pakietów.",
        }),
      );
    } finally {
      setLoadingSources(false);
    }
  }, [communityPacksEnabled, lang, officialPacksEnabled, requestedFilter, requestedSourceId, studyTarget, text.custom, text.saved]);

  useEffect(() => {
    void loadSources({ quiet: hasVisibleSourcesRef.current });
  }, [loadSources]);

  const selectedSources = useMemo(
    () => sources.filter((source) => selectedIds.has(source.id)),
    [selectedIds, sources],
  );
  const selectedEstimate = useMemo(
    () => selectedSources.reduce((sum, source) => sum + Math.max(0, source.count), 0),
    [selectedSources],
  );

  const answerFor = useCallback(
    (card: CardItem) => resolveFlashcardBackText(card, cardContentLang).trim(),
    [cardContentLang],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const memory = await loadSwipeMemory(studyTarget).catch(() => ({} as SwipeMemory));
      const now = Date.now();
      const localCards: TrainingCard[] = [];
      for (const source of selectedSources) {
        for (const card of source.cards ?? []) {
          if (!s(card.en) || !answerFor(card)) continue;
          localCards.push({
            ...card,
            trainingKey: `${source.id}:${card.id}`,
            trainingSourceId: source.id,
            trainingSourceTitle: source.title,
            memory: memoryFor(memory, `${source.id}:${card.id}`),
          });
        }
      }
      const info = sessionInfoFor(localCards, now);
      if (!cancelled) setSessionInfo({ ...info, totalPool: Math.max(selectedEstimate, info.totalPool) });
    })();
    return () => {
      cancelled = true;
    };
  }, [answerFor, selectedEstimate, selectedSources]);

  const makePrompt = useCallback(
    (card: TrainingCard, pool: TrainingCard[], forceMatch = false, avoidShown = new Set<string>()): Prompt => {
      const trueTranslation = answerFor(card);
      const memory = card.memory ?? defaultMemory();
      const matchChance = isWeakMemory(memory) ? 0.72 : 0.58;
      let isMatch = forceMatch || pool.length < 2 || Math.random() < matchChance;
      let shownTranslation = trueTranslation;
      const trueNorm = normalizeAnswer(trueTranslation);
      if (isMatch && !forceMatch && avoidShown.has(trueNorm) && pool.length >= 2) {
        isMatch = false;
      }
      if (!isMatch) {
        const scoredDecoys = pool
          .filter((item) => item.trainingKey !== card.trainingKey)
          .map((item) => {
            const value = answerFor(item);
            const normalized = normalizeAnswer(value);
            const sameCategory = item.categoryId && item.categoryId === card.categoryId ? 8 : 0;
            const sameSource = item.trainingSourceId === card.trainingSourceId ? 6 : 0;
            const sameLevel = item.level && item.level === card.level ? 4 : 0;
            const lengthPenalty = Math.abs(value.length - trueTranslation.length) / 18;
            const repeatPenalty = avoidShown.has(normalized) ? 100 : 0;
            return {
              value,
              normalized,
              score: sameCategory + sameSource + sameLevel - lengthPenalty - repeatPenalty + Math.random(),
            };
          })
          .filter(({ value, normalized }) => {
            return value && normalized !== trueNorm && normalized.length > 0;
          })
          .sort((a, b) => b.score - a.score);
        const decoy = scoredDecoys.find(({ normalized }) => !avoidShown.has(normalized))?.value
          ?? (!avoidShown.has(trueNorm) ? '' : scoredDecoys[0]?.value)
          ?? '';
        if (decoy) {
          shownTranslation = decoy;
        } else {
          isMatch = true;
        }
      }
      return {
        id: `${card.trainingKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        card,
        shownTranslation,
        trueTranslation,
        isMatch,
      };
    },
    [answerFor],
  );

  const buildPromptQueue = useCallback(
    (cards: TrainingCard[]): Prompt[] => {
      const prompts: Prompt[] = [];
      for (const card of cards) {
        prompts.push(makePrompt(card, cards, false, adjacentShownNorms(prompts, prompts.length)));
      }
      return prompts;
    },
    [makePrompt],
  );

  const buildSessionCards = useCallback(
    async (pickedSources: TrainingSource[], memory: SwipeMemory): Promise<SessionBuild> => {
      const chunks = await Promise.all(
        pickedSources.map(async (source) => {
          const cards = source.cards ?? (await source.loadCards?.().catch(() => [] as CardItem[])) ?? [];
          return cards
            .filter((card) => s(card.en) && answerFor(card))
            .map((card) => ({
              ...card,
              trainingKey: `${source.id}:${card.id}`,
              trainingSourceId: source.id,
              trainingSourceTitle: source.title,
            }));
        }),
      );
      const byKey = new Map<string, TrainingCard>();
      for (const card of chunks.flat()) byKey.set(card.trainingKey, card);
      const now = Date.now();
      const ranked = smartSortCards([...byKey.values()], memory, now).slice(0, planFlashcardsTaskId ? planFlashcardsRequiredCards : undefined);
      const info = sessionInfoFor(ranked, now);
      return { cards: ranked, info };
    },
    [answerFor, planFlashcardsRequiredCards, planFlashcardsTaskId],
  );

  const startSession = useCallback(async () => {
    if (selectedSources.length === 0 || starting) return;
    draftRestoreAttemptedRef.current = true;
    void hapticTap();
    setStarting(true);
    setLoadError('');
    try {
      const memory = await loadSwipeMemory(studyTarget);
      memoryRef.current = memory;
      const { cards, info } = await buildSessionCards(selectedSources, memory);
      if (cards.length === 0) {
        setLoadError(
          triLang(lang, {
            ru: 'В выбранных наборах нет карточек с переводом.',
            uk: 'В обраних наборах немає карток із перекладом.',
            es: 'Los packs elegidos no tienen tarjetas con traducción.',
            'pt-BR': "Os pacotes escolhidos não têm cartões com tradução.",
            vi: "Các gói đã chọn không có thẻ kèm bản dịch.",
            id: "Paket yang dipilih tidak memiliki kartu dengan terjemahan.",
            tr: "Seçilen paketlerde çevirili kart yok.",
            pl: "Wybrane pakiety nie mają fiszek z tłumaczeniem.",
          }),
        );
        return;
      }
      progressRef.current = Object.fromEntries(
        cards.map((card) => [card.trainingKey, emptyProgress()]),
      );
      position.setValue({ x: 0, y: 0 });
      setFeedback(null);
      setTrainingCards(cards);
      setQueue(buildPromptQueue(cards));
      setStats(initialStats(cards.length));
      setSessionInfo(info);
      setPhase('play');
    } finally {
      setStarting(false);
    }
  }, [buildPromptQueue, buildSessionCards, lang, position, selectedSources, starting, studyTarget]);

  useEffect(() => {
    if (draftRestoreAttemptedRef.current) return;
    if (phase !== 'select' || loadingSources || starting || selectedSources.length === 0) return;
    if (sessionDraftScope.sourceIds.length === 0) return;

    let cancelled = false;
    draftRestoreAttemptedRef.current = true;
    void (async () => {
      const draft = await loadFlashcardsSwipeSessionDraft(sessionDraftScope, Date.now(), studyTarget).catch(() => null);
      if (!draft || cancelled) return;

      const memory = await loadSwipeMemory(studyTarget).catch(() => ({} as SwipeMemory));
      const { cards, info } = await buildSessionCards(selectedSources, memory);
      if (cancelled) return;

      const restored = restoreSessionDraft(draft, cards);
      if (!restored) {
        await clearFlashcardsSwipeSessionDraft(studyTarget).catch(() => {});
        return;
      }

      memoryRef.current = memory;
      progressRef.current = restored.progress;
      position.setValue({ x: 0, y: 0 });
      setFeedback(restored.feedback);
      setTrainingCards(restored.trainingCards);
      setQueue(restored.queue);
      setStats(restored.stats);
      setSessionInfo(info);
      setPhase('play');
    })();

    return () => {
      cancelled = true;
    };
  }, [buildSessionCards, loadingSources, phase, position, selectedSources, sessionDraftScope, starting, studyTarget]);

  useEffect(() => {
    if (!quickStart || quickStartDoneRef.current || phase !== 'select') return;
    if (loadingSources || starting || selectedSources.length === 0) return;
    quickStartDoneRef.current = true;
    void startSession();
  }, [loadingSources, phase, quickStart, selectedSources.length, startSession, starting]);

  const exitTraining = useCallback(() => {
    void hapticTap();
    draftRestoreAttemptedRef.current = true;
    safeRouterBack(router, '/flashcards' as any);
  }, [router]);

  const openSettings = useCallback(() => {
    void hapticTap();
    draftRestoreAttemptedRef.current = true;
    quickStartDoneRef.current = true;
    setFeedback(null);
    position.setValue({ x: 0, y: 0 });
    setPhase('select');
  }, [position]);

  const updateCardMemory = useCallback(
    (prompt: Prompt, result: 'correct' | 'wrong' | 'hint', mastered = false) => {
      const now = Date.now();
      const key = prompt.card.trainingKey;
      const current = memoryFor(memoryRef.current, key);
      const next: CardMemory = {
        ...current,
        seen: current.seen + 1,
        lastSeenAt: now,
      };

      if (result === 'wrong') {
        next.wrong += 1;
        next.ease = Math.max(1.25, next.ease - 0.22);
        next.nextDueAt = now + 2 * HOUR_MS;
      } else if (result === 'hint') {
        next.hints += 1;
        next.ease = Math.max(1.35, next.ease - 0.12);
        next.nextDueAt = now + 3 * HOUR_MS;
      } else {
        next.correct += 1;
        next.ease = Math.min(3.1, next.ease + (mastered ? 0.08 : 0.02));
        if (mastered) {
          next.mastered += 1;
          next.nextDueAt = nextDueAfterMastery(next, now);
        } else {
          next.nextDueAt = now + 6 * HOUR_MS;
        }
      }

      memoryRef.current = { ...memoryRef.current, [key]: next };
      void saveSwipeMemory(memoryRef.current, studyTarget);
    },
    [studyTarget],
  );

  const progressPct = stats.total > 0 ? Math.min(100, Math.round((stats.mastered / stats.total) * 100)) : 0;
  const currentPrompt = queue[0] ?? null;
  const done = phase === 'play' && !currentPrompt && stats.total > 0;

  useEffect(() => {
    if (phase !== 'play' || trainingCards.length === 0) return;
    if (done || queue.length === 0) {
      void clearFlashcardsSwipeSessionDraft(studyTarget).catch(() => {});
      return;
    }

    const draft = buildSessionDraft({
      scope: sessionDraftScope,
      trainingCards,
      queue,
      feedback,
      stats,
      progress: progressRef.current,
    });
    void saveFlashcardsSwipeSessionDraft(draft, studyTarget).catch(() => {});
  }, [done, feedback, phase, queue, sessionDraftScope, stats, studyTarget, trainingCards]);

  useEffect(() => {
    if (!done || !planFlashcardsTaskId || planFlashcardsCompletionTracked.current) return;
    planFlashcardsCompletionTracked.current = true;
    void markPersonalPlanTaskCompleted({
      taskId: planFlashcardsTaskId,
      planId: routeParamString(params.planId),
      planInstanceId: routeParamString(params.planInstanceId),
      dayIndex: planFlashcardsDayIndex,
    });
  }, [done, params.planId, params.planInstanceId, planFlashcardsDayIndex, planFlashcardsTaskId]);

  useEffect(() => {
    if (!currentPrompt?.id) return;
    position.stopAnimation(() => {
      position.setValue({ x: 0, y: 0 });
    });
  }, [currentPrompt?.id, position]);

  const settleCard = useCallback(
    (direction: 'left' | 'right', after: () => void) => {
      if (settlingRef.current) return;
      settlingRef.current = true;
      setSettling(true);
      Animated.timing(position, {
        toValue: { x: direction === 'right' ? width * 1.15 : -width * 1.15, y: 0 },
        duration: 190,
        useNativeDriver: true,
      }).start(() => {
        position.stopAnimation(() => {
          position.setValue({ x: 0, y: 0 });
          after();
          requestAnimationFrame(() => {
            position.setValue({ x: 0, y: 0 });
            settlingRef.current = false;
            setSettling(false);
          });
        });
      });
    },
    [position, width],
  );

  const applyAnswer = useCallback(
    (prompt: Prompt, saysMatch: boolean) => {
      const correct = saysMatch === prompt.isMatch;
      const key = prompt.card.trainingKey;
      const prev = progressRef.current[key] ?? emptyProgress();
      const cardProgress = { ...prev, attempts: prev.attempts + 1 };
      progressRef.current[key] = cardProgress;

      if (!correct) {
        cardProgress.wrong += 1;
        cardProgress.recoveryCorrect = 0;
        updateCardMemory(prompt, 'wrong');
        void hapticError();
        setStats((cur) => ({
          ...cur,
          answered: cur.answered + 1,
          wrong: cur.wrong + 1,
          streak: 0,
        }));
        setFeedback({ kind: 'wrong', prompt });
        return;
      }

      void hapticSuccess();
      playCorrect();
      const needsRecovery = cardProgress.wrong > 0 || cardProgress.hints > 0;
      if (needsRecovery) cardProgress.recoveryCorrect += 1;
      const mastered = !needsRecovery || cardProgress.recoveryCorrect >= 2;
      const maxCardScore = needsRecovery ? 6 : 10;
      const rawAward = needsRecovery ? 3 : 10;
      const scoreAward = Math.max(0, Math.min(rawAward, maxCardScore - cardProgress.scoreAwarded));
      cardProgress.scoreAwarded += scoreAward;
      const rest = queue.slice(1);
      updateCardMemory(prompt, 'correct', mastered);
      setStats((cur) => {
        const streak = cur.streak + 1;
        return {
          ...cur,
          answered: cur.answered + 1,
          mastered: cur.mastered + (mastered ? 1 : 0),
          correctSwipes: cur.correctSwipes + 1,
          streak,
          bestStreak: Math.max(cur.bestStreak, streak),
          score: cur.score + scoreAward,
        };
      });
      if (mastered) {
        setQueue(rest);
      } else {
        setQueue(
          insertLater(rest, (insertAt) =>
            makePrompt(prompt.card, trainingCards, false, adjacentShownNorms(rest, insertAt)),
          ),
        );
      }
    },
    [makePrompt, queue, trainingCards, updateCardMemory],
  );

  const answerCurrent = useCallback(
    (saysMatch: boolean) => {
      if (!currentPrompt || feedback || settling || settlingRef.current) return;
      settlingRef.current = true;
      settleCard(saysMatch ? 'right' : 'left', () => applyAnswer(currentPrompt, saysMatch));
    },
    [applyAnswer, currentPrompt, feedback, settleCard, settling],
  );

  const revealCurrent = useCallback(() => {
    if (!currentPrompt || feedback || settling || settlingRef.current) return;
    void hapticTap();
    const key = currentPrompt.card.trainingKey;
    const cardProgress = progressRef.current[key] ?? emptyProgress();
    cardProgress.hints += 1;
    cardProgress.recoveryCorrect = 0;
    progressRef.current[key] = cardProgress;
    updateCardMemory(currentPrompt, 'hint');
    setStats((cur) => ({
      ...cur,
      hints: cur.hints + 1,
      streak: 0,
    }));
    setFeedback({ kind: 'hint', prompt: currentPrompt });
  }, [currentPrompt, feedback, settling, updateCardMemory]);

  const continueAfterFeedback = useCallback(() => {
    if (!feedback) return;
    void hapticTap();
    const rest = queue.slice(1);
    setQueue(
      insertLater(rest, (insertAt) =>
        makePrompt(feedback.prompt.card, trainingCards, true, adjacentShownNorms(rest, insertAt)),
      ),
    );
    setFeedback(null);
  }, [feedback, makePrompt, queue, trainingCards]);

  const speakCurrentCard = useCallback(() => {
    const textToSpeak = currentPrompt?.card.en?.trim();
    if (!textToSpeak) return;
    void hapticTap();
    audio.speak(textToSpeak, undefined, { language: 'en-US', voice: '' });
  }, [audio, currentPrompt?.card.en]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isPlanFlashcardsTask &&
          !!currentPrompt &&
          !feedback &&
          !settling &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.16 });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 96) {
            answerCurrent(true);
            return;
          }
          if (gesture.dx < -96) {
            answerCurrent(false);
            return;
          }
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
      }),
    [answerCurrent, currentPrompt, feedback, isPlanFlashcardsTask, position, settling],
  );

  const cardWidth = Math.min(width - (isPlanFlashcardsTask ? 32 : 36), 430);
  const cardHeight = isPlanFlashcardsTask
    ? Math.min(292, Math.max(218, height * 0.34))
    : Math.min(360, Math.max(250, height * 0.42));
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-7deg', '0deg', '7deg'],
    extrapolate: 'clamp',
  });
  const yesOpacity = position.x.interpolate({
    inputRange: [20, 130],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const noOpacity = position.x.interpolate({
    inputRange: [-130, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const toggleSource = useCallback((sourceId: string) => {
    void hapticTap();
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const renderSelect = () => (
    <ScrollView
      decelerationRate="normal"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: topFadeScrollY } } }], { useNativeDriver: true })}
      contentContainerStyle={[
        styles.selectContent,
        {
          paddingBottom: Math.max(28, insets.bottom + 28),
          paddingHorizontal: ds.spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TapScale
          onPress={() => safeRouterBack(router, '/flashcards' as any)}
          style={[styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={triLang(lang, {
            ru: 'Назад',
            uk: 'Назад',
            es: 'Atrás',
            'pt-BR': "Voltar",
            vi: "Quay lại",
            id: "Kembali",
            tr: "Geri",
            pl: "Wstecz",
          })}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
        </TapScale>
      </View>

      <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>{text.settingsTitle}</Text>

      <View style={[styles.heroCard, { backgroundColor: t.bgSurface, borderColor: t.border, shadowColor: t.cardShadow }]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: `${t.accent}22` }]}>
            <Ionicons name="sparkles-outline" size={22} color={t.accent} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{text.smartQueue}</Text>
            <Text style={[styles.heroSub, { color: t.textMuted, fontSize: f.caption }]}>{text.sessionSummary}</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          {[
            [text.due, sessionInfo.due],
            [text.weak, sessionInfo.weak],
            [text.fresh, sessionInfo.fresh],
          ].map(([label, value]) => (
            <View key={String(label)} style={[styles.heroStat, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={[styles.heroStatValue, { color: t.textPrimary, fontSize: f.body }]}>{value}</Text>
              <Text style={[styles.heroStatLabel, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
        <DuoPressable
          onPress={startSession}
          disabled={selectedSources.length === 0 || starting || loadingSources}
          edgeColor={t.accent}
          wrapStyle={{ marginTop: 14 }}
          style={[
            styles.heroStart,
            {
              backgroundColor: selectedSources.length === 0 || starting || loadingSources ? t.bgSurface2 : t.accent,
              opacity: selectedSources.length === 0 || starting || loadingSources ? 0.72 : 1,
            },
          ]}
        >
          <Ionicons name={starting ? 'sparkles-outline' : 'play'} size={20} color={t.correctText} />
          <Text style={[styles.heroStartText, { color: t.correctText, fontSize: f.body }]}>{text.start}</Text>
        </DuoPressable>
      </View>

      <Text style={[styles.segmentLabel, { color: t.textMuted, fontSize: f.caption }]}>{text.sourcesTitle}</Text>

      {loadError ? (
        <Text style={[styles.errorText, { color: t.wrong, fontSize: f.caption }]}>{loadError}</Text>
      ) : null}

      {loadingSources && sources.length === 0 ? (
        <View style={styles.loadingBox}>
          <Ionicons name="albums-outline" size={26} color={t.accent} />
        </View>
      ) : sources.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
          <Ionicons name="albums-outline" size={26} color={t.textMuted} />
          <Text style={[styles.emptyTitle, { color: t.textPrimary, fontSize: f.body }]}>{text.noCardsTitle}</Text>
          <Text style={[styles.emptyText, { color: t.textMuted, fontSize: f.caption }]}>{text.noCardsSub || text.empty}</Text>
        </View>
      ) : (
        <View style={styles.sourceList}>
          {sources.map((source) => {
            const selected = selectedIds.has(source.id);
            const selectedAccent = t.accent;
            return (
              <TouchableOpacity
                key={source.id}
                onPress={() => toggleSource(source.id)}
                activeOpacity={0.88}
                style={[
                  styles.sourceRow,
                  {
                    borderColor: selected ? selectedAccent : t.border,
                    backgroundColor: selected ? `${selectedAccent}18` : t.bgSurface,
                  },
                ]}
              >
                <View style={[styles.sourceIcon, { backgroundColor: `${selected ? selectedAccent : source.accent}22` }]}>
                  <Ionicons name={source.icon as any} size={21} color={selected ? selectedAccent : source.accent} />
                </View>
                <View style={styles.sourceTextBox}>
                  <Text style={[styles.sourceTitle, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={1}>
                    {source.title}
                  </Text>
                  <Text style={[styles.sourceSubtitle, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                    {source.subtitle} · {cardCountLabel(lang, source.count)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: selected ? selectedAccent : t.border,
                      backgroundColor: selected ? selectedAccent : 'transparent',
                    },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color={t.correctText} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderDone = () => {
    const cleanSession = stats.wrong === 0 && stats.hints === 0;
    return (
      <View style={[styles.playWrap, isPlanFlashcardsTask && styles.planPlayWrap, { paddingHorizontal: ds.spacing.lg, paddingBottom: isPlanFlashcardsTask ? Math.max(10, insets.bottom + 8) : Math.max(20, insets.bottom + 20) }]}>
        <TapScale
          onPress={exitTraining}
          style={[styles.iconButton, isPlanFlashcardsTask && styles.planIconButton, { backgroundColor: t.bgSurface, borderColor: t.border, alignSelf: 'flex-start' }]}
          accessibilityLabel={triLang(lang, {
            ru: 'Выйти из тренировки',
            uk: 'Вийти з тренування',
            es: 'Salir de la práctica',
            'pt-BR': "Sair do treino",
            vi: "Thoát luyện tập",
            id: "Keluar dari latihan",
            tr: "Alıştırmadan çık",
            pl: "Wyjdź z treningu",
          })}
        >
          <Ionicons name="chevron-back" size={isPlanFlashcardsTask ? 20 : 22} color={t.textPrimary} />
        </TapScale>
        <View style={[styles.doneBox, isPlanFlashcardsTask && styles.planDoneBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Ionicons name={cleanSession ? 'trophy-outline' : 'checkmark-done-circle-outline'} size={isPlanFlashcardsTask ? 32 : 42} color={cleanSession ? t.gold : t.correct} />
          <Text style={[styles.doneTitle, isPlanFlashcardsTask && styles.planDoneTitle, { color: t.textPrimary, fontSize: isPlanFlashcardsTask ? f.bodyLg : f.h2 }]}>
            {cleanSession ? text.cleanDone : text.done}
          </Text>
          <Text style={[styles.doneSubtitle, isPlanFlashcardsTask && styles.planDoneSubtitle, { color: t.textMuted, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={isPlanFlashcardsTask ? 2 : undefined}>
            {cleanSession ? text.cleanDoneSub : text.learnedDoneSub}
          </Text>
          <View style={[styles.doneScorePill, isPlanFlashcardsTask && styles.planDoneScorePill, { backgroundColor: `${t.accent}20`, borderColor: t.border }]}>
            <Ionicons name="flash-outline" size={16} color={t.accent} />
            <Text style={[styles.doneScoreText, { color: t.textPrimary, fontSize: f.caption }]}>
              {text.scoreLabel}: {stats.score}
            </Text>
          </View>
          <View style={[styles.doneGrid, isPlanFlashcardsTask && styles.planDoneGrid]}>
            {[
              [text.mastered, stats.mastered],
              [text.mistakes, stats.wrong],
              [text.hints, stats.hints],
              [text.bestStreak, stats.bestStreak],
            ].map(([label, value]) => (
              <View key={String(label)} style={[styles.doneStat, isPlanFlashcardsTask && styles.planDoneStat, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.doneStatValue, { color: t.textPrimary, fontSize: f.numMd }]}>{value}</Text>
                <Text style={[styles.doneStatLabel, { color: t.textMuted, fontSize: f.caption }]}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.doneButtons, isPlanFlashcardsTask && styles.planDoneButtons]}>
            <DuoPressable
              onPress={() => {
                void startSession();
              }}
              edgeColor={t.accent}
              wrapStyle={styles.doneButtonWrap}
              style={[styles.primaryDoneButton, isPlanFlashcardsTask && styles.planDoneButton, { backgroundColor: t.accent }]}
              accessibilityLabel={text.nextRound}
            >
              <Ionicons name="play" size={18} color={t.correctText} />
              <Text style={[styles.doneButtonText, { color: t.correctText, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={1}>{text.nextRound}</Text>
            </DuoPressable>
            <TouchableOpacity
              onPress={openSettings}
              style={[styles.secondaryDoneButton, isPlanFlashcardsTask && styles.planDoneButton, { backgroundColor: t.bgCard, borderColor: t.border }]}
              accessibilityLabel={text.toSets}
            >
              <Text style={[styles.doneButtonText, { color: t.textSecond, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={1}>{text.toSets}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPlay = () => {
    if (done) return renderDone();
    if (!currentPrompt) return null;
    const note = detailNoteForCard(currentPrompt.card, cardContentLang);
    const transcription = s(currentPrompt.card.transcription);
    return (
      <View style={[styles.playWrap, isPlanFlashcardsTask && styles.planPlayWrap, { paddingHorizontal: ds.spacing.lg, paddingBottom: isPlanFlashcardsTask ? Math.max(8, insets.bottom + 6) : Math.max(14, insets.bottom + 10) }]}>
        <View style={[styles.playHeader, isPlanFlashcardsTask && styles.planPlayHeader]}>
          <TapScale
            onPress={exitTraining}
            style={[styles.iconButton, isPlanFlashcardsTask && styles.planIconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
            accessibilityLabel={triLang(lang, {
              ru: 'Выйти из тренировки',
              uk: 'Вийти з тренування',
              es: 'Salir de la práctica',
              'pt-BR': "Sair do treino",
              vi: "Thoát luyện tập",
              id: "Keluar dari latihan",
              tr: "Alıştırmadan çık",
              pl: "Wyjdź z treningu",
            })}
          >
            <Ionicons name="chevron-back" size={isPlanFlashcardsTask ? 20 : 22} color={t.textPrimary} />
          </TapScale>
          <View style={[styles.headerStats, isPlanFlashcardsTask && styles.planHeaderStats]}>
            <Text style={[styles.headerStatText, { color: t.textPrimary, fontSize: f.caption }]}>
              {isPlanFlashcardsTask ? `${stats.mastered}/${stats.total}` : `${text.mastered}: ${stats.mastered}/${stats.total}`}
            </Text>
            {!isPlanFlashcardsTask && (
              <Text style={[styles.headerStatText, { color: t.textMuted, fontSize: f.caption }]}>
                {queue.length} {text.inQueue}
              </Text>
            )}
            {stats.streak >= 3 ? (
              <View style={[styles.headerStreakPill, { backgroundColor: `${t.gold}22`, borderColor: `${t.gold}66` }]}>
                <Ionicons name="flame-outline" size={12} color={t.gold} />
                <Text style={[styles.headerStreakText, { color: t.gold, fontSize: f.caption }]}>
                  {text.streakLabel} {stats.streak}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={openSettings}
            style={[styles.iconButton, isPlanFlashcardsTask && styles.planIconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
            accessibilityLabel={text.settings}
          >
            <Ionicons name="options-outline" size={isPlanFlashcardsTask ? 19 : 21} color={t.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.progressTrack, isPlanFlashcardsTask && styles.planProgressTrack, { backgroundColor: t.bgSurface2 }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as `${number}%`, backgroundColor: t.accent }]} />
        </View>

        <View style={[styles.cardStage, isPlanFlashcardsTask && styles.planCardStage]}>
          {queue[1] ? (
            <View
              style={[
                styles.cardBack,
                {
                  width: cardWidth,
                  minHeight: cardHeight,
                  backgroundColor: t.bgSurface2,
                  borderColor: t.border,
                },
              ]}
            />
          ) : null}
          <Animated.View
            key={currentPrompt.id}
            {...(isPlanFlashcardsTask ? {} : panResponder.panHandlers)}
            style={[
              styles.trainingCard,
              isPlanFlashcardsTask && styles.planTrainingCard,
              {
                width: cardWidth,
                minHeight: cardHeight,
                backgroundColor: t.bgSurface,
                borderColor: feedback ? (feedback.kind === 'wrong' ? t.wrong : t.gold) : t.border,
                shadowColor: t.cardShadow,
              },
              {
                transform: [...position.getTranslateTransform(), { rotate }],
              },
            ]}
          >
            <Animated.View style={[styles.swipeBadge, styles.noBadge, { opacity: noOpacity, borderColor: t.wrong }]}>
              <Text style={[styles.swipeBadgeText, { color: t.wrong }]}>{text.mismatch}</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeBadge, styles.yesBadge, { opacity: yesOpacity, borderColor: t.correct }]}>
              <Text style={[styles.swipeBadgeText, { color: t.correct }]}>{text.match}</Text>
            </Animated.View>

            <View style={[styles.cardTopLine, isPlanFlashcardsTask && styles.planCardTopLine]}>
              <View
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => false}
                onResponderTerminationRequest={() => false}
                onResponderRelease={speakCurrentCard}
                style={styles.speakButtonHitbox}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Озвучить карточку',
                  uk: 'Озвучити картку',
                  es: 'Escuchar tarjeta',
                  'pt-BR': 'Ouvir cartão',
                  vi: 'Nghe thẻ',
                  id: 'Dengarkan kartu',
                  tr: 'Kartı dinle',
                  pl: 'Odsłuchaj fiszkę',
                })}
              >
                <View style={[styles.speakButton, isPlanFlashcardsTask && styles.planSpeakButton, { borderColor: t.border, backgroundColor: t.bgCard }]}>
                  <Ionicons name="volume-high-outline" size={isPlanFlashcardsTask ? 16 : 18} color={t.textSecond} />
                </View>
              </View>
            </View>

            <View style={[styles.enBox, isPlanFlashcardsTask && styles.planEnBox]}>
              <Text style={[styles.enLabel, { color: t.textMuted, fontSize: f.caption }]}>{text.phraseLabel}</Text>
              <Text
                style={[styles.englishText, isPlanFlashcardsTask && styles.planEnglishText, { color: t.textPrimary, fontSize: isPlanFlashcardsTask ? Math.min(22, f.h2 + 2) : Math.min(26, f.h1 + 3) }]}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={isPlanFlashcardsTask ? 3 : undefined}
              >
                {currentPrompt.card.en}
              </Text>
              {transcription ? (
                <Text style={[styles.transcriptionText, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                  {transcription}
                </Text>
              ) : null}
            </View>

            <View style={[styles.translationBox, isPlanFlashcardsTask && styles.planTranslationBox, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={[styles.translationLabel, { color: t.textMuted, fontSize: f.caption }]}>
                {text.shownTranslation}
              </Text>
              <Text
                style={[styles.translationText, isPlanFlashcardsTask && styles.planTranslationText, { color: t.textSecond, fontSize: isPlanFlashcardsTask ? f.body : f.bodyLg }]}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                numberOfLines={isPlanFlashcardsTask ? 3 : undefined}
              >
                {currentPrompt.shownTranslation}
              </Text>
            </View>

            {feedback ? (
              <View
                style={[
                  styles.feedbackBox,
                  isPlanFlashcardsTask && styles.planFeedbackBox,
                  {
                    backgroundColor: feedback.kind === 'wrong' ? t.wrongBg : t.goldBg,
                    borderColor: feedback.kind === 'wrong' ? t.wrong : t.gold,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: feedback.kind === 'wrong' ? t.wrong : t.gold, fontSize: isPlanFlashcardsTask ? f.caption : f.body },
                  ]}
                >
                  {feedback.kind === 'wrong' ? text.wrongTitle : text.hintTitle}
                </Text>
                <Text style={[styles.feedbackLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {text.correctChoice}
                </Text>
                <Text style={[styles.feedbackAnswer, isPlanFlashcardsTask && styles.planFeedbackAnswer, { color: t.textPrimary, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={isPlanFlashcardsTask ? 1 : undefined}>
                  {feedback.prompt.isMatch ? `${text.match}: ${text.matchHint}` : `${text.mismatch}: ${text.mismatchHint}`}
                </Text>
                <Text style={[styles.feedbackLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {text.correctTranslation}
                </Text>
                <Text style={[styles.feedbackAnswer, isPlanFlashcardsTask && styles.planFeedbackAnswer, { color: t.textPrimary, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={isPlanFlashcardsTask ? 2 : undefined}>
                  {currentPrompt.trueTranslation}
                </Text>
                {!isPlanFlashcardsTask && <Text style={[styles.feedbackNote, { color: t.textMuted, fontSize: f.caption }]}>{text.recoveryNote}</Text>}
                {note && !isPlanFlashcardsTask ? <Text style={[styles.feedbackNote, { color: t.textMuted, fontSize: f.caption }]}>{note}</Text> : null}
              </View>
            ) : null}
          </Animated.View>
        </View>

        {feedback ? (
          <DuoPressable
            onPress={continueAfterFeedback}
            edgeColor={t.accent}
            style={[styles.continueButton, isPlanFlashcardsTask && styles.planContinueButton, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.continueText, { color: t.correctText, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]}>{text.continue}</Text>
          </DuoPressable>
        ) : (
          <>
            <TouchableOpacity
              onPress={revealCurrent}
              style={[styles.revealButton, isPlanFlashcardsTask && styles.planRevealButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
            >
              <Ionicons name="eye-outline" size={18} color={t.textSecond} />
              <Text style={[styles.revealText, { color: t.textSecond, fontSize: f.caption }]}>{text.reveal}</Text>
            </TouchableOpacity>
            <View style={[styles.answerButtons, isPlanFlashcardsTask && styles.planAnswerButtons]}>
              <TouchableOpacity
                onPress={() => answerCurrent(false)}
                disabled={settling}
                style={[
                  styles.answerButton,
                  isPlanFlashcardsTask && styles.planAnswerButton,
                  {
                    backgroundColor: t.wrongBg,
                    borderColor: t.wrong,
                    opacity: settling ? 0.65 : 1,
                  },
                ]}
                accessibilityLabel={`${text.mismatch}: ${text.mismatchHint}`}
              >
                <Ionicons name="close" size={22} color={t.wrong} />
                <View style={styles.answerCopy}>
                  <Text style={[styles.answerText, { color: t.wrong, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={1}>{text.mismatchAction}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => answerCurrent(true)}
                disabled={settling}
                style={[
                  styles.answerButton,
                  isPlanFlashcardsTask && styles.planAnswerButton,
                  {
                    backgroundColor: t.correctBg,
                    borderColor: t.correct,
                    opacity: settling ? 0.65 : 1,
                  },
                ]}
                accessibilityLabel={`${text.match}: ${text.matchHint}`}
              >
                <View style={styles.answerCopy}>
                  <Text style={[styles.answerText, { color: t.correct, fontSize: isPlanFlashcardsTask ? f.caption : f.body }]} numberOfLines={1}>{text.matchAction}</Text>
                </View>
                <Ionicons name="checkmark" size={22} color={t.correct} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderQuickStart = () => (
    <View style={[styles.quickStartWrap, { paddingHorizontal: ds.spacing.lg }]}>
      <View style={[styles.quickStartIcon, { backgroundColor: `${t.accent}22`, borderColor: t.border }]}>
        <Ionicons name="sparkles-outline" size={30} color={t.accent} />
      </View>
      <Text style={[styles.quickStartTitle, { color: t.textPrimary, fontSize: f.h2, marginTop: 18 }]}>{text.smartQueue}</Text>
      <Text style={[styles.quickStartSub, { color: t.textMuted, fontSize: f.body }]}>{text.sessionSummary}</Text>
    </View>
  );

  const renderNoCards = () => (
    <View style={[styles.quickStartWrap, { paddingHorizontal: ds.spacing.lg }]}>
      <TapScale
        onPress={() => safeRouterBack(router, '/flashcards' as any)}
        style={[styles.noCardsBack, styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}
        accessibilityLabel={triLang(lang, {
          ru: 'Назад',
          uk: 'Назад',
          es: 'Atrás',
          'pt-BR': "Voltar",
          vi: "Quay lại",
          id: "Kembali",
          tr: "Geri",
          pl: "Wstecz",
        })}
      >
        <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
      </TapScale>
      <View style={[styles.noCardsPanel, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
        <View style={[styles.quickStartIcon, { backgroundColor: `${t.accent}22`, borderColor: t.border }]}>
          <Ionicons name="albums-outline" size={30} color={t.accent} />
        </View>
        <Text style={[styles.quickStartTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{text.noCardsTitle}</Text>
        <Text style={[styles.quickStartSub, { color: t.textMuted, fontSize: f.body }]}>
          {loadError || text.noCardsSub}
        </Text>
        <TouchableOpacity
          onPress={() => void loadSources()}
          style={[styles.noCardsButton, { backgroundColor: t.accent }]}
          accessibilityLabel={text.reload}
        >
          <Ionicons name="refresh" size={18} color={t.correctText} />
          <Text style={[styles.doneButtonText, { color: t.correctText, fontSize: f.body }]}>{text.reload}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const showQuickStart =
    quickStart &&
    phase === 'select' &&
    !loadError &&
    (loadingSources || starting || (selectedSources.length > 0 && !quickStartDoneRef.current));
  const showQuickNoCards =
    quickStart &&
    phase === 'select' &&
    !quickStartDoneRef.current &&
    !loadingSources &&
    !starting &&
    selectedSources.length === 0;

  const renderScreen = () => {
    if (showQuickStart) return renderQuickStart();
    if (showQuickNoCards) return renderNoCards();
    if (phase === 'select') return renderSelect();
    return renderPlay();
  };

  return (
    <ScreenGradient artBackdrop="flashcards" topFade={{ scrollY: topFadeScrollY }}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <SafeAreaView style={[styles.safe, { paddingTop: topSafeInset }]} edges={['left', 'right', 'bottom']}>
        <ContentWrap>
          <View style={styles.screen}>{renderScreen()}</View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  quickStartWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartTitle: {
    marginTop: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickStartSub: {
    marginTop: 8,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  selectContent: {
    paddingTop: 10,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 21,
  },
  heroCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontWeight: '900',
  },
  heroSub: {
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '700',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  heroStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroStatValue: {
    fontWeight: '900',
  },
  heroStatLabel: {
    marginTop: 2,
    fontWeight: '800',
  },
  heroStart: {
    minHeight: 54,
    borderRadius: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroStartText: {
    fontWeight: '900',
  },
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  segmentLabel: {
    marginTop: 18,
    fontWeight: '900',
  },
  segmentButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentText: {
    fontWeight: '900',
  },
  segmentSubText: {
    marginTop: 2,
    fontWeight: '800',
  },
  errorText: {
    fontWeight: '700',
    marginBottom: 10,
  },
  loadingBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '700',
  },
  emptyTitle: {
    textAlign: 'center',
    fontWeight: '900',
  },
  sourceList: {
    gap: 10,
  },
  sourceRow: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTextBox: {
    flex: 1,
    minWidth: 0,
  },
  sourceTitle: {
    fontWeight: '900',
  },
  sourceSubtitle: {
    marginTop: 4,
    fontWeight: '700',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrap: {
    flex: 1,
    paddingTop: 10,
  },
  planPlayWrap: {
    paddingTop: 6,
  },
  playHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planPlayHeader: {
    minHeight: 38,
  },
  headerStats: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  planHeaderStats: {
    gap: 0,
  },
  headerStatText: {
    fontWeight: '900',
    textAlign: 'center',
  },
  headerStreakPill: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  headerStreakText: {
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  planProgressTrack: {
    height: 4,
    marginTop: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  cardStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  planCardStage: {
    paddingVertical: 6,
  },
  cardBack: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 24,
    transform: [{ scale: 0.96 }, { translateY: 14 }],
    opacity: 0.55,
  },
  trainingCard: {
    borderWidth: 1.2,
    borderRadius: 24,
    padding: 18,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 7,
  },
  planTrainingCard: {
    borderRadius: 18,
    padding: 12,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  swipeBadge: {
    position: 'absolute',
    top: 18,
    zIndex: 5,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    transform: [{ rotate: '-7deg' }],
  },
  noBadge: {
    left: 18,
  },
  yesBadge: {
    right: 18,
    transform: [{ rotate: '7deg' }],
  },
  swipeBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  cardTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  planCardTopLine: {
    minHeight: 28,
  },
  speakButtonHitbox: {
    width: 52,
    height: 52,
    marginRight: -7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  speakButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSpeakButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  enBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  planEnBox: {
    paddingVertical: 8,
  },
  enLabel: {
    marginBottom: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  englishText: {
    textAlign: 'center',
    fontWeight: '900',
    lineHeight: 31,
    letterSpacing: 0,
  },
  planEnglishText: {
    lineHeight: 25,
  },
  transcriptionText: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '800',
  },
  translationBox: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  planTranslationBox: {
    minHeight: 66,
    borderRadius: 14,
    padding: 10,
  },
  translationLabel: {
    marginBottom: 6,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  translationText: {
    textAlign: 'center',
    fontWeight: '800',
    lineHeight: 24,
  },
  planTranslationText: {
    lineHeight: 20,
  },
  feedbackBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  planFeedbackBox: {
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
  },
  feedbackTitle: {
    fontWeight: '900',
  },
  feedbackLabel: {
    marginTop: 8,
    fontWeight: '800',
  },
  feedbackAnswer: {
    marginTop: 3,
    fontWeight: '900',
    lineHeight: 22,
  },
  planFeedbackAnswer: {
    marginTop: 2,
    lineHeight: 18,
  },
  feedbackNote: {
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '700',
  },
  revealButton: {
    alignSelf: 'center',
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 12,
  },
  planRevealButton: {
    minHeight: 34,
    borderRadius: 12,
    marginBottom: 7,
    paddingHorizontal: 12,
  },
  revealText: {
    fontWeight: '900',
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  planAnswerButtons: {
    gap: 8,
  },
  answerButton: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  planAnswerButton: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  answerText: {
    fontWeight: '900',
    textAlign: 'center',
  },
  answerCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  answerSubText: {
    marginTop: 1,
    fontWeight: '800',
    textAlign: 'center',
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planContinueButton: {
    minHeight: 44,
    borderRadius: 14,
  },
  continueText: {
    fontWeight: '900',
  },
  doneBox: {
    marginTop: 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  planDoneBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
  },
  doneTitle: {
    marginTop: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  planDoneTitle: {
    marginTop: 8,
  },
  doneSubtitle: {
    marginTop: 7,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  planDoneSubtitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  doneScorePill: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planDoneScorePill: {
    marginTop: 9,
    paddingVertical: 5,
  },
  doneScoreText: {
    fontWeight: '900',
  },
  doneGrid: {
    width: '100%',
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planDoneGrid: {
    marginTop: 10,
    gap: 7,
  },
  doneStat: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  planDoneStat: {
    paddingVertical: 8,
    borderRadius: 13,
  },
  doneStatValue: {
    fontWeight: '900',
  },
  doneStatLabel: {
    marginTop: 3,
    fontWeight: '800',
  },
  doneButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  planDoneButtons: {
    marginTop: 10,
    gap: 8,
  },
  doneButtonWrap: {
    flex: 1,
  },
  primaryDoneButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  planDoneButton: {
    minHeight: 42,
    borderRadius: 13,
  },
  secondaryDoneButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontWeight: '900',
  },
  noCardsBack: {
    position: 'absolute',
    top: 10,
    left: 0,
  },
  noCardsPanel: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  noCardsButton: {
    marginTop: 18,
    minHeight: 52,
    alignSelf: 'stretch',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
