import React, { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FlowText } from '../text-integrity/FlowText';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { pearlIconForTheme } from '../../app/coin_icons';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { CustomizationAction, CustomizationTab } from '../../app/customization_draft';

import { noAndroidOutline } from '../../constants/androidGlow';

export function CustomizationTabs({ value, onChange, avatarsLabel, aurasLabel }: {
  value: CustomizationTab; onChange: (value: CustomizationTab) => void; avatarsLabel: string; aurasLabel: string;
}) {
  const { theme: t } = useTheme();
  const tabs: { id: CustomizationTab; label: string; icon: 'person' | 'sparkles'; outlineIcon: 'person-outline' | 'sparkles-outline' }[] = [
    { id: 'avatars', label: avatarsLabel, icon: 'person', outlineIcon: 'person-outline' },
    { id: 'auras', label: aurasLabel, icon: 'sparkles', outlineIcon: 'sparkles-outline' },
  ];
  return (
    <View style={styles.tabGroup} accessibilityRole="tablist">
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
              styles.iconTab,
              {
                backgroundColor: selected ? t.accent : t.bgCard,
                borderColor: selected ? t.accent : t.border,
                shadowColor: selected ? t.accent : '#000000',
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
          >
            <Ionicons
              name={selected ? item.icon : item.outlineIcon}
              size={23}
              color={selected ? t.correctText : t.textMuted}
            />
          </TapScale>
        );
      })}
    </View>
  );
}

/**
 * зачем: владелец убрал «бар в рамке, который всегда висит серым» — кнопка теперь
 * появляется снизу только когда есть действие (применить/купить/открыть Plus), и цена
 * живёт прямо в ней монетой, а не текстом «· 35». Нет действия — нет кнопки, каталог дышит.
 */
export function CustomizationActionBar({ action, label, cost, busy, bottomOffset, onPress }: {
  action: CustomizationAction; label: string; cost: number | null; busy: boolean;
  bottomOffset: number; onPress: () => void;
}) {
  const { theme: t, themeMode } = useTheme();
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
        {cost !== null ? (
          <View style={styles.priceBox}>
            <Image source={pearlIconForTheme(themeMode)} style={styles.priceCoin} contentFit="contain" accessible={false} />
            <Text style={[styles.actionText, { color: t.correctText }]}>{cost}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabGroup: { alignSelf: 'flex-end', flexDirection: 'row', gap: 10 },
  iconTab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    ...noAndroidOutline,
  },
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
