// зачем (координатор 22.10 «маска по умолчанию + elevation снят + найденная альфа»; Сверка 24.10, снимки tbshadow3/4 против прежнего
// elevation): тень капсулы таб-бара — запечённая маска с вырезом во всех темах, без elevation и тени iOS; альфа светлых 0,10, тёмных 0,25;
// маска растянута обёрткой (RN Image берёт размер из файла); dev-переключатель и параметры ссылки удалены.
import fs from 'fs';
import path from 'path';
import { readSource } from './helpers/read_source';

describe('тень капсулы таб-бара — маска по умолчанию', () => {
  const bar = readSource('components/v2/V2TabBar.tsx');
  const styles = bar.slice(bar.indexOf('const s = StyleSheet.create({'));
  const barStyle = styles.slice(styles.indexOf('  bar: {'), styles.indexOf('  clip:'));

  it('альфа подобрана Сверкой: светлые 0,10 от shadowTint темы, тёмные 0,25 от чёрного', () => {
    expect(bar).toContain('const TABBAR_SHADOW_ALPHA_LIGHT = 0.10;');
    expect(bar).toContain('const TABBAR_SHADOW_ALPHA_DARK = 0.25;');
    expect(bar).toContain('? colorWithAlpha(palette.shadowTint, TABBAR_SHADOW_ALPHA_LIGHT)');
    expect(bar).toContain(': colorWithAlpha(TABBAR_SHADOW_DARK, TABBAR_SHADOW_ALPHA_DARK);');
  });

  it('elevation и тень iOS сняты — у бара нет ни одного свойства тени', () => {
    expect(barStyle).not.toMatch(/elevation|shadowOpacity|shadowRadius|shadowOffset|shadowColor/);
    expect(bar).not.toContain('elevation: 8');
    expect(bar).not.toContain('barNoShadow');
  });

  it('маска рисуется всегда, позади стекла, растянута обёрткой', () => {
    expect(bar).toContain('<View pointerEvents="none" style={s.capsuleShadow}>');
    expect(bar).toContain('source={HOME_TABBAR_SHADOW_CUTOUT.source} resizeMode="stretch"');
    expect(bar).toContain("capsuleShadowImage: { width: '100%', height: '100%' },");
    expect(bar.indexOf('source={HOME_TABBAR_SHADOW_CUTOUT.source}')).toBeLessThan(bar.indexOf('<View pointerEvents="none" style={s.clip}>'));
    expect(bar).not.toContain('shadowTint ? (');
  });

  it('dev-переключатель удалён вместе с параметрами ссылки', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'components', 'v2', 'tabbar_shadow_dev.ts'))).toBe(false);
    expect(bar).not.toContain('tabbar_shadow_dev');
    const dev = readSource('app/dev_state_fixtures.ts');
    expect(dev).not.toContain('tabbarShadow');
    expect(dev).not.toContain('tabbar_shadow_dev');
  });
});
