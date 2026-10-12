# Task packet: окно «нет энергии» в Диалогах по разделу + бейдж PLUS по макету (d145-micro)

Governance-ID: TG-1896A6E3BE24
Governance-ID: TG-F3D0CB77589A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора (Макеты 2bac25805 dialogs-011; решение по бейджу п.82)
Related epic/enabler: правило владельца 15.09 (тексты модалов по разделу), D145 §129 (микро-исключение для бейджей)

## Outcome

1. В окне «Недостаточно энергии» на экране брифинга Диалогов строка говорит про разговор («Для разговора нужно 1 ⚡»), а не «Для урока»: `activity="ai_dialog"` передан. Любой вызов окна без `activity` ловит сторож. Бренд в кнопке окна пишется «Получить Plus», как в макетах и остальных окнах.
2. Бейдж «PLUS» на микрофоне Диалогов возвращён к образцу dialogs-028 (10 px, 17×32) через исключение `d145-micro` (§129); храповик шрифтов зелёный.

## Scope

In scope: app/dialogue_v2_briefing.tsx (один проп), components/NoEnergyModal.tsx (подпись кнопки ru, журнал ветки «gate»), components/dialogs/DialogueV2SessionScreen.tsx (размер бейджа + пометка), tests/typography_two_sizes_ratchet.test.mjs (одна запись в MICRO_FILES), новый тест-сторож activity.

Out of scope: заголовок «Недостаточно энергии» (осознанно оставлен координатором), тексты других окон, цены энергии.

## Architecture

No architecture change. Источник правды текста — `energyGateMessage(activity, …)`; без `activity` окно молча падало на «classic_lesson» — теперь это видно в журнале и закрыто сторожем.

## Security and privacy

Не затрагивает данные и права.

## Technical debt

Pay now: причина класса бага (молчаливый запасной вариант «урок») получает журнал и сторожа. Исключение d145-micro расширяет список MICRO_FILES на один файл по решению координатора и владельца (макет п.82).

## Verification

`node --test` нового сторожа и typography_two_sizes_ratchet; проверка строк тестов owner_states_r1_contract; кадр dialogs-011 пересъёмкой Сверки.

## Rollback

git revert коммита.
