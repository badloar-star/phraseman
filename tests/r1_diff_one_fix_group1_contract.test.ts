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
    // зачем (координатор 13.10, cards-007; коммит 2fb610b52): в двух колонках перевод режется кнопкой звука — там до двух строк; в остальных плитках — одна строка с многоточием
    expect(gallery.match(/numberOfLines=\{1\} ellipsizeMode="tail" style=\{\[styles\.tr,/g)?.length).toBe(1);
    expect(gallery.match(/numberOfLines=\{2\} ellipsizeMode="tail" style=\{\[styles\.tr,/g)?.length).toBe(1);
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

describe('R1_DIFF_ONE_FIX, группа 2', () => {
  it('cards-v2-023: строка карточки в «Изменить набор» — макет .erow2 (ручка 20, текст с отступом 46, высота 70)', () => {
    const editor = read('app/community_packs/PackEditorV2.tsx');
    expect(editor).toContain('const REORDER_ROW_MIN_H = 70;');
    expect(editor).toContain('<Ionicons name="reorder-three" size={20} color={g.mutedText} />');
    expect(editor).toMatch(/erow: \{[^}]*paddingVertical: 10, paddingLeft: 8, paddingRight: 14 \}/);
    expect(editor).toMatch(/grip: \{ width: 26, height: 44,/);
  });
});

describe('R1_DIFF_ONE_FIX, группа 3', () => {
  it('settings-gap-011: строки уведомлений 64 dp как в макете (.gs-pl2), переключатель 36 + hitSlop (зона нажатия не меньше 44)', () => {
    const src = read('app/settings_notifications.tsx');
    expect(src).toContain('const rowStyle = { minHeight: 64,');
    expect(src).toContain('hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}');
    expect(src).toContain("style={{ width: 48, minWidth: 48, minHeight: 36, alignSelf: 'center' }}");
  });
});

describe('R1_DIFF_ONE_FIX, группа 4', () => {
  it('cards-032 / cards-v2-048: фильтр «Все / Слова / Фразы» в меню — один сегмент-контейнер (KitSegment), а не три таблетки', () => {
    const header = read('app/flashcards/CollectionHeaderV2.tsx');
    expect(header).toContain("import { KitSegment } from '../../components/cards-grid/CardsKit';");
    expect(header).toContain('<KitSegment g={g} options={kindChips} value={menu.savedContentKind}');
    expect(header).toContain('testIDPrefix="fc-saved-content"');
    expect(header).not.toContain('<FilterChips');
  });
});

describe('R1_DIFF_ONE_FIX, корзина a2', () => {
  it('cards-section-023 / cards-v2-025 / cards-v2-026: «назад» в каталоге — круглая плашка (PackRoundButton), а не голая стрелка', () => {
    const src = read('app/flashcards_packs.tsx');
    expect(src).toContain("import { PackChips, PackRoundButton } from '../components/packs/PackScreenKit';");
    expect(src).toMatch(/<PackRoundButton\s+g=\{g\}\s+icon="arrow-back"\s+testID="flashcards-header-back"/);
    expect(src).not.toContain('TouchableOpacity');
  });
});
