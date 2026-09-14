import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang } from '../constants/i18n';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { AnimatedEnergyNumber } from './energy/AnimatedEnergyNumber';
import { EnergyInfoPopover } from './energy/EnergyInfoPopover';
import EnergyIcon from './EnergyIcon';
import { useEnergy } from './EnergyContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import PressableHybrid from './PressableHybrid';

interface Props {
  /** Deprecated sizing input: every screen now uses one fixed compact pill. */
  size?: number;
  maxWidth?: number;
  ownerActive?: boolean;
  /** Deprecated compatibility input: the pill is equally compact everywhere. */
  compact?: boolean;
}

const ENERGY_PILL_WIDTH = 60;
const ENERGY_PILL_HEIGHT = 28;
const ENERGY_PILL_TOUCH_HEIGHT = 44;

const COLORS = Object.freeze({
  background: '#0D1123',
  normal: '#9187FF',
  low: '#FF786F',
  overcharge: '#F5C451',
  value: '#FFFFFF',
});

function EnergyBar({ ownerActive = true }: Props) {
  const { energy, bonusEnergy, bonusEnergyCapacity, maxEnergy, isUnlimited } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const focused = useIsScreenFocused();
  const [infoVisible, setInfoVisible] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const anchorRef = useRef<View>(null);
  const activeCap = maxEnergy + Math.max(0, bonusEnergyCapacity);
  const current = Math.max(0, Math.min(activeCap, energy + bonusEnergy));
  const accent = bonusEnergyCapacity > 0
    ? COLORS.overcharge
    : current < 20
      ? COLORS.low
      : COLORS.normal;
  const iconSize = 13;
  const accessibilityLabel = useMemo(() => {
    if (isUnlimited) {
      return triLang(lang, {
        ru: 'Безлимитная энергия. Нажмите, чтобы узнать подробнее.', uk: 'Безлімітна енергія. Натисніть, щоб дізнатися більше.',
        en: 'Unlimited energy. Tap for details.', es: 'Energía ilimitada. Toca para ver detalles.',
        'pt-BR': 'Energia ilimitada. Toque para ver detalhes.', vi: 'Năng lượng không giới hạn. Nhấn để xem chi tiết.',
        id: 'Energi tanpa batas. Ketuk untuk detail.', tr: 'Sınırsız enerji. Ayrıntılar için dokunun.',
        pl: 'Nielimitowana energia. Dotknij, aby poznać szczegóły.',
      });
    }
    return triLang(lang, {
      ru: `Энергия ${current} из ${activeCap}.${current < 20 ? ' Низкий заряд.' : ''} Нажмите, чтобы узнать подробнее.`,
      uk: `Енергія ${current} з ${activeCap}. Натисніть, щоб дізнатися більше.`,
      en: `Energy ${current} of ${activeCap}. Tap for details.`, es: `Energía ${current} de ${activeCap}. Toca para ver detalles.`,
      'pt-BR': `Energia ${current} de ${activeCap}. Toque para ver detalhes.`, vi: `Năng lượng ${current} trên ${activeCap}. Nhấn để xem chi tiết.`,
      id: `Energi ${current} dari ${activeCap}. Ketuk untuk detail.`, tr: `Enerji ${current} / ${activeCap}. Ayrıntılar için dokunun.`,
      pl: `Energia ${current} z ${activeCap}. Dotknij, aby poznać szczegóły.`,
    });
  }, [activeCap, current, isUnlimited, lang]);

  const openInfo = useCallback(() => {
    const node = anchorRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setPopoverAnchor(width > 0 && height > 0 ? { x, y, w: width, h: height } : null);
        setInfoVisible(true);
      });
      return;
    }
    setPopoverAnchor(null);
    setInfoVisible(true);
  }, []);
  const closeInfo = useCallback(() => setInfoVisible(false), []);

  // hasPremiumAccess is synchronously seeded from the app snapshot. Waiting for
  // the async entitlement refresh made the free-user pill mount late and look
  // as if it was blinking. Paid snapshots still hide it from the first frame.
  if (hasPremiumAccess) return null;

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={styles.anchor}>
        <PressableHybrid
          testID="energy-numeric-pill"
          variant="chip"
          onPress={openInfo}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.touchTarget}
          contentStyle={[
            styles.capsule,
            bonusEnergyCapacity > 0 ? styles.overchargeGlow : null,
          ]}
        >
          <EnergyIcon
            filled
            themeColor={accent}
            tintColor={accent}
            size={iconSize}
            animateChange={focused && ownerActive}
            animateLoop={focused && ownerActive}
          />
          {isUnlimited ? (
            <Text style={styles.infinity} maxFontSizeMultiplier={1.15}>∞</Text>
          ) : (
            <AnimatedEnergyNumber
              value={current}
              active={focused && ownerActive}
              color={COLORS.value}
              style={styles.valueCompact}
            />
          )}
        </PressableHybrid>
      </View>
      <EnergyInfoPopover anchor={popoverAnchor} visible={infoVisible} onClose={closeInfo} />
    </>
  );
}

const styles = StyleSheet.create({
  anchor: { width: ENERGY_PILL_WIDTH, height: ENERGY_PILL_TOUCH_HEIGHT, alignSelf: 'center' },
  touchTarget: {
    width: ENERGY_PILL_WIDTH,
    height: ENERGY_PILL_TOUCH_HEIGHT,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  capsule: {
    width: ENERGY_PILL_WIDTH,
    height: ENERGY_PILL_HEIGHT,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  valueCompact: { width: 36, height: 21, fontSize: 15, lineHeight: 19 },
  infinity: { width: 30, textAlign: 'center', color: COLORS.value, fontSize: 17, lineHeight: 20, fontWeight: '900' },
  overchargeGlow: { shadowColor: COLORS.overcharge, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
});

export default memo(EnergyBar);
