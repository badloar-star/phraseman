// зачем (координатор 22.10: «Капсула таб-бара: маска за dev-ссылкой (?tabbarShadow=mask&alpha=…), по умолчанию прежний elevation;
// Сверка подбирает альфу парой снимков до/после»): по умолчанию и в релизе тень капсулы — прежний elevation; маска с вырезом
// HOME_TABBAR_SHADOW_CUTOUT (тинт: светлые — shadowTint, тёмные — чёрный, альфа из ссылки) и снятый elevation — только по ссылке.
import { TABBAR_SHADOW_DEFAULT_ALPHA, getTabbarShadowMode, setTabbarShadowDevLink, subscribeTabbarShadowMode } from '../components/v2/tabbar_shadow_dev';
import { readSource } from './helpers/read_source';

describe('тень капсулы таб-бара: маска только по dev-ссылке', () => {
  afterEach(() => setTabbarShadowDevLink(null));

  it('по умолчанию — прежний elevation; маска — с альфой из ссылки (0..1), светлые — своя или та же', () => {
    expect(getTabbarShadowMode()).toEqual({ kind: 'elevation' });
    setTabbarShadowDevLink('mask', 0.3);
    expect(getTabbarShadowMode()).toEqual({ kind: 'mask', alpha: 0.3, alphaLight: 0.3 });
    setTabbarShadowDevLink('mask', 0.3, 0.2);
    expect(getTabbarShadowMode()).toEqual({ kind: 'mask', alpha: 0.3, alphaLight: 0.2 });
    setTabbarShadowDevLink('mask', Number.NaN, 7);
    expect(getTabbarShadowMode()).toEqual({ kind: 'mask', alpha: TABBAR_SHADOW_DEFAULT_ALPHA, alphaLight: 1 });
    setTabbarShadowDevLink('elevation', 0.5);
    expect(getTabbarShadowMode()).toEqual({ kind: 'elevation' });
  });

  it('подписчики узнают о смене режима (таб-бар перерисовывает только себя)', () => {
    const calls: string[] = [];
    const off = subscribeTabbarShadowMode(() => calls.push(getTabbarShadowMode().kind));
    setTabbarShadowDevLink('mask', 0.25);
    off();
    setTabbarShadowDevLink(null);
    expect(calls).toEqual(['mask']);
  });

  it('таб-бар: прежняя тень на месте; в режиме маски — elevation снят, маска с вырезом позади стекла', () => {
    const bar = readSource('components/v2/V2TabBar.tsx');
    expect(bar).toContain('elevation: 14,');
    expect(bar).toContain('palette.isLight ? { shadowColor: palette.shadowTint, shadowOpacity: 1, elevation: 8 } : null,');
    expect(bar).toContain('const shadowMode = useSyncExternalStore(subscribeTabbarShadowMode, getTabbarShadowMode, getTabbarShadowMode);');
    expect(bar).toContain('shadowTint ? s.barNoShadow : null,');
    expect(bar).toContain('barNoShadow: { elevation: 0, shadowOpacity: 0 },');
    expect(bar).toContain('source={HOME_TABBAR_SHADOW_CUTOUT.source}');
    expect(bar.indexOf('source={HOME_TABBAR_SHADOW_CUTOUT.source}')).toBeLessThan(bar.indexOf('<View pointerEvents="none" style={s.clip}>'));
  });

  it('dev-ссылка: tabbarShadow=mask|elevation, alpha и alphaLight — доли 0..1', () => {
    const dev = readSource('app/dev_state_fixtures.ts');
    expect(dev).toContain("request.tabbarShadow = pick('tabbarShadow', ['mask', 'elevation'] as const);");
    expect(dev).toContain("request.tabbarShadowAlpha = unitNumber('alpha');");
    expect(dev).toContain("request.tabbarShadowAlphaLight = unitNumber('alphaLight');");
    expect(dev).toContain('setTabbarShadowDevLink(request.tabbarShadow ?? null, request.tabbarShadowAlpha ?? null, request.tabbarShadowAlphaLight ?? null);');
  });
});
