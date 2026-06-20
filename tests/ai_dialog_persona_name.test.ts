import { DIALOG_SCENARIOS } from '../app/ai_dialog_scenarios';

/**
 * Контракт извлечения имени персонажа из persona-строки для шапки-мессенджера.
 *
 * Логика ДОЛЖНА совпадать с `extractPersonaName` в app/ai_dialog_session.tsx.
 * Функция там не экспортирована (экран .tsx с нативными импортами не грузится
 * в jest — см. правило про чистые модули), поэтому копия regex живёт здесь и
 * проверяется против реального каталога persona. Если меняешь regex на экране —
 * синхронизируй и тут.
 */
function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

describe('extractPersonaName', () => {
  it('reads plain first names', () => {
    expect(extractPersonaName('Your name is Mia. You are a barista.')).toBe('Mia');
    expect(extractPersonaName('Your name is Maximilian. You are an actor.')).toBe('Maximilian');
  });

  it('keeps titled names intact (the Mr./Dr. dot must not cut the name)', () => {
    expect(extractPersonaName('Your name is Mr. Patel. You are a pharmacist.')).toBe('Mr. Patel');
    expect(extractPersonaName('Your name is Dr. Hale. You are a doctor.')).toBe('Dr. Hale');
    expect(extractPersonaName('Your name is Mr. Sterling. You are an interviewer.')).toBe('Mr. Sterling');
  });

  it('handles names with hyphens and digits', () => {
    expect(extractPersonaName('Your name is UNIT-7. You are a robot.')).toBe('UNIT-7');
    expect(extractPersonaName('Your name is HELPER-BOT. You are a bot.')).toBe('HELPER-BOT');
  });

  it('stops at a comma when the name is followed by a clause', () => {
    expect(extractPersonaName('Your name is Carmen, a warm guest.')).toBe('Carmen');
  });

  it('returns empty string when there is no persona / no name', () => {
    expect(extractPersonaName(undefined)).toBe('');
    expect(extractPersonaName('You are a friendly barista with no stated name.')).toBe('');
  });

  it('every scenario persona yields a clean, non-truncated name', () => {
    const withPersona = DIALOG_SCENARIOS.filter((s) => s.persona);
    expect(withPersona.length).toBeGreaterThan(0);
    for (const scenario of withPersona) {
      const name = extractPersonaName(scenario.persona);
      // Имя есть и не пустое.
      expect(name.length).toBeGreaterThan(0);
      // Не обрезано до одного титула без имени.
      expect(name).not.toMatch(/^(Mr|Mrs|Ms|Dr|Prof)\.?$/i);
      // Без хвоста описания (не «Mia and you…») — имя короткое.
      expect(name.length).toBeLessThanOrEqual(20);
    }
  });
});
