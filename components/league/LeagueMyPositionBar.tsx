import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { gapLabel, gapValue, useCountUp, zoneLabel, type LeagueHeroGap, type LeagueHeroZone } from './leagueStatusShared';
import type { LeagueHubPalette } from './leagueHubPalette';

import { noAndroidOutline } from '../../constants/androidGlow';
/**
 * Липкая карточка «моя позиция» внизу экрана Лиги.
 * Большая сияющая цифра места, зона, отрыв до следующего места, мини-бар.
 * Зелёная в обычном состоянии, красная в зоне вылета.
 * Пульс сияния — цикл, загажен useIsScreenFocused + AppState (паттерн AvatarAura,
 * файл зарегистрирован в runtime_lifecycle_ratchet).
 */

interface LeagueMyPositionBarProps {
  lang: Lang;
  palette: LeagueHubPalette;
  myRank: number;
  zone: LeagueHeroZone | null;
  gap: LeagueHeroGap | null;
  avatar: React.ReactNode;
  onPress: () => void;
}

function LeagueMyPositionBarComponent({ lang, palette, myRank, zone, gap, avatar, onPress }: LeagueMyPositionBarProps) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const rankDisplay = useCountUp(myRank, reduceMotion);

  const rankScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (reduceMotion) {
      rankScale.setValue(1);
      return;
    }
    Animated.spring(rankScale, { toValue: 1, friction: 7, tension: 90, delay: 240, useNativeDriver: true }).start();
  }, [reduceMotion, rankScale]);

  // Пульс сияния цифры. Гард по паттерну AvatarAura.
  const glowPhase = useRef(new Animated.Value(0)).current;
  const shouldAnimate = !reduceMotion && isFocused;
  useEffect(() => {
    if (!shouldAnimate) {
      glowPhase.setValue(0);
      return undefined;
    }
    let glowLoop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (glowLoop) return;
      glowPhase.setValue(0);
      glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowPhase, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPhase, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      glowLoop.start();
    };
    const stop = () => {
      glowLoop?.stop();
      glowLoop = null;
    };

    // Анимируем только на переднем плане — в фоне нет смысла перерисовывать.
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [shouldAnimate, glowPhase]);
  const glowOpacity = glowPhase.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] });
  const glowScale = glowPhase.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });

  const isDanger = zone === 'relegation';
  const gradient: [string, string] = isDanger ? ['#FF7A88', '#FF5B6C'] : ['#57DD82', '#47C870'];
  const onCard = isDanger ? '#FFFFFF' : palette.accentText;
  const ratio = Math.max(0.05, Math.min(1, gap?.ratio ?? 0));

  const mePrefix = triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' });
  const a11y = triLang(lang, { ru: `Ваше место: ${myRank}. Открывает вашу строку в рейтинге`, uk: `Ваше місце: ${myRank}. Відкриває ваш рядок у рейтингу`, es: `Tu puesto: ${myRank}. Abre tu fila en la clasificación`, 'pt-BR': `Sua posição: ${myRank}. Abre sua linha no ranking`, vi: `Hạng của bạn: ${myRank}. Mở hàng của bạn trong bảng xếp hạng`, id: `Peringkatmu: ${myRank}. Membuka barismu di peringkat`, tr: `Sıran: ${myRank}. Sıralamadaki satırını açar`, pl: `Twoje miejsce: ${myRank}. Otwiera Twój wiersz w rankingu` });

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(200).duration(280)} style={styles.wrap}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} testID="league-my-position-bar" style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.rankWrap}>
            <Animated.View pointerEvents="none" style={[styles.rankGlow, { backgroundColor: onCard, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <Animated.Text style={[styles.rank, { color: onCard, transform: [{ scale: rankScale }] }]}>{rankDisplay}</Animated.Text>
          </View>
          <View style={styles.body}>
            <Text numberOfLines={1} style={[styles.t1, { color: onCard }]}>
              {mePrefix}{zone ? ` · ${zoneLabel(zone, lang)}` : ''}
            </Text>
            {gap ? (
              <Text numberOfLines={1} style={[styles.t2, { color: onCard }]}>{`${gapLabel(gap, lang)} · ${gapValue(gap, lang)}`}</Text>
            ) : null}
            <View style={[styles.miniTrack, { backgroundColor: isDanger ? 'rgba(255,255,255,0.25)' : 'rgba(4,32,16,0.22)' }]}>
              <View style={[styles.miniFill, { backgroundColor: onCard, width: `${Math.round(ratio * 100)}%` }]} />
            </View>
          </View>
          <View style={styles.avatarSlot}>{avatar}</View>
        </LinearGradient>
      </Pressable>
    </Reanimated.View>
  );
}

export const LeagueMyPositionBar = memo(LeagueMyPositionBarComponent);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    zIndex: 20,
    elevation: 20,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#47C870',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    ...noAndroidOutline,
  },
  rankWrap: { width: 52, alignItems: 'center', justifyContent: 'center' },
  rankGlow: { position: 'absolute', width: 46, height: 34, borderRadius: 17 },
  rank: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  body: { flex: 1, minWidth: 0 },
  t1: { fontSize: 12.5, fontWeight: '900' },
  t2: { fontSize: 10, fontWeight: '800', opacity: 0.85, marginTop: 2 },
  miniTrack: { height: 6, borderRadius: 4, marginTop: 7, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 4 },
  avatarSlot: { alignItems: 'center', justifyContent: 'center' },
});
