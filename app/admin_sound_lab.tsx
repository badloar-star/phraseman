// ════════════════════════════════════════════════════════════════════════════
// admin_sound_lab.tsx — production-safe gate.
//
// Реальный код (DEV/QA превью всех семантических звуков) живёт в
// `_admin_sound_lab.tsx` (`_`-префикс → файл не считается роутом
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

export default function AdminSoundLabGate() {
  if (ENABLE_DEV_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    // Ленивая загрузка внутри __DEV__-ветки — это и есть приём tree-shaking:
    // верхнеуровневый import затащил бы лабораторию в production-бандл.
    const Real = require('./_admin_sound_lab').default; // guard-ok: dev-only
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
