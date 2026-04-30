import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from './storage_mutex';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Switch,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { configureAccordionLayout } from '../constants/layoutAnimation';
import { unlockAllFrames } from '../constants/avatars';
import AccordionChevronIonicons from '../components/AccordionChevronIonicons';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { unlockAllAchievements, ALL_ACHIEVEMENTS } from './achievements';
import { getMyWeekPoints } from './hall_of_fame_utils';
import { calculateResult, LeagueResult, loadLeagueState, savePendingResult, getWeekId } from './league_engine';
import RankChangeTestModal from '../components/RankChangeTestModal';
import ClubResultModal from '../components/ClubResultModal';
import { registerXP } from './xp_manager';
import { useAchievement } from '../components/AchievementContext';
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
import { addShards } from './shards_system';
import { RankChangeModal, TIER_COLORS } from './components/RankChangeModal';
import { setDeferEnergyOnboardingForPostOnboardingFirstLesson } from './energyOnboardingGate';
import { actionToastTri, emitAppEvent } from './events';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import NoEnergyModal from '../components/NoEnergyModal';
import ArenaLimitModal from '../components/ArenaLimitModal';
import QuizTimeoutModal from '../components/QuizTimeoutModal';
import UserWarningModal from '../components/UserWarningModal';
import ShardRewardModal, { type ShardReward } from '../components/ShardRewardModal';
import ReportUserModal from '../components/ReportUserModal';
import UpdateModal from '../components/UpdateModal';
import ReleaseWaveBonusModal from '../components/ReleaseWaveBonusModal';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import CertificatePreviewAdminModal from '../components/CertificatePreviewAdminModal';
import { DEV_MODE, STORE_URL } from './config';
import { getAppReleaseBuildId } from './app_build_id';
import {
  getActiveReleaseWaveVersion,
  isUserBuildMatchingReleaseWave,
  resetReleaseWaveBonusLocalClaimForTesting,
  resetLastPersistedNativeBuildForTesting,
  APP_LAST_RECORDED_NATIVE_BUILD_ID_KEY,
} from './release_wave_bonus';
import { QUIZ_E2E_OPEN_RESULTS_KEY } from './quizzes/constants';
import { useMatchmakingContext } from '../contexts/MatchmakingContext';
import { seedAdminTestReviewSession } from './active_recall';
import { requestNotificationPermissionWithFallback } from './notifications';

const CYCLE_END_SHOWN_KEY = 'lesson_cycle_end_intro_shown';

const RED = '#FF2020';
const RED_DIM = '#CC0000';
const RED_DARK = '#8B0000';
const RED_BG = 'rgba(255,0,0,0.08)';
const RED_BORDER = 'rgba(255,32,32,0.35)';

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ01ラリルレロ0123456789ABCDEF!@#$%';
const SCREEN_HEIGHT = Dimensions.get('window').height;

function MatrixColumn({ x, delay, speed, chars }: { x: number; delay: number; speed: number; chars: string }) {
  const translateY = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: speed, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -SCREEN_HEIGHT, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, speed, translateY]);
  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        transform: [{ translateY }],
        color: RED_DIM,
        fontSize: 11,
        fontFamily: 'monospace',
        opacity: 0.55,
        lineHeight: 14,
        width: 16,
      }}
      numberOfLines={0}
    >
      {chars}
    </Animated.Text>
  );
}

function buildMatrixCols() {
  const result: { x: number; delay: number; speed: number; chars: string }[] = [];
  const screenW = Dimensions.get('window').width;
  const count = Math.floor(screenW / 18);
  for (let i = 0; i < count; i++) {
    const colLen = 8 + Math.floor(Math.random() * 24);
    let s = '';
    for (let j = 0; j < colLen; j++) s += MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] + '\n';
    result.push({ x: i * 18, delay: Math.floor(Math.random() * 3000), speed: 2500 + Math.floor(Math.random() * 3500), chars: s });
  }
  return result;
}
const MATRIX_COLS = buildMatrixCols();

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
    label: '🔥 Стрик под угрозой (7 дн.)',
    sub: 'Параметр streak, подсветка ряда',
    params: { context: 'streak', streak: '7' },
  },
  {
    label: '🎓 Урок 19 — B1',
    sub: 'lessons_done, акцент на A2 done',
    params: { context: 'lesson_b1', lessons_done: '18' },
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
    label: '🏆 Зал славы',
    sub: 'Текст для таба лидеров (если ведёшь с сюда)',
    params: { context: 'hall_of_fame' },
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
];

function MatrixBackground() {
  const cols = MATRIX_COLS;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#0D0000' }} pointerEvents="none">
      {cols.map((c, i) => <MatrixColumn key={i} {...c} />)}
    </View>
  );
}

const ToggleRow = ({ icon, label, sub, value, onToggle, t, f }: {
  icon: string; label: string; sub?: string; value: boolean; onToggle: (val: boolean) => void;
  t: any; f: any;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: RED_BORDER }}>
    <Ionicons name={icon as any} size={22} color={RED} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#FFB0B0', fontSize: f.bodyLg }}>{label}</Text>
      {sub && <Text style={{ color: '#FF8080', fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
    </View>
    <Switch value={value} onValueChange={onToggle} thumbColor={value ? RED : '#555'} trackColor={{ false: '#333', true: RED_DARK }} />
  </View>
);

const ButtonRow = ({ icon, label, sub, onPress, danger, testID, t, f, doHaptic }: {
  icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean; testID?: string;
  t: any; f: any; doHaptic: () => void;
}) => (
  <TouchableOpacity
    testID={testID}
    accessibilityLabel={testID ? `qa-${testID}` : undefined}
    accessible={!!testID}
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: RED_BORDER, backgroundColor: danger ? 'rgba(180,0,0,0.15)' : 'transparent' }}
    onPress={() => { doHaptic(); onPress(); }}
    activeOpacity={0.6}
  >
    <Ionicons name={icon as any} size={22} color={danger ? '#FF4444' : RED} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: danger ? '#FF4444' : '#FFB0B0', fontSize: f.bodyLg }}>{label}</Text>
      {sub && <Text style={{ color: '#FF8080', fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={RED_DIM} />
  </TouchableOpacity>
);

function AccordionSection({ id, icon, title, badge, open, onToggle, children }: {
  id: string; icon: string; title: string; badge?: number; open: boolean;
  onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: RED_BORDER, overflow: 'hidden', backgroundColor: 'rgba(30,0,0,0.6)' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
        onPress={() => { configureAccordionLayout(); onToggle(id); }}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={20} color={RED} style={{ marginRight: 12 }} />
        <Text style={{ flex: 1, color: '#FFB0B0', fontSize: 15, fontWeight: '700' }}>{title}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={{ backgroundColor: RED_DARK, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
          </View>
        )}
        <AccordionChevronIonicons isOpen={open} size={16} color={RED_DIM} />
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 0.5, borderTopColor: RED_BORDER }}>
          {children}
        </View>
      )}
    </View>
  );
}

export default function SettingsTestersFunctions() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

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
  const [arenaLimitMode, setArenaLimitMode] = useState<'matchmaking' | 'invite' | null>(null);
  const [quizTimeoutHardMode, setQuizTimeoutHardMode] = useState<boolean | null>(null);
  const [userWarningVisible, setUserWarningVisible] = useState(false);
  const [shardRewardVisible, setShardRewardVisible] = useState(false);
  const [reportUserPreviewVisible, setReportUserPreviewVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [notifPermissionPreviewVisible, setNotifPermissionPreviewVisible] = useState(false);
  const [certificatePreviewVisible, setCertificatePreviewVisible] = useState(false);
  const [releaseWaveModal, setReleaseWaveModal] = useState<{ open: boolean; preview: boolean }>({ open: false, preview: true });
  const [qaChecks, setQaChecks] = useState<Record<string, boolean>>({
    noEnergy: false,
    arenaLimit: false,
    quizTimeout: false,
    userWarning: false,
    shardReward: false,
    reportModal: false,
    actionToast: false,
    updateModal: false,
    matchFoundToast: false,
    releaseWaveBonus: false,
  });

  const [rankModal, setRankModal] = useState<{ promoted: boolean; tier: string; level: string } | null>(null);
  const [rankTest, setRankTest] = useState<{ mode: 'club' | 'hof'; delta: number } | null>(null);
  const [rankTestTier, setRankTestTier] = useState('bronze');
  const [rankTestLevel, setRankTestLevel] = useState('I');
  const TIERS_LIST = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];
  const TIER_SHORT_NAMES: Record<string, string> = { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер', grandmaster: 'Гранд', legend: 'Легенда' };
  const RANK_LEVELS = ['I', 'II', 'III'];

  const [openSection, setOpenSection] = useState<string | null>('premium_modals');
  const [trialCooldownStatusLine, setTrialCooldownStatusLine] = useState('…');
  const [modalUnlockAll, setModalUnlockAll] = useState(false);
  const [modalPremiumStrip, setModalPremiumStrip] = useState(false);
  const [modalResetAll, setModalResetAll] = useState(false);
  const [modalResetStats, setModalResetStats] = useState(false);
  const [authPromptDevOpen, setAuthPromptDevOpen] = useState(false);
  const { showMatchFoundForTesterPreview } = useMatchmakingContext();

  const shardRewardPreview: ShardReward[] = [{
    id: 'preview_reward',
    dataId: 'preview_001',
    dataText: triLang(lang, {
      uk: 'Тестовий репорт: помилка в перекладі',
      ru: 'Тестовый репорт: ошибка в переводе',
      es: 'Informe de prueba: error de traducción',
    }),
    count: 1,
  }];
  const shardRewardMultiPreview: ShardReward[] = [
    {
      id: 'preview_reward_1',
      dataId: 'preview_101',
      dataText: triLang(lang, { uk: 'Тест: урок 3 переклад', ru: 'Тест: урок 3 перевод', es: 'Prueba: lección 3, traducción' }),
      count: 1,
    },
    {
      id: 'preview_reward_2',
      dataId: 'preview_102',
      dataText: triLang(lang, {
        uk: 'Тест: квіз medium — друкарська помилка',
        ru: 'Тест: квиз medium опечатка',
        es: 'Prueba: cuestionario medium — typo',
      }),
      count: 2,
    },
  ];
  const [shardRewardPayload, setShardRewardPayload] = useState<ShardReward[]>(shardRewardPreview);

  const triggerGlobalLevelUp = async (level: number) => {
    const queueRaw = await AsyncStorage.getItem('pending_level_up_queue');
    let queue: number[] = [];
    try { if (queueRaw) queue = JSON.parse(queueRaw); } catch {}
    queue.push(level);
    await AsyncStorage.setItem('pending_level_up_queue', JSON.stringify(queue));
    emitAppEvent('level_up_pending');
  };

  const markQa = (key: string) => setQaChecks(prev => ({ ...prev, [key]: true }));

  const triggerMatchFoundToastPreview = () => {
    // Сразу status=found, без Firestore: dev-бот есть только при __DEV__ / DEV_MODE.
    showMatchFoundForTesterPreview();
    markQa('matchFoundToast');
  };

  /** QA checklist rows: same previews as section «Новые модалки (QA core)» */
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
      case 'shardReward':
        setShardRewardPayload(shardRewardPreview);
        setShardRewardVisible(true);
        markQa('shardReward');
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
          }),
        );
        setTimeout(() => {
          emitAppEvent(
            'action_toast',
            actionToastTri('error', {
              ru: 'Проверка ActionToast: ERROR',
              uk: 'Перевірка ActionToast: ERROR',
              es: 'Prueba ActionToast: ERROR',
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
            }),
          );
          markQa('actionToast');
        }, 400);
        break;
      case 'updateModal':
        setUpdateModalVisible(true);
        markQa('updateModal');
        break;
      case 'matchFoundToast':
        void triggerMatchFoundToastPreview();
        break;
      case 'releaseWaveBonus':
        setReleaseWaveModal({ open: true, preview: true });
        markQa('releaseWaveBonus');
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
      // Уведомляем PremiumContext — isPremium сразу станет true
      emitAppEvent('premium_activated');
    } else {
      await recomputeEarnedUnlocks();
      invalidatePremiumCache();
      emitAppEvent('premium_deactivated');
    }
    await reloadEnergy(); // сразу синхронизируем EnergyContext

    // When enabling No Limits, award all medals on lessons and exams
    if (val) {
      try {
        const keysToSet: [string, string][] = [];

        // Award gold medals on all 32 lessons
        for (let i = 1; i <= 32; i++) {
          // Set all necessary lesson data for gold medal
          keysToSet.push([`lesson${i}_score`, '5']);
          keysToSet.push([`lesson${i}_best_score`, '5']); // Gold medal requires best_score = 5
          keysToSet.push([`lesson${i}_pass_count`, '1']);
          // Create full progress array (all 50 answers marked as correct)
          const progressArray = new Array(50).fill('correct');
          keysToSet.push([`lesson${i}_progress`, JSON.stringify(progressArray)]);
          keysToSet.push([`lesson${i}_cellIndex`, '0']);
        }

        // Unlock all lessons
        const unlockedLessons = Array.from({ length: 32 }, (_, i) => i + 1);
        keysToSet.push(['unlocked_lessons', JSON.stringify(unlockedLessons)]);

        // Award gold medals on all 4 exams (90%+ = gold)
        // Use string level IDs ('A1','A2','B1','B2') to match level_exam.tsx format
        const examLevels = ['A1', 'A2', 'B1', 'B2'];
        for (const lvl of examLevels) {
          keysToSet.push([`level_exam_${lvl}_pct`, '100']);
          keysToSet.push([`level_exam_${lvl}_best_pct`, '100']); // Gold medal requires best_pct >= 90
          keysToSet.push([`level_exam_${lvl}_passed`, '1']);
          keysToSet.push([`level_exam_${lvl}_pass_count`, '1']);
        }

        // Set all keys at once
        await AsyncStorage.multiSet(keysToSet);

        emitAppEvent(
          'action_toast',
          actionToastTri('success', {
            ru: 'Всем урокам даны золотые медали. Всем экзаменам даны золотые медали.',
            uk: 'Усім урокам дані золоті медалі. Усім екзаменам дані золоті медалі.',
            es: 'Medalla de oro en todas las lecciones y en todos los exámenes.',
          }),
        );
      } catch {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Не удалось активировать.',
            uk: 'Не вдалося активувати.',
            es: 'No se pudo activar.',
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
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось добавить XP',
          uk: 'Не вдалося додати XP',
          es: 'No se pudieron añadir XP.',
        }),
      );
    }
  };

  // ── Тест rank-change анимации в изолированном модальном окне ─────────────
  // Никаких записей в AsyncStorage, ничего на реальные клубы и зал славы не влияет.
  // Просто открывает Modal с фейковым списком и проигрывает анимацию + баннер.
  const openRankTest = (mode: 'club' | 'hof', delta: number) => {
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
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Ошибка разблокировки',
          uk: 'Помилка розблокування',
          es: 'Error al desbloquear.',
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
        }),
      );
    }
  };

  const performStripPremium = async () => {
    try {
      await AsyncStorage.multiSet([['premium_active', 'false'], ['premium_plan', ''], ['tester_no_limits', 'false'], ['tester_energy_disabled', 'false'], ['tester_no_premium', 'true']]);
      await recomputeEarnedUnlocks();
      invalidatePremiumCache();
      setNoLimitsEnabled(false);
      setEnergyDisabled(false);
      setNoPremiumEnabled(true);
      emitAppEvent('premium_deactivated');
      await reloadEnergy();
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Премиум снят',
          uk: 'Преміум знято',
          es: 'Premium desactivado.',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось снять премиум',
          uk: 'Не вдалося зняти преміум',
          es: 'No se pudo quitar Premium.',
        }),
      );
    }
  };

  const performResetAllData = async () => {
    try {
      const lessonKeys = Array.from({ length: 32 }, (_, i) => [
        `lesson${i + 1}_progress`,
        `lesson${i + 1}_cellIndex`,
        `lesson${i + 1}_score`,
        `lesson${i + 1}_words`,
        `lesson${i + 1}_listening_progress`,
        `lesson${i + 1}_best_score`,
        `lesson${i + 1}_pass_count`,
        `lesson${i + 1}_intro_shown`,
      ]).flat();

      const achievementKeys = [
        'achievement_states',
        'achievement_progress',
        'medal_states',
        'medal_tiers',
        'achievements_v1',
        'quiz_hard_count',
      ];

      const frameKeys = ['user_frame', 'user_avatar', 'unlocked_frames'];

      const systemKeys = ['user_total_xp', 'current_energy', 'last_energy_recovery', 'unlocked_lessons'];

      const statsKeys = [
        'streak_count', 'login_bonus_v1', 'daily_stats',
        'streak_freeze', 'last_opened_lesson',
      ];

      const leagueKeys = [
        'league_state_v3',
        'league_result_pending',
        'week_leaderboard',
        'my_week_points',
      ];

      const examLevelIds = ['A1', 'A2', 'B1', 'B2'];
      const examKeys = [
        ...examLevelIds.flatMap(lvl => [
          `level_exam_${lvl}_pct`,
          `level_exam_${lvl}_passed`,
          `level_exam_${lvl}_best_pct`,
          `level_exam_${lvl}_medal_tier`,
          `level_exam_${lvl}_pass_count`,
        ]),
        ...Array.from({ length: 4 }, (_, i) => [
          `level_exam_${i + 1}_pct`,
          `level_exam_${i + 1}_passed`,
          `level_exam_${i + 1}_best_pct`,
          `level_exam_${i + 1}_medal_tier`,
          `level_exam_${i + 1}_pass_count`,
        ]).flat(),
      ];

      const testerKeys = [
        'tester_no_limits',
        'tester_energy_disabled',
        'tester_no_premium',
      ];

      const allKeys = [
        ...lessonKeys, ...achievementKeys, ...frameKeys,
        ...systemKeys, ...statsKeys, ...leagueKeys,
        ...examKeys, ...testerKeys,
      ];

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
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сбросить данные',
          uk: 'Не вдалося скинути дані',
          es: 'No se pudieron restablecer los datos.',
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
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сбросить статистику',
          uk: 'Не вдалося скинути статистику',
          es: 'No se pudieron restablecer las estadísticas.',
        }),
      );
    }
  };

  const runAdminReviewTestBench = async () => {
    try {
      await seedAdminTestReviewSession();
      router.push('/review' as any);
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось подготовить тестовое повторение',
          uk: 'Не вдалося підготувати тестове повторення',
          es: 'No se pudo preparar la repetición de prueba.',
        }),
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MatrixBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: RED_BORDER, backgroundColor: 'rgba(13,0,0,0.92)' }}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home' as any);
          }}>
            <Ionicons name="chevron-back" size={28} color={RED} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: RED, fontSize: f.h2, fontWeight: '900', textShadowColor: RED_DIM, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }}>
              🛠 Админ панель
            </Text>
            <Text style={{ color: '#FF8080', fontSize: f.caption, marginTop: 2 }}>Dev only · не для пользователей</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingTop: 12 }} style={{ backgroundColor: 'rgba(13,0,0,0.80)' }}>
          <View style={{ marginHorizontal: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => { doHaptic(); router.push('/audio_debug' as any); }}
              activeOpacity={0.75}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: RED,
                backgroundColor: RED_BG,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="volume-high-outline" size={20} color={RED} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFB0B0', fontSize: 15, fontWeight: '800' }}>TTS Debug</Text>
                <Text style={{ color: '#FF8080', fontSize: 12, marginTop: 2 }}>Voices, rate test, Android system rate hint</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={RED_DIM} />
            </TouchableOpacity>
          </View>

          <View style={{ marginHorizontal: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => { doHaptic(); void runAdminReviewTestBench(); }}
              activeOpacity={0.75}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: RED,
                backgroundColor: RED_BG,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="flask-outline" size={20} color={RED} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFB0B0', fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, {
                    uk: 'Повтор: 7 тестових карток',
                    ru: 'Повтор: 7 тестовых карточек',
                    es: 'Repaso activo: 7 tarjetas de prueba',
                  })}
                </Text>
                <Text style={{ color: '#FF8080', fontSize: 12, marginTop: 2 }}>
                  {triLang(lang, {
                    uk: 'Сид урок 99: старі тест-записи видаляються, потім екран «Повторення»',
                    ru: 'Сид урок 99: старые тест-записи удаляются, затем экран «Повторение»',
                    es: 'Semilla lección 99: se borran registros antiguos; luego la pantalla de repaso',
                  })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={RED_DIM} />
            </TouchableOpacity>
          </View>

          {/* ── 1. СОСТОЯНИЕ АККАУНТА ── */}
          <AccordionSection id="account" icon="settings-outline" title="Состояние аккаунта" badge={3}
            open={openSection === 'account'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow
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
              icon="volume-high-outline"
              label="TTS Debug"
              sub="Voices, rate test, Android system rate hint"
              onPress={() => router.push('/audio_debug' as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="star-outline"
              label="Разблокировать все достижения"
              sub="Достижения и рамки"
              onPress={unlockAllAchievementsHandler}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow
              icon="diamond-outline"
              label="Снять премиум"
              sub="Переключить аккаунт в режим без премиума"
              danger
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => {
                doHaptic();
                setModalPremiumStrip(true);
              }}
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
                Alert.alert('OK', 'auth_prompt_shown_v1 удалён');
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
                  Alert.alert('Google недоступен', 'Проверь EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID и Play Services');
                  return;
                }
                const r = await signInWithProvider('google');
                Alert.alert('Google sign-in result', JSON.stringify(r, null, 2));
              }}
            />
            <ButtonRow
              icon="logo-apple"
              label="Test Apple sign-in"
              sub="Только iOS, физическое устройство"
              t={t} f={f} doHaptic={doHaptic}
              onPress={async () => {
                doHaptic();
                const avail = await isAppleSignInAvailable();
                if (!avail) {
                  Alert.alert('Apple недоступен', 'Apple sign-in только на iOS-устройстве с iCloud');
                  return;
                }
                const r = await signInWithProvider('apple');
                Alert.alert('Apple sign-in result', JSON.stringify(r, null, 2));
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
                Alert.alert('linkedAuth', link ? JSON.stringify(link, null, 2) : 'null (не залогинен)');
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
                Alert.alert('OK', 'Sign out выполнен');
              }}
            />
          </AccordionSection>

          {/* ── 2. МОДАЛКИ АРЕНЫ ── */}
          <AccordionSection id="arena_modals" icon="trophy-outline" title="Модалки — Арена" badge={4}
            open={openSection === 'arena_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {/* Rank picker */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
              <Text style={{ color: '#FF8080', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>Выбери ранг:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {TIERS_LIST.map(tier => (
                  <TouchableOpacity key={tier} onPress={() => { doHaptic(); setRankTestTier(tier); }}
                    style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: rankTestTier === tier ? (TIER_COLORS[tier] ?? RED) : '#333', backgroundColor: rankTestTier === tier ? (TIER_COLORS[tier] ?? RED) + '22' : 'transparent' }}
                    activeOpacity={0.75}>
                    <Text style={{ color: TIER_COLORS[tier] ?? '#aaa', fontSize: 12, fontWeight: '700' }}>{TIER_SHORT_NAMES[tier]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: '#FF8080', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>Уровень:</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {RANK_LEVELS.map(lv => (
                  <TouchableOpacity key={lv} onPress={() => { doHaptic(); setRankTestLevel(lv); }}
                    style={{ borderRadius: 8, paddingHorizontal: 18, paddingVertical: 7, borderWidth: 1.5, borderColor: rankTestLevel === lv ? (TIER_COLORS[rankTestTier] ?? RED) : '#333', backgroundColor: rankTestLevel === lv ? (TIER_COLORS[rankTestTier] ?? RED) + '22' : 'transparent' }}
                    activeOpacity={0.75}>
                    <Text style={{ color: rankTestLevel === lv ? (TIER_COLORS[rankTestTier] ?? '#aaa') : '#888', fontSize: 14, fontWeight: '800' }}>{lv}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity onPress={() => { doHaptic(); setRankModal({ promoted: true, tier: rankTestTier, level: rankTestLevel }); }}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 11, borderWidth: 1.5, borderColor: TIER_COLORS[rankTestTier] ?? RED, backgroundColor: (TIER_COLORS[rankTestTier] ?? RED) + '22', alignItems: 'center' }}
                  activeOpacity={0.8}>
                  <Text style={{ color: TIER_COLORS[rankTestTier] ?? RED, fontSize: 13, fontWeight: '800' }}>⬆️ Повышение</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { doHaptic(); setRankModal({ promoted: false, tier: rankTestTier, level: rankTestLevel }); }}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 11, borderWidth: 1.5, borderColor: '#555', backgroundColor: '#1a1a1a', alignItems: 'center' }}
                  activeOpacity={0.8}>
                  <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '800' }}>⬇️ Понижение</Text>
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
          </AccordionSection>

          {/* ── 3. МОДАЛКИ УРОКОВ ── */}
          <AccordionSection id="lesson_modals" icon="school-outline" title="Модалки — Уроки" badge={7}
            open={openSection === 'lesson_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([5, 4, 3, 2] as const).map(score => (
              <ButtonRow key={`lc_${score}`} icon="school-outline"
                label={`📋 Завершение урока — ${score}/5`}
                sub={`lesson_complete id=2, score=${score}`}
                onPress={() => router.push({ pathname: '/lesson_complete', params: { id: '2', unlocked: score === 5 ? '1' : '0' } } as any)}
                t={t} f={f} doHaptic={doHaptic} />
            ))}
            <ButtonRow icon="refresh-circle-outline" label="↺ Сбросить флаг модалки цикла"
              sub="Чтобы модалка показалась снова при следующем завершении"
              onPress={async () => {
                await AsyncStorage.removeItem(CYCLE_END_SHOWN_KEY);
                emitAppEvent(
                  'action_toast',
                  actionToastTri('success', {
                    ru: 'Флаг сброшен',
                    uk: 'Прапор скинуто',
                    es: 'Marcador reiniciado.',
                  }),
                );
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="map-outline" label="🗺️ Карта прогресса"
              sub="Открыть экран карты уровней"
              onPress={() => router.push('/progress_map' as any)}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="ribbon-outline" label="🎓 Сертификат Профессора Лингмана — превью"
              sub="Редактируемые поля + share PNG + засеять/удалить мой сертификат"
              onPress={() => setCertificatePreviewVisible(true)}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          {/* ── 4. МОДАЛКИ PREMIUM / ПЕЙВОЛЛЫ ── */}
          <AccordionSection id="premium_modals" icon="diamond-outline" title="Пейволлы Premium — все контексты" badge={PREMIUM_PREVIEW_CONTEXTS.length + 4}
            open={openSection === 'premium_modals'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {/* Trial UI QA — приоритетный блок: проверка новой золотой ленты + Free 7 days
                в карточках планов. _force_trial_ui=1 форсит UI даже без реального RC
                (Expo Go / dev / магазин не отдаёт intro). В проде параметр недоступен. */}
            <View style={{ marginHorizontal: 12, marginVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)', padding: 12 }}>
              <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 0.4, marginBottom: 6 }}>
                🎁 ТРИАЛ-UI · ЧТО ПРОВЕРИТЬ
              </Text>
              <Text style={{ color: '#FFE07A', fontSize: 11, lineHeight: 15, marginBottom: 10 }}>
                {`✓ Сверху золотая лента «Попробуй Premium 7 дней бесплатно»\n✓ В обоих карточках справа: «Бесплатно» (зелёным) + «на 7 дней» + мелко «затем €X/період»\n✓ CTA: «🚀 7 дней бесплатно — затем €X/період»\n✗ Большие ценники справа НЕ доминируют (compliance ok)`}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  doHaptic();
                  await resetTrialCooldownForTesting();
                  setTrialCooldownStatusLine(await getTrialStatusLineForTesters(lang));
                  router.push({ pathname: '/premium_modal', params: { context: 'generic', _force_trial_ui: '1' } } as any);
                }}
                activeOpacity={0.8}
                style={{ backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', marginBottom: 8 }}
              >
                <Text style={{ color: '#1a1208', fontSize: 13, fontWeight: '900' }}>
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
                style={{ borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700' }}
              >
                <Text style={{ color: '#FFE07A', fontSize: 12, fontWeight: '700' }}>
                  «Натуральный» режим (как у юзера)
                </Text>
              </TouchableOpacity>
              <Text style={{ color: '#FF8080', fontSize: 10, marginTop: 8, fontStyle: 'italic', lineHeight: 14 }}>
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
                await AsyncStorage.setItem(QUIZ_E2E_OPEN_RESULTS_KEY, '1');
                router.push('/quizzes_screen' as any);
              }}
              t={t} f={f} doHaptic={doHaptic}
            />
            <ButtonRow icon="diamond-outline" label="💎 Экран успеха Premium"
              sub="Красивый экран после покупки"
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'generic', _preview_success: '1' } } as any)}
              t={t} f={f} doHaptic={doHaptic} />
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

          {/* ── 5. ТОСТЫ И НОТИФИКАЦИИ ── */}
          <AccordionSection id="toasts" icon="notifications-outline" title="Тосты и нотификации" badge={ALL_ACHIEVEMENTS.slice(0, 5).length + 1}
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
          </AccordionSection>

          {/* ── 6. LEVEL UP И ПОДАРКИ ── */}
          <AccordionSection id="levelup" icon="gift-outline" title="Level-up и подарки" badge={12}
            open={openSection === 'levelup'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([5, 10, 20, 30, 50] as const).map(lvl => (
              <ButtonRow key={`gift_${lvl}`} icon="gift-outline"
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
            {([
              { source: 'lesson_first' as const, label: '+1 Первый урок', reason: 'Первое прохождение урока' },
              { source: 'lesson_perfect' as const, label: '+2 Идеальный урок', reason: 'Идеальный урок (0 ошибок)' },
              { source: 'arena_win' as const, label: '+1 Победа в арене', reason: 'Победа в Арене' },
              { source: 'streak_7' as const, label: '+3 Стрик 7 дней', reason: '7-дневный стрик' },
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
          <AccordionSection id="onboarding" icon="play-circle-outline" title="Онбординг" badge={3}
            open={openSection === 'onboarding'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            <ButtonRow icon="play-circle-outline" label="👋 Онбординг — просмотреть повторно"
              onPress={async () => { await AsyncStorage.multiRemove(['onboarding_done', 'onboarding_step']); emitAppEvent('account_deleted'); }}
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
          </AccordionSection>

          {/* ── 9. NEW CORE MODALS (QA) ── */}
          <AccordionSection id="core_modals" icon="construct-outline" title="Новые модалки (QA core)" badge={18}
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
            <ButtonRow icon="diamond-outline" label="💎 ShardRewardModal"
              sub="Награда за исправленный репорт"
              onPress={() => {
                setShardRewardPayload(shardRewardPreview);
                setShardRewardVisible(true);
                markQa('shardReward');
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="albums-outline" label="💎 ShardRewardModal (multi)"
              sub="Несколько наград сразу"
              onPress={() => {
                setShardRewardPayload(shardRewardMultiPreview);
                setShardRewardVisible(true);
                markQa('shardReward');
              }}
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
            <ButtonRow icon="gift-outline" label="🎁 Release bonus (релиз)"
              sub={
                (() => {
                  const w = getActiveReleaseWaveVersion();
                  const b = getAppReleaseBuildId();
                  if (w <= 0) {
                    return triLang(lang, {
                      uk: 'У config: RELEASE_WAVE_BONUS_VERSION = 0',
                      ru: 'В config: RELEASE_WAVE_BONUS_VERSION = 0',
                      es: 'En config: RELEASE_WAVE_BONUS_VERSION = 0',
                    });
                  }
                  return (
                    triLang(lang, {
                      uk: `Хвиля ${w} · нативний build ${b} · збіг: `,
                      ru: `Волна ${w} · нативный build ${b} · совпад: `,
                      es: `Oleada ${w} · build nativo ${b} · coincide: `,
                    }) + (b === w ? '✓' : '✗')
                  );
                })()
              }
              onPress={() => { setReleaseWaveModal({ open: true, preview: true }); markQa('releaseWaveBonus'); }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="diamond-outline" label="🎁 Release bonus — як у прод"
              sub={triLang(lang, {
                uk: 'Імітує «був build (волна-1)»: після скидів — діалог як після оновлення зі стору. Не дасть, якщо v=0 або build≠волна',
                ru: 'Имитирует «стоял build (волна−1)» — после сбросов, как у обновившегося. v=0 или build≠волна — стоп.',
                es: 'Simula «build anterior (oleada−1)»: tras los resets, diálogo como tras actualizar. Si v=0 o build≠oleada — no.',
              })}
              onPress={async () => {
                doHaptic();
                const w = getActiveReleaseWaveVersion();
                await resetLastPersistedNativeBuildForTesting();
                await resetReleaseWaveBonusLocalClaimForTesting(w);
                if (w <= 0 || !isUserBuildMatchingReleaseWave()) {
                  emitAppEvent(
                    'action_toast',
                    actionToastTri('info', {
                      ru:
                        w <= 0
                          ? 'В config выставь RELEASE_WAVE_BONUS_VERSION > 0 и пересобери'
                          : `Нативный build ${getAppReleaseBuildId()} ≠ волна ${w} (выровняй app.json)`,
                      uk:
                        w <= 0
                          ? 'У config: RELEASE_WAVE_BONUS_VERSION > 0 і перезбірка'
                          : `Нативний build ${getAppReleaseBuildId()} ≠ хвиля ${w} (app.json)`,
                      es:
                        w <= 0
                          ? 'En config pon RELEASE_WAVE_BONUS_VERSION > 0 y vuelve a compilar'
                          : `Build nativo ${getAppReleaseBuildId()} ≠ oleada ${w} (alinéalo en app.json)`,
                    }),
                  );
                  return;
                }
                await AsyncStorage.setItem(
                  APP_LAST_RECORDED_NATIVE_BUILD_ID_KEY,
                  w > 1 ? String(w - 1) : '0',
                );
                setReleaseWaveModal({ open: true, preview: false });
                markQa('releaseWaveBonus');
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="trash-outline" label="🧹 Сброс маркера бонуса релиза (локал)"
              sub="Сбрасывает и claim, и app_last_recorded… (полный сценарий с нуля, не дашборд claim)"
              onPress={async () => {
                doHaptic();
                const w = getActiveReleaseWaveVersion();
                await resetLastPersistedNativeBuildForTesting();
                await resetReleaseWaveBonusLocalClaimForTesting(w);
                const vLabel = w > 0 ? w : '—';
                emitAppEvent(
                  'action_toast',
                  actionToastTri('success', {
                    ru: `Сброшены v${vLabel} + build`,
                    uk: `Скинуто v${vLabel} + build`,
                    es: `Restablecidos v${vLabel} + build`,
                  }),
                );
              }}
              t={t} f={f} doHaptic={doHaptic} />
            <ButtonRow icon="people-outline" label="⚔️ MatchFoundToast mock"
              sub="status=found без сети (релиз и dev)"
              onPress={triggerMatchFoundToastPreview}
              t={t} f={f} doHaptic={doHaptic} />
          </AccordionSection>

          <AccordionSection id="qa_checklist" icon="checkbox-outline" title="QA чеклист (dev)" badge={Object.values(qaChecks).filter(Boolean).length}
            open={openSection === 'qa_checklist'} onToggle={id => setOpenSection(openSection === id ? null : id)}>
            {([
              ['noEnergy', 'NoEnergyModal'],
              ['arenaLimit', 'ArenaLimitModal'],
              ['quizTimeout', 'QuizTimeoutModal'],
              ['userWarning', 'UserWarningModal'],
              ['shardReward', 'ShardRewardModal'],
              ['reportModal', 'ReportUserModal preview'],
              ['actionToast', 'ActionToast (all types)'],
              ['updateModal', 'UpdateModal'],
              ['releaseWaveBonus', 'Release bonus релиз'],
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
                  borderBottomColor: RED_BORDER,
                }}
              >
                <Text style={{ color: '#FFB0B0', fontSize: 14, flex: 1, paddingRight: 8 }}>{label}</Text>
                <Text style={{ color: qaChecks[key] ? '#22C55E' : '#FF8080', fontSize: 13, fontWeight: '700' }}>
                  {qaChecks[key] ? '✅ OK' : '⏳ TODO'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={RED_DIM} style={{ marginLeft: 6 }} />
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
                shardReward: false,
                reportModal: false,
                actionToast: false,
                updateModal: false,
                matchFoundToast: false,
              })}
              t={t}
              f={f}
              doHaptic={doHaptic}
            />
          </AccordionSection>

          {/* ── 9.5 ЛИГИ / ЗАЛ СЛАВЫ — ПОВЫШЕНИЯ/ПОНИЖЕНИЯ (изолированный тест) ── */}
          <AccordionSection id="rank_change_test" icon="trending-up-outline" title="🏆 Лиги / зал славы — повышения/понижения" badge={8}
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
            <ButtonRow
              icon="rocket-outline"
              label="Зал славы: +1 место"
              sub="Тестовое окно с фейковым top-10"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('hof', 1)}
            />
            <ButtonRow
              icon="rocket-outline"
              label="Зал славы: +5 мест (подъём)"
              sub="Большой скачок вверх"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('hof', 5)}
            />
            <ButtonRow
              icon="trending-down-outline"
              label="Зал славы: −1 место"
              sub="Жёлтый банер"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('hof', -1)}
            />
            <ButtonRow
              icon="trending-down-outline"
              label="Зал славы: −4 места"
              sub="Жёлтый банер + анимация вниз"
              t={t} f={f} doHaptic={doHaptic}
              onPress={() => openRankTest('hof', -4)}
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
            })}
            sub={triLang(lang, {
              uk: 'Видалити весь прогрес та налаштування',
              ru: 'Удалить весь прогресс и настройки',
              es: 'Elimina todo el progreso y la configuración',
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
            })}
            sub={triLang(lang, {
              uk: 'Скинути стрік та інші статистики',
              ru: 'Сбросить стрик и другую статистику',
              es: 'Elimina la racha y el resto de estadísticas guardadas',
            })}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              doHaptic();
              setModalResetStats(true);
            }}
          />
          </AccordionSection>

        </ScrollView>
      </SafeAreaView>

      {leagueResult && (
        <ClubResultModal
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
      <ShardRewardModal
        rewards={shardRewardPayload}
        visible={shardRewardVisible}
        onClose={() => setShardRewardVisible(false)}
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
        lang={lang}
        previewOnly
        onClose={() => setReportUserPreviewVisible(false)}
      />
      <UpdateModal
        visible={updateModalVisible}
        storeUrl={STORE_URL}
        message={triLang(lang, {
          uk: 'Тестовий preview форс-оновлення. Перевір CTA і стиль модалки.',
          ru: 'Тестовый preview форс-обновления. Проверь CTA и стиль модалки.',
          es: 'Vista previa de actualización forzada de prueba. Revisa el CTA y el estilo del modal.',
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
            }),
          );
        }}
      />
      <ReleaseWaveBonusModal
        visible={releaseWaveModal.open}
        previewMode={releaseWaveModal.preview}
        onClose={() => {
          setReleaseWaveModal(m => {
            return { ...m, open: false };
          });
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
        title={triLang(lang, { uk: 'Розблокувати все?', ru: 'Разблокировать все?', es: '¿Desbloquear todo?' })}
        message={triLang(lang, {
          uk: 'Це розблокує всі досягнення та рамки.',
          ru: 'Это разблокирует все достижения и рамки.',
          es: 'Desbloqueará todos los logros y marcos.',
        })}
        cancelLabel={triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { uk: 'Розблокувати', ru: 'Разблокировать', es: 'Desbloquear' })}
        onCancel={() => setModalUnlockAll(false)}
        onConfirm={() => {
          setModalUnlockAll(false);
          void performUnlockAll();
        }}
        confirmVariant="accent"
      />
      <ThemedConfirmModal
        visible={modalPremiumStrip}
        title={triLang(lang, { uk: 'Зняти преміум?', ru: 'Снять премиум?', es: '¿Quitar Premium?' })}
        message={triLang(lang, {
          uk: 'Акаунт буде переведено в режим без преміуму. RevenueCat не буде змінено.',
          ru: 'Аккаунт будет переведён в режим без премиума. RevenueCat не будет затронут.',
          es: 'La cuenta pasará a modo sin Premium. RevenueCat no se altera.',
        })}
        cancelLabel={triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { uk: 'Зняти', ru: 'Снять', es: 'Quitar' })}
        onCancel={() => setModalPremiumStrip(false)}
        onConfirm={() => {
          setModalPremiumStrip(false);
          void performStripPremium();
        }}
        confirmVariant="default"
      />
      <ThemedConfirmModal
        visible={modalResetAll}
        title={triLang(lang, { uk: 'Скинути все?', ru: 'Сбросить все?', es: '¿Restablecer todo?' })}
        message={triLang(lang, {
          uk: 'Це видалить уроки, досягнення, рамки, енергію, XP та всі налаштування. Це не можна скасувати!',
          ru: 'Это удалит уроки, достижения, рамки, энергию, XP и все настройки. Это нельзя отменить!',
          es: 'Borrará lecciones, logros, marcos, energía, XP y todos los ajustes. ¡No se puede deshacer!',
        })}
        cancelLabel={triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { uk: 'Скинути', ru: 'Сбросить', es: 'Restablecer' })}
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
        })}
        message={triLang(lang, {
          uk: 'Це видалить стрік, щоденну статистику та інші досягнення. Це не можна скасувати!',
          ru: 'Это удалит стрик, ежедневную статистику и другие достижения. Это нельзя отменить!',
          es: 'Eliminará la racha, las estadísticas diarias y otros logros relacionados. ¡No se puede deshacer!',
        })}
        cancelLabel={triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { uk: 'Скинути', ru: 'Сбросить', es: 'Restablecer' })}
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
    </View>
  );
}
