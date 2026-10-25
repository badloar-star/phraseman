# Task packet: вычитка контекстов пейвола phrase_workshop и plus_server_refused (c161d894a) — 9 языков (Переводчик, координатор 25.10)

Governance-ID: TG-C2AB42310B8E
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Черновики Ядра в `app/paywall_context_texts.ts` и `app/paywall_copy.ts` (заголовки, подзаголовки, преимущества) вычитаны:
- **plus_server_refused**: ru «Не видим твой Plus» / «Если подписка уже оформлена, восстанови покупку. Это бесплатно.» — дословно
  макет, не тронуты. Переводы подзаголовка говорили другое («если нет — оформи здесь», «нажми „Восстановить покупки“…»),
  теперь повторяют ru во всех 8 языках и в обоих файлах. Преимущество en «Free conversation» → «Open conversation» —
  так свободный разговор назван в приложении (Free в пейволе читается как «бесплатный»).
- **phrase_workshop**: uk «фраза» → «вислів» (слово владельца 12.10, 41443be48) — заголовок, подзаголовок, преимущества;
  tr «cümle» → «ifade» (как «Günün ifadesi» и кнопка режима, 300071e1d). pl «przerobionych» оставлено: «przerobić lekcję» —
  обычное «пройти урок» (моё предложение «ukończonych» из c49b06e35 снимаю). id «latihan kartu» — устоявшийся перевод
  «тренировок» в других контекстах, оставлено. Пометки «⚠ ждёт утверждения Переводчика» сняты.

## Scope

In scope: тексты двух контекстов в двух файлах. Out of scope: логика пейвола, источники, иконки.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `paywall_context_texts.ts` и `paywall_copy.ts` правят многие сессии — перед коммитом сверить numstat, при чужих правках только свои хунки.

## Verification

Разбор файлов babel; `paywall_context_layout_contract` (node --test); `dev_hub_paywall_contexts_contract`,
`main_course_paywall_copy`, `paywall_context_headline_contract`, `paywall_copy_contract` через слот.

## Rollback

`git revert <коммит>`.
