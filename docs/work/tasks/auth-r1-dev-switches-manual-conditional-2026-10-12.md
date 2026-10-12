# Task packet: подмены съёмки R1 для 18 строк manual_conditional (Карточки, Друзья) — Авторизация

Governance-ID: TG-54DEAFFEA8E6
Governance-ID: TG-99835786B8C1
Governance-ID: TG-34FC1FDB6992
Governance-ID: TG-B3EC162D9823
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10, переназначено с Ядра)

## Outcome

Каждая строка открывается ОДНОЙ dev_state-ссылкой, без записи в прод и без сети:
- итоги тренировок Карточек: cards-v2-041/042/051/052, cards-section-053/054/055;
- детерминированный ответ: «Правда/ложь — неверно» cards-v2-038 + cards-section-049, «Напиши — верно» cards-v2-039 + cards-section-050 (аналог blitz_answer);
- cards-026 (мало карточек для Блица), cards-030 (ошибка списка «Из видео»);
- Друзья: community-008 (поиск · скелетон), 013 (свой профиль), 015 (поиск · нет связи), 021 (ошибка обновления / офлайн), 023 (активность и опрос дня).
Таблица «id → подмена → ссылка» — раздел «Авторизация» в docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md.

## Scope

In scope: app/dev_cards_state.ts, app/dev_social_state.ts, app/dev_state_fixtures.ts (разбор параметров), точки внедрения в экранах
Карточек/Друзей, заглушки store_release_stubs/dev_state/*, тесты подмен, документ.
Out of scope: серверные функции, EnergyContext, правила Firestore, вид экранов (вёрстка не меняется — только данные/удержания).

## Architecture

Как у существующих подмен: флаги в памяти процесса, геттеры `__DEV__ && !IS_STORE_RELEASE`, в стор-сборке — заглушки с теми же
экспортами (metro подменяет модуль). Точки внедрения читают геттер до сети и логируют ветку `[DEV-STATE]`.

## Security and privacy

Сеть в подменённых ветках не вызывается; ничего не пишется в Firestore/AsyncStorage. В стор-сборке геттеры всегда «выключено»
(заглушка + гейт scripts/store_release_stubs_gate.mjs). Сторож записи в прод должен остаться зелёным.

## Technical debt

- Contain: новые ключи — в тех же модулях dev_cards_state / dev_social_state, без новых файлов, где возможно.

## Verification

Поведенческие тесты геттеров (dev / стор), тест заглушек store_release_dev_state_stubs, разбор ссылки в dev_state_fixtures;
синтаксис затронутых .tsx. На эмуляторе — серией Сверки.

## Rollback

Откат коммита; подмены живут только в памяти, данных не остаётся.
