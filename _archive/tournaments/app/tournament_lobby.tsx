// ═══════════════════════════════════════════════════════════════════════════
// tournament_lobby.tsx — лобби турнира (макеты 06-08).
//
// зачем: сбор 16 игроков перед стартом. Сетка ФИКСИРОВАННАЯ 4×4 — места
// зарезервированы сразу, игроки появляются pop-in НА СВОЁМ МЕСТЕ. Так первый
// кадр совпадает с финальной геометрией (Performance Bible: layout stability):
// никакого «список растёт и всё прыгает».
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AvatarView from '../components/AvatarView';
import UnifiedPlayerModal, { type PlayerInfo } from '../components/PlayerProfileModal';
import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import { fetchFriendProfilesBatch, type FriendProfileBatchRecord } from './friends_profiles_batch';
import {
  V2Card,
  V2Counter,
  V2Segments,
} from '../components/ui/v2_ui';
import { isTournamentBotPlayer, tournamentAvatarLevel, tournamentAvatarValue } from '../components/tournament/tournament_avatars';
import { T, formatTimeLeft, hexToRgba, radius, type, useTournamentPalette, type TournamentPalette} from '../components/ui/v2_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { TournamentBackdrop } from '../components/ui/V2Backdrop';
import { TournamentFxHost, type TournamentFxApi } from '../components/ui/V2Fx';
import {
  isRoundState, leaveTournament, resolveTournamentLobbyRoute, resolveTournamentRoomIdParam,
  resolveTournamentExitStatus,
  runTournamentMutationWithRetry,
  tournamentNow, TOURNAMENT_REACTIONS_ENABLED, useTournamentReactions, useTournamentRoom,
  type RoomPlayer, type Room } from './tournament_client';
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import { lobbyPotGemsAtTime, orderVisibleLobbyPlayers } from './tournament_lobby_seats';
import { pearlIconForTheme } from './coin_icons';
import { useTheme } from '../components/ThemeContext';
import { Image } from 'expo-image'; // guard-ok: жемчужина декоративная, число рядом — реальный индикатор
import { tournamentPrizeForecast } from './tournament_prize_forecast';
import {
  cancelTournamentEntryTransition,
  markTournamentEntryTransitionAdvanced,
} from './tournament_entry_transition';
import { actionToastTri, emitAppEvent } from './events';
import { closeTournamentFlow } from './tournament_navigation';
import { refreshShardsBalanceFromCloudAuthoritative } from './shards_system';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

const SEATS = 16;
const REACTIONS = ['👍', '🔥', '😎', '⚔️', '🍀'] as const;

type Seat = {
  id: number;
  /** Стабильный id игрока комнаты: p_… у ботов, stable uid у людей. */
  uid: string;
  isBot: boolean;
  name: string;
  /** Значение для AvatarView: индекс или custom:... — НЕ эмодзи. */
  avatar: string;
  aura?: string;
  color: string;
  streak: number;
  isYou?: boolean;
};

/**
 * Игроки комнаты → места сетки.
 *
 * зачем: сервер отдаёт плоский список без «кто я» и без витринных полей.
 * Порядок сохраняем как пришёл — сервер сажает игроков в порядке входа, и
 * пересортировка заставила бы карточки прыгать при каждом обновлении.
 */
/**
 * Кто уже «зашёл» на данный момент.
 *
 * зачем 2026-07-27 (владелец: «не должно быть ощущения фальши, поэтому боты
 * добираются не сразу все»): сервер дописывает ботов в комнату одной
 * транзакцией, но каждому проставляет своё joinAtMs (первая волна сразу,
 * остальные врассыпную по 2–30 секунд). Раньше игрок видел себя одного, а
 * затем мгновенно 16 из 16 — и сразу понимал, что соперники ненастоящие.
 *
 * Игроки без joinAtMs (старые комнаты, созданные до этой правки) считаются
 * присутствующими всегда — иначе лобби таких комнат осталось бы пустым.
 */
function mapPlayersToSeats(players: readonly RoomPlayer[], myId: string | null, lang: Lang): Seat[] {
  const fallbackName = triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador', 'pt-BR': 'Jogador', vi: 'Người chơi', id: 'Pemain', tr: 'Oyuncu', pl: 'Gracz' });
  return players.slice(0, SEATS).map((player, index) => ({
    id: index + 1,
    uid: player.id,
    // зачем (2026-08-04): было Boolean(player.isBot) — сервер вырезает isBot из
    // публичного документа, поэтому здесь у КАЖДОГО бота выходило false. Тап
    // уходил в ветку «живой незнакомец», и карточка бота показывала 0 опыта и
    // Lv.1. Определяем бота по формату id (см. isTournamentBotPlayer).
    isBot: isTournamentBotPlayer(player),
    name: player.name || fallbackName,
    // зачем 2026-07-27: было эмодзи-«лицо» — правило владельца требует
    // НАСТОЯЩИЕ аватары приложения (те же, что в лигах и друзьях).
    avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar }),
    aura: player.aura,
    color: player.color || '#8AB49A',
    streak: Number(player.streak ?? 0),
    isYou: Boolean(myId) && player.id === myId,
  }));
}

const AnimatedBankAmount = memo(function AnimatedBankAmount({
  amount,
  onDisplayAmountChange,
  lang,
}: {
  /**
   * Банк на ТЕКУЩУЮ секунду — уже отфильтрованный по времени прихода
   * (lobbyPotGemsAtTime). Компонент только рисует и пульсирует; решение
   * «чей взнос уже виден» принимается выше, там же, где рассаживаются места.
   */
  amount: number;
  /**
   * зачем 2026-08-03 (владелец: «места пусть сразу показывают точные цифры
   * жемчугов, тоже анимированно»): банк доезжает до новой суммы КАСКАДОМ, по
   * одному прибытию. Если бы места считались от итогового `amount`, они
   * прыгнули бы к финалу мгновенно, пока банк ещё едет, — на экране виднелось
   * бы «банк 40, а первому месту 38» (арифметика не сходится, доверие падает).
   * Отдаём наружу ТЕКУЩУЮ показанную сумму, чтобы места шли с банком в ногу.
   */
  onDisplayAmountChange?: (amount: number) => void;
  lang: Lang;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const { themeMode } = useTheme();
  const pearlIcon = React.useMemo(() => pearlIconForTheme(themeMode), [themeMode]);
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const [displayAmount, setDisplayAmount] = useState(amount);
  // Ref, а не displayAmount в зависимостях: эффект должен реагировать на приход
  // новой суммы, а не перезапускаться от собственного setState.
  const displayAmountRef = useRef(amount);
  const initializedRef = useRef(false);
  // Ref, а не зависимость эффекта: коллбэк из родителя может пересоздаваться
  // на каждом рендере, и каскад перезапускался бы с середины.
  const notifyRef = useRef(onDisplayAmountChange);
  useEffect(() => { notifyRef.current = onDisplayAmountChange; }, [onDisplayAmountChange]);
  useEffect(() => { notifyRef.current?.(displayAmount); }, [displayAmount]);

  /**
   * зачем 2026-08-04: раньше здесь жил КАСКАД — банк приезжал из сервера сразу
   * полным (все 15 взносов ботов), и экран разбирал его на шаги сам, по
   * `lobbyEvents`. С этого дня `amount` уже приходит посекундно (см.
   * lobbyPotGemsAtTime): он растёт ровно на один взнос в момент, когда бот
   * реально садится за стол. Второй каскад поверх первого показывал бы отставшую
   * цифру и рассинхронил бы банк с сеткой мест — тем самым «арифметика не
   * сходится», от которого каскад и защищал.
   *
   * Остаётся ПУЛЬС на рост: он и создаёт ощущение «подошёл соперник → банк
   * потяжелел». На уменьшении (игрок вышел из лобби, сервер вернул взнос) не
   * пульсируем — радостная анимация на потере выглядела бы издевательством.
   */
  useEffect(() => {
    const previous = displayAmountRef.current;
    displayAmountRef.current = amount;
    setDisplayAmount(amount);
    if (!initializedRef.current) {
      // Первый кадр — не анимация, а факт: сумма просто есть (layout stability).
      initializedRef.current = true;
      return;
    }
    if (amount <= previous || reduceMotion) return;
    pulse.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(1, { duration: 180 }));
  }, [amount, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View
      style={[styles.bankAmountWrap, animatedStyle]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={triLang(lang, { ru: `Банк турнира: ${amount} жемчужин`, uk: `Банк турніру: ${amount} перлин`, es: `Bote del torneo: ${amount} perlas`, 'pt-BR': `Prêmio do torneio: ${amount} pérolas`, vi: `Quỹ giải đấu: ${amount} ngọc trai`, id: `Hadiah turnamen: ${amount} mutiara`, tr: `Turnuva ödülü: ${amount} inci`, pl: `Pula turnieju: ${amount} pereł` })}
    >
      <Text style={styles.bankAmountSlot}>{displayAmount}</Text>
      {/* зачем 2026-08-04 (владелец: «ассет жемчужин должен быть там же возле
          цифры»): слово «жемчужин» занимало место валюты. Иконка читается
          мгновенно и на любом языке, а строка перестаёт скакать по ширине при
          переключении локали. Доступность держит accessibilityLabel выше —
          картинка декоративная, озвучивается полная фраза с числом. */}
      <Image
        source={pearlIcon}
        style={styles.bankPearl}
        contentFit="contain"
        accessible={false}
      />
    </Animated.View>
  );
});

function prizePlaceLabels(lang: Lang): readonly string[] {
  return [
    triLang(lang, { ru: '1 место', uk: '1 місце', es: '1er lugar', 'pt-BR': '1º lugar', vi: 'Hạng 1', id: 'Peringkat 1', tr: '1. sıra', pl: '1. miejsce' }),
    triLang(lang, { ru: '2 место', uk: '2 місце', es: '2º lugar', 'pt-BR': '2º lugar', vi: 'Hạng 2', id: 'Peringkat 2', tr: '2. sıra', pl: '2. miejsce' }),
    triLang(lang, { ru: '3 место', uk: '3 місце', es: '3er lugar', 'pt-BR': '3º lugar', vi: 'Hạng 3', id: 'Peringkat 3', tr: '3. sıra', pl: '3. miejsce' }),
  ];
}

/**
 * Награда за место в жемчужинах — вместо процентов.
 *
 * зачем 2026-08-03 (владелец: «места пусть вместо процентов сразу показывают
 * точные цифры жемчугов»): «60%» не отвечает на вопрос «сколько я получу».
 * Игрок не держит банк в голове и не умножает в уме, пока идёт отсчёт лобби.
 *
 * Цифра растёт вместе с банком, поэтому у экрана появляется причинно-
 * следственная связь: подошёл соперник → банк потяжелел → МОЯ награда выросла.
 * Это и есть мотив дождаться полной комнаты.
 */
const AnimatedPrizePlace = memo(function AnimatedPrizePlace({
  label,
  gems,
  lang,
}: {
  label: string;
  gems: number;
  lang: Lang;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const previousGemsRef = useRef(gems);

  useEffect(() => {
    const grew = gems > previousGemsRef.current;
    previousGemsRef.current = gems;
    // Пульсируем ТОЛЬКО на росте: возврат игрока из лобби уменьшает банк, и
    // подсвечивать потерю той же радостной анимацией было бы издевательством.
    if (!grew || reduceMotion) return;
    // Мягче банка (1.04 против 1.06): банк — солист, места ему подпевают.
    // Одинаковая амплитуда превратила бы карточку в дрожащую мозаику.
    pulse.value = withSequence(withTiming(1.04, { duration: 110 }), withTiming(1, { duration: 190 }));
  }, [gems, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[styles.bankShare, animatedStyle]}>
      <Text style={styles.bankShareLabel}>{label}</Text>
      <Text
        style={styles.bankShareGems}
        accessibilityLabel={triLang(lang, { ru: `${label}: ${gems} жемчужин`, uk: `${label}: ${gems} перлин`, es: `${label}: ${gems} perlas`, 'pt-BR': `${label}: ${gems} pérolas`, vi: `${label}: ${gems} ngọc trai`, id: `${label}: ${gems} mutiara`, tr: `${label}: ${gems} inci`, pl: `${label}: ${gems} pereł` })}
      >
        {gems}
      </Text>
    </Animated.View>
  );
});

export default function TournamentLobbyScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{
    roomId?: string | string[];
    entryKey?: string | string[];
  }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const entryKeyParam = Array.isArray(params.entryKey) ? params.entryKey[0] : params.entryKey;
  const entryKey = typeof entryKeyParam === 'string' && entryKeyParam ? entryKeyParam : null;
  const runtimeActive = useRuntimeActive();

  const { room, status, freshSnapshot, secondsLeft, retry } = useTournamentRoom(roomId, runtimeActive);
  // Карточка участника — ШТАТНАЯ PlayerProfileModal (владелец 2026-08-03:
  // «не процент побед, а обычная карточка как у всех юзеров»).
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const leavingRef = useRef(false);
  const [myId, setMyId] = useState<string | null>(null);
  // authUid нужен, чтобы не проигрывать СВОЮ реакцию дважды: один раз
  // оптимистично при тапе и второй — когда она вернётся из подписки.
  const [myAuthUid, setMyAuthUid] = useState<string | null>(null);
  const fxRef = useRef<TournamentFxApi | null>(null);
  const [fxSize, setFxSize] = useState({ width: 0, height: 0 });
  const {
    incoming: incomingReactions,
    send: sendLiveReaction,
    consume: consumeReaction,
  } = useTournamentReactions(roomId, runtimeActive);

  // Свой id нужен, чтобы подсветить своё место в сетке.
  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    void (async () => {
      try {
        const auth = (await import('@react-native-firebase/auth')).default;
        if (!cancelled) setMyAuthUid(auth().currentUser?.uid ?? null);
      } catch { /* без авторизации реакции просто не отправятся */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Переход в раунд по СЕРВЕРНОМУ состоянию, а не по локальному таймеру:
  // иначе игроки с неточными часами уйдут в раунд раньше или позже остальных.
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !room || !roomId || leavingRef.current) return;
    if (isRoundState(room.state)) {
      if (entryKey) markTournamentEntryTransitionAdvanced(entryKey);
      router.replace({ pathname: '/tournament_round', params: { roomId } });
      return;
    }
    const route = resolveTournamentLobbyRoute(room.state);
    if (route === 'table') {
      if (entryKey) markTournamentEntryTransitionAdvanced(entryKey);
      router.replace({ pathname: '/tournament_table', params: { roomId } });
    } else if (route === 'results') {
      if (entryKey) markTournamentEntryTransitionAdvanced(entryKey);
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [entryKey, freshSnapshot, room?.state, roomId, router, room, runtimeActive]);

  /**
   * Секундный тик — по нему в лобби «подсаживаются» игроки, чьё время входа
   * наступило. Один interval на экран, чистится при уходе (Performance Bible:
   * guarded loops). Останавливается, как только комната укомплектована, —
   * дальше тикать незачем.
   */
  const [lobbyTick, setLobbyTick] = useState(0);
  const roomPlayers = room?.players;
  const everyoneArrived = useMemo(
    () => (roomPlayers ?? []).every((player) => !player.joinAtMs || player.joinAtMs <= tournamentNow()),
    [roomPlayers, lobbyTick],
  );
  useEffect(() => {
    // Не тикаем в фоне и когда все уже собрались (Performance Bible).
    if (everyoneArrived || !runtimeActive) return;
    const id = setInterval(() => setLobbyTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [everyoneArrived, runtimeActive]);

  const seats = useMemo(
    // tournamentNow(): часы сервера — иначе при сбитых часах устройства лобби
    // показало бы всех сразу или не показало никого.
    () => mapPlayersToSeats(orderVisibleLobbyPlayers(roomPlayers ?? [], tournamentNow()), myId, lang),
    [roomPlayers, myId, lobbyTick, lang],
  );
  const fallbackPlayerName = triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador', 'pt-BR': 'Jogador', vi: 'Người chơi', id: 'Pemain', tr: 'Oyuncu', pl: 'Gracz' });
  // Имя для реакции: как игрок подписан в этой комнате.
  const myName = useMemo(
    () => seats.find((seat) => seat.isYou)?.name ?? fallbackPlayerName,
    [seats, fallbackPlayerName],
  );

  const fallbackMeName = triLang(lang, { ru: 'Я', uk: 'Я', es: 'Yo', 'pt-BR': 'Eu', vi: 'Tôi', id: 'Saya', tr: 'Ben', pl: 'Ja' });
  /**
   * Свой профиль для карточки — из локального снимка, без сети (паттерн 1:1
   * как в tournament_season.tsx). Нужен модалке для isMe-карточки и сравнения.
   */
  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; totalXP: number;
    streak: number | null; leagueId: number | undefined;
  }>(() => ({ name: fallbackMeName, avatar: '', frame: '', totalXP: 0, streak: null, leagueId: undefined }));
  useEffect(() => {
    let alive = true;
    void AsyncStorage.multiGet(['user_name', 'user_avatar', 'user_frame', 'user_total_xp', 'streak_count', 'league_state_v3'])
      .then((pairs: readonly (readonly [string, string | null])[]) => {
        if (!alive) return;
        const map = new Map(pairs.map(([key, value]) => [key, value ?? '']));
        let leagueId: number | undefined;
        try {
          const rawLeague = map.get('league_state_v3');
          if (rawLeague) leagueId = Number((JSON.parse(rawLeague) as { leagueId?: number }).leagueId);
        } catch { /* лига не критична для карточки */ }
        setMyProfile({
          name: (map.get('user_name') ?? '').trim() || fallbackMeName,
          avatar: (map.get('user_avatar') ?? '').trim(),
          frame: (map.get('user_frame') ?? '').trim(),
          totalXP: Number(map.get('user_total_xp') ?? 0) || 0,
          streak: Number(map.get('streak_count') ?? 0) || 0,
          leagueId: Number.isFinite(leagueId) ? leagueId : undefined,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
    // зачем: fallback-имя «Я» зависит от lang — та же поправка, что уже была
    // сделана в tournament_season.tsx для этого класса бага.
  }, [fallbackMeName]);

  /**
   * Реальные соперники (не боты): их честный профиль (уровень/премиум)
   * подтягиваем ОДНИМ батчем заранее, чтобы карточка по тапу открылась сразу
   * с настоящими цифрами. В обычной комнате людей 0–2, чаще всего вызова нет
   * вовсе; хелпер держит TTL-кэш 5 минут и никогда не бросает.
   */
  const strangerUidsKey = useMemo(
    () => seats.filter((seat) => !seat.isBot && !seat.isYou).map((seat) => seat.uid).sort().join(','),
    [seats],
  );
  const [strangerProfiles, setStrangerProfiles] = useState<Record<string, FriendProfileBatchRecord | null>>({});
  useEffect(() => {
    if (!strangerUidsKey) return;
    let cancelled = false;
    void fetchFriendProfilesBatch(strangerUidsKey.split(',')).then((profiles) => {
      if (!cancelled) setStrangerProfiles((prev) => ({ ...prev, ...profiles }));
    });
    return () => { cancelled = true; };
  }, [strangerUidsKey]);

  /**
   * Тап по месту → штатная карточка. Открытие МГНОВЕННОЕ (Optimistic UI):
   * бот собирается детерминированно без сети; человек — из префетча, а модалка
   * сама доуточнит опыт по uid фоном.
   */
  const openSeat = useCallback((seat: Seat) => {
    if (seat.isBot) {
      setSelectedPlayer(tournamentBotCardInfo(seat));
      return;
    }
    if (seat.isYou) {
      setSelectedPlayer({
        name: seat.name,
        points: myProfile.totalXP,
        totalXp: myProfile.totalXP,
        isMe: true,
        avatar: myProfile.avatar || seat.avatar,
        aura: seat.aura,
        streak: myProfile.streak,
        leagueId: myProfile.leagueId,
      });
      return;
    }
    const known = strangerProfiles[seat.uid];
    // зачем (2026-08-03): раньше здесь стояло `points: known?.totalXp ?? 0` —
    // пока батч профилей не долетел, карточка утверждала «0 опыта, Lv.1» как
    // факт. Теперь при отсутствии профиля поля остаются undefined, и модалка
    // показывает skeleton, а не выдуманный ноль. Цепочку/лигу тоже берём с
    // сервера: жёсткий `streak: null` обнулял огонёк даже у активных игроков.
    setSelectedPlayer({
      name: known?.displayName || seat.name,
      points: known?.totalXp ?? 0,
      totalXp: known?.totalXp,
      isMe: false,
      uid: seat.uid,
      avatar: known?.avatar || seat.avatar,
      aura: known?.aura || seat.aura,
      streak: known?.streak ?? (seat.streak > 0 ? seat.streak : null),
      leagueId: known?.leagueId,
      isPremium: known?.isPremium,
      isVip: known?.isVip,
      isLifetime: known?.isLifetime,
      profileCardLevel: known?.profileCardLevel,
    });
  }, [myProfile, strangerProfiles]);
  const closePlayer = useCallback(() => setSelectedPlayer(null), []);

  const joined = seats.length;
  const full = joined >= SEATS;
  const secondsToStart = secondsLeft;
  /**
   * potGems — БАНК КОМНАТЫ с сервера, а не баланс игрока: экран только рисует
   * пришедшее значение, кошелёк пользователя тут не трогается.
   *
   * зачем 2026-08-04 (владелец: «в лобби ещё ни бота ни юзера, а счётчик сразу
   * набрался 75, а должно появляться вместе с подключением бота и юзера +5»):
   * сервер кладёт в комнату взносы всех 15 ботов сразу при её создании, поэтому
   * `room.potGems` с первой секунды равен финальным 75. Места при этом
   * фильтруются по joinAtMs и подходят по одному — банк обязан идти с ними в
   * ногу. Считаем по тем же часам (tournamentNow), что и сетка мест, и по тем
   * же lobbyTick — иначе цифра замирала бы между обновлениями комнаты.
   */
  const bankGems = useMemo(
    () => lobbyPotGemsAtTime(
      Number(room?.potGems ?? 0),
      room?.lobbyEvents ?? [],
      tournamentNow(),
    ),
    [room?.potGems, room?.lobbyEvents, lobbyTick],
  );
  /**
   * Банк, который СЕЙЧАС виден на экране (каскад ещё может ехать), и награды,
   * посчитанные ровно от него.
   *
   * зачем 2026-08-03: держим единый источник для обеих цифр — иначе банк и
   * места на одном кадре показывали бы разные состояния одной и той же суммы.
   * Стартуем с bankGems, чтобы первый кадр уже был правильным (Performance
   * Bible: никакого «сначала ноль, потом прыжок»).
   */
  const [displayedBankGems, setDisplayedBankGems] = useState(bankGems);
  const prizeForecast = useMemo(
    () => tournamentPrizeForecast(displayedBankGems),
    [displayedBankGems],
  );

  const leaveLobby = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (entryKey) cancelTournamentEntryTransition(entryKey);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeTournamentFlow(router);
    if (!roomId) return;
    void runTournamentMutationWithRetry(() => leaveTournament(roomId))
      .then(() => {
        // Сервер уже вернул взнос: меню обновляет цифру фоном, без спиннера.
        void refreshShardsBalanceFromCloudAuthoritative();
      })
      .catch(async (error) => {
        const exitPlayerId = myId ?? await getStableId().catch(() => null);
        const exitStatus = await resolveTournamentExitStatus(roomId, exitPlayerId);
        if (exitStatus === 'left' || exitStatus === 'forfeited') {
          void refreshShardsBalanceFromCloudAuthoritative();
          return;
        }
        const details = error && typeof error === 'object'
          ? `${String((error as { code?: unknown }).code ?? '')} ${String((error as { message?: unknown }).message ?? '')}`
          : String(error ?? '');
        emitAppEvent('action_toast', actionToastTri('error', details.includes('room_not_leaveable')
          ? {
            ru: 'Турнир уже начался — участие осталось активным',
            uk: 'Турнір уже почався — участь залишилася активною',
            es: 'El torneo ya empezó; la participación sigue activa',
            'pt-BR': 'O torneio já começou — a participação permaneceu ativa',
            vi: 'Giải đấu đã bắt đầu — bạn vẫn đang tham gia',
            id: 'Turnamen sudah dimulai — keikutsertaan tetap aktif',
            tr: 'Turnuva zaten başladı — katılımın aktif kaldı',
            pl: 'Turniej już się rozpoczął — udział pozostał aktywny',
          }
          : {
            ru: 'Не удалось синхронизировать выход. Проверьте интернет',
            uk: 'Не вдалося синхронізувати вихід. Перевірте інтернет',
            es: 'No se pudo sincronizar la salida. Comprueba Internet',
            'pt-BR': 'Não foi possível sincronizar a saída. Verifique a internet',
            vi: 'Không thể đồng bộ việc rời đi. Kiểm tra kết nối mạng',
            id: 'Gagal menyinkronkan keluar. Periksa internet',
            tr: 'Çıkış senkronize edilemedi. İnterneti kontrol edin',
            pl: 'Nie udało się zsynchronizować wyjścia. Sprawdź internet',
          }));
        // Участие осталось серверно-активным: возвращаем маршрут, чтобы игрок
        // мог продолжить или повторить выход, а не оставался в пустом меню.
        if (!entryKey) {
          router.push({ pathname: '/tournament_lobby', params: { roomId } });
        }
      });
  }, [entryKey, myId, roomId, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveLobby();
      return true;
    });
    return () => subscription.remove();
  }, [leaveLobby]);


  /**
   * Отправка реакции.
   *
   * зачем 2026-07-27 (владелец: «анимации эмодзи нет, как было задумано на
   * макетах — чтобы они отправлялись, улетали вверх и все их видели»): раньше
   * реакция была локальным setState на 900 мс, её не видел НИКТО, кроме
   * автора. Теперь тап пишет реакцию в комнату, а полёт рисует общий слой
   * эффектов — и у себя, и у всех остальных.
   *
   * Optimistic UI: свой полёт запускаем СРАЗУ, не дожидаясь записи. Кулдаун
   * внутри хука отбивает двойной тап и лишние записи; при отказе (рано)
   * анимацию не пускаем, иначе экран сыпал бы эмодзи вхолостую.
   */
  const myLaneRef = useRef(0);
  const sendReaction = useCallback((emoji: string) => {
    if (!runtimeActive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendLiveReaction(emoji, myName).then((accepted) => {
      if (!accepted || !runtimeActive) return;
      myLaneRef.current = (myLaneRef.current + 1) % 5;
      fxRef.current?.flyReaction(emoji, myLaneRef.current);
    });
  }, [sendLiveReaction, myName, runtimeActive]);

  /**
   * Чужие реакции — тем же полётом, что и свои.
   * Каждая отыгрывается один раз и вычищается из очереди (consume), иначе
   * список рос бы всё лобби.
   */
  useEffect(() => {
    if (!runtimeActive || incomingReactions.length === 0) return;
    incomingReactions.forEach((item, index) => {
      // Свою реакцию уже показали оптимистично — второй полёт был бы дублем.
      if (item.id === myAuthUid) { consumeReaction(item.id, item.atMs); return; }
      fxRef.current?.flyReaction(item.emoji, index % 5);
      consumeReaction(item.id, item.atMs);
    });
  }, [incomingReactions, consumeReaction, myAuthUid, runtimeActive]);


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
        <TournamentEdgeState kind="cancelled" onRetry={() => closeTournamentFlow(router)} />
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFxSize((prev) => (prev.width === width && prev.height === height
          ? prev : { width, height }));
      }}
    >
      <TournamentBackdrop variant="lobby" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={leaveLobby}
            style={styles.exitButton}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Выйти из лобби', uk: 'Вийти з лобі', es: 'Salir de la sala', 'pt-BR': 'Sair da sala', vi: 'Rời phòng chờ', id: 'Keluar dari lobi', tr: 'Lobiden çık', pl: 'Opuść lobby' })}
            accessibilityHint={triLang(lang, { ru: 'Вы покинете турнир; списанный взнос вернётся автоматически', uk: 'Ви покинете турнір; списаний внесок повернеться автоматично', es: 'Saldrás del torneo; la entrada cobrada se devolverá automáticamente', 'pt-BR': 'Você sairá do torneio; a taxa cobrada será devolvida automaticamente', vi: 'Bạn sẽ rời giải đấu; phí đã trừ sẽ được hoàn tự động', id: 'Anda akan keluar dari turnamen; biaya masuk akan dikembalikan otomatis', tr: 'Turnuvadan çıkacaksın; kesilen giriş ücreti otomatik iade edilir', pl: 'Opuścisz turniej; pobrana opłata wróci automatycznie' })}
          >
            <Text style={styles.exitButtonText}>{triLang(lang, { ru: 'Выйти', uk: 'Вийти', es: 'Salir', 'pt-BR': 'Sair', vi: 'Rời đi', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź' })}</Text>
          </Pressable>
          <Text style={styles.title}>{triLang(lang, { ru: 'Лобби', uk: 'Лобі', es: 'Sala', 'pt-BR': 'Sala', vi: 'Phòng chờ', id: 'Lobi', tr: 'Lobi', pl: 'Lobby' })}</Text>
          <V2Counter value={`${joined}/${SEATS}`} tone={full ? 'gems' : 'plain'} />
        </View>
        <Text style={styles.leaveError} />

        {/* Статус сбора + таймер.
            зачем 2026-08-03 (владелец: «собрались уже все, написано „все на
            месте“, но я висел на этом экране дольше — попал на первое задание,
            осталось 3 секунды»): таймер прятался по `!full` — как только
            занимались все 16 мест (в том числе ботами), надпись менялась на
            «Все на месте» и цифра исчезала ПОЛНОСТЬЮ, хотя переход в раунд
            решает не заполненность мест, а серверный stateDeadlineAtMs (интро/
            отсчёт лобби), который истекает позже. Игрок терял единственный
            ориентир именно в конце ожидания. Секунды из secondsToStart считает
            useTournamentRoom от того же дедлайна всё время — просто рисуем его,
            пока отсчёт идёт, а не пока места свободны. */}
        <V2Card pad={20}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: full ? P.accent : P.text }]}>
              {full
                  ? triLang(lang, { ru: 'Все на месте', uk: 'Всі на місці', es: 'Todos listos', 'pt-BR': 'Todos prontos', vi: 'Tất cả đã sẵn sàng', id: 'Semua sudah siap', tr: 'Herkes hazır', pl: 'Wszyscy na miejscu' })
                  : triLang(lang, { ru: 'Собираем игроков', uk: 'Збираємо гравців', es: 'Reuniendo jugadores', 'pt-BR': 'Reunindo jogadores', vi: 'Đang tập hợp người chơi', id: 'Mengumpulkan pemain', tr: 'Oyuncular toplanıyor', pl: 'Zbieramy graczy' })}
            </Text>
            {secondsToStart > 0 ? (
              /* зачем: text-integrity — масштабирование шрифта не отключаем;
                 таймер в гибком ряду, при крупном шрифте ряд растёт. */
              <FlowText testID="lobby-status-timer" provenance="authored" style={styles.statusTimer}>
                {formatTimeLeft(secondsToStart)}
              </FlowText>
            ) : null}
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>{triLang(lang, { ru: 'Общий банк', uk: 'Загальний банк', es: 'Bote total', 'pt-BR': 'Prêmio total', vi: 'Tổng quỹ', id: 'Total hadiah', tr: 'Toplam ödül', pl: 'Łączna pula' })}</Text>
            <AnimatedBankAmount
              amount={bankGems}
              onDisplayAmountChange={setDisplayedBankGems}
              lang={lang}
            />
          </View>
          {/* зачем 2026-08-03 (владелец): вместо «60% / 25% / 15%» — сколько
              жемчужин реально получит каждый призёр. Проценты требовали от
              игрока считать в уме от банка, который он видит первый раз. */}
          <View style={styles.bankShares}>
            {prizePlaceLabels(lang).map((label, index) => (
              <AnimatedPrizePlace key={label} label={label} gems={prizeForecast[index]} lang={lang} />
            ))}
          </View>
          {/* Сегменты V2 вместо сплошной шкалы: каждый сегмент — четверть
              комнаты, заполняется отдельно, видно динамику сбора. */}
          <V2Segments
            total={4}
            done={Math.floor((joined / SEATS) * 4)}
            style={styles.progressTrack}
          />
        </V2Card>

        {/* Фиксированная сетка 4×4: места зарезервированы с первого кадра */}
        <View style={styles.grid}>
          {Array.from({ length: SEATS }, (_, index) => {
            const seat = seats[index];
            // guard-ok: сетка фиксирована на 16 мест, порядок никогда не
            // меняется — индекс И ЕСТЬ стабильный идентификатор места.
            return (
              <View key={`seat-${index}`} style={styles.seatSlot}>
                {seat ? (
                  <SeatCard seat={seat} onPress={() => openSeat(seat)} lang={lang} />
                ) : (
                  <View style={styles.seatEmpty} />
                )}
              </View>
            );
          })}
        </View>

        {/* Реакции временно скрыты вместе с транспортом: см. TOURNAMENT_REACTIONS_ENABLED. */}
        {TOURNAMENT_REACTIONS_ENABLED ? (
          <View style={styles.reactions}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => sendReaction(emoji)}
                style={styles.reactionButton}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: `Отправить реакцию ${emoji}`, uk: `Надіслати реакцію ${emoji}`, es: `Enviar reacción ${emoji}`, 'pt-BR': `Enviar reação ${emoji}`, vi: `Gửi phản ứng ${emoji}`, id: `Kirim reaksi ${emoji}`, tr: `${emoji} tepkisini gönder`, pl: `Wyślij reakcję ${emoji}` })}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

      </ScrollView>

      {/* Летящие реакции — общий слой: свои и чужие рисуются одинаково.
          зачем 2026-07-27: раньше здесь висел ОДИН эмодзи автора на 900 мс,
          остальные его не видели. Теперь полёт идёт через слой эффектов, и
          реакции всех 16 участников поднимаются по своим дорожкам. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />

      {/* Карточка участника — ШТАТНАЯ, как в друзьях/лигах/сезоне (владелец
          2026-08-03: «не процент побед, а обычная карточка как у всех юзеров»).
          Боту собирается детерминированная «биография» без единого запроса. */}
      <UnifiedPlayerModal
        player={selectedPlayer}
        myInfo={{
          name: myProfile.name,
          avatar: myProfile.avatar,
          frame: myProfile.frame,
          totalXP: myProfile.totalXP,
          streak: myProfile.streak,
          leagueId: myProfile.leagueId,
        }}
        onClose={closePlayer}
      />
    </View>
  );
}

const SeatCard = memo(function SeatCard({ seat, onPress, lang }: { seat: Seat; onPress: () => void; lang: Lang }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <Animated.View entering={ZoomIn.springify().damping(14).stiffness(190)} style={styles.seatFill}>
      <Pressable
        onPress={onPress}
        style={[styles.seat, seat.isYou && styles.seatYou]}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, { ru: `Профиль ${seat.name}`, uk: `Профіль ${seat.name}`, es: `Perfil de ${seat.name}`, 'pt-BR': `Perfil de ${seat.name}`, vi: `Hồ sơ của ${seat.name}`, id: `Profil ${seat.name}`, tr: `${seat.name} profili`, pl: `Profil ${seat.name}` })}
      >
        <AvatarView avatar={seat.avatar} level={tournamentAvatarLevel(seat.avatar)} auraId={seat.aura} size={44} animateAura={false} />
        {seat.streak > 0 ? <Text style={styles.seatStreak}>🔥</Text> : null}
        {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник в ячейке сетки мест: перенос сломал бы одинаковую высоту сидений 4×4 */}
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

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exitButton: {
    minWidth: 56,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: P.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  exitButtonDisabled: { opacity: 0.6 },
  exitButtonText: { color: P.text, fontSize: 14, fontWeight: '800' },
  title: { ...type.title, color: P.text, flex: 1 },
  counter: {
    marginLeft: 'auto',
    fontSize: 17,
    fontWeight: '800',
    color: P.muted,
    fontVariant: ['tabular-nums'],
  },
  // Место зарезервировано всегда: ошибка сети не сдвигает карточку лобби.
  leaveError: {
    minHeight: 18,
    color: P.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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
  bankRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  bankLabel: { color: P.muted, fontSize: 13, fontWeight: '700', flex: 1 },
  // зачем 2026-08-04: было alignItems 'baseline' под текстовую подпись
  // «жемчужин». У картинки базовой линии нет — по baseline иконка «тонет»
  // под цифры. Центрируем: жемчужина встаёт ровно по оптической середине числа.
  bankAmountWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Фиксированный цифровой слот + tabular nums сохраняют геометрию при
  // авторитетном обновлении банка из snapshot комнаты.
  bankAmountSlot: {
    minWidth: 42,
    textAlign: 'right',
    color: P.text,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  // Размер под кегль числа (20): жемчужина читается как единица измерения
  // рядом с цифрой, а не как отдельная иконка-кнопка. Геометрия фиксированная —
  // ряд не дёргается, когда банк растёт с 5 до 75 (layout stability).
  bankPearl: { width: 18, height: 18 },
  bankShares: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 10,
  },
  // Плашка места: подпись сверху, награда снизу. Тон и вес разводят их по
  // иерархии — цифра ведёт, подпись поясняет. Разделителей и обводок нет:
  // блоки отделяет только ритм отступов (правило владельца).
  bankShare: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    // Геометрия фиксирована с первого кадра: цифра меняется от 0 до сотен,
    // и без запаса по высоте карточка «дышала» бы при каждом прибытии.
    minHeight: 34,
  },
  // guard-ok: это НЕ подпись-расшифровка под названием, а сам ярлык места.
  // Без «1 место» цифра «38» не читается вообще; тут подпись несёт смысл,
  // а не поясняет самодостаточный заголовок.
  bankShareLabel: {
    color: P.muted,
    fontSize: 11, // guard-ok
    fontWeight: '700',
    textAlign: 'center',
  },
  // Награда — то, ради чего игрок ждёт: цвет акцента и вес выше подписи.
  // tabular-nums держит ширину цифр при смене 9 → 16 → 38.
  bankShareGems: {
    color: P.accent,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
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
  // зачем: белый 3% невидим на светлой sagePorcelain; альфа от текста темы даёт
  // тот же «пустой» тон на тёмных и еле заметный тёмный слот на светлой.
  seatEmpty: { flex: 1, borderRadius: radius.md, backgroundColor: hexToRgba(P.text, 0.04) },
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
});
