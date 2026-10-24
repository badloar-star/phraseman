import {
  normalizeAnnouncement,
  announcementDuration,
  liveAnnouncements,
  type AnnouncementContent,
} from "../../modules/story_events/story_announcements_contract";
import { hasAdminRole, type AdminRole } from "./admin/roles";
import { hasPermission } from "./admin/permissions";
export function storyAdminRole(
  token: Record<string, unknown> | undefined,
  write: boolean,
): AdminRole {
  if (token?.admin !== true) throw new Error("permission-denied");
  if (token.adminRole !== undefined && !hasAdminRole(token.adminRole))
    throw new Error("permission-denied");
  const role = hasAdminRole(token.adminRole) ? token.adminRole : "owner";
  if (!hasPermission(role, write ? "campaigns.write" : "campaigns.read"))
    throw new Error("permission-denied");
  return role;
}
export type StoryCommand = Readonly<{
  id: string;
  expectedRevision: number;
  operationId: string;
  action: "save" | "publish" | "stop";
  content?: AnnouncementContent;
}>;
export function parseStoryCommand(raw: unknown): StoryCommand {
  if (!raw || typeof raw !== "object") throw new Error("invalid-argument");
  const v = raw as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    !/^[-a-zA-Z0-9_]{1,100}$/.test(v.id) ||
    typeof v.operationId !== "string" ||
    !/^[-a-zA-Z0-9_]{16,100}$/.test(v.operationId) ||
    !Number.isSafeInteger(v.expectedRevision) ||
    Number(v.expectedRevision) < 0 ||
    !["save", "publish", "stop"].includes(String(v.action))
  )
    throw new Error("invalid-argument");
  return {
    id: v.id,
    operationId: v.operationId,
    expectedRevision: Number(v.expectedRevision),
    action: v.action as StoryCommand["action"],
    ...(v.action === "stop"
      ? {}
      : { content: normalizeAnnouncement(v.content) }),
  };
}
export function applyStoryCommand(
  command: StoryCommand,
  previous: Record<string, unknown> | null,
  feed: readonly unknown[],
  now: number,
) {
  if ((previous?.revision ?? 0) !== command.expectedRevision)
    throw new Error("revision_conflict");
  if (command.action === "save" && previous?.status === "published")
    throw new Error("published_edit_requires_stop");
  if (command.action === "stop" && !previous) throw new Error("not_found");
  const revision = command.expectedRevision + 1;
  const content = command.content ?? previous?.content;
  const published = command.action === "publish";
  const document = {
    id: command.id,
    revision,
    content,
    status: published ? "published" : "draft",
    publishedAtMs: published ? now : null,
    expiresAtMs: published
      ? now + announcementDuration(command.content!)
      : null,
    updatedAtMs: now,
  };
  const items = liveAnnouncements(feed, now).filter((x) => x.id !== command.id);
  if (published) {
    if (items.length >= 20) throw new Error("active_limit");
    items.push({
      ...command.content!,
      id: command.id,
      revision,
      status: "published",
      publishedAtMs: now,
      expiresAtMs: document.expiresAtMs!,
    });
  }
  return { document, items };
}
