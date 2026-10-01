import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SESSION_ATTEMPT_RUNE_COST } from '../../app/session_attempts/session_attempts_domain';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';
import { lv2Alpha, useLv2Glass } from '../learning-v2/LearningV2Glass';

const RUNE_ASSET = require('../../assets/images/coins/coin_rank_00.webp');

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
  // зачем (learning-v2.html, attempts): кнопки окна — глухие плиты стекла, главная (за руны)
  // залита цветом CTA темы; «Завершить сессию» — тихая текстовая кнопка без заливки.
  const g = useLv2Glass();
  const isPrimary = variant === 'runes';
  const isQuiet = variant === 'exit';
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
          backgroundColor: isPrimary ? g.cta : isQuiet ? 'transparent' : g.opaqueControl,
          opacity: disabled ? 0.46 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: isPrimary ? g.ctaInk : isQuiet ? g.secondary : g.text }]}>
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
  const { f } = useTheme();
  const g = useLv2Glass();
  const copy = getSessionAttemptsCopy(locale);
  const safeGiftCount = Math.max(0, Math.floor(giftCount));
  const safeRuneBalance = Math.max(0, Math.floor(runeBalance));
  const canAfford = safeRuneBalance >= SESSION_ATTEMPT_RUNE_COST;
  const missingRunes = Math.max(0, SESSION_ATTEMPT_RUNE_COST - safeRuneBalance);
  // PM-086: кнопка не показывает цену энергии; проверка и списание остаются прежними.
  const restartEnergyAccessibilityLabel = copy.restartWithEnergy;

  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={onEndSession}
      dismissible={false}
      shadowColor={g.bg}
      backdropColor="rgba(0, 0, 0, 0.68)"
      testID="session-attempts-recovery-modal"
    >
      <View style={[styles.panel, { backgroundColor: g.opaqueSheet }]}>
        {/* зачем (макет `attempts`): три погасших сердца вместо круглой красной иконки */}
        <View style={styles.hero} accessible={false}>
          {[0, 1, 2].map((index) => (
            <Ionicons key={index} name="heart" size={28} color={lv2Alpha(g.text, 0.22)} accessible={false} />
          ))}
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>
          {copy.exhaustedTitle}
        </Text>
        <Text style={[styles.body, { color: g.secondary, fontSize: f.body }]}>
          {copy.exhaustedBody}
        </Text>

        <View style={styles.actions}>
          {safeGiftCount > 0 ? (
            <View style={styles.actionGroup}>
              <DecisionButton label={copy.useGift} onPress={onUseGift} disabled={busy} variant="gift">
                <Ionicons name="gift-outline" size={18} color={g.text} />{' '}
                {copy.useGift} · {safeGiftCount}
              </DecisionButton>
              <Text style={[styles.helper, { color: g.secondary, fontSize: f.caption }]}>
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
              <Text style={[styles.helper, { color: g.bad, fontSize: f.caption }]}>
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 18,
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.6,
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
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
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
});

export default memo(SessionAttemptsRecoveryModal);
