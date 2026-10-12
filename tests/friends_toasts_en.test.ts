// зачем (координатор 12.10, EN_READINESS): 5 тостов экрана друзей («Пятюня получена», «Друг убран», ошибки) несли
// messageRu/Uk/Es/… без messageEn — английский интерфейс видел запасной язык. Сторож: у каждого action_toast файла
// есть непустой messageEn без кириллицы.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'), 'utf8').replace(/\r\n/g, '\n');

function toastBlocks(): string[] {
  const blocks: string[] = [];
  let i = 0;
  for (;;) {
    i = source.indexOf("emitAppEvent('action_toast', {", i);
    if (i < 0) return blocks;
    const end = source.indexOf('});', i);
    blocks.push(source.slice(i, end));
    i = end;
  }
}

describe('друзья: тосты на английском', () => {
  it('у каждого тоста есть messageEn', () => {
    const blocks = toastBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(7);
    for (const block of blocks) {
      const en = /messageEn:\s*(?:texts\.en|(['"`])([\s\S]*?)\1)/.exec(block);
      expect(en).not.toBeNull();
      if (en && en[2] !== undefined) {
        expect(en[2].trim().length).toBeGreaterThan(0);
        expect(en[2]).not.toMatch(/[А-Яа-яЁё]/);
      }
    }
  });
});
