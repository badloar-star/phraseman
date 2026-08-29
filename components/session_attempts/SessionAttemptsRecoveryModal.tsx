import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SESSION_ATTEMPT_RUNE_COST } from '../../app/session_attempts/session_attempts_domain';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';

const RUNE_ASSET = require('../../assets/images/level-spin-rewards/stars_10.webp');
const ENERGY_ASSET = require('../../assets/images/energy/energy-start-cost.webp');

type Props = {
  visible: boolean;
  locale: string;
  giftCount: number;
  runeBalance: number;
  busy?: boolean;
  onUseGift: () => void;
  onSpendRunes: () => void;
  onRestartWithEnergy?: () => void;
  restartWithEnergyAvailable?: boolean;
  restartWithEnergyUnlimited?: boolean;
  onEndSession: () => void;
};

type DecisionButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  variant: 'gift' | 'runes' | 'energy' | 'exit';
  children: React.ReactNode;
};

function DecisionButton({ label, onPress, disabled, variant, children }: DecisionButtonProps) {
  const { theme: t } = useTheme();
  const isPrimary = variant === 'runes';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? t.accent : t.bgSurface2,
          borderColor: isPrimary ? t.accent : t.border,
          opacity: disabled ? 0.46 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: isPrimary ? t.correctText : t.textPrimary }]}>
        {children}
      </Text>
    </Pressable>
  );
}

function SessionAttemptsRecoveryModal({
  visible,
  locale,
  giftCount,
  runeBalance,
  busy = false,
  onUseGift,
  onSpendRunes,
  onRestartWithEnergy,
  restartWithEnergyAvailable = false,
  restartWithEnergyUnlimited = false,
  onEndSession,
}: Props) {
  const { theme: t, f } = useTheme();
  const copy = getSessionAttemptsCopy(locale);
  const safeGiftCount = Math.max(0, Math.floor(giftCount));
  const safeRuneBalance = Math.max(0, Math.floor(runeBalance));
  const canAfford = safeRuneBalance >= SESSION_ATTEMPT_RUNE_COST;
  const missingRunes = Math.max(0, SESSION_ATTEMPT_RUNE_COST - safeRuneBalance);
  const restartEnergyCost = restartWithEnergyUnlimited ? '∞' : '−1';
  const restartEnergyAccessibilityLabel = `${copy.restartWithEnergy} · ${restartEnergyCost}`;

  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={onEndSession}
      dismissible={false}
      shadowColor={t.wrong}
      backdropColor="rgba(2, 5, 3, 0.84)"
      testID="session-attempts-recovery-modal"
    >
      <View style={[styles.panel, { backgroundColor: t.bgCard }]}>
        <View style={[styles.hero, { backgroundColor: t.wrongBg }]} accessible={false}>
          <Ionicons name="heart-dislike" size={34} color={t.wrong} accessible={false} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {copy.exhaustedTitle}
        </Text>
        <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
          {copy.exhaustedBody}
        </Text>

        <View style={styles.actions}>
          {safeGiftCount > 0 ? (
            <View style={styles.actionGroup}>
              <DecisionButton label={copy.useGift} onPress={onUseGift} disabled={busy} variant="gift">
                <Ionicons name="gift-outline" size={18} color={t.textPrimary} />{' '}
                {copy.useGift} · {safeGiftCount}
              </DecisionButton>
              <Text style={[styles.helper, { color: t.textMuted, fontSize: f.caption }]}>
                {copy.permanentGift}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionGroup}>
            <DecisionButton
              label={copy.restoreForRunes}
              onPress={onSpendRunes}
              disabled={busy || !canAfford}
              variant="runes"
            >
              <Image source={RUNE_ASSET} style={styles.rune} accessibilityIgnoresInvertColors />{' '}
              {copy.restoreForRunes}
            </DecisionButton>
            {!canAfford ? (
              <Text style={[styles.helper, { color: t.wrong, fontSize: f.caption }]}>
                {copy.notEnoughRunes(missingRunes)}
              </Text>
            ) : null}
          </View>

          {onRestartWithEnergy ? (
            <DecisionButton
              label={restartEnergyAccessibilityLabel}
              onPress={onRestartWithEnergy}
              disabled={busy || !restartWithEnergyAvailable}
              variant="energy"
            >
              <Image
                testID="session-attempts-restart-energy-asset"
                source={ENERGY_ASSET}
                style={styles.energy}
                accessibilityIgnoresInvertColors
              />{' '}
              {restartEnergyCost} {' '}
              {copy.restartWithEnergy}
            </DecisionButton>
          ) : null}

          <DecisionButton label={copy.endSession} onPress={onEndSession} disabled={busy} variant="exit">
            {copy.endSession}
          </DecisionButton>
        </View>
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 22,
    alignItems: 'center',
  },
  hero: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 22,
    gap: 12,
  },
  actionGroup: {
    gap: 5,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  helper: {
    textAlign: 'center',
    minHeight: 17,
  },
  rune: {
    width: 18,
    height: 18,
  },
  energy: {
    width: 20,
    height: 20,
  },
});

export default memo(SessionAttemptsRecoveryModal);
