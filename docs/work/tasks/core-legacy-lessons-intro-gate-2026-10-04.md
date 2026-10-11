# Task packet: сторож входа в «Старые уроки» падал на удалённых картинках вступительного экрана

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: Ядро; поручение координатора 04.10

## Outcome
Причина (по фактам): `tests/learning_v2_legacy_lessons_entry_2026_09_12_gate.ts` требовал 9 файлов
`assets/images/feature_intros/<тема>/feature-intro-<тема>-legacy-lessons.webp` и `require` на них в
`app/feature_intro_assets.ts`. Общий снимок efe19ae9d (30.09) удалил все 126 картинок вступительных экранов и
перевёл реестр на иконки Ionicons (`getFeatureIntroIcon`, для legacy_lessons — `book-outline`); папки тем пустые.
Файл не «потерялся» — устарело утверждение сторожа. Приложение картинки не загружает, сборка цела.
Сторож теперь проверяет текущий контракт: ключ `legacy_lessons` есть, у него иконка, и реестр не ссылается на
файлы, которых нет.

## Scope
Только tests/learning_v2_legacy_lessons_entry_2026_09_12_gate.ts. lessons.tsx (Дизайн), factory_native и
learning-v2-de (Codex) не тронуты.

## Architecture
Без изменений кода приложения.

## Security and privacy
Не затрагивается.

## Technical debt
Решения «картинки вступительных экранов → иконки» в 03_DECISIONS нет — пришло снимком. Вернуть картинки или
закрепить иконки — вопрос владельца/Дизайна (передано координатору).

## Verification
Прогон сторожа целиком (`npx tsx`).

## Rollback
Откат коммита.
