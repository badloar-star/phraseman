// ЗАМОК ВЛАДЕЛЬЦА (25.10, переутверждён 05.11 — «изучаемый язык одним цветом», макет target_lang_one_color_approved): во вступлении Learning V2 и в ситуации «Скажи так» слова
// изучаемого языка — один жирный цвет lang из оттенка ТЕКУЩЕЙ темы; перевод — gloss; «+ →» — mutedText. Частей речи, подсветки частиц и окончаний -s/-es и подложки accentSoft НЕТ.
// В «Проверь себя» разбор не подключён. Сработал сторож — вернуть цвета ролей, а не править сторож.
import fs from 'node:fs';
import path from 'node:path';
import { splitIntroTextRoles } from '../app/learning_v2_intro_text_roles';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
const roles = (t: string): string => splitIntroTextRoles(t).map((s) => `${s.role}:${s.text}`).join('|');

describe('цвета ролей текста вступления (замок владельца, 05.11)', () => {
  it('разбор: вся латиница — изучаемый язык (частицы и окончания не выделяются), формула, перевод', () => {
    expect(roles('I am here — я здесь')).toBe('lang:I|plain: |lang:am|plain: |lang:here|plain: — |gloss:я|plain: |gloss:здесь');
    expect(roles('She works')).toBe('lang:She|plain: |lang:works');
    expect(roles('he watches')).toBe('lang:he|plain: |lang:watches');
    expect(roles('A + is + B')).toBe('lang:A|plain: |formula:+|plain: |lang:is|plain: |formula:+|plain: |lang:B');
    expect(roles('this bus')).toBe('lang:this|plain: |lang:bus');
    expect(roles('There is a cat → кот')).toContain('formula:→');
    expect(roles('I am here')).not.toContain('particle');
  });

  it('разбор кэшируется по строке — тот же текст отдаёт тот же объект', () => {
    expect(splitIntroTextRoles('They are tired')).toBe(splitIntroTextRoles('They are tired'));
  });

  it('показ: цвета из темы, lang жирный без подложки; подключено во вступлении и «Скажи так», не в «Проверь себя»', () => {
    const view = read('components/learning-v2/IntroRoleText.tsx');
    expect(view).toContain('introTextRolesForTokens(liquidGlassThemeId, glass)');
    expect(view).toContain("lang: { color: roles.lang, fontWeight: '700' }");
    expect(view).toContain("formula: { color: glass.mutedText, fontWeight: '700' }");
    const code = view.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n'); // комментарии не считаем — только код
    expect(code).not.toMatch(/particle|accentSoft|backgroundColor/);
    const intro = read('app/learning_v2_session_intro.tsx');
    expect(intro).toContain('<IntroRoleText text={part.text} glass={glass} />');
    const panel = intro.slice(intro.indexOf('sx.questionPanel'));
    expect(panel.slice(0, 4000)).not.toContain('<IntroRoleText');
    expect(read('components/learning-v2/LearningV2TaskBody.tsx')).toContain('<IntroRoleText text={text} glass={g} />');
  });
});
