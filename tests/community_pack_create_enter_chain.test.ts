// зачем (Волна 2, пункт 4): в форме новой карточки набора курсор сразу в поле «Слово», а Enter ведёт слово → перевод → пример → сохранить;
// «Ещё одну» возвращает курсор в «Слово». Сторож держит цепочку и защиту от выстрела в пустом поле.
import * as fs from 'fs';
import * as path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app/community_pack_create.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('форма карточки набора: Enter-цепочка и автофокус', () => {
  it('слово → перевод: next + переход фокуса', () => {
    expect(source).toMatch(/value=\{draftEn\}[\s\S]{0,200}returnKeyType="next"[\s\S]{0,120}onSubmitEditing=\{\(\) => draftTranslationInputRef\.current\?\.focus\(\)\}/);
  });
  it('перевод → пример: next + переход фокуса', () => {
    expect(source).toMatch(/value=\{draftTranslation\}[\s\S]{0,200}returnKeyType="next"[\s\S]{0,120}onSubmitEditing=\{\(\) => draftNoteInputRef\.current\?\.focus\(\)\}/);
  });
  it('пример: done — сохраняет только валидную карточку и не при лимите, иначе просто закрывает клавиатуру', () => {
    expect(source).toMatch(/value=\{draftNote\}[\s\S]{0,200}returnKeyType="done"[\s\S]{0,160}if \(draftValid && !cardLimitReached\) saveDraftCard\(\); else Keyboard\.dismiss\(\)/);
  });
  it('автофокус: после открытия формы и после «Ещё одну», с причиной при раннем выходе', () => {
    expect(source).toMatch(/setAddCardFormOpen\(true\);\n\s*focusDraftFront\(SHEET_OPEN_FOCUS_DELAY_MS\);/);
    expect(source).toMatch(/saveDraftCard\(\);\n\s*setAddCardFormOpen\(true\);\n\s*focusDraftFront\(SAVE_ANOTHER_FOCUS_DELAY_MS\);/);
    expect(source).toContain("автофокус: поле «Слово» не смонтировано — пропуск");
  });
  it('автофокус не стоит в восстановлении черновика и открытии правки (клавиатура не прыгает при входе на экран)', () => {
    const restore = source.slice(source.indexOf('setAddCardFormOpen(d.addCardFormOpen)'), source.indexOf('setAddCardFormOpen(d.addCardFormOpen)') + 200);
    expect(restore).not.toContain('focusDraftFront');
    expect((source.match(/focusDraftFront\(/g) ?? []).length).toBe(2); // только два пользовательских вызова (открыть, «Ещё одну»)
  });
});
