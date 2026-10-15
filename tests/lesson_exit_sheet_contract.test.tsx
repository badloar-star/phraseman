// зачем (m15, владелец 14.10; координатор: «выдуманных фактов нет», флаг выкл → поведение как сейчас, байт в байт): шторка «Выйти из урока?» — тексты только правда кода (энергия — только когда она тратится),
// «Продолжить» закрывает, «Выйти» зовёт прежний выход; в lesson1 «назад» идёт через requestLessonExit, а при выключенном флаге/интро/идущем выходе — прямо в прежний handleLessonHeaderBack.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  NativeModules: {},
}));
jest.mock('react-native-reanimated', () => ({ __esModule: true, useReducedMotion: () => true }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticMediumImpact: jest.fn() }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 5 }));
const mockPlayEvent = jest.fn();
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: (...args: unknown[]) => mockPlayEvent(...args) }));
jest.mock('../app/energy_contract', () => ({ ENERGY_FREE_REENTRY_WINDOW_MS: 600000, ENERGY_SESSION_COST: 1 }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ text: '#FFFFFF', textSecondary: '#B8C0C4' }) }));
jest.mock('../components/v2/KitSheetModal', () => {
  const R = jest.requireActual('react');
  return {
    KitSheetModal: (props: { visible: boolean; header: React.ReactNode; children: React.ReactNode; onRequestClose: () => void; testID?: string }) => (props.visible
      ? R.createElement('View', { testID: props.testID }, props.header, props.children, R.createElement('Pressable', { testID: `${props.testID}-backdrop`, onPress: props.onRequestClose }))
      : null),
  };
});
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});

import LessonExitSheet from '../components/lesson_exit/LessonExitSheet';
import { LESSON_EXIT_LANGS, LESSON_EXIT_STRING_KEYS, lessonExitText } from '../components/lesson_exit/lesson_exit_strings';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('шторка «Выйти из урока?» (m15)', () => {
  beforeEach(() => { mockPlayEvent.mockClear(); });

  it('у кого энергия тратится: «Попытка не сохранится.» + фраза про энергию с числами контракта (10 мин, 1)', async () => {
    const onContinue = jest.fn();
    const onLeave = jest.fn();
    await render(<LessonExitSheet lang="ru" visible energyNote onContinue={onContinue} onLeave={onLeave} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(screen.getByText('Выйти из урока?')).toBeTruthy();
    expect(screen.getByTestId('lesson-exit-sheet-body').props.children).toBe('Попытка не сохранится. Вернёшься позже, чем через 10 мин — спишется 1 энергия.');
    expect(mockPlayEvent).toHaveBeenCalledWith('sheet_open');
    await fireEvent.press(screen.getByTestId('lesson-exit-sheet-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('lesson-exit-sheet-leave'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('у Plus/тестера (энергия не тратится): только «Попытка не сохранится.» — ни слова про энергию', async () => {
    await render(<LessonExitSheet lang="ru" visible energyNote={false} onContinue={jest.fn()} onLeave={jest.fn()} />);
    expect(screen.getByTestId('lesson-exit-sheet-body').props.children).toBe('Попытка не сохранится.');
  });

  it('фон/«назад» шторки = «Продолжить»; закрытая шторка ничего не рисует', async () => {
    const onContinue = jest.fn();
    const view = await render(<LessonExitSheet lang="ru" visible energyNote onContinue={onContinue} onLeave={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('lesson-exit-sheet-backdrop'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    await view.rerender(<LessonExitSheet lang="ru" visible={false} energyNote onContinue={onContinue} onLeave={jest.fn()} />);
    expect(screen.queryByTestId('lesson-exit-sheet')).toBeNull();
  });
});

describe('тексты и исходники', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of LESSON_EXIT_STRING_KEYS) for (const lang of LESSON_EXIT_LANGS) expect([key, lang, lessonExitText(lang, key, { min: 10, cost: 1 }).length > 0]).toEqual([key, lang, true]);
    expect(lessonExitText('en', 'energy', { min: 10, cost: 1 })).toBe('Come back after more than 10 min and it costs 1 energy.');
  });

  it('шторка ничего не списывает и не пишет; бесконечных анимаций и обводок нет', () => {
    const src = read('components/lesson_exit/LessonExitSheet.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|confirmActivityStart|refundActivityStart|firestore|withRepeat|borderWidth|borderColor/.test(src)).toBe(false);
  });

  it('lesson1: «назад» идёт через requestLessonExit; флаг выкл / интро / идущий выход → прежний handleLessonHeaderBack; интро-экраны не тронуты', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toContain('onHeaderBack={requestLessonExit}');
    expect(src).toContain('onBack={handleLessonHeaderBack}'); // интро-экраны (попытки ещё нет) — без шторки
    expect(src).toContain('if (!momentsV3 || showIntroScreens || lessonExitInFlightRef.current) {');
    expect(src).toContain('handleLessonHeaderBack();\n      return;');
    expect(src).toContain('energyNote={!testerEnergyDisabled}');
    // «Выйти» = тот же прежний выход (abandon + навигация), защита от двойного тапа остаётся в нём
    expect(src).toMatch(/const confirmLessonExit = useCallback\(\(\) => \{[\s\S]{0,260}handleLessonHeaderBack\(\);/);
  });
});
