import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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
import { isScenarioLevelUnlocked, reachedCourseLevel } from '../app/ai_dialog_level_lock';
import { getFreeDialogsLeft } from '../app/dialogs_limit_session';
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
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import PlusBadge from './PlusBadge';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

const CARD_RADIUS = 16;

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
}

interface DialogsTabContentProps {
  headerSlot?: React.ReactNode;
  bottomPadding?: number;
  topPadding?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  trackImpression?: boolean;
}

export default function DialogsTabContent({
  headerSlot,
  bottomPadding = 34,
  topPadding = 0,
  onScroll,
  trackImpression = true,
}: DialogsTabContentProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const impressionFiredRef = useRef(false);
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
    void getCompletedDialogIds().then(setCompletedIds).catch(() => {});
  }, []);
  useEffect(() => {
    refreshCompleted();
    const sub = onAppEvent('dialogs_progress_changed', refreshCompleted);
    return () => sub.remove();
  }, [refreshCompleted]);

  const refreshAccountLevel = useCallback(async () => {
    const raw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
    const totalXP = Math.max(0, parseInt(raw || '0', 10) || 0);
    setAccountLevel(getLevelFromXP(totalXP));
  }, []);

  useEffect(() => {
    void refreshAccountLevel();
    const xpChanged = onAppEvent('xp_changed', () => {
      void refreshAccountLevel();
    });
    const xpUpdated = onAppEvent('xp_updated', () => {
      void refreshAccountLevel();
    });
    return () => {
      xpChanged.remove();
      xpUpdated.remove();
    };
  }, [refreshAccountLevel]);

  useEffect(() => {
    if (!trackImpression || impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    void trackAiDialogEvent('ai_dialog_card_shown');
  }, [trackImpression]);

  const reachedLevel = useMemo(() => reachedCourseLevel(unlockedLessons), [unlockedLessons]);
  const hasLockedCourseLevels = !hasPremiumAccess && reachedLevel !== 'B2';
  const accent = t.accent;

  // Остался ли пожизненный бесплатный пробный диалог (общий на все режимы).
  const [freeDialogsLeft, setFreeDialogsLeft] = useState(2);
  const refreshFreeDialogLeft = useCallback(() => {
    void getFreeDialogsLeft().then(setFreeDialogsLeft).catch(() => {});
  }, []);
  useEffect(() => {
    refreshFreeDialogLeft();
    // xp_changed стреляет после каждого диалога — используем как сигнал, что
    // пробный диалог мог быть только что потрачен, и обновляем подсказку.
    const sub = onAppEvent('xp_changed', refreshFreeDialogLeft);
    return () => sub.remove();
  }, [refreshFreeDialogLeft]);

  const openCourseScenario = useCallback(
    (scenario: DialogScenario) => {
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
        return;
      }
      const unlocked = isScenarioLevelUnlocked(scenario.cefr, reachedLevel, hasPremiumAccess);
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
      router.push({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
    },
    [aiDialogGateOpen, frenchGateCopy, reachedLevel, hasPremiumAccess, router],
  );

  const openChallengeScenario = useCallback(
    (scenario: DialogScenario) => {
      hapticTap();
      if (!aiDialogGateOpen) {
        Alert.alert(frenchGateCopy.title, frenchGateCopy.body, [{ text: frenchGateCopy.action }]);
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
      router.push({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
    },
    [accountLevel, aiDialogGateOpen, frenchGateCopy, lang, router],
  );

  // ── View-model для активной вкладки ───────────────────────────────────────
  // Каждой карточке считаем статус (done / available / locked) один раз — UI ниже
  // только рисует по статусу, без повторной проверки замков.

  const courseGroupVMs = useMemo(
    () =>
      DIALOG_SCENARIO_GROUPS.map((group) => {
        const scenarios = getScenariosByCategory(group.category).map<ScenarioVM>((scenario) => {
          const unlocked = isScenarioLevelUnlocked(scenario.cefr, reachedLevel, hasPremiumAccess);
          const done = completedIds.has(scenario.id);
          const status: ScenarioStatus = !unlocked ? 'locked' : done ? 'done' : 'available';
          return {
            scenario,
            status,
            levelChip: scenario.cefr,
            lockedText: triLang(lang, {
              ru: `Откроется на уровне ${scenario.cefr} — или сразу с Plus`,
              uk: `Відкриється на рівні ${scenario.cefr} — або одразу з Plus`,
              es: `Se abre en el nivel ${scenario.cefr} — o ya con Plus`,
              'pt-BR': `Abre no nível ${scenario.cefr} — ou agora com Plus`,
              vi: `Mở ở cấp ${scenario.cefr} — hoặc mở ngay với Plus`,
              id: `Terbuka di level ${scenario.cefr} — atau langsung dengan Plus`,
              tr: `${scenario.cefr} seviyesinde açılır — ya da Plus ile hemen`,
              pl: `Otwiera się na poziomie ${scenario.cefr} — albo od razu z Plus`,
            }),
            onPress: () => openCourseScenario(scenario),
          };
        });
        const doneCount = scenarios.filter((s) => s.status === 'done').length;
        return { group, scenarios, doneCount };
      }),
    [reachedLevel, hasPremiumAccess, completedIds, lang, openCourseScenario],
  );

  const challengeVMs = useMemo<ScenarioVM[]>(
    () =>
      getChallengeDialogScenarios().map((scenario) => {
        const requiredLevel = scenario.requiredAccountLevel ?? 1;
        const unlocked = accountLevel >= requiredLevel;
        const done = completedIds.has(scenario.id);
        const status: ScenarioStatus = !unlocked ? 'locked' : done ? 'done' : 'available';
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
          lockedText: triLang(lang, {
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
        };
      }),
    [accountLevel, completedIds, lang, openChallengeScenario],
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
    const done = status === 'done';
    const plusLocked = locked && tab === 'lessons' && !hasPremiumAccess;
    return (
      <TouchableOpacity
        key={scenario.id}
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
        accessibilityLabel={
          locked
            ? triLang(lang, {
                ru: `${dialogScenarioTitle(scenario, lang)} — закрыто`,
                uk: `${dialogScenarioTitle(scenario, lang)} — закрито`,
                es: `${dialogScenarioTitle(scenario, lang)} — bloqueado`,
                'pt-BR': `${dialogScenarioTitle(scenario, lang)} — bloqueado`,
                vi: `${dialogScenarioTitle(scenario, lang)} — bị khóa`,
                id: `${dialogScenarioTitle(scenario, lang)} — terkunci`,
                tr: `${dialogScenarioTitle(scenario, lang)} — kilitli`,
                pl: `${dialogScenarioTitle(scenario, lang)} — zablokowane`,
              })
            : triLang(lang, {
                ru: `Открыть сценарий ${dialogScenarioTitle(scenario, lang)}`,
                uk: `Відкрити сценарій ${dialogScenarioTitle(scenario, lang)}`,
                es: `Abrir escenario ${dialogScenarioTitle(scenario, lang)}`,
                'pt-BR': `Abrir cenário ${dialogScenarioTitle(scenario, lang)}`,
                vi: `Mở kịch bản ${dialogScenarioTitle(scenario, lang)}`,
                id: `Buka skenario ${dialogScenarioTitle(scenario, lang)}`,
                tr: `${dialogScenarioTitle(scenario, lang)} senaryosunu aç`,
                pl: `Otwórz scenariusz ${dialogScenarioTitle(scenario, lang)}`,
              })
        }
        activeOpacity={0.84}
        onPress={vm.onPress}
        style={{
          minHeight: 66,
          marginTop: index === 0 ? 0 : 8,
          marginHorizontal: 14,
          borderRadius: CARD_RADIUS,
          overflow: 'hidden',
          backgroundColor: t.bgCard,
          borderWidth: done ? 1 : 0.5,
          borderColor: done ? t.accent + '4D' : t.border,
          paddingHorizontal: 13,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: locked ? 0.5 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: locked ? 0 : 0.08,
          shadowRadius: 6,
          elevation: locked ? 0 : 2,
        }}
      >
        {/* Иконка сценария + бейдж-галочка при «Пройдено» */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: t.bgSurface,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name={scenario.icon as never} size={22} color={locked ? t.textMuted : accent} />
          {done && (
            <View
              style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 17,
                height: 17,
                borderRadius: 9,
                backgroundColor: accent,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: t.bgCard,
              }}
            >
              <Ionicons name="checkmark" size={10} color={t.correctText} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}
            numberOfLines={2}
          >
            {dialogScenarioTitle(scenario, lang)}
          </Text>

          {locked ? (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.label,
                lineHeight: Math.round(f.label * 1.3),
                marginTop: 4,
              }}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {lockedText}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {done ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: t.accentBg,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={12} color={accent} />
                  <Text style={{ color: accent, fontSize: f.label, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Пройдено',
                      uk: 'Пройдено',
                      es: 'Hecho',
                      'pt-BR': 'Concluído',
                      vi: 'Đã xong',
                      id: 'Selesai',
                      tr: 'Tamamlandı',
                      pl: 'Ukończono',
                    })}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Чип уровня — нейтральный, не зелёный «бейдж-выполнено». */}
                  <View
                    style={{
                      backgroundColor: t.accentBg,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: accent, fontSize: f.label, fontWeight: '900' }}>{levelChip}</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: t.bgSurface,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
                      {triLang(lang, {
                        ru: 'Новое',
                        uk: 'Нове',
                        es: 'Nuevo',
                        'pt-BR': 'Novo',
                        vi: 'Mới',
                        id: 'Baru',
                        tr: 'Yeni',
                        pl: 'Nowe',
                      })}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {plusLocked ? (
          <PlusBadge themeMode={themeMode} size="xs" style={{ marginLeft: 8 }} />
        ) : (
          <Ionicons
            name={locked ? 'lock-closed' : 'chevron-forward'}
            size={19}
            color={locked ? accent : t.textSecond}
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  // ── Hero «Продолжить» ─────────────────────────────────────────────────────
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
            borderWidth: 1.5,
            borderColor: accent + '5A',
            paddingHorizontal: 13,
            paddingVertical: 13,
            shadowColor: accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 3,
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
            borderWidth: 1,
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
          borderWidth: 1,
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
              <Ionicons name={seg.icon} size={16} color={activeTab ? '#fff' : t.textSecond} />
              <Text
                style={{ color: activeTab ? '#fff' : t.textSecond, fontSize: f.sub, fontWeight: '900' }}
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
            hapticTap();
            void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level' });
            router.push({ pathname: '/premium_modal', params: { context: 'dialog_locked_level' } } as never);
          }}
          style={{
            marginTop: 18,
            marginHorizontal: 14,
            borderRadius: 16,
            backgroundColor: t.bgCard,
            borderWidth: 1,
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
                ru: 'Открой больше диалогов по урокам',
                uk: 'Відкрий більше діалогів за уроками',
                es: 'Abre más diálogos por lecciones',
                'pt-BR': 'Abra mais diálogos por lições',
                vi: 'Mở thêm đối thoại theo bài học',
                id: 'Buka lebih banyak dialog per pelajaran',
                tr: 'Derslere göre daha fazla diyalog aç',
                pl: 'Otwórz więcej dialogów według lekcji',
              })}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2, lineHeight: Math.round(f.caption * 1.35) }}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {triLang(lang, {
                ru: 'Проходи курс — уровни открываются сами. Или открой все сразу с Plus.',
                uk: 'Проходь курс — рівні відкриваються самі. Або відкрий усі одразу з Plus.',
                es: 'Avanza en el curso y los niveles se abren solos. O ábrelos todos con Plus.',
                'pt-BR': 'Avance no curso — os níveis abrem sozinhos. Ou abra todos de uma vez com Plus.',
                vi: 'Học tiếp khóa học — các cấp sẽ tự mở. Hoặc mở tất cả ngay với Plus.',
                id: 'Ikuti kursus — level akan terbuka sendiri. Atau buka semuanya sekaligus dengan Plus.',
                tr: 'Kursa devam et — seviyeler kendiliğinden açılır. Ya da hepsini Plus ile hemen aç.',
                pl: 'Przechodź kurs — poziomy otwierają się same. Albo otwórz wszystkie od razu z Plus.',
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textSecond} />
        </TouchableOpacity>
      )}

      {!hasPremiumAccess && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingTop: 16,
            paddingHorizontal: 18,
          }}
        >
          <Ionicons name="gift-outline" size={14} color={freeDialogsLeft > 0 ? accent : t.textMuted} />
          <Text
            style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', flexShrink: 1 }}
            maxFontSizeMultiplier={1.2}
          >
            {freeDialogsLeft > 0
              ? triLang(lang, {
                  ru: `Бесплатных диалогов осталось: ${freeDialogsLeft} — дальше Plus`,
                  uk: `Безкоштовних діалогів залишилось: ${freeDialogsLeft} — далі Plus`,
                  es: `Diálogos gratis restantes: ${freeDialogsLeft} — luego Plus`,
                  'pt-BR': `Diálogos grátis restantes: ${freeDialogsLeft} — depois Plus`,
                  vi: `Đối thoại miễn phí còn lại: ${freeDialogsLeft} — sau đó Plus`,
                  id: `Sisa dialog gratis: ${freeDialogsLeft} — lalu Plus`,
                  tr: `Kalan ücretsiz diyalog: ${freeDialogsLeft} — sonrası Plus`,
                  pl: `Pozostałe darmowe dialogi: ${freeDialogsLeft} — potem Plus`,
                })
              : triLang(lang, {
                  ru: 'Пробный диалог использован · дальше Plus',
                  uk: 'Пробний діалог використано · далі Plus',
                  es: 'Diálogo de prueba usado · luego Plus',
                  'pt-BR': 'Diálogo de teste usado · depois Plus',
                  vi: 'Đã dùng đối thoại thử · tiếp theo là Plus',
                  id: 'Dialog percobaan sudah digunakan · selanjutnya Plus',
                  tr: 'Deneme diyaloğu kullanıldı · sonrası Plus',
                  pl: 'Dialog próbny wykorzystany · dalej Plus',
                })}
          </Text>
        </View>
      )}
    </Animated.ScrollView>
  );
}
