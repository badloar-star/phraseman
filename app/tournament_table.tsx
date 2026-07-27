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
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
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
import { LinearGradient } from 'expo-linear-gradient';
import AvatarView from '../components/AvatarView';
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
  isRoundState, useTournamentRoom, type RoomPlayer } from './tournament_client';
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
    // зачем 2026-07-27: было эмодзи-«лицо» — правило владельца требует
    // НАСТОЯЩИЕ аватары приложения. Ботам они выдаются детерминированно.
    avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar }),
    isBot: player.isBot === true,
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
    if (isRoundState(room.state)) {
      router.replace({ pathname: '/tournament_round', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards' || room.state === 'closed') {
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [room?.state, roomId, router, room, spectating]);

  // зачем: зритель должен уметь выйти с таблицы в любой момент — сервер его
  // отсюда не уводит. Возврат в хаб турниров, а не router.back(): на этот
  // экран попадают и по прямой ссылке, где истории навигации нет.
  const leaveTable = useCallback(() => router.replace('/tournaments'), [router]);

  const myScore = useMemo(() => rows.find((row) => row.isYou)?.score ?? 0, [rows]);
  const listHeight = Math.max(1, rows.length) * (ROW_HEIGHT + ROW_GAP);
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
        <V2Counter value={spectating ? (rows[0]?.score ?? 0) : myScore} tone="stars" />
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

      {/* зачем 2026-07-27 (владелец: «экран таблицы невозможно скролить»):
          список из 16 плашек не помещается на экран, а лежал в View
          фиксированной высоты — нижние места были недоступны. ScrollView с
          известной высотой контента: перестановки FLIP по-прежнему не двигают
          соседние блоки, но список теперь прокручивается. */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { height: listHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, index) => (
          <TableRow key={row.id} row={row} place={index + 1} maxScore={maxScore} />
        ))}
      </ScrollView>

      <Text style={[styles.hint, { paddingBottom: insets.bottom + 12 }]}>
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
        <Text style={styles.score} allowFontScaling={false}>{row.score}</Text>
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
  // Прокрутка занимает всё свободное место между шапкой и подсказкой.
  listScroll: { flex: 1 },
  // height приходит из listHeight: плашки позиционированы абсолютно, поэтому
  // контейнеру нужна явная высота, иначе ScrollView считает контент нулевым.
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
