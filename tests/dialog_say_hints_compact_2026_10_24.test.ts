// Тесный режим подсказок «Можно сказать…» (жалоба тестера 24.10: при открытой клавиатуре на маленьком экране ленте реплик не хватало высоты).
// compact=true: нет строки-подписи, фраза до 2 строк, смысл 1 строка, меньший отступ; по умолчанию режим выключен — обычная вёрстка не меняется.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/hints/DialogSayHints.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('DialogSayHints: тесный режим', () => {
  it('размеры тесного режима строже обычных', () => {
    expect(src).toMatch(/compact: \{ phraseLines: 2, meaningLines: 1, marginBottom: 8 \}/);
    expect(src).toMatch(/wrap: \{ marginBottom: 10, labelGap: 6 \}/);
  });
  it('режим выключен по умолчанию и убирает только подпись, фразы остаются', () => {
    expect(src).toMatch(/compact = false/);
    expect(src).toMatch(/\{compact \? null : \(/);
    expect(src).toMatch(/numberOfLines=\{compact \? L\.compact\.phraseLines : 3\}/);
    expect(src).toMatch(/numberOfLines=\{compact \? L\.compact\.meaningLines : 3\}/);
  });
});
