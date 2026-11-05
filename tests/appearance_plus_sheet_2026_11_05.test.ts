// зачем (координатор 05.11 ~22:20, владелец «КАК ПО МАКЕТУ»): шторка «Цвет под себя — с Plus» из docs/work/mockups/theme_sliders_exact.html.
// Тап по запертому ползунку без Plus → сначала шторка (существующий KitSheetModal), окно оплаты — только из её кнопки; журнал [THEME-SLIDERS]
// lock_tap / sheet_open / sheet_cta / sheet_dismiss; тексты на 9 языках; цвета только из темы; без обводок.
import fs from 'node:fs';
import path from 'node:path';
import { APPEARANCE_PLUS_SHEET_TEXT } from '../components/settings/appearance_plus_sheet_copy';


const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const sheet = read('components/settings/AppearancePlusSheet.tsx');
const screen = read('app/settings_appearance.tsx');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('шторка «Цвет под себя — с Plus»', () => {
  it('тексты макета: ru дословно, все 9 языков непустые', () => {
    expect(APPEARANCE_PLUS_SHEET_TEXT.title.ru).toBe('Цвет под себя — с Plus');
    expect(APPEARANCE_PLUS_SHEET_TEXT.body.ru).toBe('Оттенок и насыщенность меняют сцену, фон, карточки и кнопки.');
    expect(APPEARANCE_PLUS_SHEET_TEXT.cta.ru).toBe('Открыть Plus');
    expect(APPEARANCE_PLUS_SHEET_TEXT.dismiss.ru).toBe('Не сейчас');
    for (const key of Object.keys(APPEARANCE_PLUS_SHEET_TEXT) as (keyof typeof APPEARANCE_PLUS_SHEET_TEXT)[]) {
      for (const lang of LANGS) expect([key, lang, APPEARANCE_PLUS_SHEET_TEXT[key][lang].trim().length > 0]).toEqual([key, lang, true]);
    }
    for (const lang of LANGS.filter((l) => l !== 'ru' && l !== 'uk')) expect(APPEARANCE_PLUS_SHEET_TEXT.title[lang]).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('вид макета на существующей шторке: KitSheetModal, заголовок 24/30, кнопка 54/r27, «Не сейчас» 46; цвета из темы, без обводок', () => {
    expect(sheet).toContain("import { KitSheetModal } from '../v2/KitSheetModal';");
    expect(sheet).not.toMatch(/<Modal\b/);
    expect(sheet).toContain('title: { fontSize: 24, lineHeight: 30');
    expect(sheet).toContain('cta: { minHeight: 54, borderRadius: 27');
    expect(sheet).toContain('dismiss: { marginTop: 6, minHeight: 46');
    expect(sheet).toContain('backgroundColor: glass.ctaFill');
    expect(sheet).toContain('color: glass.ctaFillInk');
    expect(sheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(sheet).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
  });

  it('экран: запертый ползунок открывает шторку, оплата — только из кнопки шторки; журнал четырёх событий', () => {
    const lockBody = screen.slice(screen.indexOf('const onLockedPress = useCallback'), screen.indexOf('const onSheetPlus = useCallback'));
    expect(lockBody).toContain('setPlusSheet(true)');
    expect(lockBody).not.toContain('openPremiumPaywall');
    const ctaBody = screen.slice(screen.indexOf('const onSheetPlus = useCallback'), screen.indexOf('const onSheetDismiss = useCallback'));
    expect(ctaBody).toContain('setPlusSheet(false)');
    expect(ctaBody).toContain("openPremiumPaywall(router as never, { context: 'generic', source: 'appearance_tune' });");
    expect((screen.match(/openPremiumPaywall\(/g) ?? []).length).toBe(1);
    for (const ev of ["'lock_tap'", "'sheet_open'", "'sheet_cta'", "'sheet_dismiss'"]) expect(screen).toContain(`console.log(LOG, ${ev}`);
    expect(screen).toContain('<AppearancePlusSheet lang={lang} visible={plusSheet} onPlus={onSheetPlus} onDismiss={onSheetDismiss} />');
    expect(screen).toContain('if (locked) { onLockedPress(); return; }');
  });
});
