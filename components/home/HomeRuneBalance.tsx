import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

const HOME_HEADER_RUNE_ASSET = require('../../assets/images/level-spin-rewards/stars_10.webp');

type HomeRuneBalanceProps = Readonly<{
  balance: number;
  color: string;
  accessibilityLabel: string;
  /**
   * Размер иконки. По умолчанию — как в шапке Главной.
   * зачем: тот же счётчик понадобился в карточке «Цель лиги» (владелец,
   * 2026-08-24), где строка плотнее — ассет и формат числа обязаны остаться
   * общими, меняется только масштаб.
   */
  iconSize?: number;
  /** Кегль числа. По умолчанию — как в шапке Главной. */
  valueSize?: number;
  /** Резерв высоты под тап-цель шапки. В плотных строках выключается. */
  reserveTapHeight?: boolean;
  /**
   * Выключает собственную группу доступности, когда чип вложен в кнопку,
   * которая уже озвучивает баланс: иначе скринридер прочитает его дважды.
   */
  standaloneA11y?: boolean;
  testID?: string;
}>;

function compactRuneBalance(value: number): string {
  const balance = Number.isSafeInteger(value) && value > 0 ? value : 0;
  if (balance < 100_000) return String(balance);
  const units = [
    { divisor: 1_000_000_000_000_000, suffix: 'Q' },
    { divisor: 1_000_000_000_000, suffix: 'T' },
    { divisor: 1_000_000_000, suffix: 'B' },
    { divisor: 1_000_000, suffix: 'M' },
    { divisor: 1_000, suffix: 'K' },
  ] as const;
  const unit = units.find(({ divisor }) => balance >= divisor) ?? units[units.length - 1];
  const scaled = balance / unit.divisor;
  const rounded = scaled >= 100
    ? Math.round(scaled)
    : Math.round(scaled * 10) / 10;
  return `${rounded}${unit.suffix}`;
}

export default memo(function HomeRuneBalance({
  balance,
  color,
  accessibilityLabel,
  iconSize = 30,
  valueSize = 14,
  reserveTapHeight = true,
  standaloneA11y = true,
  testID = 'home-runes-balance',
}: HomeRuneBalanceProps) {
  const displayBalance = compactRuneBalance(balance);
  return (
    <View
      testID={testID}
      accessible={standaloneA11y}
      accessibilityLabel={standaloneA11y ? accessibilityLabel : undefined}
      importantForAccessibility={standaloneA11y ? 'auto' : 'no-hide-descendants'}
      style={[styles.container, reserveTapHeight ? styles.containerTapTarget : null]}
    >
      <Image
        testID="home-rune-asset"
        source={HOME_HEADER_RUNE_ASSET}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        testID="home-rune-balance-value"
        style={[styles.balance, { color, fontSize: valueSize }]}
        numberOfLines={1}
      >
        {displayBalance}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  containerTapTarget: { minHeight: 46 },
  balance: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
