# Сайт подарка Plus — тексты ru/en (Переводчик → 9 · САЙТ)

Governance-ID: TG-28A4FF0AE9DC
Status: Ready for 9 · САЙТ
Owner: «10 · ПЕРЕВОДЧИК» (тексты); вставка — 9 · САЙТ (`knowly-www/**`)

## Языки сайта

`knowly-www/assets/site-i18n.js`: `SUPPORTED = ['en', 'ru']` — значит, нужны ru (вычитка) и en.
Страница `/gift/` уже имеет en. На `/g/<КОД>` и в подарочной части `/start/thanks/` **английского нет вовсе** —
англоязычный получатель ссылки видит русский текст. Ниже — всё готовое.

## 1. `/gift/` — выбор способа (вычитка)

| ключ | ru | en |
|---|---|---|
| gf.deliver | Как вручить | How to deliver |
| gf.d.email | Письмом | By email |
| gf.d.email.sub | код на твою почту | code to your inbox |
| gf.d.link | Ссылкой | As a link |
| gf.d.link.sub | **отправишь в мессенджере** (было «отправишь сам» — мужской род, D188) | **you send it in any messenger** |
| gf.hint.email | (верно) | (верно) |
| gf.hint.link | (верно) | (верно) |
| emailLabel.email / .link | (верно) | (верно) |
| termsLead.email / .link | (верно) | (верно) |

## 2. `/g/<КОД>` — страница получателя (en нет — добавить)

| смысл | ru (верно) | en |
|---|---|---|
| title | Тебе подарок · Phraseman | A gift for you · Phraseman |
| ярлык | Подарок | Gift |
| загрузка | Проверяем подарок… / Секунду. | Checking your gift… / One moment. |
| кнопка | Открыть в Phraseman | Open in Phraseman |
| нет приложения | Нет приложения? Установи его, войди — и открой эту ссылку ещё раз. Или введи код вручную: Настройки → Промокоды. | No app yet? Install it, sign in, and open this link again. Or enter the code yourself: Settings → Promo codes. |
| копировать | Копировать / Скопировано ✓ | Copy / Copied ✓ |
| заголовок с именем | {Имя}, тебе подарили {план} | {Name}, you've got {plan} as a gift |
| заголовок без имени | Тебе подарили {план} | You've got {plan} as a gift |
| планы | месяц Phraseman Plus / год Phraseman Plus | a month of Phraseman Plus / a year of Phraseman Plus |
| от кого | От: {Имя}. | From: {Name}. |
| пояснение | Открой подарок в приложении — Plus включится одной кнопкой. Если Plus уже есть, он продлится. | Open the gift in the app — Plus turns on with one tap. If you already have Plus, it will be extended. |
| redeemed | Подарок уже открыт · Этот подарок уже активирован. Если это был не ты — спроси у дарителя. | Gift already opened · This gift has already been activated. If it wasn't you, ask the person who sent it. |
| cancelled | Подарок отменён · Даритель отменил этот подарок. Ссылка больше не работает. | Gift cancelled · The sender cancelled this gift. The link no longer works. |
| expired | Срок подарка истёк · Ссылка действовала 365 дней. Напиши дарителю или в поддержку. | Gift expired · The link was valid for 365 days. Message the sender or support. |
| unknown | Подарок не найден · Проверь ссылку целиком — возможно, она скопировалась не полностью. | Gift not found · Check the whole link — it may not have been copied completely. |

## 3. `/start/thanks/` — после оплаты (en нет — добавить)

**Способ «Ссылкой»**

| смысл | ru (верно) | en |
|---|---|---|
| заголовок | Ссылка-подарок готова | Your gift link is ready |
| пояснение | Отправь её в любом мессенджере. Ссылка откроет Phraseman, и подарок включится одной кнопкой; если Plus уже есть — он продлится. Копия ссылки — у тебя на почте. | Send it in any messenger. The link opens Phraseman and the gift turns on with one tap; if they already have Plus, it will be extended. A copy of the link is in your inbox. |
| кнопка | Скопировать ссылку / Скопировано ✓ | Copy link / Copied ✓ |

**Способ «Письмом»**

| смысл | ru (верно) | en |
|---|---|---|
| пояснение | Это подарочный код: перешли его тому, кому даришь, — запиской или сообщением. Код также отправлен тебе на email и сохранён у нас, так что потерять его невозможно. | This is a gift code: pass it on to the person you're gifting — in a note or a message. The code has also been emailed to you and saved on our side, so it can't get lost. |
| шаг | Получатель вводит код | The recipient enters the code |
| шаг, текст | В приложении: **Настройки → Промокоды** — вставить код и нажать «Активировать». | In the app: **Settings → Promo codes** — paste the code and tap “Activate”. |
| кнопка | Скопировать код / Скопировано ✓ | Copy code / Copied ✓ |

**Отмена (оба способа)**

| смысл | ru (верно) | en |
|---|---|---|
| кнопка | Отменить подарок | Cancel gift |
| вопрос | Отменить? Код и ссылка сразу перестанут работать, деньги вернём вручную через поддержку. | Cancel it? The code and link will stop working right away; we'll refund you manually through support. |
| да / нет | Да, отменить / Оставить | Yes, cancel / Keep it |
| отменён | Подарок отменён · Код и ссылка больше не работают. Деньги вернём вручную — напиши в поддержку с email из оплаты, если мы ещё не связались с тобой. | Gift cancelled · The code and link no longer work. We'll refund you manually — write to support from the email you paid with if we haven't contacted you yet. |
| уже активирован | Подарок уже активирован — отменить его нельзя. | This gift has already been activated, so it can't be cancelled. |
| ошибка | Не получилось отменить. Попробуй ещё раз или напиши в поддержку. | Couldn't cancel. Try again or contact support. |
| нет сети | Нет связи. Попробуй ещё раз или напиши в поддержку. | No connection. Try again or contact support. |

## Scope / Architecture / Security and privacy

Только тексты. Новых данных не собираем: email и имена на сертификате уже были на странице до этой правки.

## Technical debt

- Переводы на en не проверены носителем.

## Verification

Сайт после вставки открывает `/g/<код>` и `/start/thanks/?gift=…` с `?lang=en` и смотрит, что русского не осталось.

## Rollback

Удалить файл.
