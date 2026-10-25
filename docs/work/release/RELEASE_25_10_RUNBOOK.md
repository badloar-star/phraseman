# RUNBOOK релиза 25.10.2026 — сборка в сторы к 15:00

Status: Готово к утру (9 · САЙТ, по поручению координатора 24.10). Ничего наружу не выполнялось — только подготовка.
Источники: `eas.json`, `app.json`, `scripts/eas_production_version_gate.mjs`, `docs/phraseman-2.0/RELEASE_BUILD_E4.md`,
`docs/work/OWNER_DECISIONS_2026-10-21.md` (сборки 142/143), `docs/work/tasks/core-release-and-reports-2026-10-24.md` (флаги, ветка),
`docs/work/tasks/ota-coin-queue-patch-2026-10-22.md` (снимок, `EAS_NO_VCS`), `docs/work/release/WHATS_NEW_2026-10-25.md`.

---

## 1. Что сейчас в сторах и какие номера ставить

| Где | Сейчас | Откуда известно |
|---|---|---|
| Google Play | ⚠ **Исправлено 26.10 (Ядро):** 142 в Play **нет** — автоотправка 21.10 (build 8b987540, submission f1056edc) ERRORED; 2.0.2 (144) тоже не загружен: `eas submit android` → 403 PERMISSION_DENIED (EAS_GOOGLE_PLAY_PERMISSION_DENIED). Ключ отправки — Firebase Admin SDK, прав в Play Console у него нет. **Что сейчас в Play — версия старше 142; номер смотрит владелец в Play Console.** Прежняя запись «2.0.0 (142), production» была неверной. | OWNER_DECISIONS_2026-10-21 стр. 1979–1988, 2136; NIGHT_BACKLOG_2026-10-26 стр. 202, 224–225 |
| App Store | iOS 142 отклонён Apple 22.10 (ITMS-90186/90062: «поезд» 2.0.0 закрыт). **iOS 2.0.1 (143)** собран из того же JS 108b37562 и отправлен | там же стр. 406; MORNING_QUESTIONS_2026-10-22 Q44 |
| `app.json` на HEAD | `version 2.0.1`, `android.versionCode 143`, `ios.buildNumber "143"`, **`runtimeVersion 2.0.0`** | `app.json:6,12,46,95` (коммит номера e6fc0317e) |

**Предлагаемые номера билда 25.10 (решает 1 · ЯДРО, утверждает координатор):**

| Поле | Значение | Почему |
|---|---|---|
| `expo.version` | **2.0.2** | iOS 2.0.1 уже отправлен; если Apple его одобрит раньше, новая сборка с тем же 2.0.1 будет отклонена (ITMS-90062, как 22.10). 2.0.2 безопасен при любом исходе ревью 143. Android versionName = та же строка. |
| `expo.android.versionCode` | **144** | > 142 (последний собранный для Android; в Play он не дошёл — см. строку Google Play выше, 144 всё равно больше любой версии в Play); гейт требует рост против прошлого снимка (`eas_production_version_gate.mjs:187`). 143 для Android не собирался, но в `app.json` уже стоит — берём следующий. |
| `expo.ios.buildNumber` | **"144"** | > 143; сторож равенства `versionCode == buildNumber` (коммит e6fc0317e). |
| `expo.runtimeVersion` | **2.0.2** ⚠ | 🔴 Сейчас 2.0.0 у ВСЕХ сборок 139–143. Канал OTA `production` + runtime 2.0.0 = заплатки «по воздуху» на базе 108b37562 (Q44, папка ota_patch_108b37562) прилетят и в новую сборку и **откатят её JS на код 18–22.10**. Новый JS → новая runtimeVersion. Цена: старые OTA для 2.0.0 новую сборку не трогают (это и нужно). |

**Где ещё должно совпасть:**
- `app.json` — единственный источник (в `app.config.js` версии/runtime не переопределяются — проверено поиском).
- `package.json` `"version": "1.5.53"` — на сборку не влияет, не трогать.
- Гейт `release:precheck` (`--bump` предложит номера сам, если разошлись) и `eas_production_version_gate.mjs` на сервере EAS.
- «Что нового» в сторе — номер не упоминает, менять не нужно.

---

## 2. Что проверить ДО сборки (чек-лист, ~25 мин)

| # | Проверка | Кто | Как | Время |
|---|---|---|---|---|
| 1 | **Флаги релиза** по таблице Ядра (`core-release-and-reports-2026-10-24.md`, раздел «флаги релиза 25.10»): сцены Главной/«Сегодня», «Сезон», «Слова» (вход через «Сезон»), башня Пика — по вердикту Сверки; «Вместе»/друзья и «Не хочу с начала» — **false** | 1 · ЯДРО, коммит «release flags 25.10» в 08:00 | `components/home/v2/scene/home_scene_flag.ts:10`, `components/learning-v2/season/season_flags.ts:17,21`, `components/spire/scene/spire_scene_flag.ts:10`, `app/friends_together/together_config.ts:73` | 10 мин |
| 2 | **«Что нового»** — вариант по флагам: все сцены включены → **B**; какой-то экран остался выключен → строку убирает 9 · САЙТ (A — если не включили ничего). Переводы 9 языков — 10 · ПЕРЕВОДЧИК, ≤ 500 знаков | 9 · САЙТ / Переводчик | `docs/work/release/WHATS_NEW_2026-10-25.md` | 5 мин |
| 3 | **Политика** покрывает всё, что собирает билд: выложена `90c13ffa8` (дата 24.10): друзья §5 (итог недели, фраза дня, маски курса), §20 дуэли, ИИ, RevenueCat, пуши. Если «Вместе» остаётся выключен — абзацы друзей уже публичны, это не мешает | координатор | knowlyapps.com/legal/privacy/ = HEAD (сверка 9 · САЙТ 24.10) | 2 мин |
| 4 | **Типы и тесты** на HEAD (приложение + functions) | 1 · ЯДРО | `npx tsc --noEmit`, `npm --prefix functions run build`, точечные тесты релизных зон | 15 мин |
| 5 | **Локальный гейт** | 1 · ЯДРО | `EXPO_PUBLIC_STORE_RELEASE=1 npm run release:precheck` (паритет макетов строгий; обход — только `PARITY_GATE_WAIVER` с датой и причиной, решение владельца) | 5 мин |
| 6 | **Секреты EAS production** на месте (RC ключи, Google client, Apple service) и **нет** `EXPO_PUBLIC_ENABLE_DEV_TOOLS` | 1 · ЯДРО | `eas env:list --environment production` | 2 мин |
| 7 | **Номера** — раздел 1, отдельным коммитом «release 2.0.2 (144)» | 1 · ЯДРО | правка `app.json` (4 поля) → `release:precheck` зелёный | 5 мин |

---

## 3. Порядок утра 25.10 (кто, что, сколько)

| Время | Шаг | Кто | Детали |
|---|---|---|---|
| 07:00 | Код и фиксы в ветке `feature/referral-roulette` — срез | все сессии → координатор | После 07:00 в ветку только релизные правки по слову координатора |
| 08:00 | Вердикт Сверки → коммит флагов | Сверка → 1 · ЯДРО | По таблице флагов |
| 08:15 | Чек-лист раздела 2 (п. 4–7) | 1 · ЯДРО | ~30 мин |
| 08:45 | **Кнопка владельца №1: серверный пакет** | владелец → координатор | functions по `DEPLOY_NOW.md` (адресно, из `git archive HEAD`, без `--force`), `hosting:admin`; сайт с политикой уже выложен. Сервер — **до** сборки: новая сборка зовёт новые функции |
| 09:15 | Проверка сервера после выкладки | 1 · ЯДРО | журналы функций 10 мин, ключевые вызовы 200 |
| 09:30 | **Кнопка владельца №2: сборка** | владелец → 1 · ЯДРО | снимок + EAS (раздел 4). Облако 20–40 мин |
| 10:15 | Сборки FINISHED → автоотправка | 1 · ЯДРО | `--auto-submit` живёт, пока жив CLI (урок сборки 130): окно не закрывать; при падении CLI — ручной `eas submit` по id сборки |
| 10:30 | Проверка на устройстве | Сверка / 6 · СВЕРКА | установить из internal/TestFlight, пройти DEVICE_CHECKLIST_R1_AFTER_BUILD.md (вход, урок, Диалоги, Карточки, покупка тест) |
| 11:30 | **Кнопка владельца №3: магазины** | владелец | Play Console: релиз production (по умолчанию `releaseStatus=completed` — сразу всем; поэтапный — решить заранее). App Store Connect: выбрать сборку 2.0.2 (144), вставить «Что нового», **Submit for Review** — делает владелец в браузере (вход Apple — только он) |
| до 15:00 | «В сторах» = Android доступен в Play, iOS отправлен на ревью | — | Ревью Apple — часы–сутки, от нас не зависит |

---

## 4. Точные команды сборки и отправки (как 142/143)

Сборка 142/143 шла из **снимка HEAD** через `git archive` и `EAS_NO_VCS=1` (дерево общее, в нём тысячи чужих незакоммиченных файлов Codex — их в сборку брать нельзя; `requireCommit: true` при этом не мешает). Папка снимка — во временной папке, не worktree.

```bash
FULL=$(git rev-parse HEAD)
git -c core.autocrlf=false archive "$FULL" | tar -x -C C:/Temp/claude/release_2_0_2
```

```bash
cd C:/Temp/claude/release_2_0_2 && npm ci --include=dev
```

```bash
cd C:/Temp/claude/release_2_0_2 && EAS_NO_VCS=1 eas build --platform all --profile production --auto-submit
```

- Профиль `production`: `EXPO_PUBLIC_STORE_RELEASE=1`, канал `production`, окружение `production`, `autoIncrement: false` (номера — только из `app.json`).
- Отправка: Android → трек **production** (`eas.json` submit.production.android.track); iOS → App Store Connect `ascAppId 6764800879`.
- Если `--auto-submit` не отработал:

```bash
eas submit --platform android --profile production --id <ANDROID_BUILD_ID>
```

```bash
eas submit --platform ios --profile production --id <IOS_BUILD_ID>
```

- Тяжёлые шаги (`npm ci`, `eas build`) — через слот: `bash .claude/semaphore/slot.sh run "релиз 2.0.2" -- …`.

---

## 5. Риски и решения до утра (к координатору)

1. 🔴 **runtimeVersion** — оставить 2.0.0 нельзя (раздел 1): иначе заплатки OTA для 108b37562 откатят новую сборку. Решение: 2.0.2 вместе с версией.
2. 🟡 **Play `releaseStatus`** — по умолчанию сразу 100 %. Если хотим поэтапно (например 20 %) — `releaseStatus: "inProgress"` + `rollout` в `eas.json` submit.production.android до сборки, либо руками в Play Console после.
3. 🟡 **Ревью iOS 143 (2.0.1)** ещё может висеть в App Store Connect — перед отправкой 144 снять 143 с ревью («Remove from Review»), иначе ASC не даст отправить вторую версию.
4. 🟡 **Размер бандла** — dev-бандл 236 МБ (OOM на эмуляторе); релизный размер и рост против 143 — отчёт 9 · САЙТ (`docs/work/release/BUNDLE_SIZE_2026-10-24.md`). Если релизный JS вырос в разы — риск холодного старта, решение до кнопки №2.
5. 🟡 **Фраза «в сторах к 15:00»** — для iOS реалистично «отправлен на ревью»; доступность зависит от Apple.
