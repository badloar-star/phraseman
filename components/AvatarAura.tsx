import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import { getAvatarAuraById, PREMIUM_AVATAR_AURA_ID } from '../constants/avatar_auras';

type Props = {
  auraId?: string | null;
  size: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function AvatarAura({ auraId, size, children, style }: Props) {
  const aura = getAvatarAuraById(auraId);
  const premiumPhase = useRef(new Animated.Value(0)).current;
  const isPremiumAura = aura?.id === PREMIUM_AVATAR_AURA_ID;
  const animatePremium = isPremiumAura && size >= 52;

  useEffect(() => {
    if (!animatePremium) {
      premiumPhase.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(premiumPhase, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(premiumPhase, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animatePremium, premiumPhase]);

  if (!aura || size < 36) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {children}
      </View>
    );
  }

  if (isPremiumAura) {
    const outer = Math.round(size * 1.34);
    const ring = Math.max(2, Math.round(size * 0.05));
    const glowScale = premiumPhase.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] });
    const glowOpacity = premiumPhase.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0.88] });
    const rimOpacity = premiumPhase.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
    const glintX = premiumPhase.interpolate({ inputRange: [0, 1], outputRange: [-outer * 0.42, outer * 0.42] });

    return (
      <View
        style={[
          {
            width: outer,
            height: outer,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            backgroundColor: 'rgba(250,204,21,0.22)',
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.92),
            height: Math.round(outer * 0.92),
            borderRadius: Math.round(outer * 0.46),
            backgroundColor: 'rgba(255,214,10,0.13)',
            overflow: 'hidden',
          }}
        >
          {animatePremium && (
            <Animated.View
              style={{
                position: 'absolute',
                top: -outer * 0.14,
                left: outer * 0.44,
                width: Math.max(6, Math.round(size * 0.09)),
                height: outer * 1.2,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.42)',
                opacity: 0.36,
                transform: [{ translateX: glintX }, { rotate: '-24deg' }],
              }}
            />
          )}
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            borderWidth: ring,
            borderColor: '#FACC15',
            opacity: rimOpacity,
            shadowColor: '#FACC15',
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 8,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.78),
            height: Math.round(outer * 0.78),
            borderRadius: Math.round(outer * 0.39),
            borderWidth: 1,
            borderColor: '#FFF2A8',
            opacity: 0.68,
          }}
        />
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  const outer = Math.round(size * 1.22);
  const ring = Math.max(2, Math.round(size * 0.045));

  return (
    <View
      style={[
        {
          width: outer,
          height: outer,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          backgroundColor: aura.softColor,
          borderWidth: ring,
          borderColor: aura.color,
          opacity: 0.72,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: Math.round(outer * 0.84),
          height: Math.round(outer * 0.84),
          borderRadius: Math.round(outer * 0.42),
          borderWidth: 1,
          borderColor: aura.color,
          opacity: 0.52,
        }}
      />
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
