import React, { memo, useEffect, useRef } from 'react';
import { Animated, Text, useWindowDimensions, View } from 'react-native';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { useEnergy, useEnergyCountdown } from './EnergyContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import EnergyIcon from './EnergyIcon';
import { getAdaptiveEnergyIconLayout } from './energyIconLayout';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

interface Props {
  size?: number; // icon size, default 30
  maxWidth?: number;
  ownerActive?: boolean;
}

/**
 * EnergyBar — compact energy indicator for any screen header.
 * Uses EnergyContext — always synced globally. No local state needed.
 */
const BONUS_COLOR = '#FFD700'; // gold for bonus slots
// Storage capacity remains authoritative for recovery. Rendering is bounded so
// a corrupt or unusually large-but-valid gift history cannot allocate an
// unbounded React/Animated tree in a header.
const MAX_RENDERED_ENERGY_SLOTS = 32;

function EnergyBar({ size = 30, maxWidth, ownerActive = true }: Props) {
  const { energy, bonusEnergy, bonusEnergyCapacity = 0, maxEnergy, isUnlimited } = useEnergy();
  const screenFocused = useIsScreenFocused();
  const { formattedTime } = useEnergyCountdown({ visible: screenFocused && ownerActive });
  const { hasPremiumAccess } = usePremium();
  const { theme: t, themeMode, f } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Scale bounce when a new energy icon fills during restore
  // Bounded to the same defensive ceiling as rendered slots.
  const scaleAnims = useRef(
    Array.from({ length: MAX_RENDERED_ENERGY_SLOTS }, () => new Animated.Value(1))
  ).current;

  const bonusScaleAnims = useRef(
    Array.from({ length: MAX_RENDERED_ENERGY_SLOTS }, () => new Animated.Value(1))
  ).current;
  const bonusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    bonusTimersRef.current.forEach(clearTimeout);
    bonusTimersRef.current = [];
  }, []);

  const prevEnergyRef = useRef(energy);
  useEffect(() => {
    const prev = prevEnergyRef.current;
    prevEnergyRef.current = energy;
    if (energy > prev && energy <= maxEnergy) {
      const idx = energy - 1;
      Animated.sequence([
        Animated.timing(scaleAnims[idx], {
          toValue: MOTION_SCALE.energyRefill,
          duration: MOTION_DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[idx], {
          toValue: 1,
          useNativeDriver: true,
          friction: MOTION_SPRING.ui.friction,
          tension: MOTION_SPRING.ui.tension,
        }),
      ]).start();
    }
  }, [energy, maxEnergy, scaleAnims]);

  const prevBonusRef = useRef(bonusEnergy);
  useEffect(() => {
    const prev = prevBonusRef.current;
    prevBonusRef.current = bonusEnergy;
    if (bonusEnergy > prev) {
      // Animate each newly added bonus slot
      for (let i = prev; i < bonusEnergy && i < bonusScaleAnims.length; i++) {
        const idx = i;
        const delay = (idx - prev) * 200;
        const timer = setTimeout(() => {
          bonusTimersRef.current = bonusTimersRef.current.filter(item => item !== timer);
          Animated.sequence([
            Animated.timing(bonusScaleAnims[idx], {
              toValue: MOTION_SCALE.energyRefill,
              duration: MOTION_DURATION.normal,
              useNativeDriver: true,
            }),
            Animated.spring(bonusScaleAnims[idx], {
              toValue: 1,
              useNativeDriver: true,
              friction: MOTION_SPRING.ui.friction,
              tension: MOTION_SPRING.ui.tension,
            }),
          ]).start();
        }, delay);
        bonusTimersRef.current.push(timer);
      }
    }
  }, [bonusEnergy, bonusScaleAnims]);

  const bonusAccent = BONUS_COLOR;
  const filledColor = t.gold;
  const emptyColor = t.textGhost;

  const activeBonusCapacity = Math.max(0, Math.floor(bonusEnergyCapacity));
  const renderedBaseCapacity = Math.min(
    MAX_RENDERED_ENERGY_SLOTS,
    Math.max(0, Math.floor(maxEnergy)),
  );
  const renderedBonusCapacity = Math.min(
    activeBonusCapacity,
    Math.max(0, MAX_RENDERED_ENERGY_SLOTS - renderedBaseCapacity),
  );
  const renderedBonusRemaining = Math.min(Math.max(0, bonusEnergy), renderedBonusCapacity);
  const totalSlots = Math.max(1, renderedBaseCapacity + renderedBonusCapacity);
  const energyLayout = getAdaptiveEnergyIconLayout({
    slotCount: totalSlots,
    iconSize: size,
    maxWidth: maxWidth ?? Math.min(156, Math.max(size, windowWidth * 0.36)),
  });
  const overlap = energyLayout.marginLeft;

  if (hasPremiumAccess) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: energyLayout.width, maxWidth: energyLayout.maxWidth }}>
        {Array.from({ length: renderedBaseCapacity }).map((_, i) => (
          <Animated.View key={i} style={{ marginLeft: i > 0 ? overlap : 0, transform: [{ scale: scaleAnims[i] }] }}>
            <EnergyIcon
              filled={i < energy}
              themeColor={i < energy ? filledColor : emptyColor}
              size={energyLayout.iconSize}
              animateChange={true}
              shouldShake={false}
              themeMode={themeMode}
            />
          </Animated.View>
        ))}
        {renderedBonusCapacity > 0 && Array.from({ length: renderedBonusCapacity }).map((_, i) => {
          const scale = bonusScaleAnims[i];
          const filled = i < renderedBonusRemaining;
          return (
            <Animated.View
              key={`bonus_${i}`}
              style={[
                { marginLeft: overlap },
                scale ? { transform: [{ scale }] } : null,
              ]}
            >
              <EnergyIcon
                filled={filled}
                themeColor={filled ? bonusAccent : emptyColor}
                size={energyLayout.iconSize}
                animateChange={true}
                shouldShake={false}
                themeMode={themeMode}
                tintColor={filled ? bonusAccent : emptyColor}
              />
            </Animated.View>
          );
        })}
      </View>
      {!isUnlimited && energy + bonusEnergy < maxEnergy + activeBonusCapacity && !!formattedTime && (
        <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
          {formattedTime}
        </Text>
      )}
    </View>
  );
}

export default memo(EnergyBar);
