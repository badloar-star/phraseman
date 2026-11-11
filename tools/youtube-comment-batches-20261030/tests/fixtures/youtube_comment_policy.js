"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyDigest = replyDigest;
exports.editReply = editReply;
exports.approveReply = approveReply;
exports.beginReply = beginReply;
exports.chooseNextReply = chooseNextReply;
const node_crypto_1 = require("node:crypto");
function replyDigest(reply) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify([reply.id, reply.channelId, reply.parentId, reply.text, reply.revision])).digest('hex');
}
function editable(reply) {
    if (reply.status !== 'draft' && reply.status !== 'approved')
        throw new Error('delivery_locked');
}
function validText(text) {
    const normalized = text.trim();
    if (!normalized || normalized.length > 4000)
        throw new Error('reply_text_invalid');
    return normalized;
}
function editReply(reply, text) {
    editable(reply);
    const { approval: _approval, ...rest } = reply;
    return { ...rest, text: validText(text), revision: reply.revision + 1, status: 'draft' };
}
function approveReply(reply, uid, now) {
    editable(reply);
    if (!uid.trim())
        throw new Error('approver_required');
    validText(reply.text);
    return { ...reply, status: 'approved', approval: { uid, at: now, digest: replyDigest(reply) } };
}
function beginReply(reply, uid, verifiedChannelId) {
    if (reply.status !== 'approved' || !reply.approval)
        throw new Error('approval_required');
    if (reply.approval.uid !== uid)
        throw new Error('approval_owner_mismatch');
    if (reply.channelId !== verifiedChannelId)
        throw new Error('channel_mismatch');
    if (reply.approval.digest !== replyDigest(reply))
        throw new Error('approval_stale');
    return { ...reply, status: 'sending' };
}
function chooseNextReply(replies, lastChannelId, uid) {
    const ready = replies.filter(row => row.status === 'approved' && row.approval?.uid === uid && row.approval.digest === replyDigest(row))
        .sort((a, b) => (a.approval?.at ?? 0) - (b.approval?.at ?? 0) || a.id.localeCompare(b.id));
    return ready.find(row => row.channelId !== lastChannelId) ?? ready[0] ?? null;
}
//# sourceMappingURL=youtube_comment_policy.js.map