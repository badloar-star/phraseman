// ════════════════════════════════════════════════════════════════════════════
// settings_testers.tsx — production-safe gate to the admin/testers panel.
//
// Why this file exists:
//   В production-сборке админ-панель не должна не то что отображаться —
//   она НЕ ДОЛЖНА ВООБЩЕ ПОПАДАТЬ В JS-БАНДЛ. Реальный код админки живёт в
//   `app/_admin_settings_testers.tsx` — `_`-префикс делает файл «приватным»
//   с точки зрения expo-router (он не регистрируется как роут).
//
//   Этот файл — тонкий стаб:
//     • в `__DEV__` грузит реальную реализацию через `require()`;
//     • в production делает `<Redirect/>` на главную.
//
//   Metro статически подставляет `__DEV__ → false` в production-бандле,
//   видит `if (false) require('./_admin_settings_testers')` как dead code
//   и не включает реальный модуль (1.6k строк + все его транзитивные
//   зависимости, заведённые только ради админки) в выходной бандл.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Redirect } from 'expo-router';
import { DEV_MODE } from './config';

export default function SettingsTestersGate() {
  if (__DEV__ || DEV_MODE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_settings_testers').default;
    return <Real />;
  }
  return <Redirect href={'/(tabs)/' as any} />;
}
