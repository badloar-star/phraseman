import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import DoubleRewardSheet from '../DoubleRewardSheet';

import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useReduceMotionPreference } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { visibleWallClock } from '../../app/visible_wall_clock';
import {
  isSuperSundayUtc,
  superSundayEndsAtUtcMs,
} from '../../modules/economy/super_sunday_runes';

function countdownToMonday(nowMs: number): string {
  const seconds = Math.max(0, Math.floor((superSundayEndsAtUtcMs(nowMs) - nowMs) / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
}

function LeagueSuperSundayBannerComponent({ lang }: { lang: Lang }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isFocused = useIsScreenFocused();
  const reduceMotionPreference = useReduceMotionPreference();
  const runtimeActive = useRuntimeActive();
  const pulse = useRef(new Animated.Value(1)).current;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeSunday = isSuperSundayUtc(nowMs);

  useEffect(() => {
    if (!activeSunday || !isFocused) setSheetOpen(false);
  }, [activeSunday, isFocused]);

  useEffect(() => {
    if (!runtimeActive) return undefined;
    const update = (nextNowMs: number) => {
      setNowMs((previousNowMs) => {
        const nextSunday = isSuperSundayUtc(nextNowMs);
        const previousSunday = isSuperSundayUtc(previousNowMs);
        return nextSunday || nextSunday !== previousSunday ? nextNowMs : previousNowMs;
      });
    };
    update(Date.now());
    return visibleWallClock.subscribe(update);
  }, [runtimeActive]);

  useEffect(() => {
    if (!activeSunday || !isFocused || !runtimeActive || reduceMotionPreference !== false) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.018,
        duration: 700,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [activeSunday, isFocused, pulse, reduceMotionPreference, runtimeActive]);

  const copy = useMemo(() => triLang(lang, {
    ru: { title: 'СУПЕРВОСКРЕСЕНЬЕ', boost: '×2 руны весь день', body: 'Руны за занятия, игры и видео удваиваются', finish: 'До финиша' },
    uk: { title: 'СУПЕРНЕДІЛЯ', boost: '×2 руни весь день', body: 'Руни за заняття, ігри та відео подвоюються', finish: 'До фінішу' },
    en: { title: 'SUPER SUNDAY', boost: '×2 runes all day', body: 'Runes from lessons, games, and videos are doubled', finish: 'Time left' },
    es: { title: 'SÚPER DOMINGO', boost: '×2 runas todo el día', body: 'Las runas de lecciones, juegos y vídeos se duplican', finish: 'Tiempo restante' },
    'pt-BR': { title: 'SUPER DOMINGO', boost: '×2 runas o dia todo', body: 'Runas de lições, jogos e vídeos são duplicadas', finish: 'Tempo restante' },
    vi: { title: 'CHỦ NHẬT SIÊU CẤP', boost: '×2 rune cả ngày', body: 'Rune từ bài học, trò chơi và video đều nhân đôi', finish: 'Còn lại' },
    id: { title: 'MINGGU SUPER', boost: '×2 rune sepanjang hari', body: 'Rune dari pelajaran, permainan, dan video digandakan', finish: 'Waktu tersisa' },
    tr: { title: 'SÜPER PAZAR', boost: 'Tüm gün ×2 rün', body: 'Ders, oyun ve video rünleri ikiye katlanır', finish: 'Kalan süre' },
    pl: { title: 'SUPER NIEDZIELA', boost: '×2 runy przez cały dzień', body: 'Runy z lekcji, gier i filmów są podwajane', finish: 'Do końca' },
  }), [lang]);

  if (!activeSunday) return null;
  const countdown = countdownToMonday(nowMs);
  const accessibilityLabel = `${copy.title}. ${copy.boost}. ${copy.body}. ${copy.finish}: ${countdown}`;

  return (
    <>
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => setSheetOpen(true)}>
    <Animated.View
      testID="league-super-sunday-banner"
      accessible={false}
      accessibilityLabel={accessibilityLabel}
      style={[styles.banner, { transform: [{ scale: pulse }] }]}
    >
      <View importantForAccessibility="no-hide-descendants" style={styles.iconWrap}>
        <Ionicons name="sparkles" size={22} color="#FFFFFF" />
      </View>
      <View importantForAccessibility="no-hide-descendants" style={styles.copy}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.boost}>{copy.boost}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <Text style={styles.countdown}>{copy.finish}: {countdown}</Text>
      </View>
    </Animated.View>
    </Pressable>
    <DoubleRewardSheet visible={sheetOpen && activeSunday && isFocused} kind="runes" lang={lang} onClose={() => setSheetOpen(false)} />
    </>
  );
}

export const LeagueSuperSundayBanner = memo(LeagueSuperSundayBannerComponent);

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    minHeight: 112,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#A51F45',
    shadowColor: '#6B102E',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  copy: { flex: 1, gap: 2 },
  title: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 0.9 },
  boost: { color: '#FFFFFF', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  body: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  countdown: { color: '#FFE3EC', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2 },
});
