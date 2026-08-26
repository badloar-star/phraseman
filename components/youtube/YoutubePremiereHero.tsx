import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import {
  getPremierePresentation,
  markPremiereIntroSeen,
  prunePremiereIntroSeen,
  shouldPlayPremiereIntro,
  shouldRunPremiereCountdownTicker,
  PREMIERE_TICK_INTERVAL_MS,
  type PremiereIntroSeenMap,
} from '../../app/youtube_premiere_runtime';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';

export const PREMIERE_INTRO_DURATION_MS = 1100;
const SEEN_STORAGE_KEY = 'youtube_premiere_intro_seen_v1';

const introKeyframes = {
  '0%': { opacity: 0, transform: [{ scale: 0.96 }, { translateY: 8 }] },
  '55%': { opacity: 1, transform: [{ scale: 1.012 }, { translateY: 0 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
};
const sweepKeyframes = {
  '0%': { opacity: 0, transform: [{ translateX: -360 }, { rotate: '14deg' }] },
  '28%': { opacity: 0.62 },
  '100%': { opacity: 0, transform: [{ translateX: 460 }, { rotate: '14deg' }] },
};

function readSeenMap(raw: string | null): PremiereIntroSeenMap {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export default function YoutubePremiereHero({ video, onWatch, onRemind }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  onRemind: () => void;
}) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const runtimeActive = useRuntimeActive(true);
  const reducedMotion = useReducedMotion();
  const [nowMs, setNowMs] = useState(Date.now());
  const [playIntro, setPlayIntro] = useState(false);
  const live = video.state === 'live';
  const presentation = getPremierePresentation(video.state, video.scheduledStartTime, nowMs);

  const copy = useMemo(() => ({
    liveNow: triLang(lang, { ru: 'Премьера сейчас', uk: 'Прем’єра зараз', en: 'Premiere live now', es: 'Premiere live now', 'pt-BR': 'Estreia ao vivo', vi: 'Công chiếu trực tiếp', id: 'Tayang perdana sekarang', tr: 'Prömiyer şimdi canlı', pl: 'Premiera na żywo' }),
    upcoming: triLang(lang, { ru: 'Скоро премьера', uk: 'Незабаром прем’єра', en: 'Premiere coming soon', es: 'Premiere coming soon', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Premiera wkrótce' }),
    join: triLang(lang, { ru: 'Присоединиться', uk: 'Приєднатися', en: 'Join now', es: 'Join now', 'pt-BR': 'Participar', vi: 'Tham gia', id: 'Gabung sekarang', tr: 'Katıl', pl: 'Dołącz' }),
    remind: triLang(lang, { ru: 'Напомнить', uk: 'Нагадати', en: 'Remind me', es: 'Remind me', 'pt-BR': 'Lembrar-me', vi: 'Nhắc tôi', id: 'Ingatkan saya', tr: 'Hatırlat', pl: 'Przypomnij' }),
    checking: triLang(lang, { ru: 'Проверяем начало…', uk: 'Перевіряємо початок…', en: 'Checking the start…', es: 'Checking the start…', 'pt-BR': 'Verificando o início…', vi: 'Đang kiểm tra…', id: 'Memeriksa waktu mulai…', tr: 'Başlangıç kontrol ediliyor…', pl: 'Sprawdzamy start…' }),
    days: triLang(lang, { ru: 'д', uk: 'д', en: 'd', es: 'd', 'pt-BR': 'd', vi: 'ng', id: 'h', tr: 'g', pl: 'd' }),
    hours: triLang(lang, { ru: 'ч', uk: 'г', en: 'h', es: 'h', 'pt-BR': 'h', vi: 'g', id: 'j', tr: 'sa', pl: 'g' }),
    minutes: triLang(lang, { ru: 'мин', uk: 'хв', en: 'min', es: 'min', 'pt-BR': 'min', vi: 'ph', id: 'm', tr: 'dk', pl: 'min' }),
    seconds: triLang(lang, { ru: 'сек', uk: 'с', en: 's', es: 's', 'pt-BR': 's', vi: 'gi', id: 'd', tr: 'sn', pl: 's' }),
  }), [lang]);

  useEffect(() => {
    const shouldTick = (at: number) => shouldRunPremiereCountdownTicker({
      state: video.state,
      scheduledStartTime: video.scheduledStartTime,
      runtimeActive,
      appState: 'active',
      nowMs: at,
    });
    if (!shouldTick(Date.now())) return;
    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      if (!shouldTick(nextNow)) clearInterval(interval);
    }, PREMIERE_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runtimeActive, video.scheduledStartTime, video.state]);

  useEffect(() => {
    if (!live || !runtimeActive) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void AsyncStorage.getItem(SEEN_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      const now = Date.now();
      const seen = prunePremiereIntroSeen(readSeenMap(raw), now);
      if (!shouldPlayPremiereIntro(seen, video.id, now)) return;
      const next = markPremiereIntroSeen(seen, video.id, now);
      void AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      if (reducedMotion) return;
      setPlayIntro(true);
      timer = setTimeout(() => setPlayIntro(false), PREMIERE_INTRO_DURATION_MS);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [live, reducedMotion, runtimeActive, video.id]);

  if (!live && video.state !== 'upcoming') return null;
  const countdown = presentation.kind === 'countdown'
    ? `${presentation.days}${copy.days}  ${presentation.hours}${copy.hours}  ${presentation.minutes}${copy.minutes}${presentation.seconds == null ? '' : `  ${presentation.seconds}${copy.seconds}`}`
    : copy.checking;
  const countdownAccessibilityLabel = live ? copy.liveNow : `${copy.upcoming}. ${countdown}`;
  const content = (
    <Animated.View
      testID="youtube-premiere-static"
      style={[
        styles.hero,
        { borderColor: live ? '#A6FF4D' : t.accent, backgroundColor: live ? '#101B18' : t.bgCard },
        playIntro ? ({
          animationName: introKeyframes,
          animationDuration: `${PREMIERE_INTRO_DURATION_MS}ms`,
          animationTimingFunction: 'ease-out',
          animationPlayState: runtimeActive ? 'running' : 'paused',
        } as any) : null,
      ]}
    >
      <TouchableOpacity
        testID="youtube-premiere-thumbnail"
        accessibilityRole="button"
        accessibilityLabel={live ? copy.join : video.title}
        onPress={onWatch}
        activeOpacity={0.86}
        style={styles.thumbnail}
      >
        <Image source={{ uri: video.thumbnailUrl }} style={styles.image} contentFit="cover" />
        {playIntro && <Animated.View testID="youtube-premiere-intro" pointerEvents="none" style={[styles.sweep, ({ animationName: sweepKeyframes, animationDuration: `${PREMIERE_INTRO_DURATION_MS}ms`, animationPlayState: runtimeActive ? 'running' : 'paused' } as any)]} />}
        <View style={[styles.badge, { backgroundColor: live ? '#A6FF4D' : t.accentBg }]}>
          <Ionicons name={live ? 'radio' : 'sparkles'} size={14} color={live ? '#071015' : t.accent} />
          <Text style={[styles.badgeText, { color: live ? '#071015' : t.accent }]}>{live ? copy.liveNow : copy.upcoming}</Text>
        </View>
      </TouchableOpacity>
      <View testID="youtube-premiere-details" style={[styles.details, { backgroundColor: live ? '#101B18' : t.bgCard }]}>
        <Text style={styles.title}>{video.title}</Text>
        {!live && <Text testID="youtube-premiere-countdown" accessibilityRole="timer" accessibilityLabel={countdownAccessibilityLabel} style={styles.countdown}>{countdown}</Text>}
        {!live && <View style={styles.actions}><TouchableOpacity testID="youtube-premiere-remind" accessibilityRole="button" accessibilityLabel={copy.remind} onPress={onRemind} style={styles.remind}><Ionicons name="notifications-outline" size={18} color="#FFFFFF" /><Text style={styles.remindText}>{copy.remind}</Text></TouchableOpacity></View>}
      </View>
    </Animated.View>
  );
  return live
    ? <View testID="youtube-premiere-live">{content}</View>
    : <View testID="youtube-premiere-upcoming">{content}</View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  thumbnail: { aspectRatio: 16 / 9, position: 'relative' },
  image: { ...StyleSheet.absoluteFillObject },
  sweep: { position: 'absolute', top: -100, bottom: -100, width: 100, backgroundColor: 'rgba(255,255,255,0.42)' },
  details: { padding: 17 },
  badge: { position: 'absolute', top: 12, left: 12, minHeight: 30, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  title: { color: '#FFFFFF', marginTop: 11, fontSize: 21, lineHeight: 27, fontWeight: '900' },
  countdown: { color: '#FFFFFF', marginTop: 10, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  remind: { minHeight: 48, flex: 1, borderRadius: 15, paddingHorizontal: 13, backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  remindText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
