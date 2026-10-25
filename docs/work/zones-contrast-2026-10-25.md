# Настройки, Карточки и наборы, Друзья — контраст во всех темах (25.10.2026)

Задача координатора: тем же методом, что классический урок (`docs/work/lesson1-contrast-2026-10-25.md`), пройти три зоны во всех
**174 сочетаниях** (29 тем × светлая/тёмная × Спокойно/Акцент/Максимум). Только изучение, код не правился.

## Как замерено

`npx tsx scripts/zone_contrast_measure.ts --name=<зона> <файлы и папки>` — общий вариант разбора урока:
- пары «цвет текста или значка ↔ подложка» берутся из кода, подложка — в той же строке или у ближайшего родителя выше по отступу;
- у тернарника меряются обе ветки, чернила заливок без найденной подложки не меряются на фоне.

Каждого кандидата я затем проверил по коду: подложку, живой ли файл, не dev-экран ли. Ручные пары — `scripts/zone_contrast_manual_pairs.ts`, вывод ниже.
Пороги: текст — 4,5, значок — 3,0.

| Зона | Файлов | Пар | Кандидатов у автомата | Настоящих после проверки |
|---|---|---|---|---|
| Настройки (вкладка, уведомления, язык, темы, конфиденциальность, аккаунт, удаление) | 22 | 129 | 8 | **0** |
| Карточки и наборы (список, просмотр, наборы, Сообщество, комментарии) | 57 | 434 | 11 | **3** |
| Друзья и приглашения («Вместе», неделя, дуэль, рефералы, визитка) | 44 | 193 | 7 | **1** (на грани) |

## Настоящие находки

| Зона | Место | Сейчас | Худший случай | Замена (только пары темы) | После | Последний коммит в файле |
|---|---|---|---|---|---|---|
| Карточки | `app/flashcards/SpeakHoldButton.tsx:197` — значок микрофона на кнопке «держи и говори» | постоянный `#07110A` на `accent` (тёмный значок на акценте) | **41 из 174, до 1,13** (светлые градиентные на Спокойно — значка не видно) | `accentInk` — пара темы для `accent` | 4,56, 0 | voice · caac6f0f1 |
| Карточки | `app/flashcards/CollectionGalleryView.tsx:255` — плашка «скрыто лимитом» | подпись `secondary` на `hairlineSoft` | 13 из 174, до 3,88 (светлые градиентные на Максимуме) | `legibleOn(secondary → text, плашка, 4.55)` или просто `text` | 4,57 / 8,69, 0 | cards · 3bb32f502 |
| Карточки | `app/flashcards/CollectionListView.tsx:775` — кнопка «Создать набор», когда недоступна | `secondary` на `buttonFill` | 122 из 174, до 2,67 | пара неактивной кнопки `buttonFillDisabled` / `buttonInkDisabled` | 4,61, 0 | cards · 4b4d40ed1 |
| Друзья | `components/friends_together/FriendEventMarker.tsx:77` — вспышка метки события | `ctaFillInk` на `accentGraphic` | 1 из 174, 2,98 (`grad_jade`, светлая, Акцент) | пара `accentInk` на `accent` | 4,56, 0 | theme · 0f9ebd205 |

Кнопка «Создать набор» неактивна, а неактивные элементы по WCAG от порога освобождены. Но 2,67 — это «почти не видно», а у темы для
этого есть своя пара `buttonFillDisabled` / `buttonInkDisabled`, её и брать.

## Ложные срабатывания (разобраны)

- **`app/language_welcome.tsx`** (8) — экран выбора языка до выбора темы, своя тёмная палитра с `theme-exempt` и причиной. Тёмный текст на
  своём фоне читается, а с темой он не связан.
- **`app/community_packs/PackCommentsSheet.tsx`** (3 значка меню) — автомат взял подложкой затемнение. На деле значки на `opaqueSheet`
  меню, проходят.
- **`components/friends_together/FriendLessonInviteSheet.tsx:91`** — галочка `opaqueCard` на кружке `text`: контраст высокий, автомат не увидел кружок.
- **`app/flashcards/PackVideoHero.tsx:167`** — белая длительность на 70 % чёрной плашке поверх видео, `theme-exempt` с причиной.
- **`components/friends_together/DevBotsSheet.tsx`** — экран разработчика.

## Мёртвый код (в уборку)

`components/flashcards/CollectionLimitHeader.tsx`, `components/flashcards/StatusFilterChips.tsx`, `components/flashcards/FlashcardsShelves.tsx` —
нигде не подключены. Первые два красят текст `t.textSecond`, а это `cta` (цвет заливки): до 1,00 в 38 светлых сочетаниях. Тот же класс ошибки,
что в `ProgressProofBlock` и прежней панели голоса.

## Ручные пары (вывод)

```
Карточки CollectionListView:775 «Создать набор» недоступно: secondary на buttonFill — порог 4.5, минимум 2.67 (grad_midnight/light/max), нарушений 122 из 174
Карточки CollectionGalleryView:255 плашка лимита: secondary на hairlineSoft — порог 4.5, минимум 3.88 (grad_jade/light/max), нарушений 13 из 174
  замена: text на hairlineSoft — порог 4.5, минимум 8.69 (grad_full_olive/dark/calm), нарушений 0 из 174
  замена: legibleOn(secondary → text) на hairlineSoft — порог 4.5, минимум 4.57 (grad_champagne/light/accent), нарушений 0 из 174
  замена: CollectionListView «Создать набор» недоступно — buttonInkDisabled на buttonFillDisabled — порог 4.5, минимум 4.61 (grad_aurora/dark/max), нарушений 0 из 174
Карточки SpeakHoldButton:197 значок микрофона #07110A на accent — порог 3, минимум 1.13 (grad_aurora/light/calm), нарушений 41 из 174
  замена: accentInk на accent — порог 3, минимум 4.56 (grad_lilac/light/accent), нарушений 0 из 174
Друзья FriendEventMarker:77 ctaFillInk на accentGraphic (вспышка) — порог 3, минимум 2.98 (grad_jade/light/accent), нарушений 1 из 174
  замена: accentInk на accent — порог 3, минимум 4.56 (grad_lilac/light/accent), нарушений 0 из 174
```
