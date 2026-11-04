// Сторож (UX-волна 2, 04.11, владелец одобрил): конфетти, нажатие TapScale и эквалайзер голоса уважают системное «Уменьшение движения».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Reduce Motion: конфетти, TapScale, эквалайзер', () => {
  it('ConfettiBurst: один гейт — частицы не рисуются, таймер onDone остаётся', () => {
    const s = read('components/feedback/ConfettiBurst.tsx');
    expect(s).toContain("import { useReduceMotion } from '../../hooks/use_reduce_motion';");
    expect(s).toContain('if (reduceMotion) return null;');
    // onDone по таймеру регистрируется ДО гейта — иначе при Reduce Motion закрытие окна зависнет
    expect(s.indexOf('runOnJS(onDone)()')).toBeLessThan(s.indexOf('if (reduceMotion) return null;'));
  });
  it('TapScale: при Reduce Motion масштаб не играется, прозрачность остаётся', () => {
    const s = read('components/TapScale.tsx');
    expect(s).toContain('const pressScale = reduceMotion ? 1 : scaleTo;');
    expect(s).toContain('toValue: pressScale,');
    expect(s).toContain('KIT_PRESS_OPACITY_DOWN');
  });
  it('эквалайзер голоса: idle-цикл не стартует при Reduce Motion', () => {
    const s = read('app/voice_equalizer.tsx');
    expect(s).toContain('if (levelDriven || !active || reduceMotion) return;');
    expect(s).toContain('[levelDriven, active, reduceMotion, startIdle, stopIdle]');
  });
});
