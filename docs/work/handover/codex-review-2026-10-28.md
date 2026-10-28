# Записка для Codex: ревизия ветки feature/referral-roulette с 26.10 10:50 по 28.10 (Ревизор)

Проверено: 161 коммит (155 — контент es/en) и незакоммиченные изменения рабочего дерева (энергия, воронка пейвола,
`app/(tabs)/_layout.tsx`, `tabs_hidden_route_redirect`, `speaking*`, `mistakes*`, `functions/src/premium_status.ts`, `firestore.rules`).
Ревизор код не правил. Ниже — что исправить, где и как. Номера строк — на момент 28.10 вечером.

Авто-скан чистый: новых литералов цветов, чтений Firestore, немых `catch {}`, сырого текста в JSX нет. Отдельный прогресс испанского
(82cfea233) безопасен: ключи английского не изменились, es получает суффикс `:target:es`.

## 🔴 Требует вмешательства

### 1. `community_plus_until_ms` — выкладывать правила и функции одним пакетом, правила первыми
- `functions/src/premium_status.ts` (незакоммичено) теперь считает Plus по `progress.community_plus_until_ms` в трёх местах.
- Запрет клиенту писать это поле есть ТОЛЬКО в незакоммиченном `firestore.rules:459` (`blockedPremiumProgressKeys`).
- Если функции уйдут на сервер раньше правил, любой пользователь запишет себе `community_plus_until_ms` в свой `progress` и получит Plus.
- **Исправление:** закоммитить `firestore.rules` и `functions/src/premium_status.ts` (+ `functions/src/community_month_*`,
  `access_projection.ts`) одним коммитом. Выкладка: `firebase deploy --only firestore:rules` → проверка → `--only functions:...`.
  Только по «да» владельца. В тесте правил (`functions/src/community_contest_rules.emulator.test.ts`) — случай «владелец документа
  пишет `community_plus_until_ms` → отказ».

### 2. Энергия и месячный лимит — решение владельца есть, старые комментарии надо убрать
- Владелец согласовал в чате Codex 28.10 13:05: энергия 5, +1 за 30 минут, месячного лимита тренировок нет. Замок с этим значением добавил
  Ревизор: `docs/work/OWNER_LOCKS.md` (строка 28.10) и сторож `tests/owner_locks_energy_30min_no_month_cap_2026_10_28.test.ts`.
- **Сторож пока выключен** (`describe.skip` через `CODEX_ENERGY_COMMITTED = false` в начале теста): он зелёный только с твоими
  незакоммиченными правками (`app/energy_contract.ts:36`, `app/monthly_training_sessions.ts:11`, `:168`), на HEAD был бы красным.
  **Закоммить эти правки и в том же коммите поставь `CODEX_ENERGY_COMMITTED = true`** — сторож включится.
- **Исправление (файлы твои):** в `app/energy_contract.ts` (шапка и комментарии строк ~1–35, где «D06/D07», «BIBLE +1 за 10 минут»,
  «PM-083») и в `app/energy_system.ts` заменить ссылки на старое правило на «замок владельца 28.10: +1 за 30 минут». Иначе следующая
  сессия «починит» обратно по комментарию.
- Сервер: проверить, что серверная проверка энергии и лимита тренировок (если есть в `functions/src`) не держит старые 10 минут /
  лимит 30 — иначе телефон и сервер разойдутся.

### 3. Политика конфиденциальности: Cloudflare (озвучка Learning V2)
- b9773b2ca: запросы озвучки идут на Cloudflare Worker `https://phraseman-learning-audio.badloar.workers.dev`
  (`modules/learning-v2/audio/progressive_audio_runtime.ts:952`, запрос с `Authorization: Firebase <ID-токен>` — `:1014`).
  Воркер проверяет токен по ключам Google и не пишет его в журнал (`workers/learning-v2-audio/src/index.mjs`) — это правильно.
- В `knowly-www/legal/privacy/index.html` и `knowly-www/legal/privacy-ios/index.html` слова Cloudflare нет. **Добавить абзац ниже до
  релиза, в котором R2 включён.** Файлы политики Ревизор не правил.
- Включение R2: `EXPO_PUBLIC_LEARNING_V2_AUDIO_R2_ENABLED=1` и `..._R2_ORIGIN` есть только в локальном `.env.local`; в `eas.json`
  (профиль production) их нет. Облачная сборка EAS `.env.local` не читает. Проверить переменные окружения EAS на сервере:
  `eas env:list --environment production` (у Ревизора команда не прошла — нет входа в EAS). Если их там нет — в сборке из магазина R2
  выключен и аудио идёт прежним путём (Firebase Storage); тогда абзац политики можно добавить вместе с включением.

Готовый абзац (английский — язык текущей политики; вставить в раздел о сторонних сервисах / обработчиках):

> **Audio delivery (Cloudflare).** Lesson audio for the Learning course is delivered through Cloudflare (Cloudflare, Inc.), which hosts
> our audio files and serves them to the app. When the app downloads an audio file, Cloudflare receives your device's IP address and a
> sign-in token that identifies your PhraseMan account, so that only signed-in users can download course audio. We use this information
> only to deliver the audio. We do not store your IP address or the token, and they are not used for advertising or analytics. Cloudflare
> processes this data as our service provider under its own privacy policy: https://www.cloudflare.com/privacypolicy/

По-русски для владельца: «Озвучка уроков приходит через Cloudflare. При загрузке аудио Cloudflare получает IP-адрес устройства и токен
входа, по которому видно аккаунт, — чтобы аудио скачивали только вошедшие пользователи. Используем только для выдачи аудио, не храним,
для рекламы и аналитики не используем».

## 🟡 Стоит улучшить

### 4. `app/paywall_purchase.ts` — ветка «иначе» с журналом
- После правки (незакоммичено, ~строки 1375–1390) `purchase_completed` пишется только при `periodType` NORMAL / INTRO, `trial_started` —
  при TRIAL, берётся из `customerInfo.entitlements.active.premium`. Если entitlement ещё не пришёл (или другой periodType, например
  PREPAID) — покупка не попадёт ни в одно событие аналитики, тихо.
- **Исправление:** после двух `if` добавить `else`:
  `DebugLogger.error('paywall_purchase:period_unknown', new Error('confirmed purchase without known periodType'), 'warning')` и
  `logPaywallFunnel('purchase_completed', { …, periodType: confirmedPeriod || 'unknown' })` (или отдельный шаг) — чтобы покупка не терялась.
  Тест: entitlement без `periodType` → событие и строка журнала есть.

### 5. Правила раньше OTA для новых полей воронки
- `app/paywall_funnel.ts` (незакоммичено) пишет `schemaVersion`, `impressionId`, `transactionHash`, шаги `store_confirmed`, `access_applied`.
  Разрешены они только в незакоммиченном `firestore.rules` (~2256–2272).
- Если OTA с новой воронкой уйдёт раньше правил — запись отклоняется (ошибка ловится и пишется в журнал, покупку не ломает, но
  аналитика воронки пропадёт).
- **Исправление:** правила выкладывать до публикации OTA; в чек-листе OTA — пункт «правила воронки выложены».

### 6. Сторожа окна экзамена убраны без записи в OWNER_LOCKS
- cab8c99b6: `tests/season_wire_contract.test.ts` (сторож замка) — testID окна экзамена заменены на поля данных;
  `tests/season_modal_bounds_2026_10_25.test.ts` — убраны сторожа iOS-фикса окна (ширина от окна − 48, внешний слой без overflow,
  ватчдог входа 600 мс, журнал `[EPISODE-MODAL]`).
- Обоснование — слово владельца в чате Codex 26.10 (`docs/work/tasks/owner-course-modal-stories-2026-10-26.md`), но в
  `docs/work/OWNER_LOCKS.md` его нет. По правилу замков ослабить сторож можно только по слову владельца, и строка пишется в том же коммите.
- **Исправление:** добавить в `OWNER_LOCKS.md` строку 26.10 с этим словом и новым поведением общего окна; проверить на iPhone, что
  окно не сдвинуто вправо (дефект 25.10, ~40 pt).

### 7. Ленивая загрузка банков экзамена
- `app/learning_v2_chapter_exam_v2.ts` строит карту из `modules/learning-v2/exam/banks/index.ts`, который статически импортирует все
  реестры → при первом открытии экзамена вычисляются все 210 банков (~1,5 МБ исходника).
- **Исправление:** в реестрах — ленивые геттеры по уроку (`() => require('./chapter_exam_v2_lNN_cM')`) или `import()` по ключу
  «урок:глава» в `chapterExamV2BankFor`; загружать только нужную главу. Сторож правил банков (`tests/learning_v2_chapter_exam_v2_banks_rules.test.ts`)
  опирается на `CHAPTER_EXAM_V2_BANKS` — оставить экспорт полного списка для тестов, а приложению отдать ленивый доступ.

### 8. Журнал темы сцены на Пике (от 4 · Темы, коммит e64ced49b)
- `components/spire/scene/SpireScene.tsx` (у тебя незакоммичено): после строки 111
  (`const tokens = useMemo(() => homeSceneTokensForTheme(...))`) добавить:
  `useEffect(() => { logSceneTheme('spire', liquidGlassThemeId, liquidGlassAppearance, 'homeSceneTokensForTheme(max)', { top: tokens.sceneTop, bottom: tokens.sceneBottom, glow: tokens.sceneGlow }); }, [tokens, liquidGlassThemeId, liquidGlassAppearance]);`
  и импорт `import { logSceneTheme } from '../../home/v2/scene/scene_theme_log';`. Зачем: Главная, обложки уроков и приветствие языка
  уже пишут `[SCENE-THEME]`, Пик — нет; без строки нельзя проверить цвета сцены Пика по теме.
- `components/spire/SpireHomeScreen.tsx`, `components/dialogs/DialogueV2PlusTools.tsx` — по проверке Тем хардкода цвета нет, не править.

### 9. Убрать тумблер «Приветственная шторка» из «Пульта» (решение владельца 28.10)
- `admin/v2/legacy.html` (у тебя незакоммичено):
  (а) удалить блок `<label class="pm-setting-row">` «Приветственная шторка» с `input id="onb-flag-welcome"` (≈ строки 15996–16002, под
  «Кнопка "Пропустить"»; на 28.10 вечером `id="onb-flag-welcome-state"` — строка 15999, `input` — 16000);
  (б) удалить строку `renderOnboardingBehaviourFlag('onb-flag-welcome', bools.onboarding_welcome_sheet_enabled);` (≈ 44593).
- Выкладка — только кнопкой владельца: `bash scripts/deploy_from_clean_head.sh --only "hosting:admin"` (сухой прогон), затем то же с `--execute`.
- Проверить, что сам флаг `onboarding_welcome_sheet_enabled` в приложении не завязан на ручное включение из «Пульта» (значение по
  умолчанию в `app/remote_flags.ts` должно давать нужное владельцу поведение без тумблера).

### 10. Пересборка Learning V2 после правок Переводчика (понятные заголовки заданий, ru/uk)
- Коммиты: 20d9b2c21, b66f99a8a, 9674c6928, 644ea69e0, 5483896e7, f4f447667. Таблица правок —
  `docs/voice/placement-test-copy-review-2026-10-28.md`. Правки лежат в исходниках курса; в приложение они попадут только после пересборки.
- По каждому занятию: `node content/learning-v2-course/pipeline/build_release.mjs --session en/lNN/sNN`, затем обычный перенос в
  generated_release (как при выпуске уроков).
- Занятия (урок: номера занятий):
  - l09: 32 34 43 44 45 46 47 49 51 52 53 55 56
  - l10: 09 15 26 39 43 45
  - l13: 09–20
  - l14: 01–08, 17–56
  - l15: 09–16, 38
  - l16: 40
  - l17: 01–08
  - l18: 10–24, 33–56
  - l19: 37
  - l22: 24 30–38 43 44 47 48 49 52
  - l24: 46
- **Сюда же потом добавятся правки Теории по урокам 15–16 и 4** — пересобирать после их коммита одним проходом, чтобы не делать дважды.
- После пересборки: сторожи банков экзамена и «?» (`tests/learning_v2_chapter_exam_v2_banks_rules.test.ts`,
  `tests/owner_locks_exam_episode_words_2026_10_25.test.ts`) — заголовки заданий меняют тексты эпизодов, слова экзаменов должны
  по-прежнему встречаться в эпизодах.

### 11. Истории: новая публикация заменяет живую (от 8 · Моменты)
- `admin/v2/legacy.html` — редактор историй встроен в `srcdoc` как base64.
- Дефект: после публикации `currentId` остаётся id живой истории; следующая «Опубликовать» уходит с тем же id, и сервер ставит новый
  текст на место старой истории (живая история пропадает).
- Фикс — 5 замен скриптом Моментов `scripts/fix_story_editor_new_id_2026_10_28.py` (есть режим `--dry`):
  `python -I scripts/fix_story_editor_new_id_2026_10_28.py admin/v2/legacy.html --dry`, затем без `--dry`.
  Файл у тебя незакоммичен — прогонять на твоей версии, сразу перед коммитом. Ревизор проверяет скрипт (только чтение и `--dry` на копии)
  — статус проверки в журнале координатора.
- Проверка после замены: создать черновик → «Опубликовать» → «Новая история» → «Опубликовать» — в списке ДВЕ живые истории, первая не изменилась.
- Выкладка — кнопкой владельца, **одним деплоем `hosting:admin` вместе с п.9** (тумблер «Приветственная шторка»):
  `bash scripts/deploy_from_clean_head.sh --only "hosting:admin"`, затем то же с `--execute`.

## Кнопка «Уроки» на Главной (жалоба владельца) — для сведения

- Гипотеза про `tabs_hidden_route_redirect` для интерфейса ru/uk скорее неверна: перенаправление срабатывает, только если текущий маршрут —
  скрытая вкладка.
- Главный подозреваемый: плитка (`app/(tabs)/home.tsx:2505`) открывает `/learning-v2/course`, а это с cab8c99b6 пустой экран-перенаправление
  (`app/learning-v2/course.tsx`), который с b9773b2ca ждёт `scheduleAfterRootNavigationReady` (InteractionManager): пока на Главной идёт
  Animated-анимация (пульс подсказки, `home.tsx:1765`, до ~7,5 с), переход стоит. Логи `[HOME-LESSONS-BTN]` уже ставятся — по ним
  видно, застревает ли переход между строками `course_route` и `course_route decide`. Данные переданы Дизайну.
