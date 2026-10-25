# Ссылки и шаги Карточек по партии 2 подмен Ядра («сообщество без сети»: packcards/community/comments, fail=…, voices=…; коммиты ae44078f4 + ea0a6303e).
# Источник — таблица «id → ссылка + шаги» в docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md, раздел «Партия 2».
#
# зачем (Ядро 12.10): для dev_demo_* / video_devDemo* сеть не вызывается вообще — лайк, «Добавить себе», отклик и жалоба в прод не уходят. Память режима живёт до перезапуска,
# поэтому community=reset стоит в каждой ссылке. Только гость. Строки с неоднозначным соответствием кадру помечены unique=False (Сверка берёт их по отдельному решению).
from dev_links_r1_steps import ENTRIES, add


def put(ids, steps, params, nxt, **kw):
    """add(), но заменяет уже существующую запись (там были прежние ссылки до партии 2)."""
    for rid in ([ids] if isinstance(ids, str) else ids):
        ENTRIES.pop(rid, None)
    add(ids, steps, params, nxt, **kw)


CID = 'dev_demo_community_2'            # «B2 глаголы» · Ирина · 49 · B2
VID = 'video_devDemoVid0'               # ролик «Заказ в кафе»
OWN = 'dev_demo_published_own'          # «Мой опубликованный» (автор — гость)
P2 = 'packcards=on&community=reset'
P2_ROUTE = f'/flashcards_collection?pack={CID}&preview=1'
VIDEO_ROUTE = f'/flashcards_collection?pack={VID}&preview=1'
OWN_PARAMS = 'cards=demo_published&plus=on&packcards=on'
OWN_ROUTE = f'/flashcards_collection?pack={OWN}'
ADD = f'tap:#pack-add-{CID}'
LIKE = f'tap:#pack-like-{CID}'
COMMENTS = f'tap:#pack-comments-{CID}'
SEND = ['tap:#pack-comment-input', 'type:Thanks', 'tap:#pack-comment-send', 'wait:600']
MORE_OTHER = 'tap:#pack-comment-more-dev_demo_cm_2'
# зачем (кадр cards-v2-015 6:59: «Карточки · 0 карточек», набор ещё не подгрузился): экран чужого набора читает карточки из памяти не мгновенно — ждём 2,5 с до первого шага/кадра (карточки приходят через ≈ 1,7 с — журнал Ядра 12.10)
WAIT = 'wait:2500'

# ── Чужой набор «B2 глаголы»: добавить, лайк, отклики
# 25.10: тап «крупнее» (прежний fc-zoom-larger) снят вместе с кнопками масштаба (решение владельца 22.10 «только нормальный вид»); кадр показывает обычный вид
put(['cards-018', 'cards-section-013', 'cards-v2-015'], [WAIT], P2, P2_ROUTE, note='чужой набор «B2 глаголы» до добавления (packcards=on, без сети)')
put(['cards-019', 'cards-section-014', 'cards-v2-016'], [WAIT, ADD], P2, P2_ROUTE, note='чужой набор: «Добавить себе» нажато (в память, без сети)')
put('cards-gap-032', [WAIT, LIKE], P2, P2_ROUTE, note='лайк до добавления: тост «сначала добавь»')
put('cards-050', [WAIT, ADD, LIKE], P2, P2_ROUTE, note='набор добавлен и лайкнут')
put('cards-gap-033', [WAIT, ADD, LIKE], P2 + '&fail=pack_like', P2_ROUTE, note='лайк не прошёл: откат сердца + тост (fail=pack_like)')
put('cards-section-018', [WAIT, ADD, f'tap:#fc-gallery-tile-{CID}_c1'], P2, P2_ROUTE, note='карточка чужого набора раскрыта (после добавления)')
put('cards-051', [WAIT, ADD, COMMENTS], P2 + '&comments=empty', P2_ROUTE, note='отклики: «Пока тихо» (comments=empty)')
put('cards-052', [WAIT, COMMENTS], P2 + '&comments=demo', P2_ROUTE, note='отклики до добавления: поле закрыто (pack-comments-write-locked), comments=demo')
put('cards-054', [WAIT, ADD, COMMENTS] + SEND, P2 + '&comments=demo', P2_ROUTE, unique=False, note='отклик отправлен (в память); меню своего отклика («Удалить») открывается тапом по ⋯ нового отклика — id заранее неизвестен, шаг не добавлен')
put('cards-056', [WAIT, ADD, COMMENTS] + SEND, P2 + '&comments=demo&hold=comment_send', P2_ROUTE, unique=False, note='«Отправляется» (hold=comment_send); «не отправлено» — вариант fail=comment_send (один кадр образца №50 показывает оба)')
put('cards-055', [WAIT, ADD, COMMENTS, MORE_OTHER], P2 + '&comments=demo', P2_ROUTE, note='меню чужого отклика («Пожаловаться»)')
put('cards-057', [WAIT, ADD, COMMENTS, MORE_OTHER, 'tap:Пожаловаться', 'wait:600'], P2 + '&comments=demo', P2_ROUTE, note='окно «Пожаловаться на комментарий» (report-comment-sheet)')
put('cards-058', [WAIT, ADD, COMMENTS, MORE_OTHER, 'tap:Пожаловаться', 'tap:Спам или реклама', 'tap:Отправить жалобу', 'wait:600'], P2 + '&comments=demo', P2_ROUTE, note='жалоба на отклик отправлена (без сети); «не отправилась» — fail=report_send')
put('cards-059', ['long:#flashcards-pack-card-dev_demo_community_1', 'tap:#flashcards-pack-report', 'tap:Спам или реклама', 'tap:Отправить жалобу', 'wait:600'], 'catalog=demo&packcards=on&community=reset', '/flashcards_packs', unique=False, note='жалоба на набор отправлена (ReportPackModal, без сети); шаги по аналогии с cards-020, тексты кнопок не проверены на кадре')

# ── Свой опубликованный набор
put('cards-053', [MORE_OTHER], OWN_PARAMS + '&comments=demo', f'/flashcards_collection?pack={OWN}&openComments=1', note='меню автора набора: закрепить / скрыть (⋯ у чужого отклика; пункты не жать)')
put('cards-gap-029', [f'tap:#fc-gallery-tile-{OWN}_c1', 'tap:#fc-expanded-delete', 'wait:5800'], OWN_PARAMS + '&fail=pack_remove_min', OWN_ROUTE, note='удаление карточки: «в наборе должно остаться минимум 10» (fail=pack_remove_min)')
put('cards-gap-031', [f'tap:#fc-gallery-tile-{OWN}_c1', 'tap:#fc-expanded-delete', 'wait:5800'], OWN_PARAMS + '&fail=pack_remove_net', OWN_ROUTE, note='удаление карточки: «Нет связи — карточку не удалось удалить» (fail=pack_remove_net)')
put('cards-gap-039', [f'tap:#fc-gallery-tile-{OWN}_c1', 'tap:#fc-expanded-to-pack'], OWN_PARAMS, OWN_ROUTE, note='карточка своего набора → «В набор» (раскрытие карточки)')

# ── «Не скачан», видео-наборы
put('cards-044', [f'tap:#fc-my-packs-pack-{CID}', 'wait:5200'], 'packcards=meta&community=added', '/flashcards_my_packs', note='тост «Набор ещё не скачан» (packcards=meta: мета есть, карточек нет)')
put(['cards-043', 'cards-section-030', 'cards-v2-019'], [], P2, VIDEO_ROUTE, note='набор из видео: ролик «Заказ в кафе» до добавления')
put(['cards-section-031', 'cards-v2-053'], [f'tap:#pack-add-{VID}'], P2, VIDEO_ROUTE, note='набор из видео добавлен')
put('cards-082', ['tap:#video-set-hero'], P2 + '&fail=video_open', VIDEO_ROUTE, note='ролик не открылся: «Видео сейчас не открывается» (fail=video_open)')

# ── Тренировки, публикация, голоса
put('cards-gap-003', [], 'cards=demo&plus=on&hold=swipe_quickstart', '/flashcards_truefalse_session?deck=saved&quick=1&size=all', note='«Правда / ложь»: «Готовим тренировку…» держится (hold=swipe_quickstart починен Ядром; снять — hold=off)')
put('cards-gap-028', ['tap:#fc-pack-menu', 'tap:#fc-pack-publish'], 'cards=demo&plus=on&fail=publish_error', '/flashcards_collection?pack=local_pack_dev_demo_work', note='«Не удалось отправить набор на публикацию» (fail=publish_error, без сети)')
put('cards-gap-036', ['tap:#fc-voice-row-dev_voice_samantha'], 'plus=on&voices=demo', '/flashcards_voice_picker', note='выбор голоса озвучки: список как на образце, выбран Samantha (voices=demo)')
put('cards-gap-038', [], 'plus=on&voices=none', '/flashcards_voice_picker', note='голосов нет: только «Системный» (voices=none)')

# ── «Устно» и фильтр
# зачем (кадр cards-v2-032 7:01: скелетон сессии «Устно» ещё не сменился карточкой) — пауза 3 с до кадра
put(['cards-section-040', 'cards-v2-032'], ['wait:3000'], 'cards=demo&plus=on&speech=correct', '/flashcards_speaking_session?deck=saved&size=all', note='«Устно — ожидание»: сессия, подмена речи speech=correct')
put('cards-section-041', ['wait:3000', 'xy:540,1324'], 'cards=demo&plus=on&speech=correct', '/flashcards_speaking_session?deck=saved&size=all', note='«Устно»: микрофон нажат — запись идёт')
put('cards-079', ['wait:3000', 'tap:#fc-speak-pick-decks-empty'], 'cards=demo&plus=on&speech=correct', '/flashcards_speaking_session?deck=custom&size=all', note='шторка выбора наборов «Что говорим?» (кнопка fc-speak-pick-decks-empty)')
put('cards-gap-023', ['tap:#fc-saved-actions', 'tap:#fc-saved-content-phrase', 'tap:#fc-menu-filter'], 'cards=demo_lessons&plus=on', '/flashcards_collection?cat=saved', note='фильтр по уроку: меню «⋯» → «Фразы» → «Фильтр» (выбрано «Все»)')


# ── Ядро 12.10, пункты после партии 2 (5b1caa8ee, faa66282b)
# cards-072: черновик нового набора «В аэропорту» (12 карточек, в сообщество) + публикация не удалась без сети (packdraft=on + fail=publish_error); без fresh
put('cards-072', ['tap:#ugc-pack-save', 'wait:600'], 'plus=on&packdraft=on&fail=publish_error', '/community_pack_create', note='создание набора: черновик «В аэропорту» (12 карточек), тост «Набор сохранён на устройстве. Публикация не завершена…» (packdraft=on + fail=publish_error)')

# ── Диалоги: голос вместо микрофона устройства (speech=… как в Карточках); сессия — подставной старт dev_dialog_send=ok
from dev_links_r1_steps import DLG, DLG_START  # noqa: E402
DLG_VOICE = 'plus=off&dquota=reset&energy=5&dev_dialog_send=ok'
HOLD_VOICE = 'long:#dialogue-v2-voice-input'
put('dialogs-026', DLG_START + [HOLD_VOICE, 'wait:800'], DLG_VOICE + '&speech=correct', DLG, note='голосовой ввод: распознано — текст встаёт в поле (speech=correct; удержание микрофона 1,5 с)')
put('dialogs-028', DLG_START + [HOLD_VOICE, 'wait:600'], DLG_VOICE + '&speech=denied', DLG, unique=False, note='«Нет доступа к микрофону» (speech=denied → dialogue-v2-session-voice-hint); часть образца «попытки кончились + PLUS» в коде отсутствует — строка blocked')
put('dialogs-gap-014', DLG_START + [HOLD_VOICE, 'wait:800', 'tap:#dialogue-v2-session-send', 'wait:600'], DLG_VOICE + '&speech=correct', DLG, note='голосовое сообщение в ленте: распознано и отправлено (speech=correct)')
put('dialogs-024', DLG_START + [HOLD_VOICE], DLG_VOICE + '&speech=correct', DLG, unique=False, note='«Готовлю микрофон…» — снимать во время удержания (шаг long держит 1,5 с; снять кадр в удержании робот не умеет — нужен hold-режим Ядра)')
put('dialogs-025', DLG_START + [HOLD_VOICE], DLG_VOICE + '&speech=correct', DLG, unique=False, note='«Говори…» — запись идёт (статус recording во время удержания; нужен hold-режим Ядра)')
put('dialogs-027', DLG_START + [HOLD_VOICE, 'wait:800'], DLG_VOICE + '&speech=no_speech', DLG, unique=False, note='«Ошибка распознавания» (speech=no_speech; соответствие образцу проверить глазами)')

# зачем (кадр cards-v2-047 7:02, «Мои наборы» вместо экрана создания): у Free лимит своих наборов 3/3 — экран создания показывает пилюлю 3/3 и «Безлимит с Plus»; cards=demo уже кладёт свои наборы, packdraft=on — черновик в форме. Соответствие пилюли «3/3» не проверено (число своих наборов в демо может быть другим)
put('cards-v2-047', ['wait:1500'], 'cards=demo&plus=off&packdraft=on', '/community_pack_create', unique=False, note='создание набора у Free: пилюля лимита «N/3» и «Безлимит с Plus» (cards=demo + packdraft=on); число своих наборов в демо не проверено')


# ── Ядро 12.10, c35b9f8ad: packdraft=few|full|private (создание набора), speech=hold|preparing (статус микрофона держится), cards-061, cards-gap-026/027
put('cards-069', ['tap:#ugc-pack-save', 'wait:600'], 'plus=on&packdraft=few', '/community_pack_create', note='создание набора: «Минимум 10 карточек» (packdraft=few → тап «Сохранить»)')
put('cards-071', ['tap:#ugc-pack-add-card', 'wait:600'], 'plus=on&packdraft=full', '/community_pack_create', note='создание набора: окно лимита «Карточек уже 50» (packdraft=full → тап «+ Карточка»)')
put('cards-073', ['tap:#ugc-pack-save', 'wait:600'], 'plus=on&packdraft=private', '/community_pack_create', note='создание набора: «Набор сохранён» (packdraft=private, без публикации, сервер не трогается)')
put('cards-gap-027', ['tap:#fc-pack-menu', 'tap:#fc-pack-publish'], 'cards=demo&plus=on', '/flashcards_collection?pack=local_pack_dev_demo_work', note='публикация: «не хватает данных» — у демо-набора нет описания, отказ приходит до сети (local_pack_dev_demo_* в dev не публикуется никогда)')
put('cards-gap-026', ['tap:#fc-pack-menu', 'tap:#fc-pack-publish'], 'cards=demo&plus=on&fail=publish_daily_limit', '/flashcards_collection?pack=local_pack_dev_demo_work', note='публикация: суточный лимит (fail=publish_daily_limit)')
put('cards-061', ['tap:#fc-editor-description', 'wait:400'], 'cards=demo&plus=on', '/flashcards_card_editor?create=1&cat=custom', note='редактор новой карточки: поле заметки в фокусе (заметка в редакторе теперь всегда открыта; «раскрыта» = фокус)')
put('dialogs-024', DLG_START + [HOLD_VOICE, 'wait:400'], DLG_VOICE + '&speech=preparing', DLG, note='«Готовлю микрофон…» (speech=preparing держит статус после отпускания; снять — speech=off)')
put('dialogs-025', DLG_START + [HOLD_VOICE, 'wait:400'], DLG_VOICE + '&speech=hold', DLG, note='«Говори…» (speech=hold держит запись после отпускания; снять — speech=off)')

# ── cards-041 (кадр 7:59): долгое нажатие в «Моих наборах» открывало ДРУГУЮ шторку (Тренировать/Изменить/Открыть сообществу/Удалить набор) над списком;
# зачем: образец cards-v2 №17 «Действия с набором» — меню «⋮» на экране самого набора (Отправить в сообщество / Править набор / Новая карточка / Удалить набор)
put('cards-041', ['tap:#fc-pack-menu', 'wait:600'], 'cards=demo&plus=on', '/flashcards_collection?pack=local_pack_dev_demo_travel', note='«Действия с набором»: меню «⋮» на экране набора «Путешествия» (fc-pack-menu); прежняя ссылка открывала шторку «Моих наборов»')
