import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TapScale from '../TapScale';
import { hapticSuccess, hapticError } from '../../hooks/use-haptics';
import { introText } from './theoryI18n';
import { triLang, type Lang } from '../../constants/i18n';
import type { IntroBuildInteraction } from '../../app/lesson_data_types';
import type { TheoryDrillProgressState } from '../../app/theory_progress';

/**
 * «Собери фразу руками» — Word-Bank Builder прямо в теории.
 *
 * Принципы (раунд 2):
 * - tap-only, без drag; тап-зоны ≥48dp.
 * - перевод-подсказка и слот-роли видны всегда (рабочая память 40+/50+).
 * - фидбэк без модалок: трясётся только неверный слот, мягкий danger.
 * - БЕЗ legacy reward/штрафов — теория это песочница.
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
    /** Тональные чип-фоны и текст на заливке — считает родитель по теме
     *  (светлая тема = тёмные альфы; см. drillTheme в TheoryLessonView). */
    chipBg: string;
    chipBgStrong: string;
    chipBgFaint: string;
    onAccentText: string;
  };
  /** Вызов при первом успехе (для прогресса теории; БЕЗ legacy reward). */
  onSolved?: () => void;
  initialProgress?: TheoryDrillProgressState;
  onProgressChange?: (state: TheoryDrillProgressState) => void;
}

type BankWord = { id: string; word: string };
type Slot = { word: string; bankId: string } | null;

function slotsFromProgress(progress: TheoryDrillProgressState | undefined, answerLength: number): Slot[] | null {
  if (!Array.isArray(progress?.slots) || progress.slots.length !== answerLength) return null;
  return progress.slots.map((slot) => {
    if (!slot) return null;
    return { word: slot.word, bankId: slot.bankId };
  });
}

function usedIdsFromSlots(slots: Slot[]): Set<string> {
  return new Set(slots.filter((slot): slot is Exclude<Slot, null> => !!slot).map((slot) => slot.bankId));
}

function statusFromProgress(progress: TheoryDrillProgressState | undefined): 'idle' | 'wrong' | 'solved' {
  return progress?.status === 'wrong' || progress?.status === 'solved' ? progress.status : 'idle';
}

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

// зачем (владелец 12.10, реестр п.76: английский интерфейс входит в R1): подсказка при ошибке в сборке правила была только
// по-русски, со вставкой слова из ответа. Запасное «этого слова» — тоже по языку.
function almostFeedback(lang: Lang, slot: string, expected: string): string {
  return triLang(lang, {
    ru: `Почти. Сверь с формулой: на месте «${slot || 'этого слова'}» должно быть ${expected}.`,
    uk: `Майже. Звір із формулою: на місці «${slot || 'цього слова'}» має бути ${expected}.`,
    en: `Almost. Check the formula: in place of "${slot || 'this word'}" it should be ${expected}.`,
    es: `Casi. Compara con la fórmula: en lugar de «${slot || 'esta palabra'}» va ${expected}.`,
    'pt-BR': `Quase. Confira a fórmula: no lugar de "${slot || 'esta palavra'}" deve vir ${expected}.`,
    vi: `Gần đúng. Đối chiếu công thức: ở vị trí "${slot || 'từ này'}" phải là ${expected}.`,
    id: `Hampir. Cocokkan dengan rumus: di tempat "${slot || 'kata ini'}" seharusnya ${expected}.`,
    tr: `Neredeyse. Formülle karşılaştır: "${slot || 'bu kelime'}" yerinde ${expected} olmalı.`,
    pl: `Prawie. Sprawdź wzór: w miejscu „${slot || 'tego słowa'}” powinno być ${expected}.`,
  });
}

export default function WordBankBuilder({
  data,
  lang,
  accent,
  theme,
  onSolved,
  initialProgress,
  onProgressChange,
}: Props) {
  const answer = data.answer;
  const bank: BankWord[] = useMemo(() => {
    const words = [...answer, ...(data.distractors ?? [])];
    return shuffle(words, answer.join('').length + words.length).map((w, i) => ({
      id: `${w}-${i}`,
      word: w,
    }));
  }, [answer, data.distractors]);

  const [slots, setSlots] = useState<Slot[]>(() => slotsFromProgress(initialProgress, answer.length) ?? answer.map(() => null));
  const [usedIds, setUsedIds] = useState<Set<string>>(() => usedIdsFromSlots(slotsFromProgress(initialProgress, answer.length) ?? []));
  const [status, setStatus] = useState<'idle' | 'wrong' | 'solved'>(() => statusFromProgress(initialProgress));
  const [wrongSlot, setWrongSlot] = useState<number | null>(() =>
    typeof initialProgress?.wrongSlot === 'number' ? initialProgress.wrongSlot : null,
  );
  const [misses, setMisses] = useState(() => initialProgress?.misses ?? 0);

  const prompt = introText(data.prompt, lang);
  const allFilled = slots.every((s) => s !== null);
  const checkLabel = triLang(lang, {
    ru: 'Проверить', uk: 'Перевірити', en: 'Check', es: 'Comprobar', 'pt-BR': 'Verificar', vi: 'Kiểm tra', id: 'Periksa', tr: 'Kontrol et', pl: 'Sprawdź',
  });
  const doneLabel = triLang(lang, {
    ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
  });

  useEffect(() => {
    const nextSlots = slotsFromProgress(initialProgress, answer.length) ?? answer.map(() => null);
    setSlots(nextSlots);
    setUsedIds(usedIdsFromSlots(nextSlots));
    setStatus(statusFromProgress(initialProgress));
    setWrongSlot(typeof initialProgress?.wrongSlot === 'number' ? initialProgress.wrongSlot : null);
    setMisses(initialProgress?.misses ?? 0);
  }, [initialProgress, answer]);

  const persist = useCallback(
    (nextSlots: Slot[], nextStatus: 'idle' | 'wrong' | 'solved', extra: Partial<TheoryDrillProgressState> = {}) => {
      onProgressChange?.({
        type: 'word_bank',
        status: nextStatus,
        slots: nextSlots,
        ...extra,
      });
    },
    [onProgressChange],
  );

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
      persist(next, 'idle');
    },
    [slots, usedIds, status, persist],
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
      persist(next, 'idle');
    },
    [slots, usedIds, status, persist],
  );

  const check = useCallback(() => {
    if (!allFilled) return;
    const assembled = slots.map((s) => s!.word);
    const ok = assembled.every((w, i) => w === answer[i]);
    if (ok) {
      setStatus('solved');
      hapticSuccess();
      persist(slots, 'solved');
      onSolved?.();
    } else {
      const idx = assembled.findIndex((w, i) => w !== answer[i]);
      setWrongSlot(idx);
      setStatus('wrong');
      hapticError();
      setMisses((m) => {
        const nextMisses = m + 1;
        persist(slots, 'wrong', { misses: nextMisses, wrongSlot: idx });
        return nextMisses;
      });
    }
  }, [allFilled, slots, answer, onSolved, persist]);

  // Подсветка правильного слова в банке после 2 промахов (escalating hint).
  const hintWord = misses >= 2 && wrongSlot != null ? answer[wrongSlot] : null;

  const slotLabel = (i: number): string => {
    const lbl = data.slotLabels?.[i];
    return lbl ? introText(lbl, lang) : '';
  };

  return (
    <View style={[styles.wrap, { borderColor: `${accent}33` }]}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>{/* зачем (LANG_AUDIT_CORE_R1, слово владельца 13.10): было «Подсказка» по-русски на любом языке */}{triLang(lang, { ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica', vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź' })}</Text>
      <Text style={[styles.prompt, { color: theme.textPrimary }]}>{prompt}</Text>

      <View style={[styles.slots, { backgroundColor: theme.chipBgFaint }]}>
        {slots.map((slot, i) => {
          if (!slot) {
            return (
              <View key={`empty-${i}`} style={[styles.slotEmpty, { borderColor: `${accent}55` }]}>
                <Text style={[styles.slotEmptyText, { color: theme.textMuted }]}>
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
              accessibilityLabel={triLang(lang, {
                ru: `Убрать ${slot.word}`, uk: `Прибрати ${slot.word}`, en: `Remove ${slot.word}`, es: `Quitar ${slot.word}`,
                'pt-BR': `Remover ${slot.word}`, vi: `Bỏ ${slot.word}`, id: `Hapus ${slot.word}`, tr: `${slot.word} kaldır`, pl: `Usuń ${slot.word}`,
              })}
              style={[
                styles.slotFilled,
                {
                  backgroundColor: isOk ? theme.correct : theme.chipBgStrong,
                  borderColor: isWrong ? theme.wrong : 'transparent',
                  borderWidth: isWrong ? 2 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.slotFilledText,
                  { color: isOk ? theme.onAccentText : theme.textPrimary },
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
                  backgroundColor: theme.chipBg,
                  opacity: used ? 0.25 : 1,
                  borderColor: glow ? theme.correct : 'transparent',
                  borderWidth: 0,
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
        accessibilityLabel={checkLabel}
        style={[
          styles.check,
          {
            backgroundColor: allFilled && status !== 'solved' ? accent : theme.chipBgFaint,
          },
        ]}
      >
        <Text
          style={[
            styles.checkText,
            { color: allFilled && status !== 'solved' ? theme.onAccentText : theme.textMuted },
          ]}
        >
          {status === 'solved' ? doneLabel : checkLabel}
        </Text>
      </TapScale>

      {status === 'solved' && (
        <View style={[styles.fb, { backgroundColor: `${theme.correct}22` }]}>
          <Text style={[styles.fbText, { color: theme.correct }]}>
            {triLang(lang, {
              ru: 'Узнал правило руками: ', uk: 'Засвоїв правило на практиці: ', en: 'You built the rule yourself: ',
              es: 'Aprendiste la regla con tus manos: ', 'pt-BR': 'Você montou a regra na prática: ', vi: 'Bạn đã tự ghép đúng quy tắc: ',
              id: 'Kamu menyusun aturannya sendiri: ', tr: 'Kuralı kendin kurdun: ', pl: 'Regułę złożyłeś sam: ',
            })}{answer.join(' ')}
          </Text>
        </View>
      )}
      {status === 'wrong' && wrongSlot != null && (
        <View style={[styles.fb, { backgroundColor: `${theme.wrong}1A` }]}>
          <Text style={[styles.fbText, { color: theme.wrong }]}>
            {almostFeedback(lang, slotLabel(wrongSlot), answer[wrongSlot] ?? '')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 14, borderWidth: 0, marginTop: 10 },
  hint: { fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  prompt: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 48, padding: 8, borderRadius: 10, marginBottom: 12 },
  slotEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 0,
    borderStyle: 'dashed',
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyText: { fontSize: 13, fontWeight: '700' },
  slotFilled: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  slotFilledText: { fontSize: 16, fontWeight: '600' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  word: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, minHeight: 48, justifyContent: 'center' },
  wordText: { fontSize: 16, fontWeight: '600' },
  check: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  checkText: { fontSize: 16, fontWeight: '700' },
  fb: { marginTop: 10, padding: 10, borderRadius: 10 },
  fbText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
