import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaHistoryRows, arenaHistorySummary } from '../modules/arena/history_view';
import { arenaLoadState } from '../modules/arena/load_state';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { arenaFetchMatchHistory, arenaV2Home, type ArenaHomeResponse } from './arena_client';

/**
 * История матчей.
 *
 * Разовое чтение при открытии, а не подписка: прошедшие матчи не меняются, и
 * держать на них живой слушатель значит платить за уведомления, которых не
 * будет.
 */
export default function ArenaHistoryScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const [raw, setRaw] = useState<readonly unknown[]>([]);
  const [home, setHome] = useState<ArenaHomeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) return;
    // Отказ и пустой ответ — РАЗНЫЕ вещи: «матчей нет» игрок примет за правду
    // о себе, а это была неудачная загрузка.
    void arenaFetchMatchHistory()
      .then(setRaw)
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
    void arenaV2Home().then(setHome).catch(() => {});
  }, [active]);

  const rows = useMemo(() => arenaHistoryRows(raw), [raw]);
  const summary = useMemo(() => arenaHistorySummary(rows), [rows]);
  const state = arenaLoadState({ loaded, failed, count: rows.length });

  return (
    <ArenaHubChrome
      availability={home?.availability}
      activeMatchId={home?.activeMatch?.matchId ?? null}
      activeQueue={home?.activeQueue}
    >
      <ArenaScreen title={arenaText(lang, 'historyTab')} variant="table">
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(280)}>
          <V2Card pad={16} style={styles.summary}>
            <View style={styles.summaryRow}>
              <Stat label={arenaText(lang, 'victory')} value={`${summary.wins}`} color={P.accent} />
              <Stat label={arenaText(lang, 'defeat')} value={`${summary.losses}`} color={P.danger} />
              <Stat label={arenaText(lang, 'draw')} value={`${summary.draws}`} color={P.muted} />
            </View>
            <View style={styles.summaryRow}>
              <Stat
                label={arenaText(lang, 'score')}
                // Доля побед показывается только когда матчи были: «0 %» без
                // единого матча — не показатель, а упрёк.
                value={summary.winRate === null ? '—' : `${Math.round(summary.winRate * 100)}%`}
                color={P.text}
              />
              <Stat label={arenaText(lang, 'stars')} value={`${summary.starsEarned}★`} color={P.gold} />
              <Stat label={arenaText(lang, 'streakLabel')} value={`${summary.currentStreak}`} color={P.text} />
            </View>
          </V2Card>
        </Animated.View>

        {state === 'failed' ? (
          <>
            <Text style={[styles.empty, { color: P.danger }]}>{arenaText(lang, 'loadFailed')}</Text>
            <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
          </>
        ) : state === 'loading' ? (
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'loading')}</Text>
        ) : state === 'empty' ? (
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'historyEmpty')}</Text>
        ) : null}

        {rows.map((row, index) => (
          <Animated.View
            key={row.matchId}
            entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(Math.min(index, 8) * 40).duration(240)}
          >
            <V2Card pad={12} style={styles.row}>
              <View
                style={[styles.dot, {
                  backgroundColor: row.outcome === 'win' ? P.accent
                    : row.outcome === 'loss' ? P.danger : P.elev2,
                }]}
              />
              <View style={styles.copy}>
                <Text style={[styles.name, { color: P.text }]}>
                  {arenaText(lang, row.outcome === 'win' ? 'victory' : row.outcome === 'loss' ? 'defeat' : 'draw')}
                </Text>
                <Text style={[styles.meta, { color: P.muted }]}>
                  {row.mode === 'ranked' ? arenaText(lang, 'ranked') : arenaText(lang, 'quick')}
                </Text>
              </View>
              {row.starsEarned > 0 ? (
                <Text style={[styles.value, { color: P.gold }]}>+{row.starsEarned}★</Text>
              ) : null}
              {/* Проигранные очки показываются минусом: скрывать потерю нельзя. */}
              {row.ratingDelta !== 0 ? (
                <Text style={[styles.value, { color: row.ratingDelta > 0 ? P.accent : P.danger }]}>
                  {row.ratingDelta > 0 ? '+' : ''}{row.ratingDelta}
                </Text>
              ) : null}
            </V2Card>
          </Animated.View>
        ))}
      </ArenaScreen>
    </ArenaHubChrome>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const P = useTournamentPalette();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: P.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 14 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '700' },
  empty: { marginTop: 24, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  emptyHint: { marginTop: 4, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  copy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
