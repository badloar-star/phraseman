# Task packet: learn-5 — окно ворот открывается медленно (сперва лог)

Governance-ID: TG-B7324F0089B5
Status: In progress (координатор 05.10: «(5) Окно ворот открывается медленно — лог времени от тапа до показа»)
Owner: сессия 1 · ЯДРО

## Outcome

Понять, где теряется время между тапом по закрытому уроку/экзамену и видимым окном LessonsGateDialog: в коде до
setGateModal, в коммите React, в первом кадре после коммита — или это сама анимация HybridAlertShell
(подложка 240 мс, панель стартует через LUM.ladder[1]=74 мс и проявляется LUM.resolveMs=380 мс ⇒ ~450 мс до полной
непрозрачности).

## Scope

app/(tabs)/lessons.tsx: модульная отметка времени тапа (карточка/список/экзамен) и console.warn
[LESSONS-GATE-OPEN] {kind, tapToCommitMs, tapToFrameMs, animFullMs} при открытии окна. Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Только вид окна и миллисекунды, без uid.

## Technical debt

Временная трассировка; после диагноза — починка (если задержка в коде) или вопрос Дизайну о таймингах анимации.

## Verification

Синтаксис (babel_check); сторожа lessons; воспроизведение Сверкой.

## Rollback

git revert коммита.
