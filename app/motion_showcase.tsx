// motion_showcase.tsx — production-safe gate для витрины движения.
// зачем: раздел DEV Hub со всеми поверхностями не должен попадать в стор-сборку.
import React from 'react';
import { IS_STORE_RELEASE } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function MotionShowcaseGate() {
  if (__DEV__ && !IS_STORE_RELEASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only витрина вне стор-сборки
    const Real = require('./_motion_showcase').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
