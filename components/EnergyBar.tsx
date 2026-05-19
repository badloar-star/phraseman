import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING } from '../constants/motion';
import { useEnergy } from './EnergyContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import EnergyIcon from './EnergyIcon';
import { getAdaptiveEnergyIconLayout } from './energyIconLayout';
import EnergyRefillShardModal from './EnergyRefillShardModal';
import { hapticTap } from '../hooks/use-haptics';
import { BRAND_SHARDS_ES } from '../constants/terms_es';

const PREMIUM_BLUE = '#4FC3F7';

interface Props {
  size?: number; // icon size, default 30
  maxWidth?: number;
}

/**
 * EnergyBar — compact energy indicator for any screen header.
 * Uses EnergyContext — always synced globally. No local state needed.
 */
const BONUS_COLOR = '#FFD700'; // gold for bonus slots

export default function EnergyBar({ size = 30, maxWidth }: Props) {
  const { energy, bonusEnergy, maxEnergy, formattedTime, isUnlimited } = useEnergy();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const { width: windowWidth } = useWindowDimensions();
  const [refillModal, setRefillModal] = useState(false);
  const energyLongPressHint = triLang(lang, {
    ru: 'Долгое нажатие — восстановить энергию за осколки',
    uk: 'Довге натискання — відновити енергію за осколки',
    es: `Mantén pulsado para recuperar energía con ${BRAND_SHARDS_ES}`,
    'pt-BR': 'Mantenha pressionado para recuperar energia com fragmentos',
    vi: 'Nhấn giữ để hồi năng lượng bằng mảnh',
    id: 'Tahan untuk memulihkan energi dengan shard',
    tr: 'Parçalarla enerji yenilemek için basılı tut',
    pl: 'Przytrzymaj, aby odzyskać energię za odłamki',
  });

  // Scale bounce when a new energy icon fills during restore
  // Initialize with 10 (max possible) to handle dynamic maxEnergy growth
  const scaleAnims = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(1))
  ).current;

  // Separate anims for up to 4 bonus slots
  const bonusScaleAnims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(1))
  ).current;

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
        setTimeout(() => {
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
      }
    }
  }, [bonusEnergy, bonusScaleAnims]);

  const premiumAccent = PREMIUM_BLUE;
  const bonusAccent = BONUS_COLOR;
  const filledTint = isUnlimited ? premiumAccent : undefined;
  const filledColor = isUnlimited ? premiumAccent : t.gold;
  const emptyColor = t.textGhost;

  const safeBonus = Math.min(bonusEnergy, bonusScaleAnims.length);
  const totalSlots = Math.max(1, maxEnergy + safeBonus);
  const energyLayout = getAdaptiveEnergyIconLayout({
    slotCount: totalSlots,
    iconSize: size,
    maxWidth: maxWidth ?? Math.min(156, Math.max(size, windowWidth * 0.36)),
  });
  const overlap = energyLayout.marginLeft;

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onLongPress={() => {
          hapticTap();
          setRefillModal(true);
        }}
        delayLongPress={480}
        accessibilityHint={energyLongPressHint}
      >
      <View style={{ flexDirection: 'row', alignItems: 'center', width: energyLayout.width, maxWidth: energyLayout.maxWidth }}>
        {Array.from({ length: maxEnergy }).map((_, i) => (
          <Animated.View key={i} style={{ marginLeft: i > 0 ? overlap : 0, transform: [{ scale: scaleAnims[i] }] }}>
            <EnergyIcon
              filled={i < energy}
              themeColor={i < energy ? filledColor : emptyColor}
              size={energyLayout.iconSize}
              animateChange={true}
              shouldShake={false}
              themeMode={themeMode}
              tintColor={i < energy ? filledTint : undefined}
              isPremium={isUnlimited}
            />
          </Animated.View>
        ))}
        {safeBonus > 0 && Array.from({ length: safeBonus }).map((_, i) => (
          <Animated.View
            key={`bonus_${i}`}
            style={{ marginLeft: overlap, transform: [{ scale: bonusScaleAnims[i] }] }}
          >
            <EnergyIcon
              filled={true}
              themeColor={bonusAccent}
              size={energyLayout.iconSize}
              animateChange={false}
              shouldShake={false}
              themeMode={themeMode}
              tintColor={bonusAccent}
            />
          </Animated.View>
        ))}
      </View>
      </Pressable>
      {!isUnlimited && energy < maxEnergy && !!formattedTime && (
        <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
          {formattedTime}
        </Text>
      )}
      <EnergyRefillShardModal visible={refillModal} onClose={() => setRefillModal(false)} />
    </View>
  );
}
