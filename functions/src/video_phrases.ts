import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';
import { reserveContentFactoryBudget } from './content_factory/content_factory_budget';
import { normalizeVideoPhraseList, type VideoPhrase } from '../../shared/video_phrases_contract';
import {
  parseYoutubeCatalogManifest,
  parseYoutubeChannelSnapshot,
  parseYoutubeVideoSnapshot,
  type YoutubeVideoSnapshot,
} from '../../shared/youtube_catalog_contract';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const ROOT = 'video_phrase_sets';

function adminRole(token: Record<string, unknown>): AdminRole {
  return hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
}

function requireAdmin(request: CallableRequest<unknown>, permission: AdminPermission): { uid: string; role: AdminRole } {
  if (!request.auth?.uid || !request.auth.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = adminRole(request.auth.token as Record<string, unknown>);
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access video phrases');
  return { uid: request.auth.uid, role };
}

function videoId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!/^[0-9A-Za-z_-]{11}$/.test(id)) throw new HttpsError('invalid-argument', 'video_id_invalid');
  return id;
}

function versionId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!/^[0-9A-Za-z._-]{1,80}$/.test(id)) throw new HttpsError('invalid-argument', 'version_id_invalid');
  return id;
}

function asPhrases(id: string, value: unknown): readonly VideoPhrase[] {
  try { return normalizeVideoPhraseList(id, value); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'phrases_invalid'); }
}

function workspaceSnapshot(db: FirebaseFirestore.Firestore, id: string) {
  return db.collection(ROOT).doc(id);
}

type VideoPhraseSetStatus = 'none' | 'draft' | 'published' | 'published_with_draft';

export function publishedRootPatch(args: Readonly<{
  videoId: string;
  versionId: string;
  phraseCount: number;
  actorUid: string;
  nowMs: number;
}>): Record<string, unknown> {
  return {
    videoId: args.videoId,
    activeVersion: args.versionId,
    activePhraseCount: args.phraseCount,
    draftVersion: null,
    draftPhraseCount: 0,
    publishedAtMs: args.nowMs,
    publishedBy: args.actorUid,
    updatedAtMs: args.nowMs,
    updatedBy: args.actorUid,
  };
}

function phraseSetStatus(meta: FirebaseFirestore.DocumentData | undefined): {
  status: VideoPhraseSetStatus;
  activeVersion: string | null;
  draftVersion: string | null;
  activePhraseCount: number;
  draftPhraseCount: number;
  updatedAtMs: number | null;
} {
  const activeVersion = String(meta?.activeVersion ?? '').trim() || null;
  const draftVersion = String(meta?.draftVersion ?? '').trim() || null;
  const activePhraseCount = Number.isFinite(Number(meta?.activePhraseCount)) ? Number(meta?.activePhraseCount) : 0;
  const draftPhraseCount = Number.isFinite(Number(meta?.draftPhraseCount)) ? Number(meta?.draftPhraseCount) : 0;
  const status: VideoPhraseSetStatus = activeVersion
    ? (draftVersion && draftVersion !== activeVersion ? 'published_with_draft' : 'published')
    : (draftVersion ? 'draft' : 'none');
  const updatedAtMs = Number.isFinite(Number(meta?.updatedAtMs)) ? Number(meta?.updatedAtMs) : null;
  return { status, activeVersion, draftVersion, activePhraseCount, draftPhraseCount, updatedAtMs };
}

async function readPhraseSetMeta(
  db: FirebaseFirestore.Firestore,
  ids: readonly string[],
): Promise<Map<string, ReturnType<typeof phraseSetStatus>>> {
  const result = new Map<string, ReturnType<typeof phraseSetStatus>>();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const snapshots = await Promise.all(chunk.map((id) => workspaceSnapshot(db, id).get()));
    snapshots.forEach((snapshot, offset) => {
      result.set(chunk[offset], phraseSetStatus(snapshot.exists ? snapshot.data() : undefined));
    });
  }
  return result;
}

function publicVideo(video: YoutubeVideoSnapshot, phraseSet: ReturnType<typeof phraseSetStatus>) {
  return { ...video, phraseSet };
}

/**
 * Read model for the daily content-operations screen. YouTube remains the
 * source of truth for channel/video freshness; phrase-set metadata is joined
 * server-side so the admin does not need one Firestore read per row.
 */
export const adminGetVideoStudioWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireAdmin(request, 'content.read');
  const db = admin.firestore();
  const [manifestSnapshot, syncSnapshot] = await Promise.all([
    db.doc('youtube_catalog/public').get(),
    db.doc('youtube_catalog/sync_state').get(),
  ]);
  if (!manifestSnapshot.exists) {
    return {
      ok: true,
      generatedAt: null,
      sourceRefreshedAt: null,
      syncState: syncSnapshot.exists ? syncSnapshot.data() : null,
      channels: [],
      counts: { channels: 0, videos: 0, live: 0, upcoming: 0, regular: 0, phraseSets: 0, drafts: 0 },
    };
  }

  let manifest;
  try {
    manifest = parseYoutubeCatalogManifest(manifestSnapshot.data());
  } catch (error) {
    throw new HttpsError('data-loss', error instanceof Error ? error.message : 'youtube_catalog_manifest_invalid');
  }
  const snapshotRoot = db.doc(`youtube_catalog_snapshots/${manifest.activeVersion}`);
  const snapshot = await snapshotRoot.get();
  if (!snapshot.exists || snapshot.data()?.status !== 'ready') {
    throw new HttpsError('unavailable', 'youtube_catalog_snapshot_not_ready');
  }

  const channels = (await Promise.all(manifest.channels
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map(async (manifestChannel) => {
      const channelRef = snapshotRoot.collection('channels').doc(manifestChannel.id);
      const [channelSnapshot, videosSnapshot] = await Promise.all([
        channelRef.get(),
        channelRef.collection('videos').get(),
      ]);
      if (!channelSnapshot.exists) return null;
      try {
        const channel = parseYoutubeChannelSnapshot(channelSnapshot.data());
        const videos = videosSnapshot.docs
          .map((doc) => {
            try { return parseYoutubeVideoSnapshot({ ...(doc.data() ?? {}), id: doc.id }); }
            catch { return null; }
          })
          .filter((video): video is YoutubeVideoSnapshot => Boolean(video))
          .filter((video) => video.channelId === channel.id)
          .sort((left, right) => {
            const leftTime = Date.parse(left.publishedAt ?? left.scheduledStartTime ?? '') || 0;
            const rightTime = Date.parse(right.publishedAt ?? right.scheduledStartTime ?? '') || 0;
            return rightTime - leftTime;
          });
        return { channel, videos };
      } catch {
        return null;
      }
    })))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const allVideos = channels.flatMap((entry) => entry.videos);
  const phraseSets = await readPhraseSetMeta(db, allVideos.map((video) => video.id));
  const channelPayload = channels.map((entry) => ({
    channel: entry.channel,
    videos: entry.videos.map((video) => publicVideo(video, phraseSets.get(video.id) ?? phraseSetStatus(undefined))),
  }));
  const allPhraseSets = allVideos.map((video) => phraseSets.get(video.id) ?? phraseSetStatus(undefined));
  return {
    ok: true,
    generatedAt: manifest.generatedAt,
    sourceRefreshedAt: manifest.sourceRefreshedAt,
    activeVersion: manifest.activeVersion,
    syncState: syncSnapshot.exists ? syncSnapshot.data() : null,
    channels: channelPayload,
    counts: {
      channels: channelPayload.length,
      videos: allVideos.length,
      live: allVideos.filter((video) => video.state === 'live').length,
      upcoming: allVideos.filter((video) => video.state === 'upcoming').length,
      regular: allVideos.filter((video) => video.state === 'video' || video.state === 'completed').length,
      phraseSets: allPhraseSets.filter((set) => set.status === 'published' || set.status === 'published_with_draft').length,
      drafts: allPhraseSets.filter((set) => set.status === 'draft' || set.status === 'published_with_draft').length,
    },
  };
});

export const adminGetVideoPhraseWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireAdmin(request, 'content.read');
  const id = videoId(request.data?.videoId);
  const root = workspaceSnapshot(admin.firestore(), id);
  const [meta, versions] = await Promise.all([root.get(), root.collection('versions').orderBy('createdAtMs', 'desc').limit(20).get()]);
  return { ok: true, videoId: id, meta: meta.exists ? meta.data() : null, versions: versions.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});

export const adminSaveVideoPhraseDraft = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireAdmin(request, 'content.draft.write');
  const id = videoId(request.data?.videoId);
  const phrases = asPhrases(id, request.data?.phrases);
  const sourceName = String(request.data?.sourceName ?? '').trim().slice(0, 240);
  if (!sourceName) throw new HttpsError('invalid-argument', 'source_name_required');
  const requestedVersion = String(request.data?.versionId ?? '').trim();
  const draftId = requestedVersion || `draft-${Date.now()}`;
  if (!/^[0-9A-Za-z._-]{1,80}$/.test(draftId)) throw new HttpsError('invalid-argument', 'version_id_invalid');
  const db = admin.firestore();
  const root = workspaceSnapshot(db, id);
  const version = root.collection('versions').doc(draftId);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(version);
    if (existing.exists && existing.data()?.status === 'published') throw new HttpsError('failed-precondition', 'published_version_immutable');
    tx.set(version, { schemaVersion: 1, videoId: id, status: 'draft', sourceName, phrases, phraseCount: phrases.length, createdAtMs: existing.data()?.createdAtMs ?? now, updatedAtMs: now, updatedBy: actor.uid }, { merge: true });
    tx.set(root, { videoId: id, draftVersion: draftId, draftPhraseCount: phrases.length, updatedAtMs: now, updatedBy: actor.uid }, { merge: true });
  });
  return { ok: true, videoId: id, versionId: draftId, phraseCount: phrases.length };
});

export const adminPublishVideoPhrases = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireAdmin(request, 'content.publish');
  const id = videoId(request.data?.videoId);
  const selectedVersion = versionId(request.data?.versionId);
  const db = admin.firestore();
  const root = workspaceSnapshot(db, id);
  const version = root.collection('versions').doc(selectedVersion);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(version);
    if (!snapshot.exists || snapshot.data()?.status !== 'draft') throw new HttpsError('failed-precondition', 'draft_version_required');
    const data = snapshot.data() ?? {};
    const phrases = asPhrases(id, data.phrases);
    const now = Date.now();
    const current = await tx.get(root);
    const previousVersion = String(current.data()?.activeVersion ?? '').trim();
    tx.set(version, { status: 'published', publishedAtMs: now, publishedBy: actor.uid, phrases }, { merge: true });
    if (previousVersion && previousVersion !== selectedVersion) tx.set(root.collection('versions').doc(previousVersion), { status: 'archived', archivedAtMs: now }, { merge: true });
    tx.set(root, publishedRootPatch({ videoId: id, versionId: selectedVersion, phraseCount: phrases.length, actorUid: actor.uid, nowMs: now }), { merge: true });
  });
  return { ok: true, videoId: id, activeVersion: selectedVersion };
});

export const adminParseVideoPhraseDocument = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY], timeoutSeconds: 120 }, async (request) => {
  const actor = requireAdmin(request, 'content.draft.write');
  const id = videoId(request.data?.videoId);
  const sourceText = String(request.data?.text ?? '').trim();
  if (!sourceText || sourceText.length > 500_000) throw new HttpsError('invalid-argument', 'document_text_invalid');
  const db = admin.firestore();
  const config = await resolveJobConfig(db, 'video_phrases');
  assertJobEnabled(config, 'video_phrases');
  await reserveContentFactoryBudget(db, `video-phrases:${id}:${String(request.data?.operationId ?? actor.uid)}`, config.globalDailyCap);
  const apiKey = String(OPENAI_API_KEY.value() || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Извлеки из документа фразы для изучения языка. Верни JSON {"phrases":[{"phrase":"...","translation":"...","explanation":"..."}]}. Только phrase, translation, explanation. Не добавляй examples, grammar, exercises. Сохрани порядок. Не выдумывай отсутствующие значения.' }, { role: 'user', content: sourceText }] }) });
  if (!response.ok) throw new HttpsError('unavailable', 'openai_request_failed');
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  let parsed: unknown;
  try { parsed = JSON.parse(String(payload.choices?.[0]?.message?.content ?? '')); }
  catch { throw new HttpsError('data-loss', 'openai_json_invalid'); }
  const phrases = asPhrases(id, (parsed as Record<string, unknown>)?.phrases);
  return { ok: true, videoId: id, sourceName: String(request.data?.sourceName ?? 'Документ').trim().slice(0, 240), phrases };
});

export const __videoPhrasesTestHooks = { publishedRootPatch };
