import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { arenaLoadWarm, arenaPeekWarm, arenaRememberWarm } from '../modules/arena/warm_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaRankView } from '../modules/arena/rank_engine';
import { arenaCachedLoadView, arenaLoadState } from '../modules/arena/load_state';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  arenaV2FriendsBoard,
  type ArenaFriendsBoardRow,
} from './arena_client';
import { peekFriendsTabSwrWarm } from './friends_tab_swr_warm';

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
const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

type ArenaTopsWarm = Readonly<{ rows: readonly ArenaFriendsBoardRow[]; percentile: number | null }>;

function readTopsWarm(value: unknown): ArenaTopsWarm | null {
  if (!value || typeof value !== 'object') return null;
  const rows = (value as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return null;
  const percentile = (value as { percentile?: unknown }).percentile;
  return {
    rows: rows as readonly ArenaFriendsBoardRow[],
    percentile: typeof percentile === 'number' ? percentile : null,
  };
}

export default function ArenaTopsScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  /**
   * Первый кадр — прошлой таблицей, а не словом «Загрузка»: места друзей за
   * ночь не переписываются, и вчерашняя таблица честнее пустого экрана.
   */
  const warm = useMemo(() => readTopsWarm(arenaPeekWarm('tops', Date.now())), []);
  const friendsWarm = useMemo(() => peekFriendsTabSwrWarm(), []);
  const friendNameByUid = useMemo(() => {
    const names = new Map<string, string>();
    for (const friend of friendsWarm?.friends ?? []) {
      const name = friendsWarm?.profiles[friend.uid]?.name ?? friend.displayName;
      if (name?.trim()) names.set(friend.uid, name.trim());
    }
    return names;
  }, [friendsWarm]);
  const [rows, setRows] = useState<readonly ArenaFriendsBoardRow[]>(warm?.rows ?? []);
  const [percentile, setPercentile] = useState<number | null>(warm?.percentile ?? null);
  const [loaded, setLoaded] = useState(Boolean(warm));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) return;
    void arenaV2FriendsBoard()
      .then((board) => {
        setRows(board.rows);
        setPercentile(board.percentileAbove);
        setFailed(false);
        arenaRememberWarm({
          key: 'tops',
          value: { rows: board.rows, percentile: board.percentileAbove },
          wallNowMs: Date.now(),
          store: warmStore,
        });
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
    void arenaLoadWarm(warmStore, 'tops', Date.now()).then((stored) => {
      const parsed = readTopsWarm(stored);
      if (!parsed) return;
      setRows((current) => (current.length ? current : parsed.rows));
      setPercentile((current) => (current === null ? parsed.percentile : current));
    }).catch(() => {});
  }, [active]);

  const you = useMemo(() => rows.find((row) => row.you) ?? null, [rows]);
  // Своя строка в таблице есть всегда, поэтому «есть с кем сравнивать» — это
  // больше одной строки, а не больше нуля.
  const state = arenaLoadState({ loaded, failed, count: Math.max(0, rows.length - 1) });
  // Таблица меняется, поэтому сохранённая показывается с тихой оговоркой —
  // но ВМЕСТО ошибки, а не поверх неё: раньше сверху краснело «Не удалось
  // загрузить», а прямо под ним шла полная таблица из снимка.
  const boardView = arenaCachedLoadView({ state, cachedCount: rows.length, volatile: true });

  return (
    <ArenaScreen title={arenaText(lang, 'topsTab')} variant="table">
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(280)}>
          <V2Card pad={16} style={styles.head}>
            {/*
              Свой тир показывается ТОЛЬКО когда своя строка пришла. Раньше
              вместо неё подставлялся ноль очков, то есть игрок видел чужую
              бронзу как свой тир — ту же ложь уже чинили на экране рангов.
            */}
            {you ? (
              <Text style={[styles.headline, { color: P.text }]}>
                {arenaText(lang, TIER_COPY[arenaRankView(you.rating).tierIndex])}
              </Text>
            ) : null}
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

        {boardView === 'error' ? (
          <>
            <Text style={[styles.empty, { color: P.danger }]}>{arenaText(lang, 'loadFailed')}</Text>
            <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
          </>
        ) : boardView === 'data_stale' ? (
          <>
            <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'refreshFailed')}</Text>
            <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'refreshFailedHint')}</Text>
          </>
        ) : boardView === 'silent' ? (
          // Слово «Загрузка» владелец видеть запретил: либо снимок, либо ничего.
          <View />
        ) : boardView === 'empty' ? (
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'noFriends')}</Text>
        ) : null}

        {rows.map((row, index) => {
          const view = arenaRankView(row.rating);
          const fallbackSuffix = row.stableUid.slice(-4).toUpperCase();
          const playerName = row.you
            ? arenaText(lang, 'you')
            : friendNameByUid.get(row.stableUid) ?? `${arenaText(lang, 'friend')} · ${fallbackSuffix}`;
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
                    {playerName}
                  </Text>
                  <Text style={[styles.meta, { color: P.muted }]}>
                    {arenaText(lang, TIER_COPY[view.tierIndex])} · {row.wins}/{row.losses}
                  </Text>
                </View>
                <Text style={[styles.rating, { color: P.text }]}>{row.rating}</Text>
              </V2Card>
            </Animated.View>
          );
        })}
    </ArenaScreen>
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
