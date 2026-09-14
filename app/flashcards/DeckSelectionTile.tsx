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
}: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const disabled = deck.count <= 0;
  const enter = useSharedValue(simpleMotion ? 1 : 0);
  const check = useSharedValue(selected ? 1 : 0);
  const [labelReflowed, setLabelReflowed] = useState(false);
  const onLabelReflow = useCallback(() => setLabelReflowed(true), []);
  const labelWidth = Math.max(120, Math.min(280, viewportWidth * 0.485 - 28));

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
          styles.tile,
          {
            opacity: disabled ? 0.42 : pressed ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View
          style={[
            styles.artwork,
            {
              borderColor: selected ? t.accent : t.border,
              backgroundColor: selected ? `${t.accent}14` : t.bgSurface,
            },
          ]}
        >
          {deck.coverImage ? (
            <Image
              key={deck.coverRevision ?? deck.deckId}
              accessible={false}
              source={deck.coverImage}
              style={styles.coverImage}
              contentFit="contain"
              transition={simpleMotion ? 0 : FC_TIMING.fast}
            />
          ) : (
            <View style={[styles.fallback, { backgroundColor: selected ? `${t.accent}26` : `${t.textMuted}1A` }]}>
              <Ionicons name={deck.icon} size={34} color={selected ? t.accent : t.textMuted} />
            </View>
          )}

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
        </View>

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
              fontSize: labelReflowed ? Math.max(11, Math.round(f.sub * 0.82)) : f.sub,
              lineHeight: labelReflowed ? 15 : 17,
            },
          ]}
          maxFontSizeMultiplier={1.5}
        >
          {deck.title}
        </AdaptiveLabel>
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '48.5%' },
  tile: {
    width: '100%',
    alignItems: 'center',
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { width: '120%', height: '98%' },
  fallback: { width: 62, height: 62, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    minWidth: 30,
    minHeight: 24,
    paddingHorizontal: 7,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { minHeight: 34, marginTop: 7, textAlign: 'center', fontWeight: '800' },
});
