// зачем (тур первого входа в Пик утверждён владельцем 04.11; координатор: «один раз на аккаунт, за флагом, Reduce Motion, токены, ≥15 px, dev-вход»).
// Сторож: геометрия окон и стрелок, тексты на 9 языках, флаг «показан» по аккаунту в стираемом семействе, проводка в экран и dev, правила вёрстки.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PEAK_TOUR_KEY_PREFIX, peakTourArrows, peakTourHoles, peakTourKey, peakTourKeys, peakTourPage, type PeakTourRects,
} from '../components/spire/peak/peak_tour_core';
import { __resetPeakTourStoreForTests, markPeakTourSeen, peekPeakTourSeen, readPeakTourSeen } from '../components/spire/peak/peak_tour_store';
import { spireGameText } from '../components/spire/spire_game_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const R = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const RECTS: PeakTourRects = { head: R(166, 110, 190, 80), pill: R(166, 150, 190, 40), rail: R(2, 120, 150, 600), top: R(154, 300, 240, 250) };

describe('окна затемнения', () => {
  it('страница 1 — шапка; 2 — башня и пилюля; 3 — строки топ-5 и верхушка башни (120 dp)', () => {
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

describe('тексты', () => {
  it('режим монет — ключи «…Coins» из макета; режим ступеней — прежние', () => {
    expect(peakTourKeys(0, 'coins')).toEqual({ title: 'tour1Title', text: 'tour1TextCoins' });
    expect(peakTourKeys(2, 'coins')).toEqual({ title: 'tour3TitleCoins', text: 'tour3TextCoins' });
    expect(peakTourKeys(2, 'steps')).toEqual({ title: 'tour3Title', text: 'tour3Text' });
  });
  it('все страницы × 9 языков × 2 режима — непустые, без нераскрытых {a}{b}{c}', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      for (const rankBy of ['coins', 'steps'] as const) {
        for (const page of [0, 1, 2] as const) {
          const k = peakTourKeys(page, rankBy);
          expect(spireGameText(lang, k.title).length).toBeGreaterThan(3);
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
    expect(screen).toContain("tour = 'auto'");
    expect(screen).toContain('usePeakTourGate(');
    expect(screen).toContain('<PeakTour');
    expect(screen).toContain('measureInWindow');
    const tour = read('components/spire/peak/PeakTour.tsx');
    expect(tour).toContain('reduceMotion ? undefined');
    expect(tour).toContain('<Mask');
    expect(tour).toContain('g.scrim');
  });
  it('оверлей: без обводок, без зашитых цветов, текст не мельче 15 px', () => {
    const tour = read('components/spire/peak/PeakTour.tsx').replace(/\/\/.*$/gm, '');
    expect(tour).not.toMatch(/borderWidth|borderColor/);
    expect(tour).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    for (const m of tour.matchAll(/fontSize:\s*(\d+)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(15);
    expect(tour).not.toContain('adjustsFontSizeToFit');
  });
  it('старый тур-картинка не показывается при новом экране; dev-вход ?state=peak_tour', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain('tourSeen === false && !PEAK_SCREEN_V2_ENABLED');
    expect(read('app/dev_spire_preview.tsx')).toContain("params.state === 'peak_tour'");
    expect(read('components/spire/peak/PeakScreenPreview.tsx')).toContain("tour={tourPage === undefined ? 'off' : { page: tourPage }}");
  });
});
