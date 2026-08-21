# Avatar DNA v1 — style lock

Status: production contract. Reference approved by the owner on 2026-08-20/21.

## Visual target

- Warm premium stylized 3D character illustration matching the attached Phraseman home reference: friendly animated-film proportions, softly sculpted face, large but anatomically plausible expressive eyes, compact nose, natural smile and clean readable silhouette.
- Materials feel softly rendered rather than plastic: gentle skin subsurface warmth, shaped hair clumps, woven clothing and restrained ambient occlusion.
- Light comes from the upper front-left with a broad cream key and soft terracotta bounce. Shadows are warm and diffuse; no hard rim, neon, metallic glare or cool blue cast.
- Core palette: cream `#FFF3E8`, warm skin families, chestnut/cocoa hair, terracotta `#C94B20`, muted olive accents. Characters must stay readable at 64 px.
- One orthographic front pose on the `human_v1` rig. Head, eyes, nose, mouth, ears, neck and shoulders remain on the rig anchors. Camera, focal length, crop and head tilt never change between parts.

## Geometry lock

- Authoring canvas: 2048 × 2048 transparent RGBA. Runtime canvas: 512 × 512.
- The complete studio character is front-facing, centered, head-and-upper-torso, with shoulders spanning roughly x=0.25…0.75 and chin near y=0.72.
- Face-bound parts remain inside `face.safe`; hair, hoods and headwear remain inside `head.safe` unless their declared slot intentionally extends to shoulders.
- Every swappable feature uses the same anchor positions from `human_v1.rig.json`. No per-combination regeneration is allowed.
- Hair and compound hoods have explicit back/front layers. Occlusion is metadata-driven; covered parts are hidden, never distorted.

## Generation prompt contract

- Use case: `stylized-concept`
- Asset type: modular mobile avatar source layer
- Style/medium: warm premium stylized 3D character render, animated-film quality
- Composition: exact orthographic front pose on the `human_v1` guide, identical camera and scale
- Lighting: broad cream key, soft terracotta bounce, gentle contact shadows
- Constraints: genuinely transparent background; no text; no watermark; no extra anatomy; no extra accessories; no camera change; no crop change; preserve the rig-guide silhouette and anchors
Avoid: photorealism, anime line art, flat vector art, plastic skin, giant eyes outside the face, asymmetrical eye placement, floating parts, clipped hair, halos, hard shadows, blue lighting.

## Family rules

- Starter presets define identity and overall proportion only. Individual eyes, brows, noses, mouths, hair and wearables must still fit either starter without redraw.
- Skin-tone layers change tone without changing facial geometry.
- Iris colors are tint variants of one fixed iris mask.
- Hair colors are tint variants of fixed hairstyle masks; they do not alter silhouette.
- Masks, eyewear and facial hair use face anchors and may not cover the eye line unless declared in `occludes`.
- Assassin hood is a compound asset: `hood.back`, clipped face shadow and `headwear.front`; it hides `hair.front` and ears while preserving the face.
- Backgrounds contain no character pixels. Foreground effects contain no permanent body pixels.

## QA rejection rules

Reject a source or bundle when any of these is true:

- alpha leaves its declared safe polygon;
- a required front/back pair is missing;
- transparent or low-alpha edge pixels produce a light halo;
- canvas dimensions, camera or anchors differ;
- the 64 px portrait loses the eyes/face/silhouette;
- a different item ID or version produces identical unreviewed bytes;
- an existing immutable `<itemId>/<assetVersion>` would be overwritten;
- the contact sheet shows face drift, eye drift, skin-tone geometry drift, broken occlusion or a style change.

The character itself is always static. Motion belongs only to Studio controls and transitions.
