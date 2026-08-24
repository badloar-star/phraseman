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
import { hasSeenAiDialogIntro } from '../app/ai_dialog_intro_seen';
import { isScenarioLevelUnlocked, reachedCourseLevel } from '../app/ai_dialog_level_lock';
import { getCompletedDialogIds } from '../app/dialogs_progress';
import {
  DIALOG_SCENARIO_GROUPS,
  dialogScenarioGoal,
  dialogScenarioGroupLabel,
  dialogScenarioTitle,
  getChallengeDialogScenarios,
  getScenariosByCategory,
  type DialogScenario,
  type DialogScenarioCategory,
} from '../app/ai_dialog_scenarios';
import { onAppEvent } from '../app/events';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from '../app/ai_dialog_target_gate';
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
} from '../app/lessons_tab_state';
import {
  CHALLENGE_SCENE_THEME,
  sceneThemeForCategory,
  type DialogSceneTheme,
} from '../constants/dialogSceneThemes';
import { triLang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import DialogScenarioTile from './DialogScenarioTile';
import EnergyCostBadge from './EnergyCostBadge';
import { useLang } from './LangContext';
import { useFeatureAccess, usePremium } from './PremiumContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

import { noAndroidOutline } from '../constants/androidGlow';
// зачем (v2, 2026-08-23): владелец задал эталон — раздел «Статистика»: всё
// крупное, никаких мелких плиток/подписей. Полки карточек 128px заменены
// стопкой полноширинных карточек-миров с разворотом (паттерн стрик-карты).
// Статус карточки сценария — кодирует и подачу, и доступность.
type ScenarioStatus = 'done' | 'available' | 'locked';

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

export default function DialogsTabContent({
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
  const { accessResolved } = usePremium();
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
  const frenchGateCopy = frenchAiDialogGateCopy(lang);

  const [accountLevel, setAccountLevel] = useState(1);
  const [unlockedLessons, setUnlockedLessons] = useState<number[]>(
    () => getLessonsTabInitialState(studyTarget)?.persistedUnlocked ?? [],
  );
  // Завершённые сценарии (локальный прогресс) — для отметки «Пройдено», счётчиков
  // X/N в мирах и выбора первого незавершённого сценария в блоке «Продолжить».
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [heroStartsPaid, setHeroStartsPaid] = useState(false);

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
    void getCompletedDialogIds().then((ids) => {
      if (activeRef.current && generation === completedGenerationRef.current) setCompletedIds(ids);
    }).catch(() => {});
  }, []);
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

  useEffect(() => {
    if (!trackImpression || impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    void trackAiDialogEvent('ai_dialog_card_shown');
  }, [trackImpression]);

  const reachedLevel = useMemo(() => reachedCourseLevel(unlockedLessons), [unlockedLessons]);
  const hasLockedCourseLevels = !dialogAccess;
  const accent = t.accent;

  const openScenarioDestination = useCallback(
    async (scenario: DialogScenario, forceBriefing = false) => {
      const seenIntro = forceBriefing
        ? false
        : await hasSeenAiDialogIntro(studyTarget, scenario.id);
      router.push({
        pathname: seenIntro ? '/ai_dialog_session' : '/ai_dialog_briefing',
        params: { scenarioId: scenario.id },
      } as never);
    },
    [router, studyTarget],
  );

  const openCourseScenario = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      if (!accessResolved) return;
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogAccess) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
          reason: 'plus_required',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
        return;
      }
      const unlocked = isScenarioLevelUnlocked(scenario.cefr, reachedLevel, dialogAccess);
      if (!unlocked) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          cefr: scenario.cefr,
          reachedLevel,
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level' } } as never);
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, aiDialogGateOpen, dialogAccess, frenchGateCopy, openScenarioDestination, reachedLevel, router],
  );

  const openChallengeScenario = useCallback(
    (scenario: DialogScenario, forceBriefing = false) => {
      if (!accessResolved) return;
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      if (!dialogAccess) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          reason: 'plus_required',
        });
        void trackAiDialogEvent('paywall_shown', { context: 'dialog_limit' });
        router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
        return;
      }
      const requiredLevel = scenario.requiredAccountLevel ?? 1;
      if (accountLevel < requiredLevel) {
        void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
          scenarioId: scenario.id,
          requiredLevel,
          accountLevel,
        });
        Alert.alert(
          triLang(lang, {
            ru: 'Пока закрыто',
            uk: 'Поки закрито',
            es: 'Bloqueado por ahora',
            'pt-BR': 'Bloqueado por enquanto',
            vi: 'Tạm thời bị khóa',
            id: 'Masih terkunci',
            tr: 'Şimdilik kilitli',
            pl: 'Na razie zablokowane',
          }),
          triLang(lang, {
            ru: `Открывается на уровне ${requiredLevel}. Проходи уроки и вызовы — откроется автоматически.`,
            uk: `Відкривається на рівні ${requiredLevel}. Проходь уроки та виклики — відкриється автоматично.`,
            es: `Se desbloquea en el nivel ${requiredLevel}. Completa lecciones y desafíos para llegar.`,
            'pt-BR': `Desbloqueia no nível ${requiredLevel}. Complete lições e desafios — vai abrir automaticamente.`,
            vi: `Mở ở cấp ${requiredLevel}. Hãy hoàn thành bài học và thử thách — nó sẽ tự mở.`,
            id: `Terbuka di level ${requiredLevel}. Selesaikan pelajaran dan tantangan — nanti terbuka otomatis.`,
            tr: `${requiredLevel}. seviyede açılır. Dersleri ve meydan okumaları tamamla — otomatik açılır.`,
            pl: `Otwiera się na poziomie ${requiredLevel}. Przechodź lekcje i wyzwania — odblokuje się automatycznie.`,
          }),
          [{ text: triLang(lang, { ru: 'Ок', uk: 'Ок', es: 'Ok', 'pt-BR': 'Ok', vi: 'Ok', id: 'Ok', tr: 'Tamam', pl: 'Ok' }) }],
        );
        return;
      }
      void openScenarioDestination(scenario, forceBriefing);
    },
    [accessResolved, accountLevel, aiDialogGateOpen, dialogAccess, frenchGateCopy, lang, openScenarioDestination, router],
  );

  // ── View-model каталога ────────────────────────────────────────────────────
  // Каждой карточке считаем статус (done / available / locked) один раз — UI ниже
  // только рисует по статусу, без повторной проверки замков.

  const courseGroupVMs = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((group) => {
        const scene = sceneThemeForCategory(group.category);
        const scenarios = getScenariosByCategory(group.category).map<ScenarioVM>((scenario) => {
          const unlocked = isScenarioLevelUnlocked(scenario.cefr, reachedLevel, dialogAccess);
          const done = completedIds.has(scenario.id);
          const status: ScenarioStatus = !dialogAccess || !unlocked ? 'locked' : done ? 'done' : 'available';
          return {
            scenario,
            status,
            levelChip: scenario.cefr,
            scene,
            lockedText: !dialogAccess
              ? triLang(lang, {
                  ru: 'Входит в Plus', uk: 'Входить у Plus', es: 'Incluido en Plus', 'pt-BR': 'Incluído no Plus',
                  vi: 'Có trong Plus', id: 'Termasuk Plus', tr: 'Plus’a dahil', pl: 'Dostępne w Plus',
                })
              : triLang(lang, {
                  ru: `Откроется на уровне ${scenario.cefr}`,
                  uk: `Відкриється на рівні ${scenario.cefr}`,
                  es: `Se abre en el nivel ${scenario.cefr}`,
                  'pt-BR': `Abre no nível ${scenario.cefr}`,
                  vi: `Mở ở cấp ${scenario.cefr}`,
                  id: `Terbuka di level ${scenario.cefr}`,
                  tr: `${scenario.cefr} seviyesinde açılır`,
                  pl: `Otwiera się na poziomie ${scenario.cefr}`,
                }),
            onPress: () => openCourseScenario(scenario),
            onLongPress: () => openCourseScenario(scenario, true),
          };
        });
        const doneCount = scenarios.filter((s) => s.status === 'done').length;
        return { group, scene, scenarios, doneCount };
      }),
    [reachedLevel, dialogAccess, completedIds, lang, openCourseScenario],
  );

  const challengeVMs = useMemo<ScenarioVM[]>(
    () =>
      getChallengeDialogScenarios().map((scenario) => {
        const requiredLevel = scenario.requiredAccountLevel ?? 1;
        const unlocked = accountLevel >= requiredLevel;
        const done = completedIds.has(scenario.id);
        const status: ScenarioStatus = !dialogAccess || !unlocked ? 'locked' : done ? 'done' : 'available';
        return {
          scenario,
          status,
          scene: CHALLENGE_SCENE_THEME,
          levelChip: triLang(lang, {
            ru: `ур. ${requiredLevel}`,
            uk: `рів. ${requiredLevel}`,
            es: `niv. ${requiredLevel}`,
            'pt-BR': `nív. ${requiredLevel}`,
            vi: `cấp ${requiredLevel}`,
            id: `lvl. ${requiredLevel}`,
            tr: `sv. ${requiredLevel}`,
            pl: `poz. ${requiredLevel}`,
          }),
          lockedText: !dialogAccess
            ? triLang(lang, {
                ru: 'Входит в Plus', uk: 'Входить у Plus', es: 'Incluido en Plus', 'pt-BR': 'Incluído no Plus',
                vi: 'Có trong Plus', id: 'Termasuk Plus', tr: 'Plus’a dahil', pl: 'Dostępne w Plus',
              })
            : triLang(lang, {
                ru: `Откроется на уровне аккаунта ${requiredLevel}`,
                uk: `Відкриється на рівні акаунта ${requiredLevel}`,
                es: `Se abre en el nivel de cuenta ${requiredLevel}`,
                'pt-BR': `Abre no nível de conta ${requiredLevel}`,
                vi: `Mở ở cấp tài khoản ${requiredLevel}`,
                id: `Terbuka di level akun ${requiredLevel}`,
                tr: `Hesap seviyesi ${requiredLevel} olunca açılır`,
                pl: `Otwiera się na poziomie konta ${requiredLevel}`,
              }),
          onPress: () => openChallengeScenario(scenario),
          onLongPress: () => openChallengeScenario(scenario, true),
        };
      }),
    [accountLevel, completedIds, dialogAccess, lang, openChallengeScenario],
  );

  // Блок «Продолжить»: первый доступный незавершённый сценарий каталога
  // (сначала уроки, затем ситуации). Если все доступные пройдены — первый
  // доступный (повтор не вреден).
  const heroVM = useMemo<ScenarioVM | null>(() => {
    const pool = [...courseGroupVMs.flatMap((g) => g.scenarios), ...challengeVMs];
    const available = pool.filter((vm) => vm.status !== 'locked');
    if (available.length === 0) return null;
    return available.find((vm) => vm.status === 'available') ?? available[0];
  }, [courseGroupVMs, challengeVMs]);

  useEffect(() => {
    let cancelled = false;
    if (!heroVM || heroVM.status === 'locked') {
      setHeroStartsPaid(false);
      return () => { cancelled = true; };
    }
    void hasSeenAiDialogIntro(studyTarget, heroVM.scenario.id)
      .then((seen) => { if (!cancelled) setHeroStartsPaid(seen); })
      .catch(() => { if (!cancelled) setHeroStartsPaid(false); });
    return () => { cancelled = true; };
  }, [heroVM, studyTarget]);

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
    const title = dialogScenarioTitle(scenario, lang);
    const statusLabel = locked
      ? lockedText
      : status === 'done'
        ? triLang(lang, {
            ru: 'Пройдено', uk: 'Пройдено', es: 'Hecho', 'pt-BR': 'Concluído',
            vi: 'Đã xong', id: 'Selesai', tr: 'Tamamlandı', pl: 'Ukończono',
          })
        : triLang(lang, {
            ru: 'Новое', uk: 'Нове', es: 'Nuevo', 'pt-BR': 'Novo',
            vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
          });
    const accessibilityHint = locked
      ? triLang(lang, {
          ru: 'Нажмите, чтобы узнать, как открыть сценарий.',
          uk: 'Натисніть, щоб дізнатися, як відкрити сценарій.',
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
        showEnergyCost={status === 'done'}
      />
    );
  };

  // Hero «Продолжить»: крупная кино-карточка сцены — медальон, заголовок,
  // большая кнопка запуска (планка эталона: всё крупное).
  const renderHero = (vm: ScenarioVM) => {
    const { scenario, status, scene } = vm;
    const kicker =
      status === 'done'
        ? triLang(lang, {
          ru: 'Пройдено · ещё раз',
          uk: 'Пройдено · ще раз',
          es: 'Hecho · otra vez',
          'pt-BR': 'Concluído · de novo',
          vi: 'Đã xong · làm lại',
          id: 'Selesai · ulangi',
          tr: 'Tamamlandı · tekrar',
          pl: 'Ukończono · jeszcze raz',
        })
        : triLang(lang, {
          ru: 'На очереди',
          uk: 'На черзі',
          es: 'Siguiente',
          'pt-BR': 'Próximo',
          vi: 'Tiếp theo',
          id: 'Berikutnya',
          tr: 'Sırada',
          pl: 'Następne',
        });
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: `Продолжить: ${dialogScenarioTitle(scenario, lang)}`,
            uk: `Продовжити: ${dialogScenarioTitle(scenario, lang)}`,
            es: `Continuar: ${dialogScenarioTitle(scenario, lang)}`,
            'pt-BR': `Continuar: ${dialogScenarioTitle(scenario, lang)}`,
            vi: `Tiếp tục: ${dialogScenarioTitle(scenario, lang)}`,
            id: `Lanjutkan: ${dialogScenarioTitle(scenario, lang)}`,
            tr: `Devam et: ${dialogScenarioTitle(scenario, lang)}`,
            pl: `Kontynuuj: ${dialogScenarioTitle(scenario, lang)}`,
          })}
          accessibilityHint={briefingLongPressHint}
          activeOpacity={0.88}
          onPress={vm.onPress}
          onLongPress={vm.onLongPress}
          delayLongPress={550}
          style={{
            borderRadius: 22,
            backgroundColor: t.bgCard,
            overflow: 'hidden',
            shadowColor: scene.hueDeep,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            ...noAndroidOutline,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[scene.hue + '3D', scene.hueDeep + '1C', 'transparent']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* зачем (владелец, приёмка на устройстве): плашка «На очереди» с
              полноширинной кнопкой «Начать» ВНИЗУ; тексты переносятся целиком,
              никаких обрезаний в «…». Глиф-постер увели в верхний угол, чтобы
              не спорил с кнопкой. */}
          <View pointerEvents="none" style={{ position: 'absolute', right: -16, top: -14, opacity: 0.12 }}>
            <Ionicons name={scenario.icon as never} size={104} color={scene.hue} />
          </View>
          <View style={{ padding: 16 }}>
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
                <Ionicons name={scenario.icon as never} size={27} color={scene.hue} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ color: scene.hue, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}
                  maxFontSizeMultiplier={1.2}
                >
                  {kicker}
                </Text>
                <Text
                  style={{ color: t.textPrimary, fontSize: f.h2 + 2, fontWeight: '900', marginTop: 3 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {dialogScenarioTitle(scenario, lang)}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: t.textSecond,
                fontSize: f.body,
                fontWeight: '600',
                lineHeight: Math.round(f.body * 1.4),
                marginTop: 10,
              }}
              maxFontSizeMultiplier={1.15}
            >
              {dialogScenarioGoal(scenario, lang)}
            </Text>
            {/* Полноширинная CTA. Нажатие обрабатывает вся плашка (внешний
                TouchableOpacity) — кнопка визуальная, без второго обработчика,
                чтобы не плодить двойные тапы. */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  marginTop: 14,
                  minHeight: 52,
                  borderRadius: 18,
                  backgroundColor: t.accent,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  shadowColor: t.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  ...noAndroidOutline,
                }}
              >
                <Ionicons name="play" size={20} color={t.correctText} />
                <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {triLang(lang, {
                    ru: 'Начать',
                    uk: 'Почати',
                    es: 'Empezar',
                    'pt-BR': 'Começar',
                    vi: 'Bắt đầu',
                    id: 'Mulai',
                    tr: 'Başla',
                    pl: 'Zacznij',
                  })}
                </Text>
              </View>
              {/* зачем: цена входа видна ДО нажатия. Здесь бейдж особенно важен:
                  повторный сценарий идёт мимо брифинга (openScenarioDestination),
                  и без него человек нигде не увидел бы, что диалог стоит энергии. */}
              {heroStartsPaid ? <EnergyCostBadge testID="dialogs-hero-energy-cost" style={{ right: -4 }} /> : null}
            </View>
          </View>
        </TouchableOpacity>
      </View>
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
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
    >
      {headerSlot}

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

      {/* Одна явная следующая цель каталога. */}
      {heroVM && renderHero(heroVM)}

      {/* Миры курса: три группы крупными карточками с разворотом. */}
      {courseGroupVMs.map(({ group, scene, scenarios, doneCount }) =>
        renderWorldCard(group.category, dialogScenarioGroupLabel(group, lang), scene, scenarios, doneCount),
      )}

      {/* Мир «Ситуации»: жёсткие сцены по уровню аккаунта. */}
      {challengeVMs.length > 0 &&
        renderWorldCard(
          'challenge',
          triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' }),
          CHALLENGE_SCENE_THEME,
          challengeVMs,
          challengeVMs.filter((vm) => vm.status === 'done').length,
        )}

      {hasLockedCourseLevels && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Открыть все уровни диалогов с Plus',
            uk: 'Відкрити всі рівні діалогів з Plus',
            es: 'Abrir todos los niveles de diálogos con Plus',
            'pt-BR': 'Abrir todos os níveis de diálogos com Plus',
            vi: 'Mở mọi cấp độ đối thoại với Plus',
            id: 'Buka semua level dialog dengan Plus',
            tr: 'Tüm diyalog seviyelerini Plus ile aç',
            pl: 'Otwórz wszystkie poziomy dialogów z Plus',
          })}
          activeOpacity={0.88}
          onPress={() => {
            if (!accessResolved) return;
            hapticTap();
            void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level' });
            router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level' } } as never);
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
              {triLang(lang, {
                ru: 'Все диалоги входят в Plus',
                uk: 'Усі діалоги входять у Plus',
                es: 'Todos los diálogos están en Plus',
                'pt-BR': 'Todos os diálogos estão no Plus',
                vi: 'Tất cả đối thoại đều có trong Plus',
                id: 'Semua dialog termasuk Plus',
                tr: 'Tüm diyaloglar Plus’a dahil',
                pl: 'Wszystkie dialogi są w Plus',
              })}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: Math.round(f.sub * 1.4) }}
              maxFontSizeMultiplier={1.15}
            >
              {triLang(lang, {
                ru: 'Открой сценарии по урокам и жизненные ситуации для разговорной практики.',
                uk: 'Відкрий сценарії за уроками й життєві ситуації для розмовної практики.',
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
