import fs from 'fs';
import path from 'path';

describe('avatar_select bouncy layout contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');

  it('keeps fixed page chrome outside normal scroll but inside the bouncy transform layer', () => {
    const bouncyLayerStart = source.indexOf('<Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>');
    const wrapStart = source.indexOf('<BouncyWrap>', bouncyLayerStart);
    const scrollStart = source.indexOf('<ScrollView', wrapStart);
    const scrollEnd = source.indexOf('</ScrollView>', scrollStart);
    const bouncyLayerEnd = source.indexOf('</Reanimated.View>', scrollEnd);
    const title = source.indexOf('>Аватар</Text>', bouncyLayerStart);
    const currentAvatar = source.indexOf('>Текущий аватар</Text>', bouncyLayerStart);
    const resetButton = source.indexOf('>Вернуть аватар уровня</Text>', bouncyLayerStart);

    expect(bouncyLayerStart).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(bouncyLayerStart);
    expect(source).not.toContain('<BouncyWrap style={bouncyStyle}>');
    expect(scrollStart).toBeGreaterThan(wrapStart);
    expect(scrollEnd).toBeGreaterThan(scrollStart);
    expect(bouncyLayerEnd).toBeGreaterThan(scrollEnd);
    expect(title).toBeGreaterThan(bouncyLayerStart);
    expect(title).toBeLessThan(scrollStart);
    expect(currentAvatar).toBeGreaterThan(bouncyLayerStart);
    expect(currentAvatar).toBeLessThan(scrollStart);
    expect(resetButton).toBeGreaterThan(bouncyLayerStart);
    expect(resetButton).toBeLessThan(scrollStart);
  });
});
