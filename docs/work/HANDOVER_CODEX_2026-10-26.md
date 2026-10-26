# Хендовер для Codex — PhraseMan, 26.10.2026 (утро)

Передаёт координатор Claude-сессий (недельный лимит Claude 95%). Ветка: `feature/referral-roulette`, репозиторий `C:\appsprojects\phraseman`.
Подробные хендоверы по зонам: `docs/work/handover/*.md` (core, design, learning-v2, moments, vhod, revizor, themes, translator, makety).
Полный журнал решений: `docs/work/OWNER_DECISIONS_2026-10-21.md` (низ файла — 26.10).

## 0. Главная цель

**Собрать и отправить в магазины 2.0.3 (build 146)** со всеми правками ниже. Сборку 145 НЕ отправлять на ревью Apple (она уже в App Store Connect, но владелец решил заменить её на 146). Владелец: «исправляй всё и выпускай новую версию».

## 1. Что уже на бою / готово

| Что | Где | Статус |
|---|---|---|
| OTA 2.0.2 `2.0.2-OTA3_from_7116bc581` | EAS production, runtime 2.0.2, group `b11a2cf3-11a8-484c-b456-931c92c040f7` | опубликован 26.10 ~05:40 |
| Сервер, шаг 2 (15 целей) | из `36938fd46`, 05:53–06:00 UTC | выложен, журналы чистые |
| Сервер, шаг 2б (11 функций, вкл. `friendsNudge`, честные тексты пушей) | из `ebe2b465a`, 06:44–06:51 UTC | выложен, журналы чистые |
| Сборка 2.0.3 (145) из `b60fa6ea3` | iOS 4cd4b013 → App Store Connect (submission d41ffcf3), Android 3d0a5f8d (.aab, автоотправка 403) | НЕ отправлять, заменяется на 146 |
| Банки экзамена главы v2 — все 30 уроков × 7 глав (210) | `modules/learning-v2/exam/banks/`, реестры `registry_lNN_lMM.ts`, индекс с ленивой загрузкой (`006024b34`) | все подключены |
| Сторожа банков | `tests/owner_locks_exam_episode_words_2026_10_25.test.ts`, `tests/learning_v2_chapter_exam_v2_banks_rules.test.ts` (вкл. «вопрос без ?» f8d556e71, сторож слов 0ff4b5a25) | 421/421 зелёные |
| Ложная плашка «Нет сети» | `b07d0ca24` + общий помощник `app/net_offline_step.ts` | сделано |
| Экзамен v2 включён по умолчанию | `7403cbae2` | сделано |

## 2. Что должно войти в 146 — статус на момент передачи

Сверь с `docs/work/handover/*.md` — там точные хэши и остатки.

1. **Окна оплаты Plus М включить** — `paywall_m_enabled = true` в `app/remote_flags.ts`, узкий экран «плитки и тарифы столбиком». Проверить денежный путь (покупка, восстановление, промокод, все source из контракта). Зона Дизайна → `handover/design.md`.
2. **Кнопка Plus в Настройках** — в деве Render Error `unknown_paywall_source:settings_plus`, в релизе пейвол молча не открывается. `settings_plus` нет в `PAYWALL_SOURCE_VALUES` (`app/paywall_entry_contract.ts`); литерал есть только в `tests/paywall_purchase_failure_ui_contract.test.ts:325`. Стек: `components/settings/SettingsMessageSlotCard.tsx` → `app/pack_opening.tsx`. → design.md.
3. **Низ пейвола** — «Условия»/«Конфиденциальность» наезжают на плашки «Восстановить»/«Ввести промокод». → design.md.
4. **Убрать окно эпизода** («Эпизод N · Название · ▶ Начать эпизод N» поверх ленты) **и окно «Чему научишься»** (▶, «ЗАНЯТИЕ · ГЛАВА», цель, «N новых слов», «Начать», «Сразу к практике») — целиком. Тап по плитке эпизода → сразу занятие. Все входы (лента, «продолжить» на Главной, после итога). Лог `[EPISODE-OPEN]`. → learning-v2.md.
5. **Банк `chapter_exam_v2_l29_c3`** — незнакомые слова (красный). → learning-v2.md.
6. **Пик всегда загруженный** — первый кадр из локального кэша, сеть фоном, предзагрузка один раз при входе в приложение, без лишних чтений Firestore, скелет только при самом первом входе. Лог `[SPIRE-LOAD]`. Незакоммиченный `components/spire/SpireHomeScreen.tsx` имел ошибки типов (`podiumColumns`/`podiumSkeleton`); `tests/spire_optimistic_ui_r1.test.ts` — мок без `peekSpireWeekLocal`. → moments.md.
7. **4 флага по умолчанию true** (сервер выложен): `dialogue_freeform_translate_enabled`, `account_delete_variant_b_ui_enabled`, `dialogue_coin_intent_host_enabled`, `spire_gold`. В боевом Пульте `spire_gold` уже true с 25.10. → core.md.
8. **«Вместе» для друзей** — `app/friends_together/together_config.ts:73 FRIENDS_TOGETHER_UI_ENABLED = false` → true, если серверные функции «Вместе» выложены (пакет Ревизора 3fa4965ac от 22.10). Если не выложены — точечная выкладка только по «да» владельца. → vhod.md.

## 3. Сборка и отправка 146 (порядок)

1. Все пункты раздела 2 закоммичены, `tsc` приложения 0, сторожа банков 421/421.
2. Номер сборки: `app.json` versionCode/buildNumber 145 → **146** (version/runtime остаются 2.0.3). Отдельный коммит.
3. Ревизор-скрипт: `bash scripts/release_146_check.sh <хэш>` (или как описано в revizor.md) — 🟢 обязателен.
4. Снимок `git archive` этого хэша (LF), `release:precheck` с `PARITY_GATE_WAIVER=owner-2026-10-26:собрать 2.0.3 с красным паритетом макетов, переснять и чинить после выпуска` — waiver только локально, в окружение EAS НЕ класть (владелец разрешил сборку с красным PARITY-GATE).
5. `EAS_NO_VCS=1 eas build --platform all --profile production --non-interactive --no-wait --json` из снимка.
6. iOS: `eas submit --platform ios --profile production --id <id> --non-interactive`. Владелец сам жмёт Submit for Review и вставляет «Что нового».
7. Android: автоотправка падает 403 «The Google service account cannot submit this app» (у `firebase-adminsdk-fbsvc@phraseman-ea0b3` нет прав в Play Console) — отдать владельцу .aab для ручной загрузки, либо он выдаёт права и тогда `eas submit --platform android`.
8. Манифест курса: закоммичен уроки 1–27. Незакоммиченный `modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts` (+ `functions-content/lib/...`, правка 26.10 ~07:13–07:23) — работа фабрики курса (Codex), уроки 28–30. **Codex: если это твоя работа и её гейты зелёные — закоммить до хэша сборки, тогда 146 выйдет с 30 уроками** (банки экзамена 28–30 уже подключены, Ревизор проверяет «банки покрывают все главы манифеста сборки»). Если не готово — 146 с уроками 1–27, а 28–30 → OTA на runtime 2.0.3.

## 4. После 146

- OTA на runtime 2.0.3: скрипты `scripts/ota_from_head.sh` + `scripts/ota_final_check.sh` уже перепривязаны на 2.0.3 (9ea67b6c9, база b60fa6ea3 — после 146 сменить базу на хэш 146).
- Пульт: подпись `def: false` у 4 флагов из п.7 — исправить по слову владельца.
- Кнопка 2 сервера (ротация ключа отписки EMAIL_UNSUBSCRIBE_*) — только по «да» владельца.
- Пересъёмка паритета макетов (351 нарушение, waiver 26.10) — Сверка/эмулятор.
- Нативное, не вошло в 2.0.3: заставка Android цветом темы (план `docs/work/tasks/splash-theme-color-2026-10-25.md`), отзыв Sign in with Apple (код есть, флаг выкл, нужен ключ Apple + строка в политике).
- Пост-OTA список: `docs/work/release/cleanup-after-ota-2026-10-26.md`.
- Вопросы владельцу: `docs/work/owner-morning-2026-10-26.md`.

## 5. Правила проекта (обязательно)

- Работать в основном дереве, одна ветка; **никаких worktree и `git stash`** (заблокированы хуками). Коммитить только свои файлы, через `scripts/safe_commit.sh`.
- Тяжёлые команды (jest/tsc/expo/eas) — через светофор `bash .claude/semaphore/slot.sh run --wait=3600 "<что>" -- <команда>`. Исключение: два сторожа банков с `--runInBand`.
- Серверная выкладка — только точечно (`scripts/deploy_from_clean_head.sh --only ...`), только по «да» владельца. Никакого полного `firebase deploy`. Никаких записей в боевой Firestore без слова владельца.
- Сначала логи, потом починка; немых `catch {}` нет; единый префикс лога на задачу.
- Дизайн: только цвета темы; без толстых рамок; без `adjustsFontSizeToFit`; кнопка «назад» — общий круг 48 в одном месте.
- Optimistic UI: любое действие меняет экран сразу, сеть догоняет; откат при ошибке.
- Чужие незакоммиченные правки не трогать (известные: `components/dialogs/DialogueV2PlusTools.tsx`, `functions/src/account_delete.ts`, ряд `tests/*`, манифест фабрики).
- Замки владельца — `docs/work/OWNER_LOCKS.md`, ослабляет только владелец.
