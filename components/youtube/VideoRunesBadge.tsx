/**
 * Значок «руны за просмотр» над видеоплеером — для Plus/Pro.
 *
 * зачем (владелец 2026-09-03): бесплатному во время просмотра ускоряется
 * энергия, а у платных она безлимитная — ускорять нечего, и значок им вообще не
 * показывался. Вместо энергии им капают руны: 3 за каждую полную минуту.
 *
 * Вид — вариант 2 по выбору владельца из четырёх макетов: «+N руны» и отсчёт
 * «ещё через M:SS» плюс полоска минуты внизу кадра. Он единственный отвечает
 * сразу на оба вопроса — сколько уже дали и когда прилетит следующая.
 *
 * Ассет руны берётся тот же, что в шапке Главной (HomeRuneBalance), — иначе
 * валюта выглядела бы на разных экранах по-разному.
 *
 * Фон свой, тёмно-стеклянный, а не из темы: значок лежит поверх ЧЁРНОГО кадра
 * видео, где тема даёт нечитаемый контраст. Обводки нет (запрет владельца) —
 * форму держат тон подложки и скругление.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { runeAmount } from '../../constants/runes';
import { triLang } from '../../constants/i18n';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';

const RUNE_ASSET = require('../../assets/images/level-spin-rewards/stars_10.webp');

type VideoRunesBadgeProps = {
  /** Видео идёт и руны реально капают (Plus/Pro). */
  visible: boolean;
  /** Сколько накапало за текущий сеанс просмотра. */
  earned: number;
  /** Секунд до следующей руны (0..60). */
  secondsToNext: number;
  testID?: string;
};

function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.min(60, Math.round(total)));
  return `0:${safe < 10 ? '0' : ''}${safe}`;
}

function VideoRunesBadge({ visible, earned, secondsToNext, testID }: VideoRunesBadgeProps) {
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // Держим смонтированным на время выходной анимации: иначе значок пропадал бы
  // рывком. Выход короче входа — закон движения проекта.
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

  // Склонение берём общим runeAmount: своя таблица форм разошлась бы с остальным
  // приложением (наивный вариант читал «1 рун»).
  const earnedText = `+${runeAmount(lang, earned)}`;
  const nextText = triLang(lang, {
    ru: `ещё через ${formatSeconds(secondsToNext)}`,
    uk: `ще через ${formatSeconds(secondsToNext)}`,
    en: `next in ${formatSeconds(secondsToNext)}`,
    es: `otra en ${formatSeconds(secondsToNext)}`,
    'pt-BR': `mais uma em ${formatSeconds(secondsToNext)}`,
    vi: `tiếp theo sau ${formatSeconds(secondsToNext)}`,
    id: `berikutnya ${formatSeconds(secondsToNext)}`,
    tr: `sonraki ${formatSeconds(secondsToNext)}`,
    pl: `kolejna za ${formatSeconds(secondsToNext)}`,
  });

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  // Полоска минуты: 0 секунд = минута прошла целиком.
  const progress = Math.max(0, Math.min(1, (60 - Math.max(0, Math.min(60, secondsToNext))) / 60));

  return (
    <>
      <Animated.View
        testID={testID}
        pointerEvents="none"
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${earnedText}, ${nextText}`}
        style={[styles.badge, { opacity: enter, transform: [{ translateY }] }]}
      >
        <Image
          source={RUNE_ASSET}
          style={styles.icon}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
        />
        <View style={styles.labelWrap}>
          <Text maxFontSizeMultiplier={1.2} style={styles.label} numberOfLines={1}>
            {earnedText}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.sub} numberOfLines={1}>
            {nextText}
          </Text>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.track, { opacity: enter }]}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </Animated.View>
    </>
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
    gap: 7,
    maxWidth: '72%',
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 14,
    // Тёмное стекло поверх кадра: читается и на светлом, и на тёмном видео.
    backgroundColor: 'rgba(5,8,18,0.82)',
  },
  icon: { width: 22, height: 22 },
  labelWrap: { flexShrink: 1 },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sub: {
    color: '#C9CEDA',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fill: { height: '100%', backgroundColor: '#AFA9EC' },
});

export default memo(VideoRunesBadge);
