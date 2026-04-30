// ShardsEarnedModal — красивая модалка при получении осколков
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Text, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from '../app/oskolok';

interface Props {
  visible: boolean;
  amount: number;
  reason: string;
  onClose: () => void;
}

export default function ShardsEarnedModal({ visible, amount, reason, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const scaleAnim  = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const gemBounce  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
    gemBounce.setValue(0);
    glowAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Gem bounce loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(gemBounce, { toValue: -10, duration: 500, useNativeDriver: true }),
          Animated.timing(gemBounce, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ).start();
    });

    const timer = setTimeout(() => { onClose(); }, 3500);
    return () => clearTimeout(timer);
  }, [visible, onClose, scaleAnim, opacityAnim, gemBounce, glowAnim]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          hapticTap();
          onClose();
        }}
        style={{
          flex: 1,
          backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.53)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={{
          backgroundColor: t.bgCard,
          borderRadius: 24,
          padding: 32,
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: t.accent,
          width: 280,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          shadowColor: t.accent,
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
        }}>
          {/* Gem icon with bounce */}
          <Animated.View style={{
            transform: [{ translateY: gemBounce }],
            marginBottom: 16,
          }}>
            <Animated.View style={{ opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }}>
              <Image source={oskolokImageForPackShards(amount)} style={{ width: 72, height: 72 }} resizeMode="contain" />
            </Animated.View>
          </Animated.View>

          {/* Amount */}
          <Text style={{
            color: t.textPrimary,
            fontSize: 44,
            fontWeight: '900',
            lineHeight: 50,
            marginBottom: 4,
          }}>
            +{amount}
          </Text>
          <Text style={{
            color: t.textSecond,
            fontSize: f.body,
            fontWeight: '700',
            marginBottom: 16,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            {isES
              ? amount === 1
                ? 'fragmento de conocimiento'
                : 'fragmentos de conocimiento'
              : isUK
              ? (amount === 1
                ? 'осколок знань'
                : amount >= 2 && amount <= 4
                  ? 'осколки знань'
                  : 'осколків знань')
              : (amount === 1
                ? 'осколок знаний'
                : amount >= 2 && amount <= 4
                  ? 'осколка знаний'
                  : 'осколков знаний')}
          </Text>

          {/* Reason */}
          <Text style={{
            color: t.textMuted,
            fontSize: f.sub,
            textAlign: 'center',
            lineHeight: 20,
          }}>
            {reason}
          </Text>

          {/* Tap to close hint */}
          <Text style={{ color: t.accent, fontSize: f.caption, marginTop: 20 }}>
            {isES ? 'Toca para cerrar' : isUK ? 'торкнись, щоб закрити' : 'нажми чтобы закрыть'}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
