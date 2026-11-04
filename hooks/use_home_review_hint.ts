// use_home_review_hint — читает локальную память карточек и отдаёт подсказку «Повторить N слов · M мин» (удобство №8, владелец 04.11).
// зачем: stale-while-revalidate — первый кадр из кэша процесса (без ожидания), затем один локальный перечит при входе на Главную; сеть не трогаем.
import { useEffect, useState } from 'react';
import { loadFlashcardStatuses } from '../app/flashcards/cardStatus';
import { buildHomeReviewHint, countDueWords, type HomeReviewHint } from '../app/home_review_hint';
import { useStudyTarget } from '../components/StudyTargetContext';

const LOG = '[HOME-REVIEW-HINT]';
const cache = new Map<string, HomeReviewHint | null>();

export function useHomeReviewHint(active: boolean): HomeReviewHint | null {
  const { studyTarget } = useStudyTarget();
  const key = String(studyTarget);
  const [hint, setHint] = useState<HomeReviewHint | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    setHint(cache.get(key) ?? null);
  }, [key]);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    loadFlashcardStatuses(studyTarget)
      .then((statuses) => {
        const due = countDueWords(statuses);
        const next = buildHomeReviewHint(due);
        cache.set(key, next);
        console.log(LOG, JSON.stringify({ target: key, cards: Object.keys(statuses).length, due, shown: next !== null, source: 'local_memory' })); // guard-ok: одна строка на вход на Главную
        if (alive) setHint(next);
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'не прочиталась память карточек, подсказка остаётся прежней', error instanceof Error ? error.message : String(error));
      });
    return () => { alive = false; };
  }, [active, key, studyTarget]);

  return hint;
}
