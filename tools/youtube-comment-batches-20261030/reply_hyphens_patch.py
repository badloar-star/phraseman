"""Deterministic reply punctuation patch; never rewrite published history."""

import json
import re


PUNCTUATION_RULE = (
    'Обязательное правило пунктуации: никогда не используй длинное, среднее или '
    'типографское тире. Из всех видов тире и дефисов разрешён только обычный '
    'короткий дефис "-" (ASCII U+002D). Это правило действует во всём ответе, '
    'включая цитаты, примеры и диапазоны чисел. Не копируй длинные тире из '
    'комментария, базы знаний или прошлых ответов. Перед выдачей замени каждый '
    'такой знак на "-". Старые инструкции и примеры не отменяют это правило.'
)
NORMALIZER = r"function normalizeReplyDashes(text){return text.replace(/[\p{Dash_Punctuation}\u2212]/gu,'-');}"


def once(source, old, new):
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one unchanged punctuation anchor, got {count}: {old[:100]}')
    return source.replace(old, new, 1)


def patch_instructions(source):
    prefix = 'exports.OWNER_REPLY_INSTRUCTIONS = '
    start = source.index(prefix) + len(prefix)
    prompt, end = json.JSONDecoder().raw_decode(source[start:])
    prompt = re.sub(r'[\u2010-\u2015\u2212\u2e3a\u2e3b\ufe31\ufe32\ufe58\ufe63\uff0d]', '-', prompt)
    if PUNCTUATION_RULE not in prompt:
        first, rest = prompt.split('\n\n', 1)
        prompt = first + '\n\n' + PUNCTUATION_RULE + '\n\n' + rest
    source = source[:start] + json.dumps(prompt, ensure_ascii=False) + source[start + end:]
    if 'exports.normalizeReplyDashes' not in source:
        source = source.rstrip() + '\n' + NORMALIZER + '\nexports.normalizeReplyDashes = normalizeReplyDashes;\n'
    return source


def patch_backend(source):
    source = once(source, 'const youtube_reply_instructions_1 = require("./youtube_reply_instructions");',
                  'const youtube_reply_instructions_1 = require("./youtube_reply_instructions");\nconst normalizeReplyDashes = youtube_reply_instructions_1.normalizeReplyDashes;')
    for old, new in [
        ('uniqueReplyKey)(row.replyDiscard.reply.text)', 'uniqueReplyKey)(normalizeReplyDashes(row.replyDiscard.reply.text))'),
        ('text: backup.reply.text, revision:', 'text: normalizeReplyDashes(backup.reply.text), revision:'),
        ('text: row.reply.text, revision:', 'text: normalizeReplyDashes(row.reply.text), revision:'),
        ("text: current.reply?.text ?? '', revision, status: 'draft'", "text: normalizeReplyDashes(current.reply?.text ?? ''), revision, status: 'draft'"),
        ('const text = bounded(output.choices?.[0]?.message?.content, 4000);',
         'const text = normalizeReplyDashes(bounded(output.choices?.[0]?.message?.content, 4000));'),
    ]:
        source = once(source, old, new)
    source = once(source,
        "            const reply = op === 'save' ? (0, youtube_comment_policy_1.editReply)(before, bounded(input.text, 4000)) : (0, youtube_comment_policy_1.approveReply)(before, uid, Date.now());",
        """            // editReply and approveReply share the same editable-status guard.
            // Check the original revision above, then approve/hash the canonical text.
            const text = normalizeReplyDashes(op === 'save' ? bounded(input.text, 4000) : before.text);
            const draft = op === 'save' || text !== before.text ? (0, youtube_comment_policy_1.editReply)(before, text) : before;
            const reply = op === 'approve' ? (0, youtube_comment_policy_1.approveReply)(draft, uid, Date.now()) : draft;""")
    source = once(source,
        "    const token = bounded(input.token, 8192);\n    const channelId = await verifiedChannel",
        """    if (op === 'send' && data.reply && normalizeReplyDashes(data.reply.text) !== data.reply.text)
        throw new https_1.HttpsError('failed-precondition', 'reply_dashes_require_save');
    const token = bounded(input.token, 8192);
    const channelId = await verifiedChannel""")
    source = once(source,
        "        const sending = (0, youtube_comment_policy_1.beginReply)(r, uid, channelId);",
        """        // Never change text after approval or during delivery/reconciliation.
        if (normalizeReplyDashes(r.text) !== r.text)
            throw new https_1.HttpsError('failed-precondition', 'reply_dashes_require_save');
        const sending = (0, youtube_comment_policy_1.beginReply)(r, uid, channelId);""")
    return source


def patch_front(source):
    source = once(source, 'const BATCH_SIZES=[10,20,30,40,50,100];',
                  'const BATCH_SIZES=[10,20,30,40,50,100];\n' + NORMALIZER)
    source = once(source, "const messages={reply_skipped_by_owner_rules:",
                  "const messages={reply_dashes_require_save:'В старом одобренном ответе есть длинное тире. Нажмите «Отменить одобрение и изменить», затем снова одобрите ответ: тире заменятся на короткий дефис (-).',reply_skipped_by_owner_rules:")
    source = once(source, "result=await call('save',{id,text,revision});",
                  "result=await call('save',{id,text:normalizeReplyDashes(text),revision});")
    source = once(source, "input.value=S.edits.get(r.id)?.text??r.reply?.text??'';input.placeholder=",
                  "const shownText=S.edits.get(r.id)?.text??r.reply?.text??'';input.value=['approved','sending','sent','uncertain'].includes(r.reply?.status)?shownText:normalizeReplyDashes(shownText);input.placeholder=")
    source = once(source, 'input.oninput=()=>{S.edits.set(r.id,{text:input.value,',
                  "input.oninput=()=>{const start=input.selectionStart,end=input.selectionEnd,text=input.value,normalized=normalizeReplyDashes(text);if(normalized!==text){input.value=normalized;if(typeof input.setSelectionRange==='function')input.setSelectionRange(normalizeReplyDashes(text.slice(0,start)).length,normalizeReplyDashes(text.slice(0,end)).length);}S.edits.set(r.id,{text:input.value,")
    source = once(source, ' Отправка начнётся только после отдельного запуска очереди.`))return;',
                  ' Все тире в одобряемых ответах заменятся на короткий дефис (-). Отправка начнётся только после отдельного запуска очереди.`))return;')
    source = once(source, 'const revision=checked.reply.revision,accessToken=await token(next.configId);',
                  "if(normalizeReplyDashes(checked.reply.text)!==checked.reply.text)throw Error('reply_dashes_require_save');const revision=checked.reply.revision,accessToken=await token(next.configId);")
    source = once(source, 'Сохраните инструкции перед подготовкой новых ответов. Готовые черновики сами не изменятся.',
                  'В ответах используется только короткий дефис (-). Сохраните инструкции перед подготовкой новых ответов. Готовые черновики сами не изменятся.')
    source = once(source, "input.value=S.toneDraft??S.knowledge.global??'';",
                  "input.value=normalizeReplyDashes(S.toneDraft??S.knowledge.global??'');")
    return source.translate({0x2013: '-', 0x2014: '-'})
