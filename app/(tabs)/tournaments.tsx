// ═══════════════════════════════════════════════════════════════════════════
// tournaments.tsx — хаб режима «Турниры». НАПИСАН С НУЛЯ в языке Learning V2.
//
// зачем: владелец 2026-07-26 — «хаб неудобен, переделать не отталкиваясь от
// текущего, писать с нуля»; дизайн — ТОЧНО как эталон соседней сессии
// docs/v2/mockups/02-phrase-builder.html (утверждённые макеты турниров).
//
// Структура (сверху вниз, по важности решения игрока):
//   1. шапка: звёзды сезона + жемчужины;
//   2. hero: крупный отсчёт градиентом → одна кнопка действия;
//   3. таймлайн слотов дня точками (вместо ряда плиток — читается за взгляд);
//   4. банк недели;
//   5. лидеры сезона полосами-рейтингами (длина = звёзды, оттенок темы).
//
// Performance Bible: первый кадр = финальная геометрия (баланс из кэша,
// hero-карточка одной высоты во всех состояниях), никаких полноэкранных
// заглушек — экран ВСЕГДА рабочий (требование владельца).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image'; // guard-ok: декоративная жемчужина, число рядом — реальный индикатор
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
// зачем: голый router.back() крашит Android/Fabric при teardown — общий контракт.
import { safeRouterBack } from '../navigation_back';
import TapScale from '../../components/TapScale';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { useTheme } from '../../components/ThemeContext';
import AvatarView from '../../components/AvatarView';
import { coinIconForBalance } from '../coin_icons';
import { getShardsBalance, peekLastKnownShardsBalance } from '../shards_system';
import { loadWeeklyBankInfo, type WeeklyBankInfo } from '../tournament_client';
import { Sheet } from '../../components/tournament/tournament_ui';
import { useCountdown } from '../../components/tournament/TournamentCountdown';
import {
  METAL,
  formatTimeLeft,
  radius,
  useTournamentPalette,
  type TournamentV2,
} from '../../components/tournament/tournament_theme';
import { StarGlyph } from '../../components/tournament/TournamentFx';
import {
  V2Card,
  V2Counter,
  V2Cta,
  V2RatingRow,
} from '../../components/tournament/tournament_v2_ui';
import {
  devStartTournament,
  isRoundState,
  isTableState,
  joinTournament,
  loadSchedule,
  tournamentDateKey,
  tournamentRoomId,
  useTournamentRoom,
} from '../tournament_client';

/** Слот расписания — форма совпадает с TournamentSlotConfig на сервере. */
type ScheduleSlot = {
  slotId: string;
  localTime: string;
  timezone?: string;
  entryGems?: number;
  enabled?: boolean;
  startsAtMs?: number;
};
type ScheduleConfig = { slots: ScheduleSlot[]; entryGems?: number };

/** Момент сегодняшнего старта слота. */
function slotStartMs(slot: ScheduleSlot): number {
  const match = /^(\d{2}):(\d{2})$/.exec(slot.localTime ?? '');
  if (!match) return 0;
  const target = new Date();
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return target.getTime();
}

function enabledSlots(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number })[] {
  return slots
    .filter((slot) => slot.enabled === true && /^\d{2}:\d{2}$/.test(slot.localTime ?? ''))
    .map((slot) => ({ ...slot, startsAtMs: slotStartMs(slot) }))
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
}

/**
 * Ближайший слот: ещё не прошедший. Если день отыгран — первый завтрашний,
 * чтобы отсчёт никогда не показывал ноль.
 */
function pickNextSlot(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number }) | null {
  const list = enabledSlots(slots);
  if (list.length === 0) return null;
  const upcoming = list.find((slot) => slot.startsAtMs > Date.now() - 20 * 60 * 1000);
  if (upcoming) return upcoming;
  return { ...list[0], startsAtMs: list[0].startsAtMs + 24 * 60 * 60 * 1000 };
}

const DEFAULT_ENTRY_GEMS = 3;
const SCHEDULE_TIMEOUT_MS = 8000;

/** Демо-лидеры сезона до появления серверной таблицы (аватары — приложения). */
const SEASON_LEADERS = [
  { avatar: '3', name: 'Виктория К.', stars: 432 },
  { avatar: '7', name: 'Артём Р.', stars: 398 },
  { avatar: '5', name: 'Максим', stars: 126, me: true },
];

export default function TournamentsScreen() {
  const { themeMode } = useTheme();
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  // Баланс синхронно из кэша: без «0 → значение» прыжка на первом кадре.
  const [coins, setCoins] = useState<number>(() => peekLastKnownShardsBalance() ?? 0);
  const [bankInfo, setBankInfo] = useState<WeeklyBankInfo | null>(null);
  const bank = bankInfo?.bankGems ?? 0;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [weeklyPrize, setWeeklyPrize] = useState<{ place: number; gems: number } | null>(null);

  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const entryGems = schedule?.entryGems ?? DEFAULT_ENTRY_GEMS;

  useEffect(() => {
    // Расписание меняется раз в недели — снимок, не подписка (экономия чтений).
    // зачем cleanup: без него таймер тикал после ухода с экрана и держал промис
    // (Performance Bible: guarded loops — таймеры не жгут батарею в фоне).
    let alive = true;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => reject(new Error('schedule_timeout')), SCHEDULE_TIMEOUT_MS);
    });
    void Promise.race([loadSchedule(), timeout])
      .then((value) => { if (alive) setSchedule((value as ScheduleConfig | null) ?? { slots: [] }); })
      .catch(() => { if (alive) setSchedule({ slots: [] }); });
    return () => { alive = false; if (timerId) clearTimeout(timerId); };
  }, []);

  useEffect(() => {
    void getShardsBalance().then(setCoins).catch(() => {});
    void loadWeeklyBankInfo().then(async (info) => {
      setBankInfo(info);
      // зачем: банк начисляется кроном ночью — без шторки игрок узнал бы о
      // награде только по изменившемуся балансу. Показ один раз на неделю.
      const last = info?.lastWeek;
      if (!last?.paidOut || last.myGems <= 0) return;
      const seenKey = `tournament_weekly_prize_seen:${last.weekId}`;
      if (await AsyncStorage.getItem(seenKey)) return;
      await AsyncStorage.setItem(seenKey, '1');
      setWeeklyPrize({ place: last.myPlace, gems: last.myGems });
    }).catch(() => {});
  }, []);

  const nextSlot = useMemo(() => pickNextSlot(schedule?.slots ?? []), [schedule]);
  const roomId = useMemo(() => {
    if (!nextSlot) return null;
    const timezone = nextSlot.timezone || 'Europe/Moscow';
    return tournamentRoomId(nextSlot.slotId, timezone, tournamentDateKey(timezone));
  }, [nextSlot]);

  const { room } = useTournamentRoom(roomId);

  const startsAt = room?.startsAt ?? nextSlot?.startsAtMs ?? 0;
  const secondsToStart = useCountdown(
    startsAt ? Math.max(0, Math.round((startsAt - Date.now()) / 1000)) : 0,
    Boolean(startsAt),
  );
  const live = isRoundState(room?.state) || isTableState(room?.state) || room?.state === 'final';
  const notEnoughGems = coins < entryGems;

  const openConfirm = useCallback(() => { setJoinError(''); setConfirmVisible(true); }, []);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);

  /**
   * Вход: жемчужины списывает СЕРВЕР, клиент только просит.
   * Optimistic UI: баланс падает СРАЗУ, при ошибке — откат и причина текстом.
   * Двойной тап отсекается флагом joining, иначе спишется дважды.
   */
  const enterLobby = useCallback(async () => {
    if (!roomId || joining) return;
    setJoining(true);
    const balanceBefore = coins;
    setCoins((current) => Math.max(0, current - entryGems)); // guard-ok: оптимистичное локальное списание, откат ниже; истина — ответ сервера
    try {
      const result = await joinTournament(roomId) as { gemsLeft?: number } | undefined;
      if (typeof result?.gemsLeft === 'number') setCoins(Math.max(0, result.gemsLeft)); // guard-ok: согласование с серверным балансом
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
   * слота. Сервер (admin-only) мгновенно создаёт комнату в лобби со стартом
   * через 3 минуты и снятым минимумом «8 живых»; дальше штатный вход.
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

  const daySlotList = useMemo(() => enabledSlots(schedule?.slots ?? []), [schedule]);
  const myStars = SEASON_LEADERS.find((leader) => leader.me)?.stars ?? 0;
  const topStars = Math.max(1, ...SEASON_LEADERS.map((leader) => leader.stars));

  return (
    <View style={styles.root}>
      {/* Дыхание фона: мягкий свет акцента сверху — глубина без обводок. */}
      <LinearGradient
        colors={[P.sheen, 'transparent']}
        style={styles.sheen}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        scrollEventThrottle={16}
        onScroll={topFadeScroll?.onScroll}
      >
        {/* Шапка: назад · название · звёзды сезона · жемчужины */}
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={P.text} />
          </TapScale>
          <Text style={styles.title} allowFontScaling={false}>Турниры</Text>
          <View style={styles.headerRight}>
            <V2Counter value={myStars} tone="stars" />
            <V2Counter
              value={coins}
              tone="gems"
              icon={(
                <Image
                  source={coinIconForBalance(coins, themeMode)}
                  style={styles.coinIcon}
                  contentFit="contain"
                  accessible={false}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              )}
            />
          </View>
        </View>

        {/* HERO: одно решение на экран — крупный отсчёт и одна кнопка */}
        <Animated.View entering={FadeIn.duration(220)}>
          <V2Card pad={22}>
            <Text style={[styles.kicker, live && { color: P.danger }]} allowFontScaling={false}>
              {live ? 'Сейчас играют' : nextSlot ? `Сегодня · ${nextSlot.localTime}` : 'Турниры'}
            </Text>

            {/* Цифры отсчёта — градиентом по тексту (hero-grad эталона). */}
            <HeroValue
              text={live ? `Раунд ${room?.rounds?.length ?? 1} из 4` : nextSlot ? formatTimeLeft(secondsToStart) : 'Скоро'}
              big={!live && Boolean(nextSlot)}
              P={P}
              styles={styles}
            />
            <Text style={styles.heroSub} allowFontScaling={false}>
              {live
                ? `${room?.players?.length ?? 0} игроков · банк комнаты ${(room?.players?.length ?? 0) * entryGems}`
                : nextSlot
                  ? '16 игроков · 4 раунда · около 7 минут'
                  : 'первый турнир готовится · 16 игроков · 4 раунда'}
            </Text>

            {live ? (
              <V2Cta
                tone="ghost"
                onPress={() => router.push({
                  pathname: '/tournament_table',
                  params: { roomId: roomId ?? '', spectate: '1' },
                })}
                disabled={!roomId}
                left={<Ionicons name="eye-outline" size={18} color={P.accent} />}
              >
                Смотреть турнир
              </V2Cta>
            ) : (
              <V2Cta
                onPress={openConfirm}
                disabled={!roomId || joining || notEnoughGems}
                right={nextSlot && !notEnoughGems ? (
                  <View style={styles.ctaPrice}>
                    <Image
                      source={coinIconForBalance(entryGems, themeMode)}
                      style={styles.ctaCoin}
                      contentFit="contain"
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text style={[styles.ctaPriceText, { color: P.okInk }]} allowFontScaling={false}>
                      {entryGems}
                    </Text>
                  </View>
                ) : undefined}
              >
                {notEnoughGems ? `Нужно ещё ${entryGems - coins}` : nextSlot ? 'Играть' : 'Скоро откроем'}
              </V2Cta>
            )}
            {/* Дев-кнопка владельца: мгновенный турнир с ботами (только dev). */}
            {__DEV__ ? (
              <V2Cta
                tone="ghost"
                onPress={startDevTournament}
                disabled={devStarting}
                style={styles.devCta}
              >
                {devStarting ? 'Создаём комнату…' : 'Дев-турнир с ботами'}
              </V2Cta>
            ) : null}
          </V2Card>
        </Animated.View>

        {/* Таймлайн слотов дня: точки вместо плиток — читается за взгляд */}
        {daySlotList.length > 0 ? (
          <View style={styles.timeline}>
            {daySlotList.map((slot, index) => {
              const isNext = slot.slotId === nextSlot?.slotId;
              const isPast = slot.startsAtMs < Date.now() && !isNext;
              return (
                <React.Fragment key={slot.slotId}>
                  {index > 0 ? (
                    <View style={[styles.tlLink, isPast || isNext ? { backgroundColor: P.accent } : null]} />
                  ) : null}
                  <View style={styles.tlNode}>
                    <View style={[
                      styles.tlDot,
                      isPast ? { backgroundColor: P.accent } : null,
                      isNext ? styles.tlDotNext : null,
                    ]} />
                    <Text
                      style={[
                        styles.tlLabel,
                        isNext ? { color: P.accent } : isPast ? { color: P.muted } : null,
                      ]}
                      allowFontScaling={false}
                    >
                      {slot.localTime}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        ) : null}

        {/* Банк недели */}
        <Animated.View entering={FadeIn.duration(220).delay(60)}>
          <V2Card pad={18}>
            <View style={styles.bankRow}>
              <LinearGradient
                colors={METAL.gold}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.bankMedal}
              >
                <Ionicons name="trophy" size={20} color={METAL.ink} />
              </LinearGradient>
              <View style={styles.bankBody}>
                <Text style={styles.kicker} allowFontScaling={false}>Банк недели</Text>
                <View style={styles.bankValueRow}>
                  <Text style={styles.bankValue} allowFontScaling={false}>{bank}</Text>
                  <Image
                    source={coinIconForBalance(bank, themeMode)}
                    style={styles.bankCoin}
                    contentFit="contain"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </View>
              </View>
              <Text style={styles.bankWhen} allowFontScaling={false}>топ-3{'\n'}в понедельник</Text>
            </View>
          </V2Card>
        </Animated.View>

        {/* Сезон: полосы-рейтинги — длина по звёздам, оттенок активной темы */}
        <Text style={[styles.kicker, styles.sectionKicker]} allowFontScaling={false}>
          Сезон · мои звёзды {myStars}
        </Text>
        <View style={styles.seasonList}>
          {SEASON_LEADERS.map((leader, index) => (
            <V2RatingRow
              key={leader.avatar}
              ratio={leader.stars / topStars}
              mix={0.46 - index * 0.07}
              highlighted={leader.me}
            >
              <Text style={[styles.place, leader.me && { color: P.accent }]} allowFontScaling={false}>
                {index + 1}
              </Text>
              <AvatarView avatar={leader.avatar} size={36} animateAura={false} />
              <Text
                style={[styles.rowName, leader.me && { color: P.accent }]}
                numberOfLines={1}
              >
                {leader.name}
              </Text>
              <View style={styles.rowStars}>
                <StarGlyph size={13} color={P.gold} />
                <Text style={styles.rowStarsText} allowFontScaling={false}>{leader.stars}</Text>
              </View>
            </V2RatingRow>
          ))}
        </View>
        <TapScale onPress={() => router.push('/tournament_season')} style={styles.seasonMore}>
          <Text style={styles.seasonMoreText} allowFontScaling={false}>Таблица сезона</Text>
          <Ionicons name="chevron-forward" size={18} color={P.muted} />
        </TapScale>
      </ScrollView>

      {/* Недельный банк пришёл ночью — показываем один раз на неделю */}
      <Sheet visible={!!weeklyPrize} onClose={() => setWeeklyPrize(null)}>
        <Text style={styles.sheetTitle} allowFontScaling={false}>
          {weeklyPrize?.place === 1 ? 'Первое место недели'
            : weeklyPrize?.place === 2 ? 'Второе место недели'
              : 'Третье место недели'}
        </Text>
        <Text style={styles.sheetSub}>
          Доля банка: {weeklyPrize?.gems ?? 0} — уже на счету
        </Text>
        <View style={styles.sheetActions}>
          <V2Cta tone="gold" onPress={() => setWeeklyPrize(null)}>Отлично</V2Cta>
        </View>
      </Sheet>

      {/* Подтверждение входа */}
      <Sheet visible={confirmVisible} onClose={closeConfirm}>
        <Text style={styles.sheetTitle} allowFontScaling={false}>Вход в турнир</Text>
        <Text style={styles.sheetSub}>
          {nextSlot ? `Сегодня · ${nextSlot.localTime} · 16 игроков` : 'Ближайшая комната'}
        </Text>
        <View style={styles.sheetPrice}>
          <Image
            source={coinIconForBalance(entryGems, themeMode)}
            style={styles.sheetCoin}
            contentFit="contain"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.sheetPriceLabel} allowFontScaling={false}>Участие</Text>
          <Text style={styles.sheetPriceValue} allowFontScaling={false}>{entryGems}</Text>
        </View>
        <View style={styles.sheetBalance}>
          <Text style={styles.sheetBalanceText} allowFontScaling={false}>У тебя {coins}</Text>
          <Text style={styles.sheetBalanceText} allowFontScaling={false}>
            останется {Math.max(0, coins - entryGems)}{/* guard-ok: превью списания, баланс не пишется */}
          </Text>
        </View>
        {joinError ? <Text style={styles.sheetError}>{joinError}</Text> : null}
        <View style={styles.sheetActions}>
          <V2Cta onPress={enterLobby} disabled={joining}>
            {joining ? 'Заходим…' : 'Войти'}
          </V2Cta>
          <V2Cta tone="ghost" onPress={closeConfirm}>Отмена</V2Cta>
        </View>
      </Sheet>
    </View>
  );
}

// ── Hero-значение с градиентом по тексту ────────────────────────────────────

/**
 * Цифры отсчёта залиты градиентом (hero-grad эталона V2). MaskedView вместо
 * плоского цвета: перелив читается «дорого», и это не обводка.
 */
const HeroValue = memo(function HeroValue({
  text, big, P, styles,
}: { text: string; big: boolean; P: TournamentV2; styles: ReturnType<typeof makeStyles> }) {
  const textStyle = big ? styles.heroBig : styles.heroMid;
  return (
    <MaskedView
      style={big ? styles.heroMaskBig : styles.heroMaskMid}
      maskElement={(
        <View style={styles.heroMaskInner}>
          <Text style={textStyle} allowFontScaling={false}>{text}</Text>
        </View>
      )}
    >
      <LinearGradient
        colors={[P.heroGradA, P.heroGradB]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 260 },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3, color: P.text },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinIcon: { width: 15, height: 15 },

  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: P.ghost,
  },
  sectionKicker: { marginTop: 6, marginLeft: 4 },

  heroMaskBig: { height: 70, marginTop: 8 },
  heroMaskMid: { height: 40, marginTop: 8 },
  heroMaskInner: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center' },
  heroBig: {
    fontSize: 62,
    lineHeight: 66,
    fontWeight: '900',
    letterSpacing: -1.6,
    color: '#000',
    fontVariant: ['tabular-nums'],
  },
  heroMid: { fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8, color: '#000' },
  heroSub: { fontSize: 14, fontWeight: '700', color: P.muted, marginTop: 2, marginBottom: 18 },
  ctaPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaCoin: { width: 16, height: 16 },
  ctaPriceText: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  devCta: { marginTop: 12 },

  timeline: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  tlNode: { alignItems: 'center', gap: 7 },
  tlDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: P.elev2 },
  tlDotNext: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: P.accent,
    shadowColor: P.accent,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  tlLink: { flex: 1, height: 3, borderRadius: 2, backgroundColor: P.elev2, marginHorizontal: 6, marginBottom: 22 },
  tlLabel: { fontSize: 12, fontWeight: '800', color: P.ghost, fontVariant: ['tabular-nums'] },

  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bankMedal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bankBody: { flex: 1 },
  bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  bankValue: { fontSize: 24, fontWeight: '900', color: P.text, fontVariant: ['tabular-nums'] },
  bankCoin: { width: 16, height: 16 },
  bankWhen: { fontSize: 12, fontWeight: '700', color: P.ghost, textAlign: 'right' },

  seasonList: { gap: 8 },
  place: { width: 24, textAlign: 'center', fontSize: 14, fontWeight: '900', color: P.ghost, fontVariant: ['tabular-nums'] },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', color: P.text },
  rowStars: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowStarsText: { fontSize: 15, fontWeight: '900', color: P.gold, fontVariant: ['tabular-nums'] },
  seasonMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  seasonMoreText: { fontSize: 15, fontWeight: '800', color: P.muted },

  sheetTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.2, color: P.text },
  sheetSub: { fontSize: 14, fontWeight: '700', color: P.muted, marginTop: 4, marginBottom: 16 },
  sheetPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: P.card,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  sheetCoin: { width: 20, height: 20 },
  sheetPriceLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: P.text },
  sheetPriceValue: { fontSize: 19, fontWeight: '900', color: P.text, fontVariant: ['tabular-nums'] },
  sheetBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 14,
  },
  sheetBalanceText: { fontSize: 12.5, fontWeight: '700', color: P.ghost },
  sheetError: { fontSize: 14, fontWeight: '700', color: P.danger, marginBottom: 12 },
  sheetActions: { gap: 10 },
});
