import { approveReply, editReply, chooseNextReply, beginReply, replyDigest, type ReplyDraft } from './youtube_comment_policy';

const draft = (id = 'a', channelId = 'channel-a'): ReplyDraft => ({ id, channelId, parentId: 'parent-' + id, text: 'Спасибо за вопрос!', revision: 1, status: 'draft', createdAt: 1 });
describe('YouTube owner-approved replies', () => {
  it('never sends an unapproved draft', () => {
    expect(() => beginReply(draft(), 'owner', 'channel-a')).toThrow('approval_required');
  });
  it('binds approval to text and recipient', () => {
    const approved = approveReply(draft(), 'owner', 1);
    expect(beginReply(approved, 'owner', 'channel-a').status).toBe('sending');
    expect(() => beginReply({ ...approved, text: 'Changed' }, 'owner', 'channel-a')).toThrow('approval_stale');
    expect(() => beginReply({ ...approved, parentId: 'someone-else' }, 'owner', 'channel-a')).toThrow('approval_stale');
  });
  it('invalidates approval when edited, including same text saved again', () => {
    const approved = approveReply(draft(), 'owner', 1);
    const edited = editReply(approved, approved.text);
    expect(edited.status).toBe('draft');
    expect(edited.approval).toBeUndefined();
    expect(edited.revision).toBe(2);
  });
  it('does not allow another approver or another channel to send', () => {
    const approved = approveReply(draft(), 'owner', 1);
    expect(() => beginReply(approved, 'other', 'channel-a')).toThrow('approval_owner_mismatch');
    expect(() => beginReply(approved, 'owner', 'channel-b')).toThrow('channel_mismatch');
  });
  it.each(['sending', 'sent', 'uncertain'] as const)('cannot edit or reapprove a %s reply', status => {
    expect(() => editReply({ ...draft(), status }, 'new')).toThrow('delivery_locked');
    expect(() => approveReply({ ...draft(), status }, 'owner', 2)).toThrow('delivery_locked');
  });
  it('alternates channels without starving older approved replies', () => {
    const a = approveReply(draft('a', 'one'), 'owner', 1);
    const b = approveReply(draft('b', 'two'), 'owner', 2);
    expect(chooseNextReply([a, b], 'one', 'owner')?.id).toBe('b');
    expect(chooseNextReply([a, b], 'two', 'owner')?.id).toBe('a');
    expect(chooseNextReply([{ ...a, status: 'uncertain' }, { ...b, status: 'sent' }], '', 'owner')).toBeNull();
  });
  it('digest changes for revision, channel, comment and text', () => {
    const base = draft();
    for (const change of [{revision:2}, {channelId:'x'}, {parentId:'x'}, {text:'x'}]) expect(replyDigest({...base,...change})).not.toBe(replyDigest(base));
  });
  it('rejects blank, oversized text and missing approver', () => {
    expect(() => editReply(draft(), ' ')).toThrow('reply_text_invalid');
    expect(() => editReply(draft(), 'x'.repeat(4001))).toThrow('reply_text_invalid');
    expect(() => approveReply(draft(), '', 1)).toThrow('approver_required');
  });
});
