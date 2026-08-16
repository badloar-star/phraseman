/**
 * AiConsentSheetModalHybrid — гибрид «Световод + Чекан» для общего движка
 * согласий (AiDialogConsentModal / AiExplainConsentModal). Каркас —
 * HybridSheetShell (подъём из света, без отскока), содержимое каскадом
 * LUM.ladder. Единственный микро-перелёт — кнопка согласия
 * (PRESS.releasePrimary при отпускании), остальное — тон, без удара
 * (закон «удар только у героя кульминации», тут кульминации нет).
 *
 * зачем: владелец (2026-08-15) — семья «Согласия и объяснения» переезжает на
 * гибрид; подключается ТОЛЬКО через AiConsentSheetModal.motionVariant='hybrid',
 * боевой путь (classic) не тронут.
 */
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LUM, PRESS } from '../constants/motionHybrid';
import { hapticTap } from '../hooks/use-haptics';
import { noAndroidOutline } from '../constants/androidGlow';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useTheme } from './ThemeContext';
import AiBadge from './AiBadge';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  testIdPrefix: string;
}

/** Один элемент каскада: opacity +小 translateY, вход по LUM.ladder[idx]. */
function CascadeItem({ index, style, children }: { index: number; style?: object; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(14);
  const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withSpring(0, LUM.settle));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function AcceptButton({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  const { theme: t, f } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    hapticTap();
    scale.value = withTiming(PRESS.scale.primary, { duration: PRESS.downMs });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS.releasePrimary);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.primaryBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
      >
        <Text style={[styles.primaryBtnText, { color: t.correctText, fontSize: f.bodyLg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function AiConsentSheetModalHybrid({ visible, title, body, acceptLabel, declineLabel, onAccept, onDecline, testIdPrefix }: Props) {
  const { theme: t, f } = useTheme();

  const handleAccept = useCallback(() => {
    onAccept();
  }, [onAccept]);

  const handleDecline = useCallback(() => {
    hapticTap();
    onDecline();
  }, [onDecline]);

  return (
    <HybridSheetShell visible={visible} onClose={onDecline} closeLabel={declineLabel} testID={`${testIdPrefix}-sheet`}>
      <CascadeItem index={0} style={styles.badgeRow}>
        <AiBadge />
      </CascadeItem>

      <CascadeItem index={1}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{title}</Text>
      </CascadeItem>

      <CascadeItem index={2}>
        <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>
      </CascadeItem>

      <CascadeItem index={3} style={styles.footer}>
        <AcceptButton label={acceptLabel} onPress={handleAccept} testID={`${testIdPrefix}-accept`} />
        <Pressable
          testID={`${testIdPrefix}-decline`}
          accessibilityRole="button"
          onPress={handleDecline}
          style={styles.secondaryBtn}
        >
          <Text style={[styles.secondaryBtnText, { color: t.textMuted, fontSize: f.body }]}>{declineLabel}</Text>
        </Pressable>
      </CascadeItem>
    </HybridSheetShell>
  );
}

export default memo(AiConsentSheetModalHybrid);

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  title: {
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 10,
  },
  body: {
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 20,
  },
  footer: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    ...noAndroidOutline,
  },
  primaryBtnText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
  },
});
