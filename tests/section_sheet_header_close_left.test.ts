// зачем (владелец 22.10, вариант В: «✕ в одном месте, в той же точке, что стрелка: слева сверху»; координатор: новый закон отменяет
// стандарт 12.10 «✕ справа» и сторож section_sheet_header_close_right): шапка «шторки раздела» закрывается ОБЩИМ ScreenCloseButton слева
// сверху — та же точка и круг 48, что у «назад»; справа остаётся только аксессуар (например «как это работает» у рефералов).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('SectionSheetHeader: ✕ — общий ScreenCloseButton слева сверху', () => {
  const header = read('components/SectionSheetHeader.tsx');

  it('✕ рисует общий ScreenCloseButton, считая верх от шапки (она под безопасным верхом хозяина)', () => {
    expect(header).toContain("import { ScreenCloseButton, ScreenOriginBelowSafeTop } from './v2/ScreenBackButton';");
    expect(header).toMatch(/<ScreenOriginBelowSafeTop>\s*<ScreenCloseButton screen="section_sheet" testID=\{closeTestID\} accessibilityLabel=\{closeLabel\} onPress=\{onClose\} \/>\s*<\/ScreenOriginBelowSafeTop>/);
  });

  it('самодельного крестика нет; справа — только аксессуар', () => {
    expect(header).not.toMatch(/name="close"/);
    expect(header).not.toContain('closeVariant');
    expect(header).not.toContain('closeBtnStyle');
    expect(header).toMatch(/position: 'absolute',\s*right: 12,[\s\S]*?\{accessory\}\s*<\/View>/);
  });

  it('хозяева — промокод и рефералы — без прежнего варианта «плоский ✕ справа»', () => {
    for (const rel of ['app/promo_code_entry.tsx', 'app/referrals.tsx']) {
      const src = read(rel);
      expect([rel, src.includes('<SectionSheetHeader')]).toEqual([rel, true]);
      expect([rel, src.includes('closeVariant=')]).toEqual([rel, false]);
    }
  });
});
