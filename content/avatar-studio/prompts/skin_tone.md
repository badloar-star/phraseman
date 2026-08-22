# Тон кожи

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь тон в `{{ITEM}}`
(матрица P0: «warm caramel skin tone», «deep brown skin tone»).

**Промпт:**

```
Edit the attached image. Change ONLY the skin tone of the character to:
{{ITEM}}. Apply it consistently to the face, neck, ears and any visible hands.
Keep the same facial features, the same blush and shading style.

Everything else must remain PIXEL-IDENTICAL to the attached image: same face
shape and expression, same eyes, same hair color and silhouette, same clothing,
same pose, same camera framing, same flat #F7EFE4 background, same lighting,
same canvas 1024 x 1280.

No text, no watermark. Output a single PNG, 1024 x 1280.
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot skin --base content/avatar-studio/base/base_m.png
```

PASS → `--accept --id skin_<название>_m`.

⚠️ Тон кожи меняет лицо по определению, поэтому lock-зона мягкая — после PASS
проверь глазами: волосы и одежда не изменились, черты лица те же.

**Если не получилось:**
- Изменилась причёска/одежда → «Change skin pixels only; hair and clothing stay
  exactly as in the attached image.»
- Черты «поплыли» → «Keep the identical facial features; only the skin color
  changes.»
