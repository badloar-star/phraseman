import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { describeDevCardsState, getDevAnswerTarget, getDevTrainGate, isDevCardsHeld } from './dev_cards_state';
import { isAttemptsStopEffect } from './session_attempts/session_attempts_stop';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useDevFeatureIntroReplay } from './feature_intro_dev_replay';
import FeatureIntroModal from '../components/FeatureIntroModal';
import { featureIntroById } from './feature_intro_registry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { logCardsOptimisticFrame, markCardsOptimisticTap } from './flashcards/cards_optimistic_trace';
import {
  Animated,
  AppState,
  BackHandler,
  Easing,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import DuoPressable from '../components/DuoPressable';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import { PracticeRuneCounter } from '../components/PracticeRuneCounter';
import { CoinRewardFlight } from '../components/rewards/CoinRewardFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { buildOwnedVideoPackMeta, videoIdFromOwnedCommunityId } from './flashcards/my_packs_video_meta'; // зачем: аудит #3 глубокое — набор ролика без документа
import { loadVideoPackFallbackCards } from './flashcards/video_pack_fallback';
import { loadVideoPhraseSetPacks } from './video_phrase_set_packs';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { FlowText } from '../components/text-integrity/FlowText';
import { glassFill } from '../components/GlassSurface';
import { useTrainingStudyTarget } from './flashcards/use_training_study_target';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PlateFill, plateBoxShadow, RAISED_LIFT, raisedBoxShadow } from '../components/v2/ShadowSurface';
import { CardsGlassRoundButton } from './flashcards/CardsGlassKit';
import { PracticeBackButton, PracticeHeaderTitle, PracticeSessionHeader } from '../components/practice/PracticeChrome';
import { TrueFalseSwipeCard, type TrueFalseSwipeCardHandle } from './flashcards/TrueFalseSwipeCard';
import { PracticeCta, PracticeProgressRow, PracticeStatePanel } from '../components/practice/PracticeStates';
import { useAudio, inferExpoSpeechLanguage } from '../hooks/use-audio';
import { type Flashcard } from '../hooks/use-flashcards';
import { writeSwipeMemoryMerged, type SwipeMemoryRows } from './flashcards/swipe_memory_write';
import { loadSelectedSavedContour, peekSelectedSavedContour } from './flashcards/saved_language_contour';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  fetchCommunityPackCards,
  fetchCommunityPackMetaResult,
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
  deckIdsForSwipeSources,
  loadFlashcardsSwipeSessionDraft,
  saveFlashcardsSwipeSessionDraft,
  swipeSourceIdsForDeckIds,
  type FlashcardsSwipePromptDraft,
  type FlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionScope,
  swipeBadgeFullAtPx,
  swipeCommitDirection,
} from './flashcards_swipe_session';
import { parseDeckIdList, type FcDeckId } from './flashcards/deck_selection';
import { usePackContinueRecorder } from './flashcards/use_pack_continue_recorder';
import {
  canUseLegacySwipeGrantFailOpen,
  flashcardPendingGrantPreset,
  persistSpentEnergyOrRefund,
} from './flashcards/training_entry_policy';
import { logSessionSizeSetup } from './flashcards/practice_setup_params';
import {
  FC_DEFAULT_SESSION_SIZE,
  isValidSessionSize,
  setLastPreset,
  type FcSessionSize,
} from './flashcards/mode_prefs';
import { peekCustomCardsCache, readCustomCards } from './flashcards/storage';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './flashcards/types';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { loadGateBackoffMs } from './load_gate_config';
import { flashcardContentLang } from './spanish_content_gate';
import { getCanonicalUserId } from './user_id_policy';
import { flashcardsSwipeHintSeenKey, flashcardsSwipeMemoryKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { captureAccountsV2OwnerUid, produceAccountsV2ChangeIfEnabled } from './accounts_v2_client_flag';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from './flashcards_target_gate';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { captureAccountGeneration } from './account_generation';
import { consumeMonthlyTrainingSession } from './monthly_training_sessions';
import {
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  abandonFlashcardTrainingPendingGrant,
  claimFlashcardTrainingPendingGrantStart,
  discardFlashcardTrainingPendingGrant,
  markFlashcardTrainingEnergyCharged,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  resolveFlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantRecord,
} from './flashcard_training_pending_grant';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';

import { noAndroidOutline } from '../constants/androidGlow';
import { DebugLogger } from './debug-logger';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { useSilentLeave } from '../hooks/use_silent_leave';
import { fitPhraseFontSize } from './flashcards/fit_phrase_font';

// зачем: запись черновика сессии не чаще раза в это время (см. эффект сохранения черновика).
const DRAFT_SAVE_DELAY_MS = 1500;
const readAnimatedJs = (value: Animated.Value): number => {
  // Приватное API RN: JS-сторона значения, из которой рендер берёт стиль. Нет метода → NaN,
  // и сторож/страховка рун просто не срабатывают (сравнения с NaN ложны).
  const getter = (value as unknown as { __getValue?: () => number }).__getValue;
  return typeof getter === 'function' ? Math.round(getter.call(value) * 1000) / 1000 : NaN;
};
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
  kind: 'wrong' | 'hint' | 'correct';
  prompt: Prompt;
  mastered?: boolean;
};

type CorrectTranslationReminder = {
  id: string;
  english: string;
  translation: string;
};

// зачем (координатор 12.10, R1 «нет пути»): тексты отказов старта вынесены в функции — их же показывает dev `train_gate=fail_swipe_*` для съёмки.
function swipeQuotaUnverifiedText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Не удалось проверить лимит тренировки. Попробуй ещё раз.',
    en: 'Couldn’t verify the training limit. Please try again.',
    uk: 'Не вдалося перевірити ліміт тренування. Спробуй ще раз.',
    es: 'No se pudo verificar el límite. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível verificar o limite. Tente novamente.',
    vi: 'Không thể kiểm tra giới hạn. Vui lòng thử lại.',
    id: 'Batas latihan tidak dapat diperiksa. Coba lagi.',
    tr: 'Antrenman sınırı doğrulanamadı. Tekrar deneyin.',
    pl: 'Nie udało się sprawdzić limitu. Spróbuj ponownie.',
  });
}

function swipePrepareFailedText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Не удалось подготовить тренировку. Энергия возвращена.',
    en: 'Couldn’t prepare the training session. Energy was returned.',
    uk: 'Не вдалося підготувати тренування. Енергію повернуто.',
    es: 'No se pudo preparar la sesión. Se devolvió la energía.',
    'pt-BR': 'Não foi possível preparar a sessão. A energia foi devolvida.',
    vi: 'Không thể chuẩn bị buổi luyện tập. Năng lượng đã được hoàn lại.',
    id: 'Sesi latihan tidak dapat disiapkan. Energi dikembalikan.',
    tr: 'Antrenman hazırlanamadı. Enerji iade edildi.',
    pl: 'Nie udało się przygotować treningu. Energia została zwrócona.',
  });
}

/** Static material keeps the swipe gesture path free of per-card live blur roots. */
function SwipeTrainingCardGlass({ chrome, sheen = true }: { chrome: ReturnType<typeof liquidGlassTokens>; sheen?: boolean }) {
  if (!sheen) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[chrome.lightTint, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
      />
    </View>
  );
}

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
/** Высота закреплённой панели с кнопкой запуска на экране выбора наборов:
 *  кнопка (heroStart, minHeight 54) + верхний отступ панели (10). Ровно на
 *  столько увеличен отступ снизу у списка, иначе последний набор прячется
 *  под панелью и его нельзя отметить. */
const SELECT_START_BAR_HEIGHT = 64;

const SOURCE_ACCENTS: Record<SourceKind, string> = {
  saved: '#7CDAFF', // theme-exempt: тень карточки — чёрная в любой теме
  custom: '#FFB84D', // theme-exempt: тень карточки — чёрная в любой теме
  official: '#7CFF92', // theme-exempt: тень карточки — чёрная в любой теме
  community: '#D6A4FF', // theme-exempt: тень карточки — чёрная в любой теме
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

async function saveSwipeMemory(memory: SwipeMemory, studyTarget?: RuntimeStudyTarget, v2Owner: string | null = null): Promise<void> {
  // зачем (Account V2 6G, ремонт №1): запись — слиянием с диском под общей очередью ключа,
  // иначе снимок экрана затирал память, слитую гидрацией V2 (новее по lastSeenAt).
  const compact = await writeSwipeMemoryMerged(
    flashcardsSwipeMemoryKey(studyTarget),
    memory as SwipeMemoryRows,
    (rows) => compactMemory(rows as SwipeMemory) as SwipeMemoryRows,
  ) as SwipeMemory;
  // зачем (Account V2, 6F, dual-write): память свайпов → поле `srs` карточек V2
  // (updatedAtMs = lastSeenAt, время правки на телефоне). Уже пачкой (отложенная
  // запись), шлются только изменившиеся записи. Фоном, за флагом.
  const target = storageStudyTarget(studyTarget);
  produceAccountsV2ChangeIfEnabled(v2Owner, () => ({ kind: 'swipe_memory', target, memory: compact }));
}

/**
 * Отложенная запись памяти карточек.
 *
 * зачем (владелец 2026-09-21, «всё лагает, причём везде», TestFlight): раньше
 * КАЖДЫЙ свайп звал saveSwipeMemory, а это сортировка до 1200 записей
 * (compactMemory) плюс JSON.stringify всего объекта — синхронно на JS-потоке,
 * прямо внутри жеста. Отсюда вязкость карточек.
 *
 * Теперь свайп только запоминает намерение, а запись уходит одна на пачку.
 * Данные не теряются: источник правды — memoryRef в компоненте, он обновляется
 * мгновенно и до диска не зависит; flushSwipeMemoryNow() вызывается при уходе с
 * экрана и при сворачивании приложения. Окно незаписанного не длиннее
 * SWIPE_MEMORY_FLUSH_MS и закрывается раньше, если человек уходит.
 */
const SWIPE_MEMORY_FLUSH_MS = 1_500;
let pendingSwipeMemory: { memory: SwipeMemory; studyTarget?: RuntimeStudyTarget; v2Owner: string | null } | null = null;
let pendingSwipeMemoryTimer: ReturnType<typeof setTimeout> | null = null;

function flushSwipeMemoryNow(): void {
  if (pendingSwipeMemoryTimer) {
    clearTimeout(pendingSwipeMemoryTimer);
    pendingSwipeMemoryTimer = null;
  }
  const pending = pendingSwipeMemory;
  if (!pending) return;
  pendingSwipeMemory = null;
  void saveSwipeMemory(pending.memory, pending.studyTarget, pending.v2Owner).catch((error: unknown) => {
    // зачем: немой catch запрещён правилом владельца — иначе прогресс карточек
    // мог бы теряться месяцами без единого следа в логах.
    console.warn('[SWIPE-MEMORY] flush:catch', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
  });
}

function scheduleSwipeMemorySave(memory: SwipeMemory, studyTarget?: RuntimeStudyTarget): void {
  // зачем (6F ремонт №1, P2): запись отложена до 1,5 с — владелец V2-операции
  // фиксируется в момент свайпа, а не в flush (аккаунт мог смениться).
  pendingSwipeMemory = { memory, studyTarget, v2Owner: captureAccountsV2OwnerUid() };
  if (pendingSwipeMemoryTimer) return;
  pendingSwipeMemoryTimer = setTimeout(() => {
    pendingSwipeMemoryTimer = null;
    flushSwipeMemoryNow();
  }, SWIPE_MEMORY_FLUSH_MS);
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
    en: 'cards',
    uk: 'карток',
    es: 'tarjetas',
    'pt-BR': "cartões",
    vi: "thẻ",
    id: "kartu",
    tr: "kart",
    pl: "kart",
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
    packLanguage: card.packLanguage ?? card.studyTarget,
    studyTarget: card.studyTarget,
    sourceTitle: card.sourceTitle,
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

/**
 * зачем: alreadyShown — текст, уже выведенный рядом как «правильный перевод». Раньше
 * example мог содержать его же, и пользователь видел одну фразу дважды подряд
 * («Можешь включить свет? Можешь включить свет?» — репорт по карточке turn on).
 * Сравниваем по нормализованному виду, чтобы регистр и пунктуация не мешали.
 */
function detailNoteForCard(card: CardItem, lang: FlashcardContentLang, alreadyShown?: string): string {
  const literal = localizedField(card, lang, card.literalRu, card.literalUk, card.literalEs);
  const explanation = localizedField(card, lang, card.explanationRu, card.explanationUk, card.explanationEs);
  const usage = localizedField(card, lang, card.usageNoteRu, card.usageNoteUk, card.usageNoteEs);
  const example = localizedField(card, lang, card.exampleRu, card.exampleUk, card.exampleEs);
  const shownKey = noteDedupKey(alreadyShown);
  const parts = [literal, explanation, usage, example || s(card.description)]
    .filter(Boolean)
    .filter((part) => !shownKey || noteDedupKey(part) !== shownKey);
  return parts.slice(0, 2).join('\n');
}

function noteDedupKey(value: string | undefined): string {
  return s(value).toLocaleLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
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
  // зачем (переводчик 17.10): подпись была «Official pack» по-английски на всех 9 языках
  return triLang(lang, {
    ru: 'Официальный набор',
    en: 'Official pack',
    uk: 'Офіційний набір',
    es: 'Pack oficial',
    'pt-BR': 'Pacote oficial',
    vi: 'Bộ thẻ chính thức',
    id: 'Paket resmi',
    tr: 'Resmî paket',
    pl: 'Oficjalny zestaw',
  });
}

function savedSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Сохранённые карточки',
    en: 'Saved cards',
    uk: 'Збережені картки',
    es: 'Tarjetas guardadas',
    'pt-BR': 'Cartões salvos',
    vi: 'Thẻ đã lưu',
    id: 'Kartu tersimpan',
    tr: 'Kaydedilen kartlar',
    pl: 'Zapisane karty',
  });
}

function customSourceTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Свои карточки',
    en: 'My cards',
    uk: 'Свої картки',
    es: 'Tarjetas propias',
    'pt-BR': 'Seus cartões',
    vi: 'Thẻ của bạn',
    id: 'Kartu sendiri',
    tr: 'Kendi kartların',
    pl: 'Własne karty',
  });
}

function personalListSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Личный список',
    en: 'Personal list',
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
    en: 'Created manually',
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

/**
 * Что отмечено на экране выбора при входе:
 *  1) точечный `?source=` (заход из конкретного набора) — только он;
 *  2) `?deck=` из таббара/DeckPickerSheet (мультивыбор, `saved,custom,pack:id`)
 *     — ровно эти наборы: человек уже выбрал их и ожидает увидеть отмеченными;
 *  3) иначе — всё, что есть (первый заход, тренируем всю библиотеку).
 */
function initialSelectionForSources(
  sources: TrainingSource[],
  requestedSourceId: string,
  requestedDeckIds: readonly FcDeckId[] = [],
): Set<string> {
  const valid = new Set(sources.map((source) => source.id));
  if (requestedSourceId && valid.has(requestedSourceId)) return new Set([requestedSourceId]);
  const fromDecks = swipeSourceIdsForDeckIds(sources, requestedDeckIds);
  if (fromDecks.length > 0) return new Set(fromDecks);
  // зачем (аудит кнопок Карточек #3, координатор 15.10): человек выбрал конкретные наборы (`?deck=`), но экран не нашёл их среди своих источников («Первые 50 слов», свой неопубликованный набор) —
  // раньше подставлялось ВСЁ и тренировалась не та колода. Теперь без подмены: ничего не отмечено, человек выбирает сам.
  if (requestedDeckIds.length > 0) return new Set();
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
      loadCommunityOwnedPackIds(studyTarget).catch(noteSwallowedAs('flashcards_swipe:buildCommunitySources.loadCommunityOwnedPackIds', [])),
      loadPublishedCommunityMarketPacks(studyTarget).catch(noteSwallowedAs('flashcards_swipe:buildCommunitySources.loadPublishedCommunityMarketPacks', [])),
      getCanonicalUserId().catch(noteSwallowedAs('flashcards_swipe:buildCommunitySources.getCanonicalUserId', null)),
    ]);
    const owned = new Set([...ownedCommunityIds, ...inheritedOwnedPackIds]);
    const minePublished = published.filter(
      (p) => owned.has(p.id) || (!!stableId && !!p.authorStableId && p.authorStableId === stableId),
    );
    const pendingMine = stableId
      ? await loadAuthorCommunityPacksPendingUpdate(stableId, studyTarget).catch((error: unknown): FlashcardMarketPack[] => {
        // зачем (8L): немой catch прятал отказ — причина в лог, без uid; поведение прежнее ([]).
        console.warn(`[MY-PACKS] author_packs caller_failed screen=swipe kind=${error instanceof Error ? error.name : typeof error}`);
        return [];
      })
      : [];
    const visibleIds = new Set([...minePublished, ...pendingMine].map((p) => p.id));
    const missingOwned = [...owned].filter((id) => !visibleIds.has(id));
    let phraseVideoIdsForCards: ReadonlySet<string | undefined> = new Set();
    // зачем (Ревизор a9b99dd9e 💸, 15.10): раньше на КАЖДОМ входе каждый «пропавший» id шёл в Firestore (мета + карточки) в обход missingPackCache — 1–2 пустых чтения на набор ролика.
    // Теперь: ролик есть в наборах фраз (кэш 6 ч) → в сообщество не ходим вовсе; известное «документа нет» (общая отметка с «Моими наборами») → не читаем; остальные — одно чтение.
    const videoIds = missingOwned.filter((id) => videoIdFromOwnedCommunityId(id) !== null);
    const phraseSetPacks = videoIds.length > 0
      ? await loadVideoPhraseSetPacks().catch((error: unknown): FlashcardMarketPack[] => {
        console.warn(`[SWIPE-DECKS] наборы фраз роликов не загрузились reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
        return [];
      })
      : [];
    const phraseVideoIds = new Set(phraseSetPacks.map((pack) => pack.videoId));
    phraseVideoIdsForCards = phraseVideoIds;
    // лениво: модуль отметок тянет шину событий — обычный вход без «пропавших» наборов его не платит
    const { missingPackCache } = missingOwned.length > 0 ? await import('./flashcards/my_packs_missing_cache') : { missingPackCache: { isMissing: () => false, markMissing: () => undefined } };
    const nowMs = Date.now();
    let metaReads = 0;
    let metaSkippedPhrase = 0;
    let metaSkippedMissing = 0;
    const missingMeta = await Promise.all(missingOwned.map(async (id): Promise<FlashcardMarketPack | null> => {
      const videoId = videoIdFromOwnedCommunityId(id);
      if (videoId !== null && phraseVideoIds.has(videoId)) { metaSkippedPhrase += 1; return null; }
      const missingKey = `${studyTarget}:${id}`;
      if (missingPackCache.isMissing(missingKey, nowMs)) { metaSkippedMissing += 1; return null; }
      metaReads += 1;
      const result = await fetchCommunityPackMetaResult(id, studyTarget).catch(noteSwallowedAs('flashcards_swipe:buildCommunitySources.fetchCommunityPackMeta', null));
      if (result == null) return null;
      if (result.status === 'missing') { missingPackCache.markMissing(missingKey, nowMs); return null; }
      return result.status === 'found' ? result.pack : null;
    }));
    console.log(`[SWIPE-DECKS] meta reads=${metaReads} skipped_phrase_set=${metaSkippedPhrase} skipped_known_missing=${metaSkippedMissing} of=${missingOwned.length}`); // guard-ok: число чтений Firestore
    // зачем (аудит #3 глубокое, координатор 15.10): добавленный набор ролика без документа сообщества (`video_<id>`) раньше не попадал в источники — «Верно/неверно» по такой колоде
    // стартовало пустым/с чужими. Мету собираем из набора фраз ролика (кэш 6 ч), как в «Моих наборах»; карточки — ниже, с тем же запасным путём.
    const videoGapIds = missingOwned.filter((id, index) => missingMeta[index] == null && videoIdFromOwnedCommunityId(id) !== null);
    const videoGapMetas: FlashcardMarketPack[] = [];
    for (const id of videoGapIds) {
      const built = buildOwnedVideoPackMeta({ packId: id, phraseSetPacks, communityDoc: null, storedTitle: undefined });
      console.log(`[SWIPE-DECKS] video_source id=${id} source=${built.source} cards=${built.pack.cardCount}`); // guard-ok: источник набора ролика
      videoGapMetas.push(built.pack);
    }
    const byId = new Map<string, FlashcardMarketPack>();
    for (const pack of [...minePublished, ...pendingMine, ...missingMeta, ...videoGapMetas]) {
      if (pack?.isCommunityUgc) byId.set(pack.id, pack);
    }
    return [...byId.values()].map((pack) => ({
      id: packKey(pack),
      kind: 'community',
      title: packTitleForInterface(pack, lang),
      subtitle: triLang(lang, {
        ru: 'Community pack',
        en: 'Community pack',
        uk: 'Community pack',
        es: 'Community pack',
        'pt-BR': "Pacote da comunidade",
        vi: "Gói cộng đồng",
        id: "Paket komunitas",
        tr: "Topluluk paketi",
        pl: "Zestaw społeczności",
      }),
      count: pack.cardCount,
      icon: 'people-outline',
      accent: SOURCE_ACCENTS.community,
      loadCards: async () => {
        const videoId = videoIdFromOwnedCommunityId(pack.id);
        if (videoId !== null && phraseVideoIdsForCards.has(videoId)) return loadVideoPackFallbackCards(pack.id, studyTarget); // набор есть в фразах ролика — документ сообщества не читаем
        const fromDoc = await fetchCommunityPackCards(pack.id, studyTarget);
        if (fromDoc.length > 0 || videoIdFromOwnedCommunityId(pack.id) === null) return fromDoc;
        // зачем (аудит #3 глубокое): документа нет — карточки из фраз ролика
        return loadVideoPackFallbackCards(pack.id, studyTarget);
      },
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
    trainingMode: input.scope.trainingMode,
    sourceIds: input.scope.sourceIds,
    routeSource: input.scope.routeSource,
    routeFilter: input.scope.routeFilter,
    contentLang: input.scope.contentLang,
    trainingKeys: input.trainingCards.map((card) => card.trainingKey),
    queue: input.queue.map(promptToDraft),
    feedback: input.feedback
      ? {
          kind: input.feedback.kind,
          prompt: promptToDraft(input.feedback.prompt),
          ...(typeof input.feedback.mastered === 'boolean' ? { mastered: input.feedback.mastered } : {}),
        }
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
    feedback: draft.feedback && feedbackPrompt
      ? {
          kind: draft.feedback.kind,
          prompt: feedbackPrompt,
          ...(typeof draft.feedback.mastered === 'boolean' ? { mastered: draft.feedback.mastered } : {}),
        }
      : null,
    stats: draft.stats,
    progress,
  };
}

type FlashcardsSwipeScreenProps = Readonly<{
  trainingMode?: 'swipe' | 'truefalse';
}>;

export function FlashcardsSwipeScreen({ trainingMode = 'swipe' }: FlashcardsSwipeScreenProps = {}) {
  // зачем (координатор 18.10, Optimistic UI): первый кадр экрана тренировки — от тапа «Тренироваться» / «Начать».
  useEffect(() => { logCardsOptimisticFrame('train_tap', 'session_first_frame', { trainingMode }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const isTrueFalseSession = trainingMode === 'truefalse';
  // зачем (координатор 13.10, cards-v2-033 / cards-gap-003: «Правда / ложь» зависает на «Готовим тренировку…», причина неизвестна; правило «сперва логи»): единый префикс [TF-PREP] — вся цепочка быстрого старта одним поиском. Только для «Правда / ложь».
  const tfPrep = useCallback((step: string, data: Record<string, unknown> = {}) => {
    if (!isTrueFalseSession) return;
    console.log(`[TF-PREP] ${step} ${JSON.stringify(data)}`); // guard-ok: журнал цепочки быстрого старта обязан быть и в релизе (ранние выходы и catch)
  }, [isTrueFalseSession]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    quick?: string | string[];
    source?: string | string[];
    filter?: string | string[];
    owned?: string | string[];
    /** §6: мультивыбор наборов из таббара/DeckPickerSheet — `saved,custom,pack:id`. */
    deck?: string | string[];
    /** Размер сессии из шита (10/15/20). Без параметра тренируем весь выбранный пул. */
    size?: string | string[];
    devRunesSeed?: string | string[];
    devJumpToFinale?: string | string[];
  }>();
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  // «Мне надо только экраны завершения увидеть» — прыгаем сразу на финиш,
  // минуя реальную тренировку целиком.
  const devJumpToFinale = (Array.isArray(params.devJumpToFinale) ? params.devJumpToFinale[0] : params.devJumpToFinale) === '1';
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const topSafeInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const { width, height, fontScale } = useWindowDimensions();
  const { lang } = useLang();
  const { theme: t, statusBarLight, f, ds, liquidGlassThemeId } = useTheme();
  const swipeGlass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (владелец 12.10, п.83, cards-027): тренировка идёт на языке ВЫБРАННЫХ наборов (?target, проверенный хуком: только
  // языки с «Карточками» ready, иначе язык приложения). Энергия и месячная квота — по аккаунту, от языка не зависят.
  const studyTarget = useTrainingStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const swipeAccessGranted = accessResolved;
  const swipeAccessGrantedRef = useRef(swipeAccessGranted);
  const swipeAccessEpochRef = useRef(0);
  if (swipeAccessGrantedRef.current !== swipeAccessGranted) {
    swipeAccessGrantedRef.current = swipeAccessGranted;
    if (!swipeAccessGranted) swipeAccessEpochRef.current += 1;
  }
  const audio = useAudio();
  const { playCorrect } = useCorrectSound();

  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang);
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
  /**
   * §6 (FIX владельца, 2026-08-13): «Тренировка» приходит сюда из таббара с
   * последним выбором наборов — предотмечаем ровно его, чтобы повторный запуск
   * был в один тап, но сам выбор оставался на виду и его можно было изменить.
   */
  const requestedDeckIds = useMemo(() => parseDeckIdList(params.deck), [params.deck]);
  /** Размер сессии из шита; 0 — параметра нет, тренируем весь выбранный пул. */
  const requestedSessionSize = useMemo<FcSessionSize | 0>(() => {
    const raw = Number(routeParamString(params.size));
    const applied = isValidSessionSize(raw) ? raw : 0;
    // зачем (координатор 04.10, настройка «Правда/ложь» 10/20/Все): видно, что пришло и что применено.
    logSessionSizeSetup(trainingMode === 'truefalse' ? 'truefalse' : 'swipe', params.size, applied);
    return applied;
  }, [params.size, trainingMode]);
  const visibleRequestedOfficialOwnedIds = useMemo(
    () => (officialPacksEnabled ? requestedOfficialOwnedIds : []),
    [officialPacksEnabled, requestedOfficialOwnedIds],
  );
  const initialSources = useMemo(
    () => swipeAccessGranted
      ? buildCachedTrainingSources(
        lang,
        // Тот же запасной язык, что у loadSelectedSavedContour(studyTarget) ниже — первый кадр не расходится с загрузкой.
        peekSelectedSavedContour(studyTarget),
        peekCustomCardsCache(studyTarget),
        visibleRequestedOfficialOwnedIds,
        requestedSourceId,
        requestedFilter,
        studyTarget,
      )
      : [],
    [lang, requestedFilter, requestedSourceId, studyTarget, swipeAccessGranted, visibleRequestedOfficialOwnedIds],
  );
  const initialSelectedIds = useMemo(
    () => initialSelectionForSources(initialSources, requestedSourceId, requestedDeckIds),
    [initialSources, requestedDeckIds, requestedSourceId],
  );
  const initialSessionInfo = useMemo(
    () => optimisticSessionInfoForSources(initialSources, initialSelectedIds),
    [initialSources, initialSelectedIds],
  );
  const [sources, setSources] = useState<TrainingSource[]>(() => initialSources);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => initialSelectedIds);
  const [loadingSources, setLoadingSources] = useState(() => initialSources.length === 0);
  const [starting, setStarting] = useState(false);
  // зачем (журнал 27): панель «Начать» сплошная, цвета низа фона экрана; её высота нужна затуханию над ней.
  const [selectStartBarHeight, setSelectStartBarHeight] = useState(96);
  const selectStartBarColor = (t.bgGradient?.[1] ?? t.bgPrimary).slice(0, 7);
  const [loadError, setLoadError] = useState('');
  // Старт тренировки карточек = 10 ⚡ (numeric energy —
  // платим за ПОПЫТКУ, ошибки внутри свайп-тренировки энергию не трогают).
  const {
    confirmSpendOne: confirmSwipeEnergy,
    refundOne: refundSwipeEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('select');
  const [attemptSessionId, setAttemptSessionId] = useState(makeFeedbackAttemptId);
  const swipeEnergyIntent = useEnergySessionIntent('flashcards_swipe', 'selected_decks', attemptSessionId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  /**
   * Стабильный ключ сердечек тренировки.
   *
   * зачем (владелец 2026-09-15, «потратил сердечки, вышел-зашёл — восстановились»):
   * раньше ключ строился из attemptSessionId (время+случайность), а он намеренно
   * пересоздаётся на каждый заход — это правильно для ОПЛАТЫ энергии, но для
   * сердечек означало, что сохранённое значение при возврате не находится и
   * экран всегда выдавал 3/3. У карточек нет номера урока, поэтому «то же
   * занятие» = тот же набор выбранных колод: сортируем, чтобы порядок выбора
   * не менял ключ.
   */
  const attemptsDeckKey = useMemo(
    () => [...selectedIds].sort().join(',') || 'none',
    [selectedIds],
  );
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `flashcard-swipe:${studyTarget ?? 'en'}:${attemptsDeckKey}`,
    initialQuestionId: 'flashcard-swipe:loading',
    autoHydrate: swipeAccessGranted,
    persistenceEnabled: swipeAccessGranted,
  });
  const [trainingCards, setTrainingCards] = useState<TrainingCard[]>([]);
  const [queue, setQueue] = useState<Prompt[]>([]);
  const mistakeCaptureRunRef = useRef(`flashcard-swipe-${Date.now().toString(36)}`);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [correctTranslationReminder, setCorrectTranslationReminder] = useState<CorrectTranslationReminder | null>(null);
  const [stats, setStats] = useState<SessionStats>(() => initialStats(0));
  // зачем (координатор 12.10, «Продолжить»): позиция в наборе — выучено / всего; пишется локально с задержкой и при выходе, смешанные колоды не пишутся
  const { record: recordPackContinue } = usePackContinueRecorder(requestedDeckIds, isTrueFalseSession ? 'truefalse' : 'swipe');
  useEffect(() => {
    if (stats.total > 0) recordPackContinue(stats.mastered, stats.total);
  }, [recordPackContinue, stats.mastered, stats.total]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(() => initialSessionInfo);
  const [settling, setSettling] = useState(false);
  /**
   * FIX (владелец, 2026-08-13) «карточка улетает и возвращается»: счётчик
   * завершённых улётов. Меняется в один батч со сменой очереди, поэтому
   * обнуление смещения (useLayoutEffect ниже) попадает РОВНО в тот коммит, где
   * на месте улетевшей карточки уже стоит следующая, — и даже когда карточка
   * осталась прежней (страховочный таймер улёта).
   */
  const [cardEpoch, setCardEpoch] = useState(0);
  // зачем: одноразовая подсказка «как пользоваться экраном» для новых юзеров —
  // репорт «не понимают карточку/аудио/свайп». Схема 1:1 с flashcardsDeleteHintSeenKey
  // из flashcards_collection.tsx (тот же "seen"-флаг в AsyncStorage, тот же UX баннера).
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeIntroActive = useRuntimeActive();
  const devIntroReplay = useDevFeatureIntroReplay();
  const swipeIntro = featureIntroById('cards_swipe_help');
  const swipeHintCheckedRef = useRef(false);
  const swipeHintWasDevRef = useRef(false);
  const correctTranslationReminderAnim = useRef(new Animated.Value(0)).current;
  const correctTranslationReminderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<Record<string, CardProgress>>({});
  // зачем (итог по cards-section): ячейка «время» — от старта раунда до итога.
  const roundStartedAtRef = useRef(0);
  const memoryRef = useRef<SwipeMemory>({});
  // зачем (владелец 2026-09-21): запись памяти карточек отложена, чтобы не
  // держать жест свайпа. Эти два сброса — страховка, без них потерялись бы
  // последние свайпы: при уходе с экрана и при сворачивании приложения
  // записываем немедленно, не дожидаясь таймера.
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flushSwipeMemoryNow();
    });
    return () => {
      appStateSub.remove();
      flushSwipeMemoryNow();
    };
  }, []);
  // Отложенная запись черновика сессии (см. эффект сохранения черновика ниже).
  const pendingDraftSaveRef = useRef<(() => void) | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelDraftSave = useCallback(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = null;
    pendingDraftSaveRef.current = null;
  }, []);
  const flushDraftSave = useCallback(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = null;
    const save = pendingDraftSaveRef.current;
    pendingDraftSaveRef.current = null;
    save?.();
  }, []);
  const settlingRef = useRef(false);
  /**
   * Один вопрос — один ответ. Ошибочный ответ больше не блокирует экран улётом
   * карточки (см. answerCurrent), а `feedback` доезжает только со следующей
   * перерисовкой — поэтому защита от двойного срабатывания синхронная, на ref.
   * Id вопроса уникален при каждом создании, сбрасывать значение не нужно.
   */
  const answeredPromptIdRef = useRef<string | null>(null);
  // зачем (Карточки 2.0 12.10): «Правда / ложь» — карточка смахивается; на «Дальше» она улетает (320 мс), и только потом идёт следующий вопрос. Защёлка — от двойного тапа.
  const tfCardRef = useRef<TrueFalseSwipeCardHandle>(null);
  const tfContinuingRef = useRef(false);
  // Страховочный таймер settleCard: сбрасывает settling, если Animated-колбэк не выстрелил.
  const settleGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickStartDoneRef = useRef(false);
  /** Последний записанный набор значений ворот автозапуска ([TF-PREP]): журнал только при смене, не на каждый рендер. */
  const tfGateKeyRef = useRef('');
  const draftRestoreAttemptedRef = useRef(false);
  // Синхронный латч оплаты старта (см. комментарий внутри startSession).
  const startChargeInFlightRef = useRef(false);
  const activeSwipeSpentOperationRef = useRef<string | null>(null);
  const activeSwipeRefundPromiseRef = useRef<Promise<void> | null>(null);
  const activeSwipePendingGrantRef = useRef<{
    account: NonNullable<Awaited<ReturnType<typeof resolveFlashcardTrainingPendingGrantAccount>>>;
    fingerprint: string;
  } | null>(null);
  const swipeMountedRef = useRef(true);
  const sourcesRetryRef = useRef(0);
  const sourcesRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // зачем (D158 / PM-214, 04.10): после исчерпанных тихих повторов — «Сейчас недоступно», а не вечный скелетон.
  const [sourcesExhausted, setSourcesExhausted] = useState(false);
  const loadSourcesRef = useRef<((opts?: { quiet?: boolean }) => Promise<void>) | null>(null);
  const swipeExplicitlyAbandonedRef = useRef(false);
  useEffect(() => {
    swipeMountedRef.current = true;
    return () => {
      swipeMountedRef.current = false;
      if (sourcesRetryTimerRef.current) clearTimeout(sourcesRetryTimerRef.current);
    };
  }, []);
  const refundActiveSwipeEnergy = useCallback(async (reason: string) => {
    if (activeSwipeRefundPromiseRef.current) {
      await activeSwipeRefundPromiseRef.current;
      return;
    }
    const operationId = activeSwipeSpentOperationRef.current;
    if (!operationId) return;
    const refundPromise = (async () => {
      await refundSwipeEnergy(operationId, reason);
      if (activeSwipeSpentOperationRef.current === operationId) {
        activeSwipeSpentOperationRef.current = null;
      }
    })();
    activeSwipeRefundPromiseRef.current = refundPromise;
    try {
      await refundPromise;
    } finally {
      if (activeSwipeRefundPromiseRef.current === refundPromise) {
        activeSwipeRefundPromiseRef.current = null;
      }
    }
  }, [refundSwipeEnergy]);
  const abandonActiveSwipePendingGrant = useCallback(() => {
    const pending = activeSwipePendingGrantRef.current;
    if (!pending) return;
    swipeExplicitlyAbandonedRef.current = true;
    activeSwipeSpentOperationRef.current = null;
    void abandonFlashcardTrainingPendingGrant(
      pending.account,
      pending.fingerprint,
      refundSwipeEnergy,
    ).catch((error: unknown) => { console.warn('[FC-SWIPE] abandonFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
  }, [refundSwipeEnergy]);
  /**
   * зачем: найденный черновик незавершённой тренировки. Держим НАГОТОВЕ, но не
   * применяем сами — иначе экран прыгает в сессию без спроса. Юзер решает
   * кнопкой «Продолжить тренировку»; данные уже в памяти, поэтому переход
   * мгновенный, без повторной загрузки.
   */
  const [pendingDraft, setPendingDraft] = useState<{
    restored: NonNullable<ReturnType<typeof restoreSessionDraft>>;
    info: SessionInfo;
    memory: SwipeMemory;
  } | null>(null);
  const hasVisibleSourcesRef = useRef(initialSources.length > 0);
  /**
   * FIX (жалоба ученика 2026-09-30, «пустая карточка, отвечаю вслепую — сгорают руны»).
   *
   * Раньше position/flyOpacity/riseAnim были ОДНИ на всю сессию и сбрасывались в
   * useLayoutEffect при смене карточки. Но нативная анимация улёта по окончании
   * (или по stopAnimation) асинхронно присылает в JS своё последнее значение
   * (RN 0.81, Animation.js: __onAnimatedValueUpdateReceived + node.update()). Когда
   * улёт завершал страховочный таймер (JS занят), это значение прилетало ПОСЛЕ
   * сброса: новая карточка получала opacity≈0 и сдвиг за край — видна была только
   * пустая подложка, а разбор ошибки рисовался внутри той же невидимой карточки.
   *
   * Теперь у каждой карточки СВОИ значения: запоздалый колбэк пишет в значения уже
   * снятой карточки и новую не трогает — гонка невозможна при любых таймингах.
   */
  const cardAnimKey = `${cardEpoch}:${queue[0]?.id ?? ''}`;
  const cardAnim = useMemo(
    () => ({
      position: new Animated.ValueXY(),
      // зачем: A-39 — карта при улёте растворяется. Отдельное значение от position,
      // потому что затухание короче сдвига.
      flyOpacity: new Animated.Value(1),
      riseAnim: new Animated.Value(0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardAnimKey],
  );
  const { position, flyOpacity, riseAnim } = cardAnim;
  const previousCardAnimRef = useRef(cardAnim);
  /**
   * FIX (владелец, 2026-08-16) «нижняя карточка поднимается, но текст прыгает».
   *
   * Подложка (cardBack) — ПУСТОЙ прямоугольник без текста, и это намеренно.
   * Она не «становится» следующей карточкой: верхняя вьюха пересоздаётся по
   * key={currentPrompt.id}, то есть новая карточка ВСЕГДА монтируется заново.
   * Раньше подложка стояла неподвижно, а новая карточка возникала в центре в
   * тот же кадр — глаз читал это как «низ поднялся, а текст моргнул».
   *
   * Теперь подложка честно доезжает до позы верхней карточки (scale 0.96→1,
   * translateY 14→0, opacity 0.55→1) ровно за время улёта. К моменту подмены
   * она пиксель-в-пиксель совпадает с местом, где появится новая карточка, —
   * поэтому подмена не видна. Текста на подложке нет специально: именно
   * появление текста на движущейся вьюхе и давало моргание.
   * (riseAnim теперь создаётся вместе с карточкой — см. cardAnim выше.)
   */
  // зачем: A-55 — «Уменьшение движения» гасит размашистый полёт. Держим в ref,
  // а не в state: settleCard — useCallback, и лишняя зависимость пересоздавала
  // бы PanResponder на каждую смену настройки (жест бы срывался).
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);
  const topFadeScrollY = useRef(new Animated.Value(0)).current;
  /**
   * Быстрый старт (§6): пришли из DeckPickerSheet, наборы уже отмечены человеком
   * — сессия стартует сама, без второго экрана выбора. Обычный вход в режим
   * (тап по «Тренировке» в таббаре) флага не несёт: там выбор наборов и есть
   * первый шаг режима. Повторный показ выбора по ⚙ внутри сессии этот флаг
   * гасит (`quickStartDoneRef`), поэтому в цикл экран не уходит.
   */
  const quickStart = useMemo(
    () => routeParamString(params.quick).trim() === '1' && requestedDeckIds.length > 0,
    [params.quick, requestedDeckIds.length],
  );
  const isCompactFlashcardsTask = false;

  useEffect(() => {
    if (swipeAccessGranted) return;

    // Revoke removes every paid-session artifact before the paywall replaces
    // this route. Any in-flight async work is invalidated by the access epoch.
    if (settleGuardRef.current) {
      clearTimeout(settleGuardRef.current);
      settleGuardRef.current = null;
    }
    if (correctTranslationReminderTimer.current) {
      clearTimeout(correctTranslationReminderTimer.current);
      correctTranslationReminderTimer.current = null;
    }
    quickStartDoneRef.current = false;
    draftRestoreAttemptedRef.current = false;
    hasVisibleSourcesRef.current = false;
    settlingRef.current = false;
    setSources([]);
    setSelectedIds(new Set());
    setLoadingSources(true);
    setStarting(false);
    setTrainingCards([]);
    setQueue([]);
    setFeedback(null);
    setCorrectTranslationReminder(null);
    setPendingDraft(null);
    setSettling(false);
    setPhase('select');
    void refundActiveSwipeEnergy('access_lost').catch((error: unknown) => { console.warn('[FC-SWIPE] refundActiveSwipeEnergy: не удалось (продолжаем без неё)', error); });
  }, [refundActiveSwipeEnergy, swipeAccessGranted]);

  const openMonthlyTrainingLimit = useCallback(() => {
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/flashcards_training_setup',
      params: { mode: 'truefalse' },
    } as any);
  }, [router]);

  const selectedSourceIdsForDraft = useMemo(() => [...selectedIds].sort(), [selectedIds]);
  const sessionDraftScope = useMemo<FlashcardsSwipeSessionScope>(
    () => ({
      trainingMode,
      sourceIds: selectedSourceIdsForDraft,
      routeSource: requestedSourceId,
      routeFilter: requestedFilter,
      contentLang: cardContentLang,
    }),
    [cardContentLang, requestedFilter, requestedSourceId, selectedSourceIdsForDraft, trainingMode],
  );
  // зачем (владелец, 2026-08-27): sessionKey строится из тех же полей, что и
  // scope черновика — те же наборы карточек, тот же язык контента, но живёт в
  // ОТДЕЛЬНОМ ключе AsyncStorage (usePracticeRunes сам всё персистит), не в
  // FlashcardsSwipeSessionDraft — не трогаем чужую схему диска.
  const runeSessionKey = useMemo(
    () => `${sessionDraftScope.trainingMode}_${sessionDraftScope.sourceIds.join('_')}_${sessionDraftScope.contentLang}_${studyTarget}`,
    [sessionDraftScope, studyTarget],
  );
  const practiceRunes = usePracticeRunes({
    activity: 'flashcards_training',
    sessionKey: runeSessionKey,
    completionOrdinal: 1,
    devFakeStartRunes: devRunesFake?.runes,
    enabled: swipeAccessGranted,
  });
  const runeFlight = useCoinRewardFlight();

  const text = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Тренировка карточек',
        en: 'Flashcard training',
        uk: 'Тренування карток',
        es: 'Práctica de tarjetas',
        'pt-BR': "Treino de cartões",
        vi: "Luyện thẻ",
        id: "Latihan kartu",
        tr: "Kart alıştırması",
        pl: "Trening kart",
      }),
      settingsTitle: triLang(lang, {
        ru: 'Тренировка карточек',
        en: 'Flashcard training',
        uk: 'Тренування карток',
        es: 'Práctica de tarjetas',
        'pt-BR': "Treino de cartões",
        vi: "Luyện thẻ",
        id: "Latihan kartu",
        tr: "Kart alıştırması",
        pl: "Trening kart",
      }),
      settings: triLang(lang, {
        ru: 'Настройки',
        en: 'Settings',
        uk: 'Параметри',
        es: 'Ajustes',
        'pt-BR': "Configurações",
        vi: "Cài đặt",
        id: "Pengaturan",
        tr: "Ayarlar",
        pl: "Ustawienia",
      }),
      start: triLang(lang, {
        ru: 'Начать',
        en: 'Start',
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
        en: 'Refresh',
        uk: 'Оновити',
        es: 'Actualizar',
        'pt-BR': "Atualizar",
        vi: "Cập nhật",
        id: "Perbarui",
        tr: "Yenile",
        pl: "Odśwież",
      }),
      empty: triLang(lang, {
        ru: 'Наборы откроются здесь — добавь свои фразы или загляни в магазин.',
        en: 'Packs will show up here — add your own phrases or check the shop.',
        uk: 'Набори з\'являться тут — додай свої вислови або зазирни в магазин.',
        es: 'Aquí aparecerán tus packs — añade tus frases o pásate por la tienda.',
        'pt-BR': "Seus pacotes vão aparecer aqui — adicione frases ou veja a loja.",
        vi: "Các gói sẽ hiện ở đây — thêm cụm từ của bạn hoặc ghé cửa hàng.",
        id: "Tidak ada paket yang tersedia untuk latihan.",
        tr: "Pratik için kullanılabilir paket yok.",
        pl: "Brak zestawów dostępnych do ćwiczenia.",
      }),
      saved: triLang(lang, {
        ru: 'Сохранённые карточки',
        en: 'Saved cards',
        uk: 'Збережені картки',
        es: 'Tarjetas guardadas',
        'pt-BR': "Cartões salvos",
        vi: "Thẻ đã lưu",
        id: "Kartu tersimpan",
        tr: "Kaydedilen kartlar",
        pl: "Zapisane karty",
      }),
      custom: triLang(lang, {
        ru: 'Свои карточки',
        en: 'My cards',
        uk: 'Свої картки',
        es: 'Tarjetas propias',
        'pt-BR': "Cartões próprios",
        vi: "Thẻ của bạn",
        id: "Kartu sendiri",
        tr: "Kendi kartların",
        pl: "Własne karty",
      }),
      official: triLang(lang, {
        ru: 'Official pack',
        en: 'Official pack',
        uk: 'Official pack',
        es: 'Official pack',
        'pt-BR': "Pacote oficial",
        vi: "Gói chính thức",
        id: "Paket resmi",
        tr: "Resmi paket",
        pl: "Zestaw oficjalny",
      }),
      match: triLang(lang, {
        ru: 'Да',
        en: 'Yes',
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
        en: 'No',
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
        en: 'Match',
        uk: 'Вірно',
        es: 'Coincide',
        'pt-BR': "Certo",
        vi: "Đúng",
        id: "Benar",
        tr: "Doğru",
        pl: "Prawda",
      }),
      // зачем (аудит по Библии, 2026-08-26): было «Неверно» — приговор в момент,
      // когда человек только пробует вспомнить фразу (Часть V п.6: не унижаем).
      // Английская версия уже была мягкой — «No match», остальные подтянуты к ней.
      mismatchAction: triLang(lang, {
        ru: 'Не то',
        en: 'No match',
        uk: 'Не те',
        es: 'No coincide',
        'pt-BR': "Não bate",
        vi: "Chưa khớp",
        id: "Belum cocok",
        tr: "Uymadı",
        pl: "Nie pasuje",
      }),
      matchHint: triLang(lang, {
        ru: 'перевод совпадает',
        en: 'translation matches',
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
        en: 'wrong translation',
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
        en: 'Show answer',
        uk: 'Показати відповідь',
        es: 'Mostrar respuesta',
        'pt-BR': "Mostrar resposta",
        vi: "Hiện đáp án",
        id: "Tampilkan jawaban",
        tr: "Cevabı göster",
        pl: "Pokaż odpowiedź",
      }),
      continue: triLang(lang, {
        ru: 'Следующая фраза',
        en: 'Next phrase',
        uk: 'Наступний вислів',
        es: 'Siguiente frase',
        'pt-BR': "Próxima frase",
        vi: "Câu tiếp theo",
        id: "Berikutnya",
        tr: "Sonraki",
        pl: "Dalej",
      }),
      wrongTitle: triLang(lang, {
        ru: 'Разберём ответ',
        en: 'Let\'s review the answer',
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
        en: 'Answer revealed',
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
        en: 'I\'ll bring this card back later to help it stick.',
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
        en: 'Mastered',
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
        en: 'in queue',
        uk: 'у черзі',
        es: 'en cola',
        'pt-BR': "na fila",
        vi: "trong hàng đợi",
        id: "dalam antrean",
        tr: "sırada",
        pl: "w kolejce",
      }),
      correctChoice: triLang(lang, {
        ru: 'Правильный выбор',
        en: 'Correct choice',
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
        en: 'Does this translation match?',
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
        en: 'Phrase',
        uk: 'Вислів',
        es: 'Frase',
        'pt-BR': "Frase",
        vi: "Cụm từ",
        id: "Frasa",
        tr: "İfade",
        pl: "Zwrot",
      }),
      startNoSelection: triLang(lang, {
        ru: 'Выбери набор ниже',
        en: 'Choose a pack below',
        uk: 'Вибери набір нижче',
        es: 'Elige un pack abajo',
        'pt-BR': 'Escolha um pacote abaixo',
        vi: 'Chọn bộ thẻ bên dưới',
        id: 'Pilih paket di bawah',
        tr: 'Aşağıdan paket seç',
        pl: 'Wybierz zestaw poniżej',
      }),
      startStarting: triLang(lang, {
        ru: 'Готовим тренировку…',
        en: 'Getting the session ready…',
        uk: 'Готуємо тренування…',
        es: 'Preparando la sesión…',
        'pt-BR': 'Preparando o treino…',
        vi: 'Đang chuẩn bị luyện tập…',
        id: 'Menyiapkan latihan…',
        tr: 'Antrenman hazırlanıyor…',
        pl: 'Przygotowujemy trening…',
      }),
      // зачем (владелец 01.10): вместо текста «Текст карточки не загрузился» — нейтральное многоточие;
      // пустой прямоугольник нельзя (репорты «Не видна карточка»), а сообщений об ошибке быть не должно.
      brokenCardPhrase: '…',
      correctTranslation: triLang(lang, {
        ru: 'Правильный перевод',
        en: 'Correct translation',
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
        en: 'Done',
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
        en: 'Perfect round',
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
        en: 'No mistakes or hints. These cards will come back for review later.',
        uk: 'Без помилок і підказок. Ці картки підуть на повтор пізніше.',
        es: 'Sin errores ni pistas. Estas tarjetas volverán más tarde.',
        'pt-BR': "Sem erros nem pistas. Estes cartões voltarão mais tarde.",
        vi: "Không lỗi, không gợi ý. Các thẻ này sẽ quay lại sau.",
        id: "Tanpa kesalahan atau petunjuk. Kartu ini akan muncul lagi nanti.",
        tr: "Hata ya da ipucu yok. Bu kartlar daha sonra geri gelecek.",
        pl: "Bez błędów i podpowiedzi. Te karty wrócą później.",
      }),
      learnedDoneSub: triLang(lang, {
        ru: 'Слабые карточки останутся ближе в очереди, пока не закрепятся.',
        en: 'Weak cards will stay closer in the queue until they stick.',
        uk: 'Слабкі картки залишаться ближче в черзі, доки не закріпляться.',
        es: 'Las tarjetas débiles seguirán cerca hasta fijarse.',
        'pt-BR': "Os cartões fracos continuarão por perto até fixarem.",
        vi: "Thẻ yếu sẽ tiếp tục xuất hiện gần đây cho đến khi được ghi nhớ.",
        id: "Kartu lemah akan tetap dekat sampai dikuasai.",
        tr: "Zayıf kartlar pekişene kadar yakında kalacak.",
        pl: "Słabe karty pozostaną blisko, aż się utrwalą.",
      }),
      nextRound: triLang(lang, {
        ru: 'Ещё раунд',
        en: 'Another round',
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
        en: 'Retry',
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
        en: 'Adjust',
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
        en: 'Points',
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
        en: 'Streak',
        uk: 'Серія',
        es: 'Racha',
        'pt-BR': "Sequência",
        vi: "Chuỗi",
        id: "Rangkaian",
        tr: "Seri",
        pl: "Seria",
      }),
      // зачем (аудит по Библии, 2026-08-26): «Ошибки» на экране итога подводили
      // черту виной. Словарь Библии: ошибка → попытка/почти; смотрим вперёд —
      // что стоит доработать, а не что человек провалил.
      mistakes: triLang(lang, {
        ru: 'Что разобрать',
        en: 'To review',
        uk: 'Що розібрати',
        es: 'Para repasar',
        'pt-BR': "Para revisar",
        vi: "Cần ôn",
        id: "Perlu diulang",
        tr: "Tekrar edilecek",
        pl: "Do powtórki",
      }),
      hints: triLang(lang, {
        ru: 'Подсказки',
        en: 'Hints',
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
        en: 'Best streak',
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
        en: 'Cards in session',
        uk: 'Карток у сесії',
        es: 'Tarjetas en la sesión',
        'pt-BR': "Cartões na sessão",
        vi: "Thẻ trong buổi",
        id: "Kartu dalam sesi",
        tr: "Seanstaki kartlar",
        pl: "Karty w sesji",
      }),
      allCards: triLang(lang, {
        ru: 'Все',
        en: 'All',
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
        en: 'Fast',
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
        en: 'Normal',
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
        en: 'Deep',
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
        en: '2 min',
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
        en: '5 min',
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
        en: '10 min',
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
        en: 'Packs',
        uk: 'Набори',
        es: 'Packs',
        'pt-BR': "Pacotes",
        vi: "Gói",
        id: "Paket",
        tr: "Paketler",
        pl: "Zestawy",
      }),
      noCardsTitle: triLang(lang, {
        ru: 'Нет карточек для тренировки',
        en: 'No cards to practice',
        uk: 'Немає карток для тренування',
        es: 'No hay tarjetas para practicar',
        'pt-BR': "Não há cartões para praticar",
        vi: "Không có thẻ để luyện tập",
        id: "Tidak ada kartu untuk latihan",
        tr: "Alıştırma için kart yok",
        pl: "Brak kart do treningu",
      }),
      noCardsSub: triLang(lang, {
        ru: 'Сохрани карточки или добавь набор, и тренировка запустится отсюда в один тап.',
        en: 'Save cards or add a pack, and training will start from here in one tap.',
        uk: 'Збережи картки або додай набір, і тренування запускатиметься звідси в один дотик.',
        es: 'Guarda tarjetas o añade un pack, y la práctica arrancará desde aquí con un toque.',
        'pt-BR': "Salve cartões ou adicione um pacote, e o treino começará daqui com um toque.",
        vi: "Lưu thẻ hoặc thêm một gói, rồi buổi luyện tập sẽ bắt đầu từ đây chỉ với một lần chạm.",
        id: "Simpan kartu atau tambahkan paket, lalu latihan akan mulai dari sini dengan satu ketukan.",
        tr: "Kart kaydet ya da bir paket ekle; alıştırma buradan tek dokunuşla başlar.",
        pl: "Zapisz karty albo dodaj zestaw, a trening ruszy stąd jednym dotknięciem.",
      }),
      // зачем: текст одноразовой подсказки на экране тренировки — жест/аудио/кнопки в одной строке.
      swipeHint: triLang(lang, {
        ru: 'Смахни карточку вправо/влево или используй кнопки. Значок динамика озвучит фразу.',
        en: 'Swipe the card right or left, or use the buttons. The speaker icon reads the phrase aloud.',
        uk: 'Змахни картку вправо/вліво або використай кнопки. Значок динаміка озвучить вислів.',
        es: 'Desliza la tarjeta a la derecha o izquierda, o usa los botones. El icono del altavoz la pronuncia.',
        'pt-BR': 'Deslize o cartão para a direita/esquerda ou use os botões. O ícone de som lê a frase.',
        vi: 'Vuốt thẻ sang phải/trái hoặc dùng các nút. Biểu tượng loa sẽ đọc cụm từ.',
        id: 'Geser kartu ke kanan/kiri atau gunakan tombol. Ikon speaker akan mengucapkan frasa.',
        tr: 'Kartı sağa/sola kaydır ya da düğmeleri kullan. Hoparlör simgesi ifadeyi seslendirir.',
        pl: 'Przesuń kartę w prawo/lewo albo użyj przycisków. Ikona głośnika odczyta zwrot.',
      }),
      // зачем: accessibilityLabel кнопки закрытия одноразовой подсказки — раньше по
      // ошибке использовался text.reload («Обновить»), что неверно озвучивалось скринридером.
      dismissHint: triLang(lang, {
        ru: 'Закрыть подсказку',
        en: 'Dismiss hint',
        uk: 'Закрити підказку',
        es: 'Cerrar sugerencia',
        'pt-BR': 'Fechar dica',
        vi: 'Đóng gợi ý',
        id: 'Tutup petunjuk',
        tr: 'İpucunu kapat',
        pl: 'Zamknij podpowiedź',
      }),
    }),
    [lang],
  );

  const loadSources = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!swipeAccessGranted) { tfPrep('sources:exit:access_not_granted', { quiet: opts?.quiet ?? false }); return; }
    const accessEpoch = swipeAccessEpochRef.current;
    const accessIsCurrent = () => swipeAccessGrantedRef.current
      && swipeAccessEpochRef.current === accessEpoch;
    tfPrep('sources:load:start', { quiet: opts?.quiet ?? false, studyTarget, requestedSourceId, requestedDeckIds, officialPacksEnabled, communityPacksEnabled });
    if (!opts?.quiet) setLoadingSources(true);
    setLoadError('');
    let keepSkeleton = false;
    try {
      const [savedRaw, customRaw, officialOwnedIds] = await Promise.all([
        loadSelectedSavedContour(studyTarget).catch(noteSwallowedAs('flashcards_swipe:useCallback.loadSelectedSavedContour', [])),
        readCustomCards(studyTarget).catch(noteSwallowedAs('flashcards_swipe:useCallback.readCustomCards', [])),
        officialPacksEnabled ? loadAccessiblePackIds(studyTarget).catch(noteSwallowedAs('flashcards_swipe:useCallback.loadAccessiblePackIds', [])) : Promise.resolve([] as string[]),
      ]);
      if (!accessIsCurrent()) { tfPrep('sources:exit:access_changed_after_read', { saved: savedRaw.length, custom: customRaw.length, official: officialOwnedIds.length }); return; }
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
            en: 'Personal list',
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
            en: 'Created manually',
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
      if (!accessIsCurrent()) { tfPrep('sources:exit:access_changed_after_build', { built: next.length }); return; }
      sourcesRetryRef.current = 0;
      setSourcesExhausted(false);
      hasVisibleSourcesRef.current = next.length > 0;
      setSources(next);
      setSelectedIds((cur) => {
        const valid = new Set(next.map((source) => source.id));
        if (requestedSourceId && valid.has(requestedSourceId)) { tfPrep('sources:selected', { by: 'requestedSourceId', ids: [requestedSourceId] }); return new Set([requestedSourceId]); }
        const kept = new Set([...cur].filter((id) => valid.has(id)));
        if (kept.size > 0) { tfPrep('sources:selected', { by: 'kept', ids: [...kept] }); return kept; }
        // Кэша наборов не было — предвыбор из `?deck=` делаем на приехавшем списке.
        const fromDecks = swipeSourceIdsForDeckIds(next, requestedDeckIds);
        tfPrep('sources:selected', { by: fromDecks.length > 0 ? 'requestedDeckIds' : requestedDeckIds.length > 0 ? 'requested_not_found' : 'all_valid', ids: fromDecks.length > 0 ? fromDecks : requestedDeckIds.length > 0 ? [] : [...valid], requestedDeckIds });
        // зачем (аудит #3): запрошенные наборы не нашлись — НЕ подменяем всей библиотекой (тренировалась не та колода)
        if (fromDecks.length === 0 && requestedDeckIds.length > 0) {
          console.warn(`[SWIPE-DECKS] запрошенные наборы не найдены среди источников — ничего не отмечаем requested=${JSON.stringify(requestedDeckIds)} sources=${JSON.stringify([...valid])}`); // guard-ok: причина пустого выбора
          return new Set<string>();
        }
        return fromDecks.length > 0 ? new Set(fromDecks) : valid;
      });
      tfPrep('sources:loaded', { total: next.length, ids: next.map((source) => `${source.id}:${source.count}`), requestedSourceId, requestedDeckIds });
    } catch (error) {
      // зачем (владелец 01.10 + D158): текста «Наборы не загрузились» нет. Кэш/уже показанные наборы остаются,
      // а загрузка молча повторяется с паузами 1/3/8 с (app/load_gate_config.ts). Пока наборов нет совсем —
      // скелетон; повторы кончились — «Сейчас недоступно» + «Попробовать снова» (было: 5×20 с и вечный скелетон).
      console.warn('[FC-SWIPE] loadSources отклонён', { error: String(error), attempt: sourcesRetryRef.current, hasVisible: hasVisibleSourcesRef.current });
      tfPrep('sources:catch', { error: String(error), attempt: sourcesRetryRef.current, hasVisible: hasVisibleSourcesRef.current });
      if (!accessIsCurrent()) {
        console.warn('[FC-SWIPE] loadSources: доступ сменился, повтор не планируем');
        return;
      }
      const backoffMs = loadGateBackoffMs(sourcesRetryRef.current + 1);
      if (backoffMs !== null) {
        sourcesRetryRef.current += 1;
        keepSkeleton = !hasVisibleSourcesRef.current;
        if (sourcesRetryTimerRef.current) clearTimeout(sourcesRetryTimerRef.current);
        sourcesRetryTimerRef.current = setTimeout(() => {
          sourcesRetryTimerRef.current = null;
          if (!swipeMountedRef.current) { console.warn('[FC-SWIPE] тихий повтор отменён: экран закрыт'); return; }
          console.warn('[FC-SWIPE] тихий повтор наборов', { attempt: sourcesRetryRef.current, backoffMs });
          void loadSourcesRef.current?.({ quiet: true });
        }, backoffMs);
      } else {
        console.warn('[FC-SWIPE] тихие повторы наборов исчерпаны → «Сейчас недоступно»', { attempts: sourcesRetryRef.current, hasVisible: hasVisibleSourcesRef.current });
        if (!hasVisibleSourcesRef.current) setSourcesExhausted(true);
      }
    } finally {
      if (accessIsCurrent() && !keepSkeleton) setLoadingSources(false);
    }
  }, [communityPacksEnabled, lang, officialPacksEnabled, requestedDeckIds, requestedFilter, requestedSourceId, studyTarget, swipeAccessGranted, text.custom, text.saved, tfPrep]);

  loadSourcesRef.current = loadSources;
  useEffect(() => {
    if (!swipeAccessGranted) return;
    void loadSources({ quiet: hasVisibleSourcesRef.current });
  }, [loadSources, swipeAccessGranted]);

  const retrySourcesAfterUnavailable = useCallback((source: 'tap' | 'foreground') => {
    console.warn('[FC-SWIPE] повтор наборов после «Сейчас недоступно»', { source });
    if (source === 'tap') hapticTap();
    sourcesRetryRef.current = 0;
    setSourcesExhausted(false);
    void loadSourcesRef.current?.({ quiet: false });
  }, []);

  // D158: автоповтор при возврате в приложение, если повторы исчерпаны.
  useEffect(() => {
    if (!sourcesExhausted) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retrySourcesAfterUnavailable('foreground');
    });
    return () => sub.remove();
  }, [retrySourcesAfterUnavailable, sourcesExhausted]);

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
    if (!swipeAccessGranted) return;
    let cancelled = false;
    void (async () => {
      const memory = await loadSwipeMemory(studyTarget).catch(noteSwallowedAs('flashcards_swipe:useEffect.loadSwipeMemory', {}));
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
  }, [answerFor, selectedEstimate, selectedSources, studyTarget, swipeAccessGranted]);

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
          const cards = source.cards ?? (await source.loadCards?.().catch(noteSwallowedAs('flashcards_swipe:useCallback.loadCards', []))) ?? [];
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
      const ranked = smartSortCards([...byKey.values()], memory, now);
      const info = sessionInfoFor(ranked, now);
      return { cards: ranked, info };
    },
    [answerFor],
  );

  /**
   * Применить отложенный черновик по тапу «Продолжить тренировку».
   * Всё уже в памяти — переход мгновенный, без сети и без загрузки.
   */
  const resumePendingDraft = useCallback(() => {
    if (!swipeAccessGrantedRef.current || !pendingDraft) return;
    void hapticTap();
    const { restored, info, memory } = pendingDraft;
    memoryRef.current = memory;
    progressRef.current = restored.progress;
    position.setValue({ x: 0, y: 0 });
    setFeedback(restored.feedback);
    setTrainingCards(restored.trainingCards);
    setQueue(restored.queue);
    setStats(restored.stats);
    setSessionInfo(info);
    setPendingDraft(null);
    setAttemptSessionId(makeFeedbackAttemptId());
    setPhase('play');
  }, [pendingDraft, position]);

  /** Отказ от черновика: чистим его и начинаем заново с текущим выбором. */
  const discardPendingDraft = useCallback(() => {
    void hapticTap();
    setPendingDraft(null);
    // зачем: отложенная запись не должна воскресить черновик, от которого отказались.
    cancelDraftSave();
    void clearFlashcardsSwipeSessionDraft(studyTarget).catch((error) => DebugLogger.error('flashcards_swipe:draft-discard', error, 'warning'));
  }, [cancelDraftSave, studyTarget]);

  // зачем (координатор 12.10, «сперва логи», cards-v2-033: «Не удалось подготовить тренировку» у Верно/Неверно без подмены сбоя): единый префикс — вся цепочка «Начать» → подготовка → результат одним поиском
  const fsLog = useCallback((step: string, data: Record<string, unknown> = {}) => {
    console.log(`[FLASHCARDS-SESSION] ${step} ${JSON.stringify(data)}`); // guard-ok: журнал цепочки старта обязан быть и в релизе (ранние выходы и catch)
    tfPrep(`start:${step}`, data); // зеркало цепочки startSession под префиксом [TF-PREP] — только «Правда / ложь»
  }, [tfPrep]);

  const startSession = useCallback(async () => {
    if (!accessResolved) { fsLog('exit:access_not_resolved', { mode: trainingMode ?? 'trainer' }); return; }
    if (selectedSources.length === 0 || starting || startChargeInFlightRef.current) {
      fsLog('exit:not_startable', { sources: selectedSources.length, starting, inFlightLatch: startChargeInFlightRef.current });
      return;
    }
    const accessEpoch = swipeAccessEpochRef.current;
    const accessIsCurrent = () => swipeAccessGrantedRef.current
      && swipeAccessEpochRef.current === accessEpoch;
    // зачем: окно подтверждения траты убрано 2026-08-24, а раньше именно оно
    // отбивало второй тап. starting тут не спасает — это состояние React, оно
    // ставится только ПОСЛЕ await и не видно второму тапу в том же кадре.
    // Латч закрывает щель между проверкой и setStarting(true).
    startChargeInFlightRef.current = true;
    swipeExplicitlyAbandonedRef.current = false;
    setStarting(true);
    setLoadError('');
    fsLog('enter', {
      mode: trainingMode ?? 'trainer', isTrueFalse: isTrueFalseSession, quickStart, phase,
      deckIds: deckIdsForSwipeSources(selectedSources), sources: selectedSources.length, requestedSize: requestedSessionSize,
      hasPremiumAccess, hasAccountToken: accountToken != null, attemptSessionId,
      devState: describeDevCardsState(),
    });
    let pendingRecord: FlashcardTrainingPendingGrantRecord | null = null;
    /** Локальный старт на случай отказа гранта — см. fail-open в catch ниже. */
    let swipeLocalStart: (() => void) | null = null;
    try {
      // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `train_gate=fail_swipe_prepare|fail_swipe_quota` — те же сообщения об отказе старта без реального слоя выдачи; в стор-сборке геттер выключен.
      const devGate = getDevTrainGate();
      if (devGate === 'fail_swipe_prepare' || devGate === 'fail_swipe_quota') {
        console.log(`[DEV-STATE] swipe: старт подменён отказом (${devGate})`); // guard-ok: dev-ветка
        fsLog('exit:dev_train_gate', { devGate, shown: devGate === 'fail_swipe_quota' ? 'quota_unverified' : 'prepare_failed', devState: describeDevCardsState() });
        setLoadError(devGate === 'fail_swipe_quota' ? swipeQuotaUnverifiedText(lang) : swipePrepareFailedText(lang));
        return;
      }
      const memory = await loadSwipeMemory(studyTarget);
      memoryRef.current = memory;
      const { cards, info } = await buildSessionCards(selectedSources, memory);
      fsLog('cards:built', { cards: cards.length, memoryKeys: Object.keys(memory ?? {}).length, accessCurrent: accessIsCurrent() });
      if (!accessIsCurrent()) {
        // зачем (баг «Блиц висит на каркасе», 03.10): немой выход по тапу «Начать» — причина в лог.
        console.warn('[FC-SWIPE-GATE] exit:access_not_current', JSON.stringify({ cards: cards.length }));
        return;
      }
      if (cards.length === 0) {
        fsLog('exit:no_cards_with_translation', { sources: selectedSources.length });
        setLoadError(
          triLang(lang, {
            ru: 'В выбранных наборах нет карточек с переводом.',
            en: 'The selected packs have no cards with a translation.',
            uk: 'В обраних наборах немає карток із перекладом.',
            es: 'Los packs elegidos no tienen tarjetas con traducción.',
            'pt-BR': "Os pacotes escolhidos não têm cartões com tradução.",
            vi: "Các gói đã chọn không có thẻ kèm bản dịch.",
            id: "Paket yang dipilih tidak memiliki kartu dengan terjemahan.",
            tr: "Seçilen paketlerde çevirili kart yok.",
            pl: "Wybrane zestawy nie mają kart z tłumaczeniem.",
          }),
        );
        return;
      }
      /**
       * §6: размер сессии из DeckPickerSheet (10/15/20). Карточки уже отсортированы
       * `smartSortCards`, поэтому берём верхушку очереди — самые нужные сейчас.
       * Без параметра (прямой заход на экран) поведение прежнее: весь пул.
      */
      const sessionCards = requestedSessionSize > 0 ? cards.slice(0, requestedSessionSize) : cards;
      const promptQueue = buildPromptQueue(sessionCards);
      swipeLocalStart = () => {
        progressRef.current = Object.fromEntries(sessionCards.map((card) => [card.trainingKey, emptyProgress()]));
        roundStartedAtRef.current = Date.now();
        position.setValue({ x: 0, y: 0 });
        setFeedback(null);
        setTrainingCards(sessionCards);
        setQueue(promptQueue);
        setStats(initialStats(sessionCards.length));
        setSessionInfo(info);
        setAttemptSessionId(makeFeedbackAttemptId());
        setPhase('play');
      };
      const pendingAccount = await resolveFlashcardTrainingPendingGrantAccount(accountToken);
      fsLog('account:resolved', { resolved: pendingAccount != null, hasAccountToken: accountToken != null });
      if (!pendingAccount) throw new Error('pending_grant_account_unavailable');
      const pendingScope = {
        mode: 'swipe' as const,
        studyTarget,
        contentLang: cardContentLang,
        deckKeys: deckIdsForSwipeSources(selectedSources),
        sessionSize: requestedSessionSize > 0 ? requestedSessionSize : Number.MAX_SAFE_INTEGER,
        preset: flashcardPendingGrantPreset(isTrueFalseSession),
      };
      const prepareStartedAt = Date.now();
      fsLog('prepare:request', { mode: 'swipe', preset: pendingScope.preset, sessionCards: sessionCards.length, size: requestedSessionSize > 0 ? requestedSessionSize : 'all', decks: pendingScope.deckKeys.length });
      const prepared = await prepareFlashcardTrainingPendingGrant({
        account: pendingAccount,
        scope: pendingScope,
        manifest: {
          schemaVersion: 'flashcard-training-manifest.v1',
          mode: 'swipe',
          payload: {
            orderedCardIds: sessionCards.map((card) => card.trainingKey),
            seed: attemptSessionId,
            promptRecipe: promptQueue.map((prompt) => ({
              cardId: prompt.card.trainingKey,
              direction: prompt.isMatch ? 'front_to_back' : 'back_to_front',
            })),
            initialCardId: promptQueue[0]!.card.trainingKey,
          },
        },
        attemptId: attemptSessionId,
        receiptId: `swipe:${attemptSessionId}`,
        energyOperationId: swipeEnergyIntent.operationId,
        energyEpoch: swipeEnergyIntent.grant.attemptId,
      });
      fsLog('prepare:response', { status: prepared.status, reason: 'reason' in prepared ? String(prepared.reason) : null, ms: Date.now() - prepareStartedAt });
      if (prepared.status !== 'prepared' && prepared.status !== 'reused') {
        // зачем: без reason аудит по логу невозможен — «unavailable» ничего не объясняет.
        throw new Error(`pending_grant_${prepared.status}:${'reason' in prepared ? String(prepared.reason) : 'n/a'}`);
      }
      pendingRecord = prepared.record;
      activeSwipePendingGrantRef.current = { account: pendingAccount, fingerprint: pendingRecord.fingerprint };
      const reconciled = await reconcileFlashcardTrainingPendingGrant(pendingAccount, pendingScope);
      console.log('[FC-SWIPE-GATE] reconcile:done', JSON.stringify({ status: reconciled.status }));
      fsLog('reconcile', { status: reconciled.status });
      // зачем (баг 03.10, тот же класс, что в Блице): 'missing' сразу после prepare давал немой return —
      // тап «Начать» ничего не делал. Уводим в catch → fail-open (тренажёр) или понятная ошибка (Верно/Неверно).
      if (reconciled.status === 'found') pendingRecord = reconciled.record;
      else throw new Error(`pending_grant_reconcile_${reconciled.status}`);

      const restoredPayload = pendingRecord.manifest.payload as unknown as {
        orderedCardIds: string[];
        promptRecipe?: { cardId: string; direction: 'front_to_back' | 'back_to_front' }[];
      };
      if (!Array.isArray(restoredPayload.orderedCardIds)) {
        throw new Error('pending_grant_manifest_invalid');
      }
      const cardsByKey = new Map(sessionCards.map((card) => [card.trainingKey, card]));
      const restoredSessionCards = restoredPayload.orderedCardIds
        .map((cardId) => cardsByKey.get(cardId))
        .filter((card): card is TrainingCard => card !== undefined);
      if (restoredSessionCards.length !== restoredPayload.orderedCardIds.length) {
        throw new Error('pending_grant_manifest_cards_unavailable');
      }
      const fallbackPrompts = new Map(promptQueue.map((prompt) => [prompt.card.trainingKey, prompt]));
      const restoredPromptQueue = (restoredPayload.promptRecipe ?? []).map((recipe, index) => {
        const card = cardsByKey.get(recipe.cardId);
        if (!card) return null;
        const isMatch = recipe.direction === 'front_to_back';
        const trueTranslation = answerFor(card);
        const fallback = fallbackPrompts.get(recipe.cardId);
        let shownTranslation = isMatch ? trueTranslation : fallback?.shownTranslation ?? '';
        if (!isMatch && normalizeAnswer(shownTranslation) === normalizeAnswer(trueTranslation)) {
          const decoy = restoredSessionCards
            .slice(index + 1)
            .concat(restoredSessionCards.slice(0, index + 1))
            .map(answerFor)
            .find((candidate) => normalizeAnswer(candidate) !== normalizeAnswer(trueTranslation));
          shownTranslation = decoy ?? '';
        }
        if (!shownTranslation) return null;
        return {
          id: `${card.trainingKey}:${Date.now()}:${index}`,
          card,
          shownTranslation,
          trueTranslation,
          isMatch,
        } satisfies Prompt;
      });
      if (
        restoredPromptQueue.length !== restoredSessionCards.length
        || restoredPromptQueue.some((prompt) => prompt === null)
      ) throw new Error('pending_grant_manifest_prompt_unavailable');
      const claimed = await claimFlashcardTrainingPendingGrantStart(
        pendingAccount,
        pendingRecord.fingerprint,
        pendingRecord.receiptId,
        `swipe-start:${attemptSessionId}`,
      );
      fsLog('claim', { status: claimed.status });
      if (claimed.status !== 'claimed' && claimed.status !== 'reused') {
        throw new Error(`pending_grant_claim_${claimed.status}`);
      }
      pendingRecord = claimed.record;
      let energyCharged = pendingRecord.energyState === 'charged';
      if (!energyCharged && pendingRecord.energyState !== 'refunded') {
        const energyResult = await confirmSwipeEnergy(swipeEnergyIntent);
        energyCharged = energyResult === 'spent';
        if (energyCharged) {
          activeSwipeSpentOperationRef.current = pendingRecord.energyOperationId;
          pendingRecord = await persistSpentEnergyOrRefund<FlashcardTrainingPendingGrantRecord>({
            persistCharged: () => markFlashcardTrainingEnergyCharged(
              pendingAccount,
              pendingRecord!.fingerprint,
            ),
            refundSpent: () => refundActiveSwipeEnergy('pending_grant_energy_persist_failed'),
          });
        }
        fsLog('energy', { result: energyResult, charged: energyCharged, accessCurrent: accessIsCurrent() });
        if (!accessIsCurrent()) {
          fsLog('exit:access_lost_after_energy', { charged: energyCharged });
          if (energyCharged) {
            await abandonFlashcardTrainingPendingGrant(
              pendingAccount,
              pendingRecord.fingerprint,
              refundSwipeEnergy,
              Date.now(),
              'access_lost',
            );
            await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          }
          return;
        }
        if (energyResult === 'cancelled') {
          fsLog('exit:energy_cancelled', {});
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          return;
        }
        if (energyResult === 'insufficient') {
          fsLog('exit:energy_insufficient', {});
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          setNoEnergyOpen(true);
          return;
        }
      }

      if (pendingRecord.phase === 'prepared') {
        const quotaResult = await consumeMonthlyTrainingSession({
          token: accountToken,
          accessResolved,
          hasPremiumAccess,
          receiptId: pendingRecord.receiptId,
          mode: 'swipe',
        });
        fsLog('quota', { status: quotaResult.status });
        if (quotaResult.status === 'allowed') {
          const marked = await markFlashcardTrainingQuotaCommitted(
            pendingAccount,
            pendingRecord.fingerprint,
            Date.now(),
            quotaResult.resetAt,
          );
          if (marked.status !== 'quota_committed' && marked.status !== 'playable') {
            throw new Error(`pending_grant_quota_${marked.status}`);
          }
          pendingRecord = marked.record;
        } else {
          if (energyCharged) {
            await abandonFlashcardTrainingPendingGrant(
              pendingAccount,
              pendingRecord.fingerprint,
              refundSwipeEnergy,
              Date.now(),
              'quota_refused',
            );
          }
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          activeSwipeSpentOperationRef.current = null;
          activeSwipePendingGrantRef.current = null;
        fsLog('exit:quota_refused', { status: quotaResult.status, shown: quotaResult.status === 'exhausted' ? 'monthly_limit' : 'quota_unverified' });
        if (quotaResult.status === 'exhausted') {
          openMonthlyTrainingLimit();
        } else {
          setLoadError(swipeQuotaUnverifiedText(lang));
        }
        return;
      }
      }
      if (!swipeMountedRef.current || swipeExplicitlyAbandonedRef.current || !accessIsCurrent()) {
        fsLog('exit:unmounted_or_abandoned', { mounted: swipeMountedRef.current, abandoned: swipeExplicitlyAbandonedRef.current, accessCurrent: accessIsCurrent() });
        return;
      }
      /**
       * Запоминаем выбор наборов (`fc_mode_prefs_v1`) — следующий запуск
       * «Тренировки» из таббара придёт сюда уже с ними отмеченными.
       */
      void setLastPreset('trainer', {
        deckIds: deckIdsForSwipeSources(selectedSources),
        size: requestedSessionSize === 0 ? FC_DEFAULT_SESSION_SIZE : requestedSessionSize,
      }).catch((error: unknown) => { console.warn('[FC-SWIPE] setLastPreset: запоминание выбора наборов не удалось (продолжаем без неё)', error); });
      const playable = await markFlashcardTrainingPendingGrantPlayable(
        pendingAccount,
        pendingRecord.fingerprint,
      );
      if (playable.status !== 'playable') {
        throw new Error(`pending_grant_playable_${playable.status}`);
      }
      pendingRecord = playable.record;
      const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
        pendingAccount,
        pendingRecord.fingerprint,
        energyCharged ? acknowledgeSessionStart : async () => true,
        { energyCharged },
      );
      if (cleared.status !== 'cleared') {
        throw new Error(`pending_grant_ack_${cleared.status}`);
      }
      activeSwipeSpentOperationRef.current = null;
      activeSwipePendingGrantRef.current = null;
      progressRef.current = Object.fromEntries(
        restoredSessionCards.map((card) => [card.trainingKey, emptyProgress()]),
      );
      position.setValue({ x: 0, y: 0 });
      setFeedback(null);
      setTrainingCards(restoredSessionCards);
      setQueue(restoredPromptQueue as Prompt[]);
      setStats(initialStats(restoredSessionCards.length));
      setSessionInfo(info);
      setAttemptSessionId(makeFeedbackAttemptId());
      setPhase('play');
      fsLog('result:play', { cards: restoredSessionCards.length, path: 'grant' });
    } catch (error: unknown) {
      const pending = activeSwipePendingGrantRef.current;
      // зачем (владелец, 2026-09-13): немой catch прятал причину отказа входа.
      console.warn('[FC-TRAIN-ENTRY] swipe entry:catch', JSON.stringify({
        error: (error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
        hadPending: pending != null,
        pendingFingerprint: pending?.fingerprint ?? null,
      }));
      if (pending) {
        const abandoned = await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.fingerprint,
          refundSwipeEnergy,
          Date.now(),
          'entry_failed',
        ).catch(noteSwallowedAs('flashcards_swipe:useCallback.abandonFlashcardTrainingPendingGrant', null));
        if (abandoned?.status === 'refunded' || abandoned?.status === 'refund_in_progress') {
          activeSwipeSpentOperationRef.current = null;
        } else {
          await refundActiveSwipeEnergy('entry_failed').catch((error: unknown) => { console.warn('[FC-SWIPE] refundActiveSwipeEnergy: не удалось (продолжаем без неё)', error); });
        }
        await discardFlashcardTrainingPendingGrant(pending.account, pending.fingerprint).catch((error: unknown) => { console.warn('[FC-SWIPE] discardFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
      } else {
        await refundActiveSwipeEnergy('entry_failed').catch((error: unknown) => { console.warn('[FC-SWIPE] refundActiveSwipeEnergy: не удалось (продолжаем без неё)', error); });
      }
      /**
       * зачем (приказ владельца 2026-09-14, дословно: «НЕ ЧИНИ, А УБЕРИ»,
       * «убрать все проверки из раздела карточки»): слой отложенного гранта
       * (phone-state / квота / энергия) больше НЕ ИМЕЕТ ПРАВА закрыть вход в
       * тренировку. Карточки уже загружены — раунд стартует локально, без
       * чека квоты и без списания энергии; отказ инфраструктуры громко в логе.
       */
      const message = error instanceof Error ? error.message : String(error);
      const failOpenPolicy = canUseLegacySwipeGrantFailOpen(message, isTrueFalseSession);
      fsLog('catch', { message, isTrueFalse: isTrueFalseSession, failOpenPolicy, hasLocalStart: swipeLocalStart != null, mounted: swipeMountedRef.current, abandoned: swipeExplicitlyAbandonedRef.current, accessCurrent: accessIsCurrent(), devState: describeDevCardsState() });
      if (failOpenPolicy && swipeLocalStart && swipeMountedRef.current && !swipeExplicitlyAbandonedRef.current && accessIsCurrent()) {
        activeSwipePendingGrantRef.current = null;
        activeSwipeSpentOperationRef.current = null;
        console.warn('[FC-TRAIN-ENTRY] swipe entry:fail-open — грант недоступен, раунд стартует локально без чека и без списания энергии', JSON.stringify({ reason: message }));
        swipeLocalStart();
        fsLog('result:play', { path: 'fail-open-local' });
        return;
      }
      fsLog('result:error_shown', { text: 'prepare_failed', reason: message, mounted: swipeMountedRef.current });
      if (swipeMountedRef.current) setLoadError(swipePrepareFailedText(lang));
    } finally {
      startChargeInFlightRef.current = false;
      if (swipeMountedRef.current) setStarting(false);
    }
  }, [fsLog, trainingMode, quickStart, phase, accessResolved, hasPremiumAccess, accountToken, acknowledgeSessionStart, answerFor, attemptSessionId, buildPromptQueue, buildSessionCards, cardContentLang, confirmSwipeEnergy, isTrueFalseSession, lang, openMonthlyTrainingLimit, position, refundActiveSwipeEnergy, refundSwipeEnergy, requestedSessionSize, selectedSources, starting, studyTarget, swipeEnergyIntent]);

  useEffect(() => {
    if (!swipeAccessGranted) return;
    if (draftRestoreAttemptedRef.current) return;
    if (phase !== 'select' || loadingSources || starting || selectedSources.length === 0) return;
    if (sessionDraftScope.sourceIds.length === 0) return;

    let cancelled = false;
    draftRestoreAttemptedRef.current = true;
    void (async () => {
      const draft = await loadFlashcardsSwipeSessionDraft(sessionDraftScope, Date.now(), studyTarget).catch(noteSwallowedAs('flashcards_swipe:useEffect.loadFlashcardsSwipeSessionDraft', null));
      if (!draft || cancelled) return;

      const memory = await loadSwipeMemory(studyTarget).catch(noteSwallowedAs('flashcards_swipe:useEffect.loadSwipeMemory_2', {}));
      const { cards, info } = await buildSessionCards(selectedSources, memory);
      if (cancelled) return;

      const restored = restoreSessionDraft(draft, cards);
      if (!restored) {
        await clearFlashcardsSwipeSessionDraft(studyTarget).catch((error: unknown) => { console.warn('[FC-SWIPE] clearFlashcardsSwipeSessionDraft: не удалось (продолжаем без неё)', error); });
        return;
      }

      // зачем: раньше здесь стоял setPhase('play') — экран выбора успевал
      // показаться и ТУТ ЖЕ прыгал в сессию сам, без спроса. Юзер видел мигание
      // и оказывался в незапрошенной тренировке. Теперь черновик держим наготове
      // в памяти, а решение оставляем за юзером: на экране выбора появляется
      // «Продолжить тренировку». Тап по ней — и восстановленное состояние
      // применяется мгновенно, без повторной загрузки.
      setPendingDraft({ restored, info, memory });
    })();

    return () => {
      cancelled = true;
    };
  }, [buildSessionCards, loadingSources, phase, position, selectedSources, sessionDraftScope, starting, studyTarget, swipeAccessGranted]);

  useEffect(() => {
    if (!swipeAccessGranted) return;
    if (!quickStart || quickStartDoneRef.current || phase !== 'select') return;
    if (loadingSources || starting || selectedSources.length === 0) return;
    // зачем (координатор 12.10, cards-gap-003): dev `hold=swipe_quickstart` держит «Готовим тренировку…» — автозапуск не стартует.
    if (isDevCardsHeld('swipe_quickstart')) {
      console.warn('[DEV-STATE] swipe: быстрый старт удержан (hold=swipe_quickstart)'); // guard-ok: dev-ветка
      return;
    }
    quickStartDoneRef.current = true;
    void startSession();
  }, [loadingSources, phase, quickStart, selectedSources.length, startSession, starting, swipeAccessGranted]);

  // зачем (cards-v2-033 / cards-gap-003, «сперва логи»): эффект автозапуска выше выходит МОЛЧА по любому из условий — именно так экран вечно «готовит тренировку». Журнал значений ворот при каждой их смене.
  useEffect(() => {
    if (!quickStart) return;
    const gate = {
      swipeAccessGranted, accessResolved, phase, loadingSources, starting, sources: selectedSources.length,
      doneAlready: quickStartDoneRef.current, held: isDevCardsHeld('swipe_quickstart'), loadError: loadError ? String(loadError).slice(0, 80) : '',
    };
    const key = JSON.stringify(gate);
    if (tfGateKeyRef.current === key) return;
    tfGateKeyRef.current = key;
    tfPrep('quickstart:gate', gate);
  }, [accessResolved, loadError, loadingSources, phase, quickStart, selectedSources.length, starting, swipeAccessGranted, tfPrep]);

  const exitTraining = useCallback(() => {
    void hapticTap();
    abandonActiveSwipePendingGrant();
    draftRestoreAttemptedRef.current = true;
    safeRouterBack(router, '/flashcards' as any);
  }, [abandonActiveSwipePendingGrant, router]);

  // зачем: системный «Назад» на Android уходил мимо exitTraining/safeRouterBack и вёл себя
  // иначе, чем кнопка выхода — терялся честный стек навигации (navigation_back.ts) и
  // пометка draftRestoreAttemptedRef, из-за чего при следующем заходе мог всплыть черновик
  // уже закрытой сессии. Заводим тот же путь, что и у кнопки, по образцу lesson1.tsx.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitTraining();
      return true;
    });
    return () => sub.remove();
  }, [exitTraining]);

  // зачем (жалоба владельца): «Настроить» раньше открывал встроенный экран
  // выбора наборов (phase='select') — тот самый устаревший полноэкранный
  // подбор, который владелец считает мёртвым грузом. Теперь ведёт назад —
  // туда, откуда пришли запускать тренировку (тот же путь, что у exitTraining).
  // зачем (ревью PM-134, 04.10): кнопки «Настройки» в шапке больше нет (abac0c627) — обработчик остался только как выход из итога («Готово»), имя отражает действие.
  const exitFromResult = useCallback(() => {
    void hapticTap();
    abandonActiveSwipePendingGrant();
    draftRestoreAttemptedRef.current = true;
    safeRouterBack(router, '/flashcards' as any);
  }, [abandonActiveSwipePendingGrant, router]);

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
      // зачем: запись отложена — см. scheduleSwipeMemorySave. memoryRef уже
      // обновлён, поэтому следующая карточка берёт свежие данные из памяти, а
      // диск догоняет фоном и не держит жест.
      scheduleSwipeMemorySave(memoryRef.current, studyTarget);
    },
    [studyTarget],
  );

  const progressPct = stats.total > 0 ? Math.min(100, Math.round((stats.mastered / stats.total) * 100)) : 0;
  const currentPrompt = queue[0] ?? null;
  const currentPromptId = currentPrompt?.id;
  const updateAttemptQuestion = attempts.updateQuestion;

  useEffect(() => {
    if (!swipeAccessGranted || phase !== 'play' || !currentPromptId) return;
    updateAttemptQuestion(currentPromptId);
  }, [currentPromptId, phase, swipeAccessGranted, updateAttemptQuestion]);

  /**
   * FIX (владелец, 2026-08-13): «когда свайпаешь, она улетает, а затем возвращается».
   *
   * Корневая причина: смещение и прозрачность улетевшей карточки обнулялись в
   * колбэке анимации (`finish()` в settleCard) — то есть ДО того, как React
   * перерисует очередь. Оба значения нативно-драйвенные: `setValue` долетает до
   * UI-потока сразу, а коммит с новой карточкой приходит следующим кадром (и
   * позже — рендер сессии тяжёлый). В этом зазоре СТАРАЯ вьюха возвращалась в
   * центр экрана с полной непрозрачностью и прежним текстом — это и читалось
   * как «улетела и вернулась».
   *
   * Теперь сброс живёт здесь и выполняется СИНХРОННО в том же коммите, где на
   * месте улетевшей карточки уже стоит следующая (useLayoutEffect, не обычный
   * effect: обычный отрабатывает после кадра и зазор остаётся). Останов
   * native-анимации ПЕРЕД setValue сохранён: если страховочный таймер выиграл
   * гонку, ещё живой fade иначе снова запишет opacity 0 новой карточке.
   *
   * 2026-09-30: сброс общих значений заменён на СВЕЖИЕ значения для каждой
   * карточки (cardAnim). Здесь только глушим анимации снятой карточки — их
   * запоздалые колбэки пишут в её собственные значения и новую не задевают.
   */
  useLayoutEffect(() => {
    const previous = previousCardAnimRef.current;
    if (previous !== cardAnim) {
      previous.position.stopAnimation();
      previous.flyOpacity.stopAnimation();
      previous.riseAnim.stopAnimation();
      previousCardAnimRef.current = cardAnim;
    }
    const promptId = currentPrompt?.id ?? null;
    if (!promptId) return;
    // зачем: НАВСЕГДА — сторож регресса. flyOpacity/riseAnim меняются только улётом,
    // поэтому вне улёта они обязаны быть 1/0. Иначе карточка невидима человеку.
    const checks = [120, 700].map((delayMs) => setTimeout(() => {
      const opacity = readAnimatedJs(cardAnim.flyOpacity);
      const rise = readAnimatedJs(cardAnim.riseAnim);
      if ((opacity < 0.99 || rise > 0.01) && !settlingRef.current) {
        DebugLogger.error('flashcards_swipe:SWIPE-BLANK-STALE', new Error(`promptId=${promptId} after=${delayMs}ms opacity=${opacity} rise=${rise}`), 'warning');
      }
    }, delayMs));
    return () => checks.forEach(clearTimeout);
  }, [cardAnim, currentPrompt?.id]);
  const done = devJumpToFinale || (phase === 'play' && !currentPrompt && stats.total > 0);

  useEffect(() => {
    if (done) activeSwipeSpentOperationRef.current = null;
  }, [done]);

  // «Руны засчитываются, когда игрок дошёл до экрана празднования»
  // (владелец, 2026-08-27) — здесь это переход done false→true.
  useEffect(() => {
    // зачем (аудит 2026-08-28): earningsRef ещё null до конца гидратации —
    // settle() тогда тихо выходит и копилка не зачитывается никогда (DEV-хаб
    // ставит done=true синхронно на первом рендере, раньше гидратации).
    if (swipeAccessGranted && done && !practiceRunes.hydrating) void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, practiceRunes.hydrating, swipeAccessGranted]);

  useEffect(() => {
    if (!swipeAccessGranted || phase !== 'play' || trainingCards.length === 0) return;
    if (done || queue.length === 0) {
      cancelDraftSave();
      void clearFlashcardsSwipeSessionDraft(studyTarget).catch((error) => DebugLogger.error('flashcards_swipe:draft-clear', error, 'warning'));
      return;
    }

    // зачем (2026-09-30): черновик со ВСЕЙ очередью (у ученика 1297 карточек) раньше
    // собирался и сериализовался на каждый ответ, а при ошибке дважды — это душило
    // JS-поток, анимация улёта опаздывала и карточка оставалась невидимой. Теперь
    // пишем не чаще раза в DRAFT_SAVE_DELAY_MS последним состоянием; при сворачивании
    // и уходе с экрана — сразу (см. эффект flushDraftSave), прогресс не теряется.
    pendingDraftSaveRef.current = () => {
      const draft = buildSessionDraft({
        scope: sessionDraftScope,
        trainingCards,
        queue,
        feedback,
        stats,
        progress: progressRef.current,
      });
      void saveFlashcardsSwipeSessionDraft(draft, studyTarget).catch((error) => DebugLogger.error('flashcards_swipe:draft-save', error, 'warning'));
    };
    if (!draftSaveTimerRef.current) {
      draftSaveTimerRef.current = setTimeout(flushDraftSave, DRAFT_SAVE_DELAY_MS);
    }
  }, [cancelDraftSave, done, feedback, flushDraftSave, phase, queue, sessionDraftScope, stats, studyTarget, swipeAccessGranted, trainingCards]);

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flushDraftSave();
    });
    return () => {
      appStateSub.remove();
      flushDraftSave();
    };
  }, [flushDraftSave]);

  // зачем: показываем подсказку один раз — при первом реальном входе в play-фазу
  // (не на restore черновика посреди сессии, поэтому проверяем currentPrompt, а
  // не просто phase). Флаг ставим сразу при показе, чтобы повторный маунт экрана
  // (напр. быстрый back/forward) не показал баннер снова, пока идёт запрос к AsyncStorage.
  useEffect(() => {
    if (devIntroReplay) swipeHintCheckedRef.current = false;
  }, [devIntroReplay, swipeIntroActive]);

  useEffect(() => {
    if (!swipeAccessGranted || !swipeIntroActive || phase !== 'play' || !currentPrompt || swipeHintCheckedRef.current) return;
    let cancelled = false;
    void AsyncStorage.getItem(flashcardsSwipeHintSeenKey(studyTarget))
      .then((seen) => {
        if (cancelled) return;
        swipeHintCheckedRef.current = true;
        if (seen === '1' && !devIntroReplay) return;
        swipeHintWasDevRef.current = devIntroReplay;
        setShowSwipeHint(true);
        if (!devIntroReplay) void AsyncStorage.setItem(flashcardsSwipeHintSeenKey(studyTarget), '1').catch((error: unknown) => { console.warn('[FC-SWIPE] AsyncStorage.setItem: не удалось (продолжаем без неё)', error); });
      })
      .catch((error: unknown) => { console.warn('[FC-SWIPE] AsyncStorage.setItem: не удалось (продолжаем без неё)', error); });
    return () => { cancelled = true; };
  }, [currentPrompt, phase, studyTarget, swipeAccessGranted, swipeIntroActive, devIntroReplay]);

  const dismissSwipeHint = useCallback(() => {
    setShowSwipeHint(false);
    if (!swipeHintWasDevRef.current) void AsyncStorage.setItem(flashcardsSwipeHintSeenKey(studyTarget), '1');
  }, [studyTarget]);

  const clearCorrectTranslationReminder = useCallback(() => {
    if (correctTranslationReminderTimer.current) {
      clearTimeout(correctTranslationReminderTimer.current);
      correctTranslationReminderTimer.current = null;
    }
    correctTranslationReminderAnim.stopAnimation();
    correctTranslationReminderAnim.setValue(0);
    setCorrectTranslationReminder(null);
  }, [correctTranslationReminderAnim]);

  const showCorrectTranslationReminder = useCallback((prompt: Prompt) => {
    if (correctTranslationReminderTimer.current) {
      clearTimeout(correctTranslationReminderTimer.current);
    }
    const reminder: CorrectTranslationReminder = {
      id: `${prompt.id}:${Date.now()}`,
      english: s(prompt.card.en),
      translation: prompt.trueTranslation,
    };
    setCorrectTranslationReminder(reminder);
    correctTranslationReminderAnim.stopAnimation();
    correctTranslationReminderAnim.setValue(0);
    Animated.timing(correctTranslationReminderAnim, {
      toValue: 1,
      duration: reduceMotionRef.current ? 0 : 180,
      useNativeDriver: true,
    }).start();
    // При правильном «Не совпадает» неверный перевод исчезает вместе с картой.
    // Неблокирующее напоминание оставляет перед глазами истинный перевод, не
    // замедляя сессию и не добавляя ещё одного подтверждающего действия.
    correctTranslationReminderTimer.current = setTimeout(() => {
      correctTranslationReminderTimer.current = null;
      Animated.timing(correctTranslationReminderAnim, {
        toValue: 0,
        duration: reduceMotionRef.current ? 0 : 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setCorrectTranslationReminder((current) => current?.id === reminder.id ? null : current);
      });
    }, 3200);
  }, [correctTranslationReminderAnim]);

  useEffect(() => {
    if (!swipeIntroActive) setShowSwipeHint(false);
  }, [swipeIntroActive]);

  useEffect(() => () => {
    if (correctTranslationReminderTimer.current) {
      clearTimeout(correctTranslationReminderTimer.current);
      correctTranslationReminderTimer.current = null;
    }
    correctTranslationReminderAnim.stopAnimation();
  }, [correctTranslationReminderAnim]);

  useEffect(() => {
    if (phase !== 'play' && correctTranslationReminder) {
      clearCorrectTranslationReminder();
    }
  }, [clearCorrectTranslationReminder, correctTranslationReminder, phase]);

  // FIX (владелец, 2026-08-13): «я свайпаю, а карточки прыгают назад».
  // Раньше здесь была выдержка MIN_SWIPE_DWELL_MS = 220мс с момента показа
  // карточки: любой свайп раньше неё НЕ засчитывался и карта пружиной уезжала
  // обратно. На реальном устройстве человек свайпает пачкой быстрее 220мс —
  // и получал «жест не работает». Выдержку снижаем до символической: она
  // защищает только от случайного «прилипшего» жеста предыдущей карточки
  // (double-fire на подмене), а не от нормального флика.
  const cardShownAtRef = useRef(0);
  useEffect(() => {
    if (!swipeAccessGranted || !currentPrompt?.id) return;
    cardShownAtRef.current = Date.now();
  }, [currentPrompt?.id, swipeAccessGranted]);
  const MIN_SWIPE_DWELL_MS = 40;

  const settleCard = useCallback(
    (direction: 'left' | 'right', after: () => void) => {
      if (!swipeAccessGrantedRef.current || settlingRef.current) return;
      settlingRef.current = true;
      setSettling(true);
      // Идемпотентное завершение: гарантированно один раз сбрасывает settling и
      // продвигает карточку. Нужен страховочный таймаут, потому что колбэк
      // Animated.timing().start() на Android может не выстрелить (GC/фон/дроп кадра) —
      // тогда settlingRef навсегда остался бы true и все следующие свайпы/кнопки
      // блокировались бы (юзер «застревает на первой карточке»).
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (settleGuardRef.current) {
          clearTimeout(settleGuardRef.current);
          settleGuardRef.current = null;
        }
        // ЗДЕСЬ БЫЛО обнуление position/flyOpacity — ПЕРЕД сменой состояния.
        // Именно оно возвращало улетевшую карточку в центр на 1–3 кадра
        // (см. useLayoutEffect выше). Порядок перевёрнут: сначала продвигаем
        // сессию, а смещение обнуляется уже в коммите новой карточки.
        after();
        setCardEpoch((n) => n + 1);
        settlingRef.current = false;
        setSettling(false);
      };
      // зачем: A-39 из макета — карта уходит дугой (вбок + вниз) с доворотом и
      // растворением, а не плоским сдвигом.
      // КРИТИЧНО про длительность: пока идёт улёт, settlingRef блокирует ввод —
      // экран не принимает ни свайп, ни кнопки. Эталонные 450мс из макета
      // (это web, там ввод не блокируется) давали 450мс залипания и ощущение
      // «свайп не срабатывает, надо дёргать несколько раз». Поэтому держим
      // ИСХОДНЫЕ 190мс отзывчивости: форма движения из макета, тайминг — свой.
      // Отзывчивость важнее буквального соответствия эталону.
      const flyMs = reduceMotionRef.current ? 110 : 190;
      settleGuardRef.current = setTimeout(finish, flyMs + 260);
      Animated.parallel([
        Animated.timing(position, {
          toValue: {
            x: direction === 'right' ? width * 1.15 : -width * 1.15,
            y: reduceMotionRef.current ? 0 : 50,
          },
          duration: flyMs,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(flyOpacity, {
          toValue: 0,
          duration: flyMs,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        // зачем: подложка поднимается на место верхней карточки РОВНО за время
        // улёта — к моменту подмены она уже в финальной позе, поэтому появление
        // новой карточки не читается как скачок. Easing.out: движение
        // притормаживает у цели, как в нативных колодах.
        Animated.timing(riseAnim, {
          toValue: 1,
          duration: flyMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Прежний `position.stopAnimation(cb → finish())` стоил лишнего
        // раунд-трипа на UI-поток, и всё это время ввод оставался заблокирован
        // (settlingRef) — «свайп не срабатывает». Синхронизацию значения делает
        // useLayoutEffect новой карточки, поэтому продвигаемся сразу.
        finish();
      });
    },
    [flyOpacity, position, riseAnim, width],
  );

  // Гасим страховочный таймер settleCard при размонтировании, чтобы не дёргать
  // setState после ухода с экрана.
  useEffect(() => () => {
    if (settleGuardRef.current) {
      clearTimeout(settleGuardRef.current);
      settleGuardRef.current = null;
    }
  }, []);

  const applyAnswer = useCallback(
    (prompt: Prompt, saysMatch: boolean, deferCorrectAdvance = false) => {
      if (!swipeAccessGrantedRef.current) return;
      const correct = saysMatch === prompt.isMatch;
      const key = prompt.card.trainingKey;
      const prev = progressRef.current[key] ?? emptyProgress();
      const cardProgress = { ...prev, attempts: prev.attempts + 1 };
      progressRef.current[key] = cardProgress;
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId: `${mistakeCaptureRunRef.current}:${prompt.id}:${cardProgress.attempts}`,
        verdict: correct ? 'correct' : 'pedagogical_wrong',
      });

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
        // зачем (22.09): узкий список языков не пускал запись ошибки для
        // испанского и немецкого — свайп не пополнял «Мои ошибки».
        if (isMistakeStudyTargetValue(studyTarget)) {
          void captureCurrentAccountObjectiveAttempt({
            attemptId: `${mistakeCaptureRunRef.current}:${prompt.id}:${cardProgress.attempts}`,
            studyTarget,
            verdict: 'wrong',
            objective: true,
            content: {
              sourceKind: 'flashcard',
              sourceId: prompt.card.id,
              canonicalTarget: prompt.card.en,
              sourceMeaning: prompt.trueTranslation,
              distractors: queue.filter((candidate) => candidate.card.id !== prompt.card.id).slice(0, 5).map((candidate) => candidate.card.en),
            },
            facet: { kind: 'meaning', expected: prompt.card.en },
          }).catch((error: unknown) => { console.warn('[FC-SWIPE] запись попытки в цели аккаунта не удалась (продолжаем без неё)', error); });
        }
        if (isAttemptsStopEffect(attemptEffect)) {
          audio.stop();
        }
        return;
      }

      void hapticSuccess();
      playCorrect();
      const needsRecovery = cardProgress.wrong > 0 || cardProgress.hints > 0;
      if (needsRecovery) cardProgress.recoveryCorrect += 1;
      const mastered = !needsRecovery || cardProgress.recoveryCorrect >= 2;
      // зачем (владелец, 2026-08-27): руна — за карточку, окончательно
      // усвоенную (mastered), не за каждый промежуточный правильный ответ на
      // пути восстановления после ошибки/подсказки.
      if (mastered) {
        const awarded = practiceRunes.onCorrectAnswer(key);
        if (awarded > 0) runeFlight.fly(awarded);
      }
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
      if (!saysMatch && !deferCorrectAdvance) {
        showCorrectTranslationReminder(prompt);
      }
      if (deferCorrectAdvance) {
        setFeedback({ kind: 'correct', prompt, mastered });
        return;
      }
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
    [attempts, audio, makePrompt, playCorrect, practiceRunes, queue, runeFlight, showCorrectTranslationReminder, studyTarget, trainingCards, updateCardMemory],
  );

  const answerCurrent = useCallback(
    (saysMatch: boolean) => {
      if (!swipeAccessGrantedRef.current) return;
      if (attempts.state.phase !== 'active' || !currentPrompt || feedback || settling || settlingRef.current) return;
      if (answeredPromptIdRef.current === currentPrompt.id) return;
      // зачем (жалоба 2026-09-30): страховка рун. Ответ на невидимую карточку — это
      // угадайка, а три таких сжигали руны. Если карточка вне улёта оказалась
      // прозрачной — возвращаем её на место и НЕ засчитываем ответ.
      const visibleOpacity = readAnimatedJs(flyOpacity);
      if (!isTrueFalseSession && visibleOpacity < 0.5) {
        DebugLogger.error('flashcards_swipe:SWIPE-BLANK-ANSWER-BLOCKED', new Error(`promptId=${currentPrompt.id} opacity=${visibleOpacity} saysMatch=${saysMatch}`), 'warning');
        flyOpacity.stopAnimation();
        flyOpacity.setValue(1);
        position.stopAnimation();
        position.setValue({ x: 0, y: 0 });
        return;
      }
      answeredPromptIdRef.current = currentPrompt.id;
      clearCorrectTranslationReminder();
      if (showSwipeHint) dismissSwipeHint();
      // FIX (владелец, 2026-08-13), вторая половина «улетает и возвращается»:
      // ошибочный ответ раньше тоже уводил карточку за край экрана, но разбор
      // (правильный перевод) показывается НА ТОЙ ЖЕ карточке — и она честно
      // возвращалась в центр. Улетает только отвеченная верно карточка: её
      // место занимает следующая. Ошибочная остаётся на месте — мягко
      // возвращается из-под пальца и разворачивается разбором.
      const correct = saysMatch === currentPrompt.isMatch;
      if (isTrueFalseSession) {
        applyAnswer(currentPrompt, saysMatch, true);
        return;
      }
      if (!correct) {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }).start();
        applyAnswer(currentPrompt, saysMatch);
        return;
      }
      // NB: не выставляем settlingRef здесь — settleCard делает `if (settlingRef.current) return`,
      // поэтому преждевременная установка флага заставляла его сразу выйти, и карточка/кнопки «зависали».
      settleCard(saysMatch ? 'right' : 'left', () => applyAnswer(currentPrompt, saysMatch));
    },
    [applyAnswer, attempts.state.phase, clearCorrectTranslationReminder, currentPrompt, dismissSwipeHint, feedback, flyOpacity, isTrueFalseSession, position, settleCard, settling, showSwipeHint],
  );

  const revealCurrent = useCallback(() => {
    if (attempts.state.phase !== 'active' || !currentPrompt || feedback || settling || settlingRef.current) return;
    clearCorrectTranslationReminder();
    void hapticTap();
    // зачем (владелец 2026-08-30): звук подсказки удалён НАВСЕГДА — в раунде 5
    // отверг все варианты («ни один — не надо их вообще»). Остаётся haptic.
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
  }, [attempts.state.phase, clearCorrectTranslationReminder, currentPrompt, feedback, settling, updateCardMemory]);

  const continueAfterFeedback = useCallback(() => {
    if (attempts.state.phase !== 'active' || !feedback) return;
    void hapticTap();
    const rest = queue.slice(1);
    if (isTrueFalseSession && feedback.kind === 'correct' && feedback.mastered) {
      setQueue(rest);
      setFeedback(null);
      return;
    }
    setQueue(
      insertLater(rest, (insertAt) =>
        makePrompt(feedback.prompt.card, trainingCards, true, adjacentShownNorms(rest, insertAt)),
      ),
    );
    setFeedback(null);
  }, [attempts.state.phase, feedback, isTrueFalseSession, makePrompt, queue, trainingCards]);

  const speakCurrentCard = useCallback(() => {
    if (attempts.state.phase !== 'active') return;
    const textToSpeak = currentPrompt?.card.en?.trim();
    if (!textToSpeak) return;
    void hapticTap();
    // Не форсируем voice: '' — иначе теряется выбранный пользователем TTS-голос и
    // предзаписанный «echo»-клип, из-за чего озвучка звучала «странно» (голос
    // движка по умолчанию). Даём speak() самому взять settings.speechVoiceId и
    // при наличии — качественный клип.
    // зачем: D128 — клип OpenAI языка карточки, без подмены чужим голосом устройства.
    audio.speak(textToSpeak, undefined, { language: inferExpoSpeechLanguage(textToSpeak, currentPrompt?.card.packLanguage), cardAudio: true });
  }, [attempts.state.phase, audio, currentPrompt?.card.en, currentPrompt?.card.packLanguage]);

  const resetSwipeAfterSessionRuneForfeit = useCallback(() => {
    setFeedback(null);
    answeredPromptIdRef.current = null;
  }, []);

  // зачем (2026-09-03, владелец «три ошибки — экран завис намертво»): без
  // hydrated автосброс молча не запускался, а поверх экрана уже лежал
  // attemptsInputBlocker — выхода не оставалось. Подарок тоже подключён, иначе
  // купленное спасение не срабатывало бы именно там, где оно нужно.
  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    hydrationTrusted: attempts.hydrationTrusted,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: resetSwipeAfterSessionRuneForfeit,
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isCompactFlashcardsTask &&
          !!currentPrompt &&
          attempts.state.phase === 'active' &&
          !feedback &&
          !settling &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        /**
         * зачем (владелец, 2026-08-16, «прыжки/дёрганье»): раньше здесь на
         * КАЖДОЕ движение пальца вызывался `position.setValue(...)` — то есть
         * координата ехала через JS-мост, и под нагрузкой (озвучка, разбор
         * очереди, ре-рендер) карточка отставала от пальца.
         *
         * PanResponder вызывает обработчик из JS, поэтому Animated.event здесь
         * обязан оставаться JS-функцией. Пружины возврата и улёта по-прежнему
         * используют нативный драйвер.
         *
         * Наклон и бейджи «верно/неверно» читают `position.x` только через
         * `interpolate` (нативный драйвер это поддерживает), addListener и
         * чтения `_value` в файле нет — иначе натив бы не подошёл.
         *
         * `y` мягче `x` (0.16): вертикаль не должна уводить карточку из-под
         * пальца — это было и раньше, здесь тот же множитель.
         */
        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false, listener: undefined },
        ),
        onPanResponderRelease: (_, gesture) => {
          // FIX (владелец, 2026-08-13): фиксированный порог 96px был великоват —
          // обычный быстрый флик до него не доезжал, и карта возвращалась
          // пружиной («свайп не берётся»). Теперь порог относительный
          // (SWIPE_DISTANCE_RATIO от ширины экрана, с разумными границами) И
          // есть второй путь срабатывания — по скорости жеста: короткий, но
          // быстрый флик засчитывается сразу, как в нативных свайп-лентах.
          const dwellMs = Date.now() - cardShownAtRef.current;
          const dwellOk = dwellMs >= MIN_SWIPE_DWELL_MS;
          const direction = swipeCommitDirection(gesture, width);
          if (dwellOk && direction === 'right') {
            answerCurrent(true);
            return;
          }
          if (dwellOk && direction === 'left') {
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
    [answerCurrent, attempts.state.phase, currentPrompt, feedback, isCompactFlashcardsTask, position, settling, width],
  );

  const cardWidth = Math.min(width - (isCompactFlashcardsTask ? 32 : 36), 430);
  const cardHeight = isCompactFlashcardsTask
    ? Math.min(292, Math.max(218, height * 0.34))
    : Math.min(360, Math.max(250, height * 0.42));
  const feedbackMaxHeight = Math.max(120, Math.floor(cardHeight * 0.5));
  // зачем: у карточки был только minHeight и НИ maxHeight, ни overflow — при длинном
  // объяснении она раздувалась под контент и наезжала на кнопки ответа снизу (репорт:
  // блок теории вылез поверх карточки). Верхний предел считаем от уже известных величин,
  // а НЕ через onLayout: замер дал бы прыжок геометрии на первом кадре, что запрещено
  // контрактом стабильности лэйаута. Прокрутка остаётся внутри feedbackScroll.
  const cardMaxHeight = Math.max(cardHeight, Math.floor(height * (isCompactFlashcardsTask ? 0.46 : 0.62)));
  // зачем: A-39 — на улёте карта доворачивается до 16deg (в макете это
  // финальная поза). При перетаскивании пальцем наклон мягче (7deg на пол-экрана),
  // поэтому две точки: жест — деликатный, улёт за край — выразительный.
  const rotate = position.x.interpolate({
    inputRange: [-width * 1.15, -width / 2, 0, width / 2, width * 1.15],
    outputRange: ['-16deg', '-7deg', '0deg', '7deg', '16deg'],
    extrapolate: 'clamp',
  });
  // FIX (владелец, 2026-08-13): «подпись гаснет слишком рано». Диапазон был
  // [20;130] при пороге 96px — бейдж набирал единицу почти на самом пороге и
  // всю решающую часть жеста оставался полупрозрачным. Теперь полная
  // непрозрачность достигается на ~12% ширины экрана (BADGE_FULL_RATIO) и
  // держится clamp-ом до конца жеста И весь улёт карточки (position.x на улёте
  // уходит за ±width*1.15), то есть вплоть до подмены карточки.
  /**
   * зачем: вертикаль всегда шла с коэффициентом 0.16 — карточка не должна
   * уезжать из-под пальца вверх/вниз. Раньше он применялся при ЗАПИСИ
   * (`position.setValue({ y: gesture.dy * 0.16 })`), но нативный
   * `Animated.event` пишет сырой `dy`, поэтому гасим на ПРИМЕНЕНИИ — жест
   * ощущается ровно как прежде, только теперь целиком на UI-потоке.
   */
  const dragTranslateY = useMemo(
    () => position.y.interpolate({ inputRange: [-1, 1], outputRange: [-0.16, 0.16] }),
    [position.y],
  );

  const badgeFullAt = swipeBadgeFullAtPx(width);
  const badgeStartAt = Math.max(6, Math.round(badgeFullAt * 0.25));
  const yesOpacity = position.x.interpolate({
    inputRange: [badgeStartAt, badgeFullAt],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const noOpacity = position.x.interpolate({
    inputRange: [-badgeFullAt, -badgeStartAt],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const toggleSource = useCallback((sourceId: string) => {
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  // зачем 2026-08-02 (владелец: «в разделе карточки при отмечании наборов»
  // не добраться до кнопки): кнопка запуска стояла НАД списком наборов. Наборов
  // бывает два десятка — человек прокручивал вниз, отмечал нужные, а кнопка
  // оставалась далеко вверху за экраном. На маленьких экранах это читалось как
  // «кнопки нет». Теперь кнопка закреплена внизу и всегда под большим пальцем,
  // а список прокручивается под ней.
  const renderSelectStartButton = () => {
    // зачем (владелец 01.10): подписи «Загружаем наборы…» нет — пока наборы грузятся, кнопка просто
    // приглушена с обычной подписью «Начать».
    const startBlockReason = loadingSources
      ? { label: text.start, icon: 'play' as const }
      : starting
        ? { label: text.startStarting, icon: 'sparkles-outline' as const }
        : selectedSources.length === 0
          ? { label: text.startNoSelection, icon: 'albums-outline' as const }
          : null;
    return (
      <View style={{ position: 'relative', width: '100%' }}>
        <DuoPressable
          onPress={startSession}
          disabled={startBlockReason != null}
          edgeColor={swipeGlass.accentGraphic}
          wrapStyle={{ width: '100%' }}
          style={[
            styles.heroStart,
            {
              // marginTop из heroStart нужен, когда кнопка стоит в потоке под
              // блоком выше. В закреплённой панели он даёт лишний зазор.
              marginTop: 0,
              backgroundColor: startBlockReason ? t.bgSurface2 : t.accent,
              opacity: startBlockReason ? 0.72 : 1,
            },
          ]}
        >
          <Ionicons name={startBlockReason?.icon ?? 'play'} size={20} color={startBlockReason ? t.accentText : t.textOnGold} />
          <Text style={[styles.heroStartText, { color: startBlockReason ? t.accentText : t.textOnGold, fontSize: f.body }]}>
            {startBlockReason?.label ?? text.start}
          </Text>
        </DuoPressable>
        {/* зачем (PM-086, владелец 2026-09-24): ценник энергии над кнопкой
            старта убран — расход энергии не меняется. */}
      </View>
    );
  };

  const renderSelect = () => (
    <View style={styles.selectRoot}>
    <Animated.ScrollView
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: topFadeScrollY } } }], { useNativeDriver: true })}
      contentContainerStyle={[
        styles.selectContent,
        {
          // Отступ снизу = высота закреплённой панели с кнопкой, иначе последний
          // набор в списке оказывался под ней и его нельзя было отметить.
          paddingBottom: Math.max(28, bottomInset + 28) + SELECT_START_BAR_HEIGHT,
          paddingHorizontal: ds.spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        {/* зачем (cards-gaps-states, решение координатора 12.10): стрелка назад — круглая кнопка «Тени», как на других экранах Карточек */}
        <CardsGlassRoundButton
          g={swipeGlass}
          testID="fc-swipe-select-back"
          label={triLang(lang, {
            ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
          icon="arrow-back"
          onPress={() => safeRouterBack(router, '/flashcards' as any)}
        />
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary }]}>{text.settingsTitle}</Text>

      {/* зачем (аудит cards-gaps-states): без черновика карточка пуста — рисовалась пустая плашка ~32 px между заголовком и «Наборы»; в образце её нет */}
      <View style={pendingDraft ? [styles.heroCard, { backgroundColor: glassFill(t.bgSurface, 0.46), shadowColor: t.cardShadow }] : styles.heroCardEmpty}>
        {/* зачем (владелец 11.10, журнал 12): блока с названием механики подбора на экране нет — убраны заголовок, подпись и три счётчика; остались только кнопки запуска. Механика подбора карточек не менялась. */}
        {/* зачем: раньше кнопка просто гасла (opacity 0.72) без единого слова о причине —
            «Кнопка начать не сработала» (репорт 25.07). Теперь сама подпись говорит,
            чего ждать или что сделать: грузятся наборы / не выбран набор / идёт запуск.
            Геометрия не меняется — только текст и иконка, прыжка лэйаута нет. */}
        {/* зачем (жалоба владельца 26.07): найденный черновик РАНЬШЕ применялся
            сам — экран выбора мигал и тут же прыгал в тренировку без спроса.
            Теперь решение за юзером: «Продолжить» возвращает в незаконченную
            сессию, кнопка старта рядом начинает новую. Данные уже в памяти,
            переход мгновенный. */}
        {pendingDraft && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <DuoPressable
              onPress={resumePendingDraft}
              edgeColor={swipeGlass.accentGraphic}
              style={[styles.heroStart, { backgroundColor: t.accent }]}
            >
              <Ionicons name="play-forward" size={20} color={t.textOnGold} />
              <Text style={[styles.heroStartText, { color: t.textOnGold, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: 'Продолжить тренировку',
                  en: 'Continue training',
                  uk: 'Продовжити тренування',
                  es: 'Continuar entrenamiento',
                  'pt-BR': 'Continuar treino',
                  vi: 'Tiếp tục luyện tập',
                  id: 'Lanjutkan latihan',
                  tr: 'Antrenmana devam et',
                  pl: 'Kontynuuj trening',
                })}
              </Text>
            </DuoPressable>
            <TouchableOpacity
              onPress={discardPendingDraft}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Начать заново',
                en: 'Start over', uk: 'Почати заново', es: 'Empezar de nuevo',
                'pt-BR': 'Começar de novo', vi: 'Bắt đầu lại', id: 'Mulai ulang',
                tr: 'Baştan başla', pl: 'Zacznij od nowa',
              })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Начать заново',
                  en: 'Start over',
                  uk: 'Почати заново',
                  es: 'Empezar de nuevo',
                  'pt-BR': 'Começar de novo',
                  vi: 'Bắt đầu lại',
                  id: 'Mulai ulang',
                  tr: 'Baştan başla',
                  pl: 'Zacznij od nowa',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.segmentLabel, { color: t.textMuted }]}>{text.sourcesTitle}</Text>

      {loadError ? (
        <Text style={[styles.errorText, { color: t.wrong }]}>{loadError}</Text>
      ) : null}

      {sourcesExhausted && sources.length === 0 ? (
        <View testID="fc-swipe-sources-unavailable" style={[styles.loadingBox, { gap: 12 }]}>
          <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>{triLang(lang, {
            ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now', es: 'No disponible ahora',
            'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne',
          })}</Text>
          <TouchableOpacity
            testID="fc-swipe-sources-try-again"
            accessibilityRole="button"
            onPress={() => retrySourcesAfterUnavailable('tap')}
            activeOpacity={0.8}
            style={{ minHeight: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: glassFill(t.bgSurface, 0.46) }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>{triLang(lang, {
              ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo',
              'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
            })}</Text>
          </TouchableOpacity>
        </View>
      ) : loadingSources && sources.length === 0 ? (
        <View style={styles.loadingBox}>
          <Ionicons name="albums-outline" size={26} color={t.accentText} />
        </View>
      ) : sources.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: glassFill(t.bgSurface, 0.32) }]}>
          <Ionicons name="albums-outline" size={26} color={t.textMuted} />
          <Text style={[styles.emptyTitle, { color: t.textPrimary, fontSize: f.body }]}>{text.noCardsTitle}</Text>
          <Text style={[styles.emptyText, { color: t.textMuted, fontSize: f.caption }]}>{text.noCardsSub || text.empty}</Text>
        </View>
      ) : (
        <View style={styles.sourceList}>
          {sources.map((source) => {
            const selected = selectedIds.has(source.id);
            const selectedAccent = t.accentGraphic ?? t.accent; // зачем (светлый акцент): круг выбора набора — графика
            return (
              <TouchableOpacity
                key={source.id}
                onPress={() => toggleSource(source.id)}
                activeOpacity={0.88}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                // зачем (cards-gaps-states `.gs-src`, решение координатора 12.10): строка набора — плашка «Тени» с тенью; выбранная приподнята на RAISED_LIFT
                style={[
                  styles.sourceRow,
                  { boxShadow: selected ? raisedBoxShadow(swipeGlass) : plateBoxShadow(swipeGlass) },
                  selected && { transform: [{ translateY: RAISED_LIFT }] },
                ]}
              >
                <PlateFill g={swipeGlass} radius={18} raised={selected} />
                <View style={[styles.sourceIcon, { backgroundColor: swipeGlass.opaqueControl }]}>
                  <Ionicons name={source.icon as any} size={21} color={selected ? swipeGlass.text : swipeGlass.secondary} />
                </View>
                <View style={styles.sourceTextBox}>
                  {/* зачем: text-integrity — название и подпись набора переносятся, ряд растёт. */}
                  <FlowText testID={`flashcards-source-title-${source.id}`} provenance="authored" style={[styles.sourceTitle, { color: t.textPrimary }]}>
                    {source.title}
                  </FlowText>
                  <FlowText testID={`flashcards-source-subtitle-${source.id}`} provenance="authored" style={[styles.sourceSubtitle, { color: t.textMuted }]}>
                    {source.subtitle} · {cardCountLabel(lang, source.count)}
                  </FlowText>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: 'transparent',
                      backgroundColor: selected ? selectedAccent : swipeGlass.opaqueControl,
                    },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color={t.textOnGold} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
      {/* Закреплённая панель: кнопка запуска всегда под большим пальцем, сколько
          бы наборов ни было в списке. */}
      {/* зачем (журнал 27, «подложка под кнопкой просвечивает»): сплошной цвет НИЗА фона экрана (bgGradient[1]), без прозрачности — раньше
          здесь был bgSurface с альфой .94: серая плита светлее/темнее страницы и просвет строк списка. Над панелью — короткое затухание. */}
      <View pointerEvents="none" style={[styles.selectStartFade, { bottom: selectStartBarHeight }]}>
        <LinearGradient colors={[`${selectStartBarColor}00`, selectStartBarColor]} style={StyleSheet.absoluteFill} />
      </View>
      <View
        onLayout={(e) => setSelectStartBarHeight(e.nativeEvent.layout.height)}
        style={[
          styles.selectStartBar,
          {
            paddingHorizontal: ds.spacing.lg,
            paddingBottom: Math.max(12, bottomInset + 12),
            // Обводки нет, отделяем тоном (правило владельца: без рамок).
            backgroundColor: selectStartBarColor,
          },
        ]}
      >
        {renderSelectStartButton()}
      </View>
    </View>
  );

  const renderTrueFalsePlay = () => {
    if (!currentPrompt) return null;
    const devAnswerTarget = getDevAnswerTarget();
    const total = Math.max(1, stats.total);
    const completedBeforeCurrent = Math.max(
      0,
      stats.mastered - (feedback?.kind === 'correct' && feedback.mastered ? 1 : 0),
    );
    const currentNumber = Math.min(total, Math.max(1, completedBeforeCurrent + 1));
    const trueFalseProgress = Math.min(100, Math.round((currentNumber / total) * 100));
    const selectedMatch = feedback
      ? (feedback.kind === 'correct' ? currentPrompt.isMatch : !currentPrompt.isMatch)
      : null;
    const verdictCorrect = feedback?.kind === 'correct';
    const title = triLang(lang, {
      ru: 'Правда / ложь', en: 'True / false', uk: 'Правда / хиба', es: 'Verdadero / falso',
      'pt-BR': 'Verdadeiro / falso', vi: 'Đúng / sai', id: 'Benar / salah', tr: 'Doğru / yanlış', pl: 'Prawda / fałsz',
    });
    const subtitle = triLang(lang, {
      ru: 'Набор карточек', en: 'Card deck', uk: 'Набір карток', es: 'Mazo de tarjetas',
      'pt-BR': 'Baralho de cartões', vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart destesi', pl: 'Zestaw kart',
    });
    const question = triLang(lang, {
      ru: 'Этот перевод подходит?', en: 'Does this translation match?', uk: 'Цей переклад підходить?', es: '¿Coincide esta traducción?',
      'pt-BR': 'Esta tradução corresponde?', vi: 'Bản dịch này có phù hợp không?', id: 'Apakah terjemahan ini cocok?', tr: 'Bu çeviri eşleşiyor mu?', pl: 'Czy to tłumaczenie pasuje?',
    });
    const continueLabel = triLang(lang, {
      ru: 'Продолжить', en: 'Continue', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar',
      vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj',
    });
    const verdict = verdictCorrect
      ? triLang(lang, {
          ru: `Верно — ${currentPrompt.isMatch ? 'перевод совпадает' : 'чужой перевод'}`,
          en: `Correct — ${currentPrompt.isMatch ? 'the translation matches' : 'it is a different translation'}`,
          uk: `Правильно — ${currentPrompt.isMatch ? 'переклад збігається' : 'це чужий переклад'}`,
          es: `Correcto — ${currentPrompt.isMatch ? 'la traducción coincide' : 'es otra traducción'}`,
          'pt-BR': `Correto — ${currentPrompt.isMatch ? 'a tradução corresponde' : 'é outra tradução'}`,
          vi: `Đúng — ${currentPrompt.isMatch ? 'bản dịch phù hợp' : 'đây là bản dịch khác'}`,
          id: `Benar — ${currentPrompt.isMatch ? 'terjemahan cocok' : 'ini terjemahan lain'}`,
          tr: `Doğru — ${currentPrompt.isMatch ? 'çeviri eşleşiyor' : 'bu farklı bir çeviri'}`,
          pl: `Dobrze — ${currentPrompt.isMatch ? 'tłumaczenie pasuje' : 'to inne tłumaczenie'}`,
        })
      : triLang(lang, {
          ru: `Неверно. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          en: `Incorrect. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          uk: `Неправильно. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          es: `Incorrecto. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          'pt-BR': `Incorreto. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          vi: `Sai. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          id: `Salah. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          tr: `Yanlış. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
          pl: `Nieprawidłowo. ${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
        });

    // зачем (Карточки 2.0 12.10, cards-v2.html `tf`): кнопки «Ложь» и «Правда» — круги 76 с подписью под ними; после ответа их место занимает панель исхода.
    const falseLabel = triLang(lang, { ru: 'Ложь', uk: 'Неправда', en: 'False', es: 'Falso', 'pt-BR': 'Falso', vi: 'Sai', id: 'Salah', tr: 'Yanlış', pl: 'Fałsz' });
    const trueLabel = triLang(lang, { ru: 'Правда', uk: 'Правда', en: 'True', es: 'Verdadero', 'pt-BR': 'Verdadeiro', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Prawda' });
    const resultOk = triLang(lang, { ru: 'Верно', uk: 'Правильно', en: 'Correct', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Dobrze' });
    const resultNo = triLang(lang, { ru: 'Неверно', uk: 'Неправильно', en: 'Incorrect', es: 'Incorrecto', 'pt-BR': 'Incorreto', vi: 'Sai', id: 'Salah', tr: 'Yanlış', pl: 'Nieprawidłowo' });
    const nextLabel = triLang(lang, { ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' });
    const answersLocked = Boolean(feedback) || attempts.state.phase !== 'active';
    // зачем (координатор 18.10, Optimistic UI): ответ «Правда / Ложь» → кадр с вердиктом (сеть не участвует, память пишется фоном).
    const decide = (saysMatch: boolean) => {
      markCardsOptimisticTap('answer_tap', 'truefalse', { saysMatch, locked: answersLocked });
      if (!answersLocked) {
        answerCurrent(saysMatch);
        logCardsOptimisticFrame('answer_tap', 'verdict_frame');
      }
    };
    const continueWithFly = () => {
      if (tfContinuingRef.current) return;
      const card = tfCardRef.current;
      if (!card || !feedback) { continueAfterFeedback(); return; }
      tfContinuingRef.current = true;
      void hapticTap();
      card.flyOut(selectedMatch ? 1 : -1, () => { tfContinuingRef.current = false; continueAfterFeedback(); });
    };

    return (
      <View style={[styles.trueFalseRoot, { paddingHorizontal: ds.spacing.lg, paddingBottom: Math.max(14, bottomInset + 10) }]}>
        {/* зачем (Карточки 2.0 12.10, `sessHdr`): ✕ · название · справа попытки и руны (как в Блице); подзаголовка и пилюли энергии в макете нет */}
        <View testID="flashcards-truefalse-header">
          <PracticeSessionHeader
            glass={swipeGlass}
            color={t.textPrimary}
            onBack={exitTraining}
            backIcon="close"
            backLabel={triLang(lang, { ru: 'Выйти из тренировки', en: 'Exit training', uk: 'Вийти з тренування', es: 'Salir de la práctica', 'pt-BR': 'Sair do treino', vi: 'Thoát luyện tập', id: 'Keluar dari latihan', tr: 'Alıştırmadan çık', pl: 'Wyjdź z treningu' })}
            title={title}
            tools={(
              <>
                <SessionAttemptsHud remaining={attempts.state.remainingAttempts} attempts={attempts} locale={lang} testID="flashcards-truefalse-attempts-hud" />
                <View ref={runeFlight.counterRef} collapsable={false}>
                  <PracticeRuneCounter runes={practiceRunes.runes} lang={lang} backgroundColor={t.bgCard} color={t.textPrimary} testID="flashcards-truefalse-practice-runes" />
                </View>
              </>
            )}
          />
        </View>

        {/* зачем (practice.html «Правда / ложь»): полоса 6 px и строка «номер … всего» под ней —
            реальные номер карточки и размер сессии, как и раньше. */}
        <View style={styles.trueFalseProgressRow}>
          <PracticeProgressRow
            glass={swipeGlass}
            testID="flashcards-truefalse-progress"
            flush
            progress={trueFalseProgress / 100}
            left={String(currentNumber)}
            right={String(total)}
          />
        </View>

        <View ref={runeFlight.originRef} collapsable={false} style={styles.trueFalseBody}>
          {/* `.swz` макета: карточку смахивают вправо («Правда») и влево («Ложь»); вопрос «Этот перевод подходит?» читается диктором как метка карточки */}
          <View testID="flashcards-truefalse-prompt">
            <TrueFalseSwipeCard
              ref={tfCardRef}
              g={swipeGlass}
              promptKey={currentPrompt.id}
              word={s(currentPrompt.card.en) || text.brokenCardPhrase}
              translation={currentPrompt.shownTranslation}
              stampTrue={trueLabel}
              stampFalse={falseLabel}
              disabled={answersLocked}
              committed={feedback ? { dir: selectedMatch ? 1 : -1, ok: Boolean(verdictCorrect) } : null}
              onDecide={decide}
              accessibilityLabel={`${question}. ${s(currentPrompt.card.en) || text.brokenCardPhrase} — ${currentPrompt.shownTranslation}`}
            />
          </View>

          {feedback ? null : (
            <View style={styles.trueFalseAnswers}>
              {[
                { key: 'false', saysMatch: false, label: falseLabel, icon: 'close' as const, testID: 'flashcards-truefalse-answer-false', a11y: text.mismatchAction },
                { key: 'true', saysMatch: true, label: trueLabel, icon: 'checkmark' as const, testID: 'flashcards-truefalse-answer-true', a11y: text.matchAction },
              ].map((btn) => (
                <TouchableOpacity
                  key={btn.key}
                  // зачем (Авторизация 12.10, cards-v2-038 / cards-section-049): утверждение случайно, робот не знает ответ. dev `answer=correct|wrong`
                  // помечает нужную кнопку `flashcards-truefalse-answer-target`; без подмены и в сторе getDevAnswerTarget() === null — обычные testID.
                  testID={devAnswerTarget !== null && currentPrompt && (btn.saysMatch === currentPrompt.isMatch) === (devAnswerTarget === 'correct') ? 'flashcards-truefalse-answer-target' : btn.testID}
                  onPress={() => decide(btn.saysMatch)}
                  disabled={answersLocked}
                  accessibilityRole="button"
                  accessibilityLabel={btn.a11y}
                  activeOpacity={0.75}
                  style={styles.trueFalseAnswerCol}
                >
                  <View style={[styles.trueFalseAnswer, { backgroundColor: swipeGlass.opaqueControl, boxShadow: plateBoxShadow(swipeGlass) }]}>
                    <Ionicons name={btn.icon} size={28} color={t.textPrimary} />
                  </View>
                  <Text style={[styles.trueFalseAnswerLabel, { color: swipeGlass.secondary }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* зачем (`.bot` + `.ans` макета): после ответа внизу панель исхода «Верно / Неверно» с эталоном и «Дальше» */}
        {feedback ? (
          <View style={styles.trueFalseBot}>
            <LinearGradient pointerEvents="none" colors={[`${swipeGlass.bgBottom}00`, swipeGlass.bgBottom]} locations={[0, 0.3]} style={StyleSheet.absoluteFill} />
            <View
              testID="flashcards-truefalse-verdict"
              accessibilityRole="alert"
              accessibilityLabel={verdict}
              style={[styles.trueFalseAns, { backgroundColor: verdictCorrect ? swipeGlass.goodSoft : swipeGlass.badSoft, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: `${verdictCorrect ? swipeGlass.good : swipeGlass.bad}52` }] /* shadow-ok: кольцо исхода ответа «верно/неверно» (состояние) */ }]}
            >
              <View style={[styles.trueFalseVk, { backgroundColor: verdictCorrect ? swipeGlass.goodSoft : swipeGlass.badSoft }]}>
                <Ionicons name={verdictCorrect ? 'checkmark' : 'close'} size={20} color={verdictCorrect ? swipeGlass.good : swipeGlass.bad} />
              </View>
              <View style={styles.trueFalseAnsCopy}>
                <Text style={[styles.trueFalseAnsKicker, { color: swipeGlass.secondary }]}>{verdictCorrect ? resultOk : resultNo}</Text>
                <FlowText testID="true-false-verdict" provenance="authored" style={[styles.trueFalseAnsValue, { color: verdictCorrect ? swipeGlass.good : swipeGlass.text }]}>{`${s(currentPrompt.card.en)} — ${currentPrompt.trueTranslation}`}</FlowText>
              </View>
            </View>
            <PracticeCta
              glass={swipeGlass}
              testID="flashcards-truefalse-continue"
              label={nextLabel}
              onPress={continueWithFly}
            />
          </View>
        ) : null}
        {attempts.state.phase !== 'active' ? <View pointerEvents="auto" style={styles.attemptsInputBlocker} /> : null}
        {runeFlight.flight ? (
          <CoinRewardFlight key={runeFlight.flight.key} from={runeFlight.flight.from} to={runeFlight.flight.to} count={runeFlight.flight.count} onDone={runeFlight.clearFlight} />
        ) : null}
      </View>
    );
  };

  const renderPlay = () => {
    if (isTrueFalseSession) return renderTrueFalsePlay();
    if (!currentPrompt) return null;
    // зачем: trueTranslation уже показан в блоке «правильный перевод» — не дублируем
    // его внутри заметки-примера.
    const note = detailNoteForCard(currentPrompt.card, cardContentLang, currentPrompt.trueTranslation);
    const transcription = s(currentPrompt.card.transcription);
    // зачем (владелец 18.10 через координатора, коммит Дизайна 4d65c8be5): длинные фразы из видео должны целиком помещаться на карточке —
    // кегль вниз до 14 по расчёту длины и места, перенос по словам, без «…» и без adjustsFontSizeToFit. Короткая фраза — прежний размер.
    // Место под фразу: карточка минус шапка, плашка перевода, поля и подпись (оценка от тех же стилей, без замера — первый кадр без прыжка).
    const phraseBaseSize = isCompactFlashcardsTask ? Math.min(20, f.h2) : Math.min(24, f.h1 + 1);
    const phraseMaxH = cardHeight - (isCompactFlashcardsTask ? 158 : 225) - (transcription ? 26 : 0);
    // зачем (Макеты 18.10, риск C9): при системном шрифте 1,3 текст рисуется крупнее расчёта — масштаб тот же, что в списке карточек (FlashcardListItem)
    const phraseFontScale = Math.min(Math.max(fontScale, 1), 1.35);
    const phraseSize = fitPhraseFontSize({ text: s(currentPrompt.card.en), baseSize: phraseBaseSize, widthPx: cardWidth - 40, maxHeightPx: phraseMaxH, fontScale: phraseFontScale });
    const phraseLineHeight = phraseSize === phraseBaseSize ? undefined : Math.round(phraseSize * 1.3);
    const reportDataText = [
      `EN: ${currentPrompt.card.en}`,
      `${text.shownTranslation} ${currentPrompt.shownTranslation}`,
      `${text.correctTranslation}: ${currentPrompt.trueTranslation}`,
    ]
      .filter((line) => s(line))
      .join('\n');
    return (
      <View style={[styles.playWrap, isCompactFlashcardsTask && styles.compactPlayWrap, { paddingHorizontal: ds.spacing.lg, paddingBottom: isCompactFlashcardsTask ? Math.max(8, bottomInset + 6) : Math.max(14, bottomInset + 10) }]}>
        {/* зачем (координатор 11.10, макета swipe нет — равняемся на Блиц/«Вспомни»): шапка одной строкой — назад · «Закреплено» · сердца · монеты;
            раньше сердца и монеты шли отдельной строкой над «назад», счётчик стоял по центру. Все testID сохранены, пустая «заглушка»
            под счётчик не нужна. */}
        <PracticeSessionHeader
          glass={swipeGlass}
          color={t.textPrimary}
          compact={isCompactFlashcardsTask}
          onBack={exitTraining}
          backLabel={triLang(lang, {
              ru: 'Выйти из тренировки',
              en: 'Exit training',
              uk: 'Вийти з тренування',
              es: 'Salir de la práctica',
              'pt-BR': "Sair do treino",
              vi: "Thoát luyện tập",
              id: "Keluar dari latihan",
              tr: "Alıştırmadan çık",
              pl: "Wyjdź z treningu",
            })}
          title={isCompactFlashcardsTask ? `${stats.mastered}/${stats.total}` : text.mastered}
          tools={(
            <>
              <SessionAttemptsHud
                remaining={attempts.state.remainingAttempts} attempts={attempts}
                locale={lang}
                testID="flashcards-swipe-attempts-hud"
              />
              <View ref={runeFlight.counterRef} collapsable={false}>
                <PracticeRuneCounter
                  runes={practiceRunes.runes}
                  lang={lang}
                  backgroundColor={swipeGlass.opaqueControl}
                  color={t.textPrimary}
                  testID="flashcards-swipe-practice-runes"
                />
              </View>
            </>
          )}
        >
          {isCompactFlashcardsTask ? null : (
            // зачем (Сверка 03:10): «2/536 · 534 в очереди» переносилось на 2 строки и липло к «‹»; «в очереди» ≈ всего − закреплено,
            // то есть дублирует полосу — оставляем одну короткую строку «N/M», как подпись одной строкой у Блица/«Вспомни».
            <Text numberOfLines={1} style={{ color: swipeGlass.secondary, fontSize: f.caption, lineHeight: 17, marginTop: 2 }}>
              {`${stats.mastered}/${stats.total}`}
            </Text>
          )}
          {stats.streak >= 3 ? (
            <View style={[styles.headerStreakPill, { backgroundColor: `${t.gold}22`, borderColor: 'transparent' }]}>
              <Ionicons name="flame-outline" size={12} color={t.accentText} />
              <Text style={[styles.headerStreakText, { color: t.accentText, fontSize: f.caption }]}>
                {text.streakLabel} {stats.streak}
              </Text>
            </View>
          ) : null}
        </PracticeSessionHeader>

        <View style={[styles.progressTrack, isCompactFlashcardsTask && styles.compactProgressTrack, { backgroundColor: t.bgSurface2 }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as `${number}%`, backgroundColor: swipeGlass.accentGraphic }]} />
        </View>

        {/* Первое знакомство с экраном — одноразовая подсказка, схема как flashcardsDeleteHintSeenKey */}
        {swipeIntro ? <FeatureIntroModal
          visible={showSwipeHint && swipeIntroActive}
          family="orbit"
          art="cards_swipe"
          icon={swipeIntro.icon}
          title={swipeIntro.title(lang)}
          body={swipeIntro.body(lang)}
          ctaLabel={swipeIntro.ctaLabel(lang)}
          laterLabel={text.dismissHint}
          onDone={dismissSwipeHint}
          onLater={dismissSwipeHint}
          testIdPrefix="swipe-intro"
          introId={swipeIntro.id}
        /> : null}

        {/* Источник полёта рун (владелец, 2026-08-27) */}
        <View ref={runeFlight.originRef} collapsable={false} style={[styles.cardStage, isCompactFlashcardsTask && styles.compactCardStage]}>
          {queue[1] ? (
            <Animated.View
              style={[
                styles.cardBack,
                {
                  width: cardWidth,
                  minHeight: cardHeight,
                  backgroundColor: swipeGlass.card,
                },
                {
                  // зачем: поза подложки больше не статична — на улёте она доезжает
                  // до позы верхней карточки (scale 1, translateY 0, opacity 1), и
                  // подмена карточки происходит уже за совпавшей геометрией.
                  opacity: riseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1],
                  }),
                  transform: [
                    {
                      scale: riseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                    {
                      translateY: riseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <SwipeTrainingCardGlass chrome={swipeGlass} />
            </Animated.View>
          ) : null}
          <Animated.View
            key={currentPrompt.id}
            {...(isCompactFlashcardsTask ? {} : panResponder.panHandlers)}
            style={[
              styles.trainingCard,
              isCompactFlashcardsTask && styles.compactTrainingCard,
              {
                width: cardWidth,
                minHeight: cardHeight,
                // The feedback pane is independently capped and scrollable. Before it
                // appears, let the card grow so a long localized translation remains
                // readable on compact screens instead of being clipped by this cap.
                maxHeight: feedback ? cardMaxHeight : undefined,
                overflow: feedback ? 'hidden' : 'visible',
                // зачем: обводка заменена на тон+тень — рамки вокруг блоков запрещены
                // в проекте. Результат ответа теперь читается по подложке карточки и
                // цвету тени, а не по контуру: мягче и «дороже», сигнал не потерян.
                backgroundColor: feedback
                  ? (feedback.kind === 'wrong' ? t.wrongBg : t.correctBg)
                  : swipeGlass.card,
                shadowColor: feedback
                  ? (feedback.kind === 'wrong' ? t.wrong : t.gold)
                  : t.cardShadow,
              },
              {
                transform: [{ translateX: position.x }, { translateY: dragTranslateY }, { rotate }],
                // зачем: A-39 — карта растворяется на улёте, а не пропадает резко.
                opacity: flyOpacity,
              },
            ]}
          >
            <SwipeTrainingCardGlass chrome={swipeGlass} sheen={!feedback} />
            <Animated.View style={[styles.swipeBadge, styles.noBadge, { opacity: noOpacity, borderColor: 'transparent', backgroundColor: glassFill(t.wrong, 0.14) }]}>
              <Text style={[styles.swipeBadgeText, { color: t.wrong }]}>{text.mismatch}</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeBadge, styles.yesBadge, { opacity: yesOpacity, borderColor: 'transparent', backgroundColor: glassFill(t.correct, 0.14) }]}>
              <Text style={[styles.swipeBadgeText, { color: t.correct }]}>{text.match}</Text>
            </Animated.View>

            <View style={[styles.cardTopLine, isCompactFlashcardsTask && styles.compactCardTopLine]}>
              <View
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => false}
                onResponderTerminationRequest={() => false}
                style={styles.cardReportHitbox}
              >
                <ReportErrorButton
                  screen="flashcards_swipe"
                  dataId={`flashcard_${currentPrompt.card.id ?? 'unknown'}`}
                  dataText={reportDataText}
                  variant="icon-flag"
                  accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', en: 'Report a card error', uk: 'Повідомити про помилку в картці', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w karcie' })}
                  testID="flashcards-swipe-report"
                />
              </View>
              <View
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => false}
                onResponderTerminationRequest={() => false}
                onResponderRelease={speakCurrentCard}
                style={styles.speakButtonHitbox}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Озвучить карточку',
                  en: 'Play card audio',
                  uk: 'Озвучити картку',
                  es: 'Escuchar tarjeta',
                  'pt-BR': 'Ouvir cartão',
                  vi: 'Nghe thẻ',
                  id: 'Dengarkan kartu',
                  tr: 'Kartı dinle',
                  pl: 'Odsłuchaj kartę',
                })}
              >
                <View style={[styles.speakButton, isCompactFlashcardsTask && styles.compactSpeakButton, { backgroundColor: t.bgCard }]}>
                  <Ionicons name="volume-high-outline" size={isCompactFlashcardsTask ? 16 : 18} color={t.accentText} />
                </View>
              </View>
            </View>

            <View style={[styles.enBox, isCompactFlashcardsTask && styles.compactEnBox]}>
              <Text style={[styles.enLabel, { color: t.textMuted, fontSize: f.caption }]}>{text.phraseLabel}</Text>
              <FlowText
                testID="flashcards-swipe-prompt"
                provenance="authored"
                style={[styles.englishText, isCompactFlashcardsTask && styles.compactEnglishText, { color: t.textPrimary, fontSize: phraseSize }, phraseLineHeight ? { lineHeight: phraseLineHeight } : null]}
                // зачем: adjustsFontSizeToFit запрещён (Performance Bible/владелец) — сжатие
                // теряло слово при системном увеличении шрифта на Android («to work» → «to»).
                // Вместо сжатия: чуть меньший базовый fontSize и свободный перенос —
                // вся карточка прокручивается, поэтому фраза остаётся целой.
              >
                {/* зачем: если у карточки в данных пустой en, enBox (flex:1, center) не
                    схлопывается — карточка превращалась в пустой серый прямоугольник без
                    единого слова (репорты «Не видна карточка с вопросом» 18 и 24.07).
                    Корень в данных пока не найден, поэтому здесь честная заглушка вместо
                    пустоты: человек видит, что карточка битая, и может её отметить. */}
                {s(currentPrompt.card.en) || text.brokenCardPhrase}
              </FlowText>
              {transcription ? (
                <Text style={[styles.transcriptionText, { color: t.textMuted, fontSize: f.caption }]}>
                  {transcription}
                </Text>
              ) : null}
            </View>

            <View style={[styles.translationBox, isCompactFlashcardsTask && styles.compactTranslationBox, { backgroundColor: glassFill(t.bgCard, 0.32) }]}>
              <Text style={[styles.translationLabel, { color: t.textMuted, fontSize: f.caption }]}>
                {text.shownTranslation}
              </Text>
              <Text
                style={[styles.translationText, isCompactFlashcardsTask && styles.compactTranslationText, { color: t.accentText, fontSize: isCompactFlashcardsTask ? f.body : f.bodyLg }]}
              >
                {currentPrompt.shownTranslation}
              </Text>
            </View>

            {feedback ? (
              <ScrollView decelerationRate="fast"
                style={[
                  styles.feedbackBox,
                  isCompactFlashcardsTask && styles.compactFeedbackBox,
                  styles.feedbackScroll,
                  { maxHeight: feedbackMaxHeight },
                  {
                    backgroundColor: feedback.kind === 'wrong' ? t.wrongBg : t.goldBg,
                    borderColor: 'transparent',
                  },
                ]}
                contentContainerStyle={styles.feedbackScrollContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: feedback.kind === 'wrong' ? t.wrong : t.accentText, fontSize: isCompactFlashcardsTask ? f.caption : f.body },
                  ]}
                >
                  {feedback.kind === 'wrong' ? text.wrongTitle : text.hintTitle}
                </Text>
                <Text style={[styles.feedbackLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {text.correctChoice}
                </Text>
                <FlowText testID="flashcards-feedback-answer" provenance="authored" style={[styles.feedbackAnswer, isCompactFlashcardsTask && styles.compactFeedbackAnswer, { color: t.textPrimary, fontSize: isCompactFlashcardsTask ? f.caption : f.body }]}>
                  {feedback.prompt.isMatch ? `${text.match}: ${text.matchHint}` : `${text.mismatch}: ${text.mismatchHint}`}
                </FlowText>
                <Text style={[styles.feedbackLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {text.correctTranslation}
                </Text>
                <FlowText testID="flashcards-feedback-translation" provenance="authored" style={[styles.feedbackAnswer, isCompactFlashcardsTask && styles.compactFeedbackAnswer, { color: t.textPrimary, fontSize: isCompactFlashcardsTask ? f.caption : f.body }]}>
                  {currentPrompt.trueTranslation}
                </FlowText>
                {!isCompactFlashcardsTask && <Text style={[styles.feedbackNote, { color: t.textMuted, fontSize: f.caption }]}>{text.recoveryNote}</Text>}
                {note && !isCompactFlashcardsTask ? <Text style={[styles.feedbackNote, { color: t.textMuted, fontSize: f.caption }]}>{note}</Text> : null}
              </ScrollView>
            ) : null}
          </Animated.View>
        </View>

        {feedback ? (
          <DuoPressable
            onPress={continueAfterFeedback}
            edgeColor={swipeGlass.accentGraphic}
            style={[styles.continueButton, isCompactFlashcardsTask && styles.compactContinueButton, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.continueText, { color: t.textOnGold, fontSize: isCompactFlashcardsTask ? f.caption : f.body }]}>{text.continue}</Text>
          </DuoPressable>
        ) : (
          <>
            <TouchableOpacity
              onPress={revealCurrent}
              style={[styles.revealButton, isCompactFlashcardsTask && styles.compactRevealButton, { backgroundColor: t.bgSurface }]}
            >
              <Ionicons name="eye-outline" size={18} color={t.accentText} />
              <Text style={[styles.revealText, { color: t.accentText, fontSize: f.caption }]}>{text.reveal}</Text>
            </TouchableOpacity>
            <View style={[styles.answerButtons, isCompactFlashcardsTask && styles.compactAnswerButtons]}>
              <TouchableOpacity
                onPress={() => answerCurrent(false)}
                disabled={settling}
                style={[
                  styles.answerButton,
                  isCompactFlashcardsTask && styles.compactAnswerButton,
                  {
                    backgroundColor: t.wrongBg,
                    borderColor: 'transparent',
                    opacity: settling ? 0.65 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${text.mismatchAction}. ${text.mismatch}: ${text.mismatchHint}`}
              >
                {/* FIX (владелец, 2026-08-13): кнопки ответа — только иконка,
                    без подписи «Неверно». Смысл держит accessibilityLabel. */}
                <Ionicons name="close" size={isCompactFlashcardsTask ? 24 : 28} color={t.wrong} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => answerCurrent(true)}
                disabled={settling}
                style={[
                  styles.answerButton,
                  isCompactFlashcardsTask && styles.compactAnswerButton,
                  {
                    backgroundColor: t.correctBg,
                    borderColor: 'transparent',
                    opacity: settling ? 0.65 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${text.matchAction}. ${text.match}: ${text.matchHint}`}
              >
                {/* FIX (владелец, 2026-08-13): только иконка, без подписи «Верно». */}
                <Ionicons name="checkmark" size={isCompactFlashcardsTask ? 24 : 28} color={t.correct} />
              </TouchableOpacity>
            </View>
          </>
        )}
        {attempts.state.phase !== 'active' ? (
          <View pointerEvents="auto" style={styles.attemptsInputBlocker} />
        ) : null}
        {runeFlight.flight && (
          <CoinRewardFlight
            key={runeFlight.flight.key}
            from={runeFlight.flight.from}
            to={runeFlight.flight.to}
            count={runeFlight.flight.count}
            onDone={runeFlight.clearFlight}
          />
        )}
      </View>
    );
  };

  // зачем (cards.html setupLoading/setupEmpty): служебные состояния режима в виде макета —
  // плитка 61, заголовок 20/700, текст 15; тексты и действия прежние.
  const renderQuickStart = () => (
    <View testID="flashcards-swipe-quickstart" style={[styles.quickStartWrap, { paddingHorizontal: ds.spacing.lg }]}>
      {/* зачем (аудит #22, 15.10): «Готовим…» без выхода — при зависании не уйти; стрелка назад как на пустом состоянии */}
      <View style={styles.noCardsBack}>
        <PracticeBackButton
          glass={swipeGlass}
          color={t.textPrimary}
          onPress={() => safeRouterBack(router, '/flashcards' as any)}
          testID="flashcards-swipe-quickstart-back"
          accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        />
      </View>
      <PracticeStatePanel
        glass={swipeGlass}
        icon="sparkles-outline"
        title={text.settingsTitle}
        message={text.startStarting}
      />
    </View>
  );

  const renderNoCards = () => (
    <View style={[styles.quickStartWrap, { paddingHorizontal: ds.spacing.lg }]}>
      <View style={styles.noCardsBack}>
        <PracticeBackButton
          glass={swipeGlass}
          color={t.textPrimary}
          onPress={() => safeRouterBack(router, '/flashcards' as any)}
          accessibilityLabel={triLang(lang, {
            ru: 'Назад',
            en: 'Back',
            uk: 'Назад',
            es: 'Atrás',
            'pt-BR': "Voltar",
            vi: "Quay lại",
            id: "Kembali",
            tr: "Geri",
            pl: "Wstecz",
          })}
        />
      </View>
      <PracticeStatePanel
        glass={swipeGlass}
        testID="flashcards-swipe-no-cards"
        icon="layers-outline"
        title={text.noCardsTitle}
        message={text.noCardsSub}
        action={{
          label: text.reload,
          icon: 'refresh-outline',
          onPress: () => void loadSources(),
          testID: 'flashcards-swipe-reload',
        }}
      />
    </View>
  );

  const showQuickStart =
    quickStart &&
    phase === 'select' &&
    !loadError &&
    (isDevCardsHeld('swipe_quickstart') || loadingSources || starting || (selectedSources.length > 0 && !quickStartDoneRef.current));
  const showQuickNoCards =
    quickStart &&
    phase === 'select' &&
    !quickStartDoneRef.current &&
    !loadingSources &&
    !starting &&
    selectedSources.length === 0;
  // зачем (правило владельца 01.10 и 18.10 «экранов-ошибок нигде», координатор 09:02): тренировка не подготовилась (loadError) —
  // не «Нет карточек» с текстом ошибки и облаком, а тихий уход в Карточки; настоящий пустой список остаётся обычным пустым видом.
  useSilentLeave(showQuickNoCards && Boolean(loadError), 'flashcards_swipe', 'prepare_failed', exitTraining);

  const renderScreen = () => {
    if (showQuickStart) return renderQuickStart();
    if (showQuickNoCards) return renderNoCards();
    if (phase === 'select') return renderSelect();
    return renderPlay();
  };

  // Entitlement hydration and resolved denial render no paid activity content.
  // The paywall effect above owns navigation; this branch owns data exposure.
  // зачем (правило 10г «нет пустого экрана», координатор 13.10): пока решение по доступу не пришло (на холодном старте у бесплатного аккаунта оно бывало долгим),
  // вместо пустого `null` — та же панель состояния, что и при старте тренировки (иконка, заголовок, «Готовим тренировку…»). Контента платной активности в ней нет,
  // fail-closed не тронут: источники, карточки и кнопки по-прежнему появляются только после accessResolved.
  if (!accessResolved) {
    return (
      <View testID="flashcards-swipe-access-pending" style={[styles.quickStartWrap, { paddingHorizontal: ds.spacing.lg }]}>
        <PracticeStatePanel glass={swipeGlass} icon="sparkles-outline" title={text.settingsTitle} message={text.startStarting} />
      </View>
    );
  }

  if (done) {
    const resultCorrect = devRunesFake ? devRunesFake.secondary : stats.correctSwipes;
    const resultWrong = devRunesFake ? devRunesFake.tertiary : stats.wrong;
    const resultScore = devRunesFake ? devRunesFake.secondary : stats.score;
    // зачем (cards-section `resMix`): над счётом «Правда / ложь · набор», ниже «Что исправить» — карточки с ошибкой.
    const tfTitle = triLang(lang, {
      ru: 'Правда / ложь', en: 'True / false', uk: 'Правда / хиба', es: 'Verdadero / falso',
      'pt-BR': 'Verdadeiro / falso', vi: 'Đúng / sai', id: 'Benar / salah', tr: 'Doğru / yanlış', pl: 'Prawda / fałsz',
    });
    const sourceTitles = Array.from(new Set(trainingCards.map((card) => card.trainingSourceTitle).filter(Boolean)));
    const resultOverline = sourceTitles.length === 1 ? `${tfTitle} · ${sourceTitles[0]}` : tfTitle;
    const resultMistakes = trainingCards
      .filter((card) => (progressRef.current[card.trainingKey]?.wrong ?? 0) > 0)
      .map((card) => ({ id: card.trainingKey, en: card.en, translation: answerFor(card), packLanguage: card.packLanguage }));
    return (
      <>
        <SessionResultScreen
          correct={resultCorrect}
          wrong={resultWrong}
          runesGained={practiceRunes.runes}
          learnLeft={0}
          overline={resultOverline}
          startedAtMs={roundStartedAtRef.current || undefined}
          mistakes={resultMistakes}
          onRetryWrong={() => { void startSession(); }}
          onDone={exitFromResult}
          retryLabel={text.nextRound}
          scoreText={`${text.scoreLabel}: ${resultScore}`}
          testID="flashcards-swipe-result"
        />
        {/* зачем (аудит #20, 15.10): «Следующий раунд» при нуле энергии открывает NoEnergyModal, но в ветке итога окно не было смонтировано — тап «ничего не делал» */}
        <NoEnergyModal variant="learn" visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} activity="flashcards" />
      </>
    );
  }

  return (
    <ScreenGradient artBackdrop="flashcards" topFade={{ scrollY: topFadeScrollY }}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <SafeAreaView style={[styles.safe, { paddingTop: topSafeInset }]} edges={['left', 'right', 'bottom']}>
        <ContentWrap>
          <View style={styles.screen}>
            {renderScreen()}
            {correctTranslationReminder ? (
              <Animated.View
                pointerEvents="none"
                testID="flashcards-correct-translation-reminder"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                accessibilityLabel={`${text.correctTranslation}: ${correctTranslationReminder.english} — ${correctTranslationReminder.translation}`}
                style={[
                  styles.correctTranslationReminderToast,
                  {
                    top: isCompactFlashcardsTask ? 54 : 70,
                    backgroundColor: t.correctBg,
                    shadowColor: t.correct,
                    opacity: correctTranslationReminderAnim,
                    transform: [{
                      translateY: correctTranslationReminderAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color={t.correct} />
                <View style={styles.correctTranslationReminderCopy}>
                  <Text style={[styles.correctTranslationReminderLabel, { color: t.correct, fontSize: f.caption }]}>
                    {text.correctTranslation}
                  </Text>
                  <FlowText
                    testID="flashcards-correct-translation-reminder-copy"
                    provenance="authored"
                    style={[styles.correctTranslationReminderText, { color: t.textPrimary, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.3) }]}
                  >
                    {correctTranslationReminder.english} — {correctTranslationReminder.translation}
                  </FlowText>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </ContentWrap>
      </SafeAreaView>
      <NoEnergyModal variant="learn" visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} activity="flashcards" />
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
  selectRoot: {
    flex: 1,
  },
  /** Затухание над закреплённой панелью «Начать»: высота 22, лежит сразу над ней. */
  selectStartFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 22,
  },
  selectStartBar: {
    // Панель поверх списка, а не в потоке: список прокручивается под ней, а
    // кнопка не уезжает за экран вместе с двумя десятками наборов.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  // `.gs-title` образца cards-gaps-states: 34/40/700, разрядка −.5, отступ сверху 8
  title: {
    marginTop: 8,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 21,
  },
  heroCardEmpty: { height: 0 },
  heroCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    ...noAndroidOutline,
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
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 0,
    borderRadius: 16,
    padding: 6,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  // `.gs-lab`: 13/17/600, отступы 26 сверху, 4 по бокам и 10 снизу
  segmentLabel: {
    marginTop: 26,
    marginBottom: 10,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  segmentButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 0,
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  loadingBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    minHeight: 150,
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  sourceSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrap: {
    flex: 1,
    paddingTop: 10,
  },
  trueFalseRoot: {
    flex: 1,
    paddingTop: 10,
  },
  // зачем (practice.html `.hd`): «назад» 48, шапка 16 от верха (10 у корня + 6).
  trueFalseHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  trueFalseHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  trueFalseTitle: {
    fontWeight: '900',
  },
  trueFalseSubtitle: {
    marginTop: 2,
    fontWeight: '700',
  },
  trueFalseMetaRow: {
    minHeight: 44,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Поля задаёт корень режима — строка прогресса идёт с flush.
  trueFalseProgressRow: {
    marginTop: 14,
  },
  trueFalseProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trueFalseProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  trueFalseProgressText: {
    minWidth: 42,
    fontWeight: '800',
    textAlign: 'right',
  },
  // зачем (practice.html `.tf` margin-top 38): карточка стоит сверху под строкой прогресса, а не по центру экрана.
  trueFalseBody: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 38,
    paddingBottom: 18,
  },
  // зачем (Карточки 2.0 12.10, `.tfb`): кнопки «Ложь» / «Правда» — круги 76 с подписью 16/600 под ними, зазор между колонками 56, сверху 46
  trueFalseAnswers: {
    marginTop: 46,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 56,
  },
  trueFalseAnswerCol: {
    alignItems: 'center',
    gap: 10,
  },
  trueFalseAnswer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trueFalseAnswerLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  // `.bot`: панель исхода и «Дальше» внизу экрана (18/20/34 макета), затухание к фону
  trueFalseBot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  // `.ans`: r18, поля 14/16, зазор 14, снизу 12
  trueFalseAns: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  trueFalseVk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trueFalseAnsCopy: { flex: 1, minWidth: 0 },
  trueFalseAnsKicker: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  trueFalseAnsValue: { marginTop: 2, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  attemptsInputBlocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  compactPlayWrap: {
    paddingTop: 6,
  },
  playHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactPlayHeader: {
    minHeight: 38,
  },
  headerStats: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  compactHeaderStats: {
    gap: 0,
  },
  headerStatText: {
    fontWeight: '900',
    textAlign: 'center',
  },
  headerStreakPill: {
    marginTop: 2,
    borderWidth: 0,
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
  compactProgressTrack: {
    height: 4,
    marginTop: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  correctTranslationReminderToast: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 60,
    ...noAndroidOutline, // зачем: Android рисует квадрат вокруг скруглённой плашки без непрозрачного фона (сторож android_no_square_outline); порядок держит zIndex и место последним ребёнком
    minHeight: 58,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    ...noAndroidOutline,
  },
  correctTranslationReminderCopy: {
    flex: 1,
    minWidth: 0,
  },
  correctTranslationReminderLabel: {
    fontWeight: '900',
  },
  correctTranslationReminderText: {
    marginTop: 2,
    fontWeight: '800',
  },
  // зачем: одноразовая подсказка-баннер над карточкой — без обводки (запрещена),
  // разделяется тоном подложки (glassFill) + мягкой тенью, как остальные карточки проекта.
  swipeHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000', // theme-exempt: тень карточки — чёрная в любой теме
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    ...noAndroidOutline,
  },
  swipeHintText: {
    flex: 1,
    lineHeight: 18,
  },
  cardStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  compactCardStage: {
    paddingVertical: 6,
  },
  cardBack: {
    position: 'absolute',
    // зачем (practice.html `.qc`/`.tf`): карточки тренировок — радиус 16, как у Правды/Лжи.
    borderRadius: 16,
    // зачем: поза (scale/translateY/opacity) задаётся анимированно в рендере —
    // подложка поднимается на место верхней карточки за время её улёта. Статика
    // здесь конфликтовала бы с анимированным transform и гасила подъём.
  },
  trainingCard: {
    borderRadius: 16,
    padding: 18,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    ...noAndroidOutline,
  },
  compactTrainingCard: {
    borderRadius: 18,
    padding: 12,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    ...noAndroidOutline,
  },
  // FIX (владелец, 2026-08-13): «подпись стоит криво» — у бейджей был наклон
  // rotate ±7deg. Поворот убран полностью, обе подписи выровнены одинаково:
  // одна высота, центрирование текста внутри плашки, симметричные отступы.
  swipeBadge: {
    position: 'absolute',
    top: 18,
    zIndex: 5,
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBadge: {
    left: 18,
  },
  yesBadge: {
    right: 18,
  },
  swipeBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  cardTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  compactCardTopLine: {
    minHeight: 28,
  },
  cardReportHitbox: {
    minWidth: 36,
    height: 32,
    marginLeft: -4,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSpeakButton: {
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
  compactEnBox: {
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
  compactEnglishText: {
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  compactTranslationBox: {
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
  compactTranslationText: {
    lineHeight: 20,
  },
  feedbackBox: {
    marginTop: 12,
    borderWidth: 0,
    borderRadius: 16,
  },
  compactFeedbackBox: {
    marginTop: 8,
    borderRadius: 12,
  },
  feedbackScroll: {
    flexGrow: 0,
  },
  feedbackScrollContent: {
    padding: 12,
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
  compactFeedbackAnswer: {
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 12,
  },
  compactRevealButton: {
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
  compactAnswerButtons: {
    gap: 8,
  },
  answerButton: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  compactAnswerButton: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContinueButton: {
    minHeight: 44,
    borderRadius: 14,
  },
  continueText: {
    fontWeight: '900',
  },
  doneBox: {
    marginTop: 48,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
  },
  compactDoneBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
  },
  doneTitle: {
    marginTop: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  compactDoneTitle: {
    marginTop: 8,
  },
  doneSubtitle: {
    marginTop: 7,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  compactDoneSubtitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  doneScorePill: {
    marginTop: 14,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactDoneScorePill: {
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
  compactDoneGrid: {
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
  compactDoneStat: {
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
  compactDoneButtons: {
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
  compactDoneButton: {
    minHeight: 42,
    borderRadius: 13,
  },
  secondaryDoneButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
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

export default FlashcardsSwipeScreen;
