// ═══════════════════════════════════════════════════════════════════════════
// use_phrase_workshop_entries.ts — состояние входа «Мастерской фраз» для строк списка «Все уроки».
//
// зачем (владелец 25.10; координатор): список уроков должен знать, у каких уроков показать кнопку и в каком виде.
// Решает чистая модель phraseWorkshopEntryState; хук собирает входы: флаг, число пройденных занятий (из строки), Plus
// (usePremium, не подтверждённый статус = без Plus — fail-closed) и число фраз в локальном банке урока.
// Firebase-экономия: банк читается ТОЛЬКО из AsyncStorage и ТОЛЬКО для пройденных уроков (0 сети, 0 Firestore);
// при выключенном флаге хук не читает ничего. Журнал [PHRASE-WORKSHOP]: значение, которое решило состояние.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';

import { usePremium } from '../../PremiumContext';
import { useStudyTarget } from '../../StudyTargetContext';
import { loadLearningV2LessonBankV1 } from '../../../app/learning_v2_lesson_phrase_bank_v1';
import { rememberLearningV2LessonBankV1 } from '../../../app/learning_v2_lesson_phrase_bank_cache_v1';
import { isPhraseWorkshopEnabled } from '../../../app/phrase_workshop_flag';
import {
  PHRASE_WORKSHOP_LESSON_SESSION_TOTAL,
  phraseWorkshopEntryReason,
  phraseWorkshopEntryState,
  type PhraseWorkshopEntryState,
} from '../../../app/phrase_workshop_model';

const LOG = '[PHRASE-WORKSHOP]';

type RowLike = Readonly<{ ordinal: number; completedCount: number }>;

/** Пустая карта — одна замороженная константа (стабильная ссылка для extraData списка). */
const NO_ENTRIES: ReadonlyMap<number, PhraseWorkshopEntryState> = Object.freeze(new Map<number, PhraseWorkshopEntryState>());

export function usePhraseWorkshopEntries(rows: readonly RowLike[]): ReadonlyMap<number, PhraseWorkshopEntryState> {
  const enabled = isPhraseWorkshopEnabled();
  const { hasPremiumAccess, accessResolved } = usePremium();
  const { studyTarget } = useStudyTarget();
  const target = String(studyTarget);
  const hasPlus = accessResolved === true && hasPremiumAccess === true;
  const passed = useMemo(
    () => rows.filter((row) => row.completedCount >= PHRASE_WORKSHOP_LESSON_SESSION_TOTAL).map((row) => row.ordinal),
    [rows],
  );
  const passedKey = passed.join(',');
  const [bank, setBank] = useState<Readonly<Record<number, number>>>({});

  useEffect(() => {
    if (!enabled || passed.length === 0) return undefined;
    let cancelled = false;
    void (async () => {
      const next: Record<number, number> = {};
      for (const ordinal of passed) {
        try {
          const phrases = await loadLearningV2LessonBankV1(target, ordinal);
          // кладём в память: экран режима берёт банк синхронно и открывается без ожидания (правило «раздел открывается мгновенно»)
          rememberLearningV2LessonBankV1(target, ordinal, phrases);
          next[ordinal] = phrases.length;
        } catch (error: unknown) {
          next[ordinal] = 0;
          console.warn(`${LOG} bank_read_failed`, JSON.stringify({ ordinal, reason: error instanceof Error ? error.message : String(error) }));
        }
      }
      if (!cancelled) setBank(next);
    })();
    return () => { cancelled = true; };
    // passedKey — стабильный ключ списка пройденных уроков; сам массив пересоздаётся при каждом рендере строк
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, passedKey, target]);

  // зачем (Ревизор 25.10, скорость): карта идёт в extraData FlatList «Всех уроков» — новый пустой Map на каждый пересчёт строк
  // давал лишний перерендер всех строк при выключенном флаге. Пустая карта — одна замороженная константа; непустая с тем же
  // содержимым возвращается прежней ссылкой.
  const previousRef = useRef<ReadonlyMap<number, PhraseWorkshopEntryState>>(NO_ENTRIES);
  return useMemo(() => {
    const out = new Map<number, PhraseWorkshopEntryState>();
    if (!enabled) return NO_ENTRIES;
    for (const row of rows) {
      const input = { enabled, completedSessions: row.completedCount, bankPhrases: bank[row.ordinal] ?? 0, hasPlus };
      const state = phraseWorkshopEntryState(input);
      if (state !== 'hidden') {
        out.set(row.ordinal, state);
        console.log(`${LOG} state`, JSON.stringify({ ordinal: row.ordinal, state, why: phraseWorkshopEntryReason(input) }));
      }
    }
    const previous = previousRef.current;
    const same = out.size === previous.size && [...out].every(([ordinal, state]) => previous.get(ordinal) === state);
    const next = out.size === 0 ? NO_ENTRIES : same ? previous : out;
    previousRef.current = next;
    return next;
  }, [bank, enabled, hasPlus, rows]);
}
