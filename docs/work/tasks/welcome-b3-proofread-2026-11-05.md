# Task packet: вычитка приветствия B-3 (welcomeCopy) на 7 языках — «вы»

Governance-ID: TG-E983258300F6
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: диспетчер (13), добавка к очереди 05.11

## Outcome

Приветствие B-3 (components/onboarding/welcomeCopy.ts, строки second/third) вычитано на es, pt-BR, vi, id, tr, pl, fr/de при наличии: обращение «вы» там, где языки различают, без пафоса. Правки внесены только в строки текста; ключи и логика не меняются. Успех: хэш или «вычитано, правок нет».

## Scope

In scope: components/onboarding/welcomeCopy.ts — только строковые значения приветствия B-3 (second, third).
Out of scope: логика pick/COIN_WORD, другие экраны, ru/en/uk (не трогаем по поручению).

## Architecture

Строки для онбординга; функция pick выбирает по языку. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Польский остаётся на «ты»-форме (нет формы «вы» без «Pan/Pani»); отмечено для владельца. Носители не проверяли.

## Verification

Файл парсится; ключи не изменены; grep по второй и третьей строке.

## Rollback

`git revert` коммита правки строк.
