import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen, ArenaStat } from '../components/arena/ArenaScreen';
import { ArenaPlayers } from '../components/arena/ArenaPlayers';
import { ArenaRewards } from '../components/arena/ArenaRewards';
import { ArenaDisclosureBadge } from '../components/arena/ArenaExpansionUI';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { SpinRewardPlaque } from '../components/SpinRewardPlaque';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaPlayer } from '../modules/arena/contract';
import type { ArenaMatchReward } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { TournamentFxApi } from '../components/tournament/TournamentFx';
import { arenaExpansionHome, arenaFlushOutbox, arenaOutboxPending, arenaRivalAccept, arenaV2Home, arenaV2SyncMatch, createArenaRequestId, peekArenaViewerSeat, rememberArenaViewerSeat, useArenaMatch } from './arena_client';
import { arenaResultTheme } from '../modules/arena/arena_cosmetics';
import { arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';
import type { ArenaExpansionHome } from '../modules/arena/expansion_contract';
import { useArenaSound } from '../hooks/use_arena_sound';
import { arenaResultAnnounce, arenaResultHasAnnounce } from '../modules/arena/result_view';

export default function ArenaResultsScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const window = useWindowDimensions();
  const params = useLocalSearchParams<{ matchId?: string; viewerSeat?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : null;
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const fxRef = useRef<TournamentFxApi>(null);
  const celebratedRef = useRef<string | null>(null);
  const live = useArenaMatch(matchId, active);
  const routeSeat = params.viewerSeat === 'a' || params.viewerSeat === 'b' ? params.viewerSeat : null;
  const [viewerSeat, setViewerSeat] = useState<'a' | 'b' | null>(() => routeSeat ?? peekArenaViewerSeat(matchId));
  const [privateReward, setPrivateReward] = useState<ArenaMatchReward | undefined>();
  const [equipped, setEquipped] = useState<Readonly<Record<string, string>>>({});
  const [reactionChosen, setReactionChosen] = useState<string | null>(null);
  const [expansion, setExpansion] = useState<ArenaExpansionHome | null>(null);
  const [baseEnabled, setBaseEnabled] = useState(false);
  const [rivalBusy, setRivalBusy] = useState(false);
  const rivalAcceptRequestId = useRef<string | null>(null);
  /**
   * Отчёт мог не уйти — например, матч доигран в метро. Сюда игрок приходит
   * сразу после матча, поэтому досылаем прямо здесь, а потом честно смотрим,
   * остался ли отчёт в очереди: без этой проверки экран сказал бы «матч
   * засчитан» про матч, о котором сервер ещё не знает.
   */
  const [reportPending, setReportPending] = useState(false);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    void arenaFlushOutbox()
      .catch(() => 0)
      .then(() => arenaOutboxPending(matchId))
      .then((pending) => { if (alive) setReportPending(pending); })
      .catch(() => {});
    return () => { alive = false; };
  }, [active, matchId]);

  useEffect(() => {
    if (active && matchId) void arenaV2SyncMatch(matchId).then((response) => {
      if (response.viewerSeat) { rememberArenaViewerSeat(matchId, response.viewerSeat); setViewerSeat(response.viewerSeat); }
      if (response.viewerReward) setPrivateReward(response.viewerReward);
    }).catch(() => {});
  }, [active, matchId]);
  useEffect(() => { if (active) void Promise.all([arenaExpansionHome(), arenaV2Home()]).then(([home, base]) => { setExpansion(home); setEquipped(home.wallet.equippedBySlot); setBaseEnabled(base.availability.enabled); }).catch(() => { setExpansion(null); setBaseEnabled(false); }); }, [active]);
  const match = live.value;
  const reward = privateReward ?? (viewerSeat ? match?.result?.rewards?.[viewerSeat] : undefined);
  const players: readonly ArenaPlayer[] = useMemo(() => {
    if (!match) return [];
    if (match.result?.players?.length) return match.result.players;
    return match.players.map((player) => ({
      ...player,
      name: player.uid === viewerSeat ? arenaText(lang, 'you') : player.name,
    }));
  }, [lang, match, viewerSeat]);
  const winner = match?.result?.winnerUid;
  const title = match?.state === 'aborted'
    ? arenaText(lang, 'cancelledMatch')
    : winner && viewerSeat
      ? (winner === viewerSeat ? arenaText(lang, 'victory') : arenaText(lang, 'defeat'))
      : arenaText(lang, 'draw');
  /**
   * Исход звучит ОДИН раз, по появлению итога, а не по перерисовке экрана:
   * экран результата перерисовывается несколько раз, пока догружаются
   * косметика и награды, и без этой защёлки фанфара играла бы очередью.
   */
  const playSound = useArenaSound();
  /**
   * Что объявить сверх счёта. Раньше повышение тира и выданная косметика
   * только ЗВУЧАЛИ: игрок слышал фанфару и не видел ничего, то есть не узнавал
   * ни что случилось, ни что он получил.
   */
  const announce = useMemo(() => arenaResultAnnounce(reward), [reward]);
  const outcomeToldRef = useRef(false);
  useEffect(() => {
    if (!match || outcomeToldRef.current) return;
    if (match.state === 'aborted') return;
    if (!winner && match.state !== 'settled') return;
    outcomeToldRef.current = true;
    playSound(!winner ? 'resultDraw' : winner === viewerSeat ? 'resultWin' : 'resultLoss');
    // Звёзды приземляются в кошелёк отдельным звуком: это другое событие, и
    // игрок должен услышать, что начисление действительно случилось.
    if (Number(reward?.starsEarned ?? 0) > 0) playSound('starLand');
    // Повышение и понижение ранга — самое громкое, что бывает после матча.
    const rankEvent = String((reward as { rankEvent?: unknown } | undefined)?.rankEvent ?? '');
    if (rankEvent === 'tier_up') playSound('rankUp');
    if (rankEvent === 'tier_down') playSound('rankDown');
    if (Array.isArray((reward as { tierRewards?: unknown[] } | undefined)?.tierRewards)) {
      playSound('rewardUnlock');
    }
  }, [match, playSound, reward, viewerSeat, winner]);

  const resultTheme = arenaResultTheme(equipped.result_theme);
  const titleCosmetic = arenaStoreItemTitle(lang, equipped.title);
  const victoryStamp = winner === viewerSeat ? arenaStoreItemTitle(lang, equipped.victory_stamp) : null;
  const reactionPack = arenaStoreItemTitle(lang, equipped.reaction_pack);
  const series = match?.seriesId
    ? expansion?.rivalries.find((item) => item.rivalryId === match.seriesId)
    : undefined;
  const seriesYou = series?.viewerWins ?? (viewerSeat === 'b'
    ? match?.result?.seriesSummary?.winsB
    : match?.result?.seriesSummary?.winsA) ?? 0;
  const seriesThem = series?.opponentWins ?? (viewerSeat === 'b'
    ? match?.result?.seriesSummary?.winsA
    : match?.result?.seriesSummary?.winsB) ?? 0;
  const incomingRivalOffer = Boolean(match?.rivalOffer && viewerSeat
    && match.rivalOffer.fromSeat !== viewerSeat && match.rivalOffer.expiresAtMs > Date.now());
  const openRivalry = () => {
    if (!incomingRivalOffer || !match?.rivalOffer) {
      router.push({ pathname: '/arena_rivalries', params: { sourceMatchId: matchId } } as never);
      return;
    }
    const requestId = rivalAcceptRequestId.current ?? createArenaRequestId('rival_accept');
    rivalAcceptRequestId.current = requestId;
    setRivalBusy(true);
    void arenaRivalAccept(match.rivalOffer.seriesId, requestId).then((response) => {
      rivalAcceptRequestId.current = null;
      if (response.activeMatchId) {
        router.replace({ pathname: '/arena_match', params: { matchId: response.activeMatchId, viewerSeat: response.viewerSeat } } as never);
      } else {
        router.replace('/arena_rivalries' as never);
      }
    }).catch(() => router.push({ pathname: '/arena_rivalries', params: { sourceMatchId: matchId } } as never))
      .finally(() => setRivalBusy(false));
  };

  useEffect(() => {
    if (!active || reduceMotion || !match || winner !== viewerSeat || celebratedRef.current === match.matchId) return;
    celebratedRef.current = match.matchId;
    fxRef.current?.confetti({ x: window.width / 2, y: Math.min(260, window.height * 0.3) }, [P.accent, P.gold, P.text]);
  }, [active, match, P.accent, P.gold, P.text, reduceMotion, viewerSeat, winner, window.height, window.width]);

  return (
    <ArenaScreen title={arenaText(lang, 'result')} subtitle={title} variant="results" fxRef={fxRef} onBack={() => router.replace('/arena' as never)}>
      {players.length ? <ArenaPlayers players={players} active={active} animateScore /> : null}
      {titleCosmetic ? <Text style={[styles.cosmeticTitle, { color: P.gold }]}>{titleCosmetic}</Text> : null}
      <V2Card style={[styles.resultSurface, resultTheme ? { backgroundColor: resultTheme.backgroundColor, borderColor: resultTheme.borderColor, borderWidth: 1 } : null]}>
        {victoryStamp ? <Text style={[styles.stamp, { color: resultTheme?.foreground ?? P.text }]}>{victoryStamp}</Text> : null}
        <View style={styles.stats}>{players.map((player) => <ArenaStat key={player.uid} label={player.name} value={player.score} />)}</View>
        <ArenaRewards reward={reward} starsLabel={arenaText(lang, 'stars')} />
      </V2Card>
      {reactionPack ? <View style={styles.reactions}><Text style={[styles.reactionHint, { color: P.muted }]}>{arenaExpansionText(lang, 'localReaction')}</Text>{(equipped.reaction_pack === 'reactions_respect' ? ['reactionRespect', 'reactionWellPlayed'] as const : ['reactionComeback', 'reactionAgain'] as const).map((key) => <V2Cta key={key} tone="ghost" disabled={reactionChosen !== null} onPress={() => setReactionChosen(key)}>{arenaExpansionText(lang, reactionChosen === key ? 'ready' : key)}</V2Cta>)}</View> : null}
      {reward?.spinAwarded && reward.spinReceiptId ? (
        <SpinRewardPlaque amount={1} receiptId={reward.spinReceiptId} visible onComplete={() => {}} staticPresentation />
      ) : null}
      {match?.mode === 'series' ? <V2Card style={styles.seriesCard}><Text style={[styles.reactionHint, { color: P.muted }]}>{arenaExpansionText(lang, 'rivalryBody')}</Text><Text style={[styles.seriesScore, { color: P.gold }]}>{arenaExpansionText(lang, 'score').replace('{you}', String(seriesYou)).replace('{them}', String(seriesThem))}</Text></V2Card> : null}
      {arenaResultHasAnnounce(announce) ? (
        <V2Card style={styles.announce}>
          {announce.rank.kind === 'tier_up' || announce.rank.kind === 'tier_down' ? (
            <Text style={[styles.announceHead, {
              color: announce.rank.kind === 'tier_up' ? P.accent : P.danger,
            }]}>
              {arenaText(lang, announce.rank.kind === 'tier_up' ? 'resultTierUp' : 'resultTierDown')}
              {' · '}
              {arenaText(lang, TIER_COPY[announce.rank.tierIndex])}
            </Text>
          ) : announce.rank.kind === 'rank_up' || announce.rank.kind === 'rank_down' ? (
            <Text style={[styles.announceHead, {
              color: announce.rank.kind === 'rank_up' ? P.accent : P.muted,
            }]}>
              {arenaText(lang, announce.rank.kind === 'rank_up' ? 'resultRankUp' : 'resultRankDown')}
            </Text>
          ) : null}

          {/* Очки ранга — со знаком: потерю скрывать нельзя. */}
          {announce.ratingDelta !== 0 ? (
            <Text style={[styles.announceLine, {
              color: announce.ratingDelta > 0 ? P.accent : P.danger,
            }]}>
              {announce.ratingDelta > 0 ? '+' : ''}{announce.ratingDelta}
            </Text>
          ) : null}

          {/* Косметика за тир. Владелец (D-63): награда — предмет, не звёзды. */}
          {announce.unlockedItemIds.length ? (
            <Text style={[styles.announceLine, { color: P.gold }]}>
              {arenaText(lang, 'resultUnlocked')}: {announce.unlockedItemIds.length}
            </Text>
          ) : null}
        </V2Card>
      ) : null}
      {/* Разбор — первой кнопкой и БЕЗ флага расширения: владелец потребовал
          его обязательным, а «Лаборатория» под флагом — это повторы заданий,
          а не разбор. */}
      {matchId ? (
        <V2Cta tone="ghost" onPress={() => router.push({ pathname: '/arena_review', params: { matchId } } as never)}>
          {arenaText(lang, 'reviewTitle')}
        </V2Cta>
      ) : null}
      <V2Cta onPress={() => match?.mode === 'series'
        ? router.replace('/arena_rivalries' as never)
        : match?.mode === 'friend'
        ? router.replace('/arena_friend_duel' as never)
        : router.replace({ pathname: '/arena_matchmaking', params: { mode: match?.mode === 'ranked' ? 'ranked' : 'quick' } } as never)}>{match?.mode === 'series' ? arenaExpansionText(lang, 'rivalryContinue') : arenaText(lang, 'playAgain')}</V2Cta>
      <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>{arenaText(lang, 'home')}</V2Cta>
      {baseEnabled && expansion?.availability.lab && matchId ? <V2Cta tone="ghost" onPress={() => router.push({ pathname: '/arena_match_lab', params: { matchId } } as never)}>{arenaExpansionText(lang, 'review')}</V2Cta> : null}
      {baseEnabled && expansion?.availability.ghost && matchId && (match?.mode === 'quick' || match?.mode === 'ranked') ? <V2Cta tone="ghost" onPress={() => router.push({ pathname: '/arena_ghost_duel', params: { sourceRunId: matchId, sourceKind: 'arena_match' } } as never)}>{arenaExpansionText(lang, 'ghostCreate')}</V2Cta> : null}
      {incomingRivalOffer ? <ArenaDisclosureBadge text={arenaExpansionText(lang, 'rivalryIncoming')} /> : null}
      {baseEnabled && expansion?.availability.rival && matchId && match?.opponentKind === 'human' && (match.mode === 'quick' || match.mode === 'ranked') ? <V2Cta tone="ghost" disabled={rivalBusy} onPress={openRivalry}>{incomingRivalOffer ? arenaText(lang, 'accept') : arenaExpansionText(lang, 'rivalryPropose')}</V2Cta> : null}
      {/*
        Раньше здесь краснело одно слово «Повторить» — глагол вместо
        объяснения, и без единой кнопки, которой его можно было бы выполнить.
        Игрок видел красное и думал, что потерял результат матча. Результат
        при этом уже засчитан на сервере: ждёт только доставка.
      */}
      {reportPending ? (
        <View style={styles.pending}>
          <Text accessibilityLiveRegion="polite" style={[styles.pendingTitle, { color: P.text }]}>
            {arenaText(lang, 'reportQueued')}
          </Text>
          <Text style={[styles.pendingHint, { color: P.muted }]}>{arenaText(lang, 'reportQueuedHint')}</Text>
        </View>
      ) : live.error ? (
        <View style={styles.pending}>
          <Text accessibilityLiveRegion="polite" style={[styles.pendingTitle, { color: P.text }]}>
            {arenaText(lang, 'resultPending')}
          </Text>
          <Text style={[styles.pendingHint, { color: P.muted }]}>{arenaText(lang, 'resultPendingHint')}</Text>
        </View>
      ) : !match ? (
        <View style={styles.pending}>
          <Text style={[styles.pendingHint, { color: P.muted }]}>{arenaText(lang, 'loading')}</Text>
        </View>
      ) : null}
    </ArenaScreen>
  );
}

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;

const styles = StyleSheet.create({
  announce: { gap: 4, alignItems: 'center' },
  announceHead: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  announceLine: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', gap: 10 },
  resultSurface: { gap: 12 },
  cosmeticTitle: { textAlign: 'center', fontSize: 13, fontWeight: '900' },
  stamp: { textAlign: 'center', fontSize: 15, fontWeight: '900' },
  reactions: { minHeight: 44, gap: 8 },
  reactionHint: { fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  seriesCard: { gap: 6, alignItems: 'center' },
  seriesScore: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  error: { textAlign: 'center', fontWeight: '700' },
  pending: { gap: 4, alignItems: 'center', paddingVertical: 8 },
  pendingTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  pendingHint: { fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
});
