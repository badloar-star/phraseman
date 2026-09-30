import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'functions', 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const deployScripts = Object.entries(packageJson.scripts).filter(([name]) => name.startsWith('deploy:'));
const retired = [
  'leagueJoinOrUpdateGroup', 'leagueUpdateMyMember', 'leagueSyncMyBoost',
  'leagueChestClaim', 'leagueFinalizeCron', 'leagueResidentsTickCron',
  'computeLeaderboardStatsCron', 'resetWeeklyXpCron',
];
for (const [scriptName, command] of deployScripts) {
  for (const callable of retired) {
    assert.equal(command.includes(`functions:${callable}`), false, `${scriptName} still selects ${callable}`);
  }
}
