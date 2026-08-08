import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';

/**
 * Cue for the moment the learner deliberately opens a hint.
 *
 * зачем: подсказку раскрывают РАЗНЫЕ экраны (свайп-флешкарты «Показать ответ»,
 * 50/50 в уроке), и звук у этого действия должен быть один и тот же. Хук —
 * единственное место, где живут scope и id, чтобы экраны не расходились.
 *
 * Осознанно НЕ вызывается для подсказок, которые появляются сами (авто-хинт
 * после двух промахов, грамматическая плашка): по плану звук привязан к
 * действию пользователя, а не к появлению элемента на экране.
 */
export function useHintRevealCue() {
  const playHintReveal = useCallback(() => {
    soundDirector.request('pm.learn.hint_reveal', {
      scope: 'hint-reveal',
      dedupeKey: 'hint',
    });
  }, []);

  return { playHintReveal };
}
