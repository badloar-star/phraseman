// Сверка 25.10: пилюля монет «Обучения» на холодном старте показывала «—», пока не пройдёт гидратация (правило владельца — без
// пустых кадров). До подтверждения — последнее число общего показа Ядра; «—» только если снимка прогресса нет вовсе.
import fs from 'node:fs';
import path from 'node:path';

const snapshot: { progress: unknown } = { progress: null };
let displayed = 0;
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: () => snapshot }));
jest.mock('../app/runes_system', () => ({
  peekDisplayedRunes: () => displayed,
  subscribeDisplayedRunes: () => () => undefined,
}));

import { peekLessonsCoinPillFallbackV1 } from '../app/lessons_coin_pill_fallback';

describe('lessons coin pill first frame', () => {
  it('shows the cached displayed number before hydration, «—» only without any snapshot', () => {
    snapshot.progress = null;
    expect(peekLessonsCoinPillFallbackV1()).toBeNull();
    snapshot.progress = { stars: 1000 };
    displayed = 1110;
    expect(peekLessonsCoinPillFallbackV1()).toBe(1110);
  });

  it('the lessons tab renders the pill from the hook, not from the trusted-only value', () => {
    const lessons = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    expect(lessons).toContain('const coinPill = useLessonsCoinPillValueV1(legacyCoinBalance);');
    expect(lessons).toContain('{coinPill.value === null ? "—" : String(coinPill.value)}');
    expect(lessons).not.toContain('{legacyCoinBalance === null ? "—" : String(legacyCoinBalance)}');
  });
});
