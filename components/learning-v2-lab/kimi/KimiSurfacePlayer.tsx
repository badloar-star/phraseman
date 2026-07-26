// зачем: владелец открыл V2 в Metro и не увидел новых режимов — портированные
// поверхности Kimi не были подключены к экрану. Этот плеер их и открывает:
// даёт поверхности состояние (LabProvider) и гоняет цикл «как у Duolingo»
// (решение владельца): выбрал ответ → «Проверить» → короткий inline-processing →
// success/needs_work → «Дальше». Никакой служебной панели переключения состояний.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import TapScale from '../../TapScale';
import { LabProvider, type LabIntentEvent } from './LabState';
import type { KimiSurfaceEntry } from './registry';
import { C, RADIUS, SPACE, TEXT, WEIGHT, type CanonicalState } from './tokens';

const PROCESSING_MS = 700;

export interface KimiSurfacePlayerProps {
  readonly entry: KimiSurfaceEntry;
  readonly title: string;
  readonly onClose: () => void;
}

export const KimiSurfacePlayer = memo(function KimiSurfacePlayer(props: KimiSurfacePlayerProps) {
  const { entry, title, onClose } = props;
  const [state, setState] = useState<CanonicalState>('prompt');
  const attemptRef = useRef(0);

  // зачем: защита от гонок — поздний таймер не должен затирать свежее состояние,
  // если пользователь уже нажал «Дальше» или закрыл режим.
  const tokenRef = useRef(0);
  useEffect(
    () => () => {
      tokenRef.current += 1;
    },
    [],
  );

  /**
   * Цикл вердикта. Первая проверка → needs_work, вторая → success: владелец
   * видит ОБА исхода, не подбирая специально неверный ответ.
   */
  const handleIntent = useCallback((event: LabIntentEvent) => {
    const { intent } = event;
    if (intent === 'activity.start') {
      setState('active');
      return;
    }
    if (intent === 'activity.submit') {
      const token = ++tokenRef.current;
      setState('processing');
      // Короткая inline-обработка полосой в feedback lane, не спиннер на экран.
      setTimeout(() => {
        if (tokenRef.current !== token) return;
        setState(attemptRef.current === 0 ? 'needs_work' : 'success');
        attemptRef.current += 1;
      }, PROCESSING_MS);
      return;
    }
    if (intent === 'activity.retry' || intent === 'voice.retry.focused' || intent === 'voice.retry.free') {
      tokenRef.current += 1;
      setState('active');
      return;
    }
    if (intent === 'activity.continue') {
      // Круг пройден — начинаем заново, режим можно гонять сколько нужно.
      tokenRef.current += 1;
      attemptRef.current = 0;
      setState('prompt');
      return;
    }
    if (intent === 'activity.resume') {
      tokenRef.current += 1;
      setState('active');
    }
  }, []);

  const Surface = entry.Component;

  return (
    <View style={s.root}>
      <View style={s.bar}>
        <TapScale
          onPress={onClose}
          withHaptic
          scaleTo={0.94}
          accessibilityLabel="Закрыть режим"
          style={s.back}
          testID="kimi-player-close"
        >
          <Ionicons name="chevron-back" size={22} color={C.fgPrimary} />
        </TapScale>
        <View style={s.barTexts}>
          <Text style={s.barTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.barId} numberOfLines={1}>
            {entry.surfaceId}
          </Text>
        </View>
      </View>
      <View style={s.surface}>
        {/* зачем: состояние управляемое — источник правды один (плеер), поверхность
            при этом НЕ размонтируется, поэтому выбранный вариант и собранная
            строка переживают переход в processing и обратно. */}
        <LabProvider state={state} onIntent={handleIntent}>
          <Surface />
        </LabProvider>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgCanvas },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    backgroundColor: C.bgSurface,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgSubtle,
  },
  barTexts: { flex: 1, minWidth: 0 },
  barTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  barId: { fontSize: TEXT.xs, color: C.fgSecondary },
  surface: { flex: 1 },
});
