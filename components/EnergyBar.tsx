import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { triLang } from '../constants/i18n';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { AnimatedEnergyNumber } from './energy/AnimatedEnergyNumber';
import { createEnergyPopoverRequestGate, EnergyInfoPopover } from './energy/EnergyInfoPopover';
import EnergyIcon from './EnergyIcon';
import { useEnergy, useEnergyCountdown } from './EnergyContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import PressableHybrid from './PressableHybrid';
import { useLv2Glass } from './learning-v2/LearningV2Glass';
import { nestedBoxShadow } from './v2/ShadowSurface';

interface Props {
  /** Deprecated sizing input: every screen now uses one fixed compact pill. */
  size?: number;
  maxWidth?: number;
  ownerActive?: boolean;
  /** Deprecated compatibility input: the pill is equally compact everywhere. */
  compact?: boolean;
  /**
   * зачем (learning-v2.html, шапка занятия `energy(n,{s:true})`): в занятии Learning V2 пилюля
   * энергии — нейтральная плита стекла с белой молнией, без фиолетового. Остальные экраны
   * (карта, карточки, диалоги) не передают флаг и остаются как были.
   */
  glass?: boolean;
  /**
   * зачем (Макеты 7c831a193 / d7cf7113d, dialogs-003/007/008): в образце диалогов `energy()` рисует ЗАЛИВНУЮ молнию (`boltF`), а по умолчанию значок — контурный (flash-outline).
   * Флаг включают только экраны Диалогов; остальные (Learning V2, уроки) остаются как были.
   */
  solidBolt?: boolean;
}

const ENERGY_PILL_WIDTH = 60;
const ENERGY_PILL_HEIGHT = 28;
const ENERGY_PILL_TOUCH_HEIGHT = 44;

/** kit.css @keyframes numdn: цифра «проваливается» (5 px вниз, .82, полупрозрачная) и пружинит обратно. */
const DROP_IN_MS = 230;
const DROP_OUT_MS = 420;
const DROP_EASE = Easing.bezier(0.3, 1.4, 0.5, 1);

/** Доля ёмкости, ниже которой заряд считается низким (красная молния). */
const LOW_CHARGE_SHARE = 0.2;

const COLORS = Object.freeze({
  background: '#0D1123', // theme-exempt: собственный тёмный фон капсулы энергии (белое значение читается на нём в любой теме)
  normal: '#9187FF', // theme-exempt: фирменный цвет заряда энергии
  low: '#FF786F', // theme-exempt: цвет «мало энергии»
  overcharge: '#F5C451', // theme-exempt: цвет перезаряда
  value: '#FFFFFF', // theme-exempt: значение на собственном тёмном фоне капсулы
});

function EnergyBar({ ownerActive = true, glass = false, solidBolt = false }: Props) {
  const lg = useLv2Glass();
  const { energy, bonusEnergy, bonusEnergyCapacity, maxEnergy, isUnlimited, recoveryIntervalMs } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const focused = useIsScreenFocused();
  const [infoVisible, setInfoVisible] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const anchorRef = useRef<View>(null);
  const popoverRequestGateRef = useRef(createEnergyPopoverRequestGate());
  const popoverRequestGate = popoverRequestGateRef.current;
  const popoverEligible = !hasPremiumAccess && focused && ownerActive;
  const popoverEligibleRef = useRef(popoverEligible);
  useLayoutEffect(() => {
    const lostEligibility = popoverEligibleRef.current && !popoverEligible;
    popoverEligibleRef.current = popoverEligible;
    if (lostEligibility) popoverRequestGate.invalidate();
  }, [popoverEligible, popoverRequestGate]);
  const popoverVisible = infoVisible && popoverEligible;
  const { formattedTime } = useEnergyCountdown({
    visible: popoverVisible,
  });
  const activeCap = maxEnergy + Math.max(0, bonusEnergyCapacity);
  const current = Math.max(0, Math.min(activeCap, energy + bonusEnergy));
  // зачем (эмулятор 30.09): порог «низкий заряд» был числом 20 от старой шкалы на 100; при
  // шкале 2.0 (5) молния горела красным ВСЕГДА. Доля 20% от ёмкости: на 100 — прежние <20.
  const lowCharge = current < Math.max(1, Math.ceil(activeCap * LOW_CHARGE_SHARE));
  const accent = bonusEnergyCapacity > 0
    ? COLORS.overcharge
    : lowCharge
      ? (glass ? lg.bad : COLORS.low)
      // зачем (темы 2.0): в «Акценте/Максимуме» молния в цвете темы; перезаряд (золото) и
      // низкий заряд (красный) — смысловые цвета, темой не красятся.
      : (lg.level === 'accent' || lg.level === 'max') ? lg.accentText : (glass ? lg.text : COLORS.normal);
  // зачем (владелец 01.10: «иконка энергии чуть больше и без фона нигде»): только значок и число.
  const iconSize = 17;
  // зачем (владелец 2026-09-30, learn.html C4 «−1 энергии при старте: 5 → 4»): в стеклянной
  // пилюле уменьшение энергии видно — цифра проваливается и пружинит обратно (650 мс), как
  // numdn в kit.css. Только glass и только при списании; на UI-треде, reduceMotion — без движения.
  const reducedMotion = useReducedMotion();
  const drop = useSharedValue(0);
  const previousCurrentRef = useRef(current);
  useEffect(() => {
    const previous = previousCurrentRef.current;
    previousCurrentRef.current = current;
    if (!glass || reducedMotion || !focused || !ownerActive || current >= previous) return;
    drop.value = withSequence(
      // зачем (координатор 10.10): в CSS animation-timing-function действует на КАЖДЫЙ интервал ключевых кадров — обе половины на кривой kit.
      withTiming(1, { duration: DROP_IN_MS, easing: DROP_EASE }),
      withTiming(0, { duration: DROP_OUT_MS, easing: DROP_EASE }),
    );
  }, [current, drop, focused, glass, ownerActive, reducedMotion]);
  const dropStyle = useAnimatedStyle(() => ({
    opacity: 1 - drop.value * 0.5,
    transform: [{ translateY: drop.value * 5 }, { scale: 1 - drop.value * 0.18 }],
  }));
  const accessibilityLabel = useMemo(() => {
    if (isUnlimited) {
      return triLang(lang, {
        ru: 'Безлимитная энергия. Нажми, чтобы узнать подробнее.', uk: 'Безлімітна енергія. Натисни, щоб дізнатися більше.',
        en: 'Unlimited energy. Tap for details.', es: 'Energía ilimitada. Toca para ver detalles.',
        'pt-BR': 'Energia ilimitada. Toque para ver detalhes.', vi: 'Năng lượng không giới hạn. Nhấn để xem chi tiết.',
        id: 'Energi tanpa batas. Ketuk untuk detail.', tr: 'Sınırsız enerji. Ayrıntılar için dokunun.',
        pl: 'Nielimitowana energia. Dotknij, aby poznać szczegóły.',
      });
    }
    return triLang(lang, {
      ru: `Энергия ${current} из ${activeCap}.${lowCharge ? ' Низкий заряд.' : ''} Нажми, чтобы узнать подробнее.`,
      uk: `Енергія ${current} з ${activeCap}. Натисни, щоб дізнатися більше.`,
      en: `Energy ${current} of ${activeCap}. Tap for details.`, es: `Energía ${current} de ${activeCap}. Toca para ver detalles.`,
      'pt-BR': `Energia ${current} de ${activeCap}. Toque para ver detalhes.`, vi: `Năng lượng ${current} trên ${activeCap}. Nhấn để xem chi tiết.`,
      id: `Energi ${current} dari ${activeCap}. Ketuk untuk detail.`, tr: `Enerji ${current} / ${activeCap}. Ayrıntılar için dokunun.`,
      pl: `Energia ${current} z ${activeCap}. Dotknij, aby poznać szczegóły.`,
    });
  }, [activeCap, current, isUnlimited, lang]);

  const openInfo = useCallback(() => {
    if (!popoverEligibleRef.current) return;
    const requestGeneration = popoverRequestGate.begin();
    const openForCurrentOwner = (nextAnchor: { x: number; y: number; w: number; h: number } | null) => {
      if (!popoverEligibleRef.current || !popoverRequestGate.isCurrent(requestGeneration)) return;
      setPopoverAnchor(nextAnchor);
      setInfoVisible(true);
    };
    const node = anchorRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        openForCurrentOwner(width > 0 && height > 0 ? { x, y, w: width, h: height } : null);
      });
      return;
    }
    openForCurrentOwner(null);
  }, [popoverRequestGate]);
  const closeInfo = useCallback(() => {
    popoverRequestGate.invalidate();
    setInfoVisible(false);
  }, [popoverRequestGate]);

  useEffect(() => {
    if (!popoverVisible && infoVisible) {
      popoverRequestGate.invalidate();
      setInfoVisible(false);
    }
  }, [infoVisible, popoverRequestGate, popoverVisible]);

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
            // зачем (сверка dialogs-001/007, Макеты 4fbcfc81d; образец kit.js `energy()` = `.pill`, эталон «Тень» etalon.html): в стеклянной шапке энергия сидит в капсуле — заливка токена темы + внутренняя тень «Тень», БЕЗ обводки.
            // Размер прежний (60×28, зафиксирован владельцем 24.09: тест energy_ui_owner_direction_probe); вне glass (старые шапки) пилюля по-прежнему без фона.
            glass ? { backgroundColor: lg.opaqueControl, borderRadius: ENERGY_PILL_HEIGHT / 2, boxShadow: nestedBoxShadow(lg) } : null,
          ]}
        >
          <EnergyIcon
            filled
            solid={solidBolt}
            themeColor={accent}
            tintColor={accent}
            size={iconSize}
            animateChange={focused && ownerActive}
            animateLoop={focused && ownerActive}
          />
          {isUnlimited ? (
            <Text style={styles.infinity} maxFontSizeMultiplier={1.15}>∞</Text>
          ) : (
            <Animated.View style={dropStyle}>
              <AnimatedEnergyNumber
                value={current}
                active={focused && ownerActive}
                color={glass ? lg.text : COLORS.value}
                style={styles.valueCompact}
              />
            </Animated.View>
          )}
        </PressableHybrid>
      </View>
      <EnergyInfoPopover
        anchor={popoverAnchor}
        visible={popoverVisible}
        onClose={closeInfo}
        current={current}
        capacity={activeCap}
        recoveryIntervalMs={recoveryIntervalMs}
        formattedTime={formattedTime}
        isUnlimited={isUnlimited}
      />
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
    gap: 2,
  },
  valueCompact: { width: 36, height: 22, fontSize: 16, lineHeight: 22 },
  infinity: { width: 30, textAlign: 'center', color: COLORS.value, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  overchargeGlow: { shadowColor: COLORS.overcharge, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
});

export default memo(EnergyBar);
