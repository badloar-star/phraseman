// ════════════════════════════════════════════════════════════════════════════
// paywallShared.tsx — общий «хром» пейволов A/B/C: фон, цвета темы, глиф
// контекста, соцстрока (рейтинг ТОЛЬКО из конфига), sticky-CTA и разделитель.
// Дизайн-язык «Атриум»: один акцент темы, hairline-линии, медленный свет.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, Platform, StyleSheet, TouchableOpacity,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../ThemeContext';
import { getPaywallThemeConfig, type ThemePaywallConfig } from '../paywallThemeConfig';
import { getPaywallSocialProof } from '../../app/paywall_variant';
import type { PremiumContext } from '../../app/premium_context';
import { triLang, type Lang } from '../../constants/i18n';
import { BG_GRADIENTS as SCREEN_BG_GRADIENTS } from '../../constants/screenBackground';
import type { ThemeMode } from '../../constants/theme';
import { compassIconSource } from '../../constants/weeklyCompassIcons';

// ── фоновые градиенты (как в premium_modal_v2; незнакомая тема → dark) ───────
function screenBgTuple(themeMode: string): [string, string, string] {
  const stops = SCREEN_BG_GRADIENTS[themeMode as keyof typeof SCREEN_BG_GRADIENTS] ?? SCREEN_BG_GRADIENTS.dark;
  return [stops[0], stops[1] ?? stops[0], stops[2] ?? stops[1] ?? stops[0]];
}

export interface PaywallChrome {
  tc: ThemePaywallConfig;
  themeMode: string;
  isLight: boolean;
  bgColors: [string, string, string];
  textPrimary: string;
  textMuted: string;
  divider: string;
  cardBg: string;
  cardBorder: string;
  uncheckedBorder: string;
}

/** Цветовая обвязка пейвола, адаптивная к теме (паттерн v2). */
export function usePaywallChrome(): PaywallChrome {
  const { themeMode } = useTheme();
  return useMemo(() => {
    const isLight = false;
    return {
      tc: getPaywallThemeConfig(themeMode),
      themeMode,
      isLight,
      bgColors: screenBgTuple(themeMode),
      textPrimary: isLight ? '#0c0c18' : '#FFFFFF',
      // P1-3: 0.55 → 0.62 — мелкий приглушённый текст (цены-капсы, подписи,
      // юр.строка) был на грани читаемости на тёмном фоне.
      textMuted: isLight ? 'rgba(12,12,24,0.62)' : 'rgba(255,255,255,0.62)',
      divider: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      cardBg: isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.035)',
      cardBorder: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      uncheckedBorder: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)',
    };
  }, [themeMode]);
}

// ── глиф контекста (SVG-иконки Ionicons вместо эмодзи-зоопарка) ──────────────
const CONTEXT_GLYPH: Partial<Record<PremiumContext, keyof typeof Ionicons.glyphMap>> = {
  no_energy: 'flash',
  arena: 'trophy',
  course_after_lesson3: 'book',
  lesson_b1: 'book',
  quiz_limit: 'extension-puzzle',
  quiz_level: 'extension-puzzle',
  quiz_medium: 'extension-puzzle',
  quiz_hard: 'flame',
  flashcard_limit: 'albums',
  streak: 'flame',
  theme: 'color-palette',
  club: 'people',
  trainer: 'barbell',
  trainer_limit: 'barbell',
  smart_trainer: 'sparkles',
  dialog_limit: 'compass-outline',
  speaking: 'mic',
  diagnosis_training: 'pulse',
  mastery: 'ribbon',
  stats: 'stats-chart',
  heatmap: 'grid',
  patterns: 'analytics',
  percentiles: 'podium',
  personal_plan: 'map',
  intro_ended: 'hourglass',
  level_up: 'trending-up',
  generic: 'diamond',
};

export function contextGlyph(ctx: PremiumContext): keyof typeof Ionicons.glyphMap {
  return CONTEXT_GLYPH[ctx] ?? 'diamond';
}

/** Капсула с глифом контекста + тёплое свечение акцента. */
export function PaywallGlyphCapsule({ ctx, chrome }: { ctx: PremiumContext; chrome: PaywallChrome }) {
  const { tc, cardBorder } = chrome;
  const isDialogLimit = ctx === 'dialog_limit';
  return (
    <View style={[S.glyphCap, { borderColor: cardBorder, shadowColor: tc.heroAccent, backgroundColor: `${tc.heroAccent}10` }]}>
      {isDialogLimit ? (
        <Image source={compassIconSource(chrome.themeMode as ThemeMode)} style={S.glyphCompassImage} contentFit="contain" />
      ) : (
        <Ionicons name={contextGlyph(ctx)} size={28} color={tc.heroAccent} />
      )}
    </View>
  );
}

// ── соцстрока: ТОЛЬКО реальные числа из remote_config/paywall_ab ─────────────
export function PaywallSocialRow({ lang, chrome }: { lang: Lang; chrome: PaywallChrome }) {
  const { rating, count } = getPaywallSocialProof();
  if (rating === null) return null;
  const store = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  const countLabel = count !== null
    ? ' · ' + triLang(lang, {
        ru: `${count.toLocaleString('ru-RU')} оценок`,
        uk: `${count.toLocaleString('uk-UA')} оцінок`,
        es: `${count.toLocaleString('es-ES')} reseñas`,
      })
    : '';
  return (
    <View style={S.socialRow}>
      <View style={S.starsRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Ionicons key={i} name="star" size={11} color={chrome.tc.socialProofStarColor} />
        ))}
      </View>
      <Text style={[S.socialText, { color: chrome.tc.socialProofText }]}>
        {rating.toFixed(1)} · {store}{countLabel}
      </Text>
    </View>
  );
}

// ── разделитель «для сомневающихся» ──────────────────────────────────────────
export function PaywallSectionDivider({ label, chrome }: { label: string; chrome: PaywallChrome }) {
  return (
    <View style={S.dividerRow}>
      <View style={[S.dividerLine, { backgroundColor: chrome.cardBorder }]} />
      <Text style={[S.dividerText, { color: chrome.textMuted }]}>{label.toUpperCase()}</Text>
      <View style={[S.dividerLine, { backgroundColor: chrome.cardBorder }]} />
    </View>
  );
}

// ── sticky-CTA: цена и кнопка не покидают экран при скролле ──────────────────
// Правило без исключений во всех гайдах: CTA+цена видны всегда; на длинных
// экранах это решает закреплённый бар (+31% конверсии в сопоставимых замерах).
export function useStickyCta() {
  // H-PAYSCROLL: раньше onScroll делал setScrollY на КАЖДЫЙ кадр скролла (~30/с при
  // scrollEventThrottle=32), перерисовывая всё дерево пейвола → джанк на слабом Android.
  // Теперь геометрия (scrollY и layout-метрики) живёт в ref, а в state попадает ТОЛЬКО
  // булево `visible` и только когда оно реально меняется (1–2 раза за показ/скрытие).
  const [visible, setVisible] = useState(false);
  const metricsRef = useRef({ ctaTop: 0, ctaBottom: 0, viewportH: 0, scrollY: 0 });
  const visibleRef = useRef(false);

  const recompute = useCallback(() => {
    const { ctaTop, ctaBottom, viewportH, scrollY } = metricsRef.current;
    const measured = ctaBottom > 0 && viewportH > 0;
    const ctaAboveViewport = measured && ctaBottom < scrollY + 36;
    const ctaBelowViewport = measured && ctaTop > scrollY + viewportH - 36;
    const next = measured && (ctaAboveViewport || ctaBelowViewport);
    if (next !== visibleRef.current) {
      visibleRef.current = next;
      setVisible(next);
    }
  }, []);

  /** Повесить на обёртку CTA, лежащую ПРЯМЫМ ребёнком scroll-контента. */
  const onCtaLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    metricsRef.current.ctaTop = y;
    metricsRef.current.ctaBottom = y + height;
    recompute();
  }, [recompute]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    metricsRef.current.scrollY = e.nativeEvent.contentOffset.y;
    recompute();
  }, [recompute]);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    metricsRef.current.viewportH = e.nativeEvent.layout.height;
    recompute();
  }, [recompute]);

  return { visible, onCtaLayout, onScroll, onViewportLayout };
}

export function PaywallStickyBar({
  visible, title, sub, button, onPress, chrome,
}: {
  visible: boolean;
  title: string;
  sub: string;
  button: string;
  onPress: () => void;
  chrome: PaywallChrome;
}) {
  if (!visible) return null;
  const { tc, isLight } = chrome;
  return (
    <View style={[S.sticky, {
      backgroundColor: isLight ? 'rgba(244,244,250,0.97)' : 'rgba(22,20,15,0.94)',
      borderColor: tc.selectedCardBorder,
    }]}>
      <View style={S.stickyTextWrap}>
        <Text style={[S.stickyTitle, { color: chrome.textPrimary }]} numberOfLines={1}>{title}</Text>
        <Text style={[S.stickySub, { color: chrome.textMuted }]} numberOfLines={1}>{sub}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[S.stickyBtn, { backgroundColor: tc.ctaBg }]}>
        <Text style={[S.stickyBtnText, { color: tc.ctaText }]}>{button}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── личный «болевой» тег: единый chip-вид во всех вариантах (P1-4) ───────────
// Принимает уже локализованный текст (компонент остаётся dumb, без импорта
// paywall_copy). Несколько тегов — просто колонка чипов.
export function PaywallPersonalTags({ texts, chrome }: { texts: string[]; chrome: PaywallChrome }) {
  if (!texts.length) return null;
  const { tc, textPrimary } = chrome;
  return (
    <View style={S.tagWrap}>
      {texts.map((t, i) => (
        <View key={i} style={[S.tagChip, { backgroundColor: `${tc.heroAccent}14`, borderColor: `${tc.heroAccent}33` }]}>
          <Ionicons name="sparkles" size={12} color={tc.heroAccent} style={{ marginRight: 6 }} />
          <Text style={[S.tagText, { color: textPrimary }]} numberOfLines={2}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  tagWrap: { gap: 7, marginTop: 12, alignSelf: 'stretch' },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    maxWidth: '100%', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  tagText: { flexShrink: 1, fontSize: 11.5, fontWeight: '600' },
  glyphCap: {
    alignSelf: 'center', width: 62, height: 62, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 6,
  },
  glyphCompassImage: { height: 54, width: 54 },
  socialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 },
  starsRow: { flexDirection: 'row', gap: 1.5 },
  socialText: { fontSize: 11.5, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginBottom: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  sticky: {
    position: 'absolute', left: 10, right: 10, bottom: 12, zIndex: 50,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingLeft: 15, paddingRight: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 14,
  },
  stickyTextWrap: { flex: 1, minWidth: 0 },
  stickyTitle: { fontSize: 12.5, fontWeight: '800' },
  stickySub: { fontSize: 10.5, marginTop: 1, fontVariant: ['tabular-nums'] },
  stickyBtn: { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 18 },
  stickyBtnText: { fontSize: 13, fontWeight: '800' },
});
