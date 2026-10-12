// зачем (Макеты e68b81502, cards-007): в режиме выделения подсказка «Выбери ещё N карточек…» лежала на нижнем ряду без подложки и наезжала на карточки.
// Сторож: подсказка — на плашке тона «Тени» (без обводки), а список в этом режиме получает запас снизу под панель.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionGalleryView.tsx'), 'utf8');

describe('CollectionGalleryView: подсказка режима выделения', () => {
  it('подсказка стоит на плашке с opaqueControl (подложка), а не голым текстом', () => {
    expect(source).toMatch(/testID="fc-selection-hint"[^>]*backgroundColor: g\.opaqueControl/);
    expect(source).toMatch(/selHintPlate:\s*\{[^}]*borderRadius: 14/);
  });

  it('плашка без обводки (правило «Тени»)', () => {
    const plate = (source.match(/selHintPlate:\s*\{[^}]*\}/) ?? [''])[0];
    expect(plate).not.toMatch(/border(Width|Color)/);
  });

  it('в режиме выделения с подсказкой список получает больший нижний отступ, чем обычный (последний ряд не прячется)', () => {
    expect(source).toMatch(/selectionMode && !canCreatePack && styles\.contentSelHint/);
    const base = Number((source.match(/content:\s*\{[^}]*paddingBottom: (\d+)/) ?? [])[1]);
    const withHint = Number((source.match(/contentSelHint:\s*\{\s*paddingBottom: (\d+)/) ?? [])[1]);
    expect(withHint).toBeGreaterThan(base);
  });

  it('межстрочный подсказки не меньше 1,25 кегля (типографика стор-аудита)', () => {
    const style = (source.match(/selHint:\s*\{[^}]*\}/) ?? [''])[0];
    const size = Number((style.match(/fontSize: (\d+)/) ?? [])[1]);
    const line = Number((style.match(/lineHeight: (\d+)/) ?? [])[1]);
    expect(line / size).toBeGreaterThanOrEqual(1.25);
  });
});
