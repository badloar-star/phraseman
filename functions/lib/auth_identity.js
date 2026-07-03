"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authStampAnonOwnership = exports.ANON_MERGE_CLAIM_TTL_MS = exports.authEnsureStableLink = void 0;
exports.describeAppCheckHeader = describeAppCheckHeader;
exports.ensureAuthLinkDoc = ensureAuthLinkDoc;
exports.linkStableAuthUid = linkStableAuthUid;
exports.cleanupLegacyAuthIdentityDuplicates = cleanupLegacyAuthIdentityDuplicates;
exports.resolveStableUidForAuth = resolveStableUidForAuth;
exports.ensureStableLinkForAuth = ensureStableLinkForAuth;
exports.readAnonMergeClaim = readAnonMergeClaim;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const email_contacts_1 = require("./email_contacts");
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
const LEAGUE_GROUPS = 'league_groups';
const CLEANUP_CANDIDATES = 'identity_cleanup_candidates';
const IDENTITY_CLEANUP_THROTTLE_MS = 6 * 60 * 60 * 1000;
function shouldRepairIdentityLinks(options) {
    return options?.repairLinks !== false;
}
function readHeaderValue(value) {
    if (Array.isArray(value))
        return String(value[0] ?? '');
    return typeof value === 'string' ? value : '';
}
function describeAppCheckHeader(value) {
    const token = readHeaderValue(value).trim();
    const dotCount = token ? token.split('.').length - 1 : 0;
    let kind = 'missing';
    if (token) {
        const lower = token.toLowerCase();
        if (lower === 'null' || lower === 'undefined')
            kind = lower;
        else if (lower.startsWith('bearer '))
            kind = 'bearer_prefixed';
        else if (dotCount === 2 && token.length > 80)
            kind = 'jwt_like';
        else if (token.length < 80)
            kind = 'short_non_jwt';
        else
            kind = 'long_non_jwt';
    }
    return {
        kind,
        present: token.length > 0,
        length: token.length,
        dotCount,
    };
}
function normalizeStableId(value) {
    return String(value ?? '').trim();
}
function cleanNullableString(value, maxLength) {
    if (value === undefined)
        return undefined;
    if (value === null)
        return null;
    const clean = String(value).trim();
    return clean ? clean.slice(0, maxLength) : null;
}
function normalizeAuthLinkMetadata(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const raw = value;
    const out = {};
    const email = cleanNullableString(raw.email, 320);
    const displayName = cleanNullableString(raw.displayName, 160);
    if (email !== undefined)
        out.email = email;
    if (displayName !== undefined)
        out.displayName = displayName;
    const lastSignInAt = typeof raw.lastSignInAt === 'number' && Number.isFinite(raw.lastSignInAt)
        ? raw.lastSignInAt
        : 0;
    if (lastSignInAt > 0)
        out.lastSignInAt = lastSignInAt;
    if (raw.devicePlatform === 'ios' || raw.devicePlatform === 'android' || raw.devicePlatform === 'web') {
        out.devicePlatform = raw.devicePlatform;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
function readProgressXp(data) {
    const raw = data?.progress?.user_total_xp;
    const n = parseInt(String(raw ?? '0'), 10);
    return Number.isFinite(n) ? n : 0;
}
async function findStableUidForProviderAuth(db, authUid) {
    const snap = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(20).get().catch(() => null);
    const docs = snap?.docs ?? [];
    if (docs.length === 0)
        return null;
    const ranked = docs
        .map((doc) => {
        const data = doc.data() ?? {};
        const canonicalStableId = normalizeStableId(data.canonicalStableId);
        const hidden = data.identityHidden === true;
        const linkedAuth = data.linkedAuth;
        return {
            id: hidden && canonicalStableId ? canonicalStableId : doc.id,
            hidden,
            hasProviderLink: normalizeStableId(linkedAuth?.providerUid) === authUid,
            xp: readProgressXp(data),
        };
    })
        .filter((candidate) => candidate.id);
    ranked.sort((a, b) => {
        if (a.hidden !== b.hidden)
            return a.hidden ? 1 : -1;
        if (a.hasProviderLink !== b.hasProviderLink)
            return a.hasProviderLink ? -1 : 1;
        return b.xp - a.xp;
    });
    return ranked[0]?.id ?? null;
}
async function assertStableOwner(db, authUid, stableId, options) {
    if (!stableId || stableId.length > 160) {
        throw new https_1.HttpsError('invalid-argument', 'stable_id_required');
    }
    if (stableId === authUid)
        return;
    const [userSnap, linkSnap] = await Promise.all([
        db.collection(USERS).doc(stableId).get().catch(() => null),
        db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
    ]);
    const userData = userSnap?.data() ?? {};
    const userAuthUid = String(userData.firebaseAuthUid ?? '').trim();
    if (!userAuthUid || userAuthUid === authUid)
        return;
    const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
    if (linkedStableId === stableId)
        return;
    const linkedAuth = userData.linkedAuth;
    const hasProviderLink = linkedAuth != null &&
        typeof linkedAuth === 'object' &&
        typeof linkedAuth.providerUid === 'string' &&
        String(linkedAuth.providerUid ?? '').trim().length > 0;
    const linkedAuthUid = hasProviderLink
        ? String(linkedAuth.providerUid ?? '').trim()
        : '';
    if (linkedAuthUid === authUid)
        return;
    // Переустановка приложения пересоздаёт анонимный Firebase uid, но stable_id
    // остаётся в Keychain/AsyncStorage. Разрешаем перепривязать анонимный uid к тому
    // же stable_id, если: (а) аккаунт не имеет provider-привязки (чисто анонимный),
    // (б) новый uid ещё не занят другим stable_id, (в) явно запрошен allowAnonRelink.
    if ((options?.allowAnonRelink === true || options?.allowProviderRelink === true) && !linkedStableId && !linkedAuthUid) {
        const existingByAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get().catch(() => null);
        const existingStableId = String(existingByAuth?.docs?.[0]?.id ?? '').trim();
        if (!existingStableId || existingStableId === stableId)
            return;
    }
    // Диагностика: брошенный HttpsError НЕ попадает в functions:log сам по себе
    // (виден только на клиенте через Crashlytics). Логируем причину отказа, чтобы
    // массовые потери привязки (вход создаёт новый аккаунт) были видны на сервере.
    // PII не пишем — только короткие идентификаторы для корреляции.
    console.warn(JSON.stringify({
        event: 'assert_stable_owner_mismatch',
        authUid,
        stableId,
        userAuthUid: userAuthUid || null,
        linkedStableId: linkedStableId || null,
        linkedAuthUid: linkedAuthUid || null,
        allowProviderRelink: options?.allowProviderRelink === true,
        allowAnonRelink: options?.allowAnonRelink === true,
    }));
    throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
}
/**
 * Гарантирует auth_links/{authUid}.stable_id === stableId.
 *
 * Раньше auth_links писался ТОЛЬКО на провайдер-входе (Google/Apple), поэтому у
 * анонимного юзера документа не было — а callable, читающие auth_links
 * (referralEnsureMyCode → assertAuthStableLink, friend_codes, premium_status),
 * падали с LINK_ACCOUNT_REQUIRED. Из-за этого реф-код не выдавался анонимам.
 *
 * НАМЕРЕННО отдельно от linkStableAuthUid: та зовётся внутри account-merge для
 * КАЖДОГО кандидата ДО выбора победителя, и запись auth_links там отравила бы
 * проверку владения (assertStableOwner читает auth_links) второго кандидата.
 * Зовётся только из authEnsureStableLink callable, где authUid изолирован.
 * merge'ом — чтобы не затирать provider/email существующего провайдерского линка.
 */
async function ensureAuthLinkDoc(db, authUid, stableId, provider, metadata) {
    const linkRef = db.collection(AUTH_LINKS).doc(authUid);
    const linkSnap = await linkRef.get().catch(() => null);
    const currentLinkStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
    const current = linkSnap?.data() ?? {};
    const now = Date.now();
    const patch = { stable_id: stableId, updatedAt: now };
    if (provider) {
        patch.providerUid = authUid;
        patch.provider = provider;
        if (typeof current.linkedAt !== 'number' || current.linkedAt <= 0) {
            patch.linkedAt = now;
        }
        patch.lastSignInAt = metadata?.lastSignInAt ?? now;
        if (metadata?.devicePlatform)
            patch.devicePlatform = metadata.devicePlatform;
        if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'email')) {
            patch.email = metadata.email ?? null;
        }
        if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')) {
            patch.displayName = metadata.displayName ?? null;
        }
    }
    const providerNeedsBackfill = Boolean(provider) &&
        (String(current.providerUid ?? '').trim() !== authUid ||
            String(current.provider ?? '').trim() !== provider ||
            typeof current.linkedAt !== 'number' ||
            current.linkedAt <= 0);
    const metadataNeedsRefresh = Boolean(provider && metadata && Object.keys(metadata).length > 0);
    if (!linkSnap?.exists || currentLinkStableId !== stableId || providerNeedsBackfill || metadataNeedsRefresh) {
        await linkRef.set(patch, { merge: true });
    }
}
async function ensureProviderLinkedAuth(db, stableId, authUid, provider, metadata) {
    if (!provider)
        return;
    const now = Date.now();
    await db.collection(USERS).doc(stableId).set({
        firebaseAuthUid: authUid,
        linkedAuth: {
            provider,
            providerUid: authUid,
            email: metadata && Object.prototype.hasOwnProperty.call(metadata, 'email') ? metadata.email ?? null : null,
            displayName: metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')
                ? metadata.displayName ?? null
                : null,
            linkedAt: now,
            lastSignInAt: metadata?.lastSignInAt ?? now,
            devicePlatform: metadata?.devicePlatform ?? 'web',
        },
        updatedAt: now,
    }, { merge: true });
    await (0, email_contacts_1.upsertEmailContact)(db, {
        email: metadata?.email,
        source: 'app',
        provider,
        providerUid: authUid,
        stableId,
        displayName: metadata?.displayName,
        devicePlatform: metadata?.devicePlatform ?? 'web',
        lastSignInAt: metadata?.lastSignInAt ?? now,
    }).catch((error) => {
        console.warn(JSON.stringify({
            event: 'email_contact_app_upsert_failed',
            stableId,
            authUid,
            provider,
            message: String(error?.message ?? error).slice(0, 160),
        }));
    });
}
async function linkStableAuthUid(db, stableId, authUid) {
    const now = Date.now();
    const userRef = db.collection(USERS).doc(stableId);
    const userSnap = await userRef.get().catch(() => null);
    const currentUserAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
    let repairedIdentityLink = false;
    if (!userSnap?.exists || currentUserAuthUid !== authUid) {
        await userRef.set({
            firebaseAuthUid: authUid,
            updatedAt: now,
        }, { merge: true });
        repairedIdentityLink = true;
    }
    const lbRef = db.collection(LEADERBOARD).doc(stableId);
    const lbSnap = await lbRef.get().catch(() => null);
    if (lbSnap?.exists) {
        const currentLeaderboardAuthUid = String(lbSnap.data()?.firebaseAuthUid ?? '').trim();
        if (currentLeaderboardAuthUid !== authUid) {
            await lbRef.set({ firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
            repairedIdentityLink = true;
        }
    }
    if (repairedIdentityLink) {
        await cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid, {
            reason: 'stable_link',
            throttleMs: IDENTITY_CLEANUP_THROTTLE_MS,
        }).catch((e) => {
            console.warn(JSON.stringify({
                event: 'identity_legacy_cleanup_failed',
                stableId,
                authUid,
                message: String(e?.message ?? e).slice(0, 160),
            }));
        });
    }
}
function readNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function chooseMaxNumber(a, b) {
    const na = readNumber(a);
    const nb = readNumber(b);
    if (na === null && nb === null)
        return undefined;
    if (na === null)
        return nb ?? undefined;
    if (nb === null)
        return na;
    return Math.max(na, nb);
}
function legacyLeaderboardMerge(stableData, legacyData, authUid) {
    const out = {
        firebaseAuthUid: authUid,
        updatedAt: Date.now(),
        identityCanonicalizedAt: Date.now(),
    };
    ['points', 'streak', 'daily7xp', 'daily7time_ms', 'profileCardLevel'].forEach((field) => {
        const next = chooseMaxNumber(stableData[field], legacyData[field]);
        if (next !== undefined)
            out[field] = next;
    });
    const stableWeekKey = String(stableData.weekKey ?? '').trim();
    const legacyWeekKey = String(legacyData.weekKey ?? '').trim();
    if (!stableWeekKey && legacyWeekKey) {
        out.weekKey = legacyWeekKey;
        out.weekPoints = Math.max(0, readNumber(legacyData.weekPoints) ?? 0);
    }
    else if (stableWeekKey && legacyWeekKey && stableWeekKey === legacyWeekKey) {
        out.weekPoints = Math.max(Math.max(0, readNumber(stableData.weekPoints) ?? 0), Math.max(0, readNumber(legacyData.weekPoints) ?? 0));
    }
    [
        'name',
        'nameLower',
        'lang',
        'avatar',
        'frame',
        'aura',
        'leagueId',
        'isPremium',
        'isVip',
        'profileCardTheme',
        'profileCardMotion',
        'profileCardPublicFocus',
    ].forEach((field) => {
        const stableValue = stableData[field];
        const legacyValue = legacyData[field];
        const stableEmpty = stableValue === undefined || stableValue === null || String(stableValue).trim() === '';
        if (stableEmpty && legacyValue !== undefined && legacyValue !== null && String(legacyValue).trim() !== '') {
            out[field] = legacyValue;
        }
    });
    return out;
}
function mergeLegacyMemberIntoStable(stable, legacy, stableId) {
    const out = { ...(legacy || {}), ...(stable || {}), uid: stableId };
    const stablePoints = readNumber(stable?.points);
    const legacyPoints = readNumber(legacy?.points);
    if (stablePoints !== null || legacyPoints !== null)
        out['points'] = Math.max(stablePoints ?? 0, legacyPoints ?? 0);
    const stableTotalXp = readNumber(stable?.totalXp);
    const legacyTotalXp = readNumber(legacy?.totalXp);
    if (stableTotalXp !== null || legacyTotalXp !== null)
        out['totalXp'] = Math.max(stableTotalXp ?? 0, legacyTotalXp ?? 0);
    return out;
}
async function stableMemberExistsInWeek(db, weekId, stableId) {
    const snap = await db
        .collection(LEAGUE_GROUPS)
        .where('weekId', '==', weekId)
        .limit(500)
        .get()
        .catch(() => null);
    return !!snap?.docs.some((doc) => {
        const members = doc.data()?.members;
        return members && typeof members === 'object' && Object.prototype.hasOwnProperty.call(members, stableId);
    });
}
async function cleanupDuplicateLeagueMembers(db, stableId, duplicateUid) {
    let leagueGroupsTouched = 0;
    let leagueMembersHidden = 0;
    const memberUidPath = new admin.firestore.FieldPath('members', duplicateUid, 'uid');
    for (;;) {
        const snap = await db.collection(LEAGUE_GROUPS).where(memberUidPath, '==', duplicateUid).limit(50).get();
        if (snap.empty)
            break;
        let madeProgress = false;
        const batch = db.batch();
        for (const doc of snap.docs) {
            const data = doc.data() || {};
            const members = data.members && typeof data.members === 'object'
                ? { ...data.members }
                : {};
            const legacyMember = members[duplicateUid];
            if (!legacyMember)
                continue;
            if (legacyMember.identityHidden === true && legacyMember.canonicalStableId === stableId)
                continue;
            const weekId = String(data.weekId ?? '').trim();
            const stableInSameDoc = members[stableId];
            const stableInWeek = stableInSameDoc ? true : weekId ? await stableMemberExistsInWeek(db, weekId, stableId) : false;
            if (stableInSameDoc) {
                members[stableId] = mergeLegacyMemberIntoStable(stableInSameDoc, legacyMember, stableId);
            }
            else if (!stableInWeek) {
                members[stableId] = mergeLegacyMemberIntoStable(undefined, legacyMember, stableId);
            }
            members[duplicateUid] = {
                ...legacyMember,
                identityHidden: true,
                canonicalStableId: stableId,
                identityCanonicalizedAt: Date.now(),
            };
            const memberCount = Object.values(members).filter((m) => m?.identityHidden !== true).length;
            batch.set(doc.ref, {
                members,
                memberCount,
                updatedAt: Date.now(),
                identityCanonicalizedAt: Date.now(),
            }, { merge: true });
            leagueGroupsTouched += 1;
            leagueMembersHidden += 1;
            madeProgress = true;
        }
        if (!madeProgress)
            break;
        await batch.commit();
    }
    return { leagueGroupsTouched, leagueMembersHidden };
}
async function cleanupLegacyLeagueMembers(db, stableId, authUid) {
    return cleanupDuplicateLeagueMembers(db, stableId, authUid);
}
async function hideNameIndexForDuplicateUid(db, duplicateUid, stableId) {
    const snap = await db.collection('name_index').where('uid', '==', duplicateUid).limit(50).get().catch(() => null);
    if (!snap || snap.empty)
        return 0;
    const batch = db.batch();
    const now = Date.now();
    let hidden = 0;
    snap.docs.forEach((doc) => {
        batch.set(doc.ref, {
            identityHidden: true,
            canonicalStableId: stableId,
            identityCanonicalizedAt: now,
            updatedAt: now,
        }, { merge: true });
        hidden += 1;
    });
    await batch.commit();
    return hidden;
}
async function cleanupSiblingStableIdentityDuplicates(db, stableId, authUid) {
    const out = {
        leaderboardMerged: 0,
        leaderboardHidden: 0,
        usersHidden: 0,
        nameIndexHidden: 0,
        leagueGroupsTouched: 0,
        leagueMembersHidden: 0,
    };
    const siblingsSnap = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(50).get().catch(() => null);
    if (!siblingsSnap || siblingsSnap.empty)
        return out;
    for (const sibling of siblingsSnap.docs) {
        const duplicateUid = sibling.id;
        if (!duplicateUid || duplicateUid === stableId)
            continue;
        const siblingData = sibling.data() || {};
        if (siblingData.identityHidden === true && siblingData.canonicalStableId === stableId)
            continue;
        const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
        const duplicateLbRef = db.collection(LEADERBOARD).doc(duplicateUid);
        await db.runTransaction(async (tx) => {
            const [stableLbSnap, duplicateLbSnap] = await Promise.all([
                tx.get(stableLbRef),
                tx.get(duplicateLbRef),
            ]);
            if (duplicateLbSnap.exists) {
                const merge = legacyLeaderboardMerge(stableLbSnap.data() || {}, duplicateLbSnap.data() || {}, authUid);
                tx.set(stableLbRef, merge, { merge: true });
                tx.set(duplicateLbRef, {
                    identityHidden: true,
                    canonicalStableId: stableId,
                    duplicateOfStableId: stableId,
                    identityCanonicalizedAt: Date.now(),
                    updatedAt: Date.now(),
                }, { merge: true });
                out.leaderboardMerged += 1;
                out.leaderboardHidden += 1;
            }
            tx.set(sibling.ref, {
                identityHidden: true,
                canonicalStableId: stableId,
                identityCanonicalizedAt: Date.now(),
                updatedAt: Date.now(),
            }, { merge: true });
            out.usersHidden += 1;
        });
        out.nameIndexHidden += await hideNameIndexForDuplicateUid(db, duplicateUid, stableId).catch(() => 0);
        const leagueStats = await cleanupDuplicateLeagueMembers(db, stableId, duplicateUid);
        out.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
        out.leagueMembersHidden += leagueStats.leagueMembersHidden;
    }
    return out;
}
async function recordIdentityCleanupCandidate(db, stableId, authUid, reason, context) {
    const candidateId = `${stableId.slice(0, 80)}__${authUid.slice(0, 80)}`.replace(/[^A-Za-z0-9_-]/g, '_');
    await db.collection(CLEANUP_CANDIDATES).doc(candidateId).set({
        stableId,
        authUid,
        reason,
        context,
        updatedAt: Date.now(),
    }, { merge: true });
}
async function cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid, opts) {
    const stats = {
        leaderboardMerged: 0,
        leaderboardHidden: 0,
        usersHidden: 0,
        nameIndexHidden: 0,
        candidatesRecorded: 0,
        leagueGroupsTouched: 0,
        leagueMembersHidden: 0,
        skipped: false,
    };
    if (!stableId || !authUid || stableId === authUid)
        return { ...stats, skipped: true };
    const now = Date.now();
    const userRef = db.collection(USERS).doc(stableId);
    const userSnap = await userRef.get().catch(() => null);
    const userData = userSnap?.data() || {};
    if (String(userData.firebaseAuthUid ?? '').trim() !== authUid)
        return { ...stats, skipped: true };
    const lastCleanupAt = readNumber(userData.identityCleanupAt) ?? 0;
    if (opts?.throttleMs && lastCleanupAt > 0 && now - lastCleanupAt < opts.throttleMs) {
        return { ...stats, skipped: true };
    }
    const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
    const legacyLbRef = db.collection(LEADERBOARD).doc(authUid);
    const [stableLbSnap, legacyLbSnap, authLinkSnap] = await Promise.all([
        stableLbRef.get().catch(() => null),
        legacyLbRef.get().catch(() => null),
        db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
    ]);
    const stableLeaderboardAuthUid = String(stableLbSnap?.data()?.firebaseAuthUid ?? '').trim();
    const linkedStableId = String(authLinkSnap?.data()?.stable_id ?? '').trim();
    const hasStrongIdentityProof = stableLeaderboardAuthUid === authUid ||
        linkedStableId === stableId;
    if (!hasStrongIdentityProof) {
        if (legacyLbSnap?.exists) {
            await recordIdentityCleanupCandidate(db, stableId, authUid, 'missing_strong_identity_proof', {
                userFirebaseAuthUid: authUid,
                stableLeaderboardAuthUid,
                linkedStableId,
                legacyLeaderboardExists: true,
                reason: opts?.reason ?? 'unknown',
            }).catch(() => { });
            stats.candidatesRecorded += 1;
        }
        return { ...stats, skipped: true };
    }
    if (legacyLbSnap?.exists) {
        const merge = legacyLeaderboardMerge(stableLbSnap?.data() || {}, legacyLbSnap.data() || {}, authUid);
        await db.runTransaction(async (tx) => {
            tx.set(stableLbRef, merge, { merge: true });
            tx.set(legacyLbRef, {
                identityHidden: true,
                canonicalStableId: stableId,
                identityCanonicalizedAt: Date.now(),
                updatedAt: Date.now(),
            }, { merge: true });
        });
        stats.leaderboardMerged += 1;
        stats.leaderboardHidden += 1;
    }
    const leagueStats = await cleanupLegacyLeagueMembers(db, stableId, authUid);
    stats.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
    stats.leagueMembersHidden += leagueStats.leagueMembersHidden;
    if (linkedStableId === stableId) {
        const siblingStats = await cleanupSiblingStableIdentityDuplicates(db, stableId, authUid);
        stats.leaderboardMerged += siblingStats.leaderboardMerged;
        stats.leaderboardHidden += siblingStats.leaderboardHidden;
        stats.usersHidden += siblingStats.usersHidden;
        stats.nameIndexHidden += siblingStats.nameIndexHidden;
        stats.leagueGroupsTouched += siblingStats.leagueGroupsTouched;
        stats.leagueMembersHidden += siblingStats.leagueMembersHidden;
    }
    if (stats.leaderboardHidden > 0 ||
        stats.usersHidden > 0 ||
        stats.nameIndexHidden > 0 ||
        stats.leagueGroupsTouched > 0 ||
        stats.candidatesRecorded > 0) {
        await userRef.set({
            identityCleanupAt: now,
            identityCleanupReason: opts?.reason ?? 'unknown',
            updatedAt: now,
        }, { merge: true });
    }
    return stats;
}
async function resolveStableUidForAuth(db, authUid, requestedStableId, options) {
    const stableId = normalizeStableId(requestedStableId);
    if (stableId) {
        const requestedUserSnap = await db.collection(USERS).doc(stableId).get().catch(() => null);
        const requestedUserData = requestedUserSnap?.data() || {};
        const canonicalStableId = normalizeStableId(requestedUserData.canonicalStableId);
        if (requestedUserData.identityHidden === true && canonicalStableId && canonicalStableId !== stableId) {
            await assertStableOwner(db, authUid, canonicalStableId, options);
            if (shouldRepairIdentityLinks(options)) {
                await linkStableAuthUid(db, canonicalStableId, authUid);
            }
            return canonicalStableId;
        }
        await assertStableOwner(db, authUid, stableId, options);
        if (shouldRepairIdentityLinks(options)) {
            await linkStableAuthUid(db, stableId, authUid);
        }
        return stableId;
    }
    const direct = await db.collection(USERS).doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    if (options?.requireKnownIdentity) {
        throw new https_1.HttpsError('failed-precondition', 'stable_id_required');
    }
    return authUid;
}
async function ensureStableLinkForAuth(db, authUid, requestedStableId, signInProvider, metadata) {
    const stableId = normalizeStableId(requestedStableId);
    const provider = signInProvider === 'google.com'
        ? 'google'
        : signInProvider === 'apple.com'
            ? 'apple'
            : null;
    const allowProviderRelink = Boolean(provider);
    const allowAnonRelink = !allowProviderRelink;
    if (provider) {
        const existingLinkSnap = await db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null);
        const linkedStableId = normalizeStableId(existingLinkSnap?.data()?.stable_id);
        // Хвост E: auth_links может указывать на УДАЛЁННЫЙ users-док (осиротевшая
        // привязка после deleteAccountAndWipe — серверная чистка fire-and-forget могла
        // снести users/{stableId}, но не auth_links). Повторный вход тем же Google/Apple
        // цеплялся за мёртвый id → resolveStableUidForAuth привязывал к пустому доку →
        // пользователь на пустом «новом» аккаунте. Если целевой users-док НЕ существует,
        // игнорируем осиротевшую привязку и идём обычным путём (на текущий stableId или
        // на живой аккаунт по providerUid). providerUid криптографически принадлежит
        // юзеру, мёртвый док всё равно пуст — захвата чужого нет.
        const linkedUserExists = linkedStableId
            ? Boolean((await db.collection(USERS).doc(linkedStableId).get().catch(() => null))?.exists)
            : false;
        if (linkedStableId && linkedStableId !== stableId && !linkedUserExists) {
            console.warn(JSON.stringify({
                event: 'auth_link_orphan_ignored',
                authUid,
                deadStableId: linkedStableId,
                requestedStableId: stableId || null,
                provider,
            }));
            // не используем мёртвый linkedStableId — провалимся к обычному resolve ниже.
        }
        else if (linkedStableId && linkedStableId !== stableId) {
            const linkedStableUid = await resolveStableUidForAuth(db, authUid, linkedStableId, { allowProviderRelink: true });
            await ensureAuthLinkDoc(db, authUid, linkedStableUid, provider, metadata);
            await ensureProviderLinkedAuth(db, linkedStableUid, authUid, provider, metadata);
            return { ok: true, stableUid: linkedStableUid, authUid };
        }
        if (!linkedStableId) {
            const existingUserStableUid = await findStableUidForProviderAuth(db, authUid);
            if (existingUserStableUid && existingUserStableUid !== stableId) {
                const stableUid = await resolveStableUidForAuth(db, authUid, existingUserStableUid, { allowProviderRelink: true });
                await ensureAuthLinkDoc(db, authUid, stableUid, provider, metadata);
                await ensureProviderLinkedAuth(db, stableUid, authUid, provider, metadata);
                return { ok: true, stableUid, authUid };
            }
        }
    }
    const stableUid = await resolveStableUidForAuth(db, authUid, stableId, { allowProviderRelink, allowAnonRelink });
    await ensureAuthLinkDoc(db, authUid, stableUid, provider, metadata);
    await ensureProviderLinkedAuth(db, stableUid, authUid, provider, metadata);
    return { ok: true, stableUid, authUid };
}
exports.authEnsureStableLink = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    if (!request.app) {
        console.warn(JSON.stringify({
            event: 'app_check_header_shape',
            function: 'authEnsureStableLink',
            header: describeAppCheckHeader(request.rawRequest.headers['x-firebase-appcheck']),
        }));
    }
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
    const metadata = normalizeAuthLinkMetadata(request.data?.linkMetadata);
    return ensureStableLinkForAuth(db, authUid, request.data?.stableId, signInProvider, metadata);
});
// ── Anonymous-ownership claim (closes #11 safely) ────────────────────────────
// Перед входом через Google/Apple клиент (ещё анонимный) ставит на свой
// users/{localStableId} короткоживущую метку anon_merge_claim. После входа
// authMergeStableAccounts (под новым provider uid) поглощает локальный анонимный
// аккаунт ТОЛЬКО при наличии этой свежей метки — что доказывает «то же устройство,
// что держало анонимный аккаунт, прямо сейчас делает merge». Атакующий с утёкшим
// чужим stable_id метку поставить НЕ может (нет анонимного токена жертвы), поэтому
// чужой аккаунт поглотить нельзя. Метка пишется только владельцем дока.
exports.ANON_MERGE_CLAIM_TTL_MS = 10 * 60 * 1000;
function readAnonMergeClaim(userData, now, ttlMs = exports.ANON_MERGE_CLAIM_TTL_MS) {
    const claim = (userData ?? {}).anon_merge_claim;
    if (!claim || typeof claim !== 'object')
        return null;
    const authUid = String(claim.authUid ?? '').trim();
    const at = Number(claim.at);
    if (!authUid || !Number.isFinite(at) || at <= 0)
        return null;
    if (now - at > ttlMs)
        return null; // stale → not a valid proof
    return { authUid };
}
exports.authStampAnonOwnership = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    if (!request.app) {
        // App Check warm-up (H9): see whether clients attach a valid attestation token
        // BEFORE enforcing. Не энфорсим здесь — только наблюдаем форму заголовка.
        console.warn(JSON.stringify({
            event: 'app_check_header_shape',
            function: 'authStampAnonOwnership',
            header: describeAppCheckHeader(request.rawRequest.headers['x-firebase-appcheck']),
        }));
    }
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableId = normalizeStableId(request.data?.stableId);
    if (!stableId || stableId.length > 160) {
        throw new https_1.HttpsError('invalid-argument', 'stable_id_required');
    }
    // Метку можно ставить ТОЛЬКО на собственный анонимный аккаунт: либо
    // stableId == authUid (legacy), либо users/{stableId}.firebaseAuthUid == authUid.
    // Иначе кто угодно мог бы «застолбить» чужой stableId под слияние.
    const userRef = db.collection(USERS).doc(stableId);
    const userSnap = await userRef.get().catch(() => null);
    const ownerAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
    if (stableId !== authUid && ownerAuthUid && ownerAuthUid !== authUid) {
        // Диагностика отказа (см. комментарий в assertStableOwner): без лога этот
        // permission-denied виден только на клиенте, не в functions:log.
        console.warn(JSON.stringify({
            event: 'stamp_anon_ownership_not_owner',
            authUid,
            stableId,
            ownerAuthUid: ownerAuthUid || null,
        }));
        throw new https_1.HttpsError('permission-denied', 'not_owner');
    }
    const now = Date.now();
    await userRef.set({ anon_merge_claim: { authUid, at: now }, updatedAt: now }, { merge: true });
    return { ok: true };
});
//# sourceMappingURL=auth_identity.js.map