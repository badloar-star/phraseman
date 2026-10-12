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

- **dialogs-028** «попытки кончились + PLUS»: в коде нет голосовой квоты и значка PLUS на микрофоне — только в макете.
- **community-010** «Отправляем заявку…»: подпись мёртвая, карточка скрывается в тот же тик.

## Партия 2 — Карточки (в работе)

Готовы без новых переключателей (ссылки — Макетам): cards-077, gap-009, gap-022, gap-035, section-046, gap-005,
gap-024, gap-023, section-040/041, v2-032, cards-079, cards-042, cards-049, gap-032 (после cards-018). Важно для
cards-042/049: **убрать `catalog=demo`** — он идёт после `cards=demo_published` и стирает «Мой опубликованный» из каталога.
Новые подмены (демо-наборы сообщества в памяти, отклики, лайк, публикация, голоса, видео) — следующим коммитом.
