// зачем (удобство №1, владелец 04.11): повторный тап по открытой вкладке сообщает шине; экран вкладки прокручивается в начало.
import fs from 'node:fs';
import path from 'node:path';
import { emitTabRetap, subscribeTabRetap } from '../app/tab_retap_bus';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('повторный тап по вкладке', () => {
  it('шина доставляет событие подписчикам и считает услышавших; отписка работает', () => {
    const seen: number[] = [];
    const off = subscribeTabRetap((i) => seen.push(i));
    expect(emitTabRetap(4)).toBe(1);
    expect(seen).toEqual([4]);
    off();
    expect(emitTabRetap(4)).toBe(0);
  });

  it('упавший слушатель не мешает остальным', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: number[] = [];
    const offBad = subscribeTabRetap(() => { throw new Error('boom'); });
    const offGood = subscribeTabRetap((i) => seen.push(i));
    expect(emitTabRetap(1)).toBe(1);
    expect(seen).toEqual([1]);
    expect(warn).toHaveBeenCalled();
    offBad(); offGood(); warn.mockRestore();
  });

  it('панель вкладок сообщает шине вместо немого выхода, переходы не тронуты', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain('emitTabRetap(idx)');
    const i = layout.indexOf('emitTabRetap(idx)');
    expect(layout.slice(i, i + 200)).toContain('return;');
    expect(layout).toContain('setActiveIdx(idx);');
  });

  it('Настройки прокручиваются в начало по повторному тапу', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain('useTabRetapScrollTop(4,');
  });
});
