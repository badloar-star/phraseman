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
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
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
import { tournamentAvatarLevel } from '../components/tournament/tournament_avatars';
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
import { getStableId, peekStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import { closeTournamentFlow } from './tournament_navigation';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';

type Winner = {
  id: string;
  name: string;
  avatar: string;
  aura: string | undefined;
  color: string;
  score: number;
  place: number;
  rewardGems: number;
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
function buildPodium(players: readonly RoomPlayer[], P: TournamentV2): Winner[] {
  if (players.length === 0) return [];
  const ordered = orderTournamentPlayersForDisplay(players);
  const top = ordered.slice(0, 3).map((player, index) => ({
    id: player.id,
    name: player.name || 'Игрок',
    // зачем: был эмодзи-фолбэк '🙂' — approved AvatarView сам рисует дефолтный
    // LevelBadge, если avatar пуст/невалиден, эмодзи-костыль не нужен.
    avatar: player.avatar || '',
    aura: player.aura,
    // зачем: было хардкод-hex '#8AB49A' — фолбэк-цвет аватара теперь берётся
    // из общего токен-набора режима (тот же тон, что P.muted).
    color: player.color || P.muted,
    score: Number(player.score ?? 0),
    place: sharedPlace(ordered, index),
    rewardGems: player.forfeitedAtMs === undefined ? Math.max(0, player.rewardGems ?? 0) : 0,
  }));
  // Порядок колонн: серебро, золото, бронза.
  return [top[1], top[0], top[2]].filter((winner): winner is Winner => Boolean(winner));
}

export default function TournamentResultsScreen() {
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
  const podium = useMemo(() => buildPodium(players, P), [players]);

  /**
   * Реальная экономика турнира вместо захардкоженных «50/25/10».
   *
   * зачем 2026-07-27 (владелец): сервер платит долю ФАКТИЧЕСКОГО банка — при
   * 16 игроках по 3 жемчужины это 48, из них 20% в недельный банк, а призёрам
   * 39 в долях 60/25/15 → 24/9/6. Числа приходят в комнате (prizeGems,
   * prizePoolGems). Фолбэк по долям нужен для старых комнат, финализированных
   * до этой правки: там полей ещё нет, но банк можно восстановить из potGems.
   */
  const prizePool = useMemo(() => {
    if (typeof room?.prizePoolGems === 'number') return Math.max(0, room.prizePoolGems);
    const pot = Math.max(0, room?.potGems ?? 0);
    return pot > 0 ? Math.floor(pot * 0.8) : 0;
  }, [room?.prizePoolGems, room?.potGems]);
  const totalPot = Math.max(0, Math.trunc(room?.potGems ?? prizePool));
  const weeklyBankGems = Math.max(0, totalPot - prizePool);

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

  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !won) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [runtimeActive, freshSnapshot, won]);

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
            accessibilityLabel="Закрыть"
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color={P.text} />
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
        <V2Card pad={20}>
          <View style={styles.podium}>
            {podium.map((winner) => (
              <PodiumColumn
                key={winner.id}
                winner={winner}
                gems={winner.rewardGems}
              />
            ))}
          </View>

          {/* Деньги показаны как один проверяемый путь, а не как несколько
              несвязанных чисел. Источник всех значений — финальная room.

              зачем 2026-08-02 (владелец: «на экране результатов сначала
              показывает у всех 0, а потом обновляется»): экран открывается на
              состоянии results, а суммы сервер проставляет в rewards. До этого
              момента здесь честно стояли нули — и игрок видел «0 жемчужин»,
              которые через секунду прыгали на реальные. Пока цифр нет,
              показываем прочерк: место под них уже занято (геометрия та же),
              но ложного значения нет. */}
          <View style={styles.bankBreakdown}>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Общий банк</Text>
              <Text style={styles.bankAmount}>
                {hasFinalResults ? `${totalPot} жемч.` : '—'}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>В недельный банк</Text>
              <Text style={styles.bankAmountSecondary}>
                {hasFinalResults ? `− ${weeklyBankGems} жемч.` : '—'}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <View style={styles.bankLabelGroup}>
                <Text style={styles.bankLabelStrong}>Призовой фонд дня</Text>
                <Text style={styles.bankHint}>Доли мест: 60 / 25 / 15</Text>
              </View>
              <Text style={styles.bankAmount}>
                {hasFinalResults ? `${prizePool} жемч.` : '—'}
              </Text>
            </View>
            <View style={styles.playerShareRow}>
              <View style={styles.bankLabelGroup}>
                <Text style={styles.playerShareLabel}>Ваша доля</Text>
                <Text style={styles.bankHint}>
                  {hasFinalResults ? `Серверная выплата: ${myPrizeGems}` : 'Считаем выплату'}
                </Text>
              </View>
              <View style={styles.bankValue}>
                <Text style={styles.playerShareAmount}>
                  {hasFinalResults ? myPrizeGems : '—'}
                </Text>
                <Image
                  source={pearlIconForTheme(themeMode)}
                  style={styles.bankPearl}
                  contentFit="contain"
                  accessibilityLabel={`Ваша доля: ${myPrizeGems} жемчужин`}
                />
              </View>
            </View>
          </View>
        </V2Card>


        {/* Награда игрока */}
        <V2Card pad={20}>
          <View style={styles.rewardRow}>
            {/* зачем: было хардкод-hex фолбэк-цвета + эмодзи-аватар — теперь
                общий P.muted и настоящий AvatarView, как на подиуме выше. */}
            <View style={[styles.rewardAvatar, { backgroundColor: `${me?.color ?? P.muted}33` }]}>
              <AvatarView avatar={me?.avatar ?? ''} level={tournamentAvatarLevel(me?.avatar)} auraId={me?.aura} size={40} animateAura={false} />
            </View>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>Ваша награда</Text>
              <Text style={styles.rewardSub}>
                {me?.forfeitedAtMs !== undefined ? 'выход из турнира — без приза' : 'начислена сервером'}
              </Text>
            </View>
            <View style={styles.rewardValueBox}>
              <FlowText testID="results-reward-value" provenance="authored" style={styles.rewardValue}>
                {me ? me.score : 0}
              </FlowText>
              <Text style={styles.rewardValueLabel}>очков</Text>
            </View>
          </View>
        </V2Card>

        {/* зачем 2026-08-03 (владелец: «есть поделиться и разобрать ответы, но
            нет кнопки готово»): выход с итогов был только крестиком в углу —
            маленькая цель, не читается как завершение. Явная кнопка внизу
            закрывает поток и возвращает во вкладку турниров, тем же
            closeTournamentFlow, что и крестик. Тон ghost: главное действие
            здесь — поделиться победой, выход не должен перетягивать взгляд. */}
        <View style={styles.actions}>
          <V2Cta onPress={share}>Поделиться 📤</V2Cta>
          {roomId ? (
            <V2Cta
              tone="ghost"
              onPress={() => router.push({ pathname: '/tournament_review', params: { roomId } } as any)}
            >
              Разобрать ответы
            </V2Cta>
          ) : null}
          <V2Cta tone="ghost" onPress={closeResults}>Готово</V2Cta>
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
      {/* Салют за призовое место. Слой не перехватывает тапы. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />
    </View>
  );
}

// ── Колонна подиума ─────────────────────────────────────────────────────────

const PODIUM_HEIGHT: Record<number, number> = { 1: 96, 2: 72, 3: 60 };

const PodiumColumn = memo(function PodiumColumn({
  winner, gems = 0,
}: { winner: Winner; gems?: number }) {
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
   * количество, анимированно счётчик начисляет». Считаем в JS-состоянии, а не
   * в shared value: нужно рисовать ЦЕЛЫЕ жемчужины, дробных не бывает.
   * Интервал редкий (~28 кадров на всю анимацию) и живёт только пока экран
   * открыт — на производительность не влияет.
   */
  const [shownGems, setShownGems] = useState(0);

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

  useEffect(() => {
    if (gems <= 0) { setShownGems(0); return; }
    // Жемчужины «долетают» из банка под подиумом — стартуем после аватара.
    // зачем 2026-08-01 (аудит турнира): было 900 мс старта + ~700 мс тиканья —
    // до финальной цифры награды проходило больше полутора секунд. Счётчик
    // по-прежнему стартует ПОСЛЕ аватара (иначе жемчужины летят в пустоту), но
    // ждёт ровно столько, сколько нужно пружине аватара.
    const startDelay = (first ? 430 : winner.place === 2 ? 300 : 370);
    const steps = Math.min(gems, 24);
    const stepMs = Math.max(22, Math.round(440 / steps));
    let done = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const startTimer = setTimeout(() => {
      gemsScale.value = withSequence(withSpring(1.18, motion.popIn), withSpring(1, motion.popIn));
      interval = setInterval(() => {
        done += 1;
        // Последний шаг обязан дать РОВНО gems: округление не должно врать.
        setShownGems(done >= steps ? gems : Math.round((gems * done) / steps));
        if (done >= steps && interval) { clearInterval(interval); interval = null; }
      }, stepMs);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [gems, first, winner.place, gemsScale]);

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ translateY: avatarY.value }] }));
  const crownStyle = useAnimatedStyle(() => ({ transform: [{ scale: crownScale.value }] }));
  const gemsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + gemsScale.value * 0.1 }] }));

  return (
    <View style={styles.podiumColumn}>
      {/* Награда призёра: настоящая сумма с сервера, а не выдуманная. */}
      {gems > 0 ? (
        <Animated.View style={[styles.podiumGems, gemsStyle]}>
          <FlowText testID="results-podium-gems" provenance="authored" style={styles.podiumGemsText}>{shownGems}</FlowText>
          <Image
            source={pearlIconForTheme(themeMode)}
            style={styles.podiumGemsPearl}
            contentFit="contain"
            accessibilityLabel={`Награда: ${gems} жемчужин`}
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

      {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник под фигурой пьедестала: перенос сдвинул бы высоту ступени */}
      <Text style={styles.podiumName} numberOfLines={1}>{winner.name}</Text>
      <View style={styles.podiumScoreRow}>
        <StarGlyph size={13} color={P.gold} />
        <FlowText testID="results-podium-score" provenance="authored" style={styles.podiumScore}>{winner.score}</FlowText>
      </View>

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
    shadowColor: P.gold,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  podiumName: { fontSize: 14, fontWeight: '800', color: P.text, marginTop: 8 },
  podiumScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  podiumScore: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
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

  // ── Награды призёров и банк турнира ──────────────────────────────────────
  // зачем: блок выдуманных призов удалён, вместо него счётчик над аватаром и
  // банк под подиумом. Разделение тоном и скруглением — без обводок.
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

  bankBreakdown: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: P.elev2,
    gap: 10,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    gap: 12,
  },
  bankLabelGroup: { flex: 1, gap: 2 },
  bankLabel: { ...type.label, color: P.muted, flex: 1 },
  bankLabelStrong: { ...type.label, color: P.text, fontWeight: '800' },
  bankHint: { fontSize: 11, color: P.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bankValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankAmount: {
    minWidth: 78,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
  bankAmountSecondary: {
    minWidth: 78,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '800',
    color: P.muted,
    fontVariant: ['tabular-nums'],
  },
  bankPearl: { width: 18, height: 18 },
  playerShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 12,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: P.accentSoft,
  },
  playerShareLabel: { fontSize: 14, fontWeight: '900', color: P.text },
  playerShareAmount: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rewardAvatar: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rewardBody: { flex: 1 },
  rewardTitle: { fontSize: 17, fontWeight: '800', color: P.text },
  rewardSub: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 3 },
  rewardValueBox: { alignItems: 'flex-end' },
  rewardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: P.accent,
    fontVariant: ['tabular-nums'],
  },
  rewardValueLabel: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 2 },

  actions: { gap: 10, marginTop: 4 },
});
