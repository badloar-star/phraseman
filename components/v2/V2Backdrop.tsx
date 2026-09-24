import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useV2Palette } from './useV2Palette';

/**
 * Фон экранов 2.0: ровный тёмный с едва заметным светлым верхом.
 * Статичный градиент: без анимаций и без перерисовки при скролле.
 */
function V2Backdrop() {
  const p = useV2Palette();
  // зачем: владелец 24.09 — «пятна света на фоне убрать»: фон ровный тёмный,
  // глубину дают сами карточки (дымка внутри стекла), а не фон.
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[p.bgTop, p.bg]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default memo(V2Backdrop);
