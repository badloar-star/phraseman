# Phraseman Motion Ad Trilogy — Design Specification

**Date:** 2026-07-17
**Status:** approved concept, awaiting written-spec review
**Primary format:** 16:9 long-form video insert
**Working title:** The Golden Lens

## 1. Mission

Create three short, premium Phraseman advertising inserts for long-form
language-learning videos. Every insert must work as a complete standalone
advertisement, while the three together form a progressively clearer campaign:

1. challenge the belief that a language must be memorised;
2. show why gamified practice makes people return;
3. give a direct instruction to use the language and try Phraseman.

The films should have the restraint, material precision, and product focus
associated with premium technology launch advertising, while remaining an
original Phraseman system rather than copying another brand's assets or UI.

## 2. Non-negotiable campaign rules

- Each film is understandable without seeing either of the other two.
- Each film uses the same visual and sonic identity.
- The campaign is target-language-neutral. Channel-specific versions may
  replace the generic word `язык` with the relevant language when desired.
- Every film includes the official Phraseman identity, a real working QR code,
  and a clear scan action.
- Every visible change has a synchronised audible counterpart.
- If a movement does not deserve a sound, remove the movement.
- Text remains short, exact, and readable. No pseudo-philosophical copy.
- Do not use school-shaming or demeaning vocabulary.
- Do not use typewriter animation or keyboard sounds.
- Do not generate, redraw, refract, distort, or animate the internal pattern of
  the QR code.
- Do not invent Phraseman UI. Any product reveal uses an authentic current
  screen capture.

## 3. Approved copy

### Film 1 — belief change

```text
А что, если язык
не нужно заучивать?

Им можно просто пользоваться.
```

### Film 2 — gamification

```text
Практика становится игрой.

Поэтому к языку
хочется возвращаться.
```

### Film 3 — action

```text
Не учи язык.
Используй его.

Каждый день.
В своём темпе.
```

### Shared end card

```text
Phraseman
Сканируй, чтобы попробовать
```

## 4. Campaign progression

| Film | Independent job | Contribution to the trilogy |
|---|---|---|
| 1 | Creates curiosity through a clear contrarian proposition | Reframes language learning from memorising to using |
| 2 | Explains the emotional value of gamification | Shows why practice becomes repeatable |
| 3 | Gives a concise behavioural instruction and product reveal | Converts curiosity into a scan |

Recommended placements in long-form videos:

- Film 1: after a natural lesson boundary around minutes 7–10.
- Film 2: after a natural lesson boundary around minutes 20–25.
- Film 3: after a natural lesson boundary around minutes 40–50.

Semantic placement is more important than the exact minute. Never interrupt a
sentence, example, or explanation.

## 5. Original visual identity

### 5.1 Recurring hero object

The shared hero is one circular golden eyeglass lens extracted from the
official Phraseman app icon at:

`assets/images/icon.png`

The lens evolves across the campaign:

- Film 1: an optical instrument that reveals and activates the message;
- Film 2: a premium game token completing a satisfying return loop;
- Film 3: one component of the complete Phraseman icon, which assembles before
  the product reveal.

The lens creates recognition across the trilogy without making any film depend
on another.

### 5.2 Palette

- Studio background: warm ivory `#F7F6F2`.
- Primary typography: graphite `#17151D`.
- Hero material: metallic gold sampled directly from the official app icon.
- Optical glass: warm neutral, controlled transparency, no rainbow dispersion.
- Optional dark product surface: sampled from the icon's charcoal background.

Do not set important text in bright green or gold on white. Accent colours are
used as surfaces, physical objects, or thin markers with dark foregrounds.

### 5.3 Typography

- Font family: Inter, matching the bundled Phraseman brand font.
- Primary statements: Inter SemiBold or Bold.
- Supporting line and CTA: Inter Regular or SemiBold.
- Use manual line breaks exactly as specified.
- Animate text as complete semantic blocks, not arbitrary individual letters.
- Preserve exact Cyrillic characters and punctuation.

### 5.4 Lighting and materials

- Large, soft studio key light.
- Controlled rim light on the gold lens.
- Soft contact shadows that confirm weight.
- Subtle optical refraction only inside the hero lens.
- No uncontrolled lens flare, rainbow bloom, glow haze, or floating dust.
- Camera movement is limited to meaningful product emphasis.

### 5.5 Motion behaviour

- One primary action at a time.
- Confident acceleration, soft deceleration, and precise magnetic settling.
- Physical weight without elastic bounce.
- No continuous rotation.
- No gratuitous parallax.
- No random fades.
- End cards remain still for scanning.

## 6. Sonic identity

### 6.1 Creative rule

Every visual event receives an audible counterpart. The result must feel like
one composed sonic sentence, not a collection of unrelated interface sounds.

Reducing unnecessary visual events is the mechanism that prevents the
sound-rich design from becoming noisy.

### 6.2 Sound material families

1. **Air displacement** — scene cuts, reveals, and spatial movement.
2. **Magnetic/felt mechanics** — contact, docking, and text settling.
3. **Tempered glass harmonics** — meaning changes, important words, optical
   transformations, and the question mark in Film 1.
4. **Phraseman mnemonic** — an ascending three-note motif with a warm,
   restrained resolution.

The mnemonic inherits the existing Phraseman sound direction:

- micro form: 120–300 ms;
- standard end-card form: 600–1200 ms;
- materials: celesta, glass harmonics, subtle harp or warm strings;
- no arcade beep, cash sound, aggressive brass, or long melody.

### 6.3 Synchronisation

- A moving sound follows its object in the stereo field.
- Every entrance has an attack.
- Every stop has a separate landing or lock.
- Physical contact and visual illumination are separate audible events when
  they occur at different frames.
- Overlapping visual changes may use one deliberately layered composite cue,
  but no change may be silently ignored.
- The QR enters as one controlled graphic event. Its individual modules do not
  animate separately.

### 6.4 Mixing and delivery

- Production format: 48 kHz, 24-bit stereo.
- Final target: approximately `-14 LUFS-I`.
- True peak: no higher than `-1 dBTP`.
- SFX must remain clearly audible on a phone speaker.
- Use a quiet room tone rather than a continuous music bed.
- The three-note mnemonic may be the only overtly musical phrase.
- Keep reverb tails short enough for a clean cut back to the lesson.

Required audio exports:

1. final mixed master;
2. isolated SFX stem;
3. isolated three-note brand mnemonic stem;
4. clean video without audio.

## 7. Film 1 storyboard — belief change

**Duration:** 9.5 seconds

| Time | Picture | Sound |
|---|---|---|
| 0.00–0.20 | Hard editorial cut from lesson to empty ivory studio | Short, deep air-pressure release |
| 0.20–1.10 | Golden lens rolls in from the left with physical weight | Spatial metallic roll, tiny rim contacts, deceleration |
| 0.75–2.00 | Lens optically reveals `А что, если язык` | Glass reveal plus separate magnetic text lock |
| 2.00–3.35 | Lens reveals `не нужно заучивать?` | Air movement, text lock, tiny glass accent on `?` |
| 3.35–3.95 | Deliberate still pause; lens rotates edge-on | Quiet metallic tension cue |
| 3.95–5.15 | Lens turns face-on and presses a minimal gold control; one response wave appears; second statement is revealed | Tactile press, low physical response, bright harmonic on `пользоваться` |
| 5.15–9.50 | Lens docks beside official logo, real QR, and CTA | Magnetic lock and full three-note mnemonic |

The QR must remain perfectly still and readable for at least the final 3.5
seconds.

## 8. Film 2 storyboard — gamification

**Duration:** 9.5 seconds

| Time | Picture | Sound |
|---|---|---|
| 0.00–0.20 | Hard cut to ivory studio | Clean air gate |
| 0.20–1.20 | Golden lens lands on a minimal graphite-and-gold path and becomes a premium game token | Deep soft landing plus precise glass tick |
| 1.20–3.20 | Token travels through three checkpoints; each depresses, illuminates, and releases once | Movement trace plus distinct contact, illumination, and release cues |
| 1.20–3.20 | Checkpoint sequence reveals `Практика становится игрой.` | Three controlled typographic locks forming one rhythm |
| 3.20–4.80 | Path curves back to its start; token returns and fits perfectly | Stereo-followed movement and the film's most satisfying magnetic lock |
| 3.20–4.80 | Return reveals `Поэтому к языку / хочется возвращаться.` | Warm harmonic resolution |
| 4.80–9.50 | Path simplifies into a gold line leading to logo, QR, and CTA | Three-note mnemonic, then clean hold |

The game metaphor stays sophisticated. Do not show scores, coins, trophies,
stars, confetti, cartoon buttons, or arcade lighting.

## 9. Film 3 storyboard — action and product

**Duration:** 10.5 seconds

| Time | Picture | Sound |
|---|---|---|
| 0.00–0.20 | Hard cut to ivory studio | Firm air displacement |
| 0.20–1.50 | Reveal `Не учи язык.` | Low confident tonal impact plus text lock |
| 1.50–2.80 | First line moves upward; larger `Используй его.` enters | Audible upward movement and strongest glass/metal impact of the trilogy |
| 2.80–3.80 | Reveal `Каждый день. / В своём темпе.` | Separate soft entrance and landing for each line |
| 3.80–5.40 | First lens, second lens, bridge, and moustache arrive and assemble into the official Phraseman icon | Individual spatial movements and contacts; first two mnemonic notes |
| 5.40–6.80 | Completed icon lands on an authentic current Phraseman screen or neutral device presentation; show one meaningful interaction | Product landing and one tactile interaction response |
| 6.80–10.50 | Product shifts left; logo, real QR, and CTA appear right | Final mnemonic note, QR lock, short clean tail |

The authentic UI capture must come from the current application. Do not
generate fictional controls, metrics, lessons, or screens.

## 10. QR requirements

- Source the QR from the canonical Phraseman smart-link page used by the
  existing website.
- Verify the QR before production on both iOS and Android.
- Confirm that it resolves to the correct platform-specific store destination.
- Use the original raster or vector asset, not a screenshot if a clean source
  exists.
- Preserve the complete quiet zone.
- Minimum size at 4K: 560 × 560 px.
- Do not place reflections, transparency, animation, or texture over the code.
- Keep it still for at least 3.5 seconds.
- Test scanning from a 1080p downscaled export displayed on a normal laptop and
  television.

## 11. Master Motion prompt

```text
Create a premium full-frame product motion graphic for Phraseman, a gamified language-learning app.

FORMAT
3840x2160, 16:9, 30 fps. Warm ivory studio background #F7F6F2. Graphite typography #17151D. Use Inter font only. Use metallic gold sampled from the supplied official Phraseman app icon.

BRAND OBJECT
Use one circular golden eyeglass lens extracted from the official Phraseman icon as the recurring hero object. Preserve the original icon design and materials. Do not redesign the logo. The lens must feel like a precision-made physical product: polished gold rim, warm optical glass, controlled reflections, subtle weight and inertia.

VISUAL STYLE
Premium product-launch motion design: minimal, tactile, cinematic, precise and restrained. Soft large-area studio lighting, realistic glass and metal, gentle contact shadows, clean negative space, editorial composition. One primary action at a time. Every movement must communicate meaning.

Do not imitate Apple logos, Apple devices, Dynamic Island, SF Pro, or Apple product UI. Capture only the qualities of precision, restraint, material realism and product focus.

TYPOGRAPHY
Render all supplied Russian text exactly as written. Preserve Cyrillic characters, punctuation and manual line breaks. Never paraphrase, translate, invent or deform text. Text must remain sharp and readable. Do not animate individual letters randomly. Use block-level reveals, optical masking, physical settling and meaningful transforms. No typewriter animation.

MOTION
Use physically believable easing: confident acceleration, soft deceleration, precise magnetic settling. Avoid elastic bouncing, overshoot, floating without weight, continuous rotation and gratuitous camera movement.

QR
Use the supplied real QR asset exactly. Never generate or modify the QR pattern. Preserve its white quiet zone. Show it at no less than 560x560 pixels in the 4K composition. Once settled, keep it perfectly still, sharp and unobstructed for at least 3.5 seconds. No glow, distortion, refraction or motion blur over the QR.

SOUND
Every visible change must have a clearly audible synchronized sound. If a motion does not deserve a sound, remove the motion.

Use a coherent sonic material family:
1. controlled air displacement for movement,
2. premium magnetic or felt-covered mechanical clicks for contact and settling,
3. tempered glass harmonics for important words and visual transformations,
4. a warm ascending three-note Phraseman mnemonic for the logo and QR lockup.

Follow object movement in the stereo field. Use distinct attack and landing sounds. Keep the space quiet enough for every detail to be heard. No generic whooshes, keyboard typing, beeps, coins, casino sounds, cartoon effects, EDM risers, trailer booms or long reverb tails.

END CARD
Show the official Phraseman logo, supplied QR code and exact CTA:
“Сканируй, чтобы попробовать”

Export:
1. final master with synchronized sound,
2. clean video without sound,
3. isolated SFX stem,
4. isolated three-note brand mnemonic stem.
```

## 12. Film-specific Motion prompts

### Film 1

```text
Apply the Phraseman Master Prompt.

Create a 9.5-second standalone motion graphic.

EXACT TEXT:
А что, если язык
не нужно заучивать?

Им можно просто пользоваться.

TIMELINE

0.00–0.20
Hard editorial cut from the preceding lesson into an empty warm-ivory studio. No fade. Accompany the cut with a short, deep air-pressure release.

0.20–1.10
The single official golden Phraseman lens rolls into frame from the left. Show realistic weight, rim rotation, glass reflections and a soft moving shadow. Synchronize the roll, small rim contacts and final deceleration with noticeable tactile sound.

0.75–2.00
As the lens passes across the empty space, it optically reveals:
“А что, если язык”
The text appears as a complete typographic block through the lens, then remains sharp outside it. Use a refined glass-reveal sound and a separate magnetic settling click.

2.00–3.35
The lens moves down and reveals:
“не нужно заучивать?”
Give the question mark its own tiny glass accent when it becomes visible. Hold the complete question long enough to read.

3.35–3.95
A brief deliberate pause. The lens rotates edge-on with a quiet metallic tension sound. No other movement.

3.95–5.15
The lens turns face-on and gently presses a minimal circular gold control embedded in the white surface. The surface responds with one controlled concentric wave. At the same moment reveal:
“Им можно просто пользоваться.”
Emphasize the idea through scale and timing, not coloured text. Use a warm tactile press, a low physical response and a bright glass harmonic on the final word.

5.15–9.50
The lens travels to the end-card area and docks with a precise magnetic lock. Reveal the official Phraseman logo, real QR asset and CTA:
“Сканируй, чтобы попробовать”
Use the full three-note Phraseman mnemonic. Keep the QR perfectly still and readable until the final frame.

The result must feel like a surprising product thought, not a motivational quote and not a school advertisement.
```

### Film 2

```text
Apply the Phraseman Master Prompt.

Create a 9.5-second standalone motion graphic.

EXACT TEXT:
Практика становится игрой.

Поэтому к языку
хочется возвращаться.

TIMELINE

0.00–0.20
Hard cut into the warm-ivory studio with a clean air gate.

0.20–1.20
The golden Phraseman lens drops gently onto a minimal graphite-and-gold path, becoming a premium game token. The contact must feel physical and satisfying. Use a deep soft landing plus a precise glass tick.

1.20–3.20
The token travels through three carefully spaced checkpoints. Each checkpoint reacts once: depression, illumination, magnetic release. Every movement, contact, illumination and release receives its own synchronized tactile sound. The sounds together must form a controlled rhythm, not random UI noise.

As the checkpoints activate, reveal the complete first sentence:
“Практика становится игрой.”

3.20–4.80
The path curves back toward its starting point. The moving sound follows the token in stereo. As the token returns and fits perfectly into its original position, reveal:
“Поэтому к языку
хочется возвращаться.”

The return must be the visual proof of the sentence. Use the most satisfying magnetic lock sound in this video, followed by a warm harmonic resolution.

4.80–9.50
The path simplifies into a thin gold line leading toward the official Phraseman logo and real QR code. Reveal:
“Сканируй, чтобы попробовать”
Play the recognisable three-note Phraseman mnemonic. Hold all end-card elements still and readable.

Keep the game language sophisticated: no scores, coins, trophies, cartoon buttons, confetti, neon arcade visuals or childish bouncing.
```

### Film 3

```text
Apply the Phraseman Master Prompt.

Create a 10.5-second standalone motion graphic and the strongest product reveal of the series.

EXACT TEXT:
Не учи язык.
Используй его.

Каждый день.
В своём темпе.

TIMELINE

0.00–0.20
Hard cut into the warm-ivory studio with a firm, clean air displacement.

0.20–1.50
Reveal:
“Не учи язык.”
Use a restrained optical mask and a low, confident tonal impact. Let the text settle with a separate tactile lock.

1.50–2.80
The first line moves upward with audible physical motion. Reveal the larger statement:
“Используй его.”
Accompany the entrance with the strongest glass-and-metal impact of the three-film series, powerful but not aggressive.

2.80–3.80
Reveal:
“Каждый день.
В своём темпе.”
Each line receives its own soft entrance and precise settling cue.

3.80–5.40
The single golden lens enters. A second matching lens, bridge and moustache arrive from separate directions. Every component has an individual spatial movement sound and contact sound. Assemble them with exact mechanical precision into the official Phraseman icon. Finish the assembly with the first two notes of the brand mnemonic.

5.40–6.80
The completed icon lands on a supplied real Phraseman app screen or supplied neutral device mockup. Use only authentic Phraseman UI assets; never invent screens or fake interface elements. Show one short, meaningful product interaction with a clear tactile sound response.

6.80–10.50
Move the product to the left and reveal the real QR code on the right with:
Phraseman
“Сканируй, чтобы попробовать”

Complete the three-note mnemonic on the QR lock. Keep the product and QR still for the remainder of the video. End with a clean, short sound tail suitable for cutting directly back into the lesson.
```

## 13. Global negative prompt

```text
No generic template motion.
No typewriter effect.
No random letter animation.
No excessive floating.
No elastic bounce.
No childish game UI.
No coins, stars, trophies or confetti.
No neon cyberpunk.
No blue technology gradients.
No fake app screens.
No invented Cyrillic text.
No altered QR code.
No white text on bright green or gold surfaces.
No generic stock whooshes.
No keyboard sounds.
No arcade beeps.
No casino or reward-machine sounds.
No cartoon pops.
No trailer booms.
No continuous background music masking the sound effects.
No Apple logos, Apple UI or direct recreation of an Apple advertisement.
```

## 14. Production assets

Required before final rendering:

1. official app icon from `assets/images/icon.png`;
2. official Phraseman wordmark or a deterministic Inter wordmark treatment;
3. canonical smart-link QR asset from the website;
4. verified iOS and Android smart-link behaviour;
5. one authentic current Phraseman screen recording or still for Film 3;
6. Inter Regular, SemiBold, and Bold font files;
7. custom SFX source recordings or synthesis matching the sonic identity.

## 15. Deliverables

For each of the three films:

- 4K 16:9 final master with sound;
- 4K 16:9 clean video;
- 1080p 16:9 delivery copy;
- isolated SFX stem;
- isolated brand-mnemonic stem;
- poster frame;
- timing sheet with frame-accurate cue names.

The 9:16 adaptation is a separate crop/re-layout pass, not an automatic crop of
the 16:9 master.

## 16. Acceptance criteria

### Independence

- A viewer understands each film without prior campaign context.
- No sentence begins or ends as a continuation of another film.

### Copy

- Copy matches Section 3 exactly.
- No prohibited word or invented claim appears.
- Text is readable at normal YouTube viewing distance.

### Visual quality

- The golden lens clearly derives from the official icon.
- Materials feel physical and premium.
- Motion has no arbitrary decorative events.
- All bright gold surfaces use dark foregrounds where text is present.
- Film 3 uses authentic product UI only.

### Sound

- Every visible change has a frame-synchronised audible event.
- All cues belong to the same four sound-material families.
- The mix remains clear on phone, laptop, and television speakers.
- No stock-template, arcade, keyboard, casino, or cartoon sound is audible.
- The three-note mnemonic is recognisable across all films.

### QR and conversion

- QR scans from the final 1080p export.
- QR resolves correctly on both iOS and Android.
- QR remains static for at least 3.5 seconds.
- CTA is visible and legible.

### Series coherence

- The same lens material, typography, lighting, easing, end card, and mnemonic
  are used throughout.
- Repeated elements feel like identity, while each film has a distinct visual
  mechanism.
