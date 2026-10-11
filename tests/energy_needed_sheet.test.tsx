// зачем (ТЗ владельца 11.10, режим Б; макет energy-modes-states.html Б7/Б8): вышел с нулём — «Нужна энергия» с таймером и Plus;
// энергия вернулась при открытой шторке — идём дальше сами; «Подожду» просто закрывает.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EnergyNeededSheet from '../components/energy/EnergyNeededSheet';
import { emitEnergyToast } from '../components/energy/energy_toasts';

let mockEnergy = 0;
let mockOnRequestClose: (() => void) | undefined;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('../components/energy/energy_toasts', () => ({ emitEnergyToast: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ opaqueSheet: '#222', opaqueControl: '#333', accent: '#0f0', accentInk: '#000', text: '#fff', secondary: '#aaa' }),
}));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, txt: Record<string, string>) => txt.ru }));
jest.mock('../constants/motionHybrid', () => ({ LUM: { ladder: [0, 1, 2, 3] } }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ energy: mockEnergy, bonusEnergy: 0, maxEnergy: 5, recoveryIntervalMs: 600000, recoveryEndsAtMs: 0, timeUntilNextMs: 540000 }),
}));
jest.mock('../components/EnergyIcon', () => ({
  __esModule: true,
  default: () => { const React = require('react'); return React.createElement('EnergyIcon', { testID: 'cell' }); },
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'x' }) }));
jest.mock('../components/modal_fx/HybridAlertShell', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: { visible: boolean; onRequestClose: () => void; children: React.ReactNode }) => {
      mockOnRequestClose = props.onRequestClose;
      return props.visible ? React.createElement('View', { testID: 'shell' }, props.children) : null;
    },
    CascadeItem: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('EnergyNeededSheet', () => {
  beforeEach(() => { jest.clearAllMocks(); mockEnergy = 0; mockOnRequestClose = undefined; });

  test('показывает заголовок, тикающий таймер 09:00, подпись «энергия 0 из 5» и пять ячеек', async () => {
    await render(<EnergyNeededSheet visible onWait={jest.fn()} onPlus={jest.fn()} />);
    expect(screen.getByTestId('energy-needed-title').props.children).toBe('Нужна энергия');
    expect(screen.getByTestId('energy-needed-timer').props.children).toBe('09:00');
    expect(screen.getByTestId('energy-needed-caption').props.children).toBe('энергия 0 из 5');
    expect(screen.getAllByTestId('cell')).toHaveLength(5);
  });

  test('«Продолжить с Plus» и «Подожду» зовут свои колбэки', async () => {
    const onWait = jest.fn();
    const onPlus = jest.fn();
    await render(<EnergyNeededSheet visible onWait={onWait} onPlus={onPlus} />);
    await fireEvent.press(screen.getByTestId('energy-needed-plus'));
    expect(onPlus).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('energy-needed-wait'));
    expect(onWait).toHaveBeenCalledTimes(1);
    mockOnRequestClose?.();
    expect(onWait).toHaveBeenCalledTimes(2);
  });

  test('энергия вернулась при открытой шторке — onRestored один раз', async () => {
    const onRestored = jest.fn();
    const view = await render(<EnergyNeededSheet visible onWait={jest.fn()} onPlus={jest.fn()} onRestored={onRestored} />);
    expect(onRestored).not.toHaveBeenCalled();
    mockEnergy = 1;
    await view.rerender(<EnergyNeededSheet visible onWait={jest.fn()} onPlus={jest.fn()} onRestored={onRestored} />);
    await view.rerender(<EnergyNeededSheet visible onWait={jest.fn()} onPlus={jest.fn()} onRestored={onRestored} />);
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(emitEnergyToast).toHaveBeenCalledWith('energy_restored');
    expect(emitEnergyToast).toHaveBeenCalledTimes(1);
  });

  test('«Подожду» не снимает ожидание: энергия вернулась при закрытой шторке — тост «Энергия восстановилась», колбэки не зовутся (макет Б8)', async () => {
    const onWait = jest.fn();
    const onRestored = jest.fn();
    const view = await render(<EnergyNeededSheet visible onWait={onWait} onPlus={jest.fn()} onRestored={onRestored} />);
    await view.rerender(<EnergyNeededSheet visible={false} onWait={onWait} onPlus={jest.fn()} onRestored={onRestored} />);
    expect(emitEnergyToast).not.toHaveBeenCalled();
    mockEnergy = 1;
    await view.rerender(<EnergyNeededSheet visible={false} onWait={onWait} onPlus={jest.fn()} onRestored={onRestored} />);
    expect(emitEnergyToast).toHaveBeenCalledWith('energy_restored');
    expect(onRestored).not.toHaveBeenCalled();
    expect(onWait).not.toHaveBeenCalled();
  });

  test('шторка открыта при достаточной энергии — не закрывается сама (не было нехватки)', async () => {
    mockEnergy = 3;
    const onRestored = jest.fn();
    const onWait = jest.fn();
    await render(<EnergyNeededSheet visible onWait={onWait} onPlus={jest.fn()} onRestored={onRestored} />);
    expect(onRestored).not.toHaveBeenCalled();
    expect(onWait).not.toHaveBeenCalled();
    expect(emitEnergyToast).not.toHaveBeenCalled();
  });

  test('без onRestored восстановление закрывает шторку через onWait', async () => {
    const onWait = jest.fn();
    const view = await render(<EnergyNeededSheet visible onWait={onWait} onPlus={jest.fn()} />);
    mockEnergy = 2;
    await view.rerender(<EnergyNeededSheet visible onWait={onWait} onPlus={jest.fn()} />);
    expect(onWait).toHaveBeenCalledTimes(1);
  });
});
