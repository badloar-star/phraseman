# Task packet: m22 «Энергия закончилась → Plus» — шторка над доком Пика (моменты v3)

Governance-ID: TG-B9F75050A6DC
Governance-ID: TG-78E46854D5AB
Status: В работе — к сборке 16.10
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

По таблице Макетов (docs/phraseman-2.0/evidence/parity_moments_v1/V3_IMPLEMENTED_2026-10-15.md) m22 сейчас — прежний пейвол
`premium_modal` (context no_energy) отдельным окном сразу из `SpireClimbDock`. Эталон v3 (docs/design/v2-app/engagement-moments-v3-all.html,
m22 вариант A, шаблон `plusSheet` в engagement-moments-app.js) — шторка над доком без энергии: плитка ⚡ + чип «Энергия», «Энергия
закончилась», «Следующая — через m:ss. С Plus — без ожидания.», выгода «Энергия не кончается», кнопка «Попробовать Plus» с мелкой
строкой цены, вторичная «Подожду 10 минут». Шторка 440 мс (KitSheetModal), хаптик light, звук flip.

Решение координатора 15.10: к 16.10 — шторка, «Попробовать Plus» открывает ПРЕЖНИЙ полный пейвол (context no_energy, source
spire_no_energy). Путь покупки не трогаем; покупка прямо из шторки — после выпуска, по слову владельца. Цена — только из кэша
магазина (`paywall_price_cache`), нет кэша — строку прячем. Тексты на 9 языков — сессия «Специалист по переводам».

## Scope

In scope: новый `components/spire/moments/SpireNoEnergySheet.tsx` + строки `no_energy_sheet_strings.ts` (9 языков);
`components/spire/SpireClimbDock.tsx` — тап по доку без энергии открывает шторку вместо пейвола; тест шторки (рендер, отсчёт,
обе кнопки, цена из кэша/без кэша); склейка с макетом (Сверка).
Out of scope: путь покупки (`paywall_purchase.ts`, `premium_modal.tsx`), прочие входы в пейвол no_energy, m23.

## Architecture

- Шторка повторяет устройство живой `SpireLastChanceSheet` (m05): KitSheetModal, useFireOnce (один тап на показ),
  отсчёт раз в секунду только пока шторка видна и приложение активно (useRuntimeActive), звук/хаптик на показе.
- Отсчёт — тот же `useEnergyCountdown`, что у дока; цена — синхронный `peekPaywallPriceCache()` + `hydratePaywallPriceCache()`.
- «Попробовать Plus» → закрыть шторку → `router.push('/premium_modal', { context: 'no_energy', source: 'spire_no_energy' })` —
  атрибуция прежняя. «Подожду 10 минут» и свайп/фон — закрыть.

## Security and privacy

Новых данных нет: шторка читает локальную энергию и публичную строку цены из кэша. Политика конфиденциальности не затронута.

## Technical debt

- Мелкая строка эталона «пробный период из магазина · ≈ €4,99/мес»: в кэше цен НЕТ признака пробного (только из магазина,
  «написано = спишется»). До решения — слово «пробный период» только если признак достоверен; иначе строка только с ценой.
- Покупка из шторки (как в эталоне D115) — после выпуска.

## Verification

Тест шторки (slot.sh run); типы; сторожа perf_freeze / layout_stability; склейка «макет | эмулятор» Сверкой (вариант A, светлая и
тёмная), запись появления шторки 440 мс.

## Rollback

`git revert` коммита: док снова открывает пейвол напрямую.
