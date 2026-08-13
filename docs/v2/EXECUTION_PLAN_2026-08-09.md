# Learning V2 — исполнимый план release-ready реализации

> **Обязательный входной контракт:** перед продолжением любой стадии полностью
> прочитать [GENERATOR_DELIVERY_CONTRACT.md](./GENERATOR_DELIVERY_CONTRACT.md).
> Следующая стадия не начинается до полного гейта текущей, а общая формулировка
> «генератор готов» запрещена до выполнения его полного Definition of Done.

**Статус:** active.
**Зафиксирован:** 2026-08-09.
**Цель:** довести Learning V2 до проверяемого release-ready продукта, не
подменяя учебные доказательства наградами, не удаляя legacy и не ослабляя
security, privacy, accessibility или performance contracts.

## Нормативные источники

Порядок приоритета: `AGENTS.md`; главный owner handover
`LEARNING_V2_FULL_OWNER_HANDOVER_2026-08-02.md`; фактический readiness-срез и
RN map spec от 2026-08-02; `LEARNING_V2_MASTER_WORK_PLAN.md` от 2026-07-29;
полный аудит/журнал 360 решений от 2026-07-28; revision от 2026-07-26;
[README](./README.md), [HANDOVER](./HANDOVER.md), документы `00`–`08`,
исполняемый E1 compiler plan от 2026-07-22; затем контрактные тесты и
фактический код в `modules/learning-v2/` и `functions/src/learning_v2/`.

Отдельного дословного журнала вопросов нет. Принятые смыслы как минимум 360
ответов сведены в owner handover и audit; интервью было осознанно остановлено
после вопроса 360. Более позднее решение всегда побеждает раннее.

P1 / E1 real-content slice и E1 content compiler уже существуют: настоящий
Lesson 1 связывает 50 legacy-фраз, intro, theory и vocabulary с 12 сессиями по
12 заданий и server QA. Это не закрывает P0/P2, пользовательский runtime, app
map, семь RN mode screens, device proof или rollout.

`admin/v2` не является допустимой поверхностью работ: любые разрешённые
authoring-задачи должны использовать только корневой админ-путь и никогда не
обходить этот запрет.

## Неподвижные инварианты

1. 32 стабильные учебные единицы, каждая с 12 обязательными сессиями; optional
   practice не обязательна для пути и не создаёт mastery.
2. Performance stars, earned/purchased access и LearningEvidence физически
   раздельны. Покупка или farmable practice не проходит checkpoint и не
   подтверждает знание.
3. Voice-режим всегда имеет честный fallback для permissions, сети, шума,
   недоступного STT и accessibility.
4. Runtime local-first, account-scoped, идемпотентен и переживает offline,
   restart и account switch.
5. Legacy остаётся доступным до отдельного подтверждённого решения после
   паритета и rollout evidence.
6. Экран не прыгает при загрузке, скрытые экраны не держат hot timers, а
   анимации уважает reduced motion и фокус/AppState.

## Последовательность выполнения

### Предварительный архитектурный пакет — COMPLETE (2026-08-09)

React-free activity kernel закрыт: core возвращает только декларативную
`ActivityRegistration`, UI-resolver принадлежит presentation layer. Узкий
strict TypeScript check прошёл; 6/6 registry tests и 419/419
identity/session/episode/E1 compiler tests прошли. Root typecheck не выявил
ошибок Learning V2 и остановился только на отсутствующем `@playwright/test` в
старых `tests/e2e/r7/**`.

### P0 — versioned contracts and tests — COMPLETE (2026-08-09)

- Подтвердить ровно 12 заданий и только семь обязательных family:
  Phrase Builder, Listen & Choose, Sound Contrast, Listen & Build, Context Gap,
  Speed Match, Repeat & Compare.
- Закрыть versioned contracts 3/2/1/0 stars, price ladder
  `0 → 45 → 50 → 55 → 60 → 65`, repeat reward 20/12/5/0, отдельный Hard Mode
  result и migration statuses.
- Не смешивать performance, access wallet и learning evidence.

**Gate:** focused contract matrix green; запрещённый family, farmed practice,
Hard/normal cross-write или старая кардинальность 7–9 fail closed.

**Доказательство:** добавлены immutable `course_economy.v1`,
`session-channels.v1` и `legacy-migration-policy.v1`. Текущая глобальная
session ladder отделена от historical pinned Season gate. Strict targeted
TypeScript, diff-check и 10 suites / 95 tests прошли. Отдельный P0 smoke в
`tests/learning_v2_p0_p1_smoke.test.ts` прошёл.

### P1 — one real content slice — COMPLETE / RECHECKED (2026-08-09)

Lesson 1: реальные 50 фраз + intro + theory + vocabulary → versioned payload →
12×12 compiler → server QA. Перед использованием в runtime повторить root и
Functions gates на текущем checkout.

**Доказательство:** root 4 suites / 25 tests, Functions QA 1 suite / 7 tests и
оба targeted strict TypeScript checks прошли на текущем checkout. Отдельный P1
smoke реального 50-item → 12×12 → QA пути прошёл.

### P2 — local-first progress and migration — P2.0 + P2.1a + P2.1b + P2.1c + P2.2a COMPLETE / P2.2b IN PROGRESS

- Уже существуют account/season/language/generation-scoped store, bounded peek,
  outbox, reducer, Lesson 1 migration и map adapter.
- P2.0 закрыт 2026-08-09: snapshot envelope v2 использует обязательный CAS
  revision; outbox не вытесняет pending, канонически fingerprint-ит и глубоко
  замораживает payload, безопасно дренирует v1 Unicode/oversize записи и
  сериализует разные storage wrappers. Отдельный flusher обеспечивает FIFO,
  global account single-flight, exact structured receipt, идемпотентное
  сохранение ACK, timeout и delayed receipt barrier.
- Свежий P2.0 gate: focused 4 suites / 57 tests; полный root progress smoke
  7 suites / 76 executed tests (+14 deploy drills skipped); Functions
  Learning V2 smoke 12 suites / 162 tests; targeted strict TypeScript и
  `git diff --check` прошли. Три независимых финальных review дали
  `P0=0 / P1=0 / P2=0`.
- P2.1a закрыт 2026-08-09: owner-current pure aggregate принимает только
  строгий `untrusted_local` candidate, а не клиентскую денежную квитанцию;
  валидирует 12 уникальных catalog-bound задач, study target, voice no-skip,
  account generation, release/session-set/catalog fingerprints и canonical
  attempt refs. `technical_invalid` не занимает terminal slot и не открывает
  уже завершённый слот повторно. Состояние пересобирается строгим parser,
  revision всегда равен числу terminal slots (0..12), а torn journal/snapshot
  replay восстанавливает проекцию и повторно выдаёт тот же deterministic
  task-slots-settled candidate. Initial credit subject стабилен между run ID,
  release и account generation, но сам candidate никогда не утверждает право
  на начисление.
- Свежий P2.1a gate: 5 suites / 82 tests, targeted strict TypeScript и
  `git diff --check` прошли; независимые spec/security/architecture reviews
  дали `P0=0 / P1=0 / P2=0`.
- P2.1b закрыт 2026-08-09: отдельный account-global wallet использует точные
  integer subunits (`1 star = 10_000`), ровно шесть owner-категорий дохода,
  отдельные external/import counters и двойную идемпотентность по transport
  operation и стабильному semantic subject. Confirmed receipt содержит полную
  проверяемую provenance, ledger replay восстанавливает torn projection и
  безопасно работает между account generations. Bounded audit page принимает
  только exact starting checkpoint, проверяет непрерывную receipt/state chain,
  hostile input и дубликаты внутри страницы. Публичного raw debit API нет:
  списание появится только в атомарной composite unlock transaction P2.1c.
- Свежий P2.1b gate: focused wallet **14/14**, combined P2 **6 suites / 96
  tests**, targeted strict TypeScript и `git diff --check` прошли; независимые
  spec/security/architecture reviews дали `P0=0 / P1=0 / P2=0` в заявленной
  pure bounded-page границе.
- P2.1c закрыт 2026-08-09: отдельный двухсостоянийный compound reducer
  атомарно связывает account-global wallet и course-scoped contiguous access.
  Цена берётся только из dedicated unlock policy: первая сессия стабильного
  языкового курса бесплатна, далее `45/50/55/60/65...` без сброса между
  уроками; расчёт и списание идут в integer subunits. Платная квитанция
  содержит exact debit, wallet/course before+after states и dual ledgers;
  бесплатная не создаёт фиктивный debit. Receipt-only audit восстанавливает
  interleaved credit/free/paid journal. Любая later-проекция требует
  repository-verified ancestry, связанную с canonical receipt и обоими current
  state fingerprints; client authority, raw debit и revision-only ancestry
  запрещены.
- Свежий P2.1c gate: focused unlock **17/17**, combined P2 **7 suites / 113
  tests**, targeted strict TypeScript и scoped diff checks прошли; три
  независимых финальных review дали `P0=0 / P1=0 / P2=0`.
- P2.2a закрыт 2026-08-09 как строго genesis-only repository substrate.
  Account-global root использует content-addressed immutable blobs и один
  CAS commit point, атомарно fenced единым durable active-owner token
  `(accountScopeHash, generation)`. Корень и все поддержанные genesis refs
  проверяются полностью; generation rollback, A→B race, unsafe revision,
  corrupt/missing blobs, ложный `committed`, lost response и partial orphan
  write fail closed либо восстанавливаются идемпотентно. Scope и storage
  boundary detach/validate hostile input без выполнения getters.
- P2.2a намеренно не принимает денежные эффекты: `journalSequence != 0`,
  course state и непустые index manifests отвергаются до P2.2b. Поэтому
  opaque journal, фиксированный lifetime cap и непроверенные shard entries не
  могут попасть в trusted snapshot.
- Свежий P2.2a gate: focused owner repository **18/18**, combined P2
  **8 suites / 131 tests**, targeted strict TypeScript и scoped diff checks
  прошли; независимые spec/security/architecture reviews дали
  `P0=0 / P1=0 / P2=0` в заявленной genesis-only границе.
- P2.2b.1 adaptive radix закрыт 2026-08-09 как отдельный pure/COW packet:
  sparse Merkle byte-radix использует четыре domain-separated пространства
  ключей (`operation_id`, `operation_fingerprint`, `semantic_subject`,
  `applied_receipt`), full 256-bit digest и exact logical key. Leaf split
  детерминированно срабатывает по count, bytes или aggregate node budget;
  фиксированного lifetime cap нет. Online lookup/COW валидирует только
  canonical path с bounded cached resolver; paged full-tree audit относится к
  следующему checkpoint packet.
- Свежий radix gate: focused **15/15**, combined P2 **9 suites / 146 tests**;
  targeted strict TypeScript и scoped diff checks прошли. Независимые
  spec/security reviews дали `P0=0 / P1=0 / P2=0`.
- P2.2b root-v2/CAS foundation закрыт 2026-08-09. Inline course refs заменены
  bounded account course-manifest, а `ensureV2/loadV2` публикуют direct v2
  genesis либо мигрируют exact verified v1 genesis одним root-last CAS. V1
  gen4 сразу становится v2 gen5 без промежуточного v1 revision; generic
  `load/initialize` version-dispatch и не принимают валидный v2 за corruption.
- Root-v2 gate: directly scoped **31/31**, объединённый owner repository/radix/
  manifest/journal smoke **7 suites / 69 tests**; strict TypeScript и diff
  checks прошли, три независимых review дали `P0=0 / P1=0 / P2=0`.
- P2.2b structural journal/root successor закрыт: canonical outer journal blob
  отдельно хеширует repository envelope, а wallet binder exact связывает
  generation, repository revision, root-before, следующий journal sequence,
  predecessor и четыре before/after projection refs. Generation rollover
  между effects не требует `repositoryRevision == journalSequence`. Focused
  gate **5/5**, combined owner smoke **8 suites / 74 tests**, три review
  `P0=0 / P1=0 / P2=0`.
- P2.2b canonical economic manifests закрыты в bounded online/path scope.
  Exact legacy-v1 empty нормализуется в v2 без смешивания source/staged blob;
  canonical effect занимает ровно четыре lifetime key (operation ID,
  operation fingerprint, semantic subject, receipt). Planner разрешает только
  exact `0/4` insert либо crosslinked `4/4` replay; все 14 torn masks,
  wrong-key values и недоказуемые v1 alias rows fail closed. Shared resolver
  держит общий read/byte budget. Focused **10/10**, combined wallet/radix/
  manifest/fold smoke **5 suites / 53 tests**, три review
  `P0=0 / P1=0 / P2=0`.
- P2.2b bounded wallet-credit plan и durable seq0→seq1 commit закрыты
  2026-08-10. Pure plan связывает trusted-server operation, wallet before/after,
  four-key closure, canonical journal и successor root. Repository принимает
  только результат отдельного server-owned verifier/materializer, detached
  candidate и немедленно canonicalized/frozen operation; raw client operation
  не является authority. Все immutable children и exact parent-root history
  staged/read-back до одного active-owner-fenced CAS. Cold seq1 load разрешает
  parent root, rebuild wallet receipt и exact `2/1/1` manifests; restart replay
  и alias seam не делают writes/CAS. Partial/silent write, lost/fake CAS,
  конкурентные credits, owner switch, TOCTOU и forged ancestry fail closed.
- Свежий wallet-credit gate: pure plan **6/6**, durable commit **11/11**,
  combined owner repository smoke **4 suites / 43 tests**; targeted strict
  TypeScript и scoped diff checks прошли, три независимых review дали
  `P0=0 / P1=0 / P2=0` в bounded seq0/seq1 границе.
- P2.2b pure multi-record induction закрыт 2026-08-10: page fold принимает
  1..128 exact repository receipts, повторно доказывает каждую wallet/root/
  journal/lifetime-index transition и возвращает bounded immutable blobs plus
  parent-root history. Focused **6/6**, включая real 128-record radix split;
  три независимых review дали `P0=0 / P1=0 / P2=0`.
- P2.2b pre-storage checkpoint codec закрыт 2026-08-10: RootV2 side-checkpoint
  использует branch-safe root-fingerprint key, canonical 16-transition или
  rollover-close window, branded page input, exact wallet/course/economic
  projection match `2N/N/N` и отдельный доказанный V1→V2 migration bootstrap.
  Focused **7/7**, strict TypeScript/diff green; independent spec gate
  `P0=0 / P1=0 / P2=0`.
- P2.2b RootV3 durable admission, bounded cold window, root-last wallet-credit
  commit/adoption/rollover и paged lifetime audit закрыты 2026-08-10. Lagging
  committed anchor всегда указывает на правильный ancestor root; current/self
  anchor запрещён, checkpoint stage/read-back выполняется до следующего fenced
  successor CAS. Repository-owned одноразовый audit cursor повторно проверяет
  неизменный durable root/fence, полностью обходит typed economic radix и идёт
  по Checkpoint V2 chain до exact Checkpoint V1 bootstrap. Combined RootV3,
  checkpoint-chain, radix и economic audit: **4 suites / 58 tests PASS**.
  Реальный durable settlement resolver и verifiable alias mutation/repair
  остаются отдельными server contracts; raw checkpoint/cursor/client candidate
  не становится authority.
- P2.2b initial required-session durable settlement закрыт 2026-08-10. Strict
  12-slot summary parser связывает account/course/session/task fingerprints,
  derived subject и star/skip bounds; canonical settlement body выводит exact
  wallet operation и non-circular source receipt fingerprint. Только
  server-owned protected lookup exact bytes может вернуть operation в
  repository; local request несёт лишь settlement id + candidate fingerprint.
  Zero-credit не создаёт operation, conflict/stale/tamper fail closed, restart
  replay write/CAS-free. Settlement + required-session smoke: **2 suites / 25
  tests PASS**. Остальные reward kinds требуют отдельных durable variants.
- P2.2b verifiable alias-index foundation закрыт 2026-08-10. Новый V2 alias
  entry хранит full authorized alias operation + exact canonical receipt и
  derived fingerprint; оба alias operation keys вставляются атомарным COW,
  subject/receipt/wallet не меняются. Lookup различает canonical/subject-only/
  alias, exact alias replay no-op, старый opaque V1 alias остаётся rejected.
  Paged audit сверяет alias ID/fingerprint multiset и exact canonical subject/
  receipt presence. Focused reducer/economic/planner: **3 suites / 34 tests
  PASS**. Structural alias journal codec теперь также закрыт: identities
  derived из canonical effect + V2 alias entry, generic journal envelope его
  хранит, а wallet-effect binder отклоняет; combined **6 suites / 43 tests
  PASS**. Missing-index repair journal также закрыт: repair family/key/value fp
  полностью derived из canonical receipt, меняется ровно один manifest family,
  transport value не принимается; combined journal/reducer/economic smoke **7
  suites / 58 tests PASS**. Mixed checkpoint/root/CAS для alias/repair ещё не
  включены. Structural RootV3 successors уже bind exact predecessor и меняют
  только разрешённые refs, но остаются non-admitted candidates; focused RootV3/
  checkpoint/journal smoke **5 suites / 42 tests PASS**. Additive Economic
  Checkpoint V3 теперь выводит cumulative/window credit+alias+repair counters из
  exact wallet/economic projections, оставляя wallet revision отдельным от
  journal sequence; old Checkpoint V2 compatibility + mixed smoke **5 suites /
  40 tests PASS**. Bounded mixed-history fold теперь cold-реконструирует exact
  `credit -> alias -> rollover`, повторяет двухключевой alias COW и допускает
  promoted Economic Checkpoint V3 только после exact projection match;
  совместимость checkpoint/economic/root **4 suites / 44 tests PASS**.
  Durable alias staging/fenced CAS ещё не включён. Repair fold fail-closed, но
  publication остаётся заблокирован до доказанного legacy/import bootstrap,
  потому что нормальная атомарная история не создаёт неполный predecessor.
  Repository promotion уже выбирает Checkpoint V2 только для wallet-only
  history и Economic Checkpoint V3 для mixed history, stages/read-backs его до
  CAS и после alias-head/rollovers продолжает независимый credit; settlement,
  commit и checkpoint integration **4 suites / 39 tests PASS**.
  Cycle-free effect-record/binding V2 теперь вычисляет canonical journal ref до
  radix COW, derives bound 2/1/1 values и bound alias pair, запрещает partial
  closure и проходит paged lifetime audit; compatibility smoke **4 suites /
  33 tests PASS**. V2 effect теперь интегрирован в RootV3 wallet plan,
  structural successor, bounded cold window и durable root-last commit:
  двухкредитный restart fold пересчитывает wallet + exact bound manifests,
  missing after-manifest fail-closed, а replay V2 head остаётся zero-write/
  zero-CAS; combined **5 suites / 48 tests PASS**. Первичный RootV2→RootV3
  compatibility bridge остаётся на историческом V1 record. Bound alias V2
  теперь также закрыт end-to-end: отдельный
  non-economic journal хранит exact effect binding + alias value, меняет только
  operation manifest, проходит cold window rebuild и публикуется одним fenced
  root-last CAS; alias retry после restart zero-write/zero-CAS. Combined
  **5 suites / 48 tests PASS**. Текущая атомарная история не может породить
  partial canonical closure, поэтому durable repair admission остаётся
  fail-closed до отдельного P2.3 legacy/import proof. Шесть остальных нормальных
  credit reasons (repeat/plan/dictionary/irregular/tournament/coin exchange)
  получили единый protected server-settlement contract; focused **8/8**,
  combined settlement/repository **3 suites / 20 tests PASS**. Legacy opening
  balance остаётся отдельным P2.3 gate.
- Осталось связать canonical activity result → reducer/outbox → server receipt,
  XP/shards compatibility, account switch/wipe и полный E1 resume путь в app.

**Gate:** restart, offline, duplicate/conflicting operation, stale generation,
account switch и interrupted write не теряют и не удваивают результат.

**Принятое архитектурное решение 2026-08-09 после трёх независимых reviews:**
не расширять Lesson1-only store и не менять historical pinned 8-slot reducer.
Рядом создаётся versioned current domain: required-session progress для
12 task receipts, отдельный account-global wallet для всех языков и
server-authoritative idempotent credit/unlock receipts. Уже открытая сессия
может завершаться offline через outbox; новый платный unlock требует confirmed
wallet, чтобы не допустить cross-device double-spend.

P2 выполняется через smoke-gated подпакеты:

1. P2.0 — **COMPLETE (2026-08-09)**: harden store/outbox/flusher, CAS,
   migration, timeout и receipt state machine.
2. P2.1a — **COMPLETE (2026-08-09)**: pure 12-task local candidate aggregate,
   strict hydration/replay/CAS handoff and stable semantic initial subject.
3. P2.1b — **COMPLETE (2026-08-09)**: account-global confirmed credit/import
   wallet, dual ledger idempotency, exact subunit math and paged receipt audit.
4. P2.1c — **COMPLETE (2026-08-09)**: separate atomic composite unlock receipt/reducer;
   wallet debit + contiguous course access advance must succeed or fail together.
5. P2.2a — **COMPLETE (2026-08-09)**: genesis-only content-addressed root/blob
   substrate, single global active-owner fence и exact durable CAS readback.
6. P2.2b — **IN PROGRESS**: exact economic journal + adaptive lifetime
   operation/operationFingerprint/subject/receipt index. Pure adaptive radix
   **COMPLETE**; bounded seq1 durable commit, page fold, Checkpoint V1 and pure
   RootV3 lagging-anchor codec, Checkpoint V2, pure bounded backward-window
   verification, repository-owned active-owner-fenced semantic admission and
   RootV3 stage/readback/CAS and fresh/migrated-seq0/verified-seq1 V2→V3
   adoption plus nonzero-history generation rollover are **COMPLETE**. Pure
   paged radix + typed cross-index lifetime audit and repository-fenced
   checkpoint-chain traversal and initial required-session durable settlement
   lookup and verifiable alias-index values/planning are **COMPLETE**;
   alias and missing-index structural journals are **COMPLETE**; Economic
   Checkpoint V3 и bounded semantic admission для credit/alias/rollover are
   **COMPLETE**. Cycle-free effect V2 wallet planning, RootV3 successor,
   bounded cold admission and durable RootV3 commit/replay are **COMPLETE**.
   Durable bound-alias CAS and cold replay are **COMPLETE**. The normal
   server-owned settlement family is **COMPLETE**; legacy opening and repair
   admission remain gated on P2.3 proof. The revision-independent source
   receipt, protected resolver and real coin-exchange producer transaction are
   **COMPLETE**. The app/account Owner Repository mount, server account-binding
   lookup, account-scoped coin-exchange redemption outbox, restart recovery,
   lost-response replay and account-switch cleanup are also **COMPLETE** for the
   coin-exchange producer. The economic account hash is now stable across
   generations while the generation remains a separate CAS fence; RootV3
   advances that fence without forking the wallet. Older confirmed receipts and
   non-head lifetime operations replay exactly through the typed four-key
   closure after later credits/rollovers. Tournament is not an access-star
   producer today, and repeat/plan/dictionary/irregular rewards still need
   server-owned award decisions. Their producer wiring remains in progress;
   P2.3 legacy proof and repair admission remain closed. Required sessions now
   have canonical session-set v2 activity coordinates, pure twelve-slot catalog
   derivation, a server initial/repeat award projection and a Firestore
   transaction that resolves the exact published session-set, counts trusted
   3/2/1/0 attempts and writes the final twelve-slot projection. Client writes
   to publication/run/task/settlement paths are denied. The release-pinned
   server publisher and exact immutable ModeTemplate scorer are now complete.
   Canonical V2 Season pointer/manifest storage plus root-last activation,
   callable export and mobile outbox wiring are still required before mobile
   completion may mint access stars; the local screen continues to award zero
   economy.
7. P2.3 — server transaction/rules/emulator без production export/deploy,
   включая доказанный legacy balance bound либо deterministic chunked import.
8. P2.4 — all-32 legacy projection и raw XP/shards preservation.
9. P2.5 — presentation-free selectors и combined P2 smoke/review.

Repeat reward использует carry-forward basis-point remainder, а не округление
каждого начисления вниз/вверх: дробная ценность не теряется и не создаётся.
Это оформляется отдельной новой versioned policy до включения repeat credit.

### Visual evidence gate — BEFORE A GOVERNED P3/P4 SURFACE

Утверждённые HTML mockups и RN map spec задают геометрию/motion. Для mode,
который также включён в machine reference-evidence policy, дополнительно нужны
lawful first-hand capture, оригинальный шестисостояний contact sheet и текущий
hash-bound owner approval. Нельзя выдумывать capture/approval или переносить
конкурентные assets. Веб-research не заменяет этот gate.

### P3 — real lesson list and map shell — AFTER P0/P2

Список уроков → карта Lesson 1 → 12 объёмных круглых nodes в трёх зонах →
session → result → сохранённая позиция карты. Реальные intro/theory/vocabulary,
offline/loading/error, accessibility и stable first frame. React-free frozen
ViewModel + typed command port, thin routes, UI-owned renderer registry.

**Gate:** mock 08 + RN spec geometry/motion, compact/large iPhone and Android,
100/150/200% text, VoiceOver/TalkBack, reduced motion, no content jumps.
Game-feel target: визуально и тактильно не ниже Duolingo как ориентира, без
копирования assets/layout; максимум премиальности, мгновенный feedback, мягкая
физика, стабильные 60 fps и быстрый первый кадр.

**Current slice (2026-08-10):** Lesson 1 map opens a real 12-card route backed
by the actual 50-phrase source and locally resumes/completes map progress. The
shell provides premium dark presentation, TTS, haptics, reduced motion and all
seven family-specific interactions. A one-entry frozen runtime cache is warmed
after map navigation settles, so repeat session opens no longer rebuild the
12×12 compiler on the first frame. Screenshot/contact-sheet, large-text/device
smoke and server outbox/award delivery remain open, so P3/P4 are not complete.

### P4a–P4g — seven approved modes — AFTER COMMON SHELL

Каждый mode отдельным пакетом и компонентом: idle, interaction, processing,
verdict, repair, offline, reduced motion. Repeat & Compare дополнительно:
permission preflight, press-and-hold, release-to-finish, signal/uncertain states,
technical-invalid ≠ learner error, privacy cleanup.

**Gate:** behavioral contract + exact approved mock comparison + governed
evidence pack where required + device smoke before следующего mode.

### P5 — map extras and Hard Mode — AFTER P3/P4

Слова в парах, новый режим неправильных глаголов, словарь, checkpoint,
chapter ceremony, максимум два Personal Plan nodes и long-press Hard flip.
Optional nodes дают access stars, но не закрывают required route; plan pool не
дублирует фразы основной цепочки.

### P6 — content generator and preview — AFTER REAL SLICE

Только корневая admin-поверхность по `ADMIN_UI_BIBLE`; старые ссылки документов
на `admin/v2/legacy.html` отменены постоянным запретом `AGENTS.md`. Нужны
детерминированный preview, точные blocker reasons, provenance, QA и versioned
atomic release. Никакого локального OpenAI chat/image API.

P6 дополнительно подчиняется полному
[`GENERATOR_DELIVERY_CONTRACT.md`](./GENERATOR_DELIVERY_CONTRACT.md): отдельная
вкладка в `admin/legacy.html`, 5–10 экспертных ролей перед существенными
решениями, весь курс для восьми локалей, четыре voice variants, maker-checker,
human QA, screenshot/device/audio gates и запрет перехода дальше по одному
узкому PASS.

Граница ответственности по уточнённому решению владельца от 2026-08-12:
Codex разрабатывает генератор и всю техническую систему Learning V2 — контракты,
runtime, валидаторы, preview, versioning, QA, device/release gates и безопасную
публикационную цепочку. **Весь реальный учебный контент E1–E32 создаёт только
владелец, самостоятельно и без участия Codex.** Codex не пишет, не генерирует,
не редактирует и не утверждает за владельца фразы, задания, объяснения, интро,
сценарии, локализации или иное содержимое эпизодов и не запускает контентную
генерацию от его имени.

Генератор должен дать владельцу средства самому создать полный эпизод: принять
его авторские входные данные и команды, воспроизводимо собрать 12 сессий, 144
задания, восемь локалей, аудиоварианты и итоговый пакет, показать preview,
сохранить версии и выдать точные причины блокировки. Владелец сам запускает этот
процесс, проверяет и утверждает результат. Автоматические fixtures и smoke-пакеты
используют только нейтральные тестовые данные, доказывают возможности генератора
и никогда не считаются реальным контентом или owner approval E1–E32.

Текущий технический статус 2026-08-13: канонический callable-командный формат
V2, сохранение точного plan request, ручной owner import в общий preview store,
32 подтверждения, 224 обязательных release-leaf readback и приватный единый
activation CAS реализованы как server-only/authority-bounded пакеты. Ближайший
нейтральный сквозной harness
`Create Plan → owner import → preview → confirmation → release A/B → rollback A`
проходит. Незакрытый шаг P6 — callable/emulator readback с полными 224 строгими
листами, после чего остаётся физическая device/offline/accessibility/visual QA.
Реальные E1–E32 не входят в harness и остаются только ручной работой владельца.

Экран реальной V2-сессии теперь использует отдельный полный интерфейсный
словарь для всех восьми активных локалей. Локализованы mode labels, offline
audio fallback, первая/вторая ошибка, Report/Save/Voice, mic permissions,
подсказка/пропуск, звёзды и ceremony. Визуальная композиция не менялась и не
считается поддельным reference evidence. Узкий gate: 3 suites / 27 tests PASS.

### P7 — energy migration and exact removal — AFTER P2/P3/P6

Сначала полная инвентаризация потребителей и миграционный контракт, затем
сохранение legacy progress/XP/shards/offline, затем удаление только energy
механики. Никакая другая функция не удаляется.

### P8 — owner-driven 32-lesson rollout and release qualification — LAST

После готовности генератора владелец самостоятельно создаёт, генерирует и
проверяет эпизоды волнами, а не слепым bulk batch: E1–E8 и chapter checkpoint,
затем E9–E32.
Каждая принятая владельцем версия проходит focused/integration/emulator/rules/
build/smoke and device tests; layout/contrast/touch/large-text/accessibility/
motion QA; performance freeze/timer/cache/list checks; rollback thresholds и
staged rollout packet.

**Final gate:** любой из 32 уроков проходит реальный V2-путь с настоящим
контентом, честными stars, repeat, offline/resume, vocabulary/verbs/plan и без
потери legacy progress. Ни один blocking security/privacy/accessibility/device/
content/release issue не остаётся. Production deploy — отдельное ручное
решение, а не следствие зелёной локальной сборки.

## Проверочный протокол каждого пакета

1. Сначала RED test/contract, затем минимальная реализация, затем GREEN.
2. Каждый P0–P8 этап имеет отдельный smoke-test и не закрывается без его
   свежего PASS: pure/runtime smoke для headless этапов, emulator smoke для
   server/storage этапов и navigation/visual/device smoke для UI этапов.
3. `git diff --check`, narrow TypeScript check и только относящиеся к изменению
   Jest suites.
4. После UI-изменений: screenshot/contact sheet и manual navigation smoke;
   device проверки не подменяются Jest.
5. При затрагивании Functions/Firestore: emulator/rules/callable tests и
   account/identity/retry/offline scenarios.
6. Результат, blocker и следующий шаг записываются в HANDOVER без ложных
   release claims.
7. Для сложного или неоднозначного решения обязательна независимая
   мультиагентная оценка минимум по трём осям: spec/learning, security/data и
   architecture/UX. Findings взвешиваются до реализации; решение и причины
   записываются в HANDOVER.

## Текущий следующий шаг после 15.148

Корневой owner-редактор теперь умеет показывать и локально проверять полный
нейтральный пакет `интро → 12 сессий → 144 задания`, но тестовый fixture
физически отделён от production и не отправляется на сервер. Реальные E1–E32
по-прежнему создаёт только владелец.

Immutable owner-authored intro artifact уже добавлен: новый owner-input/stage v2
хранит 12 тел интро, 36 связанных comprehension questions и общий fingerprint;
старые v1 читаются. Локальный reference episode можно только скопировать в новый
production_candidate с новыми ID/fingerprint и полным повторным server
validation.

Learner-safe intro projection и private exact confirmed-owner readback закрыты:
12 интро / 36 видимых вопросов доступны только через opaque handle после
generation-pinned чтения stage, plan, owner input и confirmation. JSON или
копия handle authority не получают.

Additive learner-core inventory v2 уже связывает `intro + render + capsule` для
каждой из 12 сессий, всего 36 immutable objects, не ломая v1.

Session-intro runtime contract уточнён и реализован в локальном learner slice:
ровно три страницы, один вопрос внизу каждой, slots 1–3 закрываются внутри
интро, практика начинается со slot 4 и первые три задания не повторяются.
Отдельный экран/блок «три вопроса после интро» запрещён.

Первый незакрытый generator contract: добавить Firebase publisher/readback для
inventory v2 и released-session package v2. После этого нужно замкнуть текущие отдельные
canonical plan/preview/release seams в один root-owner E2E, повторить neutral
Emulator drill и перейти к физической
iOS/Android offline/restart/microphone/accessibility/reduced-motion/rollback
матрице. Нейтральные тестовые сессии и интро создаёт Codex исключительно для
проверки генератора; содержательные решения реального курса не входят в его
роль.
