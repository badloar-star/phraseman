# Task packet: тексты Диалогов — dialogs-020 (кавычки и первое лицо в «Почему так») и dialogs-008 (шаблонный брифинг)

Governance-ID: TG-FD78D7885016
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «Сначала найди, где живут эти тексты… если только в functions —
подготовь правку и тесты, но НЕ выкладывай»).

## Outcome
Где живут тексты (найдено):
- dialogs-020 «Почему так»: генерирует модель на каждом ходе — промпт `functions/src/dialogue_v2_turn_coaching.ts`
  (`replyExplanations`). Модель пишет от лица персонажа («Я использую… для ясности») и общими словами, кавычки — прямые.
  Клиент показывает `coach.note` как есть (`components/dialogs/DialogWhySheet.tsx`).
- dialogs-008 брифинг: ru — одобренный ledger `content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json`
  (~80 сцен с одним шаблоном «Ты переписываешься в мире «…». Задача: … Не закрывай разговор…»), uk и др. — переводы,
  en/es — пакеты выпуска; показ собирается `scripts/dialogue_v2_ui_copy.ts` в `shared/generated/…` (едет со сборкой).
  Серверу брифинг ЯЗЫКА ИНТЕРФЕЙСА не нужен (сервер берёт `packet.content.briefing` выпуска), поэтому показ можно менять
  через файл правок `dialogue_v2_ui_copy_overrides.v1.json`, не трогая сервер.
Делается:
1) клиент (едет со сборкой): кавычки «ёлочки» в «Почему так» для ru/uk/es/pt-BR — тот же помощник, что у разбора
   ошибок (`app/mistake_explanation_text.ts`), вынесенный в общую функцию;
2) сервер (готовится, НЕ выкладывается): строка промпта — разбор от лица наставника о фразе собеседника, не «я», с
   названием конкретной фразы и её роли; кавычки языка интерфейса; тест на текст промпта;
3) брифинги: образец 4 сцен в стиле макета (ru/uk/en) на одобрение координатора/владельца — 240 текстов руками без
   одобрения не пишутся (правило «творческие решения — выбором», «тексты без ИИ-тона»).

## Scope
In: `app/mistake_explanation_text.ts`, `components/dialogs/DialogWhySheet.tsx` (одна строка показа),
`functions/src/dialogue_v2_turn_coaching.ts` (+ тест), образец брифингов в docs.
Out: выкладка functions (п.64, TS2352 Codex), правка одобренного ledger, `dialogue_v2_session_outcome_store.ts` и
проекция каталога (Дизайн).
Дополнение (координатор, реестр п.75, 22fab9b23 — стиль образца ДА): брифинги ru/uk/en всех сцен — партиями по миру
через `content/dialogues-v2/ui-copy/dialogue_v2_ui_copy_overrides.v1.json` → `shared/generated/dialogue_v2_ui_copy.*.json`
(генератор `scripts/dialogue_v2_ui_copy.ts --write`, сторож `--check`); после каждой партии — сверка, что показ равен
написанному (генератор срезает предложение с названием сцены). pt-BR/vi/id/tr/pl/es — переводом с ru отдельно.

## Architecture
Кавычки — чистая функция `localizeQuotes(text, lang)`; `cleanMistakeExplanation` её использует (поведение прежнее).
Промпт — одна строка в `dialogueV2CoachingPromptLines`, разбор ответа модели не меняется.

## Security and privacy
Без данных пользователя; промпт не получает новых полей.

## Technical debt
Пока сервер не выложен, «Почему так» остаётся от первого лица (кавычки уже исправит клиент). Брифинги ждут одобрения
образца.

## Verification
Тесты: mistake_explanation_text (прежний), новый на localizeQuotes и показ в шторке; functions — тест строки промпта
(jest functions, светлый конфиг). Срез типов.

## Rollback
`git revert` по коммитам.
