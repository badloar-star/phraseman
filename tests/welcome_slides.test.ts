import { getWelcomeSlidesScriptBase, resolveSlideImage } from '../app/onboarding_welcome/welcome_slides';
import { resolveWelcomeSlides } from '../app/onboarding_welcome/welcome_copy_overrides';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';

describe('welcome_slides — сценарий слайдов «знакомства»', () => {
  it('free-ветка: intro=Компас, есть все ключевые разделы по порядку', () => {
    const s = getWelcomeSlidesScriptBase('free');
    expect(s.intro.id).toBe('intro');
    const ids = s.slides.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['stats', 'plan', 'lessons', 'quizzes', 'cards', 'practice', 'tasks', 'league', 'phrase']));
  });

  it('plan-ветка: первый слайд — план, есть статистика и разделы', () => {
    const s = getWelcomeSlidesScriptBase('plan');
    expect(s.slides[0]!.id).toBe('plan');
    expect(s.slides.map((x) => x.id)).toContain('stats');
  });

  it('реальные иконки: разделы меню → image source, фраза/статистика → icon', () => {
    const s = getWelcomeSlidesScriptBase('free');
    const lessons = s.slides.find((x) => x.id === 'lessons')!;
    const phrase = s.slides.find((x) => x.id === 'phrase')!;
    expect(resolveSlideImage(lessons.asset, 'dark')).toBeTruthy(); // webp из home_menu
    expect(resolveSlideImage(phrase.asset, 'dark')).toBeNull();    // Ionicons-слайд
    expect(resolveSlideImage(s.intro.asset, 'dark')).toBeTruthy(); // компас-ассет
  });
});

describe('resolveWelcomeSlides — правка текстов слайдов после релиза', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    applyRemoteConfigSnapshot({ texts: { welcome_copy_overrides: '' } });
  });

  it('без оверрайдов — базовые тексты', () => {
    const base = getWelcomeSlidesScriptBase('free');
    const r = resolveWelcomeSlides('free', base);
    expect(r.intro.title).toBe(base.intro.title);
  });

  it('оверрайд по id слайда заменяет заголовок/текст, остальное из кода', () => {
    applyRemoteConfigSnapshot({
      texts: { welcome_copy_overrides: JSON.stringify({ free: { intro: { title: 'НОВЫЙ' }, steps: { lessons: { body: 'новый текст уроков' } } } }) },
    });
    const base = getWelcomeSlidesScriptBase('free');
    const r = resolveWelcomeSlides('free', base);
    expect(r.intro.title).toBe('НОВЫЙ');
    expect(r.intro.body).toBe(base.intro.body); // не трогали
    expect(r.slides.find((x) => x.id === 'lessons')!.body).toBe('новый текст уроков');
  });
});
