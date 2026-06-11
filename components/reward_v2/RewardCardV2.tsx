import React, { memo, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import PrimaryButton from '../ui/PrimaryButton';
import { MOTION_DURATION, MOTION_SPRING_LEGACY } from '../../constants/motion';
import {
  rewardModalAccentColor,
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
 */
export type RewardCardSemantic = 'gold' | 'shards' | 'danger' | 'warning' | 'social' | 'neutral';

export type RewardCardV2Props = {
  visible: boolean;
  /** Короткая строка-категория сверху, БЕЗ эмодзи: «Уровень 12 · Эпический». */
  kicker: string;
  /** Контент кольца: строка = эмодзи, иначе любой ReactNode (Image/SVG). */
  icon: React.ReactNode;
  title: string;
  value?: string;
  reasonLabel?: string;
  reasonText?: string;
  ctaLabel: string;
  onCta: () => void;
  ghostLabel?: string;
  onGhost?: () => void;
  semantic?: RewardCardSemantic;
  /** Точечная подмена семантического цвета (hex). */
  accentColor?: string;
  /** Что делает тап по фону. Награды: 'cta' (не теряются). Подтверждения: 'ghost'. */
  backdropAction?: 'cta' | 'ghost' | 'none';
  /** Доп. контент между значением и CTA (список наград и т.п.). */
  children?: React.ReactNode;
  testID?: string;
};

function withAlpha(hex: string, alpha: string): string {
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${alpha}`;
  return hex;
}

function semanticAccent(
  semantic: RewardCardSemantic,
  t: ReturnType<typeof useTheme>['theme'],
  themeMode: ReturnType<typeof useTheme>['themeMode'],
): string {
  switch (semantic) {
    case 'gold': return t.gold;
    case 'shards': return '#6FB1FF';
    case 'danger': return t.wrong;
    case 'warning': return '#FFC857';
    case 'social': return '#D8A6FF';
    case 'neutral':
    default:
      return rewardModalAccentColor(themeMode, t);
  }
}

function RewardCardV2({
  visible,
  kicker,
  icon,
  title,
  value,
  reasonLabel,
  reasonText,
  ctaLabel,
  onCta,
  ghostLabel,
  onGhost,
  semantic = 'neutral',
  accentColor,
  backdropAction = 'cta',
  children,
  testID,
}: RewardCardV2Props) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const scale = useRef(new Animated.Value(0.94)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0.4)).current;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.94);
    translateY.setValue(16);
    opacity.setValue(0);
    /** Старт на следующем кадре — Fabric должен закоммитить Animated.View (см. ActionToast). */
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
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
  }, [halo, opacity, scale, translateY, visible]);

  if (!visible) return null;

  const accent = accentColor ?? semanticAccent(semantic, t, themeMode);
  const panelColors = rewardModalPanelColors(themeMode, t);
  const soft = rewardModalSoftSurface(themeMode, t);
  const panelBorder = rewardModalPanelBorder(themeMode, t, withAlpha(accent, '4D'));
  const backdropColor = themeMode === 'minimalLight' ? 'rgba(24,18,10,0.38)' : 'rgba(2,4,8,0.55)';
  const cardRadius = ds.radius.xxl;

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
      <Pressable style={[styles.backdrop, { backgroundColor: backdropColor }]} onPress={handleBackdrop}>
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
          <LinearGradient
            colors={panelColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', accent, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topline}
            pointerEvents="none"
          />
          <Text style={[styles.kicker, { color: accent, fontSize: Math.max(11, f.label - 1) }]} numberOfLines={1}>
            {kicker.toUpperCase()}
          </Text>
          <View style={styles.ringWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.ringHalo, { borderColor: withAlpha(accent, '38'), opacity: halo }]}
            />
            <View style={[styles.ring, { borderColor: withAlpha(accent, '70'), backgroundColor: soft }]}>
              {typeof icon === 'string' ? <Text style={styles.ringEmoji}>{icon}</Text> : icon}
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
          {ghostLabel && onGhost ? (
            <TouchableOpacity onPress={onGhost} activeOpacity={0.7} style={styles.ghost}>
              <Text style={[styles.ghostText, { color: t.textMuted, fontSize: f.sub }]}>{ghostLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
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
    borderWidth: 1,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topline: {
    position: 'absolute',
    top: 0,
    left: 26,
    right: 26,
    height: 1,
    opacity: 0.8,
  },
  kicker: {
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  ringWrap: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  ring: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringEmoji: {
    fontSize: 40,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 16,
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
    borderWidth: 1,
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
  ghost: {
    paddingVertical: 10,
    marginTop: 2,
    alignSelf: 'center',
  },
  ghostText: {
    fontWeight: '700',
  },
});
