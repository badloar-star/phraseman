import React from 'react';
import { IS_STORE_RELEASE } from './config';
import { DeferredRedirect } from '../components/DeferredRedirect';

export default function AdminPremiumDeliveryTestGate() {
  if (__DEV__ && !IS_STORE_RELEASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: Metro aliases this module to a stub for store-release exports
    const Real = require('./_admin_premium_delivery_test').default;
    return <Real />;
  }
  return <DeferredRedirect href={'/(tabs)/home' as any} />;
}
