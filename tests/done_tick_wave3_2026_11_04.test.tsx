// Волна 3 UX-приятностей (владелец 04.11): общий DoneTick/PopIn на местах успеха — один лёгкий хаптик на появление, пружина только по transform/opacity,
// уже показанный успех (play=false) рисуется сразу и молча; места успеха подключены.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockHapticSuccess = jest.fn(async () => undefined);
jest.mock('../hooks/use-haptics', () => ({ hapticSuccess: () => mockHapticSuccess() }));
let mockReduceMotion = false;
jest.mock('../hooks/use_system_reduce_motion', () => ({ useSystemReduceMotion: () => mockReduceMotion }));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  return { __esModule: true, default: (props: Record<string, unknown>) => mockReact.createElement('Icon', props) };
});

// зачем: тестовое окружение держит урезанный react-native без Animated — подставляем минимальный
jest.mock('react-native', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  const anim = () => ({ start: () => undefined, stop: () => undefined });
  return {
    View: (props: Record<string, unknown>) => mockReact.createElement('View', props),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => Object.assign({}, ...([style] as unknown[]).flat(9).filter(Boolean)),
    },
    Animated: {
      Value: class { constructor(public v: number) {} },
      spring: anim,
      timing: anim,
      parallel: anim,
      View: (props: Record<string, unknown>) => mockReact.createElement('View', props),
    },
  };
});

import { DoneTick, PopIn } from '../components/DoneTick';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  mockHapticSuccess.mockClear();
  mockReduceMotion = false;
});

describe('PopIn / DoneTick', () => {
  it('играет и даёт один хаптик на появление, повторный рендер ничего не повторяет', async () => {
    const view = await render(<DoneTick color="#fff" testID="tick" />);
    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
    await view.rerender(<DoneTick color="#fff" testID="tick" />);
    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('tick')).toBeTruthy();
  });

  it('play=false — значок уже был показан: рисуется сразу, без хаптика', async () => {
    const view = await render(<DoneTick color="#fff" testID="tick" play={false} />);
    expect(mockHapticSuccess).not.toHaveBeenCalled();
    expect(view.getByTestId('tick')).toBeTruthy();
  });

  it('haptic=false — только пружина, без вибрации', async () => {
    await render(<PopIn haptic={false}><DoneTick color="#fff" play={false} /></PopIn>);
    expect(mockHapticSuccess).not.toHaveBeenCalled();
  });

  it('«уменьшить движение»: значок виден сразу, хаптик (обратная связь) остаётся', async () => {
    mockReduceMotion = true;
    const view = await render(<DoneTick color="#fff" testID="tick" />);
    expect(view.getByTestId('tick')).toBeTruthy();
    expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('места успеха подключены', () => {
  it('«Обращение отправлено», промокод принят, итог теста, задача дня', () => {
    expect(read('app/support_report.tsx')).toContain('<DoneTick size={28} color={glass.lightTint} />');
    const promo = read('app/promo_code_entry.tsx');
    expect(promo).toContain('<DoneTick key={feedback.text} name="checkmark-circle-outline"');
    expect(promo).toContain('<Ionicons name="close-circle-outline"'); // отказ — без поп-эффекта
    expect(read('app/diagnostic_test.tsx')).toMatch(/<PopIn>\s*<View style=\{\{ width: 61, height: 61/);
    const today = read('components/home/v2/HomeV2TodayCard.tsx');
    expect(today).toContain('function useJustDoneKinds(');
    expect(today).toContain('play={justDone.has(task.kind)}');
    expect(today).not.toContain('<Ionicons name="checkmark"');
  });

  it('кнопки и карточки онбординга — KitTouchable с сохранённым хаптиком', () => {
    const onb = read('components/CleanOnboarding.tsx');
    expect(onb).toContain("import KitTouchable from './KitTouchable'");
    expect(onb).toMatch(/<KitTouchable\s+testID=\{testID\}\s+\/\/ зачем \(прогон Сверки/);
    expect(onb).toContain('style={styles.optionCard}');
    expect(onb).toContain('style={styles.secondaryButton}');
    const lang = read('app/language_welcome.tsx');
    expect(lang).toContain("import KitTouchable from '../components/KitTouchable'");
    expect(lang).toContain('testID="language-welcome-primary"');
    expect((lang.match(/<KitTouchable/g) ?? []).length).toBe(3);
  });

  it('анимация только по transform и opacity, без обводок', () => {
    const tick = read('components/DoneTick.tsx');
    expect(tick).toContain('transform: [{ scale }]');
    expect(tick).not.toMatch(/borderWidth|borderColor|width:\s*Animated|height:\s*Animated/);
  });
});
