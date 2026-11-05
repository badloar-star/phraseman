// ТОП-20 доступности (05.11): при системном «Уменьшить движение» анимации на экранах Дизайна сокращаются до мгновенных.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Reduce Motion: экраны Дизайна', () => {
  it('счётчик статистики сразу показывает итоговое число, без бега 0→N', () => {
    const src = read('components/stats/StatCountUpText.tsx');
    expect(src).toContain("import { useReduceMotion } from '../../hooks/use_reduce_motion';");
    expect(src).toContain('if (reduceMotion) { counter.value = safeValue; return () => cancelAnimation(counter); }');
    expect(src).toContain('[safeValue, durationMs, delayMs, reduceMotion]');
  });
  it('столбики недели сразу полной высоты, без пружинного каскада', () => {
    const src = read('components/stats/StatBars.tsx');
    expect(src).toContain('if (reduceMotion) { grow.value = 1; return () => cancelAnimation(grow); }');
    expect(src).toContain('[targetH, index, delayMs, reduceMotion]');
  });
  it('плашка «Вернуть прежнюю» появляется и уходит без въезда', () => {
    const src = read('components/settings/ThemeUndoBar.tsx');
    expect(src).toContain('entering={reduceMotion ? undefined : FadeInDown.duration(220)}');
    expect(src).toContain('exiting={reduceMotion ? undefined : FadeOut.duration(160)}');
  });
  it('сцена Главной и фоновые циклы уже учитывают системную настройку (не регресс)', () => {
    expect(read('components/home/v2/scene/HomeSceneStage.tsx')).toMatch(/reduced?motion/i);
    expect(read('components/scene/SceneStarTwinkle.tsx')).toMatch(/reduced?motion/i);
    expect(read('components/home/v2/scene/PremiumThemeMotion.tsx')).toMatch(/reduced?motion/i);
  });
});
