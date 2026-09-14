import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

describe('video-watch rune session authority', () => {
  test('client sends session identities but never a self-reported duration', () => {
    const client = read('app', 'video_watch_runes_client.ts');
    const hook = read('hooks', 'use_video_watch_energy_boost.ts');
    expect(client).toContain("action: 'start'");
    expect(client).toContain("action: 'claim'");
    expect(client).toContain('pending_claim_v2');
    expect(client).not.toMatch(/callable\(\)\(\{[\s\S]{0,180}\bminutes\s*:/);
    expect(hook).not.toContain('addPendingWatchMinutes');
    expect(hook).toContain('startVideoWatchRuneSession');
    expect(hook).toContain('claimVideoWatchRuneSession');

    const claimStart = client.indexOf('export async function claimVideoWatchRuneSession');
    const claimBlock = client.slice(claimStart);
    expect(claimBlock.indexOf('AsyncStorage.setItem(pendingClaimKey(stableId)'))
      .toBeLessThan(claimBlock.indexOf('flushPendingProgressUnlocked(token, stableId)'));

    const startStart = client.indexOf('export async function startVideoWatchRuneSession');
    const startEnd = client.indexOf('export async function claimVideoWatchRuneSession', startStart);
    const startBlock = client.slice(startStart, startEnd);
    expect(startBlock).toContain('recoverPendingVideoWatchRuneSessionUnlocked');
    expect(startBlock).not.toContain('multiRemove([pendingProgressKey(stableId), progressCursorKey(stableId)]');
  });

  test('server grants only verified progress and protects every authority field from clients', () => {
    const server = read('functions', 'src', 'video_watch_runes.ts');
    const rules = read('firestore.rules');
    expect(server).toContain("action === 'progress'");
    expect(server).toContain('session.verifiedMs');
    expect(server).toContain('maxCreditedPositionMs');
    expect(server).not.toContain('observedVideoWatchDuration(session.startedAt, now');
    expect(server).not.toMatch(/Number\(request\.data\?\.minutes\)/);
    for (const field of [
      'videoWatchRunesDaily',
      'videoWatchRuneSessionV1',
      'videoWatchRuneCarryMsV1',
    ]) {
      const occurrences = rules.match(new RegExp(`'${field}'`, 'g')) ?? [];
      expect(occurrences.length).toBeGreaterThanOrEqual(2);
    }
  });
});
