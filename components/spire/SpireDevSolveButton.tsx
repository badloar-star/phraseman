/**
 * Пик, только отладочная сборка (__DEV__): «решить задание» — для замера [PEAK-PERF] на этажах 1→10.
 *
 * зачем (координатор 24.10; Сверка: вручную 10 этажей × 5–10 ступеней × 10 заданий не пройти): верный ответ восстанавливается по тем же
 * отпечаткам, что и подсказка «Правильно» (answer_reveal), и уходит обычным путём раннера — замер видит настоящий поток ответа.
 * Кнопка — строкой под заданием рядом с «пожаловаться», не поверх экрана (иначе путает замеры наложений). В релизе её нет:
 * StepBody подключает этот файл только при __DEV__ (сторож tests/spire_dev_solve_button.test.ts).
 */
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { DebugLogger } from '../../app/debug-logger';
import { useSpirePalette } from './useSpirePalette';
import { spireRevealChoiceIndex, spireRevealItemIndexes, spireRevealTokens } from '../../modules/spire/answer_reveal';

type Task = Readonly<{ taskId: string; kind?: string; payload: Readonly<Record<string, unknown>> }>;

export type SpireDevSolveProps = Readonly<{
  task: Task;
  saltId: string;
  fingerprints: readonly string[];
  onChoice: (index: number) => void;
  onTokens: (tokens: readonly string[]) => void;
  onItems: (selections: readonly number[]) => void;
}>;

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function SpireDevSolveButton({ task, saltId, fingerprints, onChoice, onTokens, onItems }: SpireDevSolveProps) {
  const pal = useSpirePalette();
  const solve = useCallback(() => {
    const p = task.payload;
    if (Array.isArray(p.items)) {
      const counts = (p.items as Record<string, unknown>[]).map((it) => (Array.isArray(it.options) ? it.options.length : 0));
      const picks = spireRevealItemIndexes(saltId, task.taskId, counts, fingerprints);
      DebugLogger.info('[SPIRE]', `[PEAK-PERF] dev-solve: пары ${task.taskId} найдено=${picks.filter((x) => x !== null).length}/${picks.length}`);
      if (picks.every((x): x is number => x !== null)) onItems(picks);
      return;
    }
    if (Array.isArray(p.wordBank)) {
      const bank = p.wordBank.map(text);
      const count = Number(p.correctTokenCount) || bank.length;
      const tokens = spireRevealTokens(saltId, task.taskId, bank, count, fingerprints[0] ?? '');
      DebugLogger.info('[SPIRE]', `[PEAK-PERF] dev-solve: сборка ${task.taskId} найден=${tokens ? 'да' : 'нет'}`);
      if (tokens) onTokens(tokens);
      return;
    }
    const options = Array.isArray(p.options) ? p.options : [];
    const index = spireRevealChoiceIndex(saltId, task.taskId, options.length, fingerprints[0] ?? '');
    DebugLogger.info('[SPIRE]', `[PEAK-PERF] dev-solve: выбор ${task.taskId} индекс=${index ?? '-'}`);
    if (index !== null) onChoice(index);
  }, [fingerprints, onChoice, onItems, onTokens, saltId, task]);
  return (
    <Pressable testID="spire-dev-solve" onPress={solve} accessibilityRole="button" hitSlop={8} style={[s.btn, { backgroundColor: pal.bgTop }]}>
      <Text style={[s.label, { color: pal.textSecondary }]}>DEV solve</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: '700' },
});

export default memo(SpireDevSolveButton);
