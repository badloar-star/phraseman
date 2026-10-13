# Task packet: группа «ДЕВ» карточного среза по разбору Ядра — cards-section-029 + список на пересъёмку (13.10 ~15:45)

Governance-ID: TG-2701085182E9
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор DEV_LINKS); разбор — 1 · ЯДРО

## Outcome

**Правка строки (1) — cards-section-029 «Нет сети»:**
- `packdraft=none` — новая подмена Ядра «черновика нет», только память (`DEV_PACK_DRAFTS` в `app/dev_cards_state.ts`, коммит Ядра в окне 16:00). На телефоне робота остался настоящий черновик набора от прошлых кадров, и на кадре была лишняя строка «Продолжить создание набора».
- Шаги `wait:3000` → `await:#flashcards-community-empty-label; wait:300`. «Нет сети» появляется после окончания загрузки каталога (`FlashcardsCategoryHub.tsx`), а кадр снимали через 3 с, ещё на скелете. Строку `wait:3000` поставили Темы (86e845aee) — перекрывается ниже в errfix, их строка не правится.

**Только пересъёмка (6), ссылки уже верные, вердикты 12.10 17:22 сняты до подмен:**
- cards-053 и cards-057 — чужой набор `dev_demo_community_2` + `comments=demo`.
- cards-058 и cards-059 — жалоба на демо-набор и отклик: «sent» без сети (`user_report.ts devCommunityReportOutcome`).
- cards-071 — `packdraft=full`.
- community-002 — `/dev_spire_preview` на моках; вердикт «Шпиль выключен конфигом» относился к живой вкладке.

## Scope

In scope: `scripts/dev_links_r1_steps_errfix.py`, 1 строка `DEV_LINKS_R1.md`.
Out of scope: код приложения (подмена — у Ядра).

## Architecture

`set_param('cards-section-029', 'packdraft', 'none')` и `set_steps(...)` в конце errfix.

## Security and privacy

Подмена черновика — только память dev-сборки; каталог `fail=catalog_load` — без сети.

## Technical debt

- До коммита Ядра в 16:00 параметр `packdraft=none` приложение отклонит. Сверка снимает после 16:15.

## Verification

Сторож `dev_links_r1_prod_write_guard` зелёный; дифф — 1 строка.

## Rollback

`git revert` коммита.

## Дополнение: dialogs-024 (Макеты f64c751fc, 13.10 ~15:50)

Образец №25 — середина «Закажи кофе» после ответа: ряд действий и лампа у цели появляются только после хода (`dialogue_v2_session.tsx:429-436, 794`). Шаги робота: сначала текстовый ход (`Hello` → отправить, подставной ответ `dev_dialog_send=ok`), потом удержание микрофона → «Готовлю микрофон…» (`speech=preparing`).
