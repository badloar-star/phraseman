# Эталонные кадры (golden) для Сверки — 2026-11-04

Источник: одобренный владельцем снимок Codex rev8 (`C:\Users\badlo\Documents\Codex\2026-11-02\x20\outputs\paywall-preview\approved-rev8\`, манифест `APPROVED-REV8-MANIFEST.json`). Файлы Codex не менялись и не копировались; полный путь каждого — в `golden_frames.json` (поля `abs`, `snapshot_abs`, `sha256`).

## ⚠️ Известная ошибка эталона rev8 «Наборы сообщества» / «Каталог наборов»
Кадры каталога (packs-video/community/mine, rev7-packs-*, rev8-social*, social-packs-compact-*) **не содержат лайк-сердце, число лайков и счётчик комментариев** — в приложении они были; в коде их убрал Сайт, опираясь на этот кадр. Пока это не исправлено, эталоном строки считать `rendered/rev8-pack-row-likes_dark.png` и `..._light.png` (сердце + лайки + комментарии, ряд 2 — «лайкнуто»). Затронуто строк в таблице: 24 (поле `warning` в json).

## Правило для будущих макетов
**Инвентаризация кнопок и состояний существующего экрана до рисования:** перечислить все элементы, действия и состояния нынешнего экрана (лайк, комментарии, меню, пустое/ошибка/загрузка) и сверить с кадром; чего нет на макете — не вырезается из приложения без решения владельца.

## Как читать
- **golden** — самая новая ревизия кадра (rev8 > rev7 > rev6), с ней Сверка сравнивает.
- **superseded** — старая ревизия того же кадра, не сравнивать.
- **excluded** — снято владельцем или вне объёма (не сравнивать).
- **alt** — варианты/промежуточные, выбор не сделан или не экран приложения.
- Кадры Codex — браузерная композиция, а не нативные пиксели: сравнение по раскладке/составу, пиксель-в-пиксель только с нативными снимками.

## Эталон (36)
| Файл | Экран | Состояние | Тема | Размер | Ревизия |
|---|---|---|---|---|---|
| `home-rank3-dark.png` | Главная | Free · ранг 3 | dark | 390×844 | — |
| `hub-community-approved-rev3.png` | Хаб Карточек · Сообщество | approved-rev3 | не указана в имени (тёмная по умолчанию) | 390×844 | — |
| `hub-community-approved-rev4.png` | Хаб Карточек · Сообщество | approved-rev4 | не указана в имени (тёмная по умолчанию) | 390×844 | — |
| `hub-community-approved.png` | Хаб Карточек · Сообщество | approved | не указана в имени (тёмная по умолчанию) | 390×844 | — |
| `packs-community-dark.png` | Каталог наборов | Сообщество | dark | 390×844 | — |
| `packs-mine-dark.png` | Каталог наборов | Мои наборы | dark | 390×844 | — |
| `packs-video-dark.png` | Каталог наборов | Из видео | dark | 390×844 | — |
| `rev6-home-free-0.png` | Главная | Free · ранг 0 | не указана в имени (тёмная по умолчанию) | 390×844 | 6 |
| `rev6-home-plus-3.png` | Главная | Plus · ранг 3 | не указана в имени (тёмная по умолчанию) | 390×844 | 6 |
| `rev6-unlock-rank-cta.png` | Открытие раздела | rank · CTA | не указана в имени (тёмная по умолчанию) | 390×844 | 6 |
| `rev7-home-offline-dark.png` | Главная | без сети · локальные занятия | dark | 390×844 | 7 |
| `rev7-home-offline-light.png` | Главная | без сети · локальные занятия | light | 390×844 | 7 |
| `rev7-home-unlock-video-dark.png` | Главная · сцена после открытия | unlock video | dark | 390×844 | 7 |
| `rev7-home-unlock-video-light.png` | Главная · сцена после открытия | unlock video | light | 390×844 | 7 |
| `rev7-packs-community-light.png` | Каталог наборов | Сообщество | light | 390×844 | 7 |
| `rev7-packs-mine-light.png` | Каталог наборов | Мои наборы | light | 390×844 | 7 |
| `rev7-packs-video-light.png` | Каталог наборов | Из видео | light | 390×844 | 7 |
| `rev7-welcome-B-3-dark.png` | Приветствие | B · реплика 3 (welcome-B-3) | dark | 390×844 | 7 |
| `rev7-welcome-B-3-light.png` | Приветствие | B · реплика 3 (welcome-B-3) | light | 390×844 | 7 |
| `rev8-social-dark.png` | Наборы сообщества | вертикальный каталог | dark | 390×844 | 8 |
| `rev8-social-light.png` | Наборы сообщества | вертикальный каталог | light | 390×844 | 8 |
| `rev8-social-top-after-dark.png` | Наборы сообщества | верх после правки | dark | 390×446 | 8 |
| `rev8-social-top-after-light.png` | Наборы сообщества | верх после правки | light | 390×446 | 8 |
| `rev8-social-top-before-dark.png` | Наборы сообщества | верх до правки (baseline) | dark | 390×446 | 8 |
| `rev8-social-top-before-light.png` | Наборы сообщества | верх до правки (baseline) | light | 390×446 | 8 |
| `rev8-unlock-cards-dark.png` | Открытие раздела | cards | dark | 390×844 | 8 |
| `rev8-unlock-cards-light.png` | Открытие раздела | cards | light | 390×844 | 8 |
| `rev8-unlock-dialogs-dark.png` | Открытие раздела | dialogs | dark | 390×844 | 8 |
| `rev8-unlock-dialogs-light.png` | Открытие раздела | dialogs | light | 390×844 | 8 |
| `rev8-unlock-peak-dark.png` | Открытие раздела | peak | dark | 390×844 | 8 |
| `rev8-unlock-peak-light.png` | Открытие раздела | peak | light | 390×844 | 8 |
| `rev8-unlock-plus-dark.png` | Открытие раздела | plus | dark | 390×844 | 8 |
| `rev8-unlock-plus-light.png` | Открытие раздела | plus | light | 390×844 | 8 |
| `rev8-unlock-video-dark.png` | Открытие раздела | video | dark | 390×844 | 8 |
| `rev8-unlock-video-light.png` | Открытие раздела | video | light | 390×844 | 8 |
| `welcome-B-revised.png` | Приветствие | B · композиция (ревизия) | не указана в имени (тёмная по умолчанию) | 390×844 | — |

## Снимки владельца
- `133.png` — Каталог 133 (скриншот владельца), эталон каталога «Сообщество», 1890×905: `C:\Temp\claude\7f40f2ab5e82ea9a\a93373a7-3261-44e5-ba78-ec5b499d2b6a\images\133.png`
- `134.png` — Каталог 134 (скриншот владельца), эталон «Мои наборы», 966×786: `C:\Temp\claude\7f40f2ab5e82ea9a\a93373a7-3261-44e5-ba78-ec5b499d2b6a\images\134.png`

## Не хватает / примечания
- Файлы Codex не меняются и не копируются; пути абсолютные.
- Просроченный Plus (expired): в approved-rev8 нет переключателя/фикстуры — кадров нет (N/A).
- Пейвол C = утверждённые кадры paywall-preview/approved-rev8/ (решение координатора); variant-*.png не одобрены.
- Plus/legacy сняты переключателями на базе фикстуры home-free-N — в registry approved-rev8 отдельных id home-plus-*/home-legacy-* нет.

## Заменены более новой ревизией (19)
- `rev6-home-unlock-video.png` → `rev7-home-unlock-video-dark.png`
- `rev6-unlock-cards-cta.png` → `rev8-unlock-cards-dark.png`
- `rev6-unlock-dialogs-cta.png` → `rev8-unlock-dialogs-dark.png`
- `rev6-unlock-peak-cta.png` → `rev8-unlock-peak-dark.png`
- `rev6-unlock-plus-cta.png` → `rev8-unlock-plus-dark.png`
- `rev6-unlock-video-cta.png` → `rev8-unlock-video-dark.png`
- `rev7-packs-community-dark.png` → `packs-community-dark.png`
- `rev7-packs-mine-dark.png` → `packs-mine-dark.png`
- `rev7-packs-social-dark.png` → `rev8-social-dark.png`
- `rev7-packs-social-light.png` → `rev8-social-light.png`
- `rev7-packs-video-dark.png` → `packs-video-dark.png`
- `rev7-unlock-cards-cta-dark.png` → `rev8-unlock-cards-dark.png`
- `rev7-unlock-cards-cta-light.png` → `rev8-unlock-cards-light.png`
- `rev7-unlock-dialogs-cta-dark.png` → `rev8-unlock-dialogs-dark.png`
- `rev7-unlock-dialogs-cta-light.png` → `rev8-unlock-dialogs-light.png`
- `rev7-unlock-plus-cta-dark.png` → `rev8-unlock-plus-dark.png`
- `rev7-unlock-plus-cta-light.png` → `rev8-unlock-plus-light.png`
- `rev7-unlock-video-cta-dark.png` → `rev8-unlock-video-dark.png`
- `rev7-unlock-video-cta-light.png` → `rev8-unlock-video-light.png`

## Исключены (10)
| Файл | Экран | Состояние | Тема | Размер | Ревизия |
|---|---|---|---|---|---|
| `rev6-welcome-A-1.png` | Приветствие | welcome-A-1 | не указана в имени (тёмная по умолчанию) | 390×844 | 6 |
| `rev6-welcome-A-3.png` | Приветствие | welcome-A-3 | не указана в имени (тёмная по умолчанию) | 390×844 | 6 |
| `rev7-packs-social-folder-dark.png` | Наборы сообщества | нижний блок: папки — УБРАНО владельцем | dark | 390×844 | 7 |
| `rev7-packs-social-folder-light.png` | Наборы сообщества | нижний блок: папки — УБРАНО владельцем | light | 390×844 | 7 |
| `rev7-packs-social-ticket-dark.png` | Наборы сообщества | нижний блок: билеты — УБРАНО владельцем | dark | 390×844 | 7 |
| `rev7-packs-social-ticket-light.png` | Наборы сообщества | нижний блок: билеты — УБРАНО владельцем | light | 390×844 | 7 |
| `welcome-A-dark.png` | Приветствие | welcome-A-dark | dark | 390×844 | — |
| `welcome-A-revised.png` | Приветствие | welcome-A-revised | не указана в имени (тёмная по умолчанию) | 390×844 | — |
| `welcome-C-light.png` | Приветствие | welcome-C-light | light | 390×844 | — |
| `welcome-C-revised.png` | Приветствие | welcome-C-revised | не указана в имени (тёмная по умолчанию) | 390×844 | — |

## Варианты, не эталон (31)
| Файл | Экран | Состояние | Тема | Размер | Ревизия |
|---|---|---|---|---|---|
| `pack-design-four-options-dark.png` | Дизайн обложки набора | четыре варианта (выбор) | dark | 1600×1080 | — |
| `pack-design-four-options-light.png` | Дизайн обложки набора | четыре варианта (выбор) | light | 1600×1080 | — |
| `packs-three-screens-light.png` | Каталог наборов | три экрана рядом (светлая) | light | 1500×1100 | — |
| `social-packs-compact-dark.png` | Наборы сообщества | compact (промежуточный) | dark | 390×844 | — |
| `social-packs-compact-light.png` | Наборы сообщества | compact (промежуточный) | light | 390×844 | — |
| `assets\actual-home-font1.png` | Прочее | assets\actual-home-font1 | не указана в имени (тёмная по умолчанию) | 1080×2400 | — |
| `assets\actual-home-tabbar.png` | Прочее | assets\actual-home-tabbar | не указана в имени (тёмная по умолчанию) | 1080×2400 | — |
| `assets\owner-character.png` | Прочее | assets\owner-character | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\01-wave.png` | Прочее | assets\characters\01-wave | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\02-introduction.png` | Прочее | assets\characters\02-introduction | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\03-present-text.png` | Прочее | assets\characters\03-present-text | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\04-ready.png` | Прочее | assets\characters\04-ready | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\05-listening.png` | Прочее | assets\characters\05-listening | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\06-thinking.png` | Прочее | assets\characters\06-thinking | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\07-tip.png` | Прочее | assets\characters\07-tip | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\08-question.png` | Прочее | assets\characters\08-question | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\09-thumbs-up.png` | Прочее | assets\characters\09-thumbs-up | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `assets\characters\10-celebrate.png` | Прочее | assets\characters\10-celebrate | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\actual-home-font1.png` | Прочее | revisions\rev5\assets\actual-home-font1 | не указана в имени (тёмная по умолчанию) | 1080×2400 | — |
| `revisions\rev5\assets\actual-home-tabbar.png` | Прочее | revisions\rev5\assets\actual-home-tabbar | не указана в имени (тёмная по умолчанию) | 1080×2400 | — |
| `revisions\rev5\assets\owner-character.png` | Прочее | revisions\rev5\assets\owner-character | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\01-wave.png` | Прочее | revisions\rev5\assets\characters\01-wave | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\02-introduction.png` | Прочее | revisions\rev5\assets\characters\02-introduction | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\03-present-text.png` | Прочее | revisions\rev5\assets\characters\03-present-text | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\04-ready.png` | Прочее | revisions\rev5\assets\characters\04-ready | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\05-listening.png` | Прочее | revisions\rev5\assets\characters\05-listening | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\06-thinking.png` | Прочее | revisions\rev5\assets\characters\06-thinking | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\07-tip.png` | Прочее | revisions\rev5\assets\characters\07-tip | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\08-question.png` | Прочее | revisions\rev5\assets\characters\08-question | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\09-thumbs-up.png` | Прочее | revisions\rev5\assets\characters\09-thumbs-up | не указана в имени (тёмная по умолчанию) | 887×1774 | — |
| `revisions\rev5\assets\characters\10-celebrate.png` | Прочее | revisions\rev5\assets\characters\10-celebrate | не указана в имени (тёмная по умолчанию) | 887×1774 | — |

## Снято локально (golden-rendered)
Кадры из `approved-rev8/index.html` (только чтение), 390×844: приветствие B-1/B-2 и Главная Free/Plus/«старый пользователь» ранги 0–3, тёмная и светлая.

| Файл | Экран | Состояние | Тема | Размер |
|---|---|---|---|---|
| `rendered/home-free-0_dark.png` | Главная · Free | ранг 0 | dark | 390×845 |
| `rendered/home-free-0_light.png` | Главная · Free | ранг 0 | light | 390×845 |
| `rendered/home-free-1_dark.png` | Главная · Free | ранг 1 | dark | 390×845 |
| `rendered/home-free-1_light.png` | Главная · Free | ранг 1 | light | 390×845 |
| `rendered/home-free-2_dark.png` | Главная · Free | ранг 2 | dark | 390×845 |
| `rendered/home-free-2_light.png` | Главная · Free | ранг 2 | light | 390×845 |
| `rendered/home-free-3_dark.png` | Главная · Free | ранг 3 | dark | 390×845 |
| `rendered/home-free-3_light.png` | Главная · Free | ранг 3 | light | 390×845 |
| `rendered/home-legacy-0_dark.png` | Главная · старый пользователь | ранг 0 | dark | 390×845 |
| `rendered/home-legacy-0_light.png` | Главная · старый пользователь | ранг 0 | light | 390×845 |
| `rendered/home-legacy-1_dark.png` | Главная · старый пользователь | ранг 1 | dark | 390×845 |
| `rendered/home-legacy-1_light.png` | Главная · старый пользователь | ранг 1 | light | 390×845 |
| `rendered/home-legacy-2_dark.png` | Главная · старый пользователь | ранг 2 | dark | 390×845 |
| `rendered/home-legacy-2_light.png` | Главная · старый пользователь | ранг 2 | light | 390×845 |
| `rendered/home-legacy-3_dark.png` | Главная · старый пользователь | ранг 3 | dark | 390×845 |
| `rendered/home-legacy-3_light.png` | Главная · старый пользователь | ранг 3 | light | 390×845 |
| `rendered/home-plus-0_dark.png` | Главная · Plus | ранг 0 | dark | 390×845 |
| `rendered/home-plus-0_light.png` | Главная · Plus | ранг 0 | light | 390×845 |
| `rendered/home-plus-1_dark.png` | Главная · Plus | ранг 1 | dark | 390×845 |
| `rendered/home-plus-1_light.png` | Главная · Plus | ранг 1 | light | 390×845 |
| `rendered/home-plus-2_dark.png` | Главная · Plus | ранг 2 | dark | 390×845 |
| `rendered/home-plus-2_light.png` | Главная · Plus | ранг 2 | light | 390×845 |
| `rendered/home-plus-3_dark.png` | Главная · Plus | ранг 3 | dark | 390×845 |
| `rendered/home-plus-3_light.png` | Главная · Plus | ранг 3 | light | 390×845 |
| `rendered/welcome-B-1_dark.png` | Приветствие B | реплика 1 | dark | 390×845 |
| `rendered/welcome-B-1_light.png` | Приветствие B | реплика 1 | light | 390×845 |
| `rendered/welcome-B-2_dark.png` | Приветствие B | реплика 2 | dark | 390×845 |
| `rendered/welcome-B-2_light.png` | Приветствие B | реплика 2 | light | 390×845 |

## Высота сцены Главной (замер)
- `rev6-home-free-0.png`: низ сцены у левого края ≈ **327 dp**; `home-rank3-dark.png`: ≈ **316 dp**. Карточка «Сегодня» заходит на сцену (верх ≈ 303 / 292 dp) — «≈290 dp» = высота до верха карточки.

## Строка набора rev8 с лайками (нарисовано)
- `rendered/rev8-pack-row-likes_dark.png`, `rendered/rev8-pack-row-likes_light.png` — 390 dp @2x: сердце + число лайков + комментарии справа внизу, второй ряд — лайкнуто (заливка), текст 15 px.

## Энергия от Пика (нарисовано поверх кадров утверждённых макетов)
Правило: число награды 100 → 1000 в существующей строке монет + одна новая строка «+1 к запасу энергии»; в «Нет энергии» меняется только число в «Запас N». Тёмная тема. Реальные кадры Сверки заменят.

| Файл | Экран | Состояние |
|---|---|---|
| `rendered/energy-promo-long_was.png` | Окно повышения (длинное) | как сейчас, +100 монет |
| `rendered/energy-promo-long_energy.png` | Окно повышения (длинное) | как будет: +1000 монет + «+1 к запасу энергии» |
| `rendered/energy-promo-short_was.png` | Окно повышения (короткое) | как сейчас, +100 монет |
| `rendered/energy-promo-short_energy.png` | Окно повышения (короткое) | как будет: +1000 монет + «+1 к запасу энергии» |
| `rendered/energy-week-card_was.png` | Карточка «Итог недели» | как сейчас, +100 монет |
| `rendered/energy-week-card_energy.png` | Карточка «Итог недели» | как будет: +1000 монет + «+1 к запасу энергии» |
| `rendered/energy-noenergy_was.png` | Окно «Энергия закончилась» | как сейчас, «Запас 5» |
| `rendered/energy-noenergy_stock8.png` | Окно «Энергия закончилась» | как будет, «Запас 8» |
| `rendered/energy-noenergy_stock16.png` | Окно «Энергия закончилась» | как будет, «Запас 16» |
