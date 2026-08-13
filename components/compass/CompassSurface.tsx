import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import TonalSurface from '../TonalSurface';
import { compassIconSource } from '../../constants/weeklyCompassIcons';
import type { Lang } from '../../constants/i18n';

export type CompassSurfaceRecommendation = Readonly<{
  id: string;
  title: string;
  explanation: string;
  actionLabel: string;
  expectedMinutes: number;
}>;

type Props = Readonly<{
  presentation: 'compact' | 'expanded' | 'page';
  recommendation: CompassSurfaceRecommendation;
  onPrimary: () => void;
  active?: boolean;
  headingRef?: React.Ref<Text>;
}>;

type Copy = Readonly<{
  eyebrow: string;
  whyTitle: string;
  minutes: (value: number) => string;
}>;

function copyFor(lang: Lang): Copy {
  const copies: Record<Lang, Copy> = {
    ru: {
      eyebrow: 'КОМПАС · СЕГОДНЯ', whyTitle: 'ПОЧЕМУ СЕЙЧАС',
      minutes: value => `${value} мин`,
    },
    uk: {
      eyebrow: 'КОМПАС · СЬОГОДНІ', whyTitle: 'ЧОМУ ЗАРАЗ',
      minutes: value => `${value} хв`,
    },
    es: {
      eyebrow: 'COMPASS · HOY', whyTitle: 'POR QUÉ AHORA',
      minutes: value => `${value} min`,
    },
    'pt-BR': {
      eyebrow: 'COMPASS · HOJE', whyTitle: 'POR QUE AGORA',
      minutes: value => `${value} min`,
    },
    vi: {
      eyebrow: 'COMPASS · HÔM NAY', whyTitle: 'VÌ SAO LÚC NÀY',
      minutes: value => `${value} phút`,
    },
    id: {
      eyebrow: 'COMPASS · HARI INI', whyTitle: 'MENGAPA SEKARANG',
      minutes: value => `${value} mnt`,
    },
    tr: {
      eyebrow: 'COMPASS · BUGÜN', whyTitle: 'NEDEN ŞİMDİ',
      minutes: value => `${value} dk`,
    },
    pl: {
      eyebrow: 'COMPASS · DZISIAJ', whyTitle: 'DLACZEGO TERAZ',
      minutes: value => `${value} min`,
    },
  };
  return copies[lang] ?? copies.ru;
}

function alpha(color: string, opacity: number): string {
  const clean = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return color;
  const value = parseInt(clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${opacity})`;
}

function CompassMark({ presentation }: { presentation: Props['presentation'] }) {
  const { theme: t, themeMode, isFlat } = useTheme();
  const page = presentation === 'page';
  const size = page ? 86 : presentation === 'expanded' ? 66 : 52;
  return (
    <View
      style={[styles.markFrame, { width: size, height: size }]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.markRingOuter, { borderColor: alpha(t.accent, 0.26) }]} />
      <View style={[styles.markRingInner, { borderColor: alpha(t.accent, 0.13) }]} />
      {isFlat ? (
        <View style={[styles.flatMark, { backgroundColor: t.bgSurface2 }]}>
          <Ionicons name="compass-outline" size={Math.round(size * 0.52)} color={t.accent} />
        </View>
      ) : (
        <Image source={compassIconSource(themeMode)} style={{ width: size * 1.02, height: size * 1.02 }} contentFit="contain" accessible={false} />
      )}
    </View>
  );
}

export default function CompassSurface({
  presentation,
  recommendation,
  onPrimary,
  active = true,
  headingRef,
}: Props) {
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const copy = copyFor(lang);
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const expanded = presentation !== 'compact';

  useEffect(() => {
    if (!active || reducedMotion) {
      entrance.value = 1;
      return;
    }
    entrance.value = 0;
    entrance.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [active, entrance, recommendation.id, reducedMotion]);

  const identityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 0.38], [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion ? [] : [{ translateY: interpolate(entrance.value, [0, 0.38], [10, 0], Extrapolation.CLAMP) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0.1, 0.62], [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion ? [] : [{ translateY: interpolate(entrance.value, [0.1, 0.62], [10, 0], Extrapolation.CLAMP) }],
  }));
  const explanationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0.28, 0.82], [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion ? [] : [{ translateY: interpolate(entrance.value, [0.28, 0.82], [10, 0], Extrapolation.CLAMP) }],
  }));
  const actionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0.42, 1], [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion ? [] : [{ translateY: interpolate(entrance.value, [0.42, 1], [10, 0], Extrapolation.CLAMP) }],
  }));

  const primaryLabel = `${recommendation.actionLabel} · ${copy.minutes(recommendation.expectedMinutes)}`;
  const actionTitleSize = presentation === 'page' ? Math.max(34, f.h1 + 4) : Math.max(28, f.h1);

  const main = (
    <View style={[styles.content, expanded && styles.contentExpanded, presentation === 'page' && styles.contentPage]}>
      <Animated.View style={[styles.identity, presentation === 'page' && styles.identityPage, identityStyle]}>
        <CompassMark presentation={presentation} />
        <Text style={[styles.eyebrow, { color: t.accent, fontSize: f.label }]}>{copy.eyebrow}</Text>
      </Animated.View>

      <Animated.View style={titleStyle} testID="compass-action-block">
        <TonalSurface
          tone="subtle"
          radius={ds.radius.xl}
          style={[
            styles.actionBlock,
            presentation === 'page' && styles.actionBlockPage,
            { borderColor: t.borderLight },
          ]}
        >
          <Text
            ref={headingRef}
            accessibilityRole="header"
            style={[
              styles.actionTitle,
              presentation === 'page' && styles.actionTitlePage,
              { color: t.textPrimary, fontSize: actionTitleSize, lineHeight: Math.ceil(actionTitleSize * 1.12) },
            ]}
          >
            {recommendation.title}
          </Text>
        </TonalSurface>
      </Animated.View>

      <Animated.View style={explanationStyle} testID="compass-explanation-block">
        <TonalSurface
          tone="subtle"
          radius={ds.radius.xl}
          style={[
            styles.explanationBlock,
            presentation === 'page' && styles.explanationBlockPage,
            { borderColor: t.borderLight },
          ]}
        >
          <Text style={[styles.explanationLabel, { color: t.accent, fontSize: f.label }]}>{copy.whyTitle}</Text>
          <Text style={[styles.explanation, presentation === 'page' && styles.explanationPage, { color: t.textSecond, fontSize: f.body, lineHeight: Math.ceil(f.body * 1.5) }]}>
            {recommendation.explanation}
          </Text>
        </TonalSurface>
      </Animated.View>

      <Animated.View style={actionStyle}>
        <Pressable
          testID="compass-primary-action"
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: t.accent,
              minHeight: Math.max(56, ds.buttonHeight),
              opacity: pressed ? 0.86 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          <Text style={[styles.primaryText, { color: t.correctText, fontSize: f.bodyLg }]}>{primaryLabel}</Text>
          <View
            style={[styles.primaryArrow, { backgroundColor: alpha(t.correctText, 0.14) }]}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons name="arrow-forward" size={19} color={t.correctText} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );

  if (presentation === 'page') {
    return (
      <ScrollView
        testID="compass-today-screen"
        style={styles.page}
        contentContainerStyle={[styles.pageContent, { paddingHorizontal: ds.spacing.lg, paddingBottom: 132 }]}
        showsVerticalScrollIndicator={false}
      >
        {main}
      </ScrollView>
    );
  }
  return main;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingTop: 12 },
  content: { position: 'relative', gap: 16, paddingBottom: 4 },
  contentExpanded: { gap: 20 },
  contentPage: { gap: 24, maxWidth: 680, width: '100%', alignSelf: 'center' },
  identity: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityPage: { minHeight: 92, justifyContent: 'center', paddingVertical: 4 },
  eyebrow: { flexShrink: 1, fontWeight: '900', letterSpacing: 1.25 },
  markFrame: { alignItems: 'center', justifyContent: 'center' },
  markRingOuter: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, borderWidth: 1 },
  markRingInner: { position: 'absolute', width: '82%', height: '82%', borderRadius: 999, borderWidth: 1 },
  flatMark: { width: '82%', height: '82%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionBlock: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingVertical: 20 },
  actionBlockPage: { paddingHorizontal: 26, paddingVertical: 26 },
  actionTitle: { fontWeight: '900', letterSpacing: -0.85 },
  actionTitlePage: { letterSpacing: -1.05, maxWidth: 560 },
  explanationBlock: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingVertical: 18, gap: 8 },
  explanationBlockPage: { paddingHorizontal: 26, paddingVertical: 22 },
  explanationLabel: { fontWeight: '900', letterSpacing: 0.95 },
  explanation: { fontWeight: '600' },
  explanationPage: { maxWidth: 570 },
  primaryButton: { width: '100%', borderRadius: 18, paddingLeft: 18, paddingRight: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  primaryText: { flex: 1, textAlign: 'center', fontWeight: '900', letterSpacing: -0.2, paddingLeft: 38 },
  primaryArrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
