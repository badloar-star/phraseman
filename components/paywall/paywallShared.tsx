// ════════════════════════════════════════════════════════════════════════════
// paywallShared.tsx — общий «хром» пейволов A/B/C: фон, цвета темы, глиф
// контекста, соцстрока (рейтинг ТОЛЬКО из конфига), sticky-CTA и разделитель.
// Дизайн-язык «Атриум»: один акцент темы, hairline-линии, медленный свет.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  View, Text, Platform, StyleSheet, TouchableOpacity, Animated, Easing,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
  type ViewStyle, type StyleProp,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../SafeLinearGradient';

import { useTheme } from '../ThemeContext';
import { getPaywallThemeConfig, type ThemePaywallConfig } from '../paywallThemeConfig';
import { getPaywallSocialProof } from '../../app/paywall_variant';
import type { PremiumContext } from '../../app/premium_context';
import { triLang, type Lang } from '../../constants/i18n';
import { BG_GRADIENTS as SCREEN_BG_GRADIENTS } from '../../constants/screenBackground';
import type { ThemeMode } from '../../constants/theme';
import { compassIconSource } from '../../constants/weeklyCompassIcons';

// ── фоновые градиенты активных A/B/C paywall-экранов; незнакомая тема → dark ──
function screenBgTuple(themeMode: string): [string, string, string] {
  const stops = SCREEN_BG_GRADIENTS[themeMode as keyof typeof SCREEN_BG_GRADIENTS] ?? SCREEN_BG_GRADIENTS.dark;
  return [stops[0], stops[1] ?? stops[0], stops[2] ?? stops[1] ?? stops[0]];
}

export interface PaywallChrome {
  tc: ThemePaywallConfig;
  themeMode: string;
  bgColors: [string, string, string];
  textPrimary: string;
  textMuted: string;
  divider: string;
  cardBg: string;
  cardBgStrong: string;
  cardBorder: string;
  uncheckedBorder: string;
}

/** Цветовая обвязка пейвола, адаптивная к теме (паттерн v2). */
export function usePaywallChrome(overrideThemeMode?: ThemeMode): PaywallChrome {
  const { themeMode } = useTheme();
  return useMemo(() => {
    const mode = overrideThemeMode ?? themeMode;
    const tc = getPaywallThemeConfig(mode);
    return {
      tc,
      themeMode: mode,
      bgColors: screenBgTuple(mode),
      textPrimary: '#FFFFFF',
      textMuted: 'rgba(255,255,255,0.62)',
      divider: 'rgba(255,255,255,0.06)',
      cardBg: tc.panelBg,
      cardBgStrong: tc.panelBgStrong,
      cardBorder: 'rgba(255,255,255,0.08)',
      uncheckedBorder: 'rgba(255,255,255,0.22)',
    };
  }, [overrideThemeMode, themeMode]);
}

/**
 * Опции навигации экрана пейвола, зависящие от источника.
 *
 *  - Из приложения (winback/intro/level_up/…): модал «выезжает снизу» — привычный
 *    in-app upsell-жест.
 *  - С ОНБОРДИНГА: открывается как обычный экран — МГНОВЕННО (animation:'none'),
 *    БЕЗ выезда снизу и без мелькания «Главной». Раньше слайд-модал на ~300 мс
 *    показывал «Главную» за прозрачным диспетчером (риск Apple 5.6 + некрасиво).
 *    Непрозрачный онбординг-фон пейвола мгновенно перекрывает «Главную», а всю
 *    «анимацию открытия» даёт JS: плавное затемнение фона до 90% + проявление
 *    контента (см. PaywallBackground/opacity-slideY в экранах). Поэтому screen-fade
 *    НЕ нужен — он бы кратко показал «Главную» сквозь полупрозрачный кадр.
 *
 * Рендерится ВНУТРИ экрана пейвола (<Stack.Screen options={…} />) — это
 * документированный способ expo-router задать опции на конкретный инстанс,
 * не плодя отдельные маршруты под онбординг.
 */
export function paywallScreenStackOptions(isOnboarding: boolean) {
  if (isOnboarding) {
    // Онбординг-пейвол — часть линейного флоу: swipe-dismiss его сломал бы
    // (пользователь обходит paywall_purchase без выбора), оставляем gesture off.
    return { presentation: 'card', animation: 'none', animationDuration: 0, gestureEnabled: false } as const;
  }
  // Outside onboarding the paywall is a real bottom modal: it opens from the
  // bottom, closes down, and can be dismissed with the native modal gesture.
  return { presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true } as const;
}

/**
 * Стабильная ссылка на опции <Stack.Screen> для экранов пейвола.
 *
 * КРИТИЧНО: expo-router `<Screen options={…}>` вызывает navigation.setOptions в
 * layout-эффекте с зависимостью от `options`. Если передавать НОВЫЙ объект на
 * каждый рендер (как `paywallScreenStackOptions(...)` напрямую в JSX), эффект
 * срабатывает каждый рендер → setOptions → апдейт навигатора → ре-рендер → … →
 * «Maximum update depth exceeded». Мемоизация по isOnboarding даёт постоянную
 * ссылку, и эффект отрабатывает один раз.
 */
export function usePaywallScreenStackOptions(isOnboarding: boolean) {
  return useMemo(() => paywallScreenStackOptions(isOnboarding), [isOnboarding]);
}

// Плавное затемнение фона онбординг-пейвола: вход 0→80%, выход обратно. Затемнение
// убирает отвлекающий фон, чтобы текст пейвола читался. Намеренно медленное (4с),
// чтобы фон не «вспыхивал» чёрным, а плавно темнел при открытии и так же плавно
// светлел при переходе на следующий экран онбординга.
const ONBOARDING_DIM_OPACITY = 0.8;
const ONBOARDING_DIM_ENTER_DURATION = 4000;
const ONBOARDING_DIM_EXIT_DURATION = 4000;

/** Императивный хэндл, который экран пейвола использует для проигрывания обратного
 *  затемнения ПЕРЕД уходом на следующий экран онбординга. */
export interface PaywallBackgroundHandle {
  /** Проиграть обратное затемнение (0.9→0), затем вызвать done(). Если затемнения
   *  нет (не онбординг) — done() вызывается сразу. */
  animateExit: (done: () => void) => void;
}

/** Фон пейвола: онбординг-картинка (source=onboarding_plan) или тёмный градиент.
 *  На онбординге поверх картинки плавно проявляется затемнение до 90%. */
export const PaywallBackground = React.forwardRef<PaywallBackgroundHandle, {
  isOnboarding: boolean;
  gradientColors: [string, string, string];
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}>(function PaywallBackground({ isOnboarding, gradientColors, style, children }, ref) {
  const dim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnboarding) return;
    // Вход: плавно (4с) затемняем фон до 80%.
    const anim = Animated.timing(dim, {
      toValue: ONBOARDING_DIM_OPACITY,
      duration: ONBOARDING_DIM_ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [isOnboarding, dim]);

  useImperativeHandle(ref, () => ({
    animateExit: (done: () => void) => {
      if (!isOnboarding) { done(); return; }
      // Выход: плавно (4с) осветляем фон обратно, затем уводим на следующий экран.
      Animated.timing(dim, {
        toValue: 0,
        duration: ONBOARDING_DIM_EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => done());
    },
  }), [isOnboarding, dim]);

  if (isOnboarding) {
    return (
      <LinearGradient
        colors={['#010102', '#050713', '#0A1025']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[{ flex: 1 }, style]}
      >
        <View pointerEvents="none" style={S.onboardingLiquidGlowA} />
        <View pointerEvents="none" style={S.onboardingLiquidGlowB} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#010102', opacity: dim }]}
        />
        {children}
      </LinearGradient>
    );
  }
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
});

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
  flashcard_training: 'school',
  flashcard_autoplay: 'play-circle',
  streak: 'flame',
  theme: 'color-palette',
  club: 'people',
  trainer: 'barbell',
  trainer_limit: 'barbell',
  smart_trainer: 'sparkles',
  dialog_limit: 'compass-outline',
  dialog_locked_level: 'lock-closed',
  dialog_analysis: 'chatbubbles',
  ai_voice_input: 'mic-circle',
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
  premium_expired: 'refresh-circle',
  vip_expired: 'star',
  notification_upsell: 'notifications',
  language_add: 'globe',
  ai_explain: 'bulb',
  weekly_review: 'calendar',
  avatar_aura: 'color-wand',
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
        <Ionicons name={contextGlyph(ctx)} size={32} color={tc.heroAccent} />
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
        'pt-BR': `${count.toLocaleString('pt-BR')} avaliações`,
        vi: `${count.toLocaleString('vi-VN')} đánh giá`,
        id: `${count.toLocaleString('id-ID')} ulasan`,
        tr: `${count.toLocaleString('tr-TR')} değerlendirme`,
        pl: `${count.toLocaleString('pl-PL')} ocen`,
      })
    : '';
  return (
    <View style={S.socialRow}>
      <View style={S.starsRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Ionicons key={i} name="star" size={13} color={chrome.tc.socialProofStarColor} />
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

/**
 * Баннер «не удалось загрузить цены» с кнопкой ретрая. Показывается, когда
 * офферинги RevenueCat не загрузились — иначе кнопки (включая Phraseman Pro) молча
 * пропадают, и пользователь думает, что приложение сломано.
 */
export function PaywallPriceRetry({ lang, chrome, onRetry }: {
  lang: Lang;
  chrome: PaywallChrome;
  onRetry: () => void;
}) {
  return (
    <View style={[S.priceRetryBox, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
      <Ionicons name="cloud-offline-outline" size={20} color={chrome.textMuted} />
      <Text style={[S.priceRetryText, { color: chrome.textMuted }]}>
        {triLang(lang, {
          ru: 'Не удалось загрузить цены из магазина. Проверь интернет и попробуй ещё раз.',
          uk: 'Не вдалося завантажити ціни з магазину. Перевір інтернет і спробуй ще раз.',
          es: 'No se pudieron cargar los precios. Revisa tu conexión e inténtalo de nuevo.',
          'pt-BR': 'Não foi possível carregar os preços da loja. Verifique sua internet e tente novamente.',
          vi: 'Không tải được giá từ cửa hàng. Hãy kiểm tra internet rồi thử lại.',
          id: 'Tidak bisa memuat harga dari toko. Periksa internet lalu coba lagi.',
          tr: 'Mağaza fiyatları yüklenemedi. İnternetini kontrol edip tekrar dene.',
          pl: 'Nie udało się załadować cen ze sklepu. Sprawdź internet i spróbuj ponownie.',
        })}
      </Text>
      <TouchableOpacity
        testID="data-paywall-price-retry"
        onPress={onRetry}
        style={[S.priceRetryBtn, { backgroundColor: chrome.tc.ctaBg }]}
        activeOpacity={0.82}
      >
        <Text style={[S.priceRetryBtnText, { color: chrome.tc.ctaText }]}>
          {triLang(lang, {
            ru: 'Повторить',
            uk: 'Повторити',
            es: 'Reintentar',
            'pt-BR': 'Tentar de novo',
            vi: 'Thử lại',
            id: 'Coba lagi',
            tr: 'Tekrar dene',
            pl: 'Spróbuj ponownie',
          })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** Кнопка закрытия пейвола — единый вид на A/B/C. */
export function PaywallCloseButton({ onPress, chrome, style }: {
  onPress: () => void;
  chrome: PaywallChrome;
  style?: object;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[S.closeBtn, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }, style]}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
    >
      <Ionicons name="close" size={18} color={chrome.textMuted} />
    </TouchableOpacity>
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
    // P2-5: гистерезис ±12px — sticky-бар не мерцает на границе вьюпорта.
    // Показываем если вышли за порог, скрываем только когда вернулись с запасом.
    if (next && !visibleRef.current) {
      visibleRef.current = true;
      setVisible(true);
    } else if (!next && visibleRef.current) {
      const { ctaTop: cTop, ctaBottom: cBot, viewportH: vH, scrollY: sY } = metricsRef.current;
      const safeAbove = cBot < sY + 36 - 12;
      const safeBelow = cTop > sY + vH - 36 + 12;
      const stillOut = (cBot > 0 && vH > 0) && (safeAbove || safeBelow);
      if (!stillOut) {
        visibleRef.current = false;
        setVisible(false);
      }
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
  const { tc } = chrome;
  return (
    <View style={[S.sticky, {
      backgroundColor: 'rgba(22,20,15,0.94)',
      borderColor: tc.selectedCardBorder,
    }]}>
      <View style={S.stickyTextWrap}>
        <Text style={[S.stickyTitle, { color: chrome.textPrimary }]} numberOfLines={1}>{title}</Text>
        <Text style={[S.stickySub, { color: chrome.textMuted }]} numberOfLines={2}>{sub}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[S.stickyBtn, { backgroundColor: tc.ctaBg }]}>
        {chrome.themeMode === 'midnight' ? (
          <LinearGradient
            colors={['#D7E0FF', '#8FA0FF', '#A95BFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}
        <Text style={[S.stickyBtnText, { color: tc.ctaText }]}>{button}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── отзывы учеников: единый вид во всех вариантах A/B/C ──────────────────────
// Раньше блок жил только в B. Теперь общий компонент: A/C тоже показывают
// verified-отзывы. Анти-фейк гард — в pickTestimonials (прод отдаёт только
// verified). Принимает уже подобранные отзывы; нет отзывов → null.
export function PaywallTestimonials({
  items, lang, chrome,
}: {
  items: { text: string; author: string }[];
  lang: Lang;
  chrome: PaywallChrome;
}) {
  if (!items.length) return null;
  const { tc, cardBg, cardBorder, textPrimary, textMuted } = chrome;
  return (
    <View style={[S.testimonialCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <Text style={[S.testimonialTitle, { color: tc.heroAccent }]}>
        {triLang(lang, {
          ru: 'ЧТО ГОВОРЯТ УЧЕНИКИ', uk: 'ЩО КАЖУТЬ УЧНІ', es: 'LO QUE DICEN LOS ALUMNOS',
          'pt-BR': 'O QUE DIZEM OS ALUNOS', vi: 'HỌC VIÊN NÓI GÌ', id: 'KATA PARA MURID',
          tr: 'ÖĞRENCİLER NE DİYOR', pl: 'CO MÓWIĄ UCZNIOWIE',
        })}
      </Text>
      {items.map((tm, i) => (
        <View key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
          <Text style={[S.testimonialText, { color: textPrimary }]}>{tm.text}</Text>
          <Text style={[S.testimonialAuthor, { color: textMuted }]}>— {tm.author}</Text>
        </View>
      ))}
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
          <Ionicons name="sparkles" size={14} color={tc.heroAccent} style={{ marginRight: 7 }} />
          <Text style={[S.tagText, { color: textPrimary }]} numberOfLines={2}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  onboardingLiquidGlowA: {
    position: 'absolute',
    left: -130,
    top: -100,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(91,124,255,0.26)',
    opacity: 0.9,
    transform: [{ rotate: '18deg' }],
  },
  onboardingLiquidGlowB: {
    position: 'absolute',
    right: -150,
    bottom: -130,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(169,91,255,0.24)',
    opacity: 0.86,
    transform: [{ rotate: '-12deg' }],
  },
  closeBtn: {
    alignSelf: 'flex-end', marginBottom: 7,
    width: 36, height: 36, borderRadius: 18, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  priceRetryBox: {
    alignSelf: 'stretch', alignItems: 'center', gap: 12,
    paddingVertical: 22, paddingHorizontal: 19, marginTop: 10,
    borderRadius: 16, borderWidth: 0,
  },
  priceRetryText: { fontSize: 15.5, lineHeight: 22, textAlign: 'center' },
  priceRetryBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 14 },
  priceRetryBtnText: { fontSize: 16.5, fontWeight: '900' },
  tagWrap: { gap: 8, marginTop: 14, alignSelf: 'stretch' },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    maxWidth: '100%', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 0,
  },
  tagText: { flexShrink: 1, fontSize: 13, fontWeight: '700' },
  testimonialCard: { borderRadius: 18, borderWidth: 0, paddingHorizontal: 17, paddingVertical: 15, marginTop: 14 },
  testimonialTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0, marginBottom: 10 },
  testimonialText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  testimonialAuthor: { fontSize: 12, marginTop: 5 },
  glyphCap: {
    alignSelf: 'center', width: 70, height: 70, borderRadius: 35, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.38, shadowRadius: 20, elevation: 7,
  },
  glyphCompassImage: { height: 62, width: 62 },
  socialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  starsRow: { flexDirection: 'row', gap: 2 },
  socialText: { fontSize: 13, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 3 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0 },
  sticky: {
    position: 'absolute', left: 10, right: 10, bottom: 12, zIndex: 50,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 20, borderWidth: 0, paddingVertical: 12, paddingLeft: 16, paddingRight: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 14,
  },
  stickyTextWrap: { flex: 1, minWidth: 0 },
  stickyTitle: { fontSize: 14, fontWeight: '900' },
  stickySub: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  stickyBtn: { borderRadius: 15, paddingVertical: 12, paddingHorizontal: 19, overflow: 'hidden' },
  stickyBtnText: { fontSize: 14.5, fontWeight: '900' },
});
