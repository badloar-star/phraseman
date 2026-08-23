# Аксессуар

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь аксессуар в `{{ITEM}}`
(например: «round glasses», «small gold earrings», «backpack strap over shoulder»).

**Промпт:**

```
Edit the attached image. ADD only one accessory: {{ITEM}}. Place it naturally on
the character.

Everything else must remain PIXEL-IDENTICAL to the attached image: same face and
expression, same hair, same clothing, same pose, same camera framing, same flat
chroma green background, same lighting, same canvas 1316 x 1195 (same canvas as the attached image).

The accessory must stay within the frame margins (4% top, 5% sides) and must not
hide the eyes (glasses frames are fine, the eyes stay visible through them).

No text, no watermark. Output a single PNG, 1316 x 1195 (same canvas as the attached image).
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot accessory --base content/avatar-studio/base/base_m.png
```

PASS → `--accept --id accessory_<название>_m`.

⚠️ У аксессуаров lock-зона мягкая (они могут быть где угодно на фигуре), поэтому
после машинного PASS обязательно глянь глазами, что лицо/волосы/одежда не
изменились.

**Если не получилось:**
- `pose_shifted` → «Do not move or rescale the character; only add the accessory.»
- Аксессуар изменил лицо/волосы → «Add the accessory on top; the face, hair and
  clothing pixels must stay exactly as in the attached image.»
