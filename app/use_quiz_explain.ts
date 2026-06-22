import { useCallback, useEffect, useRef, useState } from 'react';

import { callExplainQuiz, type ExplainQuizResponse } from './explain_quiz_client';

/**
 * Оркестрация ИИ-разбора для ТЕМАТИЧЕСКОГО квиза.
 *
 * Изолировано от квизов легко/средне/сложно: те показывают свои статичные разборы и этот хук
 * НЕ используют. Тематический квиз вызывает хук, как только пользователь ответил на вопрос:
 * один батч-вызов прогревает кэш (разбор правильного + по строке на каждый неверный вариант),
 * следующий игрок на том же вопросе получит готовое мгновенно ($0).
 *
 * Хук дёргает CF при появлении `answered=true` для текущего `questionKey`. Пока генерируется —
 * state='loading' (UI рисует шиммер). Если другой запрос уже генерирует (status='pending') —
 * один раз перезапрашивает через короткую паузу, чтобы поймать только что прогретый кэш.
 */
export type QuizExplainState = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface UseQuizExplainInput {
  /** Тематический ли это квиз и показан ли результат (есть выбранный/введённый ответ). */
  active: boolean;
  /** Стабильный ключ текущего вопроса; смена сбрасывает состояние и отбрасывает устаревшие ответы. */
  questionKey: string;
  /** Правильный английский вариант. */
  correctEn: string;
  /** Смысл вопроса на родном языке (для модели; не показывается). */
  questionPrompt: string;
  /** Неправильные варианты, как показаны пользователю. */
  wrongOptions: string[];
  /** Язык интерфейса пользователя. */
  lang: string;
}

export interface UseQuizExplainResult {
  state: QuizExplainState;
  /**
   * Текст разбора для конкретного варианта: для правильного — confirm, для неверного — строка
   * из карты options по точному тексту варианта. Возвращает null, если ещё не готово/недоступно.
   */
  explanationFor: (optionText: string, isCorrect: boolean) => string | null;
  /** Повторить запрос вручную (например, после 'unavailable'). */
  retry: () => void;
}

const PENDING_RETRY_DELAY_MS = 1600;

export function useQuizExplain(input: UseQuizExplainInput): UseQuizExplainResult {
  const { active, questionKey, correctEn, questionPrompt, wrongOptions, lang } = input;

  const [state, setState] = useState<QuizExplainState>('idle');
  const [batch, setBatch] = useState<ExplainQuizResponse | null>(null);

  // Зеркало ключа вопроса — читаем внутри async, чтобы отбросить ответ на уже сменившийся вопрос.
  const questionKeyRef = useRef(questionKey);
  questionKeyRef.current = questionKey;
  const inFlightRef = useRef(false);

  // Сброс при смене вопроса.
  useEffect(() => {
    setState('idle');
    setBatch(null);
    inFlightRef.current = false;
  }, [questionKey]);

  const run = useCallback(async (allowPendingRetry: boolean) => {
    if (inFlightRef.current) return;
    const myKey = questionKeyRef.current;
    inFlightRef.current = true;
    setState('loading');
    try {
      const res = await callExplainQuiz({ correctEn, questionPrompt, wrongOptions, lang });
      if (questionKeyRef.current !== myKey) return; // пользователь ушёл на другой вопрос
      if (res.status === 'ok' && res.confirm) {
        setBatch(res);
        setState('ready');
        return;
      }
      // 'pending' — другой запрос генерирует прямо сейчас. Подождём и заберём из кэша один раз.
      if (res.status === 'pending' && allowPendingRetry) {
        inFlightRef.current = false;
        setTimeout(() => {
          if (questionKeyRef.current === myKey) void run(false);
        }, PENDING_RETRY_DELAY_MS);
        return;
      }
      // 'rejected' / 'exhausted' / пусто — разбор недоступен; UI тихо скрывает блок.
      setState('unavailable');
    } catch {
      if (questionKeyRef.current === myKey) setState('unavailable');
    } finally {
      inFlightRef.current = false;
    }
  }, [correctEn, questionPrompt, wrongOptions, lang]);

  // Автозапуск, когда тематический квиз показал результат.
  useEffect(() => {
    if (!active) return;
    if (state !== 'idle') return;
    if (!correctEn || wrongOptions.length === 0) return;
    void run(true);
  }, [active, state, correctEn, wrongOptions.length, run]);

  const explanationFor = useCallback((optionText: string, isCorrect: boolean): string | null => {
    if (state !== 'ready' || !batch) return null;
    if (isCorrect) return batch.confirm || null;
    const wanted = String(optionText ?? '').trim().toLowerCase();
    const hit = Object.entries(batch.options).find(([key]) => key.trim().toLowerCase() === wanted);
    return hit ? hit[1] : null;
  }, [state, batch]);

  const retry = useCallback(() => {
    setState('idle');
    setBatch(null);
    inFlightRef.current = false;
  }, []);

  return { state, explanationFor, retry };
}
