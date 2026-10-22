// зачем (закон владельца 22.10: «ЦВЕТА СТРОГО ОТТЕНКИ ТЕКУЩЕЙ ТЕМЫ»; красная тема показывала синие/фиолетовые/бирюзовые карточки глав): карточки эпизодов, обложка, карта экзамена и итог экзамена
// берут оттенок акцента ВЫБРАННОЙ темы (± небольшой сдвиг), а не свой оттенок главы; белый текст на них держит контраст ≥ 4,5 во всех темах, уровнях и главах.
import { readSource } from './helpers/read_source';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';

const WHITE = '#FFFFFF';
// оттенок надёжно определяется у заметно цветных и не слишком тёмных цветов: в почти чёрном 8-битное округление сдвигает его на десятки градусов
const chromaOf = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return Math.max(r, g, b) < 0.25 ? 0 : Math.max(r, g, b) - Math.min(r, g, b);
};
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('Сезон: цвета карточек — оттенки текущей темы', () => {
  it('ни в одной теме и главе оттенок карточки равен оттенку акцента темы (допуск 8° на перевод в sRGB); белый текст ≥ 4,5', () => {
    const outOfTheme: string[] = [];
    const lowContrast: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const themeHue = hexHue(g.accent);
          for (let chapter = 1; chapter <= 7; chapter += 1) {
            for (let episode = 1; episode <= 8; episode += 1) {
              for (const exam of [false, true]) {
                const art = seasonThemedArt(themeHue, chapter, episode, appearance, exam);
                const tag = `${appearance}/${id}/${level} гл.${chapter} эп.${episode}${exam ? ' экзамен' : ''}`;
                // у почти серых цветов оттенок не определён — сравнение оттенков имеет смысл только для заметно цветных
                for (const stop of [art.from, art.to, art.glow]) {
                  if (chromaOf(stop) > 0.03 && hueGap(hexHue(stop), themeHue) > 8) outOfTheme.push(`${tag}: ${stop} ${Math.round(hexHue(stop))}° против ${Math.round(themeHue)}°`);
                }
                for (const stop of [art.from, art.to]) {
                  if (contrastRatio(WHITE, stop) < 4.5) lowContrast.push(`${tag}: ${stop} ${contrastRatio(WHITE, stop).toFixed(2)}`);
                }
              }
            }
          }
        }
      }
    }
    expect(outOfTheme.slice(0, 10)).toEqual([]);
    expect(lowContrast.slice(0, 10)).toEqual([]);
  });

  it('карточки, обложка и итог экзамена берут оттенок из темы, а не из таблицы оттенков глав', () => {
    for (const file of [
      'components/learning-v2/season/SeasonCourse.tsx',
      'components/learning-v2/season/SeasonCourseView.tsx',
      'components/learning-v2/LearningV2ChapterExamResult.tsx',
    ]) {
      const src = readSource(file);
      expect([file, src.includes('seasonThemedArt(')]).toEqual([file, true]);
      expect([file, /seasonArtCached\(seasonChapterHue/.test(src)]).toEqual([file, false]);
    }
    const face = readSource('components/learning-v2/season/SeasonCardFace.tsx');
    expect(face).not.toMatch(/EXAM_FROM_(LIGHT|DARK)/);
  });
});
