# Task packet: ловушка TapScale — раскладочный стиль не доходит до детей

Governance-ID: TG-8D39A7A3ABB6
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 20:27)
Related epic/enabler: Сверка video-001 (пилюля языка столбиком)

## Outcome

Все места, где TapScale с несколькими детьми получает раскладочный стиль (row/gap/align), исправлены одним коммитом; сторож-тест не даёт вернуть паттерн.

## Scope

In scope: вид и раскладка внутри TapScale; новый тест-сторож.
Out of scope: логика нажатий, анимация TapScale, файлы Codex и Learning V2.

## Architecture

TapScale кладёт style на внешний Pressable, детей — в Animated.View без стиля. Правка: строка раскладки выносится во внутренний View у вызывающего (или TapScale получает проп contentStyle — решается по числу мест).

## Security and privacy

Не затрагивает данные.

## Technical debt

Pay down: убираем скрытую ловушку раскладки.

## Verification

Проверка типов по файлам, узкие сторожа, новый сторож.

## Rollback

Один коммит, git revert.
