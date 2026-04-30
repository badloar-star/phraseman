import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';

interface Props {
  message: string | null;
  onHide: () => void;
  duration?: number;
  type?: 'error' | 'info';
}

export default function InGameToast({ message, onHide, duration = 3000, type = 'info' }: Props) {
  const { theme: t, f } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [message, anim, duration, onHide]);

  if (!message) return null;

  const bg = type === 'error' ? t.wrongBg : t.bgCard;
  const border = type === 'error' ? t.wrong : t.border;

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: bg, borderColor: border, opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
    ]}>
      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 999,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
