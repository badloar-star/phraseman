/**
 * Значок «энергия копится быстрее», живущий над видеоплеером.
 *
 * зачем (владелец 2026-09-02): пока видео РЕАЛЬНО играет, единица энергии
 * восстанавливается за 10 минут вместо 30, и человек обязан это видеть. Значок
 * появляется по плею и исчезает по паузе — он честный индикатор работающего
 * ускорения, а не украшение.
 *
 * Почему сам себе фон, а не тема: значок лежит поверх ЧЁРНОГО кадра видео, где
 * тёмная тема даёт нечитаемый контраст. Поэтому подложка тёмно-стеклянная с
 * собственной непрозрачностью, а текст белый — 4.5:1 держится в обеих темах.
 * Обводки нет (запрет владельца): форму держат тон подложки и скругление.
 */

import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';

const ENERGY_IMAGE = require('../../assets/images/energy/energy-start-cost.webp');

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
  const [mounted, setMounted] = React.useState(visible);

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
    ru: 'Энергия копится быстрее',
    uk: 'Енергія накопичується швидше',
    en: 'Energy refills faster',
    es: 'La energía se recarga más rápido',
    'pt-BR': 'A energia recarrega mais rápido',
    vi: 'Năng lượng hồi nhanh hơn',
    id: 'Energi terisi lebih cepat',
    tr: 'Enerji daha hızlı doluyor',
    pl: 'Energia ładuje się szybciej',
  });

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.badge, { opacity: enter, transform: [{ translateY }] }]}
    >
      <Image
        source={ENERGY_IMAGE}
        style={styles.icon}
        contentFit="contain"
        accessible={false}
        importantForAccessibility="no"
      />
      <Text maxFontSizeMultiplier={1.2} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
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
    maxWidth: '72%',
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 14,
    // Тёмное стекло поверх кадра: читается и на светлом, и на тёмном видео.
    backgroundColor: 'rgba(5,8,18,0.82)',
  },
  icon: { width: 20, height: 20 },
  label: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
});

export default memo(VideoEnergyBoostBadge);
