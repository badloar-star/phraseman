// зачем (координатор 15.10, Сверка tabs_tap_r7d: крестик пейвола из Настроек 532–668 мс, цель ≤ 250; сперва логи): таймлайн закрытия [PAYWALL-CLOSE-TIMING] обязан
// (1) молчать, пока закрытие не начато; (2) начинаться с handleClose и показывать нарастающее время и дельту; (3) считать перерисовки Настроек, пока закрытие идёт;
// (4) заканчиваться итогом на втором кадре Настроек или по предохранителю; (5) писать «пульс» JS-потока после вызова dismiss. Точки расставлены в путях закрытия (проверка текста).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('paywall_close_trace', () => {
  let lines: string[];
  let logSpy: jest.SpyInstance;
  let trace: typeof import('../app/paywall_close_trace');

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    lines = [];
    logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(String(args[0])); });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    trace = require('../app/paywall_close_trace');
  });
  afterEach(() => {
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it('молчит, пока закрытие не начато', () => {
    trace.paywallCloseMark('dismiss:call');
    trace.paywallCloseRender('SettingsMain');
    expect(lines).toEqual([]);
  });

  it('handleClose запускает отсчёт; этапы показывают время и дельту, перерисовки считаются, второй кадр даёт итог', () => {
    trace.paywallCloseMark('handleClose', 'via=x');
    jest.advanceTimersByTime(30);
    trace.paywallCloseMark('doClose:analytics_done');
    jest.advanceTimersByTime(20);
    trace.paywallCloseRender('SettingsMain');
    trace.paywallCloseRender('SettingsMain');
    trace.paywallCloseMark('settings:frame');
    expect(lines[0]).toContain('stage=handleClose +0ms d=0ms via=x');
    expect(lines.some((l) => l.includes('stage=doClose:analytics_done +30ms d=30ms'))).toBe(true);
    expect(lines.some((l) => l.includes('render SettingsMain n=2 +50ms'))).toBe(true);
    expect(lines[lines.length - 1]).toContain('END reason=settings_frame total=50ms settingsRenders=2');
    lines.length = 0;
    trace.paywallCloseMark('settings:focus');
    expect(lines).toEqual([]);
  });

  it('после dismiss:call пишет пульс JS-потока четыре раза', () => {
    trace.paywallCloseMark('handleClose');
    trace.paywallCloseMark('dismiss:call', 'branch=dismiss(1)');
    jest.advanceTimersByTime(300);
    expect(lines.filter((l) => l.includes('] tick ')).length).toBe(4);
  });

  it('предохранитель закрывает отсчёт через 3 с, если второго кадра не было', () => {
    trace.paywallCloseMark('handleClose');
    jest.advanceTimersByTime(3000);
    expect(lines[lines.length - 1]).toContain('END reason=safety_timeout');
  });
});

describe('точки журнала в путях закрытия', () => {
  it('handleClose / doClose / dismiss / размонтирование / Настройки', () => {
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain("paywallCloseMark('handleClose',");
    expect(purchase).toContain("paywallCloseMark('doClose:analytics_start');");
    expect(purchase).toContain("paywallCloseMark('doClose:analytics_done');");
    expect(read('app/navigation_back.ts')).toContain("paywallCloseMark('dismiss:pre_log',");
    expect(read('app/navigation_back.ts')).toContain("paywallCloseMark('dismiss:call',");
    expect(read('app/premium_modal.tsx')).toContain("paywallCloseMark('paywall:unmount');");
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain("paywallCloseRender('SettingsMain');");
    expect(settings).toContain("paywallCloseMark('settings:focus');");
    expect(settings).toContain("paywallCloseMark('settings:frame1');");
    expect(settings).toContain("paywallCloseRenderCause('SettingsMain', () => ({");
    expect(settings).toContain('paywallCloseProfile(id, phase, actualDuration);');
  });

  // зачем (Сверка 10:45: 7 перерисовок Настроек за секунду после крестика): журнал причин показывает, КАКИЕ значения изменились перед каждой перерисовкой
  const freshTrace = () => {
    const lines: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(String(args[0])); });
    jest.resetModules();
    // зачем (Ревизор P9, 15.10): зонд причин работает только в dev-сборке — в тесте включаем флаг явно
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const trace = require('../app/paywall_close_trace') as typeof import('../app/paywall_close_trace');
    return { lines, trace, restore: () => logSpy.mockRestore() };
  };

  it('cause: молчит вне закрытия, но запоминает базу; в закрытии называет изменившиеся значения или «нет»', () => {
    const { lines, trace, restore } = freshTrace();
    try {
      trace.paywallCloseRenderCause('SettingsMain', { focusTick: 1, lang: 'ru' });
      expect(lines).toEqual([]);
      trace.paywallCloseMark('handleClose');
      lines.length = 0;
      trace.paywallCloseRender('SettingsMain');
      trace.paywallCloseRenderCause('SettingsMain', { focusTick: 2, lang: 'ru' });
      trace.paywallCloseRender('SettingsMain');
      trace.paywallCloseRenderCause('SettingsMain', { focusTick: 2, lang: 'ru' });
      expect(lines.some((l) => /cause SettingsMain n=1 .*changed=focusTick$/.test(l))).toBe(true);
      expect(lines.some((l) => /cause SettingsMain n=2 .*changed=нет$/.test(l))).toBe(true);
    } finally { restore(); }
  });

  it('profile: цена коммита видна только пока закрытие идёт', () => {
    const { lines, trace, restore } = freshTrace();
    try {
      trace.paywallCloseProfile('settings_body', 'update', 41.6);
      expect(lines).toEqual([]);
      trace.paywallCloseMark('handleClose');
      trace.paywallCloseProfile('settings_body', 'update', 41.6);
      expect(lines.some((l) => /profile id=settings_body phase=update actualMs=42/.test(l))).toBe(true);
    } finally { restore(); }
  });
});

describe('paywallCloseRenderCause: зонд только в dev (Ревизор P9, 15.10)', () => {
  it('значения передаются функцией; в релизе и стор-сборке ничего не собирается и не копируется', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_close_trace.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain("const TRACE_BUILD = typeof __DEV__ !== 'undefined' && __DEV__ && !IS_STORE_RELEASE;");
    expect(src).toMatch(/if \(!TRACE_BUILD\) return;\n\s*const values = typeof getValues === 'function' \? getValues\(\) : getValues;/);
    const settings = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(settings).toContain("paywallCloseRenderCause('SettingsMain', () => ({");
  });
});
