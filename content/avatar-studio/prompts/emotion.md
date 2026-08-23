# Эмоция

**Приложи в чат:** `base/base_m.png` или `base/base_f.png`. Подставь эмоцию в `{{ITEM}}`.
Матрица P0: `joy` («big open happy smile»), `surprise` («raised eyebrows, wide
eyes, small open mouth»), `sad` («downturned mouth, slightly drooping eyelids»),
`determined` («focused eyes, confident closed-mouth smirk»), `wink` («winking
one eye, playful smile»). Базовая `smile` — это сам базовый рендер.

**Промпт:**

```
Edit the attached image. Change ONLY the facial expression to: {{ITEM}}. Move
only the eyebrows, eyelids, eyes and mouth as needed for this expression.

Everything else must remain PIXEL-IDENTICAL to the attached image: same head
position and size, same hair silhouette, same clothing, same skin, same pose,
same camera framing, same solid green chroma background as the attached image, same lighting, same canvas
1316 x 1195 (same canvas as the attached image). The head does not tilt or turn.

No text, no watermark. Output a single PNG, 1316 x 1195 (same canvas as the attached image).
```

**Приёмка:**

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot emotion --base content/avatar-studio/base/base_m.png
```

PASS → `--accept --id emotion_<название>_m`.

**Если не получилось:**
- `locked_zone_changed` (волосы/одежда) → «Hair and clothing must not change;
  move only the facial features.»
- Голова наклонилась → «Keep the head in the exact same position and angle; the
  expression changes through the face only.»
