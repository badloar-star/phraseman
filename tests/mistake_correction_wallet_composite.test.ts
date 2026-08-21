import {
  createMistakeCorrectionCompositeAuthority,
  materializeMistakeCorrectionCompositeCandidate,
} from '../modules/learning-v2/progress/mistake_correction_wallet_composite';
import { createWalletAuthorizedOperation } from '../modules/learning-v2/contracts/wallet';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import { createWalletState, reduceAuthorizedWalletOperation } from '../modules/learning-v2/progress/wallet_reducer';

const candidateBase = {
  schemaVersion: 'mistake-correction-wallet-composite.v1' as const,
  accountScopeHash: 'f'.repeat(64),
  mistakeId: `mistake:v1:${'b'.repeat(64)}`,
  cycleId: `mistake-cycle:v1:${'c'.repeat(64)}`,
  studyTarget: 'en' as const,
  correctionEventId: `mistake-practice:v1:${'d'.repeat(64)}`,
  correctionEventFingerprint: 'e'.repeat(64),
  rewardVersion: 1 as const,
};
const candidate = {
  ...candidateBase,
  rewardKey: `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
    mistakeId: candidateBase.mistakeId,
    cycleId: candidateBase.cycleId,
    studyTarget: candidateBase.studyTarget,
    rewardVersion: 1,
  }))}`,
};

describe('mistake correction client-authoritative wallet composite', () => {
  test('binds one correction transition and exactly one access star without trusted-server authority', () => {
    const operation = materializeMistakeCorrectionCompositeCandidate({
      candidate,
      accountScopeHash: 'f'.repeat(64),
      accountGeneration: 3,
      walletRevisionBefore: 7,
    });
    expect(createWalletAuthorizedOperation(operation)).toEqual(operation);
    expect(operation).toMatchObject({
      authority: 'client_authoritative_composite',
      currency: 'access_star',
      amountSubunits: 10_000,
      operationReason: 'mistake_correction',
      origin: {
        kind: 'mistake_correction',
        mistakeId: candidate.mistakeId,
        cycleId: candidate.cycleId,
        correctionEventId: candidate.correctionEventId,
      },
    });
  });

  test('rejects amount/identity widening and exact replay returns the canonical operation', async () => {
    const authority = createMistakeCorrectionCompositeAuthority();
    const request = {
      scope: { accountScopeHash: 'f'.repeat(64), generation: 3 },
      walletState: { revision: 0 },
      canonicalAppliedReceipt: null,
      candidate,
    };
    const first = await authority(request as never);
    const receipt = reduceAuthorizedWalletOperation(
      createWalletState({ accountScopeHash: 'f'.repeat(64) }),
      first,
      { currentAccountGeneration: 3 },
    ).appliedReceipt;
    await expect(authority({
      ...request,
      canonicalAppliedReceipt: receipt,
    } as never)).resolves.toEqual(first);
    await expect(authority({ ...request, candidate: { ...candidate, stars: 2 } } as never))
      .rejects.toThrow('mistake_correction_wallet_composite_invalid');
    await expect(authority({
      ...request,
      scope: { accountScopeHash: 'a'.repeat(64), generation: 3 },
    } as never)).rejects.toThrow('mistake_correction_wallet_composite_owner_mismatch');
  });
});
