// ═══════════════════════════════════════════════════════════════════════════
// tournament_results.tsx — итоги турнира (макеты 17-20).
//
// зачем: финал режима. Подиум с короной, призы, награда игрока, шер-карточка.
// Кнопки «сыграть ещё» НЕТ намеренно — турнир завершён, следующий по
// расписанию (решение владельца, спека §7).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// зачем: голый router.back() крашит Android/Fabric при teardown — тот же контракт,
// что и в shards_shop.tsx/tournaments.tsx/tournament_season.tsx.
import { safeRouterBack } from './navigation_back';
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
import {
  claimReward,
  invalidateSeasonStandingsCache,
  useTournamentRoom,
  type RoomPlayer,
} from './tournament_client';
import { getStableId, peekStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';

type Winner = { name: string; avatar: string; color: string; score: number; place: number };

// зачем 2026-07-27 (владелец): блок PRIZES удалён целиком. В нём были
// захардкоженные «🎟 + 50 жемчужин + титул «Чемпион дня»» — три ошибки разом:
// иконка билета (билетов больше нет, вход за жемчужины), эмодзи-медальки
// 🥇🥈🥉 и титул, которого в игре не существует. Суммы тоже были выдуманы:
// сервер платит долю РЕАЛЬНОГО банка (при 16 игроках — 24/9/6, а не 50/25/10).
// Теперь награда показывается там, где ей место: счётчиком над аватаром
// призёра, с анимацией начисления из банка под подиумом.

/** Доли призёров на случай, если сервер ещё не прислал фактические выплаты. */
const PRIZE_SHARES = [0.6, 0.25, 0.15] as const;

/**
 * Итоговые места по очкам. Подиум ставится 2-1-3, как в макете 17: первое
 * место визуально по центру и выше.
 */
function buildPodium(players: readonly RoomPlayer[], P: TournamentV2): Winner[] {
  const sorted = [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  const top = sorted.slice(0, 3).map((player, index) => ({
    name: player.name || 'Игрок',
    // зачем: был эмодзи-фолбэк '🙂' — approved AvatarView сам рисует дефолтный
    // LevelBadge, если avatar пуст/невалиден, эмодзи-костыль не нужен.
    avatar: player.avatar || '',
    // зачем: было хардкод-hex '#8AB49A' — фолбэк-цвет аватара теперь берётся
    // из общего токен-набора режима (тот же тон, что P.muted).
    color: player.color || P.muted,
    score: Number(player.score ?? 0),
    place: index + 1,
  }));
  // Порядок колонн: серебро, золото, бронза.
  return [top[1], top[0], top[2]].filter((winner): winner is Winner => Boolean(winner));
}

export default function TournamentResultsScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;
  // зачем: у финального экрана не было пути назад кроме кнопки внизу — добавлена
  // компактная кнопка в шапке, тот же паттерн, что и в остальных экранах
  // турниров. Кнопка повторного запуска турнира отсутствует намеренно — см. шапку файла.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/tournaments' as any), [router]);

  const { room, status, retry } = useTournamentRoom(roomId);
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
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'done' | 'failed'>('idle');
  const claimedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => { cancelled = true; };
  }, []);

  // зачем: турнир только что изменил недельные очки. Без сброса кэша игрок
  // вернулся бы в хаб и увидел СТАРУЮ таблицу ещё 15 минут — выглядит как
  // «очки не засчитались». Сброс бесплатный: следующее чтение и так плановое.
  useEffect(() => { invalidateSeasonStandingsCache(); }, []);

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

  const prizeByPlace = useMemo(() => {
    if (Array.isArray(room?.prizeGems) && room.prizeGems.length > 0) {
      return room.prizeGems.map((gems) => Math.max(0, Math.trunc(Number(gems) || 0)));
    }
    if (prizePool <= 0) return [0, 0, 0];
    const raw = PRIZE_SHARES.map((share) => Math.floor(prizePool * share));
    // Остаток от округления — победителю, чтобы сумма сходилась с банком.
    const remainder = prizePool - raw.reduce((sum, value) => sum + value, 0);
    return raw.map((value, index) => (index === 0 ? value + remainder : value));
  }, [room?.prizeGems, prizePool]);

  const standings = useMemo(
    () => [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)),
    [players],
  );
  const myIndex = myId ? standings.findIndex((player) => player.id === myId) : -1;
  const myPlace = myIndex >= 0 ? myIndex + 1 : 0;
  const me = myIndex >= 0 ? standings[myIndex] : null;
  const won = myPlace > 0 && myPlace <= 3;
  // зачем: момент победы должен ощущаться — конфетти и золотая волна на
  // призовом месте, как в эталоне V2. Только для топ-3: салют за 12-е место
  // обесценивает награду.
  const fxRef = useRef<TournamentFxApi>(null);
  const [fxSize, setFxSize] = useState({ width: 0, height: 0 });
  const beaten = myPlace > 0 ? Math.max(0, standings.length - myPlace) : 0;

  useEffect(() => {
    if (!won || fxSize.width <= 0) return;
    const origin = { x: fxSize.width / 2, y: fxSize.height * 0.3 };
    const timer = setTimeout(() => {
      fxRef.current?.goldWave(P.gold);
      fxRef.current?.confetti(origin, [P.gold, P.accent, P.okGradA, P.text]);
    }, 900);
    return () => clearTimeout(timer);
  }, [won, fxSize, P.gold, P.accent, P.okGradA, P.text]);

  useEffect(() => {
    if (!won) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [won]);

  /**
   * Забрать награду.
   *
   * зачем: сервер идемпотентен (повторный вызов не выдаёт приз дважды), но
   * лишний вызов — лишние деньги и лишняя гонка. Поэтому один claim за экран,
   * а состояние кнопки меняется МГНОВЕННО, до ответа сервера.
   */
  const claim = useCallback(async () => {
    if (!roomId || claimedRef.current) return;
    claimedRef.current = true;
    setClaimState('claiming');
    try {
      await claimReward(roomId);
      setClaimState('done');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Откат: даём повторить, иначе игрок останется без приза из-за
      // моргнувшей сети.
      claimedRef.current = false;
      setClaimState('failed');
    }
  }, [roomId]);

  // Награда забирается автоматически при открытии итогов — лишний тап здесь
  // не нужен, приз уже заслужен.
  useEffect(() => {
    if (!roomId || !room) return;
    if (room.state !== 'results' && room.state !== 'rewards' && room.state !== 'closed') return;
    if (claimedRef.current) return;
    void claim();
  }, [roomId, room, room?.state, claim]);

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
    if (!roomId || !room) return;
    // Только когда турнир реально доигран — иначе роллим за незавершённое.
    if (room.state !== 'results' && room.state !== 'rewards' && room.state !== 'closed') return;
    // Участие = игрок есть в финальной таблице. Зрители карточку не получают.
    if (myPlace <= 0) return;
    if (dropRolledRef.current) return;
    dropRolledRef.current = true;
    // Сюрприз ПОСЛЕ итогов, а не CTA до них: модалка приходит поверх подиума,
    // ничего не блокируя. Ошибка/офлайн — тихо, экран итогов не страдает.
    void maybeRollCollectibleDrop('tournament', roomId, { dailyScoped: false })
      .then((drop) => { if (drop) setCardDrop(drop); })
      .catch(() => {});
  }, [roomId, room, room?.state, myPlace]);

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
        <TournamentEdgeState kind="cancelled" onRetry={() => router.replace('/tournaments')} />
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
        {/* зачем: финальный экран не имел выхода назад (только «На главную»
            снизу) — компактная кнопка в углу, тот же паттерн, что и в
            остальных экранах турниров. */}
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={P.text} />
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
                key={`${winner.place}-${winner.name}`}
                winner={winner}
                gems={prizeByPlace[winner.place - 1] ?? 0}
              />
            ))}
          </View>

          {/* зачем 2026-07-27 (владелец): «показывается, сколько общий банк
              собрался с этого турнира», и из него анимация отсчитывает
              жемчужины к призёрам. Это же убирает выдуманные цифры: сумма
              счётчиков над аватарами всегда равна банку под подиумом. */}
          {prizePool > 0 ? (
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel} allowFontScaling={false}>Банк турнира</Text>
              <View style={styles.bankValue}>
                <Text style={styles.bankAmount} allowFontScaling={false}>{prizePool}</Text>
                <Image
                  source={pearlIconForTheme(themeMode)}
                  style={styles.bankPearl}
                  contentFit="contain"
                  accessibilityLabel={`Банк турнира: ${prizePool} жемчужин`}
                />
              </View>
            </View>
          ) : null}
        </V2Card>


        {/* Награда игрока */}
        <V2Card pad={20}>
          <View style={styles.rewardRow}>
            {/* зачем: было хардкод-hex фолбэк-цвета + эмодзи-аватар — теперь
                общий P.muted и настоящий AvatarView, как на подиуме выше. */}
            <View style={[styles.rewardAvatar, { backgroundColor: `${me?.color ?? P.muted}33` }]}>
              <AvatarView avatar={me?.avatar ?? ''} size={40} animateAura={false} />
            </View>
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>Ваша награда</Text>
              <Text style={styles.rewardSub}>
                {claimState === 'failed' ? 'не удалось начислить' : 'начислена'}
              </Text>
            </View>
            <View style={styles.rewardValueBox}>
              <Text style={styles.rewardValue} allowFontScaling={false}>
                {me ? me.score : 0}
              </Text>
              <Text style={styles.rewardValueLabel}>очков</Text>
            </View>
          </View>
        </V2Card>

        <View style={styles.actions}>
          {claimState === 'failed' ? (
            <V2Cta onPress={claim}>Забрать награду</V2Cta>
          ) : (
            <V2Cta onPress={share}>Поделиться 📤</V2Cta>
          )}
          {roomId ? (
            <V2Cta
              tone="ghost"
              onPress={() => router.push({ pathname: '/tournament_review', params: { roomId } } as any)}
            >
              Разобрать ответы
            </V2Cta>
          ) : null}
          <V2Cta tone="ghost" onPress={() => router.replace('/tournaments')}>На главную</V2Cta>
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

  useEffect(() => {
    if (gems <= 0) { setShownGems(0); return; }
    // Жемчужины «долетают» из банка под подиумом — стартуем после аватара.
    const startDelay = (first ? 900 : winner.place === 2 ? 700 : 800);
    const steps = Math.min(gems, 24);
    const stepMs = Math.max(28, Math.round(700 / steps));
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
          <Text style={styles.podiumGemsText} allowFontScaling={false}>{shownGems}</Text>
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
          <AvatarView avatar={winner.avatar} size={first ? 74 : 62} animateAura={false} />
        </View>
      </Animated.View>

      <Text style={styles.podiumName} numberOfLines={1}>{winner.name}</Text>
      <View style={styles.podiumScoreRow}>
        <StarGlyph size={13} color={P.gold} />
        <Text style={styles.podiumScore} allowFontScaling={false}>{winner.score}</Text>
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

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
  },
  bankLabel: { ...type.label, color: P.muted },
  bankValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
  bankPearl: { width: 18, height: 18 },

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
