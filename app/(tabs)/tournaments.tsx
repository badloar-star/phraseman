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

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image'; // guard-ok: декоративная жемчужина, число рядом — реальный индикатор
import { StyleSheet, Text, View } from 'react-native';
// зачем: allowFontScaling={false} отключает системный размер шрифта — на длинных
// языках и при крупном шрифте текст обрезался. FlowText это делает безопасно
// (переносит вместо обрезки) и учитывается гейтом text-integrity.
import { FlowText } from '../../components/text-integrity';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import TapScale from '../../components/TapScale';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import BouncyScrollView from '../../components/BouncyScrollView';
import { useTheme } from '../../components/ThemeContext';
import AvatarView from '../../components/AvatarView';
import { coinIconForBalance } from '../coin_icons';
import {
  getShardsBalance,
  peekLastKnownShardsBalance,
  refreshShardsBalanceFromCloudAuthoritative,
} from '../shards_system';
import {
  loadSeasonStandings,
  loadWeeklyBankInfo,
  peekSeasonStandings,
  weeklyBankPayoutAtMs,
  type SeasonEntry,
  type SeasonStandings,
  type WeeklyBankInfo,
} from '../tournament_client';
import { resolveTournamentWindowState } from '../tournament_window_state';
import { resolveTournamentHeroCopy } from '../tournament_hero_copy';
import {
  loadPlayedWindowStartMs,
  peekPlayedWindowStartMs,
  rememberPlayedWindow,
} from '../tournament_played_window';
import { Sheet } from '../../components/tournament/tournament_ui';
import { useCountdown } from '../../components/tournament/TournamentCountdown';
import {
  METAL,
  formatTimeLeft,
  placeColor,
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
  isRoundState,
  isTableState,
  joinTournament,
  leaveTournament,
  loadSchedule,
  resolveTournamentExitStatus,
  runTournamentMutationWithRetry,
  startTournamentNow,
  tournamentDateKey,
  tournamentNow,
  tournamentRoomId,
  useTournamentRoom,
} from '../tournament_client';
import {
  beginTournamentEntryTransition,
  settleTournamentEntryTransition,
} from '../tournament_entry_transition';
import { closeTournamentFlow } from '../tournament_navigation';
import { actionToastTri, emitAppEvent, onAppEvent } from '../events';
import { getStableId } from '../stable_id';

// зачем 2026-07-27: хаб турниров стал push-экраном (релиз без турниров), и
// гвардом видимости работает честный фокус экрана — контекст табов ему больше
// не нужен. useIsScreenFocused безопасен вне навигации (в тестах не бросает).
import { useIsScreenFocused as useIsFocused } from '../../hooks/use_is_screen_focused';

import { noAndroidOutline } from '../../constants/androidGlow';
/** Слот расписания — форма совпадает с TournamentSlotConfig на сервере. */
type ScheduleSlot = {
  slotId: string;
  localTime: string;
  timezone?: string;
  entryGems?: number;
  enabled?: boolean;
  startsAtMs?: number;
};
type ScheduleConfig = { slots: ScheduleSlot[]; entryGems?: number; testingEnabled?: boolean };

/**
 * Момент сегодняшнего старта слота — В ТАЙМЗОНЕ СЛОТА, а не устройства.
 *
 * зачем 2026-07-27: было `target.setHours(15, 20)` — «15:20» трактовалось как
 * МЕСТНОЕ время игрока. Для расписания в Europe/Moscow это значит, что игрок в
 * Киеве видел отсчёт на час мимо, а в Алматы — на три: таймер врал, «Играть»
 * открывалась не тогда, и roomId (он собирается по дате в таймзоне слота) мог
 * указывать на чужой день. Считаем смещение таймзоны слота честно.
 */
function slotStartMs(slot: ScheduleSlot): number {
  const match = /^(\d{2}):(\d{2})$/.exec(slot.localTime ?? '');
  if (!match) return 0;
  const timezone = slot.timezone || 'Europe/Moscow';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  try {
    // Сегодняшняя дата ГЛАЗАМИ таймзоны слота (там уже может быть другой день).
    const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    const [year, month, day] = dateKey.split('-').map(Number);
    // Пробное UTC-время → смотрим, сколько показывают часы в таймзоне слота,
    // и сдвигаем на разницу. Так учитывается и переход на летнее время.
    const probe = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
    const shown = new Date(probe).toLocaleString('en-US', { timeZone: timezone, hour12: false });
    const shownMs = new Date(shown.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2')).getTime();
    const localMs = new Date(`${dateKey}T${match[1]}:${match[2]}:00`).getTime();
    if (!Number.isFinite(shownMs) || !Number.isFinite(localMs)) throw new Error('tz_parse');
    return probe + (localMs - shownMs);
  } catch {
    // Экзотическая таймзона или сломанный Intl — экран обязан остаться рабочим.
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    return target.getTime();
  }
}

/**
 * Время старта на ЧАСАХ ИГРОКА.
 *
 * зачем 2026-07-27 (владелец): расписание задано в таймзоне слота (Москва), но
 * игрок должен видеть время своего города — иначе он считает разницу в уме и
 * опаздывает. «15:20 МСК» для Алматы показывается как «17:20».
 */
function slotDisplayTime(startsAtMs: number, fallback: string): string {
  if (!startsAtMs) return fallback;
  try {
    return new Date(startsAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return fallback;
  }
}

function enabledSlots(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number; displayTime: string })[] {
  return slots
    .filter((slot) => slot.enabled === true && /^\d{2}:\d{2}$/.test(slot.localTime ?? ''))
    .map((slot) => {
      const startsAtMs = slotStartMs(slot);
      return { ...slot, startsAtMs, displayTime: slotDisplayTime(startsAtMs, slot.localTime) };
    })
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
}

/**
 * Ближайший слот: ещё не прошедший. Если день отыгран — первый завтрашний,
 * чтобы отсчёт никогда не показывал ноль.
 */
function pickNextSlot(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number; displayTime: string }) | null {
  const list = enabledSlots(slots);
  if (list.length === 0) return null;
  // зачем 2026-07-27: было `startsAtMs > Date.now() - 20 мин` — экран считал
  // ближайшим слот, который УЖЕ начался до 20 минут назад. Войти в него нельзя
  // (сервер закрывает вход ровно в startsAt), поэтому кнопка «Играть» вела в
  // отменённый/идущий турнир и всегда падала с «Не удалось войти». Ближайший —
  // только тот, в который реально можно войти: старт ещё впереди.
  // tournamentNow(): часы сервера. При сбитых часах устройства обычный
  // Date.now() выбрал бы не тот слот и открыл вход не в то время.
  const upcoming = list.find((slot) => slot.startsAtMs > tournamentNow());
  if (upcoming) return upcoming;
  return { ...list[0], startsAtMs: list[0].startsAtMs + 24 * 60 * 60 * 1000 };
}

/**
 * Слот, который идёт прямо сейчас — для режима зрителя.
 *
 * зачем: турнир длится ~7 минут (4 раунда + таблицы + награды). Берём слот,
 * стартовавший не более 20 минут назад: раньше это же окно ошибочно
 * использовалось для ВХОДА, из-за чего кнопка «Играть» вела в турнир с уже
 * закрытым входом. Для просмотра окно корректно, для входа — нет.
 */
const LIVE_SLOT_WINDOW_MS = 20 * 60 * 1000;

function pickLiveSlot(slots: ScheduleSlot[]): (ScheduleSlot & { startsAtMs: number; displayTime: string }) | null {
  const now = tournamentNow();
  return enabledSlots(slots)
    .filter((slot) => slot.startsAtMs <= now && now - slot.startsAtMs < LIVE_SLOT_WINDOW_MS)
    .pop() ?? null;
}

const DEFAULT_ENTRY_GEMS = 3;
/**
 * Запасные значения на случай, если банк ещё не загрузился. Как только приходит
 * ответ tournamentWeeklyBankInfo, используются СЕРВЕРНЫЕ числа — на клиенте
 * копий экономики не держим (иначе правка в админке разойдётся с экраном).
 */
const FALLBACK_LOBBY_OPEN_SEC = 5 * 60;
const FALLBACK_SHARES = [0.6, 0.25, 0.15] as const;
const SCHEDULE_TIMEOUT_MS = 8000;

/**
 * зачем 2026-07-27: блок «Сезон» показывал ТРИ ВЫДУМАННЫХ строки (Виктория К.,
 * Артём Р., Максим) и фальшивое «мои звёзды 126», хотя банк недели сервер
 * раздаёт по реальным очкам. Владелец выбрал: топ-3 лидеров + отдельно моя
 * строка. Данные берём из общего кэша рейтинга — тот же снимок кормит и
 * «Таблицу сезона», поэтому второго чтения Firestore не возникает.
 */
const SEASON_HUB_TOP = 3;

/** Аватар из профиля; сервер пишет только имя — иначе стабильная подстановка. */
function hubAvatar(entry: SeasonEntry): string {
  if (entry.avatar) return entry.avatar;
  let hash = 0;
  for (let i = 0; i < entry.uid.length; i += 1) hash = (hash * 31 + entry.uid.charCodeAt(i)) >>> 0;
  return String((hash % 8) + 1);
}

export default function TournamentsScreen() {
  const { themeMode } = useTheme();
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  // Баланс синхронно из кэша: без «0 → значение» прыжка на первом кадре.
  const [coins, setCoins] = useState<number>(() => peekLastKnownShardsBalance() ?? 0);
  const [bankInfo, setBankInfo] = useState<WeeklyBankInfo | null>(null);
  const bank = bankInfo?.bankGems ?? 0;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const activeEntryKeyRef = useRef<string | null>(null);
  const entryGenerationRef = useRef(0);
  const deferredBalanceRefreshRef = useRef(false);
  const [joinError, setJoinError] = useState('');
  const [weeklyPrize, setWeeklyPrize] = useState<{ place: number; gems: number } | null>(null);
  // зачем 2026-07-27: карточка банка была мёртвой — игрок видел цифру 338 и не
  // мог узнать, как её делят и где он сам. Тап открывает шторку (владелец
  // выбрал шторку, а не отдельный экран: не уводит с хаба).
  const [bankVisible, setBankVisible] = useState(false);
  const openBank = useCallback(() => setBankVisible(true), []);
  const closeBank = useCallback(() => setBankVisible(false), []);

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
    void getShardsBalance().then((balance) => {
      if (activeEntryKeyRef.current) {
        deferredBalanceRefreshRef.current = true;
        return;
      }
      setCoins(balance);
    }).catch(() => {});
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

  useEffect(() => {
    const subscription = onAppEvent('shards_balance_updated', (payload) => {
      // Не затираем более свежий optimistic debit уже начавшегося входа.
      if (activeEntryKeyRef.current) {
        deferredBalanceRefreshRef.current = true;
        return;
      }
      setCoins(payload.balance);
    });
    return () => subscription.remove();
  }, []);

  const reconcileDeferredBalance = useCallback(() => {
    if (!deferredBalanceRefreshRef.current || activeEntryKeyRef.current) return;
    deferredBalanceRefreshRef.current = false;
    void refreshShardsBalanceFromCloudAuthoritative().then((balance) => {
      if (balance === null) deferredBalanceRefreshRef.current = true;
    });
  }, []);

  const recoverCancelledTournamentEntry = useCallback((
    cancelledRoomId: string,
    cancelledGeneration: number,
  ) => {
    void runTournamentMutationWithRetry(() => leaveTournament(cancelledRoomId))
      .then(() => {
        void refreshShardsBalanceFromCloudAuthoritative();
      })
      .catch(async () => {
        void refreshShardsBalanceFromCloudAuthoritative();
        const stableId = await getStableId().catch(() => null);
        const exitStatus = await resolveTournamentExitStatus(cancelledRoomId, stableId);
        // Потерянный ответ callable не означает, что выход не применился.
        // Сначала проверяем серверную комнату и не возвращаем уже вышедшего
        // игрока в лобби старого входа.
        if (exitStatus === 'left' || exitStatus === 'forfeited') return;
        // Старый завершившийся запрос не имеет права перебить более новый вход.
        if (entryGenerationRef.current !== cancelledGeneration) return;
        // Сервер всё ещё считает участие активным (или статус недоступен):
        // возвращаем комнату, где выход можно повторить.
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Выход не синхронизирован. Турнир снова открыт',
          uk: 'Вихід не синхронізовано. Турнір знову відкрито',
          es: 'La salida no se sincronizó. El torneo se abrió de nuevo',
        }));
        router.push({ pathname: '/tournament_lobby', params: { roomId: cancelledRoomId } });
      });
  }, [router]);

  const nextSlot = useMemo(() => pickNextSlot(schedule?.slots ?? []), [schedule]);
  // зачем 2026-07-27: слот для ВХОДА и комната для ПРОСМОТРА — разные вещи.
  // nextSlot теперь строго будущий (иначе кнопка «Играть» вела в турнир с
  // закрытым входом), но зритель должен видеть идущий прямо сейчас турнир.
  // Поэтому слушаем комнату недавно стартовавшего слота, если он есть, и
  // только иначе — комнату ближайшего будущего.
  const watchSlot = useMemo(() => pickLiveSlot(schedule?.slots ?? []) ?? nextSlot, [schedule, nextSlot]);
  const roomId = useMemo(() => {
    if (!watchSlot) return null;
    const timezone = watchSlot.timezone || 'Europe/Moscow';
    return tournamentRoomId(watchSlot.slotId, timezone, tournamentDateKey(timezone, new Date(tournamentNow())));
  }, [watchSlot]);
  // Комната, в которую реально идёт вход (будущий слот) — она же для лобби.
  const joinRoomId = useMemo(() => {
    if (!nextSlot) return null;
    const timezone = nextSlot.timezone || 'Europe/Moscow';
    return tournamentRoomId(nextSlot.slotId, timezone, tournamentDateKey(timezone, new Date(tournamentNow())));
  }, [nextSlot]);

  /**
   * зачем 2026-07-27 (владелец: «релиз без турниров»): хаб перестал быть табом
   * и стал обычным push-экраном поверх группы `(tabs)` — попасть сюда можно
   * только дев-кнопкой из хедера главной. Поэтому гвардом видимости снова
   * работает useIsFocused(): у push-экрана он честный (внутри `(tabs)` он был
   * истинен для всех табов сразу, из-за чего гвард и держали на runtimeOwnerId).
   *
   * Это гейт для ВСЕЙ живой части хаба: подписки на комнату и секундных
   * таймеров. Функционал сохраняется полностью — при возврате на экран подписка
   * поднимается мгновенно и первым снимком догоняет актуальное состояние.
   */
  const screenFocused = useIsFocused();
  const runtimeActive = useRuntimeActive(screenFocused);

  const { room } = useTournamentRoom(roomId, runtimeActive);

  /**
   * зачем 2026-07-27 (владелец): слот — это ОКНО в полчаса, а не точка старта.
   * Раньше экран знал только «отсчёт» и «сейчас играют», поэтому после старта
   * слота таймер досчитывал до нуля и ЗАСТРЕВАЛ на 00:00 до следующего дня.
   * Теперь состояние окна считает чистая функция (покрыта контрактным тестом):
   * окно идёт → таймера нет, окно кончилось → таймер вернулся, уже отыграл →
   * отсчёт до следующего окна.
   */
  const [playedWindowStartMs, setPlayedWindowStartMs] = useState<number>(() => peekPlayedWindowStartMs());
  useEffect(() => {
    void loadPlayedWindowStartMs().then(setPlayedWindowStartMs).catch(() => {});
  }, []);

  const daySlotList = useMemo(() => enabledSlots(schedule?.slots ?? []), [schedule]);

  /**
   * Секундный тик — только чтобы состояние окна пересчитывалось по ходу
   * времени (окно открылось / окно кончилось). Один interval на экран,
   * чистится при уходе (Performance Bible: guarded loops — фоновый таймер
   * не жжёт батарею).
   */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!runtimeActive) return;
    // зачем 2026-07-27: тик спит на невидимом табе, поэтому при ВОЗВРАТЕ первый
    // кадр иначе показал бы состояние окна, «замороженное» в момент ухода
    // (окно могло за это время открыться или закончиться). Пересчитываем сразу,
    // до первого интервала — Performance Bible: первый кадр = финальные данные.
    setTick((value) => value + 1);
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [runtimeActive]);

  const windowStartsMs = useMemo(
    () => daySlotList.map((slot) => slot.startsAtMs),
    [daySlotList],
  );
  // Пересчёт раз в секунду — тем же тиком, что и отсчёт: отдельного таймера нет.
  const windowState = useMemo(
    () => resolveTournamentWindowState({
      windowStartsMs,
      nowMs: tournamentNow(),
      entryWindowMs: bankInfo?.entryWindowMs,
      playedWindowStartMs,
    }),
    // tick заставляет пересчитать состояние по ходу времени (см. ниже).
    [windowStartsMs, bankInfo?.entryWindowMs, playedWindowStartMs, tick],
  );

  const startsAt = room?.startsAt ?? nextSlot?.startsAtMs ?? 0;
  // Третий секундный таймер хаба — тоже под гвардом видимости. useCountdown
  // считает от целевого момента, а не накопительно, поэтому после паузы
  // отсчёт возвращается сразу с ВЕРНЫМ числом, без отставания.
  const secondsToStart = useCountdown(
    startsAt ? Math.max(0, Math.round((startsAt - tournamentNow()) / 1000)) : 0,
    Boolean(startsAt) && runtimeActive,
  );
  const live = isRoundState(room?.state) || isTableState(room?.state) || room?.state === 'final';
  const windowOpen = windowState.phase === 'open';
  const windowPlayed = windowState.phase === 'played';

  // Тексты hero — чистой функцией (покрыта контрактным тестом), чтобы в JSX
  // не росла лестница тернарников на пять состояний.
  const hero = useMemo(() => resolveTournamentHeroCopy({
    phase: windowState.phase,
    live,
    roundNo: room?.rounds?.length ?? 1,
    playersInRoom: room?.players?.length ?? 0,
    entryGems,
    secondsToShow: windowState.phase === 'countdown' && nextSlot
      // До открытия турнира считаем по комнате: она знает точный старт.
      ? secondsToStart
      : windowState.secondsToShow,
    secondsToWindowEnd: windowState.secondsToWindowEnd,
    nextSlotDisplayTime: nextSlot?.displayTime,
  }), [
    windowState.phase, windowState.secondsToShow, windowState.secondsToWindowEnd,
    live, room?.rounds?.length, room?.players?.length, entryGems, secondsToStart, nextSlot,
  ]);

  /**
   * зачем 2026-07-27: кнопка «Играть» была активна ЗА ЧАС до турнира, хотя
   * сервер открывает вход только за 5 минут до старта (TOURNAMENT_LOBBY_OPEN_MS,
   * состояние комнаты 'lobby'). Тап раньше времени гарантированно возвращал
   * room_not_joinable — игрок жал живую кнопку и получал «Не удалось войти».
   * Теперь окно входа считается на клиенте той же формулой, что на сервере:
   * до открытия кнопка честно говорит, через сколько откроется вход.
   */
  // Окно входа — из ответа сервера; своя константа только пока банк не пришёл.
  const lobbyOpenSec = bankInfo?.lobbyOpenMs
    ? Math.round(bankInfo.lobbyOpenMs / 1000)
    : FALLBACK_LOBBY_OPEN_SEC;
  const joinOpensInSec = Math.max(0, secondsToStart - lobbyOpenSec);
  /**
   * зачем 2026-07-27 (владелец): вход живой ВСЁ ОКНО, до последней секунды.
   * Раньше условие требовало secondsToStart > 0, то есть ровно в момент старта
   * слота кнопка умирала на все оставшиеся полчаса — при том что сервер сажает
   * опоздавшего в следующую свободную комнату того же окна (шардинг).
   * Вошедший в последнюю секунду доигрывает нормально: окно закрывается только
   * для НОВЫХ входов, идущий турнир оно не обрывает.
   * Отыграл в этом окне — кнопка гаснет: сервер всё равно ответит
   * slot_already_played, и живая кнопка была бы обманом.
   */
  const joinWindowOpen = Boolean(joinRoomId)
    && !windowPlayed
    && (windowOpen || (secondsToStart > 0 && joinOpensInSec === 0));

  // зачем 2026-08-03 (владелец, релизное решение, дословно): «турниры ТОЛЬКО
  // по расписанию, которое включается в админке» + «В ДЕВ кнопка дев создаёт
  // мне тестовую комнату вне расписания прямо сейчас». Поэтому два слоя:
  // __DEV__ — кнопка существует только в дев-сборке, боевой билд её не
  // содержит ни при каком флаге; testingEnabled из админки — рубильник,
  // которым владелец включает тестовый вход без пересборки. Прежние
  // мгновенные комнаты вне окна для игроков (решение 2026-07-27) отменены.
  const testModeReleaseActive = __DEV__ && schedule?.testingEnabled === true;
  const instantEntry = testModeReleaseActive;
  // The released test surface is always free; production keeps the configured price.
  const effectiveEntryGems = testModeReleaseActive ? 0 : entryGems;
  const notEnoughGems = coins < effectiveEntryGems;

  const openConfirm = useCallback(() => { setJoinError(''); setConfirmVisible(true); }, []);
  // Магазин жемчужин — тот же экран, куда ведёт баланс на Главной.
  const goToShop = useCallback(() => router.push('/shards_shop' as any), [router]);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);

  /**
   * Вход: жемчужины списывает СЕРВЕР, клиент только просит.
   * Optimistic UI: баланс падает СРАЗУ, при ошибке — откат и причина текстом.
   * Двойной тап отсекается флагом joining, иначе спишется дважды.
   */
  const enterLobby = useCallback(async () => {
    // Комната нужна только для входа по расписанию: мгновенный турнир сервер
    // создаёт сам, поэтому там пустой joinRoomId — нормальное состояние.
    const targetRoomId = instantEntry ? 'instant' : joinRoomId;
    if (!targetRoomId || activeEntryKeyRef.current) return;
    const balanceBefore = coins;
    const entryGeneration = entryGenerationRef.current + 1;
    entryGenerationRef.current = entryGeneration;
    setCoins((current) => Math.max(0, current - effectiveEntryGems)); // guard-ok: optimistic display mirrors the server-owned test/scheduled price
    let entryKey = '';
    entryKey = beginTournamentEntryTransition(() => {
      // Callback старого входа не имеет права откатывать баланс нового.
      if (activeEntryKeyRef.current !== entryKey) return;
      activeEntryKeyRef.current = null;
      setCoins(balanceBefore);
      reconcileDeferredBalance();
    });
    activeEntryKeyRef.current = entryKey;
    setConfirmVisible(false);
    setJoinError('');
    router.push({
      pathname: '/tournament_lobby',
      params: instantEntry
        ? { entryKey }
        : { roomId: joinRoomId as string, entryKey },
    });
    try {
      // Окно закрыто — сервер соберёт обычную комнату прямо сейчас и сразу
      // посадит в неё игрока (вход и списание идут одной транзакцией, иначе
      // комната успевала бы стартовать, пока открыта шторка подтверждения).
      const result = (instantEntry
        ? await startTournamentNow()
        : await joinTournament(joinRoomId as string)) as { gemsLeft?: number; roomId?: string } | undefined;
      const ownsEntry = activeEntryKeyRef.current === entryKey;
      const transitionState = settleTournamentEntryTransition(entryKey);
      if (!ownsEntry || transitionState === 'cancelled' || transitionState === 'missing') {
        if (result?.roomId) recoverCancelledTournamentEntry(result.roomId, entryGeneration);
        return;
      }
      activeEntryKeyRef.current = null;
      if (typeof result?.gemsLeft === 'number') {
        const serverBalance = Math.max(0, result.gemsLeft);
        setCoins(serverBalance); // guard-ok: согласование с серверным балансом
      }
      // Persist only a versioned server snapshot. Stamping callable gemsLeft
      // with a fast device clock could suppress a later valid server refund.
      deferredBalanceRefreshRef.current = true;
      reconcileDeferredBalance();
      // зачем 2026-07-27 (владелец: один турнир на окно): помечаем окно как
      // отыгранное СРАЗУ. Вернувшись с турнира, игрок увидит отсчёт до
      // следующего турнира, а не живую кнопку, которая упадёт slot_already_played.
      //
      // зачем 2026-07-27 (владелец: «убери ограничение на количество игр в
      // слот»): для мгновенного турнира окно НЕ помечается — иначе один прогон
      // закрывал бы кнопку на всё окно, а играть можно сколько угодно раз.
      const playedWindow = instantEntry
        ? 0
        : windowState.activeWindowStartMs || nextSlot?.startsAtMs || 0;
      if (playedWindow) {
        setPlayedWindowStartMs(playedWindow);
        void rememberPlayedWindow(playedWindow);
      }
      // зачем 2026-07-27 (шардинг): комната слота вмещает 16 человек, и сервер
      // при заполнении сажает игрока в СЛЕДУЮЩУЮ комнату того же слота. Идём в
      // ту комнату, которую вернул сервер, иначе игрок открыл бы лобби чужой
      // (полной) комнаты и не увидел бы себя среди участников.
      // Если provisional lobby уже передал игрока в раунд/таблицу этой же
      // комнаты, поздний ответ входа не имеет права вернуть верх стека назад.
      const resolvedRoomId = result?.roomId || joinRoomId;
      if (transitionState !== 'advanced' || resolvedRoomId !== joinRoomId) {
        router.replace({ pathname: '/tournament_lobby', params: { roomId: resolvedRoomId } });
      }
    } catch (error) {
      const ownsEntry = activeEntryKeyRef.current === entryKey;
      const transitionState = settleTournamentEntryTransition(entryKey);
      if (!ownsEntry || transitionState === 'cancelled' || transitionState === 'missing') return;
      activeEntryKeyRef.current = null;
      setCoins(balanceBefore);
      reconcileDeferredBalance();
      const callableError = error as { message?: string; code?: string; details?: unknown };
      if (__DEV__) console.warn('[tournaments] entry callable failed', callableError);
      const code = [callableError.message, callableError.code, callableError.details]
        .map((value) => String(value ?? ''))
        .join(' ');
      // зачем: сервер — истина. Если он говорит «в этом окне уже играл» (а
      // локальная память об этом не знала, например после переустановки),
      // догоняем состояние, чтобы кнопка не звала жать повторно.
      if (code.includes('slot_already_played')) {
        const playedWindow = windowState.activeWindowStartMs || nextSlot?.startsAtMs || 0;
        if (playedWindow) {
          setPlayedWindowStartMs(playedWindow);
          void rememberPlayedWindow(playedWindow);
        }
      }
      setJoinError(code.includes('not_enough_gems')
        ? 'Не хватает жемчужин'
        : code.includes('tournament_testing_disabled')
          ? 'Тестовый режим завершён. Следующий турнир — по расписанию.'
        : code.includes('tournament_config_disabled')
          ? 'Расписание турниров выключено. Включите тестовый режим в админке.'
        : code.includes('slot_already_played')
          ? 'В этом турнире вы уже играли. Ждём вас в следующем'
          : code.includes('join_cutoff_elapsed')
            ? 'Турнир уже начался. Ждём вас в следующем'
            // Пул заданий пуст — турнир собрать не из чего. Общее «попробуйте
            // ещё раз» тут врёт: повтор не поможет, нужны опубликованные вопросы.
            : code.includes('no_published_ai_tasks')
              ? 'Вопросы для турнира ещё не опубликованы'
              // зачем 2026-07-27: те же «повтор не поможет» причины, что и пустой
              // пул — расписание без слотов и нехватка ботов. Раньше обе падали
              // в общее «попробуйте ещё раз», и владелец видел бесконечный
              // повтор вместо настоящей причины (её знала только админка).
              : code.includes('no_slots_configured')
                ? 'Расписание турниров не настроено'
                : code.includes('not_enough_bots')
                  ? 'Соперники для турнира ещё не готовы'
                  // Функция не развёрнута / нет сети — повтор осмыслен.
                  : code.includes('not-found') || code.includes('NOT_FOUND')
                    ? 'Турниры временно недоступны. Мы уже чиним'
                    : 'Не удалось войти. Попробуйте ещё раз');
      setConfirmVisible(true);
      closeTournamentFlow(router);
    } finally {
      if (activeEntryKeyRef.current === entryKey) {
        activeEntryKeyRef.current = null;
        reconcileDeferredBalance();
      }
    }
  }, [
    joinRoomId, router, coins, effectiveEntryGems,
    windowState.activeWindowStartMs, nextSlot, instantEntry,
    reconcileDeferredBalance, recoverCancelledTournamentEntry,
  ]);

  const contentPadding = useMemo(
    () => ({ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }),
    [insets.top, insets.bottom],
  );

  // Рейтинг сезона: первый кадр — из кэша, сеть догоняет фоном (без прыжка нуля).
  const [standings, setStandings] = useState<SeasonStandings | null>(() => peekSeasonStandings());
  useEffect(() => {
    let alive = true;
    void loadSeasonStandings().then((value) => {
      if (alive && value) setStandings(value);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const seasonTop = useMemo(
    () => (standings?.top ?? []).slice(0, SEASON_HUB_TOP),
    [standings],
  );
  const me = standings?.me ?? null;
  const myPlace = standings?.myPlace ?? 0;
  // Своя строка идёт отдельно, если я не в показанной тройке.
  const myRowSeparate = me && myPlace > SEASON_HUB_TOP ? me : myPlace === 0 ? me : null;
  const myStars = me?.points ?? 0;
  const topStars = Math.max(1, seasonTop[0]?.points ?? 1);

  /**
   * Доли банка в ЖЕМЧУЖИНАХ. Проценты 60/25/15 повторяют серверный
   * weeklyShares (functions/src/tournament_economy.ts) — если владелец поменяет
   * их в админке, цифры разойдутся, поэтому это единственное место с копией.
   * Округляем вниз, как сервер (Math.trunc), чтобы не обещать лишнюю жемчужину.
   */
  const bankShares = useMemo(() => {
    const shares = bankInfo?.weeklyShares ?? FALLBACK_SHARES;
    return shares.map((share, index) => ({
      place: index + 1,
      gems: Math.trunc(bank * share),
      // Имя претендента или «место свободно» — пустое место тоже мотивирует.
      name: seasonTop[index] ? (seasonTop[index].uid === me?.uid ? 'Вы' : seasonTop[index].name) : 'место свободно',
    }));
  }, [bank, seasonTop, me]);


  return (
    <View style={styles.root}>
      {/* Дыхание фона: мягкий свет акцента сверху — глубина без обводок. */}
      <LinearGradient
        colors={[P.sheen, 'transparent']}
        style={styles.sheen}
        pointerEvents="none"
      />
      <BouncyScrollView
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        scrollEventThrottle={16}
        // зачем: владелец убрал сворачивание таббара на «Турнирах» — скролл кормит
        // только верхнюю маску (onScrollMaskOnly), таббар остаётся развёрнутым.
        onScroll={topFadeScroll?.onScrollMaskOnly}
      >
        {/* Шапка главного таба: название · звёзды сезона · жемчужины. */}
        <View style={styles.header}>
          <FlowText testID="tournaments-title" provenance="authored" style={styles.title}>Турниры</FlowText>
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
            {/* Пульсирующая точка «в эфире» — статус читается боковым зрением. */}
            <View style={styles.kickerRow}>
              {hero.pulsing ? <LiveDot color={P.accent} /> : null}
              <FlowText
                testID="tournaments-hero-kicker"
                provenance="authored"
                style={[styles.kicker, hero.tone === 'live' && { color: P.accent }]}
              >
                {hero.kicker}
              </FlowText>
            </View>

            {/* Цифры отсчёта — градиентом по тексту (hero-grad эталона). */}
            <HeroValue
              text={hero.value}
              big={hero.big}
              P={P}
              styles={styles}
            />
            <FlowText testID="tournaments-hero-sub" provenance="authored" style={styles.heroSub}>
              {hero.sub}
            </FlowText>

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
                // зачем 2026-07-27: раньше кнопка БЛОКИРОВАЛАСЬ при нехватке
                // жемчужин — игрок упирался в мёртвую кнопку и не понимал, что
                // делать. Теперь она всегда живая: не хватает — ведём в
                // магазин, где проблему можно решить в один тап.
                //
                // зачем 2026-08-03 (владелец, релизное решение): турниры только
                // по расписанию — вне окна кнопка честно гаснет («Сейчас
                // турниров нет»), а не собирает мгновенную комнату. Тест-режим
                // из админки остаётся живым всегда — это дев-кнопка владельца.
                onPress={notEnoughGems ? goToShop : openConfirm}
                disabled={!testModeReleaseActive && !joinWindowOpen && !notEnoughGems}
                right={!notEnoughGems && (testModeReleaseActive || joinWindowOpen) ? (
                  <View style={styles.ctaPrice}>
                    <Image
                      source={coinIconForBalance(effectiveEntryGems, themeMode)}
                      style={styles.ctaCoin}
                      contentFit="contain"
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <FlowText testID="tournaments-cta-price" provenance="authored" style={[styles.ctaPriceText, { color: P.okInk }]}>
                      {effectiveEntryGems}
                    </FlowText>
                  </View>
                ) : undefined}
              >
                {notEnoughGems
                  ? `Пополнить · нужно ещё ${effectiveEntryGems - coins}`
                  : testModeReleaseActive ? 'Играть сейчас · тест'
                    : joinWindowOpen
                      ? 'Играть'
                      : 'Сейчас турниров нет'}
              </V2Cta>
            )}
            {/* зачем 2026-07-27 (владелец: «убирай дев полностью»): дев-кнопка
                «Турнир с ботами» удалена. Она была костылём, пока обычный вход
                работал только по расписанию; теперь вход в турнир доступен в
                любое время, и отдельная дев-ветка только маскировала бы баги
                боевого пути — тестировать надо ровно то, что увидит игрок. */}
          </V2Card>
        </Animated.View>

        {/* Таймлайн слотов дня: точки вместо плиток — читается за взгляд */}
        {daySlotList.length > 0 ? (
          <View style={styles.timeline}>
            {daySlotList.map((slot, index) => {
              const isNext = slot.slotId === nextSlot?.slotId;
              const isPast = slot.startsAtMs < tournamentNow() && !isNext;
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
                    <FlowText
                      testID="tournaments-timeline-label"
                      provenance="authored"
                      style={[
                        styles.tlLabel,
                        isNext ? { color: P.accent } : isPast ? { color: P.muted } : null,
                      ]}
                    >
                      {slot.displayTime}
                    </FlowText>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        ) : null}

        {/* Банк недели — тап открывает шторку с долями и моей позицией */}
        <Animated.View entering={FadeIn.duration(220).delay(60)}>
          <TapScale
            onPress={openBank}
            accessibilityRole="button"
            accessibilityLabel={`Банк недели, ${bank} жемчужин. Подробности`}
          >
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
                <FlowText testID="tournaments-bank-kicker" provenance="authored" style={styles.kicker}>Банк недели</FlowText>
                <View style={styles.bankValueRow}>
                  <FlowText testID="tournaments-bank-value" provenance="authored" style={styles.bankValue}>{bank}</FlowText>
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
              <FlowText testID="tournaments-bank-when" provenance="authored" style={styles.bankWhen}>топ-3{'\n'}в понедельник</FlowText>
              {/* Шеврон — единственный намёк, что карточку можно открыть. */}
              <Ionicons name="chevron-forward" size={18} color={P.ghost} />
            </View>
            </V2Card>
          </TapScale>
        </Animated.View>

        {/* Сезон: полосы-рейтинги — длина по звёздам, оттенок активной темы */}
        <FlowText testID="tournaments-season-kicker" provenance="authored" style={[styles.kicker, styles.sectionKicker]}>
          Сезон · мои звёзды {myStars}
        </FlowText>
        {seasonTop.length > 0 ? (
          <View style={styles.seasonList}>
            {seasonTop.map((leader, index) => {
              const isMe = leader.uid === me?.uid;
              return (
                <V2RatingRow
                  key={leader.uid}
                  ratio={leader.points / topStars}
                  mix={0.46 - index * 0.07}
                  highlighted={isMe}
                >
                  <FlowText testID="tournaments-row-place" provenance="authored" style={[styles.place, isMe && { color: P.accent }]}>
                    {index + 1}
                  </FlowText>
                  <AvatarView avatar={hubAvatar(leader)} size={36} animateAura={false} />
                  {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник в одну строку рейтинга: перенос сломал бы фиксированную высоту ряда */}
                  <Text style={[styles.rowName, isMe && { color: P.accent }]} numberOfLines={1}>
                    {isMe ? 'Вы' : leader.name}
                  </Text>
                  <View style={styles.rowStars}>
                    <StarGlyph size={13} color={P.gold} />
                    <FlowText testID="tournaments-row-stars" provenance="authored" style={styles.rowStarsText}>{leader.points}</FlowText>
                  </View>
                </V2RatingRow>
              );
            })}
            {/* Своя строка ниже тройки — игрок видит себя без перехода в таблицу. */}
            {myRowSeparate ? (
              <V2RatingRow ratio={myRowSeparate.points / topStars} mix={0.2} highlighted>
                <FlowText testID="tournaments-my-place" provenance="authored" style={[styles.place, { color: P.accent }]}>
                  {myPlace > 0 ? myPlace : '—'}
                </FlowText>
                <AvatarView avatar={hubAvatar(myRowSeparate)} size={36} animateAura={false} />
                {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- своя строка рейтинга: та же фиксированная высота ряда */}
                <Text style={[styles.rowName, { color: P.accent }]} numberOfLines={1}>Вы</Text>
                <View style={styles.rowStars}>
                  <StarGlyph size={13} color={P.gold} />
                  <FlowText testID="tournaments-my-stars" provenance="authored" style={styles.rowStarsText}>
                    {myRowSeparate.points}
                  </FlowText>
                </View>
              </V2RatingRow>
            ) : null}
          </View>
        ) : (
          // Начало недели: таблица честно пуста (боты в рейтинг не попадают).
          <Text style={styles.seasonEmpty}>
            Неделя только началась — сыграйте турнир, и вы окажетесь в таблице первым.
          </Text>
        )}
        {/* зачем 2026-07-27 (владелец): без стрелки — просто кнопка «Таблица сезона». */}
        <TapScale onPress={() => router.push('/tournament_season')} style={styles.seasonMore}>
          <FlowText testID="tournaments-season-more" provenance="authored" style={styles.seasonMoreText}>Таблица сезона</FlowText>
        </TapScale>
      </BouncyScrollView>

      {/* Шторка банка недели: доли, претенденты и моя позиция. */}
      <Sheet visible={bankVisible} onClose={closeBank}>
        <View style={styles.bankSheetTop}>
          <LinearGradient
            colors={METAL.gold}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.bankMedal}
          >
            <Ionicons name="trophy" size={20} color={METAL.ink} />
          </LinearGradient>
          <View style={styles.bankBody}>
            <FlowText testID="tournaments-bank-sheet-title" provenance="authored" style={styles.sheetTitle}>Банк недели</FlowText>
            <View style={styles.bankValueRow}>
              <FlowText testID="tournaments-bank-sheet-value" provenance="authored" style={styles.bankSheetValue}>{bank}</FlowText>
              <Image
                source={coinIconForBalance(bank, themeMode)}
                style={styles.bankSheetCoin}
                contentFit="contain"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          </View>
        </View>

        {/* Доли в ЖЕМЧУЖИНАХ, а не в процентах: видно, за что играешь.
            Формула 60/25/15 совпадает с серверной weeklyShares. */}
        <View style={styles.seasonList}>
          {bankShares.map((share) => (
            <View key={share.place} style={styles.bankShareRow}>
              <FlowText
                testID="tournaments-bank-share-place"
                provenance="authored"
                style={[styles.bankSharePlace, { color: placeColor(share.place, P) }]}
              >
                {share.place}
              </FlowText>
              {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник в строке доли банка: перенос сломал бы фиксированную высоту ряда */}
              <Text style={styles.bankShareName} numberOfLines={1}>
                {share.name}
              </Text>
              <FlowText testID="tournaments-bank-share-gems" provenance="authored" style={styles.bankShareGems}>{share.gems}</FlowText>
            </View>
          ))}
        </View>

        <Text style={styles.bankSheetHint}>
          С каждого турнира пятая часть взносов падает сюда и копится всю неделю.
          В ночь на понедельник тройка лучших забирает всё — и банк начинается заново.
        </Text>

        <View style={styles.sheetActions}>
          <V2Cta tone="gold" onPress={closeBank}>Понятно</V2Cta>
        </View>
      </Sheet>

      {/* Недельный банк пришёл ночью — показываем один раз на неделю */}
      <Sheet visible={!!weeklyPrize} onClose={() => setWeeklyPrize(null)}>
        <FlowText testID="tournaments-weekly-prize-title" provenance="authored" style={styles.sheetTitle}>
          {weeklyPrize?.place === 1 ? 'Первое место недели'
            : weeklyPrize?.place === 2 ? 'Второе место недели'
              : 'Третье место недели'}
        </FlowText>
        <Text style={styles.sheetSub}>
          Доля банка: {weeklyPrize?.gems ?? 0} — уже на счету
        </Text>
        <View style={styles.sheetActions}>
          <V2Cta tone="gold" onPress={() => setWeeklyPrize(null)}>Отлично</V2Cta>
        </View>
      </Sheet>

      {/* Подтверждение входа */}
      <Sheet visible={confirmVisible} onClose={closeConfirm}>
        <FlowText testID="tournaments-join-title" provenance="authored" style={styles.sheetTitle}>Вход в турнир</FlowText>
        {/* зачем 2026-07-27: при входе вне окна время слота показывать нельзя —
            турнир начнётся сейчас, а не в 15:20, и подпись бы врала. */}
        <Text style={styles.sheetSub}>
          {testModeReleaseActive
            ? 'Тестовый вход · бесплатно · 16 игроков'
            : instantEntry
              ? 'Начнём сразу · 16 игроков'
              : nextSlot
                ? `Сегодня · ${nextSlot.displayTime} · 16 игроков`
                : 'Ближайшая комната'}
        </Text>
        <View style={styles.sheetPrice}>
          <Image
            source={coinIconForBalance(effectiveEntryGems, themeMode)}
            style={styles.sheetCoin}
            contentFit="contain"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <FlowText testID="tournaments-sheet-price-label" provenance="authored" style={styles.sheetPriceLabel}>Участие</FlowText>
          <FlowText testID="tournaments-sheet-price-value" provenance="authored" style={styles.sheetPriceValue}>{effectiveEntryGems}</FlowText>
        </View>
        <View style={styles.sheetBalance}>
          <FlowText testID="tournaments-sheet-balance-have" provenance="authored" style={styles.sheetBalanceText}>У тебя {coins}</FlowText>
          <FlowText testID="tournaments-sheet-balance-left" provenance="authored" style={styles.sheetBalanceText}>
            останется {Math.max(0, coins - effectiveEntryGems)}{/* guard-ok: preview reflects the server-owned entry price */}
          </FlowText>
        </View>
        {joinError ? <Text style={styles.sheetError}>{joinError}</Text> : null}
        <View style={styles.sheetActions}>
          <V2Cta onPress={enterLobby}>Войти</V2Cta>
          <V2Cta tone="ghost" onPress={closeConfirm}>Отмена</V2Cta>
        </View>
      </Sheet>
    </View>
  );
}

// ── Пульс «в эфире» ─────────────────────────────────────────────────────────

/**
 * Мягко дышащая точка рядом со статусом окна.
 *
 * зачем: пока турнир открыт, таймера нет — статичный текст не отличить от
 * заголовка. Пульс даёт понять «прямо сейчас» боковым зрением, не требуя
 * читать. Анимация живёт в UI-потоке (Reanimated), поэтому не грузит JS и не
 * мешает скроллу.
 *
 * Дыхание, а не мигание: длинный симметричный цикл без резких включений —
 * иначе точка дёргает внимание на весь экран.
 */
const LiveDot = memo(function LiveDot({ color }: { color: string }) {
  const pulse = useSharedValue(0.45);
  const reduceMotion = useReducedMotion();
  // Performance Bible (guarded loops): бесконечная анимация обязана замирать,
  // когда экран не в фокусе или приложение в фоне — иначе она жжёт батарею на
  // невидимом экране. Контракт tests/perf_freeze_contract.test.ts это стережёт.
  //
  // зачем ownerVisible 2026-07-27: хаб больше НЕ таб, а push-экран поверх
  // `(tabs)` (релиз без турниров), поэтому useIsFocused() здесь честный и
  // сам по себе достаточен. Раньше гвард держали на runtimeOwnerId, потому что
  // внутри `(tabs)` фокус был истинен сразу для всех табов и точка «дышала» на
  // невидимом экране; после переезда на push этой слепоты нет.
  const screenFocused = useIsFocused();
  const runtimeActive = useRuntimeActive(screenFocused);

  useEffect(() => {
    // Доступность: с «уменьшить движение» точка просто горит ровным светом.
    if (reduceMotion || !runtimeActive) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion, runtimeActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.86 + pulse.value * 0.14 }],
  }));

  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, animatedStyle]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
});

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
          {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- это не читаемый текст, а маска формы для градиента: масштабирование сдвинуло бы заливку относительно контура */}
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
  // Строка статуса с точкой «в эфире». gap вместо отступа у точки — она
  // появляется не всегда, и текст не должен «прыгать» при её отсутствии.
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
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
    ...noAndroidOutline,
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
    // зачем: шевронку выдавливало на вторую строку под текст — текст занимал
    // всю ширину ряда. nowrap + shrink у подписи держат их в одну строку.
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  seasonMoreText: { fontSize: 15, fontWeight: '800', color: P.muted, flexShrink: 1 },
  // зачем: пустая таблица в начале недели — нормальное состояние (боты в
  // рейтинг не идут), текст объясняет это вместо заглушки с выдуманными людьми.
  seasonEmpty: {
    fontSize: 14,
    fontWeight: '700',
    color: P.muted,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },

  // ── Шторка банка недели ───────────────────────────────────────────────────
  bankSheetTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  bankSheetValue: { fontSize: 30, fontWeight: '900', color: P.text, fontVariant: ['tabular-nums'] },
  bankSheetCoin: { width: 20, height: 20 },
  bankShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: P.card,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  bankSharePlace: { width: 22, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  bankShareName: { flex: 1, fontSize: 15, fontWeight: '700', color: P.text },
  bankShareGems: { fontSize: 17, fontWeight: '900', color: P.gold, fontVariant: ['tabular-nums'] },
  // зачем: подсказка прилипала к кнопке «Понятно» — воздух снизу больше,
  // чем сверху, чтобы текст читался отдельно от управляющего элемента.
  bankSheetHint: {
    fontSize: 14,
    fontWeight: '700',
    color: P.muted,
    lineHeight: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  bankSheetMe: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
    lineHeight: 21,
    marginTop: 14,
  },

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
