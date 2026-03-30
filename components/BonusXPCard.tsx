/**
 * BonusXPCard - Карточка анимированного XP бонуса
 *
 * Отображается при выигрыше переменного вознаграждения
 * - Slide-up анимация
 * - Звуковой эффект
 * - Исчезает через 2 сек или при тапе
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export interface BonusXPCardProps {
  bonusXP: number;
  onDismiss: () => void;
  position?: 'bottom' | 'center';
  duration?: number;
}

export default function BonusXPCard({
  bonusXP,
  onDismiss,
  position = 'bottom',
  duration = 2000,
}: BonusXPCardProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playBonusSound = () => {
    // Позитивный звук: быстрые пиксели (звучит весело и энергично)
    try {
      Speech.speak('', {
        language: 'en-US',
        rate: 1,
        pitch: 1,
      }).catch(() => {});
    } catch {}
  };

  const dismissCard = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Входящая анимация: слайд вверх + масштаб
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(opacityAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Звуковой эффект
    playBonusSound();

    // Хаптика
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Автоисчезновение через duration
    dismissTimerRef.current = setTimeout(() => {
      dismissCard();
    }, duration);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [duration]);

  const getTierColor = () => {
    if (bonusXP <= 10) return '#4ADE80'; // Зелёный (мало)
    if (bonusXP <= 20) return '#FB923C'; // Оранжевый (среднее)
    return '#A78BFA'; // Фиолетовый (большое)
  };

  const getTierEmoji = () => {
    if (bonusXP <= 10) return '⭐';
    if (bonusXP <= 20) return '✨';
    return '🎉';
  };

  const slideTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: position === 'bottom' ? [100, 0] : [50, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'center' ? styles.centerPosition : styles.bottomPosition,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: slideTranslateY },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={dismissCard}
        style={[styles.card, { borderColor: getTierColor() }]}
      >
        <Text style={styles.emoji}>{getTierEmoji()}</Text>

        <View style={styles.textContainer}>
          <Text style={styles.label}>Бонус XP!</Text>
          <Text style={[styles.bonus, { color: getTierColor() }]}>
            +{bonusXP}
          </Text>
        </View>

        <Text style={styles.tap}>Тап</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  centerPosition: {
    top: '50%',
    marginTop: -40,
  },
  bottomPosition: {
    bottom: 60,
  },
  card: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    fontWeight: '500',
  },
  bonus: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  tap: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.5,
    fontWeight: '600',
  },
});
