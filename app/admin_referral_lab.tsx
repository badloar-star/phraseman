// ════════════════════════════════════════════════════════════════════════════
// admin_referral_lab.tsx — production-safe gate.
//
// Реальный код (DEV/QA превью реферальных VIP-модалок) живёт в
// `_admin_referral_lab.tsx` (`_`-префикс → файл не считается роутом
// expo-router'ом и не доступен пользователю напрямую).
//
// Этот стаб в `__DEV__` грузит реальную реализацию через `require()`,
// а в production делает `<Redirect/>` на главную. Metro в production
// видит `if (false) require(...)` как dead code — реальный модуль не
// попадает в выходной JS-бандл.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { ENABLE_DEV_TOOLS } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function AdminReferralLabGate() {
  if (ENABLE_DEV_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_referral_lab').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
