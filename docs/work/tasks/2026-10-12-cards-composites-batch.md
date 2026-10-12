# Task packet: сверка 16 составных кадров Карточек и перепривязка строк с cards-states на cards-v2

Governance-ID: TG-05602C86665E
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

По 12 новым составным кадрам Карточек (cards-013/014/015/016/017/034/035/037/045/046/048 и повторно cards-006) выставлены вердикты, кадры зарегистрированы (evidence_at и sha по файлу). Строки, смотревшие на устаревший cards-states, перепривязаны на аналогичные кадры cards-v2 (п.54); где аналога нет — кадр дорисован в конец cards-v2.html (например окно «Удалить набор» поверх «Мои наборы») и записан в блок A журнала MOCKUPS_ALIGNED_TO_CODE_R1.md. Число строк реестра прежнее.

## Scope

In scope: registries/visual_parity.json (строки по id), docs/design/v2-app/cards-v2.html (новые кадры в конец), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md.

Out of scope: код приложения; страницы под замком; прежние кадры cards-v2.

## Architecture

No architecture change: образцы и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: дефекты кода — координатору списком.

## Verification

Число строк реестра прежнее; новые кадры cards-v2 видны в браузере; номера прежних кадров не сдвинуты.

## Rollback

Откат коммита.
