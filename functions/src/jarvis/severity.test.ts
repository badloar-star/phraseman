import { classifySeverity, dedupeDecisions, SEVERITY_LABEL } from './severity';
import type { Decision } from './decision';

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'content',
    finding: 'Обрыв на уроке 5',
    recommendation: 'Пройти урок самому',
    ...over,
  } as unknown as Decision;
}

describe('Jarvis severity — P0 to P3, and the same finding does not repeat', () => {
  test('payments and safety are P0 — a person is waiting', () => {
    expect(classifySeverity(decision({ department: 'payments' }))).toBe('P0');
    expect(classifySeverity(decision({ department: 'safety' }))).toBe('P0');
  });

  test('support is P1 — waiting, but not the worst kind', () => {
    expect(classifySeverity(decision({ department: 'support' }))).toBe('P1');
  });

  test('quality and money issues are P2', () => {
    expect(classifySeverity(decision({ department: 'quality' }))).toBe('P2');
    expect(classifySeverity(decision({ department: 'money' }))).toBe('P2');
  });

  test('growth, content, factory, retention are P3 — no one is stuck', () => {
    expect(classifySeverity(decision({ department: 'growth' }))).toBe('P3');
    expect(classifySeverity(decision({ department: 'content' }))).toBe('P3');
    expect(classifySeverity(decision({ department: 'factory' }))).toBe('P3');
    expect(classifySeverity(decision({ department: 'retention' }))).toBe('P3');
  });

  test('an explicit severity hint outranks the department default', () => {
    expect(classifySeverity(decision({
      department: 'payments',
      severityHint: 'P3',
    } as unknown as Partial<Decision>))).toBe('P3');
  });

  test('every severity has a plain-language label', () => {
    expect(SEVERITY_LABEL.P0).toMatch(/критич/i);
    expect(SEVERITY_LABEL.P3).toMatch(/подожда/i);
  });

  test('the same finding from the same department twice collapses to one', () => {
    // зачем: иначе три одинаковых суточных прогона шлют три одинаковых
    // сообщения, и владелец учится не читать их.
    const list = [
      decision({ department: 'payments', finding: 'X заплатили, доступ не выдался' }),
      decision({ department: 'payments', finding: 'X заплатили, доступ не выдался' }),
    ];
    expect(dedupeDecisions(list)).toHaveLength(1);
  });

  test('a different finding from the same department is kept separately', () => {
    const list = [
      decision({ department: 'payments', finding: 'A' }),
      decision({ department: 'payments', finding: 'B' }),
    ];
    expect(dedupeDecisions(list)).toHaveLength(2);
  });

  test('the same finding text from a different department is kept separately', () => {
    const list = [
      decision({ department: 'payments', finding: 'то же самое' }),
      decision({ department: 'safety', finding: 'то же самое' }),
    ];
    expect(dedupeDecisions(list)).toHaveLength(2);
  });

  test('an empty list stays empty', () => {
    expect(dedupeDecisions([])).toEqual([]);
  });

  test('order is preserved — the first occurrence wins', () => {
    const first = decision({ department: 'payments', finding: 'X', recommendation: 'первый' });
    const dup = decision({ department: 'payments', finding: 'X', recommendation: 'дубликат' });
    expect(dedupeDecisions([first, dup])[0].recommendation).toBe('первый');
  });
});
