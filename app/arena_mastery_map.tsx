import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, PixelRatio, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaProgress, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { masteryLevel, type ArenaMasteryMetric } from '../modules/arena/expansion_contract';
import { arenaModeCopyKey } from '../modules/arena/expansion_model';
import { ARENA_TASK_MODES } from '../modules/arena/contract';
import { arenaExpansionHome } from './arena_client';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

/**
 * Системный масштаб шрифта — для высоты строки.
 *
 * В React Native крупный системный шрифт увеличивает `fontSize`, но `lineHeight`
 * задан числом и остаётся прежним: строки наезжают друг на друга и обрезаются.
 * Высота строки умножается на масштаб, поэтому при обычном размере вёрстка та
 * же, а при увеличении — правильная.
 *
 * На главных экранах Арены то же самое делает хук `useArenaFontScale`: он
 * реагирует на смену настройки на ходу. Здесь взято значение на момент
 * загрузки модуля — стили лежат в `StyleSheet`, а часть строк рисуется внутри
 * колбэков списка, где хук вызвать нельзя. Разница видна только если менять
 * системный шрифт, не выходя из приложения.
 */
const FONT_SCALE = PixelRatio.getFontScale();


export default function ArenaMasteryMapScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [items, setItems] = useState<readonly ArenaMasteryMetric[]>([]);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('mastery', 'hub')); }, []);
  const load = useCallback(() => {
    setState('loading');
    void arenaExpansionHome().then((home) => {
      if (!home.availability.mastery) { setState('unavailable'); return; }
      setItems(ARENA_TASK_MODES.map((mode) => home.mastery.find((item) => item.mode === mode) ?? { mode, score: null, sampleCount: 0, accuracy: 0, confidence: 'insufficient' as const }));
      setState('ready');
    }).catch(() => setState('error'));
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);

  return (
    <ArenaHubChrome>
    <ArenaScreen title={arenaExpansionText(lang, 'mastery')} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.mode}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.center}><ArenaStateNotice state={state === 'ready' ? 'empty' : state} emptyHint="masteryLow" onRetry={load} onBack={() => router.replace('/arena' as never)} /></View>}
        renderItem={({ item }) => {
          const level = masteryLevel(item);
          return <V2Card style={styles.card}>
            <View style={styles.row}><View style={styles.copy}><Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, arenaModeCopyKey(item.mode))}</Text><Text style={[styles.level, { color: item.score === null ? P.muted : P.gold }]}>{arenaExpansionText(lang, level)}</Text></View><Text style={[styles.score, { color: item.score === null ? P.muted : P.text }]}>{item.score === null ? '—' : item.score}</Text></View>
            <ArenaProgress value={item.score ?? 0} max={100} label={arenaExpansionText(lang, arenaModeCopyKey(item.mode))} />
            <Text style={[styles.meta, { color: P.muted }]}>{item.sampleCount} · {Math.round(item.accuracy)}%</Text>
          </V2Card>;
        }}
      />
    </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center' },
  card: { gap: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  title: { fontSize: 18, lineHeight: 24 * FONT_SCALE, fontWeight: '900' },
  level: { marginTop: 2, fontSize: 13, fontWeight: '800' },
  score: { fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  meta: { fontSize: 12, fontWeight: '800' },
});
