import React, { memo, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import PressableScale from '../PressableScale';
import PrimaryButton from '../ui/PrimaryButton';
import { MOTION_DURATION, MOTION_SPRING_LEGACY } from '../../constants/motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import {
  rewardModalAccentColor,
  rewardModalGlowLayers,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from '../RewardModalBackdrop';

/**
 * RewardCardV2 — единая анатомия модалок (стандарт 2026-06):
 * кикер → кольцо с артом → заголовок → значение → причина (опц.) → CTA → ghost.
 * Семантика задаётся ТОЛЬКО цветом кикера/кольца, форма всегда одна.
 * Дизайн-контракт: docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md (раздел 5)
 * и docs/reports/modal_redesign_mockups_2026-06-10.html.
 *
 * RewardCardBody — презентационное тело без Modal/бэкдропа: его использует
 * Используется очередями наград и будущими встроенными сценариями.
 */
export type RewardCardSemantic = 'gold' | 'shards' | 'danger' | 'warning' | 'social' | 'neutral' | 'fire';

export type RewardCardBodyProps = {
  /** Короткая строка-категория сверху, БЕЗ эмодзи: «Уровень 12 · Эпический». */
  kicker: string;
  /** Allows a long kicker to wrap instead of being truncated with an ellipsis. */
  allowKickerWrap?: boolean;
  /** Контент кольца: строка = эмодзи, иначе любой ReactNode (Image/SVG). */
  icon: React.ReactNode;
  title: string;
  value?: string;
  reasonLabel?: string;
  reasonText?: string;
  ctaLabel: string;
  onCta: () => void;
  /** зачем: владелец (2026-08-02) — карточке нужен второй, менее громкий путь
      (пример: «Продлить Plus» + «Пригласить друга»). Tonal-кнопка между CTA и
      ghost: мягкая поверхность без обводки, текст акцентом, форма как у CTA. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  ghostLabel?: string;
  onGhost?: () => void;
  semantic?: RewardCardSemantic;
  /** Точечная подмена семантического цвета (hex). */
  accentColor?: string;
  /** Доп. контент между значением и CTA (список наград, точки пейджера и т.п.). */
  children?: React.ReactNode;
};

export type RewardCardV2Props = RewardCardBodyProps & {
  visible: boolean;
  /** Что делает тап по фону. Награды: 'cta' (не теряются). Подтверждения: 'ghost'. */
  backdropAction?: 'cta' | 'ghost' | 'none';
  testID?: string;
};

function withAlpha(hex: string, alpha: string): string {
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${alpha}`;
  return hex;
}

export function rewardSemanticAccent(
  semantic: RewardCardSemantic,
  t: ReturnType<typeof useTheme>['theme'],
  themeMode: ReturnType<typeof useTheme>['themeMode'],
): string {
  switch (semantic) {
    case 'gold': return t.gold;
    case 'shards': return '#6FB1FF';
    case 'danger': return t.wrong;
    case 'warning': return '#FFC857';
    case 'fire': return '#FF7A1A';
    case 'social': return '#D8A6FF';
    case 'neutral':
    default:
      return rewardModalAccentColor(themeMode, t);
  }
}

export function rewardCardBackdropColor(themeMode: ReturnType<typeof useTheme>['themeMode']): string {
  return false ? 'rgba(24,18,10,0.38)' : 'rgba(2,4,8,0.55)';
}

export function RewardCardBody({
  kicker,
  allowKickerWrap = false,
  icon,
  title,
  value,
  reasonLabel,
  reasonText,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  ghostLabel,
  onGhost,
  semantic = 'neutral',
  accentColor,
  children,
}: RewardCardBodyProps) {
  const rewardRuntimeActive = useRuntimeActive();
  const { theme: t, f, ds, themeMode } = useTheme();
  const scale = useRef(new Animated.Value(0.94)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0.4)).current;
  const rafRef = useRef<number | null>(null);
  const entrancePlayedRef = useRef(false);

  useEffect(() => {
    if (!rewardRuntimeActive) {
      halo.stopAnimation();
      halo.setValue(0.4);
      return;
    }
    /** Старт на следующем кадре — Fabric должен закоммитить Animated.View (см. ActionToast). */
    if (!entrancePlayedRef.current) rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      entrancePlayedRef.current = true;
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: MOTION_SPRING_LEGACY.ui.tension,
          friction: MOTION_SPRING_LEGACY.ui.friction,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: MOTION_SPRING_LEGACY.ui.tension,
          friction: MOTION_SPRING_LEGACY.ui.friction,
        }),
        Animated.timing(opacity, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }),
      ]).start();
    });
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ]),
    );
    haloLoop.start();
    return () => {
      haloLoop.stop();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [halo, opacity, rewardRuntimeActive, scale, translateY]);

  const accent = accentColor ?? rewardSemanticAccent(semantic, t, themeMode);
  const panelColors = rewardModalPanelColors(themeMode, t);
  const soft = rewardModalSoftSurface(themeMode, t);
  const panelBorder = rewardModalPanelBorder(themeMode, t, withAlpha(accent, '4D'));
  const cardRadius = ds.radius.xxl;
  // Огненная семантика стрика переливается углём; остальные — чистым акцентом.
  const warmShift = semantic === 'fire' ? '#E23A2E' : undefined;
  const glow = rewardModalGlowLayers(accent, warmShift);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderRadius: cardRadius,
          borderColor: panelBorder,
          backgroundColor: panelColors[1],
          transform: [{ scale }, { translateY }],
          opacity,
        },
      ]}
      /** Тапы по карточке не закрывают её. */
      onStartShouldSetResponder={() => true}
    >
      {/* Базовый материал панели — глубокий многослойный градиент. */}
      <LinearGradient
        colors={panelColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Верхний световой блик — имитация мягкого света сверху. */}
      <LinearGradient
        colors={glow.topHighlight}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topHighlight}
        pointerEvents="none"
      />
      {/* Нижняя цветная вуаль — свечение акцента «из глубины» карточки. */}
      <LinearGradient
        colors={glow.bottomVeil}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomVeil}
        pointerEvents="none"
      />
      {/* Тонкая акцентная нить сверху — благородная засечка. */}
      <LinearGradient
        colors={['transparent', accent, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topline}
        pointerEvents="none"
      />
      {!!kicker && (
        <View style={styles.kickerRow}>
          <View style={[styles.kickerRule, { backgroundColor: withAlpha(accent, '00') }]} />
          <LinearGradient
            colors={['transparent', withAlpha(accent, '88')]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.kickerRuleGrad}
            pointerEvents="none"
          />
          {allowKickerWrap ? (
            <Text style={[styles.kicker, styles.kickerWrap, { color: accent, fontSize: Math.max(11, f.label - 1) }]}>
              {kicker.toUpperCase()}
            </Text>
          ) : (
            <Text style={[styles.kicker, { color: accent, fontSize: Math.max(11, f.label - 1) }]} numberOfLines={1}>
              {kicker.toUpperCase()}
            </Text>
          )}
          <LinearGradient
            colors={[withAlpha(accent, '88'), 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.kickerRuleGrad}
            pointerEvents="none"
          />
          <View style={[styles.kickerRule, { backgroundColor: withAlpha(accent, '00') }]} />
        </View>
      )}
      <View style={styles.ringWrap}>
        {/* Внешнее мягкое гало — пульсирует. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.ringHalo, { borderColor: glow.ringHaloOuter, opacity: halo }]}
        />
        {/* Среднее свечение акцента вокруг кольца. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringGlowMid,
            { borderColor: glow.ringHaloInner, opacity: halo.interpolate({ inputRange: [0.4, 1], outputRange: [0.55, 0.9] }) },
          ]}
        />
        {/* Кольцо с градиентной обводкой (живой металл/пламя) — двойная стенка. */}
        <View style={styles.ringOuter}>
          <LinearGradient
            colors={glow.ringStroke}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.ring, { backgroundColor: panelColors[1] }]}>
            <LinearGradient
              colors={glow.ringInnerGlow}
              start={{ x: 0.5, y: 0.1 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {typeof icon === 'string' ? <Text style={styles.ringEmoji}>{icon}</Text> : icon}
          </View>
        </View>
      </View>
      <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 + 2 }]}>{title}</Text>
      {value ? (
        <Text style={[styles.value, { color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }]}>
          {value}
        </Text>
      ) : null}
      {reasonText ? (
        <View style={[styles.reason, { backgroundColor: soft, borderColor: panelBorder }]}>
          {reasonLabel ? (
            <Text style={[styles.reasonLabel, { color: accent }]} numberOfLines={1}>
              {reasonLabel.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.reasonText, { color: t.textPrimary, fontSize: f.sub }]}>{reasonText}</Text>
        </View>
      ) : null}
      {children}
      <PrimaryButton label={ctaLabel} onPress={onCta} style={styles.cta} />
      {secondaryLabel && onSecondary ? (
        <PressableScale
          onPress={onSecondary}
          variant="primary"
          style={styles.secondary}
          contentStyle={[
            styles.secondaryInner,
            { minHeight: ds.buttonHeight, borderRadius: ds.radius.lg, backgroundColor: soft },
          ]}
        >
          <Text style={{ color: accent, fontSize: f.bodyLg, fontWeight: '700' }}>{secondaryLabel}</Text>
        </PressableScale>
      ) : null}
      {ghostLabel && onGhost ? (
        <TouchableOpacity onPress={onGhost} activeOpacity={0.7} style={styles.ghost}>
          <Text style={[styles.ghostText, { color: t.textMuted, fontSize: f.sub }]}>{ghostLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

function RewardCardV2({
  visible,
  backdropAction = 'cta',
  testID,
  onCta,
  onGhost,
  ...body
}: RewardCardV2Props) {
  const { themeMode } = useTheme();
  if (!visible) return null;

  const handleBackdrop = () => {
    if (backdropAction === 'none') return;
    if (backdropAction === 'ghost') {
      (onGhost ?? onCta)();
      return;
    }
    onCta();
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onGhost ?? onCta}
      testID={testID}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: rewardCardBackdropColor(themeMode) }]}
        onPress={handleBackdrop}
      >
        <RewardCardBody {...body} onCta={onCta} onGhost={onGhost} />
      </Pressable>
    </Modal>
  );
}

export default memo(RewardCardV2);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: 326,
    maxWidth: '94%',
    borderWidth: 0,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  topline: {
    position: 'absolute',
    top: 0,
    left: 26,
    right: 26,
    height: 1.5,
    opacity: 0.9,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingHorizontal: 8,
  },
  kickerRule: {
    width: 0,
  },
  kickerRuleGrad: {
    flex: 1,
    height: 1,
    maxWidth: 48,
  },
  kicker: {
    fontWeight: '900',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  kickerWrap: {
    flexShrink: 1,
  },
  ringWrap: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringHalo: {
    position: 'absolute',
    width: 134,
    height: 134,
    borderRadius: 67,
    borderWidth: 0,
  },
  ringGlowMid: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 0,
  },
  ringOuter: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringEmoji: {
    fontSize: 42,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 18,
  },
  value: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },
  reason: {
    alignSelf: 'stretch',
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  reasonText: {
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 19,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  secondary: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  secondaryInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  ghost: {
    paddingVertical: 10,
    marginTop: 2,
    alignSelf: 'center',
  },
  ghostText: {
    fontWeight: '700',
  },
});
