// зачем (SQLITE_FULL, 2026-08-30): доставка данных на Android живёт в
// AsyncStorage, а это SQLite с ДЕФОЛТНЫМ потолком ~6 МБ. У живого
// пользователя (16 ошибок «database or disk is full», v1.6.7) база упёрлась
// в лимит — ежедневные задания перестали доставляться. Локальная строка в
// android/gradle.properties НЕ переживает EAS-prebuild (каталог android/ не
// в git), поэтому потолок задаётся здесь конфиг-плагином и попадает в каждую
// сборку. 64 МБ покрывает годы датированных ключей с запасом.
const { withGradleProperties } = require('@expo/config-plugins');

const KEY = 'AsyncStorage_db_size_in_MB';
const VALUE = '64';

module.exports = function withAsyncStorageDbSize(config) {
  return withGradleProperties(config, (config) => {
    const rest = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === KEY),
    );
    rest.push({ type: 'property', key: KEY, value: VALUE });
    config.modResults = rest;
    return config;
  });
};
