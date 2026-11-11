// Сторож редактора объявлений 2.0 в админке (владелец 30.10, кадр «Объявления 2.0»; переписан 11.11 под нынешний редактор).
// зачем (владелец 11.11, «Проверить и переписать»): прежний текст сторожа описывал раннее поколение редактора (S.picking,
// renderGallery) и был красным с 30.10. Требования те же: образец текста нельзя опубликовать как есть, причина сбоя видна в
// журнале — плюс новое: редактор подключается отдельным файлом, а не встроенной в legacy.html ранней копией (11.11 такая
// копия уже попадала в историю и откатывала редактор на поколение назад). Поведение в браузере сторожат
// tests/admin_stories_*_regression.py; здесь — быстрые проверки по исходнику.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const js = read('admin/v2/scripts/pages/story_announcements_v2.js');
const legacy = read('admin/v2/legacy.html');
const slice = (from: string, to: string): string => {
  const start = js.indexOf(from);
  expect(start).toBeGreaterThan(-1);
  return js.slice(start, js.indexOf(to, start));
};

describe('редактор объявлений 2.0 — подключение и образец текста', () => {
  it('админка подключает редактор отдельным файлом, встроенной копии нет', () => {
    expect(legacy).toContain('<script src="scripts/pages/story_announcements_v2.js" defer></script>');
    expect(legacy).not.toContain('admin-story-announcements-editor');
  });

  it('«Новая история» открывает пустой черновик: образца текста в полях нет', () => {
    const newStory = slice('function newStory() {', '\n}');
    expect(newStory).toContain('S.current = blank();');
    const blank = slice("function blank(design = 'manifest') {", '\n}');
    expect(blank).toContain("badge: '', title: ''");
  });

  it('образец текста живёт только в предпросмотре и только пока поля пустые', () => {
    const preview = slice('function previewContent() {', '\n}');
    expect(preview).toContain('const empty = !f.title && !f.badge && !f.blocks.some(b => b.text);');
    expect(preview).toContain("content.title = empty ? 'Ваш заголовок' : f.title;");
    expect(preview).toContain('content.blocks = empty ?');
  });

  it('пустую историю (то есть «образец») нельзя ни сохранить, ни опубликовать', () => {
    const problems = slice('function problems(f, action) {', '\n}');
    expect(problems).toContain("if (!f.title.trim() && !f.badge.trim() && !f.blocks.some(b => b.text.trim())) out.push('Введите заголовок или текст истории.');");
  });

  it('несохранённый список историй пишет причину в журнал [ANN2-ADMIN]', () => {
    expect(js).toContain("console.warn('[ANN2-ADMIN] список историй не загрузился'");
  });
});
