# Task packet: вычитка текстов приветствия B-3 (welcomeCopy.ts)

Governance-ID: TG-81D06CFE4246
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: приветствие B-3, коммит 9101a40c2 (Дизайн, черновик)

## Outcome

Тексты приветствия (экран 1, подписи кнопок) на 9 языках вычитаны: простые слова, ты-форма как в приложении. Меняется одна строка украинского приветствия (без рода в «завантажив»). Успех: вычитка принята координатором, коммит своего файла.

## Scope

In scope: components/onboarding/welcomeCopy.ts (только строка uk первого экрана).
Out of scope: ApprovedWelcome.tsx, ассеты, тесты, docs других сессий, остальные языки (вычитаны без правок).

## Architecture

No architecture change: правка строкового литерала внутри шаблона, структура функций не меняется.

## Security and privacy

Не затрагивается: данных, сети и прав нет.

## Technical debt

No debt: правка одной строки, без новых зависимостей.

## Verification

Визуальной правки нет. Проверка: `git diff` показывает одну строку; `npm run test:one -- tests/welcome_b3_copy_2026_11_04.test.ts` (тест текстов экрана 1 не пинит uk-строку, проверено grep).

## Rollback

`git revert` коммита вычитки; данных пользователя не затрагивает.
