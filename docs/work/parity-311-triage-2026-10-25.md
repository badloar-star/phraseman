# Разбор 311 нарушений PARITY-GATE — 25.10 (3 · МАКЕТЫ)

Прогон: `node scripts/visual_parity_gate.mjs --json --release=r1` по HEAD 25.10 вечером — 562 нарушения на 553 строках R1. После
отсрочки по прежней раскладке (b_reshoot 227, d_mockup_stale 9, c_owner_decides 9, theme_tone 1 — как делает `--defer-triage`) остаётся
**316 нарушений на 311 строках**. Тексты в этом разборе не учитывались — их меняет волна голоса (VOICE.md).

## Итог одной таблицей

| Корзина | Строк | Кому | Что сделать |
|---|---|---|---|
| Устаревший макет | 9 | Макеты | 4 уже приведены (промокод 007/008 — e666e6ab1, «Молния» m08 — 69c242357, итог урока m10 — 121422151); 5 — образцы промокода 009–012/015 рисованы с приложения, кегль 24 против 26 px — поправить образец |
| Не то состояние / кадр старше кода, есть запись расхождения | 47 | Сверка | переснять; из них 9 уже починены в коде после кадра (фильтр Карточек a65e5e40c, переключатели c8816286c, «Встречайте 2.0» 75378cbfb, тост серии d71db87d3, cards-gap-039 3ef047d85) |
| Совпадало, но код менялся после кадра | 87 | Сверка | переснять и подтвердить match |
| Кадра нет вовсе | 66 | Сверка (+ Ядро там, где нет подмены состояния) | снять впервые: моменты серии, сторис, лимит голоса, микрофоны |
| Кадр есть, вердикта нет | 84 | Сверка + Макеты | кадры 12–15.10, код с тех пор менялся — снять заново и вынести вердикт |
| Служебное (нет времени съёмки, нет анимационного свидетельства, заблокировано) | 7 | Сверка / координатор | `shot_at`, `anim_evidence`, два заблокированных по решению владельца |
| **Настоящее расхождение кода с макетом** | **11** | Дизайн / Моменты | ниже |

Сумма: 9 + 47 + 87 + 66 + 84 + 7 + 11 = 311.

## Настоящие расхождения (11 строк → 10 правок), по заметности

⚠ Все кадры старше кода (снимки 13–18.10, код экранов менялся до 25.10). Расхождения записаны поэлементно, и коммиты после кадра их не
закрывали, поэтому считаю их живыми. Но перед правкой Сверке нужно снять свежий кадр этих 11 строк первыми.

| № | Где | Строка реестра | Что не так | Кому |
|---|---|---|---|---|
| 1 | Серия · 1000 дней | `streak-milestone-d1000` | огонь финальной стадии белый, в эталоне золотой; за огнём и заголовком яркое мятное пятно, в эталоне его нет | Моменты |
| 2 | Серия · 365 дней | `streak-milestone-d0365` | лишний мятный ореол за огнём; нет 4–5 искр вокруг огня | Моменты |
| 3 | Серия · 100 дней | `streak-milestone-d0100` | ореол зелёный, но маленький и яркий, с ярким центром; в эталоне широкое мягкое тусклое свечение | Моменты |
| 4 | Серия · 30 дней | `streak-milestone-d0030` | ореол ярче и плотнее эталона (≈#2A4640 против #19221F–#1A2425; эталон: acc-soft .24, пульс .55–1, blur 10) | Моменты |
| 5 | Итог диалога | `moments-v3-m18-a` | цели без разделителей; «+30 монет» крупной надписью без плашки с монетой; кнопок «Следующий сценарий / Разобрать» на кадре нет (проверить кадр после ~4 с) | Моменты |
| 6 | Пик · итог недели | `spire-gap-016` | перед «Гранит · до конца недели» значок лиги (в образце нет); молния энергии контурная, в образце залитая. Ступени — уже по решению владельца | Дизайн (или образец — решить) |
| 7 | Настройки · уведомления, телефон запретил | `settings-gap-012` | главный переключатель включён и строки активны, хотя телефон уведомления запретил; в образце всё выключено и приглушено | Дизайн |
| 8 | Настройки · уведомления, мастер выключен | `settings-gap-013` | строки не приглушены — не видно, что они неактивны из-за мастера (часть — подмена devShowcase, см. разбор d8eab23c4) | Дизайн |
| 9 | Карточки · чужой набор добавлен | `cards-section-014`, `cards-v2-016` | «В моих наборах» переносится на две строки в узкой кнопке, в образце одна | Дизайн |
| 10 | Карточки · каталог Сообщества | `cards-v2-025` | каталог в двух разных видах; в одном нет пилюли языка «EN», в другом нет чипов A1/A2/B1 | Дизайн |

Темы и Learning V2 по этим 311 настоящих правок не получают: тон «Спокойно» вынесен решением владельца, строк Learning V2 в этих 311 нет.

## Главный вывод: самые заметные экраны гейт почти не проверяет

Топ-20 по Главной, занятию, Пику, Plus и серии собрать нельзя — настоящих расхождений в 311 всего 11, потому что заметные экраны либо
не заведены в R1, либо ни разу не сверены:

| Экран | Строк в реестре | Из них в R1 | Состояние |
|---|---|---|---|
| Главная (components/home/v2) | 9 | 3 | все 3 — pending, вердикта нет |
| Сцена «Сегодня» (today_scene) | 0 | 0 | не заведена |
| Урок Learning V2 | 77 | 3 | 66 строк без поля release — в гейт не попадают вовсе |
| Классический урок (lesson1) | 16 | 3 | pending / diff в отсрочке |
| Пик · главный (SpireHomeScreen) | 6 | 6 | 3 diff + 3 pending, все в отсрочке b_reshoot |

Чтобы приложение совпадало с макетами пиксель в пиксель именно там, куда смотрит владелец, нужно: завести строки Главной, «Сегодня» и
урока V2 в R1 (координатор), снять их первыми (Сверка) и дать вердикт (Макеты). Предлагаю сделать это раньше, чем разбирать 237 строк
пересъёмки второстепенных экранов.

## Списки строк

- Устаревший макет (9): `overlays-campaigns-007`, `overlays-campaigns-008`, `overlays-campaigns-009`, `overlays-campaigns-010`, `overlays-campaigns-011`, `overlays-campaigns-012`, `overlays-campaigns-015`, `moments-v3-m08-a`, `moments-v3-m10-a`
- Переснять, есть запись расхождения (47): `cards-018`, `cards-019`, `cards-022`, `cards-046`, `cards-053`, `cards-057`, `cards-058`, `cards-059`, `cards-064`, `cards-065`, `cards-066`, `cards-071`, `cards-079`, `dialogs-010`, `paywalls-008`, `paywalls-009`, `paywalls-010`, `overlays-campaigns-014`, `cards-section-013`, `cards-section-016`, `cards-section-021`, `cards-section-029`, `cards-section-039`, `cards-section-052`, `energy-modes-015`, `cards-v2-006`, `cards-v2-010`, `cards-v2-035`, `cards-v2-036`, `cards-v2-040`, `cards-v2-046`, `cards-v2-049`, `cards-v2-051`, `cards-v2-052`, `spire-gap-022`, `cards-gap-022`, `cards-gap-023`, `cards-gap-024`, `cards-gap-038`, `paywall-gap-012`, `settings-gap-007`, `settings-gap-016`, `cards-gap-039`, `whats-new-004`, `whats-new-006`, `streak-milestone-d0003`, `streak-milestone-d0014`
- Переснять, кадр старше кода (87): `cards-012`, `cards-020`, `cards-030`, `cards-031`, `cards-036`, `cards-037`, `cards-038`, `cards-041`, `cards-042`, `cards-045`, `cards-051`, `cards-055`, `cards-063`, `cards-067`, `cards-068`, `cards-076`, `cards-077`, `cards-080`, `cards-081`, `community-013`, `community-014`, `community-016`, `community-021`, `community-022`, `cards-section-011`, `cards-section-030`, `cards-section-038`, `cards-section-040`, `cards-section-041`, `cards-section-043`, `cards-section-053`, `cards-section-054`, `cards-section-055`, `onboarding-paywall-001`, `onboarding-002`, `onboarding-006`, `onboarding-007`, `onboarding-008`, `onboarding-010`, `onboarding-025`, `onboarding-026`, `onboarding-027`, `onboarding-028`, `onboarding-029`, `cards-v2-007`, `cards-v2-012`, `cards-v2-015`, `cards-v2-019`, `cards-v2-020`, `cards-v2-026`, `cards-v2-041`, `cards-v2-042`, `cards-v2-044`, `cards-v2-045`, `cards-v2-050`, `auth-gap-011`, `auth-gap-013`, `auth-gap-014`, `auth-gap-015`, `auth-gap-017`, `auth-gap-018`, `cards-gap-001`, `cards-gap-002`, `cards-gap-004`, `cards-gap-005`, `cards-gap-006`, `cards-gap-007`, `cards-gap-008`, `cards-gap-009`, `cards-gap-010`, `cards-gap-016`, `cards-gap-019`, `cards-gap-025`, `cards-gap-029`, `cards-gap-031`, `cards-gap-032`, `cards-gap-033`, `cards-gap-036`, `cards-gap-037`, `settings-gap-006`, `settings-gap-009`, `settings-gap-014`, `settings-gap-015`, `settings-gap-020`, `settings-gap-021`, `settings-gap-029`, `settings-gap-035`
- Кадра нет (66): `dialogs-025`, `dialogs-026`, `dialogs-027`, `dialogs-040`, `dialogs-042`, `dialogs-044`, `community-002`, `community-008`, `community-009`, `community-012`, `community-015`, `community-017`, `community-024`, `overlays-campaigns-006`, `cards-section-049`, `cards-section-050`, `onboarding-016`, `onboarding-017`, `cards-v2-038`, `cards-v2-039`, `auth-gap-002`, `cards-gap-021`, `settings-gap-001`, `settings-gap-023`, `onboarding-031`, `onboarding-032`, `cards-v2-088`, `cards-v2-089`, `whats-new-003`, `whats-new-005`, `moments-v3-m04-a`, `moments-v3-m22-a`, `voice-limit-001`, `voice-limit-002`, `voice-limit-003`, `voice-limit-004`, `voice-limit-005`, `voice-limit-006`, `voice-limit-session-start-001`, `voice-limit-session-start-002`, `voice-limit-session-start-005`, `streak-milestone-d0001`, `streak-milestone-d0050`, `streak-milestone-d0150`, `streak-milestone-d0200`, `streak-milestone-d0250`, `streak-milestone-d0300`, `streak-milestone-d0400`, `streak-milestone-d0500`, `streak-milestone-d0600`, `streak-milestone-d0730`, `streak-milestone-d0800`, `streak-milestone-d0900`, `moments-v3-m19`, `stories-s1-a`, `stories-s1-b`, `stories-s1-c`, `stories-s2-a`, `stories-s3-1`, `stories-s3-2`, `stories-s3-3`, `stories-s3-4`, `voice-mics-learn-001`, `voice-mics-learn-002`, `voice-mics-dialogs-001`, `voice-mics-dialogs-002`
- Кадр есть, вердикта нет (84): `cards-008`, `cards-011`, `cards-013`, `cards-026`, `cards-033`, `cards-035`, `cards-040`, `cards-043`, `cards-044`, `cards-047`, `cards-050`, `cards-052`, `cards-054`, `cards-056`, `cards-061`, `cards-069`, `cards-072`, `cards-073`, `cards-074`, `cards-082`, `dialogs-009`, `dialogs-021`, `dialogs-024`, `dialogs-033`, `dialogs-037`, `dialogs-043`, `dialogs-046`, `community-011`, `community-018`, `community-019`, `profile-018`, `profile-019`, `paywalls-015`, `paywalls-020`, `paywalls-021`, `overlays-campaigns-004`, `overlays-campaigns-013`, `cards-section-018`, `cards-section-019`, `cards-section-031`, `cards-section-046`, `cards-section-056`, `energy-modes-013`, `energy-modes-014`, `energy-modes-016`, `onboarding-003`, `onboarding-004`, `onboarding-005`, `onboarding-018`, `cards-v2-028`, `cards-v2-037`, `cards-v2-047`, `auth-gap-001`, `auth-gap-003`, `auth-gap-004`, `auth-gap-005`, `auth-gap-006`, `auth-gap-007`, `auth-gap-008`, `auth-gap-009`, `auth-gap-010`, `auth-gap-012`, `auth-gap-016`, `dialogs-gap-001`, `dialogs-gap-004`, `dialogs-gap-005`, `dialogs-gap-006`, `dialogs-gap-007`, `dialogs-gap-008`, `dialogs-gap-009`, `dialogs-gap-011`, `dialogs-gap-014`, `dialogs-gap-016`, `spire-gap-021`, `cards-gap-012`, `cards-gap-027`, `cards-gap-028`, `settings-gap-010`, `settings-gap-017`, `settings-gap-027`, `settings-gap-034`, `cards-v2-053`, `whats-new-001`, `whats-new-002`
- Служебное (7): cards-027 (shot_time_unknown), dialogs-028 (status_blocked), profile-002 (status_blocked), cards-gap-014 (shot_time_unknown), cards-gap-015 (shot_time_unknown), cards-gap-017 (shot_time_unknown), streak-milestone-d0007 (shot_time_unknown+anim_evidence_missing)
- Настоящие (11): `cards-section-014`, `cards-v2-016`, `cards-v2-025`, `spire-gap-016`, `settings-gap-012`, `settings-gap-013`, `moments-v3-m18-a`, `streak-milestone-d0030`, `streak-milestone-d0100`, `streak-milestone-d0365`, `streak-milestone-d1000`
