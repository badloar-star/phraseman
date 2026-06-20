// ════════════════════════════════════════════════════════════════════════════
// admin_speaking_lab.tsx — production-safe gate.
//
// Реальный код (DEV/QA превью всех статусов SpeakingPanel) живёт в
// `_admin_speaking_lab.tsx` (`_`-префикс → файл не считается роутом
// expo-router'ом и не доступен пользователю напрямую).
//
// Этот стаб в `__DEV__` грузит реальную реализацию через `require()`,
// а в production делает `<Redirect/>` на главную. Metro в production
// видит `if (false) require(...)` как dead code — реальный модуль (и его
// зависимости) не попадает в выходной JS-бандл.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { ENABLE_DEV_TOOLS } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function AdminSpeakingLabGate() {
  if (ENABLE_DEV_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_speaking_lab').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
