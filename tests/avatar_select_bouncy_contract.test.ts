import fs from 'fs';
import path from 'path';

describe('avatar_select bouncy layout contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');

  it('keeps one virtualized list inside the bouncy transform layer', () => {
    const wrapStart = source.indexOf('<BouncyWrap>');
    const bouncyLayerStart = source.indexOf('<Reanimated.View style={[styles.flex, bouncyStyle]}>', wrapStart);
    const listStart = source.indexOf('<Reanimated.FlatList', bouncyLayerStart);
    const listEnd = source.indexOf('/>', listStart);
    const bouncyLayerEnd = source.indexOf('</Reanimated.View>', listEnd);

    expect(bouncyLayerStart).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(-1);
    expect(bouncyLayerStart).toBeGreaterThan(wrapStart);
    expect(source).not.toContain('<BouncyWrap style={bouncyStyle}>');
    expect(listStart).toBeGreaterThan(wrapStart);
    expect(listEnd).toBeGreaterThan(listStart);
    expect(bouncyLayerEnd).toBeGreaterThan(listEnd);
    expect(source.match(/<Reanimated\.FlatList/g)).toHaveLength(1);
    expect(source).not.toContain('<ScrollView');
  });
});
