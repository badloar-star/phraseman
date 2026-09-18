import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { HOME_RUNE_ICON_SOURCE } from './homeRuneAsset';
import { formatCompactNumber } from '../../app/format_compact_number';

/**
 * Тот же ассет для тех, кто рисует руну РЯДОМ со счётчиком, а не сам счётчик —
 * например летящие частицы сбора наград (HomeRewardCollectFlight).
 *
 * зачем экспорт, а не второй require: путь к валюте обязан жить в одном месте.
 * Разойдись он — частица летела бы одной картинкой, а приземлялась в другую.
 */
export { HOME_RUNE_ICON_SOURCE } from './homeRuneAsset';

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
  /** Compact 1K/1M notation for dense balance rows such as Quick Start. */
  compactFromThousands?: boolean;
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
  compactFromThousands = false,
  testID = 'home-runes-balance',
}: HomeRuneBalanceProps) {
  const displayBalance = compactFromThousands
    ? formatCompactNumber(balance)
    : compactRuneBalance(balance);
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
        source={HOME_RUNE_ICON_SOURCE}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {/* зачем: динамическое ужатие кегля здесь запрещено правилами проекта
          (лечим переносом/вёрсткой, не сжатием шрифта). compactRuneBalance/
          formatCompactNumber уже гарантируют короткую строку (≤2 знаков +
          суффикс даже для MAX_SAFE_INTEGER, см. tests/home_rune_balance_render.
          test.tsx), поэтому та подстраховка была лишней поверх уже решённой
          задачи — убрана. */}
      <Text
        testID="home-rune-balance-value"
        style={[styles.balance, { color, fontSize: valueSize }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1}
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
