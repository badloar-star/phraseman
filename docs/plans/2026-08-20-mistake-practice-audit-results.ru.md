# Аудит системы «Ошибки» — итог 2026-08-20

Финальный независимый повторный аудит после исправлений: **PASS**, открытых
actionable P0/P1/P2 нет.

## Решение владельца

- «Моя практика» и весь старый Trainer/SRS runtime удаляются полностью.
- Обычный красный feedback и обязательный локальный повтор урока сохраняются.
- Вход: Карточки → левое меню → Ошибки.
- В setup sheet нет фильтров и поясняющего микротекста: только заголовок,
  `5 / 10 / 15 / Все` и «Начать».
- Слова, фразы, письменные и подходящие устные режимы всегда находятся в одной
  адаптивной очереди.

## Закрытые критические дефекты

- Локальные ключи физически разделены по владельцу и языку; отложенная запись
  старого аккаунта блокируется account-generation fence.
- Event journal переведён с одного неограниченного `users.progress` blob на
  content-addressed локальные chunks и immutable документы
  `users/{stableUid}/progress_events/mp_*`.
- Cloud append/list сверяет `expectedStableUid` с auth-derived stable binding;
  одинаковый `eventId` с другими байтами отклоняется.
- Небезопасный upload cursor удалён: backdated offline event не теряется.
- Звезда за исправление стала одной immutable/idempotent
  `client_authoritative_composite` операцией. Caller-controlled server claim не
  может создать новую trusted receipt.
- Composite привязан к владельцу и account generation. Переключение аккаунта
  между проверкой evidence и commit завершается fail-closed; старый receipt и
  новая операция имеют одну canonical identity и не дают двойную звезду.
- `correction_rewarded` содержит проверяемый semantic replay receipt. После
  восстановления или merge локальный wallet проверяет точные evidence bytes,
  безопасно привязывает операцию к текущему canonical owner и только потом
  считает цикл награждённым.
- Auth merge двухфазный: сначала обе identity только резервируются, затем durable
  worker постранично объединяет immutable events и лишь финальная транзакция
  публикует auth-link/owner-map и скрывает loser. Timeout не меняет локальную
  identity и не запускает wipe. Owner rematerialization, merge barrier и
  owner-map read в append закрывают позднюю запись loser; конфликт одинакового
  `eventId` с разными байтами оставляет обе стороны в pending fail-closed.
- Account deletion обходит незавершённые merge-reservation в обе стороны и
  удаляет обе identity, их `progress_events`, outbox и auth-связи даже после
  частичного копирования.
- Локальный content-addressed store удаляет только недостижимые chunks/pages
  после смены root и подчищает crash-orphans. Cloud restore отклоняет неверный
  или повторяющийся cursor и продолжает multi-page чтение через пустые страницы.

## Закрытые дефекты обучения и UI

- Learning V2 использует canonical `lesson-01` id; карточная draft-сессия не
  восстанавливается внутри Learning V2.
- Recognition/guided режимы не считаются independent production.
- Поддержка угасает по фактическим успешным попыткам; успешные независимые
  интервалы растут, ошибка доступна сразу.
- Ошибка в конце очереди получает реальные промежуточные задания перед
  обязательным повтором.
- Fill-gap скрывает токен, builder не позволяет бесконечно использовать одну
  плитку, listening показывает реальную кнопку аудио, speed-match не выбирается
  без полноценного набора пар.
- Голос имеет `PASS / FAIL / UNCERTAIN / INVALID`; два нейтральных исхода не
  тратят энергию. Синхронный latch блокирует двойной submit/двойное списание.
- Добавлены скрытие с подтверждением и Undo, content fingerprint и состояние
  недоступного исходного контента.
- Старые локальные семейства ключей удаляются один раз без импорта.
- Из live admin, monetization contracts и Gustav inventory удалены последние
  Trainer-флаги, лимиты и identifiers; permanent guard сканирует также live
  admin, scripts и tests.
- Account-generation fence не позволяет поздней загрузке аккаунта A показать
  его сессию или Learning V2 loop после переключения на B.
- Та же fence закрывает публичные read API ready/insights/achievement: поздний
  ответ A не возвращает приватную фразу после переключения на B.
- Удалённые и содержательно изменённые custom cards получают идемпотентный
  `content_unavailable`, исключаются из новой и сохранённой очереди.
- Cards badge/CTA считает готовые ошибки через тот же reconciled read API, что и
  runtime, поэтому удалённая custom card не оставляет stale count.
- Legacy cleanup неправильных глаголов удаляет реальные ключи старого factory:
  raw EN `irregular_verbs_srs_v1` и scoped FR
  `lesson_progress_v2::fr::irregular_verbs_srs_v1`; deleted-file/signal guard
  блокирует их возврат.
- Cloud restore собирает страницы и делает один пакетный journal commit; 2000
  событий восстанавливаются bounded числом graph writes, повтор идемпотентен.
- Добавлен сквозной contract урок → Cards → adaptive requeue → multi-day
  correction → одна звезда и отдельный handover.

## Проверяемые границы

- Event payload и аналитика не отправляют фразы, ответы или транскрипты.
- Прямой клиентский доступ к cloud progress namespace остаётся закрыт Rules.
- Account deletion удаляет `progress_events` через существующий recursive delete.
- Competitive Arena runtime, matchmaking, timer, rating и Arena wallet в новую
  систему не импортируются.

## Эксплуатационные ограничения

- Безопасный cloud upload повторяет локальные события идемпотентно; это дороже
  по сети при очень большом журнале, но не теряет backdated события.
- Общий root TypeScript build имеет посторонние блокеры Learning V2 content
  (`approved_first_ten_candidate_v2.json` и связанные strict errors); focused
  модули системы «Ошибки» проверяются отдельными gates.
- Jest завершает focused suites только с `--forceExit`; открытые handles являются
  общей инфраструктурной проблемой проекта, не доказательством падения тестов.
- Финальные focused gates: пользовательская система — 26 suites / 124 tests;
  critical root auth/economy/Rules — 12 / 267; server auth/merge/delete/Jarvis —
  6 / 252; независимый повтор root reward/auth — 4 / 51; независимый повтор
  server merge/event/reward — 3 / 94; delete + merge — 2 / 111. Все PASS.
- Повторный финальный gate после всех code-review исправлений: **33 suites / 148
  tests PASS**; critical root — **10 / 252 PASS**; Functions — **5 / 172 PASS**;
  focused regression — **7 / 23 PASS**; focused ESLint и diff-check — **PASS**.
- Окончательный независимый read-only review: **PASS**, actionable P0/P1/P2 нет.
- Полный handover с командами и ограничениями:
  `docs/plans/2026-08-20-mistake-practice-handover.ru.md`.

## Продолжение полного аудита — 2026-08-21

После визуальной перепроверки по прямому требованию владельца удалены ещё три
остатка интерфейсного шума и связи с главной:

- из Learning V2 loop убрана видимая микроподпись «НЕОБЯЗАТЕЛЬНАЯ ПЕТЛЯ»;
  доступное скринридеру описание сохранено;
- с финала сессии убрана поясняющая строка «Ошибки уже обновлены…»; обязательные
  «Правильный ответ» и «Почему так» сохранены;
- из карточек-компаса главной полностью удалён совет «Ошибки» на русском и
  украинском, включая устаревшее обещание режима «только голос»;
- Home runtime больше не читает журнал ошибок, не держит `dueCount` и не кладёт
  его в hydration snapshot. Ошибки остались только в Cards и в контекстном loop
  Learning V2.

Лёгкие детерминированные проверки подтвердили: setup sheet содержит только
заголовок, размеры и старт; в live-коде нет старых названий или voice-only
флагов; пять изменённых runtime-файлов синтаксически разбираются TypeScript;
targeted whitespace check — PASS.

Полный root typecheck был реально запущен с 12 GB heap и завершился с 52
ошибками в 15 несвязанных файлах (Learning V2 session, motion handoff,
theme/asset tests и другие). В файлах системы «Ошибки» ошибок нет. Лог:
`.codex-tmp/codex-safe-run/20260821_064420_node/stdout.log`.

Полный root Jest оказался непригоден для безопасного продолжения на этой машине:
параллельный прогон был остановлен после признаков перегрузки, а один узкий Jest
с heap 2 GB завершился OOM. После сообщения владельца о перезагрузках все Jest и
safe-run процессы остановлены; активен один агент. Повторные тяжёлые gates в этом
сеансе намеренно не запускались. Это ограничение среды, а не зелёный результат
полного project suite.

## Щадящий полный аудит текущего Mistake Practice scope — 2026-08-21

После сообщения владельца о перезагрузках компьютера все проверки выполнялись
последовательно, по одному тестовому файлу, без watchman, параллельных воркеров,
полного Jest/typecheck и увеличения heap.

Свежий результат: основной gate **33 suites / 149 tests PASS**, Functions
**9 / 324 PASS**, дополнительные critical root contracts **4 / 23 PASS**,
Personal Plan **3 / 14 PASS**, Weekly Review **4 / 25 PASS**, admin/motion
**2 / 8 PASS**, achievements **1 / 29 PASS**, progress-events **1 / 35 PASS**.

Аудит выявил не runtime-регрессии, а четыре устаревших/хрупких тестовых
контракта. Они обновлены под фактические действующие контракты: composite shard
credit, переносимый LF/CRLF, quote-independent event subscription и новый
`open_mistake_practice` route. Все четыре сначала воспроизвели RED и затем дали
GREEN.

Отдельно исправлены два новых lint-дефекта в изменённой галерее достижений:
название и описание больше не обрезаются через `numberOfLines`, а полностью
переносятся. Focused ESLint — PASS. Ошибка text-integrity в
`FlashcardsTabBar.tsx` существует в `HEAD` и не относится к этой работе.

Несвязанный baseline-конфликт `account_delete_worker.test.ts` оставлен без
изменения. Полный project gate не заявляется зелёным: он намеренно не повторялся
из-за ограничений машины. Коммит и deploy не выполнялись.
