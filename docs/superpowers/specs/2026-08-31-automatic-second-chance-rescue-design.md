# Автоматическое применение подарка «Второй шанс»

**Дата:** 2026-08-31  
**Статус:** owner-selected design; implementation pending  
**Область:** все зарегистрированные учебные сессии Phraseman, кроме Арены

## 1. Решение владельца

Постоянный consumable `attempt_restore_all` больше не предлагается ученику
кнопкой. При третьей педагогической ошибке он применяется автоматически, если
его подтверждённый account-scoped count больше нуля.

Успешное применение одной атомарной операцией:

- уменьшает inventory `attempt_restore_all` ровно на один;
- восстанавливает все три попытки текущей сессии;
- сохраняет уже заработанные в этой сессии руны;
- возвращает ученика к тому же вопросу с тем же порядком вариантов и тем же
  `learnerAttempts`;
- запускает общую анимацию «Хранитель рун» и выбранный короткий SFX.

Если подарка нет, сохраняется текущая механика: незаявленные руны этой сессии
обнуляются, все три попытки автоматически возвращаются, тот же вопрос снова
доступен. Арена не получает ни подарок, ни overlay, ни новый звук.

## 2. Авторитет состояния и атомарность

Точка решения — общий session-attempts runtime после перехода в
`awaiting_recovery`, а не отдельные экраны. Решение не принимается до окончания
гидратации gift inventory.

Ветка с подарком использует существующий
`commitSessionAttemptRecovery({ source: 'gift' })`. Durable composite receipt
остаётся единственным доказательством consume + grant. Анимация не может сама
выдать попытки, уменьшить count или считаться экономическим подтверждением.

Порядок событий:

1. третий уникальный wrong verdict переводит attempts state в
   `awaiting_recovery`;
2. audio/voice/timer текущего задания безопасно останавливается;
3. если `giftCount > 0`, runtime делает gift recovery commit;
4. только после успешного receipt состояние становится `active / 3 attempts`;
5. руны не меняются, тот же вопрос разблокируется, запускаются visual + SFX;
6. если count подтверждённо равен нулю, выполняется нынешний
   `forfeitSessionRunes → restoreAfterSessionRuneForfeit`;
7. повторная доставка одного exhaustion/recovery ordinal не списывает второй
   подарок и не запускает две независимые выдачи.

Техническая ошибка gift commit не должна притворяться отсутствием подарка.
Runtime выполняет ограниченный повтор существующей prepared operation и
сохраняет `awaiting_recovery`. Подтверждённый concurrent consume с итоговым
`attempt_restore_gift_unavailable` переводит поток в обычную ветку без подарка.
Неизвестная storage/identity corruption остаётся fail-closed и показывает
локализованное компактное действие повторной попытки; руны до разрешения ошибки
не обнуляются.

## 3. Общий runtime seam

`useSessionAttemptAutoReset` становится единым оркестратором двух веток. Он
получает readiness/count inventory и gift recovery callback, сохраняет текущий
no-gift callback и возвращает стабильное presentation state:

```text
idle → applying_gift → gift_applied(sequence) → idle
                      ↘ gift_error(retryable)
idle → forfeiting_runes → restored_without_gift → idle
```

Новый `SessionAttemptGiftRescueOverlay` подключается на каждом route, который
уже обязан иметь `useSessionAttempts` и `SessionAttemptsHud`. Реестр и wiring
guard должны падать, если новый неаренный учебный маршрут подключил attempts,
но не подключил автоматический rescue overlay.

На момент дизайна покрываются:

- обычный урок;
- слова урока и неправильные глаголы;
- mistake practice;
- flashcards swipe, Blitz, listening и speaking;
- оба текущих Learning V2 session players;
- будущие неаренные маршруты, обнаруженные session-attempts registry guard.

## 4. Анимация «Хранитель рун»

Владелец утвердил текущую choreography browser-макета.

- Текущий вопрос остаётся видимым под кратким затемнением.
- Выбранный флакон появляется в центре через `opacity + translateY + scale`.
- Золотое кольцо вокруг rune counter явно показывает, что руны защищены.
- Три ruby-heart импульса последовательно летят к трём слотам attempts HUD.
- Подпись `Второй шанс` и `Руны сохранены` кратко подтверждает смысл без
  голоса.
- Overlay имеет `pointerEvents="none"`; successful durable commit сразу
  возвращает input. Декоративная траектория не задерживает следующий ответ.
- Длительность полной сцены — около 2,05 секунды; ключевой смысл считывается
  до 1,35 секунды.
- Анимируются только transform/opacity. Layout HUD и задания не двигается.
- На unmount/background все animation/audio handles очищаются.
- Reduce Motion сразу показывает полный HUD и короткий статичный shield-flash
  с доступным сообщением; полёт и масштабирование отключены.

Цветовая семантика: ruby = attempts, champagne gold = protection, lime только
как небольшой подтверждающий glint. На lime поверхности используется тёмный
foreground.

## 5. Выбранная иконка

Владелец выбрал heart-potion: прозрачный сердцевидный флакон с золотой крышкой
и ровно тремя ruby hearts. Пустая кремовая плашка и её золотая рамка удалены;
за ними восстановлено непрерывное стекло и красное содержимое.

Финальный asset заменяет текущий
`assets/images/level-spin-rewards/attempt_restore_all.webp`, чтобы Spin,
inventory и rescue animation показывали один объект. Перед заменой:

- alpha должен быть настоящим, без запечённой checkerboard/чёрной рамки;
- изображение trim/contain без обрезанных свечений;
- финальный WebP с alpha сжимается примерно quality 72–78;
- asset остаётся 1:1 привязан к существующему static `require()`; новый
  неиспользуемый sibling в `assets/images/**` не создаётся.

## 6. Десять новых ElevenLabs SFX

Старые пять preview-звуков отклонены: они громкие, длинные, дешёвые по
ощущению и не соответствуют сцене. Они не могут попасть в приложение.

Новый preview-pack содержит десять отдельных ElevenLabs Sound Effects V2:

1. мягкий crystal bloom + три тихих heart ticks;
2. тёплый glass drop + три жемчужных импульса;
3. velvet air + три округлых ruby pops;
4. porcelain click + три мягких chime-тона;
5. tiny harp dust + три коротких heart plucks;
6. water-glass shimmer + три капли;
7. felted magic snap + три приглушённых искры;
8. warm wooden charm + три лёгких стеклянных акцента;
9. soft reverse breath + три восстановительных щелчка;
10. pearl shield ping + три очень тихих восходящих тона.

Общие ограничения каждого prompt: `0.65–0.95 s`, no speech, no voice, no
melody, no bass hit, no riser, no explosion, no casino, no metallic clang, no
harsh high frequencies, no long tail. Каждый кандидат проходит одинаковый
постпроцесс: короткие fades, integrated loudness около `-22 LUFS`, true peak не
выше `-6 dBFS`. В preview все десять запускают ту же анимацию с одинаковой
громкостью; только явно выбранный владельцем файл попадает в production assets.

Текущий внешний blocker зафиксирован честно: ElevenLabs отвечает
`401 payment_issue` из-за failed/incomplete invoice. Генератор и десять prompts
готовятся сейчас, но live batch не повторяется до восстановления подписки.
Старые звуки и другой провайдер не используются как скрытая подмена.

## 7. Accessibility и системное аудио

- Overlay не получает фокус и не создаёт дополнительный tap target.
- Screen reader получает один polite announcement: подарок применён, три
  попытки восстановлены, руны сохранены.
- Вся сцена работает без звука; muted/system interruption не меняет recovery.
- SFX проигрывается через существующий app-owned sound lifecycle, уважает
  системную громкость и настройку звуков приложения.
- Потеря audio focus и ошибка декодирования не блокируют input и не повторяют
  consume.

## 8. Проверки

### Логика и экономика

- gift count 1: третий wrong → consume 1 + grant 3, pending/session runes
  неизменны;
- gift count 0: третий wrong → rune buffer 0 + free local restore 3;
- duplicate callback/remount/recovery ordinal не списывает второй gift;
- prepared intent переживает crash до/после durable commit;
- account switch не применяет gift старого owner;
- technical commit error не обнуляет руны как будто подарка нет;
- confirmed concurrent-unavailable корректно переходит в no-gift flow;
- нет standalone debit/consume и нет orphan grant.

### UI и маршруты

- overlay присутствует на каждом registered non-Arena route;
- Arena остаётся в denylist;
- тот же question/order/learnerAttempts сохраняются;
- timers/audio/voice корректно pause/resume;
- rune shield и три последовательных HUD restores видимы;
- no-gift flow не показывает gift animation;
- Reduce Motion и screen-reader announcement проходят focused tests.

### Assets и звук

- выбранный WebP имеет alpha, допустимый размер и static require;
- запрещены старая shrine-иконка, checkerboard и пустая plaque;
- десять preview SFX существуют только в ignored QA/mockup-папке;
- selected production SFX проходит duration/LUFS/peak/hash manifest gate;
- отклонённые preview files не попадают в bundle.

### Learning V2

Общий runtime overlay не меняет curriculum, content fingerprints или session
progression, но требует обновления применимых owner mockups, state tests,
motion receipt и reduced-motion proof. Blueprint fingerprint остаётся
`9aa272695d0227856862e8f9be3d68b19907a1ef9bead9b71a4baf62c3105bb7`.

## 9. Критерии приёмки

Функция готова, когда подарок автоматически и exactly-once применяется во
всех non-Arena учебных сессиях, сохраняет session runes, возвращает три
попытки и тот же вопрос, а no-gift flow продолжает обнулять session runes.
Утверждённая potion-иконка отображается во всех поверхностях. Владелец может
прослушать десять коротких выровненных ElevenLabs-кандидатов в рабочем
browser-макете; в приложение попадает только выбранный SFX. Все focused
economy, route, UI, asset, audio и Learning V2 gates зелёные.

## 10. Не входит в scope

- изменение цены энергии или формулы рун;
- применение подарка в Арене;
- новый магазин, ручная кнопка использования или отправка подарка другу;
- изменение curriculum/content Learning V2;
- включение App Check, deploy, publish или release;
- сохранение отклонённых старых звуков в production bundle.
