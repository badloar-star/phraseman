// ════════════════════════════════════════════════════════════════════════════
// audio_debug.tsx — production-safe gate.
//
// TTS-диагностика — чисто dev-инструмент. Реальный код живёт в
// `_admin_audio_debug.tsx` (`_`-префикс → не считается роутом expo-router'ом).
// В production этот стаб делает Redirect, реальный модуль не попадает
// в JS-бандл (Metro tree-shake'ает `if (false) require(...)`).
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Redirect } from 'expo-router';
import { DEV_MODE } from './config';

export default function AudioDebugGate() {
  if (__DEV__ || DEV_MODE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lets Metro tree-shake the dev module out of prod bundle
    const Real = require('./_admin_audio_debug').default;
    return <Real />;
  }
  return <Redirect href={'/(tabs)/' as any} />;
}
