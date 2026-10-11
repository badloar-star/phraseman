import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Разделитель строк списка линией-Viewом высотой в волосок, а не рамкой (`borderTopWidth`).
 * зачем (владелец 12.10, стиль «Тень» без обводок): сторож `shadow_style_no_container_borders` считает любую рамку; «разделитель-линия делается высотой View».
 * Кладётся ПЕРВЫМ ребёнком строки (строка — position: relative по умолчанию), цвет — токен темы (dividerTone / line). Нажатия не перехватывает.
 */
export const RowDivider = memo(function RowDivider({ color, edge = 'top', inset = 0 }: Readonly<{ color: string; edge?: 'top' | 'bottom'; inset?: number }>) {
  return (
    <View
      pointerEvents="none"
      style={[styles.line, edge === 'top' ? styles.top : styles.bottom, { left: inset, right: inset, backgroundColor: color }]}
    />
  );
});

const styles = StyleSheet.create({
  line: { position: 'absolute', height: StyleSheet.hairlineWidth },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
