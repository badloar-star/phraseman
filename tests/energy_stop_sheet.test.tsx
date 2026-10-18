// зачем (ТЗ владельца 11.10, режим Б): ошибка на последней энергии останавливает занятие; шторка предлагает «Продолжить с Plus сейчас»,
// а когда Plus подтверждён — занятие продолжается само (один раз). Закрыть шторку «назад» нельзя, выйти — только кнопкой.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EnergyStopSheet from '../components/energy/EnergyStopSheet';
import { emitEnergyToast } from '../components/energy/energy_toasts';

const mockPush = jest.fn();
let mockUnlimited = false;
let mockOnRequestClose: (() => void) | undefined;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => { require('react').useEffect(effect, []); },
}));
jest.mock('../components/energy/energy_toasts', () => ({ emitEnergyToast: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ opaqueSheet: '#222', opaqueControl: '#333', accent: '#0f0', accentInk: '#000', text: '#fff', secondary: '#aaa' }),
}));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, txt: Record<string, string>) => txt.ru }));
jest.mock('../constants/motionHybrid', () => ({ LUM: { ladder: [0, 1, 2, 3] } }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticWarning: jest.fn(() => Promise.resolve()) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ isUnlimited: mockUnlimited, recoveryIntervalMs: 600000 }),
  useEnergyCountdown: () => ({ timeUntilNextMs: 540000, formattedTime: '9м 0с' }),
}));
jest.mock('../components/EnergyIcon', () => ({ __esModule: true, default: 'EnergyIcon' }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'x', f: { h2: 22, body: 16 } }) }));
jest.mock('../components/modal_fx/HybridAlertShell', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: { visible: boolean; dismissible?: boolean; onRequestClose: () => void; children: React.ReactNode }) => {
      mockOnRequestClose = props.onRequestClose;
      return props.visible ? React.createElement('View', { testID: 'shell', dismissible: props.dismissible }, props.children) : null;
    },
    CascadeItem: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('EnergyStopSheet', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUnlimited = false; mockOnRequestClose = undefined; });

  test('показывает заголовок, таймер до следующей энергии и две кнопки; шторка не закрывается жестом', async () => {
    await render(<EnergyStopSheet visible onExit={jest.fn()} onResume={jest.fn()} />);
    expect(screen.getByTestId('energy-stop-title').props.children).toBe('Энергия закончилась');
    expect(String(screen.getByTestId('energy-stop-body').props.children)).toContain('9 мин 0 с'); // зачем (Макеты c0cd6e2ae, energy-modes-004): окно остановки — длинный формат образца «через 9 мин 41 с», сжатое «9м 0с» остаётся в пилюле энергии
    expect(screen.getByTestId('shell').props.dismissible).toBe(false);
    expect(screen.getByTestId('energy-stop-plus')).toBeTruthy();
    expect(screen.getByTestId('energy-stop-exit')).toBeTruthy();
    mockOnRequestClose?.();
  });

  test('скрыта — ничего не рисует и не вызывает onResume', async () => {
    mockUnlimited = true;
    const onResume = jest.fn();
    await render(<EnergyStopSheet visible={false} onExit={jest.fn()} onResume={onResume} />);
    expect(screen.queryByTestId('energy-stop-plus')).toBeNull();
    expect(onResume).not.toHaveBeenCalled();
  });

  test('«Продолжить с Plus сейчас» открывает пейвол с контекстом и источником', async () => {
    await render(<EnergyStopSheet visible onExit={jest.fn()} onResume={jest.fn()} paywallContext="no_energy" />);
    fireEvent.press(screen.getByTestId('energy-stop-plus'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'energy_stop_sheet' } });
  });

  test('после тапа «Продолжить с Plus» карточка прячется, чтобы не перекрыть экран Plus (ревью Ядра п.2)', async () => {
    await render(<EnergyStopSheet visible onExit={jest.fn()} onResume={jest.fn()} />);
    expect(screen.getByTestId('shell')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('energy-stop-plus'));
    expect(screen.queryByTestId('shell')).toBeNull();
  });

  test('«Выйти» вызывает onExit, onResume не трогает', async () => {
    const onExit = jest.fn();
    const onResume = jest.fn();
    await render(<EnergyStopSheet visible onExit={onExit} onResume={onResume} />);
    fireEvent.press(screen.getByTestId('energy-stop-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });

  test('Plus подтверждён при открытой шторке — onResume ровно один раз, даже при перерисовках', async () => {
    const onResume = jest.fn();
    const view = await render(<EnergyStopSheet visible onExit={jest.fn()} onResume={onResume} />);
    expect(onResume).not.toHaveBeenCalled();
    mockUnlimited = true;
    await view.rerender(<EnergyStopSheet visible onExit={jest.fn()} onResume={onResume} />);
    await view.rerender(<EnergyStopSheet visible onExit={jest.fn()} onResume={onResume} />);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(emitEnergyToast).toHaveBeenCalledWith('plus_resumed');
  });
});
