# Task packet: «Text strings must be rendered within a <Text>» при шторке «Опрос» с Главной — сначала логи (5 · ВХОД)

Governance-ID: TG-64C63CC26199
Governance-ID: TG-A4A0A56202EE
Status: Шаг 1 — ловушка [TEXT-OUTSIDE]; причина по фактам не найдена
Owner: 5 · ВХОД И АККАУНТ (координатор 25.10, Сверка: красная ошибка ReactNativeJS 07:59:59 на эмуляторе)

## Outcome

Что известно: ошибка в отладочной сборке; Сверка связывает её с открытием шторки «Опрос» с Главной. Стека компонентов нет —
системный журнал эмулятора очищен (logcat -d в 08:05 начинается позже), в .expo/metro-console*.log ошибки нет.

Разбор по коду (разборщик исходников: голый текст, строка в {}, `a && b`, тернарник со строкой, выражения внутри View/Pressable):
HomePollV2Card, HybridSheetShell, SurveySheetModal, SurveyRewardPanel, SurveyQuestionTransition, HomeV2TodayCard, today_tasks —
чисто; в app/(tabs)/home.tsx единственный кандидат — `{item.current && …}` в окне званий (не путь опроса, item.current — флаг).

Шаг 1 (сейчас): ловушка HomeSheetTextGuard вокруг содержимого шторки опроса и анкеты с Главной. При ошибке рендера пишет
[TEXT-OUTSIDE] — имя шторки, текст ошибки, стек компонентов (точное место) и снимок данных (фаза опроса, шаг, число вариантов,
типы подписей / ключи запуска анкеты) — в консоль и в сохраняемый журнал (DebugLogger, critical). Вместо содержимого шторки —
пусто (в релизе падает шторка, а не вся Главная); повторное открытие пробует снова.
Шаг 2: Сверка повторяет сценарий → по стеку чиним место → тест рендера с тем значением.

## Scope

- components/home/HomeSheetTextGuard.tsx (новый).
- app/(tabs)/home.tsx — обёртка HomePollV2Card и SurveySheetModal.
- tests/home_sheet_text_guard.test.tsx (новый).

## Architecture

Классовый предохранитель React (getDerivedStateFromError + componentDidCatch); resetKey сбрасывает состояние при новом открытии.
Без новых зависимостей.

## Security and privacy

В журнал не пишутся тексты вопросов и ответов — только фаза, номера, количества и типы значений.

## Technical debt

После находки причины ловушку можно оставить как защиту шторок (логи на catch остаются навсегда по правилу «сперва логи»).

## Verification

Тест: ребёнок бросает эту ошибку → на месте пусто, [TEXT-OUTSIDE] со стеком и снимком; новое открытие — снова рендер.
Сценарий Сверке: Главная → «Сегодня» → «Опрос» → пройти вопросы до «Спасибо»; искать [TEXT-OUTSIDE].

## Rollback

git revert.
