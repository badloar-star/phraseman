# Утренний пакет выкладки — 22.10 (Ревизор, только чтение)

Цель — одно «да» владельца на понятный список. Пакет собран 22.10 ночью по HEAD 286a45bc7. Перед выкладкой сверить, что HEAD не ушёл вперёд по `functions/`.

Выкладка только из чистой копии: `bash scripts/deploy_from_clean_head.sh --only "<цели>" --execute`, по одной группе, через светофор. Откат функции — трафик на прежнюю ревизию (`gcloud run services update-traffic <svc> --to-revisions=<ревизия>=100 --region us-central1`).

## ⚠️ Главное, что не видно из описаний коммитов

Функция выкладывается целиком, со ВСЕМ, что накопилось в её коде с прошлой выкладки, а не только с сегодняшней правкой.

| Функция | В проде с | Что уедет вместе с сегодняшним |
|---|---|---|
| `webCheckoutCreate`, `webOrderStatus`, `webPrices`, `paypalOrderCreate` | 02.09 | 22.09 «заказ помечается активированным» (0030f1f68), 21.09 напоминания неактивированным (d4c35faea), 01.10 сторож почты активации (32bc15fe5), 01.10 логи вместо немых catch (f5447d10c), снимки 1.6.16 и 14.09 |
| `stripeWebhook`, `paypalOrderCapture` | 22.09 | 01.10 (32bc15fe5, f5447d10c) |
| `spireReportSteps` | 11.10 | 13.10 D162 «место, повышение, понижение в комнате» (fdc33942b) и ранг монеты соперников (038a89f57) |

Это всё уже в коде и прошло проверки авторов, но в проде этого **ещё нет**. Перед группами Б и А нужен короткий взгляд владельца или Ядра: «да, это и должно работать в проде».

## Группы выкладки

### А. Пик: признак Plus у соседей — a02d64a0a

- **Меняется:** функции `spireJoinRoom` (в проде `-00004-pok`, выкладывалась 21.10) и `spireReportSteps` (в проде `-00002-sub`, с 11.10). Правила и индексы не меняются.
- **Вердикт:** ✅ 0 новых чтений; запись только при смене; подделать нельзя — `spire_groups` пишет только сервер (rules 2632-2635); вводный 72-часовой доступ кольца не даёт.
- **Ждёт:** подтверждения Ядра, что D162 (13.10) должен уйти в прод вместе с этим (см. таблицу выше).
- **Откат:** `spirejoinroom-00004-pok`, `spirereportsteps-00002-sub`.
- **Сборка приложения:** не нужна. Кольцо в Пике клиент 2.0 уже рисует по `members.<uid>.isPremium`.

### Б. Подарок Plus через сайт — 67ba33af2 + 11bbac243 + d64240633

- **Меняется:**
  - функции: новые `giftLinkInfo` и `giftCancel` (в проде их нет); обновятся `webCheckoutCreate` (`-00033-qen`), `webOrderStatus` (`-00024-nus`), `paypalOrderCreate` (`-00032-dih`), `stripeWebhook` (`-00043-gaw`), `paypalOrderCapture` (`-00041-feh`), `webPrices` (`-00026-lev`);
  - `functions/src/index.ts`: +2 экспорта;
  - правила: нет изменений;
  - индексы: `refundStatus ==` в админке идёт по однопольному автоиндексу, новый индекс не нужен;
  - хостинг `knowlyapps.com`: `/gift/`, `/g/`, `/start/thanks/`, `assets/site-config.js`;
  - хостинг админки: `admin/site.html` («К возврату · N», «✓ деньги возвращены»).
- **Вердикт:** ✅. Мой 🔴 (возврат никто не видит) закрыт; 🟡 закрыты: отмена истёкших — 409, список возвратов отдельным запросом, письмо однократно. `paymentLivemode` приходит только из подписанного вебхука Stripe и серверного конфига PayPal.
- **Ждёт:**
  1. Решение владельца по сроку возврата денег (вопрос 18). В письме сейчас срок не обещан — «напишем, когда оформим».
  2. Рубильник `giftDeliveryEnabled` в `knowly-www/assets/site-config.js` сейчас `false`. Сайт показывает выбор «письмом / ссылкой» только при `true`. Включать ВМЕСТЕ с выкладкой функций, иначе ссылка и отмена не работают (комментарий в site-config.js).
  3. Взгляд на накопленное с 02.09 в `web_checkout` (таблица выше).
- **Порядок:**
  1. функции (`functions:default:giftLinkInfo,giftCancel,webCheckoutCreate,webOrderStatus,paypalOrderCreate,stripeWebhook,paypalOrderCapture,webPrices`);
  2. проверка одной тестовой оплатой Stripe в тестовом режиме — она уйдёт как SANDBOX и разбудить не должна;
  3. `hosting:admin`;
  4. `hosting:knowlywww` с `giftDeliveryEnabled: true`.
- **Откат:** ревизии выше. Новые `giftLinkInfo`/`giftCancel` удаляются через `firebase functions:delete`. Сайт откатывается возвратом `giftDeliveryEnabled: false` и повторной выкладкой хостинга.
- **Сборка приложения:** частично. Ссылка `/g/<КОД>` → экран ввода кода (`app/+native-intent.tsx`) уже в коде, но открытие ссылки сразу в приложении (AASA `/g/*` для iOS, intent-filter для Android) — только со следующей нативной сборкой. До неё ссылка открывает страницу `/g/` на сайте, а код вводится вручную — это работает.

### В. Признак «настоящий Plus» в публичном профиле (isPlus) — ждёт коммита Ядра

> **⚠️ СБОРКУ С НОВЫМ КЛИЕНТОМ КОЛЬЦА НЕЛЬЗЯ ВЫПУСКАТЬ РАНЬШЕ ДОЗАПИСИ `backfill_public_profile_is_plus`.** Клиент без поля `isPlus` рисует «без кольца». Если сборка выйдет раньше, у всех настоящих подписчиков кольцо пропадёт до их следующего запуска.
>
> **Порядок:** `publicProfileProjectMine` + spire-функции → дозапись (`functions/scripts/backfill_public_profile_is_plus.ts`: 237 кандидатов, getAll пачками по 100, до 222 записей батчами, один раз, `--apply` только по «да») → контрольный сухой прогон (0 к записи) → только потом сборка с клиентом 4 · ТЕМЫ.
>
> **Продление подписки:** `plusUntilMs` = конец оплаченного периода. Пока профиль переписывает только приложение на старте, у подписчика, продлившегося без запуска, кольцо погасло бы. Решение Ядра (согласовано с Ревизором 22.10):
> - обновлять `public_profiles.{isPlus, plusUntilMs}` из `writeAccessProjection` — вебхук RevenueCat, крон истечения, промо, VIP, админ;
> - ПОСЛЕ коммита денежной транзакции, отдельной попыткой `get` → `update`, только если профиль существует, а не внутри неё;
> - читатель кольца даёт запас 72 ч на опоздание вебхука.
>
> Пожизненный: `isPlus=true`, `plusUntilMs=0`. Этот коммит Ядра тоже должен пройти ревизию до выкладки: он трогает денежный вебхук.

- **Зачем:** сейчас `public_profiles.isPremium` = `isPremiumAccessActive` (`public_profile_projection.ts:112`), то есть с вводным 72-часовым доступом. Поэтому кольцо Plus в сообществе и у друзей горит и у новичков — вопреки правилу владельца.
- **Будет меняться:** серверная функция проекции профиля (`publicProfileProjectMine` и пути, что пишут `public_profiles`) + клиент кольца (4 · ТЕМЫ) читает новое поле.
- **Вердикт:** проверю коммит, когда он появится.
- **Сборка приложения:** **нужна** — клиент должен читать новое поле. Сервер можно выложить раньше: новое поле никого не ломает.

### Г. Денежные уведомления не уходят в сводку — bae288570 ✅ (Ревизор 22.10)

> Деньги (`premiumPurchase`, `refund`, `paymentWebhookFailure`) и `safetyFlag` при опоздании больше часа приходят сразу с пометкой «с опозданием N мин». Деньги сняты и с правила «1.x → сводка». Пометка в ключи дедупликации не входит.
>
> **Решение владельца:** снять ли и `safetyFlag` с правила «1.x → сводка». Ревизор — за: безопасность не зависит от версии, а таких событий единицы.

- **Зачем:** по №48 «старше часа» и «версия 1.x» переводят в понедельничную сводку и денежные типы (`paymentWebhookFailure`, `refund`, `premiumPurchase`). Возврат по отмене подарка тоже `refund`.
- **Будет меняться:** `adminAlertDispatchOnCreate` (в проде `-00010-cox`), `adminAlertRecoveryCron` (`-00009-xed`).
- **Порядок:** до или вместе с группой Б, чтобы оповещение о возврате не потерялось при сбое Telegram.
- **Сборка приложения:** не нужна.

### Д. Политика конфиденциальности — `docs/work/tasks/privacy-1022-plus-gift-streak.patch` (копия: `C:/Temp/claude/privacy-1022-plus-gift-streak.patch`; заменяет `privacy-1021-plus-gift.patch`)

- **Меняется:** `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json` (дата 21.10; Plus-отметка видна другим, в том числе в комнатах Пика; подарок ссылкой). `git apply --check` на HEAD — чисто.
- **⚠️** Приложение показывает свою копию `app/legal/*.json` (`app/privacy_screen.tsx:9-10`), и она уже сейчас отличается от `legal/`. После применения патча прогнать `scripts/sync-legal-html.mjs`: он пишет `app/legal/*.json` и страницы `knowly-www/legal/*`.
- **Порядок:** патч → синхронизация → коммит → `hosting:knowlywww` (страницы политики) В ТОТ ЖЕ день, что группа Б (подарок ссылкой должен быть описан до запуска).
- **Сборка приложения:** **нужна** — экран политики в приложении обновится только с новой сборкой. Сайт обновится сразу.

#### Д. Политика: синхронизация (проверка 9 · САЙТ, 22.10 ночью, ничего не применено)

**Что разошлось и с какого коммита.** Расходятся только `privacy_policy_en.json` и `privacy_policy_en_ios.json`; условия (`terms_*`) совпадают байт в байт. Разница — одно предложение в разделе 5 (опросы):

- `app/legal/` (копия в приложении) — правлена напрямую в **`745b7e79e`** «feat(polls): ship private bundled home poll sets»: *«If you answer a Home poll, we add your choice only to aggregate counts… the server stores an account-linked answered/not-answered marker… but does not retain your selected option…»*.
- `legal/` (канон, из него собирается сайт) этот текст не получил и говорит старое: *«If you answer the daily poll, we store your chosen option linked to your account ID to prevent repeat voting…»* — для нынешних опросов это уже неверно, и сайт показывает именно это.
- Поэтому **сторож уже сейчас красный**: `tests/legal_document_liquid_glass_source_contract.test.mjs` («retain exact hashes and byte-identical mirrors») — хэши `app/legal/privacy_policy_en*.json` не совпадают с ожидаемыми (`f5827d05…`/`3c1edcfb…` при ожидаемых `0ac99a3e…`/`d41b045f…`).
- **Ловушка:** `sync-legal-html.mjs` **перезаписывает** `app/legal/*.json` из `legal/`. Запуск синхронизации БЕЗ патча вернул бы в приложение старый неверный текст про опросы.

**Прогон «патч + синхронизация» на копии** (`C:/Temp/claude/legal-dryrun`, рабочее дерево не тронуто):

- `git apply --check` патча — чисто; `node scripts/sync-legal-html.mjs` — «Wrote app/legal JSON, root, admin, and knowly-www legal HTML».
- После этого `app/legal/*` и `legal/*` **совпадают байт в байт** (все 4 файла).
- Сайт: в `knowly-www/legal/privacy/` и `privacy-ios/` есть **все 27 разделов** JSON; новые тексты на месте и в приложении, и на сайте: опросы («If you answer a poll in the App…» — смысл тот же, что в `745b7e79e`), «Друзья» («Only friends you have accepted…»), «Подарки» (без ника), «Last updated: October 21, 2026».
- Меняются 10 файлов: `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json`, `app/legal/privacy_policy_en.json`, `app/legal/privacy_policy_en_ios.json`, `knowly-www/legal/privacy/index.html`, `knowly-www/legal/privacy-ios/index.html`, `knowly-www/legal/data-deletion/index.html`, `privacy.html`, `admin/oauth-privacy.html`, `admin/v2/oauth-privacy.html`.

**Утренний коммит (одним коммитом, по «да» владельца):**

1. `git apply docs/work/tasks/privacy-1022-plus-gift-streak.patch`
2. `npm run legal:sync`
3. В `tests/legal_document_liquid_glass_source_contract.test.mjs` (строки 67–68) новые хэши:
   - `privacy_policy_en.json` → `ca3dc2107c23e1c789e65e8fe065d7facde5218d7ce7b791d0f41b0ba5bed9b5`
   - `privacy_policy_en_ios.json` → `35dac380ae2c558eb7166bd1069a8e5f606b63b63861421ad7f407357bc1fd6a`
   (посчитаны на результате прогона; если до утра кто-то ещё тронет политику — пересчитать).
4. Прогнать этот тест и `tests/website_*` — должны быть зелёными; сторож станет зелёным впервые с `745b7e79e`.

**Дополнение 22.10 — «Серия вдвоём» (8 · МОМЕНТЫ, `f1c6e19c3` / `4f33676dc`).** В абзац «Together» (§5, en и en_ios — других языков у политики нет) добавлено: друзья видят, **в какие дни текущей недели** человек занимался, и **общую серию подряд — текущую и лучшую**. Новых данных нет (те же active_days), меняется только показ. Заодно исправлена опечатка «progress, Friends» → «progress. Friends». Новая формулировка: *«…those friends may see whether you studied today, which days of the current week you studied, how many days you both studied on the same day — including your shared streak in a row and its best length — the resulting friendship level and progress. Friends may also send or receive nudge signals through this feature.»*
Повторный прогон «патч v3 → legal:sync» на копии (`C:/Temp/claude/legal-dryrun3`): `app/legal` и `legal` совпадают байт в байт (все 4 файла), на сайте (`privacy/`, `privacy-ios/`) все 27 разделов и новая фраза; хэши для теста выше обновлены под v3.

**✅ Д выложена 22.10:** коммит `cd3658991`, `hosting:knowlywww` + `hosting:admin` по прямому «да» владельца (9 · САЙТ). Вживую проверены `/legal/privacy/`, `/legal/privacy-ios/`, `oauth-privacy.html`.

### Д2. Политика v4 — вычитка — `docs/work/tasks/privacy-1022-v4.patch` (НЕ применён; 9 · САЙТ, 22.10)

Источник — вычитка английской политики v3 (список координатору 22.10), правки по его выбору. Сборщик патча: `C:/Temp/claude/privacy-1021/build_v4.py` (каждая замена с проверкой «ровно одно вхождение»). Меняются `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json` и (с решением о возрасте) `legal/terms_of_use_en.json`, `legal/terms_of_use_en_ios.json`; `git apply --check` на HEAD чисто.

**Что меняется (en и en_ios одинаково, кроме §9):**

- **§9 оплата** — больше не противоречит §14: «Phraseman Plus subscriptions… made in the App are billed through the Apple App Store or Google Play [в iOS — только App Store]… Purchases and gifts made on the Knowly website are paid through Stripe or PayPal, as described in section 14.»
- **§8 опросы** — оговорка, что выбранный вариант идёт только в общие счётчики и не хранится с аккаунтом; хранится лишь отметка «уже ответил» (как в §5).
- **§5 удалённые функции** — «the old friend duels (not the current duels with friends described above)», «the old friend gifts (not the current energy gift)».
- **Одно имя — Plus:** «premium status metadata / premium markers / Premium status / premium status» → Plus. Pro — «the Pro profile card, a card style you can get with coins; it is not a subscription» (по `components/profile-card/profile_card_copy.ts`: Pro card покупается за монеты).
- **§14 подарок:** «An unused gift code or gift link expires 365 days after purchase» — факт из кода (`GIFT_CODE_TTL_DAYS = 365`, `functions/src/web_checkout.ts:89`; статус `expired` в `web_gift_endpoints.ts`). Возврат: «issued manually within 5 business days to the original payment method» — как в письме `50b0b6251`.
- **§7** «Friend, gift, referral…» → «Friend, energy-gift, referral…».
- **§5 «Серия вдвоём»** — грамматика и названия как в интерфейсе: «When you study with friends in the Friends section, those friends may see …, how many days you both studied on the same day, your current and longest shared streak, and the resulting friendship level and progress. Friends may also send or receive nudges…»; «Learn Together and Duel» → «Learn together and duels».
- **Дата** «Last updated: October 22, 2026» — если патч применят в другой день, поменять дату в обоих файлах до `legal:sync`.
- **Повтор про сохранённые видео** убран из §5 (полный абзац остаётся в §4).
- **§13** «pronounce English phrases» → «phrases … in the language you are learning».
- **§10** «user name» → «your in-app nickname» (это поле `userName` в `app/error_report.ts`).
- **§18 и §16** — «mistake-explanation … (app versions earlier than 2.0.0)»; «AI dialogues, phrase explanations, mistake feedback (app versions earlier than 2.0.0)».
- **Регистр:** «coin and energy balances», «Peak groups players».
- **Британское написание по всему тексту:** favourites, recognised/recogniser, catalogue, reorganisation, personalise/personalisation, normalised, defence, behaviour, AI dialogues. **Исключение:** «cross-context behavioral advertising» оставлено как есть — это термин закона (CCPA).
- **Возраст — решение владельца 22.10 «Везде 16+»** (через координатора). Политика §2: «We do not knowingly process the personal data of anyone under 16; if we learn that we have, we delete it.»; обращение родителей — «believe that someone under 16 has provided…»; из §18 (законные основания) убрано «child/parent consent where required» — согласия родителей мы не собираем. **Условия (en и ios) — тот же порог:** «We do not knowingly allow anyone under 16 to use the App…», убрано «including a child or minor» из фразы про пользование от имени другого человека; дата условий October 12 → **October 22, 2026**. Условия добавлены в патч, потому что иначе политика (16) и условия (13) противоречили бы друг другу — если условия трогать не надо, убрать из патча их два блока.

**Вычитка iOS-версии:** отличается от основной только платформенными строками (App Store, iOS Keychain, APNs, ATT/IDFA, сроки хранения записей сайта расписаны подробнее). В ней было то же противоречие §9 — исправлено своим вариантом. Других ошибок нет. Замечание без правки: в iOS-версии остались абзацы про Android (системное распознавание речи, Whisper/Hugging Face) — для общего аккаунта на разных платформах это допустимо.

**Прогон на копии** (`C:/Temp/claude/privacy-1021/sync4`, рабочее дерево не тронуто): патч → `node scripts/sync-legal-html.mjs` → меняются **16 файлов**: 10 из Д плюс `legal/terms_of_use_en*.json`, `app/legal/terms_of_use_en*.json`, `knowly-www/legal/terms/index.html`, `terms.html`. Во всех копиях нет «under 13», «child or minor», «child/parent»; везде есть «under 16». `app/legal` и `legal` совпадают байт в байт; дата в en и ios одна, она же во всех 6 HTML-копиях; на сайте есть новые фразы (365 days, 5 business days, shared streak, favourites, AI dialogues). `legal_document_liquid_glass_source_contract` + `legal_sync_idempotent_contract` — **18/18**. Фразы, на которые опираются `support_diagnostics_privacy_contract`, `aa_guest_honesty_contract`, `smart_reminder_wiring_contract`, `spire_old_names_guard`, на месте; ни один тест не ссылается на изменённые фразы.

**Применение (одним коммитом, выкладка — по «да» владельца в чате 9 · САЙТ):**

1. `git apply docs/work/tasks/privacy-1022-v4.patch`
2. `npm run legal:sync`
3. В `tests/legal_document_liquid_glass_source_contract.test.mjs` (строки 67–68 и 71–72):
   - `privacy_policy_en.json` → `7d055c9fb07d174d2a962949585328e7cbffa8bb960a9a06c80255746bae306f`
   - `privacy_policy_en_ios.json` → `c41b7b7a4ae0301a5fe4184342d62219fbb9ff93df0582bdbab83c7556d4989b`
   - `terms_of_use_en.json` → `c32bf3c62fc17f20140089cce445a88f552f9ae272f4c8c4b0eb1697c53150a3`
   - `terms_of_use_en_ios.json` → `2f9471c0d85d199ad13f2cfcf17e8df1c377762e7c394008fb8f66840cbec51c`
   (при другой дате хэши пересчитать.)
4. Legal-тесты зелёные → коммит → `hosting:knowlywww` + `hosting:admin`. Копия в приложении — со следующей сборкой.
5. **Для Ядра:** `functions/src/generated/support_repo_context.json` (контекст ИИ-ответов поддержки) содержит старые «under 13» и «child or minor» — пересобрать `functions/scripts/build_support_repo_context.js` перед ближайшей выкладкой функций, иначе поддержка будет отвечать по старым условиям.

## Что ещё лежит невыложенным в `functions/` (с 21.10, кроме групп выше)

| Коммит | Функция | В проде с | Статус |
|---|---|---|---|
| 90db69ba4 «Серия вдвоём» (21.10) | `friendsNudge` (`-00009-gix`) | 04.09 | не выложен. Вместе уедут 01.10 удаление наград «Вместе» (952b3121f), лог push (d49b3f5bb), i18n 14.10 (1bf5288b4). Мой вердикт ✅, 🟡 — в журналы попадают полные stableUid. Ждёт решения: выкладывать ли «Серию вдвоём» сейчас, клиент — со сборкой. |

Выложены и в пакет не входят: `mistakePracticeSyncEvents` (-00014-fiz), `adminGetAnalyticsSnapshot`/`Trends` (-00027-rek / -00021-sed), `spireJoinRoom` 22001d33e (-00004-pok), №48 (3 функции), таймаут итога занятия 02d7897f3.

## Что требует НОВОЙ СБОРКИ приложения, а не только сервера

1. В — кольцо по `isPlus` у чужих (клиент читает новое поле).
2. Д — экран политики внутри приложения (`app/legal`).
3. Б — открытие ссылки `/g/<КОД>` сразу в приложении (AASA и intent-filter). Без сборки работает ручной ввод кода.
4. «Серия вдвоём» — клиентская часть (`app/friends_together/pair_streak.ts`).

Только сервер или сайт, без сборки: А, Б (кроме п.3), Г.

## Предлагаемый порядок утром

1. Г (денежные уведомления) — как только Ядро закоммитит.
2. А (Пик) — после подтверждения D162.
3. Д (политика: патч → синхронизация → коммит).
4. Б (подарок): функции → тестовая оплата → админка → сайт с рубильником.
5. В (isPlus) — сервер после коммита, клиент со сборкой.

## Ядро: попутные изменения (1 · ЯДРО, 22.10 ночью, только чтение)

Метод: `git log --since=<дата выкладки функции>` по файлам функции и её общим модулям + просмотр диффов. Выкладка функции несёт ВЕСЬ код functions/src на HEAD (одна кодовая база), но поведение функции меняют только файлы её пути вызова — их и смотрел.

### А. Пик — `spireReportSteps` (в проде 11.10, -00002-sub)

| Коммит | Что | Вердикт |
|---|---|---|
| fdc33942b (13.10) D162 | отчёт о ступенях пишет `members.<uid>.weekCoins` той же записью | **да.** D162 уже НАПОЛОВИНУ в проде: `spireJoinRoom` выложен 21.10 (22001d33e) и пишет weekCoins при входе. Без `spireReportSteps` соседи видят монеты только на момент входа. Место/повышение по монетам — под рубильником `rankBy` (по умолчанию ступени) и считается кроном итога, не этой функцией |
| 038a89f57 (13.10) | ранг монеты соперника `members.<uid>.coinRank` той же записью | **да.** Клиент 2.0 его уже шлёт и рисует; вход в комнату пишет его с 21.10 |
| a02d64a0a (21.10) | `isPremium` той же записью | **да** (группа А) |
| ddde39503 (15.10) D195 | в `stars_ledger.ts` только новый тип причины `legacy_bonus` | **нейтрально** — путь начисления монет Пика не меняется |
| 3d38cd00b, 3ed0dcf5f, 368c2e669, b9f716cc9, c87cd7010 | `spire_finalize_core` / крон итога / удаление ботов | **не касается** `spireReportSteps` (другие функции) |

Вывод А: выкладывать `spireReportSteps` + `spireJoinRoom` можно, попутное должно работать в проде.

### Б. Сайт и подарок — `webCheckoutCreate`, `webOrderStatus`, `webPrices`, `paypalOrderCreate` (02.09), `stripeWebhook`, `paypalOrderCapture` (22.09)

| Коммит | Что | Вердикт |
|---|---|---|
| 0030f1f68 (22.09) | при оплате у кода явное `orderId`/`createdBy: 'web_checkout'` → `promoCodeRedeem` помечает заказ `activated` | **да.** `promoCodeRedeem` (половина пары) в проде с 04.10; именно отсутствие второй половины дало 4 «зависших» заказа, которые я исправил вручную 21.10. На `orderId` опирается и `giftLinkInfo` |
| d4c35faea (21.09) | в `web_checkout.ts` только `export` параметров отправителя и функции письма | **нейтрально.** Сам крон напоминаний (`web_activation_reminders`) — ОТДЕЛЬНАЯ функция, в проде его нет (`gcloud functions list`), этой выкладкой он НЕ включается. Включать — отдельное решение владельца (это письма покупателям) |
| 32bc15fe5, 04a5ef488 | сторож письма активации + досылка | **да** — письма с кодом надёжнее |
| f5447d10c, 17047a3c8 | логи вместо немых catch | **да**, поведения не меняет |
| 1bbd27a3d (14.10) D188 | фраза сертификата только из нейтральных | **да**, решение владельца |
| 67ba33af2, 11bbac243, d64240633 | подарок | **да** (группа Б) |

Вывод Б: попутное должно работать в проде, флагов не требует. Единственное, что могло бы «включиться неожиданно» — крон напоминаний — этой выкладкой не включается.

### «Серия вдвоём» — `friendsNudge` (04.09, -00009-gix)

| Коммит | Что | Вердикт |
|---|---|---|
| 952b3121f (01.10) PM-170 | убраны награды «Вместе» из `friendsNudge` (10 строк) | **да**, решение владельца D78. Отдельные функции клейма наград выкладка `--only friendsNudge` НЕ удаляет — останутся в облаке для старых клиентов 1.x, пока их не удалят по имени |
| 1bf5288b4 (14.10) | тексты друзей без «английского» и мужского рода | **да** |
| d49b3f5bb, f5447d10c, 17047a3c8 | логи | **да** |
| 90db69ba4 (21.10) | серия вдвоём в пуше | **да / решение владельца.** Новый текст пуша сработает у ВСЕХ при серии ≥ 2 — не за флагом `friends_together_enabled` (замечание Моментам 21.10). Если владелец хочет «за флагом» — до выкладки обернуть |

### Как выложить только нужное, если что-то попутное нельзя

Сейчас такого не нашёл. Если понадобится: `firebase deploy` всегда берёт код с HEAD целиком, поэтому «только нужное» = снимок от коммита ДО нежелательного + cherry-pick нужного во временную копию (`git archive <база>` → наложить `git diff <a>..<b> -- <файлы>` → выкладка из копии). Ветки и worktree не создаются.

### Тесты functions целиком на HEAD

Полный прогон стоит в очереди на слот после текущих проверок кольца Plus (одна тяжёлая команда за раз). Результат допишу сюда строкой ниже.

**Результат полного прогона functions (чистая копия HEAD 94059b82c, один прогон через слот, 22.10 ночью):** 872 набора — 810 зелёных, **62 красных** (104 из 9878 тестов). Полный вывод: scratchpad Ядра `full_functions_94059b82c.out`.
Красные, связанные с группами пакета, — **разобрать ДО выкладки**: `app_check_sealed`, `gift_access`, `gift_perk_producers_contract`, `revenuecat_transfer_phase2`, `spire_pack_build_multilingual`, `spire_pack_flags_fail_closed`, `spire_week_simulation`, `spire_zone_warning_push`. Тесты, которые прогонял сам (кольцо Plus, вебхук, крон истечения, оповещения, Пик-isPremium), зелёные. Основная масса красных — `content_factory/*` и `accounts_v2_migration/*` (Learning V2 и миграция аккаунтов), к группам пакета не относятся. Разбор «чьё и почему» Ядро не успело — следующий шаг.

## Красные наборы functions (Ревизор, 22.10 — по выводу Ядра `full_functions_94059b82c.out`, чистая копия HEAD 94059b82c)

Разбор 8 наборов, касающихся групп пакета. Чтение вывода и кода, тесты повторно не гонялись.

| Набор | Что падает | Дефект или тест | Блокирует | Кто чинит |
|---|---|---|---|---|
| `app_check_sealed` | `git ls-files functions/src` → «not a git repository»: чистая копия собрана `git archive`, а тест сканирует файлы через git | **окружение прогона**, не код | нет | Ядро: в тесте читать файлы через `fs`, если `.git` нет (или гнать этот набор в рабочем дереве) |
| `spire_pack_build_multilingual`, `spire_pack_flags_fail_closed`, `spire_week_simulation` | нет `functions/src/generated/spire_multilingual_{es,fr,de,it}.json` → пул 0 заданий | **окружение прогона**: файлы в `.gitignore:353-356`, их пересоздаёт сборка (`functions/package.json` build → `scripts/copy_generated_assets.js` из `content/arena-multilingual/generated/*/tasks.jsonl`). Прогон jest без сборки их не видит | нет. Выкладка идёт через `deploy_from_clean_head.sh`, где сборка обязательна, и `content/arena-multilingual` входит в выгрузку | Ядро: перед jest на чистой копии запускать `node scripts/copy_generated_assets.js` (или `npm run build`) |
| `gift_access` | ждёт строку `export { introFullAccessClaim } from './gift_access';`, а в `index.ts:1056` экспорт в двойных кавычках `"./gift_access"` | **устаревший тест** (сверка текста, сломана форматированием) | нет. Функция в группы пакета не входит, в проде с 02.09 | Ядро: сверять регуляркой без учёта кавычек |
| `gift_perk_producers_contract` | `pkg.scripts['deploy:safe' / 'deploy:community-gift']` — undefined (скриптов больше нет); исходник `complete_claim` — пусто (файл или функция уровня-подарка удалены: `levelGiftReserve` снята 21.10 по №45) | **устаревший тест** | нет | Ядро: удалить или переписать под текущий набор функций |
| `revenuecat_transfer_phase2` | набор **не компилируется**: `__revenueCatWebhookTestHooks.handleShardRefundEvent` убран (осколки сняты с продажи, D103/D136/D139 — их события только логируются `handleRetiredProductEvent`) | **устаревший тест**, но с последствием: из-за ошибки TS не запускается ВЕСЬ набор переноса подписки (transfer), а это денежный вебхук | ⚠️ **группа В (isPlus) — да, до починки**: cbdecef56 меняет `revenuecat_shards.ts`, а его набор переноса сейчас молчит. Группы А, Б, Г — нет | Ядро: убрать или переписать кейс возврата осколков под `handleRetiredProductEvent`, прогнать набор зелёным ДО выкладки вебхука |
| `spire_zone_warning_push` | `spireZoneEdgeStatuses`: края зоны сдвинуты (u4 не `promotion_edge`, u0 и u8 получают статусы) | **скорее устаревший тест**: код функции с 11.10 не менялся, сдвиг пришёл из `spire_residents.ts` c87cd7010 (18.10, «убрать синтетических игроков») — фикстура считает ботов живыми | нет. `spireZoneWarningCron` в группы пакета не входит. Но это воскресный пуш «ты у края зоны»: если тест прав, текст пуша уйдёт не тем людям | Ядро: сверить фикстуру с правилом без ботов; если расхождение реальное — до воскресенья 20:00 |

**Итог для утреннего «да»:** А, Б, Г, Д — красные наборы не блокируют. В — выкладывать вебхук RevenueCat только после того, как `revenuecat_transfer_phase2` снова скомпилируется и будет зелёным.

## Дополнения Ревизора 22.10 (перенос из журнала, пачки 3.149–3.150)

- **Группа Г — опция (вопрос 19):** bd56321bb — safetyFlag снят с «1.x → сводка» поверх bae288570, 28/28. Ревизор — за. Те же две функции и откат.
- **Группа В — коммит Ядра cbdecef56 ✅:**
  - `syncPublicProfilePlusAfterCommit` вызывается ПОСЛЕ транзакции (вебхук RevenueCat, крон истечения), только `update`, без обрывков, никогда не бросает;
  - `realPlusUntilMs`: `null` — нет Plus, `0` — бессрочно;
  - читатель кольца: `isPlus === true && (plusUntilMs === 0 || plusUntilMs + 72 ч > сейчас)`.
- **Не в пакет до исправления:** «Позвать» из f1c6e19c3 — 🔴 очередь зовов без владельца (`friends_nudge_queue_v1`). После смены аккаунта зов может уйти от имени другого.
