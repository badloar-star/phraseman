# Phraseman V2: Content Studio, шаблоны режимов и сборка эпизодов

**Статус:** нормативная спецификация, решение одобрено  
**Область:** создание режимов, упражнений, графов эпизодов, локализаций, preview и релизов через Admin v2  
**Связанные документы:** `04-activity-catalog-and-storyboards.md`, `05-stars-progress-and-mastery.md`, `06-runtime-content-admin-and-release.md`, `07-migration-analytics-testing.md`  
**Источник правил интерфейса:** `docs/design/ADMIN_UI_BIBLE.md`

## 1. Утверждённое решение

Content Studio использует гибридную модель:

1. **Исполняемые kernels, renderer-ы, validators и policies принадлежат коду.** Они проходят обычный релиз приложения и не редактируются из браузера.
2. **ModeTemplate принадлежит админке.** Это неизменяемая версионированная настройка готового kernel: педагогическая роль, разрешённые поля, policies, fallback, тексты интерфейса и тестовые примеры.
3. **ActivityInstance принадлежит админке.** Это конкретное упражнение, которое закрепляет точную версию ModeTemplate и содержит учебный материал.
4. **EpisodeRevision принадлежит админке.** Это конкретная версия сценария, набора ActivityInstance, DAG, звёздных слотов, checkpoint и локализаций.
5. **SeasonRevision принадлежит админке.** Она pin-ит exact approved EpisodeRevision, главы, materialized gate table из code-owned `gatePolicyVersion` и exact `decisionRegistryRef {id,version,contentHash}` по единственной machine schema этого документа (§6.2); документ 07 задаёт governance-смысл и experiment passports, но не второй runtime contract.
6. **В runtime попадает только approved immutable `lesson-bundle.v2`.** Клиент не читает черновики, ModeTemplate или административные коллекции.

Таким образом, администратор может без новой сборки приложения:

- создать новый вариант уже поддерживаемого режима;
- задать его поля, инструкции, fallback и разрешённые policies;
- создать упражнения;
- собрать из них эпизод;
- собрать сезон и выбрать уже зарегистрированную gate policy;
- проверить эпизод в web-preview и настоящем React Native runtime;
- отправить материал на независимую проверку;
- запечатать, активировать и откатить релиз.

Новая исполняемая механика всё равно сначала добавляется разработчиком. Админка не генерирует JavaScript, React Native компоненты, scoring-код или сетевые вызовы.

## 2. Цели

Content Studio обязан:

- собирать 32 эпизода пилота без ручного изменения TypeScript для каждого упражнения;
- собирать SeasonRevision из exact approved эпизодов, pin-ить immutable decision registry и автоматически материализовать звёздные ворота из выбранного code-owned `gatePolicyVersion`;
- позволять создавать новые ModeTemplate из поддерживаемого каталога kernels;
- использовать один и тот же контракт для ручного ввода и server-side generation;
- предотвращать публикацию контента, который не поддерживается выбранной версией приложения;
- отделять создание, проверку и публикацию правами и audit trail;
- сохранять каждую approved версию неизменяемой;
- обеспечивать детерминированный preview того же payload, который увидит runtime;
- поддерживать разные пары `studyTarget + learnerSourceLocale`;
- сохранять существующие stage leases, retries, fingerprints, immutable objects, CourseRelease sealing, activation и rollback;
- позволять заменить один ActivityInstance или одну локализацию без перегенерации всего сезона;
- оставлять legacy runtime доступным до отдельного решения о миграции.

## 3. Не-цели

В пилот не входят:

- произвольный no-code конструктор React Native экранов;
- ввод JS, CSS, SQL, regex, renderer path или Cloud Function name администратором;
- создание новых scoring-формул в браузере;
- изменение цены shards, звёздной кривой или денежных правил из ModeTemplate;
- автоматическая публикация результата генератора;
- обязательная AI-зависимость в основном пути эпизода;
- хранение raw audio или transcript без отдельной privacy/retention спецификации;
- редактирование опубликованного объекта на месте;
- удаление ModeTemplate, который уже использовался в release;
- новый пятый canonical release surface;
- замена существующего CourseRelease v1;
- обещание pixel parity для HTML-preview;
- массовое создание второго языка до успешного vertical slice одного эпизода `en ← ru`.

## 4. Словарь и границы сущностей

| Термин | Нормативное значение |
|---|---|
| Activity family | Одна из 17 runtime-семей V2, например `phrase_builder` или `speaking_club_mission`. Это педагогическая классификация, не renderer. Checkpoint — отдельный episode-level assessment contract, а не восемнадцатая family. |
| Executable kernel | Кодовая механика выполнения: renderer, payload validator, submission adapter и state machine. |
| Renderer | Конкретный React Native UI, зарегистрированный kernel-ом. |
| Policy | Версионированная кодовая функция scoring, evidence, progress, reward или recovery. |
| Capability catalog | Server-owned список kernels, policies, schemas и разрешённых сочетаний. Администратор читает его, но не изменяет. |
| App support manifest | Подписанное описание того, что умеет конкретная версия приложения на iOS/Android. |
| ModeTemplate | Admin-owned неизменяемая версия настройки kernel. Не содержит исполняемого кода. |
| ActivityInstance | Конкретное упражнение с точной ссылкой на ModeTemplate и payload. |
| EpisodeRevision | Неизменяемая редакция полного эпизода: содержание, instances, DAG, stars, review links и capstone. |
| SeasonRevision | Неизменяемая редакция состава сезона, глав, exact episode refs и materialized gate table. |
| Authoring head | Маленький изменяемый Firestore-документ, указывающий на последнюю редакцию сущности. |
| Artifact body | Единственный hashable canonical JSON в Cloud Storage; не содержит self-hash, object ref, lifecycle или receipts. |
| Artifact record | Immutable Firestore envelope: identity, body hash, object path/generation/bytes и provenance. |
| Lifecycle head | Отдельная guarded mutable projection статуса; не содержит и не переписывает artifact body. |
| Stage | Идемпотентная единица generation/assembly pipeline с prerequisites, lease, retry и review fingerprint. |
| Validation receipt | Неизменяемая квитанция machine validation для точного fingerprint сущности. |
| Waiver | Ограниченное по rule/entity/release исключение только для явно waivable warning. |
| Web preview | Быстрый структурный просмотр. Не считается доказательством React Native parity. |
| Device preview | Запуск точного draft envelope реальным V2 runtime во внутренней сборке приложения. |
| Release seam | Преобразование approved authoring artifacts в `lesson-bundle.v2` внутри существующего `lesson` surface. |

Нормативное различие:

```text
Activity family
  → executable kernel из кода
  → ModeTemplate vN из админки
  → ActivityInstance revision N из админки
  → node в EpisodeRevision
  → exact episode ref в SeasonRevision
  → resolved V2ActivityDefinition в lesson-bundle.v2
```

## 5. Неподвижные архитектурные инварианты

1. Контент содержит только JSON-данные и versioned keys.
2. ModeTemplate не может содержать функцию, expression language или произвольный URL.
3. Каждый ActivityInstance закрепляет точный `templateId + templateVersion`.
4. У published/deprecated ModeTemplateVersion никогда не меняются content fields, `version`, `contentHash` и immutable object. Lifecycle metadata может перейти только `published → deprecated → archived` через отдельный guarded callable с reason и audit, не переписывая сам artifact.
5. Новая версия ModeTemplate не перепривязывает существующие ActivityInstance автоматически.
6. Runtime bundle содержит resolved activity definitions; приложение не загружает ModeTemplate отдельно.
7. Любой неизвестный kernel, policy, schema или payload блокирует seal и fail-closed на клиенте.
8. Для production используются только capability combinations, присутствующие одновременно в server catalog и support manifest выбранного `minAppVersion`.
9. Автор не может одобрить собственную production revision.
10. `content.publish` не даёт права обходить review.
11. Fallback и основной путь одного задания используют один `starSlotId`.
12. Незвёздный briefing моделируется явно и не получает фиктивный star slot.
13. AI/network-only activity не может быть единственным required path.
14. Изменение upstream fingerprint делает downstream validation, preview и review stale.
15. Клиентский первый кадр не зависит от административных коллекций или генератора.
16. Release activation использует optimistic concurrency по catalog revision.
17. Rollback контента не откатывает пользовательский progress.
18. В production нет прямой записи из браузера в authoring collections; все mutations проходят callables.
19. SeasonRevision ссылается только на exact approved EpisodeRevision; mutable episode head не попадает в season или release.
20. Gate table материализуется и валидируется из immutable `gatePolicyVersion`; весь published release pin-ит exact `decisionRegistryRef`, поэтому browser не задаёт произвольную формулу, retry cap, cutoff, delayed window, цену, rollout percentage или порог.
21. Callable-only означает отсутствие любой overlapping Firestore `allow`, включая global admin catch-all: narrow deny не имеет precedence при OR-семантике rules.
22. Hashable artifact body, immutable Firestore record, mutable head/lifecycle и append-only receipts — разные schemas; resolved read model никогда не сериализуется как canonical object.

## 6. Общие типы

Эти контракты являются целью для `functions/src/content_studio/contracts.ts`, `modules/learning-v2/contracts/content_studio.ts` и зеркальных admin validators.

```ts
export type IsoDateTime = string;
export type Sha256 = string;
export type LocaleCode = string;
export type StudyTarget = string;
export type LearnerSourceLocale = string;

export interface ImmutableObjectRef {
  objectPath: string;
  contentHash: Sha256;
  objectGeneration: string;
  byteSize: number;
}

export interface VersionRef {
  id: string;
  version: number;
  contentHash: Sha256;
}

export interface LocalizedContentValue {
  locale: LocaleCode;
  value: string;
  sourceHash: Sha256;
}

export interface MutationContext {
  requestId: string;
  idempotencyKey: string;
  expectedRevision: number;
  expectedFingerprint: Sha256;
  reason: string;
}

export type AuthoringStatus =
  | 'draft'
  | 'needs_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'deprecated'
  | 'archived';

export interface EntityProvenance {
  createdBy: string;
  createdAt: IsoDateTime;
  basedOn?: {
    entityType: 'mode_template' | 'season' | 'episode' | 'activity_instance';
    entityId: string;
    versionOrRevision: number;
    contentHash: Sha256;
  };
  generator?: {
    stageId: string;
    artifactId: string;
    promptVersion: string;
    schemaVersion: number;
  };
}
```

`LocalizedContentValue` — только hashable learner-visible content. Поля workflow (`status`, editor/reviewer UID, submit/review timestamps, reason и receipt ID) запрещены внутри ModeTemplate/Episode/Season artifact bodies и живут только в server-owned `LocalizationUnitProjection` и append-only localization receipts. Approved body содержит только значения, для которых seal transaction нашла `approved` projection с теми же `entityRevision + fieldPath + locale + sourceHash + value`; approval metadata в canonical bytes не копируется.

### 6.1 Единственный schema/enum corpus и canonical bytes

Client, Functions, Admin и fixtures импортируют один corpus `content-studio-contract-corpus.v1`; копии enum в UI, тестах и backend запрещены. Нормативные значения:

```ts
export const PREVIEW_STATES = [
  'prompt',
  'active',
  'processing',
  'success',
  'needs_work',
  'recovery',
] as const;
export type PreviewState = (typeof PREVIEW_STATES)[number];

export const VALIDATION_SEVERITIES = ['info', 'warning', 'blocking'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

// Это ортогональная ось условий запуска, а не UI state renderer-а.
export interface PreviewConditions {
  connectivity: 'online' | 'offline';
  microphone: 'granted' | 'denied' | 'unavailable';
  signal: 'clean' | 'noisy' | 'silence' | 'not_applicable';
  scorerOutcome: 'pass' | 'needs_work' | 'uncertain' | 'system_invalid' | 'not_applicable';
  motion: 'full' | 'reduced';
  textScalePercent: 100 | 150 | 200;
  colorScheme: 'light' | 'dark';
}
```

`default`, `error`, `offline`, permission/noise/theme/viewport не являются `PreviewState`. Они задаются `PreviewConditions` или transport/runtime error fixture. Любой parser, validator и test fixture использует ровно эти шесть states и severity `blocking`, никогда `blocker`.

Canonical serializer — `canonicalJsonV1`: RFC 8785/JCS object-key ordering и number serialization, UTF-8 без BOM/whitespace, array order preserved. Перед сериализацией строки обязаны быть Unicode NFC; `undefined`, sparse arrays, non-finite numbers, `-0`, `Date`, `Map`, functions и non-JSON values отклоняются. Serializer не удаляет неизвестные поля: schema parser сначала делает strict reject, затем сериализует принятую typed body.

```ts
export interface AuthoringRevisionFingerprintInput {
  schemaVersion: 'authoring-revision-fingerprint.v1';
  entityType: 'mode_template' | 'episode' | 'season';
  entityId: string;
  revision: number;
  contentHash: Sha256;
}

export const contentHash = (body: unknown): Sha256 =>
  sha256(utf8(canonicalJsonV1(body)));

export const revisionFingerprint = (
  input: AuthoringRevisionFingerprintInput,
): Sha256 => sha256(utf8(canonicalJsonV1(input)));

export const receiptHash = (receiptBodyWithoutHash: unknown): Sha256 =>
  sha256(utf8(canonicalJsonV1(receiptBodyWithoutHash)));
```

`contentHash` хеширует только artifact body: без собственного hash, `ImmutableObjectRef`, lifecycle, validation/preview/review receipts и Firestore timestamps. `revisionFingerprint` хеширует только показанный fingerprint input. Receipt hash хеширует receipt body без self-hash. Path, generation и byte size появляются только после записи canonical bytes и никогда не входят в эти bytes.

Для fingerprint input `entityId` каноничен: ModeTemplate draft — `<templateId>@p<proposedVersion>`, episode/season — `draftId`; `revision` — immutable authoring revision, не lifecycle revision и не template published version. `entityRevision` в validation/waiver/queue documents использует ровно это же authoring revision.

Обязательный golden vector для client/Functions/Admin:

```text
canonical bytes: {"schemaVersion":"hash-golden-vector.v1","value":"Phraseman V2","version":1}
sha256: 12ac7b1d9d7c2c06fc88a1b99abfc42f1c21fa48dc8e6c9cea88c639c1291160
```

Все SHA-256 fixtures — ровно 64 lowercase hex. Строки вида `sha256:test`, `hash`, `stale` и сокращённые digest запрещены даже в примерах тестов: отрицательный fixture использует 64-hex digest с изменённым nibble.

На server каждая строка ID проверяется allowlist-правилом `^[A-Za-z0-9._-]{1,160}$`. Locale проверяется тем же правилом, которое уже используется в `stage_contracts.ts`. SHA-256 — ровно 64 hex-символа.

### 6.2 Immutable decision registry artifact

Документ 07 задаёт governance-смысл решений, а этот контракт делает published pin исполнимым. Registry code-owned: Admin показывает exact version/hash и resolved settings, но не редактирует числа в browser.

```ts
export type V2DecisionId =
  | 'HYP-V2-001'
  | 'HYP-V2-002'
  | 'HYP-V2-003'
  | 'HYP-V2-004'
  | 'HYP-V2-005'
  | 'HYP-V2-006'
  | 'HYP-V2-007'
  | 'HYP-V2-008';

export interface NumericRange {
  min: number;
  max: number;
}

export interface DecisionEntryBase {
  decisionId: V2DecisionId;
  claimLabel: 'PRODUCT_HYPOTHESIS' | 'CALIBRATED' | 'OFFICIAL_STANDARD';
  owner: string;
  evidenceRefs: VersionRef[];
}

export type V2DecisionEntry =
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-001';
      settings: {
        seasonEpisodeCount: number;
        chapterCount: number;
        episodesPerChapter: number;
        checkpointOrdinals: number[];
        visibleNodeCount: NumericRange;
        targetEpisodeMinutes: NumericRange;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-002';
      settings: {
        newPhraseFrames: NumericRange;
        newSemanticSlots: NumericRange;
        newSoundContrasts: NumericRange;
        targetVoiceTurns: NumericRange;
        maxMandatoryLearningRetries: number;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-003';
      settings: {
        completionCutoff: number;
        independentMasteryCutoff: number;
        checkpointCutoffById: Readonly<Record<string, number>>;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-004';
      settings: {
        maxStarsPerSlot: number;
        gateEligibleSlotsPerEpisode: number;
        maxStarsPerEpisode: number;
        maxStarsPerSeason: number;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-005';
      settings: {
        requiredLoopKinds: ['encounter_build', 'near_transfer'];
        localEarnedMinimumByEpisodeOrdinal: Array<{ episodeOrdinal: number; value: number }>;
        cumulativeAccessByEpisodeOrdinal: Array<{ episodeOrdinal: number; value: number }>;
        seasonAccessTarget: number;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-006';
      settings: {
        accessBoostPriceShards: number;
        maxBoostsPerGate: number;
        maxBoostsPerChapter: number;
        maxBoostsPerSeason: number;
        eligibleDeficit: NumericRange;
        recoveryImpressionCount: number;
        quoteTtlSeconds: number;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-007';
      settings: {
        delayedWindowPolicyId: string;
        assessableWindowDays: NumericRange;
        postSeasonReviewDays: number[];
        successPolicyId: string;
      };
    })
  | (DecisionEntryBase & {
      decisionId: 'HYP-V2-008';
      settings: {
        rolloutMilestones: Array<{
          rolloutPercent: 0 | 1 | 5 | 10 | 25 | 50 | 100;
          minimumObservationHours: number;
          minimumEligibleAssignments: number;
        }>;
      };
    });

export interface DecisionRegistryBody {
  schemaVersion: 'v2-decision-registry-body.v1';
  registryId: 'phraseman-v2-product-decisions';
  version: number;
  decisions: {
    [K in V2DecisionId]: Extract<V2DecisionEntry, { decisionId: K }>;
  };
}

export interface DecisionRegistryRecord {
  schemaVersion: 'v2-decision-registry-record.v1';
  ref: VersionRef;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}

export interface ResolvedDecisionRegistry {
  body: DecisionRegistryBody;
  record: DecisionRegistryRecord;
}
```

`DecisionRegistryBody` не содержит собственного hash/object/timestamp. Для accepted pair `record.ref.id === body.registryId`, `record.ref.version === body.version`, `record.ref.contentHash === contentHash(body)` и `record.object.contentHash === record.ref.contentHash`; object path имеет вид `content-studio/decision-registries/<sha256(registryId)>/v<version>/<contentHash>.json`. Registry обязан содержать ровно восемь keys, каждый map key равен `entry.decisionId`, ranges конечны и `min <= max`, fractions находятся в `[0,1]`, ordinal/milestone arrays уникальны и возрастают, а производные totals/curves арифметически согласованы. `HYP-V2-007.settings.delayedWindowPolicyId` — стабильный allowlisted ID exact D+3…D+7 policy: каждый episode `learningDesign.delayedWindowPolicyId` и каждый delayed `V2ReviewLink.windowPolicyId` обязан byte-for-byte совпасть с ним. Unknown/missing setting, body/ref/record/object mismatch, произвольный window ID или mutable latest lookup возвращает non-waivable blocker.

`HYP-V2-006` хранит три независимых лимита: на одни ворота, одну главу и весь сезон. Chapter/season caps нельзя выводить из `maxBoostsPerGate`: в главе несколько ворот, а сезонный лимит является отдельной money-adjacent политикой. Стартовые значения — цена `3`, caps `3/3/12`, deficit `1..3`, два recovery-показа и quote TTL `300` секунд. Эта поправка внесена до публикации первого registry artifact, поэтому schema остаётся `v2-decision-registry-body.v1`; ни одного ранее опубликованного `v1` body/hash для миграции нет.

Стартовый pilot registry version 1 использует следующие явно недоказанные `PRODUCT_HYPOTHESIS`, чтобы fixture и первый internal release не скрывали решения в коде:

- `HYP-V2-001`: 32 эпизода, 4 главы по 8, checkpoints `8/16/24/32`, 8–9 видимых nodes и `12..18` минут для обычного эпизода; checkpoint/review duration сюда не входит;
- `HYP-V2-002`: `8..10` новых phrase frames, `12..18` semantic slots, `0..1` нового source-locale sound contrast, `3..10` target voice turns и максимум 2 обязательных learning retries;
- `HYP-V2-003`: completion `0.70`, independent mastery `0.80`, provisional checkpoint cutoffs `ep-08/ep-16/ep-24/ep-32 = 0.80`;
- `HYP-V2-004`: 3 stars/slot, 8 gate-eligible slots, 24/episode, 768/season;
- `HYP-V2-005`: exact documented two-loop tuple, 32-entry local curve, E2–E32 cumulative curve и season target 500 из документа 05;
- `HYP-V2-006`: цена/caps/eligibility/recovery/TTL из предыдущего абзаца;
- `HYP-V2-007`: `dts-7.d3-d7.v1`, assessable days `3..7`, post-season review days `1/7/21`, provisional success policy `dts-7.independent-transfer-success.v1`;
- `HYP-V2-008`: только internal-safe milestone `0% / 0 hours / 0 assignments`. Ненулевой rollout запрещён, пока experiment passport не зафиксирует baseline, MDE, alpha/power и рассчитанный sample; затем выпускается новая immutable registry version.

Generic validator проверяет shape, арифметику, допустимые ranges/IDs и внутреннюю согласованность, но не зашивает эти pilot values как вечные константы. Synthetic valid fixture с другими согласованными значениями обязан проходить; изменение живого pilot setting создаёт новую registry version/hash. README default `6–10 active chunks + 4–8 узнаваемых слов` не подменяет поля `newPhraseFrames/newSemanticSlots`: для них источник — подробный curriculum contract документа 03.

Shared fixture `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json` проходит один golden/conformance corpus в client и Functions. Оба runtime recompute-ят body hash, проверяют exact eight-entry schema и возвращают одинаковые ordered issue codes; release tests дополнительно доказывают byte-identical ref в SeasonRevision, bundle provenance и manifest.

## 7. Code-owned capability catalog

### 7.1 Назначение

Capability catalog — единственный список того, что Content Studio разрешает выбирать. Он собирается из registry кода, версионируется, тестируется на полноту и отдаётся через read-only callable. UI не поддерживает собственный захардкоженный список режимов.

### 7.2 Контракты

```ts
export type PolicyKind =
  | 'scoring'
  | 'evidence'
  | 'progress'
  | 'reward'
  | 'recovery';

export interface PolicyRef {
  kind: PolicyKind;
  key: string;
  version: number;
  contentHash: Sha256;
}

export interface PolicyDescriptorBody {
  schemaVersion: 'content-studio-policy-body.v1';
  kind: PolicyKind;
  key: string;
  version: number;
  humanName: string;
  description: string;
  compatibleFamilies: readonly V2ActivityFamily[];
  compatibleKernelKeys: readonly string[];
  configurableFieldPaths: readonly string[];
  evidenceKinds: readonly EvidenceKind[];
  claims: readonly (
    | 'completion'
    | 'accuracy'
    | 'spoken_attempt'
    | 'spoken_confident'
    | 'acoustic_pronunciation'
    | 'transfer'
  )[];
}

export interface PolicyDescriptorRecord {
  schemaVersion: 'content-studio-policy-record.v1';
  ref: PolicyRef;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}

export interface ResolvedPolicyDescriptor {
  body: PolicyDescriptorBody;
  ref: PolicyRef;
}

export interface AuthoringFieldDescriptor {
  path: string;
  label: string;
  helpText: string;
  type:
    | 'short_text'
    | 'long_text'
    | 'localized_text'
    | 'number'
    | 'boolean'
    | 'single_choice'
    | 'multi_choice'
    | 'content_unit_ref'
    | 'asset_ref'
    | 'voice_target'
    | 'ordered_items';
  required: boolean;
  min?: number;
  max?: number;
  enumValues?: readonly string[];
  learnerVisible: boolean;
  localizable: boolean;
}

export interface ExecutableKernelDescriptor {
  activityTypeKey: string;
  kernelVersion: number;
  humanName: string;
  family: V2ActivityFamily;
  rendererKey: string;
  supportedRendererSchemaVersions: readonly number[];
  payloadSchemaKey: string;
  payloadSchemaVersion: number;
  payloadSchemaHash: Sha256;
  authoringFields: readonly AuthoringFieldDescriptor[];
  requiredCapabilities: readonly RuntimeCapability[];
  optionalCapabilities: readonly RuntimeCapability[];
  supportedPreviewStates: readonly PreviewState[];
  supportedPlatforms: readonly ('ios' | 'android')[];
  offlineSupport: 'full' | 'cached_assets_only' | 'not_supported';
  compatiblePolicyRefs: Readonly<Record<PolicyKind, readonly PolicyRef[]>>;
  maximumPayloadBytes: number;
  accessibilityContract: {
    screenReader: boolean;
    keyboard: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    nonVoiceAlternative: boolean;
  };
}

export interface ContentStudioCapabilityCatalogBody {
  schemaVersion: 'content-studio-capabilities-body.v1';
  catalogRevision: number;
  generatedAt: IsoDateTime;
  kernels: Readonly<Record<string, ExecutableKernelDescriptor>>;
  policies: Readonly<Record<string, ResolvedPolicyDescriptor>>;
  languageProfileIds: readonly string[];
}

export interface ContentStudioCapabilityCatalogRecord {
  schemaVersion: 'content-studio-capabilities-record.v1';
  catalogRevision: number;
  contentHash: Sha256;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}
```

`PolicyDescriptorBody` — отдельный canonical artifact без собственного hash/object. Для каждой policy registry строит `PolicyRef`, где `kind/key/version` в точности равны body, а `ref.contentHash = contentHash(body)`; immutable `PolicyDescriptorRecord` и его `object.contentHash` закрепляют тот же ref/hash. Capability catalog хранит resolved `{body, ref}` pair, а не descriptor с неоднозначным встроенным self-hash. Conformance recompute-ит hash каждого policy body и fail-closed отклоняет несовпадение body/ref, record/ref/object, catalog map key или kind/key/version.

`compatiblePolicyRefs` хранит exact `{kind,key,version,contentHash}`, а не строку `<policyKey>@<version>`. Каталог создаётся только кодом. Одинаковые key/version с другим hash, несовпадающий kind или любая комбинация, которой нет в каталоге, возвращает `failed-precondition: capability_combination_unsupported`.

### 7.3 App support manifest

```ts
export interface SupportedKernelRef {
  activityTypeKey: string;
  kernelVersion: number;
  rendererKey: string;
  rendererSchemaVersions: readonly number[];
  payloadSchemaKey: string;
  payloadSchemaVersions: readonly number[];
}

export interface AppCapabilitySupportManifestBody {
  schemaVersion: 'learning-v2-support-body.v1';
  appVersion: string;
  buildNumber: number;
  platform: 'ios' | 'android';
  environment: 'development' | 'staging' | 'production';
  generatedAt: IsoDateTime;
  capabilityCatalogRevision: number;
  kernels: readonly SupportedKernelRef[];
  policyRefs: readonly PolicyRef[];
  voiceNetworkEgressRefs: readonly VoiceNetworkEgressRef[];
  languageProfileIds: readonly string[];
  previewStates: readonly PreviewState[];
}

export interface AppCapabilitySupportManifestRecord {
  schemaVersion: 'learning-v2-support-record.v1';
  appVersion: string;
  buildNumber: number;
  platform: 'ios' | 'android';
  manifestHash: Sha256;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}

export interface AppCapabilitySupportManifestRef {
  appVersion: string;
  buildNumber: number;
  platform: 'ios' | 'android';
  environment: 'development' | 'staging' | 'production';
  manifestHash: Sha256;
}
```

Capability `contentHash = contentHash(ContentStudioCapabilityCatalogBody)`, а `manifestHash = contentHash(AppCapabilitySupportManifestBody)`. Ни один body не содержит **собственного** hash/object/record; внешние exact pins, включая `ResolvedPolicyDescriptor.ref.contentHash` и specialized `VoiceNetworkEgressRef`, допустимы и обязательны. CI создаёт manifest body из того же registry, который используется runtime, пишет immutable record, а server хранит exact body/record pair по версии и платформе. Release validator recompute hash capability/support bodies и каждого вложенного policy/egress body, проверяет `PolicyDescriptorBody ↔ PolicyRef ↔ PolicyDescriptorRecord/object`, затем берёт пересечение iOS/Android manifests для `minAppVersion`, включая exact `{kind,key,version,contentHash}` каждого из пяти policy refs. Network voice дополнительно требует, чтобы оба app manifests pin-или тот же deployed egress ref, а resolved `VoiceNetworkEgressBody` подтверждал `reservation-consume-settle-reconcile.v1`, terminal-no-future-writes finality и settlement-bound deletion. Одинаковые key/version с другим content hash, egress mismatch или отсутствие хотя бы одного kind — blocker, а не разрешение «на доверии».

## 8. ModeTemplate

### 8.1 Immutable version

`PublishedModeTemplateRef`, `SpeechCalibrationReceiptRef`, `VoiceDataPolicyRef`, `VoiceConsentCopyRef`, `VoiceDeletionRouteRef`, `VoiceMinorsPolicyRef`, `VoiceNetworkEgressRef` и discriminated `VoiceReleaseRequirements` импортируются из canonical runtime-контракта документа 06. Authoring не имеет права заменять их общим `VersionRef` или строковым key: иначе теряются specialized identity (`templateId`, а не generic `id`), locale/hash consent copy, on-device/network discriminator, required purposes, exact deletion/minors policy и обязательный provider-agnostic server egress.

```ts
export interface ModeTemplateArtifactBody {
  schemaVersion: 'v2-mode-template-body.v1';
  templateId: string;
  version: number;
  family: V2ActivityFamily;
  humanName: string;
  description: string;
  pedagogicalPurpose: {
    phase:
      | 'discover'
      | 'comprehend'
      | 'controlled_production'
      | 'guided_transfer'
      | 'free_transfer'
      | 'review'
      | 'checkpoint';
    primarySkillIds: string[];
    modalities: Array<'reading' | 'listening' | 'writing' | 'speaking'>;
    estimatedSeconds: number;
  };
  kernel: {
    activityTypeKey: string;
    kernelVersion: number;
    rendererKey: string;
    rendererSchemaVersion: number;
    payloadSchemaKey: string;
    payloadSchemaVersion: number;
    payloadSchemaHash: Sha256;
  };
  policies: Readonly<Record<PolicyKind, PolicyRef>>;
  authoring: {
    editableFieldPaths: string[];
    requiredFieldPaths: string[];
    defaultValues: Record<string, unknown>;
    allowedOverridePaths: string[];
  };
  capabilityContract: {
    microphone: 'none' | 'optional' | 'required';
    speechRecognition: 'none' | 'optional' | 'required';
    audioPlayback: boolean;
    network: 'none' | 'preferred' | 'required';
    fallbackTemplateRef?: PublishedModeTemplateRef;
  };
  evidenceClaims: Array<
    | 'completion'
    | 'accuracy'
    | 'spoken_attempt'
    | 'spoken_confident'
    | 'acoustic_pronunciation'
    | 'transfer'
  >;
  learnerCopy: {
    instruction: LocalizedContentValue[];
    primaryAction: LocalizedContentValue[];
    retryAction: LocalizedContentValue[];
    successMessage: LocalizedContentValue[];
    needsWorkMessage: LocalizedContentValue[];
    recoveryMessage: LocalizedContentValue[];
  };
  fixtures: Array<{
    fixtureId: string;
    label: string;
    state: PreviewState;
    payload: unknown;
    expectedResultKind?: string;
  }>;
  compatibility: {
    minAppVersion: string;
    requiredSupportManifestHashes: Sha256[];
    progressCompatibilityNamespace: string;
  };
  learningContractRefs: {
    learningEvidenceContractRef: VersionRef;
    prerequisiteGraphRef: VersionRef;
    supportFadePolicyRef: VersionRef;
  };
  voiceReleaseRequirements?: VoiceReleaseRequirements;
}

export interface ModeTemplateVersionRecord {
  schemaVersion: 'v2-mode-template-record.v1';
  templateId: string;
  version: number;
  contentHash: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
  createdAt: IsoDateTime;
}

export interface ModeTemplateLifecycleHead {
  schemaVersion: 'v2-mode-template-lifecycle.v1';
  templateId: string;
  version: number;
  contentHash: Sha256;
  status: Extract<AuthoringStatus, 'approved' | 'published' | 'deprecated' | 'archived'>;
  reason: string;
  replacementRef?: PublishedModeTemplateRef;
  changedBy: string;
  changedAt: IsoDateTime;
  lifecycleRevision: number;
}

export interface ModeTemplateVersion {
  body: ModeTemplateArtifactBody;
  record: ModeTemplateVersionRecord;
  lifecycle: ModeTemplateLifecycleHead;
}

export interface ModeTemplateHead {
  templateId: string;
  latestVersion: number;
  latestPublishedVersion?: number;
  status: AuthoringStatus;
  revision: number;
  fingerprint: Sha256;
  humanName: string;
  family: V2ActivityFamily;
  updatedBy: string;
  updatedAt: IsoDateTime;
}

export interface ModeTemplateDraftArtifactBody {
  schemaVersion: 'mode-template-draft-body.v1';
  templateId: string;
  proposedVersion: number;
  baseVersion?: number;
  data: Omit<ModeTemplateArtifactBody, 'schemaVersion' | 'templateId' | 'version'>;
}

export interface ModeTemplateDraftRevisionRecord {
  schemaVersion: 'mode-template-draft-record.v1';
  templateId: string;
  proposedVersion: number;
  revision: number;
  contentHash: Sha256;
  fingerprint: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
}

export interface ModeTemplateDraft {
  body: ModeTemplateDraftArtifactBody;
  record: ModeTemplateDraftRevisionRecord;
  status: Extract<AuthoringStatus, 'draft' | 'needs_review' | 'changes_requested'>;
}
```

`ModeTemplateArtifactBody` — единственный hashable JSON. `ModeTemplateVersionRecord` — маленький immutable Firestore envelope; `ModeTemplateLifecycleHead` — отдельно изменяемая guarded projection; validation/review решения — append-only documents. `ModeTemplateVersion` — resolved read model, а не объект, который сериализуется целиком. `record.contentHash`, `record.object.contentHash` и `contentHash(body)` обязаны совпадать. Draft использует тот же принцип: `data` canonicalizes в отдельный draft artifact body, затем record получает hash/object/fingerprint; ни один body не содержит собственный hash или object ref.

### 8.2 Lifecycle

```text
draft
  → needs_review
    → changes_requested → draft
    → approved
      → published
        → deprecated
          → archived
```

Правила:

- `draft` и `changes_requested` редактируются только через создание новой immutable draft revision;
- `needs_review` заморожен; любое изменение возвращает новую revision в `draft`;
- `approved` означает, что template прошёл validation и независимый review, но ещё не доступен для новых production episodes;
- `published` доступен в Mode Library;
- `deprecated` продолжает работать в существующих ActivityInstance и releases, но скрыт из обычного выбора;
- `archived` доступен только через фильтр и для исторического preview/rollback;
- физическое удаление запрещено после первого `approved`;
- publish версии N не меняет content/object версий 1..N−1; deprecate/archive меняют только lifecycle metadata выбранной версии через append-only audit.

### 8.3 Новая версия, clone и deprecate

- **Новая версия:** сохраняет `templateId`, увеличивает `version` на один и создаёт draft из точного published artifact. Существующие instances остаются на старой версии.
- **Clone:** создаёт новый `templateId` и `proposedVersion=1`, записывает `provenance.basedOn`, сбрасывает approvals, fixtures review и localization approvals.
- **Deprecate:** требует `content.review`, причину, replacement ref либо явное `noReplacement=true`. Новые instances не могут выбрать deprecated version.
- **Archive:** допускается, только если template deprecated и не выбран ни одним незапечатанным episode draft.
- **Restore:** archived template не возвращается в published на месте; создаётся новая версия или clone.

## 9. ActivityInstance

### 9.1 Точный контракт

```ts
export type GraphNodeRewardBinding =
  | {
      gateEligible: true;
      starSlotId: string;
      maxStars: 3;
    }
  | {
      gateEligible: false;
      starSlotId?: never;
      maxStars: 0;
    };

export interface GraphNodeFallbackBinding {
  policy: 'same_node' | 'alternate_node';
  alternateNodeId?: string;
  reasonCodes: Array<
    | 'permission_denied'
    | 'microphone_unavailable'
    | 'speech_locale_unsupported'
    | 'network_unavailable'
    | 'accessibility_preference'
  >;
  coreCompletionEquivalent: boolean;
  voiceEvidenceEquivalent: false;
}

export interface ActivityInstanceArtifactBody {
  schemaVersion: 'v2-activity-instance-body.v1';
  activityId: string;
  revision: number;
  episodeId: string;
  progressCompatibilityKey: string;
  templateRef: PublishedModeTemplateRef;
  family: V2ActivityFamily;
  estimatedSeconds: number;
  payload: unknown;
  payloadHash: Sha256;
  contentUnitIds: string[];
  overrides: Record<string, unknown>;
  tags: {
    skillIds: string[];
    grammar: string[];
    vocabulary: string[];
    scenario: string[];
    modalities: Array<'reading' | 'listening' | 'writing' | 'speaking'>;
  };
  localization: {
    studyTarget: StudyTarget;
    learnerSourceLocale: LearnerSourceLocale;
    requiredLocales: LocaleCode[];
    fieldSourceHashes: Record<string, Sha256>;
  };
  assets: Array<{
    assetId: string;
    role: string;
    object: ImmutableObjectRef;
    rightsId: string;
  }>;
}

export interface ActivityInstanceRecord {
  schemaVersion: 'v2-activity-instance-record.v1';
  activityId: string;
  revision: number;
  episodeId: string;
  contentHash: Sha256;
  payloadHash: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
}

export interface ActivityInstance {
  body: ActivityInstanceArtifactBody;
  record: ActivityInstanceRecord;
}
```

`overrides` разрешены только по `ModeTemplateArtifactBody.authoring.allowedOverridePaths`. Strict parser отклоняет неизвестные поля до canonicalization; server не удаляет и не принимает их молча. `ActivityInstance` не имеет третьей standalone lifecycle-модели: его body/record immutable и принадлежат exact EpisodeDraft/EpisodeRevision, а draft/review/approved state берётся только из lifecycle owning episode. Activity status нельзя менять отдельно от новой episode revision.

### 9.2 Создание упражнения

1. Администратор выбирает published ModeTemplate.
2. UI строит форму из `authoringFields` capability catalog.
3. Server закрепляет `templateId + version + contentHash`.
4. Администратор заполняет payload вручную, клонирует существующий instance или принимает generated draft.
5. Inline validation работает на blur; server validation остаётся авторитетной.
6. Первый save выдаёт стабильный `activityId`. Последующие изменения создают новую revision, но не меняют ID.
7. Web preview показывает все поддерживаемые template fixtures.
8. Для voice/gesture/animation режима требуется device preview receipt.
9. После review owning EpisodeRevision утверждает exact ActivityInstance body/record вместе с graph; отдельного mutable `ActivityInstance.status` нет.

Generated content никогда не получает `approved` автоматически.

## 10. EpisodeRevision и graph authoring

### 10.1 Контракт

```ts
export interface EpisodeScenarioContract {
  scenarioId: string;
  title: LocalizedContentValue[];
  setting: LocalizedContentValue[];
  learnerRole: LocalizedContentValue[];
  partnerRole: LocalizedContentValue[];
  communicativeGoal: LocalizedContentValue[];
  successCondition: LocalizedContentValue[];
  criticalConstraintIds: string[];
}

export interface EpisodePhraseFrame {
  phraseFrameId: string;
  targetPattern: string;
  learnerMeaning: LocalizedContentValue[];
  semanticSlotIds: string[];
  skillIds: string[];
  required: boolean;
}

export interface EpisodeSemanticSlot {
  semanticSlotId: string;
  role: LocalizedContentValue[];
  acceptedTargetValues: string[];
  allowedContentUnitIds: string[];
  minimumDistinctValues: number;
  requiredInCapstone: boolean;
  critical: boolean;
}

type EpisodeGraphNodeBase = {
  nodeId: string;
  activityId: string;
  position: number;
  visible: boolean;
  requiredForCore: boolean;
  voiceEvidenceOptional: boolean;
  fallback?: GraphNodeFallbackBinding;
};

type EpisodeEvidencePhase = 'encounter_build' | 'near_transfer' | 'independent_probe';

type EpisodeEvidenceGraphNode = {
  [P in EpisodeEvidencePhase]: {
    phase: P;
    evidenceDeclarations: Array<V2NodeEvidenceDeclaration & { phase: P }>;
    pedagogicalContextContract: Extract<
      LearningPedagogicalContextContract,
      { phase: P }
    >;
  };
}[EpisodeEvidencePhase];

export type EpisodeGraphNode = EpisodeGraphNodeBase &
  (
    | EpisodeEvidenceGraphNode
    | {
        phase: 'optional_review';
        evidenceDeclarations: [];
        pedagogicalContextContract?: never;
      }
  ) &
  GraphNodeRewardBinding;

export interface EpisodeGraphEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  condition:
    | 'completed'
    | 'passed'
    | 'needs_reinforcement'
      | 'fallback_selected';
}

export interface EpisodeLearningDesign {
  primaryOutcomeId: string;
  objectiveIds: string[];
  prerequisiteEdges: Array<{
    from: {
      kind: 'outcome' | 'objective';
      id: string;
      sourceEpisodeId: string;
    };
    toObjectiveId: string;
    requiredState: 'exposed' | 'supported_success' | 'independent_evidence';
  }>;
  supportPlan: Array<{
    objectiveId: string;
    initialSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
    fadeRuleId: string;
    escalationRuleId: string;
  }>;
  independentProbeRef: string;
  delayedProbeRef: V2DelayedProbeRef;
  delayedWindowPolicyId: string; // setting id under HYP-V2-007 in the season decisionRegistryRef
}

export interface EpisodeMasteryContract {
  evidencePolicyRef: PolicyRef & { kind: 'evidence' };
  requirements: Array<{
    objectiveId: string;
    construct: 'semantic' | 'listening' | 'recall' | 'spoken' | 'interaction';
    phase: 'near_transfer' | 'independent_probe' | 'delayed_probe';
    requiredValidity: 'assessed';
    requiredOutcome: 'success';
    maximumSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
  }>;
  durableClaimRequiresDelayedProbe: true;
  accessibilityHandling: 'learning_non_assessment_no_failure';
  numericCutoffHypothesisRef: 'HYP-V2-003';
  performanceStarsAreLearningEvidence: false;
  confidentVoiceTurnCountAloneIsSufficient: false;
}

export type V2ReviewLink =
  | {
      scheduleKind: 'optional_review';
      targetEpisodeId: string;
      delay: 'next_episode' | 'chapter_checkpoint';
      probeRef?: never;
      windowPolicyId?: never;
      skillIds: string[];
    }
  | {
      scheduleKind: 'delayed_probe';
      targetEpisodeId: string;
      delay: 'd_plus_1' | 'd_plus_7' | 'd_plus_21';
      probeRef: V2DelayedProbeRef;
      windowPolicyId: string;
      skillIds: string[];
    };

export interface EpisodeRevisionArtifactBody {
  schemaVersion: 'episode-authoring-body.v1';
  draftId: string;
  episodeId: string;
  revision: number;
  seasonId: string;
  ordinal: number;
  chapterId: string;
  studyTarget: StudyTarget;
  learnerSourceLocale: LearnerSourceLocale;
  title: LocalizedContentValue[];
  canDoOutcome: LocalizedContentValue[];
  scenario: EpisodeScenarioContract;
  phraseFrames: EpisodePhraseFrame[];
  semanticSlots: EpisodeSemanticSlot[];
  contentUnits: Record<string, unknown>;
  activityInstances: ActivityInstanceArtifactBody[];
  delayedProbeDefinitions: V2ResolvedDelayedProbeDefinition[];
  graph: {
    startNodeId: string;
    nodes: EpisodeGraphNode[];
    edges: EpisodeGraphEdge[];
  };
  starSlots: Array<{
    starSlotId: string;
    maxStars: 3;
    acceptedNodeIds: string[];
  }>;
  requiredLoops: {
    encounterBuildNodeIds: string[];
    nearTransferNodeIds: string[];
  };
  assessmentNodes: {
    independentProbeNodeIds: string[];
  };
  capstoneContract: {
    objectiveIds: string[];
    requiredSemanticSlotIds: string[];
    criticalConstraintIds: string[];
    primaryNodeIds: string[];
    deterministicAlternateNodeIds: string[];
  };
  masteryContract: EpisodeMasteryContract;
  learningDesign: EpisodeLearningDesign;
  voiceGovernance: {
    requirementsByTemplate: Array<{
      templateRef: PublishedModeTemplateRef;
      activityNodeIds: [string, ...string[]];
      releaseRequirements: VoiceReleaseRequirements;
    }>;
  };
  checkpointContract?: V2CheckpointContract;
  reviewLinks: V2ReviewLink[];
  minAppVersion: string;
}

export interface EpisodeRevisionRecord {
  schemaVersion: 'episode-authoring-record.v1';
  draftId: string;
  episodeId: string;
  revision: number;
  contentHash: Sha256;
  revisionFingerprint: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
  createdAt: IsoDateTime;
}

export interface EpisodeLifecycleHead {
  schemaVersion: 'episode-lifecycle.v1';
  draftId: string;
  episodeId: string;
  revision: number;
  revisionFingerprint: Sha256;
  status: Extract<AuthoringStatus, 'needs_review' | 'changes_requested' | 'approved' | 'archived'>;
  changedBy: string;
  changedAt: IsoDateTime;
  lifecycleRevision: number;
}

export interface EpisodeRevision {
  body: EpisodeRevisionArtifactBody;
  record: EpisodeRevisionRecord;
  lifecycle: EpisodeLifecycleHead;
}

export type EpisodeDraftArtifactBody = Omit<
  EpisodeRevisionArtifactBody,
  'schemaVersion'
> & {
  schemaVersion: 'episode-draft-body.v1';
};

export interface EpisodeDraftRevisionRecord {
  schemaVersion: 'episode-draft-record.v1';
  draftId: string;
  episodeId: string;
  revision: number;
  contentHash: Sha256;
  fingerprint: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
}

export interface EpisodeDraft {
  body: EpisodeDraftArtifactBody;
  record: EpisodeDraftRevisionRecord;
  status: Extract<
    AuthoringStatus,
    'draft' | 'needs_review' | 'changes_requested'
  >;
}
```

`EpisodeDraftArtifactBody` — полный редактируемый content aggregate; `EpisodeRevisionArtifactBody` — hashable approved snapshot. Их records содержат только identity/hash/object/provenance, lifecycle вынесен отдельно, receipts append-only. Firestore-документ в `content_episode_drafts` является изменяемым head/index projection на последнюю draft revision и не является canonical body. Каждая mutation сначала записывает canonical draft body и immutable record, затем атомарно передвигает head по `expectedRevision + expectedFingerprint`. Approval создаёт immutable episode body/record pair; последующее изменение начинается новой draft revision, approved body/record не перезаписываются.

`LearningPedagogicalContextContract`, `V2NodeEvidenceDeclaration`, `V2CheckpointContract`, `V2DelayedProbeRef`, `V2DelayedProbeDefinitionBody` и `V2ResolvedDelayedProbeDefinition` импортируются из canonical runtime contract документа 06; authoring не переопределяет их ослабленной копией. Поэтому каждый graph node заранее объявляет bounded objective/skill/construct/phase/target tuples с общим collision-free `LearningEvidenceTupleKey`, checkpoint pin-ит critical semantic slots и critical constraints, exact alternate/repair coverage и допускает в pass projection только `phase='independent_probe'`. Scheduler-owned delayed evidence остаётся отдельным durable-learning контуром и никогда не блокирует checkpoint или следующий эпизод.

`learningDesign` — actual per-episode contract, структурно идентичный документам 03/06, а не opaque ref: он хранит primary outcome/objectives, prerequisite outcome/exposure DAG, support/fade plan и distinct independent/delayed probes с D+N window. `V2ReviewLink` структурно идентичен canonical runtime contract документа 06: `near_transfer` хранится только в `requiredLoops`, `independent_probe` — только в `assessmentNodes`, а `reviewLinks` содержит лишь `optional_review` или scheduler-owned `delayed_probe`. `V2ReviewLink.delay` задаёт nominal delivery cadence, но не evidence window: текущий `HYP-V2-007` считает DTS/durable evidence только внутри pinned D+3…D+7 `windowPolicyId`. D+1 и D+21 могут доставить learning/review activity, но не создают DTS/durable success; вне окна результат получает `not_assessed_for_window`, а не failure или mastery. `masteryContract.evidencePolicyRef` pin-ит versioned evidence policy, а requirements оцениваются только по typed `LearningEvidence` с exact objective/construct/phase/support/validity. Сумма performance stars, `performanceStarsEarned`, `accessStarsEarned`, `accessStarsPurchased`, completion или число voice turns не является mastery evidence.

### 10.2 Episode Builder

Редактор строит эпизод в следующем порядке:

1. сезон, глава, номер, языковая пара;
2. can-do и сценарий;
3. phrase frames, semantic slots и content units;
4. выбор episode recipe или пустого DAG;
5. создание/выбор ActivityInstance;
6. порядок, ветви, fallback и два learning loops;
7. восемь star slots, capstone и checkpoint contract;
8. локализации и assets;
9. validation;
10. web preview;
11. device preview;
12. независимый review.

Visual graph не является единственным способом редактирования. Рядом всегда есть доступный ordered list с кнопками «Переместить выше», «Переместить ниже», «Добавить переход», «Удалить переход». Drag-and-drop — дополнительный input, а не обязательный.

### 10.3 Graph invariants

Кроме правил `06-runtime-content-admin-and-release.md` server проверяет:

- каждый node ссылается на ActivityInstance из той же revision;
- каждый instance закрепляет published ModeTemplate;
- briefing с `gateEligible=false` имеет `maxStars=0` и не входит в `starSlots`;
- каждый gate-eligible node входит ровно в один star slot;
- primary и fallback nodes используют один star slot;
- ровно восемь performance-star slots имеют максимум три stars; они формируют writable `performanceStarsEarned`, а `accessStarsEarned` только read-only 1:1 rematerialized projection из best performance без собственной policy/ledger/write; ни одна из них не является mastery evidence;
- capstone достижим из start node и имеет deterministic fallback;
- ни один required path не зависит только от network или AI;
- для каждой заявленной accessibility/capability route core completion и все access-required performance-star slots достижимы; alternate node делит star slot с primary, но неизмеренный construct остаётся `not_assessed_accessibility`;
- каждый learner-visible payload имеет approved localization;
- все template/policy/kernel refs поддерживаются обеими платформами выбранного `minAppVersion`;
- `learningDesign.primaryOutcomeId/objectiveIds` разрешаются, `prerequisiteEdges` образуют acyclic outcome/exposure DAG, а support plan покрывает каждую objective ровно один раз существующими fade/escalation rules;
- `assessmentNodes.independentProbeNodeIds` достижимы и разрешают exact `independentProbeRef`, но не входят в `requiredLoops`; в обычном эпизоде они не являются условием access gate. Явное исключение — checkpoint episodes 8/16/24: их independent-only checkpoint pass является отдельным опубликованным условием открытия следующей главы; E32 тем же способом определяет итоговый checkpoint status. Delayed probe отличается от training/near/independent surface, pin-ит `delayedProbeRef + delayedWindowPolicyId`, где window setting существует под `HYP-V2-007` exact season `decisionRegistryRef`, назначается scheduler-ом и никогда не блокирует access/checkpoint;
- каждая evidence-bearing `EpisodeGraphNode` типом связывает `node.phase = declaration.phase = pedagogicalContextContract.phase`; optional-review node имеет пустые declarations. Tuple уникальна, разрешается в episode objectives/skills/semantic slots/critical constraints и совпадает с materializer contract; actual attempt context/prompt должен точно совпасть с опубликованным contract, а support/hints/exposure — входить в его bounds;
- checkpoint `assessmentNodeIds` уникальны, непусты и равны множеству `evidenceRequirements[].assessmentNodeId`; они являются подмножеством `assessmentNodes.independentProbeNodeIds`. `assessedObjectiveIds` равны множеству requirement objective IDs; для каждого requirement node/declaration/requirement phase равны `independent_probe`. Alternate/reassessment nodes, поставляющие checkpoint evidence, также входят в independent list, тогда как training repair node сам не входит в projection. Каждый critical target покрыт ровно один раз и имеет exact deterministic alternate + targeted repair/reassessment; delayed/outside-window record в checkpoint projection блокирует validation;
- каждый `delayedProbeDefinitions` body hash-free, его `ref.contentHash` recompute-ится; `probeNodeId` уникален в scheduler namespace и отсутствует в graph/loops/star slots/checkpoint, `activityBinding` byte-for-byte совпадает с exact ActivityInstance/template, а все declarations имеют только `phase='delayed_probe'`. `learningDesign.delayedProbeRef` и delayed `V2ReviewLink.probeRef` обязаны ссылаться на один resolved definition exact target EpisodeRevision; строковый/mutable ref, orphan activity/template или graph-node reuse являются non-waivable blocker;
- `reviewLinks.scheduleKind` допускает только `optional_review | delayed_probe` и согласован с delay/probe/window; near-transfer в `reviewLinks` и independent probe вне `assessmentNodes` блокируют validation; `masteryContract.evidencePolicyRef` и каждый objective/construct/phase requirement существуют в versioned policy;
- каждый voice node входит ровно в один `voiceGovernance.requirementsByTemplate` aggregate и его `releaseRequirements` canonical-exact совпадает с immutable ModeTemplate; Episode не может сузить/расширить task types или purposes, убрать calibration/egress, заменить policy/hash/registry key либо изменить processing mode;
- on-device requirement не содержит voice policy/registry key/network purposes/egress ref; network requirement содержит exact `VoiceDataPolicyRef`, `activePolicyRegistryKey`, непустые purposes, exact `VoiceNetworkEgressRef` и deterministic scripted/on-device/non-voice fallback. Acoustic claims имеют свежий exact `SpeechCalibrationReceiptRef` для provider/model/config/locale/task type/construct;
- resolved policy содержит только immutable approved `VoiceConsentCopyRef(copyId + version + locale + contentHash)`, `VoiceDeletionRouteRef` и `VoiceMinorsPolicyRef`. Consent-copy locale уникальны, каждый processor/purpose имеет exact deletion route, а copy содержит равноправные accept/decline, revoke, delete, retention-obligation и operation-status labels. String alias, stale/missing/hash-mismatched ref или mutable registry head блокирует validation;
- Content Studio валидирует policy/copy/route/minors refs и наличие exact deployed server egress capability, но не создаёт account-specific classification/guardian-consent/eligibility/consent/reservation/consumption/settlement receipts: это делает runtime. Ни один network template не активируется, если оба app support manifests и season release manifest не pin-ят тот же `VoiceNetworkEgressRef`, resolved egress body не подтверждает reservation→consume→terminal settlement→settlement-bound deletion либо adapter inventory допускает direct provider call;
- изменения recipe не могут удалить earned compatibility key без явного migration classification.

### 10.4 Season workspace и звёздные ворота

Episode Builder работает внутри явного season draft. Сезон не хранит mutable episode heads: он pin-ит только exact approved EpisodeRevision refs. Поэтому замена эпизода создаёт новую season revision и делает прежние season validation/review receipts stale.

```ts
export interface SeasonEpisodeRevisionRef {
  draftId: string;
  episodeId: string;
  revision: number;
  revisionFingerprint: Sha256;
  contentHash: Sha256;
  ordinal: number;
  chapterId: string;
}

export interface SeasonGateDefinition {
  gateId: string;
  targetEpisodeId: string;
  priorEpisodeId: string;
  localEarnedMinimum: number;
  requiredCumulativeAccess: number;
  requiresPriorLoopsComplete: true;
  requiredCheckpointEpisodeId?: string;
  accessBoostPolicyKey: string;
}

export type SeasonReleaseScope =
  | { kind: 'vertical_slice'; includedChapterOrdinals: [1]; includedEpisodeOrdinals: [1] }
  | { kind: 'chapter_internal'; includedChapterOrdinals: [1]; includedEpisodeOrdinals: number[] }
  | {
      kind: 'full_season';
      includedChapterOrdinals: [1, 2, 3, 4];
      includedEpisodeOrdinals: number[];
    };

export interface SeasonRevisionArtifactBody {
  schemaVersion: 'season-authoring-body.v1';
  draftId: string;
  seasonId: string;
  revision: number;
  releaseScope: SeasonReleaseScope;
  studyTarget: StudyTarget;
  learnerSourceLocale: LearnerSourceLocale;
  title: LocalizedContentValue[];
  outcomeSummary: LocalizedContentValue[];
  intendedOutcome: {
    start: 'A0';
    end: 'strong_A1_early_A2';
    certificationClaim: false;
  };
  languageProfileId: string;
  gatePolicyVersion: string;
  decisionRegistryRef: VersionRef;
  minAppVersion: string;
  chapters: Array<{
    chapterId: string;
    ordinal: 1 | 2 | 3 | 4;
    title: LocalizedContentValue[];
    canDoOutcome: LocalizedContentValue[];
    episodeIds: string[];
    checkpointEpisodeId: string;
  }>;
  episodeRevisionRefs: SeasonEpisodeRevisionRef[];
  gates: SeasonGateDefinition[];
  legacyMapping: Array<{
    legacyLessonId: number;
    evidenceTargetEpisodeIds: string[];
    mappingKind: 'placement_evidence_only' | 'content_source_only';
    grantsV2Checkpoint: false;
    grantsV2Stars: false;
  }>;
}

export interface SeasonRevisionRecord {
  schemaVersion: 'season-authoring-record.v1';
  draftId: string;
  seasonId: string;
  revision: number;
  contentHash: Sha256;
  revisionFingerprint: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
  createdAt: IsoDateTime;
}

export interface SeasonLifecycleHead {
  schemaVersion: 'season-lifecycle.v1';
  draftId: string;
  seasonId: string;
  revision: number;
  revisionFingerprint: Sha256;
  status: Extract<AuthoringStatus, 'needs_review' | 'changes_requested' | 'approved' | 'archived'>;
  changedBy: string;
  changedAt: IsoDateTime;
  lifecycleRevision: number;
}

export interface SeasonRevision {
  body: SeasonRevisionArtifactBody;
  record: SeasonRevisionRecord;
  lifecycle: SeasonLifecycleHead;
}

export type SeasonDraftArtifactBody = Omit<
  SeasonRevisionArtifactBody,
  'schemaVersion'
> & {
  schemaVersion: 'season-draft-body.v1';
};

export interface SeasonDraftRevisionRecord {
  schemaVersion: 'season-draft-record.v1';
  draftId: string;
  seasonId: string;
  revision: number;
  contentHash: Sha256;
  fingerprint: Sha256;
  object: ImmutableObjectRef;
  provenance: EntityProvenance;
}

export interface SeasonDraft {
  body: SeasonDraftArtifactBody;
  record: SeasonDraftRevisionRecord;
  status: Extract<
    AuthoringStatus,
    'draft' | 'needs_review' | 'changes_requested'
  >;
}
```

`SeasonDraftArtifactBody` и `SeasonRevisionArtifactBody` связаны тем же правилом, что episode authoring: canonical body не содержит hash/object/lifecycle/receipts, immutable record содержит identity/hash/object/provenance, а lifecycle и receipts живут отдельно. `content_season_drafts` хранит только изменяемый head/index projection; exact состав сезона читается из pinned body/record pair конкретной `SeasonRevision`.

`decisionRegistryRef` — exact `VersionRef {id,version,contentHash}` immutable registry по единственной machine schema §6.2; документ 07 хранит governance table/passports и ссылается на этот artifact, но не переопределяет его. Release не может подменить ref mutable latest-version lookup. Season validator загружает body по ref, recompute-ит hash и требует настройки для всех `HYP-V2-001..008`: season/checkpoint shape, dosage/retry cap, completion/mastery cutoffs, star budget, gate curve, Access Boost price/caps, delayed-window setting ID и rollout percentages/observation windows. Каждый используемый numeric field, `learningDesign.delayedWindowPolicyId` и delayed `V2ReviewLink.windowPolicyId` обязан разрешаться как exact `HYP-V2-007.settings.delayedWindowPolicyId`; неизвестный, отсутствующий или hash-mismatched setting блокирует approval/seal.

`gatePolicyVersion` выбирается из code-owned immutable catalog и обязан соответствовать gate setting под `HYP-V2-005` pinned registry. Content Studio показывает рассчитанную таблицу, но не разрешает вручную рисовать кривую. `vertical_slice` содержит только E1 и может быть sealed/activated лишь для lab/staging; `chapter_internal` содержит E1–E8 и checkpoint E8; только `full_season` с 32 уникальными ordinal, 4×8 и checkpoints 8/16/24/32 production-eligible. Внутри выбранного scope E1 не имеет gate, каждый следующий episode имеет ровно один gate, а `localEarnedMinimum/requiredCumulativeAccess` точно совпадают с политикой из документа 05 и pinned decision registry. Access Boost может закрыть только разрешённый дефицит и использует цену/caps `HYP-V2-006`; он не отменяет prior loops, local earned minimum или checkpoint pass.

На `#content-episodes` сначала выбирается season workspace. В season view единственная задача — состав сезона, порядок, главы, gate preview и stale episode refs; в episode detail единственная задача — конкретный EpisodeRevision. Эти два состояния не показываются одной длинной формой и имеют по одному собственному primary CTA.

### 10.5 Reference Evidence Pack до UI implementation

До реализации activity shells, Mode Library, Episode Builder и Preview Lab создаётся traceable reference pack для **отобранных**, а не всех найденных competitor activities. Для каждого selected mode ledger фиксирует product, activity name, platform, app version/build, locale, capture date, source URL/first-hand status, rights/use note и researcher. Требуется минимум 3–6 состояний на mode: prompt, active/input, processing при наличии, success, needs-work/error/recovery и accessibility/permission/offline variant, если он определяет механику.

Каждый кадр аннотирует hierarchy, control placement, feedback timing, motion, retry, haptics/audio, accessibility и anti-patterns. Результат — не копия branded layout, а собственные Phraseman wireframes для всех canonical states/conditions с Content Studio fixture mapping. Для каждого mode экспортируется один оригинальный 3–6+ frame Phraseman contact sheet; `phraseman-wireframes.md` индексирует все sheets, а raw competitor captures остаются ignored evidence inputs. Distinctiveness gate подтверждает: нет чужих logos/copy/assets/trade dress; сохранены только проверенные interaction principles; UI следует Admin Bible/общим V2 shells и имеет собственную visual identity. Capture без version/platform/locale metadata или один marketing screenshot не считается evidence.

До реализации соответствующего activity UI или его shared shell contact sheet показывается пользователю. `activity-mode-ui-review.json` записывает `approved | changes_requested`, reviewer, timestamp, exact wireframe revision/hash и notes. Изменение sheet обнуляет прежнее решение; отсутствие current `approved` или `changes_requested` блокирует реализацию этого mode и его ещё не одобренной shared-shell dependency. Для reference/design gate обязательны `competitor-ux-evidence`, `ui-ux-pro-max`, `emil-design-eng` и `rn-accessibility-audit`; проектные UI Contrast Rule, Performance Bible и Admin UI Bible имеют приоритет над общими presets.

## 11. Информационная архитектура Admin v2

Все страницы остаются внутри верхней категории **«Контент»**. Левое меню сохраняет семь верхних разделов. Внутренние routes:

| Route | Страница | Одна главная задача | Primary CTA |
|---|---|---|---|
| `#content` | Обзор контента | показать незавершённую работу и blockers | «Продолжить последний черновик» |
| `#content-modes` | Библиотека режимов | найти или создать ModeTemplate | «Создать шаблон режима» |
| `#content-episodes` | Сезоны и эпизоды | собрать SeasonRevision либо изменить один EpisodeRevision | «Создать сезон» без выбранного сезона; «Создать эпизод» внутри season workspace |
| `#content-generation` | Генерация | запустить и контролировать stages | «Создать план генерации» |
| `#content-review` | Проверка | принять независимое review-решение | «Открыть следующий материал» |
| `#content-localization` | Переводы | закрыть missing/stale переводы | «Открыть следующую локализацию» |
| `#content-preview` | Preview Lab | проверить draft в web/device runtime | «Создать device preview» |
| `#content-releases` | Релизы | seal, activate или rollback | «Подготовить релиз» |

Диагностика capability manifests, повреждённых artifacts и orphan cleanup находится в верхнем разделе **«Диагностика»**, а не смешивается с ежедневным authoring.

### 11.1 Общие UI-правила

- спокойная светлая рабочая панель;
- один primary CTA на экран;
- Lucide icon плюс текст; emoji запрещены;
- technical key показан вторым уровнем;
- tooltip каждой кнопки объясняет действие, влияние, момент применения и отмену;
- dangerous action визуально отделён;
- normal text contrast не ниже 4.5:1;
- lime/salad surface использует тёмный foreground;
- touch target важных действий не меньше 44×44;
- inline validation на blur и server summary перед submit;
- loading сохраняет геометрию; empty/error не являются пустой белой областью;
- таблицы имеют поиск, фильтры, пагинацию и compact mobile mode;
- проверка на 375, 768, 1024 и 1440 px;
- `prefers-reduced-motion` отключает необязательные transitions;
- production environment всегда виден в верхней панели.

Рекомендованный визуальный язык: Inter/system sans, фон `#F6F8FB`, поверхность `#FFFFFF`, текст `#111827`, граница `#DDE3EA`, primary `#2563EB`. Data density допускается в очередях, но wizard остаётся одноколоночным и последовательным.

## 12. Wizards

### 12.1 ModeTemplate wizard

1. **Назначение:** название, family, педагогическая фаза и primary skills.
2. **Механика:** kernel из capability catalog; UI сразу показывает платформы и `minAppVersion`.
3. **Поля:** schema-driven список learner-visible и technical fields.
4. **Оценка:** только совместимые scoring/evidence/progress/reward/recovery policies.
5. **Доступность и fallback:** microphone/network constraints, non-voice route, mastery equivalence.
6. **Тексты:** learner copy и статусы локализаций.
7. **Примеры:** fixture для каждого обязательного PreviewState.
8. **Итог:** resolved refs, risks, diff, validation receipt и действие «Отправить на проверку».

Wizard не показывает renderer implementation path. Выбор policies сопровождается понятным описанием claims, а не только ключом.

### 12.2 ActivityInstance wizard

1. Выбор published ModeTemplate.
2. Заполнение полей payload.
3. Подключение content units и assets.
4. Настройка разрешённых overrides и локализуемых полей.
5. Проверка payload, policy compatibility и content identity.
6. Web preview всех состояний.
7. Device preview, если это требует template.
8. Validation и отправка в Episode Builder.

### 12.3 Episode wizard

1. Основные данные и can-do.
2. Сценарий и учебный материал.
3. Recipe и список режимов.
4. Конкретные упражнения.
5. DAG и fallback.
6. Stars, loops, capstone, checkpoint.
7. Переводы и assets.
8. Preview, validation и summary.

### 12.4 Season workspace

1. Языковая пара, название, intended outcome, language profile и release scope.
2. Выбор immutable `gatePolicyVersion` из code-owned catalog.
3. Четыре главы и checkpoints 8/16/24/32.
4. Pin exact approved EpisodeRevision и просмотр stale/missing refs.
5. Read-only gate table для included episodes: у `full_season` это E2–E32; показываются local earned minimum, cumulative access и checkpoint requirement.
6. Season validation, localization summary, diff и независимый review.

Ручное редактирование рассчитанных порогов запрещено. Если продукту нужна другая кривая или цена Access Boost, сначала создаётся новая versioned gate policy и экспериментальный паспорт, а season draft переключается на неё с полной повторной validation.

Каждый шаг можно сохранить как draft. Переход между шагами не публикует данные. «Отправить на проверку» появляется только в summary.

## 13. Preview contract и parity

### 13.1 Три уровня проверки

| Уровень | Что доказывает | Может разблокировать publish |
|---|---|---|
| Schema preview | payload читается и проходит machine validation | Нет |
| Web storyboard | последовательность, тексты, assets и expected states выглядят разумно | Только для режимов без runtime-specific требований |
| Device runtime preview | настоящий React Native renderer и policies загрузили точный fingerprint | Да |

Web preview всегда показывает подпись: «Структурный предпросмотр. Финальный интерфейс проверяется на устройстве».

### 13.2 Preview envelope

```ts
export interface V2PreviewEnvelopeBody {
  schemaVersion: 'v2-preview-envelope-body.v1';
  previewSessionId: string;
  entity:
    | {
        type: 'mode_template';
        templateId: string;
        ref:
          | { kind: 'published_version'; version: number }
          | { kind: 'draft_revision'; proposedVersion: number; revision: number };
      }
    | {
        type: 'activity_instance';
        draftId: string;
        episodeRevision: number;
        activityId: string;
        activityRevision: number;
      }
    | { type: 'episode'; draftId: string; revision: number }
    | { type: 'season'; draftId: string; revision: number };
  entityFingerprint: Sha256;
  environment: 'development' | 'staging';
  studyTarget: StudyTarget;
  learnerSourceLocale: LearnerSourceLocale;
  requestedStates: PreviewState[];
  requestedConditions: PreviewConditions[];
  resolvedTemplateVersions: PublishedModeTemplateRef[];
  resolvedKernelRefs: Array<{
    activityTypeKey: string;
    kernelVersion: number;
    rendererKey: string;
    rendererSchemaVersion: number;
  }>;
  resolvedPolicyRefs: PolicyRef[];
  supportManifestHashes: {
    ios: Sha256;
    android: Sha256;
  };
  payloadObject: ImmutableObjectRef;
  createdBy: string;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
}

export interface V2PreviewEnvelopeRecord {
  schemaVersion: 'v2-preview-envelope-record.v1';
  previewSessionId: string;
  envelopeHash: Sha256;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
}

export interface V2PreviewEnvelopeResponse {
  body: V2PreviewEnvelopeBody;
  envelopeHash: Sha256;
}

export interface CreateV2PreviewSessionResult {
  previewSessionId: string;
  expiresAt: IsoDateTime;
  entityFingerprint: Sha256;
  envelopeHash: Sha256;
  grants: readonly [V2PreviewGrant, V2PreviewGrant];
}

export interface V2PreviewGrant {
  grantId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber: number;
  deepLink: string;
  expiresAt: IsoDateTime;
  envelopeHash: Sha256;
}

export interface V2DevicePreviewReceipt {
  schemaVersion: 'v2-device-preview-receipt.v1';
  receiptId: string;
  previewSessionId: string;
  envelopeHash: Sha256;
  entityFingerprint: Sha256;
  appVersion: string;
  buildNumber: number;
  platform: 'ios' | 'android';
  deviceClass: 'phone' | 'tablet';
  grantId: string;
  supportManifestHash: Sha256;
  renderedStates: PreviewState[];
  resolvedKernelRefs: string[];
  resolvedPolicyRefs: PolicyRef[];
  accessibilityChecks: {
    screenReader: 'passed' | 'not_run' | 'not_applicable';
    largeText: 'passed' | 'not_run' | 'not_applicable';
    reducedMotion: 'passed' | 'not_run' | 'not_applicable';
  };
  result: 'passed' | 'failed';
  failureCodes: string[];
  createdAt: IsoDateTime;
}
```

ModeTemplate preview явно различает уже published version и конкретную immutable draft revision; mutable head никогда не является preview input. `ActivityInstance` preview всегда episode-scoped: server разрешает его только внутри указанной immutable `EpisodeRevision`, поэтому не требуется unbounded lookup по всем черновикам и невозможно случайно открыть одноимённое упражнение из другого эпизода. Season preview pin-ит exact SeasonRevision и все её EpisodeRevision refs, чтобы карта, lock states и gate explanations проверялись на тех же данных, которые пойдут в release.

`envelopeHash = contentHash(V2PreviewEnvelopeBody)`. Body не содержит `envelopeHash` или собственный object ref; record, response, оба grants и device receipts pin-ят exact envelope hash. Runtime сначала recompute hash body bytes, затем сравнивает record/grant/response hash и только после этого разрешает renderer.

### 13.3 Deep-link flow

1. `adminCreateV2PreviewSession` получает entity ref, exact fingerprint, requested states/conditions и exact iOS/Android internal build targets.
2. Server создаёт один immutable envelope и **два** grants для того же fingerprint: один `ios`, один `android`. У каждого grant свой 256-bit random token; хранится только token hash.
3. Ответ содержит две ссылки вида `phraseman://learning-v2-preview?session=<id>&grant=<grantId>&token=<opaque>`. Один token нельзя использовать на обеих платформах.
4. Route filename и normalized path каноничны: `app/learning-v2-preview.tsx` ↔ `/learning-v2-preview` ↔ scheme URL выше. `app/+native-intent.tsx` пропускает только этот exact path по internal route policy.
5. Route доступен только internal/development build, Firebase-authenticated administrator и valid App Check.
6. Приложение передаёт session/grant/token в `getV2PreviewEnvelope`. Grant одноразовый, живёт 15 минут, actor-bound и platform/build-bound. Consumed iOS grant не инвалидирует Android grant; session закрывается после двух receipts, explicit revoke или expiry.
7. Runtime проверяет envelope hash, support manifest, schemas, exact kernel/policy refs и соответствие grant фактической platform/build.
8. После preview приложение отправляет receipt через `recordV2DevicePreviewReceipt`, указывая consumed `grantId`.
9. Изменение entity fingerprint немедленно делает оба grants и receipts stale.

Cold-start и warm-app deep-link flows тестируются отдельно на обеих платформах. Reused, wrong-platform, wrong-build, wrong-actor, expired и revoked grants fail-closed. `requestedStates` принимает только шесть canonical renderer states; offline, permission, signal, scorer outcome, theme, text scale и motion передаются через `requestedConditions`.

Payload, provider prompt, API key и raw artifact не кодируются в URL. Production consumer build отклоняет route до чтения envelope.

## 14. Validation receipts и waivers

### 14.1 Контракты

```ts
export interface ContentValidationIssue {
  ruleId: string;
  ruleVersion: number;
  severity: ValidationSeverity;
  category:
    | 'schema'
    | 'capability'
    | 'pedagogy'
    | 'graph'
    | 'localization'
    | 'accessibility'
    | 'asset'
    | 'privacy'
    | 'release';
  path: string;
  message: string;
  remediation: string;
  waivable: boolean;
  issueFingerprint: Sha256;
}

export interface ContentValidationReceipt {
  schemaVersion: 'content-validation-receipt.v1';
  receiptId: string;
  entityType: 'mode_template' | 'activity_instance' | 'episode' | 'season';
  entityId: string;
  entityRevision: number;
  entityFingerprint: Sha256;
  validatorVersion: string;
  capabilityCatalogRevision: number;
  supportManifestHashes: Sha256[];
  issues: ContentValidationIssue[];
  appliedWaiverIds: string[];
  status: 'passed' | 'passed_with_waivers' | 'failed';
  createdAt: IsoDateTime;
}

export interface ContentValidationWaiver {
  schemaVersion: 'content-validation-waiver.v1';
  waiverId: string;
  ruleId: string;
  ruleVersion: number;
  issueFingerprint: Sha256;
  entityType: ContentValidationReceipt['entityType'];
  entityId: string;
  entityRevision: number;
  entityFingerprint: Sha256;
  scope:
    | { type: 'single_review' }
    | { type: 'release'; releaseId: string };
  reason: string;
  approvedBy: string;
  approvedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  status: 'active' | 'expired' | 'revoked' | 'stale';
}

export interface ContentReceiptSubject {
  entityType: 'mode_template' | 'activity_instance' | 'episode' | 'season' | 'release_manifest';
  entityId: string;
  entityRevision: number;
  entityFingerprint: Sha256;
}

export interface ContentGateReceiptBody {
  schemaVersion: 'content-gate-receipt-body.v1';
  gateKind: 'approval' | 'release_seal';
  subject: ContentReceiptSubject;
  validationReceiptHash: Sha256;
  localizationReceiptSetHash: Sha256;
  reviewReceiptHash: Sha256;
  devicePreviewReceiptHashes?: Readonly<{
    ios: Sha256;
    android: Sha256;
  }>;
  waiverSetHash: Sha256;
  evaluatedBy: string;
  evaluatedAt: IsoDateTime;
}

export interface ContentGateReceiptRecord {
  schemaVersion: 'content-gate-receipt-record.v1';
  gateReceiptId: string;
  receiptHash: Sha256;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}
```

Validation, preview, localization, review и waiver receipts находятся только в append-only collections и разрешаются по exact `entityType + entityId + entityRevision + entityFingerprint`; immutable artifact records не содержат mutable receipt ID/array backrefs. Approval/seal transaction загружает bounded fresh receipt set, проверяет hashes/fingerprint, записывает отдельный `ContentGateReceiptBody + Record` и только затем двигает lifecycle/release pointer. Изменение lifecycle никогда не переписывает artifact record; `receiptHash = contentHash(ContentGateReceiptBody)` и body не содержит self hash/object.

### 14.2 Никогда не waivable

- неизвестный kernel, renderer, policy или schema;
- hash/generation mismatch;
- invalid locale identity;
- graph cycle, dead-end или недостижимый required node;
- required AI/network-only core path;
- voice-required node без разрешённого fallback;
- voice/acoustic claim без свежего exact `SpeechCalibrationReceiptRef` для provider/model/config/locale/task type/construct либо Episode aggregate, не совпадающий с template requirement;
- network voice/transcript processing без discriminated `VoiceReleaseRequirements`, exact active-registry `VoiceDataPolicyRef`, exact deployed `VoiceNetworkEgressRef` во всех app/season support manifests, safe reservation-consume-settle-reconcile/finality/deletion protocol, declared purposes, deterministic fallback, immutable localized `VoiceConsentCopyRef`, specialized deletion-route/minors refs или policy coverage для processor/region, retention, provider proof, non-terminal legal-hold obligation, dispatch/deletion journals/SLA, account switch/delete и authoritative adult/minor/unknown/guardian fail-closed eligibility;
- missing/invalid `learningDesign`, stale `masteryContract.evidencePolicyRef`, broken prerequisite outcome/exposure DAG, support-fade rule или probe/window semantic;
- отсутствие approved learner-visible localization;
- asset без hash, rights ID или допустимого source;
- unsupported `minAppVersion`;
- stale review fingerprint;
- self-review production material;
- отсутствие восьми performance-star slots, вывод mastery из суммы stars или смешивание `performanceStarsEarned`/`accessStarsEarned`/`accessStarsPurchased` с `learningEvidence`;
- raw provider secret, prompt или внутренний metadata в release.

Waiver разрешён только для rule, у которого `waivable=true`. Он требует `content.review`, причину длиной 20–1000 символов и срок не более 30 дней. Изменение entity или issue fingerprint делает waiver stale. Publish callable повторно проверяет waiver внутри transaction.

## 15. Права и разделение обязанностей

### 15.1 Permission keys

| Permission | Разрешено | Запрещено |
|---|---|---|
| `content.read` | списки, детали, preview released/approved data, audit | создавать и изменять |
| `content.draft.write` | create, clone, edit draft, run/retry/cancel stages | review, waiver, seal, activate |
| `content.review` | approve/reject, changes requested, допустимый waiver | редактировать submitted revision, seal, activate |
| `content.publish` | seal, activate, pause, rollback approved release | обходить validation/review |

### 15.2 Роли

Нормативная матрица:

| Role | read | draft | review | publish |
|---|---:|---:|---:|---:|
| owner | да | да | да | да |
| admin | да | да | да | да |
| content_editor | да | да | нет | нет |
| content_reviewer | да | нет | да | нет |
| analyst | да | нет | нет | нет |
| developer | да | нет | нет | нет |

В `functions/src/admin/roles.ts` добавляется роль `content_reviewer`. `content.review` мигрируется end-to-end: server matrix и tests в `functions/src/admin/permissions.ts`, `functions/src/admin/permissions.test.ts`; stage callable в `functions/src/admin_content_stages.ts`; browser capability/action guards в `admin/v2/scripts/admin-core.js` и `admin/v2/scripts/pages/content-generator.js`; contract tests в `tests/admin_v2_r7_permission_contract.test.ts`. Старый `content.publish` больше не разрешает stage review. UI не должен скрывать server mismatch: reviewer видит review actions, publisher без review permission — нет, а server независимо повторяет ту же проверку.

Maker-checker правило:

- reviewer UID не равен creator/last editor UID;
- publisher может совпадать с reviewer, но seal всё равно требует уже существующий independent review receipt;
- owner/admin не получают скрытого обхода;
- emergency rollback допускается без нового content review, потому что возвращает ранее активный immutable release, но требует `content.publish` и reason.

## 16. Optimistic concurrency и idempotency

Каждая mutation использует `MutationContext`.

Server transaction:

1. читает authoring head;
2. сравнивает `expectedRevision` и `expectedFingerprint`;
3. проверяет idempotency operation;
4. canonicalizes и валидирует input;
5. пишет immutable object с precondition «object ещё не существует»;
6. создаёт metadata revision;
7. атомарно передвигает head;
8. создаёт `admin_log`;
9. завершает `admin_command_operations`.

При stale edit callable возвращает:

```ts
export interface StaleAuthoringConflict {
  code: 'authoring_revision_stale';
  currentRevision: number;
  currentFingerprint: Sha256;
  currentUpdatedBy: string;
  currentUpdatedAt: IsoDateTime;
  semanticDiffSummary: {
    added: number;
    removed: number;
    changed: number;
    moved: number;
  };
}
```

UI предлагает «Загрузить свежую версию» и «Скопировать мои изменения». Автоматическое last-write-wins и скрытый merge запрещены. Повтор с тем же idempotency key и тем же fingerprint возвращает replay; тот же key с другим payload возвращает `already-exists: idempotency_key_reused`.

## 17. Stage DAG

### 17.1 V2 stage kinds

К существующему `GenerationStageKind` добавляются:

```ts
export type V2GenerationStageKind =
  | 'v2_season_outline'
  | 'v2_episode_outline'
  | 'v2_scene_set'
  | 'v2_dialogue_script'
  | 'v2_speaking_mission'
  | 'v2_voice_targets'
  | 'v2_activity_instances'
  | 'v2_activity_graph'
  | 'v2_asset_manifest'
  | 'v2_localization'
  | 'v2_preview_receipt'
  | 'v2_episode_bundle'
  | 'v2_season_qa';
```

Эти 13 kinds являются каноническим V2 stage set и совпадают с документом 06. ModeTemplate не является provider generation stage: published template version подключается как immutable prerequisite.

Admin показывает human label первым уровнем, raw kind — только вторым:

```ts
export const V2_STAGE_HUMAN_LABELS: Readonly<Record<V2GenerationStageKind, string>> = {
  v2_season_outline: 'План сезона',
  v2_episode_outline: 'План эпизода',
  v2_scene_set: 'Набор сцен',
  v2_dialogue_script: 'Сценарий диалога',
  v2_speaking_mission: 'Разговорная миссия',
  v2_voice_targets: 'Голосовые цели',
  v2_activity_instances: 'Упражнения эпизода',
  v2_activity_graph: 'Маршрут эпизода',
  v2_asset_manifest: 'Медиа и права',
  v2_localization: 'Переводы',
  v2_preview_receipt: 'Проверка на устройствах',
  v2_episode_bundle: 'Пакет эпизода',
  v2_season_qa: 'Проверка сезона',
};
```

### 17.2 Зависимости

```text
season plan (one per SeasonRevision scope)
  published language profile + published ModeTemplate versions
    → v2_season_outline [1]
      → episode subgraph [N = 1, 8 or 32 by releaseScope]
        v2_episode_outline [1]
          ├─ v2_scene_set [1]
          ├─ v2_dialogue_script [0..1 by recipe]
          ├─ v2_speaking_mission [0..1 by recipe]
          └─ v2_voice_targets [1]
        → v2_activity_instances [1]
          → v2_activity_graph [1]
            ├─ v2_asset_manifest [1]
            └─ v2_localization [1 per learnerSourceLocale]
          → v2_preview_receipt [1 aggregate over two platform grants]
            → v2_episode_bundle [1]
      → v2_season_qa [1 after all N episode bundles]
        → human review → lesson-surface adapter → CourseRelease seal → activation
```

`buildV2SeasonPlan` владеет `v2_season_outline`, количеством episode subgraphs и единственным `v2_season_qa`. `buildV2EpisodeSubgraph` никогда не создаёт дубликаты season stages. Cardinality проверяется отдельно для `vertical_slice` (N=1), `chapter_internal` (N=8) и `full_season` (N=32).

### 17.3 Dependency capability contract

Текущий `StageCapability` предполагает один простой exact prerequisite list. V2 требует discriminator для stage/template/language-profile dependencies, immutable pins и freshness:

```ts
export type StageDependencyRule =
  | {
      dependencyType: 'stage';
      acceptedKinds: readonly (GenerationStageKind | V2GenerationStageKind)[];
      cardinality: Readonly<{ min: number; max: number }>;
      scope: 'same_episode' | 'same_season' | 'same_locale_pair';
      requiredState: 'approved';
    }
  | {
      dependencyType: 'published_template';
      cardinality: Readonly<{ min: number; max: number }>;
      compatibleFamilies: readonly V2ActivityFamily[];
      requiredState: 'published';
    }
  | {
      dependencyType: 'language_profile';
      cardinality: Readonly<{ fixed: 1 }>;
      scope: 'same_locale_pair';
      requiredState: 'published';
    };

export type ResolvedStageDependency =
  | {
      dependencyType: 'stage';
      stageId: string;
      kind: GenerationStageKind | V2GenerationStageKind;
      artifactHash: Sha256;
      reviewFingerprint: Sha256;
    }
  | {
      dependencyType: 'published_template';
      templateId: string;
      version: number;
      contentHash: Sha256;
      objectGeneration: string;
    }
  | {
      dependencyType: 'language_profile';
      languageProfileId: string;
      version: number;
      contentHash: Sha256;
      objectGeneration: string;
    };

export interface V2StageCapability {
  kind: V2GenerationStageKind;
  scopeType: 'season' | 'episode';
  dependencyRules: readonly StageDependencyRule[];
  count: Readonly<{ min: number; max: number; fixed?: number }>;
  editableFields: readonly string[];
  publicationPolicy: 'standard';
  runtimeConsumer: boolean;
}
```

Stage record хранит `resolvedDependencies` и `dependencyFingerprint = sha256(canonicalJsonV1(sorted immutable refs))`. Dependency считается stale, если pinned stage artifact/review fingerprint изменился, template/language profile перестал быть published, object generation/hash расходится либо plan scope больше не совпадает. Любая stale dependency инвалидирует downstream validation/review/preview; автоматическое переключение на latest запрещено.

Нельзя кодировать V2 dependencies через фиктивный `same_scope`, raw string ID или порядок массива. Parsers в `stage_contracts.ts`, rules в `stage_capabilities.ts`, resolution в `stage_service.ts`, graph validation в `dependency_graph.ts`, callables в `admin_content_stages.ts` и worker обязаны принимать одну union. Validation сообщает отсутствующий dependency human label, а raw key показывает вторым уровнем.

## 18. Firestore, Storage и callables

### 18.1 Коллекции

Новые server-owned коллекции:

| Collection | Назначение |
|---|---|
| `content_mode_templates` | mutable heads ModeTemplate |
| `content_mode_template_draft_revisions` | immutable snapshots каждого authoring save |
| `content_mode_template_versions` | immutable metadata envelope published body/object |
| `content_mode_template_lifecycle` | guarded mutable lifecycle head; content/object здесь отсутствуют |
| `content_season_drafts` | mutable heads season workspaces |
| `content_season_revisions` | immutable SeasonRevision records |
| `content_season_lifecycle` | guarded lifecycle projection season revisions |
| `content_episode_drafts` | mutable heads эпизодов |
| `content_episode_revisions` | immutable EpisodeRevision records |
| `content_episode_lifecycle` | guarded lifecycle projection episode revisions |
| `content_studio_review_queue` | server-owned materialized review inbox |
| `content_studio_localization_units` | server-owned field-level localization projection |
| `content_studio_review_receipts` | immutable review decisions |
| `content_studio_validation_receipts` | immutable machine validation |
| `content_studio_waivers` | scoped waivers |
| `content_studio_preview_sessions` | короткоживущие preview sessions |
| `content_studio_preview_receipts` | device parity receipts |
| `content_app_support_manifests` | manifests builds/platforms |

Переиспользуются:

- `content_factory_stages`;
- `content_factory_correction_events`;
- `content_factory_artifact_orphans`;
- `content_factory_releases`;
- `content_factory_catalog`;
- `content_factory_catalog_releases`;
- `content_factory_release_history`;
- `admin_command_operations`;
- `admin_log`.

Document IDs:

```text
content_mode_templates/<templateId>
content_mode_template_draft_revisions/<templateId>__p<proposedVersion>__r<revision>
content_mode_template_versions/<templateId>__v<version>
content_season_drafts/<studyTarget>__<sourceLocale>__<seasonId>
content_season_revisions/<seasonDraftId>__r<revision>
content_episode_drafts/<studyTarget>__<sourceLocale>__<seasonId>__<episodeId>
content_episode_revisions/<draftId>__r<revision>
content_studio_review_queue/<sha256(entityType|entityId|entityRevision)>
content_studio_localization_units/<sha256(entityType|entityId|entityRevision|locale|fieldPath)>
```

### 18.2 Server-owned queue projections

```ts
export interface ReviewQueueItem {
  schemaVersion: 'content-review-queue-item.v1';
  queueItemId: Sha256;
  entityType: 'mode_template' | 'episode' | 'season' | 'generation_stage';
  entityId: string;
  entityRevision: number;
  entityFingerprint: Sha256;
  status: 'submitted' | 'claimed' | 'changes_requested' | 'approved' | 'withdrawn' | 'stale';
  submittedBy: string;
  submittedAt: IsoDateTime;
  claimedBy?: string;
  claimedAt?: IsoDateTime;
  resolvedAt?: IsoDateTime;
  studyTarget?: StudyTarget;
  learnerSourceLocale?: LearnerSourceLocale;
}

export interface LocalizationUnitProjection {
  schemaVersion: 'content-localization-unit.v1';
  localizationUnitId: Sha256;
  entityType: 'mode_template' | 'episode' | 'season';
  entityId: string;
  entityRevision: number;
  entityFingerprint: Sha256;
  fieldPath: string;
  sourceLocale: LocaleCode;
  sourceText: string;
  sourceHash: Sha256;
  targetLocale: LocaleCode;
  targetText: string;
  status: 'draft' | 'needs_review' | 'changes_requested' | 'approved' | 'stale';
  lastEditorUid?: string;
  reviewerUid?: string;
  reviewedAt?: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

IDs — полный lowercase SHA-256 canonical tuple, не усечённый prefix. Submit/withdraw/review изменяет queue projection в той же transaction, что authoring lifecycle head и append-only review receipt. Authoring save reconciles localization units в той же transaction: unchanged source hashes сохраняют перевод, changed/removed fields становятся `stale`; approval одновременно обновляет unit и append-only localization review receipt. Artifact body хранит только `LocalizedContentValue`; projection хранит status/editor/reviewer/timestamps. Seal принимает value только при exact approved projection и не копирует workflow metadata в body. Browser не пишет projections.

List callables используют server-authoritative filters, `limit <= 100` и opaque cursor, который кодирует последнюю пару сортировки плюс ID: review `(submittedAt, queueItemId)`, localization `(updatedAt, localizationUnitId)`. Cursor с другим filter fingerprint отклоняется. Server-only idempotent rebuild читает immutable records, пересоздаёт projections в bounded batches и пишет `ProjectionConsistencyReceipt` с source count/hash, projection count/hash и drift codes. Nightly/diagnostic consistency check не чинит данные молча; Admin показывает drift и explicit rebuild action с audit.

### 18.3 Storage paths

```text
content-studio/mode-templates/<sha256(templateId)>/v<version>/<contentHash>.json
content-studio/mode-template-drafts/<sha256(templateId)>/p<proposedVersion>/r<revision>/<fingerprint>.json
content-studio/activity-instances/<sha256(draftId)>/er<episodeRevision>/<sha256(activityId)>/r<activityRevision>/<payloadHash>.json
content-studio/seasons/<sha256(seasonDraftId)>/r<revision>/<contentHash>.json
content-studio/episodes/<sha256(draftId)>/r<revision>/<contentHash>.json
content-studio/previews/<sha256(sessionId)>/<entityFingerprint>.json
course-releases/<releaseId>/lesson/<lessonId>.json
```

Authoring object пишется через существующий `writeImmutableObject` pattern. Storage содержит только canonical `*ArtifactBody`; Firestore record envelope хранит identity, body hash, path, generation и bytes. Lifecycle heads и append-only receipts не входят в object. ActivityInstance records хранятся внутри соответствующей EpisodeRevision record, а не в глобальной сканируемой collection. Если transaction не зафиксировала reference, object регистрируется в `content_factory_artifact_orphans`.

### 18.4 Callables

| Callable | Permission | Назначение |
|---|---|---|
| `adminGetV2ContentCapabilities` | read | capability catalog и support manifests |
| `adminListModeTemplates` | read | фильтрованный список heads |
| `adminGetModeTemplate` | read | head, version, diff, receipts |
| `adminSaveModeTemplateDraft` | draft | новая draft revision |
| `adminCloneModeTemplate` | draft | clone в новый templateId |
| `adminSubmitModeTemplateReview` | draft | freeze и отправка |
| `adminReviewModeTemplate` | review | approve/changes requested |
| `adminPublishModeTemplate` | review | сделать approved version доступной для authoring |
| `adminDeprecateModeTemplate` | review | deprecate version |
| `adminListV2Seasons` | read | season heads и release readiness |
| `adminGetV2Season` | read | exact SeasonRevision, diff и receipts |
| `adminSaveV2SeasonDraft` | draft | новая immutable season revision |
| `adminCloneV2Season` | draft | clone с новыми season/draft IDs и сброшенными approvals |
| `adminValidateV2Season` | draft | scope-specific composition/gates/checkpoints/ref validation receipt |
| `adminSubmitV2SeasonReview` | draft | freeze season fingerprint и очередь review |
| `adminReviewV2Season` | review | approve/changes requested |
| `adminListV2Episodes` | read | список episode heads |
| `adminGetV2Episode` | read | revision, graph, receipts |
| `adminSaveV2EpisodeDraft` | draft | новая episode revision |
| `adminCloneV2Episode` | draft | clone с новыми stable IDs |
| `adminValidateV2Episode` | draft | validation receipt |
| `adminSubmitV2EpisodeReview` | draft | freeze и очередь review |
| `adminReviewV2Episode` | review | approve/changes requested |
| `adminCreateContentWaiver` | review | только waivable warning |
| `adminListV2ReviewQueue` | review | review inbox |
| `adminListV2LocalizationUnits` | read/draft/review | bounded localization queue по permission |
| `adminSaveV2LocalizationUnit` | draft | source-hash-bound translation edit |
| `adminReviewV2LocalizationUnit` | review | approve/changes requested с maker-checker |
| `adminRebuildV2ContentProjections` | owner/admin diagnostic | idempotent bounded rebuild queue projections + consistency receipt |
| `adminCreateV2PreviewSession` | draft | immutable preview envelope |
| `getV2PreviewEnvelope` | internal preview auth | одноразовая выдача envelope |
| `recordV2DevicePreviewReceipt` | internal preview auth | device parity receipt |
| `adminCreateContentStage` | draft | существующий stage create, расширенный V2 kinds |
| `adminRunContentStage` | draft | существующий worker start/retry |
| `adminReviewContentStage` | review | review stage; permission меняется с publish |
| `adminSealCourseRelease` | publish | существующий seal |
| `adminActivateCourseRelease` | publish | существующая activation |
| `adminRollbackCourseRelease` | publish | существующий rollback |

Все callables используют `ENFORCE_APP_CHECK`, admin claim, permission, строгий allowlist input, idempotency и audit. Firestore rules запрещают browser/mobile direct read/write к перечисленным authoring/projection collections. Read идёт через callables, чтобы исключить provider metadata и внутренние prompts.

### 18.5 Phase 00: security inventory до создания namespaces

Firestore `match` rules аддитивны: overlapping `allow` объединяются через OR, поэтому узкий `allow ...: if false` **не перекрывает** существующий admin catch-all `allow read, write: if isAdmin()`. Это прямо определено в официальной документации Firebase: [Overlapping match statements](https://firebase.google.com/docs/firestore/security/rules-structure#overlapping_match_statements). Запрещено добавлять Content Studio namespaces, сохранив catch-all и рассчитывая на nested deny.

До первого deploy/создания любой новой `content_*`/`content_studio_*` authoring collection выполняется gate:

1. Инвентаризировать все прямые browser reads/writes legacy Admin: collection/path, файл/function/action, роль, read/write, fallback и владелец миграции. Минимум проверить `admin/legacy.html`, `admin/v2/scripts/admin-firebase.js`, `admin/v2/scripts/admin-core.js` и все page actions.
2. Разделить inventory на `explicit_legacy_allow`, `migrate_to_callable`, `remove_after_verified_migration`. Никакая существующая функция не удаляется и не теряет доступ молча.
3. Заменить глобальный admin catch-all на явные legacy path allow rules либо на доказуемый path-excluding predicate, который исключает все будущие callable-only prefixes. Вариант «оставить catch-all + добавить deny» не проходит review.
4. Emulator test входит как authenticated admin и доказывает deny для direct `get/list/create/update/delete` каждого нового authoring/projection path, одновременно доказывая backward-compatible доступ ко всем ещё разрешённым legacy paths из inventory.
5. Только после зелёного emulator packet разрешены deploy rules, создание collections/indexes и запуск Content Studio callables. Остальные legacy direct paths затем мигрируют по inventory; catch-all уже не возвращается.

Phase 00 packet содержит before/after rules map, legacy coverage table, admin emulator results и rollback ruleset. Статический поиск строки `allow ... false` не является security proof.

### 18.6 Индексы

`firestore.indexes.json` должен покрывать:

- mode templates: `status + family + updatedAt desc`;
- season drafts: `studyTarget + learnerSourceLocale + status + updatedAt desc`;
- episode drafts: `studyTarget + learnerSourceLocale + seasonId + status + ordinal`;
- review queue: `status + entityType + submittedAt + queueItemId` и `status + submittedAt + queueItemId`;
- localization queue: `studyTarget + learnerSourceLocale + targetLocale + status + updatedAt + localizationUnitId`;
- preview receipts: `entityFingerprint + platform + createdAt desc`;
- stages: существующие request filters плюс `kind + state + scopeId` для V2.

Каждый list callable имеет server limit не больше 100 и filter-bound opaque cursor. Admin UI не делает unbounded scan. Rules default-deny обе projection collections; indexes и rebuild/consistency tests входят в один release gate.

## 19. `lesson-bundle.v2` release seam

### 19.1 Resolution

Перед записью bundle adapter:

1. загружает approved SeasonRevision по exact hash;
2. разрешает exact season `decisionRegistryRef`, recompute-ит registry hash и проверяет все используемые настройки `HYP-V2-001..008`;
3. загружает все pinned approved EpisodeRevision по exact revision/fingerprint/content hash;
4. загружает pinned ModeTemplateVersion для каждого instance;
5. проверяет точные template content hashes;
6. разрешает executable kernel и ровно пять exact `PolicyRef {kind,key,version,contentHash}`, recompute-ит каждый `PolicyDescriptorBody` и проверяет body/ref/record/object conformance;
7. проверяет iOS/Android support manifests выбранного `minAppVersion`;
8. преобразует ActivityInstance в `V2ActivityDefinition`;
9. canonicalizes JSON;
10. удаляет authoring comments, prompts, waivers reason и provider metadata;
11. добавляет безопасный provenance, включая decision registry ref;
12. пишет immutable lesson object.

### 19.2 Bundle provenance

```ts
export interface V2BundleAuthoringProvenance {
  decisionRegistryRef: VersionRef;
  seasonRevision: {
    seasonId: string;
    revision: number;
    contentHash: Sha256;
  };
  episodeRevision: {
    episodeId: string;
    revision: number;
    contentHash: Sha256;
  };
  activities: Array<{
    activityId: string;
    activityRevision: number;
    templateId: string;
    templateVersion: number;
    templateContentHash: Sha256;
  }>;
  validationReceiptHash: Sha256;
  reviewReceiptHash: Sha256;
  supportManifestHashes: Sha256[];
}
```

В `lesson/<lessonId>.json` остаются legacy `phrases/vocabulary/drills` и добавляется `v2Episode`. `CourseRelease.schemaVersion` остаётся совместимым с `course-release.v1`; canonical surfaces остаются `lesson/quiz/flashcard/arena`.

Season-aware delivery использует manifest и отдельно изменяемый pointer, не пятый CourseRelease surface:

```ts
export type V2ReleaseEnvironment = 'lab' | 'staging' | 'production';

export interface V2SeasonReleaseManifestBody {
  schemaVersion: 'v2-season-release-manifest-body.v1';
  releaseId: string;
  courseReleaseId: string;
  seasonId: string;
  seasonRevision: number;
  seasonContentHash: Sha256;
  studyTarget: StudyTarget;
  learnerSourceLocale: LearnerSourceLocale;
  releaseScope: SeasonReleaseScope;
  decisionRegistryRef: VersionRef;
  supportManifestRefs: [
    AppCapabilitySupportManifestRef,
    AppCapabilitySupportManifestRef,
  ];
  voiceNetworkEgressRefs: VoiceNetworkEgressRef[];
  lessonUnits: Array<{
    episodeId: string;
    lessonId: number;
    object: ImmutableObjectRef;
  }>;
}

export interface V2SeasonReleaseManifestRecord {
  schemaVersion: 'v2-season-release-manifest-record.v1';
  releaseId: string;
  seasonId: string;
  manifestHash: Sha256;
  object: ImmutableObjectRef;
  createdAt: IsoDateTime;
}

export interface V2SeasonReleasePointer {
  schemaVersion: 'v2-season-release-pointer.v1';
  pointerId: string; // environment + locale pair + seasonId
  environment: V2ReleaseEnvironment;
  studyTarget: StudyTarget;
  learnerSourceLocale: LearnerSourceLocale;
  seasonId: string;
  activeReleaseId: string;
  activeManifestHash: Sha256;
  previousReleaseId?: string;
  rollout: {
    revision: number;
    state: 'internal' | 'rolling_out' | 'live' | 'paused' | 'rolled_back';
    percent: 0 | 1 | 5 | 10 | 25 | 50 | 100;
    cohortSaltVersion: number;
    allowlistCohortIds: string[];
    excludeCohortIds: string[];
    healthReceiptHash?: Sha256;
    pauseReason?: string;
  };
  expectedCatalogRevision: number;
  updatedBy: string;
  updatedAt: IsoDateTime;
}
```

`manifestHash = contentHash(V2SeasonReleaseManifestBody)`. Body не содержит собственного hash/object/record; record и pointer хранят hash. `manifest.body.decisionRegistryRef` обязан byte-for-byte совпасть с approved SeasonRevision и bundle provenance. `supportManifestRefs` содержит ровно один iOS и один Android manifest exact `minAppVersion/environment`; network release дополнительно pin-ит deduplicated exact `voiceNetworkEgressRefs`, равные union фактически используемых template requirements и присутствующие в обоих support manifests. Каждый ref разрешается в deployed body той же server environment и безопасного lifecycle protocol; пустой список допустим только для release без network voice. Environment определяется server-side deployment/project configuration; request, URL и browser form не могут выбрать production. Pointer mutation транзакционно проверяет server environment, scope eligibility, `expectedCatalogRevision`, manifest record hash, rollout revision и health/approval gates; новый percent, observation window и milestone разрешаются только под `HYP-V2-008` exact manifest registry. Cohort assignment детерминирован по stable account ID + `cohortSaltVersion`; pause выставляет effective percent 0 без изменения immutable manifest/release. Rollback переводит pointer только на ранее активный release того же environment/locale pair/season и не откатывает progress.

### 19.3 Seal и activation

Seal блокируется, если:

- season revision не approved либо содержит stale episode ref;
- хотя бы один episode не approved;
- receipt/waiver/template content hash stale;
- device preview отсутствует для runtime-specific режима;
- voice/acoustic mode не имеет свежего exact `SpeechCalibrationReceiptRef` или exact Episode aggregate; network mode не имеет discriminated requirement с active-registry `VoiceDataPolicyRef`, exact deployed `VoiceNetworkEgressRef`, совпадающего в iOS/Android/season manifests, safe lifecycle/finality/deletion attestation, declared purposes, immutable localized consent-copy/deletion-route/minors refs, server-only adapter inventory и deterministic fallback;
- episode `learningDesign`/probe semantics invalid либо versioned evidence/support policy refs missing, stale или hash-mismatched;
- `decisionRegistryRef` отсутствует/hash-mismatched, не совпадает между SeasonRevision/manifest/bundle provenance, либо хотя бы одна используемая настройка `HYP-V2-001..008` (включая retry cap, cutoffs, gate/boost, delayed window и rollout) не разрешается под exact pinned registry;
- bundle не поддерживается обеими платформами;
- season QA не подтверждает exact `releaseScope`; production activation дополнительно требует `full_season` с 32 episodes, 4×8 и checkpoints 8/16/24/32;
- index/unit hashes или object generations расходятся.
- season manifest не совпадает с exact approved SeasonRevision либо pointer environment/scope/rollout revision не проходит server-side policy.

Activation использует существующий `expectedRevision` каталога. Rollback выбирает только release, который ранее был активен и состоит в `content_factory_catalog_releases`.

## 20. Многоязычный authoring

Identity всегда:

```text
studyTarget + learnerSourceLocale + seasonId + episodeId
```

Правила:

- `studyTarget` и `learnerSourceLocale` никогда не выводятся друг из друга;
- source text каждого learner-visible поля имеет `sourceHash`;
- изменение source делает только зависимые переводы `stale`;
- stale/missing перевод блокирует release для этой locale pair;
- fallback на другой learner source locale запрещён;
- target-language answer, source-language explanation и admin label хранятся раздельно;
- tokenizer, speech locale, normalization и sound contrast берутся из `V2LanguageProfile`;
- RTL, 200% text и минимум 30% text expansion проверяются Preview Lab;
- audio status, asset status и localization status видны отдельно;
- translator редактирует draft, reviewer другого UID одобряет;
- clone языка сохраняет semantic IDs, но создаёт новые locale-specific revisions и approvals;
- второй язык пилота начинается с одного episode vertical slice, а не bulk season.

Localization queue показывает: entity, field, source, перевод, source hash, статус, reviewer и preview. Технические JSON keys не переводятся.

## 21. Audit, diff и rollback

Каждое действие записывает:

- actor UID и role;
- permission;
- environment;
- request/idempotency ID;
- entity collection/id;
- before/after revision и fingerprint;
- reason;
- semantic diff summary;
- linked validation/review/preview receipts;
- rollback reference, если применимо;
- timestamp.

Обязательные audit actions:

```text
content_studio.mode_template.create
content_studio.mode_template.clone
content_studio.mode_template.submit
content_studio.mode_template.approve
content_studio.mode_template.changes_requested
content_studio.mode_template.publish
content_studio.mode_template.deprecate
content_studio.season.create
content_studio.season.edit
content_studio.season.submit
content_studio.season.approve
content_studio.episode.create
content_studio.episode.edit
content_studio.episode.submit
content_studio.episode.approve
content_studio.waiver.create
content_studio.preview.create
content_studio.preview.complete
content_factory.course_release.seal
content_factory.course_release.activate
content_factory.course_release.rollback
```

Rollback authoring означает clone старой immutable revision в новую draft revision. Опубликованный object не перезаписывается. Runtime rollback остаётся существующим переключением active CourseRelease. UI Rollback Center показывает влияние, target release и факт, что пользовательский progress не откатывается.

## 22. Состояния ошибок

| Ситуация | Поведение server | Поведение UI |
|---|---|---|
| Capability catalog не загрузился | read callable error | сохранить форму локально нельзя считать save; показать retry и last-known catalog только read-only |
| Kernel/policy исчез из новой версии catalog | validation blocker | показать deprecated/missing ref и кнопку clone на поддерживаемый template |
| Stale authoring revision | `aborted` + conflict payload | загрузить свежую версию или скопировать свои изменения |
| Generation provider failed | stage `failed` + retryable flag | повторить только stage; approved dependencies не трогать |
| Preview token истёк | `permission-denied/expired` | создать новую session; не переиспользовать ссылку |
| Preview grant открыт не той platform/build | fail-closed `preview_grant_target_mismatch` | открыть соответствующую iOS/Android ссылку из той же session |
| Device build не поддерживает template | fail-closed | показать требуемый min build и support manifest diff |
| Localization stale | release blocker | открыть конкретные поля в localization queue |
| Asset rights/hash отсутствует | validation blocker | заменить asset или заполнить verified rights record |
| Автор пытается одобрить своё | permission/precondition error | объяснить maker-checker и назначить другого reviewer |
| Entity изменён после review | stale receipt | вернуть в draft/needs review, показать diff |
| Season pin-ит stale/unapproved episode | validation blocker | открыть exact ref, заменить на approved revision и пересчитать season fingerprint |
| Gate table не совпадает с gate policy | non-waivable blocker | повторно материализовать таблицу из выбранной policy; ручной override не предлагать |
| Partial release scope направлен в production | precondition error | выбрать lab/internal environment либо собрать approved `full_season` |
| Catalog revision изменился перед activation | failed-precondition | обновить release page и повторно подтвердить |
| Storage hash/generation mismatch | data-loss, объект не активируется | сохранить last-known-good и показать диагностику |
| Deprecated template уже в active release | runtime продолжает работать | warning; новые instances выбрать его не могут |
| Offline admin | mutations недоступны | сохранить только несохранённый form state в памяти/session draft; не показывать «Сохранено» |
| Direct Firestore write | rules deny | понятная permission error; не предлагать обход |
| Review/localization projection drift | consistency receipt failed | заблокировать publish, показать source/projection counts и audited rebuild action |

Ни одна ошибка не должна молча выбирать другой renderer, policy, locale или release.

## 23. Test matrix

### 23.1 Contract/unit

- `functions/src/learning_v2/authoring_contracts.test.ts` — IDs, unions, immutable refs, unknown fields;
- `functions/src/content_studio/canonical_json.test.ts` + client mirror — golden bytes/hash vectors, 64-hex fixtures и body/record self-reference prohibition;
- `functions/src/learning_v2/capability_catalog.test.ts` — registry exhaustiveness, five-policy completeness и exact kind/key/version/contentHash compatibility;
- `functions/src/learning_v2/mode_template.test.ts` — lifecycle, clone, new version, deprecate;
- `functions/src/learning_v2/activity_instance.test.ts` — template pin, payload, overrides, content identity и assets;
- `functions/src/learning_v2/episode_authoring.test.ts` — scenario, frames, semantic slots, DAG, graph-node reward union, fallback star slot, loops и capstone;
- `functions/src/learning_v2/season_authoring.test.ts` — все release scopes, exact episode refs, full 4×8, gate policy, checkpoints и stale refs;
- `functions/src/learning_v2/validation_waiver.test.ts` — non-waivable rules, expiry и stale fingerprint;
- `functions/src/content_factory/v2_stage_capabilities.test.ts` — dependency rules и stage DAG;
- `functions/src/content_factory/v2_release_adapter.test.ts` — deterministic superset и provenance filtering.

### 23.2 Backend/emulator

- permission matrix для read/draft/review/publish;
- Phase 00 emulator: authenticated admin deny direct read/write для каждого нового namespace плюс legacy inventory compatibility;
- maker-checker;
- idempotent replay и key reuse conflict;
- two-editor race;
- stale review/preview/waiver;
- immutable Storage precondition и orphan registration;
- stage lease/retry/pause/cancel;
- season scope eligibility: E1 lab, chapter internal, full season production;
- seal/activate/rollback catalog race;
- Firestore/Storage direct write denial;
- review/localization projection transaction, cursor/filter binding, rebuild consistency/drift и locale isolation;
- season-aware manifest/pointer, server-authoritative environment, pause/cohort/rollback races.

Целевые файлы:

- `functions/src/admin_v2_mode_templates.test.ts`;
- `functions/src/admin_v2_seasons.test.ts`;
- `functions/src/admin_v2_episodes.test.ts`;
- `functions/src/admin_v2_preview.test.ts`;
- `functions/src/content_factory/emulator/v2_authoring_races.emulator.test.ts`;
- `functions/src/content_factory/emulator/v2_release_flow.emulator.test.ts`.
- `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts`.
- `functions/src/content_studio/projection_consistency.test.ts`.

### 23.3 Admin UI

- route/action audit для всех восьми content subpages;
- один primary CTA;
- tooltip/aria-label/label coverage;
- keyboard-only ModeTemplate, Episode и Season wizards;
- graph ordered-list alternative;
- focus management модалов;
- loading/empty/error/dirty/success;
- 375/768/1024/1440;
- no whole-page horizontal scroll;
- contrast и lime foreground;
- human labels для всех 13 V2 stage kinds; raw kind только вторым уровнем;
- explicit contract с каждым пунктом Admin UI Bible Definition of Done;
- long Russian/German strings;
- stale conflict recovery без потери введённого текста.

Целевые файлы:

- `tests/admin_v2_content_studio_routes.test.ts`;
- `tests/admin_v2_mode_template_ui_contract.test.ts`;
- `tests/admin_v2_episode_builder_ui_contract.test.ts`;
- `tests/admin_v2_season_builder_ui_contract.test.ts`;
- `tests/admin_v2_preview_lab_contract.test.ts`;
- `tests/admin_v2_content_accessibility.test.ts`.
- `tests/admin_v2_content_stage_human_labels.test.ts`.
- `tests/admin_v2_content_studio_bible_contract.test.ts`.

### 23.4 React Native runtime preview

- deep link разрешён только internal/development build;
- два one-use grants одного fingerprint; expired/reused/wrong-actor/wrong-platform/wrong-build token;
- cold-start и warm-app exact `/learning-v2-preview` route на iOS/Android;
- exact entity fingerprint;
- unknown renderer/policy fail-closed;
- prompt/active/processing/success/needs_work/recovery как state axis; offline/permission/signal/scorer/theme/text scale как conditions axis;
- microphone permission, network loss, audio route interruption;
- VoiceOver/TalkBack, 200% text, Reduce Motion;
- episode session остаётся pinned к release;
- preview не пишет обычный progress, stars, shards или analytics learning outcome.

Целевые файлы:

- `tests/learning_v2_preview_route.test.ts`;
- `tests/learning_v2_preview_envelope.test.ts`;
- `tests/learning_v2_preview_no_progress.test.ts`.

### 23.5 End-to-end

Обязательный staging E2E:

```text
publish code-owned capability
→ create ModeTemplate draft
→ validate
→ independent approve
→ publish ModeTemplate
→ create `vertical_slice` SeasonDraft with pinned gatePolicyVersion + exact decisionRegistryRef
→ create ActivityInstance
→ create EpisodeRevision
→ web preview
→ device preview iOS + Android
→ validate/review EpisodeRevision
→ attach approved EpisodeRevision to a new SeasonRevision
→ validate/review SeasonRevision and gate table
→ complete episode-bundle and season-QA stages
→ lesson-bundle.v2
→ seal CourseRelease
→ activate lab/staging canary
→ load in app
→ complete activity
→ rollback
→ app remains on pinned session / next session uses rollback release
```

## 24. Acceptance criteria

Content Studio считается готовым для pilot production, только если:

1. Администратор с `content.draft.write` создаёт ModeTemplate без изменения app code.
2. Невозможно выбрать kernel/policy, отсутствующий в capability catalog/support manifest; ModeTemplate содержит ровно пять exact `PolicyRef`, а same key/version с другим hash fail-closed.
3. Published ModeTemplate immutable; новая версия не меняет существующие instances.
4. Clone создаёт новый ID и сбрасывает approvals.
5. Deprecated template продолжает открываться в старом release, но не выбирается для нового instance.
6. ActivityInstance form строится из server catalog и не принимает unknown field.
7. Briefing без stars моделируется без `starSlotId`.
8. Episode Builder создаёт валидный DAG с двумя access-required loops, отдельными ordinary-episode non-gating independent probe nodes, явным independent-only checkpoint-pass исключением на границах глав, восемью slots и deterministic capstone fallback.
9. Season workspace валидирует exact scope; production `full_season` pin-ит 32 approved EpisodeRevision, exact `decisionRegistryRef`, собирает 4×8, checkpoints 8/16/24/32 и gate table, точно совпадающую с выбранным `gatePolicyVersion` и `HYP-V2-005` pinned registry.
10. Два редактора не могут молча перезаписать друг друга.
11. Автор не может одобрить собственную production revision.
12. `content.review` и `content.publish` реально разделены.
13. Web preview явно не заявляет React Native parity.
14. Device preview загружает exact fingerprint через два независимых one-use platform/build grants и создаёт receipt для iOS и Android; cold/warm route совпадает с filename/native-intent.
15. Изменение entity инвалидирует validation, preview, waiver и review receipts.
16. Non-waivable blocker невозможно обойти owner/admin правом.
17. Learner-visible stale localization блокирует seal.
18. Один episode проходит полный путь authoring → release → real loader.
19. `lesson-bundle.v2` сохраняет legacy fields и четыре canonical surfaces.
20. Hash/generation mismatch не заменяет last-known-good.
21. Activation/rollback используют catalog revision и audit.
22. Runtime preview не начисляет stars/shards и не меняет progress.
23. Все новые admin screens проходят Definition of Done из Admin UI Bible.
24. 32-episode bulk unlock включается только после успешного Episode 1 vertical slice и Chapter 1 internal cohort.
25. Canonical object хеширует только `*ArtifactBody`; records, heads, lifecycle и append-only receipts разделены, client/Functions проходят один golden-vector corpus.
26. Authenticated admin не может напрямую читать/писать новые authoring/projection paths; emulator доказывает это после замены catch-all и одновременно сохраняет инвентаризированные legacy paths.
27. Review/localization queues — server-owned projections с deterministic IDs, bounded cursor, transactional updates, rebuild и consistency receipt.
28. V2 stage dependency union pin-ит exact stage/template/language-profile hashes; season-plan и episode-subgraph cardinalities проверяются отдельно.
29. Release manifest/pointer содержит `seasonId`, exact `decisionRegistryRef`, server-authoritative environment, rollout revision/cohort/pause; rollout settings разрешаются под `HYP-V2-008`, а `course-release.v1` сохраняет ровно четыре surfaces.
30. Voice/acoustic release блокируется без свежего exact `SpeechCalibrationReceiptRef` и совпадающего Episode aggregate; network voice — без discriminated requirement с active-registry `VoiceDataPolicyRef`, exact purposes, exact deployed `VoiceNetworkEgressRef` в обоих app support и season release manifests, immutable localized `VoiceConsentCopyRef`, specialized deletion-route/minors refs, reservation→consume→terminal settlement→settlement-bound deletion, provider-proof/legal-hold capability и deterministic fallback. Account-specific classification/guardian/consent/eligibility/dispatch lifecycle никогда не author-ятся: provider-agnostic server egress проверяет их и создаёт single-use records перед каждой отправкой; adapter inventory запрещает direct provider call. Learning release блокируется без actual per-episode `learningDesign`, phase-correlated evidence/context contracts, valid probe/window/checkpoint-set semantics и свежих versioned evidence/support policy refs.
31. Hashable bodies содержат только `LocalizedContentValue`; localization status/editor/reviewer/timestamps находятся в server-owned projection/receipt, а seal сверяет exact approved value без копирования workflow metadata.
32. Immutable ModeTemplate/Activity/Episode/Season records не содержат receipt IDs/arrays; append-only receipt sets разрешаются по exact subject fingerprint и pin-ятся отдельным gate receipt. ActivityInstance lifecycle принадлежит owning Episode, не отдельному mutable status.
33. Seal recompute-ит exact decision registry hash, подтверждает один и тот же ref в SeasonRevision/manifest/bundle provenance и fail-closed разрешает все числовые настройки `HYP-V2-001..008`; `delayedWindowPolicyId` не является свободной строкой.

## 25. Точные точки интеграции с текущим репозиторием

| Текущий файл | Что уже есть | Нормативное изменение |
|---|---|---|
| `docs/design/ADMIN_UI_BIBLE.md` | правила IA, форм, ролей, audit, responsive | источник истины; не дублировать и не ослаблять |
| `admin/v2/scripts/admin-core.js` | семь разделов, `PAGES`, role permissions, route/action handling | сохранить верхние семь разделов; добавить content subroutes и вынести их из монолита в модули |
| `admin/v2/scripts/pages/content-generator.js` | существующая Generation Queue, фиксированные generators, stage queue и browser permission guards | сохранить queue UI/controls/receipts; перевести stage review action с publish на `content.review`, показывать human labels и не использовать этот модуль как универсальный редактор эпизода |
| `admin/v2/scripts/pages/content-generation.js` | новый Content Studio route/IA wrapper для `#content-generation` | только делегировать существующей `content-generator.js`; не дублировать queue state, actions или permission logic |
| `admin/v2/scripts/content-factory/stage-renderers.js` | capability-driven stage form и artifact preview | переиспользовать receipt/diff patterns; ModeTemplate/episode forms вынести отдельно |
| `admin/v2/scripts/content-factory/state.js` | единый state генератора | не раздувать; создать отдельные state modules для modes, episodes, review, localization и preview |
| `admin/v2/scripts/content-factory/controller.js` | strict form parsing для stages | сохранить pattern, но authoring inputs валидировать отдельными controllers |
| `admin/v2/scripts/admin-firebase.js` | существующие content/release callables | зарегистрировать новые callables из раздела 18.3 |
| `admin/v2/styles/admin.css` | общие компоненты и responsive admin styles | использовать общие tokens/components; добавить только scoped Content Studio layout |
| `functions/src/admin/roles.ts` | роли без reviewer | добавить `content_reviewer` |
| `functions/src/admin/permissions.ts` | read/draft/publish | добавить `content.review` и матрицу ролей |
| `functions/src/content_factory/stage_contracts.ts` | 17 stage kinds и immutable unit identity | расширить V2 kinds, не переименовывать старые |
| `functions/src/content_factory/stage_capabilities.ts` | code-owned capability map, простой prerequisite contract | сохранить каталог существующих stages; добавить V2 dependency rules |
| `functions/src/content_factory/stage_service.ts` | planning и approved prerequisites | поддержать discriminator stage/template/language-profile, immutable refs/hash/freshness и split season/episode cardinality |
| `functions/src/content_factory/dependency_graph.ts` | stage dependency validation | добавить V2 DAG и cycle/reachability checks |
| `functions/src/admin_content_stages.ts` | create/list/preview/review callables; review сейчас требует publish | V2 stages + перевести review на `content.review` |
| `functions/src/admin_content_stage_edits.ts` | immutable correction revision и expected fingerprint | переиспользовать concurrency/diff model |
| `functions/src/admin_content_stage_bulk.ts` | атомарный план до 100 stages | разрешить bulk только после pilot unlock gate |
| `functions/src/content_stage_worker.ts` | lease, retry, immutable artifact path | добавить workers V2 stages без изменения старых providers |
| `functions/src/content_factory/artifact_storage.ts` | `writeImmutableObject` | переиспользовать для ModeTemplate/Episode/Preview artifacts |
| `functions/src/content_factory/semantic_diff.ts` | semantic diff | расширить paths для template/graph/localization |
| `functions/src/content_factory/review_fingerprint.ts` | stage review fingerprint | добавить entity-specific fingerprints |
| `functions/src/admin_content_release.ts` | generation review и CourseRelease seal | review permission разделить; seal расширить V2 receipts |
| `functions/src/language_release.ts` | activation, rollback, catalog revision, membership | использовать без нового параллельного механизма |
| `functions/src/content_factory/course_release_contract.ts` | четыре canonical surfaces | не добавлять пятый surface |
| `functions/src/content_factory/release_sealing.ts` | deterministic CourseRelease build | добавить V2 lesson superset validation |
| `functions/src/content_factory/release_surface_delivery.ts` | strict index/unit hash delivery | сохранить exact path/hash/generation checks |
| `functions/src/index.ts` | exports существующих content callables | экспортировать новые authoring/preview callables |
| `firestore.rules` | global admin catch-all и client access rules | Phase 00 inventory; заменить catch-all explicit legacy allows/path-excluding predicate до создания namespaces; emulator admin-denial новых paths |
| `storage.rules` | delivery access | запретить authoring writes/reads клиенту; release delivery оставить отдельным |
| `firestore.indexes.json` | server query indexes | добавить bounded list indexes из раздела 18.4 |
| `app.json` | scheme `phraseman` | scheme не менять |
| `app/+native-intent.tsx` | нормализация deep links | exact `/learning-v2-preview`, cold/warm internal-only policy; route `app/learning-v2-preview.tsx` |
| `modules/learning-v2/*` | запланированный V2 runtime | добавить capability registry export, preview resolver и no-progress preview session |

Новые admin modules должны иметь одну ответственность:

```text
admin/v2/scripts/content-studio/
  capability-client.js
  mode-template-state.js
  mode-template-controller.js
  season-state.js
  season-controller.js
  episode-state.js
  episode-controller.js
  review-state.js
  localization-state.js
  preview-state.js

admin/v2/scripts/pages/
  content-overview.js
  content-modes.js
  content-episodes.js
  content-generation.js
  content-review.js
  content-localization.js
  content-preview.js
  content-releases.js

functions/src/content_studio/
  contracts.ts
  canonical_json.ts
  capability_catalog.ts
  mode_template_repository.ts
  season_draft_repository.ts
  episode_draft_repository.ts
  validation.ts
  preview.ts
  localization_repository.ts
  review_queue_repository.ts
  projection_rebuild.ts
```

Это целевая декомпозиция. Нельзя добавлять все новые workflows непосредственно в уже крупный `admin-core.js`.

## 26. Порядок реализации

1. Phase 00: инвентаризировать legacy direct access, заменить global admin catch-all и доказать emulator admin-denial новых namespaces до их создания.
2. Зафиксировать один schema/enum corpus, `*ArtifactBody`/record/head/lifecycle/receipt split, canonical serializer, hash formulas и client/server golden vectors.
3. Зафиксировать capability catalog, learning/voice governance refs и exact app manifests.
4. Добавить `content.review`, reviewer role и end-to-end stage/Admin permission tests.
5. Реализовать ModeTemplate storage/lifecycle/callables.
6. Реализовать server-owned review/localization projections, cursor, rebuild и consistency checks.
7. Собрать competitor reference-evidence pack и оригинальные Phraseman wireframes до UI implementation.
8. Реализовать Mode Library и wizard.
9. Реализовать ActivityInstance schema-driven editor.
10. Реализовать EpisodeRevision и accessible graph editor.
11. Реализовать SeasonRevision workspace, gate-policy preview и exact episode pinning.
12. Расширить V2 stage kinds/dependency union и отдельные season/episode cardinalities.
13. Реализовать validation receipts и revision-bound waivers.
14. Реализовать web preview с честной маркировкой.
15. Реализовать два platform/build grants, exact deep-link/native-intent route и no-progress runtime.
16. Реализовать localization workflow поверх server-owned projection.
17. Реализовать season-aware manifest/pointer, `lesson-bundle.v2` adapter и V2 seal gates, не меняя четыре surfaces v1.
18. Пройти Episode 1 end-to-end на staging с fake Admin lifecycle отдельно от real-device receipts.
19. Пройти iOS/Android, offline, denied mic, account switch и rollback drills.
20. Собрать Chapter 1 и выпустить internal cohort.
21. Только после Chapter 1 gate открыть bulk production остальных 24 эпизодов.

## 27. Главный пользовательский тест

Новый сотрудник без знания Firebase должен суметь сказать:

> «Вот поддерживаемые режимы. Вот версия шаблона, которую использует упражнение. Вот что увидит ученик. Вот почему материал нельзя опубликовать. Вот кто его проверил. Вот релиз, в который он попадёт. Вот как его откатить».

Если для ответа нужно открыть JSON, вспомнить renderer key или попросить разработчика объяснить скрытую кнопку, Content Studio не соответствует этой спецификации.
