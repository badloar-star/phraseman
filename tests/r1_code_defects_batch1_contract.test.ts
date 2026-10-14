// зачем (координатор 12.10, docs/phraseman-2.0/R1_CODE_DEFECTS_FROM_PARITY.md, класс B): три найденных дефекта кода не должны вернуться —
// cards-section-024 (название ролика в строке «Наборы» — до 2 строк), dialogs-007/008 (пилюля энергии на брифинге), запасные имена друзей.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('R1 code defects, batch 1', () => {
  it('cards-section-024: the plain video row title is clamped to two lines without shrinking the font', () => {
    const row = read('app/flashcards/VideoPackRow.tsx');
    expect(row).toMatch(/<ClampedText testID=\{`video-pack-title-\$\{pack\.id\}`\} maxLines=\{2\}/);
    expect(row).not.toContain("from '../../components/text-integrity/FlowText'");
  });

  it('dialogs-007/008: the briefing shows the energy pill unless energy is unlimited', () => {
    const screen = read('components/dialogs/DialogueV2BriefingScreen.tsx');
    expect(screen).toContain("import EnergyBar from '../EnergyBar';");
    // зачем (14.10): f68ef4c79 (вердикты Макетов d7cf7113d, 13.10) намеренно сделал молнию пилюли сплошной — `solidBolt`; пилюля по-прежнему показывается, пока энергия не безлимитная
    expect(screen).toMatch(/\{showEnergy \? <EnergyBar glass( solidBolt)? \/> : null\}/);
    expect(screen).toMatch(/top: \{[^}]*justifyContent: 'space-between'/);
    const container = read('app/dialogue_v2_briefing.tsx');
    expect(container).toMatch(/isUnlimited: energyUnlimited/);
    expect(container).toContain('showEnergy={!energyUnlimited}');
  });

  it('friends: no Russian fallback name for everyone; «Я» is localized', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toMatch(/name: profile\.name\.trim\(\) \|\| 'Phraseman',/);
    expect(friends).not.toMatch(/name: profile\.name\.trim\(\) \|\| 'Игрок'/);
    expect(friends).toContain("myProfile?.name ?? L('Я', 'Я', 'Me', 'Yo', 'Eu', 'Tôi', 'Saya', 'Ben', 'Ja')");
    // старые сохранённые «Игрок» по-прежнему считаются заглушкой и заменяются именем из поиска
    expect(friends).toMatch(/current === 'Игрок'/);
  });
});
