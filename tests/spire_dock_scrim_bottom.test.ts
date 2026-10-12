// зачем (Макеты, spire-011): затемнение дока Шпиля обязано доходить до низа экрана — иначе под нижним окном видны края аватаров из прокручиваемого содержимого
// (в бою низ закрывает плавающая панель вкладок, в dev-превью её нет). Нижний вылет считается от того же bottomPad, что и положение дока.
import { readFileSync } from 'fs';
import { join } from 'path';

const home = readFileSync(join(__dirname, '..', 'components', 'spire', 'SpireHomeScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: затемнение дока до низа экрана', () => {
  it('док стоит на bottomPad - 24, а затемнение вылетает вниз не меньше этого отступа', () => {
    expect(home).toContain("style={[s.dock, { bottom: bottomPad - 24 }]}");
    expect(home).toContain('style={[s.scrim, { bottom: -Math.max(40, bottomPad - 24) }]}');
  });

  it('прежние боковые и верхний вылеты затемнения не менялись', () => {
    expect(home).toMatch(/scrim: \{ position: 'absolute', left: -V2\.screenPad, right: -V2\.screenPad, top: -40, bottom: -40 \}/);
  });
});
