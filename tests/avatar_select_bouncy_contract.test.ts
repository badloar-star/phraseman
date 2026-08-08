import fs from 'fs';
import path from 'path';

describe('avatar_select bouncy layout contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');

  // зачем: BouncyWrap клонирует СВОЕГО ребёнка (overScrollMode) и вешает на него
  // GestureDetector с нативным жестом скролла. Любая прослойка между обёрткой и
  // списком забирает жест себе — на Android скролл умирает, остаётся только
  // резинка. Тест закрепляет, что список — прямой ребёнок, а bouncyStyle живёт
  // в style самого списка.
  it('keeps the virtualized list as the direct child of the bouncy wrapper', () => {
    const wrapStart = source.indexOf('<BouncyWrap>');
    const listStart = source.indexOf('<Reanimated.FlatList', wrapStart);
    const listEnd = source.indexOf('/>', listStart);
    const wrapEnd = source.indexOf('</BouncyWrap>', listEnd);

    expect(wrapStart).toBeGreaterThan(-1);
    expect(listStart).toBeGreaterThan(wrapStart);
    expect(listEnd).toBeGreaterThan(listStart);
    expect(wrapEnd).toBeGreaterThan(listEnd);
    expect(source).not.toContain('<BouncyWrap style={bouncyStyle}>');

    // Между <BouncyWrap> и <Reanimated.FlatList> не должно быть ни одного тега —
    // только пробелы и комментарии.
    const between = source.slice(wrapStart + '<BouncyWrap>'.length, listStart);
    expect(between.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim()).toBe('');

    // Резинка применяется к списку напрямую.
    const listSource = source.slice(listStart, listEnd);
    expect(listSource).toContain('style={[styles.flex, bouncyStyle]}');

    expect(source.match(/<Reanimated\.FlatList/g)).toHaveLength(1);
    expect(source).not.toContain('<ScrollView');
  });
});
