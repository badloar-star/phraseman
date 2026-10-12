# Task packet: aiConsent=granted (dev, память), testID языков, подсказка выделения Карточек, вид списка у cards-010, пауза строки

Governance-ID: TG-8E35ACDA0A72
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/ai_dialog_consent.ts, components/settings/StudyLanguagePicker.tsx, app/flashcards/CollectionGalleryView.tsx, app/dev_state_cards_demo.ts, scripts/dev_links_r1_steps.py

## Outcome

1. `dev_state?aiConsent=granted`: подмена ответа гейта согласия на ИИ-диалоги ТОЛЬКО в памяти (recordAiDialogConsent не вызывается, в облако ничего не пишется, в стор-сборке вырезано); aiConsent=granted добавлен во все ссылки сессий диалога.
2. testID `study-lang-row-<код>` на строки языков в StudyLanguagePicker + шаги settings-gap-020/021.
3. Дефект cards-007: подсказка «Выбери ещё N карточек…» в режиме выделения наезжает на последний ряд карточек — подложка/отступ в стиле «Тень», проверка на 360 dp.
4. cards-010: вид «Стопка» не должен переживать фикстуры cards=custom50/demo_published/notranslation (сброс вида).
5. dialogs-029: пауза строки (шаг `settle:<мс>`).

## Scope

In scope: dev-модуль и точка подключения в модуле согласия, testID-атрибуты, раскладка подсказки выделения, сброс вида в фикстурах, шаг settle в роботе, данные ссылок.
Out of scope: запись согласия, юридические тексты, онбординг/аккаунт.

## Architecture

No architecture change: dev-подмена значения гейта в памяти; остальное — вёрстка и данные.

## Security and privacy

Согласие на ИИ — юридически значимый факт: подмена НЕ создаёт запись и не вызывает облачную функцию; в стор-сборке недоступна. Политику не меняем (новых данных нет).

## Technical debt

Pay now: без подмены Сверка не может войти в сессии диалогов на госте.

## Verification

Тесты: подмена в dev даёт granted без записей, в стор-сборке недействительна; контракт раскладки Карточек; ссылки/робот. Проверка типов не запускается (просьба координатора).

## Rollback

Откат коммитов.
