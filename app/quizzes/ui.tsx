import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { streakMultiplier } from '../hall_of_fame_utils';

export function XpCounter({
  anim,
  xpNeeded,
  textStyle,
}: {
  anim: Animated.Value;
  xpNeeded: number;
  textStyle: object;
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return <Text style={textStyle}>{displayed} / {xpNeeded} XP</Text>;
}

export function MultBadge({ streak, t, f }: { streak: number; t: any; f: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(streak);
  const mult = streakMultiplier(streak);

  useEffect(() => {
    if (streak > prev.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
    }
    prev.current = streak;
  }, [streak, scale]);

  if (streak < 2) return null;
  return (
    <Animated.View style={{
      transform: [{ scale }],
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.accentBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 6,
    }}>
      <Ionicons name="flame" size={13} color={t.textSecond} />
      <Text style={{ color: t.textSecond, fontWeight: '700', fontSize: f.body, marginLeft: 2 }}>{streak}</Text>
      {mult > 1 && <Text style={{ color: t.textSecond, fontSize: f.caption }}> +{Math.round((mult - 1) * 100)}%</Text>}
    </Animated.View>
  );
}

export function StreakBreak({ show, old, t, f }: { show: boolean; old: number; t: any; f: any }) {
  const y = useRef(new Animated.Value(0)).current;
  const opa = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    y.setValue(0);
    opa.setValue(1);
    Animated.parallel([
      Animated.timing(y, { toValue: 40, duration: 600, useNativeDriver: true }),
      Animated.timing(opa, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [show, y, opa]);
  if (!show || old < 2) return null;
  return (
    <Animated.View style={{
      position: 'absolute',
      top: 8,
      right: 60,
      transform: [{ translateY: y }],
      opacity: opa,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}>
      <Ionicons name="flame" size={14} color={t.wrong} />
      <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '700', textDecorationLine: 'line-through' }}>
        +{Math.round((streakMultiplier(old) - 1) * 100)}%
      </Text>
    </Animated.View>
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
