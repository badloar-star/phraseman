# Ассет спина — промпт для DALL·E и приёмка

**Дата:** 2026-08-26
**Решение владельца:** спин получает свой узнаваемый значок, применяемый везде,
где спин упоминается или появляется.

## Что это за объект

Спин — это **право крутнуть рулетку**, а не приз из неё. Поэтому он не
принадлежит ни одному семейству призов и не должен быть похож ни на один из 36
существующих артефактов каталога (кристаллы, раковины, звёздные медальоны,
энергоячейки, лампы, щит, песочные часы, ключи Plus).

Владелец выбрал образ: **жетон/монета для рулетки** — «входной билет» в розыгрыш.

## Обязательный арт-канон

Полный канон: `docs/superpowers/specs/2026-08-21-level-spin-reward-icons-design.md`.
Ассет спина обязан ему соответствовать, чтобы стоять в одном ряду с призами.

Общая материальная база (та же, что у всех 36 призов):

| Роль | Цвет | Применение |
|---|---|---|
| Обсидиан | `#14171A` | структура, глубокие впадины, тёмный контур |
| Графит | `#262A2E` | вторичная структура, матовые поверхности |
| Порцелан | `#E6E0D3` | светлые плоскости, светлый контур |
| Шампань-металл | `#A68B60` | сдержанная фурнитура — **ведущий акцент спина** |

У спина **собственное семейство** (`spin`) с акцентом `#A68B60`: он не приз, ему
нужна своя идентичность.

## Промпт для DALL·E 3

```
A single premium museum-artifact object on a fully transparent background:
a thick circular spin token — an entry token for a wheel of fortune — resting
upright in a low architectural mount.

Construction: a substantial faceted disc with a bevelled outer rim and a clean
radial notch pattern around the edge, seated in a shallow rectangular base of
matte graphite. The disc face carries a restrained concentric groove and one
small centred recess. The whole object reads as a heavy, precisely machined
token, not a coin of currency and not a wheel.

Material and colour: matte obsidian #14171A structure and deep recesses, matte
graphite #262A2E secondary surfaces, porcelain #E6E0D3 light planes, and
restrained champagne metal #A68B60 hardware on the rim and centre recess. The
champagne metal is the only accent; it is a muted brushed metal, never a bright
gold fill.

Every silhouette edge carries both a light porcelain edge and a dark obsidian
edge so the object stays legible on light, dark, warm, cool, and saturated
backgrounds.

Lighting: matte studio light, soft and even. No exterior bloom, no neon rim,
no glow, no lens flare, no sparkles or particles.

Style: premium, architectural, quiet, tactile, restrained. Museum-artifact
direction. Absolutely no cartoon clay, no toy styling, no candy colour, no
rainbow or iridescent finish, no gloss highlights beyond subtle matte
specularity.

Strictly forbidden in the image: any text, letter, number, digit, currency
symbol, logo, watermark, arrow, or roulette wheel spokes.

Composition: the object is centred, fully inside the frame, and does not touch
any edge. Square 1:1 framing. Background must be fully transparent.
```

Если генератор не отдаёт прозрачный фон — генерировать на **чистом белом** и
вырезать фон детерминированной обрезкой, не трогая сам объект (не перекрашивать,
не дорисовывать геометрию).

## Приёмка (отклонять при любом нарушении)

- [ ] нет текста, цифр, символов валюты, логотипов, стрелок и спиц колеса
- [ ] акцент только шампань-металл `#A68B60`, второго насыщенного цвета нет
- [ ] нет неона, внешнего свечения, радуги, переливов, «конфетных» цветов
- [ ] нет мультяшной пластилиновости и игрушечного стиля
- [ ] у силуэта есть и светлая порцелановая, и тёмная обсидиановая кромка
- [ ] объект не касается краёв, геометрия не обрезана
- [ ] читается в оттенках серого (форма несёт узнавание, не цвет)
- [ ] не похож ни на один из 36 призов каталога
- [ ] проверен на белом, чёрном, насыщенном синем и тёмной карточке приложения
      при 300 px и 118 px

## Подготовка файла

1. Итоговый размер **512×512**, RGBA **WebP**, качество **70–78**, с альфой.
2. Проверить четырёхканальную альфу и прозрачные углы.
3. Положить как `assets/images/spin/spin_ticket.webp`.

Ориентир по весу: соседние призы занимают ~11 КБ каждый.

## Что заработает само после подстановки файла

Проводка уже сделана — код ищет файл и подхватывает его без правок:

| Поверхность | Файл | Размер значка |
|---|---|---|
| Кнопка спина на Главной | `app/(tabs)/home.tsx` | 24 |
| Раздел «Подарки» | `app/level_gifts_inventory.tsx` | 24 |
| Анимация появления спина (Арена, уровень, результаты, дев-хаб) | `components/SpinRewardPlaque.tsx` | 34 |
| Награда «+1 спин» в модалке сундука лиги | `components/LeagueChestOpenModal.tsx` | крупная карточка |

Пока файла нет, все четыре места показывают прежний запасной значок подарка —
приложение работает, ошибок сборки нет.
