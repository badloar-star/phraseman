import { createHash } from 'node:crypto';

export type ReplyStatus = 'draft' | 'approved' | 'sending' | 'sent' | 'uncertain';
export interface ReplyDraft {
  id: string;
  channelId: string;
  parentId: string;
  text: string;
  revision: number;
  status: ReplyStatus;
  createdAt: number;
  approval?: { uid: string; at: number; digest: string };
}
export function replyDigest(reply: ReplyDraft): string {
  return createHash('sha256').update(JSON.stringify([reply.id, reply.channelId, reply.parentId, reply.text, reply.revision])).digest('hex');
}
function editable(reply: ReplyDraft): void {
  if (reply.status !== 'draft' && reply.status !== 'approved') throw new Error('delivery_locked');
}
function validText(text: string): string {
  const normalized = text.trim();
  if (!normalized || normalized.length > 4000) throw new Error('reply_text_invalid');
  return normalized;
}
export function editReply(reply: ReplyDraft, text: string): ReplyDraft {
  editable(reply);
  const { approval: _approval, ...rest } = reply;
  return { ...rest, text: validText(text), revision: reply.revision + 1, status: 'draft' };
}
export function approveReply(reply: ReplyDraft, uid: string, now: number): ReplyDraft {
  editable(reply);
  if (!uid.trim()) throw new Error('approver_required');
  validText(reply.text);
  return { ...reply, status: 'approved', approval: { uid, at: now, digest: replyDigest(reply) } };
}
export function beginReply(reply: ReplyDraft, uid: string, verifiedChannelId: string): ReplyDraft {
  if (reply.status !== 'approved' || !reply.approval) throw new Error('approval_required');
  if (reply.approval.uid !== uid) throw new Error('approval_owner_mismatch');
  if (reply.channelId !== verifiedChannelId) throw new Error('channel_mismatch');
  if (reply.approval.digest !== replyDigest(reply)) throw new Error('approval_stale');
  return { ...reply, status: 'sending' };
}
export function chooseNextReply(replies: readonly ReplyDraft[], lastChannelId: string, uid: string): ReplyDraft | null {
  const ready = replies.filter(row => row.status === 'approved' && row.approval?.uid === uid && row.approval.digest === replyDigest(row))
    .sort((a, b) => (a.approval?.at ?? 0) - (b.approval?.at ?? 0) || a.id.localeCompare(b.id));
  return ready.find(row => row.channelId !== lastChannelId) ?? ready[0] ?? null;
}
