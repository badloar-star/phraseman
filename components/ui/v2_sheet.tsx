// ═══════════════════════════════════════════════════════════════════════════
// tournament_ui.tsx — примитивы режима «Турниры».
//
// зачем: перенос утверждённого прототипа в RN. Один набор Card/Cta/Sheet на
// все экраны — иначе 9 экранов разъедутся по отступам и радиусам.
//
// ПРАВИЛО ВЛАДЕЛЬЦА: никаких обводок вокруг блоков. Контейнеры разделяются
// тоном (card → elev → elev2), тенью и внутренним бликом сверху — блик
// рисуется отдельной полосой, потому что RN не умеет inset-тени.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { INNER_LIGHT, T, motion, radius, type, useTournamentPalette, type TournamentPalette} from './v2_theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ── Card ────────────────────────────────────────────────────────────────────

export type CardTone = 'card' | 'elev' | 'gold' | 'danger';

type CardProps = {
  children: React.ReactNode;
  tone?: CardTone;
  pad?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// Фоны тонов считаются от активной палитры — карточки следуют теме.
const toneBg = (tone: CardTone, P: TournamentPalette): string => ({
  card: P.card,
  elev: P.elev,
  gold: P.goldSoft,
  danger: P.dangerSoft,
}[tone]);

/** Контейнер без обводки: тон + мягкая тень + блик сверху. */
export const Card = memo(function Card({
  children, tone = 'card', pad = 18, onPress, style,
}: CardProps) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.985, motion.press);
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, motion.press);
  }, [scale]);

  const body = (
    <>
      {/* Блик вместо бордера — тонкая светлая полоса по верхней кромке. */}
      <View style={styles.innerLight} pointerEvents="none" />
      {children}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.card, { backgroundColor: toneBg(tone, P), padding: pad }, style]}>
        {body}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.card, { backgroundColor: toneBg(tone, P), padding: pad }, animatedStyle, style]}
    >
      {body}
    </AnimatedPressable>
  );
});

// ── Cta ─────────────────────────────────────────────────────────────────────

type CtaProps = {
  children: React.ReactNode;
  onPress?: () => void;
  ghost?: boolean;
  danger?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Главная кнопка. Объёмная «полка» снизу — как в макетах: при нажатии кнопка
 * съезжает на глубину полки, поэтому нажатие ощущается физически.
 */
export const Cta = memo(function Cta({
  children, onPress, ghost, danger, disabled, style,
}: CtaProps) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const depth = useSharedValue(0);
  const shellStyle = useAnimatedStyle(() => ({ transform: [{ translateY: depth.value }] }));

  const bg = ghost ? P.elev : danger ? P.danger : P.accent;
  const shelf = ghost ? P.card : danger ? P.dangerDark : P.accentDark;
  const fg = ghost ? P.text : danger ? '#FFFFFF' : P.accentText;

  const handlePressIn = useCallback(() => {
    depth.value = withTiming(4, { duration: 70 });
  }, [depth]);
  const handlePressOut = useCallback(() => {
    depth.value = withSpring(0, motion.press);
  }, [depth]);
  const handlePress = useCallback(() => {
    if (disabled) return;
    // Хаптик только на управляющих кнопках — правило владельца.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  }, [disabled, onPress]);

  return (
    <View style={[{ borderRadius: radius.md, backgroundColor: shelf, paddingBottom: 4 }, style]}>
      <AnimatedPressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.cta,
          { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
          shellStyle,
        ]}
      >
        <Text style={[styles.ctaText, { color: fg }]}>{children}</Text>
      </AnimatedPressable>
    </View>
  );
});

// ── Sheet ───────────────────────────────────────────────────────────────────

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/** Нижняя шторка: подтверждение входа, профиль игрока. Свайп-вниз закрывает. */
export const Sheet = memo(function Sheet({ visible, onClose, children }: SheetProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} />
      <View style={styles.sheet}>
        <View style={styles.sheetGrip} />
        {children}
      </View>
    </Modal>
  );
});

// ── Chip / Pill ─────────────────────────────────────────────────────────────

export const Pill = memo(function Pill({
  children, tone = 'card', color,
}: { children: React.ReactNode; tone?: 'card' | 'accent' | 'gold' | 'danger'; color?: string }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const bg = tone === 'accent' ? P.accentSoft
    : tone === 'gold' ? P.goldSoft
      : tone === 'danger' ? P.dangerSoft : P.card;
  const fg = color ?? (tone === 'accent' ? P.accent
    : tone === 'gold' ? P.gold
      : tone === 'danger' ? P.danger : P.text);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={styles.innerLight} pointerEvents="none" />
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
});

// ── Стили ───────────────────────────────────────────────────────────────────

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    // Тень вместо обводки: отделяет карточку от фона мягко.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  innerLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: INNER_LIGHT,
  },
  cta: {
    borderRadius: radius.md,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ctaText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: P.elev,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetGrip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: P.ghost,
    marginBottom: 18,
    opacity: 0.6,
  },
  pill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  pillText: {
    ...type.body,
    fontWeight: '800',
  },
});
