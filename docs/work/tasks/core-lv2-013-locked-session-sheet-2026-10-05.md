# Task packet: learning-v2-013 шаг 2 — окно «Закрытое занятие» вместо тоста

Governance-ID: TG-34EB6C13616F
Status: In progress (координатор 05.10: «ДА, по макету: для закрытого ЗАНЯТИЯ окно 2.4 modal-locked вместо тоста; denied:plus и
denied:wip как раньше; окно мгновенно, без сети; лог [V2-TAP] оставить; отдельный коммит, сторож»)
Owner: сессия 1 · ЯДРО

## Outcome

Тап по закрытому занятию (ветка denied:locked) открывает окно по learning-v2.html 2.4 modal-locked: тусклый шар с замком,
«Занятие N», «Сначала заверши предыдущее занятие.», одна кнопка «Закрыть», без второй кнопки и без фактов.

## Scope

app/(tabs)/lessons.tsx — отдельное состояние закрытого занятия и второй экземпляр LearningV2SessionOutcomeSheet (locked);
поток запуска занятия (selectedLearningV2Session, прогрев, трассировка) не трогается.
components/LearningV2SessionOutcomeSheet.tsx — при locked строка фактов не рисуется (макет: noFacts).
Тест-сторож.

## Architecture

Локальное состояние, без сети и прогрева — окно мгновенно. Plus/«в работе» — тост, как раньше.

## Security and privacy

Не затрагивается.

## Technical debt

Окно «Занятие Plus» (2.5) не подключено — у denied:plus пока тост (решение координатора).

## Verification

Сторож-тест по исходнику; сторожа lessons/learning_v2; синтаксис; Сверка на устройстве.

## Rollback

git revert коммита.
