// ═══════════════════════════════════════════════════════════════════════════
// use_phrase_workshop_session.ts — источник фраз «Мастерской фраз» для экрана старого урока (lesson1.tsx).
//
// зачем (владелец 25.10, макет утверждён «Да, так»; координатор: «режим на движке lesson1 через новый источник данных»):
// по прецеденту комбо-урока экран остаётся тем же, меняется только источник фраз и ключи хранилища. Хук читает банк фраз
// урока V2 (локально, 0 сети), строит проход до 50 фраз (воспроизводимо по seed этого входа) и говорит экрану:
// режим включён ли (флаг + параметр workshop=1), готовы ли фразы и не закрыт ли режим (банк тоньше порога — прямая ссылка
// не должна открыть пустую мастерскую). Банк берётся из памяти (список «Все уроки» его уже читал), иначе читается здесь.
// Журнал [PHRASE-WORKSHOP]: вход, откуда банк (кэш/диск), сколько фраз, причина закрытия.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';

import type { LessonPhrase } from './lesson_data_types';
import { loadLearningV2LessonBankV1 } from './learning_v2_lesson_phrase_bank_v1';
import { peekLearningV2LessonBankV1, rememberLearningV2LessonBankV1 } from './learning_v2_lesson_phrase_bank_cache_v1';
import type { LearningV2LessonBankPhraseV1 } from './learning_v2_lesson_phrase_bank_core_v1';
import { phraseWorkshopPhraseId, phraseWorkshopRound } from './phrase_workshop_adapter_v1';
import { isPhraseWorkshopEnabled } from './phrase_workshop_flag';
import { PHRASE_WORKSHOP_MIN_BANK_PHRASES } from './phrase_workshop_model';
import { swapPhraseWorkshopRound } from './phrase_workshop_progress_v1';

const LOG = '[PHRASE-WORKSHOP]';
const NO_ROWS: readonly LessonPhrase[] = Object.freeze([]);

export type PhraseWorkshopSession = Readonly<{
  /** Режим включён: флаг и параметр workshop=1. */
  active: boolean;
  /** Фразы прохода (пусто, пока банк читается или режим выключен). */
  rows: readonly LessonPhrase[];
  /** Банк прочитан (из памяти или с диска). */
  ready: boolean;
  /** Банк тоньше порога: режим закрыт, экран должен выйти. */
  closed: boolean;
  /** id фразы прохода → номер занятия V2, откуда она пришла (для теории: вступление именно этого занятия). */
  sessionByPhraseId: ReadonlyMap<string, number>;
  /**
   * Id хранилища прогресса прохода. Пока фразы читаются — «pending», потом свой на вход (seed): смена id перезапускает
   * чтение прогресса на экране уже с готовыми фразами, а прошлый вход не воскресает на другой выборке.
   */
  storageId: string;
}>;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function isPhraseWorkshopParam(value: string | string[] | undefined): boolean {
  return isPhraseWorkshopEnabled() && firstParam(value) === '1';
}

export function usePhraseWorkshopSession(
  workshopParam: string | string[] | undefined,
  lessonOrdinal: number,
  studyTarget: string,
): PhraseWorkshopSession {
  const active = isPhraseWorkshopParam(workshopParam);
  // seed — на вход в экран: новый заход = новая выборка; сохранённый прогресс мастерской при входе стирается (см. lesson1)
  const [seed] = useState(() => (Date.now() % 2147483647) || 1);
  const [bank, setBank] = useState<readonly LearningV2LessonBankPhraseV1[] | null>(() => (active ? peekLearningV2LessonBankV1(studyTarget, lessonOrdinal) : null));

  useEffect(() => {
    if (!active) return undefined;
    console.log(`${LOG} session:enter`, JSON.stringify({ lesson: lessonOrdinal, target: studyTarget, bankSource: bank ? 'memory' : 'disk', bankPhrases: bank?.length ?? null, seed }));
    if (bank) return undefined;
    let cancelled = false;
    void loadLearningV2LessonBankV1(studyTarget, lessonOrdinal)
      .then((rows) => {
        if (cancelled) return;
        rememberLearningV2LessonBankV1(studyTarget, lessonOrdinal, rows);
        console.log(`${LOG} session:bank_loaded`, JSON.stringify({ lesson: lessonOrdinal, bankPhrases: rows.length }));
        setBank(rows);
      })
      .catch((error: unknown) => {
        console.warn(`${LOG} session:bank_failed`, JSON.stringify({ lesson: lessonOrdinal, reason: error instanceof Error ? error.message : String(error) }));
        if (!cancelled) setBank([]);
      });
    return () => { cancelled = true; };
    // bank читаем один раз на входе: дальше проход держится на выбранных фразах
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lessonOrdinal, studyTarget]);

  const rows = useMemo(() => (active && bank ? phraseWorkshopRound(bank, seed) : NO_ROWS), [active, bank, seed]);
  const closed = active && bank !== null && bank.length < PHRASE_WORKSHOP_MIN_BANK_PHRASES;
  useEffect(() => {
    if (closed) console.warn(`${LOG} session:closed`, JSON.stringify({ lesson: lessonOrdinal, bankPhrases: bank?.length ?? 0, min: PHRASE_WORKSHOP_MIN_BANK_PHRASES }));
  }, [bank, closed, lessonOrdinal]);

  const ready = active && bank !== null && !closed;
  const storageId = ready ? `workshop_${lessonOrdinal}_${seed}` : `workshop_${lessonOrdinal}_pending`;
  useEffect(() => {
    if (!ready) return;
    void swapPhraseWorkshopRound(lessonOrdinal, studyTarget, storageId).catch((error: unknown) => {
      console.warn(`${LOG} round:swap_failed`, JSON.stringify({ lesson: lessonOrdinal, storageId, reason: error instanceof Error ? error.message : String(error) }));
    });
  }, [lessonOrdinal, ready, storageId, studyTarget]);

  const sessionByPhraseId = useMemo(() => {
    const map = new Map<string, number>();
    if (active && bank) for (const entry of bank) map.set(phraseWorkshopPhraseId(entry), entry.sourceSessionOrdinal);
    return map;
  }, [active, bank]);

  return { active, rows, ready, closed, storageId, sessionByPhraseId };
}
