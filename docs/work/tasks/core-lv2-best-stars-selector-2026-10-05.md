# Task packet: лучшие звёзды за занятие Learning V2 — селектор для startModal

Governance-ID: TG-A08CC6E4635A
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 05.10 01:15; потребитель — сессия Дизайн, prop bestStars?)

## Outcome

Макет startModal пройденного занятия показывает «★★☆ Лучший результат». Нужен синхронный селектор
getLessonBestStars(courseSessionId) → 0..3 | undefined.

## Scope

Хранилище уже есть: app/learning_v2_session_star_results_store.ts (0665c1938) — лучшие звёзды 0–3 по занятию,
запись max(прежнее, новое) при завершении (learning_v2_direct_session_player_v1.tsx), гидратация на вкладке
«Уроки». Добавляется только селектор поверх памяти + тесты. Канонический прогресс course_local_progress_v1 не
расширяем — файл прямо запрещает (точный набор ключей, канонический JSON, fingerprint; masteryAuthority none).

## Architecture

Селектор читает память процесса (без I/O): мгновенно на первом кадре. Нет значения (старое занятие или
витрина не гидратирована) → undefined, ничего не выдумываем. Необязательный accountScopeHash: чужой scope →
undefined.

## Security and privacy

Только локальная витрина на телефоне; новых данных, полей Firestore и сервисов нет. Политика не затронута.

## Technical debt

Звёзды не синхронизируются в облако (так задумано витриной); после переустановки — undefined.

## Verification

Новый тест селектора: max при повторе, undefined без значения, undefined для чужого scope.

## Rollback

git revert.
