/**
 * Значок «энергия копится быстрее», живущий над видеоплеером.
 *
 * зачем (владелец 2026-09-02): пока видео РЕАЛЬНО играет, единица энергии
 * восстанавливается в 10 раз быстрее пассивной скорости, и человек обязан это видеть. Значок
 * появляется по плею и исчезает по паузе — он честный индикатор работающего
 * ускорения, а не украшение.
 *
 * Показывает понятное пользователю сравнение скоростей без технических цифр.
 * Само начисление
 * ведёт durable-счётчик просмотра; этот компонент только отражает контракт.
 *
 * Почему сам себе фон, а не тема: значок лежит поверх ЧЁРНОГО кадра видео, где
 * тёмная тема даёт нечитаемый контраст. Поэтому подложка тёмно-стеклянная с
 * собственной непрозрачностью, а текст белый — 4.5:1 держится в обеих темах.
 * Обводки нет (запрет владельца): форму держат тон подложки и скругление.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';

type VideoEnergyBoostBadgeProps = {
  /** Видео идёт и ускорение реально начисляется. */
  visible: boolean;
  testID?: string;
};

function VideoEnergyBoostBadge({ visible, testID }: VideoEnergyBoostBadgeProps) {
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // Держим смонтированным на время выходной анимации: иначе значок исчезал бы
  // рывком, а по правилу движения выход обязан быть короче входа, но плавным.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    if (reduceMotion) {
      enter.setValue(visible ? 1 : 0);
      if (!visible) setMounted(false);
      return;
    }
    const animation = Animated.timing(enter, {
      toValue: visible ? 1 : 0,
      // Закон: выход короче входа.
      duration: visible ? LUM.contentMs : LUM.exitMs,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [enter, reduceMotion, visible]);

  if (!mounted) return null;
  const label = triLang(lang, {
    ru: 'Энергия восстанавливается', uk: 'Енергія відновлюється', en: 'Energy recovers',
    es: 'La energía se recupera', 'pt-BR': 'A energia se recupera',
    vi: 'Năng lượng hồi phục', id: 'Energi pulih', tr: 'Enerji yenilenir',
    pl: 'Energia odnawia się',
  });
  const detail = triLang(lang, {
    ru: 'в 10 раз быстрее', uk: 'у 10 разів швидше', en: '10× faster',
    es: '10 veces más rápido', 'pt-BR': '10 vezes mais rápido',
    vi: 'nhanh gấp 10 lần', id: '10× lebih cepat', tr: '10 kat daha hızlı',
    pl: '10 razy szybciej',
  });

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}. ${detail}`}
      style={[styles.badge, { opacity: enter, transform: [{ translateY }] }]}
    >
      <Ionicons name="flash-outline" size={20} color="#9187FF" importantForAccessibility="no" />
      <View style={styles.labelWrap}>
        <Text maxFontSizeMultiplier={1.2} style={styles.label}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.detail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '66%',
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 14,
    // Тёмное стекло поверх кадра: читается и на светлом, и на тёмном видео.
    backgroundColor: 'rgba(5,8,18,0.82)',
  },
  labelWrap: { flexShrink: 1 },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detail: { color: 'rgba(255,255,255,0.72)', fontSize: 10, lineHeight: 13, fontWeight: '700' },
});

export default memo(VideoEnergyBoostBadge);
