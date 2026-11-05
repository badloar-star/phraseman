// Раунд 2, Настройки п.4: при включении «Звуковые эффекты» играет короткий звук «верно»; при выключении — тишина.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_edu.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Настройки → «Звуковые эффекты»', () => {
  it("импортирует playSfx и играет 'correct' только при включении", () => {
    expect(src).toContain('  playSfx,\n');
    expect(src).toContain("if (value) playSfx('correct');");
  });
  it('звук идёт после синхронной установки флага: setFcSfxEnabled вызывается раньше', () => {
    expect(src.indexOf('setFcSfxEnabled(value)')).toBeLessThan(src.indexOf("playSfx('correct')"));
  });
});
