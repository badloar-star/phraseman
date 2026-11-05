// зачем (координатор 29.10: «без 9 языков в коммит не брать»): тексты «Рекорда этажа» Пика заданы на всех 9 языках интерфейса; не-ru/uk не содержат кириллицы
// (раньше en, es, pt-BR, vi, id, tr, pl видели русский из тернарника uk ? 'укр' : 'рус'); оба экрана берут текст только из spire_record_copy.
import fs from 'node:fs';
import path from 'node:path';

import { recordCopy, SPIRE_RECORD_COPY, type SpireRecordCopyKey } from '../components/spire/spire_record_copy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const KEYS = Object.keys(SPIRE_RECORD_COPY) as SpireRecordCopyKey[];
const CYRILLIC = /[Ѐ-ӿ]/;
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Рекорд этажа: 9 языков', () => {
  it('24 фразы, каждая задана на каждом из 9 языков непустым текстом', () => {
    expect(KEYS).toHaveLength(24);
    for (const key of KEYS) for (const lang of LANGS) expect(recordCopy(lang, key).trim().length).toBeGreaterThan(0);
  });

  it('у en, es, pt-BR, vi, id, tr, pl нет кириллицы, у ru и uk — есть', () => {
    for (const key of KEYS) {
      for (const lang of LANGS) {
        const text = recordCopy(lang, key);
        if (lang === 'ru' || lang === 'uk') {
          if (key !== 'yours' && key !== 'tenOfTen') expect(CYRILLIC.test(text)).toBe(true);
        } else {
          expect(`${key}/${lang}: ${CYRILLIC.test(text) ? 'кириллица' : 'ок'}`).toBe(`${key}/${lang}: ок`);
        }
      }
    }
  });

  it('переводы разные: en не равен ru ни в одной фразе, кроме чисел', () => {
    for (const key of KEYS) expect(recordCopy('en', key)).not.toBe(recordCopy('ru', key));
  });

  it('оба экрана рекорда берут текст из spire_record_copy, тернарников «uk ? … : …» нет', () => {
    for (const file of ['components/spire/SpireFloorRecord.tsx', 'components/spire/SpireRecordAttempt.tsx']) {
      const src = read(file);
      expect(src).toContain("from './spire_record_copy'");
      expect(src).not.toMatch(/\buk \?/);
      expect(src).not.toMatch(/lang === 'uk'/);
    }
  });

  it('неизвестный язык получает английский', () => {
    expect(recordCopy('xx' as never, 'close')).toBe(recordCopy('en', 'close'));
  });
});
