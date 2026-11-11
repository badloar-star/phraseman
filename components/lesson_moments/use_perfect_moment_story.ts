// ═══════════════════════════════════════════════════════════════════════════
// use_perfect_moment_story.ts — «Идеальный урок» кадром истории вместо окна-штампа на итоге урока.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): решение «показать штамп»
// остаётся у экрана (decidePerfectMoment + очередь моментов), но при включённых историях окно не открывается — факт
// пишется в «Истории», а экран сразу получает «закрыто» тем же колбэком, что от окна: слот секвенции наград отпускается,
// оценка приложения не ждёт. Истории выключены (флаг stories_v1) — хук отвечает false, окно работает как раньше.
// Отдельный файл: окно LessonPerfectHost и его сторож (tests/lesson_perfect_wiring_contract.test.tsx) не меняются.
// Празднование не durable (ФУНДАМЕНТ владельца 01.09): в журнал историй пишется факт прохода, а не «долг на показ» —
// журнал сам чистит записи старше 7 дней.
// Журнал: [LESSON-PERFECT].
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { DebugLogger } from '../../app/debug-logger';
import { recordPerfectLessonStory, storiesReplaceWindows } from '../../modules/story_events/story_instead_sources';

const LOG = '[LESSON-PERFECT]';

export type PerfectMomentStoryInput = Readonly<{
  /** Экран решил показать штамп и счёт урока уже есть. */
  ready: boolean;
  /** Ключ прохождения (perfectMomentKey): одна история на ключ. */
  onceKey: string;
  lessonNo: number;
  /** Заданий в проходе (все верные). */
  total: number;
  /** Монеты за урок — то же число, что «+N» на итоге. */
  coins: number;
  /** Тот же колбэк, что у окна: false — «окна нет / закрыто». */
  onOpenChange: (open: boolean) => void;
}>;

/** true — штамп забрала история, окно показывать не нужно. */
export function usePerfectMomentStory({ ready, onceKey, lessonNo, total, coins, onOpenChange }: PerfectMomentStoryInput): boolean {
  // зачем: решение защёлкивается на ключ прохождения — флаг историй, пришедший позже, не откроет ещё и окно поверх записанной истории
  const [takenKey, setTakenKey] = useState<string | null>(null);
  const sentRef = useRef<string | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const instead = ready && (takenKey === onceKey || storiesReplaceWindows());
  useEffect(() => {
    if (!instead) return; // истории выключены или штампа нет — работает окно
    if (sentRef.current === onceKey) return; // этот проход уже отправлен
    sentRef.current = onceKey;
    setTakenKey(onceKey);
    DebugLogger.info(LOG, `история вместо окна key=${onceKey} урок=${lessonNo} заданий=${total} монет=${coins}`);
    void recordPerfectLessonStory({ onceKey, lessonNo, total, coins })
      .then((record) => {
        if (!record.recorded) DebugLogger.info(LOG, `история не добавлена: ${record.reason} key=${onceKey}`);
      })
      .catch((e: unknown) => { DebugLogger.error('usePerfectMomentStory:record', e instanceof Error ? e : new Error(String(e)), 'warning'); })
      // зачем: экран держит слот секвенции наград, пока момент «не решён» — отпускаем в любом исходе, иначе итог урока застрял бы
      .finally(() => { onOpenChangeRef.current(false); });
  }, [coins, instead, lessonNo, onceKey, total]);
  return instead;
}
