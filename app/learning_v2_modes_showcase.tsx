// learning_v2_modes_showcase.tsx — production-safe gate для витрины 7 режимов.
// зачем: владелец потребовал ОТДЕЛЬНЫЙ подраздел DEV Hub (не внутри «Движение ·
// все поверхности») со всеми 7 одобренными режимами Learning V2 — не должен
// попадать в стор-сборку. Тот же паттерн gate, что motion_showcase.tsx.
import React from 'react';
import { IS_STORE_RELEASE } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function LearningV2ModesShowcaseGate() {
  if (__DEV__ && !IS_STORE_RELEASE) {
    // guard-ok: тот же паттерн, что motion_showcase.tsx — рантайм-require
    // намеренный, не забытый static import: держит реальную витрину вне
    // стор-бандла целиком (не только за DEV-условием), а не просто ленивым.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only витрина вне стор-сборки
    const Real = require('./_learning_v2_modes_showcase').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
