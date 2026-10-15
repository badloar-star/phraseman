# Task packet: предвыборка метки владения (stamp) на время окна выбора Google

Governance-ID: TG-7E9855736D15
Governance-ID: TG-B9F75050A6DC
Governance-ID: TG-78E46854D5AB
Status: Модуль и тесты — на диске; вшивка в app/auth_provider.ts — патчем, ждёт ревью Ядра (контракт nonce M-1)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Замер входа №7 (15.10): после окна выбора Google вход идёт 9,7 с, из них метка владения анонимным аккаунтом
(`authStampAnonOwnership`) — 1,96 с строго последовательно перед `signInWithCredential`. Координатор 15.10: «Предвыборка stamp на
тапе Google — ДА» с защитами (а) снимок stableId, (б) счётчик попытки, (в) без исключений и с логом [LOGIN-STAMP]; условия —
ревью Ядра (файл общий, контракт nonce M-1) и тесты на гонку: «вход отменён → поздний ответ не кладёт nonce», «аккаунт сменился
за окно → stale_id → stamp заново».

Итог: запрос метки уходит сразу на тапе (пока человек выбирает аккаунт), а его ответ принимается в хранилище nonce ТОЛЬКО в момент,
где раньше стоял последовательный stamp, и только если совпали попытка, stableId, анонимный uid и возраст ответа. Иначе — прежний
последовательный stamp. Поведение при промахе = нынешнее.

## Scope

In scope:
- новый `app/auth_stamp_prefetch.ts` — логика предвыборки и приёма (зависимости внедряются, без Firebase внутри);
- `tests/auth_stamp_prefetch.test.ts` — гонки и все исходы;
- патч `docs/phraseman-2.0/handoff/LOGIN_STAMP_PREFETCH.patch` для `app/auth_provider.ts` (старт на тапе, приём в ветке конфликта,
  гашение попытки в finally входа) — применяется ТОЛЬКО после ревью Ядра и слова координатора.

Out of scope: сервер (`authStampAnonOwnership`, TTL метки), прод-флаги, ветка pending-delete (deferIdentityPreparation — там stamp
и сейчас не ставится), продолжение после «Сменить аккаунт» (resumeCredential — окна нет, прятать нечего).

## Architecture

- `startStampPrefetch(deps)` — номер попытки (`attemptSeq`), снимок {stableId, authUid} после `ensureAnonUser`, запрос метки.
  Промис никогда не отклоняется (ошибка → null + лог). Ответ НЕ кладётся в хранилище nonce.
- `consumeStampPrefetch(prefetch, expected)` — исходы: hit / miss_none / miss_failed / stale_attempt / stale_id / stale_uid /
  stale_age (ответ старше 5 мин — у nonce TTL 10 мин от выдачи сервером). hit → вызывающий кладёт nonce с `receivedAtMs`
  (момент ответа, а не приёма — TTL клиента не дольше серверного).
- `invalidateStampPrefetch(reason)` — в finally входа: поздний ответ отменённого входа только логируется (`late_ignored`).
- Так «поздний ответ не кладёт nonce» гарантировано устройством: принять ответ может лишь та же попытка в точке stamp.

## Security and privacy

- Секрет nonce не логируется и не покидает память — модуль держит ответ только в замыкании своей попытки; лог — факты и коды.
- stableId/uid в лог не идут (только исход и миллисекунды).
- Вопрос Ядру (контракт M-1): при входе «linked_in_place» метка теперь ставится, но nonce не принимается — сервер ensure_link
  не должен требовать nonce при свежей метке без него. Если требует — предвыборку ограничить или принимать nonce и в этой ветке.
- Политика конфиденциальности не затронута: тот же вызов, те же данные, другой момент.

## Ревью Ядра — APPROVE (15.10, ~08:10)

1) linked_in_place: метка смотрится только на двери relink (assertStableOwner, functions/src/auth_identity.ts ~615–640); после
   linked_in_place uid тот же → ensure_link выходит раньше на 'user' (~598). nonce_required недостижим; ограничивать не нужно.
2) Повтор stamp перезаписывает anon_merge_claim целиком (mergeFields, ~2733) → новый nonceHash, старый nonce = nonce_mismatch.
3) Висячая метка безвредна: без nonce → nonce_required, TTL 10 мин; побочно 10 мин закрыта legacy-дверь relink для 1.6.24 на
   этом stableId — на том же телефоне сборка 2.0+.
💸 Каждая предвыборка = вызов + запись users/{id} + инвокация usersWriteRouter; push_token_dedupe выходит рано.

## Слово координатора — ДА (15.10, ~08:10)

Применить в окне 08:30 с прогонами. Условие: итоговый лог `[LOGIN-STAMP] outcome=used|wasted_no_conflict|wasted_cancel` на
каждый вход с предвыборкой — по журналу считать долю впустую потраченных вызовов. >80% впустую → запуск только при признаке
«Google уже занят». Реализация: `settleStampPrefetch(signInResult)` в finally входа; дополнительно `wasted_error` (вход упал не
отменой), `wasted_<исход приёма>` (принимали, но промах), `not_sent` (запрос не ушёл — вызова не было).

## Инцидент окна 08:30 (15.10) и что дальше

- 08:30:02 патч наложен на рабочую копию для прогона; 08:30:24 коммит Ядра 26c6b38e2 взял app/auth_provider.ts целиком вместе с ним.
- Прогон с патчем: 9 FAIL. Из них 2 (auth_provider_behavior: «account switch … quarantined», «… local wipe fails» — ensureAnonUser вызван)
  есть и на чистом HEAD — зона Ядра, передано. Мои 7 — сторожа прежнего устройства:
  - auth_provider_behavior ×3: `authStampAnonOwnership` не вызывается при linked_in_place / сохранении анонима / блоке MAX —
    теперь метка уходит на тапе (одобрено Ядром и координатором) → тест должен проверять «nonce не принят, sequential не было»;
  - legacy_callsite_guard ×2: перепись `getStableId` 11→12 (stableIdentityReads 20→21), `acceptAnonMergeStampResponse` 1→2;
  - auth_provider_stable_link ×1: порядок «stamp раньше credential» в исходнике (функция сдвинулась);
  - s2b_auth_provider_guard ×1: строка payload внутри `stampAnonOwnershipBeforeSignIn`.
- e995ece45 снял только мои строки (сверено построчно). Предвыборка НЕ включена.
- Переделка: один вызов `acceptAnonMergeStampResponse`; payload остаётся в старой функции; чтение stableId до окна — на решение Ядра
  (поднять перепись 20→21 или читать один раз до окна). Патч проверяется целиком на overlay/копии ДО окна и кладётся на диск
  одной командой с коммитом.

## Technical debt

- 💸 +1 вызов функции (и запись метки) на каждый тап «Google», включая отмену и linked_in_place, где раньше метки не было.
  Входы редкие — копейки, но решение за координатором.
- Если JS на время окна выбора приостанавливается до отправки запроса — выигрыша не будет; лог `consume … waitMs=` покажет.

## Verification

- `tests/auth_stamp_prefetch.test.ts` (slot.sh run): hit; отмена → late_ignored, nonce не принят; stale_id → stamp заново;
  stale_uid; stale_age; ошибка запроса → miss_failed; нет identity → miss_none; попытка вытеснена новой → stale_attempt.
- Типы нового модуля и теста; парс.
- После применения патча (по слову) — тесты auth_provider/anon_merge_nonce, затем замер Сверкой: authFetch off/on с предвыборкой.

## Rollback

До применения патча — модуль не подключён (удалить два файла). После — `git revert` коммита вшивки; модуль остаётся неиспользуемым.
