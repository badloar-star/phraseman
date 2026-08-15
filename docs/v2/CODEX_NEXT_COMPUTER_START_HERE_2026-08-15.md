# Learning V2 — START HERE для Codex на другом компьютере

**Дата передачи:** 2026-08-15, Europe/Dublin  
**Репозиторий:** `git@github.com:badloar-star/phraseman.git`  
**Рабочая ветка:** `feature/referral-roulette`  
**Статус цели:** ACTIVE, не release-ready  
**Назначение:** один короткий вход, после которого Codex точно знает, что читать,
что уже доказано, что остаётся открытым и какой следующий безопасный шаг делать.

## 1. Как получить точное состояние

```bash
git clone git@github.com:badloar-star/phraseman.git
cd phraseman
git fetch --all --tags --prune
git switch feature/referral-roulette
git pull --ff-only
git status --short --branch
```

Ожидается чистое рабочее дерево. Нельзя начинать с `master`, старой release-ветки
или случайного локального checkout. Нельзя делать `reset --hard`, force-push,
удалять ветки или восстанавливать файлы из старых веток без прямого решения
владельца.

Если этот файл открыт не из `feature/referral-roulette`, сначала остановиться и
исправить checkout. Точный commit передачи всегда определяется так:

```bash
git log -1 --oneline --decorate
git rev-parse HEAD
git status --short
```

## 2. Обязательный порядок чтения

До кода прочитать полностью и именно в этом порядке:

1. корневой `AGENTS.md` — он заменяет все старые инструкции;
2. этот файл;
3. `docs/v2/EXECUTION_PLAN_2026-08-09.md`;
4. `docs/v2/README.md`;
5. `docs/v2/HANDOVER.md`, особенно самый новый хвост `15.148`–`15.160j`;
6. `docs/v2/GENERATOR_DELIVERY_CONTRACT.md`;
7. `docs/v2/QUALITY_REFERENCE_GENERATED_CURRICULUM_V3.md`;
8. нормативный документ `docs/v2/00`–`08`, относящийся к текущему пакету.

Старые планы и прототипы служат только историей. Более поздние owner-lock в
Execution Plan/Handover побеждают старые числа и архитектурные решения.

## 3. Неподвижные решения владельца

- Реальные уроки E1–E32 создаёт только владелец через генератор. Codex строит
  генератор, контракты, проверки, neutral QA fixtures и release-путь, но не
  заполняет за владельца production-курс.
- Основной курс: **32 урока × 56 сессий**. В уроке 7 глав по 8 сессий.
- Сессия длится примерно 5–8 минут. Число основных взаимодействий адаптивное:
  обычно 14–18, быстрые сессии 18–22, voice/listening/dialogue-heavy 10–14;
  retries и объяснение второй ошибки идут сверх базы.
- Проверки глав: сессии 8/16/24/32/40/48; сессия 56 — итоговый экзамен урока.
- На экране V2 показываются обычные карточки уроков. Нажатие раскрывает карту
  прямо внутри списка; открыта максимум одна карта, остальные карточки
  сдвигаются вниз. Отдельный экран списка сессий и accordion-замена запрещены.
- Модал session node сообщает конкретно, чему пользователь научится/что поймёт.
  `Начать` закрывает модал и открывает intro. Intro-вопрос находится внизу того
  же intro-экрана, а не отдельным заданием после intro.
- Каждое selectable слово/chip имеет отдельное аудио. Полная фраза и все слова
  одного interaction используют один и тот же выбранный голос.
- Первая ошибка: без красной рамки, только лёгкая прозрачная shake-анимация и
  вариант не выбирается. Вторая ошибка внутри задания показывает подготовленное
  объяснение. Каталог объяснений хранится/фильтруется по языку, типу задания,
  уроку и сессии.
- В каждой сессии доступны compact Report, hold-to-talk и Save-to-cards.
- Сервер полностью исключён из вычисления ответа. Correct/wrong решает только
  локальный device evaluator; ответ, выбор и transcript на сервер не уходят,
  verdict с сервера не приходит. Сервер в фоне сохраняет только answer-free
  summary полностью завершённой сессии.
- Если приложение реально ушло в background до завершения, run аннулируется.
  Следующий вход создаёт новый `sessionRunId` и начинается с intro page 1;
  частичного resume нет. Краткий системный `inactive` permission sheet не
  считается обрывом.
- Legacy-функциональность нельзя удалять или скрывать побочным эффектом.
- Learning V2 не даёт разрешения менять админку. Если владелец отдельно поручит
  admin UI, сначала заново прочитать актуальный `AGENTS.md` и Admin UI Bible.
- Никаких deploy, push, production mutation, provider spend или owner approval
  без отдельного прямого поручения.

## 4. Что уже реализовано и проверено

### Топология, генератор и карта

- Аддитивная topology-модель 32×56 и разбивка 7×8 существуют.
- Generator contracts и quality/reference gates существуют; старый neutral
  `12 sessions × 12 tasks` остаётся только foundation fixture, не полным уроком.
- V2 lesson cards и inline-карта физически открылись в подписанной iOS Debug-
  сборке. Карта раскрывается внутри списка, одновременно открыта одна.
- Session outcome modal физически показывает `Что вы поймёте`; `Не сейчас`
  закрывает его, `Начать` уводит на session screen.
- Learning V2 route-art registry связывает course/lesson с `lessons`, session с
  `lessonPractice`, поэтому активная тема не падает на home-art fallback.

### Device runtime и серверная граница

- Direct player использует composite v3 readiness: canonical learner material
  и все выбранные hash-verified MP3 готовы до открытия intro.
- Phrase и каждый selectable chip воспроизводятся из локального `file://` cache;
  network request на tap/playback отсутствует.
- Один voice index выбирается на interaction/run и применяется к фразе и словам.
- Background interruption очищает completions/attempt state, меняет run ID и
  возвращает к первой intro-странице.
- Course session completed summary не содержит answer/verdict/transcript.
  Completion callable возвращает только технический saved/duplicate receipt.
- Callable v3 доставляет immutable learner-safe text+audio material, но не
  участвует в ответах и не получает ответные поля.

### Release foundation

- Versioned v3 text+audio root, lesson audio indexes, immutable Storage pins,
  generation/hash/size/content-type readback, Firestore CAS active head и
  rollback foundation реализованы.
- Ответные authorities в публичных/server delivery контрактах остаются `none`
  или `local_device_only`; release foundation не подменяет human approval.
- Validator #6 durable foundation существует, но registry нельзя считать
  полностью установленным/release-ready без оставшихся интеграционных gates.

### Последние свежие доказательства

- Device session runtime: **1 suite / 9 tests PASS**.
- Answer-free completion callable: **1 suite / 2 tests PASS**.
- App runtime/client/audio focused gate: **3 suites / 14 tests PASS**.
- Callable v3 + import/live guard: **2 suites / 16 tests PASS**.
- Route/theme backdrop contract: **1 suite / 8 tests PASS**.
- Подписанная iOS Debug-сборка: `BUILD SUCCEEDED`; строгая `codesign`-проверка
  GREEN; SecureStore/account-security startup GREEN.
- Deploy и production writes в этом доказательстве не выполнялись.

Полные исторические counts и точные файлы каждого пакета находятся в конце
`docs/v2/HANDOVER.md`. Не складывать их механически в одну ложную цифру общего
PASS: это узкие доказательства отдельных границ.

## 5. Что ещё НЕ готово

1. Нет опубликованного neutral QA session package для полного физического v3
   прохода. Поэтому текущий signed smoke после `Начать` честно показывает
   `Сессия недоступна`; fallback-контент не подделывался.
2. Не закрыта полная device-матрица: iOS/Android cold load, LKG offline reopen,
   background restart, rapid repeated chip taps, audio arbitration с
   hold-to-talk, VoiceOver/TalkBack, large text и reduced motion.
3. Не доказан единый owner-generator E2E: owner input → 32×56 generation →
   preview/review → immutable release → active readback → rollback.
4. Нельзя считать production-ready maker/checker, transitive production
   provenance, owner-authored immutable input и единый release root, пока exact
   private handles/receipts и hostile RED matrix не замкнуты.
5. Реальный контент E1–E32 отсутствует намеренно: его создаёт владелец после
   готовности генератора. Neutral fixtures должны быть педагогически сильными,
   но не объявляются production-контентом без owner review/approval.
6. Полный общий repository test suite не является зелёным доказательством:
   работают только узкие gates, а известные несвязанные legacy failures должны
   оставаться честно перечисленными.

## 6. Точный следующий безопасный шаг

### ЗАКРЫТО 2026-08-15 — neutral QA package + локальный E2E harness

Шаг выполнен, **повторять не нужно**. Подробности: `HANDOVER.md` § 15.161.

- `modules/learning-v2/content/neutral_qa_session_fixture_v1.ts` — нейтральный
  пакет: 3 intro-страницы + 14 практических, `neutral_test_fixture`,
  `releaseAuthority:false`, ID с префиксом `qa-neutral-`.
- `tests/learning_v2_neutral_qa_session_e2e_harness_v1.test.ts` —
  **1 suite / 10 tests PASS**.
- `tests/learning_v2_neutral_qa_hostile_red_matrix_v1.test.ts` —
  **1 suite / 8 tests PASS**, каждый кейс проверен мутацией исходника.

Отдельно зафиксировано решение владельца о генераторе: это пайплайн в админке,
исполнитель Claude/Codex, OpenAI только для TTS. Спецификация стадий S0–S9 —
`GENERATOR_PIPELINE_SPEC_2026-08-15.md`, карта видна во вкладке `#v2-generator`
(сейчас честно показывает «Доказано 1 из 10»).

### Следующий незакрытый шаг — S9 device-матрица

Локальные тесты её НЕ заменяют. Нужен физический проход на устройстве:

1. подписанная сборка на реальном телефоне (dev-клиент для iPhone собран
   2026-08-15, коммит `b3c6b86e1`);
2. cold load, LKG offline reopen, background restart;
3. быстрые повторные тапы по chip;
4. аудио-арбитраж с hold-to-talk;
5. VoiceOver / TalkBack, крупный шрифт, reduced motion;
6. подтвердить, что answer-free сводка уходит в фон только после полного
   завершения сессии.

Учесть: neutral QA package **не опубликован**, поэтому на устройстве занятие
по-прежнему упрётся в `Сессия недоступна`. Публикация требует отдельного
разрешения владельца — deploy запрещён без него.

Параллельно доступны без deploy: S2 coverage matrix, S5 quality dashboard,
S6 двухшаговое подтверждение.

## 7. Правила работы следующего Codex

- Сначала `git status`, callers/contracts/tests, затем edit.
- Сохранять чужие изменения; не использовать destructive Git-команды.
- Искать через targeted `rg`; не читать тяжёлые деревья и не запускать broad
  Jest/typecheck без необходимости.
- Использовать `apply_patch` для исходников; тесты не должны переписывать source.
- Не создавать ветку/worktree/делегированную coding task без прямого запроса.
- Не трогать файлы Арены и не откатывать их.
- При изменении Firestore schema/collection обновлять rules и Jarvis contract в
  том же change.
- После существенного пакета: узкие tests, formatting/diff-check, обновление
  `docs/v2/HANDOVER.md`, понятный отчёт владельцу на русском.
- Никогда не писать «готово» или «release-ready» по одному узкому PASS.

## 8. Быстрый self-check перед продолжением

```bash
git status --short --branch
git log -3 --oneline --decorate
rg -n "15\.160j|Owner topology correction" \
  docs/v2/HANDOVER.md docs/v2/EXECUTION_PLAN_2026-08-09.md
npx jest tests/learning_v2_session_runtime_contract.test.ts \
  tests/app_art_backdrop_contract.test.ts --runInBand
```

Functions completion gate запускать отдельно из `functions/`, чтобы не смешать
две Jest-конфигурации:

```bash
cd functions
npx jest src/learning_v2/course_session_completed_summary_callable_v1.test.ts \
  --runInBand
```

После этих шагов Codex должен коротко сообщить владельцу: текущий commit,
чистота checkout, открытый шаг, acceptance criteria и какие узкие проверки он
запустит. Только затем начинать изменения.

## 9. Статус передачи через GitHub

На момент передачи основная рабочая ветка `feature/referral-roulette`, все
локальные теги и все полезные дополнительные ветки отправлены в `origin` и
проверены повторным `fetch`/сравнением SHA.

Локальная diverged-ветка сохранена без перезаписи удалённой истории под именем:

```text
origin/codex/full-performance-audio-audit-167-mac-20260815
```

Единственное исключение — старый локальный архив
`codex/mac-handoff-backup-20260522` (`fbb2149cc...`). GitHub отклоняет его из-за
случайно закоммиченных `.codex-tools`/`.codex-tmp`, включая JDK-объекты размером
123–191 МБ и около 1,7 ГБ локальных SDK/кэшей. Эта ветка не является входом в
Learning V2 и на другом компьютере не нужна. Не пытаться восстанавливать из неё
курс или подменять ею основную ветку. Если когда-нибудь понадобится именно этот
исторический локальный архив, сначала отдельно согласовать безопасную очистку
его истории; force-push и перенос SDK/кэшей запрещены.
