# Макет экрана «Пик»: монеты, топ-5, рекорд ступени

Governance-ID: TG-C4A4556DCE7D
Status: In progress · «3 · МАКЕТЫ», заказ координатора 04.11 (слова владельца). Публиковать только по слову координатора.

## Outcome
Интерактивный артефакт на реальных кадрах текущего экрана Пика: счётчик монет и место; топ-5 по монетам недели с пометкой «повышаются»; вместо «твоё место» — рекорд ступени (кому принадлежит, время); «Все участники» с монетами вместо ступеней; тап по ступени — карточка рекорда; крайние состояния.
## Scope
Файлы в scratchpad публикации; репозиторий и код приложения не меняются.
## Architecture
Кадры Сверки как фон, HTML-слои поверх по координатам кадра, цвета — токены темы; рекорд по модели Codex (floor:step, 135 адресов, время сервера, держатель).
## Security and privacy
Имена участников — как сейчас на экране; в макете вымышленные.
## Technical debt
Рекорд ступени в production без данных (флаги Codex выключены) — на макете пометка «нужны данные».
## Verification
playwright по http: все состояния × темы, 0 ошибок/404.
## Rollback
Удалить артефакт.

Governance-ID: TG-519E52DC882C
(аудит каталога против 133/134 + черновик Пика на заготовках без кадров; данные Ядра: weekCoins есть, рекорд внутри комнаты, вершинники повышаются сверх топ-5.)

Governance-ID: TG-36774D95A2FC
(публикация разрешена координатором: один html peak_mockup.html без внешних зависимостей в docs/work/mockups/peak-screen-2026-11-04/ на имеющихся кадрах peak_main; «Все участники» — рисуется поверх main с пометкой.)

Governance-ID: TG-737036C7A17B
(сборка peak_mockup.html на непустых кадрах peak_main_*; Все участники и шторка ступени рисуются слоем с пометкой «кадр досинхронизируется».)

Governance-ID: TG-07FDE7569B65
Governance-ID: TG-13EF02059979
Governance-ID: TG-65FDEA62BDC2

Governance-ID: TG-E733B1E20723
Governance-ID: TG-3FEBE2CE270F
Governance-ID: TG-0DFAF5CD4156
Governance-ID: TG-63F0F63C09B2
Governance-ID: TG-0DFAF5CD4156
Governance-ID: TG-D31A45EB24BA
Governance-ID: TG-8D4942AE1D89
Governance-ID: TG-87905F721B37
Governance-ID: TG-D659F3A2CAB9
Governance-ID: TG-0BF5FF4A31C7
Governance-ID: TG-129D6C5F335E
Governance-ID: TG-226922382581
Governance-ID: TG-942EB0D35B7D
Governance-ID: TG-891D60EC748E
Governance-ID: TG-CFD845E33E51
Governance-ID: TG-EAEF23BB0E29
Governance-ID: TG-1D1D29369752
Governance-ID: TG-3A5A06B964BE
Governance-ID: TG-5DFF70664240
Governance-ID: TG-15EC2A5662CC
Governance-ID: TG-71787FFCF1DB
Governance-ID: TG-0483598D096B
Governance-ID: TG-1F3F8D980264
Governance-ID: TG-FC9A4D87B7A5
Governance-ID: TG-8E2DB4685BB1
Governance-ID: TG-5FAFD7A73FF0
Governance-ID: TG-428E3CF8616A
Governance-ID: TG-FB5D8EE3AE9E
Governance-ID: TG-889790222167
Governance-ID: TG-9D79D9CD7125
Governance-ID: TG-76D474B323C1
Governance-ID: TG-59E0A70181B8
Governance-ID: TG-DF5119DD839A
Governance-ID: TG-1AE176D6CEB7
Governance-ID: TG-0F6FDB0E5897
Governance-ID: TG-E85DCC524D1D
Governance-ID: TG-E85DCC524D1D
Governance-ID: TG-AAAAF88EBC1F
Governance-ID: TG-DBCD58E2A102
Governance-ID: TG-61435192717A
Governance-ID: TG-91D2B8EE4408
Governance-ID: TG-EA406FCCF7AB
Governance-ID: TG-23767264075B
Governance-ID: TG-F847CCC50B19
Governance-ID: TG-562C481B5EAA
Governance-ID: TG-7D51D845A704
Governance-ID: TG-148CB4C95BF0
Governance-ID: TG-148CB4C95BF0
Governance-ID: TG-627CCB1FF4DB
Governance-ID: TG-539096EEFC07
Governance-ID: TG-3EFF6AB5BA44
Governance-ID: TG-10B5D02C0300
Governance-ID: TG-CB5D33272CAB
