import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('lesson completion attempt identity 6A', () => {
  it('passes the completed run and next replay as two distinct identities', () => {
    const lesson = read('app/lesson1.tsx');
    const completion = lesson.slice(
      lesson.indexOf('if (nextCell === 0 && !pendingCycleEndReplay)'),
      lesson.indexOf('// Панель «Скажи вслух»', lesson.indexOf('if (nextCell === 0 && !pendingCycleEndReplay)')),
    );

    expect(completion).toContain(
      'const completedAttemptId = normalizeLessonServerAttemptId(serverAttemptIdRef.current)',
    );
    expect(completion).toContain('const nextAttemptId = makeLessonServerAttemptId();');
    expect(completion.indexOf('const completedAttemptId'))
      .toBeLessThan(completion.indexOf('serverAttemptIdRef.current = nextAttemptId;'));
    expect(completion).toContain('completedAttemptId,');
    expect(completion).toContain('repeatAttemptId: nextAttemptId');
  });

  it('deduplicates server completion by attempt id instead of medal pass_count', () => {
    const screen = read('app/lesson_complete.tsx');
    const submit = screen.slice(
      screen.indexOf('submitProgressEvent({'),
      screen.indexOf('void syncToCloud', screen.indexOf('submitProgressEvent({')),
    );

    expect(screen).toContain('completedAttemptId?: string | string[];');
    expect(screen).toContain('normalizeLessonServerAttemptId(params.completedAttemptId)');
    expect(submit).toContain('safeLessonCompleteEventPart(completionAttemptId)');
    expect(submit).toContain('attemptId: completionAttemptId');
    expect(submit).not.toContain('Math.max(1, newPassCount)');
  });

});
