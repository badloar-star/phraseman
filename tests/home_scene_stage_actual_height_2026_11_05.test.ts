// 🔴 владелец 05.11: «два оттенка вверху сцены». [HOME-FIT]: planned 280, actual 317–325 — палитра и фон сцены считались по расчётной высоте.
// Теперь они берут ФАКТИЧЕСКУЮ высоту (onLayout); стартовое значение — последняя измеренная (модульная память), без мерцания на первом кадре.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/scene/HomeSceneStage.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('сцена Главной: палитра по фактической высоте', () => {
  it('последняя измеренная высота — модульная память, стартовое значение состояния', () => {
    expect(src).toContain('let LAST_ACTUAL_STAGE_H: number | null = null;');
    expect(src).toContain('const [actualH, setActualH] = useState<number | null>(LAST_ACTUAL_STAGE_H);');
    expect(src).toContain('const paletteH = actualH !== null && actualH > 0 ? actualH : stageH;');
  });
  it('палитра и анимация темы берут paletteH, а не расчётные 280', () => {
    expect(src).toContain('windowW * dpr, paletteH * dpr, dpr, evening)');
    expect(src).toContain('}, [liquidGlassThemeId, liquidGlassAppearance, windowW, paletteH, dpr, evening]);');
    expect(src).toContain('width={windowW} height={paletteH} />');
    expect(src).not.toContain('windowW * dpr, stageH * dpr');
  });
  it('onLayout сохраняет факт и пишет [HOME-FIT] stageH до/после (одна строка на смену)', () => {
    expect(src).toContain('const measuredH = Math.round(e.nativeEvent.layout.height);');
    expect(src).toContain("console.log('[HOME-FIT]', 'stageH', JSON.stringify({ before: Math.round(paletteH), after: measuredH, planned: stageH");
    expect(src).toContain('LAST_ACTUAL_STAGE_H = measuredH;');
    expect(src).toContain('setActualH(measuredH);');
  });
  it('минимальная высота блока остаётся расчётной (замок «как у Уроков» 280), меняется только холст палитры', () => {
    expect(src).toContain('style={[s.stage, { minHeight: stageH }');
  });
});
