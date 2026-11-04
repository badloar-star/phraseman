# Пик: связанная четвёрка включается ВМЕСТЕ (чек-лист среза сборки)

Governance-ID: TG-5273F936B5C6
Status: Ready (скрипт и код готовы, боевой конфиг НЕ переключён)

## Что связано
Тур Пика обещает: «5 учеников с наибольшим числом монет за неделю переходят в следующую лигу, увеличивают запас энергии и получают +1000 монет;
дошедший до последнего этажа переходит в любом случае». Поэтому в момент «сборка в сторе» включаются ВМЕСТЕ:
1. Флаг экрана Пика B (`PEAK_SCREEN_V2_ENABLED` / пульт `peak_screen_v2_enabled`).
2. `config/spire_v1.rankBy = 'coins'` (код среза по монетам уже в HEAD, D190, k=5; вершинники сверх топ-5 — a45dbea1d).
3. `config/spire_v1.coins.promotionBonus = 1000` (сейчас 100).
4. Энергия от Пика: сервер (финализ пишет `spireEnergyDeltas`, `spireJoinRoom` отдаёт `energyBonus`) + клиент — в сборке; деплой функций до сборки.

## Как переключить (одна команда, откат — одна команда)
```
node scripts/spire_release_switch.mjs                      # сухой прогон: что сейчас и что станет
node scripts/spire_release_switch.mjs --execute            # rankBy='coins', promotionBonus=1000 (merge, два поля)
node scripts/spire_release_switch.mjs --rollback --execute # rankBy='steps', promotionBonus=100
```

## Проверено по коду (04.11)
- Награду платит ночной крон (`spire_finalize_cron` → `payoutSpireWeekReward`) ВСЕМ `promoted`, включая вершинников (`topReached`) — +1000 получит и вершинник. Если владелец решит иначе — условие в `spire_finalize_core` (`promotion = promoted ? bonus : 0`).
- Идемпотентность выплаты: итог недели пишется с `rewardStatus`, выплата — транзакция, статус `paid` через merge; повтор финализа/выплаты не удваивает.
- Показ: везде число сервера (`promotionCoins`) — SpireWeekResultCard, MomentPromotion(Short), story peakweek; «100» остаётся только в dev-фикстурах (`app/dev_spire_tier.ts`, `components/spire/spire_preview_fixtures.ts`).
- Экономика: на комнату до (5 + вершинники) × 1000 монет в неделю; активных комнат ≈ активные игроки / 30. Пример: 3000 активных → 100 комнат → до 500 000 монет/нед. + 3000 монет за места. Потолок недельных монет (`weekCoinsCap`) на это не влияет (он про заработок). Если инфляция тревожит — потолок/лестница бонуса делается одним числом `promotionBonus` без кода.
