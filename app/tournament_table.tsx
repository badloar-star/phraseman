// ═══════════════════════════════════════════════════════════════════════════
// tournament_table.tsx — таблица между раундами (макеты 14-16).
//
// зачем: главный драматический момент режима. 16 горизонтальных плашек,
// строки ПЕРЕЕЗЖАЮТ на новые позиции пружиной (FLIP), обогнавшие получают
// чип «обгон! ⚡». Своя строка подсвечена. Через 11 секунд авто-переход.
//
// Layout stability: плашки абсолютно спозиционированы по индексу — высота
// списка known заранее, поэтому перестановка не двигает соседние блоки.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { T, motion, placeColor, radius, type } from '../components/tournament/tournament_theme';

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const TOTAL_ROUNDS = 4;

type Row = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  score: number;
  streak: number;
  isYou?: boolean;
  /** Позиция в предыдущем раунде — для расчёта обгона. */
  prevPlace: number;
};

/** TODO(server): придёт из tournamentRooms/{roomId}.standings. */
const DEMO_ROWS: Row[] = [
  { id: 16, name: 'КубокБарон', emoji: '👑', color: '#FFD43B', score: 50, streak: 6, prevPlace: 1 },
  { id: 5, name: 'МолнияPRO', emoji: '⚔️', color: '#FF5B6C', score: 45, streak: 7, prevPlace: 2 },
  { id: 2, name: 'СловоЖора', emoji: '🐺', color: '#8B8B8B', score: 40, streak: 5, prevPlace: 3 },
  { id: 12, name: 'МадамПеревод', emoji: '💃', color: '#FF5B6C', score: 40, streak: 1, prevPlace: 7 },
  { id: 1, name: 'Вы', emoji: '🦊', color: '#FB923C', score: 35, streak: 3, isYou: true, prevPlace: 9 },
  { id: 9, name: 'VerbaVolt', emoji: '⚡', color: '#FFD43B', score: 35, streak: 2, prevPlace: 4 },
  { id: 4, name: 'ГраммарНацик', emoji: '🤓', color: '#FFD43B', score: 30, streak: 0, prevPlace: 5 },
  { id: 7, name: 'Полиглот_77', emoji: '🌍', color: '#3B82F6', score: 30, streak: 4, prevPlace: 6 },
  { id: 14, name: 'АкцентЗеро', emoji: '🎯', color: '#A78BFA', score: 30, streak: 2, prevPlace: 8 },
  { id: 3, name: 'Фразочкина', emoji: '🦉', color: '#47C870', score: 25, streak: 2, prevPlace: 10 },
  { id: 11, name: 'IdiomHunter', emoji: '🏹', color: '#47C870', score: 25, streak: 3, prevPlace: 11 },
  { id: 6, name: 'LingvoLisa', emoji: '🔥', color: '#FB923C', score: 20, streak: 1, prevPlace: 12 },
  { id: 8, name: 'СленгМастер', emoji: '🎧', color: '#A78BFA', score: 20, streak: 0, prevPlace: 13 },
  { id: 10, name: 'ТихийСловарь', emoji: '📚', color: '#8AB49A', score: 15, streak: 0, prevPlace: 14 },
  { id: 13, name: 'NoCapNika', emoji: '🧢', color: '#3B82F6', score: 15, streak: 0, prevPlace: 15 },
  { id: 15, name: 'RoflPhrase', emoji: '🐸', color: '#47C870', score: 10, streak: 0, prevPlace: 16 },
];

export default function TournamentTableScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const [roundNo] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(motion.tableHoldMs / 1000));

  // Авто-переход: таблица показывается 10-12 секунд (§ спеки).
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) return;
    router.replace(roundNo >= TOTAL_ROUNDS ? '/tournament_results' : '/tournament_round');
  }, [secondsLeft, roundNo, router]);

  const myScore = useMemo(() => DEMO_ROWS.find((row) => row.isYou)?.score ?? 0, []);
  const listHeight = DEMO_ROWS.length * (ROW_HEIGHT + ROW_GAP);
  const maxScore = DEMO_ROWS[0]?.score || 1;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Таблица</Text>
          <Text style={styles.subtitle}>Раунд {roundNo} из {TOTAL_ROUNDS}</Text>
        </View>
        <View style={styles.myScoreBadge}>
          <Text style={styles.myScoreValue} allowFontScaling={false}>{myScore}</Text>
        </View>
      </View>

      {/* Высота списка известна заранее — соседние блоки не двигаются */}
      <View style={[styles.list, { height: listHeight }]}>
        {DEMO_ROWS.map((row, index) => (
          <TableRow
            key={row.id}
            row={row}
            place={index + 1}
            maxScore={maxScore}
          />
        ))}
      </View>

      <Text style={styles.hint}>Следующий раунд через {secondsLeft}</Text>
    </View>
  );
}

// ── Строка таблицы ──────────────────────────────────────────────────────────

const TableRow = memo(function TableRow({
  row, place, maxScore,
}: { row: Row; place: number; maxScore: number }) {
  // FLIP: строка стартует на СТАРОЙ позиции и пружиной переезжает на новую —
  // видно, кто кого обогнал, а не просто финальный порядок.
  const fromY = (row.prevPlace - 1) * (ROW_HEIGHT + ROW_GAP);
  const toY = (place - 1) * (ROW_HEIGHT + ROW_GAP);
  const translateY = useSharedValue(fromY);

  const overtook = row.prevPlace > place;
  const fillRatio = Math.max(0.12, row.score / maxScore);

  useEffect(() => {
    translateY.value = withDelay(
      420 + place * 30,
      withSpring(toY, motion.reorder),
    );
  }, [toY, place, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      {/* Заливка пропорционально очкам — «полоса силы» вместо шкалы */}
      <View
        style={[
          styles.rowFill,
          {
            width: `${fillRatio * 100}%`,
            backgroundColor: row.isYou ? T.accentSoft : `${row.color}22`,
          },
        ]}
        pointerEvents="none"
      />
      <Text style={[styles.place, { color: placeColor(place) }]} allowFontScaling={false}>
        {place}
      </Text>
      <View style={[styles.avatar, { backgroundColor: `${row.color}33` }]}>
        <Text style={styles.avatarEmoji}>{row.emoji}</Text>
      </View>
      <Text
        style={[styles.name, row.isYou && { color: T.accent }]}
        numberOfLines={1}
      >
        {row.name}
      </Text>
      {row.streak > 0 ? <Text style={styles.streak}>🔥</Text> : null}

      {overtook ? (
        <Animated.View entering={FadeIn.delay(700).duration(240)} style={styles.overtakeChip}>
          <Text style={styles.overtakeText}>обгон! ⚡</Text>
        </Animated.View>
      ) : null}

      <Text style={styles.score} allowFontScaling={false}>{row.score}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  headerText: { flex: 1 },
  title: { ...type.title, color: T.text },
  subtitle: { ...type.body, color: T.muted, marginTop: 2 },
  myScoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myScoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: T.accent,
    fontVariant: ['tabular-nums'],
  },

  list: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: T.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    overflow: 'hidden',
  },
  rowFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  place: {
    width: 22,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  avatar: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 17 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: T.text },
  streak: { fontSize: 13 },
  overtakeChip: {
    backgroundColor: T.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  overtakeText: { fontSize: 11, fontWeight: '900', color: T.accentText },
  score: {
    width: 40,
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '900',
    color: T.text,
    fontVariant: ['tabular-nums'],
  },

  hint: { textAlign: 'center', ...type.body, color: T.ghost, marginTop: 18 },
});
