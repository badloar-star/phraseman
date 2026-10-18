# Task packet: вход Apple, когда почта уже занята аккаунтом Google — сервер привязывает Apple сам

Governance-ID: TG-7A5A65FC3F62
Status: In progress
Owner: Ядро (сессия 1) — сервер; Авторизация — клиентская ветка
Related epic/enabler: владелец 18.10 кнопкой «Входить само» (через координатора). Случай владельца: iPhone, badloar@gmail.com заведён через Google, Apple не привязан → вход Apple падает на `auth/email-already-in-use`.

## Outcome

Человек входит через Apple, его почта уже занята аккаунтом Google. Вход проходит сам, без ошибки и без второго окна Apple:
1. сервер проверяет токен Apple;
2. сервер находит аккаунт с той же подтверждённой почтой Google и привязывает к нему Apple;
3. клиент повторяет вход тем же токеном Apple и попадает в свой аккаунт.

## Scope

- `functions/src/auth_apple_link.ts`:
  - проверка Apple ID token: подпись RS256 по ключам `https://appleid.apple.com/auth/keys`, `iss`, `aud` ∈ {`app.phraseman`, `app.phraseman.siwa`}, `exp`, `nonce = sha256(rawNonce)`, `email_verified`;
  - поиск аккаунта и привязка `apple.com`;
  - callable `authAppleLinkByVerifiedEmail` в us-central1 и europe-west1, как вход.
- Экспорт в `functions/src/index.ts`.
- Клиент — Авторизация. Интерфейс описан ниже.

Вне работы:
- custom token. Отклонён: сессия `sign_in_provider: custom` без метки восстановления отвергается контуром учётной записи (`account_authority_policy.ts`, `classifySignInProvider`), а `authEnsureStableLink` считал бы её не-провайдерской. Повтор тем же токеном Apple даёт настоящую сессию `apple.com`, и второго окна тоже нет.
- Слияние прогресса гостя — нет. Правила владельца 1–3 ведёт клиент: после входа это обычный вход в существующий аккаунт.

## Architecture

```
authAppleLinkByVerifiedEmail({ idToken, rawNonce }) →
  { ok: true, linked: true | false, retryCredential: true }   // linked=false — уже было привязано
  | { ok: false, reason }                                      // тихий отказ, вход идёт прежним путём
```

Порядок:
1. Вызов только со входом (`request.auth`, обычно анонимный гость). Лимиты в памяти экземпляра: 10 в час на uid, 30 в час на IP. База не участвует — вход не падает.
2. Токен Apple проверяется. Любая ошибка проверки → `ok:false reason=apple_token_invalid` + код в журнал.
3. `getUserByEmail(email)` → аккаунт должен:
   - быть не отключён;
   - иметь подтверждённую почту (`emailVerified`);
   - иметь провайдера `google.com` с этой же почтой.
4. Apple `sub` не принадлежит другому аккаунту (`getUsers([{providerId:'apple.com', providerUid: sub}])`).
5. У аккаунта уже есть Apple:
   - тот же `sub` → `linked:false` (уже готово);
   - другой `sub` → отказ.
6. `updateUser(uid, { providerToLink: { providerId: 'apple.com', uid: sub, email } })`.

Журнал `[AUTH-APPLE-LINK]` — исход, причина, длительность. Без почты и без uid (только короткий хэш).

Клиент (Авторизация): ветка `auth/email-already-in-use` (и `account-exists-with-different-credential`) при Apple → вызов → при `ok && retryCredential` → `signInWithCredential(тот же AppleAuthProvider.credential(idToken, rawNonce))` → дальше обычный путь входа. При `ok:false` — прежнее поведение.

## Security and privacy

Привязку разрешают только два независимых подтверждения владения одним и тем же почтовым ящиком: Apple (подпись Apple, `email_verified`) и Google (подтверждённая почта провайдера `google.com`). Так же Firebase связывает аккаунты при политике «один аккаунт на почту».

- Подделать токен нельзя: подпись RS256 ключами Apple, `aud` — только наши идентификаторы, срок жизни, nonce.
- Почта private relay (`@privaterelay.appleid.com`) сработает только при точном совпадении с почтой Google. На практике такого не бывает, отказ безопасен.
- Новых данных не хранится. В журнал не попадают ни почта, ни uid.
- Политика конфиденциальности: Apple и Google уже в ней как способы входа, новых сборов нет.
- App Check не используется (пломба).

## Technical debt

- Ключи Apple в памяти экземпляра на 1 ч. Неизвестный `kid` — одно обновление.
- Повтор входа тем же токеном Apple опирается на то, что Firebase принимает токен повторно в пределах его срока (10 мин). Если нет — клиент открывает окно Apple второй раз. Это запасной путь Авторизации.
- Владелец Ядро.

## Verification

Тесты `auth_apple_link.test.ts` на настоящих RSA-подписях:
- верный токен → привязка;
- чужая подпись, чужой `aud`, истёкший токен, неверный nonce, неподтверждённая почта → отказ;
- нет Google с этой почтой, отключённый аккаунт, Apple `sub` у другого аккаунта, другой Apple у аккаунта → отказ;
- повтор → `linked:false`;
- журнал без почты.

Плюс узкий tsc и сторож регионов.

## Rollback

Не вызывать функцию с клиента. Привязанный Apple снимается в консоли Firebase Auth у аккаунта.
