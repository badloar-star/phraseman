import { handleAdminProductAnalytics } from './admin_product_analytics';
import { handleAdminSubscriptionAnalytics } from './admin_subscription_analytics';
import { generateMonthlyDecisionPackResponse } from './admin_monthly_decision_pack';

const insufficientAuth = {
  uid: 'non-admin-user',
  token: {
    admin: false,
    adminRole: 'user',
    aud: 'phraseman-ea0b3',
    iss: 'https://securetoken.google.com/phraseman-ea0b3',
    firebase: { sign_in_provider: 'password' },
  },
};

const supportAuth = {
  uid: 'support-admin',
  token: {
    admin: true,
    adminRole: 'support',
  },
};

async function expectPermissionDenied(action: () => Promise<unknown>) {
  await expect(action()).rejects.toMatchObject({ code: 'permission-denied' });
}

describe('analytics callable server permission boundary', () => {
  test.each([
    ['product analytics', (auth: unknown) => handleAdminProductAnalytics({ auth, data: {} } as never)],
    ['subscription analytics', (auth: unknown) => handleAdminSubscriptionAnalytics({ auth, data: {} } as never)],
    ['monthly decision pack', (auth: unknown) => generateMonthlyDecisionPackResponse({}, auth)],
      ])('%s rejects unauthenticated and insufficient callers', async (_name, invoke) => {
        await expectPermissionDenied(() => invoke(undefined));
        await expectPermissionDenied(() => invoke(insufficientAuth));
        await expectPermissionDenied(() => invoke(supportAuth));
      });
});
