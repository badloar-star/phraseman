import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticTap, hapticMediumImpact } from '../../hooks/use-haptics';

/**
 * Собственный таббар Арены.
 *
 * Владелец (2026-08-12): внутри Арены свой таббар с крупной кнопкой «Матч» по
 * центру — по нажатию открывается выбор режима, как в «Карточках 2.1».
 * По бокам по две вкладки: Сегодня и Ранг слева, Топы и История справа.
 *
 * Планка анимаций — «уровень Duolingo и лучше»: пружинная подсветка активной
 * вкладки, отдельная физика нажатия у центральной кнопки, дыхание кнопки в
 * покое, микро-подскок иконки. Всё на UI-потоке Reanimated; при включённом
 * Reduce Motion вся анимация схлопывается в мгновенные состояния.
 */

export type ArenaTabKey = 'today' | 'rank' | 'tops' | 'history';

export type ArenaTabDef = Readonly<{
  key: ArenaTabKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}>;

const SPRING = { damping: 15, stiffness: 190, mass: 0.75 } as const;
const BAR_HEIGHT = 62;
const CENTER_SIZE = 62;
const CENTER_LIFT = 16;

function SideTab({
  tab,
  focused,
  onPress,
  reduceMotion,
}: {
  tab: ArenaTabDef;
  focused: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const P = useTournamentPalette();
  const press = useSharedValue(0);
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, SPRING);
  }, [focus, focused, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + focus.value * 0.08 - press.value * 0.1 },
      { translateY: -focus.value * 2 },
    ],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + focus.value * 0.45,
    transform: [{ translateY: (1 - focus.value) * 2 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      testID={`arena-tab-${tab.key}`}
      hitSlop={6}
      onPressIn={() => { press.value = reduceMotion ? 0 : withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = reduceMotion ? 0 : withSpring(0, SPRING); }}
      onPress={() => { void hapticTap(); onPress(); }}
      style={styles.sideTab}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? tab.active : tab.icon}
          size={22}
          color={focused ? P.accent : P.muted}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[styles.sideLabel, labelStyle, { color: focused ? P.accent : P.muted }]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

function CenterMatchButton({
  label,
  onPress,
  reduceMotion,
  busy,
}: {
  label: string;
  onPress: () => void;
  reduceMotion: boolean;
  busy: boolean;
}) {
  const P = useTournamentPalette();
  const press = useSharedValue(0);
  const idle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || busy) {
      idle.value = 0;
      return;
    }
    // Дыхание в покое: кнопка «живая», но не дёргает глаз — 4% за 2.4 секунды.
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1_200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1_200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [busy, idle, reduceMotion]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + idle.value * 0.04 - press.value * 0.08 },
      { translateY: -CENTER_LIFT - idle.value * 1.5 },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(idle.value, [0, 1], [0.18, 0.34]),
    transform: [{ scale: interpolate(idle.value, [0, 1], [1, 1.16]) }, { translateY: -CENTER_LIFT }],
  }));

  return (
    <View style={styles.centerSlot} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[styles.centerHalo, haloStyle, { backgroundColor: P.accent }]}
      />
      <Animated.View style={buttonStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          testID="arena-tab-match"
          disabled={busy}
          onPressIn={() => { press.value = reduceMotion ? 0 : withTiming(1, { duration: 90 }); }}
          onPressOut={() => { press.value = reduceMotion ? 0 : withSpring(0, SPRING); }}
          onPress={() => { void hapticMediumImpact(); onPress(); }}
          style={[styles.centerButton, { backgroundColor: P.accent, shadowColor: P.accent }]}
        >
          <Ionicons name="flash" size={27} color={P.accentText} />
        </Pressable>
      </Animated.View>
      <Text numberOfLines={1} style={[styles.centerLabel, { color: P.accent }]}>{label}</Text>
    </View>
  );
}

function ArenaTabBarBase({
  tabs,
  active,
  matchLabel,
  matchBusy = false,
  onSelect,
  onMatch,
}: {
  tabs: readonly ArenaTabDef[];
  active: ArenaTabKey;
  matchLabel: string;
  matchBusy?: boolean;
  onSelect: (key: ArenaTabKey) => void;
  onMatch: () => void;
}) {
  const P = useTournamentPalette();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const select = useCallback((key: ArenaTabKey) => onSelect(key), [onSelect]);

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(10, insets.bottom) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { backgroundColor: P.elev, shadowColor: '#000' }]}>
        {left.map((tab) => (
          <SideTab
            key={tab.key}
            tab={tab}
            focused={active === tab.key}
            reduceMotion={reduceMotion}
            onPress={() => select(tab.key)}
          />
        ))}
        <CenterMatchButton
          label={matchLabel}
          busy={matchBusy}
          reduceMotion={reduceMotion}
          onPress={onMatch}
        />
        {right.map((tab) => (
          <SideTab
            key={tab.key}
            tab={tab}
            focused={active === tab.key}
            reduceMotion={reduceMotion}
            onPress={() => select(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

export const ArenaTabBar = memo(ArenaTabBarBase);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30 },
  bar: {
    marginHorizontal: 14,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 14,
  },
  sideTab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  sideLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.1 },
  centerSlot: { width: CENTER_SIZE + 12, alignItems: 'center', justifyContent: 'center' },
  centerHalo: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  centerLabel: {
    position: 'absolute',
    bottom: 6,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
