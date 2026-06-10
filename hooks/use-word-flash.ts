import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Вспышка плитки слова/ответа при нажатии — акцентным цветом темы.
 *
 * Единый хук для ВСЕХ экранов с выбором слов (lesson1, lesson_words, review,
 * quizzes, exam, personal_plan_exercise, trainer_phrases_session и т.д.), чтобы
 * объёмные плитки везде вели себя одинаково.
 *
 * Использование:
 *   const { flashKey, flash } = useWordFlash();
 *   // в onPress плитки:  flash(optionText);   // перед обработкой ответа
 *   // в стиле плитки:    const on = flashKey === optionText;
 *   //                    backgroundColor: on ? t.accent : t.bgCard ...
 *
 * Ключом может быть любая строка, уникально идентифицирующая плитку в текущем
 * наборе (текст варианта, или `${index}` если тексты повторяются).
 */
export function useWordFlash(durationMs = 260) {
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((key: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlashKey(key);
    timerRef.current = setTimeout(() => setFlashKey(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { flashKey, flash };
}
