// зачем (координатор 12.10, EN_READINESS): showToast экрана повышения ранга ставил `uk: ru` — украинцу 8 тостов шли
// по-русски. Сторож: у каждого вызова 10 аргументов (type, ru, uk, en, es, pt-BR, vi, id, tr, pl), uk — свой текст без русских букв,
// en — непустой; es…pl (координатор 15.10, R54) — свой текст, не копия английского.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'coin_rank.tsx'), 'utf8').replace(/\r\n/g, '\n');
const ARG = String.raw`'((?:[^'\\]|\\.)*)'`;
const CALL_RE = new RegExp(String.raw`showToast\('(success|error|info|warning)',\s*` + Array(9).fill(ARG).join(String.raw`,\s*`) + String.raw`\)`, 'g');

describe('coin_rank: тосты повышения ранга на украинском', () => {
  const calls = [...source.matchAll(CALL_RE)].map((m) => ({ type: m[1], ru: m[2], uk: m[3], en: m[4], rest: m.slice(5, 11) }));

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
      for (const text of call.rest) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toBe(call.en);
      }
    }
  });

  it('showToast отдаёт uk из своего аргумента, а не копию ru', () => {
    expect(source).not.toContain('uk: ru,');
    expect(source).toMatch(/ru: string,\n\s+uk: string,\n\s+en: string,\n\s+es: string,/);
    expect(source).not.toContain('es: en,');
  });
});
