# Task packet: шторка «Изменить имя» поднимается над клавиатурой

Governance-ID: TG-8BDB51EC07BD
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (координатор 12.10, кадры Макетов settings-gap-025/026)
Related epic/enabler: components/account/NicknameEditModal.tsx, components/modal_fx/HybridAlertShell.tsx

## Outcome

Шторка имени (placement="bottom") поднимается вместе с клавиатурой: поле, строка «Имя свободно / занято», «Отмена / Сохранить» видны над клавиатурой; человек может сменить имя. Логи `[NICKNAME-KB]` (событие клавиатуры, высота, screenY, высота окна, режим) и `[MODAL-KB]` (применённый отступ шторки).

## Scope

In scope: `HybridAlertShell` — для `placement="bottom"` отступ снизу = перекрытие клавиатуры, ТОЛЬКО при явном `avoidKeyboard` (другие нижние шторки — EnergyNeededSheet, ThemedChoiceModal — не меняются); `NicknameEditModal` передаёт `avoidKeyboard` и пишет `[NICKNAME-KB]`; тест.
Out of scope: другие окна, вид шторки (цвета, размеры) — только позиция при открытой клавиатуре.

## Architecture

Причина: `paddingBottom: bottomSheet ? 0 : max(24, insets.bottom, keyboardInset)` — для нижней шторки перекрытие клавиатуры считалось, но не применялось. Android `adjustResize` (AndroidManifest) не сжимает окно RN `<Modal>`, поэтому перекрытие = высота клавиатуры (`getKeyboardBottomInset`). Правка — использовать уже посчитанный `keyboardInset` для нижней шторки при `avoidKeyboard`.

## Security and privacy

Нет данных; в логах — пиксели и режимы.

## Technical debt

- Contain: подъём нижней шторки включается флагом `avoidKeyboard`, а не для всех нижних шторок — EnergyNeededSheet и ThemedChoiceModal без полей ввода не меняются. Сторож — `tests/nickname_sheet_keyboard_contract.test.ts`. Выход: если другой нижней шторке понадобится поле ввода, она включает тот же флаг.
- Accept temporarily: на Android шторка поднимается по `keyboardDidShow` скачком, без анимации подъёма. Владелец — «5 · АВТОРИЗАЦИЯ», пересмотр после кадров Сверки; плавный подъём — только по макету.

## Verification

Тест `tests/nickname_sheet_keyboard_contract.test.ts`; `tests/account_modals_liquid_glass_source_contract.test.mjs`; `tests/layout_stability_contract.test.ts`; пересъёмка Сверкой settings-gap-024/025/026 (`namecheck=checking|available|taken`).

## Rollback

Откат коммита: шторка возвращается к прежнему (перекрытой клавиатурой) положению.
