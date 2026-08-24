import fs from 'fs';
import path from 'path';

test('Spin stars persist an exact client composite without a server-selected reward contract', () => {
  const server = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'level_spin_star_grant.ts'), 'utf8');
  const client = fs.readFileSync(path.join(process.cwd(), 'app', 'level_spin_star_grants.ts'), 'utf8');
  const functionsClient = fs.readFileSync(path.join(process.cwd(), 'app', 'community_packs', 'functionsClient.ts'), 'utf8');
  const localSpins = fs.readFileSync(path.join(process.cwd(), 'app', 'local_level_spins.ts'), 'utf8');
  const appLayout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

  expect(server).toContain('parseLevelSpinStarComposite(request.data?.operation)');
  expect(server).toContain('prepareStarOperations');
  expect(server).toContain('commitStarOperations');
  expect(server).toContain('levelSpinStarReplayMatches');
  expect(server).not.toMatch(/request\.data\?\.(requestId|giftId|lane|deliveryToken)/);
  expect(server).not.toContain('level_spin_results');

  expect(client).toContain('commitPhoneStateNonMonetaryEconomyGrant');
  expect(client).toContain('callLevelSpinStarComposite(operation)');
  expect(client).toContain('requestFingerprint !== operation.requestFingerprint');
  expect(client).not.toContain('creditedTotal');
  expect(functionsClient).toContain("'levelSpinStarGrant'");
  expect(functionsClient).toContain('{ operation }');
  expect(functionsClient).toContain('operation: LevelSpinStarCreditExactResult');
  expect(functionsClient).not.toContain('{ operation: unknown }');
  expect(functionsClient).not.toContain('callLevelSpinStarGrant');
  expect(localSpins).toContain('recoverAndHydrateLevelSpinStarGrants(token)');
  expect(appLayout).toContain('recoverAndHydrateLevelSpinStarGrants(token)');
});
