// Раунд 2, Настройки п.5: после смены темы — плашка «Вернуть прежнюю» на 5 секунд; тап возвращает прежнюю тему.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Темы: «Вернуть прежнюю»', () => {
  const screen = read('app/settings_themes.tsx');
  const bar = read('components/settings/ThemeUndoBar.tsx');
  it('смена темы запоминает прежнюю, таймер 5 с гасится при новой смене и уходе', () => {
    expect(screen).toContain('setUndoThemeId(shownThemeId);');
    expect(screen).toContain('THEME_UNDO_VISIBLE_MS');
    expect(screen).toContain('useEffect(() => clearUndoTimer, [clearUndoTimer]);');
    expect(bar).toContain('export const THEME_UNDO_VISIBLE_MS = 5000;');
  });
  it('тап возвращает прежнюю тему (мгновенно, без ожидания диска) и скрывает плашку', () => {
    expect(screen).toContain('setLiquidGlassThemeId(undoThemeId);');
    expect(screen).toContain('setUndoThemeId(null);');
    expect(screen).toContain('{undoThemeId ? <ThemeUndoBar');
  });
  it('журнал: смена, возврат, истечение и ранний выход называют причину', () => {
    expect(screen).toContain("console.log('[THEME-UNDO] смена темы'");
    expect(screen).toContain("console.log('[THEME-UNDO] вернули'");
    expect(screen).toContain("console.log('[THEME-UNDO] время вышло");
    expect(screen).toContain("console.log('[THEME-UNDO] тап без прежней темы");
  });
  it('плашка: 9 языков, глагол действия, без обводки, без подписи мелким шрифтом', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) expect(bar).toContain(`${lang}:`);
    expect(bar).not.toMatch(/border(Width|Color)\s*:/);
    expect(bar).not.toContain('adjustsFontSizeToFit');
    expect(bar).toContain('fontSize: 16');
  });
});
