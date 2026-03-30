import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, View, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

// Точные размеры как у нативного iOS Switch
const W   = 51;   // ширина трека
const H   = 31;   // высота трека
const D   = 27;   // диаметр thumb
const PAD = 2;    // отступ thumb от края
const MAX_X = W - D - PAD * 2; // максимальное смещение = 51-27-4 = 20

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function CustomSwitch({ value, onValueChange, disabled = false }: Props) {
  const { theme: t, isDark } = useTheme();

  const thumbX  = useRef(new Animated.Value(value ? MAX_X : 0)).current;
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(thumbX, {
        toValue: value ? MAX_X : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(progress, {
        toValue: value ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  // Выкл: цвет bgSurface из темы (подходит и тёмной и светлой)
  // Вкл: зелёный
  const trackColor = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [t.bgSurface, '#34C759'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => !disabled && onValueChange(!value)}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {/* Трек фиксированного размера */}
      <Animated.View style={[s.track, { backgroundColor: trackColor }]}>
        {/* Thumb — абсолютное позиционирование, не зависит от padding */}
        <Animated.View
          style={[
            s.thumb,
            {
              transform: [{ translateX: thumbX }],
              left: PAD,
              backgroundColor: t.bgCard,
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  track: {
    width:        W,
    height:       H,
    borderRadius: H / 2,
    // Без padding — thumb позиционируется абсолютно
  },
  thumb: {
    position:     'absolute',
    top:          PAD,
    width:        D,
    height:       D,
    borderRadius: D / 2,
    // Note: backgroundColor set dynamically in component based on theme
    shadowColor:     '#000',
    shadowOpacity:   0.25,
    shadowRadius:    3,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       3,
  },
});
