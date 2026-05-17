# Heisenberg UI Locale Audit

Generated: 2026-05-17T18:11:08.155Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1506
- Static triLang calls: 1506
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 53
- triLang missing locale units: 5
- triLang calls missing all planned locales: 1
- Helper missing locale units: 265
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 1
- local-trilang-helper-missing-planned-locales: 53
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/premium_modal.tsx: 54 findings, 270 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:951 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:1638 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(item.textRu, item.textUk, item.textEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2027 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.ru, row.uk, row.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2201 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(item.ru, item.uk, item.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2212 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Остаться с Premium', 'Залишитись з Premium', 'Seguir con Premium')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2262 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Попробовать 3 дня бесплатно?', 'Спробувати 3 дні безкоштовно?', 'Probar 3 días gratis?')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2265 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( 'Магазин показывает trial для этого плана. Оплата начнется только после пробного периода, если не отменить подписку.', 'Магазин показує trial для цього плану. Оплата почнеться л
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2293 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Начать 3 дня бесплатно', 'Почати 3 дні безкоштовно', 'Empezar 3 días gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2306 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Нет, продолжить бесплатно', 'Ні, продовжити безкоштовно', 'No, continuar gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2373 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Попробуй Premium 3 дня бесплатно', 'Спробуй Premium 3 дні безкоштовно', 'Prueba Premium 3 días gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2382 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Без списания сейчас • Отмена в любой момент', 'Без списання зараз • Скасування в будь-який час', 'Sin cargo ahora • Cancela cuando quieras')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2391 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Почему Premium тебе нужен', 'Чому Premium тобі потрібен', 'Por qué necesitas Premium')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2410 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(tag.ru, tag.uk, tag.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2448 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.titleRu, hero.titleUk, hero.titleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2451 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2459 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Что ты получишь', 'Що ти отримаєш', 'Lo que obtienes')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2483 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(b.ru, b.uk, b.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2492 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Для тебя сейчас', 'Для тебе зараз', 'Para ti ahora')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2521 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Что меняется с Premium', 'Що змінюється з Premium', 'Qué cambia con Premium')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2524 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.freeRu, row.freeUk, row.freeEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2525 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.titleRu, row.titleUk, row.titleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2526 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.premRu, row.premUk, row.premEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2528 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.premRu2!, row.premUk2!, row.premEs2!)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2578 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Заморозка цепочки', 'Заморозка стріку', 'Protección de racha')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2580 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Серия не сгорит при пропуске дня', 'Захисти серію — навіть якщо пропустив день', 'Protege tu racha aunque te saltes un día')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2616 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('/ год', '/ рік', '/ año')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2621 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Годовая подписка', 'Річна підписка', 'Suscripción anual')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2624 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( 'Годовой доступ ко всем возможностям Premium', 'Річний доступ до всіх можливостей Premium', 'Acceso anual a todas las funciones Premium', )
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2637 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Бесплатно', 'Безкоштовно', 'Gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2640 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('на 3 дня', 'на 3 дні', 'durante 3 días')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2643 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(`затем ${priceStr} ${periodLabel}`, `потім ${priceStr} ${periodLabel}`, `luego ${priceStr} ${periodLabel}`)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2657 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('...', '...', '...')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2668 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Выбран самый выгодный план', 'Обрано найвигідніший план', 'Plan más rentable seleccionado')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2699 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('/ месяц', '/ місяць', '/mes')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2704 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2707 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( 'Месячный доступ ко всем возможностям Premium', 'Місячний доступ до всіх можливостей Premium', 'Acceso mensual a todas las funciones Premium', )
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2718 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Бесплатно', 'Безкоштовно', 'Gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2721 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('на 3 дня', 'на 3 дні', 'durante 3 días')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2724 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(`затем ${priceStr} / месяц`, `потім ${priceStr} / місяць`, `luego ${priceStr} / mes`)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2736 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('...', '...', '...')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2747 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Выбран гибкий ежемесячный план', 'Обрано гнучкий щомісячний план', 'Plan mensual flexible')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2760 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('/год', '/рік', '/año')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2761 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('/мес', '/міс', '/mes')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2763 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Premium', 'Premium', 'Premium')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2765 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( `🚀 3 дня бесплатно — затем ${ctaPrice}${periodStr}`, `🚀 3 дні безкоштовно — потім ${ctaPrice}${periodStr}`, `🚀 3 días gratis — luego ${ctaPrice}${periodStr}`, )
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2771 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('🚀 Получить Premium', '🚀 Отримати Premium', '🚀 Obtener Premium')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2772 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('🚀 Оформить месячную подписку', '🚀 Оформити місячну підписку', '🚀 Contratar suscripción mensual')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2807 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('✓ Без списания сейчас', '✓ Без списання зараз', '✓ Sin cobro ahora')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2811 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('✓ Отмена в любой момент', '✓ Скасування в будь-який час', '✓ Cancela cuando quieras')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2822 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Восстановить подписку', 'Відновити підписку', 'Restaurar suscripción')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2835 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L('Продолжить бесплатно', 'Продовжити безкоштовно', 'Continuar gratis')
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2845 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( 'Store price appears before purchase.', 'Store price appears before purchase.', 'Store price appears before purchase.', )
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2958 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(trialRu, trialUk, trialEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2970 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L( 'Ссылки Privacy Policy и Terms of Use ниже дополняют условия покупки в магазине приложений.', 'Посилання Privacy Policy та Terms of Use нижче доповнюють умови покупки в магазині
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
