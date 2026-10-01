import fs from 'fs';
import path from 'path';

const read = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

// зачем (координатор §46, 2026-10-01): экран arena_leaderboard удалён вместе с Ареной
// (D83), его кейсы сняты. Счётчик ошибок Главной 2.0 берётся из
// getMistakePracticeHomeCounts (старый getMistakePracticeReadyCount на Главной
// запрещён сторожем ретайра тренера) — суть та же: считается в проде, сбой чтения
// не обнуляет молча.
describe('UX-аудит: безопасные фиксы (ошибки на Главной)', () => {
  describe('home: счётчик ошибок считается в проде (без __DEV__-гейта)', () => {
    const source = read('app', '(tabs)', 'home.tsx');

    const callStart = source.indexOf('getMistakePracticeHomeCounts(mistakeStudyTarget)');
    const callBlock = source.slice(callStart, source.indexOf('}, [', callStart));

    it('getMistakePracticeHomeCounts вызывается без обёртки __DEV__ ?', () => {
      expect(callStart).toBeGreaterThanOrEqual(0);
      expect(source.slice(Math.max(0, callStart - 40), callStart)).not.toMatch(/__DEV__\s*\?/);
    });

    it('сбой локального чтения ловится и пишет причину', () => {
      expect(callBlock).toContain('.catch((error: unknown) => {');
      expect(callBlock).toContain("console.warn('[MISTAKES-HUB] home:counts:catch");
    });
  });
});
