import { readFileSync } from 'fs';
import { join } from 'path';
import {
  isMatchFoundToastPathAllowed,
  MATCH_FOUND_TOAST_PATH_BLOCKLIST,
  MATCH_FOUND_TOAST_SCREEN_HOST_PATHS,
} from '../components/matchFoundToastPaths';

describe('MatchFoundToast path guard', () => {
  it('прячет тост в боевом флоу арены (root host)', () => {
    for (const route of MATCH_FOUND_TOAST_PATH_BLOCKLIST) {
      expect(isMatchFoundToastPathAllowed(`/${route}`, 'root')).toBe(false);
    }
  });

  it('показывает тост на нейтральных экранах (root host)', () => {
    expect(isMatchFoundToastPathAllowed('/(tabs)/home', 'root')).toBe(true);
    expect(isMatchFoundToastPathAllowed('/lesson_menu', 'root')).toBe(true);
    expect(isMatchFoundToastPathAllowed('/friends', 'root')).toBe(true);
  });

  it('на premium_modal корневой хост молчит, экранный — показывает', () => {
    for (const route of MATCH_FOUND_TOAST_SCREEN_HOST_PATHS) {
      expect(isMatchFoundToastPathAllowed(`/${route}`, 'root')).toBe(false);
      expect(isMatchFoundToastPathAllowed(`/${route}`, 'screen')).toBe(true);
    }
  });

  it('пустой/невалидный путь — не показываем', () => {
    expect(isMatchFoundToastPathAllowed('', 'root')).toBe(false);
    expect(isMatchFoundToastPathAllowed(null, 'root')).toBe(false);
    expect(isMatchFoundToastPathAllowed(undefined, 'root')).toBe(false);
  });
});

describe('MatchFoundToast z-index', () => {
  // MaintenanceGate: баннер 9998 / блок 9999. Тост обязан быть НИЖЕ, чтобы
  // экран техработ всегда перекрывал тост.
  it('zIndex контейнера тоста ниже MaintenanceGate (9998)', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'MatchFoundToast.tsx'),
      'utf8',
    );
    const m = src.match(/container:\s*\{[^}]*zIndex:\s*(\d+)/);
    expect(m).toBeTruthy();
    const zIndex = Number(m![1]);
    expect(zIndex).toBeLessThan(9998);
  });
});
