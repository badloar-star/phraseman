import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../app/personal_progress_store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { trackEvent as trackAiDialogEvent } from '../app/analytics';
import { warmPremiumDialog } from '../app/ai_dialog_client';
import { warmPremiumDialogStream } from '../app/ai_dialog_stream_client';
import { isScenarioUnlockedForAccount, reachedCourseLevel } from '../app/ai_dialog_level_lock';
import { getCompletedDialogIds } from '../app/dialogs_progress';
import { getOwnedDialogIds } from '../app/ai_dialog_ownership';
import { DebugLogger } from '../app/debug-logger';
import { dialogueScenarioPresentation } from '../app/dialogue_scenario_presentation';
import DialogueTargetBoundary from './dialogs/DialogueTargetBoundary';
import {
  DIALOG_SCENARIO_GROUPS,
  dialogScenarioGroupLabel,
  getChallengeDialogScenarios,
  getScenariosByCategory,
  scenarioPriceRunes,
  type DialogScenario,
  type DialogScenarioCategory,
} from '../app/ai_dialog_scenarios';
import { onAppEvent } from '../app/events';
import { aiDialogContentAvailableForTarget, aiDialogTargetGateCopy } from '../app/ai_dialog_target_gate';
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
} from '../app/lessons_tab_state';
import {
  CHALLENGE_SCENE_THEME,
  sceneThemeForCategory,
  type DialogSceneTheme,
} from '../constants/dialogSceneThemes';
import { triLang, type Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import DialogScenarioTile from './DialogScenarioTile';
import TutorHubPoster from './dialogs/TutorHubPoster';
import { readTutorLessonTrace } from '../app/tutor_lesson_local_state';
import { isTextTutorEnabled, hasRemoteConfigSnapshotApplied } from '../app/remote_flags';
import DialogQuotaBadge from './DialogQuotaBadge';
import { useLang } from './LangContext';
import { useFeatureAccess, usePremium } from './PremiumContext';
import { captureAccountGeneration } from '../app/account_generation';
import { readAiDialogDailyQuota, type AiDialogDailyQuotaState } from '../app/ai_dialog_daily_quota';
import type { PremiumContext } from '../app/premium_context';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

import { noAndroidOutline } from '../constants/androidGlow';
// зачем (v2, 2026-08-23): владелец задал эталон — раздел «Статистика»: всё
// крупное, никаких мелких плиток/подписей. Полки карточек 128px заменены
// стопкой полноширинных карточек-миров с разворотом (паттерн стрик-карты).
// Статус карточки сценария — кодирует и подачу, и доступность.
type ScenarioStatus = 'done' | 'available' | 'locked';

// зачем через globalThis, а не голый `__DEV__`: голая ссылка падает в jest
// (см. память project_dev_guard_bare_dev_global_jest).
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

// Мир каталога: три группы курса + «Ситуации». Каталог — стопка крупных
// карточек-миров (эталон владельца — раздел «Статистика»), разворот по тапу.
type WorldKey = DialogScenarioCategory | 'challenge';

const WORLD_ICONS: Record<WorldKey, string> = {
  everyday: 'cafe',
  travel: 'airplane',
  social: 'people',
  challenge: 'flame',
};

interface ScenarioVM {
  scenario: DialogScenario;
  status: ScenarioStatus;
  /** Чип уровня: CEFR для уроков, «ур. N» для ситуаций. */
  levelChip: string;
  /** Текст-замок (для locked) — почему закрыто. */
  lockedText: string;
  /** Световая палитра сцены карточки. */
  scene: DialogSceneTheme;
  onPress: () => void;
  onLongPress: () => void;
}
interface DialogsTabContentProps {
  headerSlot?: React.ReactNode;
  bottomPadding?: number;
  topPadding?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  trackImpression?: boolean;
  active?: boolean;
}

/**
 * Подпись закрытого сценария — ЦЕНА В РУНАХ (владелец 2026-09-17, вариант Б
 * макета: «цена строкой под названием»).
 *
 * зачем цена, а не «Входит в Plus»: руны дают ДОСТУП, Plus даёт ОБЪЁМ реплик.
 * Пока в списке висело «Входит в Plus», копить руны было незачем и не на что —
 * стоков у валюты фактически не было.
 *
 * зачем БЕЗ слова «навсегда» (прямое указание владельца): доступ бывает двух
 * видов — купленный за руны (неотчуждаемый) и открытый по Plus (исчезает
 * вместе с подпиской). «Навсегда» врало бы про второй.
 *
 * Цена берётся из scenarioPriceRunes — единственного источника, того же, из
 * которого списывает покупка. Разойдись они, в списке стояла бы одна цифра,
 * а списалась бы другая.
 */
function dialogLockedLabel(scenario: DialogScenario, lang: Lang): string {
  const price = scenarioPriceRunes(scenario);
  if (price > 0) return `ᚱ ${price.toLocaleString('ru-RU').replace(/ /g, ' ')}`;
  return triLang(lang, {
    ru: 'Входит в Plus', uk: 'Входить у Plus', en: 'Included in Plus', es: 'Incluido en Plus', 'pt-BR': 'Incluído no Plus',
    vi: 'Có trong Plus', id: 'Termasuk Plus', tr: 'Plus’a dahil', pl: 'Dostępne w Plus',
  });
}

export default function DialogsTabContent(props: DialogsTabContentProps) {
  const { studyTarget } = useStudyTarget();
  return <DialogueTargetBoundary target={studyTarget}><DialogsTabContentBody {...props} /></DialogueTargetBoundary>;
}

function DialogsTabContentBody({
  headerSlot,
  bottomPadding = 34,
  topPadding = 0,
  onScroll,
  trackImpression = true,
  active = true,
}: DialogsTabContentProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const dialogAccess = useFeatureAccess('ai_dialog');
  const { accessResolved, hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const impressionFiredRef = useRef(false);
  const activeRef = useRef(active);
  const completedDirtyRef = useRef(false);
  const xpDirtyRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const completedGenerationRef = useRef(0);
  activeRef.current = active;
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const frenchGateCopy = aiDialogTargetGateCopy(lang, studyTarget);

  const [accountLevel, setAccountLevel] = useState(1);
  const [unlockedLessons, setUnlockedLessons] = useState<number[]>(
    () => getLessonsTabInitialState(studyTarget)?.persistedUnlocked ?? [],
  );
  // Завершённые сценарии (локальный прогресс) — для отметки «Пройдено»,
  // счётчиков X/N в мирах и звания на афише Макса.
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  // Сценарии, купленные за руны (владелец 2026-09-17: руны покупают ЯЗЫК).
  // Локальное чтение, 0 чтений Firestore: владение живёт на телефоне, облако
  // лишь догоняет его фоном (см. app/ai_dialog_ownership.ts).
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => new Set());
  // Подпись афиши Макса: тема, которую он назвал следующей в прошлом уроке.
  // Локальный слепок, 0 чтений Firestore (см. app/tutor_lesson_local_state.ts).
  const [tutorNextTopic, setTutorNextTopic] = useState('');
  // Флаг раздела «Урок с Максом». Зеркалит серверный гейт: без него афиша вела
  // бы человека в экран, который тут же откажет. Меняется живьём из «Пульта»,
  // поэтому подписка, а не разовое чтение.
  const [tutorEnabled, setTutorEnabled] = useState(() => isTextTutorEnabled());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      const next = isTextTutorEnabled();
      console.log('[DIALOG-HUB] flag:changed', JSON.stringify({ gate_ai_text_tutor: next }));
      setTutorEnabled(next);
    });
    return () => sub.remove();
  }, []);

  // зачем трасса: «в разделе ничего нет» — афишу режет одно из двух условий, и
  // без печати ЗНАЧЕНИЙ (а не голого true/false) непонятно, какое именно:
  // языковой гейт раздела или флаг «Пульта». Печатаем при каждом заходе.
  useEffect(() => {
    if (!active) return;
    console.log('[DIALOG-HUB] poster:gate', JSON.stringify({
      aiDialogGateOpen,
      studyTarget,
      tutorEnabled,
      remoteSnapshotApplied: hasRemoteConfigSnapshotApplied(),
      posterVisible: aiDialogGateOpen && tutorEnabled,
    }));
  }, [active, aiDialogGateOpen, studyTarget, tutorEnabled]);

  // Раскрытый мир. При входе на экран все разделы свёрнуты — раскрытие только
  // ручное, по тапу (эталонный паттерн разворота карточки).
  const [openWorld, setOpenWorld] = useState<WorldKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLessonsTabStateFromStorage(studyTarget)
      .then((snap) => {
        if (!cancelled) setUnlockedLessons(snap.persistedUnlocked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [studyTarget]);

  const refreshCompleted = useCallback(() => {
    if (!activeRef.current) {
      completedDirtyRef.current = true;
      return;
    }
    completedDirtyRef.current = false;
    const generation = ++completedGenerationRef.current;
    // зачем ВМЕСТЕ с прогрессом: покупка диалога за руны шлёт то же событие
    // `dialogs_progress_changed`, поэтому купленный сценарий обязан открыться
    // в списке в том же обновлении — иначе человек заплатил, а плитка ещё
    // висит с замком (правило Optimistic UI).
    void Promise.all([
      getCompletedDialogIds(studyTarget),
      getOwnedDialogIds(studyTarget, captureAccountGeneration().stableId ?? ''),
    ]).then(([ids, owned]) => {
      if (!activeRef.current || generation !== completedGenerationRef.current) return;
      setCompletedIds(ids);
      setOwnedIds(owned);
    }).catch((error: unknown) => {
      // Немой catch запрещён: без лога «плитка висит с замком после покупки»
      // выглядело бы как баг доступа, а не как сбой чтения хранилища.
      DebugLogger.error(
        'DialogsTabContent:refresh_progress',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
  }, [studyTarget]);
  useEffect(() => {
    const sub = onAppEvent('dialogs_progress_changed', refreshCompleted);
    return () => sub.remove();
  }, [refreshCompleted]);

  const refreshAccountLevel = useCallback(async () => {
    if (!activeRef.current) {
      xpDirtyRef.current = true;
      return;
    }
    xpDirtyRef.current = false;
    const generation = ++refreshGenerationRef.current;
    await hydratePersonalProgress().catch(() => null);
    if (!activeRef.current || generation !== refreshGenerationRef.current) return;
    const totalXP = getPersonalProgressSnapshot().totalXp;
    setAccountLevel(getLevelFromXP(totalXP));
  }, []);

  useEffect(() => {
    const xpChanged = onAppEvent('xp_changed', () => { void refreshAccountLevel(); });
    const xpUpdated = onAppEvent('xp_updated', () => { void refreshAccountLevel(); });
    return () => {
      xpChanged.remove();
      xpUpdated.remove();
    };
  }, [refreshAccountLevel]);

  useEffect(() => {
    if (!active) return;
    // One active pass covers initial hydration and all hidden dirty events.
    refreshCompleted();
    void refreshAccountLevel();
  }, [active, refreshAccountLevel, refreshCompleted]);

  /**
   * Будим спящий инстанс диалога, как только человек вошёл в раздел.
   *
   * зачем (владелец 2026-09-17): «чтобы он зашёл в диалог, и диалог начался
   * мгновенно, а не ответил на первую реплику и ждал 15 секунд». Приветствие
   * собеседника локальное и появляется сразу (ai_dialog_greeting) — ожидание
   * возникало ПОСЛЕ первого ответа человека: premiumDialogSend/Stream живёт с
   * minInstances: 0 (экономия владельца, сторож
   * ai_functions_warm_instance_contract), а будильник стоял только на экране
   * сессии, то есть просыпался ровно тогда, когда человек уже печатал.
   *
   * Здесь у нас самая длинная фора: выбор мира и сценария плюс чтение задания —
   * десятки секунд, за которые инстанс встаёт полностью. Дальше будильник
   * повторяется на экране-задании (ai_dialog_briefing) как страховка на случай
   * долгого выбора.
   *
   * Стоимость: ноль чтений Firestore и ноль денег. Серверная ветка warmupPing
   * отвечает ДО Firestore, гейтов и OpenAI, а warmAiFunction держит TTL 9 минут
   * и склеивает параллельные вызовы — все три точки прогрева вместе дают
   * максимум один сетевой пинг за 9 минут.
   *
   * зачем ЗДЕСЬ БОЛЬШЕ НЕТ прогрева флага «видел интро»: этот эффект раньше
   * прогревал кэш ai_dialog_intro_seen для всех 53 сценариев, чтобы тап по
   * плитке мог синхронно решить «показывать брифинг или прыгать в сессию».
   * Автопропуск брифинга снят (владелец 2026-09-17: экран-задание виден
   * всегда), решать больше нечего — 53 чтения AsyncStorage на каждый вход в
   * раздел стали чистой тратой.
   */
  useEffect(() => {
    if (!active || !aiDialogGateOpen) return;
    warmPremiumDialog(studyTarget);
    warmPremiumDialogStream(studyTarget);
  }, [active, aiDialogGateOpen, studyTarget]);

  useEffect(() => {
    if (!trackImpression || impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    void trackAiDialogEvent('ai_dialog_card_shown');
  }, [trackImpression]);

  const reachedLevel = useMemo(() => reachedCourseLevel(unlockedLessons), [unlockedLessons]);
  const hasLockedCourseLevels = !dialogAccess;
  // зачем (владелец, 2026-09-13): dialogAccess=false больше не «замок на всё», а
  // «дневной лимит действует». Каталог закрывает сценарии только когда сегодня
  // сервер уже сказал «0» (зеркало ai_dialog_daily_quota.ts); иначе сценарий
  // достигнутого уровня открыт, а уровни выше — по-прежнему за Plus.
  // зачем (владелец 2026-09-14): раньше хранился только флаг «исчерпано», и
  // карточка апселла показывала пейвол «Дневной лимит исчерпан» ВСЕГДА — даже
  // когда потрачена 1 реплика из 10. Теперь держим всё состояние квоты: по нему
  // и выбирается ЧЕСТНЫЙ пейвол, и рисуется остаток на карточке.
  const [quota, setQuota] = useState<AiDialogDailyQuotaState | null>(null);
  useEffect(() => {
    if (!accessResolved || hasPremiumAccess) {
      setQuota(null);
      return;
    }
    let cancelled = false;
    void readAiDialogDailyQuota(studyTarget, captureAccountGeneration().stableId).then((state) => {
      if (cancelled) return;
      if (IS_DEV_RUNTIME) console.log('[DIALOG-PAYWALL] quota:read', JSON.stringify(state));
      setQuota(state);
    });
    return () => { cancelled = true; };
  }, [accessResolved, hasPremiumAccess, studyTarget]);
  const dailyLimitExhausted = !hasPremiumAccess && quota?.status === 'exhausted';
  const dialogsOpenToday = !dailyLimitExhausted;
  /**
   * зачем: пейвол обязан называть ПРИЧИНУ, по которой человек сюда попал.
   * Лимит реально исчерпан → «Дневной лимит исчерпан». Лимит цел → причина
   * другая: закрыты сценарии уровней выше, это `dialog_locked_level`.
   */
  const upsellContext: PremiumContext = dailyLimitExhausted ? 'dialog_limit' : 'dialog_locked_level';
  const quotaLimit = quota?.limit ?? REVENUE_DAILY_LIMITS.ai_dialog_replies;
  const repliesLeftToday = !hasPremiumAccess
    ? quota?.status === 'allowed'
      ? quota.remaining
      : dailyLimitExhausted
        ? 0
        : quotaLimit
    : null;
  const accent = t.accent;

  const openScenarioDestination = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      // The briefing route is also the opaque cold-start resolver. Navigation
      // happens in this tap frame; AsyncStorage never sits in front of it.
      router.push({
        pathname: '/ai_dialog_briefing',
        params: { scenarioId: scenario.id, forceBriefing: forceBriefing ? '1' : undefined },
      } as never);
    },
    [router],
  );

  const openCourseScenario = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      if (!accessResolved) return;
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogsOpenToday) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
          reason: 'daily_limit',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit', source: 'dialogs_catalogue' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogs_catalogue' } } as never);
        return;
      }
      // Тап и статус плитки обязаны спрашивать ОДНО правило, иначе плитка
      // покажет «открыто», а тап уведёт на пейвол (или наоборот).
      const unlocked = isScenarioUnlockedForAccount(scenario.id, dialogAccess, ownedIds);
      /**
       * У сценария есть ЦЕНА В РУНАХ — это не тупик, а предложение купить
       * (владелец 2026-09-17, экраны 2-3 макета docs/design/runes/MAKET.html).
       *
       * зачем ветка ДО пейвола: найдено на живом эмуляторе 17.09 — в списке
       * цена «ᚱ 5 000» показывалась, а тап уводил на пейвол Plus, то есть
       * купить диалог за руны было НЕВОЗМОЖНО, экран покупки недостижим.
       * Пейвол здесь ещё и врал: доступ продаётся за руны, а не только за Plus.
       */
      if (!unlocked && scenarioPriceRunes(scenario) > 0) {
        console.log(`[RUNES-BUY] catalog:offer scenario=${scenario.id} price=${scenarioPriceRunes(scenario)}`); // guard-ok: ветка решения обязана логироваться и в релизе
        void openScenarioDestination(scenario, forceBriefing);
        return;
      }
      if (!unlocked) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
          reason: 'plus_only_scenario',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level', source: 'dialogs_catalogue' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level', source: 'dialogs_catalogue' } } as never);
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, aiDialogGateOpen, dialogAccess, ownedIds, dialogsOpenToday, frenchGateCopy, openScenarioDestination, reachedLevel, router],
  );

  const openChallengeScenario = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      if (!accessResolved) return;
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogsOpenToday) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          reason: 'daily_limit',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit', source: 'dialogs_catalogue' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogs_catalogue' } } as never);
        return;
      }
      /**
       * зачем (владелец 2026-09-14, дословно «все остальные это плюс или
       * уровень. (те что уровень тоже плюс нужен)»): вызовы открывались
       * уровнем аккаунта и показывали алерт «откроется на уровне N». Теперь
       * они входят в Plus, как и весь каталог сверх трёх бесплатных сценариев.
       * Алерт заменён пейволом: он называет настоящую причину и даёт выход,
       * а не просто закрывается кнопкой «Закрыть».
       */
      const unlocked = isScenarioUnlockedForAccount(scenario.id, dialogAccess);
      if (!unlocked) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          requiredLevel: scenario.requiredAccountLevel ?? 1,
          accountLevel,
          reason: 'plus_only_scenario',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level', source: 'dialogs_catalogue' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level', source: 'dialogs_catalogue' } } as never);
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, accountLevel, aiDialogGateOpen, dialogAccess, dialogsOpenToday, frenchGateCopy, lang, openScenarioDestination, router],
  );

  // ── View-model каталога ────────────────────────────────────────────────────
  // Каждой карточке считаем статус (done / available / locked) один раз — UI ниже
  // только рисует по статусу, без повторной проверки замков.

  const courseGroupVMs = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((group) => {
        const scene = sceneThemeForCategory(group.category);
        const scenarios = getScenariosByCategory(group.category).map<ScenarioVM>((scenario) => {
          // зачем (владелец 2026-09-14): замок больше НЕ про уровень курса —
          // открыты ровно три сценария, остальные за Plus. Прежний текст
          // «Откроется на уровне A2» стал бы ложью: никакой прогресс их уже
          // не откроет.
          const unlocked = isScenarioUnlockedForAccount(scenario.id, dialogAccess, ownedIds);
          const done = completedIds.has(scenario.id);
          const status: ScenarioStatus = !dialogsOpenToday || !unlocked ? 'locked' : done ? 'done' : 'available';
          return {
            scenario,
            status,
            levelChip: scenario.cefr,
            scene,
            lockedText: dialogLockedLabel(scenario, lang),
            onPress: () => openCourseScenario(scenario),
            onLongPress: () => openCourseScenario(scenario, true),
          };
        });
        const doneCount = scenarios.filter((s) => s.status === 'done').length;
        return { group, scene, scenarios, doneCount };
      }),
    [dialogAccess, dialogsOpenToday, completedIds, ownedIds, lang, openCourseScenario],
  );

  const challengeVMs = useMemo<ScenarioVM[]>(
    () =>
      getChallengeDialogScenarios().map((scenario) => {
        const requiredLevel = scenario.requiredAccountLevel ?? 1;
        // Вызовы теперь входят в Plus (владелец 2026-09-14) — уровень аккаунта
        // их больше не открывает. Тап считает ровно это же правило.
        const unlocked = isScenarioUnlockedForAccount(scenario.id, dialogAccess, ownedIds);
        const done = completedIds.has(scenario.id);
        const status: ScenarioStatus = !dialogsOpenToday || !unlocked ? 'locked' : done ? 'done' : 'available';
        return {
          scenario,
          status,
          scene: CHALLENGE_SCENE_THEME,
          levelChip: triLang(lang, {
            ru: `ур. ${requiredLevel}`,
            uk: `рів. ${requiredLevel}`,
            en: `lvl. ${requiredLevel}`,
            es: `niv. ${requiredLevel}`,
            'pt-BR': `nív. ${requiredLevel}`,
            vi: `cấp ${requiredLevel}`,
            id: `lvl. ${requiredLevel}`,
            tr: `sv. ${requiredLevel}`,
            pl: `poz. ${requiredLevel}`,
          }),
          lockedText: dialogLockedLabel(scenario, lang),
          onPress: () => openChallengeScenario(scenario),
          onLongPress: () => openChallengeScenario(scenario, true),
        };
      }),
    [dialogAccess, completedIds, ownedIds, dialogsOpenToday, lang, openChallengeScenario],
  );

  // След прошлого урока с Максом читаем один раз на вход в раздел — это чтение
  // AsyncStorage, а не сети; активной вкладке оно не мешает.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void readTutorLessonTrace(studyTarget).then((trace) => {
      if (!cancelled) setTutorNextTopic(trace?.nextTopic ?? '');
    });
    return () => { cancelled = true; };
  }, [active, studyTarget]);

  /**
   * Старт урока с Максом. Урок — такой же расход дневной квоты, как диалог,
   * поэтому исчерпанный лимит ведёт на пейвол с честной причиной, а не открывает
   * экран, который тут же откажет. Языковой гейт тот же, что у сцен.
   */
  const openTutorLesson = useCallback(() => {
    if (!accessResolved) return;
    if (!aiDialogGateOpen) {
      Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
      return;
    }
    if (!dialogsOpenToday) {
      void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit', source: 'dialogs_tutor_poster' });
      router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogs_tutor_poster' } } as never);
      return;
    }
    void trackAiDialogEvent('ai_dialog_tutor_lesson_opened', { hasTrace: tutorNextTopic.length > 0 });
    router.push('/ai_dialog_tutor_session' as never);
  }, [accessResolved, aiDialogGateOpen, dialogsOpenToday, frenchGateCopy, router, tutorNextTopic]);

  // зачем: владелец просил заходить в «Диалоги» с полностью свёрнутыми
  // разделами — раньше мир героя («Каждый день») раскрывался сам, и экран
  // открывался уже развёрнутым. Теперь развороты — только по тапу.
  const toggleWorld = useCallback((key: WorldKey) => {
    hapticTap();
    setOpenWorld((prev) => (prev === key ? null : key));
  }, []);

  const briefingLongPressHint = triLang(lang, {
    ru: 'Нажмите и удерживайте, чтобы открыть вводную к сценарию.',
    uk: 'Натисніть і утримуйте, щоб відкрити вступ до сценарію.',
    en: 'Press and hold to open the scenario intro.',
    es: 'Mantén pulsado para abrir la introducción del escenario.',
    'pt-BR': 'Mantenha pressionado para abrir a introdução do cenário.',
    vi: 'Nhấn giữ để mở phần giới thiệu kịch bản.',
    id: 'Tekan dan tahan untuk membuka pengantar skenario.',
    tr: 'Senaryo girişini açmak için basılı tutun.',
    pl: 'Przytrzymaj, aby otworzyć wprowadzenie do scenariusza.',
  });

  // ── Рендер строки сценария по статусу ─────────────────────────────────────
  const renderScenarioCard = (vm: ScenarioVM, index: number) => {
    const { scenario, status, levelChip, lockedText, scene } = vm;
    const locked = status === 'locked';
    const presentation = dialogueScenarioPresentation(scenario, studyTarget, lang);
    if (!presentation) return null;
    const title = presentation.title;
    const statusLabel = locked
      ? lockedText
      : status === 'done'
        ? triLang(lang, {
            ru: 'Пройдено', uk: 'Пройдено', en: 'Done', es: 'Hecho', 'pt-BR': 'Concluído',
            vi: 'Đã xong', id: 'Selesai', tr: 'Tamamlandı', pl: 'Ukończono',
          })
        : triLang(lang, {
            ru: 'Новое', uk: 'Нове', en: 'New', es: 'Nuevo', 'pt-BR': 'Novo',
            vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
          });
    const accessibilityHint = locked
      ? triLang(lang, {
          ru: 'Нажмите, чтобы узнать, как открыть сценарий.',
          uk: 'Натисніть, щоб дізнатися, як відкрити сценарій.',
          en: 'Tap to find out how to unlock the scenario.',
          es: 'Pulsa para saber cómo desbloquear el escenario.',
          'pt-BR': 'Toque para saber como desbloquear o cenário.',
          vi: 'Nhấn để xem cách mở khóa kịch bản.',
          id: 'Tekan untuk melihat cara membuka skenario.',
          tr: 'Senaryonun kilidini nasıl açacağını görmek için dokun.',
          pl: 'Naciśnij, aby sprawdzić, jak odblokować scenariusz.',
        })
      : briefingLongPressHint;

    return (
      <DialogScenarioTile
        key={scenario.id}
        index={index}
        icon={scenario.icon}
        title={title}
        levelChip={levelChip}
        status={status}
        statusLabel={statusLabel}
        lockedText={lockedText}
        scene={scene}
        onPress={vm.onPress}
        onLongPress={vm.onLongPress}
        colors={{
          accent: t.accent,
          accentBg: t.accentBg,
          bgCard: t.bgCard,
          bgSurface: t.bgSurface,
          textPrimary: t.textPrimary,
          textMuted: t.textMuted,
          correctText: t.correctText,
        }}
        fontSizes={{ body: f.body, bodyLg: f.bodyLg, sub: f.sub, label: f.label }}
        accessibilityLabel={`${title}. ${levelChip}. ${statusLabel}`}
        accessibilityHint={accessibilityHint}
      />
    );
  };

  // Карточка-мир (эталонный паттерн стрик-карты Статистики): медальон + имя +
  // крупный счётчик + прогресс-бар; тап раскрывает список крупных строк.
  // зачем (владелец, приёмка): в шапке мира ничего не должно тесниться — имя
  // мира переносится целиком, чип «ур. N» из шапки убран (уровень и так виден
  // на каждой строке внутри разворота).
  const renderWorldCard = (
    key: WorldKey,
    label: string,
    scene: DialogSceneTheme,
    vms: ScenarioVM[],
    doneCount: number,
  ) => {
    const expanded = openWorld === key;
    const total = vms.length;
    const ratio = total > 0 ? doneCount / total : 0;
    return (
      <View key={key} style={{ paddingHorizontal: 16, marginTop: 10 }}>
        <View
          style={{
            borderRadius: 22,
            backgroundColor: t.bgCard,
            overflow: 'hidden',
            padding: 14,
            shadowColor: scene.hueDeep,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.24,
            shadowRadius: 12,
            ...noAndroidOutline,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[scene.hue + '2E', scene.hueDeep + '10', 'transparent']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={`${label}. ${doneCount}/${total}`}
            activeOpacity={0.9}
            onPress={() => toggleWorld(key)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 19,
                  backgroundColor: scene.hue + '26',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={WORLD_ICONS[key] as never} size={26} color={scene.hue} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h3 + 1, fontWeight: '800', flex: 1 }}>
                {label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ color: scene.hue, fontSize: f.numLg, fontWeight: '900', lineHeight: f.numLg * 1.05 }}>
                  {doneCount}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>/{total}</Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
            </View>
            <View style={{ height: 10, borderRadius: 6, backgroundColor: t.bgSurface, marginTop: 12, overflow: 'hidden' }}>
              <View
                style={{
                  height: 10,
                  borderRadius: 6,
                  backgroundColor: scene.hue,
                  width: `${Math.max(ratio > 0 ? 4 : 2, Math.round(ratio * 100))}%`,
                }}
              />
            </View>
          </TouchableOpacity>
          {expanded && (
            <View style={{ marginTop: 12, gap: 0 }}>
              {vms.map((vm, index) => renderScenarioCard(vm, index))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Animated.ScrollView decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
    >
      {headerSlot}

      {!hasPremiumAccess && (
        <DialogQuotaBadge
          lang={lang}
          remaining={repliesLeftToday ?? quotaLimit}
          limit={quotaLimit}
          testID="dialogs-catalogue-daily-quota"
        />
      )}

      {!aiDialogGateOpen && (
        <View
          style={{
            marginTop: 14,
            marginHorizontal: 16,
            borderRadius: 22,
            backgroundColor: t.bgCard,
            padding: 16,
            flexDirection: 'row',
            gap: 13,
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: t.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed-outline" size={22} color={t.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {frenchGateCopy.title}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4), marginTop: 4 }}
            >
              {frenchGateCopy.body}
            </Text>
          </View>
        </View>
      )}

      {/* зачем (владелец 2026-09-14, утверждённый хаб «вариант Б»): «не заказать
          кофе, а именно начать урок, и он начинается сразу с тутором, пусть его
          зовут Макс». Афиша заняла место сцены-героя: сцена не потерялась, она
          первая в списке групп ниже. Звание — кольцо в правом верхнем углу
          афиши с пульсирующей прозрачностью, тоже решение владельца. */}
      {aiDialogGateOpen && tutorEnabled && (
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <TutorHubPoster
            lang={lang}
            completedCount={completedIds.size}
            memoryHint={
              tutorNextTopic
                ? triLang(lang, {
                    ru: `В прошлый раз договорились: ${tutorNextTopic}`,
                    uk: `Минулого разу домовилися: ${tutorNextTopic}`,
                    en: `Last time you agreed on: ${tutorNextTopic}`,
                    es: `La última vez acordaron: ${tutorNextTopic}`,
                    'pt-BR': `Da última vez combinaram: ${tutorNextTopic}`,
                    vi: `Lần trước đã hẹn: ${tutorNextTopic}`,
                    id: `Terakhir kali disepakati: ${tutorNextTopic}`,
                    tr: `Geçen sefer kararlaştırdınız: ${tutorNextTopic}`,
                    pl: `Ostatnio umówiliście się na: ${tutorNextTopic}`,
                  })
                : ''
            }
            tabVisible={active}
            onStart={openTutorLesson}
            testID="dialogs-tutor-poster"
          />
        </View>
      )}

      {/* Миры курса: три группы крупными карточками с разворотом. */}
      {aiDialogGateOpen && courseGroupVMs.map(({ group, scene, scenarios, doneCount }) =>
        renderWorldCard(group.category, dialogScenarioGroupLabel(group, lang), scene, scenarios, doneCount),
      )}

      {/* Мир «Ситуации»: жёсткие сцены по уровню аккаунта. */}
      {aiDialogGateOpen && challengeVMs.length > 0 &&
        renderWorldCard(
          'challenge',
          triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', en: 'Situations', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' }),
          CHALLENGE_SCENE_THEME,
          challengeVMs,
          challengeVMs.filter((vm) => vm.status === 'done').length,
        )}

      {hasLockedCourseLevels && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Открыть все диалоги с Plus',
            uk: 'Відкрити всі діалоги з Plus',
            en: 'Unlock all dialogues with Plus',
            es: 'Abrir todos los diálogos con Plus',
            'pt-BR': 'Abrir todos os diálogos com Plus',
            vi: 'Mở tất cả hội thoại với Plus',
            id: 'Buka semua dialog dengan Plus',
            tr: 'Tüm diyalogları Plus ile aç',
            pl: 'Otwórz wszystkie dialogi z Plus',
          })}
          activeOpacity={0.88}
          onPress={() => {
            if (!accessResolved) return;
            hapticTap();
            // зачем: контекст выбирается по ФАКТУ (см. upsellContext), иначе
            // человек с 9 целыми репликами читал «Дневной лимит исчерпан».
            if (IS_DEV_RUNTIME) {
              console.log('[DIALOG-PAYWALL] upsell:tap', JSON.stringify({ upsellContext, quotaStatus: quota?.status ?? 'none', repliesLeftToday }));
            }
            void trackAiDialogEvent('paywall_shown', { context: upsellContext, source: 'dialogs_catalogue' });
            router.push({ pathname: '/premium_modal', params: { context: upsellContext, source: 'dialogs_catalogue' } } as never);
          }}
          style={{
            marginTop: 10,
            marginHorizontal: 16,
            borderRadius: 22,
            backgroundColor: t.bgCard,
            overflow: 'hidden',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[accent + '2A', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 19,
              backgroundColor: accent + '26',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-open-outline" size={25} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {/* зачем новый текст (владелец 2026-09-17, макет экономики рун):
                  старый «Все диалоги входят в Plus» стал ЛОЖЬЮ. Роли валют
                  разошлись: РУНЫ дают доступ (какие диалоги существуют), а
                  Plus — ОБЪЁМ (сколько реплик в день). Обещать доступ за Plus
                  значит продавать одно и то же двумя валютами. */}
              {triLang(lang, {
                ru: 'Plus снимает лимит реплик',
                uk: 'Plus знімає ліміт реплік',
                en: 'Plus removes the daily reply limit',
                es: 'Plus quita el límite de respuestas',
                'pt-BR': 'O Plus remove o limite de respostas',
                vi: 'Plus bỏ giới hạn lượt trả lời',
                id: 'Plus menghapus batas balasan',
                tr: 'Plus yanıt sınırını kaldırır',
                pl: 'Plus znosi limit odpowiedzi',
              })}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: Math.round(f.sub * 1.4) }}
              maxFontSizeMultiplier={1.15}
            >
              {/* зачем (владелец 2026-09-14): вместо общей расшифровки — ФАКТ
                  дня. Пока реплики есть, человек читает сколько осталось, и
                  «лимит исчерпан» его больше не застаёт врасплох. Число уже
                  лежит в локальном зеркале квоты — 0 чтений Firestore. */}
              {repliesLeftToday != null
                ? triLang(lang, {
                    ru: `Сегодня осталось ${repliesLeftToday} из ${quotaLimit} реплик. Сами диалоги открываются за руны.`,
                    uk: `Сьогодні лишилося ${repliesLeftToday} з ${quotaLimit} реплік. Самі діалоги відкриваються за руни.`,
                    en: `${repliesLeftToday} of ${quotaLimit} replies left today. Dialogues themselves unlock with runes.`,
                    es: `Hoy te quedan ${repliesLeftToday} de ${quotaLimit} respuestas. Los diálogos se abren con runas.`,
                    'pt-BR': `Restam ${repliesLeftToday} de ${quotaLimit} respostas hoje. Os diálogos abrem com runas.`,
                    vi: `Hôm nay còn ${repliesLeftToday}/${quotaLimit} lượt trả lời. Hội thoại mở bằng rune.`,
                    id: `Hari ini sisa ${repliesLeftToday} dari ${quotaLimit} balasan. Dialog dibuka dengan rune.`,
                    tr: `Bugün ${quotaLimit} yanıttan ${repliesLeftToday} tanesi kaldı. Diyaloglar rünle açılır.`,
                    pl: `Dziś zostało ${repliesLeftToday} z ${quotaLimit} odpowiedzi. Same dialogi otwierasz runami.`,
                  })
                : triLang(lang, {
                    ru: 'Открой сценарии по урокам и жизненные ситуации для разговорной практики.',
                    uk: 'Відкрий сценарії за уроками й життєві ситуації для розмовної практики.',
                    en: 'Unlock lesson-based scenarios and real-life situations for speaking practice.',
                    es: 'Abre escenarios de lecciones y situaciones reales para practicar conversación.',
                    'pt-BR': 'Abra cenários de lições e situações reais para praticar conversação.',
                    vi: 'Mở các kịch bản bài học và tình huống thực tế để luyện hội thoại.',
                    id: 'Buka skenario pelajaran dan situasi nyata untuk latihan percakapan.',
                    tr: 'Konuşma pratiği için ders senaryolarını ve gerçek durumları aç.',
                    pl: 'Otwórz scenariusze lekcji i sytuacje z życia do ćwiczenia rozmowy.',
                  })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textSecond} />
        </TouchableOpacity>
      )}
    </Animated.ScrollView>
  );
}
