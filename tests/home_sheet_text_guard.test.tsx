// зачем (координатор 25.10, Сверка: «Text strings must be rendered within a <Text> component» при шторке «Опрос» с Главной):
// предохранитель шторок Главной пишет [TEXT-OUTSIDE] со стеком компонентов и снимком данных, на месте содержимого — пусто,
// новое открытие пробует снова; шторки опроса и анкеты на Главной обёрнуты.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockDebugError = jest.fn();
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: (...args: unknown[]) => mockDebugError(...args) } }));

import HomeSheetTextGuard from '../components/home/HomeSheetTextGuard';

const TEXT_ERROR = 'Text strings must be rendered within a <Text> component.';
let mockThrow = true;
function Boom(): React.ReactElement {
  if (mockThrow) throw new Error(TEXT_ERROR);
  return <Text>ok</Text>;
}

describe('HomeSheetTextGuard', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    mockThrow = true;
    mockDebugError.mockClear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined); // React печатает пойманную ошибку
  });
  afterEach(() => { warn.mockRestore(); error.mockRestore(); });

  it('ошибка рендера: на месте пусто, [TEXT-OUTSIDE] со стеком компонентов и снимком данных, сохраняемый журнал', async () => {
    const screen = await render(
      <HomeSheetTextGuard name="home_poll_v2" resetKey="open" details={() => ({ phase: 'question', step: 1, total: 3 })}>
        <Boom />
      </HomeSheetTextGuard>,
    );
    expect(screen.queryByText('ok')).toBeNull();
    const call = warn.mock.calls.find((args) => args[0] === '[TEXT-OUTSIDE]');
    expect(call).toBeDefined();
    const payload = JSON.parse(String(call![1]));
    expect(payload).toEqual(expect.objectContaining({
      sheet: 'home_poll_v2', textOutside: true, details: { phase: 'question', step: 1, total: 3 }, shown: 'empty_sheet_content',
    }));
    expect(payload.componentStack.join(' ')).toContain('Boom');
    expect(mockDebugError).toHaveBeenCalledWith('[TEXT-OUTSIDE] home_poll_v2', expect.any(Error), 'critical');
  });

  it('новое открытие (resetKey) снова рисует содержимое', async () => {
    const screen = await render(<HomeSheetTextGuard name="home_poll_v2" resetKey="open"><Boom /></HomeSheetTextGuard>);
    expect(screen.queryByText('ok')).toBeNull();
    mockThrow = false;
    await screen.rerender(<HomeSheetTextGuard name="home_poll_v2" resetKey="closed"><Boom /></HomeSheetTextGuard>);
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('сбой снимка данных не ломает журнал', async () => {
    await render(
      <HomeSheetTextGuard name="home_survey" resetKey="open" details={() => { throw new Error('no model'); }}>
        <Boom />
      </HomeSheetTextGuard>,
    );
    const call = warn.mock.calls.find((args) => args[0] === '[TEXT-OUTSIDE]');
    expect(JSON.parse(String(call![1])).details).toEqual({ detailsFailed: 'no model' });
  });

  it('Главная: шторки опроса и анкеты обёрнуты предохранителем', () => {
    const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(home).toMatch(/<HomeSheetTextGuard\s+name="home_poll_v2"[\s\S]*?<HomePollV2Card /);
    expect(home).toMatch(/<HomeSheetTextGuard\s+name="home_survey"[\s\S]*?<SurveySheetModal/);
  });
});
