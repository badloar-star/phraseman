// зачем (ТЗ владельца 11.10, режим Б): шапка занятия в режиме Б рисует энергию и остановку; у Plus пилюли нет; карточка остановки
// открывается только в фазе stopped_no_energy; Plus при открытой карточке возвращает занятие на тот же вопрос; «Выйти» — назад.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EnergyAttemptsHud from '../components/energy/EnergyAttemptsHud';

let mockUnlimited = false;
const mockBack = jest.fn();
const mockStopProps: { current: { visible: boolean; onResume: () => void; onExit: () => void } | null } = { current: null };
const mockHudProps: { current: Record<string, unknown> | null } = { current: null };

jest.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ accent: '#0f0', secondary: '#aaa', text: '#fff', opaqueControl: '#333', glassEdge: '#444' }),
}));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, txt: Record<string, string>) => txt.ru }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ energy: 2, bonusEnergy: 1, maxEnergy: 5, isUnlimited: mockUnlimited }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { wrong: '#f55' }, liquidGlassThemeId: 'x' }) }));
jest.mock('../components/energy/EnergyMistakeHud', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => { mockHudProps.current = props; const React = require('react'); return React.createElement('MistakeHud', { testID: 'mistake-hud' }); },
}));
jest.mock('../components/energy/EnergyStopSheet', () => ({
  __esModule: true,
  default: (props: { visible: boolean; onResume: () => void; onExit: () => void }) => { mockStopProps.current = props; const React = require('react'); return React.createElement('StopSheet', { testID: 'stop-sheet', visible: props.visible }); },
}));

const attempts = (phase: string, loss = 0, resume = jest.fn()) => ({
  mistakeChargeActive: true, energyLossSeq: loss, state: { phase }, resumeAfterPlus: resume,
});

describe('EnergyAttemptsHud', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUnlimited = false; mockStopProps.current = null; mockHudProps.current = null; });

  test('активное занятие: пилюля с энергией (с подарочной), карточка остановки скрыта', async () => {
    await render(<EnergyAttemptsHud attempts={attempts('active', 3)} locale="ru" testID="hud" />);
    expect(screen.getByTestId('mistake-hud')).toBeTruthy();
    expect(mockHudProps.current).toMatchObject({ energy: 3, maxEnergy: 5, lossSeq: 3, testID: 'hud', accessibilityLabel: 'Энергия: 3 из 5' });
    expect(mockStopProps.current?.visible).toBe(false);
  });

  test('фаза stopped_no_energy открывает карточку остановки', async () => {
    await render(<EnergyAttemptsHud attempts={attempts('stopped_no_energy')} locale="ru" testID="hud" />);
    expect(mockStopProps.current?.visible).toBe(true);
  });

  test('Plus: пилюли нет, но карточка остановки смонтирована — успеет вызвать onResume', async () => {
    mockUnlimited = true;
    await render(<EnergyAttemptsHud attempts={attempts('stopped_no_energy')} locale="ru" testID="hud" />);
    expect(screen.queryByTestId('mistake-hud')).toBeNull();
    expect(screen.getByTestId('stop-sheet')).toBeTruthy();
  });

  test('onResume вызывает resumeAfterPlus хозяина занятия', async () => {
    const resume = jest.fn();
    await render(<EnergyAttemptsHud attempts={attempts('stopped_no_energy', 0, resume)} locale="ru" testID="hud" />);
    mockStopProps.current?.onResume();
    expect(resume).toHaveBeenCalledTimes(1);
  });

  test('«Выйти»: по умолчанию назад по стеку, со своим обработчиком — он', async () => {
    const view = await render(<EnergyAttemptsHud attempts={attempts('stopped_no_energy')} locale="ru" testID="hud" />);
    mockStopProps.current?.onExit();
    expect(mockBack).toHaveBeenCalledTimes(1);
    const custom = jest.fn();
    await view.rerender(<EnergyAttemptsHud attempts={attempts('stopped_no_energy')} locale="ru" testID="hud" onStoppedExit={custom} />);
    mockStopProps.current?.onExit();
    expect(custom).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
