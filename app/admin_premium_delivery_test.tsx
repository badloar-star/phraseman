import React from 'react';
import { ENABLE_DEV_TOOLS } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function AdminPremiumDeliveryTestGate() {
  if (ENABLE_DEV_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: Metro aliases this module to a stub for store-release exports
    const Real = require('./_admin_premium_delivery_test').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
