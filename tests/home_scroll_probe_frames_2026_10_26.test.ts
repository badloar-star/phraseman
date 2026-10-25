// зачем (координатор 26.10, «сперва логи» для «скролл стал дёрганым»): окно прокрутки Главной печатает не только перерисовки, но и промежутки между кадрами JS-потока.
import { endHomeScrollWindow, noteHomeFrameGap, startHomeScrollWindow } from '../app/home_scroll_probe';

describe('[HOME-SCROLL]: промежутки между кадрами', () => {
  it('итог окна считает кадры, самый длинный промежуток и кадры дольше 50 и 100 мс', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      startHomeScrollWindow();
      for (const gap of [16, 120, 40, 60]) noteHomeFrameGap(gap);
      endHomeScrollWindow('test');
      const line = log.mock.calls.find((call) => call[1] === 'end:test');
      expect(line).toBeDefined();
      const row = JSON.parse(String(line?.[2])) as Record<string, number | null>;
      expect(row.frames).toBe(4);
      expect(row.maxGapMs).toBe(120);
      expect(row.over50).toBe(2);
      expect(row.over100).toBe(1);
      expect(row.avgGapMs).toBe(59);
    } finally {
      log.mockRestore();
    }
  });

  it('вне окна прокрутки кадры не считаются', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      noteHomeFrameGap(500);
      startHomeScrollWindow();
      endHomeScrollWindow('empty');
      const line = log.mock.calls.find((call) => call[1] === 'end:empty');
      const row = JSON.parse(String(line?.[2])) as Record<string, number | null>;
      expect(row.maxGapMs).toBeLessThan(500);
    } finally {
      log.mockRestore();
    }
  });
});
