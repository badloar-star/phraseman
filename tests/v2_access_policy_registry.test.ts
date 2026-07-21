import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  accessBoostPolicyFromRegistry,
} from '../modules/learning-v2/contracts/access_boost';
import { resolveDecisionRegistry } from '../modules/learning-v2/policies/decision_registry';

describe('V2 Access Boost policy registry projection', () => {
  const fixture = JSON.parse(
    readFileSync(
    path.resolve(__dirname, 'fixtures/learning-v2/content-studio/decision-registry.v1.json'),
      'utf8',
    ),
  );

  it('derives price/caps/eligibility from the exact immutable registry ref', () => {
    const resolved = accessBoostPolicyFromRegistry(resolveDecisionRegistry(fixture.baseline));
    expect(resolved.policy).toEqual({
      unitPriceShards: 3,
      maxPurchasedPerGate: 3,
      maxPurchasedPerChapter: 3,
      maxPurchasedPerSeason: 12,
    });
    expect(resolved.eligibleDeficit).toEqual({ min: 1, max: 3 });
    expect(resolved.registryRef.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a ref whose version or hash is not bound to the body', () => {
    expect(() => accessBoostPolicyFromRegistry({
      ...resolveDecisionRegistry(fixture.baseline),
      record: { ...resolveDecisionRegistry(fixture.baseline).record, ref: { ...resolveDecisionRegistry(fixture.baseline).record.ref, version: 99 } },
    })).toThrow('decision_registry_binding_invalid');
  });
});
