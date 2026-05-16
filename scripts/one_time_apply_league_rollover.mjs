import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3';
const DB = '(default)';
const GROUP_SIZE = 30;
const MAX_LEAGUE_ID = 11;

const dryRun = !process.argv.includes('--apply');
const currentWeekArg = argValue('--currentWeek');
const previousWeekArg = argValue('--previousWeek');

function argValue(name) {
  const raw = process.argv.find((a) => a.startsWith(`${name}=`));
  return raw ? raw.slice(name.length + 1) : '';
}

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function previousIsoWeek(weekId) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) throw new Error(`Bad week id: ${weekId}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const mondayW1 = new Date(jan4);
  mondayW1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
  const monday = new Date(mondayW1);
  monday.setUTCDate(mondayW1.getUTCDate() + (week - 2) * 7);
  return getWeekKey(monday);
}

function fsValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fsValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: toFsFields(value) } };
  }
  return { stringValue: String(value) };
}

function toFsFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) fields[key] = fsValue(value);
  }
  return fields;
}

function fromFsValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return undefined;
}

function fromFsFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fromFsValue(value);
  return out;
}

function docId(docName) {
  return docName.split('/').pop();
}

function docName(collection, id) {
  return `projects/${PROJECT_ID}/databases/${DB}/documents/${collection}/${id}`;
}

function userDocName(uid) {
  return docName('users', uid);
}

function lbDocName(uid) {
  return docName('leaderboard', uid);
}

function groupDocName(id) {
  return docName('league_groups', id);
}

async function getAccessToken() {
  const authPath = join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'auth.js');
  const auth = await import(pathToFileURL(authPath).href);
  const configPath = join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) throw new Error('Firebase CLI refresh token not found');
  const token = await auth.getAccessToken(refreshToken, []);
  return token.access_token || token;
}

async function api(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${method} ${path} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function listCollection(collection) {
  const out = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '300' });
    if (pageToken) qs.set('pageToken', pageToken);
    const json = await api(`projects/${PROJECT_ID}/databases/${DB}/documents/${collection}?${qs}`);
    for (const d of json.documents || []) out.push({ id: docId(d.name), name: d.name, data: fromFsFields(d.fields) });
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return out;
}

function memberForGroup(uid, source, points) {
  return {
    uid,
    name: source.name || 'Player',
    points: Number(points || 0),
    avatar: source.avatar ?? null,
    frame: source.frame ?? null,
    isPremium: source.isPremium ?? false,
    streak: source.streak ?? 0,
    totalXp: source.totalXp ?? source.points ?? 0,
  };
}

function resultFor(uid, previousLeagueId, groupMembers) {
  const group = groupMembers
    .map((m) => ({ ...m, isMe: m.uid === uid }))
    .sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
  const total = group.length;
  const myRank = group.findIndex((m) => m.uid === uid) + 1;
  const valid = total >= 2 && myRank > 0;
  const topCutoff = valid ? Math.max(1, Math.ceil(total * 0.15)) : 0;
  const bottomCutoff = valid ? total - Math.ceil(total * 0.15) + 1 : total + 1;
  const promoted = valid && myRank <= topCutoff && previousLeagueId < MAX_LEAGUE_ID;
  const demoted = valid && myRank >= bottomCutoff && previousLeagueId > 0 && !promoted;
  const newLeagueId = promoted ? previousLeagueId + 1 : demoted ? previousLeagueId - 1 : previousLeagueId;
  return {
    prevLeagueId: previousLeagueId,
    newLeagueId,
    myRank,
    totalInGroup: total,
    promoted,
    demoted,
    group,
  };
}

async function commitWrites(writes) {
  if (dryRun || writes.length === 0) return;
  for (let i = 0; i < writes.length; i += 400) {
    await api(`projects/${PROJECT_ID}/databases/${DB}/documents:commit`, {
      method: 'POST',
      body: { writes: writes.slice(i, i + 400) },
    });
  }
}

function updateWrite(name, fields, maskPaths) {
  return {
    update: { name, fields: toFsFields(fields) },
    updateMask: { fieldPaths: maskPaths },
  };
}

async function main() {
  const currentWeek = currentWeekArg || getWeekKey();
  const previousWeek = previousWeekArg || previousIsoWeek(currentWeek);
  const repairedAt = Date.now();

  console.log(`One-time league rollover ${previousWeek} -> ${currentWeek}${dryRun ? ' (dry run)' : ' (APPLY)'}`);

  const [allGroups, leaderboard] = await Promise.all([
    listCollection('league_groups'),
    listCollection('leaderboard'),
  ]);

  const previousGroups = allGroups.filter((g) => g.data.weekId === previousWeek);
  const currentGroups = allGroups.filter((g) => g.data.weekId === currentWeek);
  const lbByUid = new Map(leaderboard.map((d) => [d.id, d.data]));

  const results = new Map();
  const byNewLeague = new Map();
  const skippedNoUid = [];

  for (const g of previousGroups) {
    const previousLeagueId = Number(g.data.leagueId ?? 0);
    const membersMap = g.data.members || {};
    const members = Object.entries(membersMap)
      .map(([uid, m]) => memberForGroup(uid, m || {}, Number((m || {}).points || 0)))
      .sort((a, b) => Number(b.points || 0) - Number(a.points || 0));

    for (const m of members) {
      if (!m.uid) {
        skippedNoUid.push({ groupId: g.id, name: m.name });
        continue;
      }
      const result = resultFor(m.uid, previousLeagueId, members);
      results.set(m.uid, { result, member: m });
      if (!byNewLeague.has(result.newLeagueId)) byNewLeague.set(result.newLeagueId, []);
      byNewLeague.get(result.newLeagueId).push({
        uid: m.uid,
        data: {
          ...m,
          points: Number(lbByUid.get(m.uid)?.weekPoints ?? 0),
          totalXp: Number(lbByUid.get(m.uid)?.points ?? m.totalXp ?? 0),
        },
      });
    }
  }

  const summary = {
    previousGroups: previousGroups.length,
    currentGroups: currentGroups.length,
    affectedUsers: results.size,
    promoted: [...results.values()].filter((x) => x.result.promoted).length,
    demoted: [...results.values()].filter((x) => x.result.demoted).length,
    stayed: [...results.values()].filter((x) => !x.result.promoted && !x.result.demoted).length,
    skippedNoUid: skippedNoUid.length,
    byNewLeague: Object.fromEntries([...byNewLeague.entries()].map(([k, v]) => [k, v.length])),
  };
  console.log(JSON.stringify(summary, null, 2));

  const writes = [];

  for (const [uid, { result }] of results.entries()) {
    const leagueState = {
      leagueId: result.newLeagueId,
      weekId: currentWeek,
      group: result.group.map((m) => ({ ...m, isMe: m.uid === uid })),
    };
    writes.push(updateWrite(userDocName(uid), {
      progress: {
        league_result_pending: JSON.stringify(result),
        league_state_v3: JSON.stringify(leagueState),
      },
      leagueRepair: {
        previousWeek,
        currentWeek,
        repairedAt,
        prevLeagueId: result.prevLeagueId,
        newLeagueId: result.newLeagueId,
        myRank: result.myRank,
        totalInGroup: result.totalInGroup,
      },
      updatedAt: repairedAt,
    }, [
      'progress.league_result_pending',
      'progress.league_state_v3',
      'leagueRepair',
      'updatedAt',
    ]));
  }

  for (const g of currentGroups) {
    writes.push({ delete: g.name });
  }

  const uidToGroupId = new Map();
  for (const [leagueId, members] of byNewLeague.entries()) {
    members.sort((a, b) => Number(b.data.totalXp || 0) - Number(a.data.totalXp || 0));
    for (let i = 0; i < members.length; i += GROUP_SIZE) {
      const chunk = members.slice(i, i + GROUP_SIZE);
      const gid = `${currentWeek}_${leagueId}_manual_rollover_${Math.floor(i / GROUP_SIZE)}`;
      const groupMembers = {};
      for (const { uid, data } of chunk) {
        groupMembers[uid] = memberForGroup(uid, data, data.points || 0);
        uidToGroupId.set(uid, gid);
      }
      writes.push(updateWrite(groupDocName(gid), {
        weekId: currentWeek,
        leagueId: Number(leagueId),
        memberCount: chunk.length,
        createdAt: repairedAt,
        manualRolloverFromWeek: previousWeek,
        members: groupMembers,
      }, ['weekId', 'leagueId', 'memberCount', 'createdAt', 'manualRolloverFromWeek', 'members']));
    }
  }

  for (const [uid, { result }] of results.entries()) {
    const lb = lbByUid.get(uid) || {};
    writes.push(updateWrite(lbDocName(uid), {
      leagueId: result.newLeagueId,
      groupId: uidToGroupId.get(uid) || null,
      groupWeekId: currentWeek,
      weekKey: currentWeek,
      weekPoints: Number(lb.weekKey === currentWeek ? lb.weekPoints || 0 : 0),
      updatedAt: repairedAt,
    }, ['leagueId', 'groupId', 'groupWeekId', 'weekKey', 'weekPoints', 'updatedAt']));
  }

  console.log(`writes=${writes.length}`);
  await commitWrites(writes);
  console.log(dryRun ? 'Dry run only. Re-run with --apply to write.' : 'Applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
