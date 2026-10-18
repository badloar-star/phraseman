# Передача Codex: Learning V2 (EN-курс) и звук — 18.10.2026

От сессии Claude «Learning V2 сессии: анализ и переписывание». Состояние на HEAD `038112b63` (≈07:00).
Главные правила — в `CLAUDE.md` и `AGENTS.md`; здесь — только что сделано, что лежит где и что дальше.

## 1. Правила владельца для переписывания (закон)

- В каждом занятии ≥ 4 ДЕЙСТВИТЕЛЬНО новых слова (нигде раньше в «**Новые слова:**»), у каждого своя карточка.
- Карточка стоит прямо перед первым заданием с её словом; никогда 4 подряд; никогда перед интро.
- 3 интро = 3 разные конкретные сцены; ответ ✅ каждого интро содержит новое слово этого интро; вопрос сцены ведёт к ответу.
- Без имён — только роли. Тексты не бредовые. Интро 240–290 знаков (RU и UK). Качество только растёт.
- Курс обращается к ученику на «вы» намеренно (КОНСТИТУЦИЯ.md:40) — не менять.
- Полный бриф для исполнителя: `handover-2026-10-18/HELPER_BRIEF.md` (см. п. 4).

## 2. Что сделано

**В приложении (перенесено, звук есть):** уроки 1–4 целиком и урок 5 s01–s32 (256 переписанных занятий).
Переносы: `fd447f448`, `c0363cc4d`, `dec0480de`, `e6ba14612`, `100419e3a`, `c99ea0e2c`; одобрение звука Ядра `31e8cae0f`.
Правка переводов 4 карточек (curtain/crayon/thermometer/nervous) — `701f790c5` (заголовок коммита ошибочный, содержимое верно).

**Только фабрика (канон `content/learning-v2-course/release/en`, БЕЗ переноса в приложение):**
урок 5 s33–s56 и урок 6 целиком (s01–s56). Ключи — в `scripts/learning_v2_transfer_pending.v1.json` (сейчас 80).
Коммиты: `423a12fc7`, `b3eb8ac1e`, `d3c64fd0d`, `37627f6cc`, `d65913875`, `6fb644457`, `b33e3edcc`, `13e33f633`, `8eabca54d`.
Перенос этих занятий в приложение — после релиза (решение координатора); при переносе ключ удаляется из pending.

**Тесты:** 12 устаревших тестов V2 починены и возвращены (фикстуры под 9 локалей, явный `modePayload: null` и т. п.):
`614cb9327`, `8f28a1e98`, `c2dbb8e41`, `498db6d59`. Карантин и классификация 65 красных — `docs/work/test-quarantine-v2-2026-10-18.md`.
Исключения в `package.json → testPathIgnorePatterns` ведёт Дизайн; ему переданы имена 10 вернувшихся тестов.
Два теста «А, переписать» (`learning_v2_factory_native_projection_v1`, `learning_v2_factory_production_audio_contract`)
отложены: в рабочей копии в них лежат ЧУЖИЕ незакоммиченные правки (по признакам — Codex). Разберитесь со своими правками.

## 3. Звук: «бандл + Storage» (слово владельца 18.10 ≈06:15, отменяет D47)

Ядро уже сделало загрузку по сети: `038112b63` (`app/learning_v2_remote_audio_v1.ts`, `app/learning_v2_lesson_audio_pack_v1.ts`):
бандл → кэш → Storage (REST с idToken, точная сверка sha256 и размера) → голос телефона; журнал `[AUDIO-REMOTE]`.

**Перепись Storage (только чтение, 18.10 ~07:00):** из 11 331 слышимой записи, которую может запросить приложение,
в Storage лежит 3171. По набору сборки (4828 файлов): есть 573, НЕТ 4255 (≈129 МБ) — почти весь звук «одного голоса».
- Скрипт: `scripts/check_learning_v2_storage_audio_inventory.mjs` (exists + getMetadata, `--write` обновляет снимок).
- Снимок: `scripts/learning_v2_storage_audio_inventory.v1.json`.
- Правила Storage: `storage.rules:28` — `get` при `request.auth != null` (анонимный вход годится), list/write запрещены.
- Хост `firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/…` проходит проверку `voice_audio_offline_cache_v1.ts:94–105`.
- ⚠️ `scripts/publish_learning_v2_factory_audio_pack.mjs` выкладывает только СТАРЫЙ `factory-production-v1/manifest.json`,
  а не набор. Для выкладки нужен новый выкладчик по списку записей (источники: `assets/audio/learning-v2/authoring-single-voice-v1`
  и `factory-production-v1`). Выкладка в Storage = прод, ТОЛЬКО по слову владельца.

**Не доделано (моя часть по координатору 06:45):**
1. п.1 — `scripts/build_learning_v2_bootstrap_audio_pack.mjs:38`: `BOOTSTRAP_SESSION_COUNT = LAUNCH_SEED_SESSION_COUNT` (5)
   и перегенерация набора/модуля (удалит ≈4800 mp3 из `assets/audio/learning-v2-bootstrap-v1`).
   🔴 НЕ коммитить раньше выкладки недостающих 4255 файлов в Storage — иначе ~88% занятий без записанного звука.
   Массовое удаление файлов роняет Metro (EMFILE) — делать вне Сверки, частями ≤200 через safe_commit.
2. п.4 — строка решения рядом с D47 в `docs/phraseman-2.0/PROGRESS.md` (строка 30): «отменено словом владельца 18.10 ~06:15,
   чат Ревизора: звук из Storage по исходному плану».
3. п.4 — переписать `tests/learning_v2_no_audio_download_guard.test.ts`: сеть разрешена только в `app/learning_v2_remote_audio_v1.ts`
   (хост бакета, `Authorization: Firebase <idToken>`, путь `learning-v2/voice-audio/`), сверка sha256+размера — в
   `prepareLearningV2VoiceAudioOfflineBytesV1` до записи в кэш; в остальных живых файлах V2 — ни `fetch(`, ни `firebasestorage`.
4. Сторож полноты `tests/learning_v2_released_audio_completeness_guard.test.ts` — ПЕРЕПИСАН, НЕ ЗАКОММИЧЕН, НЕ ПРОГОНЯЛСЯ:
   источник записи = сборка ИЛИ снимок Storage; первые 5 занятий — только из сборки. Пока выкладки нет, он будет красным
   («нет ни в сборке, ни в Storage») — это честный блокер, не ослаблять. `scripts/learning_v2_audio_coverage_gate.mjs`
   лишь запускает этот тест — поправить только комментарии.

## 4. Уроки 7–8: черновики вне репозитория

Пока шла Сверка, в репо нельзя было массово писать. Черновики лежат в
`C:\Users\badlo\Documents\Codex\2026-10-15\c-appsprojects-phraseman-en-learning-v2\handover-2026-10-18\`:
- `stage/en/l07/s01..s56` — урок 7 переписан ЦЕЛИКОМ (только `final.ru.md`/`final.uk.md`, карточки расставлены).
- `stage/en/l08/s01..s05` — готовы; `s06..s56` — исходные (по 0–1 слову); `s50..s56` надо написать заново (черновик Codex
  удалён 17.10, бэкап `C:/Temp/claude/codex_drafts_backup/en_l08_s50_2026-10-16/`).
- `stage_fixlist.md` — известные правки перед переносом (редкие слова в l07 s17–24, kebab→kebabs, «our grandmother», короткие UK-интро и т. д.).
- `reserved_words.txt` — общий резерв уже занятых слов; `HELPER_BRIEF.md`, `HELPER_STAGE.md` — брифы исполнителям.
- `tools/` — рабочие скрипты (в них зашит путь старого scratchpad `C:/Temp/claude/.../scratchpad` — поправить переменную `S`/`SP`).
  `qa_words.mjs` понимает `QA_STAGE=<папка>`, `place_cards.mjs` — `PC_ROOT=<папка>`.

**Перенос черновика в репо (на занятие):** скопировать `final.*.md` в `content/learning-v2-course/sessions/en/lNN/sNN/` →
`node <tools>/sync-session.mjs lNN sNN` → `node content/learning-v2-course/pipeline/check.mjs en/lNN/sNN` (ожидаем только
FIX [plan] «не совпадают с пакетом») → `node content/learning-v2-course/pipeline/build_release.mjs --session en/lNN/sNN`
(«готово: 21 заданий, ru+uk») → коммит фабрики: ключ в `transfer_pending`, ворота паритета на «HEAD + мои пути»
(`tools/factory_commit.sh lNN first last "<причина>"` делает всё это).

**Замечено:** к уроку 7 в «Новых словах» курса нет базовых go/take/money/house/family — фразы приходится строить в обход.
Вопрос владельцу через координатора.

## 5. Рабочие правила, о которые уже обжигались

- Одна ветка, без worktree и `git stash`. Коммиты только `scripts/safe_commit.sh` (dry-run → `--expect`), частями ≤200 путей.
  Пути кода (`app/`, `modules/`) — только в окна :00/:15/:30/:45 +5 мин (`--wait-window`).
- jest/tsc — только через `bash .claude/semaphore/slot.sh run --wait=3600 "…" -- …` и `--maxWorkers=1`; слот не держать долго,
  в очереди к выпуску могут ждать другие (журнал WAIT очередь не показывает).
- Перед каждым коммитом в release/: ворота паритета; перед коммитом таблицы голосов —
  `node scripts/check_learning_v2_single_voice_committed.mjs`.
- Тишина = пик < −45 дБ (не размер файла). Сервис озвучки иногда отдаёт тишину — гонять silence_guard после генерации.
- `python -` не запускать (виснет). OneDrive не трогать. Правки, задевающие звук или одобрение, — сначала координатору.
- Незакоммичено у меня: `scripts/check_learning_v2_storage_audio_inventory.mjs`, `scripts/learning_v2_storage_audio_inventory.v1.json`
  (коммитятся вместе с этим документом) и `tests/learning_v2_released_audio_completeness_guard.test.ts` (НЕ коммичу — см. п. 3.4).
