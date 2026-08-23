import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.unmock('react-native');

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('../app/stable_safe_area_metrics', () => ({
  useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));

// зачем: настоящий constants/i18n тянет app/config.ts → сырой ESM env,
// который RNTL-пресет не трансформирует; тесту хватает ru-ветки.
jest.mock('../constants/i18n', () => ({
  triLang: (_lang: string, map: { ru: string }) => map.ru,
}));

import AvatarStudio25dScreen from '../app/avatar_studio_25d';

describe('avatar studio 2.5D route contract', () => {
  it('первый кадр — полный каркас: заголовок, 5 вкладок, портрет-зона, сохранение', async () => {
    const view = await render(<AvatarStudio25dScreen />);

    expect(view.getByText('Твоя студия')).toBeTruthy();
    const tabs = view.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(view.getByRole('tab', { name: 'Основа' }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByRole('button', { name: 'Отменить' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Вернуть' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Сохранить персонажа' })).toBeTruthy();
  });

  it('вкладка с ассетами показывает плитки своей базы, пустая — обучающее состояние', async () => {
    const view = await render(<AvatarStudio25dScreen />);
    await fireEvent.press(view.getByRole('tab', { name: 'Волосы' }));
    expect(view.getByText('Пробор')).toBeTruthy(); // мужская причёска для base_m
    expect(view.queryByText('Хвостики')).toBeNull(); // женская не показывается мальчику
    await fireEvent.press(view.getByRole('tab', { name: 'Образ' }));
    expect(view.getAllByText('Пока пусто — детали принимаются конвейером.').length).toBeGreaterThan(0);
  });

  it('сохранение отвечает мгновенно (Optimistic UI, без сети)', async () => {
    const view = await render(<AvatarStudio25dScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Сохранить персонажа' }));
    expect(view.getByText('Сохранено ✓')).toBeTruthy();
  });
});
