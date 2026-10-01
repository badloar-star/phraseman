import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import type { Theme } from '../../constants/theme';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { AdaptiveLabel } from '../../components/text-integrity/AdaptiveLabel';
import type { FcDeckId } from './mode_prefs';
import { fcHaptic } from './SoundService';
import type { DeckSheetOption } from './DeckPickerSheet';

type Props = {
  deck: DeckSheetOption;
  index: number;
  selected: boolean;
  onToggle: (deckId: FcDeckId) => void;
  simpleMotion: boolean;
  t: Theme;
  f: { body: number; sub: number; caption: number };
  testIDPrefix?: string;
  /** Opt-in compact row used only by the active Liquid Glass deck picker. */
  presentation?: 'compact-liquid-glass';
  liquidGlass?: Readonly<{
    opaqueControl: string;
    glassEdge: string;
    selected: string;
    cta: string;
    ctaInk: string;
    text: string;
    secondary: string;
    line: string;
  }>;
  textScale?: number;
  countLabel?: string;
};

const ENTER_SPRING = { damping: 20, stiffness: 240, mass: 0.8 } as const;
const CHECK_SPRING = { damping: 15, stiffness: 320, mass: 0.7 } as const;

export default function DeckSelectionTile({
  deck,
  index,
  selected,
  onToggle,
  simpleMotion,
  t,
  f,
  testIDPrefix = 'fc-deck-option',
  presentation,
  liquidGlass,
  textScale = 1,
  countLabel,
}: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const disabled = deck.count <= 0;
  const enter = useSharedValue(simpleMotion ? 1 : 0);
  const check = useSharedValue(selected ? 1 : 0);
  const [labelReflowed, setLabelReflowed] = useState(false);
  const onLabelReflow = useCallback(() => setLabelReflowed(true), []);
  // зачем (PM-092, владелец: «не вот эти квадраты блоки здоровые, а типа удобно
  // списочек»): раньше это была квадратная плитка 48.5% ширины — переделано в
  // компактную строку списка (маленькая обложка слева, текст и чекбокс справа).
  // Ширина заголовка теперь считается от полной ширины строки, а не половины экрана.
  const labelWidth = Math.max(140, viewportWidth - 32 /* H_PAD экрана */ - 52 /* обложка */ - 40 /* чекбокс */ - 24 /* внутренние отступы строки */);

  useEffect(() => {
    if (simpleMotion) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withDelay(fcStaggerDelay(index), withSpring(1, ENTER_SPRING));
  }, [enter, index, simpleMotion]);

  useEffect(() => {
    check.value = simpleMotion
      ? withTiming(selected ? 1 : 0, { duration: FC_TIMING.fast })
      : withSpring(selected ? 1 : 0, CHECK_SPRING);
  }, [check, selected, simpleMotion]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.68 + check.value * 0.32 }],
  }));

  if (presentation === 'compact-liquid-glass' && liquidGlass && countLabel) {
    return (
      <Reanimated.View style={[styles.wrapper, enterStyle]}>
        <Pressable
          testID={`${testIDPrefix}-${deck.deckId}`}
          accessibilityRole="checkbox"
          accessibilityLabel={`${deck.title}. ${countLabel}`}
          accessibilityState={{ checked: selected, disabled }}
          disabled={disabled}
          onPress={() => {
            fcHaptic('tap');
            onToggle(deck.deckId);
          }}
          style={({ pressed }) => [
            styles.compactRow,
            {
              borderBottomColor: liquidGlass.line,
              opacity: disabled ? 0.42 : pressed ? 0.82 : 1,
            },
          ]}
        >
          <View
            testID={`${testIDPrefix}-cover-${deck.deckId}`}
            style={[
              styles.compactCover,
              { backgroundColor: liquidGlass.opaqueControl, borderColor: liquidGlass.glassEdge },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[liquidGlass.selected, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="layers-outline" size={24} color={liquidGlass.secondary} />
          </View>

          <View style={styles.compactTextCol}>
            <Text
              testID={`${testIDPrefix}-title-${deck.deckId}`}
              style={[
                styles.compactTitle,
                { color: liquidGlass.text, fontSize: 16 * textScale, lineHeight: 22 * textScale },
              ]}
            >
              {deck.title}
            </Text>
            <Text
              testID={`${testIDPrefix}-count-${deck.deckId}`}
              style={[
                styles.compactCount,
                { color: liquidGlass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale },
              ]}
            >
              {countLabel}
            </Text>
          </View>

          <View
            testID={`${testIDPrefix}-checkbox-${deck.deckId}`}
            style={[
              styles.compactCheckbox,
              {
                borderColor: selected ? liquidGlass.cta : liquidGlass.glassEdge,
                backgroundColor: selected ? liquidGlass.cta : 'transparent',
              },
            ]}
          >
            <Reanimated.View style={checkStyle}>
              <Ionicons name="checkmark" size={16} color={liquidGlass.ctaInk} />
            </Reanimated.View>
          </View>
        </Pressable>
      </Reanimated.View>
    );
  }

  return (
    <Reanimated.View style={[styles.wrapper, enterStyle]}>
      <Pressable
        testID={`${testIDPrefix}-${deck.deckId}`}
        accessibilityRole="checkbox"
        accessibilityLabel={`${deck.title}. ${deck.count}`}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={() => {
          fcHaptic('tap');
          onToggle(deck.deckId);
        }}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: selected ? t.accent : t.border,
            backgroundColor: selected ? `${t.accent}14` : t.bgSurface,
            opacity: disabled ? 0.42 : pressed ? 0.82 : 1,
          },
        ]}
      >
        {/* Компактная обложка слева (§ видео-наборы: превью с play-иконкой
            рисует отдельный VideoPackRow в каталоге; здесь — общий выбор
            наборов для тренировки, обложка/иконка та же, что была). */}
        <View style={[styles.cover, { backgroundColor: selected ? `${t.accent}26` : `${t.textMuted}1A` }]}>
          {deck.coverImage ? (
            <Image
              key={deck.coverRevision ?? deck.deckId}
              accessible={false}
              source={deck.coverImage}
              style={styles.coverImage}
              contentFit="cover"
              transition={simpleMotion ? 0 : FC_TIMING.fast}
            />
          ) : (
            <Ionicons name={deck.icon} size={22} color={selected ? t.accent : t.textMuted} />
          )}
        </View>

        <View style={styles.textCol}>
          <AdaptiveLabel
            testID={`${testIDPrefix}-title-${deck.deckId}`}
            provenance="user"
            availableWidth={labelWidth}
            compactLineLimit={2}
            onReflowNeeded={onLabelReflow}
            style={[
              styles.title,
              {
                color: t.textPrimary,
                fontSize: labelReflowed ? Math.max(11, Math.round(f.sub * 0.9)) : f.sub,
                lineHeight: labelReflowed ? 15 : 18,
              },
            ]}
            maxFontSizeMultiplier={1.5}
          >
            {deck.title}
          </AdaptiveLabel>
        </View>

        <View style={[styles.countBadge, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.countText, { color: t.textSecond, fontSize: f.caption }]}>{deck.count}</Text>
        </View>

        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? t.accent : t.textGhost,
              backgroundColor: selected ? t.accent : t.bgCard,
            },
          ]}
        >
          <Reanimated.View style={checkStyle}>
            <Ionicons name="checkmark" size={16} color={t.correctText} />
          </Reanimated.View>
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  // PM-092: раньше плитка 48.5% ширины в сетке 2-в-ряд — теперь строка на всю
  // ширину списка (родитель передаёт flexDirection:'column' вместо wrap-сетки).
  wrapper: { width: '100%' },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  coverImage: { width: '100%', height: '100%' },
  textCol: { flex: 1, minWidth: 0 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countBadge: {
    minWidth: 30,
    minHeight: 24,
    paddingHorizontal: 7,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontWeight: '800' },
  compactRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  compactCover: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  compactTextCol: { flex: 1, minWidth: 0 },
  compactTitle: { fontWeight: '700' },
  compactCount: { fontWeight: '400' },
  compactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
