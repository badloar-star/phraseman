// Сторож (координатор 22.10, 🔴 «ученик видит на обложке служебную пометку»): видимые названия уроков и эпизодов Learning V2
// не содержат служебного текста — «решение владельца», «слот», «TODO», «FIXME» и скобок со служебными словами.
import { LEARNING_V2_OWNER_EN_TITLES_RU } from '../components/learning-v2/learningV2OwnerLayout';
import { LEARNING_V2_SESSION_TITLES_RU_V1 } from '../modules/learning-v2/content/session_titles_v1.generated';

const SERVICE = /решени[ея] владельца|\bслот\b|TODO|FIXME|XXX|\((?:[^)]*?)(?:владел|слот|черновик|служеб|временн)[^)]*\)/iu;

describe('visible Learning V2 titles carry no service notes', () => {
  it('lesson titles', () => {
    const bad = LEARNING_V2_OWNER_EN_TITLES_RU.map((title, i) => ({ lesson: i + 1, title })).filter((x) => SERVICE.test(x.title));
    expect(bad).toEqual([]);
  });

  it('episode titles', () => {
    const bad = Object.entries(LEARNING_V2_SESSION_TITLES_RU_V1).flatMap(([lesson, sessions]) =>
      Object.entries(sessions).map(([session, title]) => ({ at: `${lesson}/${session}`, title: String(title) })))
      .filter((x) => SERVICE.test(x.title));
    expect(bad).toEqual([]);
  });

  it('the guard itself catches the note that leaked (lesson 22)', () => {
    expect(SERVICE.test('Предлоги времени и места + фразовые глаголы (новый слот, решение владельца 03.09)')).toBe(true);
    expect(SERVICE.test('Предлоги времени и места + фразовые глаголы')).toBe(false);
  });
});
