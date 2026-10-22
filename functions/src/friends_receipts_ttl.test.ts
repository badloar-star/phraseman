import { readFileSync } from 'fs';
import { join } from 'path';

// зачем (Ревизор 22.10, 💸): квитанции повторов «Друзей» стираются TTL Firestore через 30 дней — только если в каждой записи
// есть поле expireAt. Новая запись квитанции без него копилась бы вечно.
const FILES = ['friends_duel.ts', 'friends_lesson_together.ts'];

describe('квитанции «Друзей» несут expireAt для TTL', () => {
  test.each(FILES)('%s: каждая запись receiptRef ставит expireAt', (file) => {
    const src = readFileSync(join(__dirname, file), 'utf8').replace(/\r\n?/g, '\n');
    const writes = src.split('\n').filter((line) => /tx\.set\(receiptRef,/.test(line));
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.filter((line) => !/expireAt: new Date\(now \+ RECEIPT_TTL_MS\)/.test(line))).toEqual([]);
    expect(src).toMatch(/const RECEIPT_TTL_MS = 30 \* 24 \* 60 \* 60 \* 1000;/);
  });
});
