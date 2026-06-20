import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from './storage_mutex';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { configureAccordionLayout } from '../constants/layoutAnimation';
import { AVATARS, unlockAllFrames } from '../constants/avatars';
import AvatarView from '../components/AvatarView';
import AvatarAura from '../components/AvatarAura';
import CustomAvatarBadge from '../components/CustomAvatarBadge';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { unlockAllAchievements, ALL_ACHIEVEMENTS, devSeedAchievementsSmoke } from './achievements';
import { getMyWeekPoints } from './hall_of_fame_utils';
import { calculateResult, LeagueResult, loadLeagueState, savePendingResult, getWeekId } from './league_engine';
import {
  clearDailyTasksAdminOverride,
  getDailyTaskAdminPacks,
  getDailyTaskAdminPreviewTasks,
  getTodayKey,
  getTodayTasksSafe,
  seedDailyTasksAdminPack,
  type DailyTask,
  type DailyTaskAdminPack,
  type DailyTaskSeedMode,
} from './daily_tasks';
import RankChangeTestModal from '../components/RankChangeTestModal';
import LeagueResultModal from './LeagueResultModal';
import { registerXP } from './xp_manager';
import { useAchievement } from '../components/AchievementContext';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import { invalidatePremiumCache } from './premium_guard';
import { getTrialStatusLineForTesters, resetTrialCooldownForTesting } from './premium_trial_eligibility';
import { recomputeEarnedUnlocks } from './lesson_lock_system';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import {
  AUTH_PROMPT_SHOWN_KEY,
  getLinkedAuthInfo,
  signInWithProvider,
  signOutCurrentProvider,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
} from './auth_provider';
import { addShards, dailyTasksAllShardsRewardStorageKey, replaceShardsBalanceLocal } from './shards_system';
import { FRIEND_GIFT_CATALOG } from './friend_gifts';
import { invalidateFriendsActivityCache } from './firestore_friend_activity';
import {
  FRIENDS_TAB_SWR_CACHE_KEY,
  FRIEND_PROFILES_CACHE_KEY,
} from './friends_tab_swr_warm';
import {
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
} from './profile_card_system';
import { RankChangeModal, TIER_COLORS } from './components/RankChangeModal';
import { setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
import { actionToastTri, emitAppEvent } from './events';
import { getFreeDialogsLifetime, isAiDialogEnabled } from './ai_dialog_flags';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import NoEnergyModal from '../components/NoEnergyModal';
import ArenaLimitModal from '../components/ArenaLimitModal';
import QuizTimeoutModal from '../components/QuizTimeoutModal';
import UserWarningModal from '../components/UserWarningModal';
import ReportUserModal from '../components/ReportUserModal';
import PlayerProfileModal, { type PlayerInfo } from '../components/PlayerProfileModal';
import UpdateModal from '../components/UpdateModal';
import ReleaseNotesModal from '../components/ReleaseNotesModal';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import DailyTasksFirstVisitModal from '../components/DailyTasksFirstVisitModal';
import CertificatePreviewAdminModal from '../components/CertificatePreviewAdminModal';
import IntroFullAccessModal from '../components/IntroFullAccessModal';
import LeagueChestOpenModal from '../components/LeagueChestOpenModal';
import LeagueBonusAvailableModal from '../components/LeagueBonusAvailableModal';
import MedalToast from '../components/MedalToast';
import type { MedalTier } from './medal_utils';
import { DEV_MODE, STORE_URL } from './config';
import { setPlatformUiPreviewMode, usePlatformUiPreviewMode } from './platform_ui_preview';
import { QUIZ_E2E_OPEN_RESULTS_KEY } from './quizzes/constants';
import { frenchQuizGateCopy, quizContentAvailableForTarget } from './quiz_target_gate';
import { useMatchmakingContext } from '../contexts/MatchmakingContext';
import { seedAdminTestReviewSession } from './active_recall';
import {
  requestNotificationPermissionWithFallback,
  scheduleIntroExpiringNotification,
  scheduleUpsellNotifications,
  cancelIntroExpiringNotification,
  cancelUpsellNotifications,
} from './notifications';
import type { GlobalBroadcastModalPayload } from './global_broadcast_modal';
import { seedLocalVipSurveyTestMessage } from './app_messages';
import PremiumCelebrationModal from '../components/PremiumCelebrationModal';
import VipCelebrationModal from '../components/VipCelebrationModal';
import StreakReviveModal from '../components/StreakReviveModal';
import { markCelebrationPending } from './premium_celebration_state';
import { consumeVipCelebration, markVipCelebrationPending } from './vip_celebration_state';
import { markStreakLost, getReviveOffer, type StreakReviveOffer } from './streak_revive';
import {
  ENERGY_ZERO_COUNT_KEY, STREAK_LOST_COUNT_KEY, HARD_PAYWALL_BLOCKS_KEY,
  collectPaywallStats, pickPaywallTags,
  incrementEnergyZeroCount, incrementStreakLostCount, incrementHardPaywallBlock,
} from './paywall_personalization';
import {
  DAILY_FREE_SESSION_KEY,
} from './trainer_session';
import { clearTrainerStore, devSeedTrainerScenario } from './trainer_store';
import { devSeedActivity365Scenario } from './activity_365_analytics';
import { devSeedLifetimeStatsScenario } from './lifetime_profile_stats';
import { getTopMistakePhrases, clearMistakeLog, logMistake, getMistakeLogDebugSnapshot } from './mistake_log';
import type { TrainerMode } from './active_recall';
import { checkCoachToastNeededWithAnalytics, type CoachToastDecision } from './coach_toast_trigger';
import CoachToast from '../components/CoachToast';
import { injectMockLeaderboardStats, clearMockLeaderboardStats } from './leaderboard_stats';
import ThroneRewardModal from '../components/ThroneRewardModal';
import RewardStackV2 from '../components/reward_v2/RewardStackV2';
import { AVATAR_AURAS, USER_AVATAR_AURA_KEY } from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GIFT_ONLY,
  CUSTOM_AVATAR_SHOP,
  customAvatarNameForLang,
} from '../constants/custom_avatars';
import { getCanonicalUserId } from './user_id_policy';
import { accountLocalDataKeysForToday, ensureAnonUser, ensureStableAuthLinkForStableId, FRENCH_TARGET_SYNC_KEYS } from './cloud_sync';
import {
  levelExamKey,
  lastOpenedLessonKey,
  lessonBestScoreKey,
  lessonIntroShownKey,
  lessonPassCountKey,
  lessonProgressKey,
  lessonSessionKey,
  lessonWordsKey,
  masteryFinishedOnceKey,
  quizAchievementCounterKey,
  statsInsightsStorageKey,
  unlockedLessonsKey,
} from './target_storage_keys';
import { touchLessonScreenPrimed } from './lesson_screen_bootstrap';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import {
  LEAGUE_BONUS_ADMIN_PREVIEW_KEY,
  LEAGUE_CHEST_BASE_GOAL,
  unlockLeagueGoldThemeReward,
  revokeLeagueGoldThemeReward,
  type LeagueBonusAvailability,
  type LeagueChestRewardDrop,
} from './services/league_chest_rewards';
import {
  frenchPersonalPracticeGateCopy,
  personalPracticeCoachEnabledForTarget,
} from './personal_practice_target_gate';
import { safeRouterBack } from './navigation_back';
import {
  activateIntroFullAccessForAdmin,
  expireIntroFullAccessForAdmin,
  resetIntroFullAccessForAdmin,
  getIntroFullAccessState,
} from './intro_full_access';
import {
  activateLoyaltyGiftForAdmin,
  expireLoyaltyGiftForAdmin,
  resetLoyaltyGiftForAdmin,
} from './loyalty_gift';
import { callVipRevokeMine } from './vip_revoke_client';
import {
  ACCENT, ACCENT_BG, ACCENT_BORDER, ACCENT_BORDER_SOFT, ACCENT_DARK, ACCENT_DIM,
  ADMIN_BG, ADMIN_BORDER_MUTED, ADMIN_HEADER_BG, ADMIN_SURFACE,
  ADMIN_SURFACE_DANGER, ADMIN_SURFACE_ELEVATED, ADMIN_SURFACE_MUTED,
  ADMIN_TEXT, ADMIN_TEXT_MUTED, DANGER, DANGER_TEXT,
  AdminBackground, AdminNavContext, ButtonRow, CHAPTERS, ToggleRow,
  AccordionSection, type AdminChapterId,
} from '../components/admin_panel/ui';
import ScenariosSection from '../components/admin_panel/sections/ScenariosSection';
import RewardModalsExtraSection from '../components/admin_panel/sections/RewardModalsExtraSection';
import SystemModalsExtraSection from '../components/admin_panel/sections/SystemModalsExtraSection';
import BannersToastsExtraSection from '../components/admin_panel/sections/BannersToastsExtraSection';
import VipSurveyExtraSection from '../components/admin_panel/sections/VipSurveyExtraSection';
import LabsSection from '../components/admin_panel/sections/LabsSection';
import GiftsCatalogSection from '../components/admin_panel/sections/GiftsCatalogSection';
import CompassSection from '../components/admin_panel/sections/CompassSection';

const AppInfoDialog = {
  alert(title: string, message: string) {
    void enqueueThemedBlockingInfoAlert(title, message, 'OK');
  },
};

const ADMIN_PROFILE_VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function getAdminFirestoreDb(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

// Палитра, примитивы и навигация панели — в components/admin_panel/ui.tsx
// (общие для хаба и секций; серый дизайн без красного).
const DAILY_TASK_QA_PACKS = getDailyTaskAdminPacks(3);
const ADMIN_DAILY_TASK_REWARD_TOAST_PREVIEWS: Array<{
  themeMode: ThemeMode;
  icon: string;
  label: string;
  sub: string;
  taskTitle: string;
  xpBase: number;
}> = [
  {
    themeMode: 'dark',
    icon: 'leaf-outline',
    label: 'Daily reward toast — dark',
    sub: 'Forest green reward style, preview-only',
    taskTitle: 'Dark theme daily task preview',
    xpBase: 35,
  },

  {
    themeMode: 'gold',
    icon: 'trophy-outline',
    label: 'Daily reward toast — gold',
    sub: 'Black-gold premium style, preview-only',
    taskTitle: 'Gold theme daily task preview',
    xpBase: 55,
  },
  {
    themeMode: 'coral',
    icon: 'flame-outline',
    label: 'Daily reward toast — coral',
    sub: 'Warm coral burst style, preview-only',
    taskTitle: 'Coral theme daily task preview',
    xpBase: 45,
  },

  {
    themeMode: 'minimalDark',
    icon: 'diamond-outline',
    label: 'Daily reward toast — minimal dark',
    sub: 'Graphite-blue style, preview-only',
    taskTitle: 'Minimal dark daily task preview',
    xpBase: 50,
  },
];
const ADMIN_RESET_LESSON_IDS = Array.from({ length: 32 }, (_, i) => i + 1);
const ADMIN_RESET_EXAM_LEVEL_IDS = ['A1', 'A2', 'B1', 'B2'] as const;
const ADMIN_RESET_LEGACY_NUMERIC_EXAM_IDS = ['1', '2', '3', '4'] as const;
const ADMIN_RESET_EXAM_FIELDS = ['pct', 'passed', 'best_pct', 'medal_tier', 'pass_count', 'attempt_count'] as const;
const ADMIN_RESET_ACHIEVEMENT_KEYS = [
  'achievement_states',
  'achievement_progress',
  'medal_states',
  'medal_tiers',
  'achievements_v1',
  quizAchievementCounterKey('achievement_quiz_total_count', 'en'),
  quizAchievementCounterKey('achievement_quiz_total_count', 'fr'),
  quizAchievementCounterKey('quiz_hard_count', 'en'),
  quizAchievementCounterKey('quiz_hard_count', 'fr'),
  quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'en'),
  quizAchievementCounterKey('achievement_quiz_hard_perfect_count', 'fr'),
];
const ADMIN_RESET_FRAME_KEYS = ['user_frame', 'user_avatar', 'unlocked_frames'];
const ADMIN_RESET_SHARED_SYSTEM_KEYS = ['user_total_xp', 'current_energy', 'last_energy_recovery'];
const ADMIN_RESET_SHARED_STATS_KEYS = ['streak_count', 'login_bonus_v1', 'daily_stats', 'streak_freeze'];
const ADMIN_RESET_LEAGUE_KEYS = ['league_state_v3', 'league_result_pending', 'week_leaderboard', 'my_week_points'];
const ADMIN_RESET_TESTER_KEYS = ['tester_no_limits', 'tester_energy_disabled', 'tester_no_premium'];
const ADMIN_QA_FRIEND_UID = 'admin_qa_friend_buddy';
const ADMIN_QA_FRIEND_NAME = 'QA Friend Buddy';

function buildAdminResetEnglishLessonKeys(): string[] {
  return ADMIN_RESET_LESSON_IDS.flatMap((id) => [
    lessonProgressKey(id, 'en'),
    lessonSessionKey(id, 'cellIndex', 'en'),
    `lesson${id}_score`,
    lessonWordsKey(id, 'en'),
    `lesson${id}_listening_progress`,
    lessonBestScoreKey(id, 'en'),
    lessonPassCountKey(id, 'en'),
    lessonIntroShownKey(id, 'en'),
  ]);
}

function buildAdminResetEnglishExamKeys(): string[] {
  const activeExamKeys = ADMIN_RESET_EXAM_LEVEL_IDS.flatMap((lvl) => (
    ADMIN_RESET_EXAM_FIELDS.map((field) => levelExamKey(lvl, field, 'en'))
  ));
  const legacyNumericExamKeys = ADMIN_RESET_LEGACY_NUMERIC_EXAM_IDS.flatMap((lvl) => (
    ADMIN_RESET_EXAM_FIELDS.map((field) => levelExamKey(lvl, field, 'en'))
  ));
  return [...activeExamKeys, ...legacyNumericExamKeys];
}

function buildAdminResetAllDataKeys(): string[] {
  return Array.from(new Set([
    ...accountLocalDataKeysForToday(),
    ...buildAdminResetEnglishLessonKeys(),
    ...ADMIN_RESET_ACHIEVEMENT_KEYS,
    ...ADMIN_RESET_FRAME_KEYS,
    ...ADMIN_RESET_SHARED_SYSTEM_KEYS,
    unlockedLessonsKey('en'),
    ...ADMIN_RESET_SHARED_STATS_KEYS,
    lastOpenedLessonKey('en'),
    ...ADMIN_RESET_LEAGUE_KEYS,
    ...buildAdminResetEnglishExamKeys(),
    ...ADMIN_RESET_TESTER_KEYS,
    ...FRENCH_TARGET_SYNC_KEYS,
  ]));
}

function getIsoWeekIdForDate(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getPreviousWeekIdForAdmin(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return getIsoWeekIdForDate(d);
}

const ADMIN_GLOBAL_BROADCAST_PREVIEW: GlobalBroadcastModalPayload = {
  id: 'admin_preview_broadcast',
  kind: 'general',
  premiumAudience: 'all',
  rewardType: 'shards',
  rewardAmount: 5,
  premiumRewardDays: 0,
  titleRu: 'Превью сообщения от команды',
  titleUk: 'Превʼю повідомлення від команди',
  titleEs: 'Vista previa del mensaje del equipo',
  titlePtBr: 'Prévia da mensagem da equipe',
  titleVi: 'Xem trước thông báo từ đội ngũ',
  titleId: 'Pratinjau pesan dari tim',
  titleTr: 'Ekip mesajı önizlemesi',
  titlePl: 'Podgląd wiadomości od zespołu',
  messageRu: 'Так выглядит актуальная GlobalBroadcastModal из очереди _layout. Preview-only: без записи claim и без начисления награды.',
  messageUk: 'Так виглядає актуальна GlobalBroadcastModal з черги _layout. Preview-only: без запису claim і без нарахування нагороди.',
  messageEs: 'Así se ve GlobalBroadcastModal desde la cola de _layout. Preview-only: sin claim ni recompensa real.',
  messagePtBr: 'Assim aparece a GlobalBroadcastModal atual da fila _layout. Preview-only: sem registro de claim e sem recompensa real.',
  messageVi: 'Đây là GlobalBroadcastModal hiện tại từ hàng đợi _layout. Chỉ xem trước: không ghi claim và không cộng thưởng thật.',
  messageId: 'Beginilah GlobalBroadcastModal aktif dari antrean _layout. Preview-only: tanpa mencatat klaim dan tanpa hadiah nyata.',
  messageTr: '_layout kuyruğundaki güncel GlobalBroadcastModal böyle görünür. Sadece önizleme: claim yazılmaz ve gerçek ödül verilmez.',
  messagePl: 'Tak wygląda aktualny GlobalBroadcastModal z kolejki _layout. Tylko podgląd: bez zapisu claim i bez realnej nagrody.',
  reviewUrlIos: '',
  reviewUrlAndroid: '',
  reviewCtaRu: 'Оценить приложение',
  reviewCtaUk: 'Оцінити застосунок',
  reviewCtaEs: 'Valorar la app',
  reviewCtaPtBr: 'Avaliar o app',
  reviewCtaVi: 'Đánh giá ứng dụng',
  reviewCtaId: 'Nilai aplikasi',
  reviewCtaTr: 'Uygulamayı değerlendir',
  reviewCtaPl: 'Oceń aplikację',
  createdAt: '2026-05-14T00:00:00.000Z',
};

/** Превью пейволлов: label — кнопка, sub — подсказка, что смотреть; params — как в проде. */
const PREMIUM_PREVIEW_CONTEXTS: { label: string; sub: string; params: Record<string, string> }[] = [
  {
    label: '⚔️ Арена',
    sub: 'ArenaLimitModal + энергия в лобби. Заголовок, подзаголовок, 3 плюса, сравнение (⚔️)',
    params: { context: 'arena' },
  },
  {
    label: '⚡ Нет энергии (урок / квиз / Лингман)',
    sub: 'NoEnergyModal → Premium. HERO, выгоды, строка сравнения (⚡)',
    params: { context: 'no_energy' },
  },
  {
    label: '🔥 Цепочка под угрозой (7 дн.)',
    sub: 'Параметр streak, подсветка ряда',
    params: { context: 'streak', streak: '7' },
  },
  {
    label: '🎓 Курс после 3 уроков',
    sub: 'course_after_lesson3 — актуальный course lock после бесплатного старта',
    params: { context: 'course_after_lesson3', lessons_done: '3' },
  },
  {
    label: '⚡ Квизы — лимит',
    sub: 'Таб/экран квизов без попыток',
    params: { context: 'quiz_limit' },
  },
  {
    label: '🧠 Квиз — следующий уровень',
    sub: 'level=medium',
    params: { context: 'quiz_level', level: 'medium' },
  },
  {
    label: '🔥 Квизы — Medium',
    sub: 'Залоченный уровень',
    params: { context: 'quiz_medium' },
  },
  {
    label: '💜 Квизы — Hard',
    sub: 'Тот же HERO, другой копирайт',
    params: { context: 'quiz_hard' },
  },
  {
    label: '📚 Карточки — 20/20',
    sub: 'saved, блок про базу',
    params: { context: 'flashcard_limit', saved: '20' },
  },
  {
    label: '🎨 Темы',
    sub: 'Настройки → тема Premium',
    params: { context: 'theme' },
  },
  {
    label: '👑 Клубы / лига',
    sub: 'Текст для бустов и клуба',
    params: { context: 'club' },
  },
  {
    label: '💎 Базовый (generic)',
    sub: 'Старт без context — дефолт',
    params: { context: 'generic' },
  },
  {
    label: '🎙 Устно (speaking)',
    sub: 'Замок на «Устно» в уроке/квизе/тренере для free',
    params: { context: 'speaking' },
  },
  {
    label: '💬 ИИ-диалог (ai_dialog)',
    sub: 'Лимит бесплатного ИИ-диалога исчерпан',
    params: { context: 'ai_dialog' },
  },
  {
    label: '🏋 Тренер — Premium режимы',
    sub: 'Smart Mix / слабые места / тяжелые ошибки',
    params: { context: 'trainer' },
  },
  {
    label: '⏳ Тренер — дневной лимит',
    sub: 'Когда бесплатная сессия сегодня уже использована',
    params: { context: 'trainer_limit' },
  },
  {
    label: '📊 Stats — аналитика',
    sub: 'Открывается тапом по blur на streak_stats',
    params: { context: 'stats' },
  },
  {
    label: '🌡️ Heatmap года',
    sub: 'Премиум-аналитика 365 дней',
    params: { context: 'heatmap' },
  },
  {
    label: '🎯 Mistake patterns',
    sub: 'Где юзер чаще ошибается',
    params: { context: 'patterns' },
  },
  {
    label: '🥇 Percentiles',
    sub: 'Сравнение с другими (only-positive)',
    params: { context: 'percentiles' },
  },
];

function AdminCosmeticsPreview({ f }: { f: any }) {
  const renderCustomAvatarPreview = (
    avatar: (typeof CUSTOM_AVATAR_SHOP)[number],
    tag: string,
    badge: string,
  ) => (
    <View
      key={`admin-custom-avatar-${tag}-${avatar.id}`}
      style={{
        width: 112,
        minHeight: 136,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: ACCENT_BORDER_SOFT,
        backgroundColor: ADMIN_SURFACE_ELEVATED,
        paddingVertical: 9,
        paddingHorizontal: 6,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
        <CustomAvatarBadge avatarId={avatar.id} gradientId="aurora" logoColor="white" size={48} />
        <CustomAvatarBadge avatarId={avatar.id} gradientId="sakura" logoColor="black" size={48} />
      </View>
      <Text style={{ color: ADMIN_TEXT, fontSize: 10, fontWeight: '900', marginTop: 7, textAlign: 'center' }} numberOfLines={1}>
        {customAvatarNameForLang(avatar, 'ru')}
      </Text>
      <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
        {badge}
      </Text>
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>
      <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '900', marginBottom: 10 }}>
        Новые аватары за осколки
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {CUSTOM_AVATAR_SHOP.map((avatar) => renderCustomAvatarPreview(avatar, 'shop', 'Осколки'))}
      </View>

      <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '900', marginBottom: 10 }}>
        Подарочные бюсты
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {CUSTOM_AVATAR_GIFT_ONLY.map((avatar) => renderCustomAvatarPreview(avatar, 'gift', 'Gift-only'))}
      </View>

      <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '900', marginBottom: 10 }}>
        Аватары уровней
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {AVATARS.map((avatar) => {
          const level = avatar.unlockLevel;
          return (
            <View
              key={`admin-avatar-${level}`}
              style={{
                width: 70,
                minHeight: 82,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: ACCENT_BORDER_SOFT,
                backgroundColor: ADMIN_SURFACE_ELEVATED,
                paddingVertical: 8,
              }}
            >
              <AvatarView avatar={String(level)} level={level} size={52} />
              <Text style={{ color: ADMIN_TEXT, fontSize: 10, fontWeight: '900', marginTop: 5 }}>
                Ур. {level}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '900', marginTop: 18, marginBottom: 10 }}>
        Ауры
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {AVATAR_AURAS.map((aura) => {
          const previewLevel = aura.unlockLevel || (aura.premiumOnly ? 60 : 50);
          const unlockLabel = aura.unlockLevel
            ? `Ур. ${aura.unlockLevel}`
            : aura.premiumOnly
              ? 'Premium'
              : 'Магазин';
          return (
            <View
              key={`admin-aura-${aura.id}`}
              style={{
                width: 92,
                minHeight: 116,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: ACCENT_BORDER_SOFT,
                backgroundColor: ADMIN_SURFACE_ELEVATED,
                paddingVertical: 9,
                paddingHorizontal: 6,
              }}
            >
              <AvatarAura auraId={aura.id} size={56}>
                <AvatarView avatar={String(previewLevel)} level={previewLevel} size={56} />
              </AvatarAura>
              <Text style={{ color: ADMIN_TEXT, fontSize: 10, fontWeight: '900', marginTop: 7 }} numberOfLines={1}>
                {aura.nameRu}
              </Text>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                {unlockLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}



export default function SettingsTestersFunctions() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    qa?: string | string[];
    qaRun?: string | string[];
    qaGiftLevel?: string | string[];
    qaDualGiftLevel?: string | string[];
  }>();
  const { theme: t, f, themeMode, setThemeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const isLightTheme = false;
  const platformUiPreview = usePlatformUiPreviewMode();
  const vipSurveyPreviewBusyRef = useRef(false);

  const navigateHomeAfterVipSurveySeed = () => {
    const nav = router as unknown as {
      canDismiss?: () => boolean;
      dismiss?: (count?: number) => void;
      dismissTo?: (target: unknown) => void;
      dismissAll?: () => void;
    };
    const homeTarget = { pathname: '/(tabs)/home' };
    const goHome = () => {
      try {
        nav.dismissTo?.(homeTarget);
      } catch {
        // best-effort navigation recovery for dev-only deep links
      }
      try {
        router.replace('/(tabs)/home' as any);
      } catch {
        // ignore: a delayed retry below will run after stack transitions settle
      }
    };
    try {
      if (typeof nav.dismissTo === 'function') {
        nav.dismissTo(homeTarget);
      } else if (typeof nav.dismissAll === 'function') {
        nav.dismissAll();
      } else if (typeof nav.canDismiss === 'function' && nav.canDismiss()) {
        nav.dismiss?.(1);
      } else {
        safeRouterBack(router);
      }
    } catch {
      // keep going to the replace retries
    }
    setTimeout(goHome, 40);
    setTimeout(goHome, 180);
    setTimeout(goHome, 420);
  };

  /** У продакшн-збірці пункт у меню прихований; без цього екран лишався доступним через deep link. */
  useEffect(() => {
    if (!__DEV__ && !DEV_MODE) {
      router.replace('/(tabs)/settings' as any);
    }
  }, [router]);

  const [noLimitsEnabled, setNoLimitsEnabled] = useState(false);
  const [energyDisabled, setEnergyDisabled] = useState(false);
  const [, setNoPremiumEnabled] = useState(false);
  const { reload: reloadEnergy } = useEnergy();

  const [leagueResultVisible, setLeagueResultVisible] = useState(false);
  const [leagueResult, setLeagueResult] = useState<LeagueResult | null>(null);
  const { showAchievement } = useAchievement();

  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftModalLevel, setGiftModalLevel] = useState(5);
  const [giftDualModalVisible, setGiftDualModalVisible] = useState(false);
  const [giftDualModalLevel, setGiftDualModalLevel] = useState(5);
  /** Превью NoEnergyModal из админ-панели: варианты как в проде */
  const [noEnergyPreview, setNoEnergyPreview] = useState<{
    minRequired?: number;
    paywallContext?: string;
    qaForceShardCta?: boolean;
    withBackHome?: boolean;
  } | null>(null);
  const closeNoEnergyPreview = () => setNoEnergyPreview(null);
  const [introFullAccessPreview, setIntroFullAccessPreview] = useState<'welcome' | 'ended' | null>(null);
  const [arenaLimitMode, setArenaLimitMode] = useState<'matchmaking' | 'invite' | null>(null);
  const [quizTimeoutHardMode, setQuizTimeoutHardMode] = useState<boolean | null>(null);
  const [userWarningVisible, setUserWarningVisible] = useState(false);
  const [reportUserPreviewVisible, setReportUserPreviewVisible] = useState(false);
  const [profileCardCrownPreview, setProfileCardCrownPreview] = useState<PlayerInfo | null>(null);
  const [profileCardCrownMyInfo, setProfileCardCrownMyInfo] = useState({
    name: 'Phraseman',
    avatar: '',
    frame: '',
    aura: '',
    totalXP: 0,
    leagueId: 3,
    streak: null as number | null,
  });
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [notifPermissionPreviewVisible, setNotifPermissionPreviewVisible] = useState(false);
  const [certificatePreviewVisible, setCertificatePreviewVisible] = useState(false);
  const [releaseNotesPreviewVisible, setReleaseNotesPreviewVisible] = useState(false);
  const [dailyPlanPreviewVisible, setDailyPlanPreviewVisible] = useState(false);
  const [dailyPlanPreviewTasks, setDailyPlanPreviewTasks] = useState<DailyTask[]>([]);
  const [globalBroadcastPreview, setGlobalBroadcastPreview] = useState<GlobalBroadcastModalPayload | null>(null);
  const [leagueChestPreview, setLeagueChestPreview] = useState<{
    crownName?: string;
    isCrownWinner?: boolean;
    rewards?: LeagueChestRewardDrop[];
  } | null>(null);
  const [leagueBonusAvailablePreview, setLeagueBonusAvailablePreview] = useState<LeagueBonusAvailability | null>(null);
  const [qaChecks, setQaChecks] = useState<Record<string, boolean>>({
    noEnergy: false,
    arenaLimit: false,
    quizTimeout: false,
    userWarning: false,
    shardsEarned: false,
    reportModal: false,
    actionToast: false,
    dailyTaskRewardToast: false,
    updateModal: false,
    releaseNotes: false,
    globalBroadcast: false,
    vipSurvey: false,
    matchFoundToast: false,
  });

  // Preview-флаги для активных soft-monetization сценариев.
  const [softMonetizationPreview, setSoftMonetizationPreview] = useState<
    null | 'celebration' | 'vip_celebration' | 'streak_revive'
  >(null);
  const [activatedVipPreviewMarker, setActivatedVipPreviewMarker] = useState<string | null>(null);
  const [previewReviveOffer, setPreviewReviveOffer] = useState<StreakReviveOffer | null>(null);
  const [throneRewardPreview, setThroneRewardPreview] = useState(false);
  const [rewardStackPreview, setRewardStackPreview] = useState(false);

  const [rankModal, setRankModal] = useState<{ promoted: boolean; tier: string; level: string } | null>(null);
  const [rankTest, setRankTest] = useState<{ mode: 'club'; delta: number } | null>(null);
  const [rankTestTier, setRankTestTier] = useState('bronze');
  const [rankTestLevel, setRankTestLevel] = useState('I');
  const TIERS_LIST = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];
  const TIER_SHORT_NAMES: Record<string, string> = { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер', grandmaster: 'Гранд', legend: 'Легенда' };
  const RANK_LEVELS = ['I', 'II', 'III'];

  const [openSection, setOpenSection] = useState<string | null>(null);
  // QA-превью новых пейволов: выбранный сценарий (context) для просмотра A/B/C.
  const [paywallPreviewCtx, setPaywallPreviewCtx] = useState('intro_ended');
  // Навигация панели: активная глава (категория разделов) + поисковый запрос.
  const [navChapter, setNavChapter] = useState<AdminChapterId>('all');
  const [navQuery, setNavQuery] = useState('');
  // Закреплённые блоки «Быстрый QA» видны только без активного фильтра/поиска.
  const quickVisible = (navChapter === 'all' || navChapter === 'quick') && navQuery.trim() === '';
  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);
  const [dailyTaskSeedMode, setDailyTaskSeedMode] = useState<DailyTaskSeedMode>('empty');
  const [trialCooldownStatusLine, setTrialCooldownStatusLine] = useState('…');

  const dualGiftPreviewKey = useRef<string | null>(null);
  const giftPreviewKey = useRef<string | null>(null);
  useEffect(() => {
    const levelRaw = Array.isArray(params.qaGiftLevel) ? params.qaGiftLevel[0] : params.qaGiftLevel;
    if (!levelRaw || giftPreviewKey.current === levelRaw) return;
    const level = Number.parseInt(levelRaw, 10);
    if (!Number.isFinite(level) || level <= 0) return;
    giftPreviewKey.current = levelRaw;
    setGiftModalLevel(level);
    setGiftModalVisible(true);
  }, [params.qaGiftLevel]);

  useEffect(() => {
    const levelRaw = Array.isArray(params.qaDualGiftLevel) ? params.qaDualGiftLevel[0] : params.qaDualGiftLevel;
    if (!levelRaw || dualGiftPreviewKey.current === levelRaw) return;
    const level = Number.parseInt(levelRaw, 10);
    if (!Number.isFinite(level) || level <= 0) return;
    dualGiftPreviewKey.current = levelRaw;
    setGiftDualModalLevel(level);
    setGiftDualModalVisible(true);
  }, [params.qaDualGiftLevel]);

  const seedProfileCardUpgradeQa = useCallback(async () => {
    await replaceShardsBalanceLocal(1200);
    await AsyncStorage.multiSet([
      [PROFILE_CARD_LEVEL_KEY, '0'],
      [PROFILE_CARD_THEME_KEY, 'classic'],
      [PROFILE_CARD_MOTION_KEY, 'none'],
      [PROFILE_CARD_PUBLIC_FOCUS_KEY, 'balanced'],
    ]);
    emitAppEvent('xp_changed');
    router.push('/avatar_select' as any);
  }, [router]);

  const profileCardAutoSeedKey = useRef<string | null>(null);
  useEffect(() => {
    const qa = Array.isArray(params.qa) ? params.qa[0] : params.qa;
    const qaRun = Array.isArray(params.qaRun) ? params.qaRun[0] : params.qaRun;
    const key = `${qa}:${qaRun || ''}`;
    if (profileCardAutoSeedKey.current === key || qa !== 'profile_card_upgrade') return;
    profileCardAutoSeedKey.current = key;
    void seedProfileCardUpgradeQa();
  }, [params.qa, params.qaRun, seedProfileCardUpgradeQa]);

  const dailyTasksAutoSeedKey = useRef<string | null>(null);
  useEffect(() => {
    const qa = Array.isArray(params.qa) ? params.qa[0] : params.qa;
    const qaRun = Array.isArray(params.qaRun) ? params.qaRun[0] : params.qaRun;
    const key = `${qa}:${qaRun || ''}:${studyTarget}`;
    if (dailyTasksAutoSeedKey.current === key || qa !== 'daily_tasks_ready') return;
    dailyTasksAutoSeedKey.current = key;
    void (async () => {
      const pack = getDailyTaskAdminPacks(3)[0];
      if (!pack) return;
      await AsyncStorage.removeItem(dailyTasksAllShardsRewardStorageKey(getTodayKey()));
      const seeded = await seedDailyTasksAdminPack(pack.taskIds, 'ready', studyTarget);
      if (seeded.length) {
        router.replace('/daily_tasks_screen' as any);
      }
    })();
  }, [params.qa, params.qaRun, router, studyTarget]);

  const lessonFinish49AutoSeedKey = useRef<string | null>(null);
  useEffect(() => {
    const qa = Array.isArray(params.qa) ? params.qa[0] : params.qa;
    const qaRun = Array.isArray(params.qaRun) ? params.qaRun[0] : params.qaRun;
    const key = `${qa}:${qaRun || ''}:${studyTarget}`;
    if (lessonFinish49AutoSeedKey.current === key || qa !== 'lesson_finish_49') return;
    lessonFinish49AutoSeedKey.current = key;
    void (async () => {
      const progress = [...new Array(49).fill('correct'), 'empty'];
      const order = Array.from({ length: 50 }, (_, i) => i);
      await AsyncStorage.multiSet([
        [lessonProgressKey(1, studyTarget), JSON.stringify(progress)],
        [lessonSessionKey(1, 'cellIndex', studyTarget), '49'],
        [lessonSessionKey(1, 'phraseOrder', studyTarget), JSON.stringify(order)],
        [lessonSessionKey(1, 'errorReplayQueue', studyTarget), JSON.stringify([])],
        [lessonSessionKey(1, 'errorReplaySince', studyTarget), '0'],
        [lessonSessionKey(1, 'errorReplayOverride', studyTarget), 'null'],
        [lessonIntroShownKey(1, studyTarget), 'true'],
        [lastOpenedLessonKey(studyTarget), '1'],
        [unlockedLessonsKey(studyTarget), JSON.stringify([1])],
        ['tester_no_limits', 'true'],
        ['tester_energy_disabled', 'true'],
      ]);
      await seedDailyTasksAdminPack(['lc1'], 'empty', studyTarget);
      touchLessonScreenPrimed(1, { cell: 49, order, progress, override: null }, studyTarget);
      router.replace({ pathname: '/lesson1', params: { id: '1', from: 'qa_lesson_finish_49' } } as any);
    })();
  }, [params.qa, params.qaRun, router, studyTarget]);

  // ── Превью премиальных тостов медалей (Bronze / Silver / Gold × up/down)
  const [medalPreview, setMedalPreview] = useState<{ tier: MedalTier; promoted: boolean } | null>(null);
  const medalPreviewAnim = useRef(new Animated.Value(0)).current;
  const showMedalPreview = (tier: MedalTier, promoted: boolean) => {
    doHaptic();
    setMedalPreview({ tier, promoted });
    medalPreviewAnim.setValue(0);
    Animated.sequence([
      Animated.spring(medalPreviewAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(2200),
      Animated.timing(medalPreviewAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setMedalPreview(null));
  };
  const [modalUnlockAll, setModalUnlockAll] = useState(false);
  const [modalPremiumStrip, setModalPremiumStrip] = useState(false);
  const [modalResetAll, setModalResetAll] = useState(false);
  const [modalResetStats, setModalResetStats] = useState(false);
  const [authPromptDevOpen, setAuthPromptDevOpen] = useState(false);

  // ── Персонализация пейволла ────────────────────────────────────────────────
  const [paywallCounters, setPaywallCounters] = useState<{
    energy: number; streak: number; hard: number;
  } | null>(null);
  const [paywallTagsPreview, setPaywallTagsPreview] = useState<string[] | null>(null);

  const loadPaywallCounters = async () => {
    const [e, s, h] = await AsyncStorage.multiGet([
      ENERGY_ZERO_COUNT_KEY, STREAK_LOST_COUNT_KEY, HARD_PAYWALL_BLOCKS_KEY,
    ]);
    setPaywallCounters({
      energy: parseInt(e[1] ?? '0', 10) || 0,
      streak: parseInt(s[1] ?? '0', 10) || 0,
      hard: parseInt(h[1] ?? '0', 10) || 0,
    });
    const stats = await collectPaywallStats();
    const tags = pickPaywallTags(stats);
    setPaywallTagsPreview(tags.map(tag => `${tag.emoji} ${tag.ru}`));
  };

  // ── Diagnosis Toast ──────────────────────────────────────────────────
  const [coachToastPreview, setCoachToastPreview] = useState<CoachToastDecision | null>(null);

  // ── Тренер ────────────────────────────────────────────────────────────────
  const [mistakeLogPreview, setMistakeLogPreview] = useState<
    { phrase: string; count: number }[] | null
  >(null);
  const [freeSessionsLeft, setFreeSessionsLeft] = useState<number | null>(null);

  const buildLeagueBonusPreview = useCallback((isCrownWinner: boolean): LeagueBonusAvailability => ({
    available: true,
    weekId: 'admin-preview-week',
    groupId: 'admin_preview_group',
    leagueId: 3,
    progress: LEAGUE_CHEST_BASE_GOAL + 3 * 20_000,
    goal: LEAGUE_CHEST_BASE_GOAL + 3 * 20_000,
    memberCount: 18,
    crownName: isCrownWinner ? 'Ты - лидер' : 'Fable9521',
    crownUid: isCrownWinner ? 'admin-current-user' : 'admin-weekly-top',
    isCrownWinner,
  }), []);

  const buildLeagueChestRewardPreview = useCallback((isCrownWinner: boolean): LeagueChestRewardDrop[] => {
    const rewards: LeagueChestRewardDrop[] = [
      { id: 'admin_league_shards', kind: 'shards', rarity: 'common', amount: 24 },
      { id: 'admin_league_energy', kind: 'energy_fast_recovery', rarity: 'rare', recoveryMs: 5 * 60 * 1000 },
      { id: 'admin_league_xp', kind: 'xp_boost', rarity: 'rare', multiplier: 2, uses: 3 },
      { id: 'admin_league_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-violet' },
      { id: 'admin_league_avatar', kind: 'custom_avatar', rarity: 'epic', customAvatarId: 'future-league-avatar' },
      { id: 'admin_league_gold', kind: 'gold_theme', rarity: 'legendary' },
    ];
    return isCrownWinner
      ? [
        ...rewards,
        { id: 'admin_league_arena_plays', kind: 'arena_plays', rarity: 'common', amount: 5 },
        { id: 'admin_league_bonus_shards', kind: 'shards', rarity: 'rare', amount: 18 },
      ]
      : rewards;
  }, []);

  const openLeagueBonusScreenPreview = useCallback(async (crownWinner = false) => {
    await AsyncStorage.setItem(LEAGUE_BONUS_ADMIN_PREVIEW_KEY, JSON.stringify({
      expiresAt: Date.now() + 10 * 60 * 1000,
      crownWinner,
    }));
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: crownWinner
        ? 'QA: экран лиги откроется с кнопкой «Забрать корону»'
        : 'QA: экран лиги откроется с кнопкой «Забрать бонус лиги»',
      uk: crownWinner
        ? 'QA: екран ліги відкриється з кнопкою «Забрати корону»'
        : 'QA: екран ліги відкриється з кнопкою «Забрати бонус ліги»',
      es: crownWinner
        ? 'QA: la liga se abrirá con “Recoger la corona”'
        : 'QA: la liga se abrirá con “Recoger bono de liga”',
      'pt-BR': crownWinner
        ? 'QA: a liga abrirá com “Resgatar coroa”'
        : 'QA: a liga abrirá com “Resgatar bônus da liga”',
      vi: crownWinner
        ? 'QA: màn hình giải đấu sẽ mở với nút “Nhận vương miện”'
        : 'QA: màn hình giải đấu sẽ mở với nút “Nhận thưởng giải đấu”',
      id: crownWinner
        ? 'QA: layar liga akan terbuka dengan tombol “Ambil mahkota”'
        : 'QA: layar liga akan terbuka dengan tombol “Ambil bonus liga”',
      tr: crownWinner
        ? 'QA: lig ekranı “Tacını al” düğmesiyle açılacak'
        : 'QA: lig ekranı “Lig bonusunu al” düğmesiyle açılacak',
      pl: crownWinner
        ? 'QA: ekran ligi otworzy się z przyciskiem „Odbierz koronę”'
        : 'QA: ekran ligi otworzy się z przyciskiem „Odbierz bonus ligi”',
    }));
    router.push('/club_screen' as any);
  }, [router]);

  const openProfileCardCrownPreview = useCallback(async () => {
    const rows = await AsyncStorage.multiGet([
      'user_name',
      'user_total_xp',
      'user_avatar',
      'user_frame',
      USER_AVATAR_AURA_KEY,
      'streak_count',
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    const map = new Map(rows);
    const name = (map.get('user_name') || '').trim() || 'Phraseman';
    const totalXP = Math.max(0, parseInt(map.get('user_total_xp') || '0', 10) || 0);
    const streak = Math.max(0, parseInt(map.get('streak_count') || '0', 10) || 0);
    const uid = (await ensureAnonUser().catch(() => null)) || 'admin-current-user';
    const baseMyInfo = {
      name,
      avatar: map.get('user_avatar') || '',
      frame: map.get('user_frame') || '',
      aura: map.get(USER_AVATAR_AURA_KEY) || '',
      totalXP,
      leagueId: 3,
      streak: streak || null,
    };
    setProfileCardCrownMyInfo(baseMyInfo);
    setProfileCardCrownPreview({
      name,
      points: totalXP,
      totalXp: totalXP,
      weekXp: 12400,
      isMe: true,
      avatar: baseMyInfo.avatar,
      frame: baseMyInfo.frame,
      aura: baseMyInfo.aura,
      leagueId: 3,
      uid,
      friendUid: uid,
      isPremium: false,
      leagueCrownExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      leagueCrownCount: 3,
      profileCardLevel: parseInt(map.get(PROFILE_CARD_LEVEL_KEY) || '0', 10) || 0,
      profileCardTheme: map.get(PROFILE_CARD_THEME_KEY) || 'classic',
      profileCardMotion: map.get(PROFILE_CARD_MOTION_KEY) || 'none',
      profileCardPublicFocus: map.get(PROFILE_CARD_PUBLIC_FOCUS_KEY) || 'balanced',
    });
  }, []);

  const loadTrainerDebugState = async () => {
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    if (!raw) { setFreeSessionsLeft(1); }
    else {
      const d = JSON.parse(raw) as { date: string; count: number };
      const today = new Date().toISOString().split('T')[0];
      setFreeSessionsLeft(d.date === today ? Math.max(0, 1 - d.count) : 1);
    }
    const top = await getTopMistakePhrases(10, studyTarget);
    setMistakeLogPreview(top);
  };

  const ensureQaPremiumAccess = async () => {
    const grantAt = String(Date.now());
    await AsyncStorage.multiSet([
      ['tester_no_limits', 'true'],
      ['vip_active', 'true'],
      ['vip_plan', 'admin_vip'],
      ['vip_from', grantAt],
      ['vip_until', '0'],
      ['vip_admin_override', 'true'],
      ['vip_admin_grant_at', grantAt],
    ]);
    setNoLimitsEnabled(true);
    invalidatePremiumCache();
    await markVipCelebrationPending(grantAt);
    emitAppEvent('vip_activated');
    emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
    await reloadEnergy().catch(() => {});
  };

  const refreshIntroFullAccessQaState = async () => {
    invalidatePremiumCache();
    emitAppEvent('intro_full_access_changed');
    await reloadEnergy().catch(() => {});
  };

  const activateIntroFullAccessQa = async () => {
    await activateIntroFullAccessForAdmin();
    await refreshIntroFullAccessQaState();
    AppInfoDialog.alert('Intro Full Access', 'Подарочный доступ включен на 3 дня. Premium/VIP не тронуты.');
  };

  const expireIntroFullAccessQa = async () => {
    await expireIntroFullAccessForAdmin();
    await refreshIntroFullAccessQaState();
    AppInfoDialog.alert('Intro Full Access', 'Подарочный доступ истек. При следующем входе появится мягкая модалка окончания.');
  };

  const resetIntroFullAccessQa = async () => {
    await resetIntroFullAccessForAdmin();
    await refreshIntroFullAccessQaState();
    AppInfoDialog.alert('Intro Full Access', 'Подарочный доступ и seen-флаги сброшены.');
  };

  // ── Подарок лояльности (72ч существующим free-юзерам) ──
  const refreshLoyaltyGiftQaState = async () => {
    invalidatePremiumCache();
    emitAppEvent('loyalty_gift_changed');
    await reloadEnergy().catch(() => {});
  };

  const activateLoyaltyGiftQa = async () => {
    await activateLoyaltyGiftForAdmin();
    await refreshLoyaltyGiftQaState();
    AppInfoDialog.alert('Подарок лояльности', 'Подарок включён на 3 дня. Premium/VIP не тронуты. WOW-анимацию запускай через VIP celebration.');
  };

  const expireLoyaltyGiftQa = async () => {
    await expireLoyaltyGiftForAdmin();
    await refreshLoyaltyGiftQaState();
    AppInfoDialog.alert('Подарок лояльности', 'Подарок истёк. При следующем входе появится мягкая модалка окончания.');
  };

  const resetLoyaltyGiftQa = async () => {
    await resetLoyaltyGiftForAdmin();
    await refreshLoyaltyGiftQaState();
    AppInfoDialog.alert('Подарок лояльности', 'Подарок, одноразовость и метки показа сброшены (предложение покажется снова).');
  };

  const activateVipOnCurrentProfile = async () => {
    doHaptic();
    const grantAt = String(Date.now());
    const until = String(Date.now() + ADMIN_PROFILE_VIP_DURATION_MS);
    const vipPairs: [string, string][] = [
      ['vip_active', 'true'],
      ['vip_plan', 'admin_vip'],
      ['vip_from', grantAt],
      ['vip_until', until],
      ['vip_admin_override', 'true'],
      ['vip_admin_grant_at', grantAt],
    ];

    try {
      await AsyncStorage.multiSet(vipPairs);
      invalidatePremiumCache();
      await markVipCelebrationPending(grantAt);
      emitAppEvent('vip_activated');
      emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
      void syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true });

      const uid = await ensureAnonUser().catch(() => null);
      if (uid) {
        await ensureStableAuthLinkForStableId(uid).catch(() => false);
        const db = getAdminFirestoreDb();
        if (db) {
          // firestore.rules (progressHasNoPremiumWrites) пропускает этот grant
          // только у аккаунтов с admin-клеймом. Self-grant CF не делаем — это
          // дыра в paywall. Для QA-превью достаточно локального VIP выше,
          // поэтому отказ сервера не должен ронять кнопку.
          try {
            await db.collection('users').doc(uid).set({
              progress: {
                vip_active: 'true',
                vip_plan: 'admin_vip',
                vip_from: grantAt,
                vip_until: until,
                vip_admin_override: 'true',
                vip_admin_grant_at: grantAt,
              },
              updatedAt: Date.now(),
            }, { merge: true });
          } catch (error) {
            console.warn('[QA] server VIP grant denied (non-admin), VIP enabled locally only', error);
          }
        }
      }

      await reloadEnergy().catch(() => {});
      setActivatedVipPreviewMarker(grantAt);
      setSoftMonetizationPreview('vip_celebration');
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: 'VIP включён на профиле. Premium-подписка не тронута.',
        uk: 'VIP увімкнено на профілі. Premium-підписку не змінено.',
        es: 'VIP activado en el perfil. La suscripción Premium no se tocó.',
        'pt-BR': 'VIP ativado no perfil. A assinatura Premium não foi alterada.',
        vi: 'Đã bật VIP trên hồ sơ. Gói Premium không bị thay đổi.',
        id: 'VIP aktif di profil. Langganan Premium tidak diubah.',
        tr: 'Profilde VIP açıldı. Premium abonelik değiştirilmedi.',
        pl: 'VIP włączony w profilu. Subskrypcja Premium nie została zmieniona.',
      }));
    } catch {
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось включить VIP на профиле',
        uk: 'Не вдалося увімкнути VIP на профілі',
        es: 'No se pudo activar VIP en el perfil',
        'pt-BR': 'Não foi possível ativar VIP no perfil',
        vi: 'Không thể bật VIP trên hồ sơ',
        id: 'Tidak dapat mengaktifkan VIP di profil',
        tr: 'Profilde VIP açılamadı',
        pl: 'Nie udało się włączyć VIP w profilu',
      }));
    }
  };

  const emitFrenchDevSeedBlockedToast = () => {
    emitAppEvent('action_toast', actionToastTri('info', {
      ru: 'French не засеян English-dev фикстурами: нужны отдельные source-gated данные',
      uk: 'French не засіяно English-dev фікстурами: потрібні окремі source-gated дані',
      es: 'French no se rellenó con fixtures dev de English: hacen falta datos source-gated propios',
      'pt-BR': 'French não foi preenchido com fixtures dev de English: precisa de dados próprios com source gate',
      vi: 'French chưa được nạp bằng fixture dev của English: cần dữ liệu riêng có source gate',
      id: 'French tidak diisi dengan fixture dev English: perlu data sendiri dengan source gate',
      tr: 'French, English-dev fixture verileriyle doldurulmadı: source gate altında ayrı veri gerekiyor',
      pl: 'French nie został zasilony fixture dev z English: potrzebne są osobne dane z source gate',
    }));
  };

  const allowEnglishDevMistakeSeed = () => {
    if (studyTarget === 'fr') {
      emitFrenchDevSeedBlockedToast();
      return false;
    }
    return true;
  };

  const allowLegacyReviewModePreview = () => {
    if (studyTarget === 'fr') {
      emitAppEvent('action_toast', actionToastTri('info', {
        ru: 'French legacy /review preview заблокирован: нужны source-gated French SRS данные',
        uk: 'French legacy /review preview заблоковано: потрібні source-gated French SRS дані',
        es: 'French legacy /review preview bloqueado: faltan datos French SRS source-gated',
        'pt-BR': 'Preview legacy de /review para French bloqueado: faltam dados French SRS com source gate',
        vi: 'Preview /review legacy cho French bị chặn: thiếu dữ liệu French SRS có source gate',
        id: 'Preview legacy /review untuk French diblokir: data French SRS dengan source gate belum ada',
        tr: 'French legacy /review önizlemesi engellendi: source gate altında French SRS verileri gerekiyor',
        pl: 'Podgląd legacy /review dla French zablokowany: brakuje danych French SRS z source gate',
      }));
      return false;
    }
    return true;
  };

  const personalPracticeCoachEnabled = personalPracticeCoachEnabledForTarget(studyTarget);
  const frenchPersonalPracticeGate = frenchPersonalPracticeGateCopy(lang);
  const diagnosisDevBlocked = !personalPracticeCoachEnabled;
  const emitFrenchPersonalPracticeBlockedToast = () => {
    const ruCopy = frenchPersonalPracticeGateCopy('ru');
    const ukCopy = frenchPersonalPracticeGateCopy('uk');
    emitAppEvent('action_toast', actionToastTri('info', {
      ru: ruCopy.toast,
      uk: ukCopy.toast,
      es: ruCopy.toast,
      'pt-BR': 'French personal practice bloqueado: precisa de materiais com source gate.',
      vi: 'French personal practice bị chặn: cần tài liệu có source gate.',
      id: 'French personal practice diblokir: perlu materi dengan source gate.',
      tr: 'French personal practice engellendi: source gate altında materyal gerekiyor.',
      pl: 'French personal practice zablokowany: potrzebne są materiały z source gate.',
    }));
  };
  const openDiagnosisDevRoute = (category: string, microDiagnosisId: string) => {
    if (diagnosisDevBlocked) {
      emitFrenchPersonalPracticeBlockedToast();
      return;
    }
    router.push((`/problem_coach?category=${category}&microDiagnosisId=${microDiagnosisId}`) as any);
  };

  const prepareWeakTrainerQa = async (): Promise<boolean> => {
    const seeded = await devSeedTrainerScenario('weak', studyTarget);
    await loadTrainerDebugState();
    if (!seeded) {
      emitFrenchDevSeedBlockedToast();
      return false;
    }
    await ensureQaPremiumAccess();
    await AsyncStorage.removeItem(DAILY_FREE_SESSION_KEY);
    await loadTrainerDebugState();
    return true;
  };

  const openTrainerQaHub = async () => {
    if (!(await prepareWeakTrainerQa())) return;
    router.push('/trainer' as any);
  };

  const openTrainerReportPreview = async () => {
    if (!(await prepareWeakTrainerQa())) return;
    router.push({ pathname: '/trainer_smart_session', params: { mode: 'weak', preview: 'report' } } as any);
  };

  const openTrainerMistakePreview = async () => {
    if (!(await prepareWeakTrainerQa())) return;
    router.push({ pathname: '/trainer_smart_session', params: { mode: 'weak', preview: 'mistake' } } as any);
  };

  const openStats365RandomQa = async () => {
    await ensureQaPremiumAccess();
    await devSeedActivity365Scenario('random');
    router.push({ pathname: '/streak_stats', params: { qa365: '1' } } as any);
  };

  /**
   * QA «ИИ-разбор статистики»: набивает рандомный сид по ВСЕМ блокам
   * (активность за год + XP/время по дням + lifetime слова/фразы/счётчики),
   * включает premium и сбрасывает кэш ИИ-заметок — чтобы экран при открытии
   * сразу сгенерировал свежий разбор под каждым блоком.
   */
  const [statsInsightsSeedBusy, setStatsInsightsSeedBusy] = useState(false);
  const seedAndOpenStatsInsightsQa = async () => {
    if (statsInsightsSeedBusy) return;
    setStatsInsightsSeedBusy(true);
    try {
      await ensureQaPremiumAccess();
      await devSeedActivity365Scenario('random');
      await devSeedLifetimeStatsScenario(studyTarget);
      // Сбрасываем кэш заметок (обе цели), чтобы пройти локальный гейт и
      // запросить генерацию заново при следующем открытии экрана.
      await AsyncStorage.multiRemove([
        statsInsightsStorageKey(studyTarget),
        statsInsightsStorageKey('en'),
        statsInsightsStorageKey('fr'),
      ]);
      router.push({ pathname: '/streak_stats', params: { qa365: '1' } } as any);
    } finally {
      setStatsInsightsSeedBusy(false);
    }
  };
  const { showMatchFoundForTesterPreview } = useMatchmakingContext();

  const triggerGlobalLevelUp = async (level: number) => {
    const queueRaw = await AsyncStorage.getItem('pending_level_up_queue');
    let queue: number[] = [];
    try { if (queueRaw) queue = JSON.parse(queueRaw); } catch {}
    queue.push(level);
    await AsyncStorage.setItem('pending_level_up_queue', JSON.stringify(queue));
    emitAppEvent('level_up_pending');
  };

  const markQa = (key: string) => setQaChecks(prev => ({ ...prev, [key]: true }));

  const showShardsEarnedPreview = () => {
    emitAppEvent('shards_earned', {
      amount: 5,
      reasonText: triLang(lang, {
  ru: 'Admin preview: актуальная глобальная модалка осколков',
  uk: 'Admin preview: актуальна глобальна модалка осколків',
  es: 'Admin preview: modal global actual de fragmentos',
  "pt-BR": 'Admin preview: modal global atual de fragmentos',
  vi: 'Admin preview: modal mảnh toàn cục hiện tại',
  id: 'Admin preview: modal shard global saat ini',
  tr: 'Admin preview: güncel global parça modalı',
  pl: 'Admin preview: aktualny globalny modal odłamków',
}),
    });
    markQa('shardsEarned');
  };

  const triggerMatchFoundToastPreview = () => {
    // Сразу status=found, без Firestore: dev-бот есть только при __DEV__ / DEV_MODE.
    showMatchFoundForTesterPreview();
    markQa('matchFoundToast');
  };

  const showDailyTaskRewardToastPreview = (previewThemeMode: ThemeMode) => {
    const preview = ADMIN_DAILY_TASK_REWARD_TOAST_PREVIEWS.find((item) => item.themeMode === previewThemeMode)
      ?? ADMIN_DAILY_TASK_REWARD_TOAST_PREVIEWS[0];
    if (!preview) return;
    emitAppEvent('daily_task_reward_toast_preview', {
      themeMode: preview.themeMode,
      taskTitle: preview.taskTitle,
      xpBase: preview.xpBase,
    });
    markQa('dailyTaskRewardToast');
  };

  const showVipSurveyNotificationPreview = async () => {
    if (vipSurveyPreviewBusyRef.current) return;
    vipSurveyPreviewBusyRef.current = true;
    try {
      await seedLocalVipSurveyTestMessage();
      markQa('vipSurvey');
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Тестовый VIP survey добавлен в inbox. Завершение будет настоящим.',
          uk: 'Тестовий VIP survey додано в inbox. Завершення буде справжнім.',
          es: 'Test VIP survey added to the home inbox. Finishing it is real.',
          'pt-BR': 'Test VIP survey added to the home inbox. Finishing it is real.',
          vi: 'Test VIP survey added to the home inbox. Finishing it is real.',
          id: 'Test VIP survey added to the home inbox. Finishing it is real.',
          tr: 'Test VIP survey added to the home inbox. Finishing it is real.',
          pl: 'Test VIP survey added to the home inbox. Finishing it is real.',
        }),
      );
      navigateHomeAfterVipSurveySeed();
    } catch {
      AppInfoDialog.alert('VIP survey', 'Не удалось добавить тестовое уведомление в inbox.');
    } finally {
      setTimeout(() => {
        vipSurveyPreviewBusyRef.current = false;
      }, 900);
    }
  };

  /** QA checklist rows: same previews as section «Активные core-модалки (QA)» */
  const runQaChecklistItem = (key: keyof typeof qaChecks) => {
    doHaptic();
    switch (key) {
      case 'noEnergy':
        setNoEnergyPreview({});
        markQa('noEnergy');
        break;
      case 'arenaLimit':
        setArenaLimitMode('matchmaking');
        markQa('arenaLimit');
        break;
      case 'quizTimeout':
        setQuizTimeoutHardMode(false);
        markQa('quizTimeout');
        break;
      case 'userWarning':
        setUserWarningVisible(true);
        markQa('userWarning');
        break;
      case 'shardsEarned':
        showShardsEarnedPreview();
        break;
      case 'reportModal':
        setReportUserPreviewVisible(true);
        markQa('reportModal');
        break;
      case 'actionToast':
        emitAppEvent(
          'action_toast',
          actionToastTri('success', {
            ru: 'Проверка ActionToast: SUCCESS',
            uk: 'Перевірка ActionToast: SUCCESS',
            es: 'Prueba ActionToast: SUCCESS',
            'pt-BR': 'Teste ActionToast: SUCCESS',
            vi: 'Kiểm tra ActionToast: SUCCESS',
            id: 'Uji ActionToast: SUCCESS',
            tr: 'ActionToast testi: SUCCESS',
            pl: 'Test ActionToast: SUCCESS',
          }),
        );
        setTimeout(() => {
          emitAppEvent(
            'action_toast',
            actionToastTri('error', {
              ru: 'Проверка ActionToast: ERROR',
              uk: 'Перевірка ActionToast: ERROR',
              es: 'Prueba ActionToast: ERROR',
              'pt-BR': 'Teste ActionToast: ERROR',
              vi: 'Kiểm tra ActionToast: ERROR',
              id: 'Uji ActionToast: ERROR',
              tr: 'ActionToast testi: ERROR',
              pl: 'Test ActionToast: ERROR',
            }),
          );
        }, 200);
        setTimeout(() => {
          emitAppEvent(
            'action_toast',
            actionToastTri('info', {
              ru: 'Проверка ActionToast: INFO',
              uk: 'Перевірка ActionToast: INFO',
              es: 'Prueba ActionToast: INFO',
              'pt-BR': 'Teste ActionToast: INFO',
              vi: 'Kiểm tra ActionToast: INFO',
              id: 'Uji ActionToast: INFO',
              tr: 'ActionToast testi: INFO',
              pl: 'Test ActionToast: INFO',
            }),
          );
          markQa('actionToast');
        }, 400);
        break;
      case 'dailyTaskRewardToast':
        showDailyTaskRewardToastPreview(themeMode);
        break;
      case 'updateModal':
        setUpdateModalVisible(true);
        markQa('updateModal');
        break;
      case 'releaseNotes':
        setReleaseNotesPreviewVisible(true);
        markQa('releaseNotes');
        break;
      case 'globalBroadcast':
        setGlobalBroadcastPreview(ADMIN_GLOBAL_BROADCAST_PREVIEW);
        markQa('globalBroadcast');
        break;
      case 'vipSurvey':
        showVipSurveyNotificationPreview();
        break;
      case 'matchFoundToast':
        void triggerMatchFoundToastPreview();
        break;
      default:
        break;
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings to AsyncStorage
  const loadSettings = async () => {
    try {
      const [noLimits, noEnergy, noPrem] = await AsyncStorage.multiGet([
        'tester_no_limits',
        'tester_energy_disabled',
        'tester_no_premium',
      ]);
      setNoLimitsEnabled(noLimits[1] === 'true');
      setEnergyDisabled(noEnergy[1] === 'true');
      setNoPremiumEnabled(noPrem[1] === 'true');
      setTrialCooldownStatusLine(await getTrialStatusLineForTesters(lang));
    } catch {}
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch {}
  };

  const toggleNoLimits = async (val: boolean) => {
    doHaptic();
    setNoLimitsEnabled(val);
    await saveSettings('tester_no_limits', val);
    // Enabling NoLimits restores premium mode — clear the no-premium override
    if (val) {
      await AsyncStorage.removeItem('tester_no_premium');
      setNoPremiumEnabled(false);
      invalidatePremiumCache();
      // Уведомляем PremiumContext — доступ сразу пересчитается
      emitAppEvent('premium_activated');
    } else {
      await recomputeEarnedUnlocks(studyTarget);
      invalidatePremiumCache();
      emitAppEvent('premium_deactivated');
    }
    await reloadEnergy(); // сразу синхронизируем EnergyContext

    // When enabling No Limits, award all medals on lessons and exams
    if (val) {
      if (studyTarget === 'fr') {
        emitFrenchDevSeedBlockedToast();
        return;
      }
      try {
        const keysToSet: [string, string][] = [];

        // Award gold medals on all 32 lessons
        for (let i = 1; i <= 32; i++) {
          // Set all necessary lesson data for gold medal
          keysToSet.push([`lesson${i}_score`, '5']);
          keysToSet.push([lessonBestScoreKey(i, studyTarget), '5']); // Gold medal requires best_score = 5
          keysToSet.push([lessonPassCountKey(i, studyTarget), '1']);
          // Create full progress array (all 50 answers marked as correct)
          const progressArray = new Array(50).fill('correct');
          keysToSet.push([lessonProgressKey(i, studyTarget), JSON.stringify(progressArray)]);
          keysToSet.push([lessonSessionKey(i, 'cellIndex', studyTarget), '0']);
        }

        // Unlock all lessons
        const unlockedLessons = Array.from({ length: 32 }, (_, i) => i + 1);
        keysToSet.push([unlockedLessonsKey(studyTarget), JSON.stringify(unlockedLessons)]);

        // Award gold medals on all 4 exams (90%+ = gold)
        // Use string level IDs ('A1','A2','B1','B2') to match level_exam.tsx format
        const examLevels = ['A1', 'A2', 'B1', 'B2'];
        for (const lvl of examLevels) {
          keysToSet.push([levelExamKey(lvl, 'pct', studyTarget), '100']);
          keysToSet.push([levelExamKey(lvl, 'best_pct', studyTarget), '100']); // Gold medal requires best_pct >= 90
          keysToSet.push([levelExamKey(lvl, 'passed', studyTarget), '1']);
          keysToSet.push([levelExamKey(lvl, 'pass_count', studyTarget), '1']);
        }

        // Set all keys at once
        await AsyncStorage.multiSet(keysToSet);

        emitAppEvent(
          'action_toast',
          actionToastTri('success', {
            ru: 'Всем урокам даны золотые медали. Всем экзаменам даны золотые медали.',
            uk: 'Усім урокам дані золоті медалі. Усім екзаменам дані золоті медалі.',
            es: 'Medalla de oro en todas las lecciones y en todos los exámenes.',
            'pt-BR': 'Medalha de ouro em todas as lições e todos os exames.',
            vi: 'Huy chương vàng cho tất cả bài học và tất cả bài kiểm tra.',
            id: 'Medali emas untuk semua pelajaran dan semua ujian.',
            tr: 'Tüm derslere ve tüm sınavlara altın madalya verildi.',
            pl: 'Złoty medal we wszystkich lekcjach i wszystkich egzaminach.',
          }),
        );
      } catch {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Не удалось активировать.',
            uk: 'Не вдалося активувати.',
            es: 'No se pudo activar.',
            'pt-BR': 'Não foi possível ativar.',
            vi: 'Không thể kích hoạt.',
            id: 'Tidak dapat mengaktifkan.',
            tr: 'Etkinleştirilemedi.',
            pl: 'Nie udało się aktywować.',
          }),
        );
      }
    }
  };

  const toggleEnergyDisabled = async (val: boolean) => {
    doHaptic();
    setEnergyDisabled(val);
    await saveSettings('tester_energy_disabled', val);
    await reloadEnergy(); // сразу синхронизируем EnergyContext
  };

  const addXP = async () => {
    doHaptic();
    try {
      const name = await AsyncStorage.getItem('user_name');
      if (name) { await registerXP(5000, 'bonus_chest', name, lang); }
      // Сигнализируем home.tsx о изменении XP — триггерит level-up overlay
      emitAppEvent('xp_changed');
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: '5000 XP добавлено',
          uk: '5000 XP додано',
          es: 'Se han añadido 5000 XP.',
          'pt-BR': '5000 XP adicionados',
          vi: 'Đã thêm 5000 XP',
          id: '5000 XP ditambahkan',
          tr: '5000 XP eklendi',
          pl: 'Dodano 5000 XP',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось добавить XP',
          uk: 'Не вдалося додати XP',
          es: 'No se pudieron añadir XP.',
          'pt-BR': 'Não foi possível adicionar XP',
          vi: 'Không thể thêm XP',
          id: 'Tidak dapat menambahkan XP',
          tr: 'XP eklenemedi',
          pl: 'Nie udało się dodać XP',
        }),
      );
    }
  };

  // ── Friends QA: seed repeatable social data without touching unrelated user flows.
  const showAdminFriendsToast = (kind: 'success' | 'error' | 'info', text: string) => {
    emitAppEvent(
      'action_toast',
      actionToastTri(kind, {
        ru: text,
        uk: text,
        es: text,
        'pt-BR': text,
        vi: text,
        id: text,
        tr: text,
        pl: text,
      }),
    );
  };

  const getAdminCurrentUid = async (): Promise<string> => {
    const stableUid = await getCanonicalUserId().catch(() => null);
    const authUid = await ensureAnonUser().catch(() => null);
    const uid = stableUid || authUid;
    if (!uid) throw new Error('admin_friends_no_uid');
    await ensureStableAuthLinkForStableId(uid).catch(() => false);
    return uid;
  };

  const writeAdminFriendWarmCache = async (uid: string, friendName = ADMIN_QA_FRIEND_NAME) => {
    const now = Date.now();
    const profile = {
      uid: ADMIN_QA_FRIEND_UID,
      name: friendName,
      totalXp: 2450,
      weeklyXp: 380,
      streak: 9,
      isPremium: true,
      avatar: '13',
      frame: 'sprout',
      aura: 'aura-violet',
      profileCardLevel: 2,
      profileCardTheme: 'classic',
      profileCardMotion: 'none',
      profileCardPublicFocus: 'balanced',
    };
    await AsyncStorage.multiSet([
      [
        FRIENDS_TAB_SWR_CACHE_KEY,
        JSON.stringify({
          canonicalUid: uid,
          friends: [{ uid: ADMIN_QA_FRIEND_UID, createdAt: now }],
          requests: [],
        }),
      ],
      [
        FRIEND_PROFILES_CACHE_KEY,
        JSON.stringify({ [ADMIN_QA_FRIEND_UID]: { profile, fetchedAt: now } }),
      ],
    ]);
  };

  const seedAdminFriendsBuddy = async (opts: { openFriends?: boolean } = {}) => {
    try {
      const uid = await getAdminCurrentUid();
      const db = getAdminFirestoreDb();
      const now = Date.now();

      if (db) {
        const batch = db.batch();
        const friendRef = db.collection('users').doc(ADMIN_QA_FRIEND_UID);
        const myFriendRef = db.collection('users').doc(uid).collection('friends').doc(ADMIN_QA_FRIEND_UID);
        batch.set(friendRef, {
          displayName: ADMIN_QA_FRIEND_NAME,
          name: ADMIN_QA_FRIEND_NAME,
          firebaseAuthUid: ADMIN_QA_FRIEND_UID,
          updatedAt: now,
          progress: {
            user_name: ADMIN_QA_FRIEND_NAME,
            user_total_xp: '2450',
            user_avatar: '13',
            user_avatar_frame: 'sprout',
            user_avatar_aura: 'aura-violet',
          },
        }, { merge: true });
        batch.set(myFriendRef, { createdAt: now, qaSeed: 'admin_friends' }, { merge: true });
        batch.set(db.collection('leaderboard').doc(ADMIN_QA_FRIEND_UID), {
          name: ADMIN_QA_FRIEND_NAME,
          points: 2450,
          weekPoints: 380,
          streak: 9,
          avatar: '13',
          frame: 'sprout',
          aura: 'aura-violet',
          isPremium: true,
          updatedAt: now,
        }, { merge: true });
        await batch.commit();
        await db.collection('users').doc(ADMIN_QA_FRIEND_UID).collection('friends').doc(uid)
          .set({ createdAt: now, qaSeed: 'admin_friends_reverse' }, { merge: true })
          .catch(() => {});
      }

      await writeAdminFriendWarmCache(uid);
      await invalidateFriendsActivityCache();
      showAdminFriendsToast('success', 'Admin friends QA buddy seeded');
      if (opts.openFriends) router.push('/(tabs)/friends' as any);
    } catch (e) {
      showAdminFriendsToast('error', `Admin friends seed failed: ${String(e)}`);
    }
  };

  const seedAdminFriendShards = async () => {
    try {
      const uid = await getAdminCurrentUid();
      await replaceShardsBalanceLocal(120);
      const db = getAdminFirestoreDb();
      if (db) {
        await db.collection('users').doc(uid).set({
          shards: 120,
          shards_updated_at_ms: Date.now(),
          shards_updated_op: 'replace',
          shards_updated_reason: 'admin_friends_qa',
          updatedAt: Date.now(),
        }, { merge: true });
      }
      emitAppEvent('shards_balance_updated', { balance: 120, reason: 'admin_friends_qa' });
      showAdminFriendsToast('success', 'Friend gift shards set to 120');
    } catch (e) {
      showAdminFriendsToast('error', `Shards seed failed: ${String(e)}`);
    }
  };

  const seedAdminIncomingFriendGift = async () => {
    try {
      await seedAdminFriendsBuddy();
      const uid = await getAdminCurrentUid();
      const db = getAdminFirestoreDb();
      if (!db) throw new Error('firestore_unavailable');
      const now = Date.now();
      const gift = FRIEND_GIFT_CATALOG[0];
      const docId = `admin_friend_gift_${now}`;
      await db.collection('users').doc(uid).collection('shard_rewards').doc(docId).set({
        ts: new Date(now).toISOString(),
        reason: 'friend_gift',
        rewardType: gift.id,
        giftId: gift.id,
        giftLabel: gift.labelRu,
        giftLabelRu: gift.labelRu,
        giftLabelUk: gift.labelUk,
        giftLabelEs: gift.labelEs,
        giftLabelPtBr: gift.labelPtBr,
        giftLabelVi: gift.labelVi,
        giftLabelId: gift.labelId,
        giftLabelTr: gift.labelTr,
        giftLabelPl: gift.labelPl,
        fromUid: ADMIN_QA_FRIEND_UID,
        fromName: ADMIN_QA_FRIEND_NAME,
        seen: false,
        // Обязательная метка по firestore.rules: клиентское создание shard_rewards
        // разрешено только для QA-симуляции (UI показывает «(QA)»).
        qa: true,
      }, { merge: true });
      await db.collection('users').doc(uid).collection('friend_gifts_received').doc(docId).set({
        ts: new Date(now).toISOString(),
        giftId: gift.id,
        costShards: gift.costShards,
        fromUid: ADMIN_QA_FRIEND_UID,
        fromName: ADMIN_QA_FRIEND_NAME,
        seen: false,
      }, { merge: true });
      showAdminFriendsToast('success', 'Incoming friend gift seeded');
      router.push('/(tabs)/friends' as any);
    } catch (e) {
      showAdminFriendsToast('error', `Incoming gift seed failed: ${String(e)}`);
    }
  };

  const seedAdminFriendActivity = async () => {
    try {
      await seedAdminFriendsBuddy();
      const db = getAdminFirestoreDb();
      if (!db) throw new Error('firestore_unavailable');
      const now = Date.now();
      const friendRef = db.collection('users').doc(ADMIN_QA_FRIEND_UID);
      const batch = db.batch();
      batch.set(friendRef.collection('my_events').doc(`admin_level_up_${now}`), {
        type: 'level_up',
        uid: ADMIN_QA_FRIEND_UID,
        ts: now,
        payload: { level: 13 },
      }, { merge: true });
      batch.set(friendRef.collection('my_events').doc(`admin_gift_sent_${now}`), {
        type: 'friend_gift_sent',
        uid: ADMIN_QA_FRIEND_UID,
        ts: now - 1000,
        payload: {
          giftId: FRIEND_GIFT_CATALOG[0].id,
          giftLabel: FRIEND_GIFT_CATALOG[0].labelRu,
          targetUid: 'admin_preview_friend',
        },
      }, { merge: true });
      batch.set(friendRef.collection('my_events').doc(`admin_achievement_${now}`), {
        type: 'achievement',
        uid: ADMIN_QA_FRIEND_UID,
        ts: now - 2000,
        payload: { achievementId: 'social_gift_send', title: 'QA social gift' },
      }, { merge: true });
      await batch.commit();
      await invalidateFriendsActivityCache();
      showAdminFriendsToast('success', 'Friend activity feed seeded');
      router.push('/(tabs)/friends' as any);
    } catch (e) {
      showAdminFriendsToast('error', `Friend activity seed failed: ${String(e)}`);
    }
  };

  const clearAdminFriendsQaState = async () => {
    try {
      await AsyncStorage.multiRemove([
        FRIENDS_TAB_SWR_CACHE_KEY,
        FRIEND_PROFILES_CACHE_KEY,
        'friends_activity_feed_v2',
        'friends_activity_feed_v1',
      ]);
      await invalidateFriendsActivityCache();
      showAdminFriendsToast('success', 'Friend QA caches cleared');
    } catch (e) {
      showAdminFriendsToast('error', `Friend QA clear failed: ${String(e)}`);
    }
  };

  // ── Тест rank-change анимации в изолированном модальном окне ─────────────
  // Никаких записей в AsyncStorage, ничего на реальные клубы и зал славы не влияет.
  // Просто открывает Modal с фейковым списком и проигрывает анимацию + баннер.
  const openRankTest = (mode: 'club', delta: number) => {
    doHaptic();
    setRankTest({ mode, delta });
  };

  const performUnlockAll = async () => {
    try {
      await unlockAllAchievements();
      await unlockAllFrames();
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Все достижения и рамки разблокированы',
          uk: 'Усі досягнення та рамки розблоковано',
          es: 'Todos los logros y marcos desbloqueados.',
          'pt-BR': 'Todas as conquistas e molduras foram desbloqueadas',
          vi: 'Tất cả thành tích và khung đã được mở khóa',
          id: 'Semua pencapaian dan bingkai terbuka',
          tr: 'Tüm başarımlar ve çerçeveler açıldı',
          pl: 'Wszystkie osiągnięcia i ramki odblokowane',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Ошибка разблокировки',
          uk: 'Помилка розблокування',
          es: 'Error al desbloquear.',
          'pt-BR': 'Erro ao desbloquear',
          vi: 'Lỗi mở khóa',
          id: 'Gagal membuka kunci',
          tr: 'Kilidi açma hatası',
          pl: 'Błąd odblokowania',
        }),
      );
    }
  };

  const unlockAllAchievementsHandler = () => {
    doHaptic();
    setModalUnlockAll(true);
  };

  const triggerEndOfWeek = async () => {
    doHaptic();
    try {
      // Load current league state
      const state = await loadLeagueState();
      if (!state) {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Лига не инициализирована',
            uk: 'Ліга не ініціалізована',
            es: 'La liga no está inicializada.',
            'pt-BR': 'A liga não foi inicializada',
            vi: 'Giải đấu chưa được khởi tạo',
            id: 'Liga belum diinisialisasi',
            tr: 'Lig başlatılmadı',
            pl: 'Liga nie została zainicjowana',
          }),
        );
        return;
      }

      // Get current week points
      const myWeekPoints = await getMyWeekPoints();

      // For testing: if group has only 1 member (just me, no bots in week_leaderboard),
      // inject fake competitors so ranking is meaningful
      let testState = state;
      const realMembers = state.group.filter(m => !m.isMe);
      if (realMembers.length < 4) {
        // Bot XP: deterministic random per (name + day), 3–366 XP/day × days elapsed this week
        const today = new Date();
        const dayOfWeek = today.getUTCDay() || 7; // 1=Mon … 7=Sun
        const daysElapsed = dayOfWeek; // days since week started (inclusive of today)
        const seededRand = (seed: number) => {
          let s = seed;
          s = ((s >>> 16) ^ s) * 0x45d9f3b;
          s = ((s >>> 16) ^ s) * 0x45d9f3b;
          s = (s >>> 16) ^ s;
          return (s >>> 0) / 0xffffffff;
        };
        const dateNum = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
        const botNames = ['Alex', 'Maria', 'Ivan', 'Olga', 'Sergey', 'Dasha', 'Misha', 'Ira', 'Kolya', 'Tanya',
                          'Petro', 'Oksana', 'Vlad', 'Lena', 'Roma', 'Nastya', 'Dima', 'Katya', 'Andrey'];
        const fakeBots = botNames.slice(0, 19 - realMembers.length).map((name, i) => {
          let weekPoints = 0;
          for (let day = 1; day <= daysElapsed; day++) {
            const seed = (dateNum - dayOfWeek + day) * 100 + i;
            weekPoints += Math.round(3 + seededRand(seed) * (366 - 3));
          }
          return { name, points: weekPoints, isMe: false };
        });
        const fakeGroup = [
          ...fakeBots,
          ...realMembers,
          { name: state.group.find(m => m.isMe)?.name ?? 'Me', points: myWeekPoints, isMe: true },
        ];
        testState = { ...state, group: fakeGroup } as typeof state;
      }

      // Force calculate league result (for testing, not checking if week changed)
      const leagueResult = calculateResult(testState, myWeekPoints);

      // Save as pending so it persists and shows on next app open
      await savePendingResult(leagueResult);

      // Update state to new leagueId — keep only real members (not fake bots)
      const myMember = testState.group.find(m => m.isMe);
      const newGroup = [...realMembers, ...(myMember ? [myMember] : [])];
      const newState = { ...state, leagueId: leagueResult.newLeagueId, weekId: getWeekId(), group: newGroup };
      await AsyncStorage.setItem('league_state_v3', JSON.stringify(newState));

      // Show the beautiful modal immediately (no confirmation alert)
      setLeagueResult(leagueResult);
      setLeagueResultVisible(true);
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось выполнить конец недели',
          uk: 'Не вдалося виконати кінець тижня',
          es: 'No se pudo simular el fin de semana.',
          'pt-BR': 'Não foi possível simular o fim da semana',
          vi: 'Không thể mô phỏng cuối tuần',
          id: 'Tidak dapat mensimulasikan akhir pekan',
          tr: 'Hafta sonu simüle edilemedi',
          pl: 'Nie udało się zasymulować końca tygodnia',
        }),
      );
    }
  };

  const seedDailyTaskPackForQa = async (pack: DailyTaskAdminPack) => {
    doHaptic();
    if (dailyTaskSeedMode === 'ready') {
      await AsyncStorage.removeItem(dailyTasksAllShardsRewardStorageKey(getTodayKey()));
    }
    const seeded = await seedDailyTasksAdminPack(pack.taskIds, dailyTaskSeedMode, studyTarget);
    emitAppEvent(
      'action_toast',
      actionToastTri(seeded.length ? 'success' : 'error', {
        ru: seeded.length
          ? `Daily tasks QA: pack ${pack.label}, mode ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed failed',
        uk: seeded.length
          ? `Daily tasks QA: pack ${pack.label}, mode ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed failed',
        es: seeded.length
          ? `Daily tasks QA: pack ${pack.label}, mode ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed failed',
        'pt-BR': seeded.length
          ? `Daily tasks QA: pacote ${pack.label}, modo ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed falhou',
        vi: seeded.length
          ? `Daily tasks QA: gói ${pack.label}, chế độ ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed thất bại',
        id: seeded.length
          ? `Daily tasks QA: paket ${pack.label}, mode ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed gagal',
        tr: seeded.length
          ? `Daily tasks QA: paket ${pack.label}, mod ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed başarısız',
        pl: seeded.length
          ? `Daily tasks QA: pakiet ${pack.label}, tryb ${dailyTaskSeedMode}`
          : 'Daily tasks QA: seed nie powiódł się',
      }),
    );
    if (seeded.length) router.push('/daily_tasks_screen' as any);
  };

  const clearDailyTaskQaOverride = async () => {
    doHaptic();
    await clearDailyTasksAdminOverride(studyTarget);
    emitAppEvent(
      'action_toast',
      actionToastTri('success', {
        ru: 'Daily tasks QA override cleared',
        uk: 'Daily tasks QA override cleared',
        es: 'Daily tasks QA override cleared',
        'pt-BR': 'Override de QA das tarefas diárias limpo',
        vi: 'Đã xóa ghi đè QA nhiệm vụ hằng ngày',
        id: 'Override QA tugas harian dibersihkan',
        tr: 'Günlük görev QA override temizlendi',
        pl: 'Wyczyszczono override QA zadań dziennych',
      }),
    );
  };

  const openDailyPlanPreview = async () => {
    doHaptic();
    const todayTasks = await getTodayTasksSafe(studyTarget).catch(() => []);
    const seen = new Set(todayTasks.map((task) => task.id));
    const previewPool = getDailyTaskAdminPreviewTasks(studyTarget).filter((task) => !seen.has(task.id));
    setDailyPlanPreviewTasks([...todayTasks, ...previewPool]);
    setDailyPlanPreviewVisible(true);
    markQa('dailyPlanModal');
  };

  const seedFirestoreWeeklyRolloverScenario = async () => {
    doHaptic();
    try {
      const authUid = await ensureAnonUser();
      const stableUid = await getCanonicalUserId().catch(() => null);
      const uid = authUid || stableUid;
      if (!uid) throw new Error('no_uid');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firestore = require('@react-native-firebase/firestore').default;
      const db = firestore();
      const previousWeekId = getPreviousWeekIdForAdmin();
      const currentWeekId = getWeekId();
      const leagueId = 0;
      const groupId = `qa_weekly_rollover_${String(uid).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 18)}_${Date.now()}`;
      const name = (await AsyncStorage.getItem('user_name')) || 'QA Weekly';

      const botNames = ['Ada', 'Berta', 'Ciro', 'Dana', 'Eli', 'Fia', 'Gio', 'Hana', 'Ivan'];
      const members: Record<string, Record<string, unknown>> = {
        [uid]: { name, points: 9200, isPremium: true, totalXp: 100000, streak: 7 },
      };
      botNames.forEach((bot, i) => {
        members[`qa_bot_${i + 1}`] = {
          name: `QA ${bot}`,
          points: Math.max(120, 7000 - i * 650),
          isPremium: i % 2 === 0,
          totalXp: 50000 - i * 1000,
          streak: Math.max(1, 9 - i),
        };
      });

      await db.collection('league_groups').doc(groupId).set({
        weekId: previousWeekId,
        leagueId,
        memberCount: Object.keys(members).length,
        createdAt: Date.now(),
        qaScenario: 'weekly_rollover_result_modal',
        members,
      });
      await db.collection('leaderboard').doc(uid).set({
        name,
        leagueId,
        groupId,
        groupWeekId: previousWeekId,
        weekKey: previousWeekId,
        weekPoints: 9200,
        points: 100000,
        qaScenario: 'weekly_rollover_result_modal',
      }, { merge: true });

      const group = Object.entries(members)
        .map(([memberUid, member]) => ({
          uid: memberUid,
          name: String(member.name || memberUid),
          points: Number(member.points) || 0,
          isMe: memberUid === uid,
          isPremium: Boolean(member.isPremium),
          streak: Number(member.streak) || undefined,
          totalXp: Number(member.totalXp) || undefined,
        }))
        .sort((a, b) => b.points - a.points);

      await AsyncStorage.multiSet([
        ['user_name', name],
        ['week_points_v2', JSON.stringify({ weekKey: previousWeekId, points: 9200 })],
        ['league_state_v3', JSON.stringify({ leagueId, weekId: previousWeekId, group })],
      ]);
      await AsyncStorage.multiRemove(['league_result_pending', 'league_result_consumed_sig']);

      const leagueResult = calculateResult({ leagueId, weekId: previousWeekId, group }, 9200);
      setLeagueResult(leagueResult);
      setLeagueResultVisible(true);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: `Firestore weekly rollover seeded: ${previousWeekId} -> ${currentWeekId}`,
          uk: `Firestore weekly rollover seeded: ${previousWeekId} -> ${currentWeekId}`,
          es: `Firestore weekly rollover seeded: ${previousWeekId} -> ${currentWeekId}`,
          'pt-BR':  `Rollover semanal do Firestore semeado: ${previousWeekId} -> ${currentWeekId}`,
          vi:  `Đã seed rollover tuần Firestore: ${previousWeekId} -> ${currentWeekId}`,
          id:  `Rollover mingguan Firestore di-seed: ${previousWeekId} -> ${currentWeekId}`,
          tr:  `Firestore haftalık rollover seed edildi: ${previousWeekId} -> ${currentWeekId}`,
          pl:  `Zasiano tygodniowy rollover Firestore: ${previousWeekId} -> ${currentWeekId}`,
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Firestore weekly rollover seed failed',
          uk: 'Firestore weekly rollover seed failed',
          es: 'Firestore weekly rollover seed failed',
          'pt-BR': 'Falha ao semear rollover semanal do Firestore',
          vi: 'Seed rollover tuần Firestore thất bại',
          id: 'Seed rollover mingguan Firestore gagal',
          tr: 'Firestore haftalık rollover seed başarısız',
          pl: 'Seed tygodniowego rollover Firestore nie powiódł się',
        }),
      );
    }
  };

  const seedFirestoreWeeklyRolloverAndOpenLeague = async () => {
    try {
      const authUid = await ensureAnonUser();
      const stableUid = await getCanonicalUserId().catch(() => null);
      const uid = authUid || stableUid;
      if (!uid) throw new Error('no_uid');

      const previousWeekId = getPreviousWeekIdForAdmin();
      const leagueId = 0;
      const groupId = `qa_weekly_rollover_${String(uid).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 18)}_${Date.now()}`;
      const name = (await AsyncStorage.getItem('user_name')) || 'QA Weekly';
      const botNames = ['Ada', 'Berta', 'Ciro', 'Dana', 'Eli', 'Fia', 'Gio', 'Hana', 'Ivan'];
      const members: Record<string, Record<string, unknown>> = {
        [uid]: { name, points: 9200, isPremium: true, totalXp: 100000, streak: 7 },
      };
      botNames.forEach((bot, i) => {
        members[`qa_bot_${i + 1}`] = {
          name: `QA ${bot}`,
          points: Math.max(120, 7000 - i * 650),
          isPremium: i % 2 === 0,
          totalXp: 50000 - i * 1000,
          streak: Math.max(1, 9 - i),
        };
      });

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const firestore = require('@react-native-firebase/firestore').default;
        const db = firestore();
        await db.collection('league_groups').doc(groupId).set({
          weekId: previousWeekId,
          leagueId,
          memberCount: Object.keys(members).length,
          createdAt: Date.now(),
          qaScenario: 'weekly_rollover_result_modal_direct',
          members,
        });
        await db.collection('leaderboard').doc(uid).set({
          name,
          leagueId,
          groupId,
          groupWeekId: previousWeekId,
          weekKey: previousWeekId,
          weekPoints: 9200,
          points: 100000,
          qaScenario: 'weekly_rollover_result_modal_direct',
        }, { merge: true });
      } catch (error) {
        console.warn('[QA] weekly rollover Firestore seed unavailable, using local league state fallback', error);
      }

      const group = Object.entries(members)
        .map(([memberUid, member]) => ({
          uid: memberUid,
          name: String(member.name || memberUid),
          points: Number(member.points) || 0,
          isMe: memberUid === uid,
          isPremium: Boolean(member.isPremium),
          streak: Number(member.streak) || undefined,
          totalXp: Number(member.totalXp) || undefined,
        }))
        .sort((a, b) => b.points - a.points);

      await AsyncStorage.multiSet([
        ['user_name', name],
        ['week_points_v2', JSON.stringify({ weekKey: previousWeekId, points: 9200 })],
        ['league_state_v3', JSON.stringify({ leagueId, weekId: previousWeekId, group })],
      ]);
      await AsyncStorage.multiRemove(['league_result_pending', 'league_result_consumed_sig', 'club_remote_refresh_at_v2']);
      router.replace('/club_screen' as any);
    } catch (error) {
      console.warn('[QA] weekly rollover direct seed failed', error);
    }
  };

  const leagueRolloverAutoSeedKey = useRef<string | null>(null);
  useEffect(() => {
    const qa = Array.isArray(params.qa) ? params.qa[0] : params.qa;
    const qaRun = Array.isArray(params.qaRun) ? params.qaRun[0] : params.qaRun;
    const key = `${qa}:${qaRun || ''}`;
    if (qa !== 'league_weekly_rollover' || leagueRolloverAutoSeedKey.current === key) return;
    leagueRolloverAutoSeedKey.current = key;
    void seedFirestoreWeeklyRolloverAndOpenLeague();
  }, [params.qa, params.qaRun]);

  const performStripPremium = async () => {
    try {
      const stripAt = String(Date.now());
      await AsyncStorage.multiSet([
        ['premium_active', 'false'],
        ['premium_plan', ''],
        ['tester_no_limits', 'false'],
        ['tester_energy_disabled', 'false'],
        ['tester_no_premium', 'true'],
        ['vip_active', 'false'],
        ['vip_plan', ''],
        ['vip_from', '0'],
        ['vip_until', stripAt],
        ['vip_admin_override', 'false'],
        ['vip_admin_grant_at', ''],
      ]);
      const uid = await ensureAnonUser().catch(() => null);
      if (uid) {
        await ensureStableAuthLinkForStableId(uid).catch(() => false);
        // Прямую запись vip_* с клиента запрещает firestore.rules
        // (progressHasNoPremiumWrites) — серверный VIP отзывает CF vipRevokeMine.
        // Отказ сервера не валит strip: локально премиум уже снят.
        try {
          await callVipRevokeMine();
        } catch (error) {
          console.warn('[QA] server VIP revoke unavailable, stripped locally only', error);
        }
      }
      await recomputeEarnedUnlocks(studyTarget);
      invalidatePremiumCache();
      setNoLimitsEnabled(false);
      setEnergyDisabled(false);
      setNoPremiumEnabled(true);
      await consumeVipCelebration(stripAt).catch(() => {});
      emitAppEvent('premium_deactivated');
      emitAppEvent('vip_deactivated');
      emitAppEvent('premium_access_changed', { active: false, source: 'none' });
      await reloadEnergy();
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Премиум и VIP сняты',
          uk: 'Преміум і VIP знято',
          es: 'Premium y VIP desactivados.',
          'pt-BR': 'Premium e VIP desativados',
          vi: 'Đã tắt Premium và VIP',
          id: 'Premium dan VIP dinonaktifkan',
          tr: 'Premium ve VIP devre dışı bırakıldı',
          pl: 'Premium i VIP wyłączone',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось снять премиум',
          uk: 'Не вдалося зняти преміум',
          es: 'No se pudo quitar Premium.',
          'pt-BR': 'Não foi possível remover Premium',
          vi: 'Không thể gỡ Premium',
          id: 'Tidak dapat menghapus Premium',
          tr: 'Premium kaldırılamadı',
          pl: 'Nie udało się usunąć Premium',
        }),
      );
    }
  };

  const performResetAllData = async () => {
    try {
      const allKeys = buildAdminResetAllDataKeys();

      await withStorageLock(() => AsyncStorage.multiRemove(allKeys));
      invalidatePremiumCache();
      emitAppEvent('premium_deactivated');
      await reloadEnergy();

      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Все данные сброшены на уровень 0',
          uk: 'Усі дані скинуто на рівень 0',
          es: 'Todos los datos restablecidos al nivel 0.',
          'pt-BR': 'Todos os dados foram redefinidos para o nível 0',
          vi: 'Tất cả dữ liệu đã được đặt lại về cấp 0',
          id: 'Semua data direset ke level 0',
          tr: 'Tüm veriler 0. seviyeye sıfırlandı',
          pl: 'Wszystkie dane zresetowano do poziomu 0',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сбросить данные',
          uk: 'Не вдалося скинути дані',
          es: 'No se pudieron restablecer los datos.',
          'pt-BR': 'Não foi possível redefinir os dados',
          vi: 'Không thể đặt lại dữ liệu',
          id: 'Tidak dapat mereset data',
          tr: 'Veriler sıfırlanamadı',
          pl: 'Nie udało się zresetować danych',
        }),
      );
    }
  };

  const performResetStats = async () => {
    try {
      await AsyncStorage.multiRemove(['streak_count', 'daily_stats', 'streak_freeze']);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Статистика сброшена',
          uk: 'Статистику скинуто',
          es: 'Estadísticas restablecidas.',
          'pt-BR': 'Estatísticas redefinidas',
          vi: 'Đã đặt lại thống kê',
          id: 'Statistik direset',
          tr: 'İstatistikler sıfırlandı',
          pl: 'Statystyki zresetowane',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сбросить статистику',
          uk: 'Не вдалося скинути статистику',
          es: 'No se pudieron restablecer las estadísticas.',
          'pt-BR': 'Não foi possível redefinir as estatísticas',
          vi: 'Không thể đặt lại thống kê',
          id: 'Tidak dapat mereset statistik',
          tr: 'İstatistikler sıfırlanamadı',
          pl: 'Nie udało się zresetować statystyk',
        }),
      );
    }
  };

  const runAdminReviewTestBench = async () => {
    try {
      const seeded = await seedAdminTestReviewSession(studyTarget);
      if (!seeded) {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'French review test bench заблокирован: нет source-gated French SRS фикстур',
          uk: 'French review test bench заблоковано: немає source-gated French SRS фікстур',
          es: 'French review test bench bloqueado: faltan fixtures French SRS source-gated',
          'pt-BR': 'Test bench de review para French bloqueado: faltam fixtures French SRS com source gate',
          vi: 'Test bench review cho French bị chặn: thiếu fixture French SRS có source gate',
          id: 'Test bench review untuk French diblokir: fixture French SRS dengan source gate belum ada',
          tr: 'French review test bench engellendi: source gate altında French SRS fixture verileri yok',
          pl: 'Test bench review dla French zablokowany: brakuje fixture French SRS z source gate',
        }));
        return;
      }
      router.push('/review' as any);
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось подготовить тестовое повторение',
          uk: 'Не вдалося підготувати тестове повторення',
          es: 'No se pudo preparar la repetición de prueba.',
          'pt-BR': 'Não foi possível preparar a repetição de teste',
          vi: 'Không thể chuẩn bị lượt ôn thử',
          id: 'Tidak dapat menyiapkan replay uji',
          tr: 'Test tekrarı hazırlanamadı',
          pl: 'Nie udało się przygotować testowej powtórki',
        }),
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: ADMIN_BG }}>
      <AdminBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header: заголовок + поиск + чипы глав */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: ACCENT_BORDER, backgroundColor: ADMIN_HEADER_BG }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => { safeRouterBack(router); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color={ADMIN_TEXT} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ color: ADMIN_TEXT, fontSize: f.h2, fontWeight: '800' }}>Админ панель</Text>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, marginTop: 1 }}>Dev only · не для пользователей</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: ACCENT_BORDER_SOFT, backgroundColor: ADMIN_SURFACE, paddingHorizontal: 10 }}>
            <Ionicons name="search-outline" size={16} color={ACCENT_DIM} />
            <TextInput
              testID="admin-nav-search"
              value={navQuery}
              onChangeText={(text) => { configureAccordionLayout(); setNavQuery(text); }}
              placeholder="Поиск по разделам…"
              placeholderTextColor={ACCENT_DIM}
              style={{ flex: 1, color: ADMIN_TEXT, fontSize: 14, paddingVertical: 8, paddingHorizontal: 8 }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {navQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => { configureAccordionLayout(); setNavQuery(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={ACCENT_DIM} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          >
            {CHAPTERS.map((chapter) => {
              const active = navChapter === chapter.id;
              return (
                <TouchableOpacity
                  key={chapter.id}
                  testID={`admin-nav-chapter-${chapter.id}`}
                  onPress={() => { configureAccordionLayout(); setNavChapter(chapter.id); }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: active ? ACCENT_DARK : ADMIN_SURFACE,
                    borderWidth: 1, borderColor: active ? ACCENT_DIM : ACCENT_BORDER_SOFT,
                  }}
                >
                  <Ionicons name={chapter.icon as any} size={13} color={active ? ADMIN_TEXT : ADMIN_TEXT_MUTED} />
                  <Text style={{ color: active ? ADMIN_TEXT : ADMIN_TEXT_MUTED, fontSize: 12, fontWeight: active ? '800' : '600' }}>
                    {chapter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <AdminNavContext.Provider value={{ chapter: navChapter, query: navQuery }}>
        <ScrollView testID="screen-settings-testers" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingTop: 12 }} style={{ backgroundColor: ADMIN_BG }}>
          {quickVisible && (<>
          <View style={{ marginHorizontal: 12, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: ACCENT_BORDER, backgroundColor: ADMIN_SURFACE, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
              <Text style={{ color: ADMIN_TEXT, fontSize: 13, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                Maestro quick QA
              </Text>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, marginTop: 2 }}>
                Stable entry points for live admin flows
              </Text>
            </View>
            <ButtonRow
              testID="admin-activate-vip-profile"
              icon="sparkles-outline"
              label="💚 Активировать VIP на моём профиле"
              sub="30 дней VIP-доступа + зелёная анимация. Пишет только vip_* и не трогает реальный Premium."
              onPress={activateVipOnCurrentProfile}
              t={t}
              f={f}
              doHaptic={doHaptic}
              confirm="Активировать VIP на своём профиле?"
            />
            <ButtonRow
              testID="admin-preview-vip-celebration-top"
              icon="sparkles-outline"
              label="💚 Показать VIP-анимацию"
              sub="Быстрый предпросмотр зелёного VIP unlock-экрана из админ-панели."
              onPress={() => setSoftMonetizationPreview('vip_celebration')}
              t={t}
              f={f}
              doHaptic={doHaptic}
              confirm="Показать VIP-анимацию?"
            />
            <ButtonRow
              testID="admin-preview-vip-survey-notification"
              icon="chatbubbles-outline"
              label="💚 VIP survey тестовое уведомление"
              sub="Добавляет inbox-уведомление на главную. Завершение опроса отправляет реальные ответы в админку и активирует VIP через callable."
              onPress={showVipSurveyNotificationPreview}
              t={t}
              f={f}
              doHaptic={doHaptic}
              confirm="Добавить VIP survey уведомление?"
            />
            <ButtonRow
              testID="trainer-quick-seed-weak-open"
              icon="barbell-outline"
              label="Trainer: seed weak + open hub"
              sub="Seed weak TrainerStore, enable QA premium, open /trainer"
              onPress={openTrainerQaHub}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              testID="trainer-quick-report-preview"
              icon="analytics-outline"
              label="Trainer: premium report preview"
              sub="Seed weak TrainerStore, open Smart Trainer report preview"
              onPress={openTrainerReportPreview}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              testID="trainer-quick-mistake-preview"
              icon="bug-outline"
              label="Trainer: mistake drill preview"
              sub="Seed weak TrainerStore, open a wrong-answer drill preview"
              onPress={openTrainerMistakePreview}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              testID="stats-quick-365-random-open"
              icon="pulse-outline"
              label="Stats 365: random seeded year"
              sub="Seed yearly activity data and open streak_stats at the 365-day card"
              onPress={openStats365RandomQa}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </View>

          <View style={{ marginHorizontal: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => { doHaptic(); void runAdminReviewTestBench(); }}
              activeOpacity={0.75}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: ACCENT_BORDER,
                backgroundColor: ADMIN_SURFACE,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="flask-outline" size={20} color={ACCENT} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: ADMIN_TEXT, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, {
  uk: 'Повтор: 7 тестових карток',
  ru: 'Повтор: 7 тестовых карточек',
  es: 'Repaso activo: 7 tarjetas de prueba',
  "pt-BR": 'Revisão ativa: 7 cartões de teste',
  vi: 'Ôn tập chủ động: 7 thẻ thử nghiệm',
  id: 'Active recall: 7 kartu uji',
  tr: 'Aktif tekrar: 7 test kartı',
  pl: 'Aktywna powtórka: 7 kart testowych',
})}
                </Text>
                <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
                  {triLang(lang, {
  uk: 'Сид урок 99: старі тест-записи видаляються, потім екран «Повторення»',
  ru: 'Сид урок 99: старые тест-записи удаляются, затем экран «Повторение»',
  es: 'Semilla lección 99: se borran registros antiguos; luego la pantalla de repaso',
  "pt-BR": 'Seed lição 99: registros antigos de teste são apagados; depois abre a tela de revisão',
  vi: 'Seed bài 99: xóa bản ghi thử nghiệm cũ, rồi mở màn hình ôn tập',
  id: 'Seed pelajaran 99: data uji lama dihapus, lalu layar review dibuka',
  tr: 'Ders 99 seed: eski test kayıtları silinir, sonra tekrar ekranı açılır',
  pl: 'Seed lekcji 99: stare wpisy testowe są usuwane, potem ekran powtórki',
})}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={ACCENT_DIM} />
            </TouchableOpacity>
          </View>
          </>)}

          {/* ── НОВЫЕ ПЕЙВОЛЫ A/B/C (макеты для ревью) ── */}
          <AccordionSection
            id="new_paywalls_abc"
            icon="card-outline"
            title="🆕 Новые пейволы (A / B / C)"
            badge={3}
            open={openSection === 'new_paywalls_abc'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 12 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, lineHeight: 16 }}>
                {'Три варианта для A/B-теста. A — Компакт (всё на одном экране, без скролла). B — Стори (длинная страница убеждения). C — Атриум (первый экран + галерея ниже, рекомендован). Открываются как макеты — покупку не оформляют.'}
              </Text>

              {/* Выбор сценария — все 26 уникальных триггеров, разбиты по группам */}
              {([
                ['⚡ Энергия / доступ', [
                  ['no_energy', 'Нет энергии'],
                  ['quiz_limit', 'Лимит квизов'],
                  ['flashcard_limit', 'Лимит карточек'],
                  ['trainer_limit', 'Лимит тренера'],
                  ['dialog_limit', 'Лимит диалогов'],
                ]],
                ['📚 Уроки / квизы', [
                  ['quiz_hard', 'Сложный квиз'],
                  ['quiz_medium', 'Средний квиз'],
                  ['quiz_level', 'Квиз уровня'],
                  ['trainer', 'Тренер'],
                  ['smart_trainer', 'Умный тренер'],
                  ['speaking', 'Говорение'],
                ]],
                ['🏆 Прогресс / мотивация', [
                  ['streak', 'Серия'],
                  ['level_up', 'Новый уровень'],
                  ['mastery', 'Мастерство'],
                  ['arena', 'Арена'],
                  ['club', 'Клуб'],
                ]],
                ['📊 Аналитика / план', [
                  ['stats', 'Статистика'],
                  ['heatmap', 'Тепловая карта'],
                  ['patterns', 'Паттерны'],
                  ['percentiles', 'Перцентили'],
                  ['personal_plan', 'Личный план'],
                  ['diagnosis_training', 'Диагностика'],
                ]],
                ['🎨 Прочее', [
                  ['theme', 'Тема'],
                  ['intro_ended', 'Конец триала'],
                  ['premium_expired', 'Премиум истёк'],
                  ['vip_expired', 'VIP истёк'],
                  ['notification_upsell', 'Пуш-апсел'],
                  ['generic', 'Общий'],
                ]],
              ] as const).map(([groupLabel, items]) => (
                <View key={groupLabel} style={{ gap: 4 }}>
                  <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6 }}>
                    {groupLabel}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {(items as ReadonlyArray<readonly [string, string]>).map(([key, label]) => {
                      const on = paywallPreviewCtx === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => { doHaptic(); setPaywallPreviewCtx(key); }}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1,
                            backgroundColor: on ? ACCENT_DARK : 'transparent',
                            borderColor: on ? ACCENT_DARK : ADMIN_TEXT_MUTED + '44',
                          }}
                        >
                          <Text style={{ color: on ? '#fff' : ADMIN_TEXT_MUTED, fontSize: 10.5, fontWeight: on ? '800' : '500' }}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Три кнопки — каждая открывает свой вариант с выбранным сценарием.
                  Передаём реалистичные stats, чтобы видеть персонализацию (теги/прогресс). */}
              {([
                ['/paywall_a', '🅰️ Открыть A — Компакт'],
                ['/paywall_b', '🅱️ Открыть B — Стори'],
                ['/paywall_c', '🅲 Открыть C — Атриум ★'],
              ] as const).map(([path, label]) => (
                <TouchableOpacity
                  key={path}
                  onPress={() => {
                    doHaptic();
                    router.push({
                      pathname: path,
                      params: { context: paywallPreviewCtx, source: 'qa_preview', streak: '12', lessons_done: '34', saved: '15' },
                    } as any);
                  }}
                  activeOpacity={0.8}
                  style={{ backgroundColor: ACCENT_DARK, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>{label}</Text>
                </TouchableOpacity>
              ))}

            </View>
          </AccordionSection>

          {/* ── 0. Превью платформы (QA) ── */}
          <AccordionSection
            id="platform_ui_preview"
            icon="phone-portrait-outline"
            title="Превью: Android / iOS"
            badge={3}
            open={openSection === 'platform_ui_preview'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, lineHeight: f.caption * 1.45 }}>
                Сейчас:{' '}
                {platformUiPreview === 'real'
                  ? `как на устройстве (${Platform.OS})`
                  : platformUiPreview === 'ios'
                    ? 'принудительно как iOS'
                    : 'принудительно как Android'}
                . Меняет ветки интерфейса и тексты (не заменяет нативные API).
              </Text>
            </View>
            <ButtonRow
              icon="logo-android"
              label="Показывать как Android"
              sub="Ветки UI и формулировки под Google Play"
              onPress={() => void setPlatformUiPreviewMode('android')}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              icon="logo-apple"
              label="Показывать как iOS"
              sub="Ветки UI и формулировки под App Store"
              onPress={() => void setPlatformUiPreviewMode('ios')}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              icon="refresh-circle-outline"
              label="Сброс: как на устройстве"
              sub="Убрать подмену ОС"
              onPress={() => void setPlatformUiPreviewMode('real')}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </AccordionSection>

          <AccordionSection
            id="cosmetics_preview"
            icon="sparkles-outline"
            title="Аватары и ауры"
            badge={AVATARS.length + AVATAR_AURAS.length}
            open={openSection === 'cosmetics_preview'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <AdminCosmeticsPreview f={f} />
          </AccordionSection>

          {/* ── 1. СОСТОЯНИЕ АККАУНТА ── */}
          <AccordionSection id="account" icon="settings-outline" title="Состояние аккаунта" badge={6}
            open={openSection === 'account'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
              testID="testers-no-limits"
              icon={noLimitsEnabled ? "lock-open-outline" : "lock-outline"}
              label={noLimitsEnabled ? 'Без ограничений ✓' : 'Без ограничений'}
              sub="Все уроки и экзамены доступны"
              onPress={() => toggleNoLimits(!noLimitsEnabled)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ToggleRow
              icon="flash-outline"
              label="Энергия не тратится"
              sub="Уроки не будут стоить энергию"
              value={energyDisabled}
              onToggle={toggleEnergyDisabled}
              t={t} f={f}
            />
            <ButtonRow
              icon="add-circle-outline"
              label="Добавить 5000 XP"
              onPress={addXP}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="testers-unlock-all-achievements"
              icon="star-outline"
              label="Разблокировать все достижения"
              sub="Достижения и рамки"
              onPress={unlockAllAchievementsHandler}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="testers-seed-new-achievements"
              icon="trophy-outline"
              label="🌱 Seed: все новые достижения"
              sub="Социал, арена, тренер, кастомизация, вехи — smoke-проверка"
              onPress={async () => {
                doHaptic();
                try {
                  const result = await devSeedAchievementsSmoke();
                  AppInfoDialog.alert(
                    'Seed завершён',
                    `Всего: ${result.total}\nРазблокировано: ${result.unlocked}\n${result.missing.length > 0 ? `Не закрыто: ${result.missing.join(', ')}` : 'Все закрыты ✓'}`,
                  );
                } catch (e) {
                  AppInfoDialog.alert('Ошибка', String(e));
                }
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="diamond-outline"
              label="Снять премиум"
              sub="Переключить аккаунт в режим без премиума и снять VIP, если он есть"
              danger
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => {
                doHaptic();
                setModalPremiumStrip(true);
              }}
            />
            <ButtonRow
              icon="refresh-circle-outline"
              label="Mastery: уроки «завершены» (Перепройти)"
              sub="Ставит target-aware lesson_finished_once для 1–32, чтобы проверить подпись «Перепройти» в меню урока."
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                if (studyTarget === 'fr') {
                  emitFrenchDevSeedBlockedToast();
                  return;
                }
                const pairs: [string, string][] = Array.from({ length: 32 }, (_, i) => [
                  masteryFinishedOnceKey(i + 1, studyTarget),
                  '1',
                ]);
                await AsyncStorage.multiSet(pairs);
                AppInfoDialog.alert(
                  'OK',
                  'Флаги lesson_finished_once выставлены для уроков 1–32.\n\n'
                    + 'Для проверки открой меню урока и проверь подпись «Перепройти».',
                );
              }}
            />
          </AccordionSection>

          <AccordionSection id="friends_admin" icon="people-outline" title="Друзья — QA и подарки" badge={7}
            open={openSection === 'friends_admin'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: ACCENT_BORDER_SOFT, backgroundColor: ADMIN_SURFACE }}>
              <Text style={{ color: ADMIN_TEXT, fontSize: f.bodyLg, fontWeight: '900' }}>Social QA hub</Text>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, marginTop: 4, lineHeight: 17 }}>
                Подготовка friend list, gifts, входящей модалки, activity feed и кешей для Maestro/dev-проверок.
              </Text>
            </View>
            <ButtonRow
              testID="admin-friends-open"
              icon="people-circle-outline"
              label="Открыть экран друзей"
              sub="Переход на production-вкладку Friends без seed"
              onPress={() => router.push('/(tabs)/friends' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-seed-buddy"
              icon="person-add-outline"
              label="Seed QA-друга"
              sub="Добавляет QA Friend Buddy в friends, leaderboard и SWR-профиль"
              onPress={() => { void seedAdminFriendsBuddy({ openFriends: true }); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-seed-shards"
              icon="diamond-outline"
              label="Дать 120 осколков для подарков"
              sub="Синхронизирует локальный баланс и users/{uid}.shards"
              onPress={() => { void seedAdminFriendShards(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-seed-incoming-gift"
              icon="gift-outline"
              label="Seed входящего подарка"
              sub="Создаёт unseen friend_gift и открывает Friends для модалки «Подарок получен»"
              onPress={() => { void seedAdminIncomingFriendGift(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-seed-activity"
              icon="pulse-outline"
              label="Seed активности друга"
              sub="Level-up, gift_sent и achievement в ленту активности"
              onPress={() => { void seedAdminFriendActivity(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-open-arena"
              icon="flash-outline"
              label="Открыть Arena после seed-друга"
              sub="Проверка friend card в вызове друга на арене"
              onPress={() => {
                void seedAdminFriendsBuddy().then(() => router.push('/(tabs)/arena' as any));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-friends-clear-cache"
              icon="refresh-circle-outline"
              label="Сбросить friends/activity кеши"
              sub="Чистит SWR и activity cache, не удаляя реальные Firestore-документы"
              onPress={() => { void clearAdminFriendsQaState(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 1.5 AUTH (Google / Apple) ── */}
          <AccordionSection id="auth_dev" icon="key-outline" title="🔐 Auth (Google/Apple)" badge={6}
            open={openSection === 'auth_dev'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
              icon="open-outline"
              label="Открыть auth-модалку"
              sub="Принудительно показать RegistrationPromptModal"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => { doHaptic(); setAuthPromptDevOpen(true); }}
            />
            <ButtonRow
              icon="refresh-circle-outline"
              label="Reset auth_prompt_shown_v1"
              sub="Чтобы модалка снова показалась после урока 1"
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                await AsyncStorage.removeItem(AUTH_PROMPT_SHOWN_KEY);
                AppInfoDialog.alert('OK', 'auth_prompt_shown_v1 удалён');
              }}
            />
            <ButtonRow
              icon="logo-google"
              label="Test Google sign-in"
              sub="Прямой вызов signInWithProvider('google')"
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                const avail = await isGoogleSignInAvailable();
                if (!avail) {
                  AppInfoDialog.alert('Google недоступен', 'Проверь EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID и Play Services');
                  return;
                }
                const r = await signInWithProvider('google');
                AppInfoDialog.alert('Google sign-in result', JSON.stringify(r, null, 2));
              }}
            />
            <ButtonRow
              icon="logo-apple"
              label="Test Apple sign-in"
              sub="iOS: нативно · Android: браузер + EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID"
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                const avail = await isAppleSignInAvailable();
                if (!avail) {
                  AppInfoDialog.alert(
                    'Apple недоступен',
                    'Expo Go / без облака, или на iOS Sign in with Apple выключен для этого устройства.',
                  );
                  return;
                }
                const r = await signInWithProvider('apple');
                AppInfoDialog.alert('Apple sign-in result', JSON.stringify(r, null, 2));
              }}
            />
            <ButtonRow
              icon="information-circle-outline"
              label="Show linkedAuth"
              sub="Текущая привязка users/{stable_id}.linkedAuth"
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                const link = await getLinkedAuthInfo();
                AppInfoDialog.alert('linkedAuth', link ? JSON.stringify(link, null, 2) : 'null (не залогинен)');
              }}
            />
            <ButtonRow
              icon="log-out-outline"
              label="Force sign-out"
              sub="signOut Firebase Auth + GoogleSignin (linkedAuth не удаляется)"
              danger
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                await signOutCurrentProvider();
                AppInfoDialog.alert('OK', 'Sign out выполнен');
              }}
            />
          </AccordionSection>

          {/* ── 2. МОДАЛКИ АРЕНЫ ── */}
          <AccordionSection id="arena_modals" icon="trophy-outline" title="Модалки — Арена" badge={5}
            open={openSection === 'arena_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {/* Rank picker */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Выбери ранг:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {TIERS_LIST.map(tier => (
                  <TouchableOpacity key={tier} onPress={() => { doHaptic(); setRankTestTier(tier); }}
                    style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: rankTestTier === tier ? ACCENT : ADMIN_BORDER_MUTED, backgroundColor: rankTestTier === tier ? ACCENT_BG : ADMIN_SURFACE_MUTED }}
                    activeOpacity={0.75}>
                    <Text style={{ color: rankTestTier === tier ? ACCENT : ADMIN_TEXT_MUTED, fontSize: 12, fontWeight: '700' }}>{TIER_SHORT_NAMES[tier]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>Уровень:</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {RANK_LEVELS.map(lv => (
                  <TouchableOpacity key={lv} onPress={() => { doHaptic(); setRankTestLevel(lv); }}
                    style={{ borderRadius: 8, paddingHorizontal: 18, paddingVertical: 7, borderWidth: 1.5, borderColor: rankTestLevel === lv ? ACCENT : ADMIN_BORDER_MUTED, backgroundColor: rankTestLevel === lv ? ACCENT_BG : ADMIN_SURFACE_MUTED }}
                    activeOpacity={0.75}>
                    <Text style={{ color: rankTestLevel === lv ? ACCENT : ADMIN_TEXT_MUTED, fontSize: 14, fontWeight: '800' }}>{lv}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity onPress={() => { doHaptic(); setRankModal({ promoted: true, tier: rankTestTier, level: rankTestLevel }); }}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 11, borderWidth: 1.5, borderColor: ACCENT, backgroundColor: ACCENT_BG, alignItems: 'center' }}
                  activeOpacity={0.8}>
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '800' }}>⬆️ Повышение</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { doHaptic(); setRankModal({ promoted: false, tier: rankTestTier, level: rankTestLevel }); }}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 11, borderWidth: 1.5, borderColor: ADMIN_BORDER_MUTED, backgroundColor: ADMIN_SURFACE_MUTED, alignItems: 'center' }}
                  activeOpacity={0.8}>
                  <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 13, fontWeight: '800' }}>⬇️ Понижение</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ButtonRow icon="play-circle-outline" label="🏆 Результаты арены — Победа"
              sub="mockMyScore=500 > mockOppScore=300"
              onPress={() => router.push({ pathname: '/arena_results', params: { sessionId: 'bot_test_win', userId: 'tester', mockMyScore: '500', mockOppScore: '300', mockOppName: 'Бот', opponentForfeited: '0' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="close-circle-outline" label="💔 Результаты арены — Поражение"
              sub="mockMyScore=200 < mockOppScore=500"
              onPress={() => router.push({ pathname: '/arena_results', params: { sessionId: 'bot_test_loss', userId: 'tester', mockMyScore: '200', mockOppScore: '500', mockOppName: 'Бот', opponentForfeited: '0' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trophy-outline" label="🏆 Финал недели — Лига"
              sub="Показать результат лиги"
              onPress={triggerEndOfWeek}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow testID="testers-league-weekly-rollover-firestore" icon="cloud-done-outline" label="League weekly rollover — Firestore scenario"
              sub="Writes previous-week league_groups/leaderboard, then opens the real result modal"
              onPress={seedFirestoreWeeklyRolloverScenario}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="ribbon-outline" label="👑 Трон дня — награда чемпиона"
              sub="+10 осколков за удержание трона до 00:00"
              onPress={() => { doHaptic(); setThroneRewardPreview(true); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="layers-outline" label="🎁 Reward Stack — очередь наград (новый стандарт)"
              sub="Стопка «1 из 3» + «Забрать всё» с улётом иконок вверх"
              onPress={() => { doHaptic(); setRewardStackPreview(true); }}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          <AccordionSection
            id="league_bonus"
            icon="gift-outline"
            title="Бонус лиги и корона"
            badge={10}
            open={openSection === 'league_bonus'}
            onToggle={id => setOpenSection(openSection === id ? null : id)}
          >
            <ButtonRow
              icon="flag-outline"
              label="Открыть лигу: цель выполнена"
              sub="На экране лиги появится кнопка «Забрать бонус лиги»"
              onPress={() => { void openLeagueBonusScreenPreview(false); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trophy-outline"
              label="Открыть лигу: забрать корону"
              sub="На экране лиги появится кнопка «Забрать корону»"
              onPress={() => { void openLeagueBonusScreenPreview(true); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="notifications-outline"
              label="Тост: цель лиги выполнена"
              sub="Тот самый тост для онлайн-пользователей"
              onPress={() => emitAppEvent('action_toast', actionToastTri('success', {
                ru: 'Лига выполнила цель недели. Бонус уже ждёт!',
                uk: 'Ліга виконала ціль тижня. Бонус уже чекає!',
                es: 'La liga completó la meta semanal. Tu bono te espera.',
                'pt-BR': 'A liga cumpriu a meta semanal. O bônus já está esperando!',
                vi: 'Giải đấu đã hoàn thành mục tiêu tuần. Phần thưởng đang chờ!',
                id: 'Liga menyelesaikan target mingguan. Bonus sudah menunggu!',
                tr: 'Lig haftalık hedefi tamamladı. Bonus seni bekliyor!',
                pl: 'Liga osiągnęła cel tygodnia. Bonus już czeka!',
              }))}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="mail-unread-outline"
              label="Модалка: бонус доступен"
              sub="Для тех, кто был оффлайн и зашёл позже"
              onPress={() => setLeagueBonusAvailablePreview(buildLeagueBonusPreview(false))}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="ribbon-outline"
              label="Модалка: корона доступна"
              sub="Оффлайн-вход для победителя гонки недели"
              onPress={() => setLeagueBonusAvailablePreview(buildLeagueBonusPreview(true))}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="id-card-outline"
              label="Карточка: моя корона"
              sub="Открыть свою карточку с активной короной на нике"
              onPress={() => { void openProfileCardCrownPreview(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="gift-outline"
              label="Модалка: получение бонуса"
              sub="Сундук лиги с текущим набором наград"
              onPress={() => setLeagueChestPreview({
                crownName: 'Fable9521',
                isCrownWinner: false,
                rewards: buildLeagueChestRewardPreview(false),
              })}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="sparkles-outline"
              label="Модалка: получение короны"
              sub="Вариант для игрока, который набрал больше всех"
              onPress={() => setLeagueChestPreview({
                crownName: 'Ты - лидер',
                isCrownWinner: true,
                rewards: buildLeagueChestRewardPreview(true),
              })}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="color-wand-outline"
              label="Разблокировать редкую тему локально"
              sub="QA-переключатель без ожидания реального бонуса"
              onPress={async () => {
                await unlockLeagueGoldThemeReward('admin_preview');
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Редкая тема разблокирована локально',
                  uk: 'Рідкісну тему розблоковано локально',
                  es: 'Tema raro desbloqueado localmente',
                  'pt-BR': 'Tema raro desbloqueado localmente',
                  vi: 'Chủ đề hiếm đã được mở khóa cục bộ',
                  id: 'Tema langka dibuka secara lokal',
                  tr: 'Nadir tema yerel olarak açıldı',
                  pl: 'Rzadki motyw odblokowany lokalnie',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="color-palette-outline"
              label="Сбросить редкую тему"
              sub="Проверить, что тема снова скрыта для обычного пользователя"
              onPress={async () => {
                await revokeLeagueGoldThemeReward();
                setThemeMode('minimalDark');
                emitAppEvent('action_toast', actionToastTri('info', {
                  ru: 'Редкая тема сброшена локально и снова скрыта до награды лиги',
                  uk: 'Рідкісну тему скинуто локально й знову сховано до нагороди ліги',
                  es: 'Tema raro restablecido localmente hasta la recompensa',
                  'pt-BR': 'Tema raro redefinido localmente e oculto novamente até a recompensa da liga',
                  vi: 'Chủ đề hiếm đã được đặt lại cục bộ và lại ẩn cho đến phần thưởng giải đấu',
                  id: 'Tema langka direset lokal dan disembunyikan lagi hingga hadiah liga',
                  tr: 'Nadir tema yerel olarak sıfırlandı ve lig ödülüne kadar yeniden gizlendi',
                  pl: 'Rzadki motyw zresetowany lokalnie i ponownie ukryty do nagrody ligi',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 3. МОДАЛКИ УРОКОВ ── */}
          <AccordionSection id="lesson_modals" icon="school-outline" title="Модалки — Уроки" badge={5}
            open={openSection === 'lesson_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([5, 4, 3, 2] as const).map(score => (
              <ButtonRow key={`lc_${score}`} icon="school-outline"
                label={`📋 Завершение урока — ${score}/5`}
                sub={`lesson_complete id=2, score=${score}`}
                onPress={() => router.push({ pathname: '/lesson_complete', params: { id: '2', unlocked: score === 5 ? '1' : '0' } } as any)}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            <ButtonRow icon="ribbon-outline" label="🎓 Сертификат Профессора Лингмана — превью"
              sub="Редактируемые поля + текстовый share + засеять/удалить мой сертификат"
              onPress={() => setCertificatePreviewVisible(true)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4. МОДАЛКИ PREMIUM / ПЕЙВОЛЛЫ ── */}
          <AccordionSection id="premium_modals" icon="diamond-outline" title="Пейволлы Premium — все контексты" badge={PREMIUM_PREVIEW_CONTEXTS.length + 4}
            open={openSection === 'premium_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {/* Trial UI QA — приоритетный блок: проверка новой золотой ленты + Free 3 days
                в карточках планов. _force_trial_ui=1 форсит UI даже без реального RC
                (Expo Go / dev / магазин не отдаёт intro). В проде параметр недоступен. */}
            <View style={{ marginHorizontal: 12, marginVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: ACCENT, backgroundColor: ADMIN_SURFACE_ELEVATED, padding: 12 }}>
              <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '900', letterSpacing: 0.4, marginBottom: 6 }}>
                🎁 ТРИАЛ-UI · ЧТО ПРОВЕРИТЬ
              </Text>
              <Text style={{ color: ADMIN_TEXT, fontSize: 11, lineHeight: 15, marginBottom: 10 }}>
                {`✓ Сверху золотая лента «Попробуй Premium 3 дня бесплатно»\n✓ В обоих карточках справа: «Бесплатно» (зелёным) + «на 3 дня» + мелко «затем €X/період»\n✓ CTA: «🚀 3 дня бесплатно — затем €X/період»\n✗ Большие ценники справа НЕ доминируют (compliance ok)`}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  doHaptic();
                  await resetTrialCooldownForTesting();
                  setTrialCooldownStatusLine(await getTrialStatusLineForTesters(lang));
                  router.push({ pathname: '/premium_modal', params: { context: 'generic', _force_trial_ui: '1' } } as any);
                }}
                activeOpacity={0.8}
                style={{ backgroundColor: ACCENT_DARK, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', marginBottom: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                  ⚡ ФОРС: trial-UI + сброс кулдауна
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  doHaptic();
                  await resetTrialCooldownForTesting();
                  setTrialCooldownStatusLine(await getTrialStatusLineForTesters(lang));
                  router.push({ pathname: '/premium_modal', params: { context: 'generic' } } as any);
                }}
                activeOpacity={0.8}
                style={{ borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: ACCENT_BORDER }}
              >
                <Text style={{ color: ADMIN_TEXT, fontSize: 12, fontWeight: '700' }}>
                  «Натуральный» режим (как у юзера)
                </Text>
              </TouchableOpacity>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 10, marginTop: 8, fontStyle: 'italic', lineHeight: 14 }}>
                ФОРС → trial-UI рендерится всегда (Expo Go/dev/RC без intro).{'\n'}
                Натуральный → как у реального юзера: лента покажется ТОЛЬКО если магазин отдал intro phase.
              </Text>
            </View>

            <ButtonRow
              icon="timer-outline"
              label="⏱ Сброс кулдауна триала (только флаг, без открытия)"
              sub={trialCooldownStatusLine}
              onPress={async () => {
                doHaptic();
                await resetTrialCooldownForTesting();
                setTrialCooldownStatusLine(await getTrialStatusLineForTesters(lang));
                emitAppEvent(
                  'action_toast',
                  actionToastTri('success', {
                    ru: 'Кулдаун сброшен. Открой пейволл снизу.',
                    uk: 'Кулдаун скинуто. Відкрий пейволл знизу.',
                    es: 'Enfriamiento reiniciado. Abre el paywall abajo.',
                    'pt-BR': 'Cooldown redefinido. Abra o paywall abaixo.',
                    vi: 'Đã đặt lại cooldown. Mở paywall bên dưới.',
                    id: 'Cooldown direset. Buka paywall di bawah.',
                    tr: "Bekleme süresi sıfırlandı. Aşağıdaki paywall'u aç.",
                    pl: 'Cooldown zresetowany. Otwórz paywall poniżej.',
                  }),
                );
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="testers-quiz-e2e-results"
              icon="ribbon-outline"
              label="🧪 Maestro: квиз — экран результата"
              sub="Открыть quizzes_screen → «На главную» (без прохождения вопросов)"
              onPress={async () => {
                if (!quizContentAvailableForTarget(studyTarget)) {
                  const ruCopy = frenchQuizGateCopy('ru');
                  const ukCopy = frenchQuizGateCopy('uk');
                  emitAppEvent('action_toast', actionToastTri('info', {
                    ru: ruCopy.title,
                    uk: ukCopy.title,
                    es: 'French quiz preview is blocked until approved quiz sources exist.',
                    'pt-BR': 'Preview de quiz French bloqueado até haver fontes aprovadas.',
                    vi: 'Preview quiz French bị chặn cho đến khi có nguồn đã duyệt.',
                    id: 'Preview kuis French diblokir sampai sumber yang disetujui tersedia.',
                    tr: 'French quiz önizlemesi onaylı kaynaklar gelene kadar engellendi.',
                    pl: 'Podgląd quizów French jest zablokowany do czasu zatwierdzenia źródeł.',
                  }));
                  router.push('/quizzes_screen' as any);
                  return;
                }
                await AsyncStorage.setItem(QUIZ_E2E_OPEN_RESULTS_KEY, '1');
                router.push('/quizzes_screen' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            {PREMIUM_PREVIEW_CONTEXTS.map(({ label, sub, params: p }) => (
              <ButtonRow
                key={p.context + JSON.stringify(p)}
                icon="card-outline"
                label={label}
                sub={`${sub} · trial-UI форсится`}
                onPress={() => router.push({ pathname: '/premium_modal', params: { ...p, _force_trial_ui: '1' } } as any)}
                t={t} f={f} doHaptic={doHaptic}
              />
            ))}
          </AccordionSection>

          {/* ── 4a1. SPEAKING MODE — все статусы ── */}
          <AccordionSection id="speaking_mode" icon="mic-outline" title="🎙 Устно (Speaking) — все статусы" badge={9}
            open={openSection === 'speaking_mode'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="albums-outline"
              label="🎬 Открыть лабораторию статусов"
              sub="Все 8 состояний SpeakingPanel + пейвол speaking. Микрофон в превью инертен."
              onPress={() => router.push('/admin_speaking_lab' as any)}
              t={t} f={f} doHaptic={doHaptic} testID="testers-open-speaking-lab" />
            <ButtonRow icon="diamond-outline"
              label="🔒 Пейвол context='speaking'"
              sub="Что видит free при тапе на «Устно» в уроке/квизе/тренере"
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'speaking', source: 'admin_preview' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4a2. AI DIALOGUE ── */}
          <AccordionSection id="ai_dialogue" icon="chatbubbles-outline" title="💬 ИИ-диалог" badge={3}
            open={openSection === 'ai_dialogue'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="chatbubble-ellipses-outline"
              label="💬 Открыть экран ИИ-диалога"
              sub="ai_dialog_home — выбор сценария и запуск сессии"
              onPress={() => router.push('/ai_dialog_home' as any)}
              t={t} f={f} doHaptic={doHaptic} testID="testers-open-ai-dialog" />
            <ButtonRow icon="diamond-outline"
              label="🔒 Пейвол context='ai_dialog'"
              sub="Когда бесплатный лимит ИИ-диалога исчерпан"
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'ai_dialog', source: 'admin_preview' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="information-circle-outline"
              label={`ℹ️ Free: ${getFreeDialogsLifetime()} диалог навсегда · диалоги ${isAiDialogEnabled() ? 'вкл' : 'выкл'}`}
              sub="Бесплатно даётся один пробный диалог на всю жизнь аккаунта; учёт на сервере (Cloud Function), сбросить из приложения нельзя"
              onPress={() => {
                emitAppEvent('action_toast', actionToastTri('info', {
                  ru: 'Лимит ИИ-диалога серверный. Для сброса используй админ-веб (Cloud Function).',
                  uk: 'Ліміт ШІ-діалогу серверний. Для скидання — адмін-веб (Cloud Function).',
                  es: 'El límite del diálogo IA es del servidor. Reinícialo desde el admin web.',
                  'pt-BR': 'O limite do diálogo de IA é do servidor. Reinicie pelo admin web.',
                  vi: 'Giới hạn hội thoại AI ở phía máy chủ. Đặt lại qua admin web.',
                  id: 'Batas dialog AI ada di server. Reset lewat admin web.',
                  tr: 'AI diyalog limiti sunucuda. Sıfırlamak için admin web kullan.',
                  pl: 'Limit dialogu AI jest po stronie serwera. Zresetuj przez admin web.',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4a3. REFERRAL / VIP МОДАЛКИ ── */}
          <AccordionSection id="referral_modals" icon="gift-outline" title="🎁 Referral / VIP — модалки" badge={2}
            open={openSection === 'referral_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="albums-outline"
              label="🎬 Открыть лабораторию VIP-модалок"
              sub="Activated (VIP открылся, 7/14/30 дней) и Ended (доступ истёк)"
              onPress={() => router.push('/admin_referral_lab' as any)}
              t={t} f={f} doHaptic={doHaptic} testID="testers-open-referral-lab" />
            <ButtonRow icon="diamond-outline"
              label="🔒 Пейвол после истечения VIP"
              sub="context='generic', source='referral_ended'"
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'referral_ended' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4a4. ОШИБКИ / EDGE-СОСТОЯНИЯ ── */}
          <AccordionSection id="error_states" icon="warning-outline" title="⚠️ Ошибки и edge-состояния" badge={3}
            open={openSection === 'error_states'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="mic-off-outline"
              label="🚫 Отказ в правах микрофона (denied)"
              sub="Состояние SpeakingPanel когда юзер запретил микрофон"
              onPress={() => router.push('/admin_speaking_lab' as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="phone-portrait-outline"
              label="📵 Устройство без распознавания (unavailable)"
              sub="Нет expo-speech-recognition — режим говорения недоступен"
              onPress={() => router.push('/admin_speaking_lab' as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="git-merge-outline"
              label="🪪 Слияние аккаунтов / account-switch"
              sub="Auth-matrix: смена аккаунта, отсутствие утечки VIP, server-side merge"
              onPress={() => router.push('/admin_premium_delivery_test' as any)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4b. MONETIZATION SCENARIOS ── */}
          <AccordionSection
            id="soft_monetization"
            icon="sparkles-outline"
            title="Монетизация: активные сценарии"
            badge={6}
            open={openSection === 'soft_monetization'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <ButtonRow
              icon="trophy-outline"
              label="👑 Premium celebration (5 сек анимация)"
              sub="Particle-spiral, корона, 6 замочков unlock, golden CTA. Без реальной IAP."
              onPress={() => setSoftMonetizationPreview('celebration')}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-preview-vip-celebration"
              icon="sparkles-outline"
              label="💚 VIP celebration (зелёная анимация)"
              sub="Тот же unlock-экран, но VIP: зелёный стиль, без золотого Premium-статуса."
              onPress={() => setSoftMonetizationPreview('vip_celebration')}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              icon="flame-outline"
              label="🔥 Streak revive (24ч окно)"
              sub="Mock-оффер на цепочку 47 дней — посмотреть UI и формулу 35💎"
              onPress={async () => {
                doHaptic();
                // Симулируем потерю цепочки в 47 дней — markStreakLost создаёт оффер
                await markStreakLost(47);
                const offer = await getReviveOffer();
                setPreviewReviveOffer(offer);
                setSoftMonetizationPreview('streak_revive');
              }}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              icon="bar-chart-outline"
              label="📊 Stats blur (для !premium)"
              sub="Открыть streak_stats — посмотреть как выглядит для free"
              onPress={() => router.push('/streak_stats' as any)}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              icon="key-outline"
              label="🔓 ФОРС: pending celebration на следующий mount home"
              sub="Имитация admin-grant — выйди из настроек и зайди на home"
              onPress={async () => {
                doHaptic();
                await markCelebrationPending();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'pending выставлен — открой главный экран',
                  uk: 'pending виставлено — відкрий головний екран',
                  es: 'pending activado — abre la pantalla principal',
                  'pt-BR': 'pending definido — abra a tela inicial',
                  vi: 'đã đặt pending — mở màn hình chính',
                  id: 'pending disetel — buka layar utama',
                  tr: 'pending ayarlandı — ana ekranı aç',
                  pl: 'pending ustawione — otwórz ekran główny',
                }));
              }}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </AccordionSection>

          <AccordionSection
            id="activity_365_qa"
            icon="pulse-outline"
            title="Stats 365 QA"
            badge={2}
            open={openSection === 'activity_365_qa'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <ButtonRow
              testID="testers-365-random-open"
              icon="pulse-outline"
              label="Stats 365: random seeded year"
              sub="Seed yearly activity data and open streak_stats at the 365-day card"
              onPress={openStats365RandomQa}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            <ButtonRow
              testID="testers-stats-insights-seed"
              icon="sparkles-outline"
              label={statsInsightsSeedBusy ? 'Набиваю сид…' : 'ИИ-разбор: рандомный сид + открыть'}
              sub="Набивает данные по всем блокам (год + неделя + lifetime), включает premium, сбрасывает кэш ИИ-заметок и открывает статистику — чтобы увидеть готовый ИИ-разбор под каждым блоком"
              onPress={seedAndOpenStatsInsightsQa}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 4c. ПЕРСОНАЛИЗАЦИЯ ПЕЙВОЛЛА ── */}
          <AccordionSection
            id="paywall_personalization"
            icon="person-outline"
            title="Пейволл: персонализация"
            badge={6}
            open={openSection === 'paywall_personalization'}
            onToggle={(id) => {
              setOpenSection(openSection === id ? null : id);
              if (openSection !== id) void loadPaywallCounters();
            }}
          >
            <ButtonRow
              icon="refresh-circle-outline"
              label="🔄 Загрузить/обновить счётчики"
              sub="Читает из AsyncStorage: energy_zero, streak_lost, hard_blocks"
              onPress={() => { doHaptic(); void loadPaywallCounters(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            {paywallCounters !== null && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}>
                <Text style={{ color: ADMIN_TEXT, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                  Текущие значения:
                </Text>
                <Text style={{ color: ADMIN_TEXT, fontSize: 12 }}>
                  ⚡ Нет энергии: <Text style={{ color: '#fff', fontWeight: '700' }}>{paywallCounters.energy}</Text>
                  {'  '}🔥 Цепочка потеряна: <Text style={{ color: '#fff', fontWeight: '700' }}>{paywallCounters.streak}</Text>
                  {'  '}💜 Hard-блоки: <Text style={{ color: '#fff', fontWeight: '700' }}>{paywallCounters.hard}</Text>
                </Text>
                {paywallTagsPreview && paywallTagsPreview.length > 0 && (
                  <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, marginTop: 4 }}>
                    Теги: {paywallTagsPreview.join(' · ')}
                  </Text>
                )}
              </View>
            )}
            <ButtonRow
              icon="flash-outline"
              label="⚡ +1 energy_zero"
              sub="incrementEnergyZeroCount → обнови счётчики"
              onPress={() => { doHaptic(); incrementEnergyZeroCount(); setTimeout(() => void loadPaywallCounters(), 50); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="flame-outline"
              label="🔥 +1 streak_lost"
              sub="incrementStreakLostCount → обнови счётчики"
              onPress={() => { doHaptic(); incrementStreakLostCount(); setTimeout(() => void loadPaywallCounters(), 50); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="lock-closed-outline"
              label="💜 +1 hard_paywall_block"
              sub="incrementHardPaywallBlock → обнови счётчики"
              onPress={() => { doHaptic(); incrementHardPaywallBlock(); setTimeout(() => void loadPaywallCounters(), 50); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="🗑 Сбросить все счётчики"
              sub="multiRemove energy_zero + streak_lost + hard_blocks"
              danger
              onPress={async () => {
                doHaptic();
                await AsyncStorage.multiRemove([
                  ENERGY_ZERO_COUNT_KEY, STREAK_LOST_COUNT_KEY, HARD_PAYWALL_BLOCKS_KEY,
                ]);
                await loadPaywallCounters();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Счётчики пейволла сброшены',
                  uk: 'Лічильники пейволу скинуті',
                  es: 'Contadores del paywall restablecidos',
                  'pt-BR': 'Contadores do paywall redefinidos',
                  vi: 'Đã đặt lại bộ đếm paywall',
                  id: 'Penghitung paywall direset',
                  tr: 'Paywall sayaçları sıfırlandı',
                  pl: 'Liczniki paywalla zresetowane',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="card-outline"
              label="🎯 Открыть пейволл с персонализацией"
              sub="premium_modal с реальными тегами из данных"
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'generic', _force_trial_ui: '1' } } as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 4d. ТРЕНЕР ── */}
          <AccordionSection
            id="trainer_debug"
            icon="barbell-outline"
            title="Тренер: режимы и лог ошибок"
            badge={20}
            open={openSection === 'trainer_debug'}
            onToggle={(id) => {
              setOpenSection(openSection === id ? null : id);
              if (openSection !== id) void loadTrainerDebugState();
            }}
          >
            <ButtonRow
              icon="refresh-circle-outline"
              label="🔄 Обновить состояние тренера"
              sub="Сессии сегодня + топ ошибок"
              onPress={() => { doHaptic(); void loadTrainerDebugState(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            {freeSessionsLeft !== null && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: ADMIN_TEXT, fontSize: 12 }}>
                  Бесплатных сессий сегодня:{' '}
                  <Text style={{ color: freeSessionsLeft > 0 ? '#22C55E' : DANGER, fontWeight: '700' }}>
                    {freeSessionsLeft}
                  </Text>
                </Text>
              </View>
            )}
            {mistakeLogPreview !== null && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <Text style={{ color: ADMIN_TEXT, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  Топ ошибок ({mistakeLogPreview.length}):
                </Text>
                {mistakeLogPreview.length === 0 ? (
                  <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11 }}>Лог пуст</Text>
                ) : (
                  mistakeLogPreview.slice(0, 5).map(m => (
                    <Text key={m.phrase} style={{ color: ADMIN_TEXT, fontSize: 11 }}>
                      {m.phrase} — {m.count}×
                    </Text>
                  ))
                )}
              </View>
            )}
            <ButtonRow
              icon="navigate-outline"
              testID="trainer-qa-open-hub"
              label="🏋 Открыть Тренер (hub)"
              sub="Переход на /trainer"
              onPress={() => router.push('/trainer' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Текущий TrainerStore:
              </Text>
            </View>
            <ButtonRow
              icon="sparkles-outline"
              testID="trainer-qa-seed-weak"
              label="🌱 Засеять текущую «Мою практику»"
              sub="target-aware devSeedTrainerScenario('weak') + QA premium для Maestro"
              onPress={async () => {
                doHaptic();
                if (!(await prepareWeakTrainerQa())) return;
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'TrainerStore засеян: открой /trainer или текущие сессии ниже',
                  uk: 'TrainerStore засіяно: відкрий /trainer або поточні сесії нижче',
                  es: 'TrainerStore sembrado: abre /trainer o las sesiones actuales abajo',
                  'pt-BR': 'TrainerStore semeado: abra /trainer ou as sessões atuais abaixo',
                  vi: 'TrainerStore đã được seed: mở /trainer hoặc các phiên hiện tại bên dưới',
                  id: 'TrainerStore di-seed: buka /trainer atau sesi saat ini di bawah',
                  tr: 'TrainerStore seed edildi: /trainer ekranını veya aşağıdaki mevcut oturumları aç',
                  pl: 'TrainerStore zasiany: otwórz /trainer albo bieżące sesje poniżej',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="🧹 Очистить текущую «Мою практику»"
              sub="target-aware clearTrainerStore — только новый TrainerStore, не legacy active_recall"
              danger
              onPress={async () => {
                doHaptic();
                await clearTrainerStore(studyTarget);
                await loadTrainerDebugState();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'TrainerStore очищен',
                  uk: 'TrainerStore очищено',
                  es: 'TrainerStore limpiado',
                  'pt-BR': 'TrainerStore limpo',
                  vi: 'Đã xóa TrainerStore',
                  id: 'TrainerStore dibersihkan',
                  tr: 'TrainerStore temizlendi',
                  pl: 'TrainerStore wyczyszczony',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Текущие сессии тренера:
              </Text>
            </View>
            <ButtonRow
              icon="library-outline"
              label="Words session"
              sub="/trainer_words_session — актуальная сессия слов"
              onPress={() => router.push('/trainer_words_session' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="chatbubbles-outline"
              label="Phrases session"
              sub="/trainer_phrases_session — актуальная сессия фраз"
              onPress={() => router.push('/trainer_phrases_session' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="shield-checkmark-outline"
              label="Arena practice session"
              sub="/trainer_arena_session — актуальная сессия арены без давления"
              onPress={() => router.push('/trainer_arena_session' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="sparkles-outline"
              label="Smart Trainer — Smart Mix"
              sub="/trainer_smart_session?mode=smart_mix"
              onPress={() => router.push({ pathname: '/trainer_smart_session', params: { mode: 'smart_mix' } } as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="pulse-outline"
              label="Smart Trainer — Weak"
              sub="/trainer_smart_session?mode=weak"
              onPress={() => router.push({ pathname: '/trainer_smart_session', params: { mode: 'weak' } } as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="flame-outline"
              label="Smart Trainer — Hard"
              sub="/trainer_smart_session?mode=hard"
              onPress={() => router.push({ pathname: '/trainer_smart_session', params: { mode: 'hard' } } as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="analytics-outline"
              testID="trainer-qa-open-report-preview"
              label="Trainer: premium report preview"
              sub="/trainer_smart_session?mode=weak&preview=report"
              onPress={openTrainerReportPreview}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="bug-outline"
              testID="trainer-qa-open-mistake-preview"
              label="Trainer: mistake drill preview"
              sub="/trainer_smart_session?mode=weak&preview=mistake"
              onPress={openTrainerMistakePreview}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="add-circle-outline"
              label="🧪 Legacy /review: засеять 15 SRS ошибок"
              sub="active_recall + mistake_log для старого /review trainerMode"
              onPress={async () => {
                doHaptic();
                if (!allowEnglishDevMistakeSeed()) return;
                const seed: Array<[string, number, 'lesson' | 'quiz']> = [
                  ['pick up', 5, 'quiz'], ['pick up', 5, 'lesson'], ['pick up', 5, 'quiz'],
                  ['pick up', 5, 'lesson'], ['pick up', 5, 'quiz'],
                  ['let down', 3, 'lesson'], ['let down', 3, 'quiz'], ['let down', 3, 'lesson'],
                  ['burn out', 7, 'quiz'], ['burn out', 7, 'lesson'],
                  ['set off', 2, 'lesson'], ['set off', 2, 'quiz'], ['set off', 2, 'lesson'],
                  ['set off', 2, 'quiz'], ['set off', 2, 'lesson'],
                ];
                for (const [phrase, lessonId, mode] of seed) {
                  logMistake(phrase, lessonId, mode, 'wrong_pick', {}, studyTarget);
                  await new Promise<void>(r => setTimeout(r, 15));
                }
                await loadTrainerDebugState();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: '15 записей добавлено в лог ошибок',
                  uk: '15 записів додано в лог помилок',
                  es: '15 entradas añadidas al log de errores',
                  'pt-BR': '15 registros adicionados ao log de erros',
                  vi: 'Đã thêm 15 bản ghi vào nhật ký lỗi',
                  id: '15 entri ditambahkan ke log kesalahan',
                  tr: 'Hata günlüğüne 15 kayıt eklendi',
                  pl: 'Dodano 15 wpisów do dziennika błędów',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="🗑 Очистить лог ошибок"
              sub="clearMistakeLog(studyTarget) → AsyncStorage"
              danger
              onPress={async () => {
                doHaptic();
                await clearMistakeLog(studyTarget);
                await loadTrainerDebugState();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Лог ошибок очищен',
                  uk: 'Лог помилок очищено',
                  es: 'Log de errores limpiado',
                  'pt-BR': 'Log de erros limpo',
                  vi: 'Đã xóa nhật ký lỗi',
                  id: 'Log kesalahan dibersihkan',
                  tr: 'Hata günlüğü temizlendi',
                  pl: 'Dziennik błędów wyczyszczony',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="refresh-outline"
              label="♻️ Сбросить дневной лимит сессий"
              sub="Удалить trainer_free_session_v1 — даёт 1 бесплатную сессию снова"
              onPress={async () => {
                doHaptic();
                await AsyncStorage.removeItem(DAILY_FREE_SESSION_KEY);
                await loadTrainerDebugState();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Лимит сессий сброшен — 1 сессия доступна',
                  uk: 'Ліміт сесій скинуто — 1 сесія доступна',
                  es: 'Límite de sesiones restablecido — 1 sesión disponible',
                  'pt-BR': 'Limite de sessões redefinido — 1 sessão disponível',
                  vi: 'Đã đặt lại giới hạn phiên — còn 1 phiên',
                  id: 'Batas sesi direset — 1 sesi tersedia',
                  tr: 'Oturum sınırı sıfırlandı — 1 oturum kullanılabilir',
                  pl: 'Limit sesji zresetowany — dostępna 1 sesja',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            {/* Legacy active_recall modes */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Legacy SRS /review modes:
              </Text>
            </View>
            {([
              { mode: 'due' as TrainerMode, label: '📅 Due — повторение сегодня', free: true },
              { mode: 'fresh' as TrainerMode, label: '🌱 Fresh — новые фразы', free: true },
              { mode: 'weak' as TrainerMode, label: '📉 Weak — слабые (easeFactor ≤ 1.7)', free: false },
              { mode: 'hard' as TrainerMode, label: '💪 Hard — ошибки ≥ 3×', free: false },
              { mode: 'smart_mix' as TrainerMode, label: '🤖 Smart Mix — авто-выбор', free: false },
              { mode: 'by_topic' as TrainerMode, label: '📚 By Topic — урок 5', free: false },
              { mode: 'mistakes' as TrainerMode, label: '🎯 Mistakes — top mistake_log', free: false },
            ]).map(({ mode, label, free }) => (
              <ButtonRow
                key={mode}
                icon={free ? 'play-outline' : 'diamond-outline'}
                label={label}
                sub={free ? 'Legacy active_recall режим' : 'Legacy premium mode из active_recall'}
                onPress={() => {
                  if (!allowLegacyReviewModePreview()) return;
                  const params: Record<string, string> = { trainerMode: mode };
                  if (mode === 'by_topic') params.lessonId = '5';
                  if (mode === 'mistakes') params.category = 'article';
                  router.push({ pathname: '/review', params } as any);
                }}
                t={t} f={f} doHaptic={doHaptic}
              />
            ))}
          </AccordionSection>

          {/* ── 4e. ОШИБКИ И ПЕРСОНАЛЬНЫЕ ТРЕНИРОВКИ ── */}
          <AccordionSection
            id="phrase_analytics_debug"
            icon="analytics-outline"
            title="Ошибки → персональные тренировки"
            badge={35}
            open={openSection === 'phrase_analytics_debug'}
            onToggle={(id) => setOpenSection(openSection === id ? null : id)}
          >
            <ButtonRow
              icon="open-outline"
              label="📊 Открыть экран аналитики"
              sub="phrase_analytics_screen → /phrase_analytics_screen"
              onPress={() => {
                doHaptic();
                router.push('/phrase_analytics_screen' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="bug-outline"
              testID="testers-pos-audit-open"
              label="POS token audit"
              sub="Release coverage, exact events and unresolved token queue"
              onPress={() => {
                doHaptic();
                router.push('/pos_analytics_audit' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            {/* Mock-данные для тестирования перцентилей */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Mock-данные (без Firestore):
              </Text>
            </View>
            <ButtonRow
              icon="flask-outline"
              label="💉 Инжектировать mock-перцентили"
              sub="Устанавливает fake thresholds → все блоки перцентилей станут видны"
              onPress={() => {
                doHaptic();
                injectMockLeaderboardStats();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Mock-данные установлены — открой streak_stats или home',
                  uk: 'Mock-дані встановлено — відкрий streak_stats або home',
                  es: 'Mock inyectado — abre streak_stats o home',
                  'pt-BR': 'Mock definido — abra streak_stats ou home',
                  vi: 'Đã đặt mock — mở streak_stats hoặc home',
                  id: 'Mock disetel — buka streak_stats atau home',
                  tr: 'Mock veriler ayarlandı — streak_stats veya home aç',
                  pl: 'Mock ustawiony — otwórz streak_stats albo home',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="🗑 Сбросить mock (вернуть реальные данные)"
              sub="clearMockLeaderboardStats() → следующий запрос пойдёт в Firestore"
              onPress={() => {
                doHaptic();
                clearMockLeaderboardStats();
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Mock сброшен — перцентили снова из Firestore',
                  uk: 'Mock скинуто',
                  es: 'Mock borrado',
                  'pt-BR': 'Mock limpo — percentis voltam do Firestore',
                  vi: 'Đã xóa mock — percentile lại lấy từ Firestore',
                  id: 'Mock dihapus — persentil kembali dari Firestore',
                  tr: 'Mock sıfırlandı — yüzdelikler yeniden Firestore üzerinden',
                  pl: 'Mock wyczyszczony — percentyle znów z Firestore',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

            {/* Навигация к местам отображения перцентилей */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Где показываются перцентили:
              </Text>
            </View>
            <ButtonRow
              icon="stats-chart-outline"
              label="1. streak_stats — цепочка + XP + время"
              sub="5 блоков перцентилей (инжектирует mock автоматически)"
              onPress={() => {
                doHaptic();
                injectMockLeaderboardStats();
                router.push('/streak_stats' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="home-outline"
              label="2. home.tsx — мини-бейдж XP"
              sub="«Топ X% по опыту» под именем (только Premium; инжект mock)"
              onPress={() => {
                doHaptic();
                injectMockLeaderboardStats();
                router.push('/(tabs)/home' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trophy-outline"
              label="3. arena_leaderboard — рейтинг арены"
              sub="«Топ X% в арене» под своей строкой (инжект mock)"
              onPress={() => {
                doHaptic();
                injectMockLeaderboardStats();
                router.push('/arena_leaderboard' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="people-outline"
              label="4. LeagueResultModal — % группы"
              sub="Сразу симулирует итог недели и открывает актуальный LeagueResultModal"
              onPress={triggerEndOfWeek}
              t={t} f={f} doHaptic={doHaptic}
            />
            {/* Diagnosis trainer экран */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Diagnosis trainer — экран тренировки:
              </Text>
            </View>
            {diagnosisDevBlocked ? (
              <View
                testID="admin-french-personal-practice-source-gate"
                style={{ marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: ACCENT_BORDER_SOFT, backgroundColor: ADMIN_SURFACE_DANGER }}
              >
                <Text style={{ color: DANGER_TEXT, fontSize: f.body, fontWeight: '800', marginBottom: 4 }}>
                  {frenchPersonalPracticeGate.title}
                </Text>
                <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35) }}>
                  {frenchPersonalPracticeGate.body}
                </Text>
              </View>
            ) : null}
            {([
              { category: 'article', id: 'article_a_an' },
              { category: 'article', id: 'article_the_specific' },
              { category: 'article', id: 'article_zero' },
              { category: 'preposition', id: 'preposition_time_in_on_at' },
              { category: 'preposition', id: 'preposition_place_in_on_at' },
              { category: 'preposition', id: 'preposition_duration_for_since' },
              { category: 'preposition', id: 'preposition_direction_to_into_from' },
              { category: 'preposition', id: 'preposition_common_verb_patterns' },
              { category: 'syntax', id: 'object_order_give_me_it' },
              { category: 'syntax', id: 'word_order_basic_statement' },
              { category: 'syntax', id: 'word_order_basic_question' },
              { category: 'verb', id: 'verb_present_simple_negative_question' },
              { category: 'verb', id: 'verb_present_continuous_basic' },
              { category: 'verb', id: 'verb_present_simple_vs_continuous' },
              { category: 'verb', id: 'verb_past_simple_regular_irregular' },
              { category: 'verb', id: 'verb_was_were' },
              { category: 'verb', id: 'future_will_going_to' },
              { category: 'verb', id: 'infinitive_vs_gerund_basic' },
              { category: 'modifier', id: 'too_enough' },
              { category: 'modifier', id: 'modifier_very_really_quite' },
              { category: 'verb', id: 'verb_present_simple_statement' },
              { category: 'verb', id: 'verb_third_person' },
              { category: 'to-be', id: 'to_be_present_agreement' },
              { category: 'modal', id: 'modal_base_form' },
              { category: 'modal', id: 'modal_force' },
              { category: 'pronoun', id: 'pronoun_case' },
              { category: 'pronoun', id: 'pronoun_possessive' },
              { category: 'adjective', id: 'adjective_comparison' },
              { category: 'adverb', id: 'adjective_vs_adverb' },
              { category: 'adverb', id: 'adverb_frequency_position' },
              { category: 'conjunction', id: 'conjunction_logic' },
              { category: 'phrasal_particle', id: 'phrasal_particle_pair' },
              { category: 'determiner', id: 'quantifier_some_any' },
              { category: 'determiner', id: 'determiner_this_that_these_those' },
              { category: 'existential', id: 'there_is_are' },
              { category: 'noun', id: 'noun_singular_plural_basic' },
            ] as const).map(({ category, id: microDiagnosisId }) => (
              <ButtonRow
                key={microDiagnosisId}
                icon="git-compare-outline"
                label={`Open diagnosis: ${microDiagnosisId}`}
                sub={diagnosisDevBlocked ? frenchPersonalPracticeGate.body : `/problem_coach?category=${category}&microDiagnosisId=${microDiagnosisId}`}
                onPress={() => {
                  openDiagnosisDevRoute(category, microDiagnosisId);
                }}
                t={t} f={f} doHaptic={doHaptic}
              />
            ))}
            {/* CoachToast превью */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Diagnosis Toast:
              </Text>
            </View>
            <ButtonRow
              icon="school-outline"
              label="Тост: «Разобрать тему — Глаголы»"
              sub="CoachToast → после сессии при 3+ точных ошибках одной категории"
              onPress={() => {
                doHaptic();
                setCoachToastPreview({
                  show: true,
                  category: 'verb',
                  labelRu: 'Глаголы',
                  labelUk: 'Дієслова',
                  labelEs: 'Verbos',
                  labelPtBr: 'Verbos',
                  labelVi: 'Động từ',
                  labelId: 'Kata kerja',
                  labelTr: 'Fiiller',
                  labelPl: 'Czasowniki',
                  mistakeCount: 3,
                  weaknessScore: 72,
                });
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="school-outline"
              label="Тост: «Разобрать тему — Артикли»"
              sub="Категорийный пример без microDiagnosisId"
              onPress={() => {
                doHaptic();
                setCoachToastPreview({
                  show: true,
                  category: 'article',
                  labelRu: 'Артикли',
                  labelUk: 'Артиклі',
                  labelEs: 'Artículos',
                  labelPtBr: 'Artigos',
                  labelVi: 'Mạo từ',
                  labelId: 'Artikel',
                  labelTr: 'Artikeller',
                  labelPl: 'Przedimki',
                  mistakeCount: 3,
                  weaknessScore: 72,
                });
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="git-compare-outline"
              label="Тост: точная ошибка — a/an"
              sub="microDiagnosisId=article_a_an → Diagnosis trainer → Smart Trainer"
              onPress={() => {
                doHaptic();
                setCoachToastPreview({
                  show: true,
                  category: 'article',
                  labelRu: 'Артикли',
                  labelUk: 'Артиклі',
                  labelEs: 'Artículos',
                  labelPtBr: 'Artigos',
                  labelVi: 'Mạo từ',
                  labelId: 'Artikel',
                  labelTr: 'Artikeller',
                  labelPl: 'Przedimki',
                  mistakeCount: 3,
                  weaknessScore: 78,
                  focusWords: ['a', 'an'],
                  microDiagnosisId: 'article_a_an',
                  microLabelRu: 'a/an перед звуком',
                  microLabelUk: 'a/an перед звуком',
                  microLabelEs: 'a/an antes del sonido',
                  microLabelPtBr: 'a/an antes do som',
                  microLabelVi: 'a/an trước âm',
                  microLabelId: 'a/an sebelum bunyi',
                  microLabelTr: 'sesten önce a/an',
                  microLabelPl: 'a/an przed dźwiękiem',
                  diagnosisEvidenceCount: 3,
                });
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="git-compare-outline"
              label="Тост: точная ошибка — in/on/at time"
              sub="microDiagnosisId=preposition_time_in_on_at → отдельная тренировка"
              onPress={() => {
                doHaptic();
                setCoachToastPreview({
                  show: true,
                  category: 'preposition',
                  labelRu: 'Предлоги',
                  labelUk: 'Прийменники',
                  labelEs: 'Preposiciones',
                  labelPtBr: 'Preposições',
                  labelVi: 'Giới từ',
                  labelId: 'Preposisi',
                  labelTr: 'Edatlar',
                  labelPl: 'Przyimki',
                  mistakeCount: 3,
                  weaknessScore: 80,
                  focusWords: ['in', 'on', 'at'],
                  microDiagnosisId: 'preposition_time_in_on_at',
                  microLabelRu: 'in/on/at для времени',
                  microLabelUk: 'in/on/at для часу',
                  microLabelEs: 'in/on/at para tiempo',
                  microLabelPtBr: 'in/on/at para tempo',
                  microLabelVi: 'in/on/at cho thời gian',
                  microLabelId: 'in/on/at untuk waktu',
                  microLabelTr: 'zaman için in/on/at',
                  microLabelPl: 'in/on/at dla czasu',
                  diagnosisEvidenceCount: 3,
                });
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="flask-outline"
              label="Тест тоста из реальных ошибок лога"
              sub="Берёт exact POS события из mistake_log и persistent analytics"
              onPress={async () => {
                doHaptic();
                const snapshot = await getMistakeLogDebugSnapshot(60, studyTarget);
                const exactMistakes = snapshot.events
                  .filter(event => event.exactSignal && event.resolvedCategory)
                  .map(event => ({
                    phrase: event.phrase,
                    tokenText: event.tokenText || event.expected || event.phrase,
                    expected: event.expected,
                    picked: event.picked,
                    rawCategory: event.rawCategory,
                    category: event.resolvedCategory!,
                    grammarTag: event.grammarTag,
                  }));
                const decision = await checkCoachToastNeededWithAnalytics(exactMistakes, studyTarget, lang === 'uk' ? 'uk' : 'ru');
                if (decision.show) {
                  setCoachToastPreview(decision);
                } else {
                  AppInfoDialog.alert('CoachToast', 'Нет диагностируемого exact-паттерна: нужно ≥3 точных ошибки одной категории. Засей exact POS лог сначала.');
                }
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="flask-outline"
              label="🌱 Засеять exact POS ошибки (15 записей)"
              sub="Артикли, предлоги и do/does с token/category метаданными"
              onPress={async () => {
                doHaptic();
                if (!allowEnglishDevMistakeSeed()) return;
                const testMistakes = [
                  { phrase: 'I am an engineer', lessonId: 7, tokenText: 'an', picked: 'a', rawCategory: 'article_a_an', category: 'article' as const },
                  { phrase: 'She is an artist', lessonId: 7, tokenText: 'an', picked: 'a', rawCategory: 'article_a_an', category: 'article' as const },
                  { phrase: 'He bought a car', lessonId: 7, tokenText: 'a', picked: 'an', rawCategory: 'article_a_an', category: 'article' as const },
                  { phrase: 'The book is on the table', lessonId: 19, tokenText: 'the', picked: 'a', rawCategory: 'article_specific', category: 'article' as const },
                  { phrase: 'Open the door', lessonId: 19, tokenText: 'the', picked: 'a', rawCategory: 'article_specific', category: 'article' as const },
                  { phrase: 'We meet on Monday', lessonId: 19, tokenText: 'on', picked: 'in', rawCategory: 'preposition_time', category: 'preposition' as const },
                  { phrase: 'The lesson starts at seven', lessonId: 19, tokenText: 'at', picked: 'on', rawCategory: 'preposition_time', category: 'preposition' as const },
                  { phrase: 'I was born in May', lessonId: 19, tokenText: 'in', picked: 'at', rawCategory: 'preposition_time', category: 'preposition' as const },
                  { phrase: 'She is at school', lessonId: 20, tokenText: 'at', picked: 'in', rawCategory: 'preposition_place', category: 'preposition' as const },
                  { phrase: 'The keys are on the table', lessonId: 20, tokenText: 'on', picked: 'in', rawCategory: 'preposition_place', category: 'preposition' as const },
                  { phrase: 'They live in London', lessonId: 20, tokenText: 'in', picked: 'at', rawCategory: 'preposition_place', category: 'preposition' as const },
                  { phrase: 'Does she work here?', lessonId: 4, tokenText: 'does', picked: 'works', rawCategory: 'verb_question', category: 'verb' as const },
                  { phrase: 'He does not work here', lessonId: 4, tokenText: 'does', picked: 'works', rawCategory: 'verb_negative', category: 'verb' as const },
                  { phrase: 'Do they play football?', lessonId: 4, tokenText: 'do', picked: 'plays', rawCategory: 'verb_question', category: 'verb' as const },
                  { phrase: 'She can swim well', lessonId: 10, tokenText: 'swim', picked: 'swims', rawCategory: 'verb_after_modal', category: 'verb' as const },
                ];
                for (const { phrase, lessonId, ...meta } of testMistakes) {
                  logMistake(phrase, lessonId, 'lesson', 'wrong_pick', {
                    ...meta,
                    expected: meta.tokenText,
                  }, studyTarget);
                  await new Promise((r) => setTimeout(r, 5));
                }
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: '15 exact POS записей добавлено → проверь CoachToast и аналитику',
                  uk: '15 exact POS записів додано → перевір CoachToast і аналітику',
                  es: '15 eventos POS exactos añadidos → revisa CoachToast y analítica',
                  'pt-BR': '15 registros exact POS adicionados → confira CoachToast e analytics',
                  vi: 'Đã thêm 15 bản ghi exact POS → kiểm tra CoachToast và analytics',
                  id: '15 catatan exact POS ditambahkan → periksa CoachToast dan analytics',
                  tr: '15 exact POS kaydı eklendi → CoachToast ve analitiği kontrol et',
                  pl: 'Dodano 15 wpisów exact POS → sprawdź CoachToast i analitykę',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="🗑 Очистить лог (аналитика → пустая)"
              sub="clearMistakeLog(studyTarget) + invalidatePhraseIndex()"
              danger
              onPress={async () => {
                doHaptic();
                await clearMistakeLog(studyTarget);
                emitAppEvent('action_toast', actionToastTri('success', {
                  ru: 'Лог очищен — аналитика пустая',
                  uk: 'Лог очищено',
                  es: 'Log limpiado',
                  'pt-BR': 'Log limpo — analytics vazio',
                  vi: 'Đã xóa log — analytics trống',
                  id: 'Log dibersihkan — analytics kosong',
                  tr: 'Günlük temizlendi — analiz boş',
                  pl: 'Log wyczyszczony — analityka pusta',
                }));
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 5. ТОСТЫ И НОТИФИКАЦИИ ── */}
          <AccordionSection id="toasts" icon="notifications-outline" title="Тосты и нотификации" badge={ALL_ACHIEVEMENTS.slice(0, 5).length + 1 + ADMIN_DAILY_TASK_REWARD_TOAST_PREVIEWS.length}
            open={openSection === 'toasts'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {ALL_ACHIEVEMENTS.slice(0, 5).map(ach => (
              <ButtonRow key={`ach_${ach.id}`} icon="star-half-outline"
                label={`🏅 ${ach.nameRu ?? ach.id}`}
                sub="Тост достижения"
                onPress={() => showAchievement(ach)}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            <ButtonRow icon="star-outline" label="🏅 Тост — streak_7"
              sub="Показать тост с наградой"
              onPress={() => { const a = ALL_ACHIEVEMENTS.find(a => a.id === 'streak_7') ?? ALL_ACHIEVEMENTS[0]; if (a) showAchievement(a); }}
              t={t} f={f} doHaptic={doHaptic} />
            {ADMIN_DAILY_TASK_REWARD_TOAST_PREVIEWS.map((preview) => (
              <ButtonRow
                key={`daily_reward_toast_${preview.themeMode}`}
                icon={preview.icon}
                label={preview.label}
                sub={preview.sub}
                testID={`admin-daily-task-reward-toast-${preview.themeMode}`}
                onPress={() => showDailyTaskRewardToastPreview(preview.themeMode)}
                t={t}
                f={f}
                doHaptic={doHaptic}
              />
            ))}
          </AccordionSection>

          {/* ── 5b. МЕДАЛЬНЫЕ ТОСТЫ (premium MedalToast) ── */}
          <AccordionSection id="medal_toasts" icon="ribbon-outline" title="Тосты медалей (premium)" badge={6}
            open={openSection === 'medal_toasts'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="trending-up-outline"
              label="🥉 Бронза получена"
              sub="MedalToast • bronze • promoted=true"
              onPress={() => showMedalPreview('bronze', true)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trending-down-outline"
              label="🥉 Бронза потеряна"
              sub="MedalToast • bronze • promoted=false"
              onPress={() => showMedalPreview('bronze', false)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trending-up-outline"
              label="🥈 Серебро получено"
              sub="MedalToast • silver • promoted=true"
              onPress={() => showMedalPreview('silver', true)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trending-down-outline"
              label="🥈 Серебро потеряно"
              sub="MedalToast • silver • promoted=false"
              onPress={() => showMedalPreview('silver', false)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trending-up-outline"
              label="🥇 Золото получено"
              sub="MedalToast • gold • promoted=true"
              onPress={() => showMedalPreview('gold', true)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trending-down-outline"
              label="🥇 Золото потеряно"
              sub="MedalToast • gold • promoted=false"
              onPress={() => showMedalPreview('gold', false)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 6. LEVEL UP И ПОДАРКИ ── */}
          <AccordionSection id="levelup" icon="gift-outline" title="Level-up и подарки" badge={16}
            open={openSection === 'levelup'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([5, 10, 15, 20, 30, 35, 50] as const).map(lvl => (
              <ButtonRow key={`gift_${lvl}`} icon="gift-outline"
                testID={`admin-level-gift-${lvl}`}
                label={`🎁 Подарок уровня ${lvl}`}
                sub="Превью: один сундук (level-up)"
                onPress={() => { setGiftModalLevel(lvl); setGiftModalVisible(true); }}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            {([5, 10, 20] as const).map(lvl => (
              <ButtonRow key={`gifts_dual_${lvl}`} icon="diamond-outline"
                label={`💎 Два сундука (премиум) — ур. ${lvl}`}
                sub="Превью: два сундука (как у Premium при level-up)"
                onPress={() => { setGiftDualModalLevel(lvl); setGiftDualModalVisible(true); }}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            {([10, 20, 30, 40, 50] as const).map(lvl => (
              <ButtonRow key={`lvlup_${lvl}`} icon="arrow-up-circle-outline"
                label={`⬆️ Global level-up — уровень ${lvl}`}
                sub="Показать боевой global overlay из _layout.tsx"
                onPress={() => triggerGlobalLevelUp(lvl)}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            <ButtonRow icon="globe-outline" label="🌍 ГЛОБАЛЬНЫЙ level-up (уровень 5)"
              sub="Тест GlobalLevelUpHandler из _layout.tsx"
              onPress={() => triggerGlobalLevelUp(5)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 7. ОСКОЛКИ ── */}
          <AccordionSection id="shards" icon="diamond-outline" title="Осколки" badge={5}
            open={openSection === 'shards'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
              testID="testers-profile-card-seed"
              icon="id-card-outline"
              label="QA: карточка профиля + 1200 осколков"
              sub="Сбросить CARD 0, выдать осколки и открыть экран аватара"
              onPress={() => { void seedProfileCardUpgradeQa(); }}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
            {([
              { source: 'lesson_first' as const, label: '+1 Первый урок', reason: 'Первое прохождение урока' },
              { source: 'lesson_perfect' as const, label: '+2 Идеальный урок', reason: 'Идеальный урок (0 ошибок)' },
              { source: 'arena_win' as const, label: '+1 Победа в арене', reason: 'Победа в Арене' },
              { source: 'streak_7' as const, label: '+3 Цепочка 7 дней', reason: '7 дней цепочки подряд' },
              { source: 'topic_completed' as const, label: '+3 Тема завершена', reason: 'Все уроки темы пройдены' },
            ]).map(item => (
              <ButtonRow key={item.source} icon="diamond-outline" label={item.label} sub={item.reason}
                onPress={async () => {
                  doHaptic();
                  await addShards(item.source);
                }}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
          </AccordionSection>

          {/* ── 8. ОНБОРДИНГ ── */}
          <AccordionSection id="onboarding" icon="play-circle-outline" title="Онбординг" badge={8}
            open={openSection === 'onboarding'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="play-circle-outline" label="👋 Онбординг — просмотреть повторно"
              onPress={async () => {
                await AsyncStorage.multiRemove(['onboarding_done', 'onboarding_step']);
                emitAppEvent('account_deleted');
                router.replace('/(tabs)/home' as any);
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="flash-outline" label="⚡ Онбординг энергии"
              sub="Показать подсказку про энергию"
              onPress={async () => {
                await AsyncStorage.multiRemove(['energy_onboarding_shown', 'from_welcome_first_lesson']);
                setDeferEnergyOnboardingForPostOnboardingFirstLesson(false);
                router.replace('/(tabs)/home' as any);
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="albums-outline" label="📖 Превью интро уроков (1–32)"
              sub="Сетка всех уроков · открывает реальный экран онбординга без запуска урока"
              onPress={() => router.push('/admin_intro_preview' as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow
              testID="admin-intro-full-access-activate"
              icon="lock-open-outline"
              label="Intro Full Access - включить 3 дня"
              sub="Локальный подарок после onboarding: открывает hasPremiumAccess, но не трогает Premium/VIP."
              onPress={() => { void activateIntroFullAccessQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-intro-full-access-expire"
              icon="timer-outline"
              label="Intro Full Access - завершить сейчас"
              sub="Ставит истекший таймер и сбрасывает seen окончания, чтобы проверить мягкую модалку."
              onPress={() => { void expireIntroFullAccessQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-intro-full-access-reset"
              icon="refresh-circle-outline"
              label="Intro Full Access - сбросить"
              sub="Удаляет локальные ключи подарка и seen-флаги."
              onPress={() => { void resetIntroFullAccessQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-loyalty-gift-activate"
              icon="gift-outline"
              label="Подарок лояльности - включить 3 дня"
              sub="Подарок существующим free-юзерам: открывает hasPremiumAccess, Premium/VIP не трогает."
              onPress={() => { void activateLoyaltyGiftQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-loyalty-gift-expire"
              icon="timer-outline"
              label="Подарок лояльности - завершить сейчас"
              sub="Истекший таймер + сброс seen окончания — проверить мягкую модалку конца."
              onPress={() => { void expireLoyaltyGiftQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-loyalty-gift-reset"
              icon="refresh-circle-outline"
              label="Подарок лояльности - сбросить (откат)"
              sub="Удаляет все ключи подарка (включая одноразовость) — доступ снимается, предложение покажется снова."
              onPress={() => { void resetLoyaltyGiftQa(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-intro-full-access-preview-welcome"
              icon="sparkles-outline"
              label="Превью модалки подарка"
              sub="Показывает welcome-модалку без изменения storage."
              onPress={() => setIntroFullAccessPreview('welcome')}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              testID="admin-intro-full-access-preview-ended"
              icon="shield-checkmark-outline"
              label="Превью модалки окончания"
              sub="Показывает ended-модалку без изменения storage."
              onPress={() => setIntroFullAccessPreview('ended')}
              t={t} f={f} doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 9. КОНВЕРСИОННЫЕ ПУШИ (QA) ── */}
          <AccordionSection id="conversion_push" icon="notifications-outline" title="Конверсионные пуши (QA)" badge={5}
            open={openSection === 'conversion_push'} onToggle={id => setOpenSection(openSection === id ? null : id)}>

            <ButtonRow
              testID="admin-intro-expiring-notif-schedule"
              icon="timer-outline"
              label="🔔 Пуш «Premium истекает» — через 5 сек"
              sub="Симулирует пуш за 2ч до конца intro. Придёт через 5 секунд для QA."
              onPress={() => {
                void (async () => {
                  try {
                    await cancelIntroExpiringNotification();
                    // QA: fakeEndsAt = now + 2ч + 5сек → пуш через 5 сек
                    const fakeEndsAt = Date.now() + 2 * 60 * 60 * 1000 + 5_000;
                    await scheduleIntroExpiringNotification(fakeEndsAt, lang, { minSeconds: 0 });
                    AppInfoDialog.alert('Пуш запланирован', 'Через ~5 сек придёт пуш «Premium истекает через 2 часа».\nУбедись что уведомления разрешены.');
                  } catch (e) {
                    AppInfoDialog.alert('Ошибка', String(e));
                  }
                })();
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

            <ButtonRow
              testID="admin-upsell-d4-schedule"
              icon="megaphone-outline"
              label="🔔 Upsell D+4 — через 5 сек"
              sub="«Твой прогресс продолжается» — придёт через 5 сек."
              onPress={() => {
                void (async () => {
                  try {
                    await cancelUpsellNotifications();
                    // QA: introEndedAt = now - 4 дня + 5 сек → D+4 через 5 сек
                    const fakeIntroEndedAt = Date.now() - 4 * 24 * 60 * 60 * 1000 + 5_000;
                    await scheduleUpsellNotifications(fakeIntroEndedAt, lang, { minSeconds: 0 });
                    AppInfoDialog.alert('D+4 запланирован', 'Через ~5 сек придёт upsell D+4.');
                  } catch (e) {
                    AppInfoDialog.alert('Ошибка', String(e));
                  }
                })();
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

            <ButtonRow
              testID="admin-upsell-d7-schedule"
              icon="megaphone-outline"
              label="🔔 Upsell D+7 — через 5 сек"
              sub="«Энергия мешает учиться?» — придёт через 5 сек."
              onPress={() => {
                void (async () => {
                  try {
                    await cancelUpsellNotifications();
                    const fakeIntroEndedAt = Date.now() - 7 * 24 * 60 * 60 * 1000 + 5_000;
                    await scheduleUpsellNotifications(fakeIntroEndedAt, lang, { minSeconds: 0 });
                    AppInfoDialog.alert('D+7 запланирован', 'Через ~5 сек придёт upsell D+7.');
                  } catch (e) {
                    AppInfoDialog.alert('Ошибка', String(e));
                  }
                })();
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

            <ButtonRow
              testID="admin-upsell-d14-schedule"
              icon="megaphone-outline"
              label="🔔 Upsell D+14 — через 5 сек"
              sub="«2 недели — и ты всё ещё здесь» — придёт через 5 сек."
              onPress={() => {
                void (async () => {
                  try {
                    await cancelUpsellNotifications();
                    const fakeIntroEndedAt = Date.now() - 14 * 24 * 60 * 60 * 1000 + 5_000;
                    await scheduleUpsellNotifications(fakeIntroEndedAt, lang, { minSeconds: 0 });
                    AppInfoDialog.alert('D+14 запланирован', 'Через ~5 сек придёт upsell D+14.');
                  } catch (e) {
                    AppInfoDialog.alert('Ошибка', String(e));
                  }
                })();
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

            <ButtonRow
              testID="admin-upsell-notifs-cancel"
              icon="notifications-off-outline"
              label="❌ Отменить все конверсионные пуши"
              sub="Удаляет expiring-пуш и D+4/D+7/D+14 из системы."
              onPress={() => {
                void (async () => {
                  await cancelIntroExpiringNotification();
                  await cancelUpsellNotifications();
                  AppInfoDialog.alert('Отменено', 'Все конверсионные уведомления удалены из очереди.');
                })();
              }}
              t={t} f={f} doHaptic={doHaptic}
            />

          </AccordionSection>

          {/* ── 10. ACTIVE CORE MODALS (QA) ── */}
          <AccordionSection id="core_modals" icon="construct-outline" title="Активные core-модалки (QA)" badge={19}
            open={openSection === 'core_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="flash-outline" label="⚡ NoEnergy — обычная"
              sub="Как при нуле энергии в уроке (текст + Понятно + Premium)"
              onPress={() => { setNoEnergyPreview({}); markQa('noEnergy'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="diamond-outline" label="⚡ NoEnergy + осколки (превью)"
              sub="Принудительно показать кнопку «Восстановить за 💎» даже при полном баке"
              onPress={() => { setNoEnergyPreview({ qaForceShardCta: true, paywallContext: 'quiz_limit' }); markQa('noEnergy'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="school-outline" label="⚡ NoEnergy — экзамен (8 ⚡)"
              sub="Как у Лингмана: «Недостаточно энергии», порог 8 + восстановление за осколки (превью)"
              onPress={() => { setNoEnergyPreview({ minRequired: 8, paywallContext: 'no_energy', qaForceShardCta: true }); markQa('noEnergy'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="home-outline" label="⚡ NoEnergy — кнопка «На главную»"
              sub="Как при входе в квиз без энергии (onBackHome)"
              onPress={() => { setNoEnergyPreview({ withBackHome: true, paywallContext: 'quiz_limit' }); markQa('noEnergy'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trophy-outline" label="⚔️ ArenaLimitModal — Matchmaking"
              sub="Лимит матчей в арене"
              onPress={() => { setArenaLimitMode('matchmaking'); markQa('arenaLimit'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="link-outline" label="⚔️ ArenaLimitModal — Invite"
              sub="Лимит приглашений в арене"
              onPress={() => { setArenaLimitMode('invite'); markQa('arenaLimit'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="timer-outline" label="⏰ QuizTimeoutModal — Normal"
              sub="Таймаут квиза (обычный)"
              onPress={() => { setQuizTimeoutHardMode(false); markQa('quizTimeout'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="alert-circle-outline" label="⏰ QuizTimeoutModal — Hard"
              sub="Таймаут квиза (hardMode)"
              onPress={() => { setQuizTimeoutHardMode(true); markQa('quizTimeout'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="warning-outline" label="⚠️ UserWarningModal"
              sub="Системное предупреждение пользователю"
              onPress={() => { setUserWarningVisible(true); markQa('userWarning'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="diamond-outline" label="💎 ShardsEarnedModal — глобальный поток"
              sub="Текущий production-путь: emitAppEvent('shards_earned') → GlobalShardsEarnedHost"
              onPress={showShardsEarnedPreview}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="flag-outline" label="🚩 ReportUserModal (safe preview)"
              sub="Только UI, без записи репорта"
              onPress={() => { setReportUserPreviewVisible(true); markQa('reportModal'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="checkmark-done-outline" label="✅ ActionToast (success)"
              sub="Новый глобальный ActionToast"
              onPress={() => {
                emitAppEvent(
                  'action_toast',
                  actionToastTri('success', {
                    ru: 'Проверка ActionToast: SUCCESS',
                    uk: 'Перевірка ActionToast: SUCCESS',
                    es: 'Prueba ActionToast: SUCCESS',
                    'pt-BR': 'Teste ActionToast: SUCCESS',
                    vi: 'Kiểm tra ActionToast: SUCCESS',
                    id: 'Uji ActionToast: SUCCESS',
                    tr: 'ActionToast testi: SUCCESS',
                    pl: 'Test ActionToast: SUCCESS',
                  }),
                );
                markQa('actionToast');
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="warning-outline" label="⚠️ ActionToast (error)"
              sub="Новый глобальный ActionToast"
              onPress={() => {
                emitAppEvent(
                  'action_toast',
                  actionToastTri('error', {
                    ru: 'Проверка ActionToast: ERROR',
                    uk: 'Перевірка ActionToast: ERROR',
                    es: 'Prueba ActionToast: ERROR',
                    'pt-BR': 'Teste ActionToast: ERROR',
                    vi: 'Kiểm tra ActionToast: ERROR',
                    id: 'Uji ActionToast: ERROR',
                    tr: 'ActionToast testi: ERROR',
                    pl: 'Test ActionToast: ERROR',
                  }),
                );
                markQa('actionToast');
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="information-circle-outline" label="ℹ️ ActionToast (info)"
              sub="Новый глобальный ActionToast"
              onPress={() => {
                emitAppEvent(
                  'action_toast',
                  actionToastTri('info', {
                    ru: 'Проверка ActionToast: INFO',
                    uk: 'Перевірка ActionToast: INFO',
                    es: 'Prueba ActionToast: INFO',
                    'pt-BR': 'Teste ActionToast: INFO',
                    vi: 'Kiểm tra ActionToast: INFO',
                    id: 'Uji ActionToast: INFO',
                    tr: 'ActionToast testi: INFO',
                    pl: 'Test ActionToast: INFO',
                  }),
                );
                markQa('actionToast');
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="cloud-download-outline" label="🆕 UpdateModal preview"
              sub="Форс-апдейт модалка"
              onPress={() => { setUpdateModalVisible(true); markQa('updateModal'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="notifications-outline" label="🔔 Промпт уведомлений (pre-permission)"
              sub="Показать кастомную модалку перед системным запросом"
              onPress={() => { setNotifPermissionPreviewVisible(true); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="document-text-outline" label="✨ ReleaseNotesModal preview"
              sub="Актуальная welcome-to-new-version модалка из _layout"
              onPress={() => { setReleaseNotesPreviewVisible(true); markQa('releaseNotes'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="sparkles-outline" label="✨ Большое обновление / Premium после 3 урока"
              sub="Новая одноразовая модалка для существующих free-пользователей"
              testID="admin-preview-release-notes-premium-gate"
              onPress={() => { setReleaseNotesPreviewVisible(true); markQa('releaseNotes'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="megaphone-outline" label="📣 GlobalBroadcastModal preview"
              sub="Preview-only: активная broadcast-модалка без claim, cloud-write и награды"
              onPress={() => { setGlobalBroadcastPreview(ADMIN_GLOBAL_BROADCAST_PREVIEW); markQa('globalBroadcast'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="people-outline" label="⚔️ MatchFoundToast mock"
              sub="status=found без сети (релиз и dev)"
              onPress={triggerMatchFoundToastPreview}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          <AccordionSection id="daily_tasks_qa" icon="checkbox-outline" title="Daily tasks QA" badge={DAILY_TASK_QA_PACKS.length + 5}
            open={openSection === 'daily_tasks_qa'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
              icon="calendar-outline"
              label="Daily plan modal preview"
              sub="Первый дневной вход · реальные иконки · заменить все задания"
              onPress={() => { void openDailyPlanPreview(); }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="open-outline"
              label="Open Daily Tasks"
              sub="Use after any pack seed to test card taps and reward buttons"
              onPress={() => router.push('/daily_tasks_screen' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon={dailyTaskSeedMode === 'empty' ? 'radio-button-on-outline' : 'radio-button-off-outline'}
              label="Seed mode: empty"
              sub="Cards are actionable: tap checks navigation targets"
              onPress={() => setDailyTaskSeedMode('empty')}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon={dailyTaskSeedMode === 'ready' ? 'radio-button-on-outline' : 'radio-button-off-outline'}
              label="Seed mode: ready"
              sub="Conditions are completed: test XP claim and all-3 shards"
              onPress={() => setDailyTaskSeedMode('ready')}
              testID="testers-daily-tasks-seed-ready"
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon={dailyTaskSeedMode === 'claimed' ? 'radio-button-on-outline' : 'radio-button-off-outline'}
              label="Seed mode: claimed"
              sub="Rewards are already received: test claimed state"
              onPress={() => setDailyTaskSeedMode('claimed')}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="trash-outline"
              label="Clear daily task override"
              sub="Return to the real day schedule"
              onPress={clearDailyTaskQaOverride}
              t={t} f={f} doHaptic={doHaptic}
            />
            {DAILY_TASK_QA_PACKS.map((pack) => (
              <ButtonRow
                key={pack.id}
                icon="list-outline"
                label={`Pack ${pack.label}`}
                sub={pack.types.join(' / ')}
                onPress={() => void seedDailyTaskPackForQa(pack)}
                testID={`testers-daily-tasks-pack-${pack.id}`}
                t={t}
                f={f}
                doHaptic={doHaptic}
              />
            ))}
          </AccordionSection>

          <AccordionSection id="qa_checklist" icon="checkbox-outline" title="QA чеклист (dev)" badge={Object.values(qaChecks).filter(Boolean).length}
            open={openSection === 'qa_checklist'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([
              ['noEnergy', 'NoEnergyModal'],
              ['arenaLimit', 'ArenaLimitModal'],
              ['quizTimeout', 'QuizTimeoutModal'],
              ['userWarning', 'UserWarningModal'],
              ['shardsEarned', 'ShardsEarnedModal / GlobalShardsEarnedHost'],
              ['reportModal', 'ReportUserModal preview'],
              ['actionToast', 'ActionToast (all types)'],
              ['dailyTaskRewardToast', 'Daily task reward toast themes'],
              ['updateModal', 'UpdateModal'],
              ['releaseNotes', 'ReleaseNotesModal'],
              ['globalBroadcast', 'GlobalBroadcastModal preview-only'],
              ['vipSurvey', 'VIP survey test notification'],
              ['matchFoundToast', 'MatchFoundToast'],
            ] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                accessibilityLabel={`qa-checklist-${key}`}
                onPress={() => runQaChecklistItem(key)}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 0.5,
                  borderBottomColor: ACCENT_BORDER,
                }}
              >
                <Text style={{ color: ADMIN_TEXT, fontSize: 14, flex: 1, paddingRight: 8 }}>{label}</Text>
                <Text style={{ color: qaChecks[key] ? '#22C55E' : ADMIN_TEXT_MUTED, fontSize: 13, fontWeight: '700' }}>
                  {qaChecks[key] ? '✅ OK' : '⏳ TODO'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={ACCENT_DIM} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
            <ButtonRow
              icon="refresh-outline"
              label="Сбросить чеклист"
              sub="Очистить статус проверки"
              onPress={() => setQaChecks({
                noEnergy: false,
                arenaLimit: false,
                quizTimeout: false,
                userWarning: false,
                shardsEarned: false,
                reportModal: false,
                actionToast: false,
                dailyTaskRewardToast: false,
                updateModal: false,
                releaseNotes: false,
                globalBroadcast: false,
                vipSurvey: false,
                matchFoundToast: false,
              })}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 9.5 ЛИГИ / ЗАЛ СЛАВЫ — ПОВЫШЕНИЯ/ПОНИЖЕНИЯ (изолированный тест) ── */}
          <AccordionSection id="rank_change_test" icon="trending-up-outline" title="🏆 Лиги — повышения/понижения" badge={4}
            open={openSection === 'rank_change_test'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
              icon="rocket-outline"
              label="Клуб: +1 место (поднялся)"
              sub="Открыть тестовое окно с анимацией +1"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('club', 1)}
            />
            <ButtonRow
              icon="rocket-outline"
              label="Клуб: +5 мест (большой подъём)"
              sub="Анимация и баннер на 5 позиций"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('club', 5)}
            />
            <ButtonRow
              icon="trending-down-outline"
              label="Клуб: −1 место (опустился)"
              sub="Жёлтый банер «Уступил …»"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('club', -1)}
            />
            <ButtonRow
              icon="trending-down-outline"
              label="Клуб: −3 места (большой спад)"
              sub="Жёлтый банер + анимация вниз"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('club', -3)}
            />
          </AccordionSection>

          {/* ── 10. УПРАВЛЕНИЕ ДАННЫМИ ── */}
          <AccordionSection id="data" icon="warning-outline" title="⚠ Управление данными" badge={2}
            open={openSection === 'data'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
          <ButtonRow
            icon="refresh-outline"
            label={triLang(lang, {
  uk: 'Скинути ВСЕ дані',
  ru: 'Сбросить ВСЕ данные',
  es: 'Restablecer TODOS los datos',
  "pt-BR": 'Redefinir TODOS os dados',
  vi: 'Đặt lại TẤT CẢ dữ liệu',
  id: 'Reset SEMUA data',
  tr: 'TÜM verileri sıfırla',
  pl: 'Zresetuj WSZYSTKIE dane',
})}
            sub={triLang(lang, {
  uk: 'Видалити весь прогрес та налаштування',
  ru: 'Удалить весь прогресс и настройки',
  es: 'Elimina todo el progreso y la configuración',
  "pt-BR": 'Apaga todo o progresso e as configurações',
  vi: 'Xóa toàn bộ tiến độ và cài đặt',
  id: 'Menghapus semua progres dan pengaturan',
  tr: 'Tüm ilerlemeyi ve ayarları siler',
  pl: 'Usuwa cały postęp i ustawienia',
})}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              doHaptic();
              setModalResetAll(true);
            }}
          />
          <ButtonRow
            icon="trash-outline"
            label={triLang(lang, {
  uk: 'Скинути статистику',
  ru: 'Сбросить статистику',
  es: 'Restablecer estadísticas',
  "pt-BR": 'Redefinir estatísticas',
  vi: 'Đặt lại thống kê',
  id: 'Reset statistik',
  tr: 'İstatistikleri sıfırla',
  pl: 'Zresetuj statystyki',
})}
            sub={triLang(lang, {
  uk: 'Скинути стрік та інші статистики',
  ru: 'Сбросить цепочку и другую статистику',
  es: 'Elimina la racha y el resto de estadísticas guardadas',
  "pt-BR": 'Apaga a sequência e outras estatísticas salvas',
  vi: 'Xóa chuỗi ngày và các thống kê khác',
  id: 'Menghapus streak dan statistik lain',
  tr: 'Seriyi ve diğer istatistikleri siler',
  pl: 'Usuwa serię i inne statystyki',
})}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              doHaptic();
              setModalResetStats(true);
            }}
          />
          </AccordionSection>

          {/* ── Новые секции (редизайн 2026-06): сценарии, непокрытые модалки/тосты, лабы ── */}
          <ScenariosSection
            open={openSection === 'scenarios_conflicts'}
            onToggle={toggleSection}
            onSeedGlobalLevelUp={triggerGlobalLevelUp}
            onGoHome={navigateHomeAfterVipSurveySeed}
            onSeedVipSurvey={() => { void showVipSurveyNotificationPreview(); }}
          />
          <RewardModalsExtraSection open={openSection === 'reward_modals_extra'} onToggle={toggleSection} />
          <GiftsCatalogSection open={openSection === 'gifts_catalog'} onToggle={toggleSection} />
          <SystemModalsExtraSection open={openSection === 'system_modals_extra'} onToggle={toggleSection} />
          <BannersToastsExtraSection open={openSection === 'banners_toasts_extra'} onToggle={toggleSection} />
          <VipSurveyExtraSection open={openSection === 'vip_survey_extra'} onToggle={toggleSection} />
          <LabsSection
            open={openSection === 'labs_hub'}
            onToggle={toggleSection}
            onOpenReviewBench={() => { void runAdminReviewTestBench(); }}
          />
          <CompassSection open={openSection === 'compass'} onToggle={toggleSection} />

        </ScrollView>
        </AdminNavContext.Provider>
      </SafeAreaView>

      {leagueResult && (
        <LeagueResultModal
          visible={leagueResultVisible}
          result={leagueResult}
          onClose={() => setLeagueResultVisible(false)}
        />
      )}

      {/* Gift modal preview */}
      <LevelGiftModal
        visible={giftModalVisible}
        level={giftModalLevel}
        userName="Tester"
        lang={lang}
        onClose={(_claimed) => setGiftModalVisible(false)}
      />
      <LevelGiftDualModal
        visible={giftDualModalVisible}
        level={giftDualModalLevel}
        userName="Tester"
        lang={lang}
        onClose={(_claimed) => setGiftDualModalVisible(false)}
      />
      <NoEnergyModal
        visible={noEnergyPreview != null}
        onClose={closeNoEnergyPreview}
        onBackHome={noEnergyPreview?.withBackHome ? closeNoEnergyPreview : undefined}
        minRequired={noEnergyPreview?.minRequired}
        paywallContext={noEnergyPreview?.paywallContext ?? 'no_energy'}
        qaForceShardCta={noEnergyPreview?.qaForceShardCta === true}
        qaIgnorePremiumAccess
      />
      <DailyTasksFirstVisitModal
        visible={dailyPlanPreviewVisible}
        onClose={() => setDailyPlanPreviewVisible(false)}
        studyTarget={studyTarget}
        previewOnly
        initialTasks={dailyPlanPreviewTasks}
      />
      <ArenaLimitModal
        visible={arenaLimitMode !== null}
        mode={arenaLimitMode ?? 'matchmaking'}
        playsUsed={5}
        onClose={() => setArenaLimitMode(null)}
      />
      <QuizTimeoutModal
        visible={quizTimeoutHardMode !== null}
        hardMode={quizTimeoutHardMode ?? false}
        onClose={() => setQuizTimeoutHardMode(null)}
      />
      <UserWarningModal
        visible={userWarningVisible}
        message={
          lang === 'es'
            ? 'Aviso de prueba del moderador. Actualiza tu apodo.'
            : lang === 'uk'
            ? 'Тестове попередження від модератора. Будь ласка, онови нік.'
            : 'Тестовое предупреждение от модератора. Пожалуйста, обнови ник.'
        }
        lang={lang}
        onClose={() => setUserWarningVisible(false)}
      />
      <ReportUserModal
        visible={reportUserPreviewVisible}
        reportedUid="preview_user_uid"
        reportedName={
          lang === 'es'
            ? 'Usuario de prueba'
            : lang === 'uk'
              ? 'Тестовий користувач'
              : 'Тестовый пользователь'
        }
        screen="leaderboard"
        lang={lang === 'uk' || lang === 'es' ? lang : 'ru'}
        previewOnly
        onClose={() => setReportUserPreviewVisible(false)}
      />
      <PlayerProfileModal
        player={profileCardCrownPreview}
        myInfo={profileCardCrownMyInfo}
        onClose={() => setProfileCardCrownPreview(null)}
      />
      <UpdateModal
        visible={updateModalVisible}
        storeUrl={STORE_URL}
        message={triLang(lang, {
  uk: 'Тестовий preview форс-оновлення. Перевір CTA і стиль модалки.',
  ru: 'Тестовый preview форс-обновления. Проверь CTA и стиль модалки.',
  es: 'Vista previa de actualización forzada de prueba. Revisa el CTA y el estilo del modal.',
  "pt-BR": 'Preview de teste da atualização forçada. Confira o CTA e o estilo do modal.',
  vi: 'Preview thử nghiệm cập nhật bắt buộc. Kiểm tra CTA và kiểu modal.',
  id: 'Preview uji pembaruan paksa. Periksa CTA dan gaya modal.',
  tr: 'Zorunlu güncelleme test önizlemesi. CTA ve modal stilini kontrol et.',
  pl: 'Podgląd testowy wymuszonej aktualizacji. Sprawdź CTA i styl modala.',
})}
        onClose={() => setUpdateModalVisible(false)}
      />
      <NotificationPermissionModal
        visible={notifPermissionPreviewVisible}
        lang={lang}
        onCancel={() => setNotifPermissionPreviewVisible(false)}
        onConfirm={async () => {
          const perm = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
          const ok = perm.granted;
          setNotifPermissionPreviewVisible(false);
          emitAppEvent(
            'action_toast',
            actionToastTri(ok ? 'success' : 'info', {
              ru: ok
                ? 'Разрешение на уведомления получено.'
                : perm.openedSettings
                  ? 'Открыл настройки приложения: включи уведомления там.'
                  : 'Системное разрешение не выдано.',
              uk: ok
                ? 'Дозвіл на сповіщення отримано.'
                : perm.openedSettings
                  ? 'Відкрив налаштування застосунку: увімкни сповіщення там.'
                  : 'Системний дозвіл не надано.',
              es: ok
                ? 'Permiso de notificaciones concedido.'
                : perm.openedSettings
                  ? 'Se abrieron los ajustes de la app: activa las notificaciones ahí.'
                  : 'El sistema no concedió el permiso.',
              'pt-BR': ok
                ? 'Permissão de notificações concedida.'
                : perm.openedSettings
                  ? 'Configurações do app abertas: ative as notificações lá.'
                  : 'A permissão do sistema não foi concedida.',
              vi: ok
                ? 'Đã cấp quyền thông báo.'
                : perm.openedSettings
                  ? 'Đã mở cài đặt ứng dụng: hãy bật thông báo ở đó.'
                  : 'Hệ thống chưa cấp quyền.',
              id: ok
                ? 'Izin notifikasi diberikan.'
                : perm.openedSettings
                  ? 'Pengaturan aplikasi terbuka: aktifkan notifikasi di sana.'
                  : 'Izin sistem tidak diberikan.',
              tr: ok
                ? 'Bildirim izni verildi.'
                : perm.openedSettings
                  ? 'Uygulama ayarları açıldı: bildirimleri oradan aç.'
                  : 'Sistem izni verilmedi.',
              pl: ok
                ? 'Zgoda na powiadomienia przyznana.'
                : perm.openedSettings
                  ? 'Otwarto ustawienia aplikacji: włącz tam powiadomienia.'
                  : 'System nie przyznał zgody.',
            }),
          );
        }}
      />
      <ReleaseNotesModal
        visible={releaseNotesPreviewVisible}
        onClose={() => setReleaseNotesPreviewVisible(false)}
      />
      <GlobalBroadcastModal
        visible={globalBroadcastPreview !== null}
        payload={globalBroadcastPreview}
        previewOnly
        onClose={() => setGlobalBroadcastPreview(null)}
      />
      <LeagueChestOpenModal
        visible={leagueChestPreview !== null}
        crownName={leagueChestPreview?.crownName}
        isCrownWinner={leagueChestPreview?.isCrownWinner}
        rewards={leagueChestPreview?.rewards}
        onClose={() => setLeagueChestPreview(null)}
      />
      <LeagueBonusAvailableModal
        visible={leagueBonusAvailablePreview !== null}
        availability={leagueBonusAvailablePreview}
        onClose={() => setLeagueBonusAvailablePreview(null)}
        onOpenLeague={() => {
          setLeagueBonusAvailablePreview(null);
          void openLeagueBonusScreenPreview(!!leagueBonusAvailablePreview?.isCrownWinner);
        }}
      />
      <CertificatePreviewAdminModal
        visible={certificatePreviewVisible}
        onClose={() => setCertificatePreviewVisible(false)}
      />

      {rankModal && (
        <RankChangeModal
          visible
          promoted={rankModal.promoted}
          tier={rankModal.tier}
          level={rankModal.level}
          onClose={() => setRankModal(null)}
          accentColor={TIER_COLORS[rankModal.tier] ?? '#CD7F32'}
        />
      )}

      <RankChangeTestModal
        visible={!!rankTest}
        mode={rankTest?.mode ?? 'club'}
        delta={rankTest?.delta ?? 1}
        lang={lang}
        onClose={() => setRankTest(null)}
      />

      <ThemedConfirmModal
        visible={modalUnlockAll}
        title={triLang(lang, {
  uk: 'Розблокувати все?',
  ru: 'Разблокировать все?',
  es: '¿Desbloquear todo?',
  "pt-BR": 'Desbloquear tudo?',
  vi: 'Mở khóa tất cả?',
  id: 'Buka semua?',
  tr: 'Her şey açılsın mı?',
  pl: 'Odblokować wszystko?',
})}
        message={triLang(lang, {
  uk: 'Це розблокує всі досягнення та рамки.',
  ru: 'Это разблокирует все достижения и рамки.',
  es: 'Desbloqueará todos los logros y marcos.',
  "pt-BR": 'Isso desbloqueará todas as conquistas e molduras.',
  vi: 'Thao tác này sẽ mở khóa tất cả thành tích và khung.',
  id: 'Ini akan membuka semua pencapaian dan bingkai.',
  tr: 'Bu, tüm başarımları ve çerçeveleri açar.',
  pl: 'Odblokuje wszystkie osiągnięcia i ramki.',
})}
        cancelLabel={triLang(lang, {
  uk: 'Скасувати',
  ru: 'Отмена',
  es: 'Cancelar',
  "pt-BR": 'Cancelar',
  vi: 'Hủy',
  id: 'Batal',
  tr: 'İptal',
  pl: 'Anuluj',
})}
        confirmLabel={triLang(lang, {
  uk: 'Розблокувати',
  ru: 'Разблокировать',
  es: 'Desbloquear',
  "pt-BR": 'Desbloquear',
  vi: 'Mở khóa',
  id: 'Buka',
  tr: 'Aç',
  pl: 'Odblokuj',
})}
        onCancel={() => setModalUnlockAll(false)}
        onConfirm={() => {
          setModalUnlockAll(false);
          void performUnlockAll();
        }}
        confirmVariant="accent"
      />
      <ThemedConfirmModal
        visible={modalPremiumStrip}
        title={triLang(lang, {
  uk: 'Зняти преміум?',
  ru: 'Снять премиум?',
  es: '¿Quitar Premium?',
  "pt-BR": 'Remover Premium?',
  vi: 'Gỡ Premium?',
  id: 'Hapus Premium?',
  tr: 'Premium kaldırılsın mı?',
  pl: 'Usunąć Premium?',
})}
        message={triLang(lang, {
  uk: 'Акаунт буде переведено в режим без преміуму. VIP теж буде знято, якщо він є. RevenueCat не буде змінено.',
  ru: 'Аккаунт будет переведён в режим без премиума. VIP тоже будет снят, если он есть. RevenueCat не будет затронут.',
  es: 'La cuenta pasará a modo sin Premium. VIP también se quitará si existe. RevenueCat no se altera.',
  "pt-BR": 'A conta será colocada no modo sem Premium. O VIP também será removido, se existir. O RevenueCat não será alterado.',
  vi: 'Tài khoản sẽ chuyển sang chế độ không Premium. VIP cũng sẽ bị gỡ nếu có. RevenueCat không bị thay đổi.',
  id: 'Akun akan dipindahkan ke mode tanpa Premium. VIP juga akan dihapus jika ada. RevenueCat tidak diubah.',
  tr: 'Hesap Premium olmayan moda alınır. Varsa VIP de kaldırılır. RevenueCat değişmez.',
  pl: 'Konto przejdzie w tryb bez Premium. VIP też zostanie usunięty, jeśli istnieje. RevenueCat nie zostanie zmieniony.',
})}
        cancelLabel={triLang(lang, {
  uk: 'Скасувати',
  ru: 'Отмена',
  es: 'Cancelar',
  "pt-BR": 'Cancelar',
  vi: 'Hủy',
  id: 'Batal',
  tr: 'İptal',
  pl: 'Anuluj',
})}
        confirmLabel={triLang(lang, {
  uk: 'Зняти',
  ru: 'Снять',
  es: 'Quitar',
  "pt-BR": 'Remover',
  vi: 'Gỡ',
  id: 'Hapus',
  tr: 'Kaldır',
  pl: 'Usuń',
})}
        onCancel={() => setModalPremiumStrip(false)}
        onConfirm={() => {
          setModalPremiumStrip(false);
          void performStripPremium();
        }}
        confirmVariant="default"
      />
      <ThemedConfirmModal
        visible={modalResetAll}
        title={triLang(lang, {
  uk: 'Скинути все?',
  ru: 'Сбросить все?',
  es: '¿Restablecer todo?',
  "pt-BR": 'Redefinir tudo?',
  vi: 'Đặt lại tất cả?',
  id: 'Reset semuanya?',
  tr: 'Her şey sıfırlansın mı?',
  pl: 'Zresetować wszystko?',
})}
        message={triLang(lang, {
  uk: 'Це видалить уроки, досягнення, рамки, енергію, XP та всі налаштування. Це не можна скасувати!',
  ru: 'Это удалит уроки, достижения, рамки, энергию, XP и все настройки. Это нельзя отменить!',
  es: 'Borrará lecciones, logros, marcos, energía, XP y todos los ajustes. ¡No se puede deshacer!',
  "pt-BR": 'Isso apagará aulas, conquistas, molduras, energia, XP e todas as configurações. Não é possível desfazer!',
  vi: 'Thao tác này sẽ xóa bài học, thành tích, khung, năng lượng, XP và mọi cài đặt. Không thể hoàn tác!',
  id: 'Ini akan menghapus pelajaran, pencapaian, bingkai, energi, XP, dan semua pengaturan. Tidak bisa dibatalkan!',
  tr: 'Bu dersleri, başarımları, çerçeveleri, enerjiyi, XP’yi ve tüm ayarları siler. Geri alınamaz!',
  pl: 'Usunie lekcje, osiągnięcia, ramki, energię, XP i wszystkie ustawienia. Tego nie da się cofnąć!',
})}
        cancelLabel={triLang(lang, {
  uk: 'Скасувати',
  ru: 'Отмена',
  es: 'Cancelar',
  "pt-BR": 'Cancelar',
  vi: 'Hủy',
  id: 'Batal',
  tr: 'İptal',
  pl: 'Anuluj',
})}
        confirmLabel={triLang(lang, {
  uk: 'Скинути',
  ru: 'Сбросить',
  es: 'Restablecer',
  "pt-BR": 'Redefinir',
  vi: 'Đặt lại',
  id: 'Reset',
  tr: 'Sıfırla',
  pl: 'Resetuj',
})}
        onCancel={() => setModalResetAll(false)}
        onConfirm={() => {
          setModalResetAll(false);
          void performResetAllData();
        }}
        confirmVariant="default"
      />
      <ThemedConfirmModal
        visible={modalResetStats}
        title={triLang(lang, {
  uk: 'Скинути статистику?',
  ru: 'Сбросить статистику?',
  es: '¿Restablecer estadísticas?',
  "pt-BR": 'Redefinir estatísticas?',
  vi: 'Đặt lại thống kê?',
  id: 'Reset statistik?',
  tr: 'İstatistikler sıfırlansın mı?',
  pl: 'Zresetować statystyki?',
})}
        message={triLang(lang, {
  uk: 'Це видалить стрік, щоденну статистику та інші досягнення. Це не можна скасувати!',
  ru: 'Это удалит цепочку дней, ежедневную статистику и другие достижения. Это нельзя отменить!',
  es: 'Eliminará la racha, las estadísticas diarias y otros logros relacionados. ¡No se puede deshacer!',
  "pt-BR": 'Isso apagará a sequência, estatísticas diárias e outras conquistas relacionadas. Não é possível desfazer!',
  vi: 'Thao tác này sẽ xóa chuỗi ngày, thống kê hằng ngày và các thành tích liên quan. Không thể hoàn tác!',
  id: 'Ini akan menghapus streak, statistik harian, dan pencapaian terkait lainnya. Tidak bisa dibatalkan!',
  tr: 'Bu seri günlerini, günlük istatistikleri ve ilgili başarımları siler. Geri alınamaz!',
  pl: 'Usunie serię dni, statystyki dzienne i powiązane osiągnięcia. Tego nie da się cofnąć!',
})}
        cancelLabel={triLang(lang, {
  uk: 'Скасувати',
  ru: 'Отмена',
  es: 'Cancelar',
  "pt-BR": 'Cancelar',
  vi: 'Hủy',
  id: 'Batal',
  tr: 'İptal',
  pl: 'Anuluj',
})}
        confirmLabel={triLang(lang, {
  uk: 'Скинути',
  ru: 'Сбросить',
  es: 'Restablecer',
  "pt-BR": 'Redefinir',
  vi: 'Đặt lại',
  id: 'Reset',
  tr: 'Sıfırla',
  pl: 'Resetuj',
})}
        onCancel={() => setModalResetStats(false)}
        onConfirm={() => {
          setModalResetStats(false);
          void performResetStats();
        }}
        confirmVariant="default"
      />

      <RegistrationPromptModal
        visible={authPromptDevOpen}
        context="dev"
        title="DEV: Auth модалка"
        subtitle="Тестовый запуск регистрационного потока. На production этот текст не показывается."
        onClose={() => setAuthPromptDevOpen(false)}
      />

      {/* ── Превью премиум-тоста медалей ── */}
      {medalPreview && (
        <MedalToast
          tier={medalPreview.tier}
          promoted={medalPreview.promoted}
          anim={medalPreviewAnim}
          bg={t.bgCard}
          isLightTheme={isLightTheme}
          themeMode={themeMode}
          lang={lang}
          spanishUiActive={lang === 'es'}
        />
      )}

          {/* ─── Active monetization preview modals (admin only) ─── */}
      <PremiumCelebrationModal
        visible={softMonetizationPreview === 'celebration'}
        onClose={() => setSoftMonetizationPreview(null)}
      />
      <VipCelebrationModal
        visible={softMonetizationPreview === 'vip_celebration'}
        onClose={() => {
          setSoftMonetizationPreview(null);
          const marker = activatedVipPreviewMarker;
          setActivatedVipPreviewMarker(null);
          if (marker) void consumeVipCelebration(marker);
        }}
      />
      <StreakReviveModal
        visible={softMonetizationPreview === 'streak_revive'}
        offer={previewReviveOffer}
        onClose={() => {
          setSoftMonetizationPreview(null);
          setPreviewReviveOffer(null);
        }}
      />
      <ThroneRewardModal
        visible={throneRewardPreview}
        shards={10}
        wins={7}
        onClose={() => setThroneRewardPreview(false)}
      />
      <RewardStackV2
        visible={rewardStackPreview}
        rewards={[
          { key: 'demo_level', icon: '⭐', title: 'Новый уровень 13', value: 'Ты достиг 13-го уровня', semantic: 'gold' },
          { key: 'demo_medal', icon: '🏅', title: 'Золотая медаль', value: 'Урок 14 пройден идеально', semantic: 'gold' },
          { key: 'demo_shards', icon: '💎', title: '+25 осколков', value: 'Задание дня выполнено', semantic: 'shards' },
        ]}
        onClaimReward={() => {}}
        onFinished={() => setRewardStackPreview(false)}
      />
      <IntroFullAccessModal
        visible={introFullAccessPreview !== null}
        variant={introFullAccessPreview ?? 'welcome'}
        onPrimaryPress={() => {
          if (introFullAccessPreview === 'ended') {
            router.push({ pathname: '/premium_modal', params: { context: 'intro_ended', source: 'admin_preview' } } as any);
          }
          setIntroFullAccessPreview(null);
        }}
        onSecondaryPress={() => setIntroFullAccessPreview(null)}
      />

      {/* ── Превью Diagnosis Toast ── */}
      {coachToastPreview?.show && (
        <CoachToast
          category={coachToastPreview.category}
          labelRu={coachToastPreview.labelRu}
          labelUk={coachToastPreview.labelUk}
          labelEs={coachToastPreview.labelEs}
          labelPtBr={coachToastPreview.labelPtBr}
          labelVi={coachToastPreview.labelVi}
          labelId={coachToastPreview.labelId}
          labelTr={coachToastPreview.labelTr}
          labelPl={coachToastPreview.labelPl}
          mistakeCount={coachToastPreview.mistakeCount}
          weaknessScore={coachToastPreview.weaknessScore}
          priorityScore={coachToastPreview.priorityScore}
          recoveryScore={coachToastPreview.recoveryScore}
          focusWords={coachToastPreview.focusWords}
          microDiagnosisId={coachToastPreview.microDiagnosisId}
          microLabelRu={coachToastPreview.microLabelRu}
          microLabelUk={coachToastPreview.microLabelUk}
          microLabelEs={coachToastPreview.microLabelEs}
          microLabelPtBr={coachToastPreview.microLabelPtBr}
          microLabelVi={coachToastPreview.microLabelVi}
          microLabelId={coachToastPreview.microLabelId}
          microLabelTr={coachToastPreview.microLabelTr}
          microLabelPl={coachToastPreview.microLabelPl}
          diagnosisEvidenceCount={coachToastPreview.diagnosisEvidenceCount}
          onDismiss={() => setCoachToastPreview(null)}
        />
      )}
    </View>
  );
}
