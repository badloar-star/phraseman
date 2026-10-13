# R1 · План Б: Learning V2 скрыт в первом выпуске

Подготовил: Ядро (сессия 1), 13.10.2026 ~11:40.
Решение владельца 11:00, через координатора: если к **15.10 12:00** у Codex не зелёные гейты №3 и №4, Learning V2 в первом выпуске
скрываем и включаем позже.
- Гейт №3: выпуск V2 = исходник.
- Гейт №4: озвучка V2; сейчас 56/186, у l1s1 нет голоса.

**Статус документа: ПОДГОТОВЛЕНО, НЕ ПРИМЕНЕНО.** Код Codex не трогается.

---

## 1. Что прячет вход в V2 сейчас (проверено по коду HEAD)

Флага в Remote Config для V2 **нет**. Вход управляется константой сборки:

| где | что |
|---|---|
| `app/learning_v2_bundle_availability_v1.generated.ts` | `LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = 0`. Сколько занятий подряд с l1s1 собирается из бандла. Перегенерируется **только вручную** (команда в шапке файла), сборка его не трогает. |
| `app/learning_v2_session_availability_v1.ts:40` | `LEARNING_V2_HAS_RELEASED_SESSIONS_V1 = CEILING > 0` |
| `app/(tabs)/lessons.tsx:1405` | `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = HAS_RELEASED \|\| ENABLE_DEV_TOOLS` |
| `lessons.tsx:5417` | вкладка «V2» рисуется только при этой константе. Логика Тем, bdb1dbe2e, проверено. |
| `lessons.tsx:1436, 2597` | запомненная вкладка «V2» не восстанавливается, если константа ложна. |
| `lessons.tsx:4445` | чип «Новые уроки» при ложной константе показывает надпись «закрыто», а не курс. |

**Итог: при потолке 0 в стор-сборке (`ENABLE_DEV_TOOLS = false`) вкладки V2 нет.** План Б совпадает с текущим состоянием HEAD.
Он ломается только в одном случае: если Codex перегенерирует потолок выше 0, а гейты при этом красные.

### Одна щель (закрыть при применении плана Б)

- Маршрут `app/learning-v2/course.tsx` открывает экран уроков с `initialPage="v2"`.
- В стор-сборке он **не вырезан**: `router.ctx.js` вырезает только служебные маршруты V2 — authoring_preview, modes_showcase_run и intro-reader-fixture.
- `startLessonsPage` (`lessons.tsx:1436`) отдаёт `initial` как есть. По внешней ссылке или из уведомления раздел V2 откроется и при потолке 0.
- Патч на одну строку, применять только в день плана Б. Файл в зоне Тем — правят они или Ядро по слову координатора:

```ts
// lessons.tsx, startLessonsPage — было:
const start = initial === "lessons" && rememberedLessonsPage === "v2" && LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? "v2" : initial;
// стало (зачем: план Б R1 — без выпущенных занятий V2 не открывается и по прямой ссылке):
const start = !LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? "lessons"
  : initial === "lessons" && rememberedLessonsPage === "v2" ? "v2" : initial;
```

## 2. «Включим позже с сервера» — честно

- Серверный флаг может только **спрятать** то, что есть в сборке. Показать курс, которого в бандле нет, он не может.
- При потолке 0 в бандле нет ни одного выпущенного занятия.

Включение после релиза — только **обновлением бандла**: OTA через EAS Update по каналу production, либо новой стор-сборкой. В обновлении:
1. Codex озвучивает и выпускает занятия, гейты №3 и №4 зелёные.
2. Codex перегенерирует потолок (команда из шапки generated-файла).
3. План Б снимается — раздел 5.

Если понадобится настоящий рубильник «спрятать V2 с сервера, когда курс УЖЕ в бандле», есть готовый образец:
- ключ `remote_config/app.bools.learning_v2_visible`, дефолт `true`;
- чтение — как в `app/friends_together/together_config.ts` (кэш `remote_config_cache_v1`, событие `remote_config_changed`, без лишних чтений Firestore);
- условие ставится в `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY` (превращается из константы в хук).

Для R1 это не нужно: при плане Б потолок и так 0.

## 3. release:precheck — гейты №3 и №4 в режиме плана Б

Сейчас (13.10 11:35) оба гейта **красные**:
- №3 `learning_v2_release_parity_gate`: CONTENT_MISMATCH ×188, рабочее дерево контента Codex;
- №4 `learning_v2_audio_coverage_gate`: `ОТКАЗ (zero_released_sessions)`, manifest 186, buildable 56, ceiling 0.

Гейт №4 красный **именно потому**, что считает: «V2 входит в стор-сборку, а выпущено 0». Для плана Б это штатное состояние.
Гейты запускаются **в двух местах**, менять нужно оба:
- `scripts/release_precheck.mjs` — локально, перед сборкой;
- `package.json` → `eas-build-post-install` — на сервере EAS после загрузки архива. Без правки здесь сборка сгорит на сервере.

### Предлагаемая правка (НЕ применена)

- Режим включается переменной `PHRASEMAN_R1_HIDE_V2=1`.
- Гейты №3 и №4 становятся «НЕПРИМЕНИМО» только если V2 **действительно** скрыт: потолок в generated-файле равен 0. Это проверяется, а не принимается на веру.
- Если переменная стоит, а потолок больше 0 — громкий ОТКАЗ: «план Б заявлен, но V2 в бандле».

Новый файл `scripts/learning_v2_plan_b_gates.mjs`:

```js
#!/usr/bin/env node
// зачем (план Б R1, владелец 13.10 11:00): при скрытом V2 гейты №3/№4 неприменимы; скрытость проверяем по потолку бандла.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const TAG = '[V2-PLAN-B]';
const hide = process.env.PHRASEMAN_R1_HIDE_V2 === '1';
const src = readFileSync(new URL('../app/learning_v2_bundle_availability_v1.generated.ts', import.meta.url), 'utf8');
const ceiling = Number(/LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = (\d+)/.exec(src)?.[1] ?? NaN);
if (hide) {
  if (ceiling !== 0) { console.error(`${TAG} ОТКАЗ: план Б заявлен, но в бандле выпущено занятий подряд: ${ceiling}`); process.exit(1); }
  console.log(`${TAG} НЕПРИМЕНИМО: V2 скрыт (потолок 0) — гейты №3 (выпуск = исходник) и №4 (озвучка) не запускаются`);
  process.exit(0);
}
for (const script of ['scripts/learning_v2_release_parity_gate.mjs', 'scripts/learning_v2_audio_coverage_gate.mjs']) {
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`${TAG} гейт упал: ${script} (код ${r.status})`); process.exit(r.status ?? 1); }
}
console.log(`${TAG} гейты №3/№4 зелёные (V2 в выпуске, потолок ${ceiling})`);
```

`scripts/release_precheck.mjs` — две строки гейтов №3/№4 заменить одной:

```js
{ name: 'Learning V2: выпуск = исходник и озвучка (или НЕПРИМЕНИМО при плане Б)', script: 'scripts/learning_v2_plan_b_gates.mjs', env: {} },
```

`package.json` → `eas-build-post-install` — заменить:

- было: `npm run learning-v2:release-parity-gate && node scripts/learning_v2_audio_coverage_gate.mjs`
- стало: `node scripts/learning_v2_plan_b_gates.mjs`

`eas.json` → `build.production.env` — добавить `"PHRASEMAN_R1_HIDE_V2": "1"`. Precheck читает env production-профиля только для гейта версий, поэтому перед локальным precheck переменную ставить и в оболочке.

Без `PHRASEMAN_R1_HIDE_V2` поведение прежнее: оба гейта запускаются и красные красны. Внедрить обёртку можно заранее, до 15.10, — это безопасно. Сам режим включается только переменной.

## 4. Применение 15.10 12:00, если гейты №3/№4 не зелёные

```bash
grep -n "LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 =" app/learning_v2_bundle_availability_v1.generated.ts
```
Ожидается `= 0`. Если больше 0 — Codex перегенерировал, нужно решение координатора: вернуть 0 или включать V2.

1. Внести патч раздела 1 (startLessonsPage) и правки раздела 3 — в окно кода :00–:05 / :30–:35, через `safe_commit.sh`.
2. Добавить `"PHRASEMAN_R1_HIDE_V2": "1"` в `eas.json` → `build.production.env`.
3. Проверка:

```bash
PHRASEMAN_R1_HIDE_V2=1 npm run release:precheck
```

Ожидается строка `[V2-PLAN-B] НЕПРИМЕНИМО: V2 скрыт (потолок 0)` и отсутствие отказа по Learning V2.

## 5. Проверка

- **Код:** потолок 0; в стор-режиме `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = false`, лог `[LESSONS-TABS] вход: … v2Доступен=false → старт=lessons`.
- **Стор-сборка на эмуляторе.** На вкладке «Уроки» нет кнопки «V2». Чип «Новые уроки» показывает надпись «закрыто».
- **Ссылка на V2.** `phraseman://learning-v2/course` открывает «Уроки», а не V2. Это работает только после патча раздела 1.
- **Precheck.** Строка НЕПРИМЕНИМО. Отдельный тест: при `PHRASEMAN_R1_HIDE_V2=1` и потолке 1 обёртка должна дать ОТКАЗ.

## 6. Откат и включение V2 позже

1. Убрать `PHRASEMAN_R1_HIDE_V2` из `eas.json`. Обёртку оставить: без переменной она просто запускает оба гейта.
2. Codex: занятия озвучены и выпущены, потолок перегенерирован (больше 0), гейты №3 и №4 зелёные.
3. Патч раздела 1 можно оставить: при потолке больше 0 он ничего не меняет.
4. Доставка — EAS Update (OTA) по каналу production или следующая стор-сборка.

Хранилища, облако и данные пользователей план Б не трогает. Прогресс V2 у тех, кто проходил его в dev-сборках, остаётся на месте.
