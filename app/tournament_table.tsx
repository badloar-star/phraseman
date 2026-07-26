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

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { T, motion, placeColor, radius, type, useTournamentPalette, type TournamentPalette} from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { useTournamentRoom, type RoomPlayer } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const TOTAL_ROUNDS = 4;

type Row = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
  streak: number;
  isYou?: boolean;
  /** Позиция в предыдущем раунде — для расчёта обгона. */
  prevPlace: number;
};

/**
 * Игроки комнаты → строки таблицы, отсортированные по очкам.
 *
 * зачем: сервер хранит игроков в порядке входа и НЕ считает места — это
 * витрина. Позицию прошлого раунда берём из предыдущего снимка, чтобы
 * показать обгоны; без неё строки просто встанут на места без анимации.
 */
function mapPlayersToRows(
  players: readonly RoomPlayer[],
  myId: string | null,
  previousPlaces: Map<string, number>,
): Row[] {
  const sorted = [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  return sorted.map((player, index) => ({
    id: player.id,
    name: player.name || 'Игрок',
    emoji: player.avatar || '🙂',
    color: player.color || '#8AB49A',
    score: Number(player.score ?? 0),
    streak: Number(player.streak ?? 0),
    isYou: Boolean(myId) && player.id === myId,
    // Нет прошлой позиции (первый раунд) — стартуем с текущей, без «переезда».
    prevPlace: previousPlaces.get(player.id) ?? index + 1,
  }));
}

export default function TournamentTableScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string; spectate?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;
  /**
   * зачем: зрителю (решение владельца 2026-07-26) показываем ТУ ЖЕ таблицу,
   * что игроки видят между раундами, но постоянно — она не уводит в раунд и
   * живёт весь турнир. Один экран вместо второго такого же: перестановки,
   * полосы отрыва и чипы обгона уже здесь, дублировать их было бы ошибкой.
   */
  const spectating = params.spectate === '1';

  const { room, status, secondsLeft, retry } = useTournamentRoom(roomId);
  const [myId, setMyId] = useState<string | null>(null);

  /**
   * Места предыдущего показа таблицы — источник анимации обгонов.
   * Держим в ref: обновление этой карты НЕ должно вызывать ре-рендер, иначе
   * строки переедут второй раз уже после приземления.
   */
  const previousPlacesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  const roundNo = room?.rounds?.length
    ? Math.max(...room.rounds.map((round) => round.roundNo))
    : 1;

  const rows = useMemo(
    () => mapPlayersToRows(room?.players ?? [], myId, previousPlacesRef.current),
    [room?.players, myId],
  );

  // Запоминаем позиции ПОСЛЕ отрисовки — для следующего показа таблицы.
  useEffect(() => {
    if (rows.length === 0) return;
    const next = new Map<string, number>();
    rows.forEach((row, index) => next.set(row.id, index + 1));
    previousPlacesRef.current = next;
  }, [rows]);

  // Переход дальше по СЕРВЕРНОМУ состоянию: локальный таймер только рисует
  // обратный отсчёт, решение о смене этапа принимает сервер.
  useEffect(() => {
    if (!room || !roomId) return;
    // Зритель не играет: в раунд его не уводим, он остаётся на табло.
    if (spectating) return;
    if (room.state === 'round') {
      router.replace({ pathname: '/tournament_round', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards' || room.state === 'closed') {
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [room?.state, roomId, router, room, spectating]);

  const myScore = useMemo(() => rows.find((row) => row.isYou)?.score ?? 0, [rows]);
  const listHeight = Math.max(1, rows.length) * (ROW_HEIGHT + ROW_GAP);
  const maxScore = rows[0]?.score || 1;
  const isFinal = roundNo >= TOTAL_ROUNDS;
  // Зрителю показываем, что происходит прямо сейчас: идёт раунд или пауза.
  const liveLabel = room?.state === 'round' ? `Раунд ${roundNo} идёт` : 'Перерыв';

  if (status === 'offline') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="offline" onRetry={retry} />
      </View>
    );
  }
  if (room?.state === 'cancelled') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="cancelled" onRetry={() => router.replace('/tournaments')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{spectating ? 'Смотрим турнир' : 'Таблица'}</Text>
          <Text style={styles.subtitle}>Раунд {roundNo} из {TOTAL_ROUNDS}</Text>
        </View>
        {/* Зритель не играет — своих очков у него нет, показываем лидера. */}
        <View style={styles.myScoreBadge}>
          <Text style={styles.myScoreValue} allowFontScaling={false}>
            {spectating ? (rows[0]?.score ?? 0) : myScore}
          </Text>
        </View>
      </View>

      {/* Высота списка известна заранее — соседние блоки не двигаются */}
      <View style={[styles.list, { height: listHeight }]}>
        {rows.map((row, index) => (
          <TableRow key={row.id} row={row} place={index + 1} maxScore={maxScore} />
        ))}
      </View>

      <Text style={styles.hint}>
        {spectating
          ? (isFinal ? 'Финал — считаем итоги…' : `${liveLabel} · ${secondsLeft}`)
          : (isFinal ? 'Считаем итоги…' : `Следующий раунд через ${secondsLeft}`)}
      </Text>
    </View>
  );
}

// ── Строка таблицы ──────────────────────────────────────────────────────────

const TableRow = memo(function TableRow({
  row, place, maxScore,
}: { row: Row; place: number; maxScore: number }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
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
            backgroundColor: row.isYou ? P.accentSoft : `${row.color}22`,
          },
        ]}
        pointerEvents="none"
      />
      <Text style={[styles.place, { color: placeColor(place, P) }]} allowFontScaling={false}>
        {place}
      </Text>
      <View style={[styles.avatar, { backgroundColor: `${row.color}33` }]}>
        <Text style={styles.avatarEmoji}>{row.emoji}</Text>
      </View>
      <Text
        style={[styles.name, row.isYou && { color: P.accent }]}
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

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  headerText: { flex: 1 },
  title: { ...type.title, color: P.text },
  subtitle: { ...type.body, color: P.muted, marginTop: 2 },
  myScoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myScoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },

  list: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: P.card,
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
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: P.text },
  streak: { fontSize: 13 },
  overtakeChip: {
    backgroundColor: P.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  overtakeText: { fontSize: 11, fontWeight: '900', color: P.accentText },
  score: {
    width: 40,
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },

  hint: { textAlign: 'center', ...type.body, color: P.ghost, marginTop: 18 },
});
