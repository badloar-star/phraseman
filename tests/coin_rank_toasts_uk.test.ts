// зачем (координатор 12.10, EN_READINESS): showToast экрана повышения ранга ставил `uk: ru` — украинцу 8 тостов шли
// по-русски. Сторож: у каждого вызова 4 аргумента (type, ru, uk, en), uk — свой текст без русских букв, en — непустой.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'coin_rank.tsx'), 'utf8').replace(/\r\n/g, '\n');
const CALL_RE = /showToast\('(success|error|info|warning)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/g;

describe('coin_rank: тосты повышения ранга на украинском', () => {
  const calls = [...source.matchAll(CALL_RE)].map((m) => ({ type: m[1], ru: m[2], uk: m[3], en: m[4] }));

  it('все вызовы — с отдельным украинским текстом', () => {
    const totalCalls = (source.match(/showToast\('/g) ?? []).length;
    expect(calls).toHaveLength(totalCalls);
    expect(calls.length).toBeGreaterThanOrEqual(8);
    for (const call of calls) {
      expect(call.uk).not.toBe(call.ru);
      expect(call.uk).not.toMatch(/[ыэъёЫЭЪЁ]/);
      expect(call.uk).toMatch(/[іїєґІЇЄҐ’]|[А-Яа-я]/);
      expect(call.en.trim().length).toBeGreaterThan(0);
      expect(call.en).not.toMatch(/[А-Яа-яЁё]/);
    }
  });

  it('showToast отдаёт uk из своего аргумента, а не копию ru', () => {
    expect(source).not.toContain('uk: ru,');
    expect(source).toMatch(/ru: string,\n\s+uk: string,\n\s+en: string,/);
  });
});
