# Task packet: админка 2.0 — удалить из admin/v2/legacy.html всё, что 2.0 удалила

Governance-ID: TG-8F126EF7AACF
Status: In progress
Owner: сессия «программа 2.0 — админка» (FINAL_PHASE, пункт 8)
Related epic/enabler: FINAL_PHASE.md п.8; D54, D70, D74, D78, D83, D102, D108, D110, D126, D128

## Outcome

В единственной боевой админке (`admin/v2/legacy.html`) не остаётся экранов, кнопок, запросов и
обработчиков удалённых в 2.0 функций (турниры/Арена, лиги, жемчуг/осколки, косметика/ауры,
официальные наборы карточек, возврат покупки набора, квесты с наградами). Всё живое
(вход, Шпиль/пул заданий, рулетка, монеты/Plus, диалоги, видео, отчёты, Джарвис, модерация
наборов, визитка «Про» с очисткой подписи) работает как раньше. Инвентарь —
`docs/phraseman-2.0/evidence/ADMIN_2_0_CLEANUP.md`.

## Scope

In scope: `admin/v2/legacy.html` (разметка, CSS, JS-обработчики, карты вкладок); тесты в `tests/`,
которые сторожили удалённый UI (переписываются с `// зачем: D-номер`); три мелкие правки:
лимит документа видео 60 000, снятие пометки «ВЫКЛЮЧЕН В КОДЕ» у шага «Язык» (D126),
кнопка «Переозвучить» + бейдж `cardTts` у опубликованного набора (D128).

Out of scope: серверные функции (деплой — владелец, D91), `admin/v2/beta_testers.html`,
`admin/v2/tournament_pool.html`, ассеты аур; раздел MAX (законсервирован — оставлен, см. отчёт);
вход в админку (не трогается).

## Architecture

No architecture change: только вычитание мёртвого UI из одного статического файла и одна новая
кнопка, вызывающая уже экспортированную callable `adminCardTtsRequeuePack`.

## Security and privacy

Вход (`tr.claims.admin !== true`, `getIdTokenResult(true)`, `browserLocalPersistence`,
`getRedirectResult`) не трогается; сторож `scripts/guard_admin_login.mjs`. Новых данных не
собирается. App Check не вводится.

## Technical debt

- Pay now: мёртвые вкладки и обработчики удалённых функций.
- Accept temporarily: серверные экспорты удалённых фич (adminWriteShardSurvey, adminListQuests и др.) —
  владелец/сессия сервера, после релиза (D91).

## Verification

`node scripts/guard_admin_login.mjs`; `npm run test:one -- tests/<файл>` по каждому тесту,
читающему `admin/v2/legacy.html`; сравнение с базой HEAD, чтобы отделить старые падения.

## Rollback

`git revert` коммитов этой задачи — данные пользователей не затрагиваются.
