# Подмены Ядра для съёмки R1 — «id → подмена → ссылка»

Ядро, 12.10. Задание координатора: строки реестра `triage.coverage ∈ {core_switch, manual_conditional}` (+ список дыр
Макетов и Авторизации) — открыть каждую ОДНОЙ ссылкой, без ручных шагов и без записи в прод. Все подмены — только
память процесса, в стор-сборке заглушки (`scripts/store_release_stubs_gate.mjs`). Проверено по коду; на эмуляторе —
первой серией Сверки (упавшие вернуть Ядру с журналом `[DEV-STATE]`).

Ссылки ниже — без префикса `phraseman://dev_state?`. Тексты шагов `tap:Текст` — для русского интерфейса.
Перед каждой ссылкой, как обычно: `force-stop` → ссылка → «DEV-STATE OK».

## Партия 1 — коммит 7a79d3519

### Новые параметры

| Параметр | Что делает | Где читается |
|---|---|---|
| `support=sent` | «Обращение отправлено» без отправки и очереди | `support_report_outbox.ts` |
| `manage=loading` | скелетон «Управления подпиской» держится, магазин не грузится | `manage_subscription.tsx` |
| `started=en,es` | начатые языки в памяти поверх сохранённого списка (шторка языка без мини-онбординга) | `study_languages.ts` |
| `upsell=first_lesson\|three_lessons` | мягкое предложение Plus на итоге урока без кулдауна; показ/закрытие ничего не пишут | `lesson_complete.tsx` |
| `ai_explain=limit` | карточка ИИ-разбора ошибки сразу «лимит дня», без сервера | `use_mistake_explain.ts` |
| `dev_dialog_end=on` | подставной ход (`dev_dialog_send=ok`) завершает диалог | `dialogue_v2_turn_coaching_client.ts` |
| `dev_dialog_better=on` | в разборе подставного хода «Лучше так» | то же |
| `dev_dialog_completion=clean\|errors\|loading\|unavailable` | итог диалога без сервера; блок отзыва без троттлинга | `dialogue_v2_completion_client.ts`, `dialogue_v2_completion.tsx` |
| `promo=hold` | «Активируем…» у промокода, ответа нет | `promo_code_client.ts` |
| код друга `DEVFND` | найденный профиль «Алиса» без сервера; заявка ему не уходит в сеть | `(tabs)/friends.tsx` |
| код друга `DEVUNS` | «Профиль найден, но не синхронизирован». **Был сломан:** поле режет ввод до 6 знаков, а сравнивалось с `DEVUNSYNCED` — не срабатывал никогда. Теперь сравнение по первым шести, старый шаг `type:DEVUNSYNCED` тоже работает | `(tabs)/friends.tsx` |

`B` для Диалогов = `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&coinRank=6&aiConsent=granted&overlays=off`.
`E` (вход в сессию) = `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000`.
`F` (Друзья) = `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community`,
шаг поиска `S(code)` = `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:<code>; tap:#friends-search; wait:1000`.

### Строки

| id | подмена | ссылка | шаги |
|---|---|---|---|
| settings-gap-023 | support=sent | `onboarding=done&intros=seen&support=sent&overlays=off&next=/support_report` | ввести текст, тап «Отправить» |
| paywalls-020 = profile-019 | manage=loading | `onboarding=done&intros=seen&plus=on&plan=yearly&manage=loading&overlays=off&next=/manage_subscription` | — |
| settings-gap-020 | started | `onboarding=done&intros=seen&plus=off&studyTarget=en&started=en,es&overlays=off&next=/(tabs)/settings` | `tap:#settings-study-language-row; wait:700; tap:#study-language-option-es; wait:700` (тост «Теперь учишь…») |
| settings-gap-021 | started + studyfail | `onboarding=done&intros=seen&plus=off&studyTarget=es&started=en,es&studyfail=on&overlays=off&next=/(tabs)/settings` | `tap:#settings-study-language-row; wait:700; tap:#study-language-option-en; wait:700` |
| paywalls-009 | upsell=first_lesson | `onboarding=done&intros=seen&plus=off&upsell=first_lesson&overlays=off&next=/lesson_complete?id=1%26passed=1` | дождаться конца анимации наград |
| paywalls-010 | upsell=three_lessons | то же с `upsell=three_lessons` | — |
| paywalls-008 | ai_explain=limit | `onboarding=done&intros=seen&plus=off&aiConsent=granted&ai_explain=limit&overlays=off&next=<урок>` | ошибиться в задании → карточка `ai-mistake-limit-card` |
| dialogs-033 | dialogs_paused (было) | `B&dev_dialog_send=ok&dialogs_paused=1&next=/ai_dialog_home` | `E; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:1200`. **В старой ссылке не было `dev_dialog_send=ok` — старт сессии уходил в прод** |
| dialogs-gap-016 | dev_dialog_fail=service (было) | `B&dev_dialog_send=ok&dev_dialog_fail=service&next=/ai_dialog_home` | как dialogs-033, `wait:700`, снимать сразу (тост «Энергия возвращена»). Старая ссылка вела на кадр gap-017 |
| dialogs-021 | dev_dialog_better | `B&dev_dialog_send=ok&dev_dialog_better=on&next=/ai_dialog_home` | `E; …send; wait:2500` |
| dialogs-037 | dev_dialog_end | `B&dev_dialog_send=ok&dev_dialog_end=on&next=/ai_dialog_home` | `E; …send; wait:2500` → `dialogue-v2-session-end-veil` |
| dialogs-040 / 044 | dev_dialog_completion=clean\|errors | `B&dev_dialog_send=ok&dev_dialog_completion=errors&next=/ai_dialog_home` | `E; …send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500` |
| dialogs-042 | completion + отзыв | как 040 с `clean` | + `tap:#dialogue-v2-completion-feedback-header; tap:#dialogue-v2-completion-feedback-star-4` (отправку не жать) |
| dialogs-gap-007 / 008 | completion=loading / unavailable | как 040 | — |
| community-009/017…019 | DEVFND | `F` | `S(DEVFND)` → карточка найденного |
| community-010 | DEVFND + `dev_friends_hold=add_request` | `F&dev_friends_hold=add_request` | `S(DEVFND); tap:#friends-add-found; wait:500` ⚠ карточка скрывается в тот же тик — кадр совпадает с 017 (решение координатора) |
| community-011 | DEVFND + `dev_friends_fail=add` | `F&dev_friends_fail=add` | `S(DEVFND); tap:#friends-add-found; wait:800` |
| community-014 | DEVUNS | `F` | `S(DEVUNS)`, `wait:1500` |
| community-016 | `dev_friends_fail=search` (было) | `F&dev_friends_fail=search` | `S(ZZ99)`, `wait:1500` |
| community-022 | `friend_event=study_invite` (было) | `F&friend_event=study_invite` | `wait:800` → `friend-study-invite-modal` (кнопки не жать) |
| settings-gap-006 | `vip=admin_lifetime` (было) | ссылка из DEV_LINKS верна; в реестре неверное имя `admin_pro_lifetime` | — |
| overlays-campaigns-006 | promo=hold | `onboarding=done&intros=seen&plus=off&promo=hold&overlays=off&next=/promo_code_entry` | `tap:#promo-code-input; type:TESTCODE; back; tap:#promo-code-submit; wait:400` |

### Онбординг и вход — по коду, ссылки (подмены уже есть)

Передано Авторизации (их шаги в `dev_links_r1_steps_auth.py`, частично уже в HEAD ab8c2c3ad):
- **onboarding-006**: `auth=none` + welcome + `tap:#onboarding-existing-account` (Макеты, 086ec6ff3).
- **onboarding-010**: имя из 28 знаков в макете невозможно — приложение режет до 24 (`firstNameOf`). Решение координатора.
- **onboarding-025 / onboarding-paywall-001**: `onbstep=onboardingPaywall&paywall=loading|live` — готово. Но в макете №23
  цены в рублях, `live` даёт евро — нужно решение (`paywall=live_rub` или правка макета).
- **auth-gap-004/005/008/014/015**: ссылки из DEV_LINKS верны. **012/013/016/017/018**: шаги поправлены Авторизацией.
- **onboarding-003/004/008, auth-gap-011**: нужны `signin=hold|offline|generic` и `delete=throw` — спецификация
  у Авторизации, ждёт «да» координатора. Важно: `describeAuthError` в dev дописывает код второй строкой — без правки кадр не совпадёт.

### Нельзя по коду (решение координатора)

- ~~**dialogs-028** «попытки кончились + PLUS»~~ — сделано 12.10 (D165: лимит голоса Free 3/день, бейдж PLUS); ссылка в таблице ниже.
- **community-010** «Отправляем заявку…»: подпись мёртвая, карточка скрывается в тот же тик.

## Партия 2 — Карточки (коммит ae44078f4 + дополнение)

### Новые параметры

| Параметр | Что делает |
|---|---|
| `packcards=on` | **сообщество без сети**: демо-наборы с карточками и метой в памяти + тот же каталог. Для `dev_demo_*` / `video_devDemo*` сеть не вызывается вообще — ни чтение, ни запись (лайк, «Добавить себе», отклик, жалоба в прод не уходят) |
| `packcards=meta` | мета наборов есть, карточек нет (cards-044 «Набор ещё не скачан») |
| `packcards=off` / `community=off` | режим без карточек / выключить режим |
| `community=reset` | забыть «добавленное», лайки, отправленные отклики (память живёт до перезапуска — ставить в каждую ссылку) |
| `community=added` | наборы 2, 1, 3 уже «добавлены» (в «Моих наборах») |
| `comments=demo\|empty` | ветка откликов: 3 отклика (`dev_demo_cm_1` закреплён автором) / пусто |
| `hold=comment_send` / `fail=comment_send` | отклик «отправляется» (висит) / «не отправлен»; без них — «отправлен» в память |
| `fail=report_send` | жалоба на демо-набор/отклик «не отправилась»; без него — «отправлена» (без сети и троттлинга) |
| `fail=pack_like` | лайк не прошёл: откат сердца + тост |
| `fail=publish_error` | «Не удалось отправить набор на публикацию» без сети |
| `fail=pack_remove_min\|pack_remove_net` | удаление карточки опубликованного набора: «минимум 10» / «нет связи» |
| `fail=video_open` | «Видео сейчас не открывается» без браузера |
| `voices=demo\|none` | голоса озвучки как на образце (Samantha/Daniel/Karen/Moira) / пусто |
| `hold=swipe_quickstart` | **починен:** теперь реально держит «Готовим тренировку…» (автозапуск его не читал) |

Демо-наборы: `dev_demo_community_2` = «B2 глаголы» · Ирина · 49 · B2 (Convince, Claim, Afford, Borrow, Deserve…);
`dev_demo_published_own` = «Мой опубликованный» (автор — ты; нужен `cards=demo_published`, только гость);
`video_devDemoVid0` = «Заказ в кафе» (ролик). testID плиток: `fc-gallery-tile-<packId>_c1…`.
Поле отклика получило `testID="pack-comment-input"`.

`B` = `onboarding=done&intros=seen&overlays=off&studyTarget=en`. `P2` = `B&packcards=on&community=reset&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1`.

### Строки

| id | ссылка | шаги |
|---|---|---|
| cards-018 = section-013 = v2-015 | `P2` | — (чужой набор до добавления) |
| cards-019 = section-014 = v2-016 | `P2` | `tap:#pack-add-dev_demo_community_2` |
| cards-gap-032 | `P2` | `tap:#pack-like-dev_demo_community_2` (тост «сначала добавь») |
| cards-050 | `P2` | `tap:#pack-add-dev_demo_community_2; tap:#pack-like-dev_demo_community_2` |
| cards-gap-033 | `P2&fail=pack_like` | `tap:#pack-add-dev_demo_community_2; tap:#pack-like-dev_demo_community_2` |
| cards-section-018 | `P2` | `tap:#pack-add-dev_demo_community_2; tap:#fc-gallery-tile-dev_demo_community_2_c1` |
| cards-051 | `P2&comments=empty` | `tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2` («Пока тихо») |
| cards-052 | `P2&comments=demo` | `tap:#pack-comments-dev_demo_community_2` (до добавления — `pack-comments-write-locked`) |
| cards-054 (отправлен) | `P2&comments=demo` | `tap:#pack-add-…; tap:#pack-comments-…; tap:#pack-comment-input; type:Thanks; tap:#pack-comment-send; wait:600` |
| cards-054 (отправляется) | `P2&comments=demo&hold=comment_send` | то же |
| cards-056 (не отправлен) | `P2&comments=demo&fail=comment_send` | то же |
| cards-055 | `P2&comments=demo` | `tap:#pack-add-…; tap:#pack-comments-…; tap:#pack-comment-more-dev_demo_cm_2` (меню чужого) |
| cards-057 | как 055 | + `tap:Пожаловаться` → `report-comment-sheet` |
| cards-058/059 (жалоба отправлена) | как 055 | + `tap:Пожаловаться; tap:Спам или реклама; tap:Отправить жалобу; wait:600`; «не отправилась» — `&fail=report_send` |
| cards-053 (меню автора) | `B&cards=demo_published&plus=on&packcards=on&comments=demo&next=/flashcards_collection?pack=dev_demo_published_own%26openComments=1` | `tap:#pack-comment-more-dev_demo_cm_2` (пункты не жать — но и они без сети) |
| cards-gap-029 | `B&cards=demo_published&plus=on&packcards=on&fail=pack_remove_min&next=/flashcards_collection?pack=dev_demo_published_own` | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-delete; wait:5800` |
| cards-gap-031 | то же с `fail=pack_remove_net` | то же |
| cards-gap-039 | `B&cards=demo_published&plus=on&packcards=on&next=/flashcards_collection?pack=dev_demo_published_own` | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-to-pack` |
| cards-044 | `B&packcards=meta&community=added&next=/flashcards_my_packs` | `tap:#fc-my-packs-pack-dev_demo_community_2; wait:5200` (тост «не скачан») |
| cards-043 = section-030 = v2-019 | `B&packcards=on&community=reset&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` | — |
| cards-section-031 = v2-053 | как 043 | `tap:#pack-add-video_devDemoVid0` |
| cards-082 | как 043 + `&fail=video_open` | `tap:#video-set-hero` |
| cards-gap-003 | `B&cards=demo&plus=on&hold=swipe_quickstart&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all` | — |
| cards-gap-028 | `B&cards=demo&plus=on&fail=publish_error&next=/flashcards_collection?pack=local_pack_dev_demo_work` | `tap:#fc-pack-menu; tap:#fc-pack-publish` |
| cards-gap-036 | `B&plus=on&voices=demo&next=/flashcards_voice_picker` | `tap:#fc-voice-row-dev_voice_samantha` |
| cards-gap-038 | `B&plus=on&voices=none&next=/flashcards_voice_picker` | — |
| cards-042 | `B&cards=demo_published&plus=on&next=/community_pack_create?packId=dev_demo_published_own` | — (редактор, образец №23) |
| cards-049 | `B&cards=demo_published&plus=on&next=/flashcards_packs` | **без `catalog=demo`** — он стирал «Мой опубликованный» |
| cards-section-040 = v2-032 | `B&cards=demo&plus=on&speech=correct&next=/flashcards_speaking_session?deck=saved%26size=all` | — |
| cards-section-041 | как 040 | `tap:#fc-speak-mic` (запись идёт) |
| cards-079 | `B&cards=demo&plus=on&speech=correct&next=/flashcards_speaking_session?deck=custom%26size=all` | `tap:#fc-speak-pick-decks-empty` |
| cards-gap-023 | `B&cards=demo_lessons&plus=on&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:#fc-saved-content-phrase; tap:#fc-menu-filter` |
| cards-gap-022 | `B&cards=demo&plus=on&fail=pack_write&next=/flashcards_collection?cat=saved` | `tap:Layover; tap:#fc-expanded-to-pack; tap:#fc-expanded-pack-local_pack_dev_demo_work` |
| cards-gap-035 | `B&catalog=demo&fail=pack_write&next=/flashcards_packs` | `long:#flashcards-pack-card-dev_demo_community_1; tap:#flashcards-pack-add` |

Готовые без изменений (отметка в реестре устарела, Макеты перевели в ready): cards-077, gap-009, gap-005, gap-024, section-046.

## Партия 3 — создание набора, голос и память Диалогов, каталог без сети, уроки (12.10 вечер)

Коммиты: 5b1caa8ee, faa66282b, c35b9f8ad, b25cab943, dfeeb913e, 25775d555, d92d65410.

### Новые параметры

| Параметр | Что делает |
|---|---|
| `packdraft=on\|few\|full\|private` | «Новый набор» с черновиком из памяти: 12 в сообщество / 4 / 50 / 12 без публикации |
| `speech=correct\|wrong\|denied\|no_speech` (Диалоги) | голос в Диалогах без микрофона: удержание — «запись», отпускание — текст в поле и черновик голосового |
| `speech=hold\|preparing` | «Говори…» / «Готовлю микрофон…» держится после отпускания (Диалоги и «Устно») |
| `dev_dialog_memory=demo\|clearing\|clear_fail` | «Память диалогов» из памяти процесса; очистка — успешна в памяти / висит / не удалась. Настоящая память не трогается |
| `dev_dialog_send=ok` для свободного разговора | старт сессии и ответ без сервера (**прежняя ссылка dialogs-045 создавала настоящую сессию на проде**) |
| `dev_dialog_fail=service` для свободного разговора | «не удалось продолжить» |
| `fail=catalog_load` (+ `catalog=empty`) | каталог сообщества «Нет сети» без авиарежима |
| урок: `lesson1-word-option-wrong` | в dev первый неверный вариант слова помечен — ошибка одним шагом |

Предохранители и починки: демо-наборы `local_pack_dev_demo_*` в dev никогда не уходят на сервер публикации; при подменённой
речи распознаватель эмулятора не нужен; testID: `dialogue-v2-freeform-input` / `-send`; окно очистки памяти — префикс
`dialogue-v2-memory-clear-dialog` (кнопка окна `…-dialog-confirm`; раньше совпадала с кнопкой экрана `dialogue-v2-memory-clear-confirm`).

### Строки (`B` = `onboarding=done&intros=seen&overlays=off&studyTarget=en`, `E` — вход в сессию Диалога, см. партию 1)

| id | ссылка | шаги |
|---|---|---|
| cards-069 | `B&plus=on&packdraft=few&next=/community_pack_create` | `tap:#ugc-pack-save` (тост «Минимум 10») |
| cards-071 | `B&plus=on&packdraft=full&next=/community_pack_create` | `tap:#ugc-pack-add-card` (окно лимита) |
| cards-072 | `B&plus=on&packdraft=on&fail=publish_error&next=/community_pack_create` | `tap:#ugc-pack-save` |
| cards-073 | `B&plus=on&packdraft=private&next=/community_pack_create` | `tap:#ugc-pack-save` («Набор сохранён») |
| cards-gap-027 | `B&cards=demo&plus=on&next=/flashcards_collection?pack=local_pack_dev_demo_work` | `tap:#fc-pack-menu; tap:#fc-pack-publish` |
| cards-gap-026 | то же `&fail=publish_daily_limit` | то же |
| cards-061 | `B&cards=demo&plus=on&next=/flashcards_card_editor?create=1%26cat=custom` | `tap:#fc-editor-description` (заметка теперь всегда открыта) |
| cards-v2-044 = section-029 | `B&catalog=empty&fail=catalog_load&next=/flashcards_packs` | — (в коде «Нет сети»+«Повторить», в образце №44 «Сейчас недоступно…» — расхождение образец≠код) |
| dialogs-024/025 | `B&dev_dialog_send=ok&speech=hold\|preparing&next=/ai_dialog_home` | `E; long:#dialogue-v2-voice-input; wait:400` |
| dialogs-026 | `…&speech=correct…` | `E; long:#dialogue-v2-voice-input; wait:800` |
| dialogs-028 (часть «нет доступа») | `…&speech=denied…` | `E; long:#dialogue-v2-voice-input; wait:600` |
| dialogs-028 (целиком: нет доступа + PLUS на микрофоне, D165) | `B&dev_dialog_send=ok&speech=denied&dev_dialog_voice=spent&next=/ai_dialog_home` | `E; wait:600` — бейдж PLUS виден сразу; НЕ жать микрофон (тап ведёт в пейвол Plus); для «нет доступа» без бейджа — строка выше |
| dialogs-gap-014 | `…&speech=correct…` | `E; long:#dialogue-v2-voice-input; wait:800; tap:#dialogue-v2-session-send; wait:600` |
| dialogs-gap-001 | `B&plus=on&dev_dialog_memory=demo&next=/dialogue_v2_memory` | — |
| dialogs-gap-004 | то же | `tap:#dialogue-v2-memory-clear-confirm` (окно) |
| dialogs-gap-005 / 006 | `dev_dialog_memory=clearing` / `clear_fail` | `tap:#dialogue-v2-memory-clear-confirm; tap:#dialogue-v2-memory-clear-dialog-confirm` |
| dialogs-045 | `B&plus=on&dev_dialog_send=ok&next=/dialogue_v2_freeform` | — |
| dialogs-046 | то же | `tap:#dialogue-v2-freeform-input; type:Hello; tap:#dialogue-v2-freeform-send; wait:300` (идёт ответ) |
| dialogs-gap-011 | `B&plus=on&dev_dialog_fail=service&next=/dialogue_v2_freeform` | — |
| energy-modes-001/003 | `B&plus=off&free=on&mode=b&energy=5\|1&next=/lesson_menu?id=1` | `tap:#lesson-menu-primary; wait:2500` |
| energy-modes-002 | `…&mode=b&energy=5…` | `tap:#lesson-menu-primary; wait:2500; tap:#lesson1-word-option-wrong; wait:300` (тряска, «−1») |
| energy-modes-004 | `…&mode=b&energy=1…` | `tap:#lesson-menu-primary; wait:2500; tap:#lesson1-word-option-wrong; wait:1500` (остановка) |
| energy-modes-016 | `…&mode=a&energy=5…` | `tap:#lesson-menu-primary; wait:2500; tap:#lesson1-word-option-wrong; wait:300` |

energy-modes: не проверено, есть ли у урока 1 перед первым заданием экран знакомства — проверить первой серией.
005 (шторка Plus на остановке), 006 (после покупки), 007/008 (нет энергии / восстановилась), 011 (Learning V2 — зона Codex),
012–014 — следующей партией после первых кадров.

**Итоги разбора журналов (12.10):** cards-v2-015 — подмена верна (49 карточек пришли через ~1,7 с; снимок был раньше) →
`wait:2500`; cards-section-041 — дефект не подтвердился.

## Партия 4 — Карточки (хвосты), энергия в уроках (12.10 поздний вечер)

Коммит: d0c04fbfd (`cards=demo_nopacks`). Сторож ссылок: 69a4230ba (`tests/dev_links_r1_prod_write_guard.test.mjs`).

`L` = `onboarding=done&intros=seen&overlays=off&studyTarget=en&plus=off&free=on` · урок: `next=/lesson_menu?id=1`, шаги
входа `tap:#lesson-menu-primary; wait:2500`, ошибка — `tap:#lesson1-word-option-wrong`.

| id | ссылка | шаги |
|---|---|---|
| cards-gap-019 | `B&cards=demo_nopacks&plus=on&next=/flashcards_collection?cat=saved` | `tap:Layover; tap:#fc-expanded-to-pack` («своих наборов пока нет»). Только гость |
| cards-gap-040 | `B&cards=demo&plus=off&free=on&mode=a&energy=5&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | — (флаг `energy_mistake_charge` выкл. = `mode=a`: пилюля энергии вместо сердец) |
| energy-modes-005 | `L&mode=b&energy=1&next=/lesson_menu?id=1` | вход; ошибка; `wait:1500; tap:#energy-stop-plus; wait:1200` |
| energy-modes-007 | `L&mode=b&energy=0&next=/lesson_menu?id=1` | `tap:#lesson-menu-primary; wait:1500` → `energy-needed-sheet` |
| energy-modes-012 | `B&cards=demo&plus=off&free=on&mode=b&energy=5&blitz_answer=wrong&next=/flashcards_blitz_session?deck=saved%26sec=60` | `wait:4000; await:#fc-blitz-opt-target; tap:#fc-blitz-opt-target; wait:300` (−1 энергия, сердец нет) |
| energy-modes-013 | `B&plus=off&mode=b&energy=5&dquota=reset&coinRank=6&aiConsent=granted&dev_dialog_send=ok&next=/ai_dialog_home` | `E; tap:#dialogue-v2-session-input; type:I goed home; tap:#dialogue-v2-session-send; wait:2500` (пилюля не меняется) |
| energy-modes-014 | `B&plus=off&mode=b&energy=5&next=/(tabs)/home` | `tap:#home-v2-phrase-of-day; wait:800` (фраза дня энергию не тратит) |

**Не сделано — нужно решение координатора:**
- **energy-modes-006** «после покупки занятие продолжается»: покупка в dev невозможна. Вариант — dev-подмена «Plus выдан
  по кнопке шторки остановки» (`energy_stop=plus_granted`: тап `energy-stop-plus` ставит локальный Plus в памяти и закрывает
  шторку). Делать?
- **energy-modes-008** «энергия восстановилась»: какой кадр — таймер `energy-needed-timer` дошёл до нуля на шторке, или пилюля
  на Главной после восстановления? Без уточнения не подбираю.
- **energy-modes-009/010** (слова, неправильные глаголы) — ссылки у Макетов уже есть, ошибка там в другом виде задания; при
  нужде дам метку неверного ответа и для них.
- **energy-modes-011** — Learning V2, зона Codex.

## Партия 5 — энергия в уроках (коммит 990c22f61)

| Параметр | Что делает |
|---|---|
| `lessonintro=skip` | вступление урока считается показанным (только память) — робот сразу на первом задании |
| `energy_stop=plus_granted` | шторка остановки: «Продолжить с Plus» выдаёт Plus в памяти (без покупки/RevenueCat/записи) — занятие продолжается само |
| `energy=restoring&restore_in=N` | энергия 0, следующая единица через N с (1..600) |

Вход в урок — **прямой маршрут** `next=/lesson1?id=1%26from=lesson_menu` (меню урока после replace уводило на Главную — Макеты 12.10).
`U` = `onboarding=done&intros=seen&overlays=off&studyTarget=en&plus=off&free=on&lessonintro=skip&next=/lesson1?id=1%26from=lesson_menu`.

| id | ссылка | шаги |
|---|---|---|
| energy-modes-001 | `U&mode=b&energy=5` | `wait:2500` |
| energy-modes-002 | `U&mode=b&energy=5` | `wait:2500; tap:#lesson1-word-option-wrong; wait:300` |
| energy-modes-003 | `U&mode=b&energy=1` | `wait:2500` |
| energy-modes-004 | `U&mode=b&energy=1` | `wait:2500; tap:#lesson1-word-option-wrong; wait:1500` (`energy-stop-sheet`) |
| energy-modes-005 | `U&mode=b&energy=1` | как 004 + `tap:#energy-stop-plus; wait:1200` (пейвол поверх; кнопку покупки НЕ жать) |
| energy-modes-006 | `U&mode=b&energy=1&energy_stop=plus_granted` | как 004 + `tap:#energy-stop-plus; wait:1500` (тост «Plus активирован», занятие на том же вопросе) |
| energy-modes-015 / 016 | `U&mode=a&energy=5` | 015: `wait:2500`; 016: `wait:2500; tap:#lesson1-word-option-wrong; wait:300` |
| energy-modes-008 | `onboarding=done&intros=seen&overlays=off&studyTarget=en&plus=off&free=on&mode=b&energy=restoring&restore_in=8&next=/lesson_menu?id=1` | `tap:#lesson-menu-primary; wait:1200` (шторка «Нужна энергия») → `tap:#energy-needed-wait; wait:7500` → тост «Энергия восстановилась» и «Начать» активна. Состав макета Б8 (список «Обучение» + тост + оживающая кнопка) — сверить по кадру; если меню снова уводит на Главную — прислать журнал `[ENERGY-NEEDED]`/`[LESSON-LOCK]` |

**Осталось:** settings-gap-012 (запрет уведомлений — экран освободился, следующий).

## Авторизация — Карточки и Друзья (manual_conditional, 12.10 ночь)

Подмены — только память процесса; сеть в подменённых ветках не вызывается; в стор-сборке — заглушки (гейт `store_release_stubs_gate.mjs` OK).
Сторож: `tests/aa_r1_switches_cards_friends.test.ts`.

### Новые параметры

| Параметр | Что делает | Где читается |
|---|---|---|
| `dev_friends_hold=search` | поиск друга держится в загрузке (скелетон), ответа нет | `(tabs)/friends.tsx` handleSearch |
| `dev_friends_fail=search_offline` | поиск — «Связь пропала / Проверь интернет…», сеть и журнал сбоев не вызываются | то же |
| `dev_friends_fail=list` | вкладка «Друзья»: пустое состояние «Связь пропала» (FriendsEmptyState error), без подписок Firestore, кэш вкладки не пишется | эффект списка друзей |
| код друга `DEVSLF` | «это твой код» (фраза из `friends_self_code_messages`, выбирается случайно) | handleSearch |
| `dailypoll=demo\|voted` | опрос дня из памяти: «Что помогает заниматься регулярно?» — «Короткие занятия» / «Занятия с друзьями»; голос — в памяти, `dailyPollVote` не вызывается | `daily_poll/daily_poll_client.ts` |
| `answer=correct\|wrong` | «Правда/ложь»: нужная кнопка получает testID `flashcards-truefalse-answer-target`; «Напиши»: порядок как в наборе, в поле вписан верный (первый вариант) или неверный ответ | `flashcards_swipe.tsx`, `flashcards_recall_session.tsx` |
| `fail=video_list` | «Из видео»: каталог не читается, пустой список + состояние ошибки | `flashcards_video_packs.tsx` |
| `cards=demo_few` | очистка + 3 сохранённые карточки без своих наборов (меньше минимума Блица 4) | `dev_state_cards_demo.ts` |
| маршрут `/dev_cards_result_preview?state=errors\|clean\|good\|grow` | экран итога тренировки на данных макета («Блиц · Путешествия», N из 20, 1:12, +N×10, ошибки Gate/Customs); тренировки нет, монеты не зачисляются, формы отзыва нет; вне dev — на Главную | новый маршрут |

`B` = `onboarding=done&intros=seen&overlays=off&studyTarget=en`. `F` — как в партии 1 (Друзья). `T(mode)` = `B&cards=demo&plus=on&next=/flashcards_training_setup?mode=<mode>`,
шаг старта `S` = `tap:#fc-training-setup-deck-saved; tap:#fc-training-setup-start; wait:2500`.

### Строки

| id | ссылка | шаги |
|---|---|---|
| cards-v2-041 = cards-section-053 = cards-section-054 | `B&next=/dev_cards_result_preview?state=errors` | `wait:1500` (счётчики) |
| cards-v2-042 = cards-section-055 | `B&next=/dev_cards_result_preview?state=clean` | `wait:1500` |
| cards-v2-051 | `B&next=/dev_cards_result_preview?state=good` | `wait:1500` |
| cards-v2-052 | `B&next=/dev_cards_result_preview?state=grow` | `wait:1500` |
| cards-v2-038 = cards-section-049 | `T(truefalse)&answer=wrong` | `S; tap:#flashcards-truefalse-answer-target; wait:600` (панель «Неверно») |
| cards-v2-039 = cards-section-050 | `T(recall)&answer=correct` | `S; tap:#fc-recall-check; wait:600` (панель «Верно» +10) |
| cards-026 | `B&cards=demo_few&plus=on&next=/flashcards_training_setup?mode=blitz` | `tap:#fc-training-setup-deck-saved; wait:500` (подсказка «Для блица нужно минимум 4 карточки.») |
| cards-030 | `B&cards=demo&fail=video_list&next=/flashcards_video_packs` | `wait:800` |
| community-008 | `F&dev_friends_hold=search` | `S(ZZ99)` (шаг поиска партии 1), снимать сразу |
| community-013 | `F` | `S(DEVSLF)`, `wait:800` |
| community-015 | `F&dev_friends_fail=search_offline` | `S(ZZ99)`, `wait:800` |
| community-021 | `F&dev_friends_fail=list` | `wait:1000` (подмена списка проверяется раньше `friends=demo` и побеждает) |
| community-023 | `F&dailypoll=demo` | `wait:1000` (карточка опроса над списком); с голосом — `dailypoll=voted` |

**Расхождения данных с макетом (не подмена, решать Макетам/Сверке):**
- «Правда/ложь» и «Напиши» берут первую карточку набора «Сохранённые» демо, а не Gate/таможня и задержка/delay из макета: порядок фиксирован, слово — из демо-данных.
- community-013: фраза «свой код» выбирается случайно из 5 (так в коде).
- community-023: ленты «Активность» в приложении нет — её удалил владелец 16.08 (friends.tsx). Есть только карточка опроса дня.
- Плашка баланса монет на итоге показывает настоящий баланс устройства, а не «1 240» из макета.

### Авторизация — дополнение: publish=ok и account=linked (12.10 ночь)

| Параметр | Что делает | Где читается |
|---|---|---|
| `publish=ok\|off` | `publishLocalAuthorPack` сразу возвращает «submitted» — без callable, без отметки набора на устройстве; тост «Набор отправлен на публикацию.» | `community_packs/publishLocalPack.ts` |
| `account=linked` | только на одноразовом госте (иначе ссылка обрывается целиком): привязка Google «Alex Demo / alex.demo@example.com» для показа; выход, смена, вход, удаление аккаунта отказывают первой строкой (до замков, синхронизации, стирания и сети) | `auth_provider.ts` (getLinkedAuthInfo, peekLinkedAuthFromCurrentUser, signOutAndWipeForAccountSwitch, signOutCurrentProvider, signInWithProvider, beginAccountDeletion) |

| id | ссылка | шаги |
|---|---|---|
| cards-gap-025 | `B&cards=demo&plus=on&publish=ok&next=/flashcards_collection?pack=local_pack_dev_demo_work` | `tap:#fc-pack-publish; wait:400` (тост «Набор отправлен на публикацию.») |
| settings-gap-001 | `onboarding=done&intros=seen&account=linked&plus=off&overlays=off&studyTarget=en&next=/(tabs)/settings` | `wait:1200` (строка аккаунта «привязан»; кнопки аккаунта не жать — они откажут) |
