# Новая одежда

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь вещь в `{{ITEM}}`
(например: «denim jacket over white t-shirt», «school uniform blazer», «wizard robe»).

**Промпт:**

```
Edit the attached image. Change ONLY the clothing to: {{ITEM}}.

Everything else must remain PIXEL-IDENTICAL to the attached image: same face,
same hair and its exact silhouette, same skin, same pose, same camera framing,
same solid green chroma background as the attached image, same lighting, same canvas 1316 x 1195 (same canvas as the attached image).

The clothing must stay within the frame: nothing cropped by the left or right
edge (keep 5% side margins). The collar must sit naturally on the same neck and
shoulders as in the attached image. Do not add hats, glasses or accessories.

No text, no watermark. Output a single PNG, 1316 x 1195 (same canvas as the attached image).
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot outfit --base content/avatar-studio/base/base_m.png
```

PASS → добавь `--accept --id outfit_<название>_m`.

**Если не получилось:**
- `locked_zone_changed` (голова изменилась) → «The head, face and hair must stay
  exactly as in the attached image; modify the clothing area only.»
- `pose_shifted` → «Do not move or rescale the character; keep the exact framing.»
- Вылезло за края → «Keep the outfit silhouette within 5% side margins.»
