// ════════════════════════════════════════════════════════════════════════════
// withAndroidBackupRules — Expo config plugin для Android Auto Backup.
//
// Что делает:
//   1. Создаёт android/app/src/main/res/xml/backup_rules.xml
//      (правила для Android < 12 / API < 31) и
//      android/app/src/main/res/xml/data_extraction_rules.xml
//      (для Android 12+ — отдельный API для cloud backup и device transfer).
//   2. Добавляет в AndroidManifest.xml на <application>:
//        android:fullBackupContent="@xml/backup_rules"
//        android:dataExtractionRules="@xml/data_extraction_rules"
//      и tools:replace для случая когда другие плагины их уже задают.
//
// Зачем:
//   На Android EncryptedSharedPreferences (где expo-secure-store хранит stable_id)
//   НЕ переезжает через Auto Backup — ключ Android Keystore device-bound.
//   Поэтому stable_id дублируется в plain AsyncStorage (RKStorage SQLite).
//   Чтобы AsyncStorage гарантированно попал в Google Drive Backup, нужно явно
//   разрешить его включение в backup и **исключить** временные кэши.
//
//   Без этих файлов Android использует дефолт: бэкапит всё /data/data,
//   что может включать большие image-кэши и ломать backup-квоту юзера.
//   Явные rules делают backup детерминированным.
// ════════════════════════════════════════════════════════════════════════════

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Правила для Android API < 31 (Android 11 и младше)
//
// Whitelist-семантика: бэкапятся ТОЛЬКО то, что есть в <include>. Поэтому
// excludes для file/cache/external_cache не нужны (раньше они были, и из-за
// них lintVitalRelease падал: домены "cache"/"external_cache" Android не знает,
// а exclude по domain="file" без include по тому же домену даёт ошибку
// `[FullBackupContent] X is not in an included path`).
//
// Cache directory Android вообще никогда не бэкапит — это документированное
// поведение AutoBackup. Так что включать только то, что нам реально нужно
// сохранить через переустановку.
const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Auto Backup rules для Phraseman.

  ВКЛЮЧАЕМ в backup (whitelist):
    - SharedPreferences (общие настройки React Native)
    - databases/RKStorage (AsyncStorage SQLite — там лежит phraseman_stable_uid_cache,
      который служит fallback для восстановления stable_id после переустановки,
      т.к. EncryptedSharedPreferences от expo-secure-store через backup НЕ переезжают).

  ВСЁ ОСТАЛЬНОЕ (file/, cache/, external/) автоматически исключено,
  так как нет соответствующих <include>.
-->
<full-backup-content>
  <include domain="sharedpref" path="."/>
  <include domain="database" path="RKStorage"/>
</full-backup-content>
`;

// Правила для Android API >= 31 (Android 12+).
// Отдельные секции для cloud backup и device-to-device transfer.
const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Data extraction rules для Android 12+ (API 31+).

  Структура повторяет backup_rules.xml, но Android разделил cloud backup
  (Google Drive) и device transfer (новый телефон через Smart Switch / Quick Setup).
  Whitelist-семантика та же: бэкапим/переносим только sharedpref + RKStorage.
-->
<data-extraction-rules>
  <cloud-backup>
    <include domain="sharedpref" path="."/>
    <include domain="database" path="RKStorage"/>
  </cloud-backup>
  <device-transfer>
    <include domain="sharedpref" path="."/>
    <include domain="database" path="RKStorage"/>
  </device-transfer>
</data-extraction-rules>
`;

const writeXmlFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      fs.writeFileSync(path.join(xmlDir, 'backup_rules.xml'), BACKUP_RULES_XML, 'utf8');
      fs.writeFileSync(path.join(xmlDir, 'data_extraction_rules.xml'), DATA_EXTRACTION_RULES_XML, 'utf8');
      return cfg;
    },
  ]);
};

const patchManifest = (config) => {
  return withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults.manifest;
    // Гарантируем неймспейс tools для tools:replace
    if (manifest.$ && !manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    const application = manifest.application?.[0];
    if (!application) return cfg;
    application.$ = application.$ || {};
    application.$['android:fullBackupContent'] = '@xml/backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    // Если другой плагин (например Firebase) задал свой fullBackupContent —
    // tools:replace позволит мерджеру манифестов принять наш.
    const existing = application.$['tools:replace'];
    const additions = ['android:fullBackupContent', 'android:dataExtractionRules'];
    if (existing) {
      const current = existing.split(',').map((s) => s.trim()).filter(Boolean);
      for (const a of additions) if (!current.includes(a)) current.push(a);
      application.$['tools:replace'] = current.join(',');
    } else {
      application.$['tools:replace'] = additions.join(',');
    }
    return cfg;
  });
};

module.exports = function withAndroidBackupRules(config) {
  config = writeXmlFiles(config);
  config = patchManifest(config);
  return config;
};
