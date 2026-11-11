/**
 * Строка «Разминка на 4 минуты» для блока «Сегодня» — перенос из утверждённого макета
 * (docs/design/v2-app/elevate-real.js, строка `warm`: кнопка-треугольник, название, три деления, счёт «0/3»).
 * Владелец 11.11.2026: разминка — отдельная строка каждый день, над тремя заданиями дня, в их счёт не входит.
 *
 * зачем самодостаточная: Главная и экран «Сегодня» ничего не знают о разминке — строка сама читает, сколько игр
 * сыграно сегодня (из памяти процесса, без диска и сети — первый кадр сразу конечной высоты), и сама ведёт
 * на экран разминки. Строка «Три игры из твоих ошибок» из макета не выводится, пока разминка не собирается из ошибок.
 */
import React, { memo, useCallback, useRef, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useLang } from '../LangContext';
import { useV2Palette } from '../v2/useV2Palette';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { peekWarmup, subscribeWarmup, warmupPlayedCount } from '../../modules/games/warmup_state';

const NAV_GUARD_MS = 700;
const TITLE = { ru: 'Разминка на 4 минуты', uk: 'Розминка на 4 хвилини', es: 'Calentamiento de 4 minutos', en: '4-minute warm-up' } as const;

type Props = Readonly<{ style?: StyleProp<ViewStyle>; testID?: string }>;

function WarmupTodayRow({ style, testID = 'today-warmup-row' }: Props) {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeWarmup, peekWarmup, peekWarmup);
  const lastNavAt = useRef(0);
  const played = warmupPlayedCount(state);
  const total = state.games.length;
  const done = played >= total;
  const title = triLang(lang, TITLE);

  const onPress = useCallback(() => {
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GUARD_MS) return; // защита от двойного тапа
    lastNavAt.current = now;
    router.push('/warmup' as never);
  }, [router]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${played}/${total}`}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={({ pressed }) => [s.row, { backgroundColor: p.glassRaised }, pressed && s.pressed, style]}
    >
      <View style={[s.play, { backgroundColor: p.cta }]}>
        <Ionicons name={done ? 'checkmark' : 'play'} size={18} color={p.ctaText} />
      </View>
      <View style={s.copy}>
        <Text numberOfLines={1} style={[s.title, { color: p.text }]}>{title}</Text>
        <View style={s.marks}>
          {state.games.map((game) => (
            <View key={game.id} style={[s.mark, { backgroundColor: state.results[game.id] !== undefined ? p.correct : p.track }]} />
          ))}
        </View>
      </View>
      <Text style={[s.count, { color: p.text }]}>{`${played}/${total}`}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, padding: 8, borderRadius: 18 },
  pressed: { opacity: 0.86 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  marks: { flexDirection: 'row', gap: 4 },
  mark: { width: 22, height: 4, borderRadius: 2 },
  count: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(WarmupTodayRow);
