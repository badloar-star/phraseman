import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { cleanYoutubeTitle, premiereCountdownSpoken, premiereCountdownText } from '../../app/youtube_title_display';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { VideoPlayBadge } from '../video/VideoGlassKit';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';

import { noteSwallowedHandler } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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

export default function YoutubePremiereHero({ video, onWatch, onRemind, reminded = false }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  onRemind: () => void;
  /** Напоминание уже поставлено (оптимистично, до ответа системы): кнопка сразу меняется. */
  reminded?: boolean;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const runtimeActive = useRuntimeActive(true);
  const reducedMotion = useReducedMotion();
  const [nowMs, setNowMs] = useState(Date.now());
  const [playIntro, setPlayIntro] = useState(false);
  const live = video.state === 'live';
  const presentation = getPremierePresentation(video.state, video.scheduledStartTime, nowMs);

  const copy = useMemo(() => ({
    liveNow: triLang(lang, { ru: 'Премьера сейчас', uk: 'Прем’єра зараз', en: 'Premiere live now', es: 'Estreno en directo', 'pt-BR': 'Estreia ao vivo', vi: 'Công chiếu trực tiếp', id: 'Tayang perdana sekarang', tr: 'Prömiyer şimdi canlı', pl: 'Premiera na żywo' }),
    upcoming: triLang(lang, { ru: 'Скоро премьера', uk: 'Незабаром прем’єра', en: 'Premiere coming soon', es: 'Estreno muy pronto', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Premiera wkrótce' }),
    join: triLang(lang, { ru: 'Присоединиться', uk: 'Приєднатися', en: 'Join now', es: 'Unirme', 'pt-BR': 'Participar', vi: 'Tham gia', id: 'Gabung sekarang', tr: 'Katıl', pl: 'Dołącz' }),
    remind: triLang(lang, { ru: 'Напомнить', uk: 'Нагадати', en: 'Remind me', es: 'Avísame', 'pt-BR': 'Lembrar-me', vi: 'Nhắc tôi', id: 'Ingatkan saya', tr: 'Hatırlat', pl: 'Przypomnij' }),
    checking: triLang(lang, { ru: 'Проверяем начало…', uk: 'Перевіряємо початок…', en: 'Checking the start…', es: 'Comprobando el inicio…', 'pt-BR': 'Verificando o início…', vi: 'Đang kiểm tra…', id: 'Memeriksa waktu mulai…', tr: 'Başlangıç kontrol ediliyor…', pl: 'Sprawdzamy start…' }),
    reminded: triLang(lang, { ru: 'Напоминание установлено', uk: 'Нагадування встановлено', en: 'Reminder set', es: 'Recordatorio activado', 'pt-BR': 'Lembrete definido', vi: 'Đã đặt lời nhắc', id: 'Pengingat dibuat', tr: 'Hatırlatıcı ayarlandı', pl: 'Ustawiono przypomnienie' }),
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
      void AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next)).catch(noteSwallowedHandler('YoutubePremiereHero:useEffect.setItem'));
      if (reducedMotion) return;
      setPlayIntro(true);
      timer = setTimeout(() => setPlayIntro(false), PREMIERE_INTRO_DURATION_MS);
    }).catch(noteSwallowedHandler('YoutubePremiereHero:useEffect.getItem'));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [live, reducedMotion, runtimeActive, video.id]);

  if (!live && video.state !== 'upcoming') return null;
  const isCountdown = presentation.kind === 'countdown';
  const countdown = isCountdown
    // зачем (координатор 18.10): было «0д  7ч  52мин» (читалось «Од») — теперь «Через 7 ч 52 мин», ноль дней не печатаем
    ? premiereCountdownText(lang, presentation.days, presentation.hours, presentation.minutes, presentation.seconds)
    : copy.checking;
  // зачем (Ревизор c3c420861 🟡): читалка получает человеческий текст «Скоро премьера. Через 7 часов 52 минуты», а не сокращения «7 ч 52 мин»
  const spokenCountdown = isCountdown ? premiereCountdownSpoken(lang, presentation.days, presentation.hours, presentation.minutes) : copy.checking;
  const countdownAccessibilityLabel = live ? copy.liveNow : `${copy.upcoming}. ${spokenCountdown}`;
  const content = (
    <Animated.View
      testID="youtube-premiere-static"
      style={[
        styles.hero,
        { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) },
        playIntro ? ({
          animationName: introKeyframes,
          animationDuration: `${PREMIERE_INTRO_DURATION_MS}ms`,
          animationTimingFunction: 'ease-out',
          animationPlayState: runtimeActive ? 'running' : 'paused',
        } as any) : null,
      ]}
    >
      <PlateFill g={g} radius={22} />
      <TouchableOpacity
        testID="youtube-premiere-thumbnail"
        accessibilityRole="button"
        accessibilityLabel={live ? copy.join : cleanYoutubeTitle(video.title)}
        onPress={onWatch}
        activeOpacity={0.86}
        style={styles.thumbnail}
      >
        <Image source={{ uri: video.thumbnailUrl }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" recyclingKey={video.id} />
        {playIntro && <Animated.View testID="youtube-premiere-intro" pointerEvents="none" style={[styles.sweep, ({ animationName: sweepKeyframes, animationDuration: `${PREMIERE_INTRO_DURATION_MS}ms`, animationPlayState: runtimeActive ? 'running' : 'paused' } as any)]} />}
        {/* зачем (владелец 18.10, «Да, убрать плашки с обложки»): на кадре только ▶ — состояние премьеры ушло одной строкой под обложку (video.html `.hero .st`). */}
        <VideoPlayBadge />
      </TouchableOpacity>
      <View testID="youtube-premiere-details" style={styles.details}>
        <Text style={[styles.title, { color: g.text }]}>{cleanYoutubeTitle(video.title)}</Text>
        {/* зачем: «⚑ Скоро премьера · через 7 ч 52 мин» одной строкой под названием; отсчёт — вложенный текст, читалка озвучивает строку целиком */}
        <View testID="youtube-premiere-state" accessible accessibilityRole="timer" accessibilityLabel={countdownAccessibilityLabel} style={styles.stateRow}>
          {live ? <View style={[styles.liveDot, { backgroundColor: g.text }]} /> : <Ionicons name="flag-outline" size={16} color={g.secondary} />}
          <Text style={[styles.stateText, { color: g.secondary }]}>
            {live ? copy.liveNow : copy.upcoming}
            {!live && isCountdown ? <Text testID="youtube-premiere-countdown" accessibilityRole="timer" accessibilityLabel={countdownAccessibilityLabel}>{` · ${countdown}`}</Text> : null}
          </Text>
        </View>
        {live ? (
          <TouchableOpacity testID="youtube-premiere-join" accessibilityRole="button" accessibilityLabel={copy.join} onPress={onWatch} activeOpacity={0.85} style={[styles.cta, { backgroundColor: g.cta, boxShadow: actionBoxShadow(g) }]}>
            <Ionicons name="play" size={18} color={g.ctaInk} />
            <Text style={[styles.ctaText, { color: g.ctaInk }]}>{copy.join}</Text>
          </TouchableOpacity>
        ) : !isCountdown ? (
          <View testID="youtube-premiere-checking" accessibilityRole="button" accessibilityLabel={copy.checking} style={[styles.cta, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}>
            <ActivityIndicator size="small" color={g.text} />
            <Text style={[styles.ctaText, { color: g.text }]}>{copy.checking}</Text>
          </View>
        ) : (
          <TouchableOpacity testID="youtube-premiere-remind" accessibilityRole="button" accessibilityLabel={reminded ? copy.reminded : copy.remind} accessibilityState={{ disabled: reminded }} disabled={reminded} onPress={onRemind} activeOpacity={0.85} style={[styles.cta, styles.ctaCompact, reminded ? { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) } : { backgroundColor: g.cta, boxShadow: actionBoxShadow(g) }]}>
            <Ionicons name={reminded ? 'checkmark' : 'flag-outline'} size={18} color={reminded ? g.text : g.ctaInk} />
            <Text style={[styles.ctaText, { color: reminded ? g.text : g.ctaInk }]}>{reminded ? copy.reminded : copy.remind}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
  return live
    ? <View testID="youtube-premiere-live">{content}</View>
    : <View testID="youtube-premiere-upcoming">{content}</View>;
}

const styles = StyleSheet.create({
  // зачем: `.hero` макета — плашка радиус 22, поля 12, кадр внутри радиусом 14.
  hero: { borderRadius: 22, padding: 12, marginTop: 18, marginBottom: 10 }, // зачем (Тень 12.10): без кромки и overflow (клип тени); отступ снизу 10 — тень должна «дышать»
  thumbnail: { aspectRatio: 16 / 9, position: 'relative', borderRadius: 14, overflow: 'hidden', backgroundColor: '#050505' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  image: { ...StyleSheet.absoluteFillObject },
  sweep: { position: 'absolute', top: -100, bottom: -100, width: 100, backgroundColor: 'rgba(255,255,255,0.42)' }, // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  details: { paddingTop: 12 },
  // `.hero .st` макета: строка под названием, 13/17 вес 600 (шкала D145), значок 16 и текст через 7 px.
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  stateText: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  cta: { minHeight: 44, marginTop: 12, borderRadius: 22, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  // «Напомнить» — компактная (владелец 18.10): по содержимому, высота 40, слева.
  ctaCompact: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 16, borderRadius: 20 },
  // зачем (Тень 12.10): контурная `.cta.gh` заменена плашкой с малой тенью (opaqueControl + nestedBoxShadow в разметке)
  ctaText: { fontSize: 16, fontWeight: '600' },
});
