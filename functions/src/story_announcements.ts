import * as admin from "firebase-admin";
import { createHash } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  requireAdminAppCheck,
} from "./callable_options";
import { createAuditRecord } from "./admin/audit_contract";
import {
  storyAdminRole,
  parseStoryCommand,
  applyStoryCommand,
} from "./story_announcements_domain";
import { liveAnnouncements } from "../../modules/story_events/story_announcements_contract";
const options = { region: "us-central1", enforceAppCheck: false };
function role(
  request: { auth?: { token: Record<string, unknown> } },
  write: boolean,
) {
  try {
    return storyAdminRole(request.auth?.token, write);
  } catch (error) {
    // зачем (Ревизор 24.10): немых catch нет — причина отказа в журнал, без uid; ответ клиенту прежний
    console.warn("[STORY-ADMIN] role_denied", JSON.stringify({ write, reason: String(error instanceof Error ? error.message : error).slice(0, 80) }));
    throw new HttpsError("permission-denied", "Admin permission required");
  }
}
export const adminStoryAnnouncementsList = onCall(options, async (request) => {
  role(request, false);
  const db = admin.firestore();
  const [rows, feed] = await Promise.all([
    db
      .collection("story_announcements")
      .orderBy("updatedAtMs", "desc")
      .limit(120)
      .get(),
    db.collection("story_announcement_feed").doc("current").get(),
  ]);
  const items = new Map(
    rows.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
  );
  // Active older stories must remain manageable even after >120 recent drafts.
  const active = liveAnnouncements(feed.data()?.items ?? [], Date.now());
  const missing = active.filter((x) => !items.has(x.id));
  if (missing.length) {
    const docs = await db.getAll(
      ...missing.map((x) => db.collection("story_announcements").doc(x.id)),
    );
    for (const d of docs)
      if (d.exists) items.set(d.id, { id: d.id, ...d.data() });
  }
  return { items: [...items.values()] };
});
export const adminStoryAnnouncementCommand = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actorRole = role(request, true);
    const actorUid = request.auth!.uid;
    let command;
    try {
      command = parseStoryCommand(request.data);
    } catch (e) {
      throw new HttpsError(
        "invalid-argument",
        e instanceof Error ? e.message : "invalid_content",
      );
    }
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(command))
      .digest("hex");
    const db = admin.firestore(),
      ref = db.collection("story_announcements").doc(command.id),
      feedRef = db.collection("story_announcement_feed").doc("current");
    const opRef = db
        .collection("admin_command_operations")
        .doc(`story_${command.operationId}`),
      auditRef = db.collection("admin_log").doc();
    return db.runTransaction(async (tx) => {
      const [old, feed, op] = await Promise.all([
        tx.get(ref),
        tx.get(feedRef),
        tx.get(opRef),
      ]);
      if (op.exists) {
        const data = op.data()!;
        if (
          data.actorUid !== actorUid ||
          data.requestFingerprint !== fingerprint
        )
          throw new HttpsError("already-exists", "Operation key already used");
        return data.result;
      }
      const before = old.exists ? old.data()! : null;
      let next;
      try {
        next = applyStoryCommand(
          command,
          before,
          feed.data()?.items ?? [],
          Date.now(),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "invalid_content";
        throw new HttpsError(
          msg === "revision_conflict"
            ? "aborted"
            : msg === "not_found"
              ? "not-found"
              : "failed-precondition",
          msg,
        );
      }
      const result = {
        id: command.id,
        revision: next.document.revision,
        auditId: auditRef.id,
      };
      tx.set(ref, { ...next.document, updatedBy: actorUid });
      tx.set(feedRef, {
        items: next.items,
        updatedAtMs: next.document.updatedAtMs,
      });
      tx.create(
        auditRef,
        createAuditRecord({
          action: `story.${command.action}`,
          actorUid,
          role: actorRole,
          entity: { collection: "story_announcements", id: command.id },
          reason: `Story ${command.action}`,
          before: before ?? {},
          after: next.document,
          requestId: command.operationId,
          rollbackReference: command.id,
          timestamp: new Date(next.document.updatedAtMs).toISOString(),
        }),
      );
      tx.create(opRef, {
        actorUid,
        requestFingerprint: fingerprint,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    });
  },
);
/** Only content and timing cross this boundary; drafts and admin identities never do. */
export const storyAnnouncementsGet = onCall(options, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in required");
  const nowMs = Date.now();
  const feed = await admin
    .firestore()
    .collection("story_announcement_feed")
    .doc("current")
    .get();
  return { items: liveAnnouncements(feed.data()?.items ?? [], nowMs), nowMs };
});
