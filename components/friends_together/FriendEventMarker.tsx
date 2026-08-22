import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { FriendSocialEvent } from '../../app/friend_social_events';
import { remainingDuelSeconds } from '../../app/friend_social_events';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { LUM } from '../../constants/motionHybrid';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

const PORCELAIN = '#EEE7DB';
const GRAPHITE = '#2D3842';
const TEAL = '#5E8C90';
const AMBER = '#DF824B';

type Props = { event: FriendSocialEvent; onPress: () => void; nowMs?: number };

function FriendEventMarker({ event, onPress, nowMs }: Props) {
  const reduceMotion = useReduceMotion();
  // зачем (аудит скорости 2026-08-22): секундный тикер дуэли жил и на
  // замороженном/фоновом экране (Performance Bible: freeze гасит рендеры, но
  // не таймеры). Гейтим фокусом+AppState; при возврате первый setLiveNowMs
  // выполняется сразу, до интервала — отсчёт не показывает устаревшее время.
  const runtimeActive = useRuntimeActive();
  const { lang } = useLang();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);
  const [liveNowMs, setLiveNowMs] = useState(() => nowMs ?? Date.now());
  useEffect(() => {
    if (typeof nowMs === 'number') {
      setLiveNowMs(nowMs);
      return undefined;
    }
    if (event.kind !== 'duel_invite') return undefined;
    setLiveNowMs(Date.now());
    if (!runtimeActive) return undefined;
    const ticker = setInterval(() => setLiveNowMs(Date.now()), 1_000);
    return () => clearInterval(ticker);
  }, [event.kind, event.expiresAtMs, nowMs, runtimeActive]);
  useEffect(() => {
    if (reduceMotion) { opacity.value = 1; scale.value = 1; return; }
    opacity.value = withTiming(1, { duration: LUM.resolveMs });
    scale.value = withSpring(1, LUM.settle);
    return () => { cancelAnimation(opacity); cancelAnimation(scale); };
  }, [opacity, reduceMotion, scale]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const accessibilityLabel = event.kind === 'high_five'
    ? triLang(lang, { ru: 'Открыть пятюню', uk: 'Відкрити п’ять', es: 'Abrir saludo', 'pt-BR': 'Abrir cumprimento', vi: 'Mở lời động viên', id: 'Buka tos', tr: 'Çakı aç', pl: 'Otwórz piątkę' })
    : event.kind === 'study_invite'
      ? triLang(lang, { ru: 'Открыть приглашение на занятие', uk: 'Відкрити запрошення на заняття', es: 'Abrir invitación a estudiar', 'pt-BR': 'Abrir convite para estudar', vi: 'Mở lời mời học', id: 'Buka ajakan belajar', tr: 'Çalışma davetini aç', pl: 'Otwórz zaproszenie do nauki' })
      : triLang(lang, { ru: 'Открыть вызов на дуэль', uk: 'Відкрити виклик на дуель', es: 'Abrir desafío de duelo', 'pt-BR': 'Abrir desafio de duelo', vi: 'Mở lời thách đấu', id: 'Buka tantangan duel', tr: 'Düello çağrısını aç', pl: 'Otwórz wyzwanie na pojedynek' });
  const seconds = remainingDuelSeconds(event, liveNowMs);
  const iconName = event.kind === 'high_five'
    ? 'hand-left-outline'
    : event.kind === 'study_invite'
      ? 'book-outline'
      : 'shield-half-outline';

  return (
    <Reanimated.View style={animated}>
      <Pressable testID={`friend-event-marker-${event.kind}`} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.marker}>
        <View style={styles.badge} accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name={iconName} size={27} color={GRAPHITE} />
          {event.kind === 'duel_invite'
            ? <View style={styles.flash}><Ionicons name="flash" size={11} color={PORCELAIN} /></View>
            : <View style={styles.accentDot} />}
        </View>
        {event.kind === 'duel_invite' && <Text style={styles.countdown}>{Math.ceil(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>}
      </Pressable>
    </Reanimated.View>
  );
}

export default memo(FriendEventMarker);

const styles = StyleSheet.create({
  marker: { width: 58, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: PORCELAIN, borderWidth: 1.5, borderColor: TEAL, shadowColor: GRAPHITE, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  accentDot: { position: 'absolute', right: 5, bottom: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: AMBER },
  flash: { position: 'absolute', right: 2, bottom: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: AMBER, borderWidth: 1.5, borderColor: PORCELAIN },
  countdown: { marginTop: -4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7, overflow: 'hidden', backgroundColor: PORCELAIN, color: GRAPHITE, borderWidth: 1, borderColor: TEAL, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
