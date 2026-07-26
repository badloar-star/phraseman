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
import { Image } from 'expo-image'; // guard-ok: декоративная жемчужина, число рядом — реальный индикатор (a11y на Pill)
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
import { useTheme } from '../../components/ThemeContext';
import AvatarView from '../../components/AvatarView';
import { coinIconForBalance } from '../coin_icons';
import { getShardsBalance, peekLastKnownShardsBalance } from '../shards_system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWeeklyBankInfo, type WeeklyBankInfo } from '../tournament_client';
import { Card, Cta, Pill, Sheet } from '../../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../../components/tournament/TournamentCountdown';
import { T, radius, type, tournamentPaletteFromTheme, type TournamentPalette } from '../../components/tournament/tournament_theme';
import { TournamentEdgeState, TournamentSkeleton } from '../../components/tournament/TournamentEdgeState';
import {
  devStartTournament,
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
  /** Цена входа в жемчужинах — приходит из настроек экономики. */
  entryGems?: number;
  enabled?: boolean;
  /** Вычисляется на клиенте: когда сегодня стартует этот слот. */
  startsAtMs?: number;
};
type ScheduleConfig = {
  slots: ScheduleSlot[];
  /** Цена входа в жемчужинах из настроек экономики. */
  entryGems?: number;
};

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

/** Базовая цена входа: показываем до ответа сервера, чтобы кнопка не прыгала. */
const DEFAULT_ENTRY_GEMS = 3;

/** Дольше этого ждать расписание бессмысленно — показываем «Повторить». */
const SCHEDULE_TIMEOUT_MS = 8000;

export default function TournamentsScreen() {
  const { themeMode, theme } = useTheme();
  // Палитра турниров = активная тема приложения (формат T сохранён).
  const P = useMemo(() => tournamentPaletteFromTheme(theme), [theme]);
  const styles = useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  // зачем: экран открывается пушем из таббара, но своей кнопки «назад» не было
  // (только safeRouterBack был импортирован без дела) — паттерн 1:1 как в
  // shards_shop.tsx: круглая кнопка chevron-back + safeRouterBack с фолбэком.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  // зачем: раньше здесь был отдельный эмодзи-«гем» (💎), запрещённая владельцем
  // валюта. Показываем реальный баланс монет — как на Главной/в Магазине —
  // синхронно из кэша (Performance Bible: без спиннера и «0 → значение» прыжка).
  const [coins, setCoins] = useState<number>(() => peekLastKnownShardsBalance() ?? 0);
  // зачем: банк был захардкожен числом 240 — показывали выдумку. Теперь
  // реальная сумма с сервера; null до ответа, чтобы не мигать нулём.
  const [bankInfo, setBankInfo] = useState<WeeklyBankInfo | null>(null);
  const bank = bankInfo?.bankGems ?? 0;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  // Модалка выигрыша недельного банка: показываем один раз на неделю.
  const [weeklyPrize, setWeeklyPrize] = useState<{ place: number; gems: number } | null>(null);

  // Расписание читается снимком и кэшируется на 6 часов — оно меняется раз
  // в недели, live-подписка на нём была бы тратой чтений.
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [scheduleFailed, setScheduleFailed] = useState(false);

  // зачем: билеты убраны (решение владельца 2026-07-26) — вход стоит
  // жемчужины, одна валюта вместо двух сущностей. Цену отдаёт сервер;
  // до ответа показываем базовую, чтобы кнопка не прыгала с «—» на число.
  const entryGems = schedule?.entryGems ?? DEFAULT_ENTRY_GEMS;

  const reloadSchedule = useCallback(() => {
    setScheduleFailed(false);
    // зачем: без таймаута зависший запрос оставлял экран на скелетоне
    // навсегда — а скелетон на тёмной теме читается как пустой чёрный экран.
    // Через 8 секунд показываем понятное состояние с кнопкой «Повторить».
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('schedule_timeout')), SCHEDULE_TIMEOUT_MS);
    });
    void Promise.race([loadSchedule(), timeout])
      .then((value) => setSchedule((value as ScheduleConfig | null) ?? { slots: [] }))
      .catch(() => setScheduleFailed(true));
  }, []);

  useEffect(reloadSchedule, [reloadSchedule]);

  /**
   * зачем: если запрос расписания завис (нет сети, спит сокет), экран оставался
   * в загрузке БЕСКОНЕЧНО — на тёмной теме это выглядит как пустой чёрный
   * экран, и человек думает, что приложение сломалось. Через 8 секунд
   * показываем состояние «нет связи» с кнопкой повтора.
   */
  useEffect(() => {
    if (schedule || scheduleFailed) return;
    const timer = setTimeout(() => setScheduleFailed(true), 8000);
    return () => clearTimeout(timer);
  }, [schedule, scheduleFailed]);

  // Тихая ревалидация баланса монет с сервера — тот же паттерн, что в coin_exchange.tsx.
  useEffect(() => {
    void getShardsBalance().then(setCoins).catch(() => {});
    // Банк недели + моя доля за прошлую неделю: кэш 30 минут внутри клиента.
    void loadWeeklyBankInfo().then(async (info) => {
      setBankInfo(info);
      // зачем: недельный банк начисляется кроном ночью — без этой модалки
      // игрок узнал бы о награде только по изменившемуся балансу, то есть
      // почти никак. Показываем один раз: ключ по неделе в локальном хранилище.
      const last = info?.lastWeek;
      if (!last?.paidOut || last.myGems <= 0) return;
      const seenKey = `tournament_weekly_prize_seen:${last.weekId}`;
      const seen = await AsyncStorage.getItem(seenKey);
      if (seen) return;
      await AsyncStorage.setItem(seenKey, '1');
      setWeeklyPrize({ place: last.myPlace, gems: last.myGems });
    }).catch(() => {});
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
  // Не хватает на вход — кнопка меняется на подсказку, а не на тупик.
  const notEnoughGems = coins < entryGems;

  const openConfirm = useCallback(() => { setJoinError(''); setConfirmVisible(true); }, []);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);

  /**
   * Вход: билет списывает СЕРВЕР, клиент только просит. Пока запрос летит,
   * кнопка заблокирована — иначе двойной тап спишет два билета.
   */
  /**
   * Вход: жемчужины списывает СЕРВЕР, клиент только просит.
   *
   * зачем Optimistic UI: баланс уменьшается СРАЗУ, чтобы шапка не показывала
   * старое число, пока летит запрос. При ошибке — откат к прежнему значению и
   * понятное сообщение вместо молчания (раньше отказ выглядел как «ничего не
   * произошло»). Двойной тап отсекается флагом joining: иначе спишется дважды.
   */
  const enterLobby = useCallback(async () => {
    if (!roomId || joining) return;
    setJoining(true);
    const balanceBefore = coins;
    setCoins((current) => Math.max(0, current - entryGems));
    try {
      const result = await joinTournament(roomId) as { gemsLeft?: number } | undefined;
      // Сервер вернул точный баланс — согласуем, чтобы не было расхождения.
      if (typeof result?.gemsLeft === 'number') setCoins(Math.max(0, result.gemsLeft));
      setConfirmVisible(false);
      setJoinError('');
      router.push({ pathname: '/tournament_lobby', params: { roomId } });
    } catch (error) {
      setCoins(balanceBefore);
      const code = String((error as { message?: string })?.message ?? '');
      setJoinError(code.includes('not_enough_gems')
        ? 'Не хватает жемчужин'
        : 'Не удалось войти. Попробуйте ещё раз');
    } finally {
      setJoining(false);
    }
  }, [roomId, joining, router, coins, entryGems]);

  /**
   * зачем: дев-кнопка владельца — «нажал и сразу играю с ботами», не дожидаясь
   * слота расписания. Сервер (admin-only) мгновенно создаёт комнату в лобби со
   * стартом через 3 минуты и снятым минимумом «8 живых»; дальше штатный вход.
   */
  const [devStarting, setDevStarting] = useState(false);
  const startDevTournament = useCallback(async () => {
    if (devStarting || joining) return;
    setDevStarting(true);
    try {
      const created = await devStartTournament();
      if (!created?.roomId) throw new Error('no_room');
      await joinTournament(created.roomId);
      router.push({ pathname: '/tournament_lobby', params: { roomId: created.roomId } });
    } catch (error) {
      const code = String((error as { message?: string })?.message ?? '');
      setJoinError(code.includes('no_published_ai_tasks')
        ? 'Пул пуст: опубликуй ИИ-вопросы в админке'
        : code.includes('not_enough_gems')
          ? 'Не хватает жемчужин'
          : `Дев-турнир не создался: ${code || 'ошибка'}`);
      setConfirmVisible(true);
    } finally {
      setDevStarting(false);
    }
  }, [devStarting, joining, router]);

  const contentPadding = useMemo(
    () => ({ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }),
    [insets.top, insets.bottom],
  );

  // зачем: экран турниров ВСЕГДА рабочий (требование владельца 2026-07-26).
  // Раньше он подменялся заглушками: «Нет соединения» при любом отказе (даже
  // когда интернет есть, а просто нет расписания), скелетон на время загрузки,
  // «Скоро первый турнир» при выключенных слотах. Человек упирался в тупик
  // вместо экрана. Теперь заглушек нет — контент рисуется всегда, а состояние
  // показывается ВНУТРИ hero-карточки, не перекрывая остальное.

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
            <Ionicons name="chevron-back" size={24} color={P.text} />
          </TapScale>
          <Text style={styles.title}>Турниры</Text>
          <View style={styles.headerRight}>
            {/* зачем: был запрещённый эмодзи-«гем» — теперь настоящая монета,
                как на Главной/в Магазине (coinIconForBalance + число рядом). */}
            <Pill>
              <Image
                source={coinIconForBalance(coins, themeMode)}
                style={styles.coinIcon}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              {' '}{coins}
            </Pill>
          </View>
        </View>

        {/* HERO: отсчёт, слоты дня, вход */}
        <Animated.View entering={FadeIn.duration(220)}>
          <Card tone="elev" pad={24}>
            <View style={styles.heroTop}>
              <Text style={[styles.heroKicker, { color: live ? P.danger : P.accent }]}>
                {live ? 'Турнир идёт' : 'Турнир фраз'}
              </Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>🎁 первый вход — бесплатно</Text>
              </View>
            </View>

            <View style={styles.heroCenter}>
              {/* зачем: без расписания отсчёт показывал бы 00:00 — вместо нулей
                  честный текст, но экран остаётся живым и рабочим. */}
              {live ? (
                <Text style={styles.liveText} allowFontScaling={false}>LIVE</Text>
              ) : nextSlot ? (
                <TimeLeft seconds={secondsToStart} />
              ) : (
                <Text style={styles.liveText} allowFontScaling={false}>Скоро</Text>
              )}
              <Text style={styles.heroSub}>
                {live
                  ? `${room?.players?.length ?? 0} из 16 мест занято — успей зайти!`
                  : nextSlot
                    ? 'до старта · 16 игроков · 4 раунда'
                    : 'первый турнир готовится · 16 игроков · 4 раунда'}
              </Text>
            </View>

            <View style={styles.slots}>
              {daySlots(schedule?.slots ?? [], nextSlot?.slotId ?? null).map((slot) => (
                <SlotCell key={slot.time} slot={slot} live={live} P={P} styles={styles} />
              ))}
            </View>

            {live ? (
              /* зачем: турнир уже начался — вход закрыт, кнопка «В игру» вела
                 в тупик. Вместо неё зритель смотрит табло: человек остаётся в
                 игре вместо того чтобы уйти, и приходит на следующий слот. */
              <Cta onPress={() => router.push({
                pathname: '/tournament_table',
                params: { roomId: roomId ?? '', spectate: '1' },
              })} disabled={!roomId}>
                Смотреть турнир
              </Cta>
            ) : notEnoughGems ? (
              <>
                <Cta ghost disabled>Не хватает жемчужин</Cta>
                <View style={styles.howTo}>
                  <View style={styles.howToBody}>
                    <Text style={styles.howToTitle}>
                      Нужно ещё {entryGems - coins} — за уроки и задания
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Cta onPress={openConfirm} disabled={!roomId || joining}>
                {nextSlot ? `Начать турнир · ${entryGems}` : 'Скоро откроем'}
              </Cta>
            )}
            {/* Дев-кнопка владельца: мгновенный турнир с ботами. Видна только
                в dev-сборке; сервер дополнительно требует admin-claim. */}
            {__DEV__ ? (
              <Cta ghost onPress={startDevTournament} disabled={devStarting}
                style={styles.devCta}>
                {devStarting ? 'Создаём комнату…' : '🤖 Дев-турнир с ботами'}
              </Cta>
            ) : null}
          </Card>
        </Animated.View>

        {/* Банк недели */}
        <Animated.View entering={FadeIn.duration(220).delay(60)}>
          <Card tone="gold" pad={22}>
            <View style={styles.bankRow}>
              {/* зачем: было эмодзи 💰 (иконка) + 💎 (запрещённая гем-валюта) —
                  одна настоящая иконка жемчужины покрывает обе роли, число — главный
                  индикатор рядом (тот же паттерн, что на Главной/в Магазине). */}
              <Image
                source={coinIconForBalance(bank, themeMode)}
                style={styles.bankHeroIcon}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <View style={styles.bankBody}>
                <Text style={styles.bankKicker}>Банк недели</Text>
                <Text style={styles.bankValue} allowFontScaling={false}>{bank}</Text>
              </View>
              {/* зачем: раньше здесь был VIP-блок с ценой в билетах, которых
                  больше нет. Показываем, когда и кому достанется банк — иначе
                  игрок не понимает, за что борется. */}
              <View style={styles.vipBox}>
                <Text style={styles.vipTitle}>🏆 Топ-3</Text>
                <Text style={styles.vipSub}>вс, ночью</Text>
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

      {/* зачем: недельный банк приходит ночью кроном — без этой шторки игрок
          не узнал бы, что выиграл. Показывается один раз на неделю. */}
      <Sheet visible={!!weeklyPrize} onClose={() => setWeeklyPrize(null)}>
        <Text style={styles.sheetIcon}>🏆</Text>
        <Text style={styles.sheetTitle}>
          {weeklyPrize?.place === 1 ? 'Первое место недели!'
            : weeklyPrize?.place === 2 ? 'Второе место недели!'
              : 'Третье место недели!'}
        </Text>
        <Text style={styles.sheetSub}>
          Ваша доля банка: {weeklyPrize?.gems ?? 0} — уже на счету
        </Text>
        <View style={styles.sheetActions}>
          <Cta onPress={() => setWeeklyPrize(null)}>Отлично</Cta>
        </View>
      </Sheet>

      {/* Подтверждение входа (макет 04) */}
      <Sheet visible={confirmVisible} onClose={closeConfirm}>
        <Text style={styles.sheetIcon}>🏆</Text>
        <Text style={styles.sheetTitle}>Войти в турнир?</Text>
        <Text style={styles.sheetSub}>Списание: {entryGems} · останется {Math.max(0, coins - entryGems)}</Text>
        {/* зачем: отказ сервера раньше выглядел как «ничего не произошло» —
            шторка просто закрывалась. Показываем причину прямо здесь. */}
        {joinError ? <Text style={styles.sheetError}>{joinError}</Text> : null}
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

const SlotCell = memo(function SlotCell({ slot, live, P, styles }: {
  slot: DaySlot; live: boolean; P: TournamentPalette; styles: ReturnType<typeof makeStyles>;
}) {
  const isNow = slot.state === 'now';
  const isDone = slot.state === 'done';

  return (
    <View
      style={[
        styles.slot,
        {
          backgroundColor: isNow ? P.accentSoft : slot.state === 'next' ? P.card : 'transparent',
          opacity: isDone ? 0.55 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.slotTime,
          {
            color: isDone ? P.ghost : isNow ? P.accent : P.muted,
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

// зачем: цвета берутся из АКТИВНОЙ темы приложения (жалоба владельца:
// «турнир не слушает цвета темы»). Стили пересобираются при смене темы.
const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loadingHeader: { paddingHorizontal: 16, marginBottom: 14 },
  loadingHint: { ...type.body, color: P.muted, marginTop: 6 },
  title: { ...type.title, color: P.text },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinIcon: { width: 18, height: 18 },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroKicker: { ...type.label, letterSpacing: 1, textTransform: 'uppercase' },
  freeBadge: {
    marginLeft: 'auto',
    backgroundColor: P.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  freeBadgeText: { ...type.label, color: P.gold },

  heroCenter: { alignItems: 'center', marginTop: 22, marginBottom: 6 },
  liveText: { fontSize: 64, fontWeight: '900', letterSpacing: 2, color: P.danger },
  heroSub: { ...type.body, color: P.muted, marginTop: 8, textAlign: 'center' },

  slots: { flexDirection: 'row', gap: 8, marginTop: 18, marginBottom: 22 },
  slot: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  slotTime: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  slotNow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 2, color: P.accent },

  howTo: {
    marginTop: 14,
    borderRadius: radius.md,
    backgroundColor: P.goldSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  howToIcon: { fontSize: 22 },
  howToBody: { flex: 1 },
  howToTitle: { ...type.body, fontWeight: '800', color: P.gold },
  howToText: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 2 },

  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bankHeroIcon: { width: 44, height: 44 },
  bankBody: { flex: 1 },
  bankKicker: { ...type.label, letterSpacing: 1, textTransform: 'uppercase', color: T.goldText },
  bankValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: P.gold,
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
  },
  vipBox: { alignItems: 'flex-end' },
  vipTitle: { ...type.body, fontWeight: '800', color: P.text },
  vipSub: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 2 },
  vipCost: { ...type.label, color: P.gold, marginTop: 2 },

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
  seasonTitle: { fontSize: 16, fontWeight: '800', color: P.text },
  seasonSub: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: P.ghost },

  sheetIcon: { fontSize: 44, textAlign: 'center' },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: P.text, textAlign: 'center', marginTop: 8 },
  sheetError: {
    fontSize: 15,
    fontWeight: '700',
    color: P.danger,
    textAlign: 'center',
    marginTop: 10,
  },
  sheetSub: {
    fontSize: 16,
    fontWeight: '600',
    color: P.muted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
  },
  sheetActions: { gap: 10 },
  devCta: { marginTop: 10 },
});
