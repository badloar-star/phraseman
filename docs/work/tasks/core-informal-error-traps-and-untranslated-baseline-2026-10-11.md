# Task packet: корпус «ловушек ошибок» на «ты» + счётчик непереведённого

Governance-ID: TG-C014A2D27623
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: переход интерфейса на «ты» (bb416e3cd/a54178f73), сторож informal_address (2754ea10c), координатор 00:32

## Outcome

1. Объяснения «ловушек ошибок» (`app/error_traps/*` — `generalRule`, `generalRule_UA`, `hint` и т. п., их показывает
   `app/feedback_engine.ts` в уроках) обращаются к человеку на «ты» в ru и uk. Множественное «вы» о группе людей
   («если вас двое и больше») — сохраняется, это не обращение. Сторож `informal_address_ru_uk_guard` ловит корпус
   (снять его из исключений).
2. Счётчик `scan_untranslated_ui` (база 814): выяснить, чьи строки дают рост, и закоммитить свою uk-строку
   `community_pack_create` честно — без подъёма базы под чужие незакоммиченные строки.

## Scope

In scope: `app/error_traps/error_traps_*.ts` (только тексты), `tests/informal_address_ru_uk_guard.test.mjs`,
`app/community_pack_create.tsx` (одна uk-строка), при необходимости `config/untranslated-ui-baseline.json`
(только снижение до факта HEAD).
Out of scope: логика `feedback_engine`, другие языки (в корпусе только ru/uk), Learning V2 контент.

## Architecture

No architecture change: правка текстов. Инвариант: смысл объяснений и примеры не меняются; меняется только обращение
и согласование глаголов/местоимений (вы устали → ты устал(а), ваша → твоя, Представьте → Представь).

## Security and privacy

Нет влияния.

## Technical debt

Pay now: корпус на «вы» и исключение в стороже. Contain: сторож обращения.

## Verification

Скан до/после (0 вежливых форм вне множественного), сторожа ловушек (`tests/*error_trap*`, `feedback_engine`),
babel; выборочная вычитка правок (подстановкой в предложение).

## Rollback

`git revert` — тексты вернутся на «вы».
