import React, { forwardRef, memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { runeAmount } from '../constants/runes';
import { triLang, type Lang } from '../constants/i18n';

const RUNE_ASSET = require('../assets/images/level-spin-rewards/stars_10.webp');

/**
 * PracticeRuneCounter — счётчик рун, заработанных В ЭТОЙ сессии.
 *
 * зачем (владелец, 2026-08-27): «на этих экранах должен быть ассет в правом
 * верхнем углу где есть место чтобы оно не налазило на другие элементы».
 * Экраны — урок, словарь, неправильные глаголы, блиц, тренировка, отработка
 * ошибок, голосовая отработка.
 *
 * Почему НЕ переиспользуется RuneBalanceChip: тот показывает ОБЩИЙ баланс
 * кошелька. Здесь по решению владельца показывается «сколько я набрал прямо
 * сейчас» — число растёт от нуля, а на баланс руны падают только на экране
 * празднования. Показывать общий баланс во время сессии было бы враньём: он
 * не двигался бы ни на одном правильном ответе.
 *
 * Визуально — ровно пилюля из плеера Learning V2 (эталон владельца): тот же
 * ассет руны, то же скругление, тот же bump при начислении. Фон берётся из
 * токена темы экрана, обводки нет (запрет владельца: разделяем тоном).
 *
 * Ref пробрасывается наружу: экран измеряет пилюлю через measureInWindow,
 * чтобы полёт рун знал, куда лететь.
 */

type Props = Readonly<{
  /** Сколько рун набрано в сессии. */
  runes: number;
  lang: Lang;
  /** Фон пилюли — токен темы экрана (t.bgCard и аналоги). */
  backgroundColor: string;
  /** Цвет числа — токен темы, золотой не хардкодится. */
  color: string;
  testID?: string;
}>;

/**
 * Подпись для скринридера: «Заработано: 12 рун». Склонение общее (runeAmount),
 * своей таблицы форм не заводим — она разошлась бы с остальным приложением.
 */
function earnedLabel(lang: Lang, runes: number): string {
  const prefix = triLang(lang, {
    ru: 'Заработано', uk: 'Зароблено', en: 'Earned', es: 'Ganado',
    'pt-BR': 'Ganho', vi: 'Đã kiếm', id: 'Diperoleh', tr: 'Kazanılan',
    pl: 'Zdobyto',
  });
  return `${prefix}: ${runeAmount(lang, runes)}`;
}

export const PracticeRuneCounter = memo(forwardRef<View, Props>(
  function PracticeRuneCounter({ runes, lang, backgroundColor, color, testID }, ref) {
    const reducedMotion = useReducedMotion();
    const bump = useSharedValue(1);
    const previousRunes = useRef(runes);

    useEffect(() => {
      const grew = runes > previousRunes.current;
      previousRunes.current = runes;
      // зачем: пульс только на РОСТЕ. Первый кадр и сброс счётчика не должны
      // дёргать шапку — иначе экран «моргает» при каждом входе.
      if (!grew || reducedMotion) return;
      bump.value = withSequence(
        withTiming(1.28, { duration: 140 }),
        withTiming(1, { duration: 220 }),
      );
    }, [bump, reducedMotion, runes]);

    const bumpStyle = useAnimatedStyle(() => ({
      transform: [{ scale: bump.value }],
    }));

    return (
      <Animated.View style={bumpStyle}>
        <View
          ref={ref}
          collapsable={false}
          accessible
          accessibilityLabel={earnedLabel(lang, runes)}
          testID={testID ?? 'practice-rune-counter'}
          style={[styles.counter, { backgroundColor }]}
        >
          {/* guard-ok: ассет декоративен — смысл несёт accessibilityLabel
              родителя («Заработано: 12 рун»). Своя подпись у картинки заставила
              бы скринридер читать руну дважды. */}
          <Image
            source={RUNE_ASSET}
            style={styles.asset}
            contentFit="contain"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[styles.value, { color }]}>{runes}</Text>
        </View>
      </Animated.View>
    );
  },
));

const styles = StyleSheet.create({
  counter: {
    // Ширина под трёхзначное число задана минимумом: счётчик растёт от 0 до
    // сотен, и пилюля не должна дёргать соседей в шапке при каждом начислении
    // (правило стабильности вёрстки из Performance Bible).
    minWidth: 52,
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  asset: { width: 18, height: 18 },
  value: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    // Моноширинные цифры: число меняется каждые пару секунд, и без этого
    // пилюля «дышала» бы шириной на каждом начислении.
    fontVariant: ['tabular-nums'],
  },
});

export default PracticeRuneCounter;
