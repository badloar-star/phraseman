# Task packet: тексты рефералки — «оформи Plus или Pro» → «оформи Plus» (координатор 14.10, находка Макетов)

Governance-ID: TG-076CC4F3DE1A
Governance-ID: TG-DF2F901D8012
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Продажа вечного Pro снята решением владельца 24.08 («подписку Pro убери полностью»). Пломба — `LIFETIME_SALE_RETIRED = true` в `app/paywall_purchase.ts`. Вечный Pro теперь только приз рефералки.

Тексты рефералки до сих пор зовут «оформи Plus или Pro»: купить Pro нельзя, призыв вводит в заблуждение.

Меняем на «Plus» во всех 9 языках во всех местах призыва:
- окно «Как это работает»;
- окно ввода кода (подсказка и «код принят»);
- текст приглашения;
- подсказка на экране «Пригласи друга»;
- праздничная строка «… оформил Plus»;
- срок «оформить до».

Не трогаем строки для тех, у кого Pro уже есть («У тебя Pro — каждый приз приходит монетами», D100/D105): доступ купивших сохраняется.

## Scope

In scope:
- `components/referral_how_sheet.tsx`;
- `components/referral_code_sheet.tsx`;
- `app/referral_sunset_copy.ts`;
- `app/referral_invite_share.ts`;
- `app/referrals.tsx` — только строки «Plus или Pro»;
- `tests/referral_screens_contract.test.ts` — ожидаемая строка приглашения.

Out of scope: логика квалификации реферала (покупка lifetime у старых сборок по-прежнему квалифицирует), строки для владельцев Pro, реестры копирайта в docs.

## Architecture

Текстовая замена по языкам — ru «Plus или Pro», uk «Plus або Pro», en «Plus or Pro», es «Plus o Pro», pt «Plus ou Pro», vi «Plus hoặc Pro», id «Plus atau Pro», tr «Plus veya Pro», pl «Plus lub Pro» — на «Plus». Грамматика проверена построчно (падеж и порядок слов не меняются).

## Security and privacy

Только тексты.

## Technical debt

- `docs/phraseman-2.0/registries/copy_inventory_full.json` и `visual_parity.json` хранят старые строки. Их обновляют Макеты вслед за кодом (договорённость 14.10).

## Verification

- grep: «Plus или Pro» и аналоги в app/components — 0.
- Тесты: `referral_screens_contract`, `energy_start_cost_contract`.

## Rollback

`git revert` коммита.
