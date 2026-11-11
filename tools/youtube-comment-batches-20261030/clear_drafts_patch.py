"""Owner-requested, bounded draft clearing and revision-safe undo (2026-10-30)."""

def once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError(f'Expected one clear-drafts anchor: {old[:100]}')
    return source.replace(old, new, 1)


BACKEND_OPERATION = r'''
    if (op === 'clearDrafts' || op === 'restoreDrafts') {
        if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100)
            throw new https_1.HttpsError('invalid-argument', 'invalid_batch_size');
        const operationId = op === 'clearDrafts' ? identifier(input.operationId) : null;
        const items = input.items.map(item => {
            const id = identifier(item?.id), revision = item?.revision;
            if (!Number.isSafeInteger(revision) || revision < 0)
                throw new https_1.HttpsError('invalid-argument', 'invalid_revision');
            return { id, revision, operationId: operationId ?? identifier(item.operationId) };
        });
        if (new Set(items.map(item => item.id)).size !== items.length)
            throw new https_1.HttpsError('invalid-argument', 'duplicate_comment_id');
        return db.runTransaction(async (tx) => {
            const refs = items.map(item => db.collection(exports.YOUTUBE_COMMENTS_ROOT).doc(item.id));
            // Every read precedes every write, including uniqueness reservations for undo.
            const [queueSnapshot, ...snapshots] = await Promise.all([tx.get(queue), ...refs.map(ref => tx.get(ref))]);
            const rows = snapshots.map(snapshot => snapshot.data());
            const restoreRefs = op === 'restoreDrafts' ? rows.map(row => row?.replyDiscard?.reply?.text ? settings.doc((0, youtube_comment_topics_1.uniqueReplyKey)(row.replyDiscard.reply.text)) : null) : [];
            const reservations = await Promise.all(restoreRefs.map(ref => ref ? tx.get(ref) : Promise.resolve(null)));
            const recentRef = settings.doc('recentReplies');
            let recent = op === 'restoreDrafts' ? ((await tx.get(recentRef)).data()?.items ?? []) : [];
            let restored = false;
            const restoredKeys = new Map();
            const result = [];
            for (let index = 0; index < items.length; index++) {
                const item = items[index], row = rows[index], ref = refs[index];
                const skip = reason => result.push({ id: item.id, status: 'skipped', reason });
                if (!row) { skip('missing'); continue; }
                const reply = row.reply, revision = reply?.revision ?? 0, backup = row.replyDiscard;
                if (['sending', 'sent', 'uncertain'].includes(reply?.status) || row.sentId || row.sentAt || queueSnapshot.data()?.inFlightId === item.id) { skip('delivery_locked'); continue; }
                if (Number(row.generatingUntil) > Date.now()) { skip('generation_in_progress'); continue; }
                if (op === 'clearDrafts' && backup?.operationId === item.operationId && backup.clearedRevision === revision && reply?.status === 'draft' && !reply.text?.trim()) {
                    result.push({ id: item.id, status: 'alreadyCleared', reply, needsReview: !!row.needsReview, replyDiscard: { operationId: backup.operationId, clearedRevision: backup.clearedRevision, at: backup.at } });
                    continue;
                }
                if (op === 'restoreDrafts' && backup?.operationId === item.operationId && backup.restoredRevision === revision && reply?.status === 'draft') {
                    result.push({ id: item.id, status: 'alreadyRestored', reply, needsReview: !!row.needsReview, replyDiscard: { operationId: backup.operationId, clearedRevision: backup.clearedRevision, restoredRevision: revision, at: backup.at } });
                    continue;
                }
                if (revision !== item.revision) { skip('draft_changed_reload'); continue; }
                if (op === 'clearDrafts') {
                    if (!reply?.text?.trim() || !['draft', 'approved'].includes(reply.status)) { skip('no_draft'); continue; }
                    const cleared = { id: item.id, channelId: row.channelId, parentId: row.parentId, text: '', revision: revision + 1, status: 'draft', createdAt: reply.createdAt ?? Date.now() };
                    // Retain the monotonically increasing revision: a stale approval/send
                    // can never become valid again after clear -> regenerate -> approve.
                    const discarded = { reply, needsReview: !!row.needsReview, operationId: item.operationId, clearedRevision: cleared.revision, at: Date.now(), by: uid };
                    tx.update(ref, { reply: cleared, replyDiscard: discarded, needsReview: false });
                    result.push({ id: item.id, status: 'cleared', reply: cleared, needsReview: false, replyDiscard: { operationId: discarded.operationId, clearedRevision: discarded.clearedRevision, at: discarded.at } });
                } else {
                    if (!backup || backup.operationId !== item.operationId || backup.clearedRevision !== revision || reply?.status !== 'draft' || reply.text?.trim() || !backup.reply?.text?.trim()) { skip('undo_expired'); continue; }
                    const reservation = reservations[index]?.data();
                    const reservationKey = restoreRefs[index].path;
                    if ((reservation && reservation.rowId !== item.id) || (restoredKeys.has(reservationKey) && restoredKeys.get(reservationKey) !== item.id)) { skip('duplicate_reply_rewrite'); continue; }
                    const restoredReply = { id: item.id, channelId: row.channelId, parentId: row.parentId, text: backup.reply.text, revision: revision + 1, status: 'draft', createdAt: backup.reply.createdAt ?? Date.now() };
                    const needsReview = !!row.needsReview || !!backup.needsReview;
                    tx.update(ref, { reply: restoredReply, needsReview, replyDiscard: { ...backup, restoredRevision: restoredReply.revision } });
                    tx.set(restoreRefs[index], { rowId: item.id, channelId: row.channelId, createdAt: Date.now() }, { merge: true });
                    recent = [{ rowId: item.id, text: restoredReply.text.slice(0, 600) }, ...recent.filter(entry => entry.rowId !== item.id)].slice(0, 30);
                    restored = true;
                    restoredKeys.set(reservationKey, item.id);
                    result.push({ id: item.id, status: 'restored', reply: restoredReply, needsReview, replyDiscard: { operationId: backup.operationId, clearedRevision: backup.clearedRevision, restoredRevision: restoredReply.revision, at: backup.at } });
                }
            }
            if (restored) tx.set(recentRef, { items: recent });
            return { items: result };
        });
    }
'''

FRONTEND_OPERATION = r'''
const removableDraft = row => !!row.reply?.text?.trim() && ['draft','approved'].includes(row.reply.status) && !row.sentId && !row.sentAt;
const restorableDraft = row => !!row.replyDiscard?.operationId && row.reply?.status === 'draft' && !row.reply.text?.trim() && row.reply.revision === row.replyDiscard.clearedRevision;
function recoverLocalUndo(){
 for(const row of S.rows){const local=S.discardedEdits.get(row.id),receipt=row.replyDiscard;
  const edit=S.edits.get(row.id);
  if(local&&receipt?.operationId===local.operationId&&restorableDraft(row)&&edit&&edit.text===local.edit.text&&edit.revision===local.edit.revision)S.edits.delete(row.id);
  if(local&&receipt?.operationId===local.operationId&&receipt.restoredRevision===row.reply?.revision&&!S.edits.has(row.id)){
   S.edits.set(row.id,{...local.edit,revision:row.reply.revision});S.discardedEdits.delete(row.id);
  }
 }
}
async function bulkDrafts(restore=false){
 ensureAccount();if(batchBlocked())return;
 if(!S.verifiedAt){try{await load(true);}catch{say('Сначала обновите порцию: результат предыдущего действия пока не подтверждён.',true);return;}if(batchBlocked())return;}
 const rows=S.rows.filter(restore?(row=>restorableDraft(row)&&!S.edits.has(row.id)):removableDraft).slice(0,S.batchSize);if(!rows.length)return;
 const editsBefore=new Map(rows.map(row=>[row.id,S.edits.get(row.id)]));
 const scope=sessionScope(),operationId=restore?null:crypto.randomUUID(),items=rows.map(row=>({id:row.id,revision:row.reply.revision,...(restore?{operationId:row.replyDiscard.operationId}:{})}));
 const op=restore?'restoreDrafts':'clearDrafts';S.busy=true;operation=op;
 for(const row of rows){S.rowBusy.add(row.id);touchRow(row.id);if(!restore&&S.edits.has(row.id))S.discardedEdits.set(row.id,{operationId,edit:{...S.edits.get(row.id)}});}
 if(!persistDrafts()&&!restore&&rows.some(row=>editsBefore.has(row.id)&&editsBefore.get(row.id))){
  for(const row of rows){S.rowBusy.delete(row.id);touchRow(row.id);}S.busy=false;operation='';
  say('Не удалось сохранить копию локальных правок. Ответы не удалены. Сохраните правки на сервере или освободите место в браузере.',true);render();return;
 }
 say(restore?'Восстанавливаем ответы этой порции…':'Удаляем подготовленные ответы этой порции…');render();
 let uncertain=false;
 try{
  const result=await call(op,{items,...(!restore?{operationId}:{})});if(scope!==sessionScope())return;
  if(!Array.isArray(result.items)||result.items.length!==items.length||new Set(result.items.map(x=>x.id)).size!==items.length||result.items.some(x=>!items.some(y=>y.id===x.id)))throw Error('Сервер не подтвердил результат для всей порции.');
  let applied=0;const skipped=[];
  for(const item of result.items){
   if(!['cleared','alreadyCleared','restored','alreadyRestored'].includes(item.status)){skipped.push(item);continue;}
   applyReplyResult(item.id,item);touchRow(item.id);S.selected.delete(item.id);applied++;
   if(restore)recoverLocalUndo();
   else if(S.edits.get(item.id)===editsBefore.get(item.id))S.edits.delete(item.id);
  }
  const reasons=[...new Set(skipped.map(item=>({delivery_locked:'отправлены или отправляются',generation_in_progress:'ещё генерируются',draft_changed_reload:'изменились в другой вкладке',no_draft:'уже пустые',missing:'не найдены',undo_expired:'уже изменены после удаления',duplicate_reply_rewrite:'ответ уже использован'}[item.reason]||item.reason)))];
  say(`${restore?'Восстановлено':'Удалено'} ${applied} ответов этой порции.${restore?' Восстановленные ответы нужно одобрить заново.':' Можно отменить удаление или подготовить новые ответы.'}${skipped.length?` Пропущено ${skipped.length}: ${reasons.join(', ')}. Обновите порцию.`:''}`,!!skipped.length);
 }catch(e){if(scope===sessionScope()){uncertain=true;S.verifiedAt=0;say('Не удалось подтвердить результат. Проверяем сохранённое состояние…',true);}}
 finally{if(scope===sessionScope()){for(const item of items){S.rowBusy.delete(item.id);touchRow(item.id);}S.busy=false;operation='';persistSnapshot();persistDrafts();render();}}
 if(uncertain&&scope===sessionScope()){
  try{await load(true);if(scope!==sessionScope())return;let confirmed=0;
   if(!restore)for(const item of items){const row=S.rows.find(x=>x.id===item.id);if(row&&restorableDraft(row)&&row.replyDiscard.operationId===operationId){if(S.edits.get(item.id)===editsBefore.get(item.id))S.edits.delete(item.id);S.selected.delete(item.id);confirmed++;}}
   else recoverLocalUndo();
   persistDrafts();say(`Состояние обновлено.${!restore?` Подтверждено удаление ${confirmed} ответов.`:''} Проверьте порцию перед повтором.`,true);render();
  }catch{if(scope===sessionScope())say('Результат пока не подтверждён. Обновите порцию перед повтором; локальные правки сохранены.',true);}
 }
}
function clearDraftControls(root){
 const count=S.rows.filter(removableDraft).length,undo=S.rows.filter(row=>restorableDraft(row)&&!S.edits.has(row.id)).length;
 const box=n('div',undefined,'yt-actions yt-clear-drafts');
 box.append(b(`Удалить подготовленные (${count})`,()=>bulkDrafts(false),'secondary',batchBlocked()||!count));
 if(undo)box.append(b(`Отменить удаление (${undo})`,()=>bulkDrafts(true),'quiet',batchBlocked()));
 box.append(n('span','Для всей загруженной порции. Удаление можно отменить до изменения ответа.','yt-muted'));root.append(box);
}
'''


def patch_backend(source):
    source = once(source, "'feedbackAllowReply'].includes(op)", "'feedbackAllowReply', 'clearDrafts', 'restoreDrafts'].includes(op)")
    source = once(source, "    const id = identifier(input.id);\n", BACKEND_OPERATION + "    const id = identifier(input.id);\n")
    source = once(source, "            tx.update(ref, { reply });\n", "            tx.update(ref, { reply, replyDiscard: admin.firestore.FieldValue.delete() });\n")
    source = once(source, "tx.update(ref, { reply, generatingUntil: Date.now() + 180000 });", "tx.update(ref, { reply, generatingUntil: Date.now() + 180000, replyDiscard: admin.firestore.FieldValue.delete() });")
    source = once(source, "                await ref.update({ needsReview: true });\n                return { needsReview: true };", """                return await db.runTransaction(async (tx) => {
                    const current = (await tx.get(ref)).data();
                    if (!current || current.reply?.revision !== generationRevision)
                        throw new https_1.HttpsError('aborted', 'draft_changed_reload');
                    tx.update(ref, { needsReview: true });
                    return { needsReview: true };
                });""")
    source = once(source, "tx.update(ref, { reply, needsReview: false });", "tx.update(ref, { reply, needsReview: false, generatingUntil: admin.firestore.FieldValue.delete() });")
    source = once(source, "            await ref.update({ generatingUntil: admin.firestore.FieldValue.delete() });", """            await db.runTransaction(async (tx) => {
                const current = (await tx.get(ref)).data();
                if (current?.reply?.revision === generationRevision)
                    tx.update(ref, { generatingUntil: admin.firestore.FieldValue.delete() });
            });""")
    source = once(source, "    const token = bounded(input.token, 8192);", """    if (op === 'send' && (!Number.isSafeInteger(input.revision) || input.revision < 1 || data.reply?.revision !== input.revision))
        throw new https_1.HttpsError('aborted', 'draft_changed_reload');
    const token = bounded(input.token, 8192);""")
    source = once(source, "        const sending = (0, youtube_comment_policy_1.beginReply)(r, uid, channelId);", """        if (r.revision !== input.revision)
            throw new https_1.HttpsError('aborted', 'draft_changed_reload');
        if (Number(row.data()?.generatingUntil) > Date.now())
            throw new https_1.HttpsError('failed-precondition', 'generation_in_progress');
        const sending = (0, youtube_comment_policy_1.beginReply)(r, uid, channelId);""")
    return source


def patch_front(source):
    source = once(source, "pruneStorage(storage);S.storageWarning='';}catch", "pruneStorage(storage);S.storageWarning='';return true;}catch")
    source = once(source, "до закрытия вкладки.';}\n}", "до закрытия вкладки.';return false;}\n}")
    source = once(source, "function persistDrafts(){writeStorage(", "function persistDrafts(){return writeStorage(")
    source = once(source, "edits:new Map(),", "edits:new Map(),discardedEdits:new Map(),")
    source = once(source, "{edits:[...S.edits],answers:", "{edits:[...S.edits],discardedEdits:[...S.discardedEdits],answers:")
    source = once(source, "S.edits.clear();S.answers.clear();", "S.edits.clear();S.discardedEdits.clear();S.answers.clear();")
    source = once(source, "S.answers=new Map((Array.isArray(draft.answers)", "S.discardedEdits=new Map((Array.isArray(draft.discardedEdits)?draft.discardedEdits:[]).filter(e=>Array.isArray(e)&&typeof e[0]==='string'&&typeof e[1]?.operationId==='string'&&typeof e[1]?.edit?.text==='string'));S.answers=new Map((Array.isArray(draft.answers)")
    source = once(source, "'topicId','feedbackVersion']),reply:", "'topicId','feedbackVersion','sentId','sentAt','generatingUntil']),replyDiscard:r.replyDiscard?pick(r.replyDiscard,['operationId','clearedRevision','restoredRevision','at']):undefined,reply:")
    source = once(source, "if(result.reply)row.reply=result.reply;", "if(result.reply)row.reply=result.reply;if(Object.prototype.hasOwnProperty.call(result,'replyDiscard')){if(result.replyDiscard)row.replyDiscard=result.replyDiscard;else delete row.replyDiscard;}")
    source = once(source, "async function refreshRow(id){", FRONTEND_OPERATION + "\nasync function refreshRow(id){")
    source = once(source, "S.nextCursor=snapshot.cursor||null;", "recoverLocalUndo();persistDrafts();S.nextCursor=snapshot.cursor||null;")
    source = once(source, "call('send',{id:next.id,token:accessToken})", "call('send',{id:next.id,revision,token:accessToken})")
    source = once(source, "function drafts(root){batchControls(root);toneControls(root);filters(root);", "function drafts(root){batchControls(root);toneControls(root);clearDraftControls(root);filters(root);")
    return source
