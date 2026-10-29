# Task packet: R61 — «нет Plus», посчитанное без облака, больше не отравляет общий кэш доступа

Governance-ID: TG-D47B5B71AC57
Status: В работе — окно 17:30 (координатор 15.10 ~16:58, 🔴 деньги); до коммита — Opus APPROVE и Ревизор
Owner: 5 · АВТОРИЗАЦИЯ
Related epic/enabler: R61 (разбор Ревизора — коммит 7719049d2)

## Outcome

Плательщик, у которого Plus живёт только в облаке (промокод, VIP, перенос) и локальная копия пуста (переустановка, новый
телефон, свежий вход, до конца загрузочного восстановления), больше не видит Free, лимиты и пейвол 5 минут.
Корень: `app/premium_guard.ts` ветка `allowCloudRefresh === false` клала «нет», посчитанное без облака, в общий
`_cachedAccessResult` на 5 мин (`finish(giftNow)`); любая полная проверка (PremiumContext.tsx:323 → accessResolved=true,
hasPremiumAccess=false) получала это «нет» и в облако не шла. Кладут: lesson_complete, lesson1, ai_companion_session,
use-flashcards, revenue_daily_quota.

## Scope

In scope: `app/premium_guard.ts` — быстрая ветка: «да» кэшируется (finish(true)), «нет» возвращается без записи в кэш;
`app/cloud_sync.ts` — страховка: `invalidatePremiumCache()` и при восстановлении ключей `premium_*`, а не только VIP
(только свои строки, чужие незакоммиченные ханки файла не трогаю — коммит своим патчем); тест
`tests/premium_guard_fast_no_cache_r61.test.ts`.
Out of scope: RevenueCat, покупки, серверные функции, Remote Config. Код оплаты не меняется — только кэш проверки доступа.

## Architecture

Выбран простой вариант Ревизора вместо пометки {value, cloudChecked}: опасение координатора «без кэша Free будет ходить в
сеть на каждом списании квоты» снято фактами Ревизора — `giftCopyStillActive` читает только AsyncStorage
(gift_access_local_copy.ts:53), облачное чтение подарка `readGiftAccessFromCloud` имеет свой кэш в памяти 30 мин по uid
(gift_access_cloud.ts:118) и склейку одновременных запросов, RevenueCat кэширует сам (5 мин), строгие вызовы (bypassCache)
кэш и так обходят. Инвариант: кэшированное «нет» всегда получено полной проверкой (с облаком или после восстановления).

## Security and privacy

Персональных данных не добавляется. Риск в сторону «выдать Plus без права» отсутствует: кэшируется только «да» из тех же
проверенных источников, что и раньше. Смена аккаунта (поколение) — по-прежнему false без записи.

## Technical debt

- Офлайн у Free каждая быстрая проверка заново пробует облако подарка (сбой не кэшируется) — Accept temporarily: быстрый
  отказ, не чтение; владелец — 5 · АВТОРИЗАЦИЯ, пересмотр при следующей правке gift_access_cloud.

## Verification

Тесты: холодная копия + облачный Plus: быстрая → полная → «да» и полная дошла до восстановления; Free: повторные быстрые
проверки не запускают восстановление; быстрая с «да» → кэш true; смена поколения → false. Наборы premium_guard*,
loyalty_gift*, revenuecat_premium_access_contract, stats_premium_access, лог [PREMIUM-GUARD] fast_no_cloud (dev).

## Rollback

Обратный собственный патч по двум файлам + удаление теста.

Governance-ID: TG-DD491B96B318
Факт 16:58: страховка координатора уже есть — cloudHasVipEntitlementState (cloud_sync.ts:4049) включает premium_plan и premium_expiry, invalidatePremiumCache зовётся при их восстановлении (4422/4585/4603). cloud_sync.ts не меняется.

Governance-ID: TG-ADFFA5E0C062
17:02: окно R61 упало на tests/loyalty_gift_local_copy.test.ts — красный и в HEAD: заглушка cloud_sync без peekCloudRestoreInFlight/lastCloudRestoreCompletedAt (FS-READS). Чиню заглушку теста (только тест). Opus R61 — APPROVE 17:00.

## Итог 17:31

R61 ✅ 010436f4f (17:30:53): premium_guard +8/−1, тест premium_guard_fast_no_cache_r61 (на коде до правки красный ровно случай «Plus в облаке»), заглушка loyalty_gift_local_copy дополнена (тест был красным в HEAD с FS-READS 12ac0abeb). 35 наборов / 469 тестов зелёные, типы 0 ошибок, Opus APPROVE. Ревизор одобрил именно этот код в своём сообщении; хэш ему не отправлен — пересылка между сессиями на паузе до сообщения владельца. Попутно #43 ✅ ec993aa93 (17:15).

## R61b (17:40) — тот же «нет без облака» на полном пути

Governance-ID: TG-ED161EA33D9A
Ревизор d0de15329: полный путь тоже кэширует false на 5 мин — по потолку ожидания восстановления (waitCloudAccessRefreshWithCeiling) и при пропуске по TTL после неудачной попытки. Правка: refreshPremiumAccessFromCloudIfNeeded возвращает refreshed | confirmed_skip | unconfirmed; флаг _lastCloudRefreshConfirmed (true после завершённого восстановления, false при ошибке и смене аккаунта); итоговое «нет» при unconfirmed не кэшируется. Тест: восстановление дольше 5 с → false не закэширован → следующая проверка после восстановления даёт true.

Governance-ID: TG-96540753B080
17:42 Opus BLOCK R61b: restoreFromCloud при сбое возвращает false без исключения (applied), premium_guard результат игнорировал → неудача считалась подтверждённой. Исправление без правки cloud_sync: подтверждение = lastCloudRestoreCompletedAt() обновился после начала своей попытки (метка ставится только при status != failed для текущего владельца); при присоединении — status самой попытки; recent_restore — подтверждено. Неподтверждённая попытка → повтор через 2 мин (как catch). Флаг хранится с номером поколения.

Governance-ID: TG-ED26455A7D32
17:41 Opus APPROVE R61b (повтор). Окно откатило на двух старых тестах: заглушки cloud_sync не ставят метку «облако прочитано» после удачного восстановления. Правка: подтверждение = restoreFromCloud() вернул true ИЛИ метка обновилась; заглушка TTL-теста приведена к поведению cloud_sync (удачное восстановление ставит метку).

## R-census (координатор 15.10 ~19:00, п.6): generationFences cloudSync 17→18

Governance-ID: TG-C14218F19766
Красный account_authority_legacy_callsite_guard: +1 captureAccountGeneration в app/cloud_sync.ts:4920 — currentRestoreOwner() (eca3aae21, R20-хвост): только чтение stableId владельца для дедупа восстановления (peekCloudRestoreInFlight / lastCloudRestoreCompletedAt), чтобы Plus-проверка B не присоединилась к восстановлению A и не взяла его метку «облако прочитано». Законная ограда владельца, не утечка: смены поколения/записи нет. Перепись: generationFences 17→18, call:captureAccountGeneration 8→9, occurrences 77→78 — с комментарием-причиной.

## R61c — промокод на стыке с R61b (Ревизор 61374cf4e к 258cde253, координатор ~20:20)

Governance-ID: TG-A3E5FCC26871

Outcome: после «Готово» промокода человек не остаётся до 30 мин на Free. Две ветки promo_code_entry:
1) redeemed, локальная запись VIP не удалась (marker===null): полная проверка могла пропустить облако (TTL 30 мин или
   recent_restore после загрузочного восстановления) и закэшировать подтверждённое «нет».
2) already_redeemed (ответ первого погашения потерялся, человек ввёл код снова): локальная запись VIP вообще не делалась.
Scope: `app/premium_guard.ts` — новая `forcePremiumAccessCloudRestore(reason)`: сброс кэша и TTL, восстановление из облака
напрямую (мимо TTL и recent_restore), подтверждение по возврату/метке «облако прочитано», поколение аккаунта;
`app/promo_code_entry.tsx` — обе ветки зовут её; после — сброс кэша и premium_activated (перечитывание по проверенным данным);
логи [PROMO]; тесты: premium_guard (восстановление идёт даже при свежем recent_restore; сбой — «нет» не кэшируется) и сторож
веток promo. Architecture: без новых сетевых путей — тот же restoreFromCloud, только мимо пропусков, и только по действию
человека (ввод кода) — нагрузка не растёт. Security: «да» по-прежнему только из проверенных источников; VIP вслепую не
ставим в ветке already_redeemed (срок мог истечь). Technical debt: нет новых. Verification: тесты + Opus + Ревизор.
Rollback: обратный собственный патч.

Governance-ID: TG-EEA32DB6F56C
20:27 Opus BLOCK R61c: restorePromoAccessFromCloud вслепую слал premium_activated (событие покупки в сторе) — истёкший VIP по already_redeemed давал интерфейс Plus и isPremium в публичной визитке. Исправление: после force — invalidate и getVerifiedPremiumAccessStatus(); vip_activated только при ok; при «нет» — ничего не выдаём, лог. Force: сначала присоединиться к идущему восстановлению (peekCloudRestoreInFlight), троттлинг на устройстве 2 мин (полное чтение аккаунта). marker===null: вызов после уже отправленных событий (сторож R56 держит 700 знаков до setFeedback).

Governance-ID: TG-075E303BB4C8
20:33 Opus APPROVE R61c (повтор) + 3 совета, вносятся до коммита: ok = getVerifiedVipStatus({bypassCache:true}) (именно VIP, мимо кэша — визитка не получит VIP от другого вида доступа, гонка с reload закрыта); неудача собственной загрузки → повтор через 2 мин (как R61b).

## Итог 20:45

Анонсы по правилам координатора ✅ 6a8c3a911 (20:30). R61c ✅ c83ad8bbd (20:45): Opus BLOCK (premium_activated вслепую) → APPROVE; проверка getVerifiedVipStatus({bypassCache:true}) до vip_activated; force — присоединение к идущему, 2 мин троттлинг, повтор при неудаче. 458/458. Хэши координатору не ушли — пересылка между сессиями на паузе до сообщения владельца. Отдать Ревизору.
