import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import CircularProgress from './CircularProgress';
import { hapticTap } from '../hooks/use-haptics';
import type { PersonalPlanHomeSnapshot } from '../app/personal_plan_state';
import { getPersonalPlanArt } from '../app/personal_plan_art';
import { getPersonalPlanTaskVisualAsset } from '../app/personal_plan_task_visuals';

type Props = {
  compactMargin?: boolean;
  snapshot: PersonalPlanHomeSnapshot;
};

function cardCopy(snapshot: PersonalPlanHomeSnapshot): {
  kicker: string;
  subtitle: string;
} {
  if (snapshot.todayDone) {
    return {
      kicker: 'План на сегодня готов',
      subtitle: 'Можно отдыхать или заниматься дальше',
    };
  }
  if (snapshot.isCarryover) {
    return {
      kicker: 'Продолжить план',
      subtitle: `Незакрытые задания · ${snapshot.minutesPerDay} минут`,
    };
  }
  return {
    kicker: 'Мой план',
    subtitle: `${snapshot.todayTitle} · ${snapshot.minutesPerDay} минут`,
  };
}

function withAlpha(color: string, alphaHex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alphaHex}`;
  return 'rgba(255,255,255,0.10)';
}

export default function PersonalPlanHomeRouteCard({ compactMargin = true, snapshot }: Props) {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const isGold = themeMode === 'gold';
  const isCompass = themeMode === 'compass';
  const isPaperHomeTheme = themeMode === 'minimalLight';
  const copy = cardCopy(snapshot);
  const art = getPersonalPlanArt(snapshot.planId);
  const heroAsset = getPersonalPlanTaskVisualAsset('route_phrase', snapshot.planId);
  const actionAccent = isGold ? '#FFE8A8' : isCompass ? '#F2C48D' : t.accent;
  const cardGradient = isGold ? ['#211808', '#0A0702'] as const : isCompass ? ['#1F1F21', '#171719'] as const : isPaperHomeTheme ? ['rgba(255,253,246,0.98)', 'rgba(237,227,210,0.94)'] as const : t.cardGradient;
  const cardBorder = isGold ? 'rgba(255,232,168,0.34)' : isCompass ? 'rgba(242,196,141,0.20)' : isPaperHomeTheme ? 'rgba(52,45,35,0.28)' : t.border;
  const cardText = isPaperHomeTheme ? '#171615' : t.textPrimary;
  const cardMuted = isPaperHomeTheme ? '#48443C' : t.textMuted;
  const cardRadius = isCompass ? 8 : 20;
  const progressBg = isCompass ? '#2F2F31' : isPaperHomeTheme ? 'rgba(56,52,44,0.18)' : t.bgSurface2;
  const progressInnerBg = isGold ? '#120E08' : isCompass ? '#171719' : isPaperHomeTheme ? 'rgba(255,252,246,0.94)' : t.bgSurface;
  const ambientAccent = withAlpha(actionAccent, '16');
  const imageScrimColors = isPaperHomeTheme
    ? ['rgba(255,253,246,0.68)', 'rgba(255,253,246,0.24)', 'rgba(64,56,43,0.16)'] as const
    : ['rgba(0,0,0,0.56)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.72)'] as const;

  const openPlan = () => {
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
      accessibilityLabel={`Мой план: ${snapshot.planName}, день ${snapshot.dayIndex}`}
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
        <View style={styles.heroImageBackdrop}>
          <Image source={heroAsset} style={styles.heroImage} contentFit="cover" transition={120} />
          <LinearGradient
            pointerEvents="none"
            colors={imageScrimColors}
            locations={[0, 0.44, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <Ionicons name={art.heroIcon} size={118} color={actionAccent} style={styles.artWatermark} />
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
          <View style={styles.copy}>
            <Text style={[styles.kicker, { color: cardMuted }]} numberOfLines={1}>{copy.kicker}</Text>
            <Text style={[styles.title, { color: cardText }]}>
              {snapshot.planName}{'\n'}день {snapshot.dayIndex}
            </Text>
            <Text style={[styles.subtitle, { color: cardMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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

const styles = StyleSheet.create<{
  wrap: ViewStyle;
  compactMargin: ViewStyle;
  defaultMargin: ViewStyle;
  card: ViewStyle;
  mainRow: ViewStyle;
  progressWrap: ViewStyle;
  copy: ViewStyle;
  kicker: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  devChip: ViewStyle;
  devText: TextStyle;
  ambient: ViewStyle;
  heroImageBackdrop: ViewStyle;
  heroImage: ImageStyle;
  artWatermark: TextStyle;
}>({
  wrap: {
    borderRadius: 20,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
  heroImageBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.24,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.44,
  },
  artWatermark: {
    position: 'absolute',
    right: -8,
    bottom: -18,
    opacity: 0.16,
  },
});
