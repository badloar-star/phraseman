# Task packet: сайт knowly-www — все ключи data-i18n имеют английский перевод, пропусков и пустых нет (координатор 02:21)

Governance-ID: TG-DA31A54BCEC6
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: 758f69088, 504f92938 (Сайт)

## Outcome

На страницах сайта (Главная, download, premium, faq, contact, gift, english-level-test, links) каждый `data-i18n` и `data-i18n-aria` имеет непустое значение в `window.I18N.en`. Длинные подписи кнопок отмечены.

Сайт двуязычный (ru + en): «9 языков» здесь — это ru и en.

## Scope

In scope: чтение страниц, скрипт-проверка ключей, правки только текстовых значений en (если найдутся пропуски).

Out of scope: разметка и код сайта; правки, о которых договорились с Сайтом, — их вносит Сайт.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

Нет нового долга.

## Verification

Скрипт `site_i18n_check.cjs` в scratchpad: ключи страницы против словаря.

## Rollback

`git revert`, если будет правка.
