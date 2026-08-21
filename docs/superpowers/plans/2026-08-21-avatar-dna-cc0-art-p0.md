# Avatar DNA CC0 Art P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить примитивный технический GLB на детерминированно собираемый офлайн 3D-персонаж из закреплённой CC0-топологии MakeHuman, добиться двух эталонных masculine/feminine образов в утверждённом semi-realistic stylized 3D стиле и доказать работу кастомизации лица на реальных Android и iPhone.

**Architecture:** Авторинг полностью выполняется проектными Node.js-скриптами без Blender: закреплённый MakeHuman v1.3.0 OBJ и набор sparse targets проверяются по SHA-256, переводятся в единую каноническую сетку, затем дополняются собственными глазами, волосами, одеждой, материалами и именованными morph targets. В приложение попадает один аудированный GLB и статический manifest; React Native/Three загружает его локально, применяет morph weights по именам и перерисовывает сцену только при изменении DNA. Технический PASS и визуальный PASS владельца являются независимыми обязательными воротами.

**Tech Stack:** React Native, Expo GL, Three.js, `@react-three/fiber`, Node.js ESM, встроенные `fetch`/`crypto`/`node:test`, glTF 2.0/GLB, существующий Jest-контур проекта.

---

## Зафиксированные границы P0

- Никаких Blender, DALL-E, генерации отдельных PNG-частей, Rive/2.5D-фолбэков, покупки готовой модели или ручной правки бинарника.
- MakeHuman используется только как CC0-источник сетки и morph targets. AGPL-код MakeHuman в приложение и сборочный runtime не копируется.
- Текущий `human_v2_base.glb` считается `technical_fixture` до успешного завершения этого плана.
- P0 содержит две presentation-рецептуры, три формы лица, глаза, две причёски, две одежды и редактируемые цвет кожи/радужки/волос/одежды.
- P0 не подключается к пользовательскому профилю, экономике или публичному экрану. После двойного PASS интеграция оформляется отдельным планом.
- Любая технически исправная, но карикатурная, пластиковая, игрушечная или заметно худшая относительно двух референсов версия получает Art FAIL.

### Неизменяемые визуальные референсы

- Masculine: `codex-clipboard-d4220b45-8c4b-4590-b40b-6ddda3cef561.png`, SHA-256 `7FC5CFC00E755BB0CEEBF2AE046FD17B60F5B20B2A092257210D533569157A7A`.
- Feminine: `codex-clipboard-3b67b7f2-8d02-4026-b249-a47a5d2cc4ad.png`, SHA-256 `91B5D056F206771E070C231CC44D62340D7EC9DC5263BBD56113DB0D59A38305`.
- Проверяющий обязан сначала подтвердить hashes исходных файлов. Если временные файлы исчезли или hash изменился, владелец повторно прикладывает оригиналы; заменять их «похожими» изображениями нельзя.

## Карта файлов

### Создать

- `config/avatar-dna/human_v2_cc0_source.v1.json` — закреплённые URL, размеры, SHA-256 и лицензия.
- `tools/avatar-dna/vendor/makehuman-v1.3.0/**` — только проверенные CC0 assets из manifest.
- `scripts/avatar-dna/fetch_makehuman_cc0.mjs` — идемпотентная загрузка и проверка источников.
- `scripts/avatar-dna/lib/makehuman_obj.mjs` — OBJ-парсер с сохранением исходных индексов и групп.
- `scripts/avatar-dna/lib/makehuman_target.mjs` — parser sparse target и преобразование осей.
- `scripts/avatar-dna/lib/morph_recipe.mjs` — композиция пар targets и стилевых рецептов.
- `scripts/avatar-dna/lib/ellipsoid_mesh.mjs` — собственная параметрическая сетка глаз.
- `scripts/avatar-dna/lib/tapered_clump_mesh.mjs` — собственные пряди волос.
- `scripts/avatar-dna/lib/fitted_garment_mesh.mjs` — одежда, привязанная к поверхности тела.
- `scripts/avatar-dna/build_human_v2_cc0_glb.mjs` — канонический GLB builder.
- `scripts/avatar-dna/audit_human_v2_glb.mjs` — структурный и визуально-опасный audit.
- `config/avatar-dna/human_v2_style.v1.json` — bounds и рецептуры лица.
- `config/avatar-dna/human_v2_hair.v1.json` — детерминированные профили волос.
- `config/avatar-dna/human_v2_materials.v1.json` — PBR-палитра и свет.
- `modules/avatar-dna-3d/art_manifest.ts` — runtime-контракт артефакта.
- `modules/avatar-dna-3d/performance_probe.ts` — измерение первого кадра.
- `tests/avatar_dna_makehuman_source_contract.test.ts`
- `tests/avatar_dna_makehuman_parser.test.ts`
- `tests/avatar_dna_style_recipe.test.ts`
- `tests/avatar_dna_glb_audit.test.ts`
- `tests/avatar_dna_art_manifest_contract.test.ts`
- `tests/avatar_dna_named_morph_runtime.test.ts`
- `tests/avatar_dna_comparison_route_contract.test.ts`
- `docs/reports/avatar-dna/2026-08-21-cc0-art-p0-evidence.md` — доказательства реального прогона.

### Изменить

- `scripts/avatar-dna/build_human_v2_base_glb.mjs` — тонкая совместимая оболочка нового builder.
- `modules/avatar-dna-3d/contracts.ts` — presentation, цвета и именованные morphs.
- `modules/avatar-dna-3d/resolver.ts` — явное отображение DNA → recipe → morph weights.
- `modules/avatar-dna-3d/local_assets.ts` — только аудированный GLB и manifest.
- `components/avatar-dna-3d/Avatar3DScene.tsx` — применение morphs/materials по именам.
- `components/avatar-dna-3d/Avatar3DStage.tsx` — фиксированные comparison-ракурсы и demand rendering.
- `app/_admin_avatar_dna_3d_p0.tsx` — внутренний экран сравнения.
- `package.json` — узкие команды fetch/build/audit/test.

## Morph ABI correction (P0, обязательная архитектура)

P0 GLB uses 18 one-sided basis targets, not six composite recipe targets. The exact ordered ABI is:

`head_width_decr`, `head_width_incr`, `jaw_width_decr`, `jaw_width_incr`, `eye_size_decr`, `eye_size_incr`, `eye_spacing_decr`, `eye_spacing_incr`, `nose_width_decr`, `nose_width_incr`, `nose_projection_decr`, `nose_projection_incr`, `mouth_width_decr`, `mouth_width_incr`, `upper_lip_volume_decr`, `upper_lip_volume_incr`, `lower_lip_volume_decr`, `lower_lip_volume_incr`.

For every signed dimension `d`, calculate `x = clamp(base[d] + presentation[p][d] + face[f][d] + userOffset[d], min[d], max[d])`, then `decr = max(-x, 0)` and `incr = max(x, 0)`, normalizing `-0` to `0`. Sum all layers first, clamp once, then branch; exactly one branch is active. Neutral GLB positions remain neutral MakeHuman positions.

## Task 1: Закрепить и проверить CC0 source packet

**Files:**
- Create: `config/avatar-dna/human_v2_cc0_source.v1.json`
- Create: `scripts/avatar-dna/fetch_makehuman_cc0.mjs`
- Create: `tests/avatar_dna_makehuman_source_contract.test.ts`
- Populate: `tools/avatar-dna/vendor/makehuman-v1.3.0/**`

- [ ] Написать падающий contract test, который требует `sourceCommit = 1f508f6083b2f823dab15de924b3bde72e08d77c`, `license = CC0-1.0`, ровно 24 файла, уникальные destination и 64-символьные lowercase SHA-256.

- [ ] В manifest зафиксировать базовый URL `https://raw.githubusercontent.com/makehumancommunity/makehuman/1f508f6083b2f823dab15de924b3bde72e08d77c/` и эти обязательные файлы:

  Для `LICENSE.ASSETS.md` и `makehuman/data/3dobjs/base.obj` поле `source` совпадает с destination. Для остальных строк `source` равно `makehuman/data/targets/` плюс destination. Локальный destination всегда находится под `tools/avatar-dna/vendor/makehuman-v1.3.0/`; никакой URL не вычисляется из пользовательского ввода.

| Destination | Bytes | SHA-256 |
|---|---:|---|
| `LICENSE.ASSETS.md` | 6962 | `f6089cba01cb570a24712b41ab8a586ccd3cc5ef53dc266ca50b95c288956d2c` |
| `makehuman/data/3dobjs/base.obj` | 1749303 | `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c` |
| `head/head-scale-horiz-decr.target` | 81690 | `cadb55b340cb94e96131860beb68b2e46204fccc7ee8f963f66cc9d22b03af0c` |
| `head/head-scale-horiz-incr.target` | 83156 | `31830f645c194c9451cb5f59cffb8e1d2a1c8fb215afb0c2ab36028b2c24570d` |
| `chin/chin-width-decr.target` | 2853 | `ac081bd1652c203fc8973f20988a868a423a49f1fe6449cb974727fd46c26af1` |
| `chin/chin-width-incr.target` | 3706 | `deef506bfe1883d9d4c38667332c9970785226566efbae4724fd3d60c02efcf4` |
| `nose/nose-scale-horiz-decr.target` | 5074 | `1227e6f513d202585e40045fe4234778597bb591ac492e7f9313347cd9a9f2ec` |
| `nose/nose-scale-horiz-incr.target` | 7568 | `cc319e3ddb0523fa2b563dcfc840cf2f915a890abe5612009a0becebecd3c5ae` |
| `nose/nose-scale-depth-decr.target` | 5811 | `b46c35046c9c451b7ffe77acc0573bd945d7c6acaefe43d8c21912d4ce1a6e4c` |
| `nose/nose-scale-depth-incr.target` | 5762 | `6bb03c3065e048d6e9abbcfa58961bfbe1753a307be0d3de477cac6aeaf5f750` |
| `eyes/l-eye-scale-decr.target` | 12544 | `a66719f1a42badd955fb0c725ac453969d7fda05cc6e4f4770d388b076703dc7` |
| `eyes/l-eye-scale-incr.target` | 13397 | `f35550dc3170ca1c0aacae0b598ca139e4f1f913f2ccea146ec6ea5b4e050dbb` |
| `eyes/r-eye-scale-decr.target` | 12118 | `f43ba41146723a192c755330aa8baa77b638bc28f3736c448e5ce72e8a588f32` |
| `eyes/r-eye-scale-incr.target` | 12192 | `e1f4cb48575b60a46589635b99a8b87587ba82d7524a8ac1445ace0ba002e918` |
| `eyes/l-eye-trans-in.target` | 11686 | `a92495e3f6cda144b3c37cc07734ee2735934d263e8c20e4b5763b21650ce26b` |
| `eyes/l-eye-trans-out.target` | 12444 | `ca961a4637517aeb689fa351e9d36abb3c04108a2870b26220f3c8cda027bdee` |
| `eyes/r-eye-trans-in.target` | 10176 | `4c494f3503b219b07782ebf78132da81f2b5711232825cf261dcd1ca57add3d6` |
| `eyes/r-eye-trans-out.target` | 12783 | `02143e686611f18d36915ee70082234e37db3d38a791cb8e1a46c0c56c4be43c` |
| `mouth/mouth-scale-horiz-decr.target` | 12644 | `07a9ef160755467a470bd0a1df035143d83ebddbc12e4612e69e93a64644405c` |
| `mouth/mouth-scale-horiz-incr.target` | 15657 | `ccfc39cca249883ebc46af6f2c96c4130df13a67ebce30a2550af17a48637770` |
| `mouth/mouth-upperlip-volume-decr.target` | 2649 | `20b285d94ecb62cf605907d65659ab11ff760dbb938ba9ae7fc13429b1e3ba16` |
| `mouth/mouth-upperlip-volume-incr.target` | 3600 | `b124cbd9b9be318264f61a143da603b42e0357ed92b4b6afd1b31a83daaf8568` |
| `mouth/mouth-lowerlip-volume-decr.target` | 1828 | `45f1fe355546cdaa86581512810ee1cd2c6971ac67ffb46d3391ac438e539d15` |
| `mouth/mouth-lowerlip-volume-incr.target` | 3585 | `dbdaf045b00c67bf8672d53bc8cf94eb3e3dea316de6fe18a278f7080564c65d` |

- [ ] Реализовать fetcher: загрузка во временный файл, проверка HTTP status/размера/hash, затем атомарный rename; существующий корректный файл пропускать, некорректный — останавливать с ненулевым exit code.

- [ ] Выполнить `node scripts/avatar-dna/fetch_makehuman_cc0.mjs`. Ожидается: `verified=24 downloaded=24` при первом запуске и `verified=24 downloaded=0` при втором.

- [ ] Выполнить `npx jest tests/avatar_dna_makehuman_source_contract.test.ts --runInBand`. Ожидается PASS.

## Task 2: Разобрать OBJ и sparse targets без потери индексов

**Files:**
- Create: `scripts/avatar-dna/lib/makehuman_obj.mjs`
- Create: `scripts/avatar-dna/lib/makehuman_target.mjs`
- Create: `tests/avatar_dna_makehuman_parser.test.ts`

- [ ] Сначала написать тесты на минимальных fixtures: quad с отрицательными индексами, смена `g`, triangulation fan, target line, комментарии, дубликат индекса и выход за границу.

- [ ] Реализовать `parseMakeHumanObj(text)`, возвращающий `positions`, `uvs`, `groups`, `triangles` и `sourceVertexIndex`. Рендерить только группу `body`, но сохранить vertex membership helper-групп `joint-l-eye`, `joint-r-eye` и `joint-head` для вычисления anchors.

- [ ] Реализовать `parseMakeHumanTarget(text, vertexCount)`. Формат source target: `index dx dz dy`; канонический offset обязан быть `[dx, -dy, dz]`. Повторяющийся индекс, NaN и индекс вне диапазона — hard error.

  Минимальная осевая операция, которую должен зафиксировать unit test:

  ```js
  const [indexText, dxText, dzText, dyText] = line.trim().split(/\s+/);
  const delta = [Number(dxText), -Number(dyText), Number(dzText)];
  ```

- [ ] Добавить golden assertions: применение пары decrement/increment с весом 0 возвращает неизменную сетку; отрицательный вес использует decrement, положительный — increment; вес clamp-ится только на границе recipe, не внутри parser.

- [ ] Выполнить `npx jest tests/avatar_dna_makehuman_parser.test.ts --runInBand`. Ожидается PASS.

## Task 3: Зафиксировать стилевой recipe и именованный DNA-контракт

**Files:**
- Create: `config/avatar-dna/human_v2_style.v1.json`
- Create: `tests/avatar_dna_style_recipe.test.ts`
- Modify: `modules/avatar-dna-3d/contracts.ts`
- Modify: `modules/avatar-dna-3d/resolver.ts`
- Modify: `tests/avatar_dna_3d_resolver.test.ts`

- [ ] Написать падающие тесты на симметрию, bounds, стабильный порядок morph names и отсутствие числовой эвристики по значениям.

- [ ] В `morphBounds` зафиксировать:

| Morph | Min | Max |
|---|---:|---:|
| `head_width` | -0.22 | 0.22 |
| `jaw_width` | -0.28 | 0.28 |
| `eye_size` | -0.12 | 0.32 |
| `eye_spacing` | -0.16 | 0.16 |
| `nose_width` | -0.22 | 0.18 |
| `nose_projection` | -0.12 | 0.18 |
| `mouth_width` | -0.16 | 0.18 |
| `upper_lip_volume` | -0.12 | 0.24 |
| `lower_lip_volume` | -0.12 | 0.24 |

- [ ] В recipe зафиксировать базу: `head_width 0.04`, `eye_size 0.18`, `nose_width -0.08`, `nose_projection -0.03`, `mouth_width 0.03`, `upper_lip_volume 0.06`, `lower_lip_volume 0.08`.

- [ ] Добавить presentation-рецептуры:
  - `masculine`: head 0.08, jaw 0.18, eye 0.12, nose width 0.02, mouth 0.05, upper lip 0.02, lower lip 0.04.
  - `feminine`: head -0.02, jaw -0.14, eye 0.24, nose width -0.12, nose projection -0.05, mouth 0.02, upper lip 0.14, lower lip 0.16.

- [ ] Добавить именованные additive-дельты; не вводить gender-locked геометрию:

| Recipe | head | jaw | eye size | eye spacing | nose width | nose projection | mouth | upper lip | lower lip |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `face_soft` | 0.04 | -0.10 | 0.04 | 0.00 | -0.02 | -0.02 | 0.04 | 0.06 | 0.06 |
| `face_heart` | 0.06 | -0.18 | 0.05 | 0.01 | -0.04 | -0.02 | 0.02 | 0.08 | 0.08 |
| `face_strong` | 0.06 | 0.22 | -0.02 | 0.01 | 0.08 | 0.10 | 0.06 | -0.02 | 0.00 |

- [ ] Расширить `AvatarDna3D` полями `presentationId: 'masculine' | 'feminine'` и `irisColor`. В `Avatar3DRenderPlan` заменить неявный `Record<string, number>` на строго типизированные именованные weights.

  Целевой TypeScript-контракт:

  ```ts
  export type PresentationId = 'masculine' | 'feminine';
  export type SignedMorphId =
    | 'head_width' | 'jaw_width' | 'eye_size' | 'eye_spacing'
    | 'nose_width' | 'nose_projection' | 'mouth_width'
    | 'upper_lip_volume' | 'lower_lip_volume';
  export const SIGNED_MORPH_IDS = [
    'head_width', 'jaw_width', 'eye_size', 'eye_spacing', 'nose_width',
    'nose_projection', 'mouth_width', 'upper_lip_volume', 'lower_lip_volume',
  ] as const;
  export type GlbMorphId =
    | 'head_width_decr' | 'head_width_incr' | 'jaw_width_decr' | 'jaw_width_incr'
    | 'eye_size_decr' | 'eye_size_incr' | 'eye_spacing_decr' | 'eye_spacing_incr'
    | 'nose_width_decr' | 'nose_width_incr' | 'nose_projection_decr' | 'nose_projection_incr'
    | 'mouth_width_decr' | 'mouth_width_incr' | 'upper_lip_volume_decr' | 'upper_lip_volume_incr'
    | 'lower_lip_volume_decr' | 'lower_lip_volume_incr';
  export const GLB_MORPH_IDS = [
    'head_width_decr', 'head_width_incr', 'jaw_width_decr', 'jaw_width_incr',
    'eye_size_decr', 'eye_size_incr', 'eye_spacing_decr', 'eye_spacing_incr',
    'nose_width_decr', 'nose_width_incr', 'nose_projection_decr', 'nose_projection_incr',
    'mouth_width_decr', 'mouth_width_incr', 'upper_lip_volume_decr', 'upper_lip_volume_incr',
    'lower_lip_volume_decr', 'lower_lip_volume_incr',
  ] as const;
  export type GlbMorphWeights = Readonly<Record<GlbMorphId, number>>;
  ```

- [ ] DNA содержит dense `userMorphOffsets` плюс `presentationId` и `irisColor`; render plan содержит exact `GlbMorphWeights`. Style JSON фиксирует exact `parameterOrder`, `targetOrder`, `bounds`, dense base/presentation/face vectors и signed-pair source mapping, без missing или extra keys.

- [ ] В resolver порядок сложения сделать явным: `base + presentation + faceShape + user sliders`, затем единый clamp и branch formula из Morph ABI correction. Цвета и волосы не должны менять геометрию лица.

- [ ] Выполнить `npx jest tests/avatar_dna_style_recipe.test.ts tests/avatar_dna_3d_resolver.test.ts --runInBand`. Ожидается PASS.

## Task 4: Построить каноническую body-сетку и GLB-аудитор

**Files:**
- Create: `scripts/avatar-dna/lib/morph_recipe.mjs`
- Create: `scripts/avatar-dna/build_human_v2_cc0_glb.mjs`
- Create: `scripts/avatar-dna/audit_human_v2_glb.mjs`
- Create: `tests/avatar_dna_glb_audit.test.ts`
- Modify: `scripts/avatar-dna/build_human_v2_base_glb.mjs`
- Modify: `package.json`

- [ ] Написать падающий test auditor на известный текущий primitive GLB: результат обязан быть FAIL с причинами `missing_required_named_morphs` и `primitive_fixture_detected`.

- [ ] Реализовать композицию sparse targets в 18 ordered relative `POSITION` targets по ABI: one-sided decrement/increment target для каждого из девяти signed dimensions. `eye_size` branches merge left/right scale files; `eye_spacing` decrement merges left/right trans-in files and increment merges left/right trans-out files.

- [ ] Нормали вычислять после base recipe; morph target normals не экспортировать в P0. Индексы body и порядок вершин должны быть идентичны во всех target deltas.

- [ ] Builder обязан выдавать один deterministic GLB: одинаковые source/config дают побайтово одинаковый output, без timestamps и случайных UUID.

- [ ] Auditor обязан проверить:
  - glTF 2.0, JSON/BIN chunks и выравнивание;
  - один канонический body primitive;
  - exact count/order/names in `mesh.extras.targetNames` (18), target accessor count equal to base vertex count, finite relative deltas, explicit 18 zero mesh weights and no node override;
  - forbidden composite names `phraseman_base`, `presentation_*`, `face_*` are absent; base is not baked into canonical `POSITION`; normals are calculated on the neutral reference;
  - конечные positions/normals, ненулевую площадь треугольников;
  - отсутствие mesh names из текущего fixture и недопустимых огромных bounds;
  - material/mesh/texture references в диапазоне.

- [ ] Превратить старый builder в совместимую оболочку, которая импортирует и вызывает новый builder. Не поддерживать вторую реализацию.

- [ ] Добавить scripts:
  - `avatar-dna:source` → fetcher;
  - `avatar-dna:build` → новый builder;
  - `avatar-dna:audit` → auditor;
  - `avatar-dna:verify` → source contract + build + audit + focused tests.

- [ ] Выполнить `npm run avatar-dna:build` дважды и сравнить SHA-256. Ожидается одинаковый hash.

- [ ] Выполнить `npx jest tests/avatar_dna_glb_audit.test.ts --runInBand`. Ожидается PASS.

## Task 5: Собрать глаза и материалы, дающие живое лицо

**Files:**
- Create: `scripts/avatar-dna/lib/ellipsoid_mesh.mjs`
- Create: `config/avatar-dna/human_v2_materials.v1.json`
- Modify: `scripts/avatar-dna/build_human_v2_cc0_glb.mjs`
- Modify: `tests/avatar_dna_glb_audit.test.ts`

- [ ] Сначала добавить failing assertions на отдельные sclera/iris/cornea meshes для обоих глаз и на прозрачный material cornea.

- [ ] Создать собственную lat-long ellipsoid-сетку, не вызывая `SphereGeometry`. Anchors вычислять из helper-групп, а не хардкодить в мировых координатах.

- [ ] Для каждого глаза собрать:
  - sclera radii `[0.165, 0.175, 0.145]`;
  - iris radii `[0.092, 0.092, 0.012]` и смещение `0.138` к камере;
  - cornea radii `[0.168, 0.178, 0.151]`;
  - pupil как внутреннюю тёмную часть iris mesh, а не плоскую наклейку поверх лица.

- [ ] Зафиксировать PBR defaults:
  - skin `#D4936A`, roughness `0.58`;
  - sclera `#FFF8F1`, roughness `0.38`;
  - iris `#6A3A16`, roughness `0.34`;
  - pupil `#120B08`, roughness `0.42`;
  - cornea opacity `0.17`, roughness `0.08`;
  - hair `#4B2415`, roughness `0.42`;
  - cloth `#B84C31`, roughness `0.82`.

- [ ] Зафиксировать свет comparison stage: ambient `1.15`; key `2.1` at `[-2.4, 3.4, 4.2]` color `#FFF2E4`; fill `0.72` at `[3.1, 1.4, 2.2]` color `#FFE0CC`; rim `0.46` at `[0, 3, -3]` color `#FFF7ED`.

- [ ] Auditor должен отклонять непрозрачную cornea, одинаковые material names и отсутствие отдельной iris.

- [ ] Выполнить `npm run avatar-dna:build && npm run avatar-dna:audit`. Ожидается PASS.

## Task 6: Создать проектные волосы и одежду без примитивов

**Files:**
- Create: `scripts/avatar-dna/lib/tapered_clump_mesh.mjs`
- Create: `scripts/avatar-dna/lib/fitted_garment_mesh.mjs`
- Create: `config/avatar-dna/human_v2_hair.v1.json`
- Modify: `scripts/avatar-dna/build_human_v2_cc0_glb.mjs`
- Modify: `tests/avatar_dna_glb_audit.test.ts`

- [ ] Написать failing tests, требующие meshes `avatar_hair_wave`, `avatar_hair_crop`, `avatar_outfit_terra` и `avatar_hood_assassin` и запрещающие упоминания `SphereGeometry`, `CapsuleGeometry`, `TorusGeometry`, `BoxGeometry`, `ConeGeometry` во всём production builder path.

- [ ] Реализовать tapered clump по Catmull-Rom centerline и параллельно переносимым frames: 12 сегментов по длине, 7 radial segments, радиус к концу плавно стремится к нулю.

- [ ] В `human_v2_hair.v1.json` зафиксировать:
  - wave: 3 семейства прядей с counts 9/7/5, управляемыми azimuth/elevation/sweep/lift/rootRadius;
  - crop: 2 семейства с counts 10/8;
  - только детерминированные параметры, без `Math.random`.

- [ ] Root каждой пряди вычислять от ellipsoid head proxy, полученного из bounds группы head; кончик и tangents должны оставаться вне scalp с минимальным clearance `0.006`.

- [ ] Реализовать terra garment как выбранные body triangles torso с offset `0.032` вдоль сглаженных normals. Hood строить swept rings вокруг шеи/затылка и привязывать к тем же bounds.

- [ ] Auditor должен проверять minimum triangle count, отсутствие пересечения всех hair roots с центром головы и отсутствие дублированной body-сетки вместо одежды.

- [ ] Выполнить `npx jest tests/avatar_dna_glb_audit.test.ts --runInBand` и `npm run avatar-dna:audit`. Ожидается PASS.

## Task 7: Опубликовать только аудированный локальный артефакт

**Files:**
- Create: `modules/avatar-dna-3d/art_manifest.ts`
- Create: `tests/avatar_dna_art_manifest_contract.test.ts`
- Modify: `modules/avatar-dna-3d/local_assets.ts`
- Modify: `assets/models/avatar-dna/human_v2_base.glb`
- Modify: `tests/avatar_dna_human_v2_asset_contract.test.ts`

- [ ] Написать failing test: manifest обязан содержать `artifactId`, `sourceCommit`, `sourceManifestSha256`, `builderVersion`, `glbSha256`, `meshNames`, `morphNames`, `materialNames` и `status: 'art_candidate'`.

- [ ] Manifest additionally contains `morphContractVersion: 'signed-pairs-v1'`, ordered `parameterNames`, ordered `morphNames` (the exact 18 ABI names), and `styleConfigSha256`.

- [ ] Builder после успешного audit должен писать GLB во временный output; отдельный publish step копирует его в assets и обновляет manifest только если audit PASS.

- [ ] Зафиксировать обязательные mesh names:
  `avatar_body_base`, `avatar_eye_left_sclera`, `avatar_eye_left_iris`, `avatar_eye_left_cornea`, `avatar_eye_right_sclera`, `avatar_eye_right_iris`, `avatar_eye_right_cornea`, `avatar_hair_wave`, `avatar_hair_crop`, `avatar_outfit_terra`, `avatar_hood_assassin`.

- [ ] Зафиксировать material names:
  `material_skin`, `material_sclera`, `material_iris`, `material_cornea`, `material_hair`, `material_cloth`.

- [ ] `local_assets.ts` обязан иметь ровно один статический `require()` на опубликованный GLB и сверять runtime artifact id с manifest. Сетевые URI запрещены.

- [ ] Выполнить `npm run avatar-dna:verify`. Ожидается PASS и совпадение asset SHA-256 с manifest.

## Task 8: Применять morphs и материалы в runtime по именам

**Files:**
- Modify: `components/avatar-dna-3d/Avatar3DScene.tsx`
- Modify: `components/avatar-dna-3d/Avatar3DStage.tsx`
- Create: `tests/avatar_dna_named_morph_runtime.test.ts`
- Modify: `tests/avatar_dna_human_v2_scene_contract.test.ts`
- Modify: `tests/avatar_dna_3d_stage_contract.test.ts`

- [ ] Написать failing contract test, запрещающий выбор presentation через сравнение чисел и доступ к morph influence только по magic index.

- [ ] On every DNA change, map/clear/assign all 18 names, validate finite directional caps and pair mutual exclusion; only the body receives weights. Use no recipe-name or magic-index access. The variable type is `GlbMorphWeights`.

- [ ] После загрузки построить map `morphTargetDictionary name → index`. Каждый обязательный name должен существовать; отсутствующий name показывает существующий safe fallback и пишет единственную диагностическую ошибку.

  Единственно допустимый способ получения индекса в scene:

  ```ts
  const index = mesh.morphTargetDictionary?.[morphName];
  if (index === undefined) throw new Error('avatar_required_morph_missing:' + morphName);
  mesh.morphTargetInfluences![index] = weight;
  ```

- [ ] Применять weights только к `avatar_body_base`. Переключать visibility hair/outfit meshes через plan IDs, не удаляя meshes из scene.

- [ ] Цвета skin/iris/hair/cloth применять через cloned materials конкретного экземпляра, чтобы два comparison-персонажа не делили mutable material.

- [ ] Сохранить `frameloop="demand"`. После загрузки и после изменения DNA вызывать один `invalidate()`; постоянный `useFrame` и animation loop запрещены.

- [ ] Добавить два фиксированных camera preset:
  - `portrait` для честного сравнения с референсами;
  - `threeQuarter` для проверки носа, jaw, волос и hood clipping.

- [ ] Выполнить `npx jest tests/avatar_dna_named_morph_runtime.test.ts tests/avatar_dna_human_v2_scene_contract.test.ts tests/avatar_dna_3d_stage_contract.test.ts --runInBand`. Ожидается PASS.

- [ ] Add tests for asymmetric pairs, cross-zero sum-before-branch, clamp edges, zero on both branches, pair mutual exclusion, exact order/default zero, and CPU expected positions versus GLB. Separate eyeballs must follow `eye_size`/`eye_spacing` through node transforms or correctives; device gates cover hair/hood clipping at extremes.

## Task 9: Сделать внутренний comparison screen и performance probe

**Files:**
- Modify: `app/_admin_avatar_dna_3d_p0.tsx`
- Create: `modules/avatar-dna-3d/performance_probe.ts`
- Create: `tests/avatar_dna_comparison_route_contract.test.ts`
- Modify: `tests/avatar_dna_3d_first_frame_contract.test.ts`
- Modify: `tests/avatar_dna_3d_prewarm.test.ts`

- [ ] Написать failing route contract: экран не может возвращать `null` и обязан содержать masculine/feminine эталоны, portrait/threeQuarter, slider reset и diagnostic status.

- [ ] Экран должен показывать две одинаково освещённые карточки рядом/последовательно по ширине устройства. Никаких декоративных фильтров, скрывающих качество сетки.

- [ ] Добавить controls только для P0 DNA: presentation, face shape, head/jaw, eyes size/spacing, nose width/projection, mouth/lips, skin/iris/hair/cloth colors, hair и outfit.

- [ ] Добавить `Reset reference masculine` и `Reset reference feminine`, которые восстанавливают точные recipe values из Task 3.

- [ ] Performance probe измеряет от начала local asset load до первого post-load draw. На каждом устройстве выполнить 20 cold-screen samples; принимать только `p95 <= 50 ms`. Результаты хранить как числа в evidence report, не в production analytics.

- [ ] Выполнить десять циклов открыть/закрыть экран на Android и iPhone. После закрытия не должно оставаться GL context error, таймера или frame loop.

- [ ] Выполнить `npx jest tests/avatar_dna_comparison_route_contract.test.ts tests/avatar_dna_3d_first_frame_contract.test.ts tests/avatar_dna_3d_prewarm.test.ts --runInBand`. Ожидается PASS.

## Task 10: Пройти независимые Technical P0 и Owner Art P0 gates

**Files:**
- Create: `docs/reports/avatar-dna/2026-08-21-cc0-art-p0-evidence.md`
- Store ignored captures under `qa-artifacts/avatar-dna-cc0-art-p0/`; имя непосредственной подпапки должно быть фактическим полным 40-символьным git commit SHA сборки.

- [ ] Выполнить source/build/audit gate и записать в evidence report команды, exit codes, manifest hash, GLB hash, triangle/vertex counts и обязательные names.

- [ ] На реальном Android и реальном iPhone записать для каждого: модель устройства, OS, build identifier, 20 first-frame samples, p50, p95, десять open/close циклов и наличие/отсутствие GL errors.

- [ ] Снять без постобработки по четыре изображения на presentation: portrait neutral, portrait changed DNA, three-quarter neutral, three-quarter with alternate hair/outfit. Сохранять вне bundled assets.

- [ ] Technical P0 = PASS только если:
  - source hashes, deterministic build и GLB audit PASS;
  - все focused tests PASS;
  - оба реальных устройства показывают локальный GLB без network fetch;
  - p95 первого кадра не выше 50 ms;
  - десять open/close циклов без утечки/ошибки;
  - все заявленные controls визуально меняют ожидаемую область.

- [ ] Передать владельцу две референсные картинки из design spec и восемь device captures одновременно. Попросить один явный вердикт: `ART PASS` или `ART FAIL` с перечислением несоответствий.

- [ ] Owner Art P0 = PASS только при явном `ART PASS` владельца. Самооценка исполнителя, тесты и Technical PASS его не заменяют.

- [ ] При `ART FAIL` менять только style/hair/material recipe или проектные mesh generators, повторять audit/device captures и снова запрашивать вердикт. Не ослаблять критерии и не подменять 3D рендером-картинкой.

- [ ] Только после двух PASS изменить manifest status с `art_candidate` на `p0_approved` отдельным проверяемым коммитом. До этого интеграция в пользовательские экраны запрещена.

## Финальная матрица проверки

| Проверка | Команда/действие | Условие успеха |
|---|---|---|
| Source provenance | `node scripts/avatar-dna/fetch_makehuman_cc0.mjs` | 24/24 hashes и повторный запуск без скачивания |
| Parser | `npx jest tests/avatar_dna_makehuman_parser.test.ts --runInBand` | PASS |
| Recipe/resolver | `npx jest tests/avatar_dna_style_recipe.test.ts tests/avatar_dna_3d_resolver.test.ts --runInBand` | PASS |
| Deterministic build | два запуска `npm run avatar-dna:build` | одинаковый SHA-256 |
| GLB audit | `npm run avatar-dna:audit` | PASS без warnings уровня error |
| Runtime contracts | узкий Jest-набор Tasks 7–9 | PASS |
| Android | ручной device gate | p95 ≤ 50 ms, 10/10 clean close |
| iPhone | ручной device gate | p95 ≤ 50 ms, 10/10 clean close |
| Style | явный owner verdict | `ART PASS` |

## Самопроверка плана

- Все создаваемые и изменяемые файлы перечислены; production integration намеренно исключена.
- Каждый implementation task начинается с падающего теста/контракта и заканчивается узкой командой проверки.
- Source topology, target axes, morph names, recipe bounds, geometry parameters, material defaults и device thresholds заданы конкретно.
- Runtime типы проходят одной цепочкой: `AvatarDna3D → Avatar3DRenderPlan → named morph dictionary/material visibility`.
- Текущий primitive asset не удаляется до успешной публикации аудированного GLB, поэтому существующая техническая поверхность не ломается в середине работы.
- План не допускает фиктивный PASS: реальное устройство и явное решение владельца обязательны.

## Stop conditions

- Остановиться, если любой source hash не совпал: не обновлять hash под случайно полученный файл.
- Остановиться, если для достижения вида требуется сменить закреплённую топологию или расширить P0: сначала обновить design spec и этот план.
- Остановиться при конфликте с чужими изменениями в перечисленных файлах; не откатывать и не перезаписывать их.
- Остановиться перед пользовательской интеграцией: это отдельное решение владельца после `Technical PASS + ART PASS`.
