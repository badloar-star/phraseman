/**
 * Значок «энергия копится быстрее», живущий над видеоплеером.
 *
 * зачем (владелец 2026-09-02): пока видео РЕАЛЬНО играет, единица энергии
 * восстанавливается за 10 минут вместо 30, и человек обязан это видеть. Значок
 * появляется по плею и исчезает по паузе — он честный индикатор работающего
 * ускорения, а не украшение.
 *
 * Владелец выбрал вариант C: одна строка «+1 через 7:12» с символом энергии.
 * Тихо и без лишних слов — работу ускорения показывает сам счётчик, который на
 * глазах тает втрое быстрее обычного.
 *
 * ВРЕМЯ БЕРЁТСЯ ТОЛЬКО ИЗ useEnergyCountdown — требование владельца: источник
 * времени обязан быть один, иначе цифры разойдутся между значком, полоской
 * энергии в шапке и модалкой «нет энергии». Своего таймера здесь нет и быть не
 * должно; тот же счётчик уже питает EnergyBar, NoEnergyModal и
 * LessonEnergyLightning.
 *
 * Почему сам себе фон, а не тема: значок лежит поверх ЧЁРНОГО кадра видео, где
 * тёмная тема даёт нечитаемый контраст. Поэтому подложка тёмно-стеклянная с
 * собственной непрозрачностью, а текст белый — 4.5:1 держится в обеих темах.
 * Обводки нет (запрет владельца): форму держат тон подложки и скругление.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useEnergyCountdown } from '../EnergyContext';
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
  // Тикаем только пока значок на экране: скрытый счётчик — лишние ре-рендеры
  // поверх играющего видео.
  const { formattedTime } = useEnergyCountdown({ visible });
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
  // Пустая строка = энергия полная или безлимит: обещать «+1» в этот момент
  // было бы враньём, а свой запасной текст развёл бы источники времени.
  if (!formattedTime) return null;

  const label = triLang(lang, {
    ru: `+1 через ${formattedTime}`,
    uk: `+1 через ${formattedTime}`,
    en: `+1 in ${formattedTime}`,
    es: `+1 en ${formattedTime}`,
    'pt-BR': `+1 em ${formattedTime}`,
    vi: `+1 sau ${formattedTime}`,
    id: `+1 dalam ${formattedTime}`,
    tr: `${formattedTime} sonra +1`,
    pl: `+1 za ${formattedTime}`,
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
      <View style={styles.labelWrap}>
        {/* Моноширинные цифры: без них строка дёргается на каждой смене секунды. */}
        <Text maxFontSizeMultiplier={1.2} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
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
  icon: { width: 20, height: 20 },
  labelWrap: { flexShrink: 1 },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

export default memo(VideoEnergyBoostBadge);
