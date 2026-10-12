# Task packet: краш смены языка в Настройках — `transform: undefined` → `processTransform(null)` (dev)

Governance-ID: TG-1E82BF6E2282
Status: Done (опрос — ждёт согласия координатора; пересъёмка — Сверка)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10, 🔴 блокер выпуска; журнал Сверки C:/Temp/claude/sv/dp_deuk.log)
Related epic/enabler: R1, мгновенная смена языка интерфейса ([LANG-SWITCH], 91cf958fa)

## Outcome

Смена языка интерфейса на экране «Язык» (ru→uk, uk→ru) больше не роняет приложение. Диагноз по журналу и исходнику React Native 0.81.5:
стек падения — `View ← Pressable ← PressableHybrid ← ScrollView` на `/settings_language`; стиль строки языка
`transform: active ? [{ translateY: RAISED_LIFT }] : undefined`. При смене языка у бывшей активной строки ключ `transform` остаётся со
значением `undefined`; дифф Fabric (ReactFabric-dev.js ~1351) превращает `undefined` в `null` и зовёт `processTransform(null)`, а он в
`__DEV__` валидирует `null.forEach` → TypeError → ErrorBoundary. Тот же класс ещё в 4 местах: варианты ответа экзамена и Learning V2
(подъём при выборе ответа — падение посреди урока в dev), Главная (`item.current`), варианты опроса.
Мера: ни одного `transform: … : undefined` в исходниках (сторож), смена языка 2 из 2 без падения (пересъёмка Сверки).

## Scope

In scope: `app/settings_language.tsx`, `components/level-exam/ExamGlassParts.tsx`, `components/learning-v2/LearningV2Glass.tsx`,
`app/(tabs)/home.tsx` — `transform: cond ? [...] : []` (пустой массив — валидный «без сдвига»); сторож
`tests/transform_never_undefined_contract.test.mjs`. Механизм (Fabric undefined→null→processTransform, проверка в __DEV__) описан в шапке
сторожа; отдельный тест на исходник React Native не сделан — jest проекта не разбирает Flow-исходники из node_modules.

Out of scope: `components/survey/SurveySheetModal.tsx` — закреплён контрольной суммой (survey_unavailable_liquid_glass_source_contract);
правка только с согласия координатора, до тех пор — явное исключение в стороже с условием выхода. Предупреждение
`[Worklets] Tried to modify key current…` — отдельная находка: к `transform: null` не причастно (Pressable/PressableHybrid на RN Animated,
BouncyScrollView ref в worklet не захватывает); источник ищется журналом, не догадкой.

## Architecture

No architecture change: значение стиля. Инвариант: ключ `transform` в стиле — всегда массив (возможно пустой) или отсутствует.
Сборка магазина не падала (валидация только в `__DEV__`), но dev-сборка — рабочая среда Сверки и разработки, и класс ловится сторожем.

## Security and privacy

Не затрагивает данные, сеть, авторизацию.

## Technical debt

- Pay now: 4 места класса.
- Contain: опрос — исключение в стороже до согласия координатора на правку закреплённого файла (выход — правка + новый отпечаток).

## Verification

- `node --test tests/transform_never_undefined_contract.test.mjs` (3/3).
- Контракты затронутых экранов (node/jest), проверка синтаксиса.
- Сверка: ru→uk→ru на экране «Язык», 2 из 2 без ErrorBoundary.

## Rollback

`git revert`; поведение стилей возвращается (с прежним падением в dev).
