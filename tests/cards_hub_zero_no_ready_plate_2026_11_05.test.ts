// ЗАМОК: владелец 05.11 (TestFlight 149, скрин 09): «не такой макет одобрял». В утверждённых макетах хаба «Карточки» плашки «Начни с готового» нет;
// при 0/0 — одна главная кнопка «Создать набор» на её месте (макет docs/work/mockups/cards-zero-2026-11-05).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('хаб «Карточки» 0/0 без плашки «Начни с готового»', () => {
  const hub = read('app/flashcards/CardsHubV2.tsx');
  const screen = read('app/flashcards/FlashcardsHubScreen.tsx');

  it('плашки и её текстов нет ни в хабе, ни в экране', () => {
    for (const src of [hub, screen]) {
      expect(src).not.toContain('Начни с готового');
      expect(src).not.toContain('fc-cards-hub-fresh');
    }
  });

  it('при 0/0 главная кнопка — «Создать набор» (copy.create) с тем же действием, что «+» в шапке', () => {
    expect(screen).toContain('? { cta: copy.create, onPress: openCreatePack }');
    expect(hub).toContain('fresh?: Readonly<{ cta: string; onPress: () => void }>;');
    expect(hub).toContain("name={fresh ? 'add'");
  });
});
