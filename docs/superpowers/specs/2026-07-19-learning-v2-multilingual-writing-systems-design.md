# Learning V2 Multilingual and Writing Systems Design

**Status:** owner-approved design; documentation only; implementation is not authorised
**Date:** 2026-07-19
**Scope:** Learning V2 runtime, Admin V2 Content Studio, content generation, app presentation and future language expansion

## 1. Owner decision

Phraseman Learning V2 must be designed from the beginning for broad multilingual
expansion. It must not assume Latin letters, whitespace-delimited words,
left-to-right layout, one character per sound, one reading per symbol, or one
writing system per language.

The first fully specified special writing-system packs are:

- Simplified and Traditional Chinese;
- Japanese.

The architecture must also support later packs for Korean, Arabic, Hebrew,
Devanagari-based languages, Thai, Greek, Cyrillic-based languages and other
Unicode writing systems without rewriting the learning core or Admin V2.

This decision does not authorise implementation, generation, deployment or
production release.

## 2. Product model

Every course is identified by a language pair, not by one locale:

```text
learnerSourceLocale + studyTarget + targetLocaleVariant
```

Examples:

- `ru-RU → en-US`;
- `en-US → ja-JP`;
- `ru-RU → zh-Hans-CN`;
- `en-GB → zh-Hant-TW`;
- `en-US → ar-SA`.

The same study target may require different explanations, sound contrasts,
romanization policy and error models for different learner source locales.

## 3. Stable architecture

```text
V2LanguageProfile
  ├─ locale pair and variants
  ├─ scripts and writing direction
  ├─ segmentation and normalization
  ├─ pronunciation/romanization systems
  ├─ typography and font coverage
  ├─ supported learning capabilities
  └─ exact ScriptProfile refs

ScriptProfile
  ├─ script kind and Unicode ranges
  ├─ grapheme inventory and components
  ├─ readings, sounds and meanings
  ├─ shaping, joining and direction
  ├─ line breaking and vertical-text policy
  ├─ stroke/component data when applicable
  └─ accessibility and fallback rules

ScriptCurriculum
  ├─ sections and progression graph
  ├─ ScriptActivityKind nodes
  ├─ review and mastery policy
  ├─ links into the conversational curriculum
  └─ immutable content/provenance refs
```

`ScriptCurriculum` is a typed Learning V2 subsystem. It is not silently added as
an eighteenth `V2ActivityFamily`, and script activities must not be disguised as
ordinary choice or pronunciation evidence. A later contract task must define
the exact graph union and evidence boundary while preserving the existing
17-family pilot contract.

## 4. Writing-system taxonomy

The code-owned profile catalog supports at least:

- `alphabet`;
- `abjad`;
- `abugida`;
- `syllabary`;
- `logographic`;
- `mixed`;
- `featural`;
- `other_versioned`.

A language may reference more than one profile. Japanese, for example, combines
hiragana, katakana, kanji, Latin characters and Arabic numerals. Chinese may
ship Simplified and Traditional variants with different regional pronunciation
and annotation policies.

All text handling uses Unicode grapheme clusters. Validation must not use string
length, code-point count, naive lowercase conversion or whitespace splitting as
language-independent truth.

## 5. Script learning modes

The initial code-owned `ScriptActivityKind` catalog must be versioned and include:

1. `symbol_introduction`;
2. `symbol_recognition`;
3. `symbol_sound_mapping`;
4. `symbol_meaning_mapping`;
5. `component_decomposition`;
6. `component_composition`;
7. `visually_confusable_contrast`;
8. `guided_stroke_order`;
9. `stroke_order_recall`;
10. `reading_selection`;
11. `reading_production`;
12. `typing_ime_practice`;
13. `script_dictation`;
14. `contextual_reading`;
15. `script_personal_review`.

Each kind declares what it actually measures. Tracing a glyph is not proof of
free handwriting; selecting pinyin is not proof of tone production; typing an
IME result is not proof that the learner can handwrite the character.

## 6. Chinese pack

Chinese receives dedicated sections for:

- pinyin initials, finals, tones and tone changes;
- optional Bopomofo profile where regionally appropriate;
- hanzi recognition and meaning;
- radicals/components and semantic/phonetic composition;
- stroke order and stroke-count awareness;
- visually confusable characters;
- Simplified/Traditional mapping without treating either as a cosmetic font;
- single-character and multi-character word segmentation;
- contextual reading without mandatory permanent romanization;
- handwriting/IME routes with distinct evidence;
- region-specific pronunciation, vocabulary and typography.

The generator must create provenance-bound character inventories, component
graphs, readings, meanings, graded examples, confusable sets, stroke data,
review schedules and QA receipts. It may not invent stroke order or character
etymology without an approved data source.

## 7. Japanese pack

Japanese receives dedicated sections for:

- hiragana recognition, reading and writing;
- katakana recognition, reading and writing;
- dakuten, handakuten, small kana, contractions and long vowels;
- kanji components, radicals and stroke order;
- on/kun and context-dependent readings;
- okurigana and common orthographic variants;
- furigana display and fade policy;
- counters, pitch/accent metadata where supported, and regional constraints;
- visually confusable kana/kanji;
- kana/kanji/Latin/numeral mixed-script reading;
- IME typing and handwriting as separate capabilities.

Romanization is a temporary scaffold controlled by policy, never the canonical
representation of Japanese content.

## 8. Expansion-ready profiles

The first architecture release must contain validated profile fixtures for:

- Korean: jamo, syllable-block composition, batchim and sound-change metadata;
- Arabic: RTL, contextual joining forms, diacritics, roots/patterns and numeral
  variants;
- Hebrew: RTL, optional niqqud and root patterns;
- Devanagari: abugida composition, matras, conjuncts and inherent vowels;
- Thai: grapheme clusters, tone classes/marks and no-whitespace segmentation;
- Greek and Cyrillic: alphabet mapping, confusables and source-locale transfer.

These fixtures prove extensibility. They do not imply that complete learner
content for every language already exists.

## 9. Admin V2 Content Studio

Admin V2 adds separate, permission-governed work areas inside the existing
canonical eight Content routes:

- Language Profiles;
- Script Profiles;
- Script Curriculum Builder;
- Character/Component Library;
- Pronunciation and Romanization Policies;
- Script Content Generation;
- Script Review and QA;
- Script Preview Lab;
- Language/Script Release Readiness.

These are nested workspaces or route modes, not new top-level Admin categories
and not a ninth Content page. Mode Library owns language/script profiles and
component libraries; Episode Builder owns Script Curriculum; Generation owns
script recipes; Review owns linguistic QA; Preview owns script previews; Release
owns readiness.

Generation is capability-driven. A stage may run only when the published
language/script profiles declare the required data and renderer support.

The existing canonical 13 `V2GenerationStageKind` values remain unchanged.
Script generation uses typed recipe/output discriminators inside the applicable
existing stages (`v2_activity_instances`, `v2_activity_graph`,
`v2_asset_manifest`, `v2_localization`, `v2_episode_bundle`,
`v2_season_qa`). Adding a fourteenth stage requires a separate versioned
contract decision and is not authorised by this design.

Required generator products include:

- symbol/component inventory;
- reading/sound/meaning mappings;
- stroke/component assets;
- graded sequence and prerequisite graph;
- confusable sets;
- example words and sentences;
- locale-pair explanations;
- activity fixtures;
- spaced-review pools;
- font/glyph coverage report;
- segmentation/normalization report;
- source/licensing/provenance receipt;
- linguistic reviewer receipt.

AI-generated content always remains draft content. A qualified human reviewer
must approve language accuracy, writing-system accuracy and learner-visible
copy before sealing.

## 10. App and frontend

The app exposes a Writing System hub when the active language profile requires
it. The hub may have separate sections, but remains connected to the same
Learning V2 identity, access and review system.

Required presentation capabilities:

- bidirectional and RTL layout without mirroring meaning-bearing media;
- grapheme-safe selection, highlighting and cursor movement;
- ruby/furigana and pinyin/Bopomofo annotation layers;
- vertical-text capability where explicitly enabled;
- font fallback with preflight glyph coverage;
- large-text and screen-reader alternatives for dense character cards;
- keyboard, handwriting, IME and choice fallbacks as distinct inputs;
- reduced-motion stroke animation;
- script-aware line breaking and no mid-grapheme clipping;
- local-first cached script assets with bounded eviction.

Progress for conversational skills and script skills remains distinguishable.
The product may recommend script study, but must not block the entire
conversation curriculum unless an explicit pedagogical gate requires it.

## 11. Validation and release gates

A language/script pack fails closed when:

- profile/version/hash is missing or stale;
- required renderer or font coverage is absent;
- grapheme normalization is lossy;
- segmentation assumes whitespace for a non-whitespace language;
- RTL focus/navigation order is inconsistent;
- reading/meaning/stroke provenance is missing;
- Simplified/Traditional or regional variants are silently substituted;
- romanization is used as canonical target content;
- generation lacks qualified linguistic review;
- device preview cannot render all required glyphs;
- accessibility routes change the claimed construct;
- release falls back to a different locale or script profile.

## 12. Kimi boundary

Kimi may design and prototype:

- mobile Writing System hubs and lessons;
- character cards, stroke visualizations and script review;
- Admin V2 language/script profile pages and generators;
- responsive browser mockups, motion studies and visual QA.

Kimi may not define or modify canonical learning evidence, scoring, progress,
access, persistence, Firebase/Functions, release/security policy, profile hashes
or production data. Its output is a replaceable presentation package consumed
through frozen Codex-owned contracts.

## 13. Completion definition

This design is implemented only when:

- language and script profiles are immutable, versioned and hash-verified;
- Unicode segmentation/normalization tests cover representative scripts;
- Chinese and Japanese special curricula work end to end;
- Korean/Arabic/Hebrew/Devanagari/Thai fixtures prove extensibility;
- Admin generation/review/preview/release gates are operational;
- browser and device previews cover LTR, RTL, CJK and large text;
- Kimi-built presentation passes contract/accessibility parity;
- no production release or language-content claim exceeds verified evidence.
