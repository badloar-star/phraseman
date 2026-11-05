// theme_sliders_v1: контроллер ползунка «Оттенок/Насыщенность» — превью на каждой смене шага без записи, ровно ОДНА запись при отпускании.
import { createTuneDragController } from '../components/settings/tune_slider_controller';

const make = () => {
  const preview: number[] = [];
  const commit: number[] = [];
  const c = createTuneDragController({ onPreview: (v) => preview.push(v), onCommit: (v) => commit.push(v) });
  return { c, preview, commit };
};

describe('createTuneDragController', () => {
  it('перетаскивание: превью на каждой смене шага, одна запись при отпускании', () => {
    const { c, preview, commit } = make();
    c.begin(100);
    c.step(101);
    c.step(101); // тот же шаг — без повторного превью
    c.step(140);
    c.end();
    expect(preview).toEqual([100, 101, 140]);
    expect(commit).toEqual([140]);
    expect(c.isDragging()).toBe(false);
  });
  it('step и end вне перетаскивания ничего не делают', () => {
    const { c, preview, commit } = make();
    c.step(5);
    c.end(5);
    expect(preview).toEqual([]);
    expect(commit).toEqual([]);
  });
  it('двойное отпускание не пишет дважды', () => {
    const { c, commit } = make();
    c.begin(10);
    c.end(12);
    c.end(12);
    expect(commit).toEqual([12]);
  });
  it('тап по дорожке и шаг доступности пишут сразу, без превью', () => {
    const { c, preview, commit } = make();
    c.commitNow(200);
    expect(preview).toEqual([]);
    expect(commit).toEqual([200]);
  });
});
