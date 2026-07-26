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

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image'; // guard-ok: декоративная монета, число рядом — реальный индикатор (a11y на Pill)
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
// зачем: голый router.back() крашит Android/Fabric при teardown — тот же контракт,
// что и в coin_exchange.tsx, используем везде, где добавляем кнопку «назад».
import { safeRouterBack } from '../navigation_back';
import TapScale from '../../components/TapScale';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import AvatarView from '../../components/AvatarView';
import { coinIconForBalance } from '../coin_icons';
import { getShardsBalance, peekLastKnownShardsBalance } from '../shards_system';
import { Card, Cta, Pill, Sheet } from '../../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../../components/tournament/TournamentCountdown';
import { T, radius, type } from '../../components/tournament/tournament_theme';
import { TournamentEdgeState, TournamentSkeleton } from '../../components/tournament/TournamentEdgeState';
import {
  joinTournament,
  loadSchedule,
  tournamentDateKey,
  tournamentRoomId,
  useTournamentRoom,
} from '../tournament_client';

type SlotState = 'done' | 'now' | 'next';
type DaySlot = { time: string; state: SlotState };

/** Слот расписания — форма совпадает с TournamentSlotConfig на сервере. */
type ScheduleSlot = {
  slotId: string;
  localTime: string;
  timezone?: string;
  ticketsRequired?: number;
  enabled?: boolean;
  /** Вычисляется на клиенте: когда сегодня стартует этот слот. */
  startsAtMs?: number;
};
type ScheduleConfig = { slots: ScheduleSlot[] };

/** Момент сегодняшнего старта слота в его таймзоне. */
function slotStartMs(slot: ScheduleSlot): number {
  const match = /^(\d{2}):(\d{2})$/.exec(slot.localTime ?? '');
  if (!match) return 0;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return target.getTime();
}

/**
 * Ближайший включённый слот: тот, что ещё не прошёл. Если на сегодня всё
 * отыграно — берём первый завтрашний, чтобы отсчёт не показывал ноль.
 */
function pickNextSlot(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number }) | null {
  const enabled = slots
    .filter((slot) => slot.enabled === true && /^\d{2}:\d{2}$/.test(slot.localTime ?? ''))
    .map((slot) => ({ ...slot, startsAtMs: slotStartMs(slot) }))
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
  if (enabled.length === 0) return null;

  const now = Date.now();
  const upcoming = enabled.find((slot) => slot.startsAtMs > now - 20 * 60 * 1000);
  if (upcoming) return upcoming;
  const first = enabled[0];
  return { ...first, startsAtMs: first.startsAtMs + 24 * 60 * 60 * 1000 };
}

/** Слоты дня для полосы под отсчётом: пройден / идёт / следующий. */
function daySlots(slots: ScheduleSlot[], activeSlotId: string | null): DaySlot[] {
  const now = Date.now();
  return slots
    .filter((slot) => slot.enabled === true && /^\d{2}:\d{2}$/.test(slot.localTime ?? ''))
    .map((slot) => {
      const startsAtMs = slotStartMs(slot);
      const state: SlotState = slot.slotId === activeSlotId
        ? 'now'
        : startsAtMs < now ? 'done' : 'next';
      return { time: slot.localTime, state };
    });
}

// зачем: раньше здесь были эмодзи-«аватары» лидеров (🐺👑⚔️) с хардкод-хексами —
// правило владельца запрещает эмодзи-валюту/аватары, показываем реальные
// аватарки через approved AvatarView (те же ассеты, что в лигах/друзьях).
const SEASON_LEADERS = [
  { avatarIndex: 3, color: T.leaderWolf },
  { avatarIndex: 7, color: T.leaderCrown },
  { avatarIndex: 5, color: T.leaderSword },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  // зачем: экран открывается пушем из таббара, но своей кнопки «назад» не было
  // (только safeRouterBack был импортирован без дела) — паттерн 1:1 как в
  // shards_shop.tsx: круглая кнопка chevron-back + safeRouterBack с фолбэком.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  // TODO(server): баланс билетов/банка придёт из профиля тем же снимком, что и главная.
  const [tickets] = useState<number>(3);
  // зачем: раньше здесь был отдельный эмодзи-«гем» (💎), запрещённая владельцем
  // валюта. Показываем реальный баланс монет — как на Главной/в Магазине —
  // синхронно из кэша (Performance Bible: без спиннера и «0 → значение» прыжка).
  const [coins, setCoins] = useState<number>(() => peekLastKnownShardsBalance() ?? 0);
  const [bank] = useState<number>(240);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [joining, setJoining] = useState(false);

  // Расписание читается снимком и кэшируется на 6 часов — оно меняется раз
  // в недели, live-подписка на нём была бы тратой чтений.
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [scheduleFailed, setScheduleFailed] = useState(false);

  const reloadSchedule = useCallback(() => {
    setScheduleFailed(false);
    void loadSchedule()
      .then((value) => setSchedule((value as ScheduleConfig | null) ?? { slots: [] }))
      .catch(() => setScheduleFailed(true));
  }, []);

  useEffect(reloadSchedule, [reloadSchedule]);

  // Тихая ревалидация баланса монет с сервера — тот же паттерн, что в coin_exchange.tsx.
  useEffect(() => {
    void getShardsBalance().then(setCoins).catch(() => {});
  }, []);

  // Ближайший включённый слот и его сегодняшняя комната.
  const nextSlot = useMemo(() => pickNextSlot(schedule?.slots ?? []), [schedule]);
  const roomId = useMemo(() => {
    if (!nextSlot) return null;
    const timezone = nextSlot.timezone || 'Europe/Moscow';
    return tournamentRoomId(nextSlot.slotId, timezone, tournamentDateKey(timezone));
  }, [nextSlot]);

  const { room, status, retry } = useTournamentRoom(roomId);

  const startsAt = room?.startsAt ?? nextSlot?.startsAtMs ?? 0;
  const secondsToStart = useCountdown(
    startsAt ? Math.max(0, Math.round((startsAt - Date.now()) / 1000)) : 0,
    Boolean(startsAt),
  );
  const live = room?.state === 'round' || room?.state === 'table' || room?.state === 'final';
  const noTickets = tickets <= 0;

  const openConfirm = useCallback(() => setConfirmVisible(true), []);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);

  /**
   * Вход: билет списывает СЕРВЕР, клиент только просит. Пока запрос летит,
   * кнопка заблокирована — иначе двойной тап спишет два билета.
   */
  const enterLobby = useCallback(async () => {
    if (!roomId || joining) return;
    setJoining(true);
    try {
      await joinTournament(roomId);
      setConfirmVisible(false);
      router.push({ pathname: '/tournament_lobby', params: { roomId } });
    } catch {
      setConfirmVisible(false);
    } finally {
      setJoining(false);
    }
  }, [roomId, joining, router]);

  const contentPadding = useMemo(
    () => ({ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }),
    [insets.top, insets.bottom],
  );

  // Краевые состояния до основного рендера: скелетон повторяет геометрию,
  // поэтому появление данных не двигает вёрстку.
  if (scheduleFailed || status === 'offline') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="offline" onRetry={() => { reloadSchedule(); retry(); }} />
      </View>
    );
  }
  if (!schedule) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <TournamentSkeleton />
      </View>
    );
  }
  if (!nextSlot) {
    // Слоты выключены в админке — режим ещё не запущен.
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="preseason" />
      </View>
    );
  }
  if (room?.state === 'cancelled') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="cancelled" onRetry={reloadSchedule} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={false}
        // зачем: таббар схлопывается за пальцем и читает офсет активного таба.
        // bounces даёт отрицательный офсет, когда контент короче экрана, — без него
        // на коротком расписании таббар не реагировал бы на тягу вниз вообще.
        bounces
        alwaysBounceVertical
        scrollEventThrottle={16}
        onScroll={topFadeScroll?.onScroll}
      >
        {/* Шапка: назад + название + баланс */}
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TapScale>
          <Text style={styles.title}>Турниры</Text>
          <View style={styles.headerRight}>
            {/* зачем: был запрещённый эмодзи-«гем» — теперь настоящая монета,
                как на Главной/в Магазине (coinIconForBalance + число рядом). */}
            <Pill>
              <Image
                source={coinIconForBalance(coins)}
                style={styles.coinIcon}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              {' '}{coins}
            </Pill>
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
                {live
                  ? `${room?.players?.length ?? 0} из 16 мест занято — успей зайти!`
                  : 'до старта · 16 игроков · 4 раунда'}
              </Text>
            </View>

            <View style={styles.slots}>
              {daySlots(schedule?.slots ?? [], nextSlot?.slotId ?? null).map((slot) => (
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
              <Cta onPress={openConfirm} disabled={!roomId}>
                {live ? 'В игру · 1 🎟' : `Играть за ${nextSlot?.ticketsRequired ?? 1} 🎟`}
              </Cta>
            )}
          </Card>
        </Animated.View>

        {/* Банк недели */}
        <Animated.View entering={FadeIn.duration(220).delay(60)}>
          <Card tone="gold" pad={22}>
            <View style={styles.bankRow}>
              {/* зачем: было эмодзи 💰 (иконка) + 💎 (запрещённая гем-валюта) —
                  одна настоящая иконка монеты покрывает обе роли, число — главный
                  индикатор рядом (тот же паттерн, что на Главной/в Магазине). */}
              <Image
                source={coinIconForBalance(bank)}
                style={styles.bankHeroIcon}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <View style={styles.bankBody}>
                <Text style={styles.bankKicker}>Банк недели</Text>
                <Text style={styles.bankValue} allowFontScaling={false}>{bank}</Text>
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
                {/* зачем: эмодзи-«аватары» лидеров заменены на approved AvatarView —
                    те же ассеты, что в лигах/друзьях, вместо запрещённых эмодзи. */}
                {SEASON_LEADERS.map((leader, index) => (
                  <View
                    key={leader.avatarIndex}
                    style={[
                      styles.seasonAvatar,
                      { backgroundColor: `${leader.color}33`, marginLeft: index ? -10 : 0 },
                    ]}
                  >
                    <AvatarView avatar={String(leader.avatarIndex)} size={32} animateAura={false} />
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
          <Cta onPress={enterLobby} disabled={joining}>
            {joining ? 'Заходим…' : 'Погнали!'}
          </Cta>
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
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: T.text },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinIcon: { width: 18, height: 18 },

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
  bankHeroIcon: { width: 44, height: 44 },
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
