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
      style={[s.frame, { backgroundColor: tone, boxShadow: [{ offsetX: 0, offsetY: 9, blurRadius: 18, color: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.32)' }] }, style]}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    borderBottomLeftRadius: SCENE_BOTTOM_RADIUS,
    borderBottomRightRadius: SCENE_BOTTOM_RADIUS,
    // зачем (Ревизор 29.10): без Android-elevation — иначе блок поднимается над соседями (шапка, «Назад», пилюли) и закрывает их; boxShadow рисуется на обеих платформах и порядок слоёв не меняет
  },
});
