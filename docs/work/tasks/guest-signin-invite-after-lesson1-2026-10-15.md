# Task packet: приглашение войти гостю после урока 1 — перенос из мёртвой legacy-ветки в итог 2.0

Governance-ID: TG-C14218F19766
Status: В работе (координатор 15.10 ~19:10, п.5; аудит кнопок button-audit-home-learn-overlays №3)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Гость после первого завершённого урока видит одну строку-приглашение в итоге 2.0 с текстом legacy-окна
RegistrationPromptModal context lesson1 («Один клик через Google — и прогресс в безопасности.», 9 языков). Тап →
Настройки с открытым существующим окном входа (RegistrationPromptModal context settings). Один раз (метка
`auth_prompt_shown_v1` ставится при показе). Нового экрана/провайдеров/пароля нет.

Попутный баг: таймер урока 1 ставил `showAuthPrompt=true`, а окно рисуется только в мёртвой legacy-ветке — аппаратная
«Назад» тратила первое нажатие на закрытие невидимого окна. Теперь `showAuthPrompt` в 2.0 не взводится.

## Scope

`app/lesson_complete.tsx` (решение + строка через noteAction), `components/completion/V2DoneScreen.tsx` (необязательная
нажимаемая строка noteAction под starsNote — стиль starsNote, цвет основного текста, шеврон, 44 dp, хаптик, role button),
`app/account_switch_copy.ts` (`SETTINGS_OPEN_SIGN_IN_PARAM = 'signIn'`), `app/(tabs)/settings.tsx` (параметр открывает окно
входа и снимается), тест-сторож. На Главной гостевой карточки нет (поиск guest/anonymous/signIn в home и components/home — пусто).

## Architecture

Окна на итоге 2.0 запрещены (сторож lesson_complete_single_finish_surface) — поэтому строка + навигация, как «экзамен
открыт» (937cd728d). Вставка строки после первого кадра — через animateNextLayoutTransition (layout stability).

## Security and privacy

Только навигация на существующий вход. Данных не добавляется. Лог [GUEST-SIGNIN-INVITE] без uid.

## Technical debt

Legacy-ветка с RegistrationPromptModal остаётся мёртвой (legacyCompletionSurfacesEnabled=false) — Accept temporarily, удаление
мёртвой ветки — у «Моментов».

## Verification

Тест-сторож источника; babel/tsc; кадр Макетов: гость после урока 1 видит строку, тап открывает окно входа в Настройках.

## Rollback

Обратный собственный патч.

## Итог

✅ 65ca02b12 (19:30:46) + сторож 52e4ee8e8. Ждёт кадр Макетов: гость → урок 1 → итог → строка → тап → Настройки с окном входа.

## Доработка по Ревизору f05ceeb88 (координатор ~19:50)

Governance-ID: TG-5EEF2479EE74
Метка auth_prompt_shown_v1 остаётся на устройстве (один раз на устройство). Настройки: перед открытием окна по параметру signIn — getLinkedAuthInfo(); привязан → не открываем, [GUEST-SIGNIN-INVITE] skip reason=already_linked; сбой проверки → открываем (вход безопасен) с причиной в журнале. lesson_complete: удалён мёртвый RegistrationPromptModal (legacy-ветка), showAuthPrompt и ветка BackHandler — только свои строки, чужие хунки файла не трогаются.
