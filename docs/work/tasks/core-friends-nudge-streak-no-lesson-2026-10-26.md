# Ядро · пуш «Позвать» с серией вдвоём без обещания урока (координатор 26.10)

Governance-ID: TG-18DBA128E917
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Тело `nudgeStreakBody` (пуш «Позвать», когда у пары серия от 2 дней) на en/es/pt/vi/id/tr/pl обещало «урок»
(«One short lesson…», «lección», «lição», «bài», «pelajaran», «ders», «lekcja»), а у курсов es/fr/de/it «Уроков» нет
(D129/D130). Вторая фраза ×9 = ровно вторая фраза Переводчика из 7398140e4 (как у `streak_at_risk` в 614e76486);
первая часть «{n} {days} подряд.» прежняя.

## Scope
In scope: `functions/src/friends_push_copy.ts` (одна строка словаря), строка `nudgeStreakBody` в черновике Переводчика
`docs/work/tasks/friends-push-copy-9-lang-draft-2026-10-22.md` (сторож держит словарь = черновик), сторож «без урока»
с NFC в `functions/src/friends_push_copy.test.ts`, строка 14 в пакете выкладки.
Out of scope: выкладка (функция `friendsNudge` не входит в шаг 2б — отдельное «да»), прочие ключи словаря.

## Architecture
Без изменений: только текст словаря и тест.

## Security and privacy
Не затрагивает данные: тот же пуш, тот же получатель.

## Technical debt
`nudgeBody` («Одно маленькое занятие.» / «Just one short session.») — про занятие, не про урок; не трогаю, отмечено
координатору.

## Verification
`friends_push_copy.test.ts` и `friends_together_core.test.ts` зелёные; проверка типов functions 0.

## Rollback
Откат коммита.
