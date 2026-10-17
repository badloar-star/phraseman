# Task packet: вычитка шторки голосового лимита (1c2823b95) на 9 языках

Governance-ID: TG-EDD3D518BB2D
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 17.10, пересылка от Сайта)
Related epic/enabler: D194 — голос на старте занятия; D196 — общий лимит

## Outcome

Текст шторки грамматически согласован при любом остатке попыток K ∈ {0, 1, 2}:
- ru: «осталась 1 попытка» / «осталось 2 попытки» / «осталось 0 попыток»;
- uk: «залишилася 1 спроба» / «залишилося 2 спроби»;
- pl: «została ci 1 próba» / «zostały ci 2 próby» / «zostało ci 0 prób»;
- es: «te queda 1 intento» / «te quedan 2 intentos»;
- tr: «bugün ise 2 ses hakkın kaldı», без голого «2 hak kaldı».

Заголовки en / es / pt-BR / tr — естественнее. Все тексты на «ты», упоминается только Plus.

## Scope

In scope: `components/learning-v2/LearningV2VoiceHeadsupSheet.tsx`:
- `attemptsPhrase`: только tr;
- `copyFor`: тексты; `lead` выбирается по форме числа через `pluralFormFor`.

Счётчик `${copy.today} · ${remaining} ${copy.of} ${limit}` остаётся как есть: его сторожит `tests/learning_v2_voice_headsup_v1.test.ts`, а «2 / 3» в vi и tr читается нормально.

Out of scope: вёрстка, анимация, логика решения о показе.

## Architecture

No architecture change. У ru / uk / pl / es появляется вариант вступления по форме числа (`leadByForm`); остальные языки берут общий `lead`.

## Security and privacy

Не применимо: меняются только тексты.

## Technical debt

- Строки шторки живут в компоненте, а не в общей таблице — Accept temporarily: так у всех окон Learning V2; вынос — вместе с остальными окнами курса (владелец — Сайт).

## Verification

- `tests/learning_v2_voice_headsup_v1.test.ts` через slot.sh;
- сторожа i18n (`scan_untranslated_ui`, `scan_missing_en_dictionaries`).

## Rollback

`git revert` коммита.

## Дополнение (координатор 17.10): карточка «Продолжить» на Главной (719e4c771)

In scope: `app/home_continue_mark.ts`, `homeContinuePlaceBadge` — только vi: «Thẻ» → «Thẻ học». Одно «Thẻ» читается и как платёжная карта, а в приложении карточки везде называются «Thẻ học».

Остальное без правок:
- «Диалог» / «Карточки» / «Начать урок 1» на 9 языках естественны;
- плашка на арте (колонка 32 % карточки, ~89 dp на 360 dp, 13 pt bold) вмещает ~12 знаков, как «Pelajaran 12»; самые длинные новые подписи — 9 знаков;
- название «Начать урок 1» идёт в 2 строки с многоточием.
