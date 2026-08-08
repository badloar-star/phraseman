import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { soundDirector } from '../modules/audio/sound_director';
import { rewardModalAccentColor, rewardModalPanelBorder } from './RewardModalBackdrop';

const APPEARANCE_DELAY_MS = 280;
const ENTER_MS = 320;
const HOLD_MS = 1_100;
const EXIT_MS = 650;
const COMPLETE_MS = 2_700;

export type SpinRewardPlaqueProps = {
  amount: 1;
  receiptId: string;
  visible: boolean;
  onComplete: () => void;
  autoCompleteMs?: number;
  soundScope?: string;
  staticPresentation?: boolean;
  testID?: string;
};

/**
 * Single presentation standard for a spin that already has a durable receipt.
 * It deliberately owns no balance, delivery, or award business logic.
 */
export const SpinRewardPlaque = memo(function SpinRewardPlaque({
  amount,
  receiptId,
  visible,
  onComplete,
  autoCompleteMs = COMPLETE_MS,
  soundScope = 'spin-reward-plaque',
  staticPresentation = false,
  testID = 'spin-reward-plaque',
}: SpinRewardPlaqueProps) {
  const { theme, themeMode } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const handledReceiptRef = useRef<string | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (staticPresentation) return undefined;
    if (!visible || !receiptId || handledReceiptRef.current === receiptId) return undefined;
    handledReceiptRef.current = receiptId;
    opacity.setValue(0);
    scale.setValue(reduceMotion ? 1 : 0.92);
    translateY.setValue(0);
    soundDirector.request('pm.reward.small', {
      scope: soundScope,
      dedupeKey: receiptId,
      deferAfterVoice: true,
    });

    const exitAnimation = reduceMotion
      ? Animated.timing(opacity, { toValue: 0, duration: EXIT_MS, useNativeDriver: true })
      : Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: EXIT_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -96, duration: EXIT_MS, useNativeDriver: true }),
      ]);
    const animation = Animated.sequence([
      Animated.delay(APPEARANCE_DELAY_MS),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: ENTER_MS, useNativeDriver: true }),
        ...(reduceMotion ? [] : [Animated.timing(scale, { toValue: 1, duration: ENTER_MS, useNativeDriver: true })]),
      ]),
      Animated.delay(HOLD_MS),
      exitAnimation,
    ]);
    animation.start();
    const completionTimer = setTimeout(() => completeRef.current(), autoCompleteMs);

    return () => {
      animation.stop();
      clearTimeout(completionTimer);
    };
  }, [autoCompleteMs, opacity, receiptId, reduceMotion, scale, soundScope, staticPresentation, translateY, visible]);

  if (!visible || !receiptId) return null;

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme, accent);
  const label = triLang(lang, {
    ru: `+${amount} СПИН`, uk: `+${amount} СПІН`, es: `+${amount} GIRO`, 'pt-BR': `+${amount} GIRO`,
    vi: `+${amount} LƯỢT`, id: `+${amount} PUTARAN`, tr: `+${amount} ÇEVİRME`, pl: `+${amount} SPIN`,
  });

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={[
        plaqueStyles.plaque,
        {
          backgroundColor: theme.bgCard,
          borderColor: border,
          opacity: staticPresentation ? 1 : opacity,
          transform: staticPresentation ? [{ scale: 1 }, { translateY: 0 }] : [{ scale }, { translateY }],
        },
      ]}
    >
      <View style={[plaqueStyles.iconStage, { backgroundColor: accent }]}>
        <Ionicons name="sync" size={28} color="#101713" />
      </View>
      <Text style={[plaqueStyles.label, { color: theme.textPrimary }]}>{label}</Text>
    </Animated.View>
  );
});

const plaqueStyles = StyleSheet.create({
  plaque: {
    minHeight: 76,
    alignSelf: 'center',
    borderRadius: 23,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  iconStage: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
