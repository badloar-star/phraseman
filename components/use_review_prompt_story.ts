// ═══════════════════════════════════════════════════════════════════════════
// use_review_prompt_story.ts — просьба об оценке кадром истории вместо окна.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): при включённых историях экран
// по-прежнему решает «пора просить» и поднимает `visible`, но окно не открывается — факт пишется в «Истории», экран сразу
// получает onClose и идёт дальше. Истории выключены (флаг stories_v1) — хук отвечает false, окно работает как раньше.
// Отдельный файл, а не правка окна: сторож tests/review_prompt_overlay_contract.test.ts держит в окне один запрос слота
// и один учёт показа — путь окна не тронут, у истории учёт свой.
// Учёт показа (счётчик и 30-дневная пауза) — после того как история записана; не записалась — не засчитываем, просьба вернётся.
// Журнал: [REVIEW-PROMPT].
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { DebugLogger } from '../app/debug-logger';
import { markReviewPrompted, type ReviewContext } from '../app/review_utils';
import { insteadStoryLanded, recordRateAppStory, storiesReplaceWindows } from '../modules/story_events/story_instead_sources';

const LOG = '[REVIEW-PROMPT]';

function localDayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type ReviewPromptStoryInput = Readonly<{ visible: boolean; context: ReviewContext; streakDays?: 7 | 14 | 30; onClose: () => void }>;

/** true — просьбу забрала история, окно показывать не нужно. */
export function useReviewPromptStory({ visible, context, streakDays, onClose }: ReviewPromptStoryInput): boolean {
  const storiesInstead = visible && storiesReplaceWindows();
  const sentRef = useRef(false);
  // зачем: onClose у экранов — новая функция на каждый рендер; держим свежую в ref, чтобы эффект не перезапускался
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!visible) { sentRef.current = false; return; }
    if (!storiesInstead) return; // истории выключены — работает окно
    if (sentRef.current) { DebugLogger.info(LOG, 'история: этот запрос уже отправлен — повтор пропущен'); return; }
    sentRef.current = true;
    void recordRateAppStory({ context, streakDays: streakDays ?? null, dayKey: localDayKey(new Date()) })
      .then(async (record) => {
        if (!insteadStoryLanded(record)) {
          DebugLogger.warn(LOG, `история не записана (${record.recorded ? 'ok' : record.reason}) — показ не засчитан, просьба вернётся`);
          return;
        }
        // зачем: счётчик показов и пауза — один раз на новую историю; повтор того же дня уже засчитан
        if (!record.recorded) { DebugLogger.info(LOG, 'история этого дня уже есть — показ повторно не засчитываем'); return; }
        DebugLogger.info(LOG, `история вместо окна context=${context}`);
        await markReviewPrompted();
      })
      .catch((e: unknown) => { DebugLogger.error('useReviewPromptStory:record', e instanceof Error ? e : new Error(String(e)), 'warning'); })
      // зачем: экран ждёт закрытия просьбы, чтобы идти дальше — сообщаем в любом исходе, иначе итог урока застрял бы
      .finally(() => { onCloseRef.current(); });
  }, [context, storiesInstead, streakDays, visible]);
  return storiesInstead;
}
