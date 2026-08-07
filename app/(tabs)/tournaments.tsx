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
import ReportErrorButton from '../../components/ReportErrorButton';
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
import {
  hydrateSeasonPassProgress,
  peekSeasonPassProgress,
  type SeasonPassProgress,
} from '../season_pass_model';
import { resolveTournamentWindowState } from '../tournament_window_state';
import { resolveTournamentHeroCopy } from '../tournament_hero_copy';
import {
  loadPlayedWindowStartMs,
  peekPlayedWindowStartMs,
  rememberPlayedWindow,
} from '../tournament_played_window';
import {
  loadTournamentWelcomeSeen,
  markTournamentWelcomeSeen,
  peekTournamentWelcomeSeen,
} from '../tournament_welcome_seen';
import { Sheet } from '../../components/tournament/tournament_ui';
import { TournamentWelcomeModal } from '../../components/tournament/TournamentWelcomeModal';
import { getTournamentThemeAssets } from '../../components/tournament/tournament_theme_assets';
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
import { useTabNav } from '../TabContext';

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
// зачем 2026-08-04 (владелец: «если в админке включено весь день турниры, то
// должно показывать не "сейчас турниров нет", а "турниры весь день"»): сервер
// уже полностью поддерживает этот режим (tournamentJoin переписывает roomId на
// живую all-day комнату сам, см. functions/src/tournaments.ts) — документ
// tournamentSchedule/config давно содержит allDayEnabled, просто клиентский
// тип его не объявлял, и экран решал, что расписание пустое.
type ScheduleConfig = {
  slots: ScheduleSlot[];
  entryGems?: number;
  testingEnabled?: boolean;
  allDayEnabled?: boolean;
};

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

const DEFAULT_ENTRY_GEMS = 5;
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
  // зачем 2026-08-04 (владелец: «первый раз открыл турниры — красивый
  // анимированный модал, один раз после онбординга и больше никогда, у
  // старых игроков тоже»): ИСХОДНОЕ состояние — всегда false (скрыт). Ставился
  // в true через peek(), который на холодном старте всегда возвращал null →
  // false → «не видел» → модал лез поверх экрана КАЖДЫЙ запуск и глушил тапы/
  // скролл под собой невидимым Modal-оверлеем (аудит, инцидент 2026-08-04).
  // Показывать модал теперь может только подтверждённый ответ из AsyncStorage
  // (эффект ниже), peek используется только чтобы не дёргать эффект впустую,
  // если флаг уже точно true в памяти этой же сессии.
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  // зачем 2026-07-27: карточка банка была мёртвой — игрок видел цифру 338 и не
  // мог узнать, как её делят и где он сам. Тап открывает шторку (владелец
  // выбрал шторку, а не отдельный экран: не уводит с хаба).
  const [bankVisible, setBankVisible] = useState(false);
  const openBank = useCallback(() => setBankVisible(true), []);
  const closeBank = useCallback(() => setBankVisible(false), []);
  // зачем: кнопка «назад» в шапке хаба. Турниры — вкладка, а не пуш-экран: стека
  // может не быть вовсе, поэтому replace на home, а не router.back().
  const goHome = useCallback(() => router.replace('/(tabs)/home' as any), [router]);

  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const entryGems = schedule?.entryGems ?? bankInfo?.entryGems ?? DEFAULT_ENTRY_GEMS;

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
  /**
   * зачем 2026-08-04 (аудит all-day режима): в обычном расписании roomId
   * зрителя честно предсказуем — tournamentRoomId(slotId, tz, dateKey) даёт
   * ТУ ЖЕ комнату, что создаёт сервер по тому же слоту. В all-day режиме
   * сервер комнату НЕ предсказывает — tournamentAllDayRoomId(nowMs, timezone)
   * в functions/src/tournament_all_day.ts перевычисляет её каждые 30 секунд
   * по хэшу от текущего времени, и клиент физически не может воспроизвести
   * этот хэш без node:crypto и без риска разойтись с серверными часами.
   * Раньше здесь тихо подписывались на ЗАВЕДОМО чужую/устаревшую комнату —
   * статус «Вы в турнире» никогда не срабатывал для all-day, и слушатель
   * Firestore висел зря. Честнее не подписываться вовсе: свой текущий матч
   * игрок открывает через параметры навигации при входе (enterLobby), это
   * НЕ зависит от roomId здесь и не ломается.
   */
  const roomId = useMemo(() => {
    if (!watchSlot || schedule?.allDayEnabled === true) return null;
    const timezone = watchSlot.timezone || 'Europe/Moscow';
    return tournamentRoomId(watchSlot.slotId, timezone, tournamentDateKey(timezone, new Date(tournamentNow())));
  }, [watchSlot, schedule?.allDayEnabled]);
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
  // зачем 2026-08-04 (инцидент: модал приветствия вылезал на ГЛАВНОЙ и глушил
  // экран): турниры давно вернули в таббар (TABS в (tabs)/_layout.tsx), а
  // соседние табы ФОНОВО ПРЕМАУНТЯТСЯ через ~160-500мс после открытия главной
  // (ENABLE_BACKGROUND_TAB_PREMOUNT, BACKGROUND_TAB_PREMOUNT_ORDER=[1,2,3]) —
  // ради мгновенного первого открытия таба. useIsFocused() в expo-router
  // считает сфокусированным весь route-стек `(tabs)`, а не конкретный таб
  // внутри свайпера, поэтому screenFocused=true уже во время премаунта, пока
  // пользователь физически смотрит на главную. Комментарий выше про
  // «useIsFocused честный, потому что это push-экран» устарел ещё когда
  // турниры вернули в таббар — сам он неверный, но чинить весь файл вне
  // рамок этой задачи. runtimeOwnerId — то, чем friends.tsx/settings.tsx уже
  // отличают «мой таб реально на экране» от «весь (tabs)-стек в фокусе».
  const { runtimeOwnerId } = useTabNav();
  const tournamentsTabVisible = runtimeOwnerId === 'tournaments';

  // зачем 2026-08-04 (фикс после аудита — было инвертировано, см. комментарий
  // у welcomeVisible выше): модал стартует СКРЫТЫМ и включается только этим
  // эффектом, только когда AsyncStorage подтвердил seen === false. peek()
  // здесь — короткое замыкание: если в ЭТОЙ ЖЕ сессии уже точно знаем true
  // (например, юзер закрыл модал, ушёл со экрана и тут же вернулся), не гоняем
  // повторный async round-trip и не мигаем состоянием.
  // зачем weeklyPrize !== null 2026-08-04 (аудит): шторка недельного приза
  // открывается своим независимым эффектом на монтировании (см. loadWeeklyBankInfo
  // выше) — оба эффекта могут захотеть открыться на одном и том же первом
  // кадре. Модал приветствия ждёт, пока шторка приза закроется (эффект
  // перезапускается по [weeklyPrize]), а не лезет вторым Modal поверх первого —
  // на iOS второй Modal может перехватить жесты у первого (см. safe_modal_navigation.ts).
  useEffect(() => {
    if (!tournamentsTabVisible || weeklyPrize !== null) return;
    if (peekTournamentWelcomeSeen() === true) return;
    let alive = true;
    void loadTournamentWelcomeSeen().then((seen) => {
      if (alive) setWelcomeVisible(!seen);
    });
    return () => { alive = false; };
  }, [tournamentsTabVisible, weeklyPrize]);

  // зачем 2026-08-04 (инцидент: уход с турниров на другой таб намертво вешал
  // приложение — Android): react-freeze (TabPane в (tabs)/_layout.tsx)
  // ЗАМОРАЖИВАЕТ ТОЛЬКО РЕНДЕР React-дерева ушедшего таба, а react-native
  // Modal рисует себя отдельным нативным окном ПОВЕРХ всего приложения —
  // Freeze его не убирает. Если welcomeVisible оставался true в момент ухода
  // с таба (пользователь не успел/не стал жать «Понятно», а просто
  // переключился), невидимый Modal оставался смонтирован и перехватывал
  // ВСЕ жесты во всём приложении, включая другие табы — экран «намертво».
  // Явно гасим модал программно при потере видимости таба, не полагаясь
  // только на явное закрытие пользователем.
  useEffect(() => {
    if (!tournamentsTabVisible) setWelcomeVisible(false);
  }, [tournamentsTabVisible]);

  const closeWelcome = useCallback(() => {
    setWelcomeVisible(false);
    void markTournamentWelcomeSeen();
  }, []);

  // зачем 2026-08-04 (владелец: «в админке включено весь день, а в приложении
  // всё ещё "сейчас турниров нет"»): loadSchedule() кэширует снимок на 6 часов
  // в памяти модуля (SCHEDULE_TTL_MS) — экономия чтений оправдана, расписание
  // почти не меняется, НО именно поэтому владелец не видит свой тумблер сразу.
  // Первый показ экрана уже грузит расписание эффектом выше (с таймаутом и
  // офлайн-заглушкой) — здесь только ВОЗВРАТЫ на экран: пропускаем фокус при
  // маунте (isFirstFocusRef) и на каждый повторный форсируем force=true.
  // 1 лишнее чтение раз в фокус, не за кадр — цена ничтожна рядом с честным
  // статусом турнира.
  const isFirstFocusRef = useRef(true);
  useEffect(() => {
    if (!screenFocused) return;
    if (isFirstFocusRef.current) { isFirstFocusRef.current = false; return; }
    let alive = true;
    void loadSchedule(true)
      .then((value) => { if (alive) setSchedule((value as ScheduleConfig | null) ?? { slots: [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [screenFocused]);

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

  /**
   * Прогресс квартального пропуска для карточки внизу хаба.
   *
   * зачем 2026-08-03: синхронный peek даёт финальную геометрию с первого кадра
   * (Performance Bible — никакого default-then-patch), гидрация с диска догоняет
   * фоном. Событие ловим, потому что игрок возвращается сюда сразу после итогов
   * турнира, где звёзды уже начислены, — карточка обязана показать новое число
   * без перезахода на вкладку.
   */
  const [seasonPass, setSeasonPass] = useState<SeasonPassProgress>(peekSeasonPassProgress);
  useEffect(() => {
    let alive = true;
    void hydrateSeasonPassProgress().then((p) => { if (alive) setSeasonPass(p); }).catch(() => {});
    const sub = onAppEvent('season_pass_stars_changed', () => {
      if (alive) setSeasonPass(peekSeasonPassProgress());
    });
    return () => { alive = false; sub.remove(); };
  }, []);
  const seasonPassPct = seasonPass.levelCostStars > 0
    ? Math.min(100, Math.round((seasonPass.intoLevelStars / seasonPass.levelCostStars) * 100))
    : 100;
  // зачем: держим один статический набор арта активной темы и не пересчитываем
  // require-источники на каждом секундном тике экрана турниров.
  const tournamentThemeAssets = useMemo(() => getTournamentThemeAssets(themeMode), [themeMode]);

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
      allDayEnabled: schedule?.allDayEnabled === true,
    }),
    // tick заставляет пересчитать состояние по ходу времени (см. ниже).
    [windowStartsMs, bankInfo?.entryWindowMs, playedWindowStartMs, tick, schedule?.allDayEnabled],
  );

  const windowAllDay = windowState.phase === 'all_day';
  // Без расписания у all-day нет «своего» старта — nextSlot.startsAtMs здесь
  // фиктивный (полночь + 24ч, запасной вариант pickNextSlot), реальный таймер
  // сбил бы игрока с толку. Держим отсчёт только за пределами этого режима.
  const startsAt = windowAllDay ? 0 : (room?.startsAt ?? nextSlot?.startsAtMs ?? 0);
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
  // зачем 2026-08-04 (владелец: «сделай чтобы пользователи могли заходить
  // сколько угодно турниров на протяжении дня весь день»): в all-day режиме
  // нет ни «окна», ни лимита «один вход на окно» — сервер уже принимает вход
  // в любую секунду суток (см. комментарий у windowAllDay выше и
  // tournamentJoin в functions/src/tournaments.ts). windowPlayed здесь всегда
  // false (resolveTournamentWindowState не помечает 'all_day' как played), но
  // проверка явная — читателю не нужно держать это в голове.
  const joinWindowOpen = Boolean(joinRoomId)
    && (windowAllDay || (!windowPlayed && (windowOpen || (secondsToStart > 0 && joinOpensInSec === 0))));

  // зачем 2026-08-03 (владелец, дословно): «турнир должен выглядеть точно так
  // же как без дев, но в нём должна быть кнопка ДЕВ; по нажатию у меня
  // появляется доступный турнир вне расписания. А если просто "сейчас
  // турниров нет" — кнопка обязана быть недоступной».
  //
  // Поэтому дев-режим НЕ включён по умолчанию даже в дев-сборке: экран
  // открывается ровно в том виде, что увидит игрок (кнопка «Играть» гаснет вне
  // окна). Отдельная кнопка ДЕВ — явный переключатель: пока владелец её не
  // нажал, поведение боевое; нажал — появляется мгновенный турнир вне
  // расписания. Боевой билд не содержит ни кнопки, ни этой ветки (__DEV__).
  const [devUnlocked, setDevUnlocked] = useState(false);
  const testModeReleaseActive = __DEV__ && devUnlocked;
  const instantEntry = testModeReleaseActive;
  // The released test surface is always free; production keeps the configured price.
  const effectiveEntryGems = testModeReleaseActive ? 0 : entryGems;
  const notEnoughGems = coins < effectiveEntryGems;

  // Переключатель дев-турнира: чистое локальное состояние, мгновенный отклик —
  // сети здесь нет вовсе, поэтому кнопка «Играть» оживает в том же кадре.
  const toggleDevUnlocked = useCallback(() => {
    setJoinError('');
    setDevUnlocked((on) => !on);
  }, []);

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
      //
      // зачем 2026-08-04 (владелец: «заходить сколько угодно турниров на
      // протяжении дня весь день»): та же логика для all-day — nextSlot тут
      // фиктивный placeholder (pickNextSlot подставляет полночь + 24ч, раз
      // слот 'all_day' с localTime 00:00 всегда «уже начался»), а не реальный
      // старт окна. Пометить его как playedWindow означало бы закрыть кнопку
      // клиентской логикой сразу после первого же турнира за день.
      const playedWindow = instantEntry || windowAllDay
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
      //
      // зачем 2026-08-04: сервер физически не присылает slot_already_played в
      // all-day режиме (requireAllDay пускает без лимита) — windowAllDay здесь
      // на случай будущих серверных правок, а не наблюдаемый сегодня баг.
      if (code.includes('slot_already_played') && !windowAllDay) {
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
                  // зачем 2026-08-03 (владелец видел «мы уже чиним» на живом
                  // сервере): под not-found раньше сходились ДВЕ разные беды —
                  // «функция не развёрнута» и «комнаты уже нет». Вторая — это
                  // обычная гонка: комнату закрыли, пока игрок читал экран, и
                  // повтор помогает. Общая плашка про поломку врала и мешала
                  // понять, что происходит на самом деле.
                  : code.includes('room_not_found')
                    ? 'Этот турнир уже закрылся. Ждём вас в следующем'
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
  // зачем: в лобби показываем ЧЕСТНЫЙ счёт звёзд (starsTotal), а не очки места
  // (points) — они остаются только для сортировки таблицы/расчёта призов.
  const myStars = me?.starsTotal ?? 0;
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
      {/* зачем 2026-08-04: полоса над «ТУРНИРЫ» — фикс НЕ здесь (см. правку в
          app/(tabs)/_layout.tsx TabScaffold). Этот View стартует уже НИЖЕ
          insets.top (общая таб-оболочка сдвигает контент своим paddingTop),
          поэтому плашка safe-зоны отсюда физически не могла достать до
          настоящей дыры над статус-баром — она красила уже прокрашенную
          область внутри экрана, а не саму дыру. */}
      {/* Дыхание фона: мягкий свет акцента сверху — глубина без обводок.
          Начинается ПОД сейф-зоной, иначе подкрашивал бы статус-бар другим тоном. */}
      <LinearGradient
        colors={[P.sheen, 'transparent']}
        style={[styles.sheen, { top: insets.top }]}
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
        {/* Шапка главного таба: назад · название · звёзды сезона · жемчужины. */}
        <View style={styles.header}>
          {/* зачем: владелец просил выход на главную прямо из хаба — турниры это вкладка,
              поэтому не нативный back (стека может не быть, кинуло бы в случайный экран),
              а replace на home. Вид 1:1 с кнопкой из shards_shop: круг 46, chevron-back. */}
          <TapScale
            testID="tournaments-back"
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="На главную"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={26} color={P.text} />
          </TapScale>
          <FlowText testID="tournaments-title" provenance="authored" style={styles.title}>Турниры</FlowText>
          <View style={styles.headerRight}>
            {/* зачем 2026-08-04 (владелец: Season Pass tournament_ticket —
                «появится ассет в разделе турнир в правом углу»): раньше билет
                выдавался сервером и физически терялся — вход в турнир его
                никогда не читал (см. functions/src/tournaments.ts). Теперь
                вход учитывает билет, а бейдж — единственная видимая игроку
                подсказка «у тебя есть бесплатный вход», без него подарок
                выглядел бы как ничего не изменившее событие. */}
            {bankInfo?.seasonTicketAvailable ? (
              <TapScale
                testID="tournaments-season-ticket-badge"
                onPress={() => router.push('/tournament_tickets' as any)}
                accessibilityRole="button"
                accessibilityLabel="Есть бесплатный билет на турнир"
                style={styles.ticketBadge}
              >
                <Ionicons name="ticket" size={18} color={P.gold} />
              </TapScale>
            ) : null}
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
            {/* зачем 2026-08-03 (владелец убрал подпись под таймером): пустой
                sub не рендерим — иначе под цифрами осталась бы дыра в 18px от
                marginBottom. Отступ до кнопки держит spacer той же высоты,
                поэтому геометрия карточки не прыгает между состояниями. */}
            {hero.sub ? (
              <FlowText testID="tournaments-hero-sub" provenance="authored" style={styles.heroSub}>
                {hero.sub}
              </FlowText>
            ) : (
              <View style={styles.heroSubSpacer} />
            )}

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
            {/* зачем 2026-08-03 (владелец: «немедленно добавь кнопку ДЕВ; по
                нажатию кнопка "играть сейчас" становится доступной, а если
                просто "сейчас турниров нет" — кнопка обязана быть недоступной»).
                Кнопки нет в боевом билде: вся ветка снята на этапе сборки
                (__DEV__), поэтому игрок её не увидит ни при каком флаге. */}
            {__DEV__ ? (
              <TapScale
                onPress={toggleDevUnlocked}
                accessibilityRole="button"
                accessibilityState={{ selected: devUnlocked }}
                accessibilityLabel={devUnlocked
                  ? 'Выключить тестовый турнир вне расписания'
                  : 'Включить тестовый турнир вне расписания'}
                style={[styles.devToggle, devUnlocked && styles.devToggleOn]}
              >
                <Text style={[styles.devToggleText, devUnlocked && { color: P.okInk }]}>
                  {devUnlocked ? 'ДЕВ · турнир доступен' : 'ДЕВ · включить турнир'}
                </Text>
              </TapScale>
            ) : null}
          </V2Card>
        </Animated.View>

        {/* Таймлайн слотов дня: точки вместо плиток — читается за взгляд.
            зачем 2026-08-04 (аудит all-day режима): daySlotList не пуст и в
            all-day (синтетический слот 'all_day' с localTime 00:00) — без
            этой проверки под «ВЕСЬ ДЕНЬ · без ограничений» повисала бы одна
            одинокая точка «00:00», будто расписание всё же существует. */}
        {!windowAllDay && daySlotList.length > 0 ? (
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
              <Image
                source={tournamentThemeAssets.weeklyBank}
                style={styles.tournamentRewardIconArt}
                contentFit="contain"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
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
              {/* зачем 2026-08-03 (владелец): подпись «топ-3 в понедельник»
                  убрана — условия розыгрыша живут в шторке банка, на карточке
                  остаются только сумма и шеврон. */}
              {/* Шеврон — единственный намёк, что карточку можно открыть. */}
              <Ionicons name="chevron-forward" size={18} color={P.ghost} />
            </View>
            </V2Card>
          </TapScale>
        </Animated.View>

        {/* Награды сезона — сразу под банком недели.
            зачем 2026-08-03 (владелец: «плашку награды сезона подними вверх
            рядом с банком недели»): карточка стояла последней, под таблицей
            сезона, и до неё доскроливали единицы — вход в витрину наград
            терялся. Теперь две «призовые» карточки идут парой: банк недели
            (что разыгрывается сейчас) и награды сезона (что копится вдолгую).
            Оболочка та же V2Card с той же медалью 42px, поэтому пара читается
            как один блок, а не как два разных элемента. */}
        <Animated.View entering={FadeIn.duration(220).delay(90)}>
          <TapScale
            testID="tournaments-season-pass-open"
            onPress={() => router.push('/season_pass')}
            accessibilityRole="button"
            accessibilityLabel="Награды сезона"
          >
            <V2Card pad={18}>
              <View style={styles.bankRow}>
                <Image
                  source={tournamentThemeAssets.seasonRewards}
                  style={styles.tournamentRewardIconArt}
                  contentFit="contain"
                  accessible={false}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={styles.bankBody}>
                  {/* зачем 2026-08-03 (владелец: «убери вообще 1/60 цифры и
                      переименуй в награды сезона»): счётчик уровня дублировал
                      полосу под ним и читался как почти пустой прогресс, хотя
                      карточка ведёт к витрине наград. Осталось название и
                      полоса; уровень и пороги живут на самой дорожке. */}
                  <FlowText testID="tournaments-season-pass-title" provenance="authored" style={styles.seasonPassTitle}>
                    Награды сезона
                  </FlowText>
                  <View style={styles.seasonPassTrack}>
                    <View style={[styles.seasonPassFill, { width: `${seasonPassPct}%` }]} />
                  </View>
                </View>
                {/* Шеврон — тот же намёк на переход, что и у карточки банка. */}
                <Ionicons name="chevron-forward" size={18} color={P.ghost} />
              </View>
            </V2Card>
          </TapScale>
        </Animated.View>

        {/* Сезон: полосы-рейтинги — длина по звёздам, оттенок активной темы.
            зачем 2026-08-03 (владелец): заголовок «Сезон · мои звёзды N» убран —
            своя строка рейтинга и так подсвечена, а число дублировало её. */}
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
                    <FlowText testID="tournaments-row-stars" provenance="authored" style={styles.rowStarsText}>{leader.starsTotal}</FlowText>
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
                    {myRowSeparate.starsTotal}
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

        {/* зачем 2026-08-04 (владелец: «в раздел экран турниров в самом низу
            добавить кнопку нашли ошибку»): та же переиспользуемая кнопка,
            что уже стоит на других экранах приложения — общий канал репортов
            (submitClientReport → error_report), не новая механика. */}
        <ReportErrorButton
          testID="tournaments-report-error"
          screen="tournaments"
          dataId="tournaments_hub"
          style={styles.reportError}
        />

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
            турнир начнётся сейчас, а не в 15:20, и подпись бы врала.
            зачем 2026-08-04 (аудит all-day режима): nextSlot в all-day не null
            (pickNextSlot подставляет фиктивный слот-плейсхолдер 00:00) — без
            явной проверки шторка написала бы «Сегодня · 00:00», хотя вход
            происходит прямо сейчас, тем же паттерном, что уже есть для
            instantEntry чуть выше. */}
        <Text style={styles.sheetSub}>
          {testModeReleaseActive
            ? 'Тестовый вход · бесплатно · 16 игроков'
            : instantEntry || windowAllDay
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

      {/* Приветствие раздела — один раз в жизни установки, см. tournament_welcome_seen.ts */}
      <TournamentWelcomeModal visible={welcomeVisible} onClose={closeWelcome} />
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
  // зачем 2026-08-04 (владелец: «фон турниров отличается от друзей/настроек/
  // главной, привести к единому стандарту во всех темах»): экран уже сидит
  // внутри общего ScreenGradient (тот же artBackdrop="home" из _layout.tsx,
  // что и у остальных табов) — там уже нарисован фон+орбы+блум активной темы.
  // Опаковый P.bg здесь полностью перекрывал этот общий слой своим плоским
  // цветом, поэтому турниры визуально не были похожи ни на одну тему. Друзья/
  // настройки/уроки держат корневой View прозрачным (testID="screen-friends"
  // и т.п. без backgroundColor) — делаем так же.
  root: { flex: 1, backgroundColor: 'transparent' },
  // top задаётся инлайном из сейф-зоны — свет не заходит на статус-бар.
  sheen: { position: 'absolute', left: 0, right: 0, height: 260 },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  // зачем: круг 46 — тот же размер, что в shards_shop, но у chevron-back внутри глифа
  // есть пустое поле слева, поэтому −10 по левому краю ставит иконку оптически на ту же
  // вертикаль, что заголовок, а не с провалом. gap шапки съедаем тем же приёмом справа.
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.elev,
    marginLeft: -10,
    marginRight: -4,
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3, color: P.text },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinIcon: { width: 15, height: 15 },
  // зачем 2026-08-04: тот же язык пилюль, что у V2Counter (goldSoft — акцент
  // «звёзд»/премии), круглая форма — отличает бейдж от прямоугольных пилюль
  // счётчиков, читается как отдельный статус, а не как ещё одно число.
  ticketBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.goldSoft,
  },

  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: P.ghost,
  },
  // Строка статуса с точкой «в эфире». gap вместо отступа у точки — она
  // появляется не всегда, и текст не должен «прыгать» при её отсутствии.
  // зачем: владелец попросил центрировать таймер турнира — раньше строка
  // "СЕГОДНЯ · 12:00" и крупные цифры лепились к левому краю карточки.
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },

  heroMaskBig: { height: 70, marginTop: 8 },
  // зачем: «Сейчас турниров нет» не влезает в 32кегль на одну строку и
  // обрезалось справа — маска была под ровно одну строку (height: 40).
  // Даём вторую строку вместо обрезки текста.
  heroMaskMid: { height: 82, marginTop: 8 },
  // зачем: alignItems центрирует маску по ширине текста — безопасно, пока
  // градиент HeroValue строго вертикальный (x: 0.5 → x: 0.5). Если его
  // сделают диагональным/горизонтальным, разная ширина масок у "59:26" и
  // "Сейчас турниров нет" даст им разные цветовые переходы.
  heroMaskInner: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  heroBig: {
    fontSize: 62,
    lineHeight: 66,
    fontWeight: '900',
    letterSpacing: -1.6,
    color: '#000',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  heroMid: { fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8, color: '#000', textAlign: 'center' },
  heroSub: { fontSize: 14, fontWeight: '700', color: P.muted, marginTop: 2, marginBottom: 18, textAlign: 'center' },
  // зачем 2026-08-03: подпись под таймером убрана владельцем, но воздух между
  // цифрами и кнопкой нужен прежний — держим ровно marginBottom от heroSub,
  // высоту самой строки не резервируем (текста там больше нет).
  heroSubSpacer: { height: 18 },
  ctaPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaCoin: { width: 16, height: 16 },
  ctaPriceText: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  devCta: { marginTop: 12 },
  // Дев-переключатель: отделяется ТОНОМ, без обводки (правило владельца).
  // Выключен — тихая подложка, чтобы не спорить с боевой кнопкой входа;
  // включён — акцентная заливка, видно с одного взгляда, что режим активен.
  devToggle: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: P.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  devToggleOn: { backgroundColor: P.accentSoft },
  devToggleText: { fontSize: 14, fontWeight: '800', color: P.muted },

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
  reportError: { alignItems: 'center', alignSelf: 'center', paddingTop: 4, paddingBottom: 8 },

  // Карточка наград сезона живёт в общей оболочке V2Card рядом с банком недели,
  // поэтому своей подложки у неё больше нет — только внутренняя типографика.
  // зачем 18 кегль: у банка под тем же кикером стоит число в 24, здесь название
  // несёт вес само, а 16 рядом с 24 читалось бы как подпись второго сорта.
  seasonPassTitle: { fontSize: 18, fontWeight: '900', color: P.text, flexShrink: 1 },
  // Полоса на месте bankValueRow — тот же отступ 2 от строки выше, чтобы обе
  // карточки имели одинаковую внутреннюю вертикаль.
  seasonPassTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: P.bg, marginTop: 8 },
  seasonPassFill: { height: '100%', borderRadius: 4, backgroundColor: P.gold },
  // Крупный тематический арт без подложки: самостоятельный силуэт остаётся
  // главным визуальным якорем карточки и не теряет детали на небольшом экране.
  tournamentRewardIconArt: { width: 58, height: 58 },
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
