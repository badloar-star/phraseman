// зачем (🔴 владельца 15.10: «полоса под часами и батареей немного отличается по цвету от остального фона — должно быть единое полотно»): скрим TopFadeMask был плоской заливкой (чёрной 0,446 в тёмных темах,
// bgTop 0,8 в светлых) поверх градиента с цветными пятнами темы — тон полосы всегда чуть другой («Океан», «Сумерки» заметнее всего). Теперь без явного tone скрим — копия самого полотна (V2Backdrop).
// Инвентарь верхней полосы (сперва логи): StatusBar глобально translucent + transparent (app/_layout.tsx), фон рисует ScreenGradient/V2Backdrop от самого верха, TabScaffold — только paddingTop по insets.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('единое полотно под статус-баром', () => {
  it('корень: StatusBar прозрачный и translucent — системная полоса фона не рисует', () => {
    const root = read('app/_layout.tsx');
    expect(root).toMatch(/<StatusBar\s+barStyle=\{statusBarLight \? 'light-content' : 'dark-content'\}\s+backgroundColor="transparent"\s+translucent\s*\/>/);
  });

  it('оболочка вкладок: фон — полноэкранный ScreenGradient, а inset — только отступ контента (без SafeAreaView сверху)', () => {
    const tabs = read('app/(tabs)/_layout.tsx');
    expect(tabs).toContain('<ScreenGradient');
    expect(tabs).toContain('(без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary)');
  });

  it('полотно экрана: V2Backdrop рисуется от верха (absoluteFill), TopFadeMask без tone — его копия, а не плоская заливка', () => {
    const mask = read('components/TopFadeMask.tsx');
    expect(mask).toContain("import V2Backdrop from './v2/V2Backdrop';");
    expect(mask).toContain('const useCanvas = tone === undefined;');
    expect(mask).toMatch(/useCanvas \? \(canvasArmed \? <CanvasCopy windowHeight=\{windowHeight\} \/> : null\) : <View pointerEvents="none" style=\{\[StyleSheet\.absoluteFill, \{ backgroundColor: scrim \}\]\} \/>/);
    expect(mask).toContain('<V2Backdrop />');
    expect(mask).toContain('canvasCopy: { position: \'absolute\', top: 0, left: 0, right: 0 },');
    // копия привязана к верху экрана и высоте окна — градиент полотна считается от высоты экрана
    expect(mask).toContain('style={[styles.canvasCopy, { height: windowHeight }]}');
  });

  it('старт без лишней работы: копия полотна на скрытой маске монтируется после первого кадра (InteractionManager), на постоянно видимой — сразу', () => {
    const mask = read('components/TopFadeMask.tsx');
    expect(mask).toContain('const [canvasArmed, setCanvasArmed] = useState(!scrollY);');
    expect(mask).toContain('InteractionManager.runAfterInteractions(() => setCanvasArmed(true))');
  });

  it('явный tone (экраны с картинкой под полосой) — прежняя плоская заливка; журнал [STATUSBAR-CANVAS] называет режим', () => {
    const mask = read('components/TopFadeMask.tsx');
    expect(mask).toContain("mode=${useCanvas ? 'canvas-copy' : 'flat-tone'}");
    expect(mask).toContain('[STATUSBAR-CANVAS]');
  });

  it('полотно экрана и копия берут цвет из одной палитры (p.bgTop/p.bg) — расхождения нечему быть', () => {
    const backdrop = read('components/v2/V2Backdrop.tsx');
    expect(backdrop).toContain('colors={[p.bgTop, p.bg]}');
    expect(backdrop).toContain('const p = useV2Palette();');
  });
});
