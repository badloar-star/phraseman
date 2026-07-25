// ═══════════════════════════════════════════════════════════════════════════
// tournament_lobby.tsx — лобби турнира (макеты 06-08).
//
// зачем: сбор 16 игроков перед стартом. Сетка ФИКСИРОВАННАЯ 4×4 — места
// зарезервированы сразу, игроки появляются pop-in НА СВОЁМ МЕСТЕ. Так первый
// кадр совпадает с финальной геометрией (Performance Bible: layout stability):
// никакого «список растёт и всё прыгает».
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card, Cta, Sheet } from '../components/tournament/tournament_ui';
import { useCountdown } from '../components/tournament/TournamentCountdown';
import { T, formatTimeLeft, radius, type } from '../components/tournament/tournament_theme';

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

/** TODO(server): придёт из tournamentRooms/{roomId}.players одним слушателем. */
const DEMO_SEATS: Seat[] = [
  { id: 1, name: 'Вы', emoji: '🦊', color: '#FB923C', streak: 3, rank: 'Знаток', winRate: 52, played: 41, isYou: true },
  { id: 2, name: 'СловоЖора', emoji: '🐺', color: '#8B8B8B', streak: 5, rank: 'Мастер', winRate: 61, played: 128 },
  { id: 3, name: 'Фразочкина', emoji: '🦉', color: '#47C870', streak: 2, rank: 'Знаток', winRate: 49, played: 73 },
  { id: 4, name: 'ГраммарНацик', emoji: '🤓', color: '#FFD43B', streak: 0, rank: 'Ученик', winRate: 44, played: 22 },
  { id: 5, name: 'МолнияPRO', emoji: '⚔️', color: '#FF5B6C', streak: 7, rank: 'Мастер', winRate: 66, played: 210 },
  { id: 6, name: 'LingvoLisa', emoji: '🔥', color: '#FB923C', streak: 1, rank: 'Знаток', winRate: 53, played: 88 },
  { id: 7, name: 'Полиглот_77', emoji: '🌍', color: '#3B82F6', streak: 4, rank: 'Мастер', winRate: 58, played: 155 },
  { id: 8, name: 'СленгМастер', emoji: '🎧', color: '#A78BFA', streak: 0, rank: 'Ученик', winRate: 41, played: 30 },
  { id: 9, name: 'VerbaVolt', emoji: '⚡', color: '#FFD43B', streak: 2, rank: 'Знаток', winRate: 50, played: 64 },
  { id: 10, name: 'ТихийСловарь', emoji: '📚', color: '#8AB49A', streak: 0, rank: 'Ученик', winRate: 39, played: 18 },
  { id: 11, name: 'IdiomHunter', emoji: '🏹', color: '#47C870', streak: 3, rank: 'Знаток', winRate: 55, played: 97 },
  { id: 12, name: 'МадамПеревод', emoji: '💃', color: '#FF5B6C', streak: 1, rank: 'Знаток', winRate: 47, played: 52 },
  { id: 13, name: 'NoCapNika', emoji: '🧢', color: '#3B82F6', streak: 0, rank: 'Ученик', winRate: 43, played: 25 },
  { id: 14, name: 'АкцентЗеро', emoji: '🎯', color: '#A78BFA', streak: 2, rank: 'Знаток', winRate: 51, played: 70 },
  { id: 15, name: 'RoflPhrase', emoji: '🐸', color: '#47C870', streak: 0, rank: 'Ученик', winRate: 38, played: 14 },
  { id: 16, name: 'КубокБарон', emoji: '👑', color: '#FFD43B', streak: 6, rank: 'Легенда', winRate: 71, played: 340 },
];

export default function TournamentLobbyScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();

  // Игроки «подключаются» по одному — так лобби живёт, а не висит статикой.
  const [joined, setJoined] = useState(6);
  const [selected, setSelected] = useState<Seat | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const secondsToStart = useCountdown(14);

  useEffect(() => {
    if (joined >= SEATS) return;
    const id = setTimeout(() => setJoined((n) => Math.min(SEATS, n + 1)), 420);
    return () => clearTimeout(id);
  }, [joined]);

  useEffect(() => {
    if (secondsToStart > 0) return;
    router.replace('/tournament_round');
  }, [secondsToStart, router]);

  const full = joined >= SEATS;
  const seats = useMemo(() => DEMO_SEATS.slice(0, joined), [joined]);

  const sendReaction = useCallback((emoji: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReaction(emoji);
    setTimeout(() => setReaction(null), 900);
  }, []);

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
            <Text style={[styles.statusText, { color: full ? T.accent : T.text }]}>
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

        <Cta disabled={!full} onPress={() => router.replace('/tournament_round')}>
          {full ? 'Начать сейчас ▶' : `Ждём ещё ${SEATS - joined}`}
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
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue} allowFontScaling={false}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
});

const SeatCard = memo(function SeatCard({ seat, onPress }: { seat: Seat; onPress: () => void }) {
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
          style={[styles.seatName, seat.isYou && { color: T.accent }]}
          numberOfLines={1}
        >
          {seat.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center' },
  title: { ...type.title, color: T.text },
  counter: {
    marginLeft: 'auto',
    fontSize: 17,
    fontWeight: '800',
    color: T.muted,
    fontVariant: ['tabular-nums'],
  },

  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 18, fontWeight: '800' },
  statusTimer: {
    marginLeft: 'auto',
    fontSize: 30,
    fontWeight: '900',
    color: T.text,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: T.elev2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: T.accent },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Ровно 4 в ряд: ширина 25% и квадратное соотношение — сетка не «плывёт».
  seatSlot: { width: '25%', aspectRatio: 0.86, padding: 4 },
  seatFill: { flex: 1 },
  seat: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 6,
  },
  seatYou: { backgroundColor: T.accentSoft },
  seatEmpty: { flex: 1, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.03)' },
  seatAvatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  seatEmoji: { fontSize: 22 },
  seatStreak: { position: 'absolute', top: 6, right: 8, fontSize: 13 },
  seatName: { fontSize: 11, fontWeight: '800', color: T.text, textAlign: 'center' },

  reactions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 6 },
  reactionButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: T.card,
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
  profileName: { fontSize: 22, fontWeight: '900', color: T.text, textAlign: 'center', marginTop: 12 },
  profileRank: { ...type.body, color: T.muted, textAlign: 'center', marginTop: 4 },
  profileStats: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  profileStat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: T.card },
  profileStatValue: { fontSize: 20, fontWeight: '900', color: T.text, fontVariant: ['tabular-nums'] },
  profileStatLabel: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 4 },
});
