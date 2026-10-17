# Task packet: английский интерфейс глазами носителя по главным экранам + сквозной глоссарий 9 языков (координатор 17.10)

Governance-ID: TG-FE221FB2FDD4
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07 — English открыт (67fc0e3ec)

## Outcome

На главных экранах в английском нет:
- калек с русского и канцелярита;
- смеси британского и американского написания;
- строк, которые не помещаются на 360 dp;
- неверных форм множественного числа.

Экраны по порядку: онбординг → Главная → «Сегодня» → урок → итог → Карточки → Диалоги → Пик → пейвол → Профиль и Настройки → уведомления и тосты.

Норма — американское написание (practice, color, center: так 96 % строк). «Dialogues» остаётся как название раздела.

Глоссарий 9 языков: одно понятие — одно слово (карточки, наборы, Пик, монеты, серия).

## Scope

In scope: только значения строк `en` (и при сквозном глоссарии — значения других языков) в словарях экранов. Русский не трогаю.

Out of scope: логика, вёрстка, учебный контент; файлы, которые сейчас правят другие сессии (обхожу и сообщаю).

## Architecture

No architecture change. Меняются только значения строк.

## Security and privacy

Не применимо.

## Technical debt

- Прямые и «умные» апострофы вперемешку (`Don't` / `Don’t`) — Accept temporarily: на экране почти не видно; выравниваю только в строках, которые правлю.

## Verification

- сторожа i18n (`scan_untranslated_ui`, `scan_missing_en_dictionaries`, `scan_narrowed_ui_lang`);
- точечные тесты затронутых экранов через slot.sh — по экрану на коммит.

## Rollback

`git revert` по коммиту экрана.

## Ход (строк поправлено по экранам)

- Онбординг: 16 (en 11, калька «dificultad adulta» и т. п. в es/pt-BR/vi/id/tr/pl 7; ru не тронут)
- Главная и «Сегодня»: 1 («Climb steps in Peak»), остальное чисто
- Урок и итог: 10 + та же кнопка в итоге диалога 1 («Finish the rest (N)»)
- Карточки: 5 по смыслу («Nothing to practice yet», «Community pack» вместо «Community set», «Popular in the community», «I didn’t know») + 14 «Could not» → «Couldn’t» на одном экране одним стилем
- Диалоги: 15 (калька «language contour», «It goes into the field», «has not caught up», «Open Plus:», «Practise» → US «Practice», «lvl.» → «Lvl»)
- Пик: 3 («we move down» → «you move down», «Peak» без артикля как имя раздела, «is overtaking you»)
