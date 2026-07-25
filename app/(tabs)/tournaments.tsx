// ═══════════════════════════════════════════════════════════════════════════
// tournaments.tsx — главный экран режима «Турниры» (макеты 01-05).
//
// зачем: точка входа режима. Hero-отсчёт до старта, слоты дня, вход за билет,
// банк недели, тизер сезона. Порт утверждённого прототипа
// (docs/design/tournaments/prototype/src/screens/TournamentHome.tsx) 1:1.
//
// Performance Bible: первый кадр = финальная геометрия. Данные тянутся ОДНИМ
// снимком расписания, скелетон с зарезервированными размерами, никаких
// «0 → значение» прыжков и полноэкранных спиннеров.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { Card, Cta, Pill, Sheet } from '../../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../../components/tournament/TournamentCountdown';
import { T, radius, type } from '../../components/tournament/tournament_theme';

type SlotState = 'done' | 'now' | 'next';
type DaySlot = { time: string; state: SlotState };

/** Заглушка данных до подключения сервера — форма совпадает с ответом комнаты. */
const DAY_SLOTS: DaySlot[] = [
  { time: '12:00', state: 'done' },
  { time: '19:00', state: 'now' },
  { time: '21:00', state: 'next' },
];

const SEASON_LEADERS = [
  { emoji: '🐺', color: '#8B8B8B' },
  { emoji: '👑', color: '#FFD43B' },
  { emoji: '⚔️', color: '#FF5B6C' },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();

  // TODO(server): значения придут из tournamentRooms/tournamentSchedule одним
  // снимком. Сейчас — форма данных, чтобы верстка совпала с макетом.
  const [tickets] = useState(3);
  const [gems] = useState(124);
  const [bank] = useState(240);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const secondsToStart = useCountdown(4 * 60 + 23);
  const live = false;
  const noTickets = tickets <= 0;

  const openConfirm = useCallback(() => setConfirmVisible(true), []);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);
  const enterLobby = useCallback(() => {
    setConfirmVisible(false);
    router.push('/tournament_lobby');
  }, [router]);

  const contentPadding = useMemo(
    () => ({ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }),
    [insets.top, insets.bottom],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка: название + баланс */}
        <View style={styles.header}>
          <Text style={styles.title}>Турниры</Text>
          <View style={styles.headerRight}>
            <Pill>💎 {gems}</Pill>
            <Pill tone={noTickets ? 'danger' : 'card'}>🎟 {tickets}</Pill>
          </View>
        </View>

        {/* HERO: отсчёт, слоты дня, вход */}
        <Animated.View entering={FadeIn.duration(220)}>
          <Card tone="elev" pad={24}>
            <View style={styles.heroTop}>
              <Text style={[styles.heroKicker, { color: live ? T.danger : T.accent }]}>
                {live ? 'Турнир идёт' : 'Турнир фраз'}
              </Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>🎁 первый вход — бесплатно</Text>
              </View>
            </View>

            <View style={styles.heroCenter}>
              {live ? (
                <Text style={styles.liveText} allowFontScaling={false}>LIVE</Text>
              ) : (
                <TimeLeft seconds={secondsToStart} />
              )}
              <Text style={styles.heroSub}>
                {live ? '12 из 16 мест занято — успей зайти!' : 'до старта · 16 игроков · 4 раунда'}
              </Text>
            </View>

            <View style={styles.slots}>
              {DAY_SLOTS.map((slot) => (
                <SlotCell key={slot.time} slot={slot} live={live} />
              ))}
            </View>

            {noTickets ? (
              <>
                <Cta ghost>Нет билетов 😔</Cta>
                <View style={styles.howTo}>
                  <Text style={styles.howToIcon}>🎟</Text>
                  <View style={styles.howToBody}>
                    <Text style={styles.howToTitle}>Как получить билеты</Text>
                    <Text style={styles.howToText}>ежедневные задания · уровни · банк недели</Text>
                  </View>
                </View>
              </>
            ) : (
              <Cta onPress={openConfirm}>{live ? 'В игру · 1 🎟' : 'Играть за 1 🎟'}</Cta>
            )}
          </Card>
        </Animated.View>

        {/* Банк недели */}
        <Animated.View entering={FadeIn.duration(220).delay(60)}>
          <Card tone="gold" pad={22}>
            <View style={styles.bankRow}>
              <Text style={styles.bankIcon}>💰</Text>
              <View style={styles.bankBody}>
                <Text style={styles.bankKicker}>Банк недели</Text>
                <Text style={styles.bankValue} allowFontScaling={false}>
                  {bank} <Text style={styles.bankGem}>💎</Text>
                </Text>
              </View>
              <View style={styles.vipBox}>
                <Text style={styles.vipTitle}>👑 VIP</Text>
                <Text style={styles.vipSub}>вс, 20:00</Text>
                <Text style={styles.vipCost}>вход 3 🎟</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Сезон */}
        <Animated.View entering={FadeIn.duration(220).delay(120)}>
          <Card pad={18} onPress={() => router.push('/tournament_season')}>
            <View style={styles.seasonRow}>
              <View style={styles.seasonAvatars}>
                {SEASON_LEADERS.map((leader, index) => (
                  <View
                    key={leader.emoji}
                    style={[
                      styles.seasonAvatar,
                      { backgroundColor: `${leader.color}33`, marginLeft: index ? -10 : 0 },
                    ]}
                  >
                    <Text style={styles.seasonAvatarText}>{leader.emoji}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.seasonBody}>
                <Text style={styles.seasonTitle}>Сезон · вы 6-е</Text>
                <Text style={styles.seasonSub}>до топ-5 — 24 очка</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Подтверждение входа (макет 04) */}
      <Sheet visible={confirmVisible} onClose={closeConfirm}>
        <Text style={styles.sheetIcon}>🏆</Text>
        <Text style={styles.sheetTitle}>Войти в турнир?</Text>
        <Text style={styles.sheetSub}>Списание: 1 🎟 · останется {Math.max(0, tickets - 1)}</Text>
        <View style={styles.sheetActions}>
          <Cta onPress={enterLobby}>Погнали!</Cta>
          <Cta ghost onPress={closeConfirm}>Отмена</Cta>
        </View>
      </Sheet>
    </View>
  );
}

// ── Слот дня ────────────────────────────────────────────────────────────────

const SlotCell = memo(function SlotCell({ slot, live }: { slot: DaySlot; live: boolean }) {
  const isNow = slot.state === 'now';
  const isDone = slot.state === 'done';

  return (
    <View
      style={[
        styles.slot,
        {
          backgroundColor: isNow ? T.accentSoft : slot.state === 'next' ? T.card : 'transparent',
          opacity: isDone ? 0.55 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.slotTime,
          {
            color: isDone ? T.ghost : isNow ? T.accent : T.muted,
            textDecorationLine: isDone ? 'line-through' : 'none',
          },
        ]}
        allowFontScaling={false}
      >
        {slot.time}
      </Text>
      {isNow ? <Text style={styles.slotNow}>{live ? 'ИДЁТ' : 'СЕЙЧАС'}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { ...type.title, color: T.text },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroKicker: { ...type.label, letterSpacing: 1, textTransform: 'uppercase' },
  freeBadge: {
    marginLeft: 'auto',
    backgroundColor: T.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  freeBadgeText: { ...type.label, color: T.gold },

  heroCenter: { alignItems: 'center', marginTop: 22, marginBottom: 6 },
  liveText: { fontSize: 64, fontWeight: '900', letterSpacing: 2, color: T.danger },
  heroSub: { ...type.body, color: T.muted, marginTop: 8, textAlign: 'center' },

  slots: { flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 22 },
  slot: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  slotTime: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  slotNow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 2, color: T.accent },

  howTo: {
    marginTop: 14,
    borderRadius: radius.md,
    backgroundColor: T.goldSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  howToIcon: { fontSize: 22 },
  howToBody: { flex: 1 },
  howToTitle: { ...type.body, fontWeight: '800', color: T.gold },
  howToText: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2 },

  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bankIcon: { fontSize: 44 },
  bankBody: { flex: 1 },
  bankKicker: { ...type.label, letterSpacing: 1, textTransform: 'uppercase', color: T.goldText },
  bankValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: T.gold,
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
  },
  bankGem: { fontSize: 22 },
  vipBox: { alignItems: 'flex-end' },
  vipTitle: { ...type.body, fontWeight: '800', color: T.text },
  vipSub: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2 },
  vipCost: { ...type.label, color: T.gold, marginTop: 2 },

  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seasonAvatars: { flexDirection: 'row' },
  seasonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonAvatarText: { fontSize: 18 },
  seasonBody: { flex: 1 },
  seasonTitle: { fontSize: 16, fontWeight: '800', color: T.text },
  seasonSub: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: T.ghost },

  sheetIcon: { fontSize: 44, textAlign: 'center' },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: T.text, textAlign: 'center', marginTop: 8 },
  sheetSub: {
    fontSize: 16,
    fontWeight: '600',
    color: T.muted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
  },
  sheetActions: { gap: 10 },
});
