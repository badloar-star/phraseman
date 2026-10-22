// зачем (координатор 22.10, крайние случаи сцен перед выпуском; шрифт 1,3, длинные языки на 360 dp): сцены Главной и Диалогов — межстрочный растёт с системным шрифтом (FONTSCALE2),
// кнопки/чипы/пилюли имеют высоту «от» (перенос подписи не режется), ужатия шрифта нет, герой Главной на крупном шрифте вписывается в место над текстом.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

const FILES = [
  'components/home/v2/scene/HomeSceneStage.tsx',
  'components/dialogs/scene/DialogsSceneStage.tsx',
  'components/dialogs/scene/DialogsScenePanel.tsx',
] as const;

describe('сцены Главной и Диалогов: шрифт 1,3 и длинные подписи', () => {
  it.each(FILES)('%s: межстрочный масштабируется (useScaledTextStyles), без ужатия шрифта', (file) => {
    const src = code(read(file));
    expect(src).toContain('useScaledTextStyles(baseStyles)');
    expect(src).toContain('const baseStyles = StyleSheet.create(');
    expect(src).not.toMatch(/adjustsFontSizeToFit|minimumFontScale/);
  });

  it('Главная: кнопка и чипы — высота «от», подпись кнопки сжимается переносом, а не выходит за край', () => {
    const src = code(read('components/home/v2/scene/HomeSceneStage.tsx'));
    expect(src).toMatch(/cta: \{ marginTop: 16, minHeight: 54, paddingVertical: 8,/);
    expect(src).toMatch(/ctaText: \{[^}]*flexShrink: 1, textAlign: 'center'/);
    expect(src).toMatch(/chip: \{ minHeight: 36, paddingVertical: 4, maxWidth: '100%'/);
    expect(src).toMatch(/chipText: \{[^}]*flexShrink: 1/);
    expect(src).not.toMatch(/cta: \{[^}]*\bheight: 54/);
  });

  it('Главная: на крупном шрифте герой вписан в свободное место (слот flex 1), на обычном — как в эталоне', () => {
    const src = code(read('components/home/v2/scene/HomeSceneStage.tsx'));
    expect(src).toContain('const HERO_BOUND_FONT_SCALE = 1.15;');
    expect(src).toContain('const heroBounded = fontScale > HERO_BOUND_FONT_SCALE;');
    expect(src).toContain('heroSpace: { flex: 1 }');
    expect(src).toMatch(/heroBounded: \{[^}]*bottom: 4, width: HERO, maxHeight: HERO,/);
    expect(src).toContain("contentPosition={heroBounded ? 'right' : 'center'}");
  });

  it('Диалоги: кнопка, пилюля остатка, чипы миров и «Показать ещё» — высота «от»; длинные подписи ужимаются переносом', () => {
    const stage = code(read('components/dialogs/scene/DialogsSceneStage.tsx'));
    expect(stage).toMatch(/cta: \{ minHeight: 54, paddingVertical: 8,/);
    expect(stage).toMatch(/pill: \{ minHeight: 36, paddingVertical: 4,/);
    const panel = code(read('components/dialogs/scene/DialogsScenePanel.tsx'));
    expect(panel).toMatch(/chip: \{ minHeight: 34, paddingVertical: 4, maxWidth: '100%'/);
    expect(panel).toMatch(/chipText: \{[^}]*flexShrink: 1, textAlign: 'center'/);
    expect(panel).toMatch(/more: \{ minHeight: 44,/);
    expect(panel).toMatch(/world: \{ flexShrink: 1,/);
    expect(panel).toMatch(/headTitle: \{ flexShrink: 1,/);
  });
});
