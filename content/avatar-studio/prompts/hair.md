# Новая причёска

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь причёску в `{{ITEM}}`
(например: «short curly afro», «long straight hair with middle part», «high bun»).

**Промпт:**

```
Edit the attached image. Change ONLY the hairstyle to: {{ITEM}}, in one uniform
medium-brown color (#4B2415).

Everything else must remain PIXEL-IDENTICAL to the attached image: same face,
same eyes, nose, mouth and their exact positions, same skin, same clothing, same
pose, same camera framing, same flat #F7EFE4 background, same lighting, same
canvas 1024 x 1280.

The new hair must fit inside the frame: nothing cropped by the top or side
edges (keep 4% top margin and 5% side margins). The hair may cover the forehead
naturally but must NOT cover the eyes.

No text, no watermark. Output a single PNG, 1024 x 1280.
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot hair --base content/avatar-studio/base/base_m.png
```

PASS → добавь `--accept --id hair_<название>_m`. Цвета этой причёски делаются
потом перекрасом, отдельно генерировать не надо.

**Если не получилось:**
- `pose_shifted` / `scale_drifted` → «Do not move or rescale the character; keep
  the exact framing of the attached image, change only the hair.»
- `locked_zone_changed` (лицо/одежда изменились) → «The face and the clothing
  must stay exactly as in the attached image; modify hair pixels only.»
- `breaks_top_margin` → «Make the hairstyle more compact so it stays 4% away
  from the top edge.»
- `background_mismatch` → «Keep the background one flat uniform #F7EFE4.»
