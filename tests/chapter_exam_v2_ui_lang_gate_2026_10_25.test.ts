// 🔴 координатора 25.10: тексты экрана экзамена главы v2 и курса есть только на ru/uk — на другом языке интерфейса экзамен не
// открывается (ни v2, ни прежний), как весь курс V2: уводим на Главную. Проверка — в самом выборе экрана, по языку из LangContext.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/ui_lang_resolved', () => ({ peekResolvedUiLang: () => null }));

import { LEARNING_V2_EXPLANATION_UI_LANGS, isLearningV2OpenForUiLangV1 } from '../app/learning_v2_visibility_switch';

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('экзамен главы v2: язык интерфейса', () => {
  it('открыт только для ru и uk; es, pt-BR, tr, pl, vi, id, en — закрыт', () => {
    expect([...LEARNING_V2_EXPLANATION_UI_LANGS]).toEqual(['ru', 'uk']);
    for (const lang of ['ru', 'uk']) expect(isLearningV2OpenForUiLangV1(lang)).toBe(true);
    for (const lang of ['es', 'pt-BR', 'tr', 'pl', 'vi', 'id', 'en']) expect(isLearningV2OpenForUiLangV1(lang)).toBe(false);
  });

  it('маршрут экзамена проверяет язык интерфейса ДО выбора v2 / прежнего и уводит на Главную', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/learning-v2/chapter-exam.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const fn = src.slice(src.indexOf('function ChapterExamSwitch()'), src.indexOf('function ChapterExamRun()'));
    const gate = fn.indexOf("isLearningV2OpenForUiLangV1(lang, 'chapter_exam_route')");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(fn.indexOf('isChapterExamV2EnabledFor('));
    expect(fn).toContain('<Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />');
    // и общий выключатель курса по-прежнему стоит первым
    expect(src).toMatch(/if \(isLearningV2Hidden\(\)\) \{[\s\S]{0,200}return <Redirect href=\{LEARNING_V2_HIDDEN_REDIRECT\} \/>;/);
  });
});
