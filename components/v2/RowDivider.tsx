import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Разделитель линией-Viewом толщиной в волосок, а не рамкой (`borderTopWidth` и т. п.).
 * зачем (владелец 12.10, стиль «Тень» без обводок): сторож `shadow_style_no_container_borders` считает любую рамку; «разделитель-линия делается высотой View».
 * Кладётся ПЕРВЫМ ребёнком строки/блока (родитель — position: relative по умолчанию), цвет — токен темы (dividerTone / line). Нажатия не перехватывает.
 * edge: top/bottom — горизонтальная линия вдоль края, left/right — вертикальная (между ячейками и статистиками в ряду).
 */
export const RowDivider = memo(function RowDivider({ color, edge = 'top', inset = 0 }: Readonly<{ color: string; edge?: 'top' | 'bottom' | 'left' | 'right'; inset?: number }>) {
  if (edge === 'left' || edge === 'right') {
    return <View pointerEvents="none" style={[styles.vertical, edge === 'left' ? styles.left : styles.right, { top: inset, bottom: inset, backgroundColor: color }]} />;
  }
  return (
    <View
      pointerEvents="none"
      style={[styles.horizontal, edge === 'top' ? styles.top : styles.bottom, { left: inset, right: inset, backgroundColor: color }]}
    />
  );
});

const styles = StyleSheet.create({
  horizontal: { position: 'absolute', height: StyleSheet.hairlineWidth },
  vertical: { position: 'absolute', width: StyleSheet.hairlineWidth },
  top: { top: 0 },
  bottom: { bottom: 0 },
  left: { left: 0 },
  right: { right: 0 },
});
