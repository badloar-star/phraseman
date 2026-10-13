# ПРОБА 5 СТИЛЕЙ — задание Codex (владелец 12.10)

Владелец: «нынешнее круто, но не ВАУ и не подходит под все цвета темы — попробуй несколько разных стилей для светлых и тёмных тем».

## Главное техническое требование: картинка должна подходить под ЛЮБОЙ цвет темы

В PhraseMan 2.0 цвет темы выбирается ползунком. Оттенок может быть любым, от 0 до 360°, а яркость — тремя уровнями (calm / accent / max). Есть тёмный и светлый режимы. Поэтому картинку нельзя красить в один цвет навсегда.

Каждая картинка сдаётся **двумя слоями**. Приложение это уже умеет: `components/theme/ThemedArt.tsx`, слой `.accent` красится `tintColor` = цвет темы.

1. `<имя>.webp` — **основа**. Нейтральная: белая, серая, графит, стекло, перламутр. **В ней нет цвета темы.**
2. `<имя>.accent.webp` — **слой цвета темы**. Те же 1024×1024 и тот же ракурс. **Только БЕЛЫЙ (#FFFFFF) силуэт** той части, которая должна стать цветом темы: флаг, закладка, свечение, ядро. Полупрозрачность допустима (мягкое свечение). Всё остальное прозрачное.

Проверка: положи accent поверх основы и закрась accent в красный, синий, жёлтый, зелёный. Если выглядит дорого в любом цвете — годится.

## Что сделать (проба, НЕ в приложение)

Для КАЖДОГО из 5 стилей ниже сделать 3 предмета, каждый в двух вариантах — dark и light:
- `spire_tile` — Шпиль-башня;
- `lessons` — уроки, стопка книг;
- `dialogs` — диалоги, два пузыря реплик.

Итого 5 стилей × 3 предмета × 2 варианта = 30 основ + 30 accent-слоёв.

Класть **ТОЛЬКО** в `ART_STYLE_FOR_CODEX/trials/<код стиля>/<dark|light>/<имя>.webp` и `<имя>.accent.webp`.
В `assets/` ничего не класть, пока владелец не выберет стиль.
Затем владелец открывает `trial_viewer.html` и видит все стили на всех цветах тем сразу.

Общее для всех стилей:
- прозрачный фон, 1024×1024, предмет 75–85 % кадра, по центру;
- ракурс 3/4 сверху-сбоку, простые формы, читается в 64×64;
- ЗАПРЕЩЕНО: фэнтези, средневековье, камень, кирпич, окна, двери, лестницы, мелкие детали, текст, люди. См. `example_BAD/`.

---

## S1 «Матовое стекло» — `S1_glass`

**Вау:** как значки visionOS или iOS 26 Liquid Glass. Предмет из толстого матового стекла с мягким светом изнутри. Подходит к нашим «стеклянным» темам 2.0.
- **dark:** дымчатое тёмное стекло, тонкие светлые грани-рёбра, лёгкое преломление;
- **light:** молочно-белое матовое стекло, мягкие тени.
- **accent-слой:** светящееся ЯДРО внутри стекла (флаг или знак), с мягким ореолом. Становится цветом темы, и кажется, будто стекло подсвечено изнутри.

```
Frosted glass 3D icon, thick translucent matte glass object with soft rounded edges, subtle refraction, thin bright edge highlights,
soft inner light, Apple visionOS / Liquid Glass style, neutral colorless glass,
DARK: smoky dark-grey frosted glass; LIGHT: milky white frosted glass,
transparent background, centered, three-quarter view, 1024x1024, no text, no fantasy, no small details.
```

## S2 «Моно-глина + одна цветная деталь» — `S2_clay`

**Вау:** очень чисто и дорого, как иллюстрации Apple Freeform или Linear. Весь предмет одного нейтрального тона из мягкой матовой глины. Цветная только ОДНА деталь, и это цвет темы. Развитие нынешнего стиля, но без кожи и крафта — поэтому подходит к любому цвету.
- **dark:** графитовая глина (#2A2A2E–#3A3A40), мягкие блики;
- **light:** тёплая белая глина (#F2F0EC–#E4E1DB).
- **accent-слой:** одна деталь — флаг на Шпиле, закладка в книгах, три точки в пузыре.

```
Soft matte clay 3D icon, single monochrome object, smooth rounded inflated forms, subtle ambient occlusion,
DARK: graphite clay; LIGHT: warm off-white clay, one small detail left plain white for color tinting,
minimal, premium, Apple Freeform illustration style, transparent background, three-quarter view, 1024x1024, no text.
```

## S3 «Перламутр» — `S3_pearl`

**Вау:** переливающийся перламутровый материал, как жемчуг или покрытие тонкой плёнкой. Сам по себе нейтрально-радужный, поэтому дружит с любым оттенком темы. Самый «вау» из спокойных.
- **dark:** тёмный перламутр, как чёрная жемчужина, с мягкими радужными переливами на гранях;
- **light:** белый перламутр, едва заметный радужный отлив.
- **accent-слой:** мягкий ободок-подсветка по контуру и блик на главной детали, в цвет темы.

```
Iridescent pearl 3D icon, smooth pearlescent material with subtle thin-film rainbow sheen on edges, soft studio light,
DARK: black pearl material; LIGHT: white pearl material, rounded simple forms, luxurious, minimal,
transparent background, three-quarter view, 1024x1024, no text, no gold, no chrome.
```

## S4 «Игрушка 3D» — `S4_toy`

**Вау:** весёлый и дружелюбный, как Microsoft Fluent 3D Emoji или 3D-значки Duolingo и Headspace, но премиальный. Пухлые «надутые» формы, мягкий глянец, лёгкая улыбка формы. Лучше всего для обучения и мотивации.
- **dark и light:** основа нейтрально белая или светло-серая (в dark чуть темнее и холоднее), мягкие тени.
- **accent-слой:** БОЛЬШАЯ часть предмета — корпус башни, обложки книг, один пузырь. Предмет «целиком» становится цветом темы, нейтральные только детали.

```
Cute premium 3D icon, chubby inflated rounded shapes, soft semi-gloss plastic, gentle gradients, Microsoft Fluent 3D emoji style,
main body plain white (will be color-tinted), secondary details light grey, friendly, playful but clean,
transparent background, three-quarter view, 1024x1024, no face, no text, no small details.
```

## S5 «Светящийся контур» — `S5_line`

**Вау:** предмет нарисован объёмными светящимися трубками-линиями, как неон, но мягкий: один непрерывный контур в 3D. Сильнее всего смотрится на тёмных темах. ЭКСПЕРИМЕНТ — владелец раньше был против неона, но сейчас просит «вау».
- **dark:** почти вся картинка в accent-слое — светящийся контур с ореолом; основа — едва заметная тёмная стеклянная форма;
- **light:** тонкая тёмно-серая «чернильная» линия в основе, accent — мягкая цветная заливка внутри контура.
- **accent-слой:** сам светящийся контур (dark) или внутренняя заливка (light).

```
3D luminous line icon, the object drawn with one continuous soft glowing tube outline, gentle bloom, minimal geometry,
DARK: glowing white outline with soft halo over a faint dark glass silhouette; LIGHT: thin dark ink outline with soft fill,
transparent background, three-quarter view, 1024x1024, no text, no clutter.
```

---

## Как каждый стиль рисует наши 3 предмета

| Предмет | Форма (одна на все стили) | Что уходит в accent |
|---|---|---|
| `spire_tile` | 4 ступенчатых скруглённых блока, каждый ярус меньше нижнего, сверху тонкий стержень с флажком-вымпелом | флажок (S1–S3, S5); ярусы (S4) |
| `lessons` | стопка из 3 книг со скруглёнными углами, лента-закладка | закладка (S2, S3); знак на обложке (S1); обложки (S4) |
| `dialogs` | два пузыря реплик, на переднем три точки | три точки (S2); задний пузырь (S4); свечение ядра (S1) |

Сдача: коммит не нужен. Положи файлы и напиши «готово» — координатор соберёт страницу сравнения и покажет владельцу.
