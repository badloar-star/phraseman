# Task packet: ночной перенос дизайна PhraseMan 2.0 Liquid Glass (Настройки, Шпиль, Paywall A/D, таббар)

Governance-ID: TG-127D4157DE37
Governance-ID: TG-A90889E38080
Governance-ID: TG-0CCE266A7630
Governance-ID: TG-EA4E012D23E3
Governance-ID: TG-705C2FD7F97F
Governance-ID: TG-FBDED796BC17
Governance-ID: TG-9715A54E8CA8
Governance-ID: TG-F5DE94AC2969
Governance-ID: TG-C6147C69A381
Governance-ID: TG-B7F5AE4FF733
Status: In progress
Owner: сессия Claude Code 08393a61 (Sonnet) + исполнители-субагенты
Related epic/enabler: PhraseMan 2.0 — перенос макетов Liquid Glass (см. HANDOVER_CLAUDE_2026-09-29.md, APP_TRANSFER_TRACKER.md)

## Outcome

Владелец 29.09.2026 поручил довести перенос дизайна «1 в 1 с макетов» без вопросов до утра. Видимый результат: корень «Настроек» (PRF-01) в стиле Liquid Glass; нижнее меню без подписей с крупными иконками по центру (сделано, коммит c94aa653f); экраны «Шпиль» за выключенным по умолчанию клиентским ключом; пейвол вне онбординга — только A «Классический» и D «Два тарифа» по макету paywall-review.html. Успех — узкие source-контракт-тесты зелёные, снимки Android-эмулятора на сборке после правок, честный отчёт «исходники / устройство / ждёт владельца». Не «готово», пока нет снимка устройства.

## Scope

In scope: `components/v2/V2TabBar.tsx`; `app/(tabs)/settings.tsx` (только корень PRF-01); `app/(tabs)/community.tsx`, `app/tab_page_model.ts`, `components/spire/*`, `app/spire/*` (скрытая вкладка «Шпиль» за флагом); файлы пейвола A/D (`app/paywall_a.tsx`, `app/paywall_d.tsx`, `components/paywall/*`, `app/paywall_copy.ts`, `app/paywall_variant.ts`); новые тесты в `tests/`; документы трекера в папке макетов.

Out of scope: Главная и хаб «Карточки» (утверждены владельцем — не менять); онбординг и его пейвол; purchase-hook (`app/paywall_purchase.ts`), Store Offerings, entitlement и лимиты; серверные флаги Шпиля, `spireJoinRoom`, любые записи в боевой Firebase (в т.ч. `adminBackfillVideoPacks`); удаление тем/ассетов; юридические тексты; игра-ступень Шпиля (нет данных и списания энергии).

## Architecture

Без архитектурных изменений: новые экраны используют существующие токены (`liquidGlassTokens`, `useV2GlassStyle`), систему переводов и remote-кэш `remote_config_cache_v1`. Вкладка «Шпиль» — новый sub-runtime id `'spire'` в `SUB_RUNTIME_OWNER_IDS`, гейт двойной: клиентский ключ (по умолчанию выключен) и `config/spire_v1.enabled`; при выключенном Шпиле клиент не вызывает `spireJoinRoom`, `spireFlushNow`, загрузку пакета недели. Инвариант: purchase/entitlement-код не меняется.

## Security and privacy

Аутентификация/права не меняются. Новых сборов данных нет: Шпиль читает уже кэшируемый конфиг и локальные данные; имена/аватары участников комнаты до включения не показываются — перед включением для людей нужно проверить, покрывает ли Privacy Policy показ имени и рамки участников комнаты (пометка для владельца). Секреты не добавляются. Кнопки покупки не вызываются.

## Technical debt

- Pay now: таббар — убран мёртвый стиль подписи; тест обновлён.
- Contain: два старых Jest-теста `tests/tab_bar_motion_accessibility_contract.test.ts` и `tests/tabbar_scroll_chrome_contract.test.ts` проверяют устаревший `_layout.tsx` и падают независимо от этой работы — не менялись; владелец/отдельная сессия обновляет ожидания.
- Accept temporarily (владелец решает): конфликт «Безлимит» для Plus vs лимит 1500 пользовательских карточек в коде; purchase-marker до открытия магазина (открытые P1-гонки); пустой каталог «Из видео» до запуска админ-бэкфилла.

## Verification

Тесты: `node --test tests/v2_tab_bar_liquid_glass_theme.test.cjs` (3/3 pass); новые source-контракты Настроек/Шпиля/пейвола — точечно, `--test-concurrency=1`; `npx jest --runTestsByPath tests/tab_page_model.test.ts --runInBand --watchman=false`. Ручной обход: снимки Pixel_8 (Настройки, вкладка Сообщество, пейвол из Настроек, таббар). Доступность: `accessibilityLabel` вкладок сохранён. Артефакт: снимки в `C:\Temp\shots` и отчёт в папке макетов.

## Rollback

Каждый пакет — отдельный коммит; откат — `git revert <sha>` этого пакета. Вкладка «Шпиль» выключается клиентским ключом без релиза. Данные пользователей и права не затрагиваются.

Governance-ID: TG-FBDED796BC17
Governance-ID: TG-9D3AFFE964E9

Governance-ID: TG-7551F854D7D5
Governance-ID: TG-5353A42E97E5
