# Припаркованная работа: «витрина» визитки профиля (сирота «Тем»), 06.11

Решение «5 · ВХОД» по поручению координатора: вариант Б (визитку правим только под Ultra, незавершённую витрину не берём в 150).

Что внутри: `profile_showcase.patch` — правки ЧУЖИХ строк в components/PlayerProfileModal.tsx (+40/−7), ProfileCardBody.tsx, ProfileCardBackdrop.tsx, useSelfProfileCard.ts (мои строки Plus/Ultra из патча исключены и закоммичены отдельно); `profile_showcase_untracked/*.untracked` — три новых файла (ProfileCardShowcase.tsx, ProfileCardShowcaseSheet.tsx, profile_card_showcase_copy.ts), которые были вне git. Серверная/общая часть (`shared/profile_card_showcase*.ts`, `hooks/use_profile_card_showcase*.ts`) уже в HEAD и не тронута.

Как вернуть: `git apply docs/work/_parked_2_1_1/profile_showcase.patch`; файлы без суффикса `.untracked` положить в components/profile-card/; прогнать тесты визитки/профиля; перед выпуском проверить, что публичная «витрина» описана в политике конфиденциальности (какие поля видят другие).
