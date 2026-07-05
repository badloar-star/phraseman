# Quiz Attraction Generation Rules

Rules for short Lingman quiz-attraction packs such as the WEDNESDAY CapCut template.

## Slot Pattern

- The WEDNESDAY quiz-attraction CapCut template is 60 short videos.
- Each short video has 5 phrase slots.
- Total phrase slots: 300.
- Slot 1 in each video is always a direct hook phrase: blunt, instantly understandable, and strong enough for the first frame.
- Slot 3 in each video is always a provocative translation trap: a real phrase that many learners translate too literally or too confidently. It should invite comments without lying to the viewer.
- Slots 2, 4, and 5 support retention: natural A1-A2 English, easy to repeat, practical in speech, or an extra hook/trap if it strengthens the mini-video.

## Phrase Constraints

- Every English phrase must contain two or three visible words. Contractions count as one word: `I'm fine` = 2 words.
- Use natural spoken English, not dictionary fragments, unless the fragment is a well-known phrase such as `No kidding`.
- Prefer A1-A2 everyday phrases, phrasal verbs, short idioms, and common false-translation traps.
- Russian answers must be natural meaning translations, not wooden word-by-word translations.
- Russian answers must be complete, usable Russian utterances for the exact English phrase context.
- Do not use dictionary-fragment translations for standalone English phrases. Example: standalone `Piss off` must be translated as a command such as "Вали отсюда"/"Отвали", not the infinitive "Бесить"; `pissed off` as an adjective is "взбешен/зол", while `piss someone off` is "бесить/разозлить".
- Avoid meta filler such as `X means -> ...` in final phrase rows unless the on-screen English phrase itself is intentionally a meta phrase. Prefer real spoken examples such as `So mid`, `Nasty shot`, `Got receipts`, or `Read the room`.
- Every generated row needs a semantic review pass: English phrase sense, Russian naturalness, slang register, standalone usability, comment-bait defensibility, profanity fit, CapCut line-wrap safety, and duplicate check.
- Every slot 3 item must include a bait note explaining the expected wrong literal translation or common learner argument.
- Never use a provocative slot if the correction is fake, fringe, or unverifiable. The bait must be defensible.

## Tone

- The provocation is aimed at curiosity, not humiliation.
- Do not call viewers stupid in the public-facing copy.
- Keep Professor Lingman's adult, warm, respectful tone: "you thought X, but English does Y" rather than "you are wrong".
- For clean conversational packs, keep the same hook/slot/bait mechanics but remove open profanity and explicit insults. The phrase pool should feel like useful spoken English: everyday reactions, soft disagreement, planning, work/chat phrases, and many phrasal verbs. Slot 3 remains comment-bait, but the bait is a defensible translation trap, not shock value.

## Layout Safety

- Keep phrase text short enough for 9:16 CapCut display.
- Insert manual line breaks only at spaces if a phrase is later expanded with explanations.
- Do not allow mid-word wrapping in English or Russian.
- For the WEDNESDAY quiz-attraction hero Russian text, never pass one long line to CapCut and rely on auto-wrap.
- Russian hero text must be pre-wrapped before insertion with manual `\n` only at spaces/semantic boundaries.
- Current safe limit for this template: max 12 visible Cyrillic characters per Russian hero line, max 3 lines.
- If a Russian word is longer than the safe line width, shorten or rephrase the translation before building the draft; do not let CapCut split the word.
- QA must fail if any generated Russian hero text line exceeds the safe width or if any line break appears inside a word.
- Before saying a WEDNESDAY quiz-attraction CapCut project is ready, detect the Russian hero text track by sampling text contents, then run the wrap gate against that Russian track. Do not reuse a stale track number from another copy. In `LINGMAN_WEDNESDAY_VIRAL_60X5_20260703`, English hero text is 1-based track 6 and Russian hero text is 1-based track 8:
  `node scripts/capcut_text_wrap_contract_check.mjs --draft-dir "<CapCut draft folder>" --track-index 8 --source-psv content/lingman/viral_two_three_word_phrases_20260703.psv --source-column translation_ru --max-chars 12 --max-lines 3`
- The wrap gate status must be `ready`; otherwise fix text wrapping before reporting completion.
- If CapCut is running and the user explicitly asks not to close it, do not copy, register, patch, or mutate native CapCut draft files. Build only an asset package outside the CapCut draft tree: phrase PSV, TTS audio, video backgrounds, manifests, contact sheets, and QA reports. Native draft copy/registration/patching waits for a safe closed-CapCut window.
- Never close CapCut while the user is exporting/rendering a video. Before any scripted CapCut close for WEDNESDAY registration or patching, first verify with the user that no render/export is running; if there is any doubt, postpone native draft writes and continue only with asset-side work outside the CapCut draft tree.

## CapCut Project Naming

- Native CapCut WEDNESDAY drafts must have a short visible name that starts with a unique code word and ends with one sequential number, for example `SPARK_4`.
- Do not use long names such as `LINGMAN_WEDNESDAY_...`, dates, repeated prefixes, or two similar first-viewport names. CapCut truncates project cards, so the unique signal must be visible at the beginning of the name.
- Number WEDNESDAY projects in one shared sequence starting from 1. If three WEDNESDAY projects already exist before the current one, the current project's visible CapCut name must use number 4.
- The code word may change per project, but the number must be unique and increment by one for the next registered project. Keep a stable mapping in the run notes/manifests so the user can identify the project in CapCut immediately.
- The clone/register/rename gate must reject target names that do not match `CODEWORD_NUMBER` (`^[A-Z][A-Z0-9]*_[1-9][0-9]*$`) for new WEDNESDAY delivery drafts.
- If the user asks to rename a CapCut project, the operation may change only the visible project name, folder path/name, and root/meta paths required to point to that renamed folder. It must not change timeline/content ids, text, audio, video materials, Resources, covers, timing, tracks, or any other project content.
- A native CapCut project is not delivered until it is registered for the Home -> Projects grid, not merely copied as a folder under `com.lveditor.draft`.
- Registration must update `root_meta_info.json` with exactly one visible `all_draft_store` entry for the target name. The entry must have `draft_is_invisible=false`, `tm_draft_removed=0`, `draft_name=CODEWORD_N`, `draft_fold_path` pointing to the target draft folder, `draft_json_file` pointing to that folder's `draft_content.json`, and an existing `draft_cover`.
- The final gate must prove the target folder exists and the target root-meta entry exists before saying "project is ready" or "it will appear in CapCut". If root-meta registration fails, the result is only an asset/folder backup, not a finished CapCut project.
- Do not create two projects with the same visible `CODEWORD_N` in root meta. If a duplicate target name exists, stop or choose the next sequential number; never replace an earlier project unless the user explicitly asks to overwrite that exact project.
- As of 2026-07-04, `GLOW_5` is the user's current WEDNESDAY gold sample because the user manually added new details to it in CapCut. Future WEDNESDAY generations must clone from `GLOW_5` unless the user names a newer gold sample.
- Treat user edits inside the current gold sample as sacred. Before copying it, verify the `GLOW_5` folder and root-meta entry exist, then clone/register the next short `CODEWORD_N` project from that exact draft. Do not fall back to older `LINGMAN_WEDNESDAY_...` drafts unless `GLOW_5` is missing and the user confirms the fallback.

## Phrase Video Backgrounds

- The WEDNESDAY project has a dedicated phrase-video layer with exactly 300 short video segments, one for each phrase slot.
- In the playable WEDNESDAY structure, the real semantic phrase-background layer is `tracks[1]` in the native CapCut JSON. It has 300 full phrase-slot segments that align with the Russian hero text timing, about 6.33 seconds each.
- Do not confuse this with the later 300-segment short overlay/loading-effect layer. That overlay has about 2-second segments at speed about 3.05 and must be preserved/restored, not used as the semantic phrase-background layer.
- Replacing phrase text/audio is not enough. For every new phrase set, rebuild or reselect the 300 phrase-video assets for the current English phrase meanings.
- Each phrase-video segment must point to a local mp4 under the current draft `Resources/` folder, not to one shared CapCut cache clip and not to stale videos from a previous phrase set.
- The source mp4 must be a concrete scene selected for the phrase meaning or communicative situation. It must not be a generic loading bar, intro clip, template placeholder, or unrelated recycled phrase video.
- For rude/slang/comment-bait WEDNESDAY phrase pools, a phrase video must contain visible associative evidence from the phrase: for example an angry stop/pointing gesture, an argument, a phone message/proof screen, money/card/wallet pressure, a breakup/dating signal, a red/green flag, a police/lawyer cue, a work/boss cue, or a literal bait object. A generic face, generic city, generic walking person, or generic reaction shot is not enough.
- Search must use more than one open-source provider/source family when possible, including Pexels and Pixabay stock video, and may use suitable generated/AI-video sources only when they still satisfy the same visible-element gate and are legal to reuse.
- The manifest for every phrase-video row must include `scene`, `queryCandidates`, the final `query`, `visualElements`, `queryMatches`, `blockedMatches`, provider/source id, source URL/tags when available, and local path. QA must fail if the selected query matches fewer than two declared visual elements, if a multi-word visual element only matched one of its words, if `blockedMatches` is non-empty for a non-literal scene, or if the row falls back to a banned generic query such as only "person talking close up", "dramatic reaction close up", or "confused person thinking".
- Contact-sheet review is mandatory for this rude/slang pool before patching CapCut. If the sheet reads as mostly unrelated people instead of phrase-specific objects/actions/conflicts, rebuild the pool instead of shipping it.
- For clean conversational packs, the same contact-sheet rule applies: the sheet must show phrase-specific everyday situations and objects such as phones, messages, calendars, office desks, forms, receipts, doors, bags, food, shops, workouts, sleep, travel, or relationship context. A generic smiling person, generic street, or random aesthetic shot is not enough.
- Each phrase-video mp4 must be CapCut-friendly H.264, 1080x1920 portrait, muted, and long enough for the segment source timerange. The standard WEDNESDAY source clip length is about 6.33 seconds.
- Preserve the full phrase-background segment timing, speed, crop, opacity, masks, transforms, and render order from the playable `tracks[1]` template. Only replace the backing video material path/name/duration/dimensions.
- The background QA gate must fail unless `tracks[1]` has 300 phrase-video segments, 300 resolvable local mp4 paths, 300 existing files, no shared single cache path, no provider source reuse above the explicit cap, and a manifest row for every phrase with query/provider/source/local path.
- New WEDNESDAY projects must not reuse provider sources from earlier WEDNESDAY packs. Before generating a new project's 300 phrase-video mp4s, pass all previous background manifests as exclusion manifests and treat every previous `provider:providerId` / source URL as banned. The patch gate must fail if the new manifest overlaps with any excluded manifest, even if the phrase text is different.
- The timing QA gate must fail unless every semantic phrase-background segment starts with the matching Russian hero segment and has the same phrase-slot duration.

## 2026-07-03 User Rule

The user requested the current pattern explicitly:

- "каждое первое для каждого 1 отдельного кусочка видео всегда фраза в лоб, всегда хуковая";
- "каждая третья должна быть провоцирующей, байт на комментарии";
- the bait should target phrases people are used to translating one way, although that one translation is not actually correct in context.
- Correction: this template is 60 videos x 5 phrase slots, not 100 chunks x 3 phrase slots.
