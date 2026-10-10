# Task packet: вход Google/Apple/гость и удаление аккаунта — двойной тап, откат, логи в каждом catch

Governance-ID: TG-F7EF093C2A25
Governance-ID: TG-4E72AC7F7165 (ожидание окна эмулятора, без правок)
Status: Planned
Owner: сессия «Авторизация» (Account V2), исполнитель Opus
Related epic/enabler: RELEASE_SLICE C (пол релиза 2.0.0 по авторизации), очередь координатора 00:05 п.4

## Outcome
Каждая точка входа (Google, Apple, «Позже»/гость, «У меня уже есть аккаунт») и удаления аккаунта:
1. не запускает вторую операцию при двойном/быстром повторном тапе (замок в процессе, кнопка неактивна/игнорирует, лог `ignored reason=in_flight`);
2. при ошибке возвращает интерфейс в исходное состояние (кнопки снова доступны, состояние не «залипает») и показывает понятную причину, где это положено (отмена пользователем — без окна);
3. в КАЖДОМ `catch` пишет причину с префиксом (`[AUTH-…]`, `[ACC-MUT]`, `[account-delete-ui]`), немых `catch {}` нет.
Итог — таблица «точка → замок / откат / лог» с файлом:строкой в `docs/phraseman-2.0/INBOX_COORDINATOR_FROM_AUTH.md`.

## Scope
In scope (сначала прочитать, править только по найденному факту):
- UI: `components/CleanOnboarding*` (вход/гость), `components/RegistrationPromptModal.tsx`, `components/AuthProviderButtons*`, экран настроек — блок входа/выхода/удаления (`app/settings.tsx` — только свои ханки, файл правят другие сессии), `components/DeleteAccountConfirmModal.tsx`, `app/onboarding_account_switch_confirm.ts`.
- Логика: `app/auth_provider.ts` — функции входа Google/Apple/анонимно, `prepareAccountDeletion`/`finishAccountDeletion`, `signOutAndWipeForAccountSwitch`.
- Тесты: новый `tests/aa_auth_double_tap_contract.test.ts` (поведенческий, где реально — на моках как `tests/aa_guest_server_delete.test.ts`; исходник-сторож только там, где поведенческий невозможен).
Out of scope: сервер (`functions/`), App Check (запломбирован), MAX, тексты/вёрстка (кроме возврата `disabled`), потеря `coin_rank_v1`/`profile_card_pro_v1` при выходе (полоса Ядра).

## Architecture
Без изменения архитектуры: замки — локальные `useRef`-флаги на экране + существующие процессные замки в `auth_provider` (там, где они уже есть). Если замка нет — добавить по образцу `authInFlightRef` (e514aadff) / `switchStageRef`. Инвариант: замок снимается в `finally`, поздний ответ не перетирает свежее состояние.

## Security and privacy
Повторный вход/удаление при двойном тапе — риск двойной постановки удаления и гонки личностей; правка их уменьшает. Новых данных нет. Логи — без токенов, email, uid целиком (только `h:` хеш, как в существующих трассах).

## Technical debt
- Pay now: немые `catch` и отсутствующие замки в перечисленных файлах.
- Accept temporarily: находки вне scope → строка в итоге с владельцем.

## Verification
- Новый тест: двойной вызов каждой точки → одна операция; ошибка → кнопки доступны снова; catch пишет причину.
- Соседние (по одному, со слотом, свободно ≥2 ГБ, `npm run test:one -- tests/<файл>`): `aa_guest_server_delete`, `aa_release_floor_auth_ui`, `aa_guest_honesty_contract`, `registration_prompt_modal_lifecycle`, `auth_provider_behavior`, `account_delete_flow_contract`.
- Независимое ревью до APPROVE.

## Rollback
Отдельный коммит; `git revert`.

## Итог исполнителя

Governance-ID: TG-F7EF093C2A25 — аудит двойного тапа/отката/логов catch, правки по факту + тест.

### Таблица точек (строки — после правки)

| Точка | Файл:строка | Замок | Откат при ошибке | Немые catch / ранние выходы — было → стало |
|---|---|---|---|---|
| «У меня уже есть аккаунт» → Google/Apple | `components/CleanOnboarding.tsx:2584` handleAuth | есть (`authInFlightRef`, e514aadff) | есть (finally :2683) | catch без лога → `[ONBOARDING-AUTH] sign_in threw … source=existing_account` (:2682) |
| Сейф → «Продолжить с Apple/Google» | `CleanOnboarding.tsx:2695` authFromPrivacy | есть | есть | то же, `source=privacy` (:2786) |
| Сейф → «Позже» | `CleanOnboarding.tsx:3409` | НЕ было: «Позже» во время входа уводил дальше, поздний ответ сам вызывал onDone → стало: игнор + `later ignored reason=in_flight` | — | — |
| Экран входа → «Назад» | `CleanOnboarding.tsx:3323` | НЕ было (вход оставался без экрана) → игнор + `back ignored reason=in_flight` | — | — |
| «Начать» / «У меня уже есть аккаунт» | `CleanOnboarding.tsx:3330/3342` | не нужен (только смена шага, идемпотентно, сети нет) | — | — |
| Финал онбординга | `CleanOnboarding.tsx:3199` | есть (`finishingRef`) | есть | `catch {}` → `[ONBOARDING-FINISH] finish_failed` |
| Окно входа (настройки/регистрация) Google/Apple/«Повторить» | `components/RegistrationPromptModal.tsx:1115` | есть (attemptLifecycle + operation gate, логи 4ae7caca5) | есть (finally) | catch писал причину только под `__DEV__`, при закрытом окне — немо → `[AUTH-MODAL] sign_in threw code=…` всегда (:1344, без текста ошибки); выброшенный результат → `result dropped` (:1163) |
| Окно входа «Позже»/крестик | `RegistrationPromptModal.tsx:1421-1423` | есть | — | 3 немых раннего выхода → `later ignored reason=…` |
| Окно входа DEV «Сброс» | `RegistrationPromptModal.tsx:1394` | НЕ было (disabled по состоянию) → `resetInFlightRef` | НЕ было catch (исключение из onPress) → catch + лог | `reset failed` |
| Окно входа — 10 catch восстановления | `RegistrationPromptModal.tsx` (logAuthModalCatch :116) | — | есть | все 10 немые → `[AUTH-MODAL] recovery/clean_recovery failed code=…` |
| Процессный замок входа | `app/auth_provider.ts:2163` signInWithProvider | есть (тот же провайдер присоединяется) | — | catch `assertNoCleanInstall…` немой, 5 ранних отказов немые → `[AUTH-SIGNIN] transition_guard_busy` / `ignored reason=…` / `joined reason=in_flight` (:2173-2223) |
| Удаление: окно подтверждения | `components/DeleteAccountConfirmModal.tsx:225` | есть (`deleteInFlightRef`) | есть (3 снятия + finally) | отбитый тап немой → `confirm ignored reason=in_flight/word_mismatch` (:233); «Отмена» во время удаления → `cancel ignored` (:367); `catch {}` в toLocaleUpperCase → лог один раз (:150) |
| beginAccountDeletion | `auth_provider.ts:3960` | процессный: резервация; параллельный вызов честно отдаёт `local_wipe_unverified` (так задумано, сторож `auth_provider_behavior` «a concurrent delete tap…»); от двойного тапа защищает окно | — | `catch {}` резервации без кода → `delete:reserve_failed code=…` (:3969) |
| prepareAccountDeletion | `auth_provider.ts:4183` | — | — | `withLocalStepDeadline` `.catch(() => onTimeout)` немой → `swallowAuthAs('[AUTH-DELETE]','local_step')` (:4173); причина стирания только под `__DEV__` → всегда (:4239) |
| finishAccountDeletion | `auth_provider.ts:4304` | — | — | 4 catch только под `__DEV__` (уведомления, push, ответ постановки, выход провайдера) → всегда, кодом (:4341/4347/4368/4457) |
| Личность после удаления | `auth_provider.ts:1202-1502` | — | — | 8 немых catch → `[AUTH-DELETE] …`/`[AUTH-SIGNIN] …` (682, 716, 1213, 1300, 1322, 1333, 1407, 1463, 1502) |
| Смена аккаунта (обёртка) | `auth_provider.ts:3601` signOutAndWipeForAccountSwitch | процессный (резервация) | НЕ было: исключение до внутреннего try (возобновление карантина) уходило в Настройки/выход/окно входа, где его не ловят → стадия «стираю» залипала. Стало: отказ `{reason:'unknown', detail:'threw:<код>'}` + `[ACC-MUT] signout:out threw` (:3636) | — |
| Смена аккаунта в онбординге | `app/onboarding_account_switch_confirm.ts:67` | вызывающий держит `authInFlightRef` | есть | catch логирует (:97) — без правок |
| Настройки: смена/вход/удаление | `app/(tabs)/settings.tsx` | `switchStageRef` уже есть; вход — через RegistrationPromptModal, удаление — через DeleteAccountConfirmModal | залипание при исключении закрыто правкой обёртки в auth_provider | правок в файле не нужно |

### Тесты (по одному, `npm run test:one`)
- новый `tests/aa_auth_double_tap_contract.test.ts` — 15/15 (5 поведенческих: окно входа и смена в онбординге; остальное — сторож по исходнику, где рендер невозможен);
- aa_guest_server_delete 12/12, aa_release_floor_auth_ui 19/19, aa_guest_honesty_contract 21/21, registration_prompt_modal_lifecycle 7/7, auth_provider_behavior 110/110, account_delete_flow_contract 23/23;
- дополнительно: auth_provider_stable_link 35/35, onboarding_auth_busy_state_contract 2/2, account_delete_immediate_onboarding_contract 2/2, auth_signin_warmup_contract 6/6, cloud_sync_account_race_contract 3/3, aa_guest_offline_delete_retry 3/3.

### Не сделано / принято временно
- Полная проверка типов не запускалась (запрет пакета; хук пропустил из-за памяти) — файлы разобраны парсером Babel без ошибок.
- Не тронуты немые catch вне путей входа/удаления в `auth_provider.ts`: :201 (разбор id-токена → null), :328/:351/:361/:371 (`require` нативных модулей → null; зовутся часто, лог бы шумел) — владелец: сессия «Авторизация».
- Таблица в `docs/phraseman-2.0/INBOX_COORDINATOR_FROM_AUTH.md` не переносилась — это делает координатор.
Governance-ID: TG-33BD7A5CD555 — независимое ревью правок исполнителя.
Governance-ID: TG-A3996AF645F1 — REVISE ревью: тупик «Позже/Назад» при зависшем входе, сырой текст ошибок в логах, recovery_required при сбое resume, поведенческий тест обёртки.
Governance-ID: TG-AF79F2FB1212 — исполнитель REVISE: правка теста aa_auth_double_tap_contract (сторож catch по парным скобкам, проверка ухода при зависшем входе).

## Итог доработки (REVISE)

1. **HIGH, тупик «Позже»/«Назад».** Новый `components/onboarding_auth_leave.ts` (решение об уходе + номер попытки). `CleanOnboarding.tsx`: `authAttemptRef` (:2339); в обоих входах `beginOnboardingAuthAttempt` (:2602, :2724) и сверка сразу после ответа провайдера и в catch → `[ONBOARDING-AUTH] result dropped … reason=user_left` без onDone/go/setAuthError (:2613, :2700, :2735, :2815); `allowLeaveDuringAuth` (:2831) — до порога «медленно» игнор с логом, после (authSlow) — уход и смена номера попытки; подключено к «Назад» (:3371), стрелке сейфа `onBack` (:3420 — тот же уход посреди входа) и «Позже» (:3456). Замок входа при уходе не снимается (finally прежний — сторож aa_release_floor_auth_ui), второй вход поверх живого невозможен.
2. **MEDIUM, текст ошибки в логах онбординга** → `code=${identityErrorCode(error)}` (:2699, :2814, :3248). `describeAuthError(detail)` для человека не тронут.
3. **LOW, RegistrationPromptModal** → `identityErrorCode` в `logAuthModalCatch` (:118), `sign_in threw` (:1342), `reset failed` (:1410).
4. **LOW/MEDIUM, recovery_required.** `auth_provider.ts`: `resumeAccountSwitchQuarantineForSignOut` (:3653) — исключение возобновления → `{ok:false, reason:'recovery_required', detail:'resume_threw:<код>'}` + `[ACC-MUT] signout:resume_threw`; подключено во ВСЕХ трёх местах, где карантин возобновляется после записи маркера: :3680 (маркер уже был), :3701 (без облака), :3891 (обычная смена — тот же класс, раньше тоже уходил в 'unknown'). Обёртка-страховка оставлена. Потребители: Настройки :1920 — recovery_required → «Нужно завершить смену, перезапусти» ✔; AccountLogoutFlow — после первого отказа делает принудительную попытку, её recovery_required → окно «recovery» ✔; onboarding_account_switch_confirm — уходит в общий текст «Не получилось… попробуй ещё раз» (повтор действительно продолжит карантин — допустимо); RegistrationPromptModal (сброс) — бросает в свой catch с логом ✔.
5. **LOW, тест.** Новый поведенческий `tests/aa_auth_switch_resume_throw.test.ts` (настоящий auth_provider): resume бросает → recovery_required, лог без текста ошибки, второй вызов не получает clean_recovery_transition_active и доводит смену; страховка обёртки → 'unknown' и резервация снята. В `aa_auth_double_tap_contract` сторож catch теперь ищет тело блока по парным скобкам и требует лог раньше первого `return`; добавлены поведенческие проверки ухода при зависшем входе (через модуль onboarding_auth_leave) и сторож подключения в CleanOnboarding.
6. **§CORE-0012 (координатор):** `CleanOnboarding.tsx:4073-4074` ru «Ты удалил(а) все свои данные», uk «Ти видалив(ла) всі свої дані»; из `tests/informal_address_ru_uk_guard.test.mjs` убрана строка-исключение `components/CleanOnboarding.tsx` (список только сокращается). В этом файле есть чужие незакоммиченные ханки (error_traps, PLURAL_OR_TRANSLATION_PHRASES, POLITE_IMPERATIVE) — мой только удалённая строка CleanOnboarding.

Тесты (по одному): aa_auth_double_tap_contract 19/19, aa_auth_switch_resume_throw 2/2, auth_provider_behavior 110/110, auth_provider_stable_link 35/35, registration_prompt_modal_lifecycle 7/7, aa_release_floor_auth_ui 19/19, onboarding_auth_busy_state_contract 2/2, account_delete_flow_contract 23/23, aa_guest_server_delete 12/12, informal_address_ru_uk_guard (node --test) 2/2.

Описано, не правлено:
- Долг в `signOutAndWipeForAccountSwitchReserved`: общий catch (~:3898) и catch ветки без облака (~:3712) отдают `detail: String(e.message).slice(0,80)` — сырой текст ошибки печатается в `[ACC-MUT] signout:out` (и уходит в logAuthEvent). Заменить на `identityErrorCode(e)`.
- Ветка без облака: исключение самого `prepareDurableAccountSwitch` всё ещё даёт 'unknown', хотя маркер мог быть частично записан (только Expo Go).
- `app/(tabs)/settings.tsx` ~1721–1745 (принудительная смена «Сменить без сохранения»): при ЛЮБОМ `!forced.ok`, включая recovery_required, пишет «Всё осталось на месте» — после маркера неправда. Патч: перед общим окном добавить `if (forced.reason === 'recovery_required' || forced.reason === 'wipe_failed') { /* то же окно «Нужно завершить смену аккаунта», что на ~1920 */ return; }`.
- Шапки-комментарии в `components/AccountDeletedNotice.tsx:2` и `app/account_deleted_notice.ts:2` цитируют старую строку «Вы удалили…» — это комментарии, сторож их не видит.
Governance-ID: TG-386E57776EF5 — повторное ревью после доработки.
Governance-ID: TG-C8E5C56B2F02 — REVISE-2: поздний успех входа после ухода; срочный коммит текста «ты» (сторож на HEAD красный после 6191fb06d).

## Итог доработки 2

**HIGH — поздний успешный вход после ухода.**
- `components/onboarding_auth_leave.ts`: `decideLateOnboardingAuthResult` (linked_existing / merged_devices / linked_pending → `honor_late_success` или `already_completed`; error / cancelled / created_new → `drop`), состояние `OnboardingCompletionState` {doneCalled, lateSuccessHonored, questionnaireWritten}, `canQuestionnaireWriteProfile`, `honorLateOnboardingAuthSuccess` (DONE_KEY/шаг → onDone ровно один раз, повторная сверка после записи; лог `[ONBOARDING-AUTH] late_success_honored result=<вид> attempt=<n> questionnaire=<0|1>` / `late_success_after_completion`).
- `components/CleanOnboarding.tsx`: `authCompletionRef` (:2346); `settleLateOnboardingAuthResult` (:2604) — отброс с логом `result dropped … reason=user_left` или засчитывание; вызов после ответа провайдера в обоих входах (:2652, :2782); исключение в catch по-прежнему отбрасывается.
- onDone ровно один раз: штатный успех в обоих входах (:2736, :2858) и финал `completeOnboarding` (:3272, :3306) помечают `doneCalled` прямо перед onDone и пропускают с логом, если онбординг уже закрыт.
- Обратный порядок: анкета `finish` (:3167) не пишет user_profile и метку автоника, если поздний вход засчитан; после своей записи отмечает `questionnaireWritten` (:3217), и засчитанный поздний вход снимает метку автоника — новый ник существующему аккаунту не выдаётся.
- LOW (нет сверки между multiSet и onDone): при «успех засчитывается» отпадает — успех правилен в любом случае, защита только от второго onDone.

Что происходит в обратном порядке, если анкету записали ДО позднего успеха: `user_profile` и `generated_nickname_pending_v1` — локальные ключи аккаунта (не в SYNC_KEYS, стираются при смене личности, облако их не восстанавливает). Если смена личности случилась раньше записи анкеты, локальный `user_profile` восстановленного аккаунта = профиль анкеты (name '', уровень/дата по умолчанию) — облачного профиля для него нет, перезаписывать нечего; метку автоника снимает засчитанный вход. Если онбординг уже закрыт финалом до позднего успеха (`already_completed`), `resumePendingGeneratedNickname` мог отработать ещё под гостевой личностью — его же сверка `isCurrentAccountGeneration`/stableId не даст применить ник к новой личности; для merged_devices (слияние гостя в аккаунт) остаётся риск, что локальный профиль анкеты переедет в аккаунт — защита потребовала бы правки auth_provider, вне этой доработки.

Тесты (по одному, `npm run test:one`): aa_auth_double_tap_contract 29/29 (+10: засчитывание linked_existing/merged_devices/linked_pending с onDone ровно один раз и нетронутым профилем, отброс created_new/error/cancelled, анкета до позднего успеха, финал до позднего успеха, гонка финала во время записи), aa_release_floor_auth_ui 19/19, onboarding_auth_busy_state_contract 2/2, aa_guest_honesty_contract 21/21, auth_provider_stable_link 35/35; дополнительно сторожа онбординга: onboarding_funnel_aggregate_contract 5/5, onboarding_paywall_return_no_home_flash 6/6, onboarding_activation_analytics_contract 1/1, onboarding_disabled_steps_paths 14/14.
Governance-ID: TG-DB972B772316 — третье ревью (поздний успех входа) и коммит.
Governance-ID: TG-662A866FF87D — APPROVE третьего ревью; коммит.
