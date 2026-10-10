# Task packet: доказательства для статусов реестра паритета (18 строк «не требуют макета») — запрос координатора 02:25

Governance-ID: TG-877A36F0C6A4
Status: In progress
Owner: сессия «2 · Дизайн»
Related epic/enabler: OWNER_MOCKUP_NEEDED_2026-10-10.md; parity-registry-triage-2026-10-10.md

## Outcome

По каждой из 11 строк, которые координатор не проставил, — точное решение владельца (ID в 03_DECISIONS.md) или честное «решения нет, это факт кода». Две мои прежние позиции оказались неверными — исправлены ниже.

## Scope

In scope: документ-вердикт, правка `OWNER_MOCKUP_NEEDED_2026-10-10.md` (строки 036–038 переезжают в список «нужен макет»). Out of scope: правка реестра (статусы ставит координатор), код приложения.

## Architecture

Источники: `03_DECISIONS.md`, `STATE_CHECKLIST_2026-09-30.md`, `git grep` по app/components/modules/hooks, коммит 33636dd55.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: исправляется ошибочный вывод «уведомлений открытия нет».

## Verification

`git grep` по именам компонентов и строкам копии; чтение кода `app/lesson_complete.tsx`, `components/paywall/PaywallPlusScreen.tsx`.

## Rollback

`git revert`.

## Вердикты

| Строки | Что предлагаю | Основание |
|---|---|---|
| `paywall-review-000` («Два пейвола» — шапка страницы-галереи) | `removed_by_owner`, **D115** | D115: «Единственный пейвол Plus… пейволы A–G удаляются». Страницы `paywall-review.html` в `docs/design/v2-app/` больше нет (`ls` — пусто), строка — заголовок галереи двух пейволов, которой нет |
| `overlays-specialist-030…035` («Задание «Сегодня»»: в процессе / готово / получение / получено / срок вышел / ошибка) | `removed_by_owner`, **D140** (не «D136–D140» целиком) | D140: «Квесты и коллекции — убрать оба». Это окно заданий `QuestSheetModal` / `QuestTaskCard`, удалены коммитом `33636dd55` («D136-D140 удаление квестов…»). `git grep QuestSheetModal\|QuestTaskCard` по app/components/modules — 0 совпадений. **Не путать с карточкой «Сегодня» на Главной** — она жива (D144: «Мои ошибки» строкой в карточке «Сегодня»), это другой экран; D136 — про MAX, к квестам отношения не имеет |
| `overlays-runtime-024` (баннер ответа на жалобу) | уже `removed` в реестре; основание — **Q92** (INBOX_COORDINATOR_FROM_CORE:647, «ReportReplyHomeBanner … удалить, если grep подтверждает 0 импортов») | `git grep ReportReplyHomeBanner` — 0. ID `D…` в 03_DECISIONS.md у Q92 нет — это ответ владельца в сессии «Ядро» от 01.10; если нужен D-номер, его заводит координатор |
| `paywalls-017` («Уход с пейволла») | **НЕ `removed_by_owner`**. Предлагаю `no_release_surface`. **Моя прежняя ссылка «D115 — перехвата нет» неверна** | В D115 нет ни слова про перехват на выходе. Факт кода: `PaywallPlusScreen.tsx:64` передаёт `disableExitOffer: true`, значит оффер выхода никогда не показывается; код оффера в `usePaywallPurchase` (`paywall_purchase.ts` ~1402–1445) живой, но недостижим. Сторож Ядра `paywall_exit_offer_themed_modal_contract` (INBOX_COORDINATOR_FROM_CORE:771) подтверждает: «единый экран выключает оффер выхода; включат — обязан рисоваться ThemedConfirmModal». Решения владельца отдельным ID нет |
| `overlays-specialist-036…038` («Открыт следующий урок / экзамен уровня / экзамен Lingman») | **НЕ закрывать. Моё «такой фичи нет» неверно — исправлено** | Окно есть: `app/lesson_complete.tsx` ~293–420, `NotifKind = 'lesson_unlock' \| 'level_exam_unlock' \| 'lingman_exam_unlock'`, заголовки «Новый урок открыт», «Экзамен уровня открыт», «Экзамен Lingman открыт» (9 языков), стеклянная основа, «Поделиться» + «Отлично!». В реестре `code: []`, а строки искались по тексту «Открыт следующий урок/экзамен» — формулировка отличается, поэтому поиск промахнулся. Макета нет (`overlays-specialist.html` в `docs/design/v2-app/` отсутствует; в комментарии кода он назван эталоном 29–30.09). Это три **видимых пользователю** окна без макета → в список «нужен макет» (`OWNER_MOCKUP_NEEDED`, группа 10) и привязать `code: app/lesson_complete.tsx` |

**Итог для координатора:** из 11 нерасставленных строк под `removed_by_owner` годятся 7 (`paywall-review-000` → D115; `overlays-specialist-030…035` → D140). `overlays-runtime-024` уже `removed` (Q92). `paywalls-017` — `no_release_surface` без ID решения. `036…038` — остаются `no_mockup`, в списке для владельца: число состояний без макета 91 → **94**, закрываемых без макета 18 → **15**.
