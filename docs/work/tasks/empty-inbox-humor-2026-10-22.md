# Task packet: пустой раздел «Сообщения от команды» — с юмором (владелец 22.10)

Governance-ID: TG-D53ADC8F9714
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Пустой список сообщений вместо «Сообщений нет / Здесь появятся новости от команды» говорит (выбор владельца):
**«Новостей нет — значит, всё работает» / «Подозрительно хорошо. Мы тоже следим.»** Одинаково в двух местах:
`components/AppMessagesInbox.tsx` (`emptyTitle` / `emptyBody`) и `components/NotificationCenterButton.tsx` (`empty` / `emptyHint`).

Шутка адаптирована, не калькой; где есть родная поговорка с тем же смыслом — взята она:

| | заголовок | строка |
|---|---|---|
| ru | Новостей нет — значит, всё работает | Подозрительно хорошо. Мы тоже следим. |
| uk | Новин немає — отже, усе працює | Підозріло добре. Ми теж стежимо. |
| en | No news is good news | Suspiciously good. We’re keeping an eye on it too. |
| es | Sin noticias, buenas noticias | Sospechosamente bien. Nosotros también estamos atentos. |
| pt-BR | Sem novidades: tudo funcionando | Bom até demais. A gente também está de olho. |
| vi | Không có tin gì — nghĩa là mọi thứ đều ổn | Ổn đến mức đáng ngờ. Chúng mình cũng đang để mắt. |
| id | Tidak ada kabar — berarti semua lancar | Lancar sekali, agak mencurigakan. Kami juga terus memantau. |
| tr | Haber yok — demek ki her şey yolunda | Şüpheli derecede iyi. Biz de göz kulak oluyoruz. |
| pl | Brak wiadomości — dobra wiadomość | Podejrzanie dobrze. My też mamy na to oko. |

## Scope

In scope: две пары строк в двух файлах. Out of scope: логика, другие строки экранов.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` обоих файлов; тестов со старым текстом нет (поиск «Сообщений нет» / «No messages» / «Здесь появятся новости» в tests/ пуст).

## Rollback

`git revert <коммит>`.
