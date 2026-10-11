# Task packet: «Окна» по overlays*.html — сверка кода с CSS макета до съёмки сессией 6

Governance-ID: TG-F398C78C8ACD
Governance-ID: TG-A0789428BF0E
Governance-ID: TG-FF085B502A5B
Governance-ID: TG-FE55CC25E87E
Governance-ID: TG-2C785F1B8713
Governance-ID: TG-F4BF63977345
Governance-ID: TG-3D73E3D5B0A0
Governance-ID: TG-BC79C2E0671A
Governance-ID: TG-C5EB4C2E20E5
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
Governance-ID: TG-062D9236E71B
Governance-ID: TG-79416D8D1EE0
Governance-ID: TG-674A082A6319
Governance-ID: TG-870959767A33
Governance-ID: TG-D5D281C63A63
Governance-ID: TG-4C3DCA114988
Governance-ID: TG-DAF5516D0693
Governance-ID: TG-101A9D4F5231
Governance-ID: TG-8BCFEDF60558
Governance-ID: TG-5BEA63CD6E89
Governance-ID: TG-BBD8F6A3704C
Governance-ID: TG-D076556EC794
Governance-ID: TG-39DB984A7070
Governance-ID: TG-23931876E089
Governance-ID: TG-3687008FBDF9
Governance-ID: TG-29B915A2AEDD
Governance-ID: TG-EB76BB608C5B
Governance-ID: TG-0FB2C1E8B3E7
Governance-ID: TG-40E2653ECCED
Governance-ID: TG-1B502D00877D
Governance-ID: TG-FA34547EE5C2
Governance-ID: TG-268B00A0C49C
Governance-ID: TG-02F09E08DEB9
Governance-ID: TG-1F2B54FE2E1E
Governance-ID: TG-F9E93CCFEB53
Governance-ID: TG-A2A1EC1B2472
Governance-ID: TG-9B9E55DB4AEF
Governance-ID: TG-7FB8A9B7B545
Governance-ID: TG-619B4B0DE74A
Governance-ID: TG-9BD9E3E96F34
Governance-ID: TG-755735F7D77D
Governance-ID: TG-7F0F1ED3A74E
Governance-ID: TG-0EA6603F04BE
Governance-ID: TG-8F43AD4B698E
Governance-ID: TG-8F43AD4B698E
Governance-ID: TG-20FFBC5AC7B8
Governance-ID: TG-81E9E2CE0438
Governance-ID: TG-CE08F5342823
Governance-ID: TG-CE08F5342823
Governance-ID: TG-A53DD9A5FBD6
Governance-ID: TG-DBFAADE9661B
Governance-ID: TG-DBFAADE9661B
Governance-ID: TG-111A0FE1CFF0
Governance-ID: TG-C0EA499673AC
Governance-ID: TG-173D825F996F
Governance-ID: TG-2AA0D0FAE0AC
Governance-ID: TG-2E162FDA2C24
Governance-ID: TG-2E162FDA2C24
Governance-ID: TG-E93725751BE4
Governance-ID: TG-B55975EEC1B5
Governance-ID: TG-AE09292D10A4
