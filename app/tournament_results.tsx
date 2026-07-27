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
import { coinIconForBalance } from './coin_icons';
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
import { getStableId } from './stable_id';
import { useLocalSearchParams } from 'expo-router';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';

type Winner = { name: string; avatar: string; color: string; score: number; place: number };

// зачем: 💎 — запрещённая эмодзи-валюта; призовой текст теперь ссылается на
// монеты словом «монет», сама иконка монеты рисуется рядом с суммой в UI
// (не встроена в текст, т.к. это строка из трёх разных призов подряд).
/** Призы совпадают с TOURNAMENT_PRIZES на сервере (tournament_core.ts). */
const PRIZES = [
  { medal: '🥇', text: '🎟 + 50 жемчужин + титул «Чемпион дня»' },
  { medal: '🥈', text: '🎟 + 25 жемчужин' },
  { medal: '🥉', text: '10 жемчужин' },
];

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
  const [myId, setMyId] = useState<string | null>(null);
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

  const players = room?.players ?? [];
  const podium = useMemo(() => buildPodium(players, P), [players]);

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
              <PodiumColumn key={`${winner.place}-${winner.name}`} winner={winner} />
            ))}
          </View>
        </V2Card>

        {/* Призы */}
        <V2Card pad={18}>
          {PRIZES.map((prize) => (
            <View key={prize.medal} style={styles.prizeRow}>
              <Text style={styles.prizeMedal}>{prize.medal}</Text>
              <Text style={styles.prizeText}>{prize.text}</Text>
            </View>
          ))}
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
          {/* зачем: владелец — «после турнира можно смотреть свои ответы,
              ошибки и правильные варианты». Ставим ВЫШЕ «На главную»: разбор
              полезнее выхода, и уйти можно на шаг ниже. */}
          <V2Cta
            tone="ghost"
            // as any: типы маршрутов expo-router генерируются при сборке,
            // новый экран появится в них после перезапуска Metro.
            onPress={() => router.push({ pathname: '/tournament_review' as any, params: { roomId: roomId ?? '' } })}
            left={<Ionicons name="list-outline" size={18} color={P.accent} />}
          >
            Разбор ответов
          </V2Cta>
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

const PodiumColumn = memo(function PodiumColumn({ winner }: { winner: Winner }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const first = winner.place === 1;
  const crownScale = useSharedValue(0);
  const avatarY = useSharedValue(24);

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

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ translateY: avatarY.value }] }));
  const crownStyle = useAnimatedStyle(() => ({ transform: [{ scale: crownScale.value }] }));

  return (
    <View style={styles.podiumColumn}>
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

  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  prizeMedal: { fontSize: 20 },
  prizeText: { flex: 1, ...type.body, color: P.text },

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
