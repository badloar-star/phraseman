import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('broadcast rewards claim through one server callable and dismiss only after success', () => {
  const client = read('app/global_broadcast_modal.ts');
  const modal = read('components/GlobalBroadcastModal.tsx');
  expect(client).toContain("'globalBroadcastClaim'");
  expect(client).not.toContain("addShardsRaw(");
  expect(client).toContain('await claimGlobalBroadcastReward(');
  const claimAndDismiss = client.slice(
    client.indexOf('export async function claimAndDismissGlobalBroadcastModal'),
  );
  expect(claimAndDismiss.indexOf('await claimGlobalBroadcastReward(')).toBeLessThan(
    claimAndDismiss.indexOf('await applyBroadcastReward('),
  );
  expect(claimAndDismiss.indexOf('await applyBroadcastReward(')).toBeLessThan(
    claimAndDismiss.indexOf('await AsyncStorage.setItem(dismissKey('),
  );
  const closeOnce = modal.slice(modal.indexOf('const closeOnce'), modal.indexOf('const openReview'));
  const openReview = modal.slice(modal.indexOf('const openReview'), modal.indexOf('return ('));
  for (const handler of [closeOnce, openReview]) {
    expect(handler.indexOf('await claimAndDismissGlobalBroadcastModal')).toBeLessThan(
      handler.lastIndexOf('onClose();'),
    );
  }
});

test('server claim validates active/audience and records claim with reward in one transaction', () => {
  const server = read('functions/src/global_broadcast_claim.ts');
  expect(server).toContain('broadcast.active !== true');
  expect(server).toContain('broadcast_audience_mismatch');
  expect(server).toContain('db.runTransaction');
  expect(server).toContain("collection('reward_claims')");
  expect(server).toContain('tx.set(claimRef');
  expect(server).toContain('tx.set(userRef');
});

test('functions index exports the server-authoritative broadcast claim', () => {
  expect(read('functions/src/index.ts')).toContain("export { globalBroadcastClaim } from './global_broadcast_claim';");
});
