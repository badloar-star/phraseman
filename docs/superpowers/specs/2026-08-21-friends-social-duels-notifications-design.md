# Friends, Social Events, Duels, and Notifications Design

Date: 2026-08-21  
Status: approved in visual review; pending implementation plan

## Goal

Repair the complete Friends social loop so every action has an understandable sender state, a real recipient outcome, a push notification, a durable bell entry where appropriate, and a working deep link. Remove the recently introduced black top and bottom bands and restore the prior edge-to-edge app presentation.

This design covers the weekly Friends chest, gifts, study invitations, high-fives, direct friend duels, Arena friend selection, a DEV Arena bot, friend-card event markers, and the notification center.

## Approved Product Direction

- Visual direction: **Warm Spark** — warm premium surfaces, amber/gold accents, dark celebratory overlays, restrained humour, and low visual noise.
- Modal copy contains only a title, at most one main message, and action buttons. No kickers, footer hints, duplicated explanations, or decorative microcopy.
- New modals, sheets, toasts, and banners use the Motion Hybrid shared shells and tokens. No local timing or spring constants.
- Bright lime or neon-green surfaces always use dark foreground content.
- Social markers on friend cards use simple code-native vector icons, not generated raster art and not visible text labels such as “За тебя” or “Зовёт”. A numeric duel countdown remains because it is functional.
- Invisible accessibility labels describe every asset marker and icon-only action.

## 1. Edge-to-Edge and Safe Areas

The app must not render artificial black bands above or below the interface.

Implementation must identify the exact recent change that introduced the regression before modifying source. The fix restores the previous edge-to-edge behavior while keeping real device insets for interactive content. Safe-area padding belongs inside themed app surfaces; the native root, navigation container, splash transition, and system bars must not expose black fallback backgrounds during normal navigation or modal presentation.

Acceptance:

- No black top or bottom strip on affected Android and iOS layouts.
- Content remains clear of notches, the Dynamic Island, gesture areas, and navigation controls.
- Opening or dismissing a modal does not briefly flash a black root background.
- Web layout is unchanged except for removal of any matching regression.

## 2. Social Event Architecture

All social actions use one stable event identifier from creation through notification, push, deep link, and UI acknowledgement.

The durable event lifecycle is:

1. Validate the friendship and action-specific rate limit.
2. Create the domain event idempotently.
3. Create the recipient bell entry in the same authoritative operation where supported.
4. Send push best-effort using the same event identifier.
5. Surface the event in foreground UI without duplicating it.
6. Deep-link to the relevant friend, gift, lesson, or Arena state.

Push failure never removes or rolls back the bell event. Repeated delivery of the same push/event never creates a second gift, reward, duel, card animation, or notification row.

New or changed Firestore fields/collections require the matching Firestore Rules update and Jarvis data-contract audit in the same implementation change.

## 3. Friend Card Event Markers

The approved layout is an illuminated avatar ring plus one simple vector-icon marker on the right side of the friend card.

Marker keys:

- `high_five`: the standard Ionicons hand icon.
- `study_invite`: the standard Ionicons open-book icon.
- `duel_invite`: a standard shield icon with a small lightning accent; an active invite also shows the numeric countdown.

Behavior:

- The relevant card performs one restrained entrance animation on the first Friends-screen visit after receiving the event.
- The marker remains until the user opens or dismisses that event, according to its type.
- Opening the card exposes the relevant primary action: start a lesson, open the duel, or acknowledge the high-five.
- Removing the visual marker does not delete the historical bell entry.
- Multiple card-marker events on one friend are ordered by urgency: active duel, study invite, high-five. The card shows one marker at a time; all events remain available from the bell. Gifts use their dedicated celebration and bell entry rather than a fourth card marker.

### Universal icon contract

All active app themes use the same three code-native vector markers. There are no per-theme raster variants, generated marker images, sprite sheets, static image `require()` maps, or bundled social-marker WebP files.

The visual container is also universal: a small porcelain circle, graphite icon, thin teal rim, and restrained amber accent. Its fixed light surface and dark icon preserve recognition across light and dark themes without recolouring the icon set per theme. Semantic meaning never depends on colour alone, and each icon retains an invisible accessibility label.

## 4. Weekly Friends Chest

Production behavior remains once per ISO week and is enforced idempotently by the existing weekly claim identity. A repeated claim returns the original receipt and cannot grant a second reward.

Approved UI:

- The Friends card opens a bottom celebratory sheet.
- Main title: **Сундук открыт**
- Main reward example: **12 жемчужин**
- Primary button: **Забрать**
- Already-open state: **Сундук уже открыт**

DEV behavior:

- A DEV scenario may open the chest once.
- It then shows **Открыт · DEV**.
- Repeating the test requires the explicit DEV-only button **Сбросить сундук**.
- DEV scenarios never create a real economy reward.

Any real chest reward is recorded as one immutable idempotent economy grant event. No snapshot overwrite or standalone balance mutation is allowed.

The claim operation grants the reward before the result sheet is shown. **Забрать** acknowledges and dismisses the completed receipt; it never performs a second grant.

## 5. Gifts

### Sender

The approved picker is a single bottom sheet:

- Header: **Подарок для Ани**
- The user selects one gift.
- Each row shows only the gift name and price.
- One explicit primary button performs the spend and send, for example **Отправить щит · 8**.
- No explanatory hint appears under the button.
- The button disables while the operation is pending.

The spend and the recipient grant are one durable composite idempotent operation. There is no “spend first, grant later” path, no orphan debit, and a retry replays the same receipt.

Success feedback:

- Title: **Подарок отправлен**
- Message: **Щит уже у Ани.**

Failure feedback:

- Title: **Не получилось отправить подарок**
- Primary action: **Повторить**

### Recipient

The approved idle presentation is a centered dark celebratory modal:

- Title: **Подарок от Ани**
- Gift: **Щит цепочки**
- Primary button: **Забрать**

Push and bell:

- Title: **Подарок от Ани**
- Message: **Щит цепочки уже ждёт.**

Incoming gifts never interrupt a user-initiated modal or action. When UI is busy, the gift is queued for the next idle presentation while the push/foreground toast and bell entry appear immediately. The user-initiated gift picker always has presentation priority over an incoming gift celebration.

The recipient entitlement is already durable when the modal appears. **Забрать** acknowledges the delivered gift and dismisses the celebration; it does not execute the grant.

## 6. Study Invitation

Creating the invitation writes a `friend_nudge` bell event and sends a push. `friend_nudge` is a visible supported notification type; it must not be filtered from the bell.

Push:

- Title: **Макс зовёт позаниматься**
- Message: **Пять минут. Одно маленькое занятие. Никаких великих обещаний.**

Bell:

- Title: **Макс зовёт позаниматься**
- Message: **Пять минут на английский?**

Modal opened from push, bell, or friend card:

- Title: **Пять минут на английский?**
- Message: **Макс уже сделал первый шаг — теперь аккуратно передаёт эстафету тебе.**
- Primary button: **Начать занятие**
- Secondary button: **Не сейчас**

`Начать занятие` launches the ordinary next recommended lesson. `Не сейчас` clears the friend-card marker; the bell entry remains until the user deletes it.

## 7. High-Five

The high-five creates a durable bell event, sends a push, and triggers the universal friend-card icon animation. It does not open a blocking modal.

Push:

- Title: **Аня сегодня болеет за тебя**
- Message: **Пятюня получена. Теперь официально нельзя сдаваться.**

Foreground toast:

- Title: **У тебя появился болельщик**
- Message: **Аня оставила пятюню на удачу.**

Bell:

- Title: **Аня болеет за тебя**
- Message: **Пятюня на удачу уже здесь.**

The high-five is an event, not a reversible deletion of recipient history. If the existing profile-like toggle remains, unliking must not retroactively erase a delivered high-five notification.

## 8. Friend Duels

### Entry points

- From Friends: the selected friend identifier and display data are passed directly into the Arena flow. There is no manual identifier input.
- From Arena: choosing “duel with a friend” opens the approved bottom opponent list.
- The list contains real friends. In DEV builds only, it also contains **DEV-бот**.

### Invite lifecycle

An invite persists server-side for 10 minutes and is independent of whether the sender stays on the Arena screen.

Recipient push:

- Title: **Макс решил проверить твою скорость**
- Message: **Смелое решение. У тебя 10 минут, чтобы ответить.**

Recipient modal:

- Title: **Макс решил проверить твою скорость**
- Message: **Проигравший ничего не теряет — кроме пары удобных оправданий.**
- Primary button: **Проверим**
- Decline button: **Сегодня без драмы**

The sender sees the selected opponent in an Arena card with the live countdown and **Отменить вызов**. The user can leave and return without losing the invite.

Invite terminal states:

- Accepted: **Макс принял вызов** / **Арена ждёт. У тебя 90 секунд, чтобы войти.**
- Declined: **Макс сегодня без драмы** / **Вызов отклонён.**
- Canceled by sender: **Кира отменила вызов** / **Вызов больше не активен.**
- Expired: **Вызов остыл** / **Можно бросить новый.**
- Send failure: **Вызов не отправлен** / button **Повторить**

Cancel, decline, and expiry create no penalty or reward.

### Rendezvous and match creation

Acceptance starts a 90-second rendezvous window. Opening the accepted Arena state marks that player ready; no additional “ready” confirmation is required. When both players are present before the deadline, one idempotent match is created and both clients navigate into the ordinary Arena friend-mode match.

If the rendezvous expires, the invite closes without penalty and may be recreated.

The match uses the existing Arena question, timing, answer, score, result, reconnection, and idempotency machinery. A friendly duel does not change competitive rating and cannot be farmed for economy rewards.

### DEV bot

- Visible only in development/testing surfaces.
- Accepts after a short 1–2 second delay.
- Uses the real existing Arena bot engine, not a fake result screen.
- Produces a complete friend-mode match and result flow.
- Grants no rating or economy reward.
- Can be repeated for deterministic end-to-end verification.

Arena source is protected. No Arena file may be rolled back or replaced from historical buffers. The Arena owner decision log and required Arena test suites are updated/run with the implementation.

## 9. Notification Center

The approved design is one unified vertically scrolling feed.

- Ordinary social notifications use the standard light event card.
- Team messages remain in the same feed but use a visually distinct dark/gold card and clear team identity.
- Every row has a 44×44 or larger delete target.
- Deleting one row removes only that notification.
- A deletion shows a short **Уведомление удалено** / **Вернуть** undo action.
- The list uses a single virtualized scroll owner; nested vertical scroll containers are not allowed.
- Opening the bell refreshes unread state. Reading and deleting are separate actions.
- Long lists scroll to the final row without clipping behind device insets or the tab bar.
- Empty state title: **Здесь пока тихо**

Supported social entries include gifts, study invitations, high-fives, duel invites and all duel terminal states. Team-message styling remains distinguishable without relying on color alone.

## 10. Push and Deep-Link Behavior

Each push carries the stable event identifier, event type, actor identifier, and the minimum routing payload.

- Gift → opens the pending gift celebration.
- Study invitation → opens the friend card and study invitation modal.
- High-five → opens Friends and focuses the sender card.
- Active duel → opens the exact invite with accept/decline actions.
- Accepted duel → opens the Arena rendezvous state.
- Terminal duel state → opens the Arena card/history state without recreating an invite.

Foreground receipt uses in-app presentation and never duplicates the bell row. Background or terminated receipt routes after app bootstrap and authentication are ready.

## 11. Error Handling and Rate Limits

- Every action disables its primary button while pending.
- Network errors keep locally committed non-economic UI state where safe and expose a retry.
- Economy-affecting operations replay by idempotency key and never charge twice.
- Social-action rate limits return a friendly action-level error and do not create a bell entry.
- Missing/deleted friends close the action cleanly without navigating to an empty screen.
- Expired deep links resolve to the terminal state, not a generic error.
- Push permission denial does not disable the bell or foreground event mechanics.

## 12. Verification and Acceptance Tests

Focused automated coverage must prove:

- edge-to-edge layout has no black fallback bands;
- production chest is once per week and replays its original receipt;
- DEV chest resets explicitly and grants no real reward;
- gift selection never reports an incoming gift as the sender result;
- gift spend and grant are atomic and idempotent;
- `friend_nudge` appears in the bell and deep-links to the lesson action;
- high-five creates push/bell/card marker without a blocking modal;
- every theme renders the exact same three code-native social marker icons without bundled raster assets;
- direct Friends duel preserves the selected friend;
- Arena friend duel opens the opponent list instead of a manual ID screen;
- invite acceptance, decline, cancel, 10-minute expiry, and 90-second rendezvous are deterministic;
- DEV bot runs through the real Arena match engine;
- notification deletion and undo affect exactly one row;
- team messages are structurally and visually distinct;
- one virtualized notification list owns vertical scrolling;
- foreground, background, and cold-start deep links do not duplicate events;
- accessibility labels and reduced-motion paths work;
- Firestore Rules and Jarvis contracts match any schema changes;
- economy guards reject standalone debits and direct balance writers.

## 13. Explicit Non-Goals

- No chat or free-form friend messaging.
- No manual duel codes or manual friend-ID entry.
- No competitive rating changes for friendly or DEV bot duels.
- No unlimited production chest claims.
- No generated or per-theme raster art for friend-card social markers.
- No extra explanatory microcopy in social modals.
