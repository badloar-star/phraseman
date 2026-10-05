import { readFileSync } from 'fs';
import { join } from 'path';
import { energyGateMessage } from '../app/energy_activity_titles';

// зачем (координатор 05.10): сторож ждал ENERGY_GATE_MESSAGES_BY_LANG / ENERGY_GATE_MESSAGES_PT_BR… в окне.
// Их НАМЕРЕННО убрали в 379a4486a (15.09, владелец: окно говорило «Экзамен требует N ⚡» в любом разделе —
// строка выбиралась рулеткой). Текст с тех пор строит energyGateMessage(activity, lang, …) в
// app/energy_activity_titles.ts — 9 языков, название раздела по activity. Сторож переписан под этот источник:
// окно берёт текст оттуда, legacy-веток RU/UK/ES нет, все 9 языков дают текст с ценой, остатком и разделом.
const source = readFileSync(join(__dirname, '..', 'components', 'NoEnergyModal.tsx'), 'utf8');

const allLocales = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const legacyRuntimePattern =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES|ENERGY_MESSAGES_(?:RU|UK|ES)|ENERGY_GATE_MESSAGES_(?:RU|UK|ES))\b/u;

describe('NoEnergyModal locale runtime copy', () => {
  it('does not route locales through legacy RU/UK/ES branches and takes gate copy from energyGateMessage', () => {
    expect(source).not.toMatch(legacyRuntimePattern);
    expect(source).toContain("import { lessonEnergyMessages } from '../app/lesson_locale_utils';");
    expect(source).toContain("import { energyGateMessage } from '../app/energy_activity_titles';");
    expect(source).toMatch(/energyGateMessage\(activity \?\? 'classic_lesson', lang, requiredEnergy, totalAvailable\)/);
    // Рулетка «Экзамен требует N ⚡» не возвращается.
    expect(source).not.toContain('ENERGY_GATE_MESSAGES_BY_LANG');
  });

  it('every locale gets a gate message with the price, the balance and the section name', () => {
    const texts = new Set<string>();
    for (const lang of allLocales) {
      const dialog = energyGateMessage('ai_dialog', lang, 7, 3);
      expect(dialog).toContain('7');
      expect(dialog).toContain('3');
      expect(dialog.length).toBeGreaterThan(20);
      // Раздел назван: текст диалога отличается от текста экзамена на том же языке.
      expect(dialog).not.toBe(energyGateMessage('level_exam', lang, 7, 3));
      texts.add(dialog);
    }
    expect(texts.size).toBe(allLocales.length);
  });
});
