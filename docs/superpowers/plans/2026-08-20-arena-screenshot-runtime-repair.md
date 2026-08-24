# Arena: runtime repair по снимкам владельца (2026-08-20)

## Цель

Свежий quick/blitz-матч на двух клиентах проходит без промежуточного экрана ожидания, показывает живой счёт, оставляет заданиям доступную высоту, выдаёт только XP и открывает персональный разбор сразу после сдачи собственного отчёта.

## Подтверждённые причины

1. На устройстве запущен старый bundle: локальные Arena-коммиты не доставлены в production channel.
2. `V2Segments` имеет `flex: 1` и в вертикальном контейнере растягивается на свободную высоту.
3. Персональный `arena_v2_match_labs/{matchId}` создаётся только внутри полного `settleMatch`, поэтому первый закончивший человек не получает разбор сразу.
4. Quick уже получает `starsEarned = 0`, но `ArenaRewards` всё равно рисует карточку сезонных звёзд и скрывает `xpEarned`.
5. Канонические окна `translate_build = 14s` и `speed_match = 18s` недостаточны для длинного задания и увеличенного системного шрифта.
6. Клиент читает settlement-lab по Firebase Auth UID, а сервер пишет по canonical `stableUid`; для связанных аккаунтов это разные пути.
7. Глобальный warm-cache разбора не содержит account scope и может показать ответы предыдущего аккаунта на том же устройстве.

## Утверждённый runtime-контракт

- После найденного человека или назначенного бота первый кадр `/arena_match` — `ArenaVersusIntro`. Accept/plan идут за анимацией; текстового экрана ожидания/подготовки нет.
- Прогресс заданий — горизонтальная полоса высотой 10 pt, `flexGrow: 0`, не участвует в разделе вертикального остатка.
- HUD остаётся вне прокрутки. Неизвестный счёт — `—`; подтверждённый локальный и live tick соперника анимированно меняют числа. Статус соперника — «ответ получен», не действие «Ответить».
- `translate_build` и `speed_match` получают весь остаток экрана с достижимой внутренней прокруткой и touch targets не меньше 48 pt. У builder есть явная инструкция.
- Для новых планов `translate_build = 25_000 ms`, `speed_match = 30_000 ms`; client/server mirrors и `answerMs` совпадают. Reading/countdown не вычитаются из answer window.
- Пары детерминированно перемешаны без единой готовой строки; оба клиента получают одинаковый порядок и сохранённый `correctIndex`.
- После принятия собственного финального отчёта callable возвращает персональный снимок разбора. Он строится из sealed tasks и только outcomes вызывающего игрока, не содержит opponent UID/answers и одинаков на idempotent retry. Полное settlement и награды остаются отдельными.
- Review cache имеет account scope `(stableUid, matchId)`. Канонический settlement-lab читается через корректный stable identity; account switch/wipe не может переиспользовать чужой review.
- Новейшее решение владельца отменяет старые конфликтующие решения для quick: quick выдаёт только XP — без season stars, rare spin и других Arena-наград. Daily telemetry/progression может фиксировать факт матча, но не выдаёт игроку отдельную награду.
- Quick result не показывает и не озвучивает сезонные звёзды. Он переиспользует `ResultsSequence`/`FeedbackKit`: анимированный XP, звуки и Arena CTA. XP берётся только из авторитетной receipt/reward; UI ничего повторно не начисляет. Modifier pills показываются лишь при серверном breakdown, сумма которого точно равна `xpEarned`; до такого контракта они скрыты, а не вычисляются клиентом.
- Ranked/series сохраняют существующие рейтинг, сезонные награды, косметику и кнопки.

## TDD-пакеты

1. **Вход:** RED на route → intro ordering, отсутствие waiting/preparing, удержание финального кадра до plan и вычитание только из countdown.
2. **Геометрия:** RED на фактический flattened style прогресса; RED interaction/layout на 320 pt + fontScale 1.5 для последней правой пары и builder CTA.
3. **Таймеры и контент:** RED с literal 25_000/30_000 во всех mirrors; RED на явную builder-инструкцию; сохранить derangement matrix.
4. **Live HUD:** RED на unknown `—`, own update и rival tick/current-task status; затем two-client runtime smoke.
5. **Разбор:** RED server test — один human report создаёт только его owner document до settlement; другой пользователь не получает его документ; повтор reportId идемпотентен. Rules emulator подтверждает owner read/server-only write.
6. **Quick XP:** RED — quick ResultsSequence показывает XP/modifiers, не монтирует `ArenaRewards`/season-star row и не выполняет клиентское начисление. Ranked regression сохраняет старые награды.

## Проверка

- Focused client Jest: Arena match view/question layout/result/review.
- Focused Functions Jest + build: duel plan, finish/settlement, XP/reward contracts.
- Firestore Rules emulator: `arena_v2_match_labs` owner isolation.
- ESLint/TypeScript только затронутых файлов; exact staged-set check.
- Два свежих клиента: human и bot quick; 320 pt + fontScale 1.5; последний pair/build CTA; live 0→score; immediate review; XP sequence with sound; no season stars.
- Доставка проверяется отдельно: production channel/runtime version и установленный update id. Source-green без этой проверки не считается исправлением на устройстве.

## Запреты

- Не раскрывать персональный разбор через публичный match doc.
- Не начислять XP на клиенте и не дублировать receipt.
- Не менять общий `V2Segments` без regressions всех tournament callers; предпочтителен Arena-scoped override.
- Не ослаблять Rules/тесты и не смешивать unrelated dirty tree.
- Не выполнять push/EAS/Firebase deploy без отдельной release-проверки и разрешённого безопасного состава.
