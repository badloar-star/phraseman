# Промпты генерации монет — 21 дизайн (Классика + 20 рангов)

Для: PM-073 (система дизайнов монеты). Таблица рангов и цен — `COIN_RANKS.md` (D34).
Одна картинка = валюта (16–24 px в шапке) И аватар (96–160 px на визитке) — поэтому
силуэт обязан читаться крошечным, а детали — раскрываться крупно.

## Технические требования к каждому файлу
- 1024×1024 PNG, **прозрачный фон**, монета по центру, занимает ~86% кадра, ровный круг.
- Вид строго **анфас** (ровный круг, без наклона/перспективы) — так её можно ужать и вращать в анимации.
- Одинаковый свет у всех 21: мягкий студийный ключ сверху-слева, лёгкий контровой ободок, без бликов-звёздочек.
- Без текста, букв, цифр, логотипов, флагов, реальных государственных гербов и лиц людей.
- Один и тот же центральный знак на всех монетах (см. «Общий мотив») — меняются металл, чеканка, гурт, орнамент.
- Итог сохранить как `coin_r00.png … coin_r20.png` (+ исходники), затем ужать в WebP.

## Общий мотив (одинаковый на всех монетах)
Центральный рельефный знак: **стилизованный пузырь речи из двух перекрывающихся полуокружностей**
(символ фразы/диалога), минималистичный, геометрический. Вокруг — кольцевой поясок.
Именно поясок, гурт и фактура поля растут в богатстве от ранга к рангу.

---

## МАСТЕР-ПРОМПТ (вставлять перед каждым промптом ранга)

```
Premium minimalist coin icon for a serious language-learning app, single coin, perfectly
front-facing orthographic view, perfect circle, centered, occupying 86% of the frame,
transparent background. Central embossed emblem: a minimalist geometric speech bubble made of
two overlapping half-circles, crisp relief. A thin concentric ring band around the emblem.
Photoreal minted metal, museum-grade numismatic quality, subtle micro-scratches, realistic
depth of relief, soft studio key light from upper-left, gentle rim light, soft contact
ambient occlusion inside the relief, no harsh specular stars. Calm, expensive, restrained,
Apple-level product rendering, dark-UI friendly (reads well on a near-black background).
Clean silhouette readable at 20 pixels. No text, no letters, no numbers, no logos, no faces,
no national symbols, no cartoon style, no emoji style, no glow bursts, no sparkles, no drop
shadow outside the coin.
```

## НЕГАТИВНЫЙ ПРОМПТ (если генератор поддерживает)

```
text, letters, numbers, watermark, logo, face, portrait, flag, cartoon, anime, emoji, clipart,
flat vector, 3/4 view, perspective tilt, stacked coins, multiple coins, hand, table, background
scene, sparkles, lens flare, neon glow, rainbow, plastic, toy, low detail, blurry, jpeg artifacts,
cropped edge, oval shape
```

---

## ПРОМПТЫ ПО РАНГАМ (мастер-промпт + строка ранга)

| Файл | Ранг | Название | Добавка к мастер-промпту |
|---|---:|---|---|
| coin_r00 | 0 | Классика | `Metal: clean neutral pewter-silver alloy, matte satin field, plain smooth rim, simplest possible relief, no ornament. The humble starting coin.` |
| coin_r01 | 1 | Медь | `Metal: warm fresh copper, soft rosy-orange tone, satin field, plain rim with fine straight reeding.` |
| coin_r02 | 2 | Бронза | `Metal: deep bronze with a light natural green-brown patina settled in the recesses, satin field, reeded rim.` |
| coin_r03 | 3 | Латунь | `Metal: bright pale yellow brass, brushed radial field texture, reeded rim, slightly crisper relief.` |
| coin_r04 | 4 | Никель | `Metal: cool light-grey nickel, fine concentric lathe lines across the field, reeded rim, clean modern feel.` |
| coin_r05 | 5 | Сталь | `Metal: dark blued gunmetal steel with subtle blue-violet heat tint, bead-blasted matte field, polished raised emblem, reeded rim.` |
| coin_r06 | 6 | Серебро | `Metal: bright fine silver, proof finish — mirror-polished field with frosted matte emblem (cameo contrast), reeded rim.` |
| coin_r07 | 7 | Стерлинг | `Metal: sterling silver, proof cameo finish, plus a delicate engraved guilloché wave pattern in the ring band, beaded inner border.` |
| coin_r08 | 8 | Электрум | `Metal: electrum — pale champagne gold-silver alloy, soft warm-cool gradient, satin field, fine beaded inner border, subtle guilloché ring.` |
| coin_r09 | 9 | Золото | `Metal: rich 22k yellow gold, proof cameo finish, beaded inner border, fine reeded rim, restrained luxurious warmth.` |
| coin_r10 | 10 | Червонец | `Metal: red gold, deep warm rose-copper gold tone, proof cameo finish, laurel-like minimalist leaf band around the ring, reeded rim.` |
| coin_r11 | 11 | Дукат | `Metal: soft high-karat old gold, slightly hand-struck irregular historical relief, fine dotted border, subtle antique toning in recesses — historic ducat character without any inscriptions.` |
| coin_r12 | 12 | Флорин | `Metal: warm gold, ring band filled with a refined stylised lily/floral ornament (abstract, not a heraldic emblem), proof field, beaded border.` |
| coin_r13 | 13 | Соверен | `Metal: bright gold, formal ceremonial design, ring band with an abstract geometric crest pattern (no real coat of arms), double beaded border, milled rim.` |
| coin_r14 | 14 | Империал | `Metal: heavy thick gold coin, visibly wider raised rim, grand ceremonial layered relief, ornate but symmetric abstract ornament band, mirror field.` |
| coin_r15 | 15 | Платина | `Metal: matte platinum, cool white-grey, brushed satin field, ultra-precise sharp modern relief, minimal thin engraved rings — expensive understatement.` |
| coin_r16 | 16 | Палладий | `Metal: palladium, bright cool silver-white with a faint warm undertone, alternating polished and frosted concentric zones, precise modern engraving.` |
| coin_r17 | 17 | Родий | `Metal: rhodium, ultra-reflective chrome-like mirror field with frosted emblem, extremely crisp relief, thin precise knurled rim.` |
| coin_r18 | 18 | Иридий | `Metal: iridium, dark silvery metal with subtle oil-slick iridescent sheen (very restrained, not rainbow), frosted emblem, fine knurled rim.` |
| coin_r19 | 19 | Осмий | `Metal: osmium, deep blue-steel metal with crystalline micro-facet texture on the field (like osmium crystal), polished emblem, precise rim.` |
| coin_r20 | 20 | Эталон | `The final masterpiece coin: bi-metallic — inner disc of matte platinum, outer ring of polished yellow gold, perfectly seamless joint; flawless mirror emblem; the most restrained, calm and expensive design of the whole set. No extra ornament.` |

---

## Как держать серию единой
1. Сгенерировать сначала **r00, r09, r20** — утвердить мотив и свет на трёх опорных.
2. Остальные генерировать с тем же сидом/референсом (image-to-image от r00 с силой ~0.4–0.55),
   меняя только строку ранга — иначе мотив «поплывёт».
3. Проверка каждой: уменьшить до 20 px на почти-чёрном фоне — монета узнаваема и отличима
   от соседних рангов по цвету металла.
4. Соседние ранги обязаны отличаться цветом/фактурой уже в 20 px (особенно 4–5 и 15–17).

## Анимация апгрейда (для PM-077, справочно)
Монета подпрыгивает → вращается вокруг вертикальной оси (ребро в профиль) → на обороте
разворачивается новым дизайном. Для этого каждому рангу нужен только лицевой анфас —
ребро и вращение делаются в коде (scaleX), отдельные кадры не нужны.
