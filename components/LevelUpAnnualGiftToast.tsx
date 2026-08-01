import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { hapticTap } from '../hooks/use-haptics';
import type { LevelUpAnnualGiftOffer } from '../app/level_up_annual_gift';

type Props = Readonly<{ offer: LevelUpAnnualGiftOffer | null; onDismiss: () => void }>;

function remainingLabel(expiresAtMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function LevelUpAnnualGiftToast({ offer, onDismiss }: Props) {
  const router = useRouter();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const [nowMs, setNowMs] = useState(Date.now());
  const translateY = useRef(new Animated.Value(160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);
  const visible = !!offer && offer.offerExpiresAtMs > nowMs && (offer.state === 'available' || offer.state === 'trial_pending');

  useEffect(() => {
    if (!visible) return undefined;
    setNowMs(Date.now());
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    translateY.setValue(160);
    opacity.setValue(0);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 95, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
    return () => clearInterval(interval);
  }, [opacity, translateY, visible]);

  const dismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 180, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      dismissing.current = false;
      onDismiss();
    });
  }, [onDismiss, opacity, translateY]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 54 || gesture.vy > 0.65) dismiss();
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 130, friction: 14 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
  }), [dismiss, translateY]);

  if (!visible || !offer) return null;

  const openOffer = () => {
    hapticTap();
    router.push({ pathname: '/level_up_annual_gift_offer', params: { offerId: offer.offerId } } as never);
    dismiss();
  };

  return (
    <Animated.View {...panResponder.panHandlers} style={[styles.host, { bottom: bottomOffset, opacity, transform: [{ translateY }] }]}>
      <LinearGradient colors={['#262B2A', '#111514']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.limeRail} />
        <View style={styles.icon}><Ionicons name="gift-outline" size={22} color="#D5FF4B" /></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>ПОДАРОК ЗА УРОВЕНЬ</Text>
          <Text style={styles.title}>18 месяцев за цену года</Text>
          <Text style={styles.timer}>Осталось {remainingLabel(offer.offerExpiresAtMs, nowMs)}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Открыть подарок за уровень" onPress={openOffer} style={styles.open}>
          <Text style={styles.openText}>Открыть</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Закрыть подарок за уровень" onPress={dismiss} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={18} color="#AAB5AE" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

export default memo(LevelUpAnnualGiftToast);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, zIndex: 9998, elevation: 9998 },
  card: { minHeight: 104, padding: 13, paddingRight: 12, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 18, elevation: 14 },
  limeRail: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#D5FF4B' },
  icon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(213,255,75,0.12)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, eyebrow: { color: '#D5FF4B', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: '#F4F7F4', fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 2 }, timer: { color: '#AAB5AE', fontSize: 12, fontWeight: '700', marginTop: 3 },
  open: { minHeight: 44, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#D5FF4B', alignItems: 'center', justifyContent: 'center' }, openText: { color: '#07110A', fontSize: 12, fontWeight: '900' },
  close: { position: 'absolute', right: 4, top: 3, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
