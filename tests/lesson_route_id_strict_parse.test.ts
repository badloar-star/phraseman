// R58 #8 (аудит кнопок 15.10): ?id=20abc — шлюз (Number → NaN → урок 1, открыт) и экран (parseInt → 20) расходились —
// обход замка Free ссылкой. Один строгий разбор: только ^\d+$, невалидный id — отказ (содержимое не монтируется).
jest.mock('../modules/lesson_first_frame', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: {} }) }));

import fs from 'fs';
import path from 'path';
import { parseLessonRouteId } from '../app/lesson_runtime_access_boundary';

describe('строгий разбор id урока из ссылки', () => {
  it.each([
    ['20', { kind: 'ok', id: 20 }],
    [' 7 ', { kind: 'ok', id: 7 }],
    [undefined, { kind: 'absent' }],
    ['', { kind: 'absent' }],
    ['20abc', { kind: 'invalid', raw: '20abc' }],
    ['0', { kind: 'invalid', raw: '0' }],
    ['-3', { kind: 'invalid', raw: '-3' }],
    ['1e2', { kind: 'invalid', raw: '1e2' }],
    ['3.5', { kind: 'invalid', raw: '3.5' }],
    ['0x14', { kind: 'invalid', raw: '0x14' }],
  ])('%p → %p', (raw, expected) => {
    expect(parseLessonRouteId(raw as string | undefined)).toEqual(expected);
  });

  it('шлюз не монтирует урок при невалидном id и уводит на «Уроки» с логом', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_runtime_access_boundary.tsx'), 'utf8');
    expect(src).toContain('const authorized = accessAuthorized && invalidRouteId === null;');
    expect(src).toMatch(/\[LESSON-GATE\] invalid_route_id[\s\S]{0,200}router\.replace\('\/\(tabs\)\/lessons'/);
    expect(src).not.toMatch(/const parsedLessonId = Number\(rawLessonId\)/);
  });
});
