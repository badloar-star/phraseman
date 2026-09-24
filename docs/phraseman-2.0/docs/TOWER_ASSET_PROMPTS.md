# Промпты генерации картинок Шпиля — для Codex

Для: PM-284 (эпик E25). Решения — `TOWER.md` (T11, T16, T29, T32–T34), стиль — новый
тёмный стиль 2.0 (только тёмные темы, D41) и «Монетный двор» (тёмный камень, D49).
Генерирует Codex. Модель этого пакета картинки не рисует.

## Что нужно (всего 36 файлов)

| Набор | Файлы | Где используется |
|---|---|---|
| 12 шпилей-камней | `spire_s01_granite.png … spire_s12_diamond.png` | экран Шпиля (фон-силуэт), итог недели, карточка «ты поднялся в …» |
| 12 значков ступени | `spire_badge_s01.png … s12.png` | место в «все участники», профиль, пуш (мелко, 24–48 px) |
| Страж | `spire_guardian_floor.png` | фон 5/10/15 этажа |
| Вершина | `spire_summit.png` | 15 этаж, празднование вершины |
| Над облаками | `spire_above_clouds.png` | этажи 16+ |
| Вариации недели | `spire_week_v1.png … v4.png` | смена силуэта/тона по неделям (T33), цикл из 4 |
| Тени-аватары | `spire_shade_01.png … 05.png` | аватарки ботов на шпиле, в стиле обычных аватаров |

## Технические требования

- Шпили и Страж/вершина/облака: **1080×2340 PNG** (вертикальный экран), тёмный фон,
  сам шпиль по центру, **верхние 18% и нижние 22% кадра спокойные** — там шапка, кнопка
  «Подняться» и таббар. Без текста.
- Значки ступени: **512×512 PNG, прозрачный фон**, силуэт читается в 24 px.
- Тени-аватары: тот же размер и кадрирование, что у аватаров приложения
  (`content/avatar-studio/frame_passport.v1.json`), нейтральная фигура из дыма/тени,
  без лица. Боты не раскрываются (T26), поэтому тень выглядит как ещё один стиль аватара,
  а не как «бот».
- Один свет на все: мягкий ключ сверху, холодный контровой ободок, тёплая точка света
  на вершине. Никаких бликов-звёздочек, неона, радуги.
- Итог ужать в WebP. Шпили грузятся лениво: на экране только текущий, остальные — по запросу.

## МАСТЕР-ПРОМПТ (перед каждым шпилем)

```
Vertical mobile game background, dark UI, a single tall slender spire carved from
[STONE], rising from mist at the bottom to a narrow glowing tip near the top, subtle
horizontal floor rings along the spire (15 evenly spaced tiers, the 5th, 10th and 15th
slightly wider and brighter), calm near-black sky with very soft volumetric haze,
restrained cinematic lighting: soft key from above, cool rim light, one warm point of
light at the tip. Premium, minimalist, Apple-level product art, readable on a phone,
large empty calm areas at the top 18% and bottom 22% of the frame for UI.
No text, no letters, no numbers, no people, no creatures, no logos, no cartoon style.
```

## Негативный промпт

```
text, letters, numbers, watermark, logo, people, characters, face, creature, dragon,
castle wall, cartoon, anime, emoji, clipart, flat vector, neon, rainbow, lens flare,
sparkles, busy background, clutter, multiple towers, city skyline, low detail, blurry,
jpeg artifacts, cropped spire tip
```

## 12 шпилей — что подставить в [STONE]

| # | Шпиль | [STONE] | Тон |
|---|---|---|---|
| 1 | Гранит | rough grey granite with fine speckles | холодный серый |
| 2 | Базальт | dark matte basalt with hexagonal columns | графит |
| 3 | Мрамор | white marble with soft grey veins | светлый, тихий |
| 4 | Нефрит | polished green jade, translucent edges | глубокий зелёный |
| 5 | Кварц | clear rose quartz crystal, soft inner light | розово-дымчатый |
| 6 | Агат | banded agate with concentric amber layers | янтарь |
| 7 | Оникс | black onyx with thin white bands, glossy | чёрно-белый |
| 8 | Аметист | amethyst crystal clusters, violet glow inside | фиолетовый |
| 9 | Опал | black opal with iridescent flecks, very subtle | переливы, приглушённо |
| 10 | Топаз | golden imperial topaz, faceted | золотой |
| 11 | Обсидиан | volcanic obsidian glass, razor-sharp facets, faint red core | чёрный с красным |
| 12 | Алмаз | a spire of clear faceted diamond catching cold light | холодный белый |

Каждая следующая ступень выглядит **дороже**: больше граней, глубже свет внутри камня,
ярче вершина. Гранит самый простой, Алмаз самый драгоценный. Сравнить все 12 рядом:
ни один не должен выглядеть «дешевле» предыдущего.

## Значки ступени (512, прозрачный фон)

```
Premium minimalist icon, a small faceted gemstone shard shaped like a spire tip,
made of [STONE], front view, centered, 80% of frame, transparent background, same soft
studio light as the spire backgrounds, clean silhouette readable at 24 pixels.
No text, no letters, no numbers, no frame, no glow burst.
```

## Страж, вершина, над облаками, вариации недели

- **Страж:** тот же мастер-промпт, но широкое каменное кольцо-площадка посередине кадра с
  двумя тёмными колоннами-стражами по краям, свет чуть теплее. Камень нейтральный
  (тёмный базальт), чтобы подходил к любому шпилю поверх.
- **Вершина:** крупный план кончика шпиля, тёплый свет вершины раскрывается мягким
  ореолом, туман внизу кадра. Без фейерверков: празднование делает анимация, не картинка.
- **Над облаками:** шпиль уходит вниз в плотный слой облаков, сверху звёздное небо,
  очень спокойно.
- **Вариации недели (4):** тот же шпиль-силуэт, меняется только атмосфера: 1 — ясная ночь,
  2 — северное сияние очень приглушённо, 3 — лунный туман, 4 — рассветная полоса у
  горизонта. Цикл по неделям, чтобы новый шпиль в понедельник выглядел по-новому (T33).

## Проверка перед сдачей

- Все 12 шпилей — одинаковая композиция, линия этажей на тех же высотах (маркеры игроков
  накладываются кодом по одинаковым координатам).
- Зоны UI (верх 18%, низ 22%) спокойные на всех файлах.
- Значки различимы между собой в 24 px (проверить на тёмном фоне).
- Вес: шпиль в WebP ≤ 250 КБ, значок ≤ 30 КБ.
