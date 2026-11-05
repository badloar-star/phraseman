Governance-ID: TG-5213CCBE9BCF

# Выгрузка индексов Firestore (stale, 21.8 ч), запаркована 05.11

Рабочая копия `firestore.indexes.json` была переформатирована выгрузкой `firebase firestore:indexes` (101+/53−) и содержала два лишних переопределения (TTL `admin_youtube_comments.expireAt` и др.). Перед финальной фазой деплоя индексов нужно, чтобы файл = HEAD, поэтому патч сохранён здесь, файл возвращён к HEAD.

Как вернуть: `git apply docs/work/_parked_2_1_1/firestore_indexes_dump/firestore_indexes_dump.patch`. Перед возвратом — сверить с живым состоянием индексов (`firebase firestore:indexes`) и тестом `functions/src/jarvis/jarvis_money_writer_index_contract.test.ts`.
