// ЗАМОК ВЛАДЕЛЬЦА 25.10 («МАКСИМУМ И ПОДЛОЖКА»): во вступлении и в ситуации «Скажи так» английский, грамматические частицы, перевод и формула —
// разные цвета ТЕКУЩЕЙ темы: частица — оттенок темы с «Максимума» на подложке accentSoft и жирная; английский — langText жирный; русский — gloss;
// «+ →» — mutedText. В «Проверь себя» частицы не подсвечиваются. Сработал сторож — вернуть цвета ролей, а не править сторож.
import fs from 'node:fs';
import path from 'node:path';
import { splitIntroTextRoles } from '../app/learning_v2_intro_text_roles';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
const roles = (t: string): string => splitIntroTextRoles(t).map((s) => `${s.role}:${s.text}`).join('|');

describe('цвета ролей текста вступления (замок владельца 25.10)', () => {
  it('разбор: английский, служебные слова, окончания -s/-es, формула, русский', () => {
    expect(roles('I am here — я здесь')).toBe('lang:I|plain: |particle:am|plain: |lang:here|plain: — |gloss:я|plain: |gloss:здесь');
    expect(roles('She works')).toBe('lang:She|plain: |lang:work|particle:s');
    expect(roles('he watches')).toBe('lang:he|plain: |lang:watch|particle:es');
    expect(roles('A + is + B')).toBe('particle:A|plain: |formula:+|plain: |particle:is|plain: |formula:+|plain: |lang:B');
    expect(roles('this bus')).toBe('particle:this|plain: |lang:bus');
    expect(roles('There is a cat → кот')).toContain('formula:→');
  });

  it('разбор кэшируется по строке — тот же текст отдаёт тот же объект', () => {
    expect(splitIntroTextRoles('They are tired')).toBe(splitIntroTextRoles('They are tired'));
  });

  it('показ: цвета из темы, частица на accentSoft и жирная; подключено во вступлении и «Скажи так», не в «Проверь себя»', () => {
    const view = read('components/learning-v2/IntroRoleText.tsx');
    expect(view).toContain('introTextRolesForTokens(liquidGlassThemeId, glass)');
    expect(view).toContain("particle: particles ? { color: roles.particle, fontWeight: '700', backgroundColor: glass.accentSoft }");
    expect(view).toContain("lang: { color: roles.langText, fontWeight: '700' }");
    expect(view).toContain("formula: { color: glass.mutedText, fontWeight: '700' }");
    const intro = read('app/learning_v2_session_intro.tsx');
    expect(intro).toContain('<IntroRoleText text={part.text} glass={glass} />');
    const panel = intro.slice(intro.indexOf('sx.questionPanel'));
    expect(panel.slice(0, 4000)).not.toContain('<IntroRoleText');
    expect(read('components/learning-v2/LearningV2TaskBody.tsx')).toContain('<IntroRoleText text={text} glass={g} />');
  });
});
