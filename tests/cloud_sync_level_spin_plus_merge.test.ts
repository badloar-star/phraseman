import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { mergeCloudVipWithLocalSpinGrant, writeMergedCloudVipSnapshot } from '../app/cloud_sync';

const localSpin = (until: string) => ({
  vip_active: 'true', vip_plan: 'level_spin', vip_from: '1800000000000', vip_until: until,
  vip_admin_override: 'true', vip_admin_grant_at: '1800000000000',
});

test('a stale cloud VIP snapshot cannot erase a later local Spin Plus grant', () => {
  expect(mergeCloudVipWithLocalSpinGrant({
    vip_active: 'false', vip_plan: '', vip_from: '0', vip_until: '0',
    vip_admin_override: 'false', vip_admin_grant_at: '',
  }, localSpin('1800604800000'))).toEqual(localSpin('1800604800000'));
});

test('lifetime local access is never downgraded by a finite cloud expiry', () => {
  const lifetime = { ...localSpin('0'), vip_plan: 'lifetime' };
  expect(mergeCloudVipWithLocalSpinGrant(localSpin('1800604800000'), lifetime)).toEqual(lifetime);
});

test('a lifetime plan with a stale finite timestamp is normalized back to lifetime', () => {
  const malformedLifetime = { ...localSpin('1800604800000'), vip_plan: 'lifetime' };
  expect(mergeCloudVipWithLocalSpinGrant(localSpin('1801209600000'), malformedLifetime))
    .toEqual({ ...malformedLifetime, vip_until: '0' });
});

test('a later active cloud expiry still converges onto the device', () => {
  const cloud = localSpin('1801209600000');
  expect(mergeCloudVipWithLocalSpinGrant(cloud, localSpin('1800604800000'))).toEqual(cloud);
});

test('deferred account A read cannot publish VIP mirrors after switching to B', async () => {
  beginAccountGeneration('account-a');
  const generationA = captureAccountGeneration();
  let resolveRead!: (value: ReturnType<typeof localSpin>) => void;
  const read = jest.fn(() => new Promise<ReturnType<typeof localSpin>>((resolve) => { resolveRead = resolve; }));
  const write = jest.fn(async () => true);
  const pending = writeMergedCloudVipSnapshot(generationA, localSpin('1801209600000'), {
    read: read as never,
    write: write as never,
  });
  expect(read).toHaveBeenCalledWith(generationA);
  beginAccountGeneration('account-b');
  resolveRead(localSpin('1800604800000'));
  await expect(pending).resolves.toBe(false);
  expect(write).not.toHaveBeenCalled();
});
