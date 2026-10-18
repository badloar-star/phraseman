// зачем (координатор 17.10): «назад» на карте V2 срабатывал с задержкой 3–6 с — журнал [BACK-BTN] показывает экран, обработчик, решение и время до смены экрана,
// а также занят ли JS-поток. Сторож: журнал не теряет тап, не пишет без тапа и подключён в «назад» вкладки «Обучение».
import fs from 'node:fs';
import path from 'node:path';

// перепин 18.10 (Ревизор 3.44): проба «назад» закрыта за __DEV__ && !IS_STORE_RELEASE и тянет app/config — ему нужен Platform; в jest __DEV__ = true, стор-режим выключен
jest.mock('react-native', () => {
  // зачем: с подменой react-native глобальный __DEV__ в этом окружении не определён — проба «выключилась» бы как в сторе; тест проверяет dev-поведение
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  return {
    InteractionManager: { runAfterInteractions: (cb: () => void) => { cb(); return { cancel: () => undefined }; } },
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  };
});

import { noteBackArrived, noteBackDecision, noteBackTap, resetBackTapProbeForTests } from '../app/back_tap_probe';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const lines = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => String(c[0]));

describe('[BACK-BTN]: журнал тапа «назад»', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as { requestAnimationFrame?: (cb: () => void) => number }).requestAnimationFrame = (cb) => { cb(); return 1; };
    resetBackTapProbeForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.useRealTimers(); log.mockRestore(); warn.mockRestore(); });

  it('тап → решение → «пришли»: одна цепочка с номером и временем', () => {
    noteBackTap('v2_map', 'header_back_button', { page: 'v2', canGoBack: true });
    noteBackDecision('tab_v2_map → goHome');
    jest.advanceTimersByTime(40);
    noteBackArrived('lessons_tab', 'tab_hidden');
    const out = lines(log).join('\n');
    expect(out).toContain('[BACK-BTN] tap');
    expect(out).toContain('"screen":"v2_map"');
    expect(out).toContain('"canGoBack":true');
    expect(out).toContain('[BACK-BTN] decision');
    expect(out).toContain('tab_v2_map → goHome');
    expect(out).toContain('[BACK-BTN] arrived');
    expect(out).toMatch(/"ms":\d+/);
  });

  it('без тапа «пришли» ничего не пишет', () => {
    noteBackArrived('lessons_tab', 'tab_hidden');
    expect(lines(log).filter((l) => l.includes('arrived'))).toHaveLength(0);
  });

  it('JS-поток занят: дрейф таймера попадает в журнал; без прихода за 8 с — no-arrival', () => {
    noteBackTap('v2_map', 'header_back_button');
    // имитируем блокировку потока: время уходит вперёд на 1 с без срабатывания таймеров
    const realNow = Date.now;
    let offset = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offset);
    offset = 1000;
    jest.advanceTimersByTime(250);
    expect(lines(log).join('\n')).toContain('[BACK-BTN] js-blocked');
    offset = 9000;
    jest.advanceTimersByTime(250);
    expect(lines(warn).join('\n')).toContain('[BACK-BTN] no-arrival');
    (Date.now as unknown as jest.SpyInstance).mockRestore();
  });

  it('подключён в «назад» вкладки «Обучение»: тап, решение в каждой ветке, итог страницей/вкладкой/закрытием', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('noteBackTap(page === "v2" ? "v2_map"');
    for (const d of ['push_v2_route → safeRouterBack', 'tab_v2_map → goHome', 'page_other → setPage(lessons)', 'tab_legacy_list → setPage(v2)', 'tab_legacy_list_no_v2 → goHome', 'push_legacy_list → safeRouterBack']) {
      expect(lessons).toContain(`noteBackDecision("${d}"`);
    }
    expect(lessons).toContain('noteBackArrived("lessons_tab", "tab_hidden")');
    expect(lessons).toContain('noteBackArrived("lessons_tab", "unmount")');
  });
});
