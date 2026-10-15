// зачем (граница доступа, аудит R58 #24): прямая ссылка lesson1?combo= без Plus → контента комбо нет.
import { readFileSync } from 'fs';
import path from 'path';
import { comboGateDecision } from '../app/combo_lesson_gate';

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
