/**
 * Отдельный блок «Разминка» на экране «Сегодня» — как в утверждённом макете (docs/design/v2-app/elevate-real.js:44:
 * `.gl.pan` с заголовком «Разминка · не входит в три задания» и строкой разминки внутри), над блоком «Задания дня».
 * зачем отдельный блок (сверка 11.11: «строка внутри панели „Задания дня“, а в макете — отдельным блоком»): разминка
 * в счёт трёх заданий не входит — это видно сразу по тому, что она стоит своим блоком.
 * У языка без игр разминки нет — блок не рисуется вовсе (useWarmupHasGames), места не занимает.
 */
import React, { memo, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { peekWarmup, subscribeWarmup } from '../../modules/games/warmup_state';
import WarmupTodayRow from './WarmupTodayRow';

const COPY = {
  title: { ru: 'Разминка', uk: 'Розминка', es: 'Calentamiento', en: 'Warm-up' },
  note: { ru: 'не входит в три задания', uk: 'не входить у три завдання', es: 'no cuenta en las tres tareas', en: 'not one of the three tasks' },
} as const;

/** Есть ли сегодня игры в разминке — по нему экран решает, рисовать ли блок и как поставить соседний. */
export function useWarmupHasGames(): boolean {
  const state = useSyncExternalStore(subscribeWarmup, peekWarmup, peekWarmup);
  return state.games.length > 0;
}

type Props = Readonly<{
  /** Подложка и тень блока — те же, что у «Заданий дня» на этом экране. */
  style?: StyleProp<ViewStyle>;
  titleColor: string;
  noteColor: string;
}>;

function WarmupTodayPanel({ style, titleColor, noteColor }: Props) {
  const { lang } = useLang();
  const hasGames = useWarmupHasGames();
  if (!hasGames) return null;
  return (
    <View testID="today-warmup-panel" style={style}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: titleColor }]}>{triLang(lang, COPY.title)}</Text>
        <Text style={[s.note, { color: noteColor }]}>{triLang(lang, COPY.note)}</Text>
      </View>
      <WarmupTodayRow style={s.row} />
    </View>
  );
}

const s = StyleSheet.create({
  // `.pan .hd2`: заголовок слева, пометка справа по базовой линии, отступ снизу 4
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  title: { flexShrink: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  note: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  // `.pan` с `padding-bottom: 10px` — у строки свой нижний воздух
  row: { marginBottom: 4 },
});

export default memo(WarmupTodayPanel);
