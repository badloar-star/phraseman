import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'app', file), 'utf8');
const lesson = read('lesson1.tsx');
const completion = read('lesson_complete.tsx');

describe('lesson completion entitlement wiring', () => {
  it('verifies active Plus before asking the lock system to persist the next lesson', () => {
    const entitlement = lesson.indexOf('const hasPremiumAccess = noLimits || await getVerifiedPremiumAccessStatus({');
    const unlock = lesson.indexOf('const didUnlock = await tryUnlockNextLesson(', entitlement);
    expect(entitlement).toBeGreaterThan(-1);
    expect(unlock).toBeGreaterThan(entitlement);
    expect(lesson.slice(unlock, unlock + 240)).toContain('hasPremiumAccess');
  });

  it('does not trust the unlocked route flag when announcing the next lesson', () => {
    const queue = completion.indexOf('const queue: Notif[] = [];');
    const announcement = completion.indexOf('shouldAnnounceNextLessonUnlock(', queue);
    const queuePush = completion.indexOf("queue.push({ kind: 'lesson_unlock'", announcement);
    expect(queue).toBeGreaterThan(-1);
    expect(announcement).toBeGreaterThan(queue);
    expect(queuePush).toBeGreaterThan(announcement);
    expect(completion.slice(queue, announcement)).toContain('getVerifiedPremiumAccessStatus({');
  });

  it('renders the ResultsSequence next-unlock subtitle only for a verified didUnlock', () => {
    const hint = completion.indexOf('const nextLessonUnlockHint =');
    const hintEnd = completion.indexOf('const [showReview', hint);
    const results = completion.indexOf('<ResultsSequence', hintEnd);
    const hintBlock = completion.slice(hint, hintEnd);
    expect(hint).toBeGreaterThan(-1);
    expect(hintEnd).toBeGreaterThan(hint);
    expect(hintBlock).toContain('shouldAnnounceNextLessonUnlock(');
    expect(hintBlock).toContain("params.unlocked === '1'");
    expect(hintBlock).not.toContain('completionRequiresPremium\n    ?');
    expect(completion.slice(results, results + 800)).toContain('subtitle={nextLessonUnlockHint}');
  });
});
