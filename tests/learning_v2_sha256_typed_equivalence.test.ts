// R08 (координатор 15.10): sha256Utf8 переписан на типизированные массивы (алгоритм прежний) — хэш обязан совпасть
// байт-в-байт с эталоном (node:crypto), иначе ломаются выданные отпечатки материала и проверка целостности.
import { createHash } from 'crypto';
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';

const reference = (value: string): string => createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');

describe('sha256Utf8 — совпадение с эталоном байт-в-байт', () => {
  it('краевые длины блока (0, 55, 56, 63, 64, 65, 119, 120, 128 байт)', () => {
    for (const n of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129]) {
      const value = 'a'.repeat(n);
      expect([n, sha256Utf8(value)]).toEqual([n, reference(value)]);
    }
  });

  it('кириллица, двухбайтовые, трёхбайтовые и эмодзи (4 байта)', () => {
    for (const value of ['привет', 'ñandú', 'ü€£', '日本語テキスト', '🙂👍🏽🇺🇦', 'mix: Ä🙂я€a', 'línea\nnueva\t"кавычки"']) {
      expect([value, sha256Utf8(value)]).toEqual([value, reference(value)]);
    }
  });

  it('случайные строки разных длин (детерминированный генератор)', () => {
    let seed = 42;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    const alphabet = ['a', 'Z', '0', ' ', 'я', 'ж', 'é', '€', '🙂', '"', '\\', '\n'];
    for (let i = 0; i < 300; i += 1) {
      const len = rnd() % 400;
      let value = '';
      for (let k = 0; k < len; k += 1) value += alphabet[rnd() % alphabet.length];
      expect(sha256Utf8(value)).toBe(reference(value));
    }
  });

  it('большой канонический JSON ~200 КБ (размер материала занятия) — совпадает и считается быстро', () => {
    const body = { items: Array.from({ length: 2500 }, (_, i) => ({ id: `en:lesson-01:session-01:i${i}`, text: `Фраза ${i} — I like coffee 🙂`, n: i })) };
    const json = canonicalJsonV1(body);
    expect(json.length).toBeGreaterThan(150_000);
    const started = Date.now();
    const ours = hashCanonicalBody(body);
    const ms = Date.now() - started;
    expect(ours).toBe(reference(json));
    console.log(`[V2-PREP] sha256 ${json.length} символов за ${ms} мс`);
  });
});
