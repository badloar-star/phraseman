// pos_analytics_audit.tsx - production-safe gate for the POS audit route.
import React from 'react';
import { IS_STORE_RELEASE } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function PosAnalyticsAuditGate() {
  if (__DEV__ && !IS_STORE_RELEASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep the heavy dev audit out of store builds
    const Real = require('./_pos_analytics_audit').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
