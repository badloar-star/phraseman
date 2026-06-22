import {
  parseWelcomeCopyOverrides,
  applyWelcomeOverrides,
} from '../app/onboarding_welcome/welcome_copy_overrides';
import { getWelcomeScriptBase } from '../app/onboarding_welcome/welcome_steps';

describe('welcome_copy_overrides — правка текстов после релиза', () => {
  it('пустой/битый JSON → пустые оверрайды (фолбэк на код)', () => {
    expect(parseWelcomeCopyOverrides('')).toEqual({});
    expect(parseWelcomeCopyOverrides('   ')).toEqual({});
    expect(parseWelcomeCopyOverrides('{не json')).toEqual({});
    expect(parseWelcomeCopyOverrides('[1,2,3]')).toEqual({});
  });

  it('парсит intro/outro/steps по веткам, пустые строки игнорит', () => {
    const raw = JSON.stringify({
      free: {
        intro: { title: 'Новый заголовок', body: '   ' },
        steps: { 'home-stats-card': { title: 'Мой прогресс' } },
      },
      plan: { outro: { primary: 'Поехали' } },
    });
    const ov = parseWelcomeCopyOverrides(raw);
    expect(ov.free?.intro?.title).toBe('Новый заголовок');
    expect(ov.free?.intro?.body).toBeUndefined(); // пустая строка → фолбэк
    expect(ov.free?.steps?.['home-stats-card']?.title).toBe('Мой прогресс');
    expect(ov.plan?.outro?.primary).toBe('Поехали');
  });

  it('накладывает оверрайд на встроенный сценарий; нетронутое берётся из кода', () => {
    const base = getWelcomeScriptBase('free');
    const ov = parseWelcomeCopyOverrides(
      JSON.stringify({ free: { intro: { title: 'ЗАМЕНА' }, steps: { 'home-stats-card': { body: 'новый текст' } } } }),
    );
    const result = applyWelcomeOverrides('free', base, ov);
    expect(result.intro.title).toBe('ЗАМЕНА'); // заменено
    expect(result.intro.body).toBe(base.intro.body); // не трогали → из кода
    const statsStep = result.steps.find((s) => s.targets[0] === 'home-stats-card')!;
    expect(statsStep.body).toBe('новый текст'); // заменено
    expect(statsStep.title).toBe(base.steps.find((s) => s.targets[0] === 'home-stats-card')!.title); // из кода
  });

  it('нет оверрайда для ветки → возвращает базовый сценарий без изменений', () => {
    const base = getWelcomeScriptBase('plan');
    expect(applyWelcomeOverrides('plan', base, {})).toBe(base);
  });

  it('иммутабельность: базовый сценарий не мутируется', () => {
    const base = getWelcomeScriptBase('free');
    const beforeTitle = base.intro.title;
    applyWelcomeOverrides('free', base, parseWelcomeCopyOverrides(JSON.stringify({ free: { intro: { title: 'X' } } })));
    expect(base.intro.title).toBe(beforeTitle);
  });
});
