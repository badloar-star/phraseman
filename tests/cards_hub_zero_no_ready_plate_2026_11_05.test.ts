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

  // зачем (владелец 05.11 ~20:55, хаб — СПИСОК по утверждённому макету rev4): главной кнопки в списке нет ни при каком состоянии;
  // «Создать набор» при 0/0 и всегда — круглый «+» в шапке (то же действие openCreatePack).
  it('при 0/0 «Создать набор» — «+» в шапке (openCreatePack), плашки нет', () => {
    expect(screen).toContain('onCreate={openCreatePack}');
    const plus = hub.indexOf('testID="fc-cards-hub-create-pack"');
    expect(plus).toBeGreaterThan(-1);
    expect(hub.slice(plus, plus + 400)).toContain('onPress={onCreate}');
  });
});
