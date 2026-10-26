import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const read = (file: string) => normalizeEol(fs.readFileSync(path.join(process.cwd(), 'app', file), 'utf8'));
const lesson = read('lesson1.tsx');
const completion = read('lesson_complete.tsx');

describe('lesson completion entitlement wiring', () => {
  it('verifies active Plus before asking the lock system to persist the next lesson', () => {
    const entitlement = lesson.indexOf('const hasPremiumAccess = noLimits || await getVerifiedPremiumAccessStatus({');
    // зачем (aa2bbfc3e, Мастерская фраз): в режиме Мастерской следующий урок не открывается (`workshopActive ? false : await tryUnlockNextLesson(`); проверка Plus по-прежнему идёт ДО запроса открытия.
    const unlock = lesson.indexOf('await tryUnlockNextLesson(', entitlement);
    expect(entitlement).toBeGreaterThan(-1);
    expect(unlock).toBeGreaterThan(entitlement);
    expect(lesson).toMatch(/const didUnlock = (?:workshopActive \? false : )?await tryUnlockNextLesson\(/);
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

  it('renders the done-screen next-unlock note only for a verified didUnlock', () => {
    const hint = completion.indexOf('const nextLessonUnlockHint =');
    const hintEnd = completion.indexOf('const [showReview', hint);
    const results = completion.indexOf('<V2DoneScreen', hintEnd);
    const hintBlock = completion.slice(hint, hintEnd);
    expect(hint).toBeGreaterThan(-1);
    expect(hintEnd).toBeGreaterThan(hint);
    expect(hintBlock).toContain('shouldAnnounceNextLessonUnlock(');
    expect(hintBlock).toContain("params.unlocked === '1'");
    expect(hintBlock).not.toContain('completionRequiresPremium\n    ?');
    // зачем (04.10): 7887bbc7b — подсказка о следующем уроке стала веткой starsNote (макет E1–E4), смысл тот же.
    expect(completion.slice(results, results + 3000)).toMatch(/starsNote=\{[\s\S]{0,700}?: nextLessonUnlockHint\s*\?/);
  });
});
