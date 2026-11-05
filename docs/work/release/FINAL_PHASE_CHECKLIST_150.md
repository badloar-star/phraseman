Governance-ID: TG-599187487F25

# Чек-лист финальной фазы сборки 150 («Ядро», 05.11) — НИЧЕГО НЕ ЗАПУСКАТЬ без слова владельца или 96 % лимита

Номера: 148 и 149 заняты (149 — финальная сборка 2.1.0 в EAS и ASC), свободен **150**. Android — production AAB, в Google Play НЕ отправляется. iOS — загрузка в App Store Connect (TestFlight), **без отправки на ревью**. Подробности ошибок и откатов — `FINAL_BUILD_RUNBOOK_2026-11-05.md`.

## A. Условия старта (все «да»)
- [ ] Слово владельца «собирай» **или** лимит EAS достиг 96 % (правило владельца 05.11, было 90 %; к 94 % обе версии полностью проверены).
- [ ] Ревизор: зелёный вердикт по финальному HEAD, проверка типов (`npm run typecheck`) = 0 ошибок, сторожа Learning V2 / курсов / кошелька зелёные.
- [ ] Эмулятор: «урок 1 проходится» по каждому включённому языку (es/fr/de/it); если какой-то нет — выключить его строкой в `app/courses_gate.ts` (COURSE_LANGUAGE_ENABLED) ДО среза.
- [ ] Сверка: монеты 3/2/1 и +500 новичку подтверждены на 5560 по журналу `[LESSON-COINS]` (pass_decision, answer_awarded, settle_server_result).
- [ ] Флаги: energy_gift выключен, referral_ladder_v2 выключен, rank_gates — как решил владелец; боевой remote config не менять без его слова.
- [ ] Общее дерево: чужие незакоммиченные правки в сборку не попадут (сборка идёт из `git archive` HEAD); убедиться, что все нужные коммиты уже в HEAD (`git log -1`, хэши у координатора).

## B. Сервер: ПОЛНАЯ выкладка всех функций В ТОТ ЖЕ МОМЕНТ, что старт EAS (слово владельца 05.11)
Слово владельца дословно: «как только запускаешь сборки — в тот же момент, не дожидаясь релиза, деплоишь ВСЕ серверные функции сразу». Старт финальной фазы — при 96 % недельного лимита EAS (слово владельца 05.11, ранее 90 %) или по слову «собирай».
**Порядок при старте сборки (слово координатора 06.11): ① политика конфиденциальности на сайт → ② все функции → ③ EAS.** Политика с новым §5 про `plusTier` (Вход, 3af392b08: «другие люди видят метку подписки и её план plus/ultra») публикуется на сайте ДО выкладки функций, пишущих `plusTier` в публичный профиль (`public_profiles`, ответ `friendsGetProfiles`); публикация — `bash scripts/deploy_from_clean_head.sh --only "hosting:knowlywww" [--execute]` (после `npm run legal:sync`, как принято для политики), проверить живую страницу политики на новый §5, и только потом шаг ниже.
**Шаг «сервер» = полная выкладка всех функций из ТОГО ЖЕ чистого HEAD, что и сборка, одновременно со стартом EAS:**
1. Зафиксировать HEAD (`git rev-parse HEAD`) — он же идёт в срез версии и в сборку.
2. Сухой прогон ПЕРЕД стартом (без `--execute`): `bash scripts/deploy_from_clean_head.sh --only "functions:default"` (кодовая база `content` — только поимённо `functions:content:<имя>`, голое «functions» скрипт отклоняет) — должен быть PASS на этом HEAD (сборка, паритет рантайма, `firebase --dry-run`, отчёт `[LIVE-VS-HEAD]`: «на бою без экспорта в HEAD» функции НЕ удаляются).
3. В момент запуска EAS-сборок — тот же HEAD, та же команда с `--execute` (рядом, в соседнем окне; сборки не ждут деплоя, деплой не ждёт релиза).
4. После выкладки: снимок ревизий «до»/«после», логи ERROR за 20 минут, проверка права вызова новых функций (`check_callable_invoker`), запись в `SERVER_DEPLOY_NIGHT_2026-11-05.md`.
Откат: адресная выкладка предыдущего HEAD по списку изменённых функций (прежние ревизии — в `SERVER_DEPLOY_NIGHT_2026-11-05.md`).
Ранее были выложены адресно (не ждать финала): названия наборов из видео (`adminSuggestVideoPackTitle`, `adminSaveVideoPhraseDraft`, `adminPublishVideoPhrases`) — по слову владельца 05.11.

Прежний поштучный порядок (справочно: что именно входит в «все», каждая команда — сначала сухой прогон, потом боевая):
1. `levelSpinStarGrant` (награда +500 за видео, источник `video_full`): `bash scripts/deploy_from_clean_head.sh --only "functions:default:levelSpinStarGrant" [--execute]`. Сухой прогон уже проходил на HEAD ebc1e86ef. Откат: `git revert ebc1e86ef` + та же команда.
2. Остальные серверные функции, ждущие выкладки (по списку координатора, адресно `--only`, не полный деплой): проверить `SERVER_DEPLOY_NIGHT_2026-11-05.md` и `BACKLOG_UNFINISHED_2026-11-05.md` (подарок энергии НЕ экспортирован из `index.ts`, выкладывать не надо).
3. Админка: `hosting:admin` по плану Сайта (отдельный пункт №15), после сервера.
4. Снять старые функции без кода в HEAD (опись `REMOVAL_LISTS_DIALOG_MEMORY_SMART_QUEUE_OLD_FUNCTIONS_2026-11-05.md`) — только отдельным решением владельца; в финальную фазу по умолчанию НЕ входит.
После каждой выкладки: снимок «до» (ревизии Cloud Run) и «после», проверка логов на ERROR за 20 минут, запись в `SERVER_DEPLOY_NIGHT_2026-11-05.md`.

## C. Срез версии 150 (одним коммитом)
```bash
node scripts/release_cut_2_1_0.mjs --code 150 --versions-only          # сухой: покажет изменения
node scripts/release_cut_2_1_0.mjs --apply --versions-only --code 150  # применить (только по слову владельца)
git diff --stat app.json     # version/runtimeVersion 2.1.0, versionCode 150, buildNumber "150"
bash scripts/safe_commit.sh -m <msg> --expect app.json=4/4 -- app.json
```
Метка `RANK_GATES_NEW_USERS_SINCE_MS` не трогается (`--versions-only`). После среза: `RELEASE_CUT=1 node --test tests/rank_gates_since_release*.mjs` и `tests/release_version_consistency_2026_11_05.test.ts` (тестовый прогон через светофор: `npm run test:one -- <файл>`).

## D. Сборки (по очереди, Android первым; светофор)
```bash
bash .claude/semaphore/slot.sh acquire "final EAS android+ios 150"
# Android production AAB (large), в Google Play НЕ отправляется
bash scripts/eas_build_novcs.sh <HEAD_SHA> --platform android > C:/Temp/claude/eas_final150_android.log 2>&1
# iOS production, БЕЗ --auto-submit
bash scripts/eas_build_novcs.sh <HEAD_SHA> --platform ios > C:/Temp/claude/eas_final150_ios.log 2>&1
bash .claude/semaphore/slot.sh release
```
Статус: `cd C:/Temp/claude/eas_novcs_<SHORT_SHA> && EAS_NO_VCS=1 npx eas build:view <BUILD_ID> --json` (FINISHED / ERRORED / IN_QUEUE / CANCELED). Полный идентификатор сборки получать из `eas build:list --json` (короткий хэш не принимается). После 3 неудач на платформе — стоп и рапорт координатору.

## E. iOS в App Store Connect (только после FINISHED, БЕЗ ревью)
```bash
cd C:/Temp/claude/eas_novcs_<SHORT_SHA> && EAS_NO_VCS=1 npx eas submit --platform ios --profile production --id <IOS_BUILD_ID> --non-interactive
```
Результат: сборка 150 в TestFlight (Processing → Ready to Test). «Submit for Review» не нажимать — решает владелец. Перед сабмитом убедиться, что `buildNumber 150` в ASC не занят; «Что нового» — готовый текст 2.1.0 (черновик, без утверждения магазинных материалов не отправлять сверх TestFlight).

## F. После сборок
- [ ] Android AAB 150 скачан только для проверки (Robo/эмулятор) по слову владельца; новая загрузка в Test Lab — в бесплатной квоте.
- [ ] Ссылки на обе сборки, статус, хэш HEAD — одной строкой координатору.
- [ ] Массовая пометка «resolved» в админке (1375 записей app_errors) — ТОЛЬКО после выхода 150 и слова координатора.
- [ ] OTA (`eas update`) — не запускать без слова владельца; переменные STORE_RELEASE=1 и ещё две задавать явно в командной строке (профиль сборки их не передаёт).

## G. Откаты
| Что | Как |
|---|---|
| Серверная функция | `git revert <хэш>` + та же адресная выкладка; прежние ревизии записаны в `SERVER_DEPLOY_NIGHT_2026-11-05.md` |
| Номер сборки занят | поднять `--code` на следующий и повторить срез/сборку |
| Язык курса не проходится | `false` в `COURSE_LANGUAGE_ENABLED` этого языка + новый срез |
| Ошибка кошелька (+500 видео) | вернуть прежнюю функцию `levelSpinStarGrant` (ревизия «до») |
| Ключ remote config (force_new) | `node C:/Temp/claude/adm/set_force_new.cjs --execute --rollback` |

## H. Журнал к поиску при проверке
`[LESSON-COINS]` (монеты), `[COIN-WALLET]` и `[VIDEO-REWARD]` (кошелёк/видео), `[COURSES-GATE]`/`[COURSES-HIDDEN]` (курсы), `[ACCOUNT-DELETE]` (удаление), `[IRREGULAR-VERBS]` (глаголы).
