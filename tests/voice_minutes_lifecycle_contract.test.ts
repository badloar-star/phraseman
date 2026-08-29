import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('voice-minute money lifecycle contract', () => {
  it('keeps events, wallets, and denials server-only', () => {
    const rules = read('firestore.rules');
    for (const collection of ['voice_minute_events', 'voice_minute_wallets', 'voice_minute_denials']) {
      expect(rules).toMatch(new RegExp(`match \\/${collection}\\/\\{[^}]+\\}\\s*\\{\\s*allow read, write: if false;`));
      expect(rules).toContain(`&& collection != '${collection}'`);
    }
  });

  it('deletes every voice-minute identity record and direct wallet projection', () => {
    const source = read('functions/src/account_delete.ts');
    expect(source).toContain("{ collection: 'voice_minute_events', field: 'ownerStableId', values: 'stable' }");
    expect(source).toContain("{ collection: 'voice_minute_denials', field: 'candidates', values: 'both', op: 'array-contains' }");
    expect(source).toContain("{ collection: 'voice_minute_wallets', values: 'stable' }");
  });

  it('merges the wallet exactly once without rewriting immutable purchase events', () => {
    const merge = read('functions/src/auth_merge.ts');
    const domain = read('functions/src/voice_minutes.ts');
    expect(merge).toContain('mergeVoiceMinuteWalletsInTransaction');
    expect(domain).toContain('canonicalOwnerStableId');
    expect(domain).toContain('voice_minute_wallet_merge_conflict');
    expect(merge).not.toMatch(/voice_minute_events[^\n]+(?:update|delete)/);
  });

  it('exposes a read-only authenticated wallet callable instead of client Firestore access', () => {
    const api = read('functions/src/voice_minutes_api.ts');
    const index = read('functions/src/index.ts');
    expect(api).toContain('resolveStableUidForAuth');
    expect(api).toContain('voiceMinuteWalletMine');
    expect(api).not.toMatch(/request\.data[^\n]*(?:availableSeconds|grantedSeconds|chargedSeconds)/);
    expect(index).toContain('voiceMinuteWalletMine');
  });

  it('keeps Jarvis and analytics taxonomies current and retires max_monthly', () => {
    const callables = read('functions/src/jarvis/all_departments_callables.ts');
    const guard = read('functions/src/jarvis/jarvis_data_contract_guard.test.ts');
    expect(callables).toContain("voice_minute_events: () => fetchMoneySource");
    expect(guard).toContain("collection: 'voice_minute_events'");
    expect(read('functions/src/admin_analytics_core.ts')).not.toContain("'max_monthly'");
    expect(read('functions/src/admin_analytics_trends_core.ts')).not.toContain("'max_monthly'");
  });

  it('removes MAX subscription management while retaining normal Premium management', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const manage = read('app/manage_subscription.tsx');
    expect(settings).not.toContain("premiumPlan === 'max_monthly'");
    expect(manage).not.toContain("currentPlan === 'max_monthly'");
    expect(manage).not.toContain('Подписка MAX');
    expect(manage).toContain('Годовая подписка');
    expect(manage).toContain('Месячная подписка');
  });
});
