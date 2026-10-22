# Task packet: «Акция с видео» на /contact/ — вычитка английского (Переводчик → 9 · САЙТ)

Governance-ID: TG-FC99E13BC85E
Status: Done — коммит 279b98a3e (хэш для 9 · САЙТ и координатора; сообщения им задержаны их сессиями)
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

`knowly-www/contact/index.html` (effa48638): английские ключи `vp.*` и сообщения формы. Условия владельца (ru) не
тронуты, смысл английского не изменён: 45 секунд, пять соцсетей, хештег и ссылка в описании, пометка «получаю Plus за
участие», два года Plus, продление оплаченного Plus, срок до 31.12.2026 включительно.

Правки, чтобы звучало естественно и тепло, без канцелярита:
- пункт на странице «Video promo — 2 years of Plus» → «Make a video, get 2 years of Plus»;
- «description» → «caption» (так называют подпись к посту в соцсетях), «public page on Instagram» → «public … account»;
- «Name Phraseman» → «Mention Phraseman by name»; «After a check» → «Once we’ve checked it»;
- «your remaining period» → «on top of the time you have left»; «to your profile» → «to your account»;
- галочка: «I’ve said in the video and the caption that I’m getting Plus for taking part»;
- ошибки: «Could not send» → «Couldn’t send it» (заодно в общей форме поддержки — та же строка),
  «Too many requests in a row» → «That’s a lot of submissions in a row…», «Confirm that you disclosed taking part in
  the promotion» → «Please confirm that you’ve said you’re getting Plus for taking part», подсказка под ссылкой
  приведена к виду русской («needs a link to a post on …»).

Русский текст не правил: он написан владельцем.

## Scope

In scope: английские строки на /contact/. Out of scope: русский текст, логика формы, сервер, публикация сайта.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты, сбор данных формы не менялся.

## Technical debt

- Не проверено носителем.
- Ошибка сервера `invalid_username` по-прежнему показывает общее «Couldn’t send it…» — отдельного текста нет (логика 9 · САЙТ).

## Verification

Все 6 встроенных скриптов страницы разбираются; `verify_website_surface_contract.mjs` — ok; поиск тестов со старыми
строками — нет.

## Rollback

`git revert <коммит>`.

## Отступление от точных мест (для 9 · САЙТ и координатора)

Координатор назвал только ключи `vp.*`, строки `say(ru, en)` и подсказку у поля ссылки. Строка ошибки
«Could not send. Try again later or write to our email.» стояла ещё и в общей форме поддержки (2 вхождения в файле);
обе заменены на «Couldn’t send it. Try again later or email us.». Если общую форму трогать не нужно — откачу эту одну
строку по первому слову.
