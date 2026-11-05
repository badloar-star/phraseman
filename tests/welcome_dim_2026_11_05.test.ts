// зачем (владелец 05.11, «96 без свечения»): пелена под приветствием — тёмный тон цвета темы, 0,96, накрывает всё (Modal), свечения нет.
import fs from 'node:fs';
import path from 'node:path';
import { hueOfHex, welcomeDimColor, WELCOME_DIM_FALLBACK, WELCOME_DIM_OPACITY } from '../components/onboarding/welcome_dim';

const read = (f: string): string => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('пелена приветствия', () => {
  it('оттенок из акцента и тёмный тон', () => {
    expect(hueOfHex('#ff0000')).toBe(0);
    expect(hueOfHex('#0000ff')).toBe(240);
    expect(welcomeDimColor('#7c5cff')).toMatch(/^hsl\(\d+, 50%, 10%\)$/);
  });
  it('серый акцент и мусор → фиолетовый по умолчанию', () => {
    expect(welcomeDimColor('#808080')).toBe(WELCOME_DIM_FALLBACK);
    expect(welcomeDimColor('oops')).toBe(WELCOME_DIM_FALLBACK);
  });
  it('непрозрачность 0,96', () => { expect(WELCOME_DIM_OPACITY).toBe(0.96); });
  it('компонент: плотная пелена вместо блюра, свечения нет', () => {
    const s = read('components/onboarding/ApprovedWelcome.tsx');
    expect(s).toContain('testID="welcome-dim"');
    expect(s).not.toMatch(/BlurView|LinearGradient|RadialGradient|welcome-halo/);
  });
  it('шлюз: в Modal на весь экран со статус-баром', () => {
    const s = read('components/onboarding/WelcomeGate.tsx');
    expect(s).toContain('<Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent');
    expect(s).toContain('dimColor={welcomeDimColor(palette.accentGraphic)}');
  });
});

describe('приветствие — только на Главной', () => {
  it('шлюз сверяет владельца среды вкладок и не запрашивает слот вне Главной', () => {
    const s = read('components/onboarding/WelcomeGate.tsx');
    expect(s).toContain("const onHome = force || runtimeOwnerId === 'home';");
    expect(s).toContain("useOverlayVisible('onboardingWelcome', wants && !force && onHome)");
    expect(s).toContain('const visible = (force ? wants : granted) && onHome;');
  });
});
