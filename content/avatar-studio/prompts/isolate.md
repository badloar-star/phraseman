# Шаг 2: изоляция детали на зелёном фоне

Применяется ПОСЛЕ того, как деталь сгенерирована на персонаже и выглядит хорошо.
Это второй запрос в том же чате: он превращает картинку «персонаж с новой
причёской» в чистый слой для приложения.

**Приложи в чат:** картинку детали НА персонаже (результат шага 1).

**Промпт:**

```
Take the attached image. Output ONLY the {{WHAT}} from it, isolated as a
cutout on a solid pure green background (#00FF00).

Critical rules:
- Keep the {{WHAT}} in the EXACT same position, scale and perspective as in
  the attached image. Same canvas 1024 x 1280. Do not recenter or enlarge it.
- Include every pixel of the {{WHAT}}, including strands/parts that overlap
  the face, ears, shoulders or clothing in the original.
- Include NOTHING else: no skin, no face, no ears, no neck, no clothing, no
  shadows on the background. Everything that is not the {{WHAT}} is pure
  #00FF00 green.
- No text, no watermark. Output a single PNG, 1024 x 1280.
```

`{{WHAT}}` = «new hairstyle» для причёсок, «hood» для капюшона, «glasses» для
очков и т.п.

**Приёмка:** скачай в `inbox/` и запусти хромакей + проверку:

```
node content/avatar-studio/scripts/key_green.mjs content/avatar-studio/inbox/слой.png --onmodel content/avatar-studio/catalog/hair/<id>.png --base content/avatar-studio/base/base_m.png --accept --id <id>
```

Скрипт снимет зелёный, проверит, что слой совпадает по месту с деталью на
персонаже, и положит готовый слой в `layers-src/` — публикация подхватит его
вместо автоматической вырезки.

**Если не получилось:**
- Деталь сместилась/увеличилась → «Keep it in the exact same position and
  scale as in the attached image; the canvas is the same 1024 x 1280.»
- В слой попала кожа/одежда → «Include only the {{WHAT}}; every other pixel
  must be pure #00FF00.»
- Потерялись пряди на лице/плечах → «Include the strands that overlap the
  face and shoulders in the original.»
