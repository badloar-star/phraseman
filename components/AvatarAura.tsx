import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View, ViewStyle } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from './SafeLinearGradient';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';
import { getAvatarAuraById, PREMIUM_AVATAR_AURA_ID, VIP_AVATAR_AURA_ID } from '../constants/avatar_auras';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

type Props = {
  auraId?: string | null;
  size: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Когда false — аура рендерится статично, без бесконечного loop.
   * Списки (лента/лиги/арена) монтируют десятки аватарок; каждый активный loop
   * перерисовывает тяжёлые тени/градиенты каждый кадр и греет телефон. Передавай
   * animate={false} для мелких аватарок в прокручиваемых списках.
   */
  animate?: boolean;
};

function AvatarAura({ auraId, size, children, style, animate = true }: Props) {
  const aura = getAvatarAuraById(auraId);
  const auraPhase = useRef(new Animated.Value(0)).current;
  const isPremiumAura = aura?.id === PREMIUM_AVATAR_AURA_ID;
  const isVipAura = aura?.id === VIP_AVATAR_AURA_ID;
  const isFlameAura = aura?.effect === 'flame';
  const isStormAura = aura?.effect === 'storm';
  const isStarVortexAura = aura?.effect === 'starvortex';
  const isVoidAmethystAura = aura?.effect === 'voidamethyst';
  const isNimbusAura = aura?.effect === 'nimbus';
  const isRichEffect = isFlameAura || isStormAura || isStarVortexAura || isVoidAmethystAura || isNimbusAura;
  const isFocused = useIsScreenFocused();
  const shouldAnimate = animate && isFocused && (((isPremiumAura || isVipAura) && size >= 52) || (isRichEffect && size >= 42));

  useEffect(() => {
    if (!shouldAnimate) {
      auraPhase.setValue(0);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      auraPhase.setValue(0);
      loop = isPremiumAura || isVipAura
        ? Animated.loop(Animated.sequence([
          Animated.timing(auraPhase, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auraPhase, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]))
        : Animated.loop(Animated.timing(auraPhase, {
          toValue: 1,
          duration: isStormAura ? 3200 : isStarVortexAura ? 4600 : isVoidAmethystAura ? 4000 : isNimbusAura ? 3800 : 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }));
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };

    // Анимируем только на переднем плане — в фоне нет смысла перерисовывать тени.
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [auraPhase, isPremiumAura, isStormAura, isStarVortexAura, isVoidAmethystAura, isNimbusAura, isVipAura, shouldAnimate]);

  if (!aura || size < 36) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {children}
      </View>
    );
  }

  if (isPremiumAura || isVipAura) {
    const outer = size + 6;
    const ring = 1;
    const main = aura.color;
    const bright = aura.color2 ?? '#FFF2A8';
    const glowScale = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.02] });
    const glowOpacity = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.28] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0.9] });
    const glintX = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [-outer * 0.42, outer * 0.42] });

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
            backgroundColor: aura.softColor,
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
            backgroundColor: 'transparent',
            overflow: 'hidden',
          }}
        >
          {shouldAnimate && (
            <Animated.View
              style={{
                position: 'absolute',
                top: -outer * 0.14,
                left: outer * 0.44,
                width: 2,
                height: outer * 1.2,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.34)',
                opacity: 0.24,
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
            borderColor: main,
            opacity: rimOpacity,
            shadowColor: main,
            shadowOpacity: 0.16,
            shadowRadius: 4,
            elevation: 2,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size + 2,
            height: size + 2,
            borderRadius: (size + 2) / 2,
            borderWidth: 1,
            borderColor: bright,
            opacity: 0.42,
          }}
        />
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  if (isNimbusAura) {
    // Дышащий нимб: два слоя мягкого синего свечения (внешний медленно «дышит»,
    // внутренний светлее и в противофазе) + тонкое кольцо-обод. Без полосок и вихрей.
    const outer = Math.round(size * 1.36);
    const ring = Math.max(1, Math.round(size * 0.035));
    const main = aura.color;
    const bright = aura.color2 ?? '#7DD3FC';
    const inner = aura.color3 ?? '#E0F2FE';
    const outerScale = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.06, 0.9] });
    const outerOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.32, 0.6, 0.32] });
    const innerScale = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.02, 0.86, 1.02] });
    const innerOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.26, 0.5] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.92, 0.6] });

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
            backgroundColor: aura.softColor,
            opacity: outerOpacity,
            transform: [{ scale: outerScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.82),
            height: Math.round(outer * 0.82),
            borderRadius: Math.round(outer * 0.41),
            backgroundColor: inner,
            opacity: innerOpacity,
            transform: [{ scale: innerScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            borderWidth: ring,
            borderColor: main,
            opacity: rimOpacity,
            shadowColor: main,
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 6,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size + 2,
            height: size + 2,
            borderRadius: (size + 2) / 2,
            borderWidth: 1,
            borderColor: bright,
            opacity: 0.5,
          }}
        />
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  if (isFlameAura) {
    const outer = Math.round(size * 1.42);
    const ring = Math.max(2, Math.round(size * 0.05));
    const heatScale = auraPhase.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.96, 1.11, 0.96] });
    const heatOpacity = auraPhase.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.34, 0.78, 0.34] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.68, 1, 0.68] });
    const coalOpacity = auraPhase.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0.46, 0.82, 0.5, 0.46] });
    const riseSlow = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [outer * 0.12, -outer * 0.08] });
    const riseFast = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [outer * 0.2, -outer * 0.16] });
    const tongueScale = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.86, 1.16, 0.86] });
    const sparkLift = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [outer * 0.26, -outer * 0.28] });
    const sparkFade = auraPhase.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 0.9, 0.78, 0] });

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
            backgroundColor: aura.softColor,
            opacity: heatOpacity,
            transform: [{ scale: heatScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.98),
            height: Math.round(outer * 0.98),
            borderRadius: Math.round(outer * 0.49),
            borderWidth: ring,
            borderColor: '#F97316',
            opacity: rimOpacity,
            shadowColor: '#F97316',
            shadowOpacity: 0.54,
            shadowRadius: 18,
            elevation: 8,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.8),
            height: Math.round(outer * 0.8),
            borderRadius: Math.round(outer * 0.4),
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: Math.round(outer * 0.3),
              bottom: -Math.round(outer * 0.2),
              width: Math.round(outer * 0.4),
              height: Math.round(outer * 0.58),
              borderRadius: Math.round(outer * 0.2),
              backgroundColor: 'rgba(250,204,21,0.18)',
              opacity: coalOpacity,
              transform: [{ translateY: riseSlow }, { scaleY: tongueScale }],
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: Math.round(outer * 0.17),
              bottom: -Math.round(outer * 0.16),
              width: Math.round(outer * 0.28),
              height: Math.round(outer * 0.5),
              borderRadius: Math.round(outer * 0.16),
              backgroundColor: 'rgba(251,146,60,0.2)',
              opacity: heatOpacity,
              transform: [{ translateY: riseFast }, { scaleX: 0.82 }, { scaleY: tongueScale }],
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              right: Math.round(outer * 0.14),
              bottom: -Math.round(outer * 0.17),
              width: Math.round(outer * 0.24),
              height: Math.round(outer * 0.46),
              borderRadius: Math.round(outer * 0.14),
              backgroundColor: 'rgba(255,255,255,0.16)',
              opacity: heatOpacity,
              transform: [{ translateY: riseSlow }, { scaleX: 0.72 }, { scaleY: tongueScale }],
            }}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.74),
            height: Math.round(outer * 0.74),
            borderRadius: Math.round(outer * 0.37),
            borderWidth: 1,
            borderColor: '#FDE68A',
            opacity: coalOpacity,
          }}
        />
        {[0.22, 0.38, 0.64, 0.78].map((left, index) => {
          const sparkSize = Math.max(2, Math.round(size * (index % 2 === 0 ? 0.045 : 0.035)));
          const localLift = index % 2 === 0 ? sparkLift : riseFast;
          return (
            <Animated.View
              key={`flame-spark-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: outer * left,
                top: outer * (0.5 + (index % 2) * 0.07),
                width: sparkSize,
                height: sparkSize,
                borderRadius: sparkSize / 2,
                backgroundColor: index === 1 ? '#FDBA74' : '#FDE68A',
                opacity: sparkFade,
                transform: [{ translateY: localLift }, { scale: tongueScale }],
              }}
            />
          );
        })}
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  if (isStormAura) {
    const outer = Math.round(size * 1.44);
    const ring = Math.max(2, Math.round(size * 0.045));
    const stormScale = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.97, 1.08, 0.97] });
    const stormOpacity = auraPhase.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0.3, 0.78, 0.46, 0.3] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 0.44, 0.72, 1], outputRange: [0.64, 1, 0.72, 0.64] });
    const arcRot = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const counterRot = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const boltOpacity = auraPhase.interpolate({ inputRange: [0, 0.12, 0.2, 0.42, 0.5, 0.72, 0.82, 1], outputRange: [0, 0.95, 0.12, 0, 0.82, 0.08, 0.55, 0] });
    const boltShift = auraPhase.interpolate({ inputRange: [0, 1], outputRange: [-outer * 0.1, outer * 0.08] });
    const cloudShift = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-outer * 0.06, outer * 0.07, -outer * 0.06] });
    const shear = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-16deg', '10deg', '-16deg'] });
    const sparkOpacity = auraPhase.interpolate({ inputRange: [0, 0.16, 0.3, 0.58, 0.76, 1], outputRange: [0.28, 0.92, 0.42, 0.8, 0.2, 0.28] });
    const boltSpecs = [
      { left: 0.23, top: 0.13, width: 0.28, height: 0.48, rotate: '-18deg', scale: 1 },
      { left: 0.56, top: 0.42, width: 0.24, height: 0.4, rotate: '16deg', scale: 0.82 },
      { left: 0.17, top: 0.52, width: 0.2, height: 0.34, rotate: '-5deg', scale: 0.68 },
    ];

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
            backgroundColor: aura.softColor,
            opacity: stormOpacity,
            transform: [{ scale: stormScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 1.06),
            height: Math.round(outer * 1.06),
            borderRadius: Math.round(outer * 0.53),
            opacity: stormOpacity,
            transform: [{ scale: stormScale }],
            overflow: 'hidden',
          }}
        >
          <ExpoLinearGradient
            colors={[
              'rgba(2,6,23,0)',
              'rgba(56,189,248,0.18)',
              'rgba(224,242,254,0.08)',
              'rgba(2,6,23,0)',
            ]}
            locations={[0, 0.38, 0.58, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ width: '100%', height: '100%', borderRadius: Math.round(outer * 0.53) }}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.98),
            height: Math.round(outer * 0.98),
            borderRadius: Math.round(outer * 0.49),
            borderWidth: ring,
            borderColor: aura.color,
            opacity: rimOpacity,
            shadowColor: aura.color,
            shadowOpacity: 0.54,
            shadowRadius: 18,
            elevation: 8,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.88),
            height: Math.round(outer * 0.88),
            borderRadius: Math.round(outer * 0.44),
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderColor: aura.color2 ?? aura.color,
            opacity: rimOpacity,
            transform: [{ rotate: arcRot }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.96),
            height: Math.round(outer * 0.96),
            opacity: rimOpacity,
            transform: [{ rotate: arcRot }],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="43" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="12 18" strokeLinecap="round" opacity="0.82" />
            <Circle cx="50" cy="50" r="35" fill="none" stroke="#E0F2FE" strokeWidth="0.8" strokeDasharray="4 16" strokeLinecap="round" opacity="0.62" />
          </Svg>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.72),
            height: Math.round(outer * 0.72),
            borderRadius: Math.round(outer * 0.36),
            borderBottomWidth: 1,
            borderLeftWidth: 1,
            borderColor: aura.color3 ?? '#E0F2FE',
            opacity: stormOpacity,
            transform: [{ rotate: counterRot }],
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(outer * 0.78),
            height: Math.round(outer * 0.78),
            borderRadius: Math.round(outer * 0.39),
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: Math.round(outer * 0.05),
              top: Math.round(outer * 0.22),
              width: Math.round(outer * 0.72),
              height: Math.round(outer * 0.28),
              borderRadius: Math.round(outer * 0.14),
              opacity: stormOpacity,
              transform: [{ translateX: cloudShift }, { rotate: '-12deg' }],
              overflow: 'hidden',
            }}
          >
            <ExpoLinearGradient
              colors={['rgba(15,23,42,0)', 'rgba(56,189,248,0.24)', 'rgba(96,165,250,0.1)', 'rgba(15,23,42,0)']}
              locations={[0, 0.38, 0.62, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: '100%', height: '100%', borderRadius: Math.round(outer * 0.14) }}
            />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              right: Math.round(outer * 0.05),
              bottom: Math.round(outer * 0.2),
              width: Math.round(outer * 0.58),
              height: Math.round(outer * 0.24),
              borderRadius: Math.round(outer * 0.12),
              opacity: rimOpacity,
              transform: [{ translateX: cloudShift }, { rotate: '14deg' }],
              overflow: 'hidden',
            }}
          >
            <ExpoLinearGradient
              colors={['rgba(15,23,42,0)', 'rgba(224,242,254,0.2)', 'rgba(96,165,250,0.12)', 'rgba(15,23,42,0)']}
              locations={[0, 0.42, 0.64, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: '100%', height: '100%', borderRadius: Math.round(outer * 0.12) }}
            />
          </Animated.View>
        </View>
        {boltSpecs.map((bolt, index) => {
          const boltW = Math.round(outer * bolt.width);
          const boltH = Math.round(outer * bolt.height);
          return (
            <Animated.View
              key={`storm-bolt-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: outer * bolt.left,
                top: outer * bolt.top,
                width: boltW,
                height: boltH,
                opacity: boltOpacity,
                shadowColor: '#E0F2FE',
                shadowOpacity: 0.9,
                shadowRadius: 10,
                transform: [{ translateX: boltShift }, { rotate: bolt.rotate }, { scale: bolt.scale }],
              }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 42 72">
                <Polygon
                  points="24,2 8,31 20,29 13,70 36,24 23,27 33,2"
                  fill={index === 1 ? 'rgba(186,230,253,0.22)' : 'rgba(224,242,254,0.26)'}
                  stroke="#E0F2FE"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <Polyline
                  points="24,2 8,31 20,29 13,70 36,24 23,27 33,2"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </Svg>
            </Animated.View>
          );
        })}
        {[0.18, 0.36, 0.63, 0.82].map((left, index) => {
          const dotSize = Math.max(2, Math.round(size * (index === 1 ? 0.052 : 0.038)));
          return (
            <Animated.View
              key={`storm-spark-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: outer * left,
                top: outer * (index % 2 === 0 ? 0.34 : 0.66),
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: index === 2 ? '#38BDF8' : '#E0F2FE',
                opacity: sparkOpacity,
                shadowColor: '#38BDF8',
                shadowOpacity: 0.8,
                shadowRadius: 8,
                transform: [{ rotate: shear }],
              }}
            />
          );
        })}
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  // ── STARVORTEX «Звёздный вихрь»: 3 наклонные орбиты + созвездие звёзд + мерцание ──
  if (isStarVortexAura) {
    const outer = Math.round(size * 1.5);
    const main = aura.color;            // напр. #C084FC
    const bright = aura.color2 ?? '#F5D0FE';
    const spark = aura.color3 ?? '#FEF9C3';
    const haloScale = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.95, 1.07, 0.95] });
    const haloOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.24, 0.5, 0.24] });
    const spin = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const spinSlow = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '200deg'] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.9, 0.55] });
    // 3 эллиптические орбиты под разными углами — вращаются как единое созвездие
    const orbitTilts = ['0deg', '60deg', '120deg'];
    // 5 звёзд-вершин созвездия, мерцают со сдвигом фазы
    const stars = [0, 1, 2, 3, 4].map((i) => {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = outer * (i % 2 === 0 ? 0.4 : 0.3);
      const cx = outer / 2 + Math.cos(angle) * r;
      const cy = outer / 2 + Math.sin(angle) * r;
      const ph = (i % 3) / 3;
      const seq = [0, 0.25, 0.5, 0.75, 1].map((v) => (v + ph) % 1).sort((a, b) => a - b);
      const twinkle = auraPhase.interpolate({ inputRange: seq, outputRange: [0.35, 0.95, 0.45, 0.9, 0.35] });
      const dot = Math.max(2, Math.round(size * (i % 2 === 0 ? 0.07 : 0.045)));
      return { cx, cy, twinkle, dot, color: i % 2 === 0 ? bright : main };
    });

    return (
      <View style={[{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: outer, height: outer, borderRadius: outer / 2,
            backgroundColor: aura.softColor, opacity: haloOpacity, transform: [{ scale: haloScale }],
          }}
        />
        {/* 3 наклонные эллиптические орбиты — вращаются вместе */}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: outer, height: outer, opacity: rimOpacity, transform: [{ rotate: spin }] }}
        >
          {orbitTilts.map((tilt, idx) => (
            <View
              key={`orbit-${idx}`}
              style={{
                position: 'absolute', left: outer * 0.06, top: outer * 0.3,
                width: outer * 0.88, height: outer * 0.4, borderRadius: outer * 0.44,
                borderWidth: 1.3, borderColor: idx === 1 ? bright : main,
                opacity: 0.7, transform: [{ rotate: tilt }],
              }}
            />
          ))}
        </Animated.View>
        {/* внутреннее кольцо-вихрь, крутится медленнее в ту же сторону */}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: Math.round(outer * 0.6), height: Math.round(outer * 0.6), opacity: rimOpacity, transform: [{ rotate: spinSlow }] }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="46" fill="none" stroke={main} strokeWidth="1.4" strokeDasharray="6 12" strokeLinecap="round" opacity="0.85" />
          </Svg>
        </Animated.View>
        {/* звёзды-вершины созвездия */}
        {stars.map((s, i) => (
          <Animated.View
            key={`sv-star-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute', left: s.cx - s.dot / 2, top: s.cy - s.dot / 2,
              width: s.dot, height: s.dot, borderRadius: s.dot / 2,
              backgroundColor: s.color, opacity: s.twinkle,
              shadowColor: s.color, shadowOpacity: 0.95, shadowRadius: 8,
            }}
          />
        ))}
        {/* мелкая звёздная пыль */}
        {[0.3, 0.66, 0.5].map((left, idx) => {
          const d = Math.max(2, Math.round(size * 0.03));
          const fade = auraPhase.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: idx === 1 ? [0.2, 0.9, 0.4, 0.2] : [0.5, 0.2, 0.85, 0.5] });
          return (
            <Animated.View
              key={`sv-dust-${idx}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: outer * left, top: outer * (0.24 + idx * 0.22),
                width: d, height: d, borderRadius: d / 2, backgroundColor: spark, opacity: fade,
                shadowColor: spark, shadowOpacity: 0.9, shadowRadius: 5,
              }}
            />
          );
        })}
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  // ── VOIDAMETHYST «Аметистовая бездна»: вращающаяся вуаль + встречные орбиты + неоновые орбы ──
  if (isVoidAmethystAura) {
    const outer = Math.round(size * 1.5);
    const main = aura.color;            // напр. #8B5CF6
    const bright = aura.color2 ?? '#67E8F9';    // неоновая бирюза (контраст)
    const deep = aura.color3 ?? '#C4B5FD';
    const veilRot = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const veilCounter = auraPhase.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const veilOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.32, 0.7, 0.32] });
    const breath = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.94, 1.09, 0.94] });
    const rimOpacity = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.95, 0.55] });
    const orbDrift = auraPhase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-outer * 0.05, outer * 0.06, -outer * 0.05] });
    const orbFade = auraPhase.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.25, 0.85, 0.5, 0.25] });
    const orbs = [
      { left: 0.24, top: 0.26, size: 0.07, color: bright },
      { left: 0.7, top: 0.42, size: 0.05, color: deep },
      { left: 0.46, top: 0.7, size: 0.09, color: main },
      { left: 0.32, top: 0.58, size: 0.045, color: bright },
    ];

    return (
      <View style={[{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }, style]}>
        {/* вращающаяся вуаль-градиент */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: outer, height: outer, borderRadius: outer / 2,
            opacity: veilOpacity, transform: [{ rotate: veilRot }, { scale: breath }], overflow: 'hidden',
          }}
        >
          <ExpoLinearGradient
            colors={['rgba(0,0,0,0)', aura.softColor, bright + '2E', main + '40', 'rgba(0,0,0,0)']}
            locations={[0, 0.3, 0.52, 0.72, 1]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={{ width: '100%', height: '100%', borderRadius: outer / 2 }}
          />
        </Animated.View>
        {/* встречная вуаль для глубины */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: Math.round(outer * 0.86), height: Math.round(outer * 0.86),
            borderRadius: outer / 2, opacity: veilOpacity, transform: [{ rotate: veilCounter }], overflow: 'hidden',
          }}
        >
          <ExpoLinearGradient
            colors={['rgba(0,0,0,0)', bright + '22', 'rgba(0,0,0,0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%', borderRadius: outer / 2 }}
          />
        </Animated.View>
        {/* дышащее главное кольцо со свечением */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: Math.round(outer * 0.92), height: Math.round(outer * 0.92),
            borderRadius: Math.round(outer * 0.46), borderWidth: 2, borderColor: main,
            opacity: rimOpacity, shadowColor: main, shadowOpacity: 0.6, shadowRadius: 18, elevation: 8,
            transform: [{ scale: breath }],
          }}
        />
        {/* тонкое неоновое внутреннее кольцо */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: Math.round(outer * 0.66), height: Math.round(outer * 0.66),
            borderRadius: Math.round(outer * 0.33), borderWidth: 1, borderColor: bright,
            opacity: rimOpacity, transform: [{ rotate: veilRot }], borderStyle: 'dashed',
          }}
        />
        {/* парящие неоновые орбы */}
        {orbs.map((o, idx) => {
          const d = Math.max(3, Math.round(size * o.size));
          return (
            <Animated.View
              key={`va-orb-${idx}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: outer * o.left, top: outer * o.top,
                width: d, height: d, borderRadius: d / 2, backgroundColor: o.color, opacity: orbFade,
                shadowColor: o.color, shadowOpacity: 0.95, shadowRadius: 10,
                transform: [{ translateY: orbDrift }],
              }}
            />
          );
        })}
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  const outer = Math.round(size + Math.max(4, Math.min(6, size * 0.12)));
  const ring = 1;

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
          opacity: 0.28,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: Math.round(outer * 0.92),
          height: Math.round(outer * 0.92),
          borderRadius: Math.round(outer * 0.46),
          borderWidth: 1,
          borderColor: aura.color,
          opacity: 0.2,
        }}
      />
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

export default memo(AvatarAura);
