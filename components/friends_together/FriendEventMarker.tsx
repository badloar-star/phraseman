import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { FriendSocialEvent } from '../../app/friend_social_events';
import { remainingDuelChallengeMs, remainingDuelSeconds } from '../../app/friend_social_events';
import { duelPlayCopy, duelTimeLeftShort } from '../../app/friends_together/duel_play_copy';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { LUM } from '../../constants/motionHybrid';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { noAndroidOutline } from '../../constants/androidGlow';
import { useShadowGlass } from '../v2/ShadowSurface';


type Props = { event: FriendSocialEvent; onPress: () => void; nowMs?: number };

function FriendEventMarker({ event, onPress, nowMs }: Props) {
  const reduceMotion = useReduceMotion();
  // зачем (закон владельца 22.10, «метки событий друзей — В ТЕМУ, исключений нет»): цвета маркера — токены выбранной темы, а не бренд-палитра фарфор/графит/бирюза/янтарь
  const g = useShadowGlass();
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
    // зачем (идея 3): вызов на «Дуэль на 5 фраз» показывает часы и минуты — тик раз в минуту, не раз в секунду
    const tickMs = event.kind === 'duel_invite' ? 1_000 : event.kind === 'duel_challenge' ? 60_000 : 0;
    if (tickMs === 0) return undefined;
    setLiveNowMs(Date.now());
    if (!runtimeActive) return undefined;
    const ticker = setInterval(() => setLiveNowMs(Date.now()), tickMs);
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
    ? triLang(lang, { ru: 'Открыть пятюню', uk: 'Відкрити п’ять', en: 'Open high five', es: 'Abrir saludo', 'pt-BR': 'Abrir cumprimento', vi: 'Mở lời động viên', id: 'Buka tos', tr: 'Çakı aç', pl: 'Otwórz piątkę' })
    : event.kind === 'study_invite' || event.kind === 'lesson_invite'
      ? triLang(lang, { ru: 'Открыть приглашение на занятие', uk: 'Відкрити запрошення на заняття', en: 'Open study invitation', es: 'Abrir invitación a estudiar', 'pt-BR': 'Abrir convite para estudar', vi: 'Mở lời mời học', id: 'Buka ajakan belajar', tr: 'Çalışma davetini aç', pl: 'Otwórz zaproszenie do nauki' })
      : event.kind === 'duel_result'
        ? duelPlayCopy(lang, 'openResult')
        : triLang(lang, { ru: 'Открыть вызов на дуэль', uk: 'Відкрити виклик на дуель', en: 'Open duel challenge', es: 'Abrir desafío de duelo', 'pt-BR': 'Abrir desafio de duelo', vi: 'Mở lời thách đấu', id: 'Buka tantangan duel', tr: 'Düello çağrısını aç', pl: 'Otwórz wyzwanie na pojedynek' });
  const seconds = remainingDuelSeconds(event, liveNowMs);
  // зачем (макет #hub, маркер `mkr('shield', { bd: 'flash', tm: '23 ч' })`): вызов — щит с молнией и остаток «23 ч»; итог — кубок
  const challengeLeft = event.kind === 'duel_challenge' ? duelTimeLeftShort(lang, remainingDuelChallengeMs(event, liveNowMs)) : null;
  const flashBadge = event.kind === 'duel_invite' || event.kind === 'duel_challenge';
  const iconName = event.kind === 'high_five'
    ? 'hand-left-outline'
    : event.kind === 'study_invite' || event.kind === 'lesson_invite'
      ? 'book-outline'
      : event.kind === 'duel_result'
        ? 'trophy-outline'
        : 'shield-half-outline';

  return (
    <Reanimated.View style={animated}>
      <Pressable testID={`friend-event-marker-${event.kind}`} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.marker}>
        <View style={[styles.badge, { backgroundColor: g.opaqueCard, borderColor: g.accentGraphic, shadowColor: g.dropShadow }]} accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name={iconName} size={27} color={g.text} />
          {flashBadge
            // зачем (Темы 25.10, zones-contrast): молния ctaFillInk на accentGraphic — не пара темы (2,98 в grad_jade); accentInk на accent — пара (≥ 4,56)
            ? <View style={[styles.flash, { backgroundColor: g.accent, borderColor: g.opaqueCard }]}><Ionicons name="flash" size={11} color={g.accentInk} /></View> /* light-accent-ok: заливка со своей парой accentInk (≥ 4,56), не графика на фоне */
            : <View style={[styles.accentDot, { backgroundColor: g.accentGraphic }]} />}
        </View>
        {event.kind === 'duel_invite' && <Text style={[styles.countdown, { backgroundColor: g.opaqueCard, color: g.text }]}>{Math.ceil(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>}
        {challengeLeft !== null && <Text style={[styles.countdown, { backgroundColor: g.opaqueCard, color: g.text }]}>{challengeLeft}</Text>}
      </Pressable>
    </Reanimated.View>
  );
}

export default memo(FriendEventMarker);

const styles = StyleSheet.create({
  marker: { width: 58, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 /* shadow-ok: кольцо значка-маркера на карте — индикатор события, не контейнер. typo-exempt: кольцо-индикатор */, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, ...noAndroidOutline}, // зачем: без непрозрачного фона Android рисует квадрат вокруг скругления (сторож android_no_square_outline)
  accentDot: { position: 'absolute', right: 5, bottom: 5, width: 7, height: 7, borderRadius: 4 },
  flash: { position: 'absolute', right: 2, bottom: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 }, // typo-exempt: кольцо-отбивка. shadow-ok: кольцо-отбивка молнии на значке маркера — индикатор, не контейнер
  countdown: { marginTop: -4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7, overflow: 'hidden', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
