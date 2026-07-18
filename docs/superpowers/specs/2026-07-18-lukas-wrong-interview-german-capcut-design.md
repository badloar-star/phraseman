# Lukas Wrong Interview German CapCut Design

## Mission

Create a completely independent German–Russian learning video from the native
CapCut project `АННА ПОЕЗД-copy`. Preserve the proven 24-minute teaching
structure, timing language, visual hierarchy, animations, and sound-design
rhythm, while replacing the English story with an original A1–A2 German story:
Lukas enters the wrong job interview in Berlin and unexpectedly receives a job
offer from a language school.

The English project remains untouched. Production happens in a separately named
native CapCut copy and in a separate source-package directory.

## Story contract

Working hook:

> Он пришёл не на то собеседование — и получил работу

Lukas is looking for a Berlin travel agency where he has a job interview. He
leaves the lift on the wrong floor and enters a language school. The
administrator assumes that he is the school's candidate. Lukas finds the
questions unusual but answers politely. During the interview, a printer fails,
a teacher urgently needs lesson materials, and a new student needs help. Lukas
calmly solves the practical problems.

At the end of the interview, Lukas discovers that the travel agency is one floor
below. The misunderstanding becomes a warm comic reveal. The language-school
director is impressed and offers Lukas a trial day as an administrator. The
story ends on his successful first real workday.

The story contains exactly 49 distinct German sentences, 49 natural Russian
translations, and 49 German IPA transcriptions. Sentences must be short,
sequential, narratively meaningful, and suitable for A1–A2 learners. German
compound words that cannot fit safely in the existing text geometry must be
avoided or the sentence must be rephrased.

## Teaching sequence

The native timeline keeps the current four-part structure:

1. Russian intro, approximately 31.8 seconds.
2. One uninterrupted German listening pass, approximately 116.9 seconds.
3. Slow guided pass over all 49 phrases:
   - German text;
   - German IPA;
   - Russian translation;
   - female German teacher voice;
   - Russian `RusTeacher` voice;
   - male German teacher voice.
4. Faster consolidation pass over all 49 phrases:
   - German text;
   - German IPA;
   - Russian translation remains visible;
   - female and male German voices;
   - no Russian translation audio.

The existing section cards, counters, text hierarchy, progress treatment,
background composition, CTA timing, and phrase-slot starts remain structurally
unchanged.

## Voice design

### Male German teacher

Use the ElevenLabs default Liam voice
`TX3LPaxmHKxFdv7VOQHJ` as the source for Voice Remix. Do not clone Liam from
downloaded samples. The remix prompt must request a distinct new voice with:

- native Standard German pronunciation;
- warm, attractive, calm male tone;
- age impression around 30–40;
- confident but friendly teacher delivery;
- clear consonants and natural vowels;
- measured pace suitable for beginners;
- no American accent, sales energy, theatricality, or exaggerated pauses;
- consistent volume and close studio sound.

Create preview candidates first. Do not save a permanent remixed voice until a
preview has been selected.

### Female German teacher

Use ElevenLabs Voice Design to create preview candidates from a detailed prompt:

- native Standard German;
- warm, elegant, pleasant female voice;
- age impression around 25–35;
- patient and encouraging language teacher;
- clear articulation without sounding slow or robotic;
- gentle smile in the tone;
- distinct from the male voice;
- clean studio recording with stable loudness.

Do not save a permanent designed voice until a preview has been selected.

### Russian voice

Search the authenticated ElevenLabs workspace for the user-owned voice named
`RusTeacher`, including pagination and possible spacing/case variations. Use it
for Russian phrase translations and the Russian intro. If no unique match is
found, stop before generating paid Russian audio and request the exact voice ID.

All voice previews and final audio receive a manifest containing voice ID,
model, settings, text hash, duration, and output path. API keys never appear in
logs, manifests, prompts, or CapCut files.

## Intro replacement

Rebuild the intro as a German-course intro with the same timing and sound-design
rhythm. Replace:

- references to English with German;
- the Russian narrator recording;
- the “Как устроено видео” instructional card text;
- the story-specific illustration, character cutout, short video insert, and
  first polaroid;
- story-specific sound effects when their semantic meaning no longer fits.

Keep the sequence of text reveals, typing clicks, whooshes, transition energy,
final “Приятного просмотра!” beat, and overall duration unless a generated voice
requires a small verified timing adjustment.

Russian text in raster instructional graphics must be rendered
deterministically with Cyrillic-capable fonts. It must not be generated as text
inside an AI image.

## Visual system and 15-scene map

Create a new character/style bible before generating images. Lukas must keep the
same face, hair, age, clothes, and proportions across every scene. The language
school, office props, weather, and Berlin visual cues must also remain
consistent.

The 49 phrases map to 15 cinematic polaroid scenes:

1. Lukas prepares for an important morning in Berlin.
2. He searches for the correct office building.
3. He exits on the wrong floor.
4. The unexpected interview begins.
5. The questions feel increasingly strange.
6. The office printer fails.
7. Lukas diagnoses and fixes the problem.
8. A new student also needs assistance.
9. The lesson materials are successfully prepared.
10. Lukas discovers he is in the wrong company.
11. The room reacts with warm laughter.
12. The director offers him a trial day.
13. Lukas shares the surprising news.
14. He arrives for his real first day.
15. Lukas confidently works at the language-school reception.

Use Codex built-in image generation only, never a project-supplied OpenAI API
key. Generate no more than 15 final story images. Raw generations and reference
assets stay outside the CapCut project; only compressed final WebP files enter
the source package. Produce a phrase-to-image manifest and a contact sheet
before timeline installation.

## Text fitting

German, Russian, IPA, intro, transition, and CTA text must never rely on CapCut
automatic wrapping. Manual line breaks may occur only at spaces or clear phrase
boundaries. No word may be divided.

The builder must measure glyph width with the actual font used by the target
slot. If a line does not fit, it must reflow at a word boundary. If a single word
still cannot fit, the content must be rephrased or, only as a last resort,
receive a narrowly bounded per-material font-size adjustment. The builder must
fail rather than write an overflowing or mid-word-wrapped result.

## Native CapCut safety

All preparation—story, IPA, manifests, voice previews, audio, intro assets,
polaroids, and dry-run validation—may happen while CapCut is open.

Before copying or changing native draft files:

1. close CapCut normally and wait for autosave;
2. confirm no CapCut process remains;
3. verify the four native timeline mirrors are byte-identical;
4. create a timestamped backup;
5. create a separately named German project copy;
6. modify only the German copy;
7. mirror changes across root and `Timelines/<draft-id>` draft files;
8. run structural, path, text, audio, duration, and mirror gates;
9. reopen only after all gates pass.

The existing English project, its source package, texts, audio, images, and
timings must not be altered.

## Acceptance criteria

- Separate German CapCut project exists; English source remains unchanged.
- Exactly 49 German, Russian, and IPA lines pass content and order checks.
- Exactly 15 final polaroids cover all 49 phrases with an explicit map.
- Character and location continuity pass contact-sheet review.
- Intro contains no remaining English-course or Anna/train references.
- Female German, Russian, and male German audio occupy the correct slow-pass
  slots; only German voices occupy the consolidation pass.
- Audio starts stay aligned to template starts and are never time-compressed.
- Every media path resolves.
- No visible text contains mojibake, replacement characters, literal question
  marks caused by encoding loss, automatic mid-word wraps, or overflow.
- All native draft mirrors match byte-for-byte after installation.
- A final visual and listening pass confirms the first frame, intro transitions,
  all phrase roles, section transitions, polaroid changes, CTA, and ending.
