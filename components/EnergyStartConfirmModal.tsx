import React, { memo, useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, StyleSheet, Text, View, findNodeHandle } from 'react-native';
import { Image } from 'expo-image';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { energyStartConfirmationCopy } from './energy_start_confirmation';

const ENERGY_START_COST_IMAGE = require('../assets/images/energy/energy-start-cost.webp');

interface Props {
  visible: boolean;
  cost: number;
  transferring: boolean;
  onTargetChange: (target: { x: number; y: number }) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function EnergyStartConfirmModal({ visible, cost, transferring, onTargetChange, onConfirm, onCancel }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const copy = energyStartConfirmationCopy(lang, cost);
  const enter = useRef(new Animated.Value(0)).current;
  const titleRef = useRef<React.ElementRef<typeof Text> | null>(null);
  const confirmRef = useRef<React.ElementRef<typeof Pressable> | null>(null);

  const measureConfirmTarget = useCallback(() => {
    requestAnimationFrame(() => {
      confirmRef.current?.measureInWindow((x, y, width, height) => {
        onTargetChange({ x: x + width / 2, y: y + height / 2 });
      });
    });
  }, [onTargetChange]);

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const animation = Animated.spring(enter, {
      toValue: 1,
      damping: 19,
      stiffness: 240,
      mass: 0.72,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, reduceMotion, visible]);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
      measureConfirmTarget();
    });
    return () => cancelAnimationFrame(frame);
  }, [measureConfirmTarget, visible]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={transferring ? () => {} : onCancel}
    >
      <View
        testID="energy-start-confirm-modal"
        accessibilityViewIsModal
        style={[styles.backdrop, transferring ? styles.transferBackdrop : null]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.cancel}
          disabled={transferring}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: t.bgCard,
              opacity: transferring ? 0 : enter,
              transform: reduceMotion ? [] : [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={[styles.iconGlow, { backgroundColor: `${t.accent}1F` }]}>
            <View style={styles.costRow}>
              <Text style={[styles.cost, { color: t.textPrimary }]}>−{cost}</Text>
              <Image source={ENERGY_START_COST_IMAGE} style={styles.asset} contentFit="contain" />
            </View>
          </View>
          <Text ref={titleRef} accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{copy.title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{copy.body}</Text>
          <View style={styles.actions}>
            <Pressable
              testID="energy-start-confirm-cancel"
              accessibilityRole="button"
              accessibilityHint={copy.cancel}
              disabled={transferring}
              onPress={onCancel}
              style={({ pressed }) => [styles.secondary, { backgroundColor: t.bgPrimary, opacity: pressed ? 0.72 : 1 }]}
            >
              <Text style={[styles.secondaryText, { color: t.textPrimary }]}>{copy.cancel}</Text>
            </Pressable>
            <Pressable
              testID="energy-start-confirm-submit"
              ref={confirmRef}
              accessibilityRole="button"
              accessibilityLabel={copy.accessibilityLabel}
              accessibilityHint={copy.body}
              accessibilityState={{ busy: transferring, disabled: transferring }}
              disabled={transferring}
              onLayout={measureConfirmTarget}
              onPress={onConfirm}
              style={({ pressed }) => [styles.primary, { backgroundColor: t.accent, opacity: pressed ? 0.78 : 1 }]}
            >
              <Text style={[styles.primaryText, { color: t.correctText }]}>{copy.confirm}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(4, 7, 10, 0.76)',
  },
  transferBackdrop: { backgroundColor: 'transparent' },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 24,
  },
  iconGlow: {
    width: 108,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  costRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  cost: { fontSize: 24, fontWeight: '900', marginRight: 8 },
  asset: { width: 68, height: 68 },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { marginTop: 8, lineHeight: 22, textAlign: 'center' },
  actions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 22 },
  secondary: { flex: 0.82, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primary: { flex: 1.45, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  primaryText: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
});

export default memo(EnergyStartConfirmModal);
