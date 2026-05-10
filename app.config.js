/**
 * Расширяет статический app.json.
 * При локальном запуске (npm run android / dev): задай EXPO_PUBLIC_DISABLE_EXPO_UPDATES=1 —
 * Expo Updates не подменит JS из интернета, будет вшитый бандл сборки/Micro.
 *
 * На EAS build эта переменная не задаётся → updates как в app.json (вкл.).
 */
const fs = require('fs');
const path = require('path');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));
const expoBase = appJson.expo || {};

const disableExpoUpdates = process.env.EXPO_PUBLIC_DISABLE_EXPO_UPDATES === '1';

const updates = expoBase.updates
  ? {
      ...expoBase.updates,
      enabled: disableExpoUpdates ? false : expoBase.updates.enabled !== false,
    }
  : disableExpoUpdates
    ? { enabled: false }
    : undefined;

module.exports = {
  expo: {
    ...expoBase,
    ...(updates ? { updates } : {}),
  },
};
