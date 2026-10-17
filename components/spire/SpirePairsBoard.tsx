// ═══════════════════════════════════════════════════════════════════════════
// SpirePairsBoard.tsx — «Соедини пары» в Пике: все пары на одном экране, две колонки.
//
// зачем (владелец 17.10: «пары все на экране»; координатор): задание «пары» рисовалось по одному слову («1 / 6») —
// человек не видел поле целиком. Теперь слева слова пунктов, справа их переводы вперемешку; тап по слову слева
// (или справа), затем по паре. Верная пара сразу гаснет (локально, без ожидания раннера), неверная — мягкая
// подсветка и сброс. Когда все пары найдены, отчёт уходит раннеру в прежнем формате: выбранный вариант по каждому
// пункту (spireReportSteps / submitItems). Ошибка хотя бы в одном пункте — в отчёт уходит неверный вариант этого
// пункта: строгость прежняя, как у списка по одному слову.
// Верный вариант пункта знает раннер по отпечаткам (spireRevealItemIndexes) и передаёт сюда — сеть не нужна.
// Лог [SPIRE-PAIRS]: вход, каждая пара (верно/неверно), итог.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import V2Pressable from '../v2/V2Pressable';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';

type Item = Readonly<{ prompt: string; options: readonly string[] }>;

type Props = Readonly<{
  taskId: string;
  items: readonly Item[];
  /** Верный вариант по каждому пункту (индекс в options). */
  answers: readonly number[];
  disabled: boolean;
  onItems: (selections: readonly number[]) => void;
}>;

const LOG = '[SPIRE-PAIRS]';
const WRONG_FLASH_MS = 450;
const FADE_MS = 180;

/** Порядок правой колонки: стабильная перестановка по taskId (одинаковая при перерисовке, разная у разных заданий). */
export function spirePairsRightOrder(taskId: string, count: number): number[] {
  let seed = 0;
  for (let i = 0; i < taskId.length; i += 1) seed = (seed * 31 + taskId.charCodeAt(i)) >>> 0;
  const order = Array.from({ length: count }, (_unused, i) => i);
  for (let i = count - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  // не оставляем правую колонку в том же порядке, что левая (иначе пары читаются построчно)
  if (count > 1 && order.every((v, i) => v === i)) order.push(order.shift() as number);
  return order;
}

/** Вариант, который уходит в отчёт за ошибочный пункт: выбранный текст, если он есть среди вариантов пункта, иначе первый неверный. */
export function spirePairsWrongIndex(item: Item, correctIndex: number, pickedText: string): number {
  const asOption = item.options.findIndex((text, i) => i !== correctIndex && text === pickedText);
  if (asOption >= 0) return asOption;
  const firstWrong = item.options.findIndex((_text, i) => i !== correctIndex);
  return firstWrong >= 0 ? firstWrong : correctIndex;
}

type Side = 'left' | 'right';
type TileTone = 'idle' | 'selected' | 'wrong' | 'matched';

const Tile = memo(function Tile({ label, tone, disabled, onPress, testID }: Readonly<{ label: string; tone: TileTone; disabled: boolean; onPress: () => void; testID: string }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // верная пара гаснет быстро, ease-out: подтверждение, а не событие
    Animated.timing(fade, { toValue: tone === 'matched' ? 0.28 : 1, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fade, tone]);
  // зачем (храповик light_accent_graphics): заливка выбранной плитки — графика темы, берём accentGraphic (в тёмном = accent, в светлом виден)
  // зачем ([BLEND-AUDIT] 18.10): при 0,16 выбранная плитка отличалась от обычной тоном на 1,04–1,07:1 (почти не видно); 0,32 даёт ≥1,59:1 во всех 23 темах, подпись остаётся ≥7,3:1
  const bg = tone === 'selected' ? lv2Alpha(p.accentGraphic, 0.32)
    : tone === 'wrong' ? lv2Alpha(p.wrong, 0.12)
      : tone === 'matched' ? lv2Alpha(p.correct, 0.12)
        : p.card;
  return (
    <Animated.View style={{ opacity: fade }}>
      <V2Pressable
        onPress={onPress}
        disabled={disabled || tone === 'matched'}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || tone === 'matched', selected: tone === 'selected' }}
        style={[s.tile, { backgroundColor: bg }, sh.nested]}
        testID={testID}
      >
        <Text style={[s.tileText, { color: p.text }]}>{label}</Text>
      </V2Pressable>
    </Animated.View>
  );
});

function SpirePairsBoard({ taskId, items, answers, disabled, onItems }: Props) {
  const count = items.length;
  const rightOrder = useMemo(() => spirePairsRightOrder(taskId, count), [count, taskId]);
  const rightText = useCallback((itemIndex: number) => items[itemIndex]?.options[answers[itemIndex]] ?? '', [answers, items]);
  // левая и правая колонки гаснут раздельно: у двух пунктов может совпасть перевод — тогда годится любая из одинаковых плиток
  const [matchedLeft, setMatchedLeft] = useState<ReadonlySet<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<ReadonlySet<number>>(() => new Set());
  const [picked, setPicked] = useState<Readonly<{ side: Side; itemIndex: number }> | null>(null);
  const [flash, setFlash] = useState<Readonly<{ left: number; right: number }> | null>(null);
  const mistakesRef = useRef(new Map<number, number>()); // пункт → вариант для отчёта
  const lockRef = useRef(false); // защита от двойного тапа: пока мигает ошибка или ушёл отчёт — касания не считаются
  const submittedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log(LOG, 'enter', JSON.stringify({ taskId, pairs: count })); // guard-ok: одна строка на задание
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, [count, taskId]);

  const resolve = useCallback((leftItem: number, rightItem: number) => {
    if (leftItem === rightItem || rightText(leftItem) === rightText(rightItem)) {
      const next = new Set(matchedLeft);
      next.add(leftItem);
      const nextRight = new Set(matchedRight);
      nextRight.add(rightItem);
      setMatchedLeft(next);
      setMatchedRight(nextRight);
      setPicked(null);
      console.log(LOG, 'pair:ok', JSON.stringify({ taskId, item: leftItem, found: next.size, of: count })); // guard-ok: ветка решения
      if (next.size === count && !submittedRef.current) {
        submittedRef.current = true;
        lockRef.current = true;
        const selections = answers.map((correct, i) => mistakesRef.current.get(i) ?? correct);
        console.log(LOG, 'done', JSON.stringify({ taskId, mistakes: mistakesRef.current.size, verdict: mistakesRef.current.size === 0 ? 'ok' : 'wrong' })); // guard-ok: итог задания
        onItems(selections);
      }
      return;
    }
    if (!mistakesRef.current.has(leftItem)) {
      mistakesRef.current.set(leftItem, spirePairsWrongIndex(items[leftItem], answers[leftItem], rightText(rightItem)));
    }
    console.log(LOG, 'pair:wrong', JSON.stringify({ taskId, item: leftItem, tapped: rightItem, mistakes: mistakesRef.current.size })); // guard-ok: ветка решения
    lockRef.current = true;
    setPicked(null);
    setFlash({ left: leftItem, right: rightItem });
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      setFlash(null);
      lockRef.current = false;
    }, WRONG_FLASH_MS);
  }, [answers, count, items, matchedLeft, matchedRight, onItems, rightText, taskId]);

  const tap = useCallback((side: Side, itemIndex: number) => {
    if (disabled || lockRef.current || (side === 'left' ? matchedLeft : matchedRight).has(itemIndex)) {
      console.log(LOG, 'tap:ignored', JSON.stringify({ taskId, side, item: itemIndex, disabled, locked: lockRef.current })); // guard-ok: ранний выход
      return;
    }
    if (!picked || picked.side === side) {
      setPicked(picked && picked.side === side && picked.itemIndex === itemIndex ? null : { side, itemIndex });
      return;
    }
    const leftItem = side === 'left' ? itemIndex : picked.itemIndex;
    const rightItem = side === 'right' ? itemIndex : picked.itemIndex;
    resolve(leftItem, rightItem);
  }, [disabled, matchedLeft, matchedRight, picked, resolve, taskId]);

  const toneOf = (side: Side, itemIndex: number): TileTone => {
    if ((side === 'left' ? matchedLeft : matchedRight).has(itemIndex)) return 'matched';
    if (flash && (side === 'left' ? flash.left : flash.right) === itemIndex) return 'wrong';
    if (picked && picked.side === side && picked.itemIndex === itemIndex) return 'selected';
    return 'idle';
  };

  return (
    <View style={s.board} testID="spire-pairs">
      <View style={s.column}>
        {items.map((item, i) => (
          <Tile key={`${taskId}:l${i}`} label={item.prompt} tone={toneOf('left', i)} disabled={disabled} onPress={() => tap('left', i)} testID={`spire-pair-left-${i}`} />
        ))}
      </View>
      <View style={s.column}>
        {rightOrder.map((itemIndex) => (
          <Tile key={`${taskId}:r${itemIndex}`} label={rightText(itemIndex)} tone={toneOf('right', itemIndex)} disabled={disabled} onPress={() => tap('right', itemIndex)} testID={`spire-pair-right-${itemIndex}`} />
        ))}
      </View>
    </View>
  );
}

export default memo(SpirePairsBoard);

// 6 пар на ~360 dp без прокрутки: плитка от 48, зазор 8 → колонка ~328; текст переносится, не обрезается
const s = StyleSheet.create({
  board: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 8 },
  tile: { minHeight: 48, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  tileText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
});
