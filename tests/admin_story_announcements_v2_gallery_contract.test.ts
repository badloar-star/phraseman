// Сторож (владелец 30.10, кадр «Объявления 2.0»): «Новое объявление» открывает выбор из загруженных шаблонов, счётчик считает
// загруженные шаблоны макета (а не объявления со schema 2.0), образец текста нельзя опубликовать как есть.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'admin/v2/scripts/pages/story_announcements_v2.js'), 'utf8').replace(/\r\n/g, '\n');

describe('редактор объявлений 2.0 — выбор шаблона', () => {
  it('«Новое объявление» открывает галерею, а не пустую карточку', () => {
    expect(js).toContain('S.picking = true; log(\'новое объявление: выбор шаблона\'');
    expect(js).toContain('function renderGallery()');
    expect(js).toContain("h('button', { class: 'ann2-tpl'");
  });
  it('счётчик показывает число загруженных шаблонов макета', () => {
    expect(js).toContain('шаблонов макета загружено: ${S.designs.length');
    expect(js).not.toContain('шаблонов 2.0: ${');
  });
  it('образец текста не публикуется', () => {
    expect(js).toContain('Замените образец текста');
  });
  it('превью ждёт список шаблонов и пишет его размер в журнал [ANN2-ADMIN]', () => {
    expect(js).toContain("log('предпросмотр готов', { designs: S.designs.length");
  });
});
