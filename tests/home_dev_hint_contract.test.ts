import fs from 'fs';
import path from 'path';

import { pickRandomHomeHint } from '../app/home_hints';

const homeSource = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/home.tsx'), 'utf8');

describe('home dev hint control', () => {
  it('picks a deterministic random item without mutating the source list', () => {
    const source = [
      { id: 'a', category: 'home', audience: 'all' as const, textRu: 'A' },
      { id: 'b', category: 'home', audience: 'all' as const, textRu: 'B' },
    ];
    expect(pickRandomHomeHint(source, () => 0.99)?.id).toBe('b');
    expect(source.map((item) => item.id)).toEqual(['a', 'b']);
  });

  // зачем (Q92, координатор 01.10): подсказки статистики на Главной 2.0 удалены целиком — их нигде
  // не было видно, а запрос опубликованного снимка (Firestore) уходил при каждом входе в приложение.
  // Библиотека home_hints остаётся (админка), но Главная её больше не использует.
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
