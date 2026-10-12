# Task packet: ссылка съёмки cards-gap-025 («Публикация — отправлено») вместо ручного пути

Governance-ID: TG-8CF6D196AF3A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (просьба Макетов от координатора; DEV_LINKS_R1 держит Авторизация)

## Outcome

cards-gap-025 получает ссылку `cards=demo&plus=on&publish=ok` → `/flashcards_collection?pack=local_pack_dev_demo_work`,
шаги `tap:#fc-pack-menu; tap:#fc-pack-publish; wait:400` (меню набора открывается через #fc-pack-menu, как у cards-gap-028).

## Scope

In scope: scripts/dev_links_r1_steps_chain7.py, перегенерация DEV_LINKS_R1.md / DEV_LINKS_R1_BINDINGS.md.
Out of scope: код Карточек, подмена publish=ok (уже есть).

## Architecture

Модуль шагов chain7; модуль p83 (правки Дизайна) подключён последним и не затрагивается — пересборка до правки дала нулевой дифф.

## Security and privacy

publish=ok — ответ публикации в памяти, без записи в прод (сторож prod_write_guard).

## Technical debt

- Contain: нет.

## Verification

Генератор; diff документа только по строке cards-gap-025; prod_write_guard.

## Rollback

Откат коммита.
