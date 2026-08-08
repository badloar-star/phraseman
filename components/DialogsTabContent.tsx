import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
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
} from '../app/ai_dialog_scenarios';
import { onAppEvent } from '../app/events';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from '../app/ai_dialog_target_gate';
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
} from '../app/lessons_tab_state';
import { triLang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import DialogScenarioTile from './DialogScenarioTile';
import { useLang } from './LangContext';
import { useFeatureAccess, usePremium } from './PremiumContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

import { noAndroidOutline } from '../constants/androidGlow';
// Статус карточки сценария — кодирует и подачу, и доступность.
type ScenarioStatus = 'done' | 'available' | 'locked';

interface ScenarioVM {
  scenario: DialogScenario;
  status: ScenarioStatus;
  /** Чип уровня: CEFR для уроков, «ур. N» для ситуаций. */
  levelChip: string;
  /** Текст-замок (для locked) — почему закрыто. */
  lockedText: string;
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

  // Две вкладки внутри Диалогов: «Уроки» (сценарии по уровню курса A1→B2) и
  // «Ситуации» (сложные сцены по уровню аккаунта). По запросу пользователя они
  // разделены как вкладки, а не как две секции в одном списке.
  const [tab, setTab] = useState<'lessons' | 'situations'>('lessons');
  const [accountLevel, setAccountLevel] = useState(1);
  const [unlockedLessons, setUnlockedLessons] = useState<number[]>(
    () => getLessonsTabInitialState(studyTarget)?.persistedUnlocked ?? [],
  );
  // Завершённые сценарии (локальный прогресс) — для отметки «Пройдено», счётчиков
  // X/N в группах и выбора первого незавершённого сценария в блоке «Продолжить».
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());

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
    const raw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
    if (!activeRef.current || generation !== refreshGenerationRef.current) return;
    const totalXP = Math.max(0, parseInt(raw || '0', 10) || 0);
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

  // ── View-model для активной вкладки ───────────────────────────────────────
  // Каждой карточке считаем статус (done / available / locked) один раз — UI ниже
  // только рисует по статусу, без повторной проверки замков.

  const courseGroupVMs = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((group) => {
        const scenarios = getScenariosByCategory(group.category).map<ScenarioVM>((scenario) => {
          const unlocked = isScenarioLevelUnlocked(scenario.cefr, reachedLevel, dialogAccess);
          const done = completedIds.has(scenario.id);
          const status: ScenarioStatus = !dialogAccess || !unlocked ? 'locked' : done ? 'done' : 'available';
          return {
            scenario,
            status,
            levelChip: scenario.cefr,
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
        return { group, scenarios, doneCount };
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

  // Блок «Продолжить»: первый доступный незавершённый сценарий активной вкладки.
  // Если все доступные пройдены — берём первый доступный (повтор не вреден).
  const heroVM = useMemo<ScenarioVM | null>(() => {
    const pool =
      tab === 'lessons'
        ? courseGroupVMs.flatMap((g) => g.scenarios)
        : challengeVMs;
    const available = pool.filter((vm) => vm.status !== 'locked');
    if (available.length === 0) return null;
    return available.find((vm) => vm.status === 'available') ?? available[0];
  }, [tab, courseGroupVMs, challengeVMs]);

  // ── Рендер карточки сценария по статусу ───────────────────────────────────
  const renderScenarioCard = (vm: ScenarioVM, index: number) => {
    const { scenario, status, levelChip, lockedText } = vm;
    const locked = status === 'locked';

    return (
      <DialogScenarioTile
        key={scenario.id}
        index={index}
        icon={scenario.icon}
        title={dialogScenarioTitle(scenario, lang)}
        levelChip={levelChip}
        status={status}
        lockedText={lockedText}
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
        fontSizes={{ body: f.body, label: f.label }}
        accessibilityLabel={
          locked
            ? `${dialogScenarioTitle(scenario, lang)} — ${lockedText}`
            : dialogScenarioTitle(scenario, lang)
        }
        accessibilityHint={triLang(lang, {
          ru: 'Нажмите и удерживайте, чтобы открыть вводную к сценарию.',
          uk: 'Натисніть і утримуйте, щоб відкрити вступ до сценарію.',
          es: 'Mantén pulsado para abrir la introducción del escenario.',
          'pt-BR': 'Mantenha pressionado para abrir a introdução do cenário.',
          vi: 'Nhấn giữ để mở phần giới thiệu kịch bản.',
          id: 'Tekan dan tahan untuk membuka pengantar skenario.',
          tr: 'Senaryo girişini açmak için basılı tutun.',
          pl: 'Przytrzymaj, aby otworzyć wprowadzenie do scenariusza.',
        })}
      />
    );
  };

  const renderHero = (vm: ScenarioVM) => {
    const { scenario, status } = vm;
    const kicker =
      status === 'done'
        ? triLang(lang, {
          ru: 'ПРОЙДЕНО · ПРОЙТИ ЕЩЁ РАЗ',
          uk: 'ПРОЙДЕНО · ЩЕ РАЗ',
          es: 'HECHO · OTRA VEZ',
          'pt-BR': 'CONCLUÍDO · FAZER DE NOVO',
          vi: 'ĐÃ XONG · LÀM LẠI',
          id: 'SELESAI · ULANGI',
          tr: 'TAMAMLANDI · TEKRAR YAP',
          pl: 'UKOŃCZONO · ZRÓB JESZCZE RAZ',
        })
        : triLang(lang, {
          ru: 'НА ОЧЕРЕДИ',
          uk: 'НА ЧЕРЗІ',
          es: 'SIGUIENTE',
          'pt-BR': 'PRÓXIMO',
          vi: 'TIẾP THEO',
          id: 'BERIKUTNYA',
          tr: 'SIRADA',
          pl: 'NASTĘPNE',
        });
    return (
      <View style={{ paddingHorizontal: 14, marginTop: 16 }}>
        <Text
          style={{
            color: t.textMuted,
            fontSize: f.label,
            fontWeight: '900',
            marginBottom: 7,
            marginLeft: 4,
          }}
        >
          {triLang(lang, {
            ru: 'Продолжить',
            uk: 'Продовжити',
            es: 'Continuar',
            'pt-BR': 'Continuar',
            vi: 'Tiếp tục',
            id: 'Lanjutkan',
            tr: 'Devam et',
            pl: 'Kontynuuj',
          })}
        </Text>
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
          activeOpacity={0.86}
          onPress={vm.onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            backgroundColor: t.bgCard,
            borderRadius: 18,
            borderWidth: 0,
            borderColor: accent + '5A',
            paddingHorizontal: 13,
            paddingVertical: 13,
            shadowColor: accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            ...noAndroidOutline,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={scenario.icon as never} size={24} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: accent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.3 }}>
              {kicker}
            </Text>
            <Text
              style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', marginTop: 2 }}
              numberOfLines={1}
            >
              {dialogScenarioTitle(scenario, lang)}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {dialogScenarioGoal(scenario, lang)}
            </Text>
          </View>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={18} color={t.correctText} style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Заголовок группы со счётчиком пройдено/всего.
  const renderGroupHeader = (label: string, doneCount: number, total: number) => (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent }} />
      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }} numberOfLines={2}>
        {label}
      </Text>
      <Text style={{ color: doneCount > 0 ? accent : t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
        {doneCount}/{total}
      </Text>
    </View>
  );

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
            marginTop: 12,
            marginHorizontal: 14,
            borderRadius: 14,
            backgroundColor: t.bgCard,
            borderWidth: 0,
            borderColor: t.border,
            padding: 13,
            flexDirection: 'row',
            gap: 11,
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: t.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={t.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }} numberOfLines={2}>
              {frenchGateCopy.title}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), marginTop: 3 }}
              numberOfLines={3}
            >
              {frenchGateCopy.body}
            </Text>
          </View>
        </View>
      )}

      {/* Сегментированный переключатель двух вкладок диалогов. */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
          marginHorizontal: 14,
          backgroundColor: t.bgSurface,
          borderRadius: 14,
          borderWidth: 0,
          borderColor: t.border,
          padding: 4,
          gap: 4,
        }}
      >
        {([
          { key: 'lessons' as const, label: triLang(lang, { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' }), icon: 'school-outline' as const },
          { key: 'situations' as const, label: triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' }), icon: 'flame-outline' as const },
        ]).map((seg) => {
          const activeTab = tab === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab }}
              accessibilityLabel={seg.label}
              activeOpacity={0.86}
              onPress={() => {
                if (tab === seg.key) return;
                hapticTap();
                setTab(seg.key);
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: activeTab ? accent : 'transparent',
              }}
            >
              <Ionicons name={seg.icon} size={16} color={activeTab ? t.correctText : t.textSecond} />
              <Text
                style={{ color: activeTab ? t.correctText : t.textSecond, fontSize: f.sub, fontWeight: '900' }}
                numberOfLines={1}
              >
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Блок «Продолжить» — одна явная следующая цель активной вкладки. */}
      {heroVM && renderHero(heroVM)}

      {tab === 'lessons' && (
      <View>
        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 2 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
            {triLang(lang, {
              ru: 'Диалоги по урокам',
              uk: 'Діалоги за уроками',
              es: 'Diálogos por lecciones',
              'pt-BR': 'Diálogos por lições',
              vi: 'Đối thoại theo bài học',
              id: 'Dialog per pelajaran',
              tr: 'Derslere göre diyaloglar',
              pl: 'Dialogi według lekcji',
            })}
          </Text>
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.caption,
              lineHeight: Math.round(f.caption * 1.35),
              marginTop: 3,
            }}
          >
            {triLang(lang, {
              ru: `Открыты по прогрессу курса: сейчас ${reachedLevel}`,
              uk: `Відкриті за прогресом курсу: зараз ${reachedLevel}`,
              es: `Se abren con el curso: ahora ${reachedLevel}`,
              'pt-BR': `Abertos pelo progresso do curso: agora ${reachedLevel}`,
              vi: `Mở theo tiến độ khóa học: hiện tại ${reachedLevel}`,
              id: `Terbuka sesuai progres kursus: sekarang ${reachedLevel}`,
              tr: `Kurs ilerlemesine göre açılır: şu an ${reachedLevel}`,
              pl: `Otwarte według postępu kursu: teraz ${reachedLevel}`,
            })}
          </Text>
        </View>

        {courseGroupVMs.map(({ group, scenarios, doneCount }) => (
          <View key={group.category}>
            {renderGroupHeader(dialogScenarioGroupLabel(group, lang), doneCount, scenarios.length)}
            {scenarios.map((vm, index) => renderScenarioCard(vm, index))}
          </View>
        ))}
      </View>
      )}

      {tab === 'situations' && (
      <View>
        <View style={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: accent }} />
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', flex: 1 }}>
              {triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' })}
            </Text>
            <Text style={{ color: accent, fontSize: f.caption, fontWeight: '900' }}>
              {triLang(lang, { ru: `ур. ${accountLevel}`, uk: `рів. ${accountLevel}`, es: `niv. ${accountLevel}`, 'pt-BR': `nív. ${accountLevel}`, vi: `cấp ${accountLevel}`, id: `lvl. ${accountLevel}`, tr: `sv. ${accountLevel}`, pl: `poz. ${accountLevel}` })}
            </Text>
          </View>
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.caption,
              lineHeight: Math.round(f.caption * 1.35),
              marginTop: 5,
            }}
          >
            {triLang(lang, {
              ru: 'Сложные и смешные сцены. Чем выше уровень аккаунта, тем жёстче разговор.',
              uk: 'Складні й кумедні сцени. Що вищий рівень акаунта, то гостріша розмова.',
              es: 'Escenas raras y difíciles. Cuanto más nivel tengas, más dura será la conversación.',
              'pt-BR': 'Cenas difíceis e engraçadas. Quanto maior o nível da conta, mais intensa fica a conversa.',
              vi: 'Các cảnh khó và vui. Cấp tài khoản càng cao, cuộc trò chuyện càng căng hơn.',
              id: 'Adegan sulit dan lucu. Makin tinggi level akun, makin tajam percakapannya.',
              tr: 'Zor ve komik sahneler. Hesap seviyen yükseldikçe konuşma daha sertleşir.',
              pl: 'Trudne i zabawne sceny. Im wyższy poziom konta, tym ostrzejsza rozmowa.',
            })}
          </Text>
        </View>

        {challengeVMs.map((vm, index) => renderScenarioCard(vm, index))}
      </View>
      )}

      {tab === 'lessons' && hasLockedCourseLevels && (
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
          activeOpacity={0.86}
          onPress={() => {
            if (!accessResolved) return;
            hapticTap();
            void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level' });
            router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level' } } as never);
          }}
          style={{
            marginTop: 18,
            marginHorizontal: 14,
            borderRadius: 16,
            backgroundColor: t.bgCard,
            borderWidth: 0,
            borderColor: t.border,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: t.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-open-outline" size={19} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }} numberOfLines={2}>
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
              style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2, lineHeight: Math.round(f.caption * 1.35) }}
              numberOfLines={2}
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
          <Ionicons name="chevron-forward" size={18} color={t.textSecond} />
        </TouchableOpacity>
      )}
    </Animated.ScrollView>
  );
}
