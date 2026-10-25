// зачем (владелец 25.10 утвердил «МАКСИМУМ И ПОДЛОЖКА» на настоящих снимках, c23f09e24; координатор): цвета ролей — в крупной фразе карточки «Скажи так» (частица цветом темы на мягкой
// подложке) и в строке-пояснении под ней (английский жирный основным цветом, частицы на подложке, русский как есть). Только вступление; «Проверь себя» и задания — не красим.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('вступление: цвета ролей в карточке «Скажи так» и в пояснении', () => {
  const body = read('components/learning-v2/LearningV2TaskBody.tsx');
  const intro = read('app/learning_v2_session_intro.tsx');
  const repeatMode = read('modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx');

  it('крупная фраза красится только по флагу colorRoles (по умолчанию выключен)', () => {
    expect(body).toContain('colorRoles = false');
    expect(body).toContain('colorRoles?: boolean;');
    expect(body).toContain('{colorRoles ? <IntroRoleText text={primary} glass={g} /> : primary}');
  });

  it('вступление включает флаг на карточке «Скажи так»; задания (повтор вслух) его не включают', () => {
    expect(intro).toMatch(/<LearningV2SayCard[\s\S]{0,260}?colorRoles\b/);
    expect(repeatMode).not.toMatch(/<LearningV2SayCard[\s\S]{0,400}?colorRoles\b/);
  });

  it('строка-пояснение (IntroWhy) идёт через IntroRoleText с цветами активной темы', () => {
    expect(intro).toContain('<IntroRoleText text={text} glass={glass} />');
    expect(intro).toContain('<IntroWhy text={sayParts.why} color={g.secondary} glass={g} />');
  });

  it('«Проверь себя» не красим: IntroRoleText не подключён ни в заданиях, ни в карточке проверки', () => {
    const check = read('components/learning-v2/LearningV2TaskBody.tsx');
    // единственные места в теле заданий: ситуация «Скажи так» и крупная фраза по флагу
    expect((check.match(/<IntroRoleText /g) ?? []).length).toBe(2);
    expect(repeatMode).not.toContain('IntroRoleText');
  });
});
