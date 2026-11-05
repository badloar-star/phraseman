// Вердикт Макетов 05.11 (home-free-0): герой новичка — «Урок 1» + название урока + «Начать», без «· Эпизод N», полосы и строк серии.
import { buildHomeSceneCopy, type HomeSceneCopyInput } from '../components/home/v2/scene/home_scene_copy';

const BASE: HomeSceneCopyInput = {
  lang: 'ru', state: 'newbie', zeroEnergyNote: false, badge: 'Урок 1', episode: 1, title: 'Местоимения и глагол To Be',
  progress: { done: 0, total: 6 }, streakDays: 0, minutesToMidnight: 600, daysAway: null, energyMinutes: null,
  theoryAvailable: true, wordsAvailable: false, lostStreakDays: null, ctaTarget: 'start', lessonNo: 1,
};

describe('герой новичка (ранг 0)', () => {
  it('«Урок 1» + название урока + «Начать»; без эпизода, полосы и строки', () => {
    const copy = buildHomeSceneCopy(BASE);
    expect(copy.kicker).toBe('Урок 1');
    expect(copy.title).toBe('Местоимения и глагол To Be');
    expect(copy.cta).toBe('Начать');
    expect(copy.bar).toBeNull();
    expect(copy.line).toBeNull();
  });
  it('нет подписи места — прежнее поведение (место из эпизода)', () => {
    const copy = buildHomeSceneCopy({ ...BASE, badge: null });
    expect(copy.kicker).toBe('');
  });
  it('другие состояния не затронуты: «продолжить» по-прежнему с эпизодом и полосой', () => {
    const copy = buildHomeSceneCopy({ ...BASE, state: 'continue' });
    expect(copy.kicker).toContain('Урок 1');
    expect(copy.bar).toBe(0);
  });
});
