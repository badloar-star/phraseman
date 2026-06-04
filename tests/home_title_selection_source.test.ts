import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('home title picker source contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('persists the selected earned title and uses it as the current displayed title', () => {
    expect(source).toContain("const HOME_SELECTED_TITLE_KEY = 'home_selected_title_key_v1'");
    expect(source).toContain('AsyncStorage.getItem(HOME_SELECTED_TITLE_KEY)');
    expect(source).toContain('AsyncStorage.setItem(HOME_SELECTED_TITLE_KEY, item.key)');
    expect(source).toContain('currentHomeTitle?.titleEN ?? getTitleString(level, lang)');
  });

  it('keeps the title list scrollable and makes unlocked rows selectable', () => {
    expect(source).toContain('nestedScrollEnabled');
    expect(source).toContain('showsVerticalScrollIndicator');
    expect(source).toContain('onPress={() => selectHomeTitle(item)}');
    expect(source).toContain('accessibilityState={{ disabled: !item.unlocked, selected: item.current }}');
  });

  it('keeps title row names at a stable readable size instead of auto-shrinking individual titles', () => {
    const rowSlice = source.slice(
      source.indexOf('visibleTitles.map((item) =>'),
      source.indexOf('</ScrollView>', source.indexOf('visibleTitles.map((item) =>')),
    );

    expect(rowSlice).toContain('allowFontScaling={false}');
    expect(rowSlice).toContain('ellipsizeMode="tail"');
    expect(rowSlice).toContain('fontSize: Math.max(15, f.body)');
    expect(rowSlice).not.toContain('adjustsFontSizeToFit');
    expect(rowSlice).not.toContain('minimumFontScale');
    expect(rowSlice).not.toContain('opacity: item.unlocked ? 1 : 0.56');
  });
});
