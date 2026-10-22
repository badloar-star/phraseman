// зачем (владелец кнопкой: ускорение первого кадра Главной; ассеты 4 · ТЕМЫ 8d4454aaa): плашка активной вкладки — две запечённые маски
// (цветная с тинтом RGB accentCap, белый блик) в своём слое со скруглением плашки; SVG-радиал — запасной путь для цвета без масок, причина
// в журнал один раз; elevation и тень капсулы не тронуты (снимаются только после снимка Сверки).
import { readSource } from './helpers/read_source';
import { homeTabbarCapMasks } from '../components/home/v2/scene/home_scene_baked_assets.generated';

describe('таб-бар: плашка активной вкладки — запечённые маски', () => {
  const src = readSource('components/v2/V2TabBar.tsx');
  const fill = src.slice(src.indexOf('const CapFill'), src.indexOf('function V2TabBar'));

  it('маски: цветная с тинтом RGB accentCap (без альфы), поверх белый блик; обрезает свой слой со скруглением плашки', () => {
    expect(fill).toContain('const masks = CAP_HEX.test(color) ? homeTabbarCapMasks(color) : null;');
    expect(fill).toContain('<Image accessible={false} source={masks.color} resizeMode="stretch" fadeDuration={0} style={[s.capMask, { tintColor: color.slice(0, 7) }]} />');
    expect(fill).toContain('<Image accessible={false} source={masks.white} resizeMode="stretch" fadeDuration={0} style={s.capMask} />');
    expect(src).toContain("capClip: { ...StyleSheet.absoluteFillObject, borderRadius: CAP_RADIUS, overflow: 'hidden' },");
  });

  it('нет масок для цвета — прежний SVG-радиал, причина в журнал один раз', () => {
    expect(fill).toContain('id="v2TabCapFill"');
    expect(fill).toContain("console.log('[TABBAR-CAP] svg_fallback'");
    expect(homeTabbarCapMasks('#3D7BFF')).not.toBeNull();
    expect(homeTabbarCapMasks('#3D7BFF29')).not.toBeNull();
    expect(homeTabbarCapMasks('#3D7BFF77')).toBeNull();
  });

  it('тень капсулы пока прежняя: elevation и тень бара не тронуты до снимка Сверки', () => {
    expect(src).toContain('elevation: 14,');
    expect(src).toContain("palette.isLight ? { shadowColor: palette.shadowTint, shadowOpacity: 1, elevation: 8 } : null,");
  });
});
