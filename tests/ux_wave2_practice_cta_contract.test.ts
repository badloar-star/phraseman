// Сторож (UX-волна 2, 04.11, владелец одобрил): кнопка практики PracticeCta (~15 экранов) идёт через V2Pressable (Дизайн 840df7249).
// Вибрация включена явно (управляющая кнопка), на строках/плитках V2Pressable вибрирует только по явному withHaptic.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('PracticeCta → V2Pressable', () => {
  const src = read('components/practice/PracticeStates.tsx');
  const cta = src.slice(src.indexOf('export function PracticeCta'), src.indexOf('export interface PracticeStateAction'));
  it('кнопка собрана на V2Pressable, голого Pressable и ручного scale нет', () => {
    expect(src).toContain("import V2Pressable from '../v2/V2Pressable';");
    expect(cta).toContain('<V2Pressable');
    expect(cta).not.toContain('<Pressable');
    expect(cta).not.toContain('pressed && !disabled ? 0.98');
  });
  it('вибрация включена явно: PracticeCta — управляющая кнопка', () => {
    expect(cta).toContain('withHaptic');
  });
  it('место кнопки (ширина/выравнивание) на внешней зоне, вид — на сжимающемся слое; выключенная кнопка не нажимается', () => {
    expect(cta).toContain('outerStyle={[small ? styles.ctaOuterSmall : styles.ctaOuter, style]}');
    expect(src).toContain("ctaOuter: { width: '100%' }");
    expect(src).toContain("ctaOuterSmall: { alignSelf: 'center' }");
    expect(cta).toContain('disabled={inactive}');
    expect(cta).toContain('const inactive = !!disabled || !onPress;');
  });
});

describe('V2Pressable: вибрация по умолчанию выключена', () => {
  const v2 = read('components/v2/V2Pressable.tsx');
  it('withHaptic = false по умолчанию', () => {
    expect(v2).toContain('withHaptic = false');
  });
  it('на строках, плитках и вариантах ответов практики withHaptic не включается', () => {
    for (const rel of ['components/practice/PracticeChrome.tsx', 'components/practice/PracticeStates.tsx']) {
      const src = read(rel);
      const withHaptic = (src.match(/withHaptic/g) ?? []).length;
      expect(withHaptic).toBeLessThanOrEqual(1);
    }
  });
});
