# Task packet: лист «Включить AI-диалоги?» — верх «живой мини-диалог» (вариант в) за флагом

Governance-ID: TG-5CCC6500B397
Status: В работе
Owner: 2 · ДИЗАЙН (поручение координатора 22.10: владелец выбрал вариант (в) из docs/design/v2-app/dialogs-consent-variants.html, 2f80e9ee3)

## Outcome

Верх листа согласия на AI-диалоги — те же пузыри переписки (DialogueConsentChatReplay), но на свету выбранной темы (основа и свет сцены «Диалогов») и с маленьким героем-предметом dialogs_scene_consent в правом верхнем углу; букв-заглушек нет.
Только при DIALOGS_SCENE_V2_ENABLED. При выключенном флаге лист ровно как сейчас. Логика согласия (принять, отклонить, превью, показ один раз) не меняется.

## Scope

- components/dialogs/scene/DialogsSceneBackdrop.tsx — общая подложка сцены (градиент + свет из токенов темы), вынесена из DialogsSceneStage, чтобы сцена и лист не дублировали код.
- components/dialogs/scene/DialogsSceneStage.tsx — использует подложку (вид не меняется).
- components/dialogs/scene/DialogsConsentTop.tsx — верх листа: подложка + пузыри + герой в углу.
- components/AiDialogConsentModal.tsx — только проп illustration под флагом; тексты, кнопки и обработчики не тронуты.
- tests/dialogs_consent_top.test.ts.

## Architecture

DialogsConsentTop читает токены темы (useLv2Glass → dialogsSceneColors) и картинку героя через resolveDialogsSceneArt('consent', …) — до появления файла в реестре стоит заглушка, как у сцены.
Пузыри остаются компонентом DialogueConsentChatReplay без правок: отступ справа 92 даёт место герою (как в эталоне). Герой не перехватывает касания.

## Security and privacy

Согласие и тексты о передаче данных в OpenAI не меняются. Новых данных нет.

## Technical debt

Герой пока заглушка (intro_ai_dialog) до регистрации dialogs_scene_consent в реестре картинок (4 · ТЕМЫ).

## Verification

Типы, тест верха листа и сцены, храповики (типографика, цвета темы, обводки), babel.parseSync, кадры Сверки при флаге и без него.

## Rollback

DIALOGS_SCENE_V2_ENABLED = false возвращает прежний лист; новая ветка в AiDialogConsentModal — одно условное выражение.
