import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';

type Props = {
  f: { body: number };
  /** Контекст для premium_modal (аналитика / персонализация). */
  paywallContext?: string;
  /** Доп. стили оболочки (напр. `marginTop`). */
  shellStyle?: ViewStyle;
};

/** Золотой градиент + медленный перелив (shine) для CTA Premium — один стиль с NoEnergyModal. */
export default function PremiumGoldButton({ f, paywallContext = 'no_energy', shellStyle }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const shineX = useRef(new Animated.Value(0)).current;
  const label = triLang(lang, {
    ru: 'Получить Премиум',
    uk: 'Отримати Premium',
    es: 'Obtener Premium',
  });

  useEffect(() => {
    const sweepMs = 5600;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shineX, {
          toValue: 1,
          duration: sweepMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shineX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
    };
  }, [shineX]);

  const shineTranslate = shineX.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 560],
  });

  return (
    <View style={[styles.premiumBtnShell, shellStyle]}>
      <LinearGradient
        colors={['#5C4818', '#9A7B1A', '#D4AF37', '#F0D060', '#D4AF37', '#8A6B12']}
        locations={[0, 0.22, 0.45, 0.55, 0.78, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.premiumShineTrack,
          { transform: [{ translateX: shineTranslate }, { skewX: '-14deg' }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 252, 235, 0.5)', 'rgba(255, 255, 255, 0.72)', 'rgba(255, 252, 235, 0.5)', 'transparent']}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <TouchableOpacity
        onPress={() => {
          hapticTap();
          router.push({ pathname: '/premium_modal', params: { context: paywallContext } } as any);
        }}
        activeOpacity={0.88}
        style={styles.goldBtnTouchable}
      >
        <Text style={{ fontSize: 14 }}>✨</Text>
        <Text
          style={[
            styles.goldBtnText,
            {
              color: '#1a1206',
              fontSize: f.body,
              textShadowColor: 'rgba(255,248,220,0.55)',
              textShadowOffset: { width: 0, height: 0.5 },
              textShadowRadius: 2,
            },
          ]}
        >
          👑 {label}
        </Text>
        <Text style={{ fontSize: 14 }}>✨</Text>
      </TouchableOpacity>
      <View pointerEvents="none" style={[styles.premiumRim, { borderColor: 'rgba(255, 220, 140, 0.45)' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  premiumBtnShell: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 50,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  premiumShineTrack: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    width: 110,
    left: 0,
    zIndex: 1,
  },
  premiumRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 3,
  },
  goldBtnTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  goldBtnText: { fontWeight: '800', letterSpacing: 0.5 },
});
