// зачем (граница доступа, аудит R58 #24): прямая ссылка lesson1?combo= без Plus → контента комбо нет.
import { readFileSync } from 'fs';
import path from 'path';
import { comboGateDecision } from '../app/combo_gate_decision';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('замок комбо-ссылки', () => {
  it('не комбо — пускаем всегда', () => {
    expect(comboGateDecision({ comboActive: false, hasPremiumAccess: false, accessResolved: false })).toBe('allow');
  });
  it('комбо, статус неизвестен → ждём (контент закрыт)', () => {
    expect(comboGateDecision({ comboActive: true, hasPremiumAccess: false, accessResolved: false })).toBe('pending');
  });
  it('комбо, Free подтверждён → отказ', () => {
    expect(comboGateDecision({ comboActive: true, hasPremiumAccess: false, accessResolved: true })).toBe('deny');
  });
  it('комбо, Plus → пускаем', () => {
    expect(comboGateDecision({ comboActive: true, hasPremiumAccess: true, accessResolved: true })).toBe('allow');
  });
  it('lesson1 экспортируется через замок; журнал [COMBO-GATE]', () => {
    expect(read('app/lesson1.tsx')).toContain('export default withComboPlusGate(withLessonRuntimeAccessBoundary(LessonScreen));');
    expect(read('app/combo_lesson_gate.tsx')).toContain('[COMBO-GATE]');
  });
});

describe('потолки замка (Ревизор c3271a1c0)', () => {
  it('pending и ожидание после пейвола ограничены потолком, Inner в memo', () => {
    const src = read('app/combo_lesson_gate.tsx');
    expect(read('app/combo_gate_decision.ts')).toContain('COMBO_GATE_CAP_MS = 5000');
    expect(src).toContain('pending_cap_');
    expect(src).toContain('paywall_closed_without_plus');
    expect(src).toContain('React.memo(Inner)');
    expect(src).toContain('paywall_closed_without_purchase'); // ✕ без покупки — выход сразу
    expect(src).toContain("onAppEvent('premium_activated'");
  });
});
