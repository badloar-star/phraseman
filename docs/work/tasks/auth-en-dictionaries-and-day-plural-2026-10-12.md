# Авторизация: английский ключ в словарях входа/аккаунта + «день/дни» в окне восстановления

Governance-ID: TG-1D9A6D6B2FE7

## Outcome
- В словарях полосы Авторизации нет пропущенного `en`:
  - `app/privacy_settings.tsx` (22);
  - `components/DeleteAccountConfirmModal.tsx` (13);
  - `components/auth_recovery_modal_model.ts` (2).
- Число по сканеру `scripts/scan_missing_en_dictionaries.mjs` уменьшается на 37; база `config/missing-en-baseline.json` обновлена только вниз.
- `app/account_delete_restore_prompt.ts:82`: вместо «day(s)» — правильные формы «1 day / N days» на всех 9 языках, через общую функцию склонения, если она есть.
- Флаг английского интерфейса `ENGLISH_UI_LOCALE_ENABLED` НЕ трогаем (решение 14.10).

## Scope
- Только перечисленные файлы, их тесты-сторожа и база сканера.
- `app/_layout.tsx` не трогаем: показ «Аккаунт удалён на другом устройстве» уже снят в 289cc8a51.

## Architecture
- Добавляем ключ `en` рядом с `uk` в существующих словарях. Тип `Text8` в Приватности расширяем на `en`.
- `triLang` уже умеет `en`.
- Склонение числа дней — через общий помощник формы множественного числа, если он есть в `constants/i18n`. Иначе — `Intl.PluralRules` с правильными формами для каждого языка.

## Security and privacy
- Только тексты. Данные, сеть и разрешения не меняются, правка политики не нужна.

## Technical debt
- Английский остаётся выключенным. Ключи — подготовка к включению.

## Verification
- `npm run i18n:en-check`: число вниз, `--update` фиксирует новую базу.
- Сторожа Приватности, окна удаления, окна восстановления.
- Проверка синтаксиса.

## Rollback
- `git revert <hash>`.

Governance-ID: TG-1D9A6D6B2FE7 (тот же запрос: дни в окне восстановления — общая функция accountRestorePromptMessage, онбординг зовёт её; CleanOnboarding коммитится блобом от свежего HEAD с пределом строк)
