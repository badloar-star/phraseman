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
  - l12: 49–56 (Теория)
  - l13: 09–20 (Переводчик; занятия из коммитов Теории bcad9b712, 9ed4b6cd8, bfc45f3a4 — те же 09–20)
  - l14: 01–08, 17–56 (Переводчик; занятия Теории из тех же коммитов — 01–08, 17–24 — входят в этот список)
  - Озвучка для этих правок не нужна (меняются тексты заданий, не фразы).
  - l15: 09–16, 38 (Переводчик) + 25–30, 32–56 (Теория) → итого 09–16, 25–30, 32–56
  - l16: 40 (Переводчик) + 33–56 (Теория) → итого 33–56
  - l17: 01–08
  - l18: 10–24, 33–56
  - l19: 37
  - l22: 24 30–38 43 44 47 48 49 52
  - l24: 46
- **Правки Теории (убран второй верный вариант в заданиях) — уже в списке**, коммиты 86b8ee9f7 (урок 4), 7bbc862c1 (урок 15),
  65a41049b (урок 16):
  - l04: 23, 53
  - l15, l16 — объединены со списком Переводчика выше.
  Всё пересобрать **одним проходом** вместе с правками Переводчика.
- **Волна 28.10 вечер (сигнал координатора — пересобирать одним проходом, когда Теория закроет текущую волну):**
  - **Урок 6 — все занятия 01–56** (6fef6ad10: сцены Present Simple стали привычками) + **переозвучка 195 клипов** по
    `docs/work/tasks/l06-habits-revoice-2026-10-28.md` и отдельно `s37:i03` (buys).
  - **Заголовки заданий без грамматических терминов** (Теория: e3abb3fbb, 21cf9dba4, d5e1c1f04, 952182a43, dbde350b4, 64a2c73e6,
    7dfc5a520, 118582166, 6fe6d6448, 9604bf551, 5caf70db7, 1e4bf577b, 5e638c5dd, e211eef53, fb2a10f20) — занятия по урокам:
    l01: 03 · l02: 01 · l09: 09, 27, 36, 38–41, 43, 47–50, 52, 54–55 · l10: 02, 04–06, 08, 10, 12, 14, 16–17, 20–24, 31, 33–34, 36–39,
    41, 43–48, 52, 55 · l11: 09 · l15: 25–56 · l16: 33–56 · l17: 01–16 · l18: 01–08 · l22: 01–12, 17–20 · l23: 01–56 ·
    l25: 02, 04–06, 08, 14–18, 21–24, 27, 33, 35–36, 38, 40–42, 44, 48 · l26: 01, 03–04, 06, 09 · l31: 09, 25–32, 41–48 ·
    l32: 01–08, 10–24, 26–32, 34–56. Озвучка для заголовков не нужна.
  - Переводчик 27bac104d (уроки 15 и 17, перепутанные заголовки): l15: 28, 36–38, 51–53, 55 · l17: 01, 02, 04, 06, 07 — все уже
    входят в списки выше (l15: 25–56, l17: 01–16). Переводчик по уроку 32 — 89803330d, e16062d9e («без рода»: «я помыл» → «вы помыли», заголовки и вступления, 94 файла):
    занятия 02, 05–08, 11–16, 18–24, 26–32, 34–53, 55, 56 — все входят в список l32 выше.
    ⚠️ **Урок 32 не пересобирать, пока Переводчик / координатор не решат:** после правки перевод английской фразы с «I» стал от «вы»
    (96 строк в 94 файлах; напр. l32/s02: «The coat I wore is in the car — пальто, которое вы носили»; l32/s05: «The sandwich I made — бутерброд,
    который вы приготовили»). Перевод после тире больше не совпадает по лицу с английской фразой — ученик видит «I» = «вы».
    Род можно убрать, не меняя лица (например, «пальто, в котором я был(а)», «бутерброд, который я сделал(а)» или переформулировать).
  - Дальше придут партии Теории по разборам и интро — их тоже в этот проход.
  - Итоговый список занятий = объединение всех строк этого пункта (повторы между Переводчиком и Теорией собираются один раз).
- После пересборки: сторожи банков экзамена и «?» (`tests/learning_v2_chapter_exam_v2_banks_rules.test.ts`,
  `tests/owner_locks_exam_episode_words_2026_10_25.test.ts`) — заголовки заданий меняют тексты эпизодов, слова экзаменов должны
  по-прежнему встречаться в эпизодах.

### 11. Истории: новая публикация заменяет живую (от 8 · Моменты)
- `admin/v2/legacy.html` — редактор историй встроен в `srcdoc` как base64.
- Дефект: после публикации `currentId` остаётся id живой истории; следующая «Опубликовать» уходит с тем же id, и сервер ставит новый
  текст на место старой истории (живая история пропадает).
- Фикс — 5 замен скриптом Моментов `scripts/fix_story_editor_new_id_2026_10_28.py` (есть режим `--dry`):
  `python -I scripts/fix_story_editor_new_id_2026_10_28.py admin/v2/legacy.html --dry`, затем без `--dry`.
  Скрипт в репозитории — коммит 17cf2ff84. Файл `legacy.html` у тебя незакоммичен — прогонять на твоей версии, сразу перед коммитом:
  сначала с `--dry`, потом без него. Ревизор проверил скрипт (чтение + `--dry` и применение на копии): все 5 замен находятся по разу,
  меняется только base64 редактора, остальной файл байт-в-байт прежний, повторный запуск отказывает.
- Проверка после замены: создать черновик → «Опубликовать» → «Новая история» → «Опубликовать» — в списке ДВЕ живые истории, первая не изменилась.
- Выкладка — кнопкой владельца, **одним деплоем `hosting:admin` вместе с п.9** (тумблер «Приветственная шторка»):
  `bash scripts/deploy_from_clean_head.sh --only "hosting:admin"`, затем то же с `--execute`.

### 12. Каркас вкладки «Уроки» на первом кадре (от 2 · Дизайн)
- `app/(tabs)/_layout.tsx` (у тебя незакоммичено):
  а) рядом с `SETTINGS_TAB_TITLE` (строка 595) добавить
  `const LESSONS_TAB_TITLE = TABS.find((tab) => tab.key === 'lessons')!.label as Readonly<Record<string, string>>;`
  б) в `LessonsPaneBoundary` (функция с 315, `<DeferredTabScreen key={\`lessons-${privacy.epoch}\`} …>` — строка 405) добавить проп
  `shellTitle={LESSONS_TAB_TITLE}`. Зачем: пока отложенная вкладка грузится, человек видит заголовок, а не пустую панель
  (часть жалобы «кнопка Уроки не работает» — замер Сверки ~8 с пустого экрана).

### 13. Подписи курса на других языках интерфейса (от Learning V2)
- `modules/learning-v2/content/factory_native/factory_native_course_v1.ts:76–87`, `localized()`: сейчас для всех языков, кроме uk, кладётся
  копия ru — человек с en/es/… интерфейсом молча видит русский текст.
  а) один раз на занятие писать `console.warn('[V2-LOCALE-FALLBACK]', { courseSessionId, missing, field })` — какое поле и каких языков нет;
  б) не заполнять en/es/… копией ru: хранить только то, что есть, а выбор по языку интерфейса и запасной вариант — в одном месте показа.
  Сторожа: маршруты V2 уже проверяют язык интерфейса (c2cd8ebc1), так что фолбэк не должен расширить показ на языки без пояснений.

### 14. Красные тесты после b9773b2ca (voice packs) — проверено Ревизором на чистых копиях
- На HEAD (bcad9b712) из 9 названных красные 8: `learning_v2_session_runtime_contract`, `learning_v2_system_tts_only`,
  `learning_v2_episode_exit_resume_contract`, `lesson_exit_sheet_contract`, `season_shared_modal`, `season_wire_contract`,
  `study_speech_locale_contract`, `test_runner_coverage_contract`. `a4_decisions_contract` — зелёный, к правке не относится.
- **Именно b9773b2ca покраснил 2**: `learning_v2_session_runtime_contract` и `learning_v2_system_tts_only` (на b9773b2ca^ оба зелёные) —
  они ищут строки в исходнике плеера `app/learning_v2_direct_session_player_v1.tsx`, которые ты переписал под прогрессивное аудио.
  Исправление: перезакрепить по смыслу (системный голос остаётся запасным путём, выход / возобновление занятия прежние), не ослабляя.
- **Остальные 6 были красными ещё до b9773b2ca.** Сверка на cab8c99b6^ (до переделки модалок курса):
  - `test_runner_coverage_contract` — красный и там: старая поломка, не из этих коммитов;
  - `season_shared_modal.test.tsx` — до cab8c99b6 файла не было; запускать конфигом `jest.rntl.config.cjs` (`npm run test:rntl`);
  - **покраснели между cab8c99b6 и b9773b2ca** (4): `learning_v2_episode_exit_resume_contract`, `lesson_exit_sheet_contract`,
    `season_wire_contract`, `study_speech_locale_contract`. По исходникам, которые они читают, из коммитов кода в этом окне их трогали только
    **82cfea233** (испанский: `lesson_exit_sheet`, `study_speech_locale`, `season_wire`, `episode_resume`) и **cab8c99b6**
    (`season_wire`, выход из занятия). Перезакрепить по смыслу под эти две правки, не ослабляя.

### 15. Достижения Пика: 2 красных в `tests/spire_game_source_contract.test.mjs`
- Файлы — твои новые, не отслеживаются git (созданы 28.10 в 08:54 и 09:02, до возвращения сессий Claude):
  `app/spire/spire_achievement_client.ts`, `app/spire/achievement_catalog.ts`.
- **Красный 1 — «no Firestore listeners or collection scans in the game layer»** (строка теста 158): в
  `app/spire/spire_achievement_client.ts:48` листание `users/{uid}/spire_week_results` через `.orderBy('__name__').limit(50)` со
  `source: 'server'`, повтор раз в 6 ч (`RECHECK_MS`, строка 17). 💸 Каждые 6 ч на активного человека читается ВСЯ история недель —
  через год это ~52 чтения на заход и растёт.
  **Исправление (на выбор):** (а) сервер при закрытии недели обновляет один документ-сводку `users/{uid}/spire_stats/summary` (счётчики
  для достижений) — клиент читает 1 документ; (б) или курсор: на телефоне хранить id последней сверенной недели и читать только новые
  (`startAfter(lastId)`), а сам запрос вынести в вызываемую функцию — тогда слой игры чист. Ослаблять сторож не нужно.
- **Красный 2 — «logs: [SPIRE] prefix everywhere»** (строка теста 215): `app/spire/achievement_catalog.ts` — это 18 строк данных без журнала,
  но лежит в `app/spire/`, где каждый файл обязан содержать `'[SPIRE]'`. **Исправление:** перенести каталог в `app/achievements/` (или
  рядом с `app/achievement_catalog_v2.ts`, его единственный импортёр — строка 2) — каталогу не место в игровом слое.
- В клиенте журнал `[SPIRE-ACHIEVEMENTS]` есть, немого catch нет — ок.

### 16. Флаг «Пожаловаться» в «Моих ошибках» — НЕ твой файл, для сведения
- `app/mistake_practice_session.tsx` закоммичен, у тебя правок в нём нет — правку (убрать `REPORT_ERROR_ENABLED ?` у строки меню
  `mistake-practice-menu-report`, строка 1763; скрытый `<ReportErrorButton>` со строки 1766 → `<ContentReportFlag>` с теми же пропсами +
  импорт) делает 2 · Дизайн сам. Тебе — только не затереть её, если будешь трогать файл.

### 17. Литералы цвета в твоих файлах
- Перепись и таблица «чем заменить» — `docs/work/color-audit-2026-10-28.md` (4 · Темы, b9d3cd7e8): в твоих файлах 11 файлов, 201 литерал.
- Решение владельца: онбординг красить в цвета темы по умолчанию (CleanOnboarding), без своих литералов.
- После замены: `tests/two_theme_static_colors*` и сторожа контраста — зелёные.

### 18. Красные тесты из-за твоих незакоммиченных файлов (по данным Дизайна, файлы проверены — твои)
- `two_theme_static_colors`: `app/flashcards_packs.tsx` и `app/community_packs/CommunityPackSocialBar.tsx` (у тебя изменены, 26.10) —
  литералы цвета → токены темы (см. п.17).
- `reachable_action_buttons`: `components/spire/SpireFloorRecord.tsx` (новый, не отслеживается, 28.10 08:55) — кнопка действия
  недоступна / не дотягивается; привести к правилу сторожа (зона нажатия ≥ 44, не перекрыта).
- Перед коммитом этих файлов прогнать эти два набора.

### 19. Красные тесты Learning V2 из-за твоих коммитов (данные Learning V2, HEAD 18fbf989c) — до сборки 2.0.4
- **82cfea233 (испанский) — 6 наборов:** `season_count_one_rule`, `season_exam_captions_etalon`, `season_exam_card_refresh_on_focus`,
  `season_wire_contract`, `active_course_catalog_client_v1` (ожидал `network`, теперь `bundled_factory`),
  `course_released_session_client_v3` (ожидал `offline`, теперь `learning_v2_factory_session_unavailable`).
- **b9773b2ca (voice packs) — 4 набора:** `learning_v2_session_runtime_contract`, `learning_v2_system_tts_only`,
  `learning_v2_episode_exit_resume_contract`, `season_shared_modal` (в моке expo-router нет `useRootNavigationState`).
  Сверка Ревизора (п.14) уточняет: `episode_exit_resume` красный уже до b9773b2ca — его покраснил 82cfea233 / cab8c99b6.
- **cf3e41b2b (английский курс целиком) — 3 набора:** `task_counts_index` — пересобрать `scripts/build_learning_v2_task_counts.ts`
  (не хватает 285 занятий); `all_ready_tasks_runtime_audit` — `sound_contrast` 1 → 229, перезакрепить; `bundled_session_material` —
  урок 32 теперь с контентом.
- 🔴 **Проверь поведение, а не только ожидание** — `app/learning_v2_course_released_session_client_v3.ts:1165`: для en / es, если занятия
  нет в бандле, сразу `throw learning_v2_factory_session_unavailable` — без сети и без офлайн-копии (LKG). Это безопасно, только если КАЖДОЕ
  выпущенное занятие en / es лежит в бандле. Тест «офлайн → копия» перезакреплён на отказ, а индекс счётчиков не видит 285 занятий —
  убедиться, что в сборке нет занятий, которые откроются «Занятие недоступно». Жалобы «нет доступа ни к одному занятию» (#11) и
  «курс открывается не полностью» (#1, #3) — проверить на этой ветке: журнал `[V2-...]` с `factory_session_unavailable` и id занятия.
- Решение — обновить ожидания там, где поведение задумано, и исправить данные там, где нет (счётчики, недостающие занятия).

### 20. Флажок «Пожаловаться» для всех — в твоих файлах (от 2 · Дизайн)
- Сразу после открывающего `<ReportErrorButton` добавить строку `variant="icon-flag"`:
  1) `app/achievements_screen.tsx:1255` (`screen="achievements"`) — твои незакоммиченные правки (28.10 09:30);
  2) `app/community_pack_create.tsx:1483` (внутри `PackPopoverMenu`) — твои незакоммиченные правки (26.10);
  3) `app/flashcards/FlashcardsCategoryHub.tsx:1159` (футер каталога) — ⚠️ незакоммиченные правки в этом файле от 28.10 18:23, т.е. ПОСЛЕ
     возвращения сессий Claude (Дизайн частично закоммитил файл в fce41edfd в 18:36). Возможно, это правки Дизайна, а не твои —
     координатор уточняет; если файл не твой, правку делает Дизайн.
- Проверка: `tests/content_report_flag_2026_10_28.test.ts`.

## Кнопка «Уроки» на Главной (жалоба владельца) — для сведения

- Гипотеза про `tabs_hidden_route_redirect` для интерфейса ru/uk скорее неверна: перенаправление срабатывает, только если текущий маршрут —
  скрытая вкладка.
- Главный подозреваемый: плитка (`app/(tabs)/home.tsx:2505`) открывает `/learning-v2/course`, а это с cab8c99b6 пустой экран-перенаправление
  (`app/learning-v2/course.tsx`), который с b9773b2ca ждёт `scheduleAfterRootNavigationReady` (InteractionManager): пока на Главной идёт
  Animated-анимация (пульс подсказки, `home.tsx:1765`, до ~7,5 с), переход стоит. Логи `[HOME-LESSONS-BTN]` уже ставятся — по ним
  видно, застревает ли переход между строками `course_route` и `course_route decide`. Данные переданы Дизайну.
