# СПИСОК СЪЁМКИ после №7 — для Сверки (Макеты, 15.10)

Координатор 15.10: Сверка берёт файл как есть, **если владелец разрешит эмулятор**. Порядок — по экранам (маршрут `next=`), чтобы снимать одним проходом.

**Перед проходом (один раз):** язык интерфейса приложения — **Русский** (часть прошлых кадров снята на uk; `uiLang` в dev_state умеет только `en|off`). Правила перед КАЖДЫМ кадром — DEV_LINKS_R1.md §«Правила» (force-stop → ссылка → «DEV-STATE OK»; `overlays=off`; фикстуры карточек — только на анонимном госте).

Строк: 102 (из CLOSE_AFTER_SHOT 49+38+6 и особые строки координатора). Без готовой ссылки в DEV_LINKS: нет.

Колонки: **ссылка / шаги** — из DEV_LINKS_R1.md (Дизайн), «тапы» — грамматика scripts/parity_steps.mjs; **зачем** — что подтвердить на кадре; язык у всех — ru.

## Главная, энергия, рассылки › /(tabs)/home — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 1 | energy-modes-014 | Два режима энергии · Фраза дня · Фраза дня — энергия за ошибки не снимается | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&mode=b&energy=5&overlays=off&next=/(tabs)/home`<br>перед кадром: Режим Б: фраза дня энергию не тратит (пилюля на Главной) | `tap:#home-v2-phrase-of-day; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Главная, энергия, рассылки › /ai_dialog_home — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 2 | energy-modes-013 | Два режима энергии · Диалоги · Диалоги — энергия за ошибки не снимается | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&mode=b&energy=5&dquota=reset&coinRank=6&aiConsent=granted&dev_dialog_send=ok&overlays=off&next=/ai_dialog_home`<br>перед кадром: Режим Б: диалог, реплика с ошибкой — пилюля энергии не меняется (dev_dialog_send=ok) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:I goed home; tap:#dialogue-v2-session-send; wait:2500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Главная, энергия, рассылки › /lesson1 — 2

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 3 | energy-modes-004 | Два режима энергии · Урок · Режим Б · ошибка на последней энергии → остановка | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=1&overlays=off&next=/lesson1?id=1%26from=lesson_menu`<br>перед кадром: Режим Б: ошибка на последней энергии → шторка остановки (energy-stop-sheet) | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 4 | energy-modes-016 | Два режима энергии · Режим А · Режим А · ошибка: сердечко и серия монет | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=a&energy=5&overlays=off&next=/lesson1?id=1%26from=lesson_menu`<br>перед кадром: Режим А: ошибка — сердечко и серия монет | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:600` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Диалоги › /ai_dialog_home — 16

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 5 | dialogs-009 | B. Брифинг и вход · Согласие на ИИ — шторка | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&aiConsent=off&dev_dialog_send=ok&coinRank=6&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: согласие на ИИ — шторка при нажатии «Начать» (без подмены согласия; кнопку согласия НЕ жать — запись в облако) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:1500` | grad_aurora | закрыть после №7 (раздел 1) |
| 6 | dialogs-011 | B. Брифинг и вход · Нет энергии — окно | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&energy=0&dev_dialog_send=ok&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: старт без энергии — окно «Энергия закончилась» (energy=0; подмена отказа энергии даёт тост, а не окно) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start` | grad_aurora | закрыть после №7 (раздел 2) |
| 7 | dialogs-021 | C. Сессия диалога · «Лучше так» — кнопка и раскрытый вариант | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_better=on&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: разбор хода: «Лучше так» (dev_dialog_better=on) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-better-*; wait:600` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |
| 8 | dialogs-024 | C. Голосовой ввод · Ожидание — «Готовлю микрофон…» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=preparing&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: «Готовлю микрофон…» (speech=preparing держит статус после отпускания; снять — speech=off) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; long:#dialogue-v2-voice-input; wait:400` | grad_aurora | закрыть после №7 (раздел 1) |
| 9 | dialogs-028·а | C. Голосовой ввод · Нет доступа к микрофону · попытки кончились | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=denied&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: только speech=denied (попытки есть): после тапа по микрофону — «Нет доступа к микрофону» (hooks/use_dialogue_v2_voice_message.ts:247) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:800` | grad_aurora | кадр (а) из двух: «Нет доступа к микрофону» — комбинация образца недостижима, по коду (dialogue_v2_session.tsx:759) |
| 10 | dialogs-028·б | C. Голосовой ввод · Нет доступа к микрофону · попытки кончились | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_voice=spent&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: только dev_dialog_voice=spent: бейдж PLUS на микрофоне БЕЗ тапа (тап откроет Plus — не нажимать; dialogue_v2_session.tsx:824) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000` | grad_aurora | кадр (б) из двух: бейдж PLUS на микрофоне без тапа — комбинация образца недостижима, по коду (dialogue_v2_session.tsx:759) |
| 11 | dialogs-035 | C. Лимиты, завершение и выход · Лимит закончился — «На этот месяц всё» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=1&energy=5&dev_dialog_send=quota_exhausted&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: лимит исчерпан на отправке (dev_dialog_send=quota_exhausted) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500` | grad_aurora | закрыть после №7 (раздел 2) |
| 12 | dialogs-037 | C. Лимиты, завершение и выход · Диалог завершён — финальная реплика | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_end=on&coinRank=6&aiConsent=granted&dev_dialog_mood=happy&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: подставной ход завершает диалог: завеса конца (dev_dialog_end=on) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |
| 13 | dialogs-040 | D. Итог диалога — единый экран завершения · Диалог пройден — без ошибок | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=clean&coinRank=6&aiConsent=granted&dev_dialog_end=on&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: итог диалога: без ошибок (dev_dialog_completion=clean) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil; tap:#dialogue-v2-session-end-veil; wait:1500` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1); первый кадр (кадра нет) |
| 14 | dialogs-041 | D. Итог диалога — единый экран завершения · Диалог пройден — с ошибками | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_end=on&dev_dialog_completion=errors&coinRank=6&aiConsent=granted&dev_dialog_mood=happy&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: итог — «Диалог пройден» (собеседник завершил, dev_dialog_end=on); локально сценарий отметится пройденным, сети нет | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; wait:2500; tap:#dialogue-v2-session-end-veil; wait:1500` | grad_aurora | закрыть после №7 (раздел 1) |
| 15 | dialogs-042 | D. Итог диалога — единый экран завершения · Оценка раскрыта, есть комментарий | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=clean&coinRank=6&aiConsent=granted&dev_dialog_end=on&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: итог диалога: блок отзыва, выбрана 4-я звезда (отправку НЕ жать) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil; tap:#dialogue-v2-session-end-veil; wait:1500; tap:#dialogue-v2-completion-feedback-header; tap:#dialogue-v2-completion-feedback-star-4` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1); первый кадр (кадра нет) |
| 16 | dialogs-043 | D. Итог диалога — единый экран завершения · Разговор завершён вручную | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&studyTarget=en&dev_dialog_completion=clean&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: ручное завершение через меню «⋯»; шаги выведены из кода (подтверждения может не быть), не отлажены | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:3000` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1) |
| 17 | dialogs-044 | D. Итог диалога — единый экран завершения · Отзыв отправлен | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=errors&coinRank=6&aiConsent=granted&dev_dialog_end=on&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: итог диалога: с ошибками (dev_dialog_completion=errors) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil; tap:#dialogue-v2-session-end-veil; wait:1500` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1); первый кадр (кадра нет) |
| 18 | dialogs-gap-007 | Диалоги · Итог · Итог диалога — собеседник готовит итог | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=loading&coinRank=6&aiConsent=granted&dev_dialog_end=on&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: итог диалога: загрузка (dev_dialog_completion=loading) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil; tap:#dialogue-v2-session-end-veil; wait:1500` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1) |
| 19 | dialogs-gap-014 | Диалоги · Сессия · Сессия — голосовое сообщение в ленте | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=correct&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: голосовое сообщение в ленте: распознано и отправлено (speech=correct) | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:800; tap:#dialogue-v2-session-send; wait:600` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |
| 20 | dialogs-gap-016 | Диалоги · Сессия · Сессия — тост «Энергия возвращена» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_fail=service&coinRank=6&aiConsent=granted&theme=grad_aurora&level=1&overlays=off&next=/ai_dialog_home`<br>перед кадром: тост «Энергия возвращена» (dev_dialog_fail=service); сценария «Закажи кофе / Мия» в каталоге V2 нет — к Макетам | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; hidekb; wait:500` | grad_aurora | закрыть после №7 (раздел 1) |

## Диалоги › /dialogue_v2_freeform — 2

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 21 | dialogs-046 | F. Свободный разговор · Разговор идёт | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_freeform`<br>перед кадром: свободный разговор: реплика отправлена, идёт ответ собеседника (dev_dialog_send=ok, поле dialogue-v2-freeform-input) | `wait:1200; tap:#dialogue-v2-freeform-input; type:Hello; tap:#dialogue-v2-freeform-send; wait:300` | grad_aurora | закрыть после №7 (раздел 1) |
| 22 | dialogs-gap-009 | Диалоги · Свободный разговор · Свободный разговор — готовим разговор | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&hold=freeform_loading&dev_dialog_send=ok&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_freeform`<br>перед кадром: свободный разговор — готовим разговор (hold=freeform_loading) | — | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 1) |

## Диалоги › /dialogue_v2_memory — 4

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 23 | dialogs-gap-001 | Диалоги · Память · Память диалогов — Plus, со сводкой | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dev_dialog_memory=demo&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_memory`<br>перед кадром: «Память диалогов» у Plus: сводка и два сценария (dev_dialog_memory=demo, без чтения настоящей памяти) | `wait:1200` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |
| 24 | dialogs-gap-004 | Диалоги · Память · Память диалогов — Очистить память? (подтверждение) | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dev_dialog_memory=demo&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_memory`<br>перед кадром: «Очистить память?» — окно подтверждения (тап по кнопке очистки) | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600` | grad_aurora | закрыть после №7 (раздел 1) |
| 25 | dialogs-gap-005 | Диалоги · Память · Память диалогов — очищаем… | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dev_dialog_memory=clearing&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_memory`<br>перед кадром: «Очищаем…» (dev_dialog_memory=clearing; подтверждение по id окна) | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600; tap:#dialogue-v2-memory-clear-dialog-confirm; wait:300` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |
| 26 | dialogs-gap-006 | Диалоги · Память · Память диалогов — не удалось очистить | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&dev_dialog_memory=clear_fail&theme=grad_aurora&level=1&overlays=off&next=/dialogue_v2_memory`<br>перед кадром: «Не удалось очистить» (dev_dialog_memory=clear_fail; подтверждение по id окна) | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600; tap:#dialogue-v2-memory-clear-dialog-confirm; wait:800` | grad_aurora — прошлый кадр был в светлой, снимать тёмную | закрыть после №7 (раздел 2) |

## Карточки › /dev_cards_result_preview — 5

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 27 | cards-section-053 | Итог с ошибками · Итог с ошибками | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors`<br>перед кадром: итог тренировки с ошибками (/dev_cards_result_preview?state=errors; данные макета, монеты не зачисляются) | `wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 28 | cards-section-054 | Итог Блица · Итог Блица | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors`<br>перед кадром: итог тренировки с ошибками (/dev_cards_result_preview?state=errors; данные макета, монеты не зачисляются) | `wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 29 | cards-section-055 | Без ошибок · Без ошибок | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=clean`<br>перед кадром: итог тренировки без ошибок (state=clean) | `wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 30 | cards-v2-041 | Итог · Итог с ошибками | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors`<br>перед кадром: итог тренировки с ошибками (/dev_cards_result_preview?state=errors; данные макета, монеты не зачисляются) | `wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 31 | cards-v2-042 | Итог · Без ошибок | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=clean`<br>перед кадром: итог тренировки без ошибок (state=clean) | `wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Карточки › /flashcards — 4

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 32 | cards-002 | Хаб и выбор режима · Выбор режима · окно по центру | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&quota=reset&overlays=off&studyTarget=en&next=/flashcards`<br>перед кадром: шторка выбора режима тренировки (хаб открывает её сам по ?train=1) · **только гость (pm clear + онбординг)** | `wait:2500; tap:#fc-cards-hub-train; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3); uk → ru: проверить перенос «Правда / неправда» на ru |
| 33 | cards-gap-011 | Карточки · Шторка режима — «Готовим тренировку…» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&quota=6&hold=quota_waiting&animations=off&overlays=off&studyTarget=en&next=/flashcards`<br>перед кадром: шторка режима: «Готовим тренировку…» (hold=quota_waiting; хаб открывает окно сам по ?train=1) · quota=6 (использовано 6) → «осталось 24 из 30» как в образце · * | `wait:2500; tap:#fc-cards-hub-train; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 34 | cards-section-032 | Режим тренировки · Режим тренировки | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&quota=reset&overlays=off&studyTarget=en&next=/flashcards`<br>перед кадром: шторка выбора режима тренировки (хаб открывает её сам по ?train=1) · **только гость (pm clear + онбординг)** | `wait:2500; tap:#fc-cards-hub-train; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3); uk → ru: проверить перенос «Правда / неправда» на ru |
| 35 | cards-v2-027 | Тренировка · Режим | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&animations=off&quota=reset&overlays=off&studyTarget=en&next=/flashcards`<br>перед кадром: шторка выбора режима тренировки (хаб открывает её сам по ?train=1) · **только гость (pm clear + онбординг)** | `wait:2500; tap:#fc-cards-hub-train; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Карточки › /flashcards_blitz_session — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 36 | cards-gap-001 | Карточки · Блиц — «Тренировка не открылась» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&train_gate=fail_blitz&animations=off&overlays=off&studyTarget=en&next=/flashcards_blitz_session?deck=saved%26sec=60`<br>перед кадром: «Блиц»: тренировка не открылась (train_gate=fail_blitz) · animations=off: таймер Блица заморожен — иначе uiautomator не отдаёт дерево (could not get idle state) | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Карточки › /flashcards_collection — 13

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 37 | cards-008 | Сохранённые · Стопка | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved`<br>перед кадром: стопка · **только гость (pm clear + онбординг)** | `tap:#fc-saved-actions; tap:#fc-saved-view-deck` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 38 | cards-035 | Сохранённые — все окна и состояния · Подтверждение массового удаления | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved`<br>перед кадром: 3 выбранных → окно подтверждения удаления · **только гость (pm clear + онбординг)** | `tap:#fc-saved-actions; tap:#fc-menu-select; tap:#fc-gallery-tile-*; tap:#fc-gallery-tile-*@2; tap:#fc-gallery-tile-*@3; tap:#fc-delete-selected` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 39 | cards-051 | Отклик, лайк и жалобы · Отклик пуст | `phraseman://dev_state?onboarding=done&intros=seen&packcards=on&community=reset&comments=empty&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1`<br>перед кадром: отклики: «Пока тихо» (comments=empty) | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 40 | cards-055 | Отклик, лайк и жалобы · Меню чужого: пожаловаться | `phraseman://dev_state?onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1`<br>перед кадром: меню чужого отклика («Пожаловаться») | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-more-dev_demo_cm_2` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 41 | cards-gap-023 | Карточки · Фильтр — выбрано «Все» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo_lessons&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved`<br>перед кадром: фильтр по уроку: меню «⋯» → «Фразы» → «Фильтр» (выбрано «Все») · **только гость (pm clear + онбординг)** | `tap:#fc-saved-actions; tap:#fc-saved-content-phrase; tap:#fc-menu-filter` | Аврора тёмная (Спокойно), по умолчанию | после правки Дизайна (окно 06:30): меню фильтра открыть и сверить лог [CARDS-FILTER-MENU] с образцом №23 — низ шапки ≈95, верх меню 106 (insets.top + 56), right 16, width 200 |
| 42 | cards-gap-027 | Карточки · Публикация — не хватает данных | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?pack=local_pack_dev_demo_work`<br>перед кадром: публикация: «не хватает данных» — у демо-набора нет описания, отказ приходит до сети (local_pack_dev_demo_* в dev не публикуется никогда) · **только гость (pm c | `tap:#fc-pack-menu; tap:#fc-pack-publish` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 43 | cards-gap-028 | Карточки · Публикация — не удалось отправить | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&fail=publish_error&overlays=off&studyTarget=en&next=/flashcards_collection?pack=local_pack_dev_demo_work`<br>перед кадром: «Не удалось отправить набор на публикацию» (fail=publish_error, без сети) · **только гость (pm clear + онбординг)** | `tap:#fc-pack-menu; tap:#fc-pack-publish` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 44 | cards-gap-029 | Карточки · Свой набор — минимум 10 карточек | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&fail=pack_remove_min&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own`<br>перед кадром: удаление карточки: «в наборе должно остаться минимум 10» (fail=pack_remove_min) · **только гость (pm clear + онбординг)** | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-delete; wait:5800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 45 | cards-gap-031 | Карточки · Свой набор — нет связи | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&fail=pack_remove_net&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own`<br>перед кадром: удаление карточки: «Нет связи — карточку не удалось удалить» (fail=pack_remove_net) · **только гость (pm clear + онбординг)** | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-delete; wait:5800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 46 | cards-gap-032 | Карточки · Чужой набор — лайк до добавления | `phraseman://dev_state?onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1`<br>перед кадром: лайк до добавления: тост «сначала добавь» | `wait:2500; tap:#pack-like-dev_demo_community_2` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 47 | cards-gap-033 | Карточки · Чужой набор — лайк не прошёл | `phraseman://dev_state?onboarding=done&intros=seen&packcards=on&community=reset&fail=pack_like&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1`<br>перед кадром: лайк не прошёл: откат сердца + тост (fail=pack_like) | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-like-dev_demo_community_2` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 48 | cards-gap-039 | Карточки · В какой набор? — нет наборов, куда можно добавить | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own`<br>перед кадром: карточка своего набора → «В набор» (раскрытие карточки) · **только гость (pm clear + онбординг)** | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-to-pack` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 49 | cards-v2-021 | Карточка открыта · Оборот | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved`<br>перед кадром: оборот карточки · **только гость (pm clear + онбординг)** | `tap:#fc-gallery-tile-*; tap:#fc-expanded-card-flip` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Карточки › /flashcards_packs — 3

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 50 | cards-020 | Набор · Жалоба на набор | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&overlays=off&next=/flashcards_packs`<br>перед кадром: жалоба на набор сообщества (долгое нажатие → «Пожаловаться») | `long:#flashcards-pack-card-dev_demo_community_1; tap:#flashcards-pack-report` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 51 | cards-047 | Каталог — остальные состояния · Загрузка | `phraseman://dev_state?onboarding=done&intros=seen&hold=catalog_loading&overlays=off&next=/flashcards_packs`<br>перед кадром: каталог — загрузка (hold=catalog_loading; снять hold=off) | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 52 | cards-v2-025 | Сообщество · Каталог | `phraseman://dev_state?onboarding=done&intros=seen&catalog=demo&cards=empty&overlays=off&next=/flashcards_packs`<br>перед кадром: каталог сообщества, «Новые» · cards=empty стирает черновик набора — иначе над списком строка «Продолжить создание набора», которой нет в образце · **только гост | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Карточки › /flashcards_recall_session — 2

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 53 | cards-gap-008 | Карточки · Напиши — нет карточек с переводом | `phraseman://dev_state?onboarding=done&intros=seen&cards=notranslation&plus=on&overlays=off&studyTarget=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target`<br>перед кадром: «Напиши»: нет карточек с переводом · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 54 | cards-section-043 | Вспомни и напиши · Вспомни и напиши | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target`<br>перед кадром: «Вспомни и напиши»: сессия, первая карточка · **только гость (pm clear + онбординг)** | `wait:4000` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Карточки › /flashcards_speaking_session — 5

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 55 | cards-gap-002 | Карточки · Устно — «Тренировка не открылась» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&train_gate=fail_speaking&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all`<br>перед кадром: «Устно»: тренировка не открылась (train_gate=fail_speaking) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 56 | cards-section-040 | Устно — ожидание · Устно — ожидание | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all`<br>перед кадром: «Устно — ожидание»: сессия, подмена речи speech=correct · **только гость (pm clear + онбординг)** | `wait:3000` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 57 | cards-section-041 | Устно — запись · Устно — запись | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all`<br>перед кадром: «Устно»: микрофон нажат — запись идёт · **только гость (pm clear + онбординг)** | `wait:3000; xy:540,1324` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 58 | cards-section-046 | Устно — верно · Устно — верно | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&mode=a&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all`<br>перед кадром: «Устно — верно»: удержание микрофона подменено верным ответом (speech=correct; только русский интерфейс) · **только гость (pm clear + онбординг)** | `wait:3000; xy:540,1324; wait:900; xy:540,1324; wait:1200` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 59 | cards-v2-037 | Ответы · Устно — верно | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&mode=a&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all`<br>перед кадром: «Устно — верно» = cards-section-046 (speech=correct) · **только гость (pm clear + онбординг)** | `wait:3000; xy:540,1324; wait:900; xy:540,1324; wait:1200` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Карточки › /flashcards_training_setup — 3

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 60 | cards-076 | Подготовка тренировки — все состояния · Нет наборов | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&studyTarget=es&overlays=off&next=/flashcards_training_setup?mode=blitz`<br>перед кадром: настройка тренировки без карточек: гость с языком изучения es + cards=empty → «Нет карточек» (studyTarget=es) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 61 | cards-section-038 | Карточек нет · Карточек нет | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&studyTarget=es&overlays=off&next=/flashcards_training_setup?mode=blitz`<br>перед кадром: дубль cards-076: «Карточек нет» (тот же кадр) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 62 | cards-section-056 | Лимит исчерпан (Free) · Лимит исчерпан (Free) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&cards=demo&quota=exhausted&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=blitz`<br>перед кадром: Free: тренировки 30/30 — настройка с пилюлей и «Безлимит с Plus» (прямой маршрут; тап «Тренироваться» при исчерпанном лимите ведёт на пейвол, а не на настройку) | — | Аврора тёмная (Спокойно), по умолчанию | пересъёмка: пилюля «30/30» (D174, код исправлен 35b049b62) |

## Карточки › /flashcards_truefalse_session — 3

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 63 | cards-gap-004 | Карточки · Правда / ложь — быстрый старт: нет карточек | `phraseman://dev_state?onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all`<br>перед кадром: «Правда / ложь»: нет сохранённых карточек (cards=empty, только анонимный гость) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 64 | cards-gap-005 | Карточки · Правда / ложь — «Не удалось подготовить тренировку. Энергия возвращена.» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&train_gate=fail_swipe_prepare&overlays=off&studyTarget=en&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all`<br>перед кадром: «Правда / ложь»: «Не удалось подготовить тренировку. Энергия возвращена.» (train_gate=fail_swipe_prepare) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 65 | cards-gap-006 | Карточки · Правда / ложь — «Не удалось проверить лимит тренировки» | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=on&train_gate=fail_swipe_quota&overlays=off&studyTarget=en&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all`<br>перед кадром: «Правда / ложь»: не удалось проверить лимит (train_gate=fail_swipe_quota) · **только гость (pm clear + онбординг)** | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Карточки › /flashcards_voice_picker — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 66 | cards-gap-036 | Карточки · Голос озвучки — выбор | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&voices=demo&overlays=off&next=/flashcards_voice_picker`<br>перед кадром: выбор голоса озвучки: список как на образце, выбран Samantha (voices=demo) | `tap:#fc-voice-row-dev_voice_samantha` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Настройки и профиль › /(tabs)/settings — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 67 | settings-gap-029 | Настройки · Настройки — верхний слот сообщений | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&slot=top&overlays=off&next=/(tabs)/settings`<br>перед кадром: верхний слот сообщений в Настройках (slot=top) | `see:#settings-message-slot-top` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Настройки и профиль › /settings_edu — 2

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 68 | settings-gap-014 | Настройки · Обучение — верх | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/settings_edu`<br>перед кадром: обучение и озвучка — верх | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 69 | settings-gap-015 | Настройки · Обучение — низ (скорость, голос) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/settings_edu`<br>перед кадром: обучение — низ (скорость, голос) | `scroll:down; scroll:down` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Настройки и профиль › /settings_notifications — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 70 | settings-gap-013 | Настройки · Уведомления — мастер выключен | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/settings_notifications`<br>перед кадром: уведомления: мастер выключен (исходно), строки приглушены | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Настройки и профиль › /support_report — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 71 | settings-gap-035 | Настройки · Поддержка — «Отправить» неактивна (меньше 10 символов) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/support_report`<br>перед кадром: «Отправить» неактивна: меньше 10 символов | `tap:#support-diagnostics-attach-switch; wait:300; tap:#support-report-input; type:short; hidekb; wait:400` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3); без клавиатуры: ввести < 10 символов, затем скрыть клавиатуру (back) — карточка диагностики не перекрыта |

## Обучение, монеты, видео, окна знакомства › /coin_rank — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 72 | coins-005 | Кошелёк и ранги · повышение · недостаточно монет | `phraseman://dev_state?onboarding=done&intros=seen&coinRank=5&overlays=off&next=/coin_rank`<br>перед кадром: повышение ранга: недостаточно монет (у гостя 0 монет) | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Обучение, монеты, видео, окна знакомства › /lesson_irregular_verbs — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 73 | learn-064 | H. Неправильные глаголы · H1 | `phraseman://dev_state?onboarding=done&intros=seen&plus=on&overlays=off&next=/lesson_irregular_verbs?id=12`<br>перед кадром: проверено по коду: экран открывается на вкладке «Учить» (упражнение; lesson_irregular_verbs.tsx:1201 tab по умолчанию learn), параметра для таблицы нет — таблиц | tap:Словарь | Аврора тёмная (Спокойно), по умолчанию | не то состояние: нужен экран-таблица неправильных глаголов «Урок 12 · 18 глаголов» (вкладки «Словарь / Учить»), без dev-плашки «Open debugger…» |

## Обучение, монеты, видео, окна знакомства › /lesson1 — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 74 | learn-032 | D. Урок — сборка фразы · D5 | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&studyTarget=en&lessonintro=skip&mode=b&energy=5&overlays=off&next=/lesson1?id=1%26from=lesson_menu`<br>перед кадром: неверно — сердце потеряно (D5): dev-метка первого неверного слова, режим сердец (mode=b) | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:800` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Пейволы › /lesson_complete — 2

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 75 | paywalls-009 | Встроенные предложения Plus · Результат · первый урок | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&upsell=first_lesson&overlays=off&next=/lesson_complete?id=1%26passed=1%26devResult=38:12`<br>перед кадром: итог урока: мягкое предложение Plus после первого зачёта (upsell=first_lesson; ждём конец анимации наград) | `await:#soft-upsell-card; see:#soft-upsell-card; wait:500` | Аврора тёмная (Спокойно), по умолчанию | пересъёмка: карточка Plus на итоге первого урока (upsell=first_lesson) |
| 76 | paywalls-010 | Встроенные предложения Plus · Результат · три урока | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&upsell=three_lessons&overlays=off&next=/lesson_complete?id=1%26passed=1%26devResult=48:2`<br>перед кадром: итог урока: предложение Plus после трёх уроков (upsell=three_lessons) | `await:#soft-upsell-card; see:#soft-upsell-card; wait:500` | Аврора тёмная (Спокойно), по умолчанию | пересъёмка: карточка Plus на итоге после трёх уроков (upsell=three_lessons) |

## Пейволы › /premium_modal — 5

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 77 | paywall-gap-002 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» свёрнуто | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&next=/premium_modal?context=generic%26source=settings_premium`<br>перед кадром: вход из Настроек — «FREE И PLUS» свёрнуто | `see:#paywall-compare-toggle` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 78 | paywall-gap-003 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» развёрнуто | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&next=/premium_modal?context=generic%26source=settings_premium`<br>перед кадром: вход из Настроек — «FREE И PLUS» развёрнуто | `tap:#paywall-compare-toggle; wait:500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 79 | paywall-gap-005 | Пейвол Plus · Выбран «Месяц» | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&theme=grad_aurora&level=1&overlays=off&next=/premium_modal?context=no_energy%26source=no_energy_modal`<br>перед кадром: выбран план «Месяц» (вход «Энергия закончилась», как в образце) | `tap:#paywall-plan-monthly` | grad_aurora | закрыть после №7 (раздел 1) |
| 80 | paywalls-012 | Цена и покупка · Ошибка до checkout | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&next=/premium_modal?context=no_energy%26source=no_energy_modal%26_dev_state=store_unreachable`<br>перед кадром: покупка: ошибка до checkout (тост через 0,7 с) (вход «Энергия закончилась», как в образце) | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3) |
| 81 | paywalls-016 | Цена и покупка · Статус неизвестен | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&next=/premium_modal?context=no_energy%26source=no_energy_modal%26_dev_state=status_unknown`<br>перед кадром: покупка: статус неизвестен (вход «Энергия закончилась», как в образце) | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3) |

## Шпиль, сообщество, онбординг, аккаунт › /(tabs)/community — 6

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 82 | community-006 | Друзья · список и заявки | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&overlays=off&next=/(tabs)/community`<br>перед кадром: Друзья: входящая заявка (dev friends=demo: заявка от Alex и друг Maria, без подписок Firestore и записей) | `see:#friend-request-row-dev-demo-friend-request-1` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 83 | community-011 | Друзья · заявку не удалось отправить | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=add_network&overlays=off&studyTarget=en&next=/(tabs)/community`<br>перед кадром: Друзья: заявку не удалось отправить — «Связь пропала» (dev_friends_fail=add_network, без сети) · **только гость (pm clear + онбординг)** | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000; tap:#friends-add-found; wait:900` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 84 | community-018 | Друзья · уже друзья | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=add_already_friends&overlays=off&studyTarget=en&next=/(tabs)/community`<br>перед кадром: Друзья: исход «Уже друзья» (dev_friends_fail=add_already_friends, без сети) · **только гость (pm clear + онбординг)** | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000; tap:#friends-add-found; wait:900` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 85 | community-019 | Друзья · заявка уже отправлена | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=add_already_sent&overlays=off&studyTarget=en&next=/(tabs)/community`<br>перед кадром: Друзья: исход «Заявка уже отправлена» (dev_friends_fail=add_already_sent, без сети) · **только гость (pm clear + онбординг)** | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000; tap:#friends-add-found; wait:900` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 86 | community-021 | Друзья · ошибка обновления / офлайн | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=list&overlays=off&studyTarget=en&next=/(tabs)/community`<br>перед кадром: «Связь пропала»: вкладка «Друзья» не загрузилась (dev_friends_fail=list) · **только гость (pm clear + онбординг)** | `wait:1000` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 87 | community-022 | Друзья · приглашение на занятие · модалка | `phraseman://dev_state?onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&friend_event=study_invite&overlays=off&studyTarget=en&next=/(tabs)/community`<br>перед кадром: приглашение на занятие (friend_event=study_invite): кнопки не жать · **только гость (pm clear + онбординг)** | `wait:800; see:#friend-study-invite-modal` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |

## Шпиль, сообщество, онбординг, аккаунт › /(tabs)/home — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 88 | onboarding-003 | Онбординг · Онбординг · Вход идёт долго | `phraseman://dev_state?onboarding=done&intros=seen&guest=required&onbstep=welcome&signin=hold&overlays=off&next=/(tabs)/home`<br>перед кадром: «Вход всё ещё выполняется…» (появляется после 8 с; подмена держит 60 с и отменяет) | `tap:#onboarding-existing-account; wait:1800; xy:540,1902; wait:9500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Шпиль, сообщество, онбординг, аккаунт › /(tabs)/settings — 1

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 89 | auth-gap-012 | Аккаунт · Сменить аккаунт? — с переносом Plus | `phraseman://dev_state?guest=required&onboarding=done&intros=seen&plus=on&plustransfer=on&switch=required&overlays=off&next=/(tabs)/settings?switchAccount=1`<br>перед кадром: окно «Сменить аккаунт?» со строкой «У тебя активен Plus…»; «Продолжить» НЕ жать | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Шпиль, сообщество, онбординг, аккаунт › /account_details — 9

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 90 | auth-gap-001 | Аккаунт · Аккаунт — гость | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/account_details`<br>перед кадром: гость: «Привязать аккаунт», нет почты / способа входа / «Выйти»; ТОЛЬКО ГОСТЬ | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 3) |
| 91 | auth-gap-003 | Вход · Окно входа — телефон уже связан с другим аккаунтом | `phraseman://dev_state?onboarding=done&intros=seen&switch=required&overlays=off&next=/account_details`<br>перед кадром: окно входа: «нужна смена аккаунта» + кнопка «Сменить аккаунт» (вход отдаёт account_switch_required до сети); ТОЛЬКО ГОСТЬ | `tap:#account-link-row; tap:#auth-google-button; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 92 | auth-gap-004 | Вход · Окно входа — прогресс на месте, вход отменён | `phraseman://dev_state?onboarding=done&intros=seen&switch=not_uploaded&overlays=off&next=/account_details`<br>перед кадром: окно входа: «прогресс на месте, вход отменён» (ошибка до сети); ТОЛЬКО ГОСТЬ — «Привязать аккаунт» есть у гостя | `tap:#account-link-row; tap:#auth-google-button; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 93 | auth-gap-005 | Вход · Окно входа — ждёт прогресс другого аккаунта | `phraseman://dev_state?onboarding=done&intros=seen&switch=backup_blocked&overlays=off&next=/account_details`<br>перед кадром: окно входа: «ждёт прогресс другого аккаунта»; ТОЛЬКО ГОСТЬ | `tap:#account-link-row; tap:#auth-google-button; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 94 | auth-gap-006 | Вход · Окно входа — аккаунт восстановлен | `phraseman://dev_state?onboarding=done&intros=seen&restore=restored&overlays=off&next=/account_details`<br>перед кадром: вход → «Восстановить» → в окне входа «Аккаунт восстановлен · Войди ещё раз»; restoreDeletedAccount не вызывается; ТОЛЬКО ГОСТЬ | `tap:#account-link-row; tap:#auth-google-button; wait:1500; tap:Восстановить; wait:1200` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 95 | auth-gap-007 | Вход · Восстановить аккаунт? | `phraseman://dev_state?onboarding=done&intros=seen&restore=offer&overlays=off&next=/account_details`<br>перед кадром: вход → «Восстановить аккаунт?» (13 дней, подставной статус); кнопки не жать; ТОЛЬКО ГОСТЬ | `tap:#account-link-row; tap:#auth-google-button; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 96 | auth-gap-008 | Вход · Аккаунт удалён | `phraseman://dev_state?onboarding=done&intros=seen&restore=retired&overlays=off&next=/account_details`<br>перед кадром: вход в удалённый навсегда аккаунт → окно «Аккаунт удалён» (identity_retired до сети); ТОЛЬКО ГОСТЬ | `tap:#account-link-row; tap:#auth-google-button; wait:1500` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 2) |
| 97 | auth-gap-009 | Аккаунт · Удалить аккаунт? — с входом (14 дней) | `phraseman://dev_state?onboarding=done&intros=seen&delete=fail&account=linked&overlays=off&next=/account_details`<br>перед кадром: окно «Удалить аккаунт?» с «14 дней», НЕ подтверждать; вход — подменой account=linked (без настоящего входа) | `see:#account-delete-button; tap:#account-delete-button` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 98 | auth-gap-010 | Аккаунт · Удалить аккаунт? — гость | `phraseman://dev_state?guest=required&onboarding=done&intros=seen&delete=fail&overlays=off&next=/account_details`<br>перед кадром: гость: окно «Прогресс удалится безвозвратно», НЕ подтверждать; ТОЛЬКО ГОСТЬ | `see:#account-delete-button; tap:#account-delete-button` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |

## Шпиль, сообщество, онбординг, аккаунт › /dev_spire_preview — 4

| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |
|---|---|---|---|---|---|---|
| 99 | spire-009 | 4–6. Ступень · Выход — подтверждение | `phraseman://dev_state?onboarding=done&intros=seen&energy=2&overlays=off&next=/dev_spire_preview?state=step_choice%26spirePanel=off%26exit=1%26tier=0%26floor=4`<br>перед кадром: выход — шторка подтверждения | — | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 100 | spire-gap-004 | Шпиль · Ступень · Задание — послушай и выбери | `phraseman://dev_state?onboarding=done&intros=seen&energy=2&overlays=off&next=/dev_spire_preview?state=step_listen_choose%26spirePanel=off%26tier=0%26floor=4`<br>перед кадром: послушай и выбери | `see:#spire-task-report-0` | Аврора тёмная (Спокойно), по умолчанию | закрыть после №7 (раздел 1) |
| 101 | spire-gap-016 | Шпиль · Итог недели · Итог недели — остаёшься | `phraseman://dev_state?onboarding=done&intros=seen&energy=2&overlays=off&next=/dev_spire_preview?state=weekresult_stay%26spirePanel=off%26tier=0%26floor=4`<br>перед кадром: остаёшься (данные образца: Гранит, этаж 4) | — | Аврора тёмная (Спокойно), по умолчанию | пересъёмка: образец уже по коду — энергия в шапке Пика значком и числом, без капсулы |
| 102 | spire-gap-022 | Шпиль · Главный · Главный — пилюля «бета» | `phraseman://dev_state?onboarding=done&intros=seen&studyTarget=es&energy=2&overlays=off&next=/dev_spire_preview?state=lobby%26spirePanel=off%26tier=0%26floor=4`<br>перед кадром: «бета» рядом с языком (es/de/fr/it): гость по умолчанию с изучаемым es; тап не нужен | `wait:2500; see:#spire-beta-pill` | Аврора тёмная (Спокойно), по умолчанию | добавлено по Дизайну 15.10: пересъёмка на аккаунте без Plus и с друзьями — энергия (SpireEnergyPill без капсулы) и «Друзья на этой неделе» в коде есть |

## Проверка маршрутов (по коду, без эмулятора)

| маршрут next= | файл в app/ | строк с ним в DEV_LINKS |
|---|---|---|
| /flashcards_collection | app/flashcards_collection.tsx | 72 |
| /dev_spire_preview | app/dev_spire_preview.tsx | 40 |
| /ai_dialog_home | app/ai_dialog_home.tsx | 51 |
| /dialogue_v2_freeform | app/dialogue_v2_freeform.tsx | 5 |
| /lesson1 | app/lesson1.tsx | 13 |
| /(tabs)/community | app/(tabs)/community.tsx | 18 |
| /coin_rank | app/coin_rank.tsx | 3 |
| /(tabs)/home | app/(tabs)/home.tsx | 35 |
| /flashcards | app/flashcards.tsx | 210 |
| /account_details | app/account_details.tsx | 22 |
| /(tabs)/settings | app/(tabs)/settings.tsx | 25 |
| /dialogue_v2_memory | app/dialogue_v2_memory.tsx | 6 |
| /flashcards_blitz_session | app/flashcards_blitz_session.tsx | 11 |
| /flashcards_speaking_session | app/flashcards_speaking_session.tsx | 8 |
| /flashcards_truefalse_session | app/flashcards_truefalse_session.tsx | 7 |
| /flashcards_recall_session | app/flashcards_recall_session.tsx | 9 |
| /flashcards_voice_picker | app/flashcards_voice_picker.tsx | 3 |
| /premium_modal | app/premium_modal.tsx | 19 |
| /settings_edu | app/settings_edu.tsx | 4 |
| /flashcards_packs | app/flashcards_packs.tsx | 22 |
| /flashcards_training_setup | app/flashcards_training_setup.tsx | 20 |
| /dev_cards_result_preview | app/dev_cards_result_preview.tsx | 7 |
| /settings_notifications | app/settings_notifications.tsx | 7 |
| /support_report | app/support_report.tsx | 7 |
| /lesson_complete | app/lesson_complete.tsx | 7 |
| /lesson_irregular_verbs | app/lesson_irregular_verbs.tsx | 0 |

Все 26 маршрутов существуют в app/ (dev_state принимает любой next=, начинающийся с «/», app/dev_state_fixtures.ts:544). /lesson_irregular_verbs нет в DEV_LINKS — ссылка learn-064 собрана Макетами.
