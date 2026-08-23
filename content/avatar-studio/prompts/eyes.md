# Глаза (цвет / форма)

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь в `{{ITEM}}`
(например: «bright green irises», «blue irises», «slightly larger rounder eyes»).

**Промпт:**

```
Edit the attached image. Change ONLY the eyes: {{ITEM}}. The eyes stay in the
exact same position, looking straight at the camera.

Everything else must remain PIXEL-IDENTICAL to the attached image: same face
shape, eyebrows, nose, mouth, same hair, same clothing, same pose, same camera
framing, same solid green chroma background as the attached image, same lighting, same canvas 1316 x 1195 (same canvas as the attached image).

No text, no watermark. Output a single PNG, 1316 x 1195 (same canvas as the attached image).
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot eyes --base content/avatar-studio/base/base_m.png
```

PASS → `--accept --id eyes_<название>_m`.

**Если не получилось:**
- `locked_zone_changed` → «Change nothing outside the eye area: hair, mouth,
  clothing and framing stay exactly as in the attached image.»
- Взгляд ушёл в сторону → «The eyes look straight at the camera.»
