/**
 * Блок «Рекорды игр» для экрана статистики — перенос панели из утверждённого макета
 * (docs/design/v2-app/elevate-flow.js и elevate-real2.js: «Рекорды игр», сетка `.recs` 2 × 2).
 * Размеры — числами из макета (elevate-extra.css `.recs`, elevate-light.css `.pan .hd2`): сетка в две колонки с шагом 10,
 * отступ 12 от заголовка; ячейка — радиус 16, поля 12 · 14; число 24/800, трекинг −0,4, табличные цифры; название 13.
 * Движения у этого блока в макете нет — он статичен.
 *
 * зачем самодостаточный: экран статистики ничего не знает о рекордах — блок сам читает хранилище. Первый кадр — из памяти
 * процесса, спиннеров нет. Пока нет ни одного рекорда, блок не показывается вовсе (пустые ячейки с прочерками были бы
 * обещанием того, чего человек ещё не делал). Решения владельца 11.11: без подписей-расшифровок под названием и без
 * «за неделю»; стрелка в заголовке — как у блока «Навыки», и только когда блок действительно куда-то ведёт.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../LangContext';
import { V2Card } from '../v2/V2Kit';
import { useV2Palette } from '../v2/useV2Palette';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import {
  GAME_RECORD_IDS, formatGameRecord, peekGameRecords, refreshGameRecords, subscribeGameRecords, type GameRecordId,
} from '../../modules/games/game_records';

const LOG = '[GAME-RECORDS]';
const NAV_GUARD_MS = 700;

type Copy = Readonly<{ ru: string; uk: string; es: string; en: string }>;

const TITLE: Copy = { ru: 'Рекорды игр', uk: 'Рекорди ігор', es: 'Récords de juegos', en: 'Game records' };

// Названия — из макета («Блиц», «Поток», «Лишнее слово», «Смахни»); хвост-расшифровка после «·» убран по слову владельца.
const GAME_NAME: Readonly<Record<GameRecordId, Copy>> = {
  blitz: { ru: 'Блиц', uk: 'Бліц', es: 'Blitz', en: 'Blitz' },
  flow: { ru: 'Поток', uk: 'Потік', es: 'Flujo', en: 'Flow' },
  odd_word: { ru: 'Лишнее слово', uk: 'Зайве слово', es: 'Palabra de más', en: 'Odd word' },
  swipe: { ru: 'Смахни', uk: 'Змахни', es: 'Desliza', en: 'Swipe' },
};

type Props = Readonly<{
  /** Куда ведёт нажатие на блок. Нет — блок не нажимается и стрелки в заголовке нет. */
  onPress?: () => void;
  testID?: string;
}>;

function GameRecordsCard({ onPress, testID = 'stats-game-records-card' }: Props) {
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeGameRecords, peekGameRecords, peekGameRecords);
  const lastNavAt = useRef(0);

  useEffect(() => {
    refreshGameRecords().catch((error: unknown) => {
      console.warn(`${LOG} card:refresh_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
    });
  }, []);

  const cells = useMemo(() => GAME_RECORD_IDS.flatMap((game) => {
    const value = state?.best[game];
    return value === undefined ? [] : [{ game, value: formatGameRecord(game, value), name: triLang(lang, GAME_NAME[game]) }];
  }), [lang, state]);

  // Сетка макета — две колонки: режем ячейки на ряды по две.
  const rows = useMemo(() => {
    const out: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 2) out.push(cells.slice(i, i + 2));
    return out;
  }, [cells]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GUARD_MS) return; // защита от двойного тапа
    lastNavAt.current = now;
    void hapticTap();
    onPress();
  }, [onPress]);

  // Нет ни одного рекорда (или диск ещё не прочитан) — блока нет: место под него не резервируем, он появляется только после игры.
  if (cells.length === 0) return null;

  const title = triLang(lang, TITLE);
  return (
    <V2Card seed={3} style={s.card} onPress={onPress ? handlePress : undefined} testID={testID} accessibilityLabel={title}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={20} color={p.textMuted} /> : null}
      </View>
      <View style={s.grid}>
        {rows.map((row) => (
          <View key={row[0].game} style={s.gridRow}>
            {row.map((cell) => (
              <View key={cell.game} testID={`${testID}-${cell.game}`} style={[s.cell, { backgroundColor: p.track }]} accessible accessibilityLabel={`${cell.name}: ${cell.value}`}>
                <Text style={[s.value, { color: p.text }]}>{cell.value}</Text>
                <Text style={[s.name, { color: p.textSecondary }]}>{cell.name}</Text>
              </View>
            ))}
            {/* нечётная последняя ячейка остаётся в половину ширины, как в сетке макета, — вторую половину держит пустышка */}
            {row.length === 1 ? <View style={s.cellGhost} /> : null}
          </View>
        ))}
      </View>
    </V2Card>
  );
}

const s = StyleSheet.create({
  // макет `.pan`: поля 14 · 16, низ 14 (как у соседнего блока «Навыки» — 16 · 16 · 14 в приложении)
  card: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  // макет `.recs`: две колонки, шаг 10, отступ сверху 12 (4 уже дал заголовок)
  grid: { gap: 10, marginTop: 8 },
  gridRow: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  cellGhost: { flex: 1 },
  value: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  name: { fontSize: 13, lineHeight: 17 },
});

export default memo(GameRecordsCard);
