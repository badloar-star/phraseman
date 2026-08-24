import fs from 'fs';
import path from 'path';

const read = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('UX-аудит: безопасные фиксы (arena / ошибки)', () => {
  describe('arena_leaderboard: ошибка не маскируется под «пусто»', () => {
    const source = read('app', 'arena_leaderboard.tsx');

    it('reloadBoard обёрнут в try/catch и ставит loadError', () => {
      expect(source).toContain('setLoadError(true)');
      expect(source).toContain('setLoadError(false)');
      // catch внутри reloadBoard
      const reloadIdx = source.indexOf('const reloadBoard = useCallback');
      const block = source.slice(reloadIdx, reloadIdx + 800);
      expect(block).toContain('try {');
      expect(block).toContain('catch');
    });

    it('ListEmptyComponent показывает error+retry при loadError', () => {
      expect(source).toContain('loadError ?');
      expect(source).toContain('testID="arena-lb-retry"');
      expect(source).toContain('cloud-offline-outline');
    });
  });

  describe('home: счётчик ошибок считается в проде (без __DEV__-гейта)', () => {
    const source = read('app', '(tabs)', 'home.tsx');

    const callStart = source.indexOf('getMistakePracticeReadyCount(studyTarget)');
    const callBlock = source.slice(callStart, callStart + 220);

    it('getMistakePracticeReadyCount вызывается без обёртки __DEV__ ?', () => {
      expect(callStart).toBeGreaterThanOrEqual(0);
      expect(callBlock).not.toMatch(/__DEV__\s*\?/);
    });

    it('есть защита .catch на случай сбоя локального чтения', () => {
      expect(callBlock).toContain('.catch(');
    });
  });
});
