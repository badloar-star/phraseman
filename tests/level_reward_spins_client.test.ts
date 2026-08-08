import {
  LEVEL_SPIN_OUTBOX_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  LEVEL_SPIN_PENDING_REVEAL_KEY,
  levelSpinReceiptToInventory,
  journalEntryForReceipt,
  mergeLevelSpinJournal,
  parsePendingLevelSpinReveal,
  parseLevelSpinOutbox,
} from '../app/level_reward_spins_client';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('level reward spins client contracts', () => {
  test('returns the immutable server receipt on every Finish Line path', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const finish = source.slice(
      source.indexOf('async function finishPersistedClaim'),
      source.indexOf('function isActiveSpinPendingError'),
    );
    const recover = source.slice(
      source.indexOf('export async function recoverLevelSpinClaim'),
      source.indexOf('export async function claimLevelSpin'),
    );
    const claim = source.slice(source.indexOf('export async function claimLevelSpin'));
    expect(source).not.toContain('premiumSafePresentationReceipt');
    expect(source).not.toContain('presentationReceiptForCurrentAccess');
    expect(source).not.toContain('premiumSafeLevelGiftId');
    expect(finish).toContain('return receipt');
    expect(recover).toContain('return pendingReveal');
    expect(recover).toContain('? outstanding');
    expect(claim).toContain('return pendingReveal');
  });

  test('keeps a fixed account-local outbox key and rejects another account owner', () => {
    expect(LEVEL_SPIN_OUTBOX_KEY).toBe('level_reward_spin_outbox_v1');
    const raw = JSON.stringify({ owner: 'stable-a', requestId: '1234567890abcdef', createdAtMs: 10 });
    expect(parseLevelSpinOutbox(raw, 'stable-a')?.requestId).toBe('1234567890abcdef');
    expect(parseLevelSpinOutbox(raw, 'stable-b')).toBeNull();
  });

  test('materializes a single receipt with its immutable server timestamp', () => {
    expect(levelSpinReceiptToInventory({
      ok: true,
      stableUid: 'stable-a',
      requestId: '1234567890abcdef',
      creditId: 'level_spin_v1_005',
      level: 5,
      kind: 'milestone',
      baseGiftId: 'xp_bank_150',
      premiumGiftId: null,
      createdAtMs: 1_800_000_000_000,
      expiresAtMs: 1_800_259_200_000,
      balanceAfter: 2,
      status: 'awaiting_ack',
      catalogVersion: 1,
      schemaVersion: 1,
    })).toMatchObject({
      level: 5,
      receivedAtMs: 1_800_000_000_000,
      kind: 'single',
      gift: {
        id: 'xp_bank_150',
        spinRewardReceipt: {
          requestId: '1234567890abcdef',
          lane: 'base',
          giftId: 'xp_bank_150',
        },
      },
    });
  });

  test('accepts a server-issued level exam credit without confusing it with a level-up credit', () => {
    expect(levelSpinReceiptToInventory({
      ok: true,
      stableUid: 'stable-a',
      requestId: 'examreward1234567',
      creditId: 'level_exam_spin_v1_A2',
      level: 3,
      kind: 'standard',
      baseGiftId: 'xp_50',
      premiumGiftId: null,
      createdAtMs: 1_000,
      expiresAtMs: 259_201_000,
      balanceAfter: 1,
      status: 'awaiting_ack',
      catalogVersion: 1,
      schemaVersion: 1,
    })).toMatchObject({ kind: 'single', level: 3, receivedAtMs: 1_000 });
  });

  test('materializes both Plus reward occurrences atomically', () => {
    expect(levelSpinReceiptToInventory({
      ok: true,
      stableUid: 'stable-a',
      requestId: '1234567890abcdef',
      creditId: 'level_spin_v1_006',
      level: 6,
      kind: 'standard',
      baseGiftId: 'xp_100',
      premiumGiftId: 'prem_shards_10',
      createdAtMs: 1_800_000_000_000,
      expiresAtMs: 1_800_259_200_000,
      balanceAfter: 1,
      status: 'awaiting_ack',
      catalogVersion: 1,
      schemaVersion: 1,
    })).toMatchObject({
      kind: 'dual',
      pair: {
        f2p: { id: 'xp_100', spinRewardReceipt: { requestId: '1234567890abcdef', lane: 'base' } },
        prem: { id: 'prem_shards_10', spinRewardReceipt: { requestId: '1234567890abcdef', lane: 'premium' } },
      },
    });
  });

  test('binds each choice child to its exact immutable delivery selection', () => {
    const item = levelSpinReceiptToInventory({
      ok: true,
      stableUid: 'stable-a',
      requestId: 'choice1234567890',
      creditId: 'level_spin_v1_030',
      level: 30,
      kind: 'milestone',
      baseGiftId: 'choice_3_level',
      premiumGiftId: null,
      createdAtMs: 1_800_000_000_000,
      expiresAtMs: 1_800_259_200_000,
      balanceAfter: 0,
      status: 'awaiting_ack',
      catalogVersion: 1,
      schemaVersion: 1,
    });
    expect(item.kind).toBe('single');
    if (item.kind !== 'single') throw new Error('expected_single_choice');
    expect(item.gift.spinRewardReceipt?.giftId).toBe('choice_3_level');
    expect(item.gift.choices?.map((choice) => ({
      id: choice.id,
      authorityGiftId: choice.spinRewardReceipt?.giftId,
    }))).toEqual(item.gift.choices?.map((choice) => ({
      id: choice.id,
      authorityGiftId: choice.id,
    })));
  });

  test('choice modal preserves the selected child authority instead of restoring the root id', () => {
    const modalSource = readFileSync(join(process.cwd(), 'components', 'LevelGiftModal.tsx'), 'utf8');
    const choiceBody = modalSource.slice(
      modalSource.indexOf('const handleChoice'),
      modalSource.indexOf('const handleApply'),
    );
    expect(choiceBody).toContain('chosen.spinRewardReceipt');
    expect(choiceBody.indexOf('chosen.spinRewardReceipt')).toBeLessThan(choiceBody.indexOf('gift?.spinRewardReceipt'));
  });

  test('keeps spin delivery authority out of the ordinary level reservation path', () => {
    const giftSource = readFileSync(join(process.cwd(), 'app', 'level_gift_system.ts'), 'utf8');
    const spinBranch = giftSource.slice(
      giftSource.indexOf('async function applySpinRewardGift'),
      giftSource.indexOf('export const applyGift = async'),
    );
    expect(spinBranch).toContain('callLevelSpinDeliveryAction');
    expect(spinBranch).toContain('selectedGiftId: authority.giftId');
    expect(spinBranch).toContain('const definition = serverDefinition');
    expect(spinBranch).not.toContain('sanitizeLevelGiftForPremium');
    expect(spinBranch).not.toContain('reserveLevelGiftForDisplay');
    expect(spinBranch).toContain('withAccountTransitionLock');
    expect(spinBranch).toContain('Crypto.randomUUID()');
    expect(spinBranch).toContain('preserveGiftId: true');
    expect(spinBranch).toContain("completed.status !== 'claimed'");
    expect(spinBranch).toContain('`level-spin:${authority.requestId}:${authority.lane}`');
    expect(spinBranch).not.toContain('Math.random()');
  });

  test('persists the outbox before the claim callable and sends v1 on every updated progress event', () => {
    const clientSource = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const progressSource = readFileSync(join(process.cwd(), 'app', 'progress_events_client.ts'), 'utf8');
    const claimEntry = clientSource.slice(clientSource.indexOf('export async function claimLevelSpin'));
    expect(claimEntry.indexOf('AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY'))
      .toBeLessThan(claimEntry.indexOf('finishWithServerRecovery(outbox'));
    expect(progressSource).toContain("levelSpinProtocol: 'v1'");
  });

  test('enrolls the current account in sticky v1 before the first status read', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const statusBody = source.slice(
      source.indexOf('async function fetchLevelSpinStatusUncached'),
      source.indexOf('export async function fetchLevelSpinStatus'),
    );
    expect(statusBody).toContain('await enrollLevelSpinV1(stableId, token)');
    expect(statusBody.indexOf('await enrollLevelSpinV1(stableId, token)'))
      .toBeLessThan(statusBody.indexOf("callable<{ stableId: string }, LevelSpinStatus>('levelRewardSpinStatus')"));
  });

  test('dedupes status requests per owner behind a one-minute cache', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    expect(source).toContain('LEVEL_SPIN_STATUS_CACHE_TTL_MS = 60_000');
    expect(source).toContain('statusInFlightByOwner.get(stableId)');
    expect(source).toContain('now - cached.updatedAtMs < LEVEL_SPIN_STATUS_CACHE_TTL_MS');
  });

  test('initializes App Check best-effort and lets callable enforcement decide', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const prepare = source.slice(
      source.indexOf('async function prepareNetwork'),
      source.indexOf('async function enrollLevelSpinV1'),
    );
    expect(prepare).toContain('await initFirebaseAppCheckIfAvailable().catch(() => false)');
    expect(prepare).not.toContain("throw new Error('app_check_unavailable')");
  });

  test('guards the balance cache read against account switches before mutating memory', () => {
    const clientSource = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const balanceRead = clientSource.slice(
      clientSource.indexOf('export async function readCachedLevelSpinBalance'),
      clientSource.indexOf('async function prepareNetwork'),
    );
    expect(balanceRead).toContain('captureAccountGeneration()');
    expect(balanceRead).toContain('isCurrentAccountGeneration(token, stableId)');
    expect(balanceRead.indexOf('isCurrentAccountGeneration(token, stableId)'))
      .toBeLessThan(balanceRead.indexOf('balancePeekByOwner.set(stableId, balance)'));
  });

  test('checks account generation before every fixed-outbox write', () => {
    const clientSource = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const recovery = clientSource.slice(
      clientSource.indexOf('export async function recoverLevelSpinClaim'),
      clientSource.indexOf('export async function claimLevelSpin'),
    );
    const claim = clientSource.slice(clientSource.indexOf('export async function claimLevelSpin'));
    const recoveryBeforeWrite = recovery.slice(
      0,
      recovery.indexOf('AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY'),
    );
    expect(recoveryBeforeWrite.match(/if \(!currentFor\(token, stableId\)\) return null;/g)).toHaveLength(2);
    const claimGuardIndex = claim.indexOf(
      "if (!currentFor(token, stableId)) throw new Error('level_spin_identity_changed');",
    );
    const claimWriteIndex = claim.indexOf('AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY');
    expect(claimGuardIndex).toBeGreaterThanOrEqual(0);
    expect(claimGuardIndex).toBeLessThan(claimWriteIndex);
  });

  test('adopts the server active request when another device won the race', () => {
    const clientSource = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const recovery = clientSource.slice(
      clientSource.indexOf('async function finishWithServerRecovery'),
      clientSource.indexOf('export async function recoverLevelSpinClaim'),
    );
    expect(recovery).toContain('isActiveSpinPendingError(error)');
    expect(recovery).toContain('const status = await fetchLevelSpinStatus({ force: true })');
    expect(recovery).toContain('requestId: activeRequestId');
    expect(recovery.indexOf('AsyncStorage.setItem(LEVEL_SPIN_OUTBOX_KEY'))
      .toBeLessThan(recovery.indexOf('return finishPersistedClaim(authoritativeOutbox'));
  });

  test('keeps an additive request-keyed journal and a durable owner-scoped pending reveal', () => {
    expect(LEVEL_SPIN_GIFT_JOURNAL_KEY).toBe('level_reward_spin_gift_journal_v1');
    expect(LEVEL_SPIN_PENDING_REVEAL_KEY).toBe('level_reward_spin_pending_reveal_v1');
    const first = {
      owner: 'stable-a', requestId: '1234567890abcdef', creditId: 'level_spin_v1_005',
      level: 5, receivedAtMs: 100, expiresAtMs: 259_200_100,
      occurrences: [{ occurrenceId: 'level-spin:1234567890abcdef:base', lane: 'base' as const, giftId: 'xp_100', claimed: false }],
    };
    const second = {
      ...first,
      requestId: 'fedcba0987654321',
      creditId: 'level_spin_v1_005',
      occurrences: [{ occurrenceId: 'level-spin:fedcba0987654321:base', lane: 'base' as const, giftId: 'xp_250', claimed: false }],
    };
    expect(mergeLevelSpinJournal([], first)).toEqual([first]);
    expect(mergeLevelSpinJournal([first], first)).toEqual([first]);
    expect(mergeLevelSpinJournal([first], second)).toEqual([first, second]);
    const createdAtMs = Date.now() - 1_000;
    const revealReceipt = {
      ok: true as const,
      stableUid: 'stable-a',
      requestId: first.requestId,
      creditId: 'level_spin_v1_005',
      level: 5,
      kind: 'milestone' as const,
      baseGiftId: 'xp_bank_150',
      premiumGiftId: null,
      createdAtMs,
      expiresAtMs: createdAtMs + 259_200_000,
      balanceAfter: 0,
      status: 'awaiting_ack' as const,
      revealState: 'pending' as const,
      deliveries: { base: { state: 'unclaimed' as const } },
      catalogVersion: 1,
      schemaVersion: 1,
    };
    expect(parsePendingLevelSpinReveal(JSON.stringify({ owner: 'stable-a', receipt: revealReceipt }), 'stable-a'))
      .toMatchObject({ requestId: first.requestId });
    expect(parsePendingLevelSpinReveal(JSON.stringify({ owner: 'stable-a', receipt: revealReceipt }), 'stable-b'))
      .toBeNull();
    expect(parsePendingLevelSpinReveal(JSON.stringify({
      owner: 'stable-a', receipt: { ...revealReceipt, baseGiftId: 'retired_unknown_gift' },
    }), 'stable-a')).toBeNull();
    expect(parsePendingLevelSpinReveal(JSON.stringify({
      owner: 'stable-a', receipt: { ...revealReceipt, expiresAtMs: Date.now() - 1 },
    }), 'stable-a')).toBeNull();
  });

  test('server terminal lane state wins when an outstanding receipt is reconciled', () => {
    const prior = {
      owner: 'stable-a', requestId: '1234567890abcdef', creditId: 'level_spin_v1_005',
      level: 5, receivedAtMs: 100, expiresAtMs: 259_200_100,
      occurrences: [{ occurrenceId: 'level-spin:1234567890abcdef:base', lane: 'base' as const, giftId: 'xp_100', claimed: false }],
    };
    const terminal = {
      ...prior,
      occurrences: [{ ...prior.occurrences[0], claimed: true }],
    };
    expect(mergeLevelSpinJournal([prior], terminal)[0].occurrences[0].claimed).toBe(true);
  });

  test('writes and verifies the additive journal before the pending reveal', () => {
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const persist = source.slice(source.indexOf('async function persistReceipt'), source.indexOf('async function finishPersistedClaim'));
    expect(persist).toContain('await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY');
    expect(persist).toContain('level_spin_journal_write_failed');
    expect(persist.indexOf('await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY'))
      .toBeLessThan(persist.indexOf('[LEVEL_SPIN_PENDING_REVEAL_KEY'));
  });

  test('mirrors server lane terminals and never replays an acknowledged receipt', () => {
    const receipt = {
      ok: true as const,
      stableUid: 'stable-a', requestId: '1234567890abcdef', creditId: 'level_spin_v1_006',
      level: 6, kind: 'standard' as const, baseGiftId: 'xp_100', premiumGiftId: 'prem_shards_10',
      createdAtMs: 1_800_000_000_000, expiresAtMs: 1_800_259_200_000, balanceAfter: 0,
      status: 'acknowledged' as const, revealState: 'acknowledged' as const,
      deliveries: {
        base: { state: 'delivered' as const, selectedGiftId: 'xp_100' },
        premium: { state: 'unclaimed' as const },
      },
      catalogVersion: 1, schemaVersion: 1,
    };
    expect(journalEntryForReceipt(receipt, 'stable-a').occurrences).toEqual([
      expect.objectContaining({ lane: 'base', giftId: 'xp_100', claimed: true }),
      expect.objectContaining({ lane: 'premium', giftId: 'prem_shards_10', claimed: false }),
    ]);
    const source = readFileSync(join(process.cwd(), 'app', 'level_reward_spins_client.ts'), 'utf8');
    const recover = source.slice(source.indexOf('export async function recoverLevelSpinClaim'));
    expect(recover).not.toContain('status.pendingResults?.[0]');
    expect(recover).toContain("result.revealState !== 'acknowledged'");
  });
});
