// ════════════════════════════════════════════════════════════════════════════
// PlusLaunchSplashView.tsx — вёрстка заставки Plus при запуске (№35), эталон docs/design/v2-app/plus-launch-etalon.html.
//
// зачем (владелец 21.10): полноэкранная заставка «Больше практики — без стопов». Вёрстка без логики показа: на входе язык, состояние цены
// (offer: null — цена грузится, 'ready' — цена и срок пробного из магазина, 'no_prices' — магазин не ответил) и два действия.
// Кнопка и строка под ней собираются ТЕМИ ЖЕ фразами, что кнопка пейвола (paywallPlusCtaCopy / COPY), поэтому срок пробного и цена — из магазина.
// Закрытие мгновенное (крестик и «Не сейчас» — одно действие, без анимации ухода); вход — один спокойный въезд 320 мс, при «уменьшить движение» — без него.
// Тема: заставка Plus — фирменный фиолетово-голубой экран, он одинаков в светлой и тёмной теме (как «Plus заметно» в эталоне).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import type { PlusSplashOffer } from '../../app/plus_splash_offer';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LinearGradient } from '../SafeLinearGradient';
import V2Pressable from '../v2/V2Pressable';
import { paywallPlusCtaCopy } from '../paywall/PaywallPlus';
import { COPY, pick } from '../paywall/PaywallPlusCopy';
import { PLUS_SPLASH_BENEFITS, plusSplashText } from './plus_splash_copy';

// theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html — одинакова в обеих темах
const INK = '#F2F2F6'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const INK_SECOND = '#B4B4BE'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const INK_QUIET = '#8E8E96'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const VIOLET_SOFT = '#C9C0FF'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const CTA_INK = '#0B0B18'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const SHEET_COLORS = ['#17172A', '#0E0E14', '#0C0C10'] as const; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const GLOW_COLORS = ['rgba(142,124,255,0.42)', 'rgba(142,124,255,0)'] as const; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const CTA_COLORS = ['#9C8CFF', '#6FA8FF'] as const; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const CHIP = 'rgba(255,255,255,0.10)'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const CHIP_SOFT = 'rgba(255,255,255,0.08)'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const BENEFIT_TILE = 'rgba(142,124,255,0.18)'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const BENEFIT_ICON = '#D6CFFF'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const SKELETON = 'rgba(255,255,255,0.14)'; // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type PlusSplashViewProps = Readonly<{
  lang: Lang;
  /** null — цена ещё грузится (тихая полоска, кнопка «Оформить Plus»). */
  offer: PlusSplashOffer | null;
  onPrimary: () => void;
  onDismiss: () => void;
}>;

/** Подпись кнопки и строки под ней по состоянию цены (таблица «Что на экране» эталона). */
export function plusSplashCtaCopy(lang: Lang, offer: PlusSplashOffer | null): Readonly<{ label: string; fine: string | null; wait: boolean }> {
  if (offer && offer.kind === 'ready') {
    const { label, fine } = paywallPlusCtaCopy(lang, {
      selected: 'yearly', yearlyPrice: offer.yearlyPrice, monthlyPrice: '',
      yearlyTrialDays: offer.trialDays, monthlyTrialDays: null, yearlyPromo: null, monthlyPromo: null,
    });
    return { label, fine, wait: false };
  }
  if (offer === null) return { label: pick(lang, COPY.getPlus), fine: null, wait: true };
  return { label: pick(lang, COPY.getPlus), fine: pick(lang, COPY.priceWillConfirm), wait: false };
}

function PlusLaunchSplashView({ lang, offer, onPrimary, onDismiss }: PlusSplashViewProps) {
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const dim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const sheet = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const cta = useMemo(() => plusSplashCtaCopy(lang, offer), [lang, offer]);

  // зачем (emil-design-eng): модальный въезд — один раз, ease-out; затемнение быстрее листа; ни ухода, ни повторов
  useEffect(() => {
    if (reduceMotion) { dim.setValue(1); sheet.setValue(1); return; }
    Animated.parallel([
      Animated.timing(dim, { toValue: 1, duration: 240, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(sheet, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: true }),
    ]).start();
  }, [dim, reduceMotion, sheet]);

  const sheetStyle = {
    opacity: sheet,
    transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
  };

  return (
    <View style={styles.root} testID="plus-splash">
      <Animated.View style={[styles.dim, { opacity: dim }]} pointerEvents="none" />
      <Animated.View style={[styles.sheetWrap, { marginTop: insets.top + 10 }, sheetStyle]}>
        <LinearGradient colors={SHEET_COLORS} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={GLOW_COLORS} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.glow} pointerEvents="none" />
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 22 }]}>
          <V2Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={pick(lang, COPY.close)}
            scaleTo={0.94}
            style={styles.close}
            outerStyle={styles.closeOuter}
            testID="plus-splash-close"
          >
            <Ionicons name="close" size={20} color={INK} />
          </V2Pressable>

          <View style={styles.kickRow}>
            <Ionicons name="diamond" size={12} color={VIOLET_SOFT} />
            <Text style={styles.kick}>{pick(lang, COPY.kicker)}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>{plusSplashText(lang, 'title')}</Text>
          <Text style={styles.subtitle}>{plusSplashText(lang, 'subtitle')}</Text>

          <View style={styles.benefits}>
            {PLUS_SPLASH_BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <View style={styles.benefitTile}><Ionicons name={b.icon} size={22} color={BENEFIT_ICON} /></View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{plusSplashText(lang, b.title)}</Text>
                  <Text style={styles.benefitSub}>{plusSplashText(lang, b.text)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.spacer} />
          <V2Pressable
            onPress={onPrimary}
            accessibilityRole="button"
            accessibilityLabel={cta.label}
            style={[styles.cta, cta.wait ? styles.ctaWait : null]}
            testID="plus-splash-cta"
          >
            <LinearGradient colors={CTA_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.ctaText} numberOfLines={2}>{cta.label}</Text>
          </V2Pressable>
          <View style={styles.fineRow} testID="plus-splash-fine">
            {cta.fine === null ? <View style={styles.skeleton} /> : <Text style={styles.fine}>{cta.fine}</Text>}
          </View>
          <V2Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={pick(lang, COPY.afterNotNow)}
            style={styles.notNow}
            testID="plus-splash-not-now"
          >
            <Text style={styles.notNowText}>{pick(lang, COPY.afterNotNow)}</Text>
          </V2Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' }, // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
  sheetWrap: { flex: 1, borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: 'hidden' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 280 },
  content: { flex: 1, paddingTop: 18, paddingHorizontal: 22 },
  closeOuter: { alignSelf: 'flex-end' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: CHIP, alignItems: 'center', justifyContent: 'center' },
  kickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  kick: { fontSize: 13, lineHeight: 17, fontWeight: '800', letterSpacing: 1.6, color: VIOLET_SOFT },
  title: { marginTop: 10, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6, color: INK },
  subtitle: { marginTop: 10, fontSize: 16, lineHeight: 22, color: INK_SECOND },
  benefits: { marginTop: 24, gap: 14 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: BENEFIT_TILE, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, minWidth: 0 },
  benefitTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: INK },
  benefitSub: { marginTop: 2, fontSize: 13, lineHeight: 18, color: INK_SECOND },
  spacer: { flexGrow: 1, minHeight: 16 },
  cta: { minHeight: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, boxShadow: '0 14px 30px -12px rgba(124,140,255,0.6)' }, // theme-exempt: фирменная палитра Plus из эталона plus-launch-etalon.html, одинакова в обеих темах
  ctaWait: { opacity: 0.55 },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '800', textAlign: 'center', color: CTA_INK },
  fineRow: { minHeight: 22, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  fine: { fontSize: 13, lineHeight: 18, textAlign: 'center', color: INK_QUIET },
  skeleton: { width: 210, height: 12, borderRadius: 6, backgroundColor: SKELETON },
  notNow: { minHeight: 50, borderRadius: 25, marginTop: 10, backgroundColor: CHIP_SOFT, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: INK },
});

export default memo(PlusLaunchSplashView);
