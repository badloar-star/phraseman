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

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarView from '../components/AvatarView';
import SkeletonBlock from '../components/SkeletonShimmer';
import {
  METAL,
  motion,
  placeColor,
  radius,
  type,
  useTournamentPalette,
  type TournamentV2,
} from '../components/tournament/tournament_theme';
import { StarGlyph } from '../components/tournament/TournamentFx';
import { V2Counter } from '../components/tournament/tournament_v2_ui';
import { tournamentAvatarValue } from '../components/tournament/tournament_avatars';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import {
  hasTournamentTableSettledScores, isRoundState, orderTournamentPlayersForDisplay, resolveTournamentDisplayRoundNo, resolveTournamentRoomIdParam, shouldTableEnterRound, tournamentSharedPlacement, useTournamentRoom, type RoomPlayer } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';

/** Ступень оттенка акцента для полосы-рейтинга (прозрачность = насыщенность). */
function barTint(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${Math.max(0.05, Math.min(0.55, alpha))})`;
}

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const TOTAL_ROUNDS = 4;
const TABLE_TOP_ROWS = 5;

type Row = {
  id: string;
  name: string;
  /** Значение для AvatarView: индекс или custom:... — НЕ эмодзи. */
  avatar: string;
  isBot: boolean;
  color: string;
  score: number;
  streak: number;
  isYou?: boolean;
  /** Shared competition place: equal scores produce 1, 1, 3. */
  place: number;
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
  const ordered = orderTournamentPlayersForDisplay(players);
  return ordered.map((player, index) => {
    const place = tournamentSharedPlacement(ordered, index);
    return ({
    id: player.id,
    name: player.name || 'Игрок',
    // зачем 2026-07-27: было эмодзи-«лицо» — правило владельца требует
    // НАСТОЯЩИЕ аватары приложения. Ботам они выдаются детерминированно.
    avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar }),
    isBot: player.isBot === true,
    color: player.color || '#8AB49A',
    score: Number(player.score ?? 0),
    streak: Number(player.streak ?? 0),
    isYou: Boolean(myId) && player.id === myId,
    place,
    // Нет прошлой позиции (первый раунд) — стартуем с текущей, без «переезда».
    prevPlace: previousPlaces.get(player.id) ?? place,
  });
  });
}

export default function TournamentTableScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[]; spectate?: string; completedRound?: string }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const completedRound = typeof params.completedRound === 'string' ? Number(params.completedRound) : null;
  const runtimeActive = useRuntimeActive();
  /**
   * зачем: зрителю (решение владельца 2026-07-26) показываем ТУ ЖЕ таблицу,
   * что игроки видят между раундами, но постоянно — она не уводит в раунд и
   * живёт весь турнир. Один экран вместо второго такого же: перестановки,
   * полосы отрыва и чипы обгона уже здесь, дублировать их было бы ошибкой.
   */
  const spectating = params.spectate === '1';

  const { room, status, freshSnapshot, secondsLeft, retry } = useTournamentRoom(roomId, runtimeActive);
  const [myId, setMyId] = useState<string | null>(null);

  /**
   * Места предыдущего показа таблицы — источник анимации обгонов.
   * Держим в ref: обновление этой карты НЕ должно вызывать ре-рендер, иначе
   * строки переедут второй раз уже после приземления.
   */
  const previousPlacesRef = useRef<Map<string, number>>(new Map());
  const previousVisibleIndexesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  const roundNo = resolveTournamentDisplayRoundNo(room?.state, completedRound);

  const rows = useMemo(
    () => mapPlayersToRows(room?.players ?? [], myId, previousPlacesRef.current),
    [room?.players, myId],
  );

  const visibleRows = useMemo(() => {
    const top = rows.slice(0, TABLE_TOP_ROWS);
    const currentPlayer = rows.find((row) => row.isYou);
    return currentPlayer && !top.some((row) => row.id === currentPlayer.id)
      ? [...top, currentPlayer]
      : top;
  }, [rows]);

  // Запоминаем позиции ПОСЛЕ отрисовки — для следующего показа таблицы.
  useEffect(() => {
    if (rows.length === 0) return;
    const next = new Map<string, number>();
    rows.forEach((row) => next.set(row.id, row.place));
    previousPlacesRef.current = next;
  }, [rows]);

  useEffect(() => {
    if (visibleRows.length === 0) return;
    const next = new Map<string, number>();
    visibleRows.forEach((row, index) => next.set(row.id, index));
    previousVisibleIndexesRef.current = next;
  }, [visibleRows]);

  // Переход дальше по СЕРВЕРНОМУ состоянию: локальный таймер только рисует
  // обратный отсчёт, решение о смене этапа принимает сервер.
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !room || !roomId) return;
    // Зритель не играет: в раунд его не уводим, он остаётся на табло.
    if (spectating) return;
    if (shouldTableEnterRound(room.state, completedRound)) {
      router.replace({ pathname: '/tournament_round', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards' || room.state === 'closed') {
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [completedRound, freshSnapshot, room?.state, roomId, router, room, runtimeActive, spectating]);

  // зачем: зритель должен уметь выйти с таблицы в любой момент — сервер его
  // отсюда не уводит. Возврат в хаб турниров, а не router.back(): на этот
  // экран попадают и по прямой ссылке, где истории навигации нет.
  const leaveTable = useCallback(() => router.replace('/tournaments'), [router]);

  const myScore = useMemo(() => rows.find((row) => row.isYou)?.score ?? 0, [rows]);
  const scoresSettled = hasTournamentTableSettledScores(room?.state, completedRound);
  const listHeight = Math.max(1, visibleRows.length) * (ROW_HEIGHT + ROW_GAP);
  const maxScore = rows[0]?.score || 1;
  const isFinal = roundNo >= TOTAL_ROUNDS;
  // Зрителю показываем, что происходит прямо сейчас: идёт раунд или пауза.
  const liveLabel = isRoundState(room?.state) ? `Раунд ${roundNo} идёт` : 'Перерыв';

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
        {/* Зритель не играет — своих очков у него нет, показываем лидера.
            Счётчик в языке V2: пилюля со звездой и bump при изменении. */}
        {scoresSettled ? (
          <V2Counter value={spectating ? (rows[0]?.score ?? 0) : myScore} tone="stars" />
        ) : (
          <SkeletonBlock width={72} height={48} borderRadius={24} />
        )}
        {/* зачем 2026-07-27 (владелец: «экран таблицы невозможно закрыть, нет
            крестика»): у ЗРИТЕЛЯ таблица — тупик, сервер его никуда не уводит
            (см. `if (spectating) return` выше), и выйти было нечем. Игроку
            крестик не даём: он в турнире, экран сменит сервер сам. */}
        {spectating ? (
          <TapScale onPress={leaveTable} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={P.text} />
          </TapScale>
        ) : null}
      </View>

      {/* Шесть секунд не превращаем в задачу на прокрутку: видны верхние пять
          мест и строка игрока, если он ниже. Полные 16 остаются в итогах. */}
      <View style={[styles.listContent, { height: listHeight }]}>
        {scoresSettled
          ? visibleRows.map((row, index) => (
            <TableRow
              key={row.id}
              row={row}
              place={row.place}
              layoutIndex={index}
              previousLayoutIndex={previousVisibleIndexesRef.current.get(row.id) ?? index}
              maxScore={maxScore}
              revealDelayMs={160 + index * 85}
            />
          ))
          : Array.from({ length: Math.max(1, visibleRows.length) }, (_, index) => (
            <SkeletonBlock
              key={`pending-score-${index}`}
              width="100%"
              height={ROW_HEIGHT}
              borderRadius={radius.md}
              style={{ position: 'absolute', top: index * (ROW_HEIGHT + ROW_GAP) }}
            />
          ))}
      </View>

      <Text style={[styles.hint, { paddingBottom: insets.bottom + 12 }]}>
        {!scoresSettled
          ? `Ждём остальных · ${secondsLeft}`
          : spectating
          ? (isFinal ? 'Финал — считаем итоги…' : `${liveLabel} · ${secondsLeft}`)
          : (isFinal ? 'Считаем итоги…' : `Следующий раунд через ${secondsLeft}`)}
      </Text>
    </View>
  );
}

// ── Строка таблицы ──────────────────────────────────────────────────────────

const TableRow = memo(function TableRow({
  row, place, layoutIndex, previousLayoutIndex, maxScore, revealDelayMs,
}: {
  row: Row;
  place: number;
  layoutIndex: number;
  previousLayoutIndex: number;
  maxScore: number;
  revealDelayMs: number;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // FLIP: строка стартует на СТАРОЙ позиции и пружиной переезжает на новую —
  // видно, кто кого обогнал, а не просто финальный порядок.
  const fromY = previousLayoutIndex * (ROW_HEIGHT + ROW_GAP);
  const toY = layoutIndex * (ROW_HEIGHT + ROW_GAP);
  const translateY = useSharedValue(fromY);
  // The first frame deliberately starts below full opacity: a server snapshot
  // may already contain the settled ranking, so the visible reveal must not
  // depend on a later reorder arriving from Firestore.
  const revealOpacity = useSharedValue(0);
  const revealScale = useSharedValue(0.96);

  const overtook = row.prevPlace > place;
  const fillRatio = Math.max(0.12, row.score / maxScore);

  useEffect(() => {
    translateY.value = withDelay(
      420 + layoutIndex * 30,
      withSpring(toY, motion.reorder),
    );
  }, [layoutIndex, toY, translateY]);

  useEffect(() => {
    revealOpacity.value = withDelay(revealDelayMs, withSpring(1, { damping: 22, stiffness: 260 }));
    revealScale.value = withDelay(revealDelayMs, withSpring(1, { damping: 18, stiffness: 220 }));
  }, [revealDelayMs, revealOpacity, revealScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ translateY: translateY.value }, { scale: revealScale.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      {/* Полоса-рейтинг: длина по очкам, оттенок — своя ступень акцента
          активной темы (требование владельца: «не только очки справа»). */}
      <View style={[styles.rowFill, { width: `${Math.max(12, fillRatio * 100)}%` }]} pointerEvents="none">
        <LinearGradient
          colors={[
            barTint(P.accent, row.isYou ? 0.42 : 0.34 - Math.min(0.2, place * 0.02)),
            barTint(P.accent, row.isYou ? 0.3 : 0.2 - Math.min(0.14, place * 0.015)),
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.rowTopHi} pointerEvents="none" />

      {/* Призовое место — металл с тёплым бликом, остальные просто цифрой. */}
      {place <= 3 ? (
        <LinearGradient
          colors={place === 1 ? METAL.gold : place === 2 ? METAL.silver : METAL.bronze}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.medal}
        >
          <Text style={styles.medalText} allowFontScaling={false}>{place}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.place, { color: placeColor(place, P) }]} allowFontScaling={false}>
          {place}
        </Text>
      )}

      <AvatarView avatar={row.avatar} size={34} animateAura={false} />

      <Text
        style={[styles.name, row.isYou && { color: P.accent }]}
        numberOfLines={1}
      >
        {row.name}
      </Text>

      {overtook ? (
        <Animated.View entering={FadeIn.delay(700).duration(240)} style={styles.overtakeChip}>
          <Text style={styles.overtakeText}>обгон</Text>
        </Animated.View>
      ) : null}

      <View style={styles.scoreRow}>
        <StarGlyph size={13} color={P.gold} />
        <Animated.Text
          entering={ZoomIn.delay(revealDelayMs + 160).duration(180)}
          style={styles.score}
          allowFontScaling={false}
        >
          {row.score}
        </Animated.Text>
      </View>
    </Animated.View>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
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
  // height приходит из listHeight: плашки позиционированы абсолютно.
  listContent: { position: 'relative' },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.card,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: P.card,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    overflow: 'hidden',
  },
  rowFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.md, overflow: 'hidden' },
  place: {
    width: 22,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  medal: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  medalText: { fontSize: 12.5, fontWeight: '900', color: METAL.ink },
  rowTopHi: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: P.chipHi,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
