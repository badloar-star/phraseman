import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { ARENA_TIER_KEYS, arenaRankView } from '../modules/arena/rank_engine';
import { arenaLoadState } from '../modules/arena/load_state';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  arenaV2FriendsBoard,
  arenaV2Home,
  type ArenaFriendsBoardRow,
  type ArenaHomeResponse,
} from './arena_client';

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;

/**
 * Топы.
 *
 * Владелец (D-28): глобального топа нет намеренно — в списке из миллиона строк
 * место игрока ему ничего не говорит. Здесь друзья, которых он знает, и
 * собственный процентиль.
 */
export default function ArenaTopsScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const [rows, setRows] = useState<readonly ArenaFriendsBoardRow[]>([]);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [home, setHome] = useState<ArenaHomeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) return;
    void arenaV2FriendsBoard()
      .then((board) => { setRows(board.rows); setPercentile(board.percentileAbove); })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
    void arenaV2Home().then(setHome).catch(() => {});
  }, [active]);

  const you = useMemo(() => rows.find((row) => row.you) ?? null, [rows]);
  // Своя строка в таблице есть всегда, поэтому «есть с кем сравнивать» — это
  // больше одной строки, а не больше нуля.
  const state = arenaLoadState({ loaded, failed, count: Math.max(0, rows.length - 1) });

  return (
    <ArenaHubChrome
      availability={home?.availability}
      activeMatchId={home?.activeMatch?.matchId ?? null}
      activeQueue={home?.activeQueue}
    >
      <ArenaScreen title={arenaText(lang, 'topsTab')} variant="table">
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(280)}>
          <V2Card pad={16} style={styles.head}>
            <Text style={[styles.headline, { color: P.text }]}>
              {arenaText(lang, TIER_COPY[arenaRankView(you?.rating ?? 0).tierIndex])}
            </Text>
            {/* Процентиль — только когда сравнивать есть с кем. */}
            {percentile !== null ? (
              <Text style={[styles.meta, { color: P.accent }]}>
                {arenaText(lang, 'rankPercentile')} {percentile}%
              </Text>
            ) : (
              <Text style={[styles.meta, { color: P.muted }]}>{arenaText(lang, 'friendHint')}</Text>
            )}
          </V2Card>
        </Animated.View>

        <Text style={[styles.section, { color: P.muted }]}>{arenaText(lang, 'friendsBoard')}</Text>

        {state === 'failed' ? (
          <>
            <Text style={[styles.empty, { color: P.danger }]}>{arenaText(lang, 'loadFailed')}</Text>
            <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
          </>
        ) : state === 'loading' ? (
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'loading')}</Text>
        ) : state === 'empty' ? (
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'noFriends')}</Text>
        ) : null}

        {rows.map((row, index) => {
          const view = arenaRankView(row.rating);
          return (
            <Animated.View
              key={row.stableUid}
              entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(Math.min(index, 8) * 45).duration(250)}
            >
              <V2Card
                pad={12}
                style={[styles.row, row.you ? { borderColor: P.accent, borderWidth: 1 } : null]}
              >
                <View style={[styles.place, { backgroundColor: index === 0 ? P.gold : P.elev2 }]}>
                  <Text style={[styles.placeText, { color: index === 0 ? P.okInk : P.text }]}>{index + 1}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: row.you ? P.accent : P.text }]}>
                    {row.you ? arenaText(lang, 'you') : arenaText(lang, TIER_COPY[view.tierIndex])}
                  </Text>
                  <Text style={[styles.meta, { color: P.muted }]}>
                    {ARENA_TIER_KEYS[view.tierIndex]} · {row.wins}/{row.losses}
                  </Text>
                </View>
                <Text style={[styles.rating, { color: P.text }]}>{row.rating}</Text>
              </V2Card>
            </Animated.View>
          );
        })}
      </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6 },
  headline: { fontSize: 22, fontWeight: '900' },
  section: { marginTop: 8, fontSize: 13, fontWeight: '800' },
  empty: { marginTop: 20, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  emptyHint: { marginTop: 4, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  place: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  placeText: { fontSize: 15, fontWeight: '900' },
  copy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '700' },
  rating: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
