# Avatar DNA Studio: модульный генератор персонажей Phraseman

Дата: 2026-08-20

Статус: дизайн утверждён владельцем по разделам; письменная спецификация ожидает финального просмотра

## 1. Краткое решение

Phraseman получает новую систему `Avatar DNA v1`: пользователь собирает статичного
стилизованного 3D-персонажа из совместимых частей, а приложение показывает один и
тот же образ крупно в Студии и портретно в профиле, друзьях, лигах, Арене,
турнирах и подарочных поверхностях.

Система не генерирует готовую картинку для каждой комбинации. Она использует
канонический 2.5D-риг, семантические слоты, нормализованные якоря, front/back-слои,
occlusion-маски и детерминированные правила конфликтов. Сложный капюшон, шлем или
маска является составным asset bundle, а не одиночным PNG поверх лица.

Первая версия безопасна и ограничена одним ригом `human_v1`, но схема содержит
`rigId`, `schemaVersion`, `assetVersion` и fit-варианты, чтобы позже добавлять новые
формы головы и тела без миграции старых Avatar DNA и без генерации каждой полной
комбинации.

## 2. Утверждённые решения владельца

- Внешность соответствует тёплому премиальному стилизованному 3D из предоставленного
  владельцем домашнего mockup: выразительные, но правдоподобные глаза; мягко
  преувеличенные лица; скульптурные волосы; кремово-терракотовая палитра; мягкий
  студийный свет; тактильные материалы. Не фотореализм, не аниме, не плоский вектор.
- Первая версия следует безопасному поэтапному варианту: полноценная базовая
  личность доступна бесплатно; редкость расширяет образ, а не отнимает базовую
  возможность выглядеть собой.
- Один Avatar DNA имеет две камеры: `studio` по пояс и `portrait` для малых
  аватаров. Это не две разные личности и не два отдельных выбора.
- Первый персонаж создаётся в мягком пошаговом режиме после первого достижения;
  первый урок не блокируется. Последующие входы открывают быстрый свободный редактор.
- Базовые лица, оттенки кожи, глаза, волосы и одежда бесплатны. Спины открывают
  редкие причёски, наряды, аксессуары, фоны, макияж, линзы, глазные эффекты,
  маски, шлемы, капюшоны и другие косметические детали.
- Косметические дубликаты из спина запрещены.
- Сам персонаж полностью статичен. Анимируется только интерфейс: нажатие плитки,
  смена вкладки, crossfade выбранного слоя, CTA, undo/redo и раскрытие награды.
- Новая система добавляется рядом с уровнями, текущими custom-бейджами, аурами,
  рамками и storage keys. Ничего из существующего не удаляется.

## 3. Цели и не-цели

### Цели

1. Дать пользователю выразительный уникальный персонаж без комбинаторного взрыва
   готовых картинок.
2. Гарантировать корректную геометрию глаз, носов, волос, одежды, масок,
   головных уборов и составных капюшонов.
3. Связать Студию, спины, подарки и социальные поверхности единой системой
   владения и отображения.
4. Сохранить локально-первое применение образа, офлайн-работу и отсутствие
   пользовательской потери при сетевом сбое.
5. На дешёвых Android показывать в списках один готовый WebP, а не десятки
   runtime-слоёв на каждого участника.

### Не-цели v1

- Произвольная загрузка пользователем фотографии или собственного изображения.
- Runtime-вызов DALL·E или другой генеративной модели из приложения.
- Анимация лица, моргание, дыхание, lip-sync, 3D-поворот головы или тела.
- Несколько несовместимых форм скелета/черепа в одном релизе.
- Маркетплейс между пользователями или передача косметики другому человеку.
- Удаление или автоматическое преобразование legacy-аватаров.

## 4. Исследовательские основания

Наблюдения ниже являются паттернами существующих систем, а не разрешением
копировать их брендинг или графику.

| Источник | Уровень | Наблюдение |
|---|---|---|
| [Roblox Layered Clothing](https://create.roblox.com/docs/resources/beyond-the-dark/layered-clothing) и [WrapLayer](https://create.roblox.com/docs/reference/engine/classes/WrapLayer/Enabled) | B — официальный текущий | Совместимость достигается стандартными reference meshes/cages, точками привязки, порядком слоёв и удалением скрытой геометрии. |
| [Spine Skins](https://en.esotericsoftware.com/spine-skins), [Attachments](https://us.esotericsoftware.com/spine-attachments) и [Clipping](https://en.esotericsoftware.com/spine-clipping) | B — официальный текущий | Персонаж собирается из slots/attachments; skins меняют детали, а clipping-полигоны ограничивают видимые области. |
| [DiceBear](https://www.dicebear.com/introduction/) | B — официальный текущий | Детерминированный avatar descriptor хранит параметры, а не только готовый bitmap; категории могут независимо менять волосы, очки, цвета и черты. |
| [Apple Memoji](https://support.apple.com/guide/iphone/create-and-send-memoji-iphd730f04a7/ios) | B — официальный текущий | Пользовательская модель «крупный персонаж сверху, категории и варианты снизу» понятна для последовательного выбора внешности. |

Вывод для Phraseman: DALL·E может создавать исходный арт, но совместимость обязана
обеспечиваться собственным детерминированным ригом, manifest-контрактом и QA.

## 5. Канонический риг и координаты

### 5.1 Риг v1

- `rigId`: `human_v1`.
- Authoring master: квадрат 2048×2048 px, вне mobile bundle.
- Runtime layer: прозрачный WebP 512×512 px на общем холсте.
- Все anchors и safe polygons хранятся в нормализованных координатах `[0, 1]`,
  поэтому разрешение можно менять без изменения геометрического контракта.
- Public composite:
  - `portrait`: 256×256 WebP;
  - `studio`: 512×512 WebP;
  - catalog thumbnail: 192×192 WebP.
- `portraitCrop` и `studioCrop` входят в rig manifest, а не задаются отдельно
  каждым экраном.

### 5.2 Обязательные anchors

- `headTop`;
- `templeLeft`, `templeRight`;
- `eyeLineLeft`, `eyeLineRight`;
- `noseBridge`, `noseTip`;
- `mouthCenter`;
- `chin`;
- `earLeft`, `earRight`;
- `neckCenter`;
- `shoulderLeft`, `shoulderRight`;
- `torsoCenter`.

Базовые лица могут менять контур, мягкие пропорции и детали только внутри
разрешённых safe polygons. Головные уборы и маски ориентируются на anchors,
а не на конкретный нос, причёску или оттенок кожи.

### 5.3 Будущие риги

Новая существенно отличающаяся форма головы получает новый `rigId`. Предмет,
зависящий от формы, добавляет один `fitVariant` на новый rig. Он не получает
вариант на каждую комбинацию глаз, носа, волос, одежды и фона. Старый DNA остаётся
привязан к `human_v1` и продолжает собираться прежними immutable assetVersion.

## 6. Avatar DNA

Утверждённая логическая форма:

```ts
type AvatarDNA = Readonly<{
  schemaVersion: 1;
  rigId: 'human_v1';
  base: {
    starterPresetId: string | null;
    skinToneId: string;
    faceBaseId: string;
    bodyBaseId: string;
  };
  face: {
    eyesId: string;
    irisColorId: string;
    browsId: string;
    noseId: string;
    mouthId: string;
    skinDetailIds: readonly string[];
    makeupIds: readonly string[];
    facialHairId: string | null;
  };
  hair: {
    styleId: string;
    colorId: string;
  };
  wearables: {
    outfitId: string;
    headwearId: string | null;
    maskId: string | null;
    eyewearId: string | null;
    earAccessoryId: string | null;
    neckAccessoryId: string | null;
  };
  scene: {
    backgroundId: string;
    auraId: string | null;
    frameId: string | null;
    foregroundFxId: string | null;
  };
}>;
```

`starterPresetId` — удобная отправная точка «мужской», «женский» или будущий
готовый архетип. Он не является ограничением и не запрещает смешивать любые
доступные черты и одежду. После создания источником истины становятся остальные
поля DNA.

DNA не содержит animation state. Любое движение персонажа запрещено контрактом.

## 7. Категории интерфейса

Пользователь видит пять основных разделов:

1. `Основа`: стартовый тип, тон кожи, форма лица, телосложение.
2. `Лицо`: глаза, цвет/эффект радужки, брови, нос, рот, веснушки/кожа,
   макияж, растительность на лице.
3. `Волосы`: причёска и цвет.
4. `Образ`: одежда, головные уборы, капюшоны, маски, очки, аксессуары ушей и шеи.
5. `Сцена`: фон, аура, рамка и передний декоративный эффект.

Первое создание объединяет их в четыре спокойных этапа:

1. Основа.
2. Лицо и волосы.
3. Одежда и аксессуары.
4. Фон и завершение.

После первого сохранения Студия открывается как свободный редактор на последней
использованной категории.

## 8. Draw order и составные предметы

Базовый порядок от заднего плана к переднему:

| Диапазон z | Содержимое |
|---|---|
| 0–9 | background, distant scene FX |
| 10–29 | cape/back accessory, outfit.back, hood.back, headwear.back |
| 30–39 | hair.back |
| 40–59 | body base, outfit base, neck |
| 60–79 | ears, face base |
| 80–99 | skin details, makeup, eyes, iris, brows, nose, mouth |
| 100–109 | facial hair |
| 110–119 | hair.side, hair.front |
| 120–129 | eyewear and ear accessories |
| 130–139 | face masks |
| 140–159 | headwear.front, hood.front, helmet.front |
| 160–169 | scarf/front neck accessory, outfit foreground |
| 170–179 | aura/frame/foreground FX |

Один item manifest может содержать несколько layer records. Пример капюшона:

```yaml
id: headwear.assassin_hood.01
assetVersion: 1
rigIds: [human_v1]
layers:
  - id: hood.back
    z: 20
  - id: face.shadow
    z: 95
    clip: face.safe
  - id: hood.front
    z: 150
occludes: [hair.top, ears]
restoresOnRemove: true
qaProfile: avatar-rig-v1
```

### 8.1 Разрешение конфликтов

- Пользовательский `chosenDNA` никогда не теряет скрытую причёску или аксессуар.
- Resolver строит `effectiveDNA` и `visibilityPlan`.
- Новый явно выбранный предмет выигрывает preview, а заявленные конфликтующие
  слоты временно подавляются.
- UI сразу объясняет результат: «Капюшон скрывает верх причёски. Она вернётся
  после снятия» и предоставляет undo.
- Снятие предмета восстанавливает предыдущие выборы без дополнительных записей.
- Циклические occlusion/conflict-зависимости являются manifest error и блокируют
  публикацию asset bundle.

## 9. Интерфейс Студии

### 9.1 Полноэкранная структура

- Верхняя панель: закрыть, `Студия`, undo и redo.
- Постоянная статичная сцена персонажа занимает верхнюю часть экрана.
- Переключатель `По пояс / Портрет` показывает оба production-кадра.
- Нижняя панель содержит пять основных вкладок, горизонтальные подкатегории и
  один виртуализированный каталог-сетку.
- Снизу находится единый CTA, оценивающий весь draft.
- На малом экране панель каталога может расширяться, а сцена уменьшается до
  портретного crop, но не исчезает полностью.

### 9.2 Состояния плитки

- free/owned;
- selected — галочка, подпись и `accessibilityState`, а не только цвет;
- locked by achievement/level/Plus/reward/spin;
- purchasable;
- new;
- unavailable for current rig;
- asset retry.

Закрытый предмет можно примерить. Если он spin-only, CTA показывает источник
получения и не обещает сохранить. Если он покупаемый, CTA показывает exact item
и стоимость. Два закрытых предмета не покупаются одной неявной суммой: блокеры
разрешаются по одному, а draft сохраняется.

### 9.3 Применение

1. Выбор меняет только локальный draft.
2. `Save` повторно валидирует rig, manifest, entitlement и effectiveDNA.
3. Локальный DNA и два last-good render записываются одним account-scoped commit.
4. Свой `AppSnapshot` обновляется сразу.
5. Синхронизация запускается в фоне.

Выход с dirty draft предлагает сохранить, продолжить редактирование или выйти
без изменения профиля. Undo/redo изменяют draft и никогда не тратят ресурсы.

## 10. Motion contract

Персонаж, волосы, одежда, фон и аура в Студии статичны. Запрещены idle loops,
дыхание, моргание, bobbing, вращение ауры и параллакс персонажа.

Разрешены только UI-переходы из `constants/motionHybrid.ts`:

- `PRESS` для нажатия плитки и CTA;
- `LUM` для смены вкладки, появления каталога и crossfade одного слоя;
- `CHK` только для одноразового раскрытия редкой награды;
- transform/opacity на UI thread;
- reduced-motion вариант без декоративного движения.

Запрещены локальные magic timing/spring значения. Haptic и цвет никогда не
являются единственными носителями состояния.

## 11. Asset Factory

### 11.1 Общий принцип

DALL·E создаёт художественный исходник, но не production bundle. Приложение
никогда не вызывает генеративную модель. Codex не использует проектный или
пользовательский OpenAI API key для изображений: допустим только встроенный
`image_gen`. Крупные серии создаются файловым checkpoint-пайплайном, а не
in-thread batch, в соответствии с Codex Bulk Image Safety.

### 11.2 Этапы одного предмета

1. До генерации создаётся Item Spec: id, slot, rigIds, anchors, layer plan,
   occlusion/conflicts, rarity, entitlement и QA profile.
2. Генерация использует Style Lock и `human_v1` rig-guide как reference.
3. Исходник сохраняется вне mobile bundle в ignored source/checkpoint directory.
4. Bundle Builder сегментирует front/back/shadow/mask-части, нормализует общий
   холст и alpha, создаёт 512px transparent WebP layers и 192px thumbnail.
5. Автоматические gates проверяют manifest и геометрию.
6. Contact sheet показывает предмет на sentinel-матрице.
7. Человек утверждает стиль, анатомию и отсутствие артефактов.
8. Финальные immutable files публикуются под
   `admin/v2/avatars/avatar-dna/v1/<itemId>/<assetVersion>/`; каталог публикуется
   в том же hosting target. Frozen admin HTML не изменяется.

### 11.3 Автоматические gates

- точные размеры и формат;
- прозрачный фон и отсутствие edge halos;
- alpha bounds внутри разрешённого polygon;
- anchor alignment;
- валидный z-order без циклов;
- заявленное occlusion действительно скрывает нужные области;
- известные rigIds и slots;
- уникальные stable item id и assetVersion;
- файлы и manifest совпадают;
- читаемость `portrait` на 64px display size;
- предельный compressed/decode weight;
- snapshot/pixel render на sentinel-лицах, всех skin tones и pairwise-конфликтах.

Любой FAIL блокирует публикацию. Gate нельзя ослабить ради зелёного CI —
исправляется asset bundle.

## 12. Владение, спины и экономика

### 12.1 Бесплатная основа

Каждый пользователь может собрать полноценного персонажа из бесплатных base
items. Spin/reward/store косметика добавляет редкость и самовыражение, но не
закрывает базовые оттенки кожи, лица, глаза, волосы и одежду.

### 12.2 Спин

Перед расходованием кредита локальный клиент:

1. создаёт или восстанавливает stable `requestId`;
2. строит active reward pool по immutable catalog version;
3. исключает owned item ids и совпадение base/Plus lane;
4. детерминированно выбирает exact item id;
5. сохраняет durable prepared intent с payload fingerprint;
6. одной composite operation фиксирует `{credit consumed + exact entitlement +
   receipt + pending sync}`;
7. показывает уже принадлежащий предмет;
8. синхронизирует immutable operation в фоне.

Повтор одинакового operationId возвращает тот же receipt. Другой payload с тем же
id является corruption и fails closed. Если косметический пул исчерпан, спин
переходит на существующую не-косметическую награду, а не выдаёт duplicate.

### 12.3 Покупка и применение

- Покупаемая косметика использует существующий client-authoritative shard
  operation journal.
- Debit и exact entitlement являются одной durable composite operation.
- Standalone debit, server balance rejection и «потратить, потом выдать» запрещены.
- Применение owned item бесплатно и не создаёт экономическую операцию.
- Network failure не откатывает локально выданный предмет.
- Multi-device ownership merge выполняется только по immutable operationId.

## 13. Локальное хранение, sync и public render

### 13.1 Разделение legacy и DNA

Текущее `user_avatar` остаётся legacy fallback и не превращается в JSON DNA.
Новая локальная account-scoped секция содержит:

- validated current Avatar DNA;
- last confirmed DNA;
- owned cosmetic projection из immutable operations;
- pending style operation;
- last-good local `portrait` и `studio` render ids;
- catalog/manifest versions;
- owner stable id и account generation.

Смена аккаунта очищает чужой DNA и render cache через существующий
account-generation guard.

### 13.2 Облачная модель

Предлагаемые новые поверхности:

- `users/{stableUid}/avatar_style_operations/{operationId}` — immutable
  client-authored equip/save operations;
- существующий economy operation journal — semantic cosmetic grants;
- `public_profiles/{stableUid}.avatarV2` — server-written read-only projection:
  `schemaVersion`, `renderId`, `portraitUrl`, `studioUrl`, `manifestVersion`,
  `updatedAt`;
- legacy `public_profiles.avatar` и `users.progress.user_avatar` сохраняются как
  fallback.

Новая collection/field схема требует в том же изменении:

- Firestore Rules;
- account deletion coverage;
- Jarvis fetcher audit и `jarvis_data_contract_guard.test.ts`;
- public profile projection tests;
- index only if конкретный query действительно нужен.

### 13.3 Trusted compositor

Клиент отправляет validated DNA operation, а не произвольный bitmap. Trusted
deterministic compositor собирает `portrait` и `studio` только из approved,
hashed bundles. Сначала оба файла становятся доступными, затем `avatarV2`
атомарно меняется на ready projection. При ошибке старый public render остаётся.

Собственные локальные поверхности обновляются сразу из local render. Другие
пользователи временно видят старый корректный public avatar и получают новый
после фоновой синхронизации. Это sync delay, а не rollback.

### 13.4 Consumers

`AvatarView` становится единственной точкой выбора:

1. готовый `avatarV2.portraitUrl` для списков;
2. локальный DNA render для собственного профиля;
3. legacy custom/level avatar fallback;
4. level badge fallback при ошибке изображения.

Контрактные тесты должны охватывать профиль, home, friends, league, Arena,
tournaments, gifts, hall of fame, public profile modal и admin preview. Нельзя
внедрять отдельные raw-image обходы в каждом экране.

## 14. Миграция и rollout

1. Добавить dual-compatible `AvatarView` без изменения текущего выбора.
2. Добавить DNA storage, renderer и trusted public projection за feature flag.
3. Открывать приглашение в Студию после первого достижения; его можно закрыть.
4. Только `Save` включает DNA v1 для пользователя.
5. В меню Студии сохраняется действие `Вернуть классический аватар`.
6. Legacy levels, custom badges, aura, frame и storage keys остаются доступными.
7. Rollout идёт процентами; расширение зависит от crash/error/render-latency,
   public-empty и orphan-debit metrics.

Предмет, отозванный из-за дефекта, перестаёт выбираться новым draft, но last-good
render текущего пользователя не исчезает до добровольной смены образа.

## 15. Ошибки и восстановление

| Сбой | Поведение |
|---|---|
| Asset не загрузился | Показать last-good render; плитка предлагает retry. Пустое лицо запрещено. |
| DNA повреждён | Карантин, восстановление last-confirmed DNA, запрет cloud publish. |
| Save не дошёл до local commit | Подтверждённый образ не меняется. |
| Network failure после local commit | Новый локальный образ сохраняется; pending sync повторяется тем же operationId. |
| Public compositor failure | Старый ready public render остаётся; idempotent background retry. |
| Account switch во время операции | Старый token теряет право на commit; чужие cache/DNA не применяются. |
| Catalog item неизвестен после sync | Сохранить id для восстановления, использовать last-good/none effective layer, повторить catalog sync. |
| Retry после crash | Prepared intent реплеится с тем же fingerprint; второй debit/grant невозможен. |

## 16. Производительность

- В Студии одновременно монтируются только эффективные слои current draft.
- Item thumbnails статичны; preview assets подгружаются для текущей и соседней
  подкатегории, не для всего каталога.
- Каталог использует одну виртуализированную сетку со стабильными ключами.
- Social/competitive lists получают один 256px portrait WebP и platform cache.
- Render cache content-addressed по hash `{canonicalDNA + manifestVersion}`.
- Нет бесконечных avatar/aura loops.
- Первый кадр читается из account-scoped AppSnapshot без полноэкранного спиннера.
- Release gates измеряют frame time, decoded image memory, visible image count,
  cache-hit rate и slow-device interaction latency.

## 17. Доступность и локализация

- Минимальный touch target 44×44 px; минимум 8 px между соседними действиями.
- Selected/locked/new состояния имеют текст, icon/check и accessibilityState;
  цвет не является единственным признаком.
- Icon-only controls имеют accessibility labels.
- Screen reader озвучивает название item, ownership, selected state, источник
  получения и действие CTA.
- На салатовых/неоновых поверхностях используются только тёмные text/icon colors.
- Reduced motion убирает декоративные переходы, сохраняя состояние и обратную связь.
- Large text не скрывает Save, unlock condition и exit decision.
- Категории, item names, reward copy, errors и compatibility notices входят во
  все языки приложения.

## 18. Тестовые ворота

### Риг и assets

- schema/manifest validation;
- anchor/safe polygon tests;
- alpha bounds и edge-halo tests;
- draw-order/occlusion cycle tests;
- sentinel и pairwise visual matrix;
- 64px portrait crop contract;
- immutable version/hash contract;
- hosted asset path and no-unused-bundled-asset guard.

### UI и хранение

- guided first creation и free edit;
- dirty exit, undo/redo и locked preview;
- hidden hair restore after hood removal;
- first-frame snapshot без скачка;
- legacy fallback и explicit return;
- account isolation и account switch during save;
- reduced motion, screen reader, contrast и large-text tests.

### Экономика

- zero duplicate cosmetics;
- no standalone debit/direct balance writer;
- exact result before commit;
- crash before/during/after commit;
- retry, restart и payload-fingerprint conflict;
- base/Plus lanes choose distinct owned-safe rewards;
- exhausted cosmetic pool fallback;
- multi-device semantic entitlement merge;
- orphan debit metric всегда равен нулю.

### Cloud и security

- owner-only immutable style/economy operations;
- arbitrary bitmap upload rejected;
- trusted compositor uses approved hashed manifest only;
- public projection switches only after both renders are ready;
- old public render survives compositor/network failure;
- Firestore Rules, account deletion и Jarvis contract gates;
- all avatar consumer surfaces prefer ready v2 and preserve legacy fallback.

## 19. Метрики rollout

- Studio invitation opened / dismissed / completed;
- first-save completion rate and time-to-first-avatar;
- category/item selection depth;
- unlock preview → earned/purchased conversion;
- duplicate cosmetic count (must be zero);
- orphan debit count (must be zero);
- local save failure and pending-sync age;
- public compositor success/latency/retry;
- empty-avatar fallback count (must be zero);
- asset load retry and last-good fallback rate;
- render cache hit rate and slow-device frame budget;
- return-to-classic rate.

Telemetry contains item/category ids and operational status, not a rendered face,
raw image, prompt or other biometric/personal imagery.

## 20. Acceptance criteria

Дизайн считается реализованным, когда:

1. Пользователь может бесплатно создать мужской или женский стартовый образ,
   свободно изменить черты и сохранить его без анимации персонажа.
2. Один Avatar DNA корректно отображается по пояс и портретно.
3. Капюшон, маска и шлем используют compound bundles и не клипуются с волосами,
   ушами и лицом.
4. Удаление головного убора восстанавливает ранее выбранные волосы.
5. Новый предмет не публикуется без всех automated gates и human contact-sheet approval.
6. Спин не выдаёт cosmetic duplicate и не может израсходоваться без exact grant.
7. Offline/network failure не откатывает локальный образ или предмет.
8. Friends/league/Arena/tournaments загружают один ready portrait WebP.
9. Ни одна legacy avatar/aura/frame capability не удалена.
10. Account switch не переносит DNA, entitlement или render cache.
11. Public profile никогда не переходит на отсутствующий render.
12. Firestore Rules, account deletion и Jarvis contracts обновлены вместе со
    schema changes.

## 21. Принятые альтернативы и отклонённые пути

- Отклонён full-image regeneration на каждую комбинацию: комбинаторный взрыв,
  непредсказуемость, network/runtime dependency и невозможность честного offline.
- Отклонена простая стопка одиночных PNG: она не решает front/back hood,
  occlusion и конфликтующие аксессуары.
- Отклонён full 3D rig в v1: выше стоимость и новый renderer/art pipeline, чем
  требуется статичным социальным портретам Phraseman.
- Принят 2.5D Slot Rig: даёт составные предметы, контролируемый DALL·E art,
  детерминированный QA, быстрые public composites и расширение по rigId.
