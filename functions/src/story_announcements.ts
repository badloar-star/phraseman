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
import {
  liveAnnouncements,
  nextStoryFeedRev,
  storyFeedRevOf,
  storyPollDocId,
  STORY_FEED_REV_CONFIG_KEY,
  STORY_POLLS_COLLECTION,
} from "../../modules/story_events/story_announcements_contract";
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
      // зачем (владелец 28.10: «новая история заменяет предыдущую»; координатор: сперва логи): по строке на команду — тот ли это id, что уже
      // в показе (повторная публикация того же id = замена), сколько историй в ленте до и после. Без uid и текста истории.
      const liveBefore = liveAnnouncements(feed.data()?.items ?? [], next.document.updatedAtMs);
      // зачем (координатор 28.10, дешёвый путь): публикация и снятие меняют ленту — новая версия; черновик ленту не меняет — версия прежняя
      const prevFeedRev = storyFeedRevOf(feed.data());
      const feedChanged = command.action !== "save";
      const feedRev = feedChanged ? nextStoryFeedRev(prevFeedRev, next.document.updatedAtMs) : prevFeedRev;
      console.log("[STORY-POST] command", JSON.stringify({
        id: command.id.slice(0, 8), action: command.action, expectedRevision: command.expectedRevision, revision: next.document.revision,
        previousStatus: before?.status ?? "none", replacesLiveSameId: command.action === "publish" && liveBefore.some((x) => x.id === command.id),
        feedBefore: liveBefore.length, feedAfter: next.items.length, feedRevBefore: prevFeedRev, feedRevAfter: feedRev, configRevWritten: feedChanged,
        publishedAt: next.document.publishedAtMs ? new Date(next.document.publishedAtMs).toISOString() : null,
        expiresAt: next.document.expiresAtMs ? new Date(next.document.expiresAtMs).toISOString() : null,
      }));
      const result = {
        id: command.id,
        revision: next.document.revision,
        auditId: auditRef.id,
      };
      tx.set(ref, { ...next.document, updatedBy: actorUid });
      tx.set(feedRef, {
        items: next.items,
        updatedAtMs: next.document.updatedAtMs,
        rev: feedRev,
      });
      // зачем (шаблон «Опрос», координатор 28.10): опрос заводится той же транзакцией, что и публикация, — один документ на ревизию
      // (story_polls/{id}_{revision}); варианты = блоки. merge: повтор операции не обнуляет уже набранные счётчики.
      const pollContent = command.action === "publish" ? command.content : undefined;
      if (pollContent?.design === "poll") {
        const pollId = storyPollDocId(command.id, next.document.revision);
        tx.set(
          db.collection(STORY_POLLS_COLLECTION).doc(pollId), // guard-ok: один документ опроса по id
          {
            announcementId: command.id,
            revision: next.document.revision,
            options: pollContent.blocks.map((b) => b.text),
            expiresAtMs: next.document.expiresAtMs,
            createdAtMs: next.document.updatedAtMs,
          },
          { merge: true },
        );
        console.log("[STORY-POLL] created", JSON.stringify({ poll: storyPollDocId(command.id.slice(0, 8), next.document.revision), options: pollContent.blocks.length }));
      }
      // зачем: версия ленты — в уже читаемом на каждом холодном старте remote_config/app (клиент сравнивает с копией на телефоне).
      // merge: остальные ручки «Пульта» не трогаем; adminPublishRemoteConfig сливает ветки и это поле сохраняет.
      if (feedChanged)
        tx.set(
          db.collection("remote_config").doc("app"),
          { numbers: { [STORY_FEED_REV_CONFIG_KEY]: feedRev } },
          { merge: true },
        );
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
  const projected = { items: liveAnnouncements(feed.data()?.items ?? [], nowMs), nowMs, feedRev: storyFeedRevOf(feed.data()) };
  // зачем (28.10): видно, что лента отдаёт человеку — сколько историй и самая свежая; 1 чтение документа на вызов
  const newest = projected.items[projected.items.length - 1];
  console.log("[STORY-POST] get", JSON.stringify({ live: projected.items.length, feedRev: projected.feedRev, newestPublishedAt: newest ? new Date(newest.publishedAtMs).toISOString() : null }));
  return projected;
});
