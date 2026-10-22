# Task packet: два переименованных эпизода урока 3 на 8 языков (Переводчик, координатор 22.10)

Governance-ID: TG-D3DB1789CBCD
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

12 · ТЕОРИЯ переименовала (420ae2b01): урок 3 · 45 «Тот самый» → «У прилавка», урок 3 · 53 «Из чего?» → «Материал».
В `modules/learning-v2/titles/session_titles_i18n_v1.ts` (dee47469f) обновлены обе строки на 8 языках:

- 3.45 «У прилавка» — uk «Біля прилавка», en «Counter talk», es «Mostrador», pt-BR «No balcão», vi «Bên quầy hàng»,
  id «Di konter», tr «Tezgâhta», pl «Przy ladzie» (отличаются от соседнего 3.44 «У кассы» — повторов в уроке нет).
- 3.53 «Материал» — uk «Матеріал», en «Texture», es «Material», pt-BR «Material», vi «Chất liệu», id «Bahan», tr «Malzeme»,
  pl «Materiał».

en не содержит слов из английских ответов своих эпизодов (сверено скриптом).

## Scope

In scope: две строки модуля. Out of scope: остальные названия, подключение (Learning V2).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

Скрипт проверки 168 × 8 (≤ 2 слов, без повторов в уроке, en без слов ответа); `babel.parseSync`. Полные тесты не гонял —
у всех сессий тишина по прогонам (координатор).

## Rollback

`git revert <коммит>`.
