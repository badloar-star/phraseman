// зачем (координатор 13.10): Сверке нужен кадр подиума с длинными никами без пробела. dev_spire_preview?...&nicks=long ставит их на три первых места.
import { SPIRE_PREVIEW_LONG_NICKS, parseSpirePreviewOverrides, spirePreviewModel } from '../components/spire/spire_preview_fixtures';

describe('nicks=long в превью Пика', () => {
  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('параметр разбирается: long принимается, остальное игнорируется с предупреждением', () => {
    expect(parseSpirePreviewOverrides(undefined, undefined, undefined, 'long')).toEqual({ nicks: 'long' });
    expect(parseSpirePreviewOverrides(undefined, undefined, undefined, ['long'])).toEqual({ nicks: 'long' });
    expect(parseSpirePreviewOverrides(undefined, undefined, undefined, 'short')).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('nicks=short игнорирован'));
    expect(parseSpirePreviewOverrides(undefined, undefined, undefined, undefined)).toEqual({});
    expect(parseSpirePreviewOverrides('3', '4', '10', 'long')).toEqual({ tier: 3, floor: 4, steps: 10, nicks: 'long' });
  });

  it('с nicks=long на подиуме (три первых места) длинные ники без пробела, себя не переименовываем', () => {
    const model = spirePreviewModel('room', { nicks: 'long' });
    const rows = model.game.rows ?? [];
    const top3 = rows.slice(0, 3);
    const longNames = SPIRE_PREVIEW_LONG_NICKS.filter((n) => top3.some((r) => r.name === n));
    expect(longNames.length).toBeGreaterThan(0);
    for (const r of rows.filter((x) => SPIRE_PREVIEW_LONG_NICKS.includes(x.name))) expect(r.isMe).toBe(false);
    for (const n of SPIRE_PREVIEW_LONG_NICKS) expect(n).not.toMatch(/\s/);
    expect(rows.find((r) => r.isMe)?.name).toBe('Ты');
  });

  it('без параметра имена прежние', () => {
    const rows = spirePreviewModel('room', {}).game.rows ?? [];
    expect(rows.some((r) => SPIRE_PREVIEW_LONG_NICKS.includes(r.name))).toBe(false);
  });
});
