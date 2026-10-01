import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/home.tsx'), 'utf8');

describe('home dev hint control', () => {
  // зачем (Q99, координатор §55): клиентская библиотека подсказок удалена — у неё не осталось
  // потребителей в приложении. Серверная часть (functions/src/home_hints*) и админка живут отдельно.
  it('keeps the client hint library deleted', () => {
    for (const file of ['app/home_hints.ts', 'app/home_hints_client.ts', 'app/home_hints_selected.ts']) {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(false);
    }
  });

  // зачем (Q92, координатор 01.10): подсказки статистики на Главной 2.0 удалены целиком — их нигде
  // не было видно, а запрос опубликованного снимка (Firestore) уходил при каждом входе в приложение.
  it('keeps the Statistics-card hint chain out of Home', () => {
    expect(homeSource).not.toContain('SELECTED_HOME_HINTS_SNAPSHOT');
    expect(homeSource).not.toContain('loadPublishedHomeHints');
    expect(homeSource).not.toContain('homeHintShownThisAppSession');
    expect(homeSource).not.toContain('showStatsPulseHint');
    expect(homeSource).not.toContain('statsHintPulseAnim');
    expect(homeSource).not.toContain('showRandomFromSnapshot');
  });

  // зачем (Q92): подсказка энергии и всплывашка энергии с Главной удалены (энергии на Главной нет, D151).
  it('keeps the energy tooltip and the energy subscription out of Home', () => {
    expect(homeSource).not.toContain('EnergyInfoPopover');
    expect(homeSource).not.toContain('energyTooltip');
    expect(homeSource).not.toContain('useEnergy(');
  });
});
