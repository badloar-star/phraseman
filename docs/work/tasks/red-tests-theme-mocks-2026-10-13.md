# Починка красных тестов после темы новичка и токенов уровней (регрессия Ядра 13.10)

Governance-ID: TG-8A4AEE4827FD
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
Пять красных тестов снова зелёные, код приложения не меняется: заглушки `react-native` в трёх тестах темы получают `useColorScheme` и `Appearance` (их теперь читает `ThemeContext`), хранилище в них изображает существующего человека (`onboarding_done=1`), а два сторожевых теста обновляются под текущие строки `lessons.tsx` (токены уровней и светлая плашка урока).

## Scope
Только тесты: `tests/theme_intensity_slider.test.ts`, `tests/theme_color_level_appearance_runtime.test.ts`, `tests/theme_selection_runtime.test.tsx`, `tests/learning_v2_release_access_contract.test.ts`, `tests/lesson_card_contrast_contract.test.ts`. Приложение, палитры и экраны не трогаются.

## Architecture
Тесты про дефолты существующего человека моделируют «ключей темы нет, онбординг пройден» — это ветка `existing_user_kept`, прежнее поведение. Поведение новичка (пара по системе) закрыто отдельным сторожем в `tests/theme_first_run_default.test.ts`. Сторожевые строки сверяются с реальным кодом, а не ослабляются.

## Security and privacy
Только тестовые файлы; данных и разрешений не касается.

## Technical debt
Строковые сторожа привязаны к тексту `lessons.tsx` и снова устареют при следующем переименовании переменных; полноценная замена — поведенческие тесты, вне этой задачи.

## Verification
Точечный прогон пяти файлов (три через стандартный конфиг, `theme_selection_runtime` через rntl-конфиг).

## Rollback
git revert коммита.
