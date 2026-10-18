// зачем (сверка dialogs-001/007, Макеты 4fbcfc81d, координатор 12.10): в стеклянных шапках (Диалоги, занятие Learning V2) энергия — в капсуле, как `energy()` в kit.js и в эталоне «Тень».
// Капсула — заливка токена темы + внутренняя тень «Тень», без обводки; размер прежний (владелец 24.09); вне glass пилюля по-прежнему без фона.
import fs from 'node:fs';
import path from 'node:path';

const bar = fs.readFileSync(path.join(__dirname, '..', 'components/EnergyBar.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('EnergyBar: капсула в стеклянной шапке', () => {
  it('в glass-режиме содержимое получает заливку buttonFill (токен кнопки, ≥ 1,5 к странице; opaqueControl сливался с фоном), полный радиус и внутреннюю тень; вне glass — null', () => {
    expect(bar).toContain("glass && !noCapsule ? { backgroundColor: lg.buttonFill, borderRadius: ENERGY_PILL_HEIGHT / 2, boxShadow: nestedBoxShadow(lg) } : null,");
    expect(bar).toContain("import { nestedBoxShadow } from './v2/ShadowSurface';");
  });

  it('без обводки и без hex-цветов в капсуле; прежний размер 60×28 и общий стиль капсулы не менялись', () => {
    const start = bar.indexOf('glass && !noCapsule ? { backgroundColor: lg.buttonFill');
    const line = bar.slice(start, bar.indexOf('\n', start));
    expect(line).not.toMatch(/border(Width|Color)/);
    expect(line).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(bar).toContain('const ENERGY_PILL_WIDTH = 60;');
    expect(bar).toContain('const ENERGY_PILL_HEIGHT = 28;');
    expect(bar).not.toContain('borderWidth: 1');
  });

  // зачем (приказ владельца 01.10 «⚡ N в шапке Шпиля — только значок и число, без фона», координатор 13.10): Шпиль — без капсулы.
  it('шапка Шпиля и ступени: glass без капсулы (noCapsule), остальные glass-шапки с капсулой', () => {
    const spire = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireEnergyPill.tsx'), 'utf8');
    expect(spire).toContain('<EnergyBar ownerActive={ownerActive} glass noCapsule />');
    for (const rel of ['app/ai_dialog_home.tsx', 'app/lesson_menu.tsx', 'app/lesson1.tsx']) {
      expect(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).not.toContain('noCapsule');
    }
  });

  it('вызов в шапке Диалогов остаётся glass (капсула придёт именно туда)', () => {
    expect(fs.readFileSync(path.join(__dirname, '..', 'app/ai_dialog_home.tsx'), 'utf8')).toContain('<EnergyBar size={30} glass solidBolt />');
  });
});
