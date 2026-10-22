// зачем (владелец 22.10, скрин «Обучение»: «ТЕКСТУРКИ ДУРАЦКИЕ УБИРАЙ С КАРТОЧЕК ЭПИЗОДОВ»): у карточки эпизода, обложки урока и раскрытой карты нет текстуры — крупного
// полупрозрачного значка главы за текстом; фон — чистый градиент темы. Сторож не даёт вернуть слой.
import { readSource } from './helpers/read_source';

describe('Сезон: у карточки эпизода, обложки и раскрытой карты нет текстуры', () => {
  const face = readSource('components/learning-v2/season/SeasonCardFace.tsx');
  const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  const expanded = readSource('components/learning-v2/season/SeasonExpandedCard.tsx');

  it('нет крупного полупрозрачного значка главы (константа GLYPH, слой glyph/heroGlyph)', () => {
    for (const [name, src] of [['карточка', face], ['обложка', view], ['раскрытая карта', expanded]] as const) {
      expect([name, /\bGLYPH\b/.test(src)]).toEqual([name, false]);
      expect([name, /styles\.(?:hero)?[gG]lyph\b/.test(src)]).toEqual([name, false]);
    }
  });
  it('карточка эпизода — градиент и световое пятно темы, без иллюстрации', () => {
    expect(face).toContain('colors={[art.from, art.to]}');
    expect(face).not.toMatch(/<Image\b|ImageBackground|<Svg\b/);
  });
});
