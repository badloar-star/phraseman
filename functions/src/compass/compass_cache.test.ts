import { compassSignature, compassHashFor } from './compass_cache';

describe('compass_cache — подпись дня и хэш', () => {
  it('подпись стабильна и не зависит от порядка тем', () => {
    const a = compassSignature({ dayType: 'repair', topics: ['article', 'verb'], level: 2 });
    const b = compassSignature({ dayType: 'repair', topics: ['verb', 'article'], level: 2 });
    expect(a).toBe(b);
  });

  it('разный тип дня → разная подпись', () => {
    const a = compassSignature({ dayType: 'easy', topics: ['verb'], level: 2 });
    const b = compassSignature({ dayType: 'repair', topics: ['verb'], level: 2 });
    expect(a).not.toBe(b);
  });

  it('подпись нормализует регистр/пробелы тем', () => {
    const a = compassSignature({ dayType: 'easy', topics: [' Article '], level: 1 });
    const b = compassSignature({ dayType: 'easy', topics: ['article'], level: 1 });
    expect(a).toBe(b);
  });

  it('хэш = 40 hex, стабилен, зависит от языка', () => {
    const sig = compassSignature({ dayType: 'easy', topics: ['verb'], level: 1 });
    const ru = compassHashFor(sig, 'ru');
    const en = compassHashFor(sig, 'en');
    expect(ru).toHaveLength(40);
    expect(ru).toBe(compassHashFor(sig, 'ru'));
    expect(ru).not.toBe(en);
  });
});
