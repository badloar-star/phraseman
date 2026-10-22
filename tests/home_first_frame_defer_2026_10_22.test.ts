// зачем (шаг 4 ускорения первого кадра Главной; координатор 22.10): пятна темы на фоне вкладок и герой «Сцены» — со второго кадра тем же
// FadeIn (280 мс, ease-out героя), итоговый вид прежний; слой пятен монтируется один раз (смена вкладок его не перемонтирует), другие
// экраны с ScreenGradient и маска верхнего края — как прежде. Сторож держит подключение, а не пиксели (их снимает Сверка).
import { readSource } from './helpers/read_source';

const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)).join('\n');

describe('первый кадр Главной: декоративные слои — со второго кадра', () => {
  it('признак «первый кадр показан» — один кадр через общий планировщик, отмена при размонтаже, выключено — готово сразу', () => {
    const hook = code('hooks/use-after-first-frame.ts');
    expect(hook).toContain("import { scheduleAnimatedStateUpdate } from '../components/animationScheduling';");
    expect(hook).toContain('const [ready, setReady] = useState(!enabled);');
    expect(hook).toContain('return task.cancel;');
  });

  it('пятна темы: со 2-го кадра тем же FadeIn, что у героя; без отсрочки — прежний слой как есть', () => {
    const backdrop = code('components/v2/V2Backdrop.tsx');
    expect(backdrop).toContain("const glowReady = useAfterFirstFrame('backdrop:glow', deferGlow && glow !== null);");
    expect(backdrop).toContain('const GLOW_EASE = Easing.bezier(0.23, 1, 0.32, 1);');
    expect(backdrop).toContain('entering={FadeIn.duration(280).easing(GLOW_EASE)}');
    expect(backdrop).toContain(') : <ThemeGlow colors={glow} />');
    expect(code('components/home/v2/scene/HomeSceneStage.tsx')).toContain('const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);');
  });

  it('отсрочку включает только фон оболочки вкладок; маска верхнего края и другие экраны — прежние', () => {
    expect(code('components/ScreenGradient.tsx')).toContain('<V2Backdrop deferGlow={deferGlow} />');
    expect(code('app/(tabs)/_layout.tsx')).toMatch(/<ScreenGradient\n\s*artBackdrop=\{scaffoldArtBackdrop\}\n\s*style=\{\{ flex: 1 \}\}\n\s*staticParallaxY=\{scaffoldStaticParallaxY\}\n\s*deferGlow\n\s*>/);
    expect(code('components/TopFadeMask.tsx')).toContain('<V2Backdrop />');
  });

  it('герой «Сцены» — со 2-го кадра, тот же FadeIn при смене состояния', () => {
    const stage = code('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain("const heroReady = useAfterFirstFrame('home:hero');");
    expect(stage).toContain('{art && heroReady ? (');
    expect(stage).toContain('<Animated.View key={state} pointerEvents="none" entering={reduceMotion ? undefined : FadeIn.duration(280).easing(EASE_OUT)}');
  });
});
