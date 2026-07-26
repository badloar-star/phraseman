// зачем: RN-порт source/src/surfaces/mobile/shared/ComposerShell.tsx. В Kimi полосы
// ComposerShell идентичны ChoiceShell (то же обёртывание ActivityShell) — отличается
// только словарь семейства (PromptZone → ComposerZone). Держим отдельное имя, чтобы
// порт читался как исходник, но не дублируем геометрию.
import React, { memo } from 'react';

import { ChoiceShell, type ChoiceShellProps } from './ChoiceShell';

export type ComposerShellProps = ChoiceShellProps;

export const ComposerShell = memo(function ComposerShell(props: ComposerShellProps) {
  return <ChoiceShell {...props} />;
});
