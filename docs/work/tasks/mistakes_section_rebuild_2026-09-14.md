# Task packet: перестройка раздела «Работа над ошибками» по утверждённым макетам

Governance-ID: TG-DE0BF37DD1C8
Governance-ID: TG-D0FBDE927385
Status: In progress
Owner: сессия Claude (Fable 5.1), владелец badloar@gmail.com
Related epic/enabler: docs/design/mistakes/index.html (макеты, утверждены 2026-09-14)

## Outcome

Владелец утвердил макеты (хаб Б, промах А, карточка ошибки Б, финал А, полка А,
пустые Б) и решения: без персонажа и без пометки «ИИ»; раздел бесплатен с
дневным лимитом (1 сессия/сутки, дальше Plus); подсказка хаба генерируется ИИ
раз в сутки и лежит готовой ДО открытия раздела; кнопка на Главной напротив
«Сегодня» пульсирует тем быстрее, чем больше ошибок, всегда со счётчиком,
скрыта при нуле; сессия от 1 ошибки, меньше 5 без энергии; старая плитка
«Мои ошибки» вместо «Продолжить урок» убрана; награды как в макете.

Успех этапа 1: кнопка у «Сегодня» ведёт в хаб; хаб показывает карту слабых
мест, подсказку, источники, список ошибок и запускает сессию любой длины от 1;
дневной лимит и энергия работают по правилам; все затронутые тесты зелёные.

## Scope

Этап 1 (этот пакет):
- `components/home/HomeMistakesPulseButton.tsx` (новый), `app/(tabs)/home.tsx`
  (ряд «Сегодня» + кнопка; счётчик активных ошибок), `app/home_learning_priority_card.ts`
  (всегда «Продолжить урок») + тест.
- `app/mistakes_hub.tsx`, `app/mistakes_list.tsx` (новые экраны), `app/_layout.tsx` (маршруты).
- `modules/mistake-practice/session.ts` (длина от 1), `app/mistake_practice_insights.ts`
  (источники, снапшот хаба, счётчики Главной), `app/mistake_practice_session.tsx`
  (энергия только от 5, дневной лимит, без Plus-замка), `components/mistake-practice/MistakePracticeSetupSheet.tsx`.
- `app/revenue_daily_limits.ts`, `app/revenue_daily_quota.ts`, `app/feature_gates.ts`,
  `app/remote_flags.ts`, `hooks/useMistakePracticeStartGate.ts` (новый), `app/paywall_copy.ts`
  (контекст `mistake_practice` → текст дневного лимита), `components/dev/paywallDevContexts.ts`.
- `app/mistake_hub_advice.ts` (клиент: кэш на сутки + фолбэк по правилам),
  `functions/src/mistake_hub_advice.ts` + экспорт в `functions/src/index.ts` (деплой не делается).
- Тесты: обновление `mistake_practice_session`, `mistake_practice_setup_sheet`,
  `mistake_practice_insights`, `mistake_practice_runtime_journey`, `home_learning_priority_card`;
  новые: `mistakes_hub_contract`, `mistake_hub_advice_fallback`, `home_mistakes_pulse_model`.

Этапы 2-4 (отдельные коммиты, этот же пакет дополняется): задание с разбором
ответа и предгенерацией; карточка ошибки; финал, серия, цель недели, полка, звания,
достижения `mistake_*`.

Out of scope: правка правил Firestore и деплой functions (владелец делает
поштучно), MAX, Learning V2 loop node (остаётся как есть, лишь ведёт в хаб).

## Architecture

Границы сохраняются: журнал событий (`mistake_practice_store`) остаётся
единственным источником истины, проекция `projectMistakes` не меняется.
Новое: `loadMistakePracticeHubSnapshot` строит из журнала всё, что нужно хабу и
списку (insights + готовые элементы) одним чтением. Дневной лимит - новый вид
квоты `mistake_practice_starts` в существующем ядре чеков PhoneState (гейт
`mistake_practice` → `gate_mistake_practice_premium`, дефолт true). Подсказка
хаба: клиент хранит `mistake_hub_advice:v1:<uid>:<target>:<lang>` с датой и хэшем
сводки; сервер `mistakeHubAdvice` кэширует ответ на (stableUid, день) в Firestore
и генерирует не чаще раза в сутки; клиент показывает кэш или правило-фолбэк,
обновление идёт фоном при заходе на Главную, поэтому раздел открывается без
ожидания. Энергия: 10 ⚡ только для сессий от 5 ошибок.

## Security and privacy

Auth: callable требует `request.auth.uid`, identity только через
`resolveStableUidForAuth`. В сводку для ИИ уходят только учебные фразы, типы
ошибок и счётчики, без имени/почты/uid в тексте. Данные не новые: журнал ошибок
уже хранится локально и в облаке; ИИ-разбор ошибок уже покрыт согласием
`ai_explain_consent` и политикой. Проверить при этапе 2, что предгенерация
объяснений уважает согласие (не вызывать без consent).

## Technical debt

- Достижения `mistake_*` отсутствуют (событие уходит в пустоту). Pay now на
  этапе 4 (заводятся вместе со званиями).
- `MistakePracticeSetupSheet` остаётся только для DEV-переключателя на Главной.
  Contain: удалить на этапе 4 после переезда всех входов в хаб; тест
  `mistake_practice_setup_sheet` обновлён под новую семантику длины.
- Дубль ядра квот (RVTD-026) не трогаем.

## Verification

- Точечный jest по затронутым тестам (список в Scope) под слотом светофора.
- Точечная проверка типов по затронутым файлам под слотом.
- Ручной путь: Главная → кнопка «Ошибки · N» → хаб → «Разобрать» → сессия;
  при 1-4 ошибках энергия не списывается; вторая сессия за день у обычного
  аккаунта → пейвол `mistake_practice`; при 0 ошибок кнопки на Главной нет.
- Логи: префикс `[MISTAKES-HUB]` на входе/выходе загрузки хаба, `[MISTAKES-GATE]` на
  решении дневного лимита, `[MISTAKES-ADVICE]` на кэше/сети подсказки.

## Rollback

Флаг `gate_mistake_practice_premium=false` в Пульте снимает лимит. Откат кода:
revert коммитов этапа; журнал ошибок и чеки квоты остаются совместимы (новый
вид чека просто не читается старым кодом). Кэш подсказки - отдельный ключ
AsyncStorage, безвреден.
