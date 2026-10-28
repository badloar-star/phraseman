// зачем (владелец 28.10, «кнопка Уроки не работает»): плитка Главной передаёт вкладке «Уроки» тихий запрос «выбери карту V2»;
// запрос обязан сработать один раз и не пережить TTL, иначе устаревший флаг откроет карту при следующем заходе без плитки.
import fs from 'fs';
import path from 'path';
import {
  consumeLessonsV2PageRequest,
  peekLessonsV2PageRequestAgeMs,
  requestLessonsV2Page,
  resetLessonsV2PageRequestForTests,
} from '../app/lessons_open_v2_request';

describe('lessons_open_v2_request', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetLessonsV2PageRequestForTests();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('без запроса: возраст null и забирать нечего', () => {
    expect(peekLessonsV2PageRequestAgeMs()).toBeNull();
    expect(consumeLessonsV2PageRequest()).toBe(false);
  });

  it('свежий запрос забирается ровно один раз', () => {
    requestLessonsV2Page('home_tile');
    expect(peekLessonsV2PageRequestAgeMs()).not.toBeNull();
    expect(consumeLessonsV2PageRequest()).toBe(true);
    expect(consumeLessonsV2PageRequest()).toBe(false);
    expect(peekLessonsV2PageRequestAgeMs()).toBeNull();
  });

  it('просроченный запрос (> 5 с) отбрасывается с причиной в журнале', () => {
    requestLessonsV2Page('home_tile');
    expect(consumeLessonsV2PageRequest(Date.now() + 5001)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('v2_page_request_expired'), expect.any(String));
    expect(consumeLessonsV2PageRequest()).toBe(false);
  });

  it('вкладка «Уроки» забирает запрос при фокусе и выбирает карту V2', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    expect(src).toContain('consumeLessonsV2PageRequest');
    expect(src).toMatch(/consumeLessonsV2PageRequest\(\)[\s\S]{0,400}setPageRaw\("v2"\)/);
  });
});
