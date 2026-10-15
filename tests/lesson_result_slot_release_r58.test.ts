// зачем (аудит кнопок R58 #2, координатор 15.10): экран итога урока 2.0 держал слот арбитра «lessonResultsSequence» всю жизнь —
// setSeqDone звала только кнопка старой секвенции, которой на экране 2.0 нет. Оценка приложения, тосты и уведомления голодали, первый тап
// «Следующий урок» был мёртвым. Сторож: экран защёлкнут (не пропадает после отпуска слота), слот отпускается эффектом экрана 2.0, когда его
// моменты (цепочка m10, окно m09) отыграли, и решение пишется в журнал [LESSON-RESULT].
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');

describe('R58 #2 · итог урока 2.0 отпускает слот арбитра', () => {
  it('экран итога защёлкнут: показавшись, не зависит от слота', () => {
    expect(src).toContain('const resultShownLatchRef = useRef(false);');
    expect(src).toContain('if (resultsSequenceVisible && resultsReady && completionAccessReady && completionXpReady) resultShownLatchRef.current = true;');
    expect(src).toContain('const sequenceShowing = resultShownLatchRef.current;');
  });

  it('слот отпускается, когда моменты экрана отыграли; держание и отпуск — в журнале', () => {
    const effect = src.slice(src.indexOf("// R58 #2: слот «секвенция наград» отпускаем"), src.indexOf("console.log('[LESSON-RESULT] slot_release'") + 200);
    expect(effect).toContain('const chainPending = doneChainOn && !doneChainFinished;');
    expect(effect).toContain('const perfectPending = perfectDecision.show && !perfectMomentSettled;');
    // R58 #36: окно рубежа серии — нативный Modal вне арбитра; пока оно открыто, слот держится
    expect(effect).toContain('const milestonePending = milestoneHold;');
    expect(effect).toContain('if (chainPending || perfectPending || milestonePending) {');
    expect(effect).toContain("'[LESSON-RESULT] slot_hold'");
    expect(effect).toContain('setSeqDone(true);');
  });

  it('setSeqDone зовётся не только из старой секвенции (иначе слот снова навсегда)', () => {
    const calls = src.match(/setSeqDone\(true\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // оценка по-прежнему ждёт отпуска слота и тишины уведомлений — теперь она реально может открыться
    expect(src).toContain('if (!seqDone || activeNotif || !pendingReview.current) return;');
  });
});
