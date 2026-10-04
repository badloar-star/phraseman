# Task packet: «Окна» по overlays*.html — сверка кода с CSS макета до съёмки сессией 6

Governance-ID: TG-F398C78C8ACD
Governance-ID: TG-A0789428BF0E
Governance-ID: TG-FF085B502A5B
Governance-ID: TG-FE55CC25E87E
Governance-ID: TG-2C785F1B8713
Governance-ID: TG-F4BF63977345
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2), поручение координатора 04.10
Related epic/enabler: гейт «приложение = макет»

## Outcome

Общие окна (вступления разделов, тосты, шторки) совпадают с overlays.html / overlay.css по размерам, отступам,
кеглям (D145), радиусам и цветам.

## Scope

In scope: `components/FeatureIntroModal.tsx` (вступления OV-INTRO-*), `components/RegistrationPromptModal.tsx` (только вид шапки, OV-AUTH-*), далее по кадрам overlays.
Out of scope: `components/ActionToast.tsx` (в чужой работе), логика показа окон, общий каркас шторки HybridSheetShell.

## Architecture

No architecture change: вид.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: тост «Готово/Ошибка…» (ActionToast) ждёт освобождения файла.

## Verification

Сторожа feature_intro_*, specialist_campaigns, typecheck; склейка сессии 6.

## Rollback

`git revert` коммита.
