import fs from 'fs';
import path from 'path';

// зачем (владелец 2026-08-24): купленная за 200 жемчужин тема — это потраченная
// валюта. Если облачный restore перезапишет список покупок (как это уже сделал
// когда-то с `app_theme`), человек потеряет деньги. Мерж обязан быть
// ОБЪЕДИНЕНИЕМ, а не перезаписью — этим занят данный сторож.
//
// Импортируем только чистый модуль (без Firebase/AsyncStorage-графа) — cloud_sync
// целиком валит воркер по памяти на этой машине.
const store = require('../app/theme_ownership_merge') as {
  OWNED_THEMES_KEY: string;
  GRANDFATHERED_THEMES_KEY: string;
  mergeThemeModeLists: (a: readonly string[], b: readonly string[]) => string[];
  mergeOwnedThemesRestoreValue: (local: string | null | undefined, remote: string | null | undefined) => string;
};

const cloudSyncSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

describe('purchased theme ownership survives sync', () => {
  it('merges two devices instead of overwriting either', () => {
    const merged = JSON.parse(store.mergeOwnedThemesRestoreValue(
      JSON.stringify(['ember']),
      JSON.stringify(['volt']),
    ));
    // Покупка на телефоне и покупка на планшете обе остаются у человека.
    expect(merged.sort()).toEqual(['ember', 'volt']);
  });

  it('never loses a local purchase when the cloud copy is empty or broken', () => {
    for (const remote of [null, undefined, '', '[]', 'not-json', '{"a":1}']) {
      const merged = JSON.parse(store.mergeOwnedThemesRestoreValue(JSON.stringify(['midnight']), remote));
      expect(merged).toContain('midnight');
    }
  });

  it('drops unknown theme names instead of spreading garbage', () => {
    const merged = JSON.parse(store.mergeOwnedThemesRestoreValue(
      JSON.stringify(['ember', 'not_a_theme', 42, null]),
      JSON.stringify(['coral']),
    ));
    expect(merged).toEqual(['ember']);
  });

  it('is idempotent — repeated restore never duplicates a purchase', () => {
    const once = store.mergeOwnedThemesRestoreValue(JSON.stringify(['dark']), JSON.stringify(['dark']));
    expect(JSON.parse(once)).toEqual(['dark']);
    expect(store.mergeThemeModeLists(['dark', 'dark'], ['dark'])).toEqual(['dark']);
  });

  it('registers both keys for sync with the union merge strategy', () => {
    // Без записи в SYNC_KEYS покупка не переживёт переустановку; без записи в
    // merge-стратегиях облако её перезапишет. Нужны обе.
    expect(cloudSyncSource).toContain('OWNED_THEMES_KEY]: mergeOwnedThemesRestoreValue');
    expect(cloudSyncSource).toContain('GRANDFATHERED_THEMES_KEY]: mergeOwnedThemesRestoreValue');
    expect(cloudSyncSource).toMatch(/SYNC_KEYS = \[[\s\S]*OWNED_THEMES_KEY,/);
    expect(cloudSyncSource).toMatch(/SYNC_KEYS = \[[\s\S]*GRANDFATHERED_THEMES_KEY,/);
  });
});
