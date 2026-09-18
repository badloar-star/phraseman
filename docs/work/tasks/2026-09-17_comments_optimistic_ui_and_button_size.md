# Task packet: комментарий пропадает после отправки + кнопка комментариев слишком мелкая

Governance-ID: TG-556E13CE7195
Status: In progress
Owner: Claude session (badloar@gmail.com)
Related epic/enabler: docs/work/tasks/2026-09-17_pack_comments_audit_fixes.md

## Outcome

Владелец нашёл два новых дефекта живьём: (1) отправленный комментарий
пропадает с экрана вместо того, чтобы остаться сразу же (Optimistic UI
нарушен); (2) кнопка счётчика комментариев на экране набора слишком мелкая,
трудно попасть пальцем. Оба — точечные правки в уже существующих компонентах.

## Scope

In scope:
- `app/community_packs/PackCommentsSheet.tsx`: убрать `ownedLocally` из
  зависимостей основного `useEffect`, который перечитывает
  `fetchPackComments` — этот повторный сетевой запрос создавал гонку, из-за
  которой `mergeServerComments` мог не увидеть только что опубликованный
  (уже `status: 'published'`) комментарий в новом серверном снимке
  (eventual consistency Firestore) и он выпадал из списка, так как не
  подходил ни под «pending», ни под «server».
- `app/community_packs/packComments.ts`: укрепить `mergeServerComments`,
  чтобы опубликованные локальные комментарии, отсутствующие в конкретном
  серверном снимке, тоже не терялись (защита от той же гонки на будущее).
- `app/community_packs/CommunityPackSocialBar.tsx`: увеличить хитбокс/размер
  кнопки счётчика комментариев на экране набора (variant="screen") — сейчас
  слишком мелкая цель тапа.

Out of scope:
- Остальная логика шторки (уже починена в предыдущих задачах).
- Визуальный редизайн аватарок (отдельная задача
  2026-09-17_pack_comments_visual_redesign.md, в работе).

## Architecture

Не меняется структурно.

## Security and privacy

Не затрагивается.

## Technical debt

Нет нового долга.

## Verification

- Точечный tsc на изменённые файлы.
- Логическая проверка: `mergeServerComments` — таблица кейсов (pending жив,
  published жив даже без сервера, published из сервера заменяет локальный
  дубль по id).

## Rollback

Точечные правки, откатываются независимо.
