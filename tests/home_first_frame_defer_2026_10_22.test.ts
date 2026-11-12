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
    // зачем (12.11, коммит b70e116c2 «Аврора»): у слоя пятен появился признак материала aurora — отсрочка та же, сверяем новую форму
    expect(backdrop).toContain('{glow && glowReady ? (');
    expect(backdrop).toContain('<ThemeGlow colors={glow} aurora={Boolean(tokens.aurora)} />\n          </Animated.View>');
    expect(backdrop).toContain(') : <ThemeGlow colors={glow} aurora={Boolean(tokens.aurora)} />');
    expect(code('components/home/v2/scene/HomeSceneStage.tsx')).toContain('const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);');
  });

  it('отсрочку включает только фон оболочки вкладок; маска верхнего края и другие экраны — прежние', () => {
    expect(code('components/ScreenGradient.tsx')).toContain('<V2Backdrop deferGlow={deferGlow} />');
    expect(code('app/(tabs)/_layout.tsx')).toMatch(/<ScreenGradient\n\s*artBackdrop=\{scaffoldArtBackdrop\}\n\s*style=\{\{ flex: 1 \}\}\n\s*staticParallaxY=\{scaffoldStaticParallaxY\}\n\s*deferGlow\n\s*>/);
    expect(code('components/TopFadeMask.tsx')).toContain('<V2Backdrop />');
  });

  // зачем (12.11): герой «Сцены» снят решением владельца 04.11 (коммит f1dd8ecc4: «если сделано без героя, значит так надо»,
  // компактная сцена 280 dp) — откладывать нечего. Сторож держит, что тяжёлая картинка героя не вернулась в первый кадр без отсрочки.
  it('сцена без героя: картинки героя в первом кадре нет; если вернётся — только со 2-го кадра', () => {
    const stage = code('components/home/v2/scene/HomeSceneStage.tsx');
    const scene = code('components/home/v2/scene/HomeScene.tsx');
    for (const src of [stage, scene]) {
      expect(src).not.toMatch(/HERO_TOP|homeSceneHeroFade|heroSpaceH/);
      if (/\bart\b[^\n]*\?\s*\(/.test(src) || /<Image\b/.test(src)) expect(src).toContain("useAfterFirstFrame('home:hero')");
    }
  });
});
