// ════════════════════════════════════════════════════════════════════════════
// admin_review_test.tsx — production-safe gate.
//
// Реальный код (deeplink-сидер для тест-сессии повторения) живёт в
// `_admin_review_test.tsx` (`_`-префикс → файл не считается роутом
// expo-router'ом и не доступен пользователю напрямую).
//
// Этот стаб в `__DEV__` грузит реальную реализацию через `require()`,
// а в production делает `<Redirect/>` на главную. Metro в production
// видит `if (false) require(...)` как dead code — реальный модуль не
// попадает в выходной JS-бандл.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Redirect } from 'expo-router';
import { DEV_MODE } from './config';

export default function AdminReviewTestGate() {
  if (__DEV__ || DEV_MODE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_review_test').default;
    return <Real />;
  }
  return <Redirect href={'/(tabs)/' as any} />;
}
