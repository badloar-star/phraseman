# Task packet: строка утренней прицельной выкладки (чистый срез при TS2352) + перевод брифингов на 6 языков

Governance-ID: TG-A6FF0EF8708D
Status: Done — переводы 4/4; документ выкладки с таблицами (проверка сборки среза ждёт памяти)
Owner: сессия «1 · Ядро» (координатор 12.10: «одна команда прицельной выкладки и путь сборки при TS2352 Codex»;
«выясни, выложен ли acceptDialogueEnded»; «перевод брифингов на pt-BR/vi/id/tr/pl/es — ДА, сейчас, партиями»).

## Outcome
1) `docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md`: одна команда для владельца — сборка и выкладка из ЧИСТОГО среза
   коммита (git archive во временную папку + переход node_modules), потому что рабочая папка несёт незакоммиченную правку
   Codex с TS2352 (`modules/learning-v2/content/factory_native/factory_native_course_v1.ts`), а сборка functions достаёт этот
   файл через `functions/src/content_factory/learning_v2_publish_authored_course_v1.ts`. Ответ про acceptDialogueEnded: по
   реестру (п.46) группа Диалогов V2 выложена 11.10 10:2x–10:47, коммит acceptDialogueEnded b7c1fd1e8 — 11.10 14:31, позже
   выкладки записей нет → в проде НЕТ.
2) Брифинги pt-BR/vi/id/tr/pl/es — перевод с ru партиями по миру через overrides, сторожа генератора, сверка показа.

## Scope
In: документ выкладки; проверка сборки среза БЕЗ выкладки (только `npm --prefix functions run build` в срезе);
`content/dialogues-v2/ui-copy/dialogue_v2_ui_copy_overrides.v1.json`, `shared/generated/dialogue_v2_ui_copy.*.json`.
Out: сама выкладка (владелец), ключи/секреты, правка файла Codex.

## Architecture
Срез: `git archive <commit> | tar -x` в `C:/Temp/phraseman_deploy/<commit>`; `functions/node_modules` и корневой
`node_modules` — переходы (junction) на рабочие; `firebase deploy --only functions:A,functions:B` из среза.

## Security and privacy
Секреты не читаются; выкладку делает владелец своей учёткой CLI.

## Technical debt
Срез содержит все закоммиченные изменения, достижимые из выкладываемых функций (перечислены в документе).

## Verification
Сборка в срезе (tsc functions) зелёная; для перевода — генератор --check PASS, сверка показа.

## Rollback
Документ — git revert; срез — удалить папку (сначала снять переходы `cmd /c rmdir`).
