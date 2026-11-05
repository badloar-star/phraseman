Governance-ID: TG-799901BA32C6
Governance-ID: TG-500EE37AAA9C
Governance-ID: TG-DE856ABB63C2
Governance-ID: TG-1219D2678157
Governance-ID: TG-ED54C615E8CC
Governance-ID: TG-0543628BE030
Governance-ID: TG-5FD872AB6140
Governance-ID: TG-F174603700F8
Governance-ID: TG-DA9A7C9184CF

# Task packet: парковка остатка «витрины визитки профиля» (одним патчем рядом с profile_showcase.patch)

## Outcome
Поручение координатора (06.11): Metro Эмулятора падал на демо витрины визитки (запарковано c87912f92); остаток кластера «витрина» ещё в дереве. Нужно запарковать весь остаток одним патчем рядом с `profile_showcase.patch`, предварительно проверив, что сборка HEAD не сломается (импорты, Metro). Проверка: в HEAD НИ ОДИН файл не импортирует модули витрины (`git grep` по `profile_card_showcase`, `use_profile_card_showcase` в app/components/hooks/modules/shared/functions пусто), поэтому возврат файлов к HEAD и удаление untracked-модулей безопасны.

## Scope
- Патч `docs/work/_parked_2_1_1/profile_showcase_remainder.patch`: `app/profile_card_public.ts`, `app/public_profile_snapshot.ts`, `tests/profile_card_public_swr.test.ts`, `functions/src/public_profile_projection.ts` (хунк витрины) целиком; из смешанных файлов только блок витрины: `config/phone-state-legacy-inventory.v1.json` (префикс `profile_card_showcase_v1:`), `jest.rntl.config.cjs` (одна строка теста витрины). Чужие хунки (удаление `plus_cloud_confirmed_v1`, `community_root_tabs`) не парковались.
- Копии untracked-модулей витрины уже сохранены в `docs/work/_parked_2_1_1/layout_orphans/untracked/` (пакет park-layout-orphans); после коммита патча эти untracked файлы удаляются из дерева.

## Architecture
Парковка = патч + (раньше сохранённые) копии; дерево по затронутым файлам = HEAD.

## Security and privacy
Витрина показывает выбранные награды публично — перед возвратом в релиз нужна проверка политики конфиденциальности (в README).

## Technical debt
Фича «витрина визитки» остаётся недоделанной и запаркованной (две части: `profile_showcase.patch` от «Входа» и этот остаток).

## Verification
`git apply --check -R` патча; после возврата `git diff` по затронутым файлам пуст; `git grep` по модулям витрины в HEAD пуст; типы без ошибок.

## Rollback
Применить патч и вернуть копии по README.
