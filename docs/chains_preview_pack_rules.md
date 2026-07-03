# Chains Preview Pack Rules

This is the protected source of truth for Chains / Cepicepi YouTube preview, title, description, tag, and thumbnail packages.

Do not overwrite these instructions with older "learning card", "generic educational blocks", "all thumbnails need faces", or "random bright YouTube colors" rules. If another document conflicts with this file, this file wins for Chains preview generation.

## Golden Formula

The approved formula is `premium_metaphor_v1`.

Golden reference pack:

`C:\Users\badlo\OneDrive\Desktop\банк превью\chains_codex_dalle_premium_ideas_20260702_163923`

The winning formula is:

1. One strong adult background color or rich texture.
2. One large readable hook that creates a question, tension, or curiosity.
3. One associative metaphor object that explains the idea instantly.
4. Optional one confident professional character, never a childish mascot.
5. Premium restrained color system, not random bright color noise.
6. Minimal elements. No clutter. No repeated educational blocks as the main formula.

Approved golden examples from the reference pack:

- `ДУМАЕШЬ НА РУССКОМ? / ПЕРЕКЛЮЧИ МОЗГ` with a glowing brain and a professional woman.
- `КЛЮЧ К АНГЛИЙСКОМУ / НЕ В СЛОВАХ` with a real brass key and a professional woman.
- `ВХОД ЕСТЬ / ПОЧЕМУ НЕ ЗАХОДИШЬ?` with a door, warm light, and a lock, no face.
- `КУДА ВЕДЕТ ФРАЗА? / СЛУШАЙ МАРШРУТ` with a compass, no face.
- `ВКЛЮЧИ АНГЛИЙСКИЙ / ОДНИМ ПЕРЕКЛЮЧЕНИЕМ` with a switch and a professional woman.
- `ФРАЗЫ ЛИПНУТ / ПОЧЕМУ ТАК?` with a magnet, no face.

## Source And Destination

- Mandatory inspiration folder: `C:\Users\badlo\OneDrive\Desktop\preview examples`.
- Mandatory final preview bank: `C:\Users\badlo\OneDrive\Desktop\банк превью`.
- Do not save final previews only to `.codex-tmp` or to a separate archive folder.
- Temporary exports are allowed, but the user-facing final files must be inside `банк превью`.
- Every run must include a contact sheet and manifest in the preview bank.

## Visual Direction

Use a premium adult editorial thumbnail style:

- Background: one dominant expensive color or texture, such as deep emerald velvet, graphite leather, wine burgundy, midnight blue, matte charcoal, dark teal, porcelain cream, brass, copper, lacquer red, ivory, or restrained gold.
- Text: huge, readable in one second, Cyrillic, high contrast, no tiny explanatory paragraphs.
- Hook: a sharp question or tension, not dumb clickbait. The viewer should think "why?" or "how?".
- Object: always one clear metaphor object: brain, key, lock, door, compass, switch, magnet, mirror, map, signal wave, microphone, puzzle piece, bridge, or similar.
- Character: optional. If used, a woman should look like a confident professional in a strict outfit with a knowing smirk, skeptical look, or calm expert confidence.
- Composition: one background, one hook, one object, optional one character. Nothing else unless it directly strengthens the metaphor.

## Titles And Descriptions

Every generated preview concept must include YouTube titles and a full video description.

Per-thumbnail deliverables:

- `<thumbnail>.titles.txt` with at least six title variants.
- `<thumbnail>.description.txt` with one full ready-to-paste YouTube description.
- `ALL_THUMBNAIL_TITLES.txt` aggregating every title.
- `ALL_VIDEO_DESCRIPTIONS.txt` aggregating every full description.

Title rules:

- Every title must make it immediately clear that the video is about English, English listening, English phrases, English speech, or language learning.
- Titles must use curiosity, learner pain, contradiction, or result. Do not write neutral labels.
- Titles must match the thumbnail promise and the actual lesson format.
- Use strong but honest hooks. No fake miracle claims, fake time claims, or low-count bait.
- Prefer concrete wording: `английский на слух`, `английские фразы`, `говорить по-английски`, `без перевода в голове`, `метод цепочек`, `фразы с переводом`.

Full description rules, based on the saved marketing-principle screenshot:

- Hook fast in the first two lines. Assume most people scroll unless the first lines make the value obvious.
- Use `вы`, `ваш`, `вам` naturally: the description must speak to the viewer, not describe the creator.
- State the concrete problem: words are known but speech is not automatic, listening is hard, translation in the head is slow, or phrases disappear from memory.
- Explain the method clearly: phrases are trained in chains, with meaning, listening, repetition, and return to English sound.
- Address objections before they stop the viewer: this is not magic, not a grammar lecture, not random word memorization, not a five-minute promise.
- Build trust through honesty and specificity, not exaggerated profit-style promises.
- Tell the story of the lesson: what the viewer will hear, repeat, understand, and practice.
- Include Phraseman as the next practical step, not as a random ad.
- Include App Store, Google Play, and site links in every full description.
- End with a useful comment prompt or practice instruction.
- Do not include timecodes unless explicitly requested.

## Forbidden Patterns

These are failures for future Chains preview generation:

- Generic "school cards everywhere" as the main design.
- Random bright colors thrown together without a premium palette.
- Repeating the same blocks/panels/card strips across every thumbnail.
- Forcing faces or emotions into every thumbnail.
- Childish mascot energy.
- Fake YouTube clutter, dashboards, flags, badges, emoji, icons, and small labels unless the specific concept truly needs one.
- Long text, small text, unreadable text, broken Cyrillic, mojibake, or extra Latin words.
- False claims such as `5 минут`, `за 5 минут`, or low-count claims such as `25 фраз` for a long Chains lesson.
- Titles that do not signal English/language learning.
- Empty, generic, or link-only descriptions.
- Descriptions without Phraseman download links.
- Descriptions that ignore viewer objections or do not explain the learning method.
- Repackaging old images and calling it a new generation.
- Local SVG/PIL/canvas thumbnails as final output for a new AI preview pack.
- Clean AI backgrounds without visible hook text in the final ready folder.
- Reusing one generic local typography layout across all thumbnails.

## Reference Style Coverage

- Use `preview examples` as inspiration before generating.
- Reference examples without faces are valid. Do not replace them with forced character thumbnails.
- Reference examples with faces are valid only when the new concept benefits from a professional character.
- A good pack should include both face-led and no-face concepts when the reference folder contains both.
- The premium metaphor formula is more important than copying old noisy layouts.

## Fresh Generation Contract

- New styled thumbnail packs must use Codex/DALL-E image-generation output as the final visual source.
- Local scripts may resize, crop, archive, write sidecars, and run gates; they must not draw final thumbnails with SVG/PIL/canvas and call that a new AI preview generation.
- Final thumbnail text must be part of the generated thumbnail artwork itself, like the approved 20260702 reference pack. Do not generate clean background plates and then add the main hook text locally as a template overlay.
- The ready `youtube_ready_1280x720` folder must contain uploadable thumbnails that already visibly include the hook text. A separate `source_generated_images` folder is allowed only as archive/source material, never as the apparent final output.
- If a language variant is requested, adapt the hook/title rules to that language explicitly. For French packs, every title/hook must clearly signal French / French listening / French phrases / French speech instead of forcing old English wording.
- The ready folder must include `fresh_generation_manifest.json`.
- `fresh_generation_manifest.json` must explicitly set:
  - `fresh_generation: true`
  - `generator: "codex_dalle"`
  - `design_formula: "premium_metaphor_v1"`
  - `reference_source_dir: "C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples"`
  - `preview_bank_dir: "C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью"`
  - non-empty `generation_mode`
  - at least three `style_families`
  - `source_image_reuse_count: 0`, unless the user explicitly asked to reuse previous images
- A repackaged set of previous raster images is allowed only when the user explicitly asks for archive/repackaging.

## Ready Package Shape

- A ready preview pack must have one primary run folder inside `C:\Users\badlo\OneDrive\Desktop\банк превью`.
- Final thumbnails go in `READY_YOUTUBE_PACK/youtube_ready_1280x720`.
- Each final thumbnail must be exactly `1280x720`.
- Each final thumbnail must have a `.titles.txt` sidecar with at least six title variants.
- The pack must include `ALL_THUMBNAIL_TITLES.txt`, `description.txt`, `pinned_comment.txt`, `tags.txt`, `thumbnail_manifest.json`, `READY_PACKAGE_MANIFEST.json`, `fresh_generation_manifest.json`, `thumbnail_gate_report.md`, and `contact_sheet.jpg`.
- The pack must include `ALL_VIDEO_DESCRIPTIONS.txt`.
- Run `node scripts/chains_preview_pack_contract_check.mjs --ready-dir "<READY_YOUTUBE_PACK>" --report "<report path>"` before saying the preview pack is ready.
