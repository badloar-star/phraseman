# S01: one combined repair batch

Status: S01 text repair closed on the final successor below. Seven current, independently saved text-role reports are PASS for the exact final bytes. This is not production, audio or release authorization.

Historical frozen input for the combined repair batch: `outputs/s01-reader2-fixed-20261013`.
Historical candidate bundle: `14f89e64b45b1efb57c56a79ca1c5d0bfab7741a9031aaa0a8cf816f900cb1fb`.
Historical content inventory: `7ba18c2b767ddea4cc49dedc74f41065672263f3d5f6cc5c2d3f2862e38b4f7f`.

## Terminal outcome (2026-10-13)

- Final text successor: `outputs/s01-i13-scene-fixed-20261013`.
- Candidate bundle SHA-256: `a55a97a1ce3cd7f9274f050f66d2335e4a8b258316100ddf6616d4a941da27ca`.
- Content inventory SHA-256: `278bcdb7da8d8fdb91abf175bd76c97940be6c085c24d9dbe74644ce80fb6755`.
- Content receipt bytes SHA-256: `35583adc2953cac73c146e45ae6d2eccbe3f02a7a6ae7a64c52ae73499a216f1`.
- Review head SHA-256: `f1b516c321d9438f8b6892ca54f1d77e75bcf111c0603edcf1c6a386cac1dceb`.
- Current text evidence: learner, reader, pedagogy, nonsense, taste, progression and locale each have a distinct saved `2026-10-13_l01_s01_final_i13_*_raw.md` report bound to these final hashes and registered as PASS. Historical reports remain bound to their original candidates and were not carried forward.
- Owner preview: the existing 186-card catalogue at `http://127.0.0.1:59691/` overlays only verified S01, marks the whole S01 card `Текст проверен`, retains `Выпуск не подтверждён`, renders the complete RU/UK option analyses, and exposes exact `Было в макете` / `Стало` text differences against the original catalogue entry. The other 185 entries stay on their existing runtime and data.
- Focused preview verification: `learning_v2_static_owner_review_server_v1_gate.mjs` PASS and `learning_v2_static_owner_review_full_course_gate.mjs` PASS, including inline and external catalogue paths, RU/UK intro feedback, practice analysis, S02 legacy isolation, forged/stale evidence failure and bounded observer mutations.
- Audio remains deferred and unverified. `releaseAuthority` and production authority remain literal `false`; no production files were promoted and no release was performed.
- Sequential next scope: S02. Do not skip ahead to later sessions before S02 completes the same source-bound repair, independent text review and preview verification cycle.

## Confirmed against source

1. `i06` wrong-option feedback in RU/UK ends with an unexplained fragment `Здесь: I am fine.` / `Тут: I am fine.` Replace with a full sentence identifying the requested response: `В этой ситуации нужно сказать: I am fine.` / `У цій ситуації потрібно сказати: I am fine.` Apply consistently in Markdown, locale batch, atomic data and explanation sidecar, then regenerate projections. Keep target-language highlighting.
2. `i13:r2` temptation explanation uses `выбрать по знакомству` / `обрати за знайомством`. This changes familiar wording into a personal-acquaintance idiom. Say that the phrase looks familiar and so can attract a choice without distinguishing the heard word.
3. `i17:s03:tile:d2` calls an option a `безопасная плитка` / `безпечна плитка`. Say `подходящим вариантом` / `доречним варіантом` instead; preserve the actual semantic contrast.
4. `i17:s03` Ukrainian localized meaning contains `«У мене все добре.»`. Use the same quotation punctuation convention as RU and other Ukrainian feedback, preserving meaning.
5. Fresh `audit_selectable_feedback.mjs --scope en/l01/s01`: source 0 findings; release 3 and mockup/reviewed-source 3 missing correct-answer intro explanations. Candidate has all nine intro option explanations. Fix the stale preview projection after content checks; do not silently publish production or hide the discrepancy.

## Findings requiring adjudication, not automatic rewriting

- Reader objection to parts of speech conflicts with the owner's explicit request for parts of speech and per-word explanations. Preserve that functionality and machine-readable tags. Distinguish requested linguistic explanation from forbidden production terminology.
- References to `курс` and `урок` are not automatically equivalent to production terminology. Do not broaden the user's ban on internal terms merely to satisfy a reviewer label.
- Bare `I am` explanation: assess whether scope clarification can be shortened without teaching future material or falsely calling a context-dependent short response universally ungrammatical.
- Missing prototype factory checkpoint is a process-evidence issue, not evidence that a particular sentence is false. Do not fabricate registry admission or checkpoint history. Decide its relation to the existing source-bound candidate protocol explicitly.

## Execution boundary

## Adjudication (independent advisor `/root/audit_process_waste`)

- Preserve parts of speech and per-word explanation: explicit owner requirement. Reject the blanket POS prohibition and blanket prohibition of ordinary words `курс`, `урок`, `Новое слово`.
- Narrowly replace `В полной форме этого урока` with `В полной фразе` and equivalent Ukrainian wording.
- Explain intro3:r3 as insufficient to communicate happiness in this situation. Preserve the boundary that context may make `I am` a complete response; do not teach a future short-answer pattern or call it universally ungrammatical.
- Fix i16 with a neutral Mira-speaking-about-herself listening cue and joy-only explanation; the heard phrase does not specify a first-day or good-news cause.
- The missing factory checkpoint is an input-binding/process issue. Do not invent registry admissions, refresh old evidence or claim release. It does not prevent the current repair.
- Audio is expressly deferred by the owner, separate from text completion. Production authority remains false.

Raw roles retained separately: reader HOLD, locale HOLD, pedagogy HOLD, nonsense HOLD, taste PASS, progression PASS. These are original-version results, not successor approval. Prior learner evidence remains associated with its reviewed version.

Collect the remaining role reports before changing the frozen content. One writer makes one source-consistent repair batch, preserving the old candidate and raw reports. Rebuild one successor, bind genuine evidence only to reviewed bytes, and rerun affected checks. No S02 content edits until S01 text work is closed. Audio remains separately unverified and deferred by owner. No API-key use, automation changes, production deployment or release authorization.

Current full catalogue: http://127.0.0.1:59691/ (186 sessions). Keep it available while repairing S01; never replace it with a one-session-only catalogue.

## Durable process guard and receipt incident

- Treat every content candidate as immutable after review starts. New content bytes require a new named successor; never rebuild a receipt inside a historical candidate.
- Collect independent findings against one frozen candidate, adjudicate them, and apply one bounded repair batch. Afterward rerun only roles whose claims intersect the changed content or behavior. A ledger/status-only update never triggers automatic all-role rereview.
- Review packets stay bounded to the candidate, its content receipt, the role contract and necessary sources. Full history is not a substitute for current byte binding.
- Incident: an earlier test invoked the receipt CLI against the real historical `s01-reader2-fixed-20261013` directory and overwrote its `content-receipt.json` with the then-current source inventory (`41cbda…`). No untouched backup file existed. The exact historical JSON was reconstructed from the immutable file entries embedded in the stored reader2 stable review head, using the fixed content-receipt schema and serialization; the recovered bytes match the independently recorded historical SHA-256 `3ea360ca600d98f2b840324929339abc384a1961e162077b7222038cbe5f3f0e` and inventory `7ba18c2b767ddea4cc49dedc74f41065672263f3d5f6cc5c2d3f2862e38b4f7f`. This is cryptographic reconstruction, not evidence that the original file was never mutated. The CLI mutation regression now operates only in a temporary repository and asserts the real historical tree, bytes and timestamps stay unchanged.
