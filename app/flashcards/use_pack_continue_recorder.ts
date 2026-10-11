/**
 * Запись позиции «Продолжить» из сессий тренировки — общий хук для «Устно», «Правды / лжи» и «Напиши».
 *
 * зачем (координатор 12.10, данные Ядра ee01d089a): герой хаба «Продолжить» показывает «Путешествия · 12 из 40», но писать позицию из сессий
 * никто не подключил. Хук сопоставляет колоду сессии с набором и вызывает recordPackContinuePosition(packId, index, total).
 * Правила: только локально (AsyncStorage через pack_continue_position, 0 Firestore); запись с задержкой ~1 с и обязательно при выходе с экрана;
 * если колода — не один набор (сохранённые, «мои карточки», смешанная тренировка, пусто), позиция НЕ пишется, причина идёт в журнал.
 * Лог: [PACK-CONTINUE-REC].
 */
import { useCallback, useEffect, useRef } from 'react';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { recordPackContinuePosition } from './pack_continue_position';

const LOG = '[PACK-CONTINUE-REC]';
/** Задержка записи: ответ в тренировке не должен писать в хранилище на каждый шаг. */
export const PACK_CONTINUE_DEBOUNCE_MS = 1000;

/** Один набор → его id; иначе null и причина. Ключи вида 'pack:<id>' | 'saved' | 'custom' | 'weak' (deckRefKey / FcDeckId). */
export function singlePackIdFromDeckKeys(keys: readonly string[]): { packId: string | null; reason: string } {
  if (keys.length === 0) return { packId: null, reason: 'no_decks' };
  if (keys.length > 1) return { packId: null, reason: `mixed_decks:${keys.length}` };
  const key = keys[0] ?? '';
  if (!key.startsWith('pack:')) return { packId: null, reason: `not_a_pack:${key || 'empty'}` };
  const packId = key.slice(5).trim();
  return packId ? { packId, reason: 'single_pack' } : { packId: null, reason: 'empty_pack_id' };
}

export function usePackContinueRecorder(
  deckKeys: readonly string[],
  mode: string,
): Readonly<{ record: (index: number, total: number) => void; flush: () => void }> {
  const { studyTarget } = useStudyTarget();
  const { packId, reason } = singlePackIdFromDeckKeys(deckKeys);
  const packIdRef = useRef<string | null>(packId);
  packIdRef.current = packId;
  const pendingRef = useRef<{ index: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedReasonRef = useRef<string | null>(null);

  useEffect(() => {
    if (packId || loggedReasonRef.current === reason) return;
    loggedReasonRef.current = reason;
    console.log(`${LOG} позиция не пишется`, JSON.stringify({ mode, reason })); // guard-ok: единичный лог на сессию, причина раннего выхода
  }, [mode, packId, reason]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    const id = packIdRef.current;
    pendingRef.current = null;
    if (!pending || !id) return;
    recordPackContinuePosition(studyTarget, { packId: id, index: pending.index, total: pending.total, mode });
  }, [mode, studyTarget]);

  const record = useCallback((index: number, total: number) => {
    if (!packIdRef.current) return;
    if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 0) return;
    pendingRef.current = { index: Math.max(0, Math.floor(index)), total: Math.floor(total) };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, PACK_CONTINUE_DEBOUNCE_MS);
  }, [flush]);

  // Выход с экрана: дописываем последнюю позицию, пока она не потерялась в таймере.
  useEffect(() => flush, [flush]);

  return { record, flush };
}
