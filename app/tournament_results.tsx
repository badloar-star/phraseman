// ═══════════════════════════════════════════════════════════════════════════
// tournament_results.tsx — итоги турнира (макеты 17-20).
//
// зачем: финал режима. Подиум с короной, призы, награда игрока, шер-карточка.
// Кнопки «сыграть ещё» НЕТ намеренно — турнир завершён, следующий по
// расписанию (решение владельца, спека §7).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
// зачем: allowFontScaling={false} отключал системный размер шрифта — текст
// обрезался при крупном шрифте. FlowText переносит вместо обрезки.
import { FlowText } from '../components/text-integrity';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { soundDirector } from '../modules/audio/sound_director';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import TapScale from '../components/TapScale';
import AvatarView from '../components/AvatarView';
import { Image } from 'expo-image'; // guard-ok: жемчужина декоративная, число рядом — реальный индикатор
import { coinIconForBalance, pearlIconForTheme } from './coin_icons';
import { useTheme } from '../components/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { V2Card, V2Counter, V2Cta } from '../components/tournament/tournament_v2_ui';
import { StarGlyph, TournamentFxHost, type TournamentFxApi } from '../components/tournament/TournamentFx';
import {
  METAL,
  motion,
  placeColor,
  radius,
  type,
  useTournamentPalette,
  type TournamentV2,
} from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { TournamentBackdrop, TournamentPodiumArt } from '../components/tournament/TournamentBackdrop';
import { isTournamentBotPlayer, tournamentAvatarLevel, tournamentAvatarValue } from '../components/tournament/tournament_avatars';
import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import UnifiedPlayerModal, { type PlayerInfo } from '../components/PlayerProfileModal';
import {
  invalidateSeasonStandingsCache,
  hasAuthoritativeTournamentResults,
  loadRoundReview,
  peekRoundReview,
  orderTournamentPlayersForDisplay,
  resolveTournamentRoomIdParam,
  useTournamentRoom,
  type RoomPlayer,
} from './tournament_client';
import {
  creditTournamentStarsToSeason,
  hydrateSeasonPassProgress,
  peekSeasonPassProgress,
  type SeasonPassProgress,
} from './season_pass_model';
import { onAppEvent } from './events';
import { getStableId, peekStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import { closeTournamentFlow } from './tournament_navigation';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

type Winner = {
  id: string;
  name: string;
  avatar: string;
  aura: string | undefined;
  color: string;
  score: number;
  place: number;
  rewardGems: number;
  /** Нужен, чтобы карточка бота собиралась локально, без похода в Firestore. */
  isBot: boolean;
  isYou: boolean;
};

// зачем 2026-07-27 (владелец): блок PRIZES удалён целиком. В нём были
// захардкоженные «🎟 + 50 жемчужин + титул «Чемпион дня»» — три ошибки разом:
// иконка билета (билетов больше нет, вход за жемчужины), эмодзи-медальки
// 🥇🥈🥉 и титул, которого в игре не существует. Суммы тоже были выдуманы:
// сервер платит долю РЕАЛЬНОГО банка (при 16 игроках — 24/9/6, а не 50/25/10).
// Теперь награда показывается там, где ей место: счётчиком над аватаром
// призёра, с анимацией начисления из банка под подиумом.

/** Доли призёров на случай, если сервер ещё не прислал фактические выплаты. */
/**
 * Итоговые места по очкам. Подиум ставится 2-1-3, как в макете 17: первое
 * место визуально по центру и выше.
 */
function sharedPlace(players: readonly RoomPlayer[], index: number): number {
  const resultPlace = players[index]?.resultPlace;
  return typeof resultPlace === 'number' && resultPlace > 0 ? resultPlace : index + 1;
}

/**
 * Тройка призёров для пьедестала.
 *
 * зачем 2026-08-03 (владелец: «в конце турнира турнирная таблица с пьедесталом
 * тоже не сразу грузится, должна сразу»): здесь стоял ранний выход по
 * hasAuthoritativeTournamentResults — пока сервер не проставил resultPlace ВСЕМ
 * игрокам, функция возвращала пустой массив, и пьедестал буквально отсутствовал
 * на экране, а затем «прорастал». Но очки к этому моменту уже финальные:
 * порядок мест из них выводится точно так же, а resultPlace лишь подтверждает
 * его. Строим пьедестал сразу — сервер потом уточняет места и выплаты, и это
 * уточнение не меняет геометрию (места те же, добавляются только жемчужины).
 */
function buildPodium(players: readonly RoomPlayer[], P: TournamentV2, myId: string | null, lang: Lang): Winner[] {
  if (players.length === 0) return [];
  const ordered = orderTournamentPlayersForDisplay(players);
  const fallbackName = triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador', 'pt-BR': 'Jogador', vi: 'Người chơi', id: 'Pemain', tr: 'Oyuncu', pl: 'Gracz' });
  const top = ordered.slice(0, 3).map((player, index) => ({
    id: player.id,
    name: player.name || fallbackName,
    // зачем 2026-08-03 (владелец: «рандомные боты не могут получить уровень выше
    // 50 и аватарку выше 50»): аватар прогоняется через tournamentAvatarValue —
    // он и клампит уровневый аватар бота к TOURNAMENT_BOT_MAX_LEVEL. Раньше на
    // пьедестале стоял сырой player.avatar, поэтому кап, работавший в лобби,
    // здесь не действовал и бот мог красоваться аватаром 90-го уровня.
    avatar: tournamentAvatarValue({ id: player.id, isBot: player.isBot, avatar: player.avatar }),
    aura: player.aura,
    // зачем: было хардкод-hex '#8AB49A' — фолбэк-цвет аватара теперь берётся
    // из общего токен-набора режима (тот же тон, что P.muted).
    color: player.color || P.muted,
    score: Number(player.score ?? 0),
    place: sharedPlace(ordered, index),
    rewardGems: player.forfeitedAtMs === undefined ? Math.max(0, player.rewardGems ?? 0) : 0,
    // зачем (2026-08-04): было player.isBot === true, но сервер вырезает isBot
    // из публичного документа — на пьедестале бот считался живым, и его
    // карточка показывала выдуманные 0 опыта / Lv.1 вместо биографии.
    isBot: isTournamentBotPlayer(player),
    isYou: Boolean(myId) && player.id === myId,
  }));
  // Порядок колонн: серебро, золото, бронза.
  return [top[1], top[0], top[2]].filter((winner): winner is Winner => Boolean(winner));
}

/**
 * Счётчик, который «докручивается» до цели, а не появляется готовым числом.
 *
 * зачем 2026-08-04 (владелец: «начисление звёзд и начисление жемчугов должно
 * быть анимированно, они должны цифры увеличить с анимацией»): такой отсчёт уже
 * жил внутри колонки подиума, но был вшит в неё намертво. Награда игрока и
 * индикатор звёзд требовали ровно того же поведения — вынесено в общий хук,
 * чтобы не появилось три расходящиеся копии одной анимации.
 *
 * Считаем в JS-состоянии, а не в shared value: рисуем ЦЕЛЫЕ жемчужины и звёзды,
 * дробных не бывает. Шагов не больше 24 и всего ~440 мс — интервал живёт только
 * пока экран открыт и на производительность не влияет.
 *
 * Гонок нет: цель меняется (сервер досчитал награду) → эффект перезапускается,
 * старый интервал снимается в cleanup, и позднее значение не затирает свежее.
 */
function useCountUp(target: number, startDelayMs: number, enabled = true): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!enabled || target <= 0) { setShown(0); return; }
    const steps = Math.min(target, 24);
    const stepMs = Math.max(22, Math.round(440 / steps));
    let done = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        done += 1;
        // Последний шаг обязан дать РОВНО target: округление не должно врать.
        setShown(done >= steps ? target : Math.round((target * done) / steps));
        if (done >= steps && interval) { clearInterval(interval); interval = null; }
      }, stepMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [target, startDelayMs, enabled]);

  return shown;
}

export default function TournamentResultsScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  // Финальный экран закрывается прямо в меню турниров. Предыдущие раунды и
  // межраундовые таблицы не являются допустимой точкой возврата.
  const closeResults = useCallback(() => closeTournamentFlow(router), [router]);

  /**
   * Карточка игрока по тапу на пьедестале.
   *
   * зачем 2026-08-03 (владелец: «на пьедестале надо чтобы каждый юзер был
   * кликабельным и его карточка открывалась»): пьедестал был мёртвой картинкой,
   * хотя точно такой же тап уже работал в лобби и в таблице сезона. Берём тот
   * же UnifiedPlayerModal и тот же tournamentBotCardInfo, а не пишем третью
   * версию карточки.
   *
   * Firebase-экономия: у бота карточка собирается ЛОКАЛЬНО из его id, без
   * единого чтения. Для живого игрока модалка сама доуточняет профиль по uid.
   */
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const closePlayer = useCallback(() => setSelectedPlayer(null), []);
  const fallbackMeName = triLang(lang, { ru: 'Я', uk: 'Я', es: 'Yo', 'pt-BR': 'Eu', vi: 'Tôi', id: 'Saya', tr: 'Ben', pl: 'Ja' });
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
    // сделана в tournament_season.tsx/tournament_lobby.tsx.
  }, [fallbackMeName]);

  const openWinner = useCallback((winner: Winner) => {
    if (winner.isBot) {
      setSelectedPlayer(tournamentBotCardInfo({
        uid: winner.id,
        name: winner.name,
        avatar: winner.avatar,
        aura: winner.aura,
      }));
      return;
    }
    if (winner.isYou) {
      setSelectedPlayer({
        name: winner.name,
        points: myProfile.totalXP,
        totalXp: myProfile.totalXP,
        isMe: true,
        avatar: myProfile.avatar || winner.avatar,
        aura: winner.aura,
        streak: myProfile.streak,
        leagueId: myProfile.leagueId,
      });
      return;
    }
    setSelectedPlayer({
      name: winner.name,
      points: 0,
      isMe: false,
      uid: winner.id,
      avatar: winner.avatar,
      aura: winner.aura,
      streak: null,
    });
  }, [myProfile]);

  const { room, status, freshSnapshot, retry } = useTournamentRoom(roomId, runtimeActive);
  /**
   * Свой id — СИНХРОННО с первого кадра.
   *
   * зачем 2026-07-27 (владелец: «если открыть разбор или поделиться, а потом
   * закрыть и вернуться на подиум, то он пропал и написано „результаты
   * считаются“»): id грузился только в эффекте, поэтому на первом кадре был
   * null → своё место не находилось → подиум подменялся заглушкой. Видно это
   * было именно при ВОЗВРАТЕ, когда экран монтируется заново, а данные комнаты
   * уже есть. peekStableId — тот же приём, что в остальном приложении
   * (Performance Bible: первый кадр сразу в финальном виде).
   */
  const [myId, setMyId] = useState<string | null>(() => peekStableId());
  /**
   * Второй возможный ключ — Firebase Auth UID.
   *
   * зачем 2026-08-02 (владелец: «турнир завершён, но написано „результаты
   * считаются“»): сервер сажает игрока в комнату под СВОИМ stableUid, который
   * он вычисляет из auth-uid. Пока auth_link ещё не создан (свежая установка,
   * анонимный вход), этот stableUid равен самому auth-uid — и в комнате лежит
   * он. Клиент же искал себя только по локальному stableId, они не совпадали,
   * место не находилось, и вместо подиума висела заглушка «Результаты
   * считаются…», хотя сервер давно всё посчитал (resultPlace проставлен всем).
   * Проверено на живой комнате: игрок записан как auth-uid, а не как UUID.
   */
  const [myAuthUid, setMyAuthUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    void (async () => {
      try {
        const auth = (await import('@react-native-firebase/auth')).default;
        if (!cancelled) setMyAuthUid(auth().currentUser?.uid ?? null);
      } catch { /* без авторизации остаётся поиск по stableId */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // зачем: турнир только что изменил недельные очки. Без сброса кэша игрок
  // вернулся бы в хаб и увидел СТАРУЮ таблицу ещё 15 минут — выглядит как
  // «очки не засчитались». Сброс бесплатный: следующее чтение и так плановое.
  useEffect(() => { invalidateSeasonStandingsCache(); }, []);

  /**
   * Предзагрузка разбора, пока игрок смотрит подиум.
   *
   * зачем 2026-08-02 (владелец: «разбор ошибок в конце турнира грузится долго
   * вместо мгновенного открытия»): кнопка «Разбор» ведёт на экран, который
   * ходил в сеть только в момент открытия. Здесь у игрока есть несколько
   * секунд «мёртвого» времени на празднование — тратим их на тот же запрос,
   * и разбор открывается уже готовым.
   *
   * Firebase-экономия: это НЕ лишний вызов. Тот же самый запрос всё равно
   * ушёл бы при открытии разбора, а его результат кэшируется по roomId, так
   * что повторного обращения не будет. Игрок, не открывший разбор, стоит нам
   * одного вызова — приемлемая цена за мгновенный экран у тех, кто открывает.
   */
  useEffect(() => {
    if (!roomId || !runtimeActive || peekRoundReview(roomId)) return;
    void loadRoundReview(roomId).catch(() => {
      // Молча: это подогрев. Реальную ошибку покажет сам экран разбора.
    });
  }, [roomId, runtimeActive]);

  const { themeMode } = useTheme();
  const players = room?.players ?? [];
  const podium = useMemo(() => buildPodium(players, P, myId, lang), [players, P, myId, lang]);

  // зачем 2026-08-04 (владелец: «убери вообще вот этот блок общий банк, ваша
  // доля и т.д. — это мусор»): здесь считались totalPot / prizePool /
  // weeklyBankGems — бухгалтерия турнира для удалённой таблицы под подиумом.
  // Игроку важна только его выплата (myPrizeGems ниже) и жемчужины призёров над
  // никами — они приходят из room.players[].rewardGems напрямую, банк для этого
  // не нужен.

  const standings = useMemo(
    () => orderTournamentPlayersForDisplay(players),
    [players],
  );
  const standingsWithPlaces = useMemo(() => standings.map((player, index) => ({
    player,
    place: sharedPlace(standings, index),
  })), [standings]);
  // Ищем себя по ОБОИМ ключам: локальный stableId и auth-uid. Сервер мог
  // записать любой из них (см. комментарий у myAuthUid выше).
  const myStanding = useMemo(() => {
    if (myId) {
      const byStableId = standingsWithPlaces.find(({ player }) => player.id === myId);
      if (byStableId) return byStableId;
    }
    if (myAuthUid) {
      return standingsWithPlaces.find(({ player }) => player.id === myAuthUid) ?? null;
    }
    return null;
  }, [myAuthUid, myId, standingsWithPlaces]);
  const myPlace = myStanding?.place ?? 0;
  const me = myStanding?.player ?? null;
  const hasFinalResults = hasAuthoritativeTournamentResults(players);
  const myPrizeGems = hasFinalResults && me?.forfeitedAtMs === undefined
    ? Math.max(0, me?.rewardGems ?? 0)
    : 0;
  const won = hasFinalResults && me?.forfeitedAtMs === undefined
    && myPlace > 0 && myPlace <= 3 && myPrizeGems > 0;
  // зачем: момент победы должен ощущаться — конфетти и золотая волна на
  // призовом месте, как в эталоне V2. Только для топ-3: салют за 12-е место
  // обесценивает награду.
  const fxRef = useRef<TournamentFxApi>(null);
  const [fxSize, setFxSize] = useState({ width: 0, height: 0 });
  const beaten = me
    ? standings.filter((player) => Number(player.score ?? 0) < Number(me.score ?? 0)).length
    : 0;

  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !won || fxSize.width <= 0) return;
    const origin = { x: fxSize.width / 2, y: fxSize.height * 0.3 };
    // зачем 2026-08-01 (аудит турнира): было 900 мс — победа уже подтверждена
    // и заголовок виден, а салют почти секунду не приходил, из-за чего момент
    // триумфа читался как «экран завис». 260 мс достаточно, чтобы подиум успел
    // проявиться, но пауза уже не ощущается ожиданием.
    const timer = setTimeout(() => {
      fxRef.current?.goldWave(P.gold);
      fxRef.current?.confetti(origin, [P.gold, P.accent, P.okGradA, P.text]);
    }, 260);
    return () => clearTimeout(timer);
  }, [runtimeActive, freshSnapshot, won, fxSize, P.gold, P.accent, P.okGradA, P.text]);

  /**
   * Финал турнира звучит — как повышение и понижение лиги.
   *
   * зачем 2026-08-04 (владелец: «когда турнир завершён и там пьедестал, надо
   * звук подключить, как в повышении лиги»): подиум был немым — конфетти и
   * хаптика есть, а итог не слышен. Берём готовые лиговые звуки: у турнира
   * зарезервированы pm.arena.victory/defeat, но WAV к ним не залит, и арбитр
   * дропает их с reason:'missing' — подключение «правильного» события дало бы
   * ровно тишину.
   *
   * Призёру топ-3 с наградой — pm.league.promoted, остальным участникам —
   * pm.league.demoted (решение владельца). Зрители и те, кто снялся, молчат:
   * myPlace === 0 означает «меня нет в финальной таблице».
   *
   * Исход озвучиваем РОВНО один раз за комнату (outcomeSoundedRef). Одного
   * dedupeKey мало: снапшот может прийти с финальной таблицей раньше, чем
   * сервер досчитает награду, и won переключится false → true. Тогда игрок
   * услышал бы сначала звук проигрыша, а следом победный — ключи-то разные.
   * Ref же держит и возврат с экрана разбора: эффект перезапустится молча.
   *
   * Ожидание награды у призёра ограничено 1200 мс. Если сервер награду так и
   * не проставил, экран всё равно звучит — молчащий подиум хуже, чем звук по
   * месту. Задержка не блокирует ни подиум, ни конфетти: они уже на экране.
   */
  const outcomeSoundedRef = useRef(false);
  useEffect(() => { outcomeSoundedRef.current = false; }, [roomId]);

  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !hasFinalResults) return;
    if (outcomeSoundedRef.current) return;
    const participated = myPlace > 0 && me?.forfeitedAtMs === undefined;
    if (!participated) return;

    const playOutcome = (isWin: boolean): void => {
      if (outcomeSoundedRef.current) return;
      outcomeSoundedRef.current = true;
      if (isWin) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      soundDirector.request(isWin ? 'pm.league.promoted' : 'pm.league.demoted', {
        scope: 'tournament-results',
        dedupeKey: `${roomId ?? 'room'}:outcome`,
      });
    };

    // Призёр без досчитанной награды: даём серверу дойти, но не бесконечно.
    if (myPlace <= 3 && !won) {
      const timer = setTimeout(() => playOutcome(false), 1200);
      return () => clearTimeout(timer);
    }
    playOutcome(won);
  }, [runtimeActive, freshSnapshot, hasFinalResults, myPlace, me?.forfeitedAtMs, won, roomId]);

  /**
   * Звёзды турнира идут в дорожку сезона.
   *
   * зачем 2026-08-03 (владелец: «сезон очки капали не за опыт а за звёзды»):
   * это ЕДИНСТВЕННАЯ точка начисления сезонного прогресса. Берём итог отсюда, а
   * не из экрана раунда, потому что здесь счёт уже финальный и подтверждён
   * сервером — начислять по ходу игры значило бы двигать дорожку на числах,
   * которые ещё могут измениться при досчёте раунда.
   *
   * Ждём freshSnapshot: кэшированный снапшот Firestore может нести устаревший
   * счёт. Идемпотентность держит creditTournamentStarsToSeason по roomId —
   * возврат на экран из разбора не начислит второй раз.
   */
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !roomId) return;
    const earned = Math.max(0, Math.trunc(Number(me?.score ?? 0)));
    if (earned <= 0) return;
    void creditTournamentStarsToSeason(roomId, earned).catch(() => {
      // Сбой сезонного счётчика не должен ломать экран итогов: жемчужины,
      // подиум и разбор от него не зависят.
    });
  }, [freshSnapshot, me?.score, roomId, runtimeActive]);

  /**
   * Забрать награду.
   *
   * зачем: сервер идемпотентен (повторный вызов не выдаёт приз дважды), но
   * лишний вызов — лишние деньги и лишняя гонка. Поэтому один claim за экран,
   * а состояние кнопки меняется МГНОВЕННО, до ответа сервера.
   */
  // Награда забирается автоматически при открытии итогов — лишний тап здесь
  // не нужен, приз уже заслужен.
  // ── Дроп коллекционной карточки за участие в турнире ──────────────────────
  // зачем: владелец попросил давать шанс карточки за УЧАСТИЕ в турнире — всем,
  // кто играл, независимо от места. Правила выдачи те же, что у урока: общий
  // шанс, общий дневной кап и pity считает сервер (collectibles.ts). eventId =
  // tournament:<roomId> — одна комната даёт ровно один ролл навсегда, повторный
  // вход на экран итогов карточку не дублирует (серверный леджер идемпотентен).
  const [cardDrop, setCardDrop] = useState<CollectibleDropOutcome | null>(null);
  const dropRolledRef = useRef(false);
  const cardDropVisible = useOverlayVisible('collectibleDrop', cardDrop != null);

  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !roomId || !room) return;
    // Только когда турнир реально доигран — иначе роллим за незавершённое.
    if (room.state !== 'results' && room.state !== 'rewards' && room.state !== 'closed') return;
    // Участие = игрок есть в финальной таблице. Зрители карточку не получают.
    if (myPlace <= 0) return;
    if (dropRolledRef.current) return;
    dropRolledRef.current = true;
    // Сюрприз ПОСЛЕ итогов, а не CTA до них: модалка приходит поверх подиума,
    // ничего не блокируя. Ошибка/офлайн — тихо, экран итогов не страдает.
    void maybeRollCollectibleDrop('tournament', roomId, { dailyScoped: false })
      .then((drop) => { if (runtimeActiveRef.current && drop) setCardDrop(drop); })
      .catch(() => {});
  }, [runtimeActive, freshSnapshot, roomId, room, room?.state, myPlace]);

  /**
   * Индикатор звёзд сезона в шапке.
   *
   * зачем 2026-08-04 (владелец: «в правом верхнем углу просто как везде
   * индикатор звёздочек»): берём ТОТ ЖЕ источник, что вкладка турниров и экран
   * сезона — peek синхронно на первом кадре (Performance Bible: без
   * default-then-patch и без нуля-который-прыгнет), гидрация с диска догоняет
   * фоном, событие ловит начисление за только что сыгранный турнир.
   *
   * Firebase-экономия: чтений нет вообще — счётчик локальный (AsyncStorage).
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
  const seasonStars = seasonPass.totalStars;
  // Звёзды докручиваются вместе с подиумом; награда игрока — следом за ним.
  const shownSeasonStars = useCountUp(seasonStars, 200);
  const shownPrizeGems = useCountUp(myPrizeGems, 500, hasFinalResults);

  const share = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: triLang(lang, {
            ru: `Я обыграл ${beaten} игроков в турнире Phraseman! Сможешь меня победить?`,
            uk: `Я переміг ${beaten} гравців у турнірі Phraseman! Зможеш мене перемогти?`,
            es: `¡Vencí a ${beaten} jugadores en el torneo de Phraseman! ¿Puedes ganarme?`,
            'pt-BR': `Venci ${beaten} jogadores no torneio do Phraseman! Consegue me vencer?`,
            vi: `Tôi đã đánh bại ${beaten} người chơi trong giải đấu Phraseman! Bạn có thể thắng tôi không?`,
            id: `Saya mengalahkan ${beaten} pemain di turnamen Phraseman! Bisakah kamu mengalahkan saya?`,
            tr: `Phraseman turnuvasında ${beaten} oyuncuyu yendim! Beni yenebilir misin?`,
            pl: `Pokonałem ${beaten} graczy w turnieju Phraseman! Dasz radę mnie pokonać?`,
        }),
      });
    } catch {
      // Пользователь закрыл шторку — это не ошибка.
    }
  }, [beaten, lang]);

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
      <TournamentBackdrop variant="results" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Результаты можно только закрыть в меню турниров: это не «назад» в
            завершённую межраундовую таблицу. */}
        <View style={styles.header}>
          <TapScale
            onPress={closeResults}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color={P.text} />
          </TapScale>
          {/* зачем 2026-08-04 (владелец: «в правом верхнем углу просто как везде
              индикатор звёздочек, чтобы видеть, сколько звёздочек ты набрал»):
              звёзды ушли из-под ников на подиуме, и итог сезона стало негде
              увидеть. Индикатор тот же, что на вкладке турниров, и цифра
              докручивается до нового значения — видно, что турнир её поднял. */}
          <View style={styles.headerStars}>
            <StarGlyph size={14} color={P.gold} />
            <FlowText
              testID="results-season-stars"
              provenance="authored"
              style={styles.headerStarsText}
              accessibilityLabel={triLang(lang, { ru: `Звёзд за сезон: ${seasonStars}`, uk: `Зірок за сезон: ${seasonStars}`, es: `Estrellas de la temporada: ${seasonStars}`, 'pt-BR': `Estrelas da temporada: ${seasonStars}`, vi: `Sao mùa giải: ${seasonStars}`, id: `Bintang musim: ${seasonStars}`, tr: `Sezon yıldızları: ${seasonStars}`, pl: `Gwiazdki sezonu: ${seasonStars}` })}
            >
              {shownSeasonStars}
            </FlowText>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(280)} style={styles.titleBlock}>
          <Text style={styles.title}>
            {won
                ? triLang(lang, { ru: '🏆 Победа!', uk: '🏆 Перемога!', es: '🏆 ¡Victoria!', 'pt-BR': '🏆 Vitória!', vi: '🏆 Chiến thắng!', id: '🏆 Menang!', tr: '🏆 Zafer!', pl: '🏆 Zwycięstwo!' })
                : triLang(lang, { ru: 'Турнир завершён', uk: 'Турнір завершено', es: 'Torneo terminado', 'pt-BR': 'Torneio encerrado', vi: 'Giải đấu đã kết thúc', id: 'Turnamen selesai', tr: 'Turnuva sona erdi', pl: 'Turniej zakończony' })}
          </Text>
          <Text style={styles.subtitle}>
            {won
              ? triLang(lang, { ru: `Вы обыграли ${beaten} игроков`, uk: `Ви перемогли ${beaten} гравців`, es: `Venciste a ${beaten} jugadores`, 'pt-BR': `Você venceu ${beaten} jogadores`, vi: `Bạn đã thắng ${beaten} người chơi`, id: `Anda mengalahkan ${beaten} pemain`, tr: `${beaten} oyuncuyu yendin`, pl: `Pokonałeś ${beaten} graczy` })
              : myPlace > 0
                ? triLang(lang, { ru: `Ваше место: ${myPlace}`, uk: `Ваше місце: ${myPlace}`, es: `Tu puesto: ${myPlace}`, 'pt-BR': `Sua posição: ${myPlace}`, vi: `Hạng của bạn: ${myPlace}`, id: `Peringkat Anda: ${myPlace}`, tr: `Sıralaman: ${myPlace}`, pl: `Twoje miejsce: ${myPlace}` })
                : triLang(lang, { ru: 'Результаты считаются…', uk: 'Результати рахуються…', es: 'Calculando resultados…', 'pt-BR': 'Calculando resultados…', vi: 'Đang tính kết quả…', id: 'Menghitung hasil…', tr: 'Sonuçlar hesaplanıyor…', pl: 'Liczymy wyniki…' })}
          </Text>
        </Animated.View>

        {/* Подиум */}
        <V2Card pad={20}>
          <View style={styles.podiumStage}>
            <View pointerEvents="none" style={styles.podiumArtClip}>
              <TournamentPodiumArt style={styles.podiumThemeArt} />
            </View>
            <View style={styles.podium}>
              {podium.map((winner) => (
                <PodiumColumn
                  key={winner.id}
                  winner={winner}
                  gems={winner.rewardGems}
                  onPress={openWinner}
                  lang={lang}
                />
              ))}
            </View>
          </View>

        </V2Card>

        {/* Награда игрока.

            зачем 2026-08-04 (владелец: «убери вообще вот этот блок общий банк,
            ваша доля и т.д. — это мусор», «а „ваша награда“ вообще убери, не
            надо показывать», «внизу написано ваша награда и там жемчужины»):
            над подиумом стояла бухгалтерия турнира — банк, отчисление в
            недельный фонд, призовой фонд дня, доли мест — четыре числа, из
            которых игроку важно ровно одно. Ниже была вторая карточка «Ваша
            награда», которая показывала… ОЧКИ, а не награду, да ещё с подписью
            «начислена сервером». Теперь одна строка и одно число: сколько
            жемчужин ты унёс. Подпись-расшифровка под заголовком запрещена
            правилом владельца, поэтому «начислена сервером» не вернулась. */}
        <V2Card pad={20}>
          <View style={styles.rewardRow}>
            {/* зачем: было хардкод-hex фолбэк-цвета + эмодзи-аватар — теперь
                общий P.muted и настоящий AvatarView, как на подиуме выше. */}
            <View style={[styles.rewardAvatar, { backgroundColor: `${me?.color ?? P.muted}33` }]}>
              <AvatarView avatar={me?.avatar ?? ''} level={tournamentAvatarLevel(me?.avatar)} auraId={me?.aura} size={40} animateAura={false} />
            </View>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>{triLang(lang, { ru: 'Ваша награда', uk: 'Ваша нагорода', es: 'Tu recompensa', 'pt-BR': 'Sua recompensa', vi: 'Phần thưởng của bạn', id: 'Hadiahmu', tr: 'Ödülün', pl: 'Twoja nagroda' })}</Text>
            </View>
            {/* Пустая награда — не провал, а приглашение вернуться: числа нет,
                вместо него спокойная строка без давления (решение владельца:
                «если ничего не заработал, то без давления»). */}
            {myPrizeGems > 0 ? (
              <View style={styles.rewardValueBox}>
                <FlowText testID="results-reward-value" provenance="authored" style={styles.rewardValue}>
                  {shownPrizeGems}
                </FlowText>
                <Image
                  source={pearlIconForTheme(themeMode)}
                  style={styles.rewardPearl}
                  contentFit="contain"
                  accessibilityLabel={triLang(lang, { ru: `Ваша награда: ${myPrizeGems} жемчужин`, uk: `Ваша нагорода: ${myPrizeGems} перлин`, es: `Tu recompensa: ${myPrizeGems} perlas`, 'pt-BR': `Sua recompensa: ${myPrizeGems} pérolas`, vi: `Phần thưởng của bạn: ${myPrizeGems} ngọc trai`, id: `Hadiahmu: ${myPrizeGems} mutiara`, tr: `Ödülün: ${myPrizeGems} inci`, pl: `Twoja nagroda: ${myPrizeGems} pereł` })}
                />
              </View>
            ) : (
              <Text style={styles.rewardEmpty}>
                {hasFinalResults
                    ? triLang(lang, { ru: 'В этот раз без жемчужин — получится в следующий', uk: 'Цього разу без перлин — вийде наступного разу', es: 'Esta vez sin perlas: la próxima lo lograrás', 'pt-BR': 'Desta vez sem pérolas: da próxima você consegue', vi: 'Lần này chưa có ngọc trai — lần sau nhé', id: 'Kali ini belum dapat mutiara — lain kali pasti', tr: 'Bu sefer inci yok — bir dahakine olur', pl: 'Tym razem bez pereł — następnym razem się uda' })
                    : triLang(lang, { ru: 'Считаем награду', uk: 'Рахуємо нагороду', es: 'Calculando la recompensa', 'pt-BR': 'Calculando a recompensa', vi: 'Đang tính phần thưởng', id: 'Menghitung hadiah', tr: 'Ödül hesaplanıyor', pl: 'Liczymy nagrodę' })}
              </Text>
            )}
          </View>
        </V2Card>

        {/* зачем 2026-08-03 (владелец: «есть поделиться и разобрать ответы, но
            нет кнопки готово»): выход с итогов был только крестиком в углу —
            маленькая цель, не читается как завершение. Явная кнопка внизу
            закрывает поток и возвращает во вкладку турниров, тем же
            closeTournamentFlow, что и крестик. Тон ghost: главное действие
            здесь — поделиться победой, выход не должен перетягивать взгляд. */}
        <View style={styles.actions}>
          <V2Cta onPress={share}>{triLang(lang, { ru: 'Поделиться 📤', uk: 'Поділитися 📤', es: 'Compartir 📤', 'pt-BR': 'Compartilhar 📤', vi: 'Chia sẻ 📤', id: 'Bagikan 📤', tr: 'Paylaş 📤', pl: 'Udostępnij 📤' })}</V2Cta>
          {roomId ? (
            <V2Cta
              tone="ghost"
              onPress={() => router.push({ pathname: '/tournament_review', params: { roomId } } as any)}
            >
              {triLang(lang, { ru: 'Разобрать ответы', uk: 'Розібрати відповіді', es: 'Revisar respuestas', 'pt-BR': 'Revisar respostas', vi: 'Xem lại câu trả lời', id: 'Tinjau jawaban', tr: 'Cevapları incele', pl: 'Przejrzyj odpowiedzi' })}
            </V2Cta>
          ) : null}
          <V2Cta tone="ghost" onPress={closeResults}>{triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Concluído', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}</V2Cta>
        </View>
      </ScrollView>

      {/* Отдельная модалка карточки после турнира — поверх итогов, через
          общий арбитр оверлеев (не наслаивается на другие окна). */}
      <CollectibleDropModal
        outcome={cardDropVisible ? cardDrop : null}
        onClose={() => setCardDrop(null)}
        onOpenCollection={() => {
          setCardDrop(null);
          router.push('/collectibles_screen' as any);
        }}
      />
      {/* Карточка игрока по тапу на пьедестале — тот же компонент, что в лобби,
          друзьях и лигах. */}
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
      {/* Салют за призовое место. Слой не перехватывает тапы. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />
    </View>
  );
}

// ── Колонна подиума ─────────────────────────────────────────────────────────

const PODIUM_HEIGHT: Record<number, number> = { 1: 96, 2: 72, 3: 60 };

const PodiumColumn = memo(function PodiumColumn({
  winner, gems = 0, onPress, lang,
}: { winner: Winner; gems?: number; onPress?: (winner: Winner) => void; lang: Lang }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const { themeMode } = useTheme();
  const first = winner.place === 1;
  const crownScale = useSharedValue(0);
  const avatarY = useSharedValue(24);
  const gemsScale = useSharedValue(0);

  /**
   * Счётчик жемчужин над аватаром: число отсчитывается от нуля.
   *
   * зачем 2026-07-27 (владелец): «три отдельных счёта, у каждого своё
   * количество, анимированно счётчик начисляет». Сама механика отсчёта переехала
   * в общий useCountUp — тот же счёт нужен награде игрока и звёздам сезона.
   *
   * Жемчужины «долетают» из-под подиума, поэтому старт ждёт пружину аватара:
   * иначе цифра тикала бы в пустоту, пока колонка ещё едет вверх.
   */
  const gemsStartDelay = first ? 430 : winner.place === 2 ? 300 : 370;
  const shownGems = useCountUp(gems, gemsStartDelay);

  // зачем 2026-08-01 (аудит турнира): порядок событий сохранён (серебро →
  // бронза → золото → корона → награда), но каждая пауза сжата примерно вдвое.
  // Раньше весь каскад подиума занимал ~1.6 с, из которых почти секунда была
  // пустым ожиданием: игрок смотрел на статичный экран после уже известного
  // результата. Теперь тот же рисунок укладывается в ~0.6 с.
  useEffect(() => {
    const delay = first ? 200 : winner.place === 2 ? 90 : 145;
    avatarY.value = withDelay(delay, withSpring(0, motion.popIn));
    if (first) {
      // Корона прилетает пружиной с лёгким перелётом — момент триумфа.
      crownScale.value = withDelay(360, withSequence(
        withSpring(1.25, motion.popIn),
        withSpring(1, motion.popIn),
      ));
    }
  }, [first, winner.place, avatarY, crownScale]);

  // Пилюля «подпрыгивает» ровно в момент, когда цифра начинает расти.
  useEffect(() => {
    if (gems <= 0) return;
    const timer = setTimeout(() => {
      gemsScale.value = withSequence(withSpring(1.18, motion.popIn), withSpring(1, motion.popIn));
    }, gemsStartDelay);
    return () => clearTimeout(timer);
  }, [gems, gemsStartDelay, gemsScale]);

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ translateY: avatarY.value }] }));
  const crownStyle = useAnimatedStyle(() => ({ transform: [{ scale: crownScale.value }] }));
  const gemsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + gemsScale.value * 0.1 }] }));

  return (
    // зачем 2026-08-03 (владелец: «на пьедестале надо чтобы каждый юзер был
    // кликабельным и его карточка открывалась»): колонка была статичной. TapScale
    // даёт тот же отклик на нажатие, что и остальные кликабельные места турнира.
    <TapScale
      style={styles.podiumColumn}
      onPress={onPress ? () => onPress(winner) : undefined}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={triLang(lang, {
          ru: `${winner.name}, ${winner.place} место. Открыть карточку игрока`,
          uk: `${winner.name}, ${winner.place} місце. Відкрити картку гравця`,
          es: `${winner.name}, puesto ${winner.place}. Abrir tarjeta de jugador`,
          'pt-BR': `${winner.name}, posição ${winner.place}. Abrir cartão do jogador`,
          vi: `${winner.name}, hạng ${winner.place}. Mở hồ sơ người chơi`,
          id: `${winner.name}, peringkat ${winner.place}. Buka kartu pemain`,
          tr: `${winner.name}, ${winner.place}. sıra. Oyuncu kartını aç`,
          pl: `${winner.name}, miejsce ${winner.place}. Otwórz kartę gracza`,
      })}
    >
      {/* зачем 2026-08-03: TapScale заворачивает детей в собственный Animated.View
          без стилей. Внутри podiumColumn с alignItems:'center' этот слой схлопывался
          по ширине самого широкого ребёнка (ника), и ступень с width:'100%' мерила
          100% от ника, а не от колонки — тумбы превращались в узкие полоски разной
          ширины. Растягиваем слой сами: ширина ступени снова равна ширине колонки. */}
      <View style={styles.podiumColumnInner}>
      {/* Награда призёра: настоящая сумма с сервера, а не выдуманная. */}
      {gems > 0 ? (
        <Animated.View style={[styles.podiumGems, gemsStyle]}>
          <FlowText testID="results-podium-gems" provenance="authored" style={styles.podiumGemsText}>{shownGems}</FlowText>
          <Image
            source={pearlIconForTheme(themeMode)}
            style={styles.podiumGemsPearl}
            contentFit="contain"
            accessibilityLabel={triLang(lang, { ru: `Награда: ${gems} жемчужин`, uk: `Нагорода: ${gems} перлин`, es: `Recompensa: ${gems} perlas`, 'pt-BR': `Recompensa: ${gems} pérolas`, vi: `Phần thưởng: ${gems} ngọc trai`, id: `Hadiah: ${gems} mutiara`, tr: `Ödül: ${gems} inci`, pl: `Nagroda: ${gems} pereł` })}
          />
        </Animated.View>
      ) : (
        <View style={styles.podiumGemsSpacer} />
      )}

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
          <AvatarView avatar={winner.avatar} level={tournamentAvatarLevel(winner.avatar)} auraId={winner.aura} size={first ? 74 : 62} animateAura={false} />
        </View>
      </Animated.View>

      {/* зачем 2026-08-04 (владелец: «вместо звёздочек должно на этом экране
          показывать, сколько жемчужин каждый получил»): под ником стоял счёт
          звёзд (★54) — он дублировал шапку и спорил с главной цифрой колонны.
          Награда призёра теперь единственное число рядом с ником: сколько
          жемчужин человек унёс. Общий счёт звёзд виден индикатором в шапке. */}
      {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник под фигурой пьедестала: перенос сдвинул бы высоту ступени */}
      <Text style={styles.podiumName} numberOfLines={1}>{winner.name}</Text>

      {/* зачем: пьедестал — металл с тёплым бликом (три стопа), а не плоская
          заливка с эмодзи-медалью. Награда должна читаться материалом. */}
      <Animated.View
        entering={FadeIn.delay(300).duration(300)}
        style={[styles.podiumBlock, { height: PODIUM_HEIGHT[winner.place] }]}
      >
        <LinearGradient
          colors={winner.place === 1 ? METAL.gold : winner.place === 2 ? METAL.silver : METAL.bronze}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- цифра внутри ступени пьедестала фиксированной высоты */}
        <Text style={styles.podiumPlace} allowFontScaling={false}>{winner.place}</Text>
      </Animated.View>
      </View>
    </TapScale>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  titleBlock: { alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '900', color: P.text, letterSpacing: -0.8 },
  subtitle: { ...type.body, color: P.muted, marginTop: 6 },

  podiumStage: { position: 'relative', paddingTop: 14 },
  podiumArtClip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 176, overflow: 'hidden' },
  podiumThemeArt: { position: 'absolute', left: 0, right: 0, bottom: 0, width: undefined, height: 176, opacity: 0.18 },
  podium: { zIndex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  podiumColumn: { flex: 1, alignItems: 'center' },
  // Внутренний слой TapScale: занимает всю колонку, центрируя содержимое.
  // Без него ступень (width:'100%') меряется от ника, а не от колонки.
  podiumColumnInner: { alignSelf: 'stretch', alignItems: 'center' },
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
    shadowColor: P.gold,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  // maxWidth:'100%' — длинный ник не растягивает колонку и не лезет на соседа.
  // marginBottom добирает высоту удалённой строки со счётом звёзд: без него
  // ступени подиума поднялись бы на ~18 pt и композиция «съехала» бы вверх.
  podiumName: {
    fontSize: 14,
    fontWeight: '800',
    color: P.text,
    marginTop: 8,
    marginBottom: 18,
    maxWidth: '100%',
    textAlign: 'center',
  },
  podiumBlock: {
    width: '100%',
    marginTop: 10,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    alignItems: 'center',
    paddingTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  podiumPlace: { fontSize: 20 },

  // ── Награды призёров ──────────────────────────────────────────────────────
  // зачем: блок выдуманных призов удалён, вместо него счётчик над аватаром.
  podiumGems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999, // пилюля: в теме нет токена pill, только lg/md/sm
    backgroundColor: `${P.accent}22`,
  },
  podiumGemsText: {
    fontSize: 15,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },
  podiumGemsPearl: { width: 14, height: 14 },
  // Место под счётчик у непризовых колонн — подиум не «прыгает».
  podiumGemsSpacer: { height: 26 },

  // ── Индикатор звёзд сезона (шапка) ───────────────────────────────────────
  headerStars: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.elev2,
  },
  headerStarsText: {
    fontSize: 14,
    fontWeight: '800',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },

  // ── Награда игрока ────────────────────────────────────────────────────────
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rewardAvatar: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rewardBody: { flex: 1 },
  rewardTitle: { fontSize: 17, fontWeight: '800', color: P.text },
  rewardValueBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },
  rewardPearl: { width: 22, height: 22 },
  // Без давления (владелец): спокойная строка вместо нуля, помещается в
  // ширину карточки рядом с аватаром и заголовком.
  rewardEmpty: { ...type.label, fontWeight: '600', color: P.muted, maxWidth: 150, textAlign: 'right' },

  actions: { gap: 10, marginTop: 4 },
});
