import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../PressableHybrid';
import { LinearGradient } from '../SafeLinearGradient';
import type { Lang } from '../../constants/i18n';
import {
  lessonsGlassAlpha,
  lessonsGlassCardStyle,
  lessonsListCopy,
  LessonsListStars,
  type LessonsListGlass,
} from './LessonsListGlassKit';

// зачем (владелец 2026-09-30): карточка урока `.lc` из learn.html — круг 44 с номером слева,
// название 17/22, строка состояния (звёзды D36 / полоска прогресса / «Открыт» / замок), шеврон.
// Пять состояний макета и только они: пройден, в процессе, открыт, Plus, замок прогресса.
// Цен и кнопок покупки в карточке нет (в 2.0 отметка покупки урока снята). Нажатие только
// сообщает номер урока наверх: доступ решает прежний обработчик в app/(tabs)/lessons.tsx.

export type LessonsListCardState =
  | { kind: 'done'; stars: 0 | 1 | 2 | 3 }
  | { kind: 'progress'; pct: number }
  | { kind: 'open' }
  | { kind: 'plus' }
  | { kind: 'locked'; prevNum: number };

type Props = {
  glass: LessonsListGlass;
  lang: Lang;
  num: number;
  name: string;
  state: LessonsListCardState;
  current: boolean;
  onPressLesson: (num: number) => void;
};

const CIRCLE = 44;

function statusText(lang: Lang, state: LessonsListCardState): string {
  switch (state.kind) {
    case 'done': return state.stars > 0
      ? `${lessonsListCopy.done(lang)}, ${lessonsListCopy.stars(lang, state.stars)}`
      : lessonsListCopy.done(lang);
    case 'progress': return `${state.pct}%`;
    case 'open': return lessonsListCopy.open(lang);
    case 'plus': return lessonsListCopy.plus(lang);
    case 'locked': return lessonsListCopy.lockPrev(lang, state.prevNum);
  }
}

function NumberCircle({ glass, num, state, current }: {
  glass: LessonsListGlass;
  num: number;
  state: LessonsListCardState;
  current: boolean;
}) {
  const locked = state.kind === 'plus' || state.kind === 'locked';
  const done = state.kind === 'done';
  return (
    <View
      style={{
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? glass.cta : 'transparent',
        borderWidth: done ? 0 : 1, // guard-ok: 1 px кромка круга номера, как .num в макете
        borderColor: current && !locked ? lessonsGlassAlpha(glass.text, 0.55) : locked ? glass.line : glass.glassEdge, // guard-ok
      }}
    >
      {done ? (
        <Ionicons name="checkmark" size={20} color={glass.ctaInk} />
      ) : locked ? (
        <Ionicons name="lock-closed" size={18} color={glass.secondary} />
      ) : (
        <Text style={{ color: glass.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {num}
        </Text>
      )}
    </View>
  );
}

function StatusRow({ glass, lang, state }: { glass: LessonsListGlass; lang: Lang; state: LessonsListCardState }) {
  const muted = { color: glass.secondary, fontSize: 14, fontWeight: '600' as const };
  if (state.kind === 'done') {
    return (
      <>
        {state.stars > 0 ? <LessonsListStars glass={glass} count={state.stars} /> : null}
        <Text style={muted}>{lessonsListCopy.done(lang)}</Text>
      </>
    );
  }
  if (state.kind === 'progress') {
    const pct = Math.max(0, Math.min(100, Math.round(state.pct)));
    return (
      <>
        <View style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: glass.line, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, minWidth: 6, height: 6, borderRadius: 4, backgroundColor: glass.cta }} />
        </View>
        <Text style={[muted, { minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>{pct}%</Text>
      </>
    );
  }
  if (state.kind === 'plus') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Ionicons name="lock-closed" size={16} color={glass.secondary} />
        <Text style={[muted, { flexShrink: 1 }]}>{lessonsListCopy.plus(lang)}</Text>
      </View>
    );
  }
  const text = state.kind === 'open' ? lessonsListCopy.open(lang) : lessonsListCopy.lockPrev(lang, state.prevNum);
  return <Text style={[muted, { flexShrink: 1 }]}>{text}</Text>;
}

export const LessonsListGlassCard = React.memo(function LessonsListGlassCard({
  glass,
  lang,
  num,
  name,
  state,
  current,
  onPressLesson,
}: Props) {
  const locked = state.kind === 'plus' || state.kind === 'locked';
  const press = useCallback(() => onPressLesson(num), [num, onPressLesson]);
  return (
    <PressableHybrid
      testID={`lessons-row-${num}`}
      accessibilityRole="button"
      accessibilityLabel={`${lessonsListCopy.lesson(lang, num)}. ${name}. ${statusText(lang, state)}`}
      onPress={press}
      // зачем: вибрацию даёт прежний обработчик урока (hapticTap в onPress) — не дублируем.
      withHaptic={false}
      variant="card"
      pressScaleTo={0.975}
      style={{ marginHorizontal: 20, marginTop: 9 }}
      contentStyle={[
        lessonsGlassCardStyle(glass, 14),
        { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[glass.selected, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View style={{ opacity: locked ? 0.8 : 1 }}>
        <NumberCircle glass={glass} num={num} state={state} current={current} />
      </View>
      <View style={{ flex: 1, minWidth: 0, opacity: locked ? 0.8 : 1 }}>
        <Text style={{ color: glass.text, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, minHeight: 18 }}>
          <StatusRow glass={glass} lang={lang} state={state} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
});
