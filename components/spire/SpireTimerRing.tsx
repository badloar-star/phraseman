// ═══════════════════════════════════════════════════════════════════════════
// SpireTimerRing.tsx — кольцевой таймер на ВСЮ ступень (макет §4, .ring).
//
// зачем: у Шпиля один таймер на 10 заданий (T8), а не на задание, как у Арены.
// Кольцо подписано на clock раннера и перерисовывается само, не дёргая весь экран
// ступени каждые 250 мс. На паузе (показ ошибки / свёрнуто / шторка выхода) дуга
// серая и под временем подпись «таймер на паузе».
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Lang } from '../../constants/i18n';
import type { SpireClock } from '../../app/spire/use_spire_step_runner';
import { useSpirePalette } from './useSpirePalette';
import { spireClock, spireGameText } from './spire_game_strings';

const SIZE = 132;
const R = 59;
// зачем (призрак друга): метка на кольце считает свою точку от тех же размеров — экспорт, а не копия чисел
export const SPIRE_RING_SIZE = SIZE;
export const SPIRE_RING_R = R;
const STROKE = 7;
const CIRC = 2 * Math.PI * R;

type Props = Readonly<{ lang: Lang; clock: SpireClock; budgetMs: number; paused: boolean }>;

function SpireTimerRing({ lang, clock, budgetMs, paused }: Props) {
  const p = useSpirePalette();
  const elapsed = useSyncExternalStore(clock.subscribe, clock.get, clock.get);
  const left = Math.max(0, budgetMs - elapsed);
  const frac = budgetMs > 0 ? left / budgetMs : 0;
  const text = spireClock(left);
  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={spireGameText(lang, 'timeLeft', { t: text })}
      testID="spire-step-ring"
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={p.control} strokeWidth={STROKE} />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={paused ? p.textMuted : p.accentText}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={CIRC * (1 - frac)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={s.center} pointerEvents="none">
        <Text style={[s.time, { color: p.text }]}>{text}</Text>
      </View>
      {/* зачем (spire-gaps-states, координатор 12.10): подпись «таймер на паузе» висит под кольцом абсолютно и места в потоке не занимает — пауза не сдвигает ни кольцо, ни вопрос */}
      <Text importantForAccessibility={paused ? 'auto' : 'no'} style={[s.paused, { color: p.textSecondary, opacity: paused ? 1 : 0 }]}>
        {spireGameText(lang, 'timerPaused')}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', width: SIZE },
  center: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  paused: { position: 'absolute', top: SIZE + 8, left: 0, right: 0, textAlign: 'center', fontSize: 13, lineHeight: 17, fontWeight: '600' },
});

export default memo(SpireTimerRing);
