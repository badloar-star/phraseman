# Task packet: m22 «Энергия закончилась → Plus» — финальные переводы 8 языков в коде

Governance-ID: TG-3EB0BD9A45DD
Status: In progress
Owner: сессия «Специалист по переводам» (поручение координатора 15.10)
Related epic/enabler: m22, сборка 16.10

## Outcome

Шторка «Энергия закончилась» над доком Пика говорит на всех 9 языках живо и честно: заголовок совпадает с существующим окном энергии,
строка пробного периода нигде не обещает «бесплатно», кнопка в одну строку, без технических слов, на «ты».

## Scope

In scope: `components/spire/moments/no_energy_sheet_strings.ts` — значения uk/en/es/pt-BR/vi/id/tr/pl (финальные строки из 0cf596364);
раздел «ПРАВКИ ПЕРЕВОДЧИКА» с пометкой m22 в `translations-from-design-2026-10-15.md`.
Out of scope: ru (дан координатором), вёрстка `SpireNoEnergySheet.tsx`, путь покупки.

## Architecture

No architecture change: меняются значения в таблице строк; ключи и плейсхолдеры `{t}`, `{price}` те же.

## Security and privacy

Не применимо: только видимые тексты.

## Technical debt

- «Подожду 10 минут» — число зашито, а `{t}` показывает реальный отсчёт. Contain: вынесено координатору и Авторизации, ru без их слова не меняю.

## Verification

`tests/spire_no_energy_sheet_contract.test.tsx` + сторожа i18n (i18n_missing_en_fallback, ru_strings_no_ukrainian_letters,
untranslated_ui_positional) через slot.sh.

## Rollback

`git revert` коммита — вернутся черновые переводы Авторизации.
