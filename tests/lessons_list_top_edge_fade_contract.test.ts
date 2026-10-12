// зачем (learn-007, находка Тем 13.10): верхний край списка уроков под полем поиска был жёстким срезом. Мягкое растворение появляется только после прокрутки,
// не ловит нажатия, берёт цвет фона темы и подключено внутри обёртки списка.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('список уроков: растворение верхнего края', () => {
  const fade = read('components/lessons/ListTopEdgeFade.tsx');
  const lessons = read('app/(tabs)/lessons.tsx');

  it('слой не ловит нажатия, появляется после порога прокрутки и красится в bgTop темы', () => {
    expect(fade).toContain('pointerEvents="none"');
    expect(fade).toContain('export const LIST_TOP_EDGE_FADE_SHOW_AT = 6;');
    expect(fade).toContain('outputRange: [0, 0, 1]');
    expect(fade).toContain('alphaHex(g.bgTop, 0.96)');
    expect(fade).toContain('alphaHex(g.bgTop, 0)');
    expect(fade).not.toContain('masked-view'); // маска на прокручиваемом списке дорогая — импорта MaskedView быть не должно
    expect(fade).not.toMatch(/borderWidth|borderColor/); // стиль «Тень»: без обводок
  });

  it('подключён в app/(tabs)/lessons.tsx внутри обёртки списка, только при общем scrollY таб-оболочки', () => {
    expect(lessons).toContain('import ListTopEdgeFade from "../../components/lessons/ListTopEdgeFade";');
    const at = lessons.indexOf('{topFadeScroll ? <ListTopEdgeFade g={learnGlass} scrollY={topFadeScroll.scrollY} /> : null}');
    expect(at).toBeGreaterThan(0);
    expect(lessons.indexOf('</BouncyWrap>', at)).toBeGreaterThan(at);
    expect(lessons.lastIndexOf('<BouncyWrap style={bouncyStyle}>', at)).toBeGreaterThan(0);
  });
});
