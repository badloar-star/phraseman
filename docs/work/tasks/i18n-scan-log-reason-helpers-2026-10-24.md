# Task packet: сканер непереведённых строк — причины в журнале строки состояния и историй не UI (Переводчик, ночная проверка 24.10 20:04)

Governance-ID: TG-635384B9999B
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Периодическая проверка 20:04: `scan_untranslated_ui.mjs` красный — 8 против 0 в базе. Все 8 — третьи аргументы
`useLightStatusBar(tag, on, why)` («Сцена Главной под часами», «обложка Сезона под часами», «сцена «Сегодня» под часами») и аргумент
`applyHold(why)` в `components/stories/StoryViewer.tsx` («жест», «жест закончен», «касание»). Оба помощника отдают строку только в
журнал (`hooks/use_scene_status_bar.ts` → `console.log`; `applyHold` → `DebugLogger.info`), на экран она не попадает.
Правка: оба имени — в список журнальных помощников `DIAGNOSTIC_LOG_CALL`, как уже сделано для `traceThumbMissing`, `bootMark`, `traceNick`.
Файлы-источники — чужие незакоммиченные правки (Сезон/Сегодня/Истории); их не трогаю.

## Scope

In scope: регулярное выражение помощников в `scripts/scan_untranslated_ui.mjs` + комментарий-причина.
Out of scope: исходники экранов, база сканера.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Если в `useLightStatusBar` или `applyHold` когда-нибудь начнут показывать `why` на экране, правило станет неверным — причина
  записана рядом с регуляркой.

## Verification

`node scripts/scan_untranslated_ui.mjs` — OK (0 как в базе) на дереве с чужими правками.

## Rollback

`git revert <коммит>`.
