import fs from 'fs';
import path from 'path';

const read = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('UX-аудит: безопасные фиксы (web_screen / arena / SRS)', () => {
  describe('web_screen: error-состояние не тупик', () => {
    const source = read('app', 'web_screen.tsx');

    it('в ветке !url есть кнопка «Назад» (safeRouterBack)', () => {
      const noUrlIndex = source.indexOf('if (!url)');
      const mainReturnIndex = source.indexOf('Linking.openURL(url)');
      expect(noUrlIndex).toBeGreaterThan(0);
      // Ищем safeRouterBack ВНУТРИ error-блока (между if (!url) и основным return).
      const errorBlock = source.slice(noUrlIndex, mainReturnIndex);
      expect(errorBlock).toContain('safeRouterBack');
    });

    it('кнопка назад в error-ветке имеет accessibilityLabel', () => {
      const noUrlBlock = source.slice(source.indexOf('if (!url)'), source.indexOf('Linking.openURL'));
      expect(noUrlBlock).toContain('accessibilityLabel');
      expect(noUrlBlock).toContain('arrow-back');
    });
  });

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

  describe('home: SRS-счётчик считается в проде (без __DEV__-гейта)', () => {
    const source = read('app', '(tabs)', 'home.tsx');

    // Берём строку ВЫЗОВА (с .then(...Array...)), а не строку импорта.
    const callLine = source
      .split('\n')
      .find((l) => l.includes('getTrainerTotalDue(') && l.includes('.then('));

    it('getTrainerTotalDue вызывается без обёртки __DEV__ ?', () => {
      expect(callLine).toBeTruthy();
      expect(callLine).not.toMatch(/__DEV__\s*\?/);
    });

    it('есть защита .catch на случай сбоя локального чтения', () => {
      expect(callLine).toContain('.catch(');
    });
  });
});
