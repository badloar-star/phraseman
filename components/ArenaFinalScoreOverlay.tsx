// Финальный «кинематографичный» экран матча Арены: большой счёт X : Y + исход.
// Показывается ~1.2 сек перед переходом на экран результатов, чтобы был МОМЕНТ
// победы/поражения, а не мгновенный прыжок.
//
// Победа → золотой акцент + конфетти; поражение → приглушённо; ничья → нейтрально.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { triLang, type Lang } from '../constants/i18n';
import type { ArenaMatchOutcome } from '../app/arena_match_drama';
import ArenaConfettiBurst from './ArenaConfettiBurst';

interface ArenaFinalScoreOverlayProps {
  visible: boolean;
  outcome: ArenaMatchOutcome;
  myScore: number;
  opponentScore: number;
  lang: Lang;
  /** Премиум-победа: золотая палитра конфетти (статус-эксклюзив). */
  premium?: boolean;
}

function outcomeTitle(outcome: ArenaMatchOutcome, lang: Lang): string {
  if (outcome === 'win') {
    return triLang(lang, {
      ru: 'Победа!', uk: 'Перемога!', es: '¡Victoria!', 'pt-BR': 'Vitória!',
      vi: 'Chiến thắng!', id: 'Menang!', tr: 'Zafer!', pl: 'Zwycięstwo!',
    });
  }
  if (outcome === 'loss') {
    return triLang(lang, {
      ru: 'Поражение', uk: 'Поразка', es: 'Derrota', 'pt-BR': 'Derrota',
      vi: 'Thua cuộc', id: 'Kalah', tr: 'Yenilgi', pl: 'Porażka',
    });
  }
  return triLang(lang, {
    ru: 'Ничья', uk: 'Нічия', es: 'Empate', 'pt-BR': 'Empate',
    vi: 'Hòa', id: 'Seri', tr: 'Berabere', pl: 'Remis',
  });
}

const WIN_COLORS = ['#FFD54A', '#FFE9A6', '#FFB23E', '#FFF2C9'];
const FESTIVE_COLORS = ['#FFD54A', '#39F27A', '#5BE2CD', '#FF8A5B', '#C792FF'];

function ArenaFinalScoreOverlay({
  visible,
  outcome,
  myScore,
  opponentScore,
  lang,
  premium = false,
}: ArenaFinalScoreOverlayProps) {
  const enter = useSharedValue(0);
  const scorePulse = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      enter.value = 0;
      scorePulse.value = 1;
      return;
    }
    enter.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    scorePulse.value = withDelay(
      220,
      withSequence(
        withTiming(1.14, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.ease) }),
      ),
    );
  }, [visible, enter, scorePulse]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.86 + enter.value * 0.14 }, { translateY: (1 - enter.value) * 18 }],
  }));
  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scorePulse.value }],
  }));

  if (!visible) return null;

  const isWin = outcome === 'win';
  const accent = isWin ? '#FFD54A' : outcome === 'loss' ? '#9AA0A6' : '#5BE2CD';

  return (
    <View pointerEvents="none" style={styles.fill}>
      <View style={styles.scrim} />
      {isWin ? (
        <ArenaConfettiBurst active colors={premium ? WIN_COLORS : FESTIVE_COLORS} count={premium ? 40 : 28} />
      ) : null}
      <Reanimated.View style={[styles.card, cardStyle]}>
        <Text style={[styles.title, { color: accent }]}>{outcomeTitle(outcome, lang)}</Text>
        <Reanimated.View style={[styles.scoreRow, scoreStyle]}>
          <Text style={[styles.score, { color: isWin ? accent : '#FFFFFF' }]}>{myScore}</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={[styles.score, { color: outcome === 'loss' ? accent : '#FFFFFF' }]}>
            {opponentScore}
          </Text>
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,10,18,0.74)' },
  card: { alignItems: 'center', paddingHorizontal: 28 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 0.5, marginBottom: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  score: { fontSize: 72, fontWeight: '900', fontVariant: ['tabular-nums'] },
  colon: { fontSize: 56, fontWeight: '800', color: 'rgba(255,255,255,0.55)', marginHorizontal: 12 },
});

export default React.memo(ArenaFinalScoreOverlay);
