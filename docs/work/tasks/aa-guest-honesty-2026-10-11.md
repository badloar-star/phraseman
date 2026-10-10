# Гость: честные тексты о переносе прогресса + кнопки входа без сдвига (решения координатора 00:50)

Governance-ID: TG-AA6EC9A6D998

## Outcome
1. Гость после переустановки не получает ложного «Всё в безопасности — войди тем же Google/Apple, вернём прогресс»: если привязки не было — честный текст «Этот прогресс был без входа — вернуть его нельзя. Дальше привяжи Google/Apple, чтобы он сохранялся» (9 языков).
2. В Настройках у гостя вместо «аккаунт не привязан» — «Прогресс только на этом телефоне» (9 языков).
3. Политика: абзац о том, что прогресс гостя привязан к установке и теряется при удалении приложения/очистке/новом телефоне; legal:sync.
4. Кнопки входа (онбординг и окно входа) не двигают раскладку после асинхронной проверки доступности: место зарезервировано с первого кадра (скелетон/невидимая заглушка той же высоты), без мигания.

## Scope
`components/RegistrationPromptModal.tsx` (тексты восстановления, слот кнопок), `app/(tabs)/settings.tsx` (строка профиля гостя — только текст), `components/CleanOnboarding.tsx` (слот кнопок), `legal/privacy_policy_en*.json` + legal:sync, тесты. Вне scope: серверная подсказка `authRecoveryHint` (App Check — отдельная сессия), Learning V2 синк, ранг монеты (Ядро).

## Architecture
- Как окно восстановления узнаёт «привязки не было»: сейчас серверная подсказка `authRecoveryHint` мертва (`app_check_required` — App Check запломбирован), значит опираться на её `linked:false` нельзя. Исполнитель находит фактический признак (например, локальная/серверная причина `provider_reauth_required` при отсутствии сохранённого провайдера / флага привязки) и показывает честный текст, когда привязки достоверно не было; при неизвестности — нейтральный текст без обещания «вернём».
- Резерв места: доступность Google синхронно известна (модуль + переменная) — вычислить начальное состояние синхронно; Apple на iOS асинхронен — резерв по высоте кнопки до ответа.

## Security and privacy
Только тексты и вёрстка; данные не собираются. Политика — уточнение (owner-rules A).

## Technical debt
Строка онбординга «вход недоступен» только ru — после релиза (решение координатора).

## Verification
Тесты на выбор текста (была привязка / не было / неизвестно), на строку Настроек, на синхронное начальное состояние Google; соседние registration_prompt_*, onboarding_auth_*, layout_stability_contract, perf_freeze_contract — по одному со слотом. Ревью до APPROVE.

## Rollback
Отдельные коммиты; `git revert`.
Governance-ID: TG-AA6EC9A6D998 — список владельца: решения 00:50 (окно сбоя удаления оставлено, «после релиза»).
Governance-ID: TG-185240E2ABB3 — удаление: при истечении 5 с ждать идущий полёт стирания ещё до 10 с, чтобы окно сбоя не показывалось поверх уже стираемых данных (смешанное состояние, прогон 21:35).
Governance-ID: TG-27B2B74EF4E1 — живой прогон удаления гостя БЕЗ сети (окно Сверки, снимок aa_pre_run3).
Governance-ID: TG-27B2B74EF4E1 (прод.) — «сперва логи»: какие поля разошлись при broken_guard_discarded (disagreement anchorV=3 phase=stable_link_verified, прогон 22:05).
Governance-ID: TG-606F8EE657AE — статус задачи 00:50 в INBOX §AA-40.

## Итог исполнителя (TG-AA6EC9A6D998, 10.10)

**Файлы и суть правок (без коммитов):**
- `components/startup_recovery_link_copy.ts` (новый) — `resolveStartupRecoveryLinkState` (linked / not_linked / unknown + чем решено), `getStartupRecoveryHonestCopy` (тексты «не было» и «неизвестно», 9 языков), `shouldShowSavedJourneyLine`.
- `components/RegistrationPromptModal.tsx` — в `startup_recovery` «Всё в безопасности» и «вернём прогресс» только при доказанной привязке; иначе «Был ли вход раньше?» + «Войди тем способом, которым входил раньше. Если входа не было, этот прогресс вернуть нельзя.»; строка «N дней твоего пути уже сохранены / Твой путь сохранится» без доказанной привязки не показывается (тоже обещание). Лог `[AUTH-RECOVERY-COPY] state= decidedBy= sessionProvider= hintLinked=`. Google — синхронно при открытии (`useMemo` по `visible`, скрытая модалка не тянет модуль на холодном старте); Apple `boolean|null`, при `null` — невидимая заглушка 54 pt; «Ни один провайдер не доступен» не мигает, пока Apple не ответил.
- `app/auth_provider.ts` — `isGoogleSignInAvailableSync()` (async-версия делегирует), `peekAppleSignInAvailability()` (Android/web — сразу, iOS — после первого ответа, кэш на процесс); немой `catch` в `isAppleSignInAvailable` пишет `[AUTH-AVAIL]`. Чужие ханки файла (удаление, ~927/~4114) не тронуты.
- `components/AuthProviderButtons.tsx` — `AUTH_PROVIDER_BUTTON_HEIGHT` и `AuthProviderButtonPlaceholder` (невидимая, без нажатий и диктора, высота формы 56/58/54). Визуал кнопок не менялся.
- `components/CleanOnboarding.tsx` — `useState(isGoogleSignInAvailableSync)`, Apple `boolean|null` + заглушки (authMode — 56, privacy — таблетка 58), «вход недоступен» только при `appleAvailable === false`, `catch` пишет `[ONBOARDING-AUTH]`.
- `app/(tabs)/settings.tsx` — у гостя «прогресс только на этом телефоне» (9 языков, строчная: строка идёт после звания через « · », как в макете).
- `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json` — абзац о гостевом прогрессе в разделе 3; `npm run legal:sync` записал `app/legal/privacy_policy_en*.json`, `privacy.html`, `admin/oauth-privacy.html`, `admin/v2/oauth-privacy.html` (там уже лежал незакоммиченный вывод чужого sync про раздел 20 — совпадает с JSON, сохранён), `knowly-www/legal/privacy/index.html`. terms/data-deletion не изменились.
- Тесты: `tests/aa_guest_honesty_contract.test.ts` (новый), `tests/registration_prompt_modal_lifecycle.test.ts` (моки под синхронный Google / peek Apple; гонка поздних ответов перенесена на Apple; +3 теста на рендер).

**Признак «привязки не было»: достоверного на клиенте сегодня НЕТ.** Отказ `stable_id_mismatch` приходит без подробностей; после переустановки переживает только stableId (Keychain / бэкап AsyncStorage на Android) без признака провайдера; `settings peek` с `linkedAuth:null` может быть устаревшим бэкапом. Подсказка `authRecoveryHint` не годится не только из-за App Check: её `linked:false` описывает ТЕКУЩУЮ привязку, а после ротации stableId (`ensureStableAuthLink`) это новый пустой профиль — пользователь с Google услышал бы «вернуть нельзя». Поэтому: «была» = провайдер текущей сессии (`peekLinkedAuthFromCurrentUser`) или `hint.linked === true`; «не было» — только при прямом серверном подтверждении о прежнем владельце (`ownerLinkedConfirmedByServer`, сейчас никем не передаётся); иначе — «неизвестно». Гость сейчас видит нейтральный честный текст; ветка «вернуть нельзя» ждёт серверного признака (отдельная задача: детали отказа mismatch — был ли у владельца linkedAuth).

**Тесты (по одному, со слотом):** aa_guest_honesty_contract 21/21; registration_prompt_modal_lifecycle 7/7; registration_prompt_recovery_ui_contract 8/8; registration_prompt_responsive_contract 3/3; registration_prompt_liquid_glass_source_contract.mjs (node --test) 5/5; onboarding_auth_busy_state_contract 2/2; onboarding_auth_error_i18n_contract 1/1; layout_stability_contract 15/15; perf_freeze_contract 12/12; aa_release_floor_auth_ui 19/19; aa_release_registration_restore_prompt 6/6; startup_provider_reauth_recovery 4/4; post_delete_retired_identity_ui_contract 3/3; auth_provider_behavior 109/110 — падает «timed-out local wipe remains a single joined flight…»: это чужая незакоммиченная правка удаления в auth_provider.ts (TG-185240E2ABB3), не эта задача.

**Риски:** макет PRF-01 (redesign-round-1.html) всё ещё «аккаунт не привязан» — обновить макет; строка профиля длиннее, без numberOfLines — на узком экране может уйти во вторую строку; на iOS при `isAvailableAsync=false` (iOS < 13) заглушка исчезнет — редкий сдвиг; заголовки «Был ли вход раньше?» / «Прошлый прогресс не сохранился» — выбор исполнителя, владелец может переименовать; проверка типов не гонялась (по правилам пакета).
Governance-ID: TG-145ACC8AAC44 — разбор падения auth_provider_behavior после awaitInFlightLocalWipe; ревью и коммит пакета честных текстов.
Governance-ID: TG-880D897B926D — ревью APPROVE; LOW-1: «прогресс привязан к этому телефону»; коммит.
Governance-ID: TG-AA6884B7A6D7 — префикс [AUTH-AVAIL] в IdentityTracePrefix (ошибка типов после a350f04ba).
Governance-ID: TG-0F2E8636E5DF — запись AA-42 (тип [AUTH-AVAIL], сорванный прогон).
Governance-ID: TG-34DA5570D750 — сторож legal_document_liquid_glass_source_contract после правок политики.
