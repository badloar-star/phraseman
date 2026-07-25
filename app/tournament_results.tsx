// ═══════════════════════════════════════════════════════════════════════════
// tournament_results.tsx — итоги турнира (макеты 17-20).
//
// зачем: финал режима. Подиум с короной, призы, награда игрока, шер-карточка.
// Кнопки «сыграть ещё» НЕТ намеренно — турнир завершён, следующий по
// расписанию (решение владельца, спека §7).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// зачем: голый router.back() крашит Android/Fabric при teardown — тот же контракт,
// что и в shards_shop.tsx/tournaments.tsx/tournament_season.tsx.
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import AvatarView from '../components/AvatarView';
import { coinIconForBalance } from './coin_icons';
import { Card, Cta } from '../components/tournament/tournament_ui';
import { T, motion, placeColor, radius, type } from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { claimReward, useTournamentRoom, type RoomPlayer } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';

type Winner = { name: string; avatar: string; color: string; score: number; place: number };

// зачем: 💎 — запрещённая эмодзи-валюта; призовой текст теперь ссылается на
// монеты словом «монет», сама иконка монеты рисуется рядом с суммой в UI
// (не встроена в текст, т.к. это строка из трёх разных призов подряд).
/** Призы совпадают с TOURNAMENT_PRIZES на сервере (tournament_core.ts). */
const PRIZES = [
  { medal: '🥇', text: '🎟 + 50 монет + титул «Чемпион дня»' },
  { medal: '🥈', text: '🎟 + 25 монет' },
  { medal: '🥉', text: '10 монет' },
];

/**
 * Итоговые места по очкам. Подиум ставится 2-1-3, как в макете 17: первое
 * место визуально по центру и выше.
 */
function buildPodium(players: readonly RoomPlayer[]): Winner[] {
  const sorted = [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  const top = sorted.slice(0, 3).map((player, index) => ({
    name: player.name || 'Игрок',
    // зачем: был эмодзи-фолбэк '🙂' — approved AvatarView сам рисует дефолтный
    // LevelBadge, если avatar пуст/невалиден, эмодзи-костыль не нужен.
    avatar: player.avatar || '',
    // зачем: было хардкод-hex '#8AB49A' — фолбэк-цвет аватара теперь берётся
    // из общего токен-набора режима (тот же тон, что T.muted).
    color: player.color || T.muted,
    score: Number(player.score ?? 0),
    place: index + 1,
  }));
  // Порядок колонн: серебро, золото, бронза.
  return [top[1], top[0], top[2]].filter((winner): winner is Winner => Boolean(winner));
}

export default function TournamentResultsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;
  // зачем: у финального экрана не было пути назад кроме кнопки внизу — добавлена
  // компактная кнопка в шапке, тот же паттерн, что и в остальных экранах
  // турниров. Кнопка повторного запуска турнира отсутствует намеренно — см. шапку файла.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/tournaments' as any), [router]);

  const { room, status, retry } = useTournamentRoom(roomId);
  const [myId, setMyId] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'done' | 'failed'>('idle');
  const claimedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  const players = room?.players ?? [];
  const podium = useMemo(() => buildPodium(players), [players]);

  const standings = useMemo(
    () => [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)),
    [players],
  );
  const myIndex = myId ? standings.findIndex((player) => player.id === myId) : -1;
  const myPlace = myIndex >= 0 ? myIndex + 1 : 0;
  const me = myIndex >= 0 ? standings[myIndex] : null;
  const won = myPlace > 0 && myPlace <= 3;
  const beaten = myPlace > 0 ? Math.max(0, standings.length - myPlace) : 0;

  useEffect(() => {
    if (!won) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [won]);

  /**
   * Забрать награду.
   *
   * зачем: сервер идемпотентен (повторный вызов не выдаёт приз дважды), но
   * лишний вызов — лишние деньги и лишняя гонка. Поэтому один claim за экран,
   * а состояние кнопки меняется МГНОВЕННО, до ответа сервера.
   */
  const claim = useCallback(async () => {
    if (!roomId || claimedRef.current) return;
    claimedRef.current = true;
    setClaimState('claiming');
    try {
      await claimReward(roomId);
      setClaimState('done');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Откат: даём повторить, иначе игрок останется без приза из-за
      // моргнувшей сети.
      claimedRef.current = false;
      setClaimState('failed');
    }
  }, [roomId]);

  // Награда забирается автоматически при открытии итогов — лишний тап здесь
  // не нужен, приз уже заслужен.
  useEffect(() => {
    if (!roomId || !room) return;
    if (room.state !== 'results' && room.state !== 'rewards' && room.state !== 'closed') return;
    if (claimedRef.current) return;
    void claim();
  }, [roomId, room, room?.state, claim]);

  const share = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Я обыграл ${beaten} игроков в турнире Phraseman! Сможешь меня победить?`,
      });
    } catch {
      // Пользователь закрыл шторку — это не ошибка.
    }
  }, [beaten]);

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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* зачем: финальный экран не имел выхода назад (только «На главную»
            снизу) — компактная кнопка в углу, тот же паттерн, что и в
            остальных экранах турниров. */}
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TapScale>
        </View>

        <Animated.View entering={FadeInDown.duration(280)} style={styles.titleBlock}>
          <Text style={styles.title}>
            {won ? '🏆 Победа!' : 'Турнир завершён'}
          </Text>
          <Text style={styles.subtitle}>
            {won
              ? `Вы обыграли ${beaten} игроков`
              : myPlace > 0 ? `Ваше место: ${myPlace}` : 'Результаты считаются…'}
          </Text>
        </Animated.View>

        {/* Подиум */}
        <Card tone="elev" pad={20}>
          <View style={styles.podium}>
            {podium.map((winner) => (
              <PodiumColumn key={`${winner.place}-${winner.name}`} winner={winner} />
            ))}
          </View>
        </Card>

        {/* Призы */}
        <Card pad={18}>
          {PRIZES.map((prize) => (
            <View key={prize.medal} style={styles.prizeRow}>
              <Text style={styles.prizeMedal}>{prize.medal}</Text>
              <Text style={styles.prizeText}>{prize.text}</Text>
            </View>
          ))}
        </Card>

        {/* Награда игрока */}
        <Card tone="elev" pad={20}>
          <View style={styles.rewardRow}>
            {/* зачем: было хардкод-hex фолбэк-цвета + эмодзи-аватар — теперь
                общий T.muted и настоящий AvatarView, как на подиуме выше. */}
            <View style={[styles.rewardAvatar, { backgroundColor: `${me?.color ?? T.muted}33` }]}>
              <AvatarView avatar={me?.avatar ?? ''} size={40} animateAura={false} />
            </View>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>Ваша награда</Text>
              <Text style={styles.rewardSub}>
                {claimState === 'failed' ? 'не удалось начислить' : 'начислена'}
              </Text>
            </View>
            <View style={styles.rewardValueBox}>
              <Text style={styles.rewardValue} allowFontScaling={false}>
                {me ? me.score : 0}
              </Text>
              <Text style={styles.rewardValueLabel}>очков</Text>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          {claimState === 'failed' ? (
            <Cta onPress={claim}>Забрать награду</Cta>
          ) : (
            <Cta onPress={share}>Поделиться 📤</Cta>
          )}
          <Cta ghost onPress={() => router.replace('/tournaments')}>На главную</Cta>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Колонна подиума ─────────────────────────────────────────────────────────

const PODIUM_HEIGHT: Record<number, number> = { 1: 96, 2: 72, 3: 60 };

const PodiumColumn = memo(function PodiumColumn({ winner }: { winner: Winner }) {
  const first = winner.place === 1;
  const crownScale = useSharedValue(0);
  const avatarY = useSharedValue(24);

  useEffect(() => {
    const delay = first ? 420 : winner.place === 2 ? 220 : 320;
    avatarY.value = withDelay(delay, withSpring(0, motion.popIn));
    if (first) {
      // Корона прилетает пружиной с лёгким перелётом — момент триумфа.
      crownScale.value = withDelay(760, withSequence(
        withSpring(1.25, motion.popIn),
        withSpring(1, motion.popIn),
      ));
    }
  }, [first, winner.place, avatarY, crownScale]);

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ translateY: avatarY.value }] }));
  const crownStyle = useAnimatedStyle(() => ({ transform: [{ scale: crownScale.value }] }));

  return (
    <View style={styles.podiumColumn}>
      {first ? (
        <Animated.Text style={[styles.crown, crownStyle]}>👑</Animated.Text>
      ) : (
        <View style={styles.crownSpacer} />
      )}

      <Animated.View style={avatarStyle}>
        <View
          style={[
            styles.podiumAvatar,
            { backgroundColor: `${winner.color}33` },
            first && styles.podiumAvatarFirst,
          ]}
        >
          <AvatarView avatar={winner.avatar} size={first ? 74 : 62} animateAura={false} />
        </View>
      </Animated.View>

      <Text style={styles.podiumName} numberOfLines={1}>{winner.name}</Text>
      <Text style={styles.podiumScore} allowFontScaling={false}>{winner.score} очк.</Text>

      <Animated.View
        entering={FadeIn.delay(300).duration(300)}
        style={[
          styles.podiumBlock,
          {
            height: PODIUM_HEIGHT[winner.place],
            backgroundColor: `${placeColor(winner.place)}22`,
          },
        ]}
      >
        <Text style={styles.podiumPlace}>
          {winner.place === 1 ? '🥇' : winner.place === 2 ? '🥈' : '🥉'}
        </Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '900', color: T.text, letterSpacing: -0.8 },
  subtitle: { ...type.body, color: T.muted, marginTop: 6 },

  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  podiumColumn: { flex: 1, alignItems: 'center' },
  crown: { fontSize: 26, marginBottom: 2 },
  crownSpacer: { height: 28 },
  podiumAvatar: {
    width: 62,
    height: 62,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: {
    width: 74,
    height: 74,
    shadowColor: T.gold,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  podiumName: { fontSize: 14, fontWeight: '800', color: T.text, marginTop: 8 },
  podiumScore: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  podiumBlock: {
    width: '100%',
    marginTop: 10,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    alignItems: 'center',
    paddingTop: 8,
  },
  podiumPlace: { fontSize: 20 },

  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  prizeMedal: { fontSize: 20 },
  prizeText: { flex: 1, ...type.body, color: T.text },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rewardAvatar: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rewardBody: { flex: 1 },
  rewardTitle: { fontSize: 17, fontWeight: '800', color: T.text },
  rewardSub: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 3 },
  rewardValueBox: { alignItems: 'flex-end' },
  rewardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: T.accent,
    fontVariant: ['tabular-nums'],
  },
  rewardValueLabel: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2 },

  actions: { gap: 10, marginTop: 4 },
});
