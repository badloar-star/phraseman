import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';
import { LinearGradient } from './SafeLinearGradient';
import { themedToastChrome } from '../constants/themedToastChrome';

interface Props {
  message: string | null;
  onHide: () => void;
  duration?: number;
  type?: 'error' | 'info';
}

function InGameToast({ message, onHide, duration = 3000, type = 'info' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    let cancelled = false;
    const seq = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => {
      if (!finished || cancelled) return;
      queueMicrotask(() => {
        onHide();
      });
    });
    return () => {
      cancelled = true;
      seq.stop();
    };
  }, [message, anim, duration, onHide]);

  if (!message) return null;

  void type;
  const chrome = themedToastChrome(themeMode, t);

  return (
    <Animated.View style={[
      styles.toast,
      { borderColor: chrome.border, shadowColor: chrome.shadowColor, opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
    ]}>
      <LinearGradient colors={chrome.cardColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <Text style={{ color: chrome.title, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
        {message}
      </Text>
    </Animated.View>
  );
}

export default memo(InGameToast);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 999999,
    borderRadius: 16,
    borderWidth: 0,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 28,
  },
});
