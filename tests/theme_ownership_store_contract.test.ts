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
    const syncStart = cloudSyncSource.indexOf('export const SYNC_KEYS = [');
    expect(syncStart).toBeGreaterThan(0);
    const syncBlock = cloudSyncSource.slice(syncStart, cloudSyncSource.indexOf('\n];', syncStart));
    expect(syncBlock).toContain('OWNED_THEMES_KEY,');
    expect(syncBlock).toContain('GRANDFATHERED_THEMES_KEY,');
  });

  // зачем (аудит 2026-08-24): FC_RESTORE_MERGE_STRATEGIES покрывает только
  // французскую и sticky-ветки restore. ГЛАВНАЯ ветка идёт через
  // mergeLessonRestoreValue, где нераспознанный ключ возвращает cloudValue —
  // облако затирало бы офлайн-покупку, и человек терял бы 200 жемчужин.
  it('is protected in the MAIN restore branch too, not only the sticky one', () => {
    // Ключи признаны «владением» — это включает их во все owned-пути restore.
    // зачем срезом, а не regex по всему файлу: cloud_sync.ts > 4000 строк, и
    // жадный [\s\S]* по нему валит jest-воркер по памяти на этой машине.
    const unionStart = cloudSyncSource.indexOf('OWNED_UNION_RESTORE_BASE_KEYS = new Set');
    expect(unionStart).toBeGreaterThan(0);
    const unionBlock = cloudSyncSource.slice(unionStart, cloudSyncSource.indexOf(']);', unionStart));
    expect(unionBlock).toContain('OWNED_THEMES_KEY,');
    expect(unionBlock).toContain('GRANDFATHERED_THEMES_KEY,');
    // И отдельная ветка в mergeLessonRestoreValue — раньше общего union,
    // чтобы сохранялась фильтрация удалённых тем.
    expect(cloudSyncSource).toContain('if (key === OWNED_THEMES_KEY || key === GRANDFATHERED_THEMES_KEY) {');
    const themeBranch = cloudSyncSource.indexOf('if (key === OWNED_THEMES_KEY || key === GRANDFATHERED_THEMES_KEY) {');
    const unionBranch = cloudSyncSource.indexOf('if (isOwnedUnionRestoreKey(key)) {');
    expect(themeBranch).toBeGreaterThan(0);
    expect(themeBranch).toBeLessThan(unionBranch);
  });

  // зачем (аудит 2026-08-24): без разового маркера закрепление «дедушки»
  // срабатывало на КАЖДОМ запуске. Активный подписчик, переключаясь между
  // темами, накопил бы их все навсегда — и после отмены подписки сохранил бы
  // весь платный набор, а темы за жемчуг перестал бы покупать вовсе.
  it('grandfathers themes exactly once, not on every launch', () => {
    const storeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'theme_ownership_store.ts'), 'utf8');
    expect(storeSource).toContain('GRANDFATHER_MIGRATION_KEY_PREFIX');
    // Ранний выход, когда миграция (текущая ИЛИ legacy) уже прошла.
    expect(storeSource).toContain("if (alreadyMigrated === '1' || legacyMigrated === '1') {");
    // Маркер ставится ДО проверки прав — иначе миграция осталась бы «открытой».
    const markerSet = storeSource.indexOf('await AsyncStorage.setItem(migrationKey, \'1\');\n  if (!opts.hadAccess)');
    expect(markerSet).toBeGreaterThan(0);
  });

  // зачем per-account (аудит 2026-08-25): плоский маркер устройства «сжигал»
  // право миграции для ВТОРОГО аккаунта на том же (общем) устройстве, даже
  // если у него было своё законное основание на дедушку. Ключ теперь составной
  // (префикс + stable id), но остаётся локальным — не в облаке.
  it('scopes the migration marker per account while keeping it device-local', () => {
    const storeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'theme_ownership_store.ts'), 'utf8');
    expect(storeSource).toContain("import { getCanonicalUserId } from './user_id_policy';");
    expect(storeSource).toContain('async function grandfatherMigrationKey(): Promise<string> {');
    expect(storeSource).toContain('GRANDFATHER_MIGRATION_KEY_PREFIX}${stableId ?? \'anon\'}');
    // Старый плоский ключ проверяется для обратной совместимости, но новых
    // записей под ним больше не делаем — иначе аккаунт B на общем устройстве
    // снова считался бы уже мигрировавшим по ключу аккаунта A.
    expect(storeSource).toContain("const LEGACY_DEVICE_MIGRATION_KEY = 'theme_grandfather_migrated_v1';");
    // Если бы маркер ездил в облако, на втором телефоне миграция ТОГО ЖЕ
    // аккаунта считалась бы сделанной и не закрепила бы тему там.
    expect(cloudSyncSource).not.toContain('theme_grandfather_migrated_v1');
    expect(cloudSyncSource).not.toContain('theme_grandfather_migrated_v2_');
    expect(cloudSyncSource).not.toContain('GRANDFATHER_MIGRATION_KEY');
  });

  it('never resurrects a theme that no longer exists in the app', () => {
    // Старое облако может помнить удалённые темы (coral/vanilla). Они не должны
    // попадать в список «купленных» — общий union такой фильтрации не делает.
    const merged = JSON.parse(store.mergeOwnedThemesRestoreValue(
      JSON.stringify(['ember']),
      JSON.stringify(['coral', 'vanilla', 'minimalDark', 'volt']),
    ));
    expect(merged.sort()).toEqual(['ember', 'volt']);
  });
});
