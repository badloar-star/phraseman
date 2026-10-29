// ═══════════════════════════════════════════════════════════════════════════
// SceneBlockShadow.tsx — рамка сцены: заметная тень под нижним краем, блок приподнят над фоном экрана.
//
// зачем (владелец 29.10: «с тенью как отдельный элемент», «реально видимый переход со скруглёнными краями»; координатор: край резкий, без фейда, тень заметна):
// тень не рисуется у вью с overflow hidden (iOS режет), поэтому сцена кладётся ВНУТРЬ этой рамки: рамка несёт радиус низа 28, тень и фон нижнего тона (нужен
// Android-elevation), а сама сцена внутри клипает содержимое по тому же радиусу. Одинаково во всех сценах (Главная, Диалоги, «Сегодня», Сезон, Пик).
// ═══════════════════════════════════════════════════════════════════════════
import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../ThemeContext';

/** Радиус нижних углов сцены — тот же, что верхние углы карточки «Сегодня». */
export const SCENE_BOTTOM_RADIUS = 28;

type Props = Readonly<{ tone: string; children: ReactNode; style?: StyleProp<ViewStyle> }>;

export default function SceneBlockShadow({ tone, children, style }: Props) {
  const { isDark } = useTheme();
  return (
    <View
      pointerEvents="box-none"
      style={[s.frame, { backgroundColor: tone, shadowOpacity: isDark ? 0.7 : 0.32 }, style]}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    borderBottomLeftRadius: SCENE_BOTTOM_RADIUS,
    borderBottomRightRadius: SCENE_BOTTOM_RADIUS,
    shadowColor: '#000000', // theme-exempt: тень блока сцены — чёрная, тон задаёт прозрачность
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 12,
  },
});
