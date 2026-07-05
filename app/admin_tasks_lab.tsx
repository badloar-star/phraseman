// ════════════════════════════════════════════════════════════════════════════
// admin_tasks_lab.tsx — production-safe gate.
//
// Реальный код (управление опросами за осколки) живёт в `_admin_tasks_lab.tsx`
// (`_`-префикс → не роут expo-router, недоступен пользователю напрямую).
// В `__DEV__` грузим реализацию через require(); в production — Redirect на
// главную, а Metro видит `if (false) require(...)` как dead code и вырезает
// dev-модуль из бандла.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { ENABLE_DEV_TOOLS } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function AdminTasksLabGate() {
  if (ENABLE_DEV_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_tasks_lab').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
