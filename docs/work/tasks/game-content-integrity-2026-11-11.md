# Task packet: сквозная проверка заданий всех игр для всех языков обучения

Governance-ID: TG-7DC84639C363
Status: In progress
Owner: сессия «банк заданий игр» (задача от сессии макетов Elevate)
Related epic/enabler: D207 — перенос игр Elevate в приложение

## Outcome

Перед релизом есть один тест, который перебирает языки обучения (en, de, fr, es, it) × уроки 1–32 × 9 игр и
доказывает: игра либо недоступна и ничего не отдаёт, либо каждое отданное задание решаемо и принадлежит
своему языку; разминка никогда не предлагает игру без заданий. Слово владельца 11.11.2026: «все механики
должны точно правильно работать». Мера успеха — тест зелёный по тексту вывода и отчёт с числом
проверенных пар.

## Scope

In scope: новый `tests/game_content_integrity.test.ts`; однозначные ошибки данных в `modules/games/bank/*.ts`
(неверный индекс, дубль варианта); ошибки правил (`task_source.ts`, `*_core.ts`, `warmup_state.ts`) — только
после теста, который их ловит.

Out of scope: `app/game_*.tsx`, `app/warmup.tsx`, `components/games/**`, `constants/gameMotion.ts` (их правит
сессия макетов); спорное содержание заданий — не правится, идёт в отчёт списком
«язык · урок · игра · id · что не так».

## Architecture

No architecture change: тест читает данные через публичные функции `task_source.ts`, реестр `bank/index.ts`,
`warmup_state.ts` и `flow_core.ts`; экраны не монтируются, моков экранов нет.

## Security and privacy

Не применимо: статические учебные данные, нет ввода пользователя, сети и личных данных.

## Technical debt

- Contain: «задание принадлежит своему языку» проверяется по принадлежности объекту банка этого языка, по id
  и (для «На слух») по фразам курса; смысловую правильность текста машина не проверяет — это вычитка сессий
  банков.
- Найденное в экранах (вне границ задачи) фиксируется в отчёте, не правится.

## Verification

`bash .claude/semaphore/slot.sh run --wait "game content integrity" -- npm run test:one -- tests/game_content_integrity.test.ts`
— читать текст вывода («N passed»), а не код возврата.

## Rollback

Удалить `tests/game_content_integrity.test.ts`; правки банков откатываются `git revert` своих коммитов.

## Дополнение 11.11, 23:20 — пометки урока в вариантах «Потока»

Governance-ID: TG-2F1262DD7748

Задача от сессии макетов (срок 23:40): в вариантах ответа «Потока» не должно остаться пометок урока ни на одном
языке интерфейса. Scope: `modules/games/flow_core.ts` (только `cleanFlowTranslation`, файл на эту задачу передан
сессией макетов), `tests/game_flow_translation.test.ts`, `tests/game_content_integrity.test.ts`. Данные уроков не
меняются. Architecture, Security: без изменений, статические тексты. Debt: нет. Verification: три теста через
светофор. Rollback: `git revert` коммита.
