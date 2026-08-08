import React from 'react';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from '../../app/config';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

export default function DevHubSheetGate(props: Props) {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return null;
  // Keep the full DEV surface outside store-release module evaluation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DevHubSheet = require('./DevHubSheet').default as React.ComponentType<Props>;
  return <DevHubSheet {...props} />;
}
