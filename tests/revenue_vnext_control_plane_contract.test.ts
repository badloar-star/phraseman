import fs from 'fs';
import path from 'path';

const admin = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

test('fixed Revenue VNext policy is read-only and truthful in the live admin', () => {
  expect(admin).toContain('Все 32 урока · всегда бесплатно');
  expect(admin).toContain('Personal Plan · только grandfathered до sunset');
  expect(admin).toContain("['gate_extra_languages_premium','Дополнительные языки']");

  expect(admin).not.toContain("['gate_lessons_premium','Уроки сверх бесплатных']");
  expect(admin).not.toContain("['free_lesson_limit','Бесплатных уроков'");
  expect(admin).not.toContain('id="cp-prem-lessons"');
  expect(admin).not.toContain('cpPremToggleLesson');
});

test('legacy lesson fields remain identified as compatibility-only, outside the active save payload', () => {
  expect(admin).toContain("key: 'free_lesson_limit'");
  expect(admin).toContain('только старые клиенты');
  expect(admin).toContain('<code>free_lessons_extra</code>');
  expect(admin).toContain('<code>premium_lessons_extra</code>');

  const saveStart = admin.indexOf('window.saveControlPanelPremium = async function()');
  const saveEnd = admin.indexOf('// ── 📺 YouTube-канал', saveStart);
  const activeSave = admin.slice(saveStart, saveEnd);
  expect(activeSave).not.toContain('free_lesson_limit');
  expect(activeSave).not.toContain('free_lessons_extra');
  expect(activeSave).not.toContain('premium_lessons_extra');
});

