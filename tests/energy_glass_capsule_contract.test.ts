// зачем (владелец 18.10 через координатора): энергия — ТОЛЬКО молния и число, подложки нет нигде (раньше: капсула в стеклянных шапках, 12.10).
import fs from 'node:fs';
import path from 'node:path';

const bar = fs.readFileSync(path.join(__dirname, '..', 'components/EnergyBar.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('EnergyBar: без подложки везде (владелец 18.10)', () => {
  // зачем (владелец через координатора 18.10): «убрать подложку-эллипс под молнией и числом ВЕЗДЕ» — заменяет капсулу Диалогов/занятия (12.10) и флаг Шпиля noCapsule (13.10).
  it('содержимое — только общий стиль размеров, без заливки, тени и обводки; капсульной ветки glass больше нет', () => {
    expect(bar).toContain('contentStyle={styles.capsule}');
    expect(bar).not.toContain('backgroundColor: lg.buttonFill');
    expect(bar).not.toContain('nestedBoxShadow');
    expect(bar).not.toMatch(/border(Width|Color)/);
  });

  it('размер блока 60×28 и зона нажатия 60×44 прежние', () => {
    expect(bar).toContain('const ENERGY_PILL_WIDTH = 60;');
    expect(bar).toContain('const ENERGY_PILL_HEIGHT = 28;');
    expect(bar).toContain('const ENERGY_PILL_TOUCH_HEIGHT = 44;');
  });

  it('смысловые цвета (перезаряд, мало) доводятся до порога к ФОНУ экрана, ∞ — цветом числа', () => {
    expect(bar).toContain('lowChargeInk(COLORS.overcharge, pageFills, lg.text)');
    expect(bar).toContain('lowChargeInk(glass ? lg.bad : COLORS.low, pageFills, lg.text)');
    expect(bar).toContain("<Text style={[styles.infinity, { color: valueColor }]}");
  });

  it('шапка занятия (EnergyMistakeHud): без заливки, кромки и кольца по контуру', () => {
    const hud = fs.readFileSync(path.join(__dirname, '..', 'components/energy/EnergyMistakeHud.tsx'), 'utf8');
    expect(hud).not.toMatch(/backgroundColor|borderWidth|borderColor|warnRing/);
  });

  it('вызов в шапке Диалогов остаётся glass (цвета стеклянной шапки)', () => {
    expect(fs.readFileSync(path.join(__dirname, '..', 'app/ai_dialog_home.tsx'), 'utf8')).toContain('<EnergyBar size={30} glass solidBolt />');
  });
});
