// ═══════════════════════════════════════════════════════════════════════════
// tournament_results.tsx — итоги турнира (макеты 17-20).
//
// зачем: финал режима. Подиум с короной, призы, награда игрока, шер-карточка.
// Кнопки «сыграть ещё» НЕТ намеренно — турнир завершён, следующий по
// расписанию (решение владельца, спека §7).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useMemo } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card, Cta } from '../components/tournament/tournament_ui';
import { T, motion, placeColor, radius, type } from '../components/tournament/tournament_theme';

type Winner = { name: string; emoji: string; color: string; score: number; place: number };

/** TODO(server): придёт из tournamentRooms/{roomId}.results. */
const PODIUM: Winner[] = [
  { name: 'СловоЖора', emoji: '🐺', color: '#8B8B8B', score: 70, place: 2 },
  { name: 'Вы', emoji: '🦊', color: '#FB923C', score: 75, place: 1 },
  { name: 'МолнияPRO', emoji: '⚔️', color: '#FF5B6C', score: 68, place: 3 },
];

const PRIZES = [
  { medal: '🥇', text: '🎟 + 50 💎 + титул «Чемпион дня»' },
  { medal: '🥈', text: '🎟 + 25 💎' },
  { medal: '🥉', text: '10 💎' },
];

export default function TournamentResultsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();

  const myPlace = 1;
  const won = myPlace <= 3;
  const beaten = 15;

  useEffect(() => {
    if (!won) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [won]);

  const share = useMemo(() => async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Я обыграл ${beaten} игроков в турнире Phraseman! Сможешь меня победить?`,
      });
    } catch {
      // Пользователь закрыл шторку — это не ошибка.
    }
  }, [beaten]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(280)} style={styles.titleBlock}>
          <Text style={styles.title}>
            {won ? '🏆 Победа!' : 'Турнир завершён'}
          </Text>
          <Text style={styles.subtitle}>
            {won ? `Вы обыграли ${beaten} игроков` : `Ваше место: ${myPlace}`}
          </Text>
        </Animated.View>

        {/* Подиум */}
        <Card tone="elev" pad={20}>
          <View style={styles.podium}>
            {PODIUM.map((winner) => (
              <PodiumColumn key={winner.name} winner={winner} />
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
            <View style={[styles.rewardAvatar, { backgroundColor: '#FB923C33' }]}>
              <Text style={styles.rewardEmoji}>🦊</Text>
            </View>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>Ваша награда</Text>
              <Text style={styles.rewardSub}>+12 XP кэшбэк</Text>
            </View>
            <View style={styles.rewardValueBox}>
              <Text style={styles.rewardValue} allowFontScaling={false}>+22</Text>
              <Text style={styles.rewardValueLabel}>очков сезона</Text>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Cta onPress={share}>Поделиться 📤</Cta>
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
          <Text style={styles.podiumEmoji}>{winner.emoji}</Text>
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
  podiumEmoji: { fontSize: 30 },
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
  rewardEmoji: { fontSize: 26 },
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
