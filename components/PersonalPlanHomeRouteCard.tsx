import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import CircularProgress from './CircularProgress';
import PlusBadge from './PlusBadge';
import { hapticTap } from '../hooks/use-haptics';
import type { PersonalPlanHomeSnapshot } from '../app/personal_plan_state';
import { getPersonalPlanArt } from '../app/personal_plan_art';

import { noAndroidOutline } from '../constants/androidGlow';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from './LangContext';
type Props = {
  compactMargin?: boolean;
  snapshot: PersonalPlanHomeSnapshot;
  // Если передан — используется вместо прямого перехода в план (для премиум-гейта:
  // фри-юзер без доступа уходит на пейвол, а не в уже созданный план).
  onPress?: () => void;
  plusLocked?: boolean;
};

function minutesLabel(minutes: number, lang: Lang): string {
  return triLang(lang, { ru: `${minutes} минут`, uk: `${minutes} хвилин`, es: `${minutes} min`, 'pt-BR': `${minutes} min`, vi: `${minutes} phút`, id: `${minutes} menit`, tr: `${minutes} dk`, pl: `${minutes} min` });
}

function cardCopy(snapshot: PersonalPlanHomeSnapshot, lang: Lang): {
  kicker: string;
  subtitle: string;
} {
  if (snapshot.todayDone) {
    return {
      kicker: triLang(lang, { ru: 'План на сегодня готов', uk: 'План на сьогодні готовий', es: 'El plan de hoy está listo', 'pt-BR': 'O plano de hoje está pronto', vi: 'Kế hoạch hôm nay đã xong', id: 'Rencana hari ini sudah selesai', tr: 'Bugünkü plan hazır', pl: 'Plan na dziś gotowy' }),
      subtitle: triLang(lang, { ru: 'Можно отдыхать или заниматься дальше', uk: 'Можна відпочивати або займатися далі', es: 'Puedes descansar o seguir practicando', 'pt-BR': 'Você pode descansar ou continuar praticando', vi: 'Bạn có thể nghỉ ngơi hoặc luyện tập thêm', id: 'Anda bisa istirahat atau terus berlatih', tr: 'Dinlenebilir ya da devam edebilirsin', pl: 'Możesz odpocząć albo ćwiczyć dalej' }),
    };
  }
  if (snapshot.isCarryover) {
    return {
      kicker: triLang(lang, { ru: 'Продолжить план', uk: 'Продовжити план', es: 'Continuar el plan', 'pt-BR': 'Continuar o plano', vi: 'Tiếp tục kế hoạch', id: 'Lanjutkan rencana', tr: 'Plana devam et', pl: 'Kontynuuj plan' }),
      subtitle: triLang(lang, { ru: `Незакрытые задания · ${minutesLabel(snapshot.minutesPerDay, lang)}`, uk: `Незакриті завдання · ${minutesLabel(snapshot.minutesPerDay, lang)}`, es: `Tareas pendientes · ${minutesLabel(snapshot.minutesPerDay, lang)}`, 'pt-BR': `Tarefas pendentes · ${minutesLabel(snapshot.minutesPerDay, lang)}`, vi: `Nhiệm vụ còn dang dở · ${minutesLabel(snapshot.minutesPerDay, lang)}`, id: `Tugas belum selesai · ${minutesLabel(snapshot.minutesPerDay, lang)}`, tr: `Tamamlanmamış görevler · ${minutesLabel(snapshot.minutesPerDay, lang)}`, pl: `Niedokończone zadania · ${minutesLabel(snapshot.minutesPerDay, lang)}` }),
    };
  }
  // Обычное состояние: верхнюю надпись «Мой план» не показываем (kicker пустой),
  // название плана и день ниже сами несут смысл.
  return {
    kicker: '',
    subtitle: `${snapshot.todayTitle} · ${minutesLabel(snapshot.minutesPerDay, lang)}`,
  };
}

function withAlpha(color: string, alphaHex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alphaHex}`;
  return 'rgba(255,255,255,0.10)';
}

function PersonalPlanHomeRouteCard({ compactMargin = true, snapshot, onPress, plusLocked = false }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, themeMode } = useTheme();
  const isGold = themeMode === 'gold';
  const isCompass = false;
  const isPaperHomeTheme = false;
  const copy = cardCopy(snapshot, lang);
  const art = getPersonalPlanArt(snapshot.planId);
  const actionAccent = isGold ? '#FFE8A8' : isCompass ? '#F2C48D' : t.accent;
  const cardGradient = isGold ? ['#211808', '#0A0702'] as const : isCompass ? ['#1F1F21', '#171719'] as const : isPaperHomeTheme ? ['rgba(255,253,246,0.98)', 'rgba(237,227,210,0.94)'] as const : t.cardGradient;
  const cardBorder = isGold ? 'rgba(255,232,168,0.34)' : isCompass ? 'rgba(242,196,141,0.20)' : isPaperHomeTheme ? 'rgba(52,45,35,0.28)' : t.border;
  const cardText = isPaperHomeTheme ? '#171615' : t.textPrimary;
  const cardMuted = isPaperHomeTheme ? '#48443C' : t.textMuted;
  const cardRadius = isCompass ? 8 : 20;
  const progressBg = isCompass ? '#2F2F31' : isPaperHomeTheme ? 'rgba(56,52,44,0.18)' : t.bgSurface2;
  const progressInnerBg = isGold ? '#120E08' : isCompass ? '#171719' : isPaperHomeTheme ? 'rgba(255,252,246,0.94)' : t.bgSurface;
  const ambientAccent = withAlpha(actionAccent, '16');

  const openPlan = () => {
    if (onPress) {
      onPress();
      return;
    }
    hapticTap();
    router.push('/personal_plan' as any);
  };

  const openDevPlans = (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    hapticTap();
    router.push('/personal_plan_dev' as any);
  };

  return (
    <TouchableOpacity
      testID="home-personal-plan-card"
      activeOpacity={0.86}
      onPress={openPlan}
      accessibilityRole="button"
      accessibilityLabel={triLang(lang, {
          ru: `Мой план: ${snapshot.planName}, день ${snapshot.dayIndex}`,
          uk: `Мій план: ${snapshot.planName}, день ${snapshot.dayIndex}`,
          es: `Mi plan: ${snapshot.planName}, día ${snapshot.dayIndex}`,
          'pt-BR': `Meu plano: ${snapshot.planName}, dia ${snapshot.dayIndex}`,
          vi: `Kế hoạch của tôi: ${snapshot.planName}, ngày ${snapshot.dayIndex}`,
          id: `Rencanaku: ${snapshot.planName}, hari ${snapshot.dayIndex}`,
          tr: `Planım: ${snapshot.planName}, gün ${snapshot.dayIndex}`,
          pl: `Mój plan: ${snapshot.planName}, dzień ${snapshot.dayIndex}`,
      })}
      style={[
        styles.wrap,
        compactMargin ? styles.compactMargin : styles.defaultMargin,
        { borderRadius: cardRadius, shadowColor: isGold || isCompass ? '#000' : t.cardShadow },
      ]}
    >
      <LinearGradient
        colors={cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: cardBorder, borderRadius: cardRadius }]}
      >
        <View style={[styles.ambient, { backgroundColor: ambientAccent }]} />
        <Ionicons name={art.heroIcon} size={118} color={actionAccent} style={styles.artWatermark} />
        {plusLocked ? (
          <View pointerEvents="none" style={styles.plusBadgeSlot}>
            <PlusBadge themeMode={themeMode} size="xs" />
          </View>
        ) : null}
        <View style={styles.mainRow}>
          <View style={styles.progressWrap}>
            <CircularProgress
              pct={snapshot.progressPct}
              size={62}
              sw={7}
              color={actionAccent}
              bg={progressBg}
              innerBg={progressInnerBg}
              textColor={cardText}
              fontSize={11}
            />
          </View>
          <View style={[styles.copy, plusLocked ? styles.copyLocked : null]}>
            {copy.kicker ? (
              <Text style={[styles.kicker, { color: cardMuted }]} numberOfLines={1}>{copy.kicker}</Text>
            ) : null}
            <Text style={[styles.title, { color: cardText }]}>
              {snapshot.planName}
              {'\n'}
              <Text style={[styles.titleDay, { color: actionAccent }]}>{triLang(lang, { ru: `день ${snapshot.dayIndex}`, uk: `день ${snapshot.dayIndex}`, es: `día ${snapshot.dayIndex}`, 'pt-BR': `dia ${snapshot.dayIndex}`, vi: `ngày ${snapshot.dayIndex}`, id: `hari ${snapshot.dayIndex}`, tr: `gün ${snapshot.dayIndex}`, pl: `dzień ${snapshot.dayIndex}` })}</Text>
            </Text>
            <Text style={[styles.subtitle, { color: cardMuted }]} numberOfLines={2}>
              {copy.subtitle}
            </Text>
            {__DEV__ ? (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={openDevPlans}
                accessibilityRole="button"
                accessibilityLabel="Открыть все планы и дни"
                style={[styles.devChip, { borderColor: cardBorder, backgroundColor: progressBg, borderRadius: isCompass ? 6 : 999 }]}
              >
                <Ionicons name="construct-outline" size={12} color={t.textSecond} />
                <Text style={[styles.devText, { color: t.textSecond }]}>DEV · все планы</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default memo(PersonalPlanHomeRouteCard);

const styles = StyleSheet.create<{
  wrap: ViewStyle;
  compactMargin: ViewStyle;
  defaultMargin: ViewStyle;
  card: ViewStyle;
  mainRow: ViewStyle;
  progressWrap: ViewStyle;
  copy: ViewStyle;
  copyLocked: ViewStyle;
  plusBadgeSlot: ViewStyle;
  kicker: TextStyle;
  title: TextStyle;
  titleDay: TextStyle;
  subtitle: TextStyle;
  devChip: ViewStyle;
  devText: TextStyle;
  ambient: ViewStyle;
  artWatermark: TextStyle;
}>({
  wrap: {
    borderRadius: 20,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline,
  },
  compactMargin: {
    marginHorizontal: 8,
    marginBottom: 12,
  },
  defaultMargin: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, paddingRight: 2 },
  copyLocked: { paddingRight: 58 },
  plusBadgeSlot: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
    alignItems: 'flex-end',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    lineHeight: 14,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 1,
  },
  titleDay: {
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  devChip: {
    alignSelf: 'flex-start',
    minHeight: 23,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 8,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  devText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  ambient: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    right: -58,
    top: -62,
  },
  artWatermark: {
    position: 'absolute',
    right: -8,
    bottom: -18,
    opacity: 0.16,
  },
});
