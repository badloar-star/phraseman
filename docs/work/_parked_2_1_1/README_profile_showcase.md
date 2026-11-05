# Припаркованная работа: «витрина» визитки профиля (сирота «Тем»), 06.11

Решение «5 · ВХОД» по поручению координатора: вариант Б (визитку правим только под Ultra, незавершённую витрину не берём в 150).

Что внутри: `profile_showcase.patch` — правки ЧУЖИХ строк в components/PlayerProfileModal.tsx (+40/−7), ProfileCardBody.tsx, ProfileCardBackdrop.tsx, useSelfProfileCard.ts (мои строки Plus/Ultra из патча исключены и закоммичены отдельно); `profile_showcase_untracked/*.untracked` — три новых файла (ProfileCardShowcase.tsx, ProfileCardShowcaseSheet.tsx, profile_card_showcase_copy.ts), которые были вне git. Серверная/общая часть (`shared/profile_card_showcase*.ts`, `hooks/use_profile_card_showcase*.ts`) уже в HEAD и не тронута.

Как вернуть: `git apply docs/work/_parked_2_1_1/profile_showcase.patch`; файлы без суффикса `.untracked` положить в components/profile-card/; прогнать тесты визитки/профиля; перед выпуском проверить, что публичная «витрина» описана в политике конфиденциальности (какие поля видят другие).

## Дополнение (координатор, 05.11 ~16:15): демо витрины в dev-витрине движения
Демо `components/dev/motion_showcase/ProfileCardShowcaseDemo.tsx` импортировало запаркованный `ProfileCardShowcaseSheet` и роняло сборку Metro (500, UnableToResolveError) — эмулятор встал. Запарковано тем же способом:
- `profile_showcase_motion_demo.patch` — пункт меню в `sections/screens_profile.tsx` и строка `profile_card_showcase_title` в `showcase_copy.ts`;
- `profile_showcase_untracked/ProfileCardShowcaseDemo.tsx.untracked`.
Вернуть: после возврата основного патча — `git apply profile_showcase_motion_demo.patch` и переименовать файл обратно.
Остаток кластера в рабочем дереве (не трогал, разбирает Ядро): `hooks/use_profile_card_showcase_sync.ts`, `shared/profile_card_showcase.ts` (untracked), правки `app/_layout.tsx`, `app/profile_card_public.ts`, `app/cloud_sync.ts`.

## Дополнение (Ядро, 06.11): остаток кластера «витрина» запаркован
- `profile_showcase_remainder.patch` — `app/profile_card_public.ts`, `app/public_profile_snapshot.ts`, `tests/profile_card_public_swr.test.ts`, `functions/src/public_profile_projection.ts` (хунк витрины) целиком; из смешанных файлов только блок витрины: `config/phone-state-legacy-inventory.v1.json` (префикс `profile_card_showcase_v1:`), конфиг RNTL-тестов (одна строка теста витрины). Хунки `_layout.tsx` и `cloud_sync.ts` — в `layout_orphans/layout_orphans_tracked.patch`.
- Модули и тесты витрины (`hooks/use_profile_card_showcase{,_sync}.ts`, `shared/profile_card_showcase{,_ids}.ts`, `app/profile_card_showcase_store.ts`, 5 тестов + проекция) — копии с суффиксом `.untracked` в `layout_orphans/untracked/`; из рабочего дерева удалены. Проверка сборки: в HEAD ни один файл не импортирует эти модули.
- Порядок возврата: основной патч → этот патч → патч `_layout`/`cloud_sync` → копии модулей на места (README `layout_orphans`). Перед релизом: проверка политики конфиденциальности (публичный профиль показывает выбранные награды) и E2E.
