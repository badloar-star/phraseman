import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD_ROWS = Math.floor(WHEEL_VISIBLE_ROWS / 2);

interface YearWheelProps {
  years: readonly number[];
  value: number;
  onChange: (year: number) => void;
  surfaceColor?: string;
  frameBorderColor?: string;
  selectionBorderColor?: string;
  selectionBackgroundColor?: string;
  textColor?: string;
  activeTextColor?: string;
  fadeColor?: string;
}

function clampIndex(idx: number, len: number): number {
  return Math.min(Math.max(idx, 0), len - 1);
}

export default function YearWheel({
  years,
  value,
  onChange,
  surfaceColor = '#0f1216',
  frameBorderColor = 'rgba(255,255,255,0.12)',
  selectionBorderColor = 'rgba(255,255,255,0.28)',
  selectionBackgroundColor = 'rgba(255,255,255,0.06)',
  textColor = '#5c636b',
  activeTextColor = '#fff',
  fadeColor = '#0f1216',
}: YearWheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, years.indexOf(value));
  const [liveIndex, setLiveIndex] = useState(initialIndex);
  const reportedIndexRef = useRef(initialIndex);

  useEffect(() => {
    const y = initialIndex * WHEEL_ITEM_HEIGHT;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clampIndex(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT), years.length);
    if (idx !== liveIndex) setLiveIndex(idx);
    if (idx !== reportedIndexRef.current) {
      reportedIndexRef.current = idx;
      onChange(years[idx]);
    }
  };

  return (
    <View style={[styles.wheelWrap, { backgroundColor: surfaceColor, borderColor: frameBorderColor }]}>
      <View
        pointerEvents="none"
        style={[
          styles.wheelSelection,
          { borderColor: selectionBorderColor, backgroundColor: selectionBackgroundColor },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={styles.wheelContent}
      >
        {years.map((y, i) => {
          const active = i === liveIndex;
          return (
            <View key={y} style={styles.wheelItem}>
              <Text style={[styles.wheelText, { color: textColor }, active && styles.wheelTextActive, active && { color: activeTextColor }]}>{y}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={[styles.wheelFade, styles.wheelFadeTop, { backgroundColor: fadeColor }]} />
      <View pointerEvents="none" style={[styles.wheelFade, styles.wheelFadeBottom, { backgroundColor: fadeColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wheelWrap: {
    height: WHEEL_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wheelContent: {
    paddingVertical: WHEEL_PAD_ROWS * WHEEL_ITEM_HEIGHT,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
  },
  wheelTextActive: {
    fontSize: 24,
    fontWeight: '800',
  },
  wheelSelection: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: WHEEL_PAD_ROWS * WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  wheelFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT * 1.4,
    opacity: 0.55,
  },
  wheelFadeTop: { top: 0 },
  wheelFadeBottom: { bottom: 0 },
});
