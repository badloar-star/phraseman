// зачем (владелец 01.10): старые спины и подарки удаляются без компенсации — перевод в
// монеты выключен по умолчанию. Сработал — нужен НОВЫЙ ответ владельца, а не правка теста.
import * as fs from 'fs';
import * as path from 'path';

describe('перевод подарков в монеты выключен (владелец 01.10)', () => {
  it('флаг gifts_to_coins_enabled по умолчанию false', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'remote_flags.ts'), 'utf8');
    expect(src).toMatch(/gifts_to_coins_enabled:\s*false,/);
    expect(src).not.toMatch(/gifts_to_coins_enabled:\s*true,/);
  });
});
