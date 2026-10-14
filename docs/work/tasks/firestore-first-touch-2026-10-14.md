# Task packet: [FIRESTORE-FIRST-TOUCH] — кто трогает Firestore раньше очистки кэша после удаления аккаунта (координатор 14.10)

Governance-ID: TG-7C25F60942F9
Governance-ID: TG-68B60DAE1131
Status: Черновик скриптом; в код — в одном окне с D186 этап 1, после WB-R Сверки
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Удаление гостя №3 (14.10, journal_cold1/2.txt):
- COLD 1: `firestore_cache_clear start reason=marker` → `failed code=firestore/failed-precondition ms=1415` — Firestore уже запущен;
- COLD 2: очистка прошла (`ok ms=2556`).

Кэш удалённого аккаунта живёт лишний старт. Это хвост, не утечка: uid другой.

Шаг 1 — журнал (только dev):
- в `app/firestore_cache_clear.ts` при загрузке модуля обёрнуты `default()` и `getFirestore()` модуля `@react-native-firebase/firestore` через Proxy (свойства вроде FieldValue сохраняются);
- первые 6 обращений: `[FIRESTORE-FIRST-TOUCH] #N via=… ms=… clear=idle|running|… from=<2 кадра стека>`;
- метки `clear_start` и итог очистки — видно, кто держал clearPersistence.

Шаг 2 — по факту лога: первый обращающийся ждёт итога очистки, либо очистка уходит раньше него.

## Scope

In scope: `app/firestore_cache_clear.ts` (dev-трассировка). Шаг 2 — по журналу.
Out of scope: сервер удаления (строки 9–12 и почему ack 17 с — Ядро).

## Architecture

Proxy на экспортах модуля, только `__DEV__`. При запрете переопределения — лог `locked`, поведение прежнее. В стор-сборке функция выходит сразу.

## Security and privacy

В журнал — имя метода, время, кадры стека; данных пользователя нет.

## Technical debt

- Ack удаления гостя 17 с при дедлайне 25 с (строка 4 чек-листа) — долг, разбирает Ядро (передал координатор).
- Временная трассировка снимается после починки.

## Verification

Сверка: следующее удаление тестового гостя (нажимает только владелец) → два холодных старта, строки `[FIRESTORE-FIRST-TOUCH]` и `[ACC-MUT] firestore_cache_clear`.

## Rollback

`git revert` коммита.
