// зачем (Макеты cards-061, 13.10): dev_state?cardsdraft=filled открывает редактор новой карточки с заполненными полями «Layover / пересадка» без клавиатуры —
// кадр сходится с образцом cards-v2 №24 с первого раза. Только dev; в режиме правки и в стор-сборке поля не подменяются.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('dev-переключатель cardsdraft=filled', () => {
  it('переключатель в dev-модуле карточек отдаёт Layover / пересадка и в стор-сборке отключён', () => {
    const state = read('app/dev_cards_state.ts');
    expect(state).toContain("export const DEV_CARD_DRAFTS = ['filled'] as const;");
    expect(state).toContain("return { en: 'Layover', tr: 'пересадка', description: '' };");
    expect(state).toContain('if (!devCardsAvailable() || cardDraft === null) return null;');
    const stub = read('store_release_stubs/dev_state/dev_cards_state_stub.ts');
    expect(stub).toContain('export function setDevCardDraft(): boolean { return false; }');
    expect(stub).toContain('export function getDevCardDraft(): null { return null; }');
    expect(stub).toContain('export const DEV_CARD_DRAFTS = [] as const;');
  });

  it('параметр ссылки разбирается, редактор берёт стартовые поля только при создании (не при правке)', () => {
    expect(read('app/dev_state_fixtures.ts')).toContain("cardsdraft?: 'filled' | 'off';");
    expect(read('app/dev_state_fixtures.ts')).toContain("setDevCardDraft } = await import('./dev_cards_state')");
    const editor = read('app/flashcards_card_editor.tsx');
    expect(editor).toContain('const devDraft = isEdit ? null : getDevCardDraft();');
    expect(editor).toContain("useState(devDraft?.en ?? '')");
    expect(editor).toContain("useState(devDraft?.tr ?? '')");
  });
});
