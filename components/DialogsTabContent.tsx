import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useGlassAlert } from '../hooks/use-glass-alert'; // зачем: стеклянное окно вместо нативного Alert (overlays-runtime «French AI-dialog gate»)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  isScenarioUnlockedForAccount,
  legacyDialogScenarioRankRequired,
  reachedCourseLevel,
} from '../app/ai_dialog_level_lock';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { getCompletedDialogIds } from '../app/dialogs_progress';
import { DebugLogger } from '../app/debug-logger';
import { dialogueScenarioPresentation } from '../app/dialogue_scenario_presentation';
import {
  DIALOG_SCENARIO_GROUPS,
  dialogScenarioGroupLabel,
  getChallengeDialogScenarios,
  getScenariosByCategory,
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
import { hapticTap } from '../hooks/use-haptics';
import DialogScenarioTile from './DialogScenarioTile';
import DialogQuotaBadge, { aiDialogMonthlyLimitText, formatAiDialogQuotaResetDate } from './DialogQuotaBadge';
import { useLang } from './LangContext';
import { useFeatureAccess, usePremium } from './PremiumContext';
import { captureAccountGeneration } from '../app/account_generation';
import { readAiDialogMonthlyQuota, type AiDialogMonthlyQuotaState } from '../app/ai_dialog_daily_quota';
import type { PremiumContext } from '../app/premium_context';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

import { noAndroidOutline } from '../constants/androidGlow';
import { V2 } from '../constants/v2Style';
import { DialogueV2CatalogueContainer } from './dialogs/DialogueV2CatalogueContainer';
import { useHubHeaderCollapseActions } from './dialogs/hub_header_collapse';
import type { DialogueV2CatalogueLearnerItem } from './dialogs/DialogueV2CatalogueSection';
import { prestartDialogueV2TextSession } from '../app/dialogue_v2_turn_client';
import { useDialogueV2Warmup } from '../hooks/use_dialogue_v2_warmup';
import { useV2Palette } from './v2/useV2Palette';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
// зачем (v2, 2026-08-23): владелец задал эталон — раздел «Статистика»: всё
// крупное, никаких мелких плиток/подписей. Полки карточек 128px заменены
// стопкой полноширинных карточек-миров с разворотом (паттерн стрик-карты).
// Статус карточки сценария — кодирует и подачу, и доступность.
type ScenarioStatus = 'done' | 'available' | 'locked';

// зачем через globalThis, а не голый `__DEV__`: голая ссылка падает в jest
// (см. память project_dev_guard_bare_dev_global_jest).
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

// зачем (D111): граница месяца есть только у известного серверного состояния
// ('allowed'/'exhausted'); у 'unknown'/'unavailable' её нет — дату не выдумываем.
function quotaResetAtMs(quota: AiDialogMonthlyQuotaState | null): number | null {
  return quota && (quota.status === 'allowed' || quota.status === 'exhausted') ? quota.resetAtMs : null;
}

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
  /** Хост сам рисует пилюлю остатка «N/30» в шапке (экран диалогов, макет hubHead). */
  quotaInHeader?: boolean;
  bottomPadding?: number;
  topPadding?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  trackImpression?: boolean;
  active?: boolean;
}

/**
 * Подпись закрытого сценария — нужный РАНГ (D124, владелец 2026-09-30).
 *
 * зачем: доступ решает только монетный ранг, как у Dialogue V2. Прежние подписи
 * «ᚱ цена» и «Входит в Plus» врали бы: ни руны, ни Plus сценарий больше не
 * открывают. Текст тот же, что на брифинге Dialogue V2.
 */
function dialogLockedLabel(scenario: DialogScenario, lang: Lang): string {
  const rank = legacyDialogScenarioRankRequired(scenario.cefr) ?? 1;
  return triLang(lang, {
    ru: `Откроется на ранге ${rank}`, uk: `Відкриється на ранзі ${rank}`, en: `Unlocks at rank ${rank}`,
    es: `Se desbloquea en el rango ${rank}`, 'pt-BR': `Desbloqueia no nível ${rank}`, vi: `Mở ở hạng ${rank}`,
    id: `Terbuka di peringkat ${rank}`, tr: `${rank}. rütbede açılır`, pl: `Odblokuje się na randze ${rank}`,
  });
}

export default function DialogsTabContent({
  headerSlot,
  quotaInHeader = false,
  bottomPadding = 34,
  topPadding = 0,
  onScroll,
}: DialogsTabContentProps) {
  const router = useRouter();
  const palette = useV2Palette();
  const { studyTarget } = useStudyTarget();
  // зачем (владелец 01.10: диалоги «ДОЛЖНЫ» прогреваться): хаб на экране — греем
  // функции старта и хода (≤1 раза в 10 мин, после первого кадра).
  useDialogueV2Warmup(true, 'hub');
  // зачем (Сверка cold5a/b 23:30: hub:render changed=["onPressItem"] на КАЖДОЙ перерисовке экрана): новая стрелка
  // в каждом рендере заставляла каталог перерисовываться вслед за шапкой. Стабильная ссылка + memo контейнера.
  const onPressCatalogueItem = useCallback((item: DialogueV2CatalogueLearnerItem) => {
    // зачем (владелец 01.10): сессия стартует фоном, пока человек читает брифинг;
    // энергия и квота при этом НЕ тратятся (энергия — на «Начать», квота — на ходе).
    if (item.status === 'available' && (studyTarget === 'en' || studyTarget === 'es' || studyTarget === 'fr' || studyTarget === 'de')) {
      prestartDialogueV2TextSession({ studyTarget, scenarioId: item.id });
    }
    router.push({
      pathname: '/dialogue_v2_briefing',
      params: { scenarioId: item.id },
    } as never);
  }, [router, studyTarget]);
  // зачем (dialogs-003, координатор 13.10): хаб помнит прокрутку ленты — шапка схлопывается, только пока она в поле зрения (иначе открытая категория прыгнула бы). Вне хаба действий нет.
  const hubCollapse = useHubHeaderCollapseActions();
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hubCollapse) hubCollapse.scrollYRef.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  }, [hubCollapse, onScroll]);

  return (
    <Animated.ScrollView
      // зачем (Сверка dialogs-003/006): сплошной palette.bg закрывал общий фон (пятна света темы) внутри безопасной зоны — пятна оставались только
      // под статус-баром и навигацией, на экране выходили «полосы». Прозрачно: виден тот же общий фон, что на Главной; в «Графите» пятен нет — вид плоский.
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
      onScroll={handleScroll}
      scrollEventThrottle={16} decelerationRate="fast"
    >
      {headerSlot}
      <View style={{ paddingHorizontal: V2.screenPad }}>
        <DialogueV2CatalogueContainer
          showQuotaRow={!quotaInHeader}
          onPressItem={onPressCatalogueItem}
        />
      </View>
    </Animated.ScrollView>
  );
}

// Legacy implementation is retained temporarily for dirty-workspace safety;
// the exported product surface above no longer renders it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const completedGenerationRef = useRef(0);
  activeRef.current = active;
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const frenchGateCopy = aiDialogTargetGateCopy(lang, studyTarget);
  const { showGlassAlert, node: glassAlertNode } = useGlassAlert();

  const [unlockedLessons, setUnlockedLessons] = useState<number[]>(
    () => getLessonsTabInitialState(studyTarget)?.persistedUnlocked ?? [],
  );
  // Завершённые сценарии (локальный прогресс) — для отметки «Пройдено»
  // и счётчиков X/N в мирах.
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  // D124: доступ к сценарию решает только монетный ранг (как у Dialogue V2);
  // покупки за руны и Plus больше не учитываются. Ранг — из кэша, без сети.
  const coinRank = useMyCoinRank();
  // Раскрытый мир. При входе на экран все разделы свёрнуты — раскрытие только
  // ручное, по тапу (эталонный паттерн разворота карточки).
  const [openWorld, setOpenWorld] = useState<WorldKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLessonsTabStateFromStorage(studyTarget, 'dialogs_tab')
      .then((snap) => {
        if (!cancelled) setUnlockedLessons(snap.persistedUnlocked);
      })
      .catch(noteSwallowedHandler('DialogsTabContent:useEffect.loadLessonsTabStateFromStorage'));
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
    void getCompletedDialogIds(studyTarget).then((ids) => {
      if (!activeRef.current || generation !== completedGenerationRef.current) return;
      setCompletedIds(ids);
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

  useEffect(() => {
    if (!active) return;
    refreshCompleted();
  }, [active, refreshCompleted]);

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
  // «месячный лимит действует». Каталог закрывает сценарии только когда сервер
  // уже сказал «0» до границы следующего месяца; иначе сценарий
  // достигнутого уровня открыт, а уровни выше — по-прежнему за Plus.
  // зачем (владелец 2026-09-14): раньше хранился только флаг «исчерпано», и
  // карточка апселла показывала пейвол «Лимит исчерпан» ВСЕГДА. Теперь держим
  // всё серверное состояние календарного месяца: по нему
  // и выбирается ЧЕСТНЫЙ пейвол, и рисуется остаток на карточке.
  const [quota, setQuota] = useState<AiDialogMonthlyQuotaState | null>(null);
  useEffect(() => {
    if (!accessResolved || hasPremiumAccess) {
      setQuota(null);
      return;
    }
    let cancelled = false;
    void readAiDialogMonthlyQuota(studyTarget, captureAccountGeneration().stableId).then((state) => {
      if (cancelled) return;
      if (IS_DEV_RUNTIME) console.log('[DIALOG-PAYWALL] quota:read', JSON.stringify(state));
      setQuota(state);
    });
    return () => { cancelled = true; };
  }, [accessResolved, hasPremiumAccess, studyTarget]);
  const monthlyLimitExhausted = !hasPremiumAccess && quota?.status === 'exhausted';
  const dialogsOpenThisMonth = !monthlyLimitExhausted;
  /**
   * зачем: пейвол обязан называть ПРИЧИНУ, по которой человек сюда попал.
   * Месячный лимит реально исчерпан → `dialog_limit`. Лимит цел → причина
   * другая: закрыты сценарии уровней выше, это `dialog_locked_level`.
   */
  const upsellContext: PremiumContext = monthlyLimitExhausted ? 'dialog_limit' : 'dialog_locked_level';
  const quotaLimit = quota?.limit ?? REVENUE_MONTHLY_LIMITS.ai_dialog_replies;
  // зачем (координатор 18.10, Ревизор 3.45): остаток знаем только из зеркала ('allowed'/'exhausted'). 'unknown' — зеркала нет или оно из прошлого
  // месяца, лимит мог уйти на другом устройстве: цифру не выдумываем (null → «—/30» и строка «Лимит — 30 ответов в месяц»). Точная цифра придёт
  // с ответом сервера на реплику (зеркало перезапишется) — Firestore здесь не читаем.
  const repliesLeftThisMonth = !hasPremiumAccess
    ? quota?.status === 'allowed'
      ? quota.remaining
      : monthlyLimitExhausted
        ? 0
        : null
    : null;
  useEffect(() => {
    if (hasPremiumAccess || !accessResolved) return;
    console.log(`[DIALOGUE-V2] tab:quota status=${quota?.status ?? 'not_read'} → badge=${repliesLeftThisMonth === null ? '—' : repliesLeftThisMonth}/${quotaLimit}`);
  }, [accessResolved, hasPremiumAccess, quota, quotaLimit, repliesLeftThisMonth]);
  const quotaResetAt = quotaResetAtMs(quota);
  const quotaResetDate = formatAiDialogQuotaResetDate(quotaResetAt, lang);
  const accent = t.accent; // light-accent-ok: используется только как вуаль (accent+альфа) и подложка значка 15 %

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
        showGlassAlert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogsOpenThisMonth) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
          reason: 'monthly_limit',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit', source: 'dialogs_catalogue' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogs_catalogue' } } as never);
        return;
      }
      // Тап и статус плитки обязаны спрашивать ОДНО правило, иначе плитка
      // покажет «открыто», а тап уведёт на пейвол (или наоборот).
      const unlocked = isScenarioUnlockedForAccount(scenario, coinRank);
      if (!unlocked) {
        // D124: Plus ранг не заменяет — пейвол врал бы; называем нужный ранг.
        console.log(`[DIALOG-GATE] catalog:rank_required scenario=${scenario.id} rank=${String(coinRank)}`); // guard-ok: ранний выход обязан логироваться
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
          reason: 'rank_required',
        });
        showGlassAlert(dialogLockedLabel(scenario, lang));
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, aiDialogGateOpen, coinRank, dialogsOpenThisMonth, frenchGateCopy, lang, showGlassAlert, openScenarioDestination, reachedLevel, router],
  );

  const openChallengeScenario = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      if (!accessResolved) return;
      hapticTap();
      if (!aiDialogGateOpen) {
        showGlassAlert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogsOpenThisMonth) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          reason: 'monthly_limit',
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
      const unlocked = isScenarioUnlockedForAccount(scenario, coinRank);
      if (!unlocked) {
        console.log(`[DIALOG-GATE] catalog:rank_required scenario=${scenario.id} rank=${String(coinRank)}`); // guard-ok: ранний выход обязан логироваться
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          reason: 'rank_required',
        });
        showGlassAlert(dialogLockedLabel(scenario, lang));
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, aiDialogGateOpen, coinRank, dialogsOpenThisMonth, frenchGateCopy, lang, showGlassAlert, openScenarioDestination, router],
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
          const unlocked = isScenarioUnlockedForAccount(scenario, coinRank);
          const done = completedIds.has(scenario.id);
          const status: ScenarioStatus = !dialogsOpenThisMonth || !unlocked ? 'locked' : done ? 'done' : 'available';
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
    [coinRank, dialogsOpenThisMonth, completedIds, lang, openCourseScenario],
  );

  const challengeVMs = useMemo<ScenarioVM[]>(
    () =>
      getChallengeDialogScenarios().map((scenario) => {
        const requiredLevel = scenario.requiredAccountLevel ?? 1;
        // Вызовы теперь входят в Plus (владелец 2026-09-14) — уровень аккаунта
        // их больше не открывает. Тап считает ровно это же правило.
        const unlocked = isScenarioUnlockedForAccount(scenario, coinRank);
        const done = completedIds.has(scenario.id);
        const status: ScenarioStatus = !dialogsOpenThisMonth || !unlocked ? 'locked' : done ? 'done' : 'available';
        return {
          scenario,
          status,
          scene: CHALLENGE_SCENE_THEME,
          levelChip: triLang(lang, {
            ru: `ур. ${requiredLevel}`,
            uk: `рів. ${requiredLevel}`,
            en: `Lvl ${requiredLevel}`,
            es: `niv. ${requiredLevel}`,
            'pt-BR': `nív. ${requiredLevel}`,
            vi: `cấp ${requiredLevel}`,
            id: `Lvl ${requiredLevel}`,
            tr: `sv. ${requiredLevel}`,
            pl: `poz. ${requiredLevel}`,
          }),
          lockedText: dialogLockedLabel(scenario, lang),
          onPress: () => openChallengeScenario(scenario),
          onLongPress: () => openChallengeScenario(scenario, true),
        };
      }),
    [coinRank, completedIds, dialogsOpenThisMonth, lang, openChallengeScenario],
  );

  // зачем: владелец просил заходить в «Диалоги» с полностью свёрнутыми
  // разделами — раньше мир героя («Каждый день») раскрывался сам, и экран
  // открывался уже развёрнутым. Теперь развороты — только по тапу.
  const toggleWorld = useCallback((key: WorldKey) => {
    hapticTap();
    setOpenWorld((prev) => (prev === key ? null : key));
  }, []);

  const briefingLongPressHint = triLang(lang, {
    ru: 'Нажми и удерживай, чтобы открыть вводную к сценарию.',
    uk: 'Натисни і утримуй, щоб відкрити вступ до сценарію.',
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
          ru: 'Нажми, чтобы узнать, как открыть сценарий.',
          uk: 'Натисни, щоб дізнатися, як відкрити сценарій.',
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
          accent: t.accent, // light-accent-ok: плитка сценария поле accent не читает (только accentBg)
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
      {glassAlertNode}

      {!hasPremiumAccess && (
        <DialogQuotaBadge
          lang={lang}
          remaining={repliesLeftThisMonth}
          limit={quotaLimit}
          resetAtMs={quotaResetAt}
          variant="monthly"
          testID="dialogs-catalogue-monthly-quota"
        />
      )}

      {aiDialogGateOpen && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Открыть свободный разговор', uk: 'Відкрити вільну розмову', en: 'Open free conversation',
            es: 'Abrir conversación libre', 'pt-BR': 'Abrir conversa livre', vi: 'Mở cuộc trò chuyện tự do',
            id: 'Buka percakapan bebas', tr: 'Serbest konuşmayı aç', pl: 'Otwórz swobodną rozmowę',
          })}
          accessibilityHint={!hasPremiumAccess ? triLang(lang, {
            ru: 'Доступно в Plus. Откроется экран Plus.', uk: 'Доступно в Plus. Відкриється екран Plus.',
            en: 'Available with Plus. Opens the Plus screen.', es: 'Disponible con Plus. Abre la pantalla Plus.',
            'pt-BR': 'Disponível com Plus. Abre a tela Plus.', vi: 'Có trong Plus. Mở màn hình Plus.',
            id: 'Tersedia dengan Plus. Membuka layar Plus.', tr: 'Plus ile kullanılabilir. Plus ekranını açar.',
            pl: 'Dostępne w Plus. Otwiera ekran Plus.',
          }) : undefined}
          activeOpacity={0.88}
          onPress={() => {
            if (!accessResolved) return;
            hapticTap();
            if (!hasPremiumAccess) {
              void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit', source: 'dialogs_companion' });
              router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogs_companion' } } as never);
              return;
            }
            // зачем без отдельного события: ai_companion_opened никогда не было в
            // реестре аналитики и его никто не читает (админка/функции). Вход в
            // свободный разговор уже считает сам экран: ai_dialog_started c
            // scenarioId='companion' (ai_companion_session.tsx).
            router.push({ pathname: '/ai_companion_session' } as never);
          }}
          style={{
            marginTop: 14,
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
            colors={[t.accent + '1F', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={t.accentText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', flexShrink: 1 }}>
                {triLang(lang, {
                  ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Open conversation', es: 'Conversación libre',
                  'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Percakapan bebas', tr: 'Serbest konuşma', pl: 'Swobodna rozmowa',
                })}
              </Text>
              <View style={{ borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: t.accent }}>
                <Text style={{ color: t.textOnGold, fontSize: 13, fontWeight: '700' }}>PLUS</Text>
              </View>
            </View>
            <Text
              style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: Math.round(f.sub * 1.4) }}
              maxFontSizeMultiplier={1.15}
            >
              {triLang(lang, {
                ru: 'Практика без сценария', uk: 'Практика без сценарію', en: 'Practice without a set scenario',
                es: 'Practica sin un escenario fijo', 'pt-BR': 'Pratique sem um cenário fixo', vi: 'Luyện tập không theo kịch bản cố định',
                id: 'Berlatih tanpa skenario tetap', tr: 'Sabit bir senaryo olmadan pratik yap', pl: 'Ćwicz bez ustalonego scenariusza',
              })}
            </Text>
          </View>
          <Ionicons name={hasPremiumAccess ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={t.accentText} />
        </TouchableOpacity>
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
            // D124 (30.09): Plus не открывает сценарии (их открывает ранг) — только снимает лимит.
            ru: 'Plus снимает лимит ответов',
            uk: 'Plus знімає ліміт відповідей',
            en: 'Plus removes the reply limit',
            es: 'Plus quita el límite de respuestas',
            'pt-BR': 'O Plus remove o limite de respostas',
            vi: 'Plus bỏ giới hạn lượt trả lời',
            id: 'Plus menghapus batas balasan',
            tr: 'Plus yanıt sınırını kaldırır',
            pl: 'Plus znosi limit odpowiedzi',
          })}
          activeOpacity={0.88}
          onPress={() => {
            if (!accessResolved) return;
            hapticTap();
            // зачем: контекст выбирается по ФАКТУ (см. upsellContext), иначе
            // человек с 9 целыми репликами читал «Дневной лимит исчерпан».
            if (IS_DEV_RUNTIME) {
              console.log('[DIALOG-PAYWALL] upsell:tap', JSON.stringify({ upsellContext, quotaStatus: quota?.status ?? 'none', repliesLeftThisMonth }));
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
            <Ionicons name="lock-open-outline" size={25} color={t.accentText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {/* зачем новый текст (владелец 2026-09-17, макет экономики рун):
                  старый «Все диалоги входят в Plus» стал ЛОЖЬЮ. Роли валют
                  разошлись: РУНЫ дают доступ (какие диалоги существуют), а
                  Plus — ОБЪЁМ реплик. Обещать доступ за Plus
                  значит продавать одно и то же двумя валютами. */}
              {/* зачем (D111): при исчерпании человек должен сразу понять ПРИЧИНУ
                  и выход — «ответы месяца закончились, продолжить с Plus». */}
              {monthlyLimitExhausted ? triLang(lang, {
                ru: 'Ответы месяца закончились — продолжи с Plus',
                uk: 'Відповіді місяця закінчилися — продовж із Plus',
                en: "This month's replies are used up — continue with Plus",
                es: 'Se acabaron las respuestas del mes: sigue con Plus',
                'pt-BR': 'As respostas do mês acabaram: continue com o Plus',
                vi: 'Đã hết lượt trả lời tháng này — tiếp tục với Plus',
                id: 'Balasan bulan ini habis — lanjutkan dengan Plus',
                tr: 'Bu ayın yanıtları bitti — Plus ile devam et',
                pl: 'Odpowiedzi w tym miesiącu się skończyły — kontynuuj z Plus',
              }) : triLang(lang, {
                ru: 'Plus снимает лимит реплик',
                uk: 'Plus знімає ліміт реплік',
                en: 'Plus removes the monthly reply limit',
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
              {/* Серверная граница календарного месяца показывается как есть:
                  клиент не вычисляет и не придумывает дату сброса. */}
              {!hasPremiumAccess && repliesLeftThisMonth == null
                ? `${aiDialogMonthlyLimitText(lang, quotaLimit)}.`
                : repliesLeftThisMonth != null
                ? triLang(lang, {
                    ru: `В этом календарном месяце осталось ${repliesLeftThisMonth} из ${quotaLimit} реплик.${quotaResetDate ? ` Сброс — ${quotaResetDate}.` : ''}`,
                    uk: `У цьому календарному місяці залишилося ${repliesLeftThisMonth} з ${quotaLimit} реплік.${quotaResetDate ? ` Скидання — ${quotaResetDate}.` : ''}`,
                    en: `${repliesLeftThisMonth} of ${quotaLimit} replies remain this calendar month.${quotaResetDate ? ` Reset: ${quotaResetDate}.` : ''}`,
                    es: `Quedan ${repliesLeftThisMonth} de ${quotaLimit} respuestas este mes natural.${quotaResetDate ? ` Reinicio: ${quotaResetDate}.` : ''}`,
                    'pt-BR': `Restam ${repliesLeftThisMonth} de ${quotaLimit} respostas neste mês civil.${quotaResetDate ? ` Reinício: ${quotaResetDate}.` : ''}`,
                    vi: `Còn ${repliesLeftThisMonth}/${quotaLimit} lượt trả lời trong tháng dương lịch này.${quotaResetDate ? ` Đặt lại: ${quotaResetDate}.` : ''}`,
                    id: `Tersisa ${repliesLeftThisMonth} dari ${quotaLimit} balasan untuk bulan kalender ini.${quotaResetDate ? ` Reset: ${quotaResetDate}.` : ''}`,
                    tr: `Bu takvim ayında ${quotaLimit} yanıttan ${repliesLeftThisMonth} tanesi kaldı.${quotaResetDate ? ` Sıfırlanma: ${quotaResetDate}.` : ''}`,
                    pl: `W tym miesiącu kalendarzowym zostało ${repliesLeftThisMonth} z ${quotaLimit} odpowiedzi.${quotaResetDate ? ` Reset: ${quotaResetDate}.` : ''}`,
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
          <Ionicons name="chevron-forward" size={20} color={t.accentText} />
        </TouchableOpacity>
      )}
    </Animated.ScrollView>
  );
}
