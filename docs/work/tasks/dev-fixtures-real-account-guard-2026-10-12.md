# Task packet: фикстуры Карточек не работают на настоящих аккаунтах + фикстуры/логи по вердиктам Макетов

Governance-ID: TG-0835C58ACC3C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/dev_state_cards_demo.ts, app/dev_state_fixtures.ts, docs/phraseman-2.0/DEV_LINKS_R1.md

## Outcome

1. Фикстуры, пишущие карточки/наборы (cards=demo|demo_lessons|empty|custom50|demo_published|notranslation), отказываются работать на аккаунте с привязанным Google/Apple (и при неизвестном состоянии входа): ключи карточек входят в облачную синхронизацию и в Account V2 «card_snapshot», пустой/демо-список мог бы затереть облачные данные тестовых аккаунтов №2/№3.
2. Фикстуры под вердикты Макетов: cards-gap-004 / -006 / -010; расследование cards-075 («Режим недоступен» вместо неактивного «Начать» во время загрузки) и cards-062 (пустой экран редактора) через лог [TRAIN-PREP] и [CARD-EDITOR] — сначала логи, потом правка по фактам.
3. Шаги для кадров диалога поверх dev_dialog_send (файл Ядра не трогаю).

## Scope

In scope: новый `app/dev_state_account_guard.ts`, вызовы в `app/dev_state_cards_demo.ts`, тесты; фикстуры в `app/dev_state_fixtures.ts` / `app/dev_cards_state.ts`; логи в экранах подготовки тренировки и редактора карточки; `scripts/dev_links_r1_steps.py`.
Out of scope: `app/dev_dialog_send.ts` (Ядро), overlay-слой для чтения данных (оценка отдельно), Шпиль/онбординг/аккаунт.

## Architecture

No architecture change: защитная проверка перед записью dev-фикстур; в стор-сборке фикстуры вырезаны. Проверка fail-closed (нет пользователя / не анонимный → отказ).

## Security and privacy

Снижает риск потери и порчи облачных данных реальных тестовых аккаунтов и записей в модерации. Новых данных не собирается, Firestore не читается и не пишется.

## Technical debt

Pay now: без защиты любая сессия могла стереть облачные карточки аккаунта №2/№3 одной ссылкой.

## Verification

Тесты: отказ на привязанном аккаунте, отказ при отсутствии пользователя, успех на анонимном госте, ни одной записи в AsyncStorage при отказе; существующий `dev_state_fixtures.test.ts`; срез типов.

## Rollback

Откат коммита.
