// ЗАМОК ВЛАДЕЛЬЦА 26.10 (со скринов эмулятора, через координатора): карточка «Эпизод 8 · Мандраж · ▶ Начать эпизод 8» поверх ленты —
// «ВООБЩЕ НЕ ДОЛЖНО СУЩЕСТВОВАТЬ»; окно «Чему научишься» («ЗАНЯТИЕ 9 · ГЛАВА 2», цель, «4 новых слова», «Начать», «Сразу к практике») —
// убрать ЦЕЛИКОМ. Тап по плитке эпизода → сразу занятие. Ослабить сторож — только по новому слову владельца.
import fs from 'node:fs';
import path from 'node:path';
import { LEARNING_V2_START_SHEET_ENABLED, SEASON_EPISODE_WINDOW_ENABLED } from '../components/learning-v2/season/season_flags';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('замок 26.10: тап по эпизоду сразу запускает занятие, без окон', () => {
  it('окно эпизода и окно «Чему научишься» выключены', () => {
    expect(SEASON_EPISODE_WINDOW_ENABLED).toBe(false);
    expect(LEARNING_V2_START_SHEET_ENABLED).toBe(false);
  });

  it('карусель: тап по эпизоду зовёт запуск занятия, окно раскрывается только у экзамена', () => {
    const src = read('components/learning-v2/season/SeasonCourse.tsx');
    expect(src).toMatch(/if \(card && card\.kind !== 'exam' && !SEASON_EPISODE_WINDOW_ENABLED\) \{[\s\S]{0,400}props\.onPrimary\(card\);\s*return;\s*\}/);
  });

  it('вкладка «Уроки»: шторка запуска не рисуется, выбранное занятие стартует само обычным стартом', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('visible={LEARNING_V2_START_SHEET_ENABLED && selectedLearningV2Session !== null}');
    expect(src).toMatch(/if \(LEARNING_V2_START_SHEET_ENABLED \|\| !selectedLearningV2Session\) return;[\s\S]{0,600}launchSelectedLearningV2Session\(false\);/);
    expect(src).toContain('[EPISODE-OPEN]');
  });
});
