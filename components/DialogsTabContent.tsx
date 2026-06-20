import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
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
import { getFreeDialogsPerDay } from '../app/ai_dialog_flags';
import { getFreeDialogsLeftToday } from '../app/dialogs_limit_session';
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
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
} from '../app/lessons_tab_state';
import { triLang, type Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { compassIconSource } from '../constants/weeklyCompassIcons';
import { hapticTap } from '../hooks/use-haptics';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

const CARD_RADIUS = 18;
const CHALLENGE_PROGRESS_COLOR = '#22C55E';

interface DialogsTabContentProps {
  headerSlot?: React.ReactNode;
  bottomPadding?: number;
  topPadding?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  trackImpression?: boolean;
}

function pluralReplies(n: number, lang: Lang): string {
  if (lang === 'es') return n === 1 ? 'respuesta' : 'respuestas';
  const ones = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) return lang === 'uk' ? 'відповідей' : 'ответов';
  if (ones === 1) return lang === 'uk' ? 'відповідь' : 'ответ';
  if (ones >= 2 && ones <= 4) return lang === 'uk' ? 'відповіді' : 'ответа';
  return lang === 'uk' ? 'відповідей' : 'ответов';
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

  const [accountLevel, setAccountLevel] = useState(1);
  const [unlockedLessons, setUnlockedLessons] = useState<number[]>(
    () => getLessonsTabInitialState(studyTarget)?.persistedUnlocked ?? [],
  );

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
  const courseGroups = useMemo(
    () => DIALOG_SCENARIO_GROUPS.map((group) => ({
      ...group,
      scenarios: getScenariosByCategory(group.category),
    })),
    [],
  );
  const challengeScenarios = useMemo(() => getChallengeDialogScenarios(), []);
  const accent = t.accent;
  const aiCompassIcon = compassIconSource(themeMode);
  const freePerDay = getFreeDialogsPerDay();
  const [freeDialogsLeft, setFreeDialogsLeft] = useState(freePerDay);
  const refreshFreeDialogsLeft = useCallback(() => {
    void getFreeDialogsLeftToday().then(setFreeDialogsLeft).catch(() => {});
  }, []);
  useEffect(() => {
    refreshFreeDialogsLeft();
    // xp_changed стреляет после каждого диалога (XP начисляется при завершении),
    // поэтому используем его как сигнал что сессия закончилась и лимит мог уменьшиться.
    const sub = onAppEvent('xp_changed', refreshFreeDialogsLeft);
    return () => sub.remove();
  }, [refreshFreeDialogsLeft]);

  const openCourseScenario = (scenario: DialogScenario) => {
    hapticTap();
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
  };

  const openChallengeScenario = (scenario: DialogScenario) => {
    hapticTap();
    const requiredLevel = scenario.requiredAccountLevel ?? 1;
    if (accountLevel < requiredLevel) {
      void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
        scenarioId: scenario.id,
        requiredLevel,
        accountLevel,
      });
      Alert.alert(
        triLang(lang, { ru: 'Пока закрыто', uk: 'Поки закрито', es: 'Bloqueado por ahora' }),
        triLang(lang, {
          ru: `Открывается на уровне ${requiredLevel}. Проходи уроки и вызовы — откроется автоматически.`,
          uk: `Відкривається на рівні ${requiredLevel}. Проходь уроки та виклики — відкриється автоматично.`,
          es: `Se desbloquea en el nivel ${requiredLevel}. Completa lecciones y desafíos para llegar.`,
        }),
        [{ text: triLang(lang, { ru: 'Ок', uk: 'Ок', es: 'Ok' }) }],
      );
      return;
    }
    router.push({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
  };

  const renderScenarioCard = (
    scenario: DialogScenario,
    index: number,
    locked: boolean,
    badge: string,
    lockedText: string,
    onPress: () => void,
  ) => (
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
            })
          : triLang(lang, {
              ru: `Открыть сценарий ${dialogScenarioTitle(scenario, lang)}`,
              uk: `Відкрити сценарій ${dialogScenarioTitle(scenario, lang)}`,
              es: `Abrir escenario ${dialogScenarioTitle(scenario, lang)}`,
            })
      }
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        minHeight: 94,
        marginTop: index === 0 ? 0 : 8,
        marginHorizontal: 14,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        backgroundColor: t.bgCard,
        borderWidth: 1,
        borderColor: t.border,
        paddingHorizontal: 15,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: locked ? 0.55 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: locked ? 0 : 0.1,
        shadowRadius: 7,
        elevation: locked ? 0 : 3,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          backgroundColor: t.bgSurface,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 13,
        }}
      >
        <Ionicons name={scenario.icon as never} size={23} color={locked ? t.textMuted : accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }}
            numberOfLines={1}
          >
            {dialogScenarioTitle(scenario, lang)}
          </Text>
          <View
            style={{
              minWidth: 34,
              height: 24,
              borderRadius: 12,
              backgroundColor: t.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
            }}
          >
            <Text
              style={{
                color: locked ? t.textMuted : CHALLENGE_PROGRESS_COLOR,
                fontSize: f.label,
                fontWeight: '900',
              }}
            >
              {badge}
            </Text>
          </View>
        </View>
        <Text
          style={{
            color: t.textMuted,
            fontSize: f.sub,
            lineHeight: Math.round(f.sub * 1.32),
            marginTop: 5,
          }}
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {locked ? lockedText : dialogScenarioGoal(scenario, lang)}
        </Text>
      </View>

      <Ionicons
        name={locked ? 'lock-closed' : 'chevron-forward'}
        size={19}
        color={locked ? t.accent : t.textSecond}
        style={{ marginLeft: 8 }}
      />
    </TouchableOpacity>
  );

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
    >
      {headerSlot}

      <View
        style={{
          marginTop: 6,
          marginHorizontal: 14,
          borderRadius: 22,
          backgroundColor: t.bgCard,
          borderWidth: 1,
          borderColor: t.border,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.14,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.bgSurface,
              borderWidth: 1,
              borderColor: t.border,
              overflow: 'hidden',
            }}
          >
            <Image source={aiCompassIcon} style={{ width: 46, height: 46 }} contentFit="contain" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }} numberOfLines={1}>
              {triLang(lang, { ru: 'Тренировка разговора', uk: 'Тренування розмови', es: 'Práctica de conversación' })}
            </Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.sub,
                lineHeight: Math.round(f.sub * 1.35),
                marginTop: 3,
              }}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {triLang(lang, {
                ru: 'Выбери ситуацию и отвечай своими словами.',
                uk: 'Вибери ситуацію й відповідай своїми словами.',
                es: 'Elige una situación y responde con tus palabras.',
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Открыть свободный разговор с Компасом',
            uk: 'Відкрити вільну розмову з Компасом',
            es: 'Abrir conversación libre con Compass',
          })}
          activeOpacity={0.86}
          onPress={() => {
            hapticTap();
            router.push({ pathname: '/ai_companion_session' } as never);
          }}
          style={{
            minHeight: 50,
            marginTop: 14,
            borderRadius: 16,
            backgroundColor: accent,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.16)',
              overflow: 'hidden',
            }}
          >
            <Image source={aiCompassIcon} style={{ width: 22, height: 22 }} contentFit="contain" />
          </View>
          <Text
            style={{ color: '#fff', fontSize: f.body, fontWeight: '900', marginLeft: 10, flex: 1 }}
            numberOfLines={1}
          >
            {triLang(lang, { ru: 'Свободный разговор', uk: 'Вільна розмова', es: 'Conversación libre' })}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View>
        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 2 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
            {triLang(lang, { ru: 'Диалоги по урокам', uk: 'Діалоги за уроками', es: 'Diálogos por lecciones' })}
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
            })}
          </Text>
        </View>

        {courseGroups.map((group) => (
          <View key={group.category}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent }} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                {dialogScenarioGroupLabel(group, lang)}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                {group.scenarios.length}
              </Text>
            </View>

            {group.scenarios.map((scenario, index) => {
              const locked = !isScenarioLevelUnlocked(scenario.cefr, reachedLevel, hasPremiumAccess);
              return renderScenarioCard(
                scenario,
                index,
                locked,
                scenario.cefr,
                triLang(lang, {
                  ru: `Откроется на уровне ${scenario.cefr} — или сразу с Premium`,
                  uk: `Відкриється на рівні ${scenario.cefr} — або одразу з Premium`,
                  es: `Se abre en el nivel ${scenario.cefr} — o ya con Premium`,
                }),
                () => openCourseScenario(scenario),
              );
            })}
          </View>
        ))}
      </View>

      <View>
        <View style={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: accent }} />
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', flex: 1 }}>
              {triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', es: 'Situaciones' })}
            </Text>
            <Text style={{ color: CHALLENGE_PROGRESS_COLOR, fontSize: f.caption, fontWeight: '900' }}>
              {triLang(lang, { ru: `ур. ${accountLevel}`, uk: `рів. ${accountLevel}`, es: `niv. ${accountLevel}` })}
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
            })}
          </Text>
        </View>

        {challengeScenarios.map((scenario, index) => {
          const requiredLevel = scenario.requiredAccountLevel ?? 1;
          const locked = accountLevel < requiredLevel;
          return renderScenarioCard(
            scenario,
            index,
            locked,
            triLang(lang, { ru: `ур. ${requiredLevel}`, uk: `рів. ${requiredLevel}`, es: `niv. ${requiredLevel}` }),
            triLang(lang, {
              ru: `Откроется на уровне аккаунта ${requiredLevel}`,
              uk: `Відкриється на рівні акаунта ${requiredLevel}`,
              es: `Se abre en el nivel de cuenta ${requiredLevel}`,
            }),
            () => openChallengeScenario(scenario),
          );
        })}
      </View>

      {hasLockedCourseLevels && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Открыть все уровни диалогов с Premium',
            uk: 'Відкрити всі рівні діалогів з Premium',
            es: 'Abrir todos los niveles de diálogos con Premium',
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
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Открой больше диалогов по урокам',
                uk: 'Відкрий більше діалогів за уроками',
                es: 'Abre más diálogos por lecciones',
              })}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2, lineHeight: Math.round(f.caption * 1.35) }}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {triLang(lang, {
                ru: 'Проходи курс — уровни открываются сами. Или открой все сразу с Premium.',
                uk: 'Проходь курс — рівні відкриваються самі. Або відкрий усі одразу з Premium.',
                es: 'Avanza en el curso y los niveles se abren solos. O ábrelos todos con Premium.',
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textSecond} />
        </TouchableOpacity>
      )}

      {!hasPremiumAccess && (
        <Text
          style={{
            color: t.textMuted,
            fontSize: f.caption,
            textAlign: 'center',
            paddingTop: 14,
            paddingHorizontal: 18,
          }}
          maxFontSizeMultiplier={1.2}
        >
          {triLang(lang, {
            ru: `Осталось сегодня: ${freeDialogsLeft} ${pluralReplies(freeDialogsLeft, lang)} · дальше Premium`,
            uk: `Залишилось сьогодні: ${freeDialogsLeft} ${pluralReplies(freeDialogsLeft, lang)} · далі Premium`,
            es: `Quedan hoy: ${freeDialogsLeft} ${pluralReplies(freeDialogsLeft, lang)} · luego Premium`,
          })}
        </Text>
      )}
    </Animated.ScrollView>
  );
}
