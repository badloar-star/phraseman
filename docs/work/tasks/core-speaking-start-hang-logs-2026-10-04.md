# Task packet: «Устно» висит на старте — трассировка загрузки после start:begin

Governance-ID: TG-94EA8E61CB15
Status: Logs first (no behaviour change)
Owner: Ядро

## Outcome
Между [FC-SPEAKING-GATE] start:begin и сторожем 20 с не было ни одной строки (Дизайн, эмулятор, 2/2). Последний шаг до load:done — Promise.all(loadDeckCardsMulti, AsyncStorage.getItem). Каждая половина теперь пишет своё завершение и время: load:begin, load:cards_done, load:prefs_done.

## Scope
app/flashcards_speaking_session.tsx — три строки лога. Поведение то же.

## Architecture
Следующий шаг по логам: если висит loadDeckCardsMulti (набор сообщества pack:…) — потолок и нижние логи в загрузчике; если getItem — замок хранилища (storage_mutex).

## Security and privacy
В лог — только число наборов и длительности.

## Technical debt
Потолок на загрузку карточек — после диагноза.

## Verification
Тесты «Устно», typecheck; воспроизведение у «Дизайна» на эмуляторе.

## Rollback
Откат коммита.
