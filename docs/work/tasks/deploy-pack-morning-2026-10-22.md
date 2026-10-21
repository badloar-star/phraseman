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
