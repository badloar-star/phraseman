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

Governance-ID: TG-9B3AAC81DA73
(Пик: короткая строка «Пока здесь никого» в пустом списке «Все участники», стиль 2.0, по слову координатора 05.11.)

Governance-ID: TG-770D4B71286C
(Друзья: убрать строки-описания наград 1 и 2 с прогрессом с вкладки, по слову владельца через координатора 05.11; награды остаются в «Как это работает».)

Governance-ID: TG-158E52EBB627
Governance-ID: TG-79F9591E65FF
Governance-ID: TG-57FE154567C6
Governance-ID: TG-7662D7596E50
(05.11 утро: Друзья без строк наград 1/2 + сторож + замок; затем Наборы по макету и Пик B по списку расхождений.)

Governance-ID: TG-FB12B3C18471
Governance-ID: TG-8414F59BA4F4
Governance-ID: TG-45E739BE8850
(Карточки 0/0 по макету cards-zero: без плашки «Начни с готового», кнопка «Создать набор»; затем Играть/заголовок в Пике, Главная 1:1.)

Governance-ID: TG-5C273962A7EB
(Друзья: разбор сиротской переработки «Как это работает» referral_ladder_how_sheet + strings: решение по вердикту.)

Governance-ID: TG-98AAEAB4501F
Governance-ID: TG-21539AEC10D5
(Пик B: убрана строка «Друзья на этой неделе»; Играть — по кадру.)

Governance-ID: TG-E804EF0A7756
(Главная 1:1: пилюля серии, «Сегодня», Фраза дня — по golden rev6-home-free-0.)

Governance-ID: TG-5C9BDC794184
(Сиротская лесенка приглашений: один атомарный коммит по решению координатора 05.11.)

Governance-ID: TG-8178A8D474F4
Governance-ID: TG-64702B1C4DB1
Governance-ID: TG-A3FE61BABDF0
(Главная: лента видео вернуть по логам + сортировка новое-первым; бейдж награды НЕ кодить до ОК владельца.)

Governance-ID: TG-2A5AEAD5E502

Governance-ID: TG-7CB0A82123C8
Governance-ID: TG-F41D23362BA8
(Бейдж награды: флаг/got/eligibility из хуков Моментов.)

Governance-ID: TG-3EB9135A7987
(Очередь координатора: Карточки (чип/«осталось») — уже есть по D174; Фраза дня с переводом; Играть по кадру.)

Governance-ID: TG-F0EF2A576D2D
(P0: лента видео не видна на устройстве владельца + шов в шапке сцены.)

Governance-ID: TG-EB3534727C02
(Раунд 2 удобств: Настройки — версия, «Только главное»; Главная — шов шапки по слою.)

Governance-ID: TG-131F620D25C2
(Настройки п.4: звук «верно» при включении звуковых эффектов.)

Governance-ID: TG-67C93B417DB1

Governance-ID: TG-6EF710F08EC6

Governance-ID: TG-4FC9CE318AC0

Governance-ID: TG-B3CCD85779EC

Governance-ID: TG-89214BFB591E

Governance-ID: TG-E72C017537EB

Governance-ID: TG-C24A72B87CA2

Governance-ID: TG-1D1C8AC7C5A9

Governance-ID: TG-2851C6C63E01

Governance-ID: TG-05A931177B5D

Governance-ID: TG-68098477FEEE

Governance-ID: TG-556BCE084496

Governance-ID: TG-7A33DB1D9836

Governance-ID: TG-6956E694B7A5

Governance-ID: TG-20350279F8DE

Governance-ID: TG-7CB14334E73D

Governance-ID: TG-4CFB1CD0546B

Governance-ID: TG-9DCD14D75956

Governance-ID: TG-EE930FC99C43

Governance-ID: TG-E4B8DFFDC62D

Governance-ID: TG-487B954B9B4F

Governance-ID: TG-CBA3D1EDA90C

Governance-ID: TG-44C88D148C3F

Governance-ID: TG-0F2F93F108B7

Governance-ID: TG-D9A229B70F7A

Governance-ID: TG-3BFD9E332323

Governance-ID: TG-94E3D39D9EAE
Governance-ID: TG-WELCOME-NEXT-TABBAR-1793883827
Governance-ID: TG-6AE6DF46B731
Governance-ID: TG-0AE670EDE273
Governance-ID: TG-8D645C8C91ED
Governance-ID: TG-E23A168BD3C4
Governance-ID: TG-84D98BF37FEF
Governance-ID: TG-C3E9ADA76D88
Governance-ID: TG-33E50503FFA7
Governance-ID: TG-F6CC7FFCAA53
Governance-ID: TG-4D2897ACFBF1
Governance-ID: TG-289F97A2ECD5
Governance-ID: TG-2E9897D1F65F
Governance-ID: TG-2E9897D1F65F
