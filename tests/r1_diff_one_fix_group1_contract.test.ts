// зачем (R1_DIFF_ONE_FIX, группа 1, 12.10): мелкие расхождения с макетом, которые закрывает правка Дизайна. Сторож держит сами правки, чтобы их не откатили «заодно».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('R1_DIFF_ONE_FIX, группа 1', () => {
  it('cards-009 / v2-011 / v2-013 / packs-simple-003: пустой блок не зависит от замера, если холдер — весь экран; заголовок 20', () => {
    const kit = read('components/cards-grid/CardsKit.tsx');
    expect(kit).toContain('if (Math.abs(layoutH - height) < 2) {');
    expect(kit).toMatch(/emptyTitle: \{[^}]*marginTop: 20 \}/);
  });

  it('cards-v2-006 / cards-section-008: перевод в плитке — одна строка с многоточием (макет nowrap + ellipsis)', () => {
    const gallery = read('components/cards-grid/CardsGallery.tsx');
    expect(gallery.match(/numberOfLines=\{1\} ellipsizeMode="tail" style=\{\[styles\.tr,/g)?.length).toBe(2);
  });

  it('overlays-campaigns-016…026: «✕» шторки кода друга справа (row), заголовок с запасом под крестик слева', () => {
    const shell = read('components/referral_sheet_shell.tsx');
    expect(shell).toMatch(/header: \{[\s\S]*?flexDirection: 'row',/);
    expect(shell).not.toContain("flexDirection: 'row-reverse'");
    expect(shell).toContain('marginLeft: 56');
  });

  it('cards-v2-010: плавающая «Тренировать» скрыта, пока видна плашка «Удалено · Вернуть»', () => {
    const screen = read('app/flashcards_collection.tsx');
    expect(screen).toContain('onTrain={listCards.length > 0 && !packSurface && !undoEntry && !packUndo ? onTrainGallery : null}');
  });
});
