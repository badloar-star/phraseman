// Слово владельца 05.11: «ВЕРНИ БЛОК ВИДЕО НА ГЛАВНУЮ ... МЕЖДУ ИКОНКАМИ И ФРАЗОЙ ДНЯ, С ГОРИЗОНТАЛЬНЫМ СКРОЛЛОМ» и
// «КОГДА ВИДЕО ПРОСМОТРЕНО ОНО УХОДИТ В КОНЕЦ СПИСКА (ВСЕГДА ПЕРВЫМ ПОКАЗЫВАЕТСЯ ТО ЧТО НОВОЕ)».
import fs from 'node:fs';
import path from 'node:path';
import { orderHomeVideos } from '../app/home_video_order';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const v = (id: string) => ({ id });

describe('порядок ленты видео на Главной', () => {
  it('без просмотренных — порядок источника', () => {
    const list = [v('a'), v('b'), v('c')];
    expect(orderHomeVideos(list, {}).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('просмотренные уходят в конец, новые остаются первыми в порядке источника', () => {
    const list = [v('a'), v('b'), v('c'), v('d')];
    expect(orderHomeVideos(list, { a: 100, c: 200 }).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('между просмотренными: недавно просмотренное — в самом конце', () => {
    const list = [v('a'), v('b'), v('c')];
    expect(orderHomeVideos(list, { a: 300, b: 100, c: 200 }).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('все просмотрены — порядок по давности, ничего не теряется', () => {
    const list = [v('a'), v('b')];
    const out = orderHomeVideos(list, { a: 2, b: 1 });
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
    expect(out).toHaveLength(2);
  });

  it('не мутирует вход', () => {
    const list = [v('a'), v('b'), v('c')];
    const copy = [...list];
    orderHomeVideos(list, { a: 1 });
    expect(list).toEqual(copy);
  });
});

describe('лента видео возвращена на Главную со «Сценой»', () => {
  const home = read('app/(tabs)/home.tsx');
  it('рисуется между рядом плиток и «Фразой дня»', () => {
    const tiles = home.indexOf('uiLang={lang} row />');
    const rail = home.indexOf('HOME_SCENE_V2_ENABLED && isVideoButtonEnabled() && homeVideosVisible');
    const phrase = home.indexOf('<DailyPhraseCard variant="homeV2"');
    expect(tiles).toBeGreaterThan(0);
    expect(rail).toBeGreaterThan(tiles);
    expect(phrase).toBeGreaterThan(rail);
  });
  it('рейка пересчитывает порядок при возврате на Главную и сбрасывает прокрутку', () => {
    const rail = read('components/home/v2/HomeV2VideoRail.tsx');
    expect(rail).toContain('orderHomeVideos(sourceVideos, watched)');
    expect(rail).toContain('<VideoRailCards key={orderKey}');
  });
});
