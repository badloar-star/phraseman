// зачем (R92, координатор 17.10): курс Learning V2 виден только там, где у него есть пояснения на языке интерфейса человека.
// У выпуска пояснения есть на ru и uk; для остальных языков показ подставлял русский. Сторож держит три вещи:
// 1) замок: ru/uk — курс открыт, es/pt-BR/vi/id/tr/pl/en — закрыт, язык ещё не известен — вход не режется (его перепроверит маршрут);
// 2) общий рубильник isLearningV2Hidden учитывает фактический язык интерфейса — им закрыты маршруты курса и занятия,
//    диплинки и плитка «Уроки» на Главной; каждое решение пишется строкой [V2-LOCALE-GATE];
// 3) список языков совпадает с тем, что реально лежит в выпуске курса (появился перевод — сторож напомнит открыть язык).
import fs from 'node:fs';
import path from 'node:path';

import {
  LEARNING_V2_EXPLANATION_UI_LANGS,
  isLearningV2Hidden,
  isLearningV2OpenForUiLangV1,
} from '../app/learning_v2_visibility_switch';
import { __resetResolvedUiLangForTests, publishResolvedUiLang } from '../app/ui_lang_resolved';

const ROOT = path.join(__dirname, '..');

describe('Learning V2: курс только на языке интерфейса с пояснениями (R92)', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    __resetResolvedUiLangForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  test('ru и uk — курс открыт; остальные языки интерфейса — закрыт', () => {
    expect(isLearningV2OpenForUiLangV1('ru')).toBe(true);
    expect(isLearningV2OpenForUiLangV1('uk')).toBe(true);
    for (const lang of ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en']) {
      expect([lang, isLearningV2OpenForUiLangV1(lang)]).toEqual([lang, false]);
    }
  });

  test('язык ещё не известен — вход не режется (маршрут курса перепроверит при показе)', () => {
    expect(isLearningV2OpenForUiLangV1(null)).toBe(true);
    expect(isLearningV2Hidden()).toBe(false);
  });

  test('рубильник следует фактическому языку интерфейса и пишет [V2-LOCALE-GATE] со значением языка', () => {
    publishResolvedUiLang('pt-BR', 'initial');
    expect(isLearningV2Hidden()).toBe(true);
    publishResolvedUiLang('ru', 'state');
    expect(isLearningV2Hidden()).toBe(false);
    publishResolvedUiLang('en', 'state');
    expect(isLearningV2Hidden()).toBe(true);
    const lines = log.mock.calls.map(([line]) => String(line)).filter((line) => line.includes('[V2-LOCALE-GATE]'));
    expect(lines.some((line) => line.includes('uiLang=pt-BR decision=hidden'))).toBe(true);
    expect(lines.some((line) => line.includes('uiLang=ru decision=open'))).toBe(true);
    expect(lines.some((line) => line.includes('uiLang=en decision=hidden'))).toBe(true);
  });

  test('список языков совпадает с языками пояснений в выпуске курса', () => {
    const intro = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'content/learning-v2-course/release/en/l01/s01/intro.json'), 'utf8',
    )) as { learningOutcomeByLocale: Record<string, string> };
    expect(Object.keys(intro.learningOutcomeByLocale).sort()).toEqual([...LEARNING_V2_EXPLANATION_UI_LANGS].sort());
  });

  test('вкладка «Обучение» и карточка «Продолжить» спрашивают замок по языку из контекста', () => {
    const lessons = fs.readFileSync(path.join(ROOT, 'app/(tabs)/lessons.tsx'), 'utf8');
    expect(lessons).toContain('const learningV2CanOpen = LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY && isLearningV2OpenForUiLangV1(lang, "lessons_tab");');
    // язык сменили, пока открыта карта V2 — вкладка уходит на классический курс
    expect(lessons).toMatch(/if \(page !== "v2" \|\| learningV2CanOpen\) return;[\s\S]{0,300}setPageRaw\("lessons"\);/);
    const home = fs.readFileSync(path.join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');
    expect(home).toContain("isLearningV2OpenForUiLangV1(lang, 'home_continue')");
  });
});
