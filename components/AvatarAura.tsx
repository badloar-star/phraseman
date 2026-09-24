import React, { memo } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

type Props = {
  auraId?: string | null;
  size: number;
  visualSize?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Disable the loop for small avatars mounted in scrollable lists. */
  animate?: boolean;
  ownerActive?: boolean;
  /**
   * Внешний общий прогресс цикла (0→1). Когда передан, аура не заводит свой
   * таймер, а живёт чужим: несколько аватарок дышат в такт, а не каждая своим
   * loop'ом — это и дешевле по кадрам.
   * зачем: восстановлено из работы владельца 2026-08-30/31.
   */
  motionProgress?: Animated.Value;
};

// зачем (PM-062/D61, владелец 2026-09-24): «ауры удаляем без замены» — монета
// ранга (D60) теперь сама и есть новый аватар, отдельного «аватар + аура»
// больше нет. Компонент раньше рисовал кольцо/градиент вокруг аватара из
// ассетов assets/images/avatar-auras(-hd) — эти ассеты удалены целиком.
// Компонент оставлен как тонкая прослойка (а не удалён из всех 5 мест
// вызова: AvatarView, LeagueChestOpenModal, LevelGiftModal/DualModal,
// PremiumAvatarHalo), чтобы не трогать код/данные покупок/наград в тех
// файлах — здесь просто нейтральный показ содержимого без ауры для ВСЕХ,
// а не только фолбэком для отсутствующей ауры (тот путь и раньше существовал
// для `!aura || size < 36` — теперь он единственный).
function AvatarAura({ size, style, children }: Props) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {children}
    </View>
  );
}

export default memo(AvatarAura);
