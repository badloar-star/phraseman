/**
 * BonusXPCard - Карточка анимированного XP бонуса
 *
 * Отображается при выигрыше переменного вознаграждения
 * - Slide-up анимация
 * - Звуковой эффект
 * - Исчезает через 2 сек или при тапе
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { hapticMediumImpact } from '../hooks/use-haptics';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
import { GOLD_RICH } from '../constants/goldTheme';
import { OLIVE_RICH } from '../constants/oliveTheme';

export interface BonusXPCardProps {
  bonusXP: number;
  onDismiss: () => void;
  position?: 'bottom' | 'center';
  duration?: number;
}

function BonusXPCard({
  bonusXP,
  onDismiss,
  position = 'bottom',
  duration = 2000,
}: BonusXPCardProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const L = (copy: Record<Lang, string>) => triLang(lang, copy);
  const isGoldTheme = themeMode === 'gold';
  const isOliveTheme = themeMode === 'olive';
  // зачем: карточка была фикс-тёмной #1a1a2e, а тексты — токенами темы: на
  // sagePorcelain тёмный текст ложился на тёмную плашку. Светлая тема получает
  // фарфоровую карту и тёмные tier-цвета из утверждённой палитры.
  const isLight = isLightThemeMode(themeMode);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissCard = useCallback(() => {
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
  }, [onDismiss, opacityAnim, scaleAnim]);

   
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
    // Хаптика
    void hapticMediumImpact();

    // Автоисчезновение через duration
    dismissTimerRef.current = setTimeout(() => {
      dismissCard();
    }, duration);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [dismissCard, duration, opacityAnim, scaleAnim, slideAnim]);

  const getTierColor = () => {
    if (isOliveTheme) return OLIVE_RICH.champagne;
    if (isGoldTheme) {
      if (bonusXP <= 10) return GOLD_RICH.agedGold;
      if (bonusXP <= 20) return GOLD_RICH.metalGold;
      return GOLD_RICH.champagne;
    }
    if (isLight) {
      if (bonusXP <= 10) return '#2F6F4F';
      if (bonusXP <= 20) return '#8B6320';
      return '#315F50';
    }
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
        style={[
          styles.card,
          {
            backgroundColor: isOliveTheme ? OLIVE_RICH.raised : isGoldTheme
              ? GOLD_RICH.blackPiano
              : isLight ? t.bgCard : '#1a1a2e',
          },
        ]}
      >
        {isOliveTheme ? <Ionicons name="sparkles" size={26} color={OLIVE_RICH.champagne} style={styles.emoji} /> : <Text style={styles.emoji}>{getTierEmoji()}</Text>}

        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: t.textPrimary }]}>{L({ ru: 'Бонус XP!', uk: 'Бонус XP!', es: '¡Bonificación de XP!', 'pt-BR': 'Bônus de XP!', vi: 'Thưởng XP!', id: 'Bonus XP!', tr: 'XP Bonusu!', pl: 'Bonus XP!' })}</Text>
          <Text style={[styles.bonus, { color: getTierColor() }]}>
            +{bonusXP}
          </Text>
        </View>

        <Text style={[styles.tap, { color: t.textMuted }]}>{L({ ru: 'Нажми', uk: 'Торкнись', es: 'Toca', 'pt-BR': 'Toque', vi: 'Chạm', id: 'Ketuk', tr: 'Dokun', pl: 'Dotknij' })}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(BonusXPCard);

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
    borderWidth: 0,
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
