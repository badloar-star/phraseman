import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SPIN_TICKET_ACCENT, spinTicketImageSource } from '../app/spin_ticket_asset';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

type Props = Readonly<{
  size: number;
  accessibilityLabel: string;
  fallbackColor?: string;
}>;

/**
 * Единый значок СПИНА для всех поверхностей.
 *
 * зачем (владелец, 2026-08-26): спин упоминается в четырёх местах — кнопка на
 * Главной, награда сундука лиги, раздел «Подарки» и итог матча Арены. Раньше в
 * каждом рисовалось своё (эмодзи, иконка, заглушка-подарок), и одна и та же
 * награда выглядела по-разному. Один компонент = один узнаваемый образ везде.
 *
 * Текст (количество, название) рисует окружающий интерфейс — в самой картинке
 * по канону нет ни цифр, ни букв.
 */
export default function SpinTicketArt({
  size,
  accessibilityLabel,
  fallbackColor = SPIN_TICKET_ACCENT,
}: Props) {
  const source = spinTicketImageSource();

  if (!source) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <RetiredRasterFallback kind="gift" size={size} color={fallbackColor} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
