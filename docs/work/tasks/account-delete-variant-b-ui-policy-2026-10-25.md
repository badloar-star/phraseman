# Task packet: окна удаления по макету (вариант Б, за флагом) + фраза в политике + тест маршрута — 5 · ВХОД

Governance-ID: TG-8C4C56A90E27
Status: In progress
Owner: 5 · ВХОД И АККАУНТ (владелец «Да, так» на макет HqA1kLDYV1bAR3apVamLJj и «Да, добавить» на фразу; журнал e7e9e5d13)

## Outcome

1. legal/privacy_policy_* — фраза о немедленном удалении рядом с абзацем про 14 дней; legal:sync в файлах; сайт НЕ публикуется
   (выкладка вместе с сервером 713677ddd по отдельному «да»).
2. DeleteAccountConfirmModal по макету docs/design/v2-app/account-delete-variant-b.html: «Удалить через 14 дней» + тихая ссылка
   «Удалить навсегда сейчас»; ввод «УДАЛИТЬ» только для «навсегда»; «Восстановить аккаунт?» прежнее; после подтверждения — сразу
   выход. За флагом «Пульта» (по умолчанию ВЫКЛ) до выкладки сервера. Без окон «удалено». Окна отказа — по выводу сверки с
   правилом 22.09 (вывод отдан координатору, без «да» не меняются).
3. tests/dialogue_v2_freeform_route.test.ts ×2 — в ожидании реплики ИИ есть turnId (aafa29de4).

## Scope

legal/privacy_policy_*.json (+ то, что генерирует legal:sync в репозитории), components/DeleteAccountConfirmModal.tsx,
app/auth_provider.ts (beginAccountDeletion({ deleteNow }) → accountDeleteEnqueue), app/remote_flags.ts (флаг), «Пульт»,
строки — docs/work/tasks/delete-now-strings-2026-10-25.md (Переводчик, cfe36be02), тесты.

## Architecture

deleteNow идёт через beginAccountDeletion (там отзыв Apple Ядра) → поле запроса deleteNow=true. Флаг выкл → окно как сейчас.

## Security and privacy

Немедленное удаление необратимо — ввод «УДАЛИТЬ» только на этом пути. Политика меняется вместе с поведением.

## Technical debt

Сайт с политикой и сервер выкладываются вместе позже.

## Verification

Тесты окна и маршрута; склейка «макет | эмулятор» — Сверка.

## Rollback

git revert; флаг выключен.
