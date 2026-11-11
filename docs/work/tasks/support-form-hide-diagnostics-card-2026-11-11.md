# Task packet: форма поддержки без карточки «Техническая диагностика»

Governance-ID: TG-4DC58AC6F0C2
Status: In progress
Owner: сессия Claude (по слову владельца 11.11.2026)
Related epic/enabler: none

## Outcome

Владелец 11.11: «убери "техническая диагностика" при отправке через настройки, не надо им знать это»,
«это не обязательно информировать», «просто мы берём её и так и так».
На форме «Поддержка» (Настройки) больше нет карточки «Техническая диагностика», переключателя
«Приложить журнал» и кнопки «Посмотреть». Журнал технических действий прикладывается к обращению
всегда, как и раньше по умолчанию. Мера успеха: человек видит только поле описания, шаблон и «Отправить».

## Scope

In scope: `app/support_report.tsx` (вёрстка формы и состояние переключателя), сторожа карточки:
`tests/support_diagnostics_card_honest.test.ts`, `tests/support_diagnostics_attach_toggle.test.ts`,
`tests/support_report_contract.test.ts`, `tests/support_report_template_2026_11_05.test.ts`,
`tests/support_report_liquid_glass_source_contract.test.mjs`.

Out of scope: отправка и очередь (`app/support_report_outbox.ts` — без правок, параметр
`attachDiagnostics` остаётся, по умолчанию «приложить»); сам журнал и его очистка; текст Privacy Policy
(нужна отдельная правка по решению владельца, см. ниже); реестр Сверки и шаги съёмки
(`docs/phraseman-2.0/registries/visual_parity.json`, `scripts/dev_links_r1_steps*.py`) — зона координатора.

## Architecture

No architecture change: экран по-прежнему заранее захватывает журнал и передаёт его в отправку;
убран только показ и выбор. Отправка без переданного журнала сама захватывает его с дедлайном — как раньше.

## Security and privacy

Состав данных не меняется (тот же ограниченный журнал: экраны, действия, коды ошибок за 24 часа, без
текста сообщений, паролей и платёжных данных). Меняется информирование и выбор: человек больше не видит
уведомления, не может посмотреть записи и не может отключить приложение журнала.
Privacy Policy, раздел 10, сейчас прямо обещает обратное («the report form tells you that it will be
attached, lets you view the most recent entries before you send, and has a switch to leave the history
out»). До релиза текст политики обязан быть приведён в соответствие — решение и формулировка за владельцем.

## Technical debt

- Contain: расхождение политики и приложения — названо в итоге владельцу как блокер релиза; выход —
  правка `legal/` + `legal:sync`.
- Contain: кадры Сверки «Поддержка — диагностика раскрыта» (profile-014, settings-gap-022, 035) и шаги
  съёмки ссылаются на удалённые элементы — передать координатору на пересъёмку/снятие.
- Pay now: тесты-сторожа карточки переписаны на новый контракт «карточки нет, журнал прикладывается всегда».

## Verification

- `npm run test:one -- tests/support_diagnostics_card_honest.test.ts` и остальные четыре затронутых файла
  (jest — через слот светофора); `node --test tests/support_report_liquid_glass_source_contract.test.mjs`.
- Точечная проверка типов `app/support_report.tsx`.

## Rollback

`git revert` коммита: карточка, переключатель и прежние тесты возвращаются; данные пользователей не затронуты.
