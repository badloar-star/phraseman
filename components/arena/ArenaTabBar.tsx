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
 * Владелец (2026-08-12, порядок обновлён 2026-08-16): три равные по смыслу
 * кнопки — Рейтинг слева, Играть по центру (крупная), История справа. Каждая
 * раскрывает список своих вариантов тем же жестом (см. ArenaHubChrome).
 *
 * Планка анимаций — «уровень Duolingo и лучше»: пружинная подсветка активной
 * вкладки, отдельная физика нажатия у центральной кнопки, дыхание кнопки в
 * покое, микро-подскок иконки. Всё на UI-потоке Reanimated; при включённом
 * Reduce Motion вся анимация схлопывается в мгновенные состояния.
 */

export type ArenaTabKey = 'play' | 'rating' | 'history';

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
      {/*
        Высота таббара фиксирована (это плавающая пилюля со скруглением в
        половину высоты), поэтому подпись не может расти сколько угодно: при
        системном шрифте в двойном размере строка вместе со значком
        перерастала полосу и обрезалась. Множитель ограничен — подпись всё
        равно заметно крупнее обычной, а геометрия пилюли цела.
      */}
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
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
  disabledHint,
}: {
  label: string;
  onPress: () => void;
  reduceMotion: boolean;
  busy: boolean;
  disabledHint?: string;
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
          accessibilityHint={disabledHint}
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
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.centerLabel, { color: P.accent }]}>{label}</Text>
    </View>
  );
}

function ArenaTabBarBase({
  tabs,
  active,
  matchLabel,
  matchBusy = false,
  matchDisabledHint,
  onSelect,
  onMatch,
}: {
  tabs: readonly ArenaTabDef[];
  active: ArenaTabKey;
  matchLabel: string;
  matchBusy?: boolean;
  matchDisabledHint?: string;
  onSelect: (key: ArenaTabKey) => void;
  onMatch: () => void;
}) {
  const P = useTournamentPalette();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const select = useCallback((key: ArenaTabKey) => onSelect(key), [onSelect]);

  /**
   * зачем три равные кнопки вместо «две слева + центральная + две справа»
   * (владелец, 2026-08-16): вкладок было четыре, и они пересекались со
   * вкладками внутри экрана. Теперь три сущности, и КАЖДАЯ раскрывает свой
   * список — «Играть» отдаёт режимы, остальные свои разделы.
   *
   * «Играть» остаётся крупной: это то, ради чего сюда приходят, и она должна
   * читаться первой, а не теряться среди равных.
   */
  const play = tabs.find((tab) => tab.key === 'play');
  const sides = tabs.filter((tab) => tab.key !== 'play');

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(10, insets.bottom) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { backgroundColor: P.elev, shadowColor: '#000' }]}>
        {sides[0] ? (
          <SideTab
            tab={sides[0]}
            focused={active === sides[0].key}
            reduceMotion={reduceMotion}
            onPress={() => select(sides[0].key)}
          />
        ) : null}
        <CenterMatchButton
          label={matchLabel}
          busy={matchBusy}
          disabledHint={matchDisabledHint}
          reduceMotion={reduceMotion}
          onPress={play ? () => select(play.key) : onMatch}
        />
        {sides[1] ? (
          <SideTab
            tab={sides[1]}
            focused={active === sides[1].key}
            reduceMotion={reduceMotion}
            onPress={() => select(sides[1].key)}
          />
        ) : null}
      </View>
    </View>
  );
}

export const ArenaTabBar = memo(ArenaTabBarBase);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    paddingHorizontal: 14,
  },
  /**
   * Потолок ширины — как у содержимого экрана (620 pt минус его поля).
   *
   * На планшете без него полоса растягивалась во всю ширину, а карточки над
   * ней оставались колонкой посередине: две разные сетки на одном экране.
   * На телефоне потолок не достаётся никогда, поэтому там ничего не меняется.
  */
  bar: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 584,
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
