# Task packet: подставной ход Диалога несёт перевод и «Почему так» (кадры dialogs-015/019/020)

Governance-ID: TG-FD1FA4E89119
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: chain21 Сверки (docs/phraseman-2.0/evidence/chain21_step_errors_2026-10-13.md)

## Outcome

После подставной реплики (`dev_dialog_send=ok`) у реплики собеседника есть кнопки «Перевод» и «Почему так» — робот снимает
dialogs-015/019/020 без ИИ на проде.

## Scope

In scope: `app/dialogue_v2_turn_coaching_client.ts` — dev-ветка: `replyTranslations`/`replyExplanations` для подставной реплики; тест.
Out of scope: dialogs-016 (озвучка реплики приходит только из серверного выбора готового голоса — подделка звука не делается, кадр ручной).

## Architecture

No architecture change: dev-ветка до сети, в стор-сборке `getDevDialogSend()` = null.

## Security and privacy

Не касается: dev-only, без сети и данных.

## Technical debt

- Accept temporarily: dialogs-016 — ручной кадр (Сверка), пока нет dev-голоса; владелец — Ядро, пересмотр при следующем проходе R1.

## Verification

Тест на dev-ветку: ответ `ok` несёт по одному переводу и объяснению на реплику; Сверка — повтор dialogs-015/019/020.

## Rollback

Откат одного коммита.
