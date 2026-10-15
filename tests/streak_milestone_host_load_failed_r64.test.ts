// зачем (R64, координатор 15.10): если ленивая загрузка StreakMilestoneHost падает, удержание слота #36 обязано сняться — иначе
// следующий момент на итоге ждёт вечно. Сторож: все 4 экрана итога ловят сбой загрузки одним помощником, а помощник освобождает слот.
import fs from 'node:fs';
import path from 'node:path';

const SITES = ['app/lesson_complete.tsx', 'app/dialogue_v2_completion.tsx', 'app/mistake_practice_session.tsx', 'app/flashcards/SessionResultScreen.tsx'];

describe('R64 · сбой загрузки StreakMilestoneHost снимает удержание слота #36', () => {
  it.each(SITES)('%s ловит сбой ленивой загрузки', (rel) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(src).toMatch(/lazy\(\(\) => import\('[./]+components\/streak\/moments\/StreakMilestoneHost'\)\.catch\(streakMilestoneHostLoadFailed\)\)/);
  });

  it('помощник пишет причину и отдаёт пустой компонент', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { streakMilestoneHostLoadFailed } = jest.requireActual('../app/streak_milestone_pending');
    const mod = streakMilestoneHostLoadFailed(new Error('chunk'));
    expect(mod.default()).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[STREAK-MILESTONE] host_load_failed', 'chunk');
  });
});
