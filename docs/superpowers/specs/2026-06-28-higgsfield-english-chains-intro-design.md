# Higgsfield Premium Motion Intro Design

## Goal

Create a 37.64-second premium 3D motion-design intro for the English chains lesson using the supplied voiceover:

`C:\Users\badlo\Downloads\ElevenLabs_2026-06-28T09_48_53_Loardar_pvc_sp100_s50_sb75_v3.mp3`

The screen text must follow the Russian voiceover text, not short replacement slogans. It should behave like cinematic advertising typography: varied scale, perspective, vertical and horizontal movement, physical placement in 3D scenes, voice-synced motion, and sound design hits.

## Production Rule

Use Higgsfield for cinematic 3D video plates and premium motion atmosphere. Do not rely on the video model to render final Russian text inside the generated footage. Russian text should be added as exact kinetic typography in the edit layer, using a Cyrillic-capable font and synchronized to the voiceover.

Reason: generated video models can create beautiful motion but are unreliable for exact Cyrillic text. The premium result comes from combining Higgsfield 3D plates with controlled typography, voiceover, and SFX.

## Model Choice

Primary Higgsfield model: Veo 3.1 or Kling 3.0.

- Veo 3.1 direction: polished cinematic realism, premium camera movement, atmospheric depth.
- Kling 3.0 direction: dynamic multi-shot motion, more aggressive spatial movement.

Use Seedance 2.0 only for fast alternatives or extra abstract background variants.

## Higgsfield Clip Split Plan

Do not generate the full 37.64-second intro as one Higgsfield clip. Generate several short plates and assemble them under the master voiceover. This avoids model drift, duration limits, and weak later-frame quality.

Working split:

1. `plate_01_noise_to_you` — 0.00-10.99 seconds, generate as 10-12 seconds.
   - Covers the hook: long English sentences, stream of words, "this lesson is for you".
   - Visual purpose: overwhelm → control.
   - Edit handle: start at 0.00, allow trimming after 10.70 if needed.

2. `plate_02_chain_build` — 10.70-19.40 seconds, generate as 9-10 seconds.
   - Covers "short phrase grows step by step, word by word".
   - Visual purpose: the hero growth sequence.
   - Edit handle: overlap 0.30 seconds with plate 01 and 0.30 seconds with plate 03.

3. `plate_03_clarity_and_recall` — 19.10-30.81 seconds, generate as 11-12 seconds.
   - Covers brain adapts, long phrases become clearer, recall attempt, correct answer.
   - Visual purpose: clarity network → missing slots → correct-answer impulse.
   - Edit handle: overlap 0.30 seconds with plate 02 and 0.30 seconds with plate 04.

4. `plate_04_repeat_and_start` — 30.50-37.64 seconds, generate as 7-8 seconds.
   - Covers listen/repeat aloud/effect stronger/final "Начинаем."
   - Visual purpose: voice ripple → stronger effect → final transition.
   - Edit handle: end cleanly after the final camera pass-through.

Recommended generation workflow:

- Generate each plate without final readable text.
- Keep the same style words in every prompt: obsidian language engine, glass, metal, volumetric light, green Phraseman accent.
- Use the same aspect ratio and style reference settings for all plates.
- If Higgsfield supports seed/style reference, use plate 01 as the style anchor for the other plates.
- Export plates with extra motion at the beginning/end so the edit can trim on voice pauses.
- Add exact Russian text, voiceover, and SFX in the edit after the Higgsfield plates are approved.

Aspect ratio decision:

- Use `16:9` if this is a YouTube lesson/opening sequence.
- Use `9:16` if this is for Shorts/Reels/TikTok.
- If unsure, generate the master in `16:9` first because the concept is cinematic and text architecture benefits from horizontal depth. A vertical version can be adapted afterward by placing text architecture along depth and vertical glass walls.

## Visual World

The intro takes place inside a dark premium 3D language engine:

- obsidian-black space, not flat black;
- glass, metal, acrylic, soft volumetric light;
- green Phraseman accent as signal/control/progress;
- abstract English speech stream as particles, light trails, blurred letter-like fragments;
- no readable English text baked into Higgsfield footage;
- Russian kinetic typography lives in the scene as 3D title objects, projected text, engraved glass, floating slabs, rails, and chain-linked word structures.

Avoid:

- flat 2D cards;
- dashboards, charts, tables, classroom graphics;
- cheap glow-only typography;
- generic AI sci-fi clutter;
- generated unreadable text;
- subtitles at the bottom.

## Text System

The on-screen text follows the voiceover in meaning and wording. It can be split into readable fragments, but it must not be replaced with unrelated slogans.

Recommended font families:

- Onest
- Manrope
- Golos Text / Golos Display
- Geologica

Typography behavior:

- large words near camera for emphasis;
- medium clauses embedded into architecture;
- vertical phrases on glass walls;
- horizontal phrases riding along light rails;
- words that lock into chain links;
- missing slots during recall moment;
- green impulse for correct answer and final "Начинаем."

## Master Timeline

Audio duration: 37.64 seconds.

### 0.00-4.41

Voiceover:
"Если длинные английские предложения звучат для вас как"

Higgsfield plate:
Fast camera push through a dense dark stream of abstract spoken English. Thousands of particles and soft letter-like fragments fly past the camera, not readable. The mood is overwhelming but premium.

Screen text:
"Если длинные английские предложения"
"звучат для вас как"

Motion:
First line appears huge in perspective, stretching into depth like a cinematic title in a tunnel. Second line slides vertically from a side glass wall, then locks near the first.

SFX:
Low sub hit at the first appearance. Fast airy speech-rush texture underneath.

Higgsfield prompt:
Ultra-premium cinematic 3D intro, dark obsidian language engine, fast camera push through abstract streams of spoken English represented by luminous particles and blurred letter-like fragments, volumetric light, glass and metal depth, green accent glow, IMAX advertising title-sequence mood, no readable text, no captions, no logos, no watermark.

### 4.68-6.36

Voiceover:
"сплошной поток слов — этот урок как раз для вас."

Higgsfield plate:
The speech stream becomes a storm, then suddenly slows. The camera finds a quiet center inside the chaos.

Screen text:
"сплошной поток слов"
"этот урок как раз для вас"

Motion:
"сплошной поток слов" is pulled by the storm, slightly warped by speed. "этот урок как раз для вас" lands clean and stable close to camera.

SFX:
Rushing whoosh into sudden silence; soft confirmation hit.

Higgsfield prompt:
Premium cinematic transition from chaotic luminous speech storm into a calm center, dark glass environment, particles slowing in midair, soft green control light, high-end commercial motion design, camera deceleration, no readable text, no subtitles, no logo.

### 6.64-10.99

Voiceover:
"Сегодня мы будем разбирать английский не по отдельным словам, а цепочками."

Higgsfield plate:
Floating glass word-block spaces appear separately. They are scattered at different depths. On "цепочками", the structure begins to connect.

Screen text:
"Сегодня мы будем разбирать английский"
"не по отдельным словам"
"а цепочками"

Motion:
First line travels horizontally on a light rail. "не по отдельным словам" breaks into separated blocks, placed vertically at different distances. "а цепочками" forms as a single horizontal chain that snaps together from left to right.

SFX:
Subtle rail movement, then three or four metallic/glass click-locks.

Higgsfield prompt:
Dark premium 3D studio with floating transparent glass modules, separate blocks suspended at different depths, luminous rails, pieces begin connecting into chain-like structure, smooth cinematic orbit camera, green light accents, luxury product-commercial feel, no readable text, no captions, no UI, no logo.

### 11.31-19.06

Voiceover:
"Короткая фраза будет постепенно расти: шаг за шагом, слово за словом, пока не превратится в полноценное разговорное предложение."

Higgsfield plate:
The main build sequence. A tiny glowing phrase seed appears, then the camera follows it as it grows into a long 3D sentence bridge made of connected text spaces and chain segments.

Screen text:
"Короткая фраза"
"будет постепенно расти"
"шаг за шагом"
"слово за словом"
"пока не превратится"
"в полноценное разговорное предложение"

Motion:
"Короткая фраза" starts small in the center. "будет постепенно расти" expands outward with scale and depth. "шаг за шагом" appears as rising 3D steps. "слово за словом" builds left to right as a chain. The final phrase is revealed by camera pullback across a long bridge-like text structure.

SFX:
Each word-lock gets a precise click. Add one larger cinematic hit when the full conversational sentence appears.

Higgsfield prompt:
Premium 3D kinetic title-sequence environment, a small luminous seed grows into a long elegant chain bridge, transparent acrylic, brushed metal, volumetric green highlights, camera flies along the growing structure, macro depth of field, high-end advertising motion design, no readable text, no captions, no logos.

### 19.41-24.76

Voiceover:
"Так мозг легче привыкает к английской речи, а длинные фразы начинают звучать понятнее."

Higgsfield plate:
The chain becomes a network of light routes, like a night city map or neural pathways, but abstract and cinematic rather than medical.

Screen text:
"Так мозг легче привыкает"
"к английской речи"
"а длинные фразы"
"начинают звучать понятнее"

Motion:
Text follows curved paths in space. "длинные фразы" appears heavy and large, slightly blurred at first. "звучать понятнее" sharpens into clean focus as the surrounding noise clears.

SFX:
Soft pulse, clarity shimmer, reduced background noise.

Higgsfield prompt:
Abstract premium 3D network of luminous language chains turning into elegant light routes, dark glass environment, night-city-map feeling without literal city, neural pathway inspiration without medical imagery, particles clearing into focus, green signal pulse, cinematic camera pullback, no readable text, no captions, no UI, no logo.

### 25.09-30.81

Voiceover:
"После каждой цепочки будет короткая попытка вспомнить продолжение, а затем сразу правильный ответ."

Higgsfield plate:
Half of the chain goes dark. Empty glowing slots remain. A pause creates tension. Then the missing parts return with a green confirmation impulse.

Screen text:
"После каждой цепочки"
"будет короткая попытка"
"вспомнить продолжение"
"а затем сразу"
"правильный ответ"

Motion:
First three lines appear as partial chain labels; some text spaces go empty on "вспомнить продолжение". "правильный ответ" arrives sharply and fills the missing slots.

SFX:
Silence dip, heartbeat-like low pulse, then clean correct-answer hit.

Higgsfield prompt:
Cinematic dark 3D chain structure with sections fading out, empty luminous slots suspended in space, tense pause, then green signal wave restores the missing chain pieces, premium glass and metal, dramatic camera hold then snap movement, no readable text, no captions, no logos.

### 31.13-36.34

Voiceover:
"Можно просто слушать, но если будете повторять вслух — эффект будет намного сильнее."

Higgsfield plate:
The environment becomes warmer and more human. The chain reacts to voice waves. A physical sound ripple passes through the space.

Screen text:
"Можно просто слушать"
"но если будете повторять вслух"
"эффект будет намного сильнее"

Motion:
"слушать" is calm and smaller, placed off-center. "повторять вслух" moves closer to camera and bends the air around it with 3D sound ripples. "эффект будет намного сильнее" arrives as a confident final build.

SFX:
Air ripple, voice-reactive pulse, stronger final rise.

Higgsfield prompt:
Premium cinematic 3D sound-wave environment, dark glass studio warming slightly, visible volumetric voice ripples passing through elegant chain structures, green acoustic pulse, camera glides around the wave, high-end commercial title-sequence style, no readable text, no captions, no logos.

### 36.71-37.64

Voiceover:
"Начинаем."

Higgsfield plate:
All elements converge into one clean final passage. Camera flies through the chain into black or into the first lesson frame.

Screen text:
"Начинаем."

Motion:
Huge single 3D word. It appears at center, lit from inside, then the camera passes through it.

SFX:
Final sub hit, short clean whoosh, cut to lesson.

Higgsfield prompt:
Final premium cinematic 3D transition, all luminous chain elements converge into one clean central passage, strong green impulse travels forward, camera flies through the structure into darkness, luxury language-learning intro ending, no readable text, no captions, no logo, no watermark.

## Assembly Notes

1. Generate Higgsfield clips without baked text.
2. Use the supplied MP3 as the master timing track.
3. Add Russian kinetic typography as exact text layers, not generated text.
4. Use short readable fragments, but preserve the voiceover wording.
5. Sync text entrance to the spoken phrase onset and exit to the next phrase.
6. Add SFX beneath the voice with ducking:
   - voice remains primary;
   - music/SFX should dip under speech;
   - clicks and hits should land between syllables when possible.
7. Final render should feel like premium cinema advertising, not an educational slide.

## Higgsfield Prompt Template

Use this suffix on every Higgsfield prompt:

`no readable text, no captions, no subtitles, no logos, no watermark, no UI, no flat 2D graphics, no classroom, no charts, no tables, premium cinematic 3D motion design, volumetric light, dark glass and metal materials, green accent signal`

## Acceptance Criteria

- The intro is synchronized to the provided 37.64-second voiceover.
- On-screen Russian text follows the actual voiceover wording.
- Text is dynamic: multiple scales, directions, depths, rotations, and spatial placements.
- The piece has premium 3D motion design, not 2D infographic style.
- Higgsfield footage contains no broken generated Cyrillic.
- Final Russian text is perfectly readable and Cyrillic-safe.
- Voiceover remains clear over all music and SFX.
