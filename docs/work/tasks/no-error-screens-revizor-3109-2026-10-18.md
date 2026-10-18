# Task packet: две правки по ревизии 3.109 — один выход из сессии V2, тихие повторы хаба ошибок

Governance-ID: TG-C78E88197C40
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 08:33 — правки в своих коммитах b3cd64124/5880f040b до фиксации; ревизия 3.109.

## Outcome

1. Тихий уход из сессии V2 делает ОДИН переход. Ведёт его `exitLearningV2Session` родителя: флаг выхода, replace. Повторного `safeRouterBack` больше нет, двойной навигации тоже.
2. «Мои ошибки» без снимка тихо повторяют чтение все 3 раза: через 2, 5 и 10 с.

## Scope

В работе:
- components/learning-v2/LearningV2SessionUnavailable.tsx — вызов `onClose` вместо `onBack`;
- app/mistakes_hub.tsx — счётчик отказов в зависимостях эффекта.

Вне работы: остальные экраны.

## Architecture

Архитектура не меняется. Энергия в плеере списывается только на первом показанном вопросе (`LearningV2FirstQuestionShownReporter`). Ветки «недоступно» рисуются до вопросов, поэтому при тихом выходе энергия не списывается.

## Security and privacy

Не затрагивает.

## Technical debt

Pay now: двойной переход и недоработавшие повторы — оба закрываются в этой правке, новых долгов нет.

## Verification

- Babel-парс.
- Через слот: learning_v2_scripted_repeat_player_lifecycle, learning_v2_session_unavailable_back gate, node:test хаба.

## Rollback

Ревертнуть коммит.
