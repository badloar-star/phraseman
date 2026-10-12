# Task packet: Optimistic UI — жалоба на отклик, отправка/удаление отклика, избранное «Из видео», таймаут заявки

Governance-ID: TG-1D76DB53FDF2
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, после 5b0bae48d)
Related epic/enabler: docs/phraseman-2.0/R1_SPIRE_COMMUNITY_OPTIMISTIC_UI.md

## Outcome

Дополнить документ аудита: жалоба на отклик, отправка отклика, удаление отклика, избранное видео («Из видео»). Мелкие дыры чинить с логом и тестом. Таймаут у sendFriendRequest — если уложусь в час.

## Scope

In scope: app/community_packs/PackCommentsSheet.tsx, ReportCommentModal.tsx, избранное видео, app/firestore_friend_requests.ts (таймаут), тесты, документ.
Out of scope: серверные функции (строкой Ядру).

## Architecture

Архитектура не меняется; локальное состояние, откат и потолок ожидания в клиенте.

## Security and privacy

Новых данных не собираем. Видео-избранное users/{uid}/video_favorites уже описано в политике или помечается отдельно, если нет (проверка в ходе работы).

## Technical debt

Pay now: действия без отката/логов.

## Verification

Точечные test:one, срез типов по затронутым файлам.

## Rollback

Откат коммитов.
