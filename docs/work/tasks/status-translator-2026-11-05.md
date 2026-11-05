# Task packet: статус Переводчика и очередь мастер-плана (05.11)

Governance-ID: TG-972342D957E0
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: мастер-план 05.11 (координатор), строка 10 очереди

## Outcome

Очередь Переводчика по мастер-плану выполнена в порядке: Пик «ступень→этаж» ×9 → слой ru/uk батчи и «вы» → интро uk (оверрайды) → строки ранга и тура → тексты заглушечных мест (без заглушек). Статус раз в 30 минут в docs/work/release/status/10_perevodchik.md.

## Scope

In scope: строки Пика (components/spire, moments), слой docs/work/classic_translation_fixes_2026_11_04.json, интро-оверрайды (docs/work/classic_intro_overrides_uk.json), статус-файл, этот packet.
Out of scope: код экранов (Моменты), lessons-*.json (Теория), сборки и сторы (запрещено мастер-планом, п.1).

## Architecture

Данные и строки; код не меняется. Статус — документ для координатора и Макетов.

## Security and privacy

Персональных данных нет.

## Technical debt

Интро uk ждёт ru от Тем (en 1–4); статусы до получения ru не закрываем. Хвост spireStepsWord — у Моментов.

## Verification

Коммит каждого батча через safe_commit с --expect; JSON парсится; строки проверяются скриптом на запрещённые корни.

## Rollback

`git revert` коммитов; статус-файл можно откатить без последствий.
