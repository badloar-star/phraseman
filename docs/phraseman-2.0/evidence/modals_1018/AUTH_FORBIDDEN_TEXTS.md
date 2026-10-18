# Запрещённые владельцем тексты входа/смены аккаунта — где остались (18.10, Сверка; код не правила)
Искала по app, components, constants, modules, hooks, lib, shared, functions/src, legal, config (шаблоны: already linked, switch accounts first, уже привязан/связан, «уже есть в Phraseman», испанский/португальский/вьетнамский/индонезийский/турецкий/польский эквиваленты). Словари — 9 языков (ru, uk, en, es, pt-BR, vi, id, tr, pl) лежат внутри файлов через triLang, отдельных json-словарей с этими фразами нет.

## 🔴 Запрещённые формулировки (точные места)
Файл app/account_switch_copy.ts, функция accountSwitchRequiredCopy:
- title (строки 60–70, все 9 языков): ru 61 «Телефон уже связан с другим аккаунтом», uk 62, en 63 «This phone is already linked to another account», es 64, pt-BR 65, vi 66, id 67, tr 68, pl 69.
- body (строки 71–81, все 9 языков): ru 72 «…Чтобы войти в другой аккаунт, сначала смени аккаунт.», uk 73, en 74 «…To sign in to another account, switch accounts first.», es 75, pt-BR 76, vi 77, id 78, tr 79, pl 80.
- action (82–92): «Сменить аккаунт» / «Switch account» — кнопка этого же окна (если «switch» запрещён целиком, убирается вместе с текстом).
Где показывается: components/RegistrationPromptModal.tsx:1212–1215 (account_switch_required → showInlineError(switchCopy.title, switchCopy.body)) и рендер красным (t.wrong) под кнопками входа — строки 1686–1690; кнопка switchAccountOffered — 1705–1718.
Родственный текст гостя — app/account_switch_copy.ts:103–141 (accountSwitchRequiredGuestCopy, используется app/onboarding_account_switch_confirm.ts:112): title «Этот аккаунт уже есть в Phraseman / This account already exists in Phraseman …» (108–116), body «…начатое на этом телефоне без входа придётся оставить — оно не перенесётся» (119–127). Это окно-вопрос (не красная надпись), но по смыслу «аккаунт уже есть» — решить Авторизации, подпадает ли под запрет.

## 🟡 Красные надписи под кнопками входа (рендер ошибок, не фразы-запреты)
- components/RegistrationPromptModal.tsx:1686–1690 — inlineError красным (color: t.wrong) под кнопками Google/Apple: сюда уходят все тексты ошибок (title+body строкой): account_switch_required, signInRefusalCopyFor (app/account_sync_copy.ts: «Прогресс на месте … Не получилось сохранить его в облако…» строки 23–45), «Не получилось войти. Попробуй позже.» (1324–1336, 9 языков), authErrorTextForKind (app/auth_error_copy.ts: 28 «Связь пропала. Попробуй ещё раз.», 42 «Слишком много попыток подряд. Подожди пару минут…»).
- components/RegistrationPromptModal.tsx:1666–1672 — красная надпись, когда нет ни Google, ни Apple (!googleAvail && appleAvail === false); текст в triLang сразу под ней.
- components/RegistrationPromptModal.tsx:2000 и 2152 — recoveryError (accessibilityRole=alert, красный) в окне восстановления; 1779/2031 — срок кода красным.
- components/CleanOnboarding.tsx:3891 и 3975 — authError под кнопками входа в онбординге (<Text style={styles.errorText}>…, цвет P.text — НЕ красный, жирный 800); тексты те же словари (auth_error_copy, account_sync_copy). 
- DEBUG-кнопка красным: RegistrationPromptModal.tsx:2172 («DEBUG: Сбросить identity и войти заново», только ENABLE_AUTH_IDENTITY_DEBUG).

## ✅ Не относится к входу (не трогать)
components/referral_code_sheet.tsx:53–59 («Код уже привязан к твоему аккаунту» — реферальный код), components/onboarding/clean_onboarding_copy_paywall.ts:73 («аккаунт уже привязан к другу» — реферал), app/legal/privacy_policy_en*.json (юридический текст), комментарии в auth_provider.ts:3187/3533, guest_clean_classifier.ts:217, local_account_data.ts:90, onboarding_account_switch_confirm.ts:111 (только комментарии со старой фразой).
