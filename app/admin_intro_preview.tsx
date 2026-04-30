// ════════════════════════════════════════════════════════════════════════════
// admin_intro_preview.tsx — production-safe gate.
//
// Тот же приём, что и в `settings_testers.tsx`: реальная реализация
// (превью intro-экранов уроков) живёт в `_admin_intro_preview.tsx`. Этот
// файл — тонкий стаб, который в `__DEV__` грузит её через `require()`,
// а в production-сборке Redirect'ит наружу. Реальный код благодаря
// `if (__DEV__)` физически не попадает в production-бандл.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Redirect } from 'expo-router';
import { DEV_MODE } from './config';

export default function AdminIntroPreviewGate() {
  if (__DEV__ || DEV_MODE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_intro_preview').default;
    return <Real />;
  }
  return <Redirect href={'/(tabs)/' as any} />;
}
