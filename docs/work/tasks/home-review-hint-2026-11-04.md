# Task packet: подсказка «Повторить N слов · M мин» на Главной

Governance-ID: TG-D93F95E4FE6F
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: none

## Outcome

Удобство №8 (владелец одобрил 04.11): когда слова начинают забываться, на Главной появляется строка «Повторить {n} слов · {min} мин»; один тап ведёт в мини-тренировку карточек. Показывается только при n ≥ 5, без мелких подписей, токены темы, без новых тяжёлых View.

## Scope

In scope: чистая функция подсчёта и копии (app/home_review_hint.ts, app/home_review_hint_copy.ts), хук чтения (hooks/use_home_review_hint.ts), компонент строки (components/home/HomeReviewHint.tsx), тесты. Подключение в app/(tabs)/home.tsx — отдельным хунком после согласования с сессией «Вход». Out of scope: изменение SRS и экономики, Firebase, содержимое тренировки.

## Architecture

Источник — локальная память карточек (AsyncStorage, flashcardsSwipeMemoryKey) через уже существующий loadFlashcardStatuses: статус review = срок повторения подошёл. Число слов считается в чистой функции, длительность — из секунд на слово. Результат кэшируется в памяти процесса (stale-while-revalidate): первый кадр без ожидания.

## Security and privacy

Данные читаются только локально и никуда не уходят; новых данных не собирается. Политика конфиденциальности не затрагивается.

## Technical debt

Contain: переход в тренировку использует существующий маршрут карточек с размером сессии; отдельного фильтра «только просроченные» в маршруте нет — порядок отбора определяет экран тренировки.

## Verification

Тест чистых функций (порог 5, округление минут, пустая и повреждённая память), тест копии на 9 языках, проверка типов.

## Rollback

Откатить коммит: Главная без подсказки, данные не затронуты.

Governance-ID: TG-C4994D0A90F0

Governance-ID: TG-1EFA0BCCEE46

Governance-ID: TG-225DF5E90010

Governance-ID: TG-E550367F2A9C

Governance-ID: TG-12424C097D68

Governance-ID: TG-EBF7949C7F58

Governance-ID: TG-51658A830E68
Governance-ID: TG-417E515716A8

Governance-ID: TG-ADC448EE5CB9

Governance-ID: TG-1B6E6FDC4CC6

Governance-ID: TG-3C850E03F839

Governance-ID: TG-2A5C1913515B

Governance-ID: TG-68CCE313AE89

Governance-ID: TG-23360DE8A111

Governance-ID: TG-D2D90549A450

Governance-ID: TG-D77F4D2F2B3C

Governance-ID: TG-A4EB2D756632

Governance-ID: TG-E1C995520250

Governance-ID: TG-2EB2416C7C88

Governance-ID: TG-8AFE1DE76945

Governance-ID: TG-7CA378E3EF77

Governance-ID: TG-D0755289C239

Governance-ID: TG-70BD1B875B97

Governance-ID: TG-F71F2DD900A4

Governance-ID: TG-E6ACC1D08B42

Governance-ID: TG-AA6F2A7CEBA6
(Сообщество, ревью 05.11: замок двойного тапа по реакции отклика PackCommentsSheet; логику Firestore не трогаем.)

Governance-ID: TG-A72DAD04710D
(Пик B: перенос слов в PeakMyCounter, правка вёрстки по слову координатора 01:29.)

Governance-ID: TG-A93C76C7DDB3
(Утро 05.11: механический проход по обводкам/цветам, правки только по списку и кадрам.)

Governance-ID: TG-4944AF848CD1
(Закрытие статусов моих пакетов по инвентарю Моментов, 05.11; правка текста paywall-fine отложена до кадра и слова координатора.)
