// зачем (тур первого входа в Пик утверждён владельцем 04.11; координатор: «один раз на аккаунт, за флагом, Reduce Motion, токены, ≥15 px, dev-вход»).
// Сторож: геометрия окон и стрелок, тексты на 9 языках, флаг «показан» по аккаунту в стираемом семействе, проводка в экран и dev, правила вёрстки.
const mockAccountListeners: Array<() => void> = [];
jest.mock('../app/account_generation', () => ({
  subscribeAccountGeneration: (cb: () => void) => { mockAccountListeners.push(cb); return { remove: () => undefined }; },
  captureAccountGeneration: () => ({ phase: 'active', stableId: 'a', generation: 1 }),
}));

import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PEAK_TOUR_KEY_PREFIX, peakTourArrowPage, peakTourArrows, peakTourCardPlacement, peakTourHoles, peakTourKey, peakTourKeys, peakTourPage, type PeakTourRects,
} from '../components/spire/peak/peak_tour_core';
import { __resetPeakTourStoreForTests, markPeakTourSeen, peekPeakTourSeen, readPeakTourSeen } from '../components/spire/peak/peak_tour_store';
import { SPIRE_GAME_STRINGS, spireGameText } from '../components/spire/spire_game_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const R = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const RECTS: PeakTourRects = { head: R(166, 110, 190, 80), pill: R(166, 150, 190, 40), rail: R(2, 120, 150, 600), top: R(154, 300, 240, 250), counter: R(166, 200, 220, 70) };

describe('окна затемнения', () => {
  it('режим монет (тексты владельца 04.11): 1 — мои монеты и место + пилюля; 2 — строки топ-5; 3 — верхушка башни (последний этаж)', () => {
    const o = { x: 0, y: 0 };
    const first = peakTourHoles(0, RECTS, o, 'coins');
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({ x: 158, y: 192, width: 236, height: 86 }); // мои монеты и место: 166/200/220/70 + запас 8
    const second = peakTourHoles(1, RECTS, o, 'coins');
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ x: 146, y: 292, width: 256, height: 266 }); // строки топ-5
    const third = peakTourHoles(2, RECTS, o, 'coins');
    expect(third).toHaveLength(1);
    expect(third[0].height).toBe(120 + 16); // верхушка башни
    expect(third[0].soft).toBeFalsy(); // последний этаж — то, о чём текст: карточка его не закрывает
  });
  it('режим монет без замеренного counter берёт шапку', () => {
    expect(peakTourHoles(0, { ...RECTS, counter: null }, { x: 0, y: 0 }, 'coins')[0]).toMatchObject({ x: 158, y: 102 });
  });
  it('режим ступеней: страница 1 — шапка; 2 — башня и пилюля; 3 — строки топ-5 и верхушка башни (120 dp)', () => {
    const o = { x: 0, y: 0 };
    expect(peakTourHoles(0, RECTS, o)).toHaveLength(1);
    expect(peakTourHoles(1, RECTS, o)).toHaveLength(2);
    const third = peakTourHoles(2, RECTS, o);
    expect(third).toHaveLength(2);
    expect(third[1].height).toBe(120 + 16); // верхушка башни 120 + запас 8 с каждой стороны
  });
  it('координаты — от угла оверлея (origin), запас 8 dp со всех сторон; незамеренные блоки пропускаются', () => {
    const [h] = peakTourHoles(0, RECTS, { x: 0, y: 24 });
    expect(h).toMatchObject({ x: 158, y: 78, width: 206, height: 96 });
    expect(peakTourHoles(2, { head: null, pill: null, rail: null, top: null }, { x: 0, y: 0 })).toEqual([]);
  });
  it('номер страницы зажимается в 0…2', () => {
    expect([peakTourPage(-3), peakTourPage(1), peakTourPage(7), peakTourPage(Number.NaN)]).toEqual([0, 1, 2, 0]);
  });
});

describe('стрелки «поднимаются»', () => {
  it('режим монет — стрелки на 2-й странице («5 лучших переходят»), ступеней — на 3-й', () => {
    expect(peakTourArrowPage('coins')).toBe(1);
    expect(peakTourArrowPage('steps')).toBe(2);
  });
  it('по одной у каждой из первых строк, по центру строки, не левее края', () => {
    const arrows = peakTourArrows(RECTS, 5, 5, { x: 0, y: 0 });
    expect(arrows).toHaveLength(5);
    expect(arrows[0].y).toBe(300 + 25 - 9);
    expect(arrows[1].y - arrows[0].y).toBe(50);
    expect(arrows[0].x).toBeGreaterThanOrEqual(2);
  });
  it('нет блока или нет «поднимающихся» — стрелок нет; больше строк, чем есть, не рисуем', () => {
    expect(peakTourArrows({ ...RECTS, top: null }, 5, 5, { x: 0, y: 0 })).toEqual([]);
    expect(peakTourArrows(RECTS, 5, 0, { x: 0, y: 0 })).toEqual([]);
    expect(peakTourArrows(RECTS, 3, 9, { x: 0, y: 0 })).toHaveLength(3);
  });
});

describe('положение карточки (ревизор 04.11): не закрывает подсвеченные строки топ-5', () => {
  const top = (y: number, h: number) => ({ x: 154, y, width: 240, height: h, radius: 22 });
  const rail = { x: 2, y: 120, width: 150, height: 600, radius: 26, soft: true };
  it('390×844, карточка 210: места внизу хватает → у нижнего края', () => {
    const r = peakTourCardPlacement({ holes: [top(292, 266), rail], screenHeight: 844, cardHeight: 210, insetTop: 47, insetBottom: 34 });
    expect(r.where).toBe('bottom');
    expect(r.top).toBe(844 - 34 - 16 - 210);
  });
  it('360×740, строки топ-5 ниже, карточка 220: внизу не помещается → НАД верхним окном строк, не на них', () => {
    const r = peakTourCardPlacement({ holes: [top(330, 266), rail], screenHeight: 740, cardHeight: 220, insetTop: 24, insetBottom: 0 });
    expect(r.where).toBe('above');
    expect(r.top + 220).toBeLessThanOrEqual(330 - 12);
    expect(r.top).toBeGreaterThanOrEqual(24);
  });
  it('375×667, карточка 230: ни снизу, ни сверху места нет (шапка 200 + 5 строк 250 + карточка > экрана) — внизу, честно overlap', () => {
    const r = peakTourCardPlacement({ holes: [top(250, 266), rail], screenHeight: 667, cardHeight: 230, insetTop: 24, insetBottom: 0 });
    expect(r.where).toBe('overlap');
    expect(r.top).toBe(667 - 12 - 16 - 230);
  });
  it('только «мягкие» окна (башня) — карточку можно ставить внизу поверх них', () => {
    expect(peakTourCardPlacement({ holes: [rail], screenHeight: 667, cardHeight: 300, insetTop: 24, insetBottom: 0 }).where).toBe('bottom');
  });
  it('геометрия: окна башни помечены soft, строки топ-5 и шапка — нет', () => {
    expect(peakTourHoles(2, RECTS, { x: 0, y: 0 }).map((h) => Boolean(h.soft))).toEqual([false, true]);
    expect(peakTourHoles(0, RECTS, { x: 0, y: 0 }).map((h) => Boolean(h.soft))).toEqual([false]);
  });
});

describe('тексты', () => {
  const RU_COINS = [
    'Пик — игра для тех, кто любит соревноваться. А ещё это отдельный способ попрактиковаться и заработать монеты.',
    '5 учеников, которые заработали больше всех монет за неделю, переходят в следующую лигу, увеличивают запас энергии для занятий и получают +1000 монет.',
    'Если дошёл до последнего этажа Пика, переходишь в новую лигу в любом случае, независимо от количества монет.',
  ];
  it('режим монет: тексты владельца дословно (ru), без заголовков и без {a}{b}{c}', () => {
    expect(SPIRE_GAME_STRINGS.peakTour1[0]).toBe(RU_COINS[0]);
    expect(SPIRE_GAME_STRINGS.peakTour2[0]).toBe(RU_COINS[1]);
    expect(SPIRE_GAME_STRINGS.peakTour3[0]).toBe(RU_COINS[2]);
    for (const page of [0, 1, 2] as const) {
      const k = peakTourKeys(page, 'coins');
      expect(k.title).toBeNull();
      expect(spireGameText('ru', k.text)).toBe(RU_COINS[page]);
    }
  });
  it('режим ступеней — те же утверждённые тексты peakTour1..3 без заголовков (владелец 05.11)', () => {
    expect(peakTourKeys(0, 'steps')).toEqual({ title: null, text: 'peakTour1' });
    expect(peakTourKeys(2, 'steps')).toEqual({ title: null, text: 'peakTour3' });
  });
  it('все страницы × 9 языков × 2 режима — непустые, без нераскрытых {a}{b}{c}', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      for (const rankBy of ['coins', 'steps'] as const) {
        for (const page of [0, 1, 2] as const) {
          const k = peakTourKeys(page, rankBy);
          if (k.title) expect(spireGameText(lang, k.title).length).toBeGreaterThan(3);
          const text = spireGameText(lang, k.text, { a: 'A', b: 'B', c: 'C', z: 'Z' });
          expect(text.length).toBeGreaterThan(10);
          expect(text).not.toMatch(/\{[a-z]\}/);
        }
      }
      expect(spireGameText(lang, 'skip').length).toBeGreaterThan(1);
      expect(spireGameText(lang, 'next').length).toBeGreaterThan(1);
      expect(spireGameText(lang, 'start').length).toBeGreaterThan(1);
    }
  });
  it('тексты Переводчика на месте: на каждой странице 9 разных строк (не временный английский во всех языках)', () => {
    for (const key of ['peakTour1', 'peakTour2', 'peakTour3'] as const) expect(new Set(SPIRE_GAME_STRINGS[key]).size).toBe(9);
  });
  it('цифры в тексте страницы 2 одинаковы во всех языках (5 лучших и +1000)', () => {
    for (const v of SPIRE_GAME_STRINGS.peakTour2) expect((v.match(/\d+/g) ?? []).sort()).toEqual(['1000', '5']);
  });
});

describe('флаг «тур показан» — один раз на аккаунт', () => {
  beforeEach(async () => { await AsyncStorage.clear(); __resetPeakTourStoreForTests(); });
  it('ключ — в стираемом семействе story_events_v1:, по аккаунту', () => {
    expect(PEAK_TOUR_KEY_PREFIX.startsWith('story_events_v1:')).toBe(true);
    expect(peakTourKey('uid-1')).toBe('story_events_v1:peak_tour:uid-1');
  });
  it('нет записи → не видел; отметил → видел сразу и в хранилище; другой аккаунт не затронут', async () => {
    await expect(readPeakTourSeen('a')).resolves.toBe(false);
    markPeakTourSeen('a');
    expect(peekPeakTourSeen('a')).toBe(true);
    await flush();
    expect(await AsyncStorage.getItem('story_events_v1:peak_tour:a')).toBe('1');
    await expect(readPeakTourSeen('b')).resolves.toBe(false);
  });
  it('после перезапуска (память пуста) запись из хранилища читается', async () => {
    await AsyncStorage.setItem('story_events_v1:peak_tour:a', '1');
    __resetPeakTourStoreForTests();
    await expect(readPeakTourSeen('a')).resolves.toBe(true);
  });
  it('смена аккаунта в одном процессе сбрасывает память: «видел» берётся из хранилища заново (после выхода ключ стёрт → снова не видел)', async () => {
    markPeakTourSeen('a');
    await flush();
    expect(peekPeakTourSeen('a')).toBe(true);
    await AsyncStorage.clear(); // зачем: выход из аккаунта стирает семейство story_events_v1:
    mockAccountListeners.forEach((cb) => cb());
    expect(peekPeakTourSeen('a')).toBeNull();
    await expect(readPeakTourSeen('a')).resolves.toBe(false);
  });
  it('сбой чтения — тур не показываем (лучше пропустить подсказку, чем крутить каждый раз)', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(readPeakTourSeen('z')).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
    spy.mockRestore(); warn.mockRestore();
  });
});

describe('проводка и правила вёрстки', () => {
  it('экран Пика: тур по умолчанию «auto» через ворота, окна — от замеренных блоков, на Reduce Motion без входа', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    // зачем (координатор 05.11): по умолчанию тур 'auto', в dev-превью ?tour=off отключает его для чистого кадра
    expect(screen).toContain("tourProp ?? (peakTourDevOff() ? 'off' : 'auto')");
    expect(screen).toContain('usePeakTourGate(');
    expect(screen).toContain('<PeakTour');
    expect(screen).toContain('measureInWindow');
    const tour = read('components/spire/peak/PeakTour.tsx');
    expect(tour).toContain('reduceMotion ? undefined');
    expect(tour).toContain('<Mask');
    expect(tour).toContain('g.scrim');
    expect(tour).toContain('peakTourCardPlacement(');
  });
  it('кнопки тура достижимы: текст в ScrollView, кнопки с ролью, подписью и зоной ≥ 44 dp (контракт reachable_action_buttons)', () => {
    const tour = read('components/spire/peak/PeakTour.tsx');
    expect(tour).toContain('<ScrollView');
    expect((tour.match(/accessibilityRole="button"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(tour).toMatch(/btn: \{ minHeight: (4[4-9]|[5-9]\d)/);
  });
  it('оверлей: без обводок, без зашитых цветов, текст не мельче 15 px', () => {
    const tour = read('components/spire/peak/PeakTour.tsx').replace(/\/\/.*$/gm, '');
    expect(tour).not.toMatch(/borderWidth|borderColor/);
    expect(tour).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    for (const m of tour.matchAll(/fontSize:\s*(\d+)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(15);
    expect(tour).not.toContain('adjustsFontSizeToFit');
  });
  it('старый тур-картинка не показывается при новом экране; dev-вход ?state=peak_tour', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain('tourSeen === false && !peakScreenV2On()');
    expect(read('app/dev_spire_preview.tsx')).toContain("params.state === 'peak_tour'");
    expect(read('components/spire/peak/PeakScreenPreview.tsx')).toContain("tour={tourPage === undefined ? 'off' : { page: tourPage }}");
  });
});
