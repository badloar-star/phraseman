const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const GROUP_SIZE = 20;

function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function run() {
  const weekId = getWeekId();
  const [lbSnap, groupsSnap] = await Promise.all([
    db.collection('leaderboard').get(),
    db.collection('league_groups').where('weekId', '==', weekId).get(),
  ]);

  const groups = new Map();
  const uidToGroups = new Map();
  let groupMemberRefs = 0;
  let memberCountMismatch = 0;
  let oversizedGroups = 0;
  let emptyGroups = 0;

  for (const doc of groupsSnap.docs) {
    const data = doc.data() || {};
    const members = data.members || {};
    const realCount = Object.keys(members).length;
    const storedCount = data.memberCount ?? realCount;
    groups.set(doc.id, {
      leagueId: data.leagueId,
      memberCount: storedCount,
      members,
    });
    groupMemberRefs += realCount;
    for (const uid of Object.keys(members)) {
      if (!uidToGroups.has(uid)) uidToGroups.set(uid, []);
      uidToGroups.get(uid).push(doc.id);
    }
    if (storedCount !== realCount) memberCountMismatch++;
    if (realCount > GROUP_SIZE) oversizedGroups++;
    if (realCount === 0) emptyGroups++;
  }

  const lbById = new Map();
  let invalidLeagueId = 0;
  const invalidLeagueUsers = [];
  let missingGroupId = 0;
  let staleGroupWeekId = 0;
  let orphanGroupLinks = 0;
  let wrongLeagueAssignment = 0;
  let usersInCurrentWeekGroups = 0;

  for (const doc of lbSnap.docs) {
    const data = doc.data() || {};
    lbById.set(doc.id, data);

    const leagueId = data.leagueId;
    if (typeof leagueId !== 'number' || leagueId < 0 || leagueId > 11) {
      invalidLeagueId++;
      invalidLeagueUsers.push({ uid: doc.id, leagueId });
    }

    const groupId = data.groupId;
    const groupWeekId = data.groupWeekId;

    if (groupId && groupWeekId === weekId) {
      usersInCurrentWeekGroups++;
      const group = groups.get(groupId);
      if (!group) {
        orphanGroupLinks++;
      } else {
        const userLeague = typeof leagueId === 'number' ? leagueId : 0;
        if (group.leagueId !== userLeague) wrongLeagueAssignment++;
      }
    } else if (!groupId) {
      missingGroupId++;
    } else if (groupWeekId !== weekId) {
      staleGroupWeekId++;
    }
  }

  let membersMissingInLeaderboard = 0;
  let membersLeagueMismatch = 0;
  const missingInLeaderboardSample = [];

  for (const group of groups.values()) {
    for (const uid of Object.keys(group.members || {})) {
      const lb = lbById.get(uid);
      if (!lb) {
        membersMissingInLeaderboard++;
        if (missingInLeaderboardSample.length < 15) {
          missingInLeaderboardSample.push(uid);
        }
        continue;
      }
      const userLeague = typeof lb.leagueId === 'number' ? lb.leagueId : 0;
      if (userLeague !== group.leagueId) membersLeagueMismatch++;
    }
  }

  const duplicatedMembers = [];
  for (const [uid, gids] of uidToGroups.entries()) {
    if (gids.length > 1) duplicatedMembers.push({ uid, groups: gids });
  }

  const leagueDistribution = {};
  for (const doc of lbSnap.docs) {
    const data = doc.data() || {};
    const key = typeof data.leagueId === 'number' ? String(data.leagueId) : 'invalid';
    leagueDistribution[key] = (leagueDistribution[key] || 0) + 1;
  }

  const report = {
    weekId,
    leaderboardDocs: lbSnap.size,
    leagueGroupsCurrentWeek: groupsSnap.size,
    groupMemberRefs,
    usersInCurrentWeekGroups,
    invalidLeagueId,
    missingGroupId,
    staleGroupWeekId,
    orphanGroupLinks,
    wrongLeagueAssignment,
    membersMissingInLeaderboard,
    membersLeagueMismatch,
    duplicatedMembersCount: duplicatedMembers.length,
    memberCountMismatch,
    oversizedGroups,
    emptyGroups,
    leagueDistribution,
    invalidLeagueUsersSample: invalidLeagueUsers.slice(0, 15),
    missingInLeaderboardSample,
    duplicatedMembersSample: duplicatedMembers.slice(0, 15),
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
