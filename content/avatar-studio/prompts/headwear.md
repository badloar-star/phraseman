# Головной убор

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь убор в `{{ITEM}}`
(например: «assassin hood matching the outfit», «orange beanie», «baseball cap»).

**Промпт:**

```
Edit the attached image. ADD only a headwear item: {{ITEM}}. It sits naturally
on the existing head and hair; visible hair edges around it stay the same where
not covered.

Everything else must remain PIXEL-IDENTICAL to the attached image: same face,
same visible hair, same clothing, same pose, same camera framing, same flat
#F7EFE4 background, same lighting, same canvas 1024 x 1280.

The headwear must fit inside the frame: keep 4% top margin and 5% side margins.
It must NOT cover the eyes.

No text, no watermark. Output a single PNG, 1024 x 1280.
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot headwear --base content/avatar-studio/base/base_m.png
```

PASS → `--accept --id headwear_<название>_m`.

**Если не получилось:** те же фразы, что в `hair.md` (это та же зона), плюс:
- Убор закрыл глаза → «Lift the headwear so the eyes stay fully visible.»
