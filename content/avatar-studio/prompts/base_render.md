# Базовый эталонный рендер (делается ОДИН раз на базу)

Создаёт `base/base_m.png` (мальчик) и `base/base_f.png` (девочка) — фундамент,
с которым попиксельно сверяются ВСЕ остальные ассеты.

**Что приложить в чат ИИ:** утверждённый референс персонажа
(мальчик — парень с каштановыми волосами в терракотовом худи; девочка — феминный
референс). Можно вторым файлом приложить `guides/guide_1024x1280.png` со словами
«use this grid as framing guide».

**Промпт (копируй целиком):**

```
Re-render the attached character EXACTLY as they are — same face, same identity,
same semi-realistic stylized 3D Pixar-like style, same hair, same clothing —
but composed precisely to this frame specification:

- Canvas: 1024 x 1280 pixels (portrait 4:5).
- Background: completely flat, uniform color #F7EFE4, no gradient, no shadow on
  the background, no props.
- Framing: three-quarter-body bust. The character's pupils sit on a horizontal
  line at 38% of the canvas height from the top. The face is horizontally
  centered (50% width). The head (chin to top of hair) is 42% of the canvas
  height. Shoulders and upper chest are visible; arms down; nothing is cropped
  by the left, right, or top edge — keep at least 5% margin on the sides and 4%
  at the top. The body may touch the bottom edge.
- Pose: facing the camera, gentle closed-mouth smile, eyes looking straight at
  the camera.
- Light: soft studio light from the upper left, subtle warm fill, matte skin.
- Absolutely no text, no watermark, no outline, no vignette.

Output a single PNG, 1024 x 1280.
```

**Приёмка:** скачай в `inbox/`, затем

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/inbox/файл.png --slot base
```

PASS → вручную сохрани файл как `base/base_m.png` (или `base_f.png`) — это
единственный ассет, который кладётся руками, — и зафиксируй его:

```
node content/avatar-studio/scripts/check_render.mjs content/avatar-studio/base/base_m.png --slot base --accept --id base_m
```

**Если не получилось:**
- Персонаж крупнее/мельче нужного → «Zoom out slightly: the head must be 42% of
  the canvas height, pupils at 38% from the top.»
- Смещён вбок → «Center the face horizontally at exactly 50% of the width.»
- Фон не ровный → «Make the background one flat uniform color #F7EFE4 with no
  gradient or shadow.»
- Стиль уплыл → «Keep the exact identity and rendering style of the attached
  image; change only the framing.»
