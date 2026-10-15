# Task packet: переводы 9 языков — аудит моментов v3 и пейвола, польское склонение, сверка строк Дизайна

Governance-ID: TG-2F6682B004EB
Status: In progress
Owner: сессия «Специалист по переводам» (подчинена координатору)
Related epic/enabler: релиз PhraseMan 2.0 (сборка 16.10)

## Outcome

Человек на любом из 9 языков интерфейса (ru, uk, en, es, pt-BR, vi, id, tr, pl) видит в новых окнах (рубежи серии, окна Пика,
«Первый разговор», пейвол и восстановление покупок) живой текст без калек и ошибок числа/рода. Польское «21 kart» вместо «21 kartę»
во всём приложении. Мерило: сторожа переводов зелёные, отчёт `i18n-audit-2026-10-15.md` перечисляет каждую правку с причиной.

## Scope

In scope: `constants/plural.ts` (правило pl), `tests/cards_selection_plural.test.ts` (случай 21/31/101),
`components/streak/moments/streak_moments_strings.ts`, `components/spire/moments/moments_strings.ts`,
`components/spire/moments/position_moment_strings.ts`, `components/dialog_moments/first_dialog_strings.ts`,
`app/paywall_purchase.ts` (только строки), `components/paywall/PaywallPlusCopy.ts` (только строки), документы в `docs/work/tasks/`.

Out of scope: русские строки (голос владельца — только с согласия координатора); `step_moment_strings.ts` (зона Дизайна — предложения
отправлены); строки Тем на 08:30; число монет без склонения (ждёт решения по ru); листинги магазинов (запрещено владельцем).

## Architecture

No architecture change: правятся значения в существующих таблицах строк. Единственная логика — ветка `lang === 'pl'` в `pluralFormFor`:
для pl форма «one» только при count === 1; ru/uk без изменений.

## Security and privacy

Не применимо: данные, разрешения, сеть и сторонние сервисы не затрагиваются; меняются только видимые тексты.

## Technical debt

- Число монет в шаблонах без склонения («+{n} монет») — Contain: записано в аудите, владелец решения — координатор (ru), выход — перевод на `pluralWord`.
- Переводы не проверены носителями — Accept temporarily: владелец — переводчик, пересмотр после выпуска 20.10.

## Verification

`bash .claude/semaphore/slot.sh run … -- npx jest --maxWorkers=1 --runTestsByPath` — i18n_missing_en_fallback, ru_strings_no_ukrainian_letters,
english_ui_enable_preflight, cards_selection_plural, number_noun_pairs_guard, spire_plurals, shard_plurals, paywall_purchase_*;
RNTL — streak/spire/position/first_dialog moment contracts; `node --test` — i18n_design_zone_ratchet, untranslated_ui_positional.

## Rollback

Откат коммитов переводчика (`git revert <hash>`): только тексты и одна ветка правила склонения, данных пользователя нет.
