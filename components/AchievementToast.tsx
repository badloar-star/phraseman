import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useAchievement } from './AchievementContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { markAchievementsNotified } from '../app/achievements';
import * as Haptics from 'expo-haptics';

const AUTO_DISMISS_MS = 3800;

/**
 * Тост-баннер в нижней части экрана.
 * Монтируется один раз в корне приложения (_layout.tsx), поверх всего.
 * Работает с очередью из AchievementContext.
 */
export default function AchievementToast() {
  const { currentToast, dismissCurrent } = useAchievement();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const translateY = useRef(new Animated.Value(160)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.88)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentToast) {
      // Сбросить таймер предыдущего
      if (timerRef.current) clearTimeout(timerRef.current);

      // Вибрация
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      // Пометить как notified
      markAchievementsNotified([currentToast.id]);

      // Slide up + fade in + scale
      translateY.setValue(160);
      opacity.setValue(0);
      scale.setValue(0.88);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,   useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1,   duration: 250, useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1.0, useNativeDriver: true, tension: 65, friction: 9 }),
      ]).start();

      // Автодисмисс
      timerRef.current = setTimeout(() => {
        animateOut();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentToast?.id]);

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 160, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 250, useNativeDriver: true }),
    ]).start(() => {
      dismissCurrent();
    });
  };

  if (!currentToast) return null;

  const name = isUK ? currentToast.nameUk : currentToast.nameRu;
  const desc = isUK ? currentToast.descUk : currentToast.descRu;
  const label = isUK ? 'Досягнення розблоковано!' : 'Достижение разблокировано!';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        s.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={animateOut}
        style={[
          s.card,
          {
            backgroundColor: t.bgCard,
            borderColor: t.textSecond,
            shadowColor: t.textSecond,
          },
        ]}
      >
        {/* Иконка */}
        <View style={[s.iconWrap, { backgroundColor: t.bgSurface2, borderColor: t.border }]}>
          <Text style={s.iconText}>{currentToast.icon}</Text>
        </View>

        {/* Текст */}
        <View style={s.textWrap}>
          <Text style={[s.label, { color: t.textSecond }]}>{label}</Text>
          <Text style={[s.name, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[s.desc, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>
            {desc}
          </Text>
        </View>

        {/* Мерцающий индикатор */}
        <Text style={s.sparks}>✦</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position:  'absolute',
    bottom:    88,          // выше таб-бара
    left:      14,
    right:     14,
    zIndex:    9999,
  },
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   20,
    borderWidth:    1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap:            12,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.25,
    shadowRadius:   12,
    elevation:      10,
  },
  iconWrap: {
    width:         54,
    height:        54,
    borderRadius:  14,
    borderWidth:   1,
    justifyContent: 'center',
    alignItems:    'center',
  },
  iconText: {
    fontSize: 28,
  },
  textWrap: {
    flex: 1,
    gap:  2,
  },
  label: {
    fontSize:    11,
    fontWeight:  '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  name: {
    fontWeight: '700',
    lineHeight: 20,
  },
  desc: {
    lineHeight: 17,
  },
  sparks: {
    fontSize: 20,
    opacity: 0.5,
  },
});
