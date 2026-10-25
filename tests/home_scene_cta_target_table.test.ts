// зачем (жалоба владельца 25.10 «Ещё эпизод → открывается классическое меню»; Сверка [HOME-CONTINUE]: на холодном старте выбор
// none → v2 → legacy, а надпись «день засчитан» всегда «Ещё эпизод»): надпись кнопки «Сцены» и её переход считаются из ОДНОЙ цели.
// Сторож держит таблицу цель → надпись → обработчик и то, что Главная берёт обработчик и надпись из одной переменной.
import { buildHomeSceneCopy, homeSceneCtaTarget, type HomeSceneCopyInput, type HomeSceneCtaTarget } from '../components/home/v2/scene/home_scene_copy';
import { readSource } from './helpers/read_source';

const base: HomeSceneCopyInput = {
  lang: 'ru', state: 'day_done', zeroEnergyNote: false, badge: 'Урок 3', episode: null, title: 'Дальше', progress: null,
  streakDays: 4, minutesToMidnight: 300, daysAway: null, energyMinutes: null, theoryAvailable: false, wordsAvailable: false, lostStreakDays: null,
};
const cta = (ctaTarget: HomeSceneCtaTarget | undefined, lessonNo: number | null = null) => buildHomeSceneCopy({ ...base, ctaTarget, lessonNo }).cta;

describe('цель кнопки «Сцены»', () => {
  it('порядок: раздел → место → «начать» → курс V2 → старый урок → неизвестно', () => {
    const all = { section: true, place: true, start: true, v2: true, legacy: true };
    expect(homeSceneCtaTarget(all)).toBe('section');
    expect(homeSceneCtaTarget({ ...all, section: false })).toBe('place');
    expect(homeSceneCtaTarget({ ...all, section: false, place: false })).toBe('start');
    expect(homeSceneCtaTarget({ ...all, section: false, place: false, start: false })).toBe('v2');
    expect(homeSceneCtaTarget({ section: false, place: false, start: false, v2: false, legacy: true })).toBe('legacy');
    expect(homeSceneCtaTarget({ section: false, place: false, start: false, v2: false, legacy: false })).toBe('unknown');
  });
});

describe('«день засчитан»: надпись = цель', () => {
  it('V2 — «Ещё эпизод»; старый урок — «Продолжить урок N», а не «Ещё эпизод»', () => {
    expect(cta('v2')).toBe('Ещё эпизод');
    expect(cta('legacy', 1)).toBe('Продолжить урок 1');
    expect(cta('legacy', 1)).not.toBe('Ещё эпизод');
    expect(cta('legacy', null)).toBe('Продолжить');
  });
  it('«начать» — «Начать»; раздел, место и неизвестно — «Продолжить»; без цели — прежнее «Ещё эпизод»', () => {
    expect(cta('start')).toBe('Начать');
    expect(cta('section')).toBe('Продолжить');
    expect(cta('place')).toBe('Продолжить');
    expect(cta('unknown')).toBe('Продолжить');
    expect(cta(undefined)).toBe('Ещё эпизод');
  });
  it('гидрация none → v2 → legacy: на каждом шаге надпись соответствует цели этого шага', () => {
    const steps = [
      { v2: false, legacy: false, expected: 'Продолжить' },
      { v2: true, legacy: false, expected: 'Ещё эпизод' },
      { v2: false, legacy: true, expected: 'Продолжить урок 1' },
    ];
    for (const step of steps) {
      const target = homeSceneCtaTarget({ section: false, place: false, start: false, v2: step.v2, legacy: step.legacy });
      expect(cta(target, target === 'legacy' ? 1 : null)).toBe(step.expected);
    }
  });
  it('«Продолжить урок N» есть на 9 языках', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    const texts = langs.map((lang) => buildHomeSceneCopy({ ...base, lang, ctaTarget: 'legacy', lessonNo: 7 }).cta ?? '');
    expect(new Set(texts).size).toBe(9);
    for (const text of texts) expect(text).toContain('7');
  });
});

describe('Главная: обработчик и надпись из одной цели', () => {
  const home = readSource('app/(tabs)/home.tsx');
  it('одна переменная цели идёт и в обработчик тапа, и в сцену', () => {
    expect(home).toContain('const homeSceneCta = homeSceneCtaTarget({');
    expect(home).toContain("const homeSceneOnContinue = homeSceneCta === 'section' ? openHomeSceneSection");
    expect(home).toContain("homeSceneCta === 'place' || homeSceneCta === 'start' ? openHomeContinuePlace");
    expect(home).toContain(': openHomeContinuePriority;');
    expect(home).toContain('ctaTarget: homeSceneCta,');
    expect(home).toContain('onContinue={homeSceneOnContinue}');
  });
  it('в момент тапа журнал пишет состояние, цель и надпись', () => {
    const scene = readSource('components/home/v2/scene/HomeScene.tsx');
    expect(scene).toContain("console.log('[HOME-CONTINUE] tap', JSON.stringify({ state: decision.state, target: ctaTarget ?? 'v2_default', cta: copy.cta");
    expect(scene).toContain('onCta={onCta}');
  });
});
