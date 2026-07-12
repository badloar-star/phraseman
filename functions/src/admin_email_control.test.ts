import {
  parseEmailDirectoryRequest,
  selectEmailDirectoryPage,
} from './admin_email_control';

const contacts = [
  {
    id: 'a',
    data: {
      email: 'anna@example.com',
      sources: ['app'],
      appLastDisplayName: 'Anna',
      appStableIds: ['stable-anna'],
      contextLabel: 'Google account',
      lastSeenAtMs: 300,
      bulkEligibility: 'unknown',
      eligibilitySource: 'app_identity_unverified',
    },
  },
  {
    id: 'b',
    data: {
      email: 'buyer@example.com',
      sources: ['site'],
      displayName: 'Buyer',
      siteOrderIds: ['order-42'],
      contextLabel: 'web order',
      lastSeenAtMs: 200,
      bulkEligibility: 'eligible',
      eligibilitySource: 'checkout_product_email',
    },
  },
  {
    id: 'c',
    data: {
      email: 'supporter@example.com',
      sources: ['site'],
      displayName: 'Supporter',
      contextLabel: 'support form',
      lastSeenAtMs: 100,
      bulkEligibility: 'ineligible',
      eligibilitySource: 'support_contact_only',
    },
  },
];

describe('admin email directory contract', () => {
  test('bounds filters, page size and cursor', () => {
    expect(parseEmailDirectoryRequest({
      source: 'site',
      eligibility: 'eligible',
      suppression: 'active',
      pageSize: 999,
      cursor: 'b',
      query: '  ORDER-42  ',
    })).toEqual({
      view: 'default',
      source: 'site',
      eligibility: 'eligible',
      suppression: 'active',
      pageSize: 200,
      cursor: 'b',
      query: 'order-42',
    });
    expect(parseEmailDirectoryRequest({ view: 'legacy_table', pageSize: 50_000 })).toMatchObject({
      view: 'legacy_table', pageSize: 1_000,
    });
  });

  test('searches private identifiers server-side but omits them from the projection', () => {
    const page = selectEmailDirectoryPage(
      contacts,
      parseEmailDirectoryRequest({ query: 'order-42', pageSize: 20 }),
      new Set<string>(),
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: 'b', email: 'buyer@example.com' });
    expect(page.items[0]).not.toHaveProperty('siteOrderIds');
    expect(page.items[0]).not.toHaveProperty('appStableIds');
    expect(page.counts).toEqual({ all: 3, app: 1, site: 2, eligible: 1, suppressed: 0 });
  });

  test('finds a private UID or order beyond the former 5,000-row legacy preload', () => {
    const many = Array.from({ length: 5_200 }, (_, index) => ({
      id: `contact-${String(index).padStart(5, '0')}`,
      data: {
        email: `learner-${index}@example.com`,
        sources: ['site'],
        siteOrderIds: [index === 5_199 ? 'order-after-5000' : `order-${index}`],
        lastSeenAtMs: 10_000 - index,
        bulkEligibility: 'eligible',
      },
    }));

    const page = selectEmailDirectoryPage(
      many,
      parseEmailDirectoryRequest({ query: 'order-after-5000', pageSize: 200 }),
      new Set<string>(),
    );

    expect(page.filteredCount).toBe(1);
    expect(page.items.map((item) => item.email)).toEqual(['learner-5199@example.com']);
    expect(page.items[0]).not.toHaveProperty('siteOrderIds');
  });

  test('applies suppression and eligibility filters before pagination', () => {
    const page = selectEmailDirectoryPage(
      contacts,
      parseEmailDirectoryRequest({ source: 'site', eligibility: 'eligible', suppression: 'active', pageSize: 1 }),
      new Set(['supporter@example.com']),
    );

    expect(page.items.map((item) => item.email)).toEqual(['buyer@example.com']);
    expect(page.nextCursor).toBeNull();
    expect(page.filteredCount).toBe(1);
  });
});
