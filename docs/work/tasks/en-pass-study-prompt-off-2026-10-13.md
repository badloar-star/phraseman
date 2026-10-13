# Task packet: EN-проход — `enStudyPrompt=off` во всех ссылках uiLang=en + отдельный кадр выбора языка D164

Governance-ID: TG-0063E473240B
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~04:10)

## Outcome

При паре «интерфейс en + изучаю en» Ядро по D164 показывает выбор языка изучения (на хабе Диалогов он перекрывает кадр).
Dev-переключатель `enStudyPrompt=off` (3740a8eee, только память) убирает его. Добавить `&enStudyPrompt=off` во ВСЕ ссылки
EN-прохода с `uiLang=en` в docs/phraseman-2.0/DEV_LINKS_EN_PASS.md (генератор scripts/dev_links_en_pass.py) и
EN_PASS_ORDER_R1_2026-10-13.md (генератор в scratchpad), в первую очередь dialogs-003/007/013/017; изучаемый язык не менять.
Отдельная строка `en-d164-lang-choice-001` — кадр самого выбора языка D164 (ссылка dialogs-001 без enStudyPrompt=off).

## Scope

In scope: scripts/dev_links_en_pass.py, два документа. Out of scope: DEV_LINKS_R1.md, код приложения, studyTarget.

## Architecture

`to_en(link, prompt_off=True)` дописывает флаг в часть до `&next=`, если его нет; строка D164 — `prompt_off=False`.

## Security and privacy

Только dev-ссылки (память, в сторе отклоняются).

## Technical debt

- Contain: нет.

## Verification

Счёт: каждая ссылка с uiLang=en содержит enStudyPrompt=off, кроме en-d164-lang-choice-001; dialogs-003/007/013/017 проверены поимённо;
prod_write_guard по DEV_LINKS_R1 не затронут.

## Rollback

git revert коммита.
