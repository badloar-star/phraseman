import fs from 'fs';
import path from 'path';

/**
 * зачем (аудит смены языка R1 п.3, Авторизация 13.10): D+1 после первого урока уходил по-русски для en/pt-BR/vi/id/tr/pl —
 * язык разбирался вручную `uk ? uk : es ? es : ru`. Сторож: D+1 берёт язык общим помощником resolveNotificationLang.
 */
describe('lesson_complete — язык пуша D+1', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');

  it('язык D+1 решает resolveNotificationLang, ручного разбора ru/uk/es нет', () => {
    expect(src).toContain("resolveNotificationLang(langRaw, 'lesson_d1')");
    expect(src).not.toMatch(/=== 'uk' \? 'uk' : \w+ === 'es' \? 'es' : 'ru'/);
  });
});
