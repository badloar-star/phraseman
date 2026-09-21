import React, { memo, useEffect, useId, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { triLang, type Lang } from '../constants/i18n';
import { readableOn, isLightSurface } from '../constants/color_contrast';
import { APP_FONT_FAMILY } from '../app/typography';
import { getBoonCopy } from '../app/boons/boon_copy';
import { useReduceMotionPreference } from '../hooks/use_reduce_motion';
import { useTheme } from './ThemeContext';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import PressableHybrid from './PressableHybrid';
import { LinearGradient } from './SafeLinearGradient';

type Props = {
  visible: boolean;
  kind: 'xp' | 'runes';
  lang: Lang;
  onClose: () => void;
};

// Presentation only: the existing reward engines decide eligibility and amounts.
function DoubleRewardSheet({ visible, kind, lang, onClose }: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotionPreference();
  const progress = useRef(new Animated.Value(1)).current;
  const gradientId = `doubleReward${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const copy = triLang(lang, {
    ru: { kicker: 'Супервоскресенье', title: 'Воскресенье\nработает за двоих.', body: 'Руны за занятия, игры и видео удваиваются. Весь день. Для всех.', multiplier: 'Множитель', runes: '×2 руны', duration: 'Действует', until: 'До 00:00 UTC', auto: 'Удвоение применяется автоматически', cta: 'Продолжить', close: 'Закрыть', daily: 'Бонус дня' },
    uk: { kicker: 'Супернеділя', title: 'Неділя\nпрацює за двох.', body: 'Руни за заняття, ігри та відео подвоюються. Увесь день. Для всіх.', multiplier: 'Множник', runes: '×2 руни', duration: 'Діє', until: 'До 00:00 UTC', auto: 'Подвоєння застосовується автоматично', cta: 'Продовжити', close: 'Закрити', daily: 'Бонус дня' },
    en: { kicker: 'Super Sunday', title: 'Sunday does\ndouble duty.', body: 'Runes from lessons, games and videos are doubled. All day. For everyone.', multiplier: 'Multiplier', runes: '×2 runes', duration: 'Active', until: 'Until 00:00 UTC', auto: 'Rewards are doubled automatically', cta: 'Continue', close: 'Close', daily: 'Daily bonus' },
    es: { kicker: 'Súper domingo', title: 'El domingo\nrinde el doble.', body: 'Las runas de lecciones, juegos y vídeos se duplican. Todo el día. Para todos.', multiplier: 'Multiplicador', runes: '×2 runas', duration: 'Activo', until: 'Hasta las 00:00 UTC', auto: 'Se duplican automáticamente', cta: 'Continuar', close: 'Cerrar', daily: 'Bono del día' },
    'pt-BR': { kicker: 'Super domingo', title: 'O domingo\nrende em dobro.', body: 'Runas de lições, jogos e vídeos são duplicadas. O dia todo. Para todos.', multiplier: 'Multiplicador', runes: '×2 runas', duration: 'Ativo', until: 'Até 00:00 UTC', auto: 'As recompensas dobram automaticamente', cta: 'Continuar', close: 'Fechar', daily: 'Bônus do dia' },
    vi: { kicker: 'Chủ nhật siêu cấp', title: 'Chủ nhật\nhiệu quả gấp đôi.', body: 'Rune từ bài học, trò chơi và video đều nhân đôi. Cả ngày. Cho mọi người.', multiplier: 'Hệ số', runes: '×2 rune', duration: 'Hiệu lực', until: 'Đến 00:00 UTC', auto: 'Phần thưởng được nhân đôi tự động', cta: 'Tiếp tục', close: 'Đóng', daily: 'Ưu đãi hôm nay' },
    id: { kicker: 'Minggu super', title: 'Hari Minggu,\nhasil dua kali lipat.', body: 'Rune dari pelajaran, permainan, dan video digandakan. Seharian. Untuk semua.', multiplier: 'Pengali', runes: '×2 rune', duration: 'Aktif', until: 'Hingga 00:00 UTC', auto: 'Hadiah digandakan otomatis', cta: 'Lanjutkan', close: 'Tutup', daily: 'Bonus hari ini' },
    tr: { kicker: 'Süper pazar', title: 'Pazar günü\niki kat kazandırır.', body: 'Ders, oyun ve video rünleri ikiye katlanır. Gün boyu. Herkes için.', multiplier: 'Çarpan', runes: '×2 rün', duration: 'Geçerlilik', until: '00:00 UTC’ye kadar', auto: 'Ödüller otomatik olarak ikiye katlanır', cta: 'Devam et', close: 'Kapat', daily: 'Günün bonusu' },
    pl: { kicker: 'Super niedziela', title: 'Niedziela działa\nza dwoje.', body: 'Runy z lekcji, gier i filmów są podwajane. Cały dzień. Dla wszystkich.', multiplier: 'Mnożnik', runes: '×2 runy', duration: 'Działa', until: 'Do 00:00 UTC', auto: 'Nagrody podwajają się automatycznie', cta: 'Kontynuuj', close: 'Zamknij', daily: 'Bonus dnia' },
  });
  const xpCopy = kind === 'xp' ? getBoonCopy('double_xp', lang) : null;
  const accentText = readableOn(t.accent, t.bgCard, 4.5);
  const mutedText = readableOn(t.textMuted, t.bgCard, 4.5);
  const highlight = isLightSurface(t.bgCard) ? t.accent : t.textPrimary;

  useEffect(() => {
    progress.stopAnimation();
    if (!visible || reduceMotion !== false) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 2600, delay: 180,
      easing: Easing.linear, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, visible]);

  const reveal = (start: number) => ({
    opacity: progress.interpolate({ inputRange: [start, start + 0.15], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: progress.interpolate({ inputRange: [start, start + 0.15], outputRange: [16, 0], extrapolate: 'clamp' as const }) }],
  });

  return (
    <HybridSheetShell visible={visible} onClose={onClose} closeLabel={copy.close} backdropAccessible={false} glowColor={t.accent} testID={`double-reward-sheet-${kind}`}>
      {({ requestDismiss }) => (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={requestDismiss} style={styles.close} hitSlop={4}>
            <Text style={[styles.closeText, { color: mutedText }]} accessible={false}>×</Text>
          </Pressable>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={styles.hero} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
              <Animated.View style={[styles.orbit, {
                opacity: progress.interpolate({ inputRange: [0.12, 0.65], outputRange: [0, 1], extrapolate: 'clamp' }),
                transform: [{ rotate: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: ['-70deg', '-25deg', '-25deg'] }) }],
              }]}>
                <Svg width="100%" height="100%" viewBox="0 0 300 220"><Ellipse cx="150" cy="110" rx="125" ry="48" stroke={t.accent} strokeOpacity={0.32} strokeWidth={1} fill="none" /></Svg>
              </Animated.View>
              <Animated.View style={[styles.emblem, {
                opacity: progress.interpolate({ inputRange: [0, 0.12], outputRange: [0, 1], extrapolate: 'clamp' }),
                transform: [
                  { perspective: 650 },
                  { translateY: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: [-32, 4, 0, 0] }) },
                  { rotateY: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: ['-65deg', '8deg', '0deg', '0deg'] }) },
                  { scale: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: [0.65, 1.04, 1, 1] }) },
                ],
              }]}>
                {/* зачем (2026-09-21): testID нет ни в StopProps, ни в LinearGradientProps —
                    он валил запуск сюита по типам. Метку несёт Svg, он здесь один. */}
                <Svg testID="double-reward-metal" width="100%" height="100%" viewBox="0 0 300 220">
                  <Defs><SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="65%">
                    <Stop offset="0" stopColor={t.btnShadow} /><Stop offset="0.24" stopColor={t.accent} />
                    <Stop offset="0.36" stopColor={highlight} /><Stop offset="0.45" stopColor={t.accent} />
                    <Stop offset="0.58" stopColor={t.btnShadow} /><Stop offset="0.72" stopColor={highlight} /><Stop offset="1" stopColor={t.accent} />
                  </SvgGradient></Defs>
                  <SvgText x="145" y="164" textAnchor="middle" fontFamily={APP_FONT_FAMILY} fontWeight="900" fontSize="146" letterSpacing="-12" fill={t.btnShadow}>×2</SvgText>
                  <SvgText x="145" y="158" textAnchor="middle" fontFamily={APP_FONT_FAMILY} fontWeight="900" fontSize="146" letterSpacing="-12" fill={`url(#${gradientId})`}>×2</SvgText>
                </Svg>
              </Animated.View>
              {reduceMotion === false && <Animated.View style={[styles.glint, {
                opacity: progress.interpolate({ inputRange: [0, 0.4, 0.55, 0.8, 1], outputRange: [0, 0, 0.65, 0, 0] }),
                transform: [{ translateX: progress.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [-110, -110, 110, 110] }) }, { rotate: '-30deg' }],
              }]}><LinearGradient colors={['transparent', highlight, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /></Animated.View>}
            </View>
            <Animated.View style={reveal(0.2)}>
              <Text maxFontSizeMultiplier={2} style={[styles.kicker, { color: accentText }]}>{xpCopy ? copy.daily : copy.kicker}</Text>
              <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, { color: t.textPrimary, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.15) }]}>{xpCopy?.title ?? copy.title}</Text>
            </Animated.View>
            <Animated.View style={reveal(0.28)}><Text maxFontSizeMultiplier={2} style={[styles.description, { color: mutedText, fontSize: f.body, lineHeight: Math.round(f.body * 1.5) }]}>{xpCopy?.subtitle ?? copy.body}</Text></Animated.View>
            <Animated.View style={[styles.facts, { borderColor: t.border }, reveal(0.36)]}>
              <View style={styles.fact}><Text maxFontSizeMultiplier={2} style={[styles.factLabel, { color: mutedText }]}>{copy.multiplier}</Text><Text maxFontSizeMultiplier={2} style={[styles.factValue, { color: t.textPrimary }]}>{kind === 'xp' ? '×2 XP' : copy.runes}</Text></View>
              <View style={[styles.fact, styles.lastFact, { borderColor: t.border }]}><Text maxFontSizeMultiplier={2} style={[styles.factLabel, { color: mutedText }]}>{copy.duration}</Text><Text maxFontSizeMultiplier={2} style={[styles.factValue, { color: t.textPrimary }]}>{copy.until}</Text></View>
            </Animated.View>
          </ScrollView>
          <Animated.View style={[styles.footer, reveal(0.44)]}>
            <PressableHybrid accessibilityLabel={copy.cta} accessibilityHint={copy.close} variant="primary" onPress={requestDismiss} contentStyle={[styles.cta, { backgroundColor: t.accent }]}>
              <Text testID="double-reward-cta-text" maxFontSizeMultiplier={2} style={[styles.ctaText, { color: t.correctText, fontSize: f.body }]}>{copy.cta}</Text>
            </PressableHybrid>
            <Text maxFontSizeMultiplier={2} style={[styles.footnote, { color: mutedText }]}>{copy.auto}</Text>
          </Animated.View>
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(DoubleRewardSheet);

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 }, content: { paddingBottom: 8 },
  close: { position: 'absolute', right: 8, top: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeText: { fontSize: 28 }, hero: { height: 220, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 300, maxWidth: '100%', height: 220 },
  emblem: { width: 300, maxWidth: '100%', height: 220 },
  glint: { position: 'absolute', width: 210, height: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textAlign: 'center', textTransform: 'uppercase' },
  title: { fontWeight: '700', letterSpacing: -1, textAlign: 'center', marginTop: 12 },
  description: { textAlign: 'center', marginTop: 12, paddingHorizontal: 6 },
  facts: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, marginTop: 24, marginBottom: 8 },
  fact: { flex: 1, minWidth: 0, paddingHorizontal: 12 }, lastFact: { borderLeftWidth: StyleSheet.hairlineWidth },
  factLabel: { fontSize: 12, marginBottom: 6 }, factValue: { fontSize: 14, fontWeight: '600' },
  footer: { flexShrink: 0, paddingTop: 8 },
  cta: { minHeight: 54, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', textAlign: 'center' }, footnote: { fontSize: 11, textAlign: 'center', marginTop: 16 },
});
