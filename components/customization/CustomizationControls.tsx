import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FlowText } from '../text-integrity/FlowText';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { pearlIconForTheme } from '../../app/coin_icons';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { CustomizationAction, CustomizationTab } from '../../app/customization_draft';
import type { AvatarSide, CustomizationCurrency } from '../../app/customization_catalog';
import { RuneGlyph } from '../RuneGlyph';

import { noAndroidOutline } from '../../constants/androidGlow';

export function CustomizationTabs({ value, onChange, avatarsLabel, aurasLabel }: {
  value: CustomizationTab; onChange: (value: CustomizationTab) => void; avatarsLabel: string; aurasLabel: string;
}) {
  const { theme: t } = useTheme();
  const tabs: { id: CustomizationTab; label: string }[] = [
    { id: 'avatars', label: avatarsLabel },
    { id: 'auras', label: aurasLabel },
  ];
  return (
    <View style={[styles.segmentedGroup, { backgroundColor: t.bgCard }]} accessibilityRole="tablist">
      {tabs.map((item) => {
        const selected = item.id === value;
        return (
          <TapScale
            key={item.id}
            testID={`customization-tab-${item.id}`}
            onPress={() => {
              if (selected) return;
              onChange(item.id);
            }}
            scaleTo={0.94}
            style={[
              styles.segment,
              {
                backgroundColor: selected ? t.accent : t.bgCard,
                shadowColor: selected ? t.accent : '#000000',
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
          >
              <Text style={[styles.segmentText, { color: selected ? t.correctText : t.textMuted }]}>
                {item.label}
              </Text>
          </TapScale>
        );
      })}
    </View>
  );
}

const SIDE_OPTIONS = [
  { id: 'yin' as const, label: 'Инь' },
  { id: 'yang' as const, label: 'Янь' },
];

export function YinYangControl({ value, onChange, accessibilityLabelForSide }: {
  value: AvatarSide;
  onChange: (value: AvatarSide) => void;
  accessibilityLabelForSide: (value: AvatarSide) => string;
}) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.sideGroup, { backgroundColor: t.bgCard }]} accessibilityRole="tablist">
      {SIDE_OPTIONS.map((option) => {
        const selected = option.id === value;
        return (
          <TapScale
            key={option.id}
            testID={`avatar-side-${option.id}`}
            onPress={() => { if (!selected) onChange(option.id); }}
            scaleTo={0.96}
            style={[
              styles.sideSegment,
              { backgroundColor: selected ? t.accent : t.bgCard },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={accessibilityLabelForSide(option.id)}
          >
            <Text style={[styles.segmentText, { color: selected ? t.correctText : t.textMuted }]}>
              {option.label}
            </Text>
          </TapScale>
        );
      })}
    </View>
  );
}

export type CustomizationPriceValue = Readonly<{
  currency: CustomizationCurrency;
  amount: number;
}>;

export function CustomizationPrice({ price, color }: {
  price: CustomizationPriceValue;
  color: string;
}) {
  const { themeMode } = useTheme();
  return (
    <View style={styles.priceBox}>
      {price.currency === 'runes'
        ? <RuneGlyph size={18} color={color} />
        : <Image source={pearlIconForTheme(themeMode)} style={styles.priceCoin} contentFit="contain" accessible={false} />}
      <Text style={[styles.actionText, { color }]}>{price.amount.toLocaleString('ru-RU')}</Text>
    </View>
  );
}

/**
 * зачем: владелец убрал «бар в рамке, который всегда висит серым» — кнопка теперь
 * появляется снизу только когда есть действие (применить/купить/открыть Plus), и цена
 * живёт прямо в ней монетой, а не текстом «· 35». Нет действия — нет кнопки, каталог дышит.
 */
export function CustomizationActionBar({ action, label, price, busy, bottomOffset, onPress }: {
  action: CustomizationAction; label: string; price: CustomizationPriceValue | null; busy: boolean;
  bottomOffset: number; onPress: () => void;
}) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const visible = action.kind !== 'unchanged';
  const shown = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, shown, reduceMotion]);

  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [96, 0] });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.actionWrap, { bottom: bottomOffset, opacity: shown, transform: [{ translateY }] }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onPress}
        onPressIn={() => { if (!busy) hapticTap(); }}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: t.accent, shadowColor: t.accent },
          pressed && { transform: [{ scale: 0.97 }] },
          busy && { opacity: 0.72 },
        ]}
      >
        {/* зачем: text-integrity — лейбл CTA переносится, кнопка растёт по minHeight. */}
        <FlowText testID="customization-action-label" provenance="authored" style={[styles.actionText, { color: t.correctText }]}>{label}</FlowText>
        {price ? <CustomizationPrice price={price} color={t.correctText} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  segmentedGroup: {
    alignSelf: 'center', flexDirection: 'row', padding: 3, borderRadius: 16, gap: 3,
  },
  segment: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    ...noAndroidOutline,
  },
  sideGroup: {
    alignSelf: 'stretch', flexDirection: 'row', padding: 3, borderRadius: 16, gap: 3,
  },
  sideSegment: {
    flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    ...noAndroidOutline,
  },
  segmentText: { fontSize: 14, lineHeight: 19, fontWeight: '900' },
  actionWrap: { position: 'absolute', left: 16, right: 16 },
  action: {
    minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 20,
    shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, ...noAndroidOutline,
  },
  actionText: { fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center' },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceCoin: { width: 18, height: 18 },
});
