# Task packet: кадр «загрузка наборов» в cards-v2 (подготовка тренировки) и перепривязка cards-075

Governance-ID: TG-2CA5899D4402
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

В cards-v2.html (утверждён владельцем п.54) добавлен кадр «Подготовка тренировки — загрузка наборов» в конец страницы (четыре плитки-заглушки в разделе «Что повторяем», неактивная «Начать»). Строка cards-075 перепривязана на подготовку cards-v2 и сверена по новому кадру. Новый кадр записан в блок A журнала MOCKUPS_ALIGNED_TO_CODE_R1.md на подтверждение владельцу. Мера успеха: номера прежних кадров не сдвинулись, число строк реестра прежнее.

## Scope

In scope: docs/design/v2-app/cards-v2.html (один кадр в конец), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md, registries/visual_parity.json (cards-075 по id).

Out of scope: код приложения; страницы под замком; прежние кадры cards-v2.

## Architecture

No architecture change: образцы и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: образец следует коду; вопрос «флаг или дефект» у кнопки «Режим недоступен» — у Дизайна.

## Verification

Кадр виден в браузере; новый кадр в конце страницы; число строк реестра прежнее.

## Rollback

Откат коммита.
