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
