import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TapScale from '../TapScale';
import { hapticSuccess, hapticError } from '../../hooks/use-haptics';
import { introText } from './theoryI18n';
import type { Lang } from '../../constants/i18n';
import type { IntroBuildInteraction } from '../../app/lesson_data_types';

/**
 * «Собери фразу руками» — Word-Bank Builder прямо в теории.
 *
 * Принципы (раунд 2):
 * - tap-only, без drag; тап-зоны ≥48dp.
 * - перевод-подсказка и слот-роли видны всегда (рабочая память 40+/50+).
 * - фидбэк без модалок: трясётся только неверный слот, мягкий danger.
 * - БЕЗ XP/штрафов — теория это песочница.
 * - после 2 промахов подряд правильное слово в банке подсвечивается.
 */
interface Props {
  data: IntroBuildInteraction;
  lang: Lang;
  accent: string;
  theme: {
    textPrimary: string;
    textMuted: string;
    correct: string;
    wrong: string;
    bgCard: string;
  };
  /** Вызов при первом успехе (для прогресса теории; БЕЗ XP). */
  onSolved?: () => void;
}

type BankWord = { id: string; word: string };
type Slot = { word: string; bankId: string } | null;

function shuffle<T>(arr: T[], seed: number): T[] {
  // детерминированный шаффл (без Math.random — стабилен между рендерами)
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WordBankBuilder({ data, lang, accent, theme, onSolved }: Props) {
  const answer = data.answer;
  const bank: BankWord[] = useMemo(() => {
    const words = [...answer, ...(data.distractors ?? [])];
    return shuffle(words, answer.join('').length + words.length).map((w, i) => ({
      id: `${w}-${i}`,
      word: w,
    }));
  }, [answer, data.distractors]);

  const [slots, setSlots] = useState<Slot[]>(() => answer.map(() => null));
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'idle' | 'wrong' | 'solved'>('idle');
  const [wrongSlot, setWrongSlot] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);

  const prompt = introText(data.prompt, lang);
  const allFilled = slots.every((s) => s !== null);

  const pickWord = useCallback(
    (bw: BankWord) => {
      if (usedIds.has(bw.id) || status === 'solved') return;
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx === -1) return;
      const next = [...slots];
      next[emptyIdx] = { word: bw.word, bankId: bw.id };
      setSlots(next);
      setUsedIds(new Set([...usedIds, bw.id]));
      setStatus('idle');
      setWrongSlot(null);
    },
    [slots, usedIds, status],
  );

  const popSlot = useCallback(
    (idx: number) => {
      if (status === 'solved') return;
      const slot = slots[idx];
      if (!slot) return;
      const next = [...slots];
      next[idx] = null;
      setSlots(next);
      const u = new Set(usedIds);
      u.delete(slot.bankId);
      setUsedIds(u);
      setStatus('idle');
      setWrongSlot(null);
    },
    [slots, usedIds, status],
  );

  const check = useCallback(() => {
    if (!allFilled) return;
    const assembled = slots.map((s) => s!.word);
    const ok = assembled.every((w, i) => w === answer[i]);
    if (ok) {
      setStatus('solved');
      hapticSuccess();
      onSolved?.();
    } else {
      const idx = assembled.findIndex((w, i) => w !== answer[i]);
      setWrongSlot(idx);
      setStatus('wrong');
      hapticError();
      setMisses((m) => m + 1);
    }
  }, [allFilled, slots, answer, onSolved]);

  // Подсветка правильного слова в банке после 2 промахов (escalating hint).
  const hintWord = misses >= 2 && wrongSlot != null ? answer[wrongSlot] : null;

  const slotLabel = (i: number): string => {
    const lbl = data.slotLabels?.[i];
    return lbl ? introText(lbl, lang) : '';
  };

  return (
    <View style={[styles.wrap, { borderColor: `${accent}33` }]}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>Подсказка</Text>
      <Text style={[styles.prompt, { color: theme.textPrimary }]}>{prompt}</Text>

      <View style={[styles.slots, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
        {slots.map((slot, i) => {
          if (!slot) {
            return (
              <View key={`empty-${i}`} style={[styles.slotEmpty, { borderColor: `${accent}55` }]}>
                <Text style={[styles.slotEmptyText, { color: theme.textMuted }]} numberOfLines={1}>
                  {slotLabel(i) || '—'}
                </Text>
              </View>
            );
          }
          const isOk = status === 'solved';
          const isWrong = status === 'wrong' && wrongSlot === i;
          return (
            <TapScale
              key={`slot-${i}`}
              onPress={() => popSlot(i)}
              accessibilityRole="button"
              accessibilityLabel={`Убрать ${slot.word}`}
              style={[
                styles.slotFilled,
                {
                  backgroundColor: isOk ? theme.correct : 'rgba(255,255,255,0.10)',
                  borderColor: isWrong ? theme.wrong : 'transparent',
                  borderWidth: isWrong ? 2 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.slotFilledText,
                  { color: isOk ? '#0F1115' : theme.textPrimary },
                ]}
              >
                {slot.word}
              </Text>
            </TapScale>
          );
        })}
      </View>

      <View style={styles.bank}>
        {bank.map((bw) => {
          const used = usedIds.has(bw.id);
          const glow = hintWord != null && bw.word === hintWord && !used;
          return (
            <TapScale
              key={bw.id}
              onPress={() => pickWord(bw)}
              accessibilityRole="button"
              accessibilityLabel={bw.word}
              disabled={used}
              style={[
                styles.word,
                {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  opacity: used ? 0.25 : 1,
                  borderColor: glow ? theme.correct : 'transparent',
                  borderWidth: glow ? 2 : 0,
                },
              ]}
            >
              <Text style={[styles.wordText, { color: theme.textPrimary }]}>{bw.word}</Text>
            </TapScale>
          );
        })}
      </View>

      <TapScale
        onPress={check}
        withHaptic={false}
        disabled={!allFilled || status === 'solved'}
        accessibilityRole="button"
        accessibilityLabel="Проверить"
        style={[
          styles.check,
          {
            backgroundColor: allFilled && status !== 'solved' ? accent : 'rgba(255,255,255,0.04)',
          },
        ]}
      >
        <Text
          style={[
            styles.checkText,
            { color: allFilled && status !== 'solved' ? '#0F1115' : theme.textMuted },
          ]}
        >
          {status === 'solved' ? 'Готово' : 'Проверить'}
        </Text>
      </TapScale>

      {status === 'solved' && (
        <View style={[styles.fb, { backgroundColor: `${theme.correct}22` }]}>
          <Text style={[styles.fbText, { color: theme.correct }]}>
            Узнал правило руками: {answer.join(' ')}
          </Text>
        </View>
      )}
      {status === 'wrong' && wrongSlot != null && (
        <View style={[styles.fb, { backgroundColor: `${theme.wrong}1A` }]}>
          <Text style={[styles.fbText, { color: theme.wrong }]}>
            Почти. Сверь с формулой: на месте «{slotLabel(wrongSlot) || 'этого слова'}» должно быть{' '}
            {answer[wrongSlot]}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  hint: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  prompt: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 48, padding: 8, borderRadius: 10, marginBottom: 12 },
  slotEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyText: { fontSize: 12, fontWeight: '600' },
  slotFilled: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  slotFilledText: { fontSize: 16, fontWeight: '600' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  word: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, minHeight: 48, justifyContent: 'center' },
  wordText: { fontSize: 16, fontWeight: '600' },
  check: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  checkText: { fontSize: 15, fontWeight: '600' },
  fb: { marginTop: 10, padding: 10, borderRadius: 10 },
  fbText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
