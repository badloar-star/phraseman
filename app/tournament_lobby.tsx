// ═══════════════════════════════════════════════════════════════════════════
// tournament_lobby.tsx — лобби турнира (макеты 06-08).
//
// зачем: сбор 16 игроков перед стартом. Сетка ФИКСИРОВАННАЯ 4×4 — места
// зарезервированы сразу, игроки появляются pop-in НА СВОЁМ МЕСТЕ. Так первый
// кадр совпадает с финальной геометрией (Performance Bible: layout stability):
// никакого «список растёт и всё прыгает».
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card, Cta, Sheet } from '../components/tournament/tournament_ui';
import { useCountdown } from '../components/tournament/TournamentCountdown';
import { T, formatTimeLeft, radius, type, useTournamentPalette, type TournamentPalette} from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import {
  isRoundState,
  isTableState, useTournamentRoom, type RoomPlayer } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';

const SEATS = 16;
const REACTIONS = ['👍', '🔥', '😎', '⚔️', '🍀'] as const;

type Seat = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  streak: number;
  rank: string;
  winRate: number;
  played: number;
  isYou?: boolean;
};

/** Ранг по числу сыгранных турниров — сервер его не считает, это витрина. */
function rankForPlayed(played: number): string {
  if (played >= 300) return 'Легенда';
  if (played >= 120) return 'Мастер';
  if (played >= 40) return 'Знаток';
  return 'Ученик';
}

/**
 * Игроки комнаты → места сетки.
 *
 * зачем: сервер отдаёт плоский список без «кто я» и без витринных полей.
 * Порядок сохраняем как пришёл — сервер сажает игроков в порядке входа, и
 * пересортировка заставила бы карточки прыгать при каждом обновлении.
 */
function mapPlayersToSeats(players: readonly RoomPlayer[], myId: string | null): Seat[] {
  return players.slice(0, SEATS).map((player, index) => {
    const played = Number((player as { played?: number }).played ?? 0);
    return {
      id: index + 1,
      name: player.name || 'Игрок',
      emoji: player.avatar || '🙂',
      color: player.color || '#8AB49A',
      streak: Number(player.streak ?? 0),
      rank: rankForPlayed(played),
      winRate: Math.round(Number((player as { botWinRate?: number }).botWinRate ?? 0) * 100) || 0,
      played,
      isYou: Boolean(myId) && player.id === myId,
    };
  });
}

export default function TournamentLobbyScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;

  const { room, status, secondsLeft, retry } = useTournamentRoom(roomId);
  const [selected, setSelected] = useState<Seat | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  // Свой id нужен, чтобы подсветить своё место в сетке.
  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  // Переход в раунд по СЕРВЕРНОМУ состоянию, а не по локальному таймеру:
  // иначе игроки с неточными часами уйдут в раунд раньше или позже остальных.
  useEffect(() => {
    if (!room || !roomId) return;
    if (isRoundState(room.state) || isTableState(room.state)) {
      router.replace({ pathname: '/tournament_round', params: { roomId } });
    }
  }, [room?.state, roomId, router, room]);

  const seats = useMemo(() => mapPlayersToSeats(room?.players ?? [], myId), [room?.players, myId]);
  const joined = seats.length;
  const full = joined >= SEATS;
  const secondsToStart = secondsLeft;

  // зачем: таймер реакции держим в ref и чистим при уходе — иначе он дёрнет
  // состояние уже размонтированного экрана (частый случай: тапнул реакцию и
  // сразу стартовал раунд).
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendReaction = useCallback((emoji: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReaction(emoji);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReaction(null), 900);
  }, []);

  useEffect(() => () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
  }, []);

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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Лобби</Text>
          <Text style={styles.counter} allowFontScaling={false}>{joined}/{SEATS}</Text>
        </View>

        {/* Статус сбора + таймер */}
        <Card tone="elev" pad={20}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: full ? P.accent : P.text }]}>
              {full ? 'Все на месте!' : 'Собираем игроков…'}
            </Text>
            <Text style={styles.statusTimer} allowFontScaling={false}>
              {formatTimeLeft(secondsToStart)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(joined / SEATS) * 100}%` }]} />
          </View>
        </Card>

        {/* Фиксированная сетка 4×4: места зарезервированы с первого кадра */}
        <View style={styles.grid}>
          {Array.from({ length: SEATS }, (_, index) => {
            const seat = seats[index];
            // guard-ok: сетка фиксирована на 16 мест, порядок никогда не
            // меняется — индекс И ЕСТЬ стабильный идентификатор места.
            return (
              <View key={`seat-${index}`} style={styles.seatSlot}>
                {seat ? (
                  <SeatCard seat={seat} onPress={() => setSelected(seat)} />
                ) : (
                  <View style={styles.seatEmpty} />
                )}
              </View>
            );
          })}
        </View>

        {/* Реакции */}
        <View style={styles.reactions}>
          {REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => sendReaction(emoji)}
              style={styles.reactionButton}
              accessibilityRole="button"
              accessibilityLabel={`Отправить реакцию ${emoji}`}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* зачем: старт даёт СЕРВЕР по дедлайну — кнопка лишь сообщает статус.
            Ручной переход раньше сервера показал бы вопросы, которых ещё нет. */}
        <Cta disabled>
          {full ? 'Все на месте — начинаем!' : `Ждём ещё ${Math.max(0, SEATS - joined)}`}
        </Cta>
      </ScrollView>

      {/* Летящая реакция */}
      {reaction ? (
        <Animated.Text entering={ZoomIn.duration(220)} style={styles.flyingReaction}>
          {reaction}
        </Animated.Text>
      ) : null}

      {/* Профиль игрока (макет 08) */}
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <>
            <View style={[styles.profileAvatar, { backgroundColor: `${selected.color}33` }]}>
              <Text style={styles.profileEmoji}>{selected.emoji}</Text>
            </View>
            <Text style={styles.profileName}>{selected.name}</Text>
            <Text style={styles.profileRank}>{selected.rank}</Text>
            <View style={styles.profileStats}>
              <ProfileStat label="Побед" value={`${selected.winRate}%`} />
              <ProfileStat label="Турниров" value={String(selected.played)} />
              <ProfileStat label="Серия" value={selected.streak ? `${selected.streak} 🔥` : '—'} />
            </View>
            {!selected.isYou ? <Cta ghost onPress={() => setSelected(null)}>В друзья</Cta> : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const ProfileStat = memo(function ProfileStat({ label, value }: { label: string; value: string }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue} allowFontScaling={false}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
});

const SeatCard = memo(function SeatCard({ seat, onPress }: { seat: Seat; onPress: () => void }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <Animated.View entering={ZoomIn.springify().damping(14).stiffness(190)} style={styles.seatFill}>
      <Pressable
        onPress={onPress}
        style={[styles.seat, seat.isYou && styles.seatYou]}
        accessibilityRole="button"
        accessibilityLabel={`Профиль ${seat.name}`}
      >
        <View style={[styles.seatAvatar, { backgroundColor: `${seat.color}33` }]}>
          <Text style={styles.seatEmoji}>{seat.emoji}</Text>
        </View>
        {seat.streak > 0 ? <Text style={styles.seatStreak}>🔥</Text> : null}
        <Text
          style={[styles.seatName, seat.isYou && { color: P.accent }]}
          numberOfLines={1}
        >
          {seat.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center' },
  title: { ...type.title, color: P.text },
  counter: {
    marginLeft: 'auto',
    fontSize: 17,
    fontWeight: '800',
    color: P.muted,
    fontVariant: ['tabular-nums'],
  },

  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 18, fontWeight: '800' },
  statusTimer: {
    marginLeft: 'auto',
    fontSize: 30,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: P.elev2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: P.accent },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Ровно 4 в ряд: ширина 25% и квадратное соотношение — сетка не «плывёт».
  seatSlot: { width: '25%', aspectRatio: 0.86, padding: 4 },
  seatFill: { flex: 1 },
  seat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: P.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 6,
  },
  seatYou: { backgroundColor: P.accentSoft },
  seatEmpty: { flex: 1, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.03)' },
  seatAvatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  seatEmoji: { fontSize: 22 },
  seatStreak: { position: 'absolute', top: 6, right: 8, fontSize: 13 },
  seatName: { fontSize: 11, fontWeight: '800', color: P.text, textAlign: 'center' },

  reactions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 6 },
  reactionButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: P.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 24 },
  flyingReaction: { position: 'absolute', alignSelf: 'center', bottom: 200, fontSize: 64 },

  profileAvatar: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: { fontSize: 34 },
  profileName: { fontSize: 22, fontWeight: '900', color: P.text, textAlign: 'center', marginTop: 12 },
  profileRank: { ...type.body, color: P.muted, textAlign: 'center', marginTop: 4 },
  profileStats: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  profileStat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: P.card },
  profileStatValue: { fontSize: 20, fontWeight: '900', color: P.text, fontVariant: ['tabular-nums'] },
  profileStatLabel: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 4 },
});
