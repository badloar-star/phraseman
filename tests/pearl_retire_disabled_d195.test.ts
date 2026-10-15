// D195 (владелец 15.10): старые бонусы конвертируются в монеты — жемчуг на телефоне не сжигается. Сработал — спроси владельца, не чини сторожа.
import fs from 'node:fs';
import path from 'node:path';

describe('D195: сжигание жемчуга выключено', () => {
  it('эффект _layout выходит до загрузки pearl_retire_d70', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain('const PEARL_RETIRE_DISABLED_D195 = true;');
    const at = src.indexOf("void import('./pearl_retire_d70')");
    expect(at).toBeGreaterThan(-1);
    const guard = src.lastIndexOf('if (PEARL_RETIRE_DISABLED_D195) return;', at);
    expect(guard).toBeGreaterThan(-1);
    expect(at - guard).toBeLessThan(800);
  });
});
