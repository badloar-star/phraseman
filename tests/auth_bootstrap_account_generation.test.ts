import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
const bootstrapStart = layout.indexOf('const bootstrap = async () => {');
const bootstrapEnd = layout.indexOf("const sub = onAppEvent('achievement_unlocked'", bootstrapStart);
const bootstrap = layout.slice(bootstrapStart, bootstrapEnd);

describe('startup account generation activation', () => {
  it('activates the resolved local identity only on proceed and before UI or cloud work', () => {
    const recoveryGate = bootstrap.indexOf('await runAuthRecoveryBootGate(');
    const blockedBranch = bootstrap.indexOf("if (recoveryGate.result !== 'proceed')", recoveryGate);
    const blockedBranchEnd = bootstrap.indexOf('clearAuthRecoveryBootRetry();', blockedBranch);
    const activationRead = bootstrap.indexOf('const startupStableId = await getStableId();', blockedBranchEnd);
    const activation = bootstrap.indexOf('beginInitialAccountGeneration(startupStableId);', activationRead);
    const cloudAllowed = bootstrap.indexOf('recoveryBootAllowsCloud = true;', activation);
    const revealTimer = bootstrap.indexOf('safetyTimer = setTimeout', cloudAllowed);
    const cloudRestore = bootstrap.indexOf('createBootCloudRestoreCoordinator', revealTimer);

    expect(layout).toContain('beginInitialAccountGeneration,');
    expect(recoveryGate).toBeGreaterThan(-1);
    expect(blockedBranch).toBeGreaterThan(recoveryGate);
    expect(bootstrap.slice(blockedBranch, blockedBranchEnd)).not.toContain('beginInitialAccountGeneration(');
    expect(activationRead).toBeGreaterThan(blockedBranchEnd);
    expect(activation).toBeGreaterThan(activationRead);
    expect(cloudAllowed).toBeGreaterThan(activation);
    expect(revealTimer).toBeGreaterThan(cloudAllowed);
    expect(cloudRestore).toBeGreaterThan(revealTimer);
  });
});
