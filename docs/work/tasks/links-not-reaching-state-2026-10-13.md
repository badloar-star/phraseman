# Task packet: ссылки, не доводившие до состояния (Макеты d68195428) — шаги, две dev-подмены

Governance-ID: TG-207C6D69C11F
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор ссылок; координатор 13.10)

## Outcome

- Пейвол: оба макета (paywall-gaps-states, paywall-price-states) нарисованы с входом «Энергия закончилась» (константа CX) — строки
  paywall-gap-001…006/011…013 и paywalls-011/012/013/016/018 открывают `/premium_modal?context=no_energy&source=no_energy_modal`
  (paywalls-014 уже match — не трогаю). Тосты 011…013 — поверх пейвола, а не Настроек.
- profile-024 / paywalls-022: новая подмена `restorepurchase=empty` — «Восстановить» сразу показывает «Покупок не нашлось», магазин не вызывается.
- community-001: `intros=seen` теперь помечает показанным и тур Шпиля (spire_tour_seen_v1) — локальный флаг устройства, как окна знакомства.
- settings-gap-002/003/030: прокрутка до «PHRASEMAN PLUS» и подвала с версией.
- settings-gap-028: включить «Ежедневное напоминание» (robot_no_cloud=1 — без записи) → тап «Время».
- learn-003: ввод «Present» + hidekb; learn-004: hidekb (образец — кириллица, робот её не вводит).
- Не ссылка: dialogs-019 — реестр уже перепривязан к «Почему так» (вердикт по старой привязке); profile-017 — в приложении нет плашки
  «Перейти на годовой» (код/тема); settings-gap-005 — нужна новая подмена трёхдневного доступа в app/intro_full_access.ts (ядро премиума,
  не моё) — координатору.

## Scope

In scope: scripts/dev_links_r1_steps_chain7.py (переопределения), app/dev_paywall_state.ts (+заглушка), app/dev_state_fixtures.ts
(restorepurchase, тур Шпиля в intros), app/manage_subscription.tsx (dev-ветка до магазина), пересборка DEV_LINKS_R1 (только эти строки).

## Architecture

Флаг в памяти по образцу manage=loading; геттер `__DEV__ && !IS_STORE_RELEASE`, заглушка в сторе.

## Security and privacy

Магазин и облако в подменённой ветке не вызываются; тур Шпиля — локальный флаг.

## Technical debt

- Contain: нет.

## Verification

Гейт заглушек, prod_write_guard, синтаксис; тесты dev_paywall/manage при окне памяти.

## Rollback

Откат коммита.
