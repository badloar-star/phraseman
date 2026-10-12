# Task packet: перепривязка сомнительных строк Карточек и недостающие кадры в cards-v2

Governance-ID: TG-9B2C5D3F3705
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Строки cards-062 («Не удалось сохранить»), cards-063 («Карточка не найдена»), cards-024 («Новая карточка в наборе»), cards-047 («Каталог — загрузка») и cards-039 («Сохранённые — недоступно») смотрят каждая на свой кадр образца. Недостающие кадры дорисованы по коду в конец cards-v2.html (номера прежних кадров не сдвинуты) и записаны в блок A журнала MOCKUPS_ALIGNED_TO_CODE_R1.md (cards-v2 утверждён владельцем). Число строк реестра прежнее.

## Scope

In scope: docs/design/v2-app/cards-v2.html (новые кадры в конец), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md, registries/visual_parity.json (mockup пяти строк по id).

Out of scope: код приложения; страницы под замком; прежние кадры cards-v2.

## Architecture

No architecture change: образцы и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: образец следует коду; найденные расхождения кода (кнопка «Повторить» тоста) идут координатору.

## Verification

Кадры видны в браузере; новые кадры в конце страницы; число строк реестра прежнее.

## Rollback

Откат коммита.
