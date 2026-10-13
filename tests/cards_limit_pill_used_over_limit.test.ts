// зачем (D174, cards-section-056): пилюля лимита тренировок Карточек показывает «использовано/лимит» (30/30), как D166 «4/3» у энергии, а не «осталось/лимит».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('пилюля лимита Карточек: использовано/лимит', () => {
  it.each([
    ['app/flashcards_training_setup.tsx', 'quotaPreview'],
    ['app/flashcards/FlashcardsHubScreen.tsx', 'quotaPreview'],
    ['app/flashcards/CollectionHeaderV2.tsx', 'quota'],
  ])('%s: используется used, а не limit - used', (file, name) => {
    const src = read(file);
    expect(src).toContain(`\${Math.min(${name}.limit, Math.max(0, ${name}.used))}/\${${name}.limit}`);
    expect(src).not.toContain(`${name}.limit - ${name}.used)}/\${${name}.limit}`);
  });
});
