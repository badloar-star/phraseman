// Героический модал бонуса дня — тот же класс празднования, что Супервоскресенье.
//
// зачем (владелец, 2026-09-21): вчера DoubleRewardSheet получил объёмную
// эмблему с металлом, 3D-разворотом и каскадом строк, и владелец попросил такой
// же модал ОСТАЛЬНЫМ бонусам. Раньше пять «тихих» бонусов показывали серую
// заглушку RetiredRasterFallback — рядом с воскресным экраном это выглядело
// как недоделка.
//
// ЧИСТАЯ ПРЕЗЕНТАЦИЯ. Бонус уже активен до монтажа этой поверхности: закрытие
// только отпускает владение оверлеем и НИКОГДА не трогает право на награду.
// Ничего не пишется в AsyncStorage — празднование не ставится в durable-очередь
// (правило владельца: поздравляем фактом, а не записью).

import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { triLang, type Lang } from '../constants/i18n';
import { isLightSurface, readableOn, buttonForegroundForBackground } from '../constants/color_contrast';
import { getBoonCopy } from '../app/boons/boon_copy';
import { getBoonFacts } from '../app/boons/boon_facts_copy';
import type { BoonId } from '../app/boons/boon_types';
import { useReduceMotionPreference } from '../hooks/use_reduce_motion';
import BoonHeroEmblem from './boon_hero/BoonHeroEmblem';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import PressableHybrid from './PressableHybrid';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';

interface BoonHeroSheetProps {
  visible: boolean;
  boon: BoonId;
  lang: Lang;
  onClose: () => void;
}

function BoonHeroSheet({ visible, boon, lang, onClose }: BoonHeroSheetProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotionPreference();
  const progress = useRef(new Animated.Value(1)).current;

  const copy = getBoonCopy(boon, lang);
  const facts = getBoonFacts(boon, lang);
  const chrome = triLang(lang, {
    ru: { kicker: 'Бонус дня', cta: 'Продолжить', close: 'Закрыть', auto: 'Бонус уже работает — нажимать ничего не нужно' },
    uk: { kicker: 'Бонус дня', cta: 'Продовжити', close: 'Закрити', auto: 'Бонус уже працює — натискати нічого не треба' },
    en: { kicker: 'Daily bonus', cta: 'Continue', close: 'Close', auto: 'The bonus is already on — nothing to tap' },
    es: { kicker: 'Bono del día', cta: 'Continuar', close: 'Cerrar', auto: 'El bono ya está activo: no hay que tocar nada' },
    'pt-BR': { kicker: 'Bônus do dia', cta: 'Continuar', close: 'Fechar', auto: 'O bônus já está ativo — não precisa tocar em nada' },
    vi: { kicker: 'Ưu đãi hôm nay', cta: 'Tiếp tục', close: 'Đóng', auto: 'Ưu đãi đã bật sẵn — bạn không cần làm gì' },
    id: { kicker: 'Bonus hari ini', cta: 'Lanjutkan', close: 'Tutup', auto: 'Bonus sudah aktif — tidak perlu menekan apa pun' },
    tr: { kicker: 'Günün bonusu', cta: 'Devam et', close: 'Kapat', auto: 'Bonus çoktan etkin — bir şeye dokunmana gerek yok' },
    pl: { kicker: 'Bonus dnia', cta: 'Kontynuuj', close: 'Zamknij', auto: 'Bonus już działa — nic nie trzeba naciskać' },
  });

  const accentText = readableOn(t.accent, t.bgCard, 4.5);
  const mutedText = readableOn(t.textMuted, t.bgCard, 4.5);
  const highlight = isLightSurface(t.bgCard) ? t.accent : t.textPrimary;
  const ctaForeground = buttonForegroundForBackground(t.accent);

  useEffect(() => {
    progress.stopAnimation();
    // зачем: при «меньше движения» контент обязан быть виден целиком СРАЗУ —
    // иначе reveal-интерполяции оставят экран пустым (класс бага «reveal не
    // сработал — раздел уехал пустым»).
    if (!visible || reduceMotion !== false) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      delay: 180,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, visible]);

  const reveal = (start: number) => ({
    opacity: progress.interpolate({ inputRange: [start, start + 0.15], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [start, start + 0.15], outputRange: [16, 0], extrapolate: 'clamp' as const }) },
    ],
  });

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={chrome.close}
      backdropAccessible={false}
      glowColor={t.accent}
      testID={`boon-hero-sheet-${boon}`}
    >
      {({ requestDismiss }) => (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={chrome.close}
            onPress={requestDismiss}
            style={styles.close}
            hitSlop={4}
          >
            <Text style={[styles.closeText, { color: mutedText }]} accessible={false}>×</Text>
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View
              style={styles.hero}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
            >
              <Animated.View
                style={[
                  styles.orbit,
                  {
                    opacity: progress.interpolate({ inputRange: [0.12, 0.65], outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [
                      { rotate: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: ['-70deg', '-25deg', '-25deg'] }) },
                    ],
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 300 220">
                  <Ellipse cx="150" cy="110" rx="125" ry="48" stroke={t.accent} strokeOpacity={0.32} strokeWidth={1} fill="none" />
                </Svg>
              </Animated.View>

              <Animated.View
                style={[
                  styles.emblem,
                  {
                    opacity: progress.interpolate({ inputRange: [0, 0.12], outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [
                      { perspective: 650 },
                      { translateY: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: [-32, 4, 0, 0] }) },
                      { rotateY: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: ['-65deg', '8deg', '0deg', '0deg'] }) },
                      { scale: progress.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: [0.65, 1.04, 1, 1] }) },
                    ],
                  },
                ]}
              >
                <BoonHeroEmblem boon={boon} accent={t.accent} shade={t.btnShadow} highlight={highlight} />
              </Animated.View>

              {reduceMotion === false && (
                <Animated.View
                  style={[
                    styles.glint,
                    {
                      opacity: progress.interpolate({ inputRange: [0, 0.4, 0.55, 0.8, 1], outputRange: [0, 0, 0.65, 0, 0] }),
                      transform: [
                        { translateX: progress.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [-110, -110, 110, 110] }) },
                        { rotate: '-30deg' },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', highlight, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              )}
            </View>

            <Animated.View style={reveal(0.2)}>
              <Text maxFontSizeMultiplier={2} style={[styles.kicker, { color: accentText }]}>{chrome.kicker}</Text>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={2}
                style={[styles.title, { color: t.textPrimary, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.15) }]}
              >
                {copy.title}
              </Text>
            </Animated.View>

            <Animated.View style={reveal(0.28)}>
              <Text
                maxFontSizeMultiplier={2}
                style={[styles.description, { color: mutedText, fontSize: f.body, lineHeight: Math.round(f.body * 1.5) }]}
              >
                {copy.subtitle}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.facts, { borderColor: t.border }, reveal(0.36)]}>{/* guard-ok: не рамка вокруг блока, а hairline-линейки сверху/снизу полосы фактов — приём утверждённого эталона DoubleRewardSheet.tsx */}
              <View style={styles.fact}>
                <Text maxFontSizeMultiplier={2} style={[styles.factLabel, { color: mutedText }]}>{facts.effect.label}</Text>
                <Text maxFontSizeMultiplier={2} style={[styles.factValue, { color: t.textPrimary }]}>{facts.effect.value}</Text>
              </View>
              <View style={[styles.fact, styles.lastFact, { borderColor: t.border }]}>{/* guard-ok: одна вертикальная линейка-разделитель между двумя графами, обводки нет */}
                <Text maxFontSizeMultiplier={2} style={[styles.factLabel, { color: mutedText }]}>{facts.duration.label}</Text>
                <Text maxFontSizeMultiplier={2} style={[styles.factValue, { color: t.textPrimary }]}>{facts.duration.value}</Text>
              </View>
            </Animated.View>
          </ScrollView>

          <Animated.View style={[styles.footer, reveal(0.44)]}>
            <PressableHybrid
              accessibilityLabel={chrome.cta}
              accessibilityHint={chrome.close}
              variant="primary"
              onPress={requestDismiss}
              contentStyle={[styles.cta, { backgroundColor: t.accent }]}
            >
              <Text
                testID="boon-hero-cta-text"
                maxFontSizeMultiplier={2}
                style={[styles.ctaText, { color: ctaForeground, fontSize: f.body }]}
              >
                {chrome.cta}
              </Text>
            </PressableHybrid>
            <Text maxFontSizeMultiplier={2} style={[styles.footnote, { color: mutedText }]}>{chrome.auto}</Text>
          </Animated.View>
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(BoonHeroSheet);

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { paddingBottom: 8 },
  close: { position: 'absolute', right: 8, top: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeText: { fontSize: 28 },
  hero: { height: 220, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 300, maxWidth: '100%', height: 220 },
  emblem: { width: 300, maxWidth: '100%', height: 220 },
  glint: { position: 'absolute', width: 210, height: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textAlign: 'center', textTransform: 'uppercase' },
  title: { fontWeight: '700', letterSpacing: -1, textAlign: 'center', marginTop: 12 },
  description: { textAlign: 'center', marginTop: 12, paddingHorizontal: 6 },
  facts: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  fact: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  lastFact: { borderLeftWidth: StyleSheet.hairlineWidth },
  factLabel: { fontSize: 12, marginBottom: 6 },
  factValue: { fontSize: 14, fontWeight: '600' },
  footer: { flexShrink: 0, paddingTop: 8 },
  cta: { minHeight: 54, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', textAlign: 'center' },
  footnote: { fontSize: 11, textAlign: 'center', marginTop: 16 },
});
