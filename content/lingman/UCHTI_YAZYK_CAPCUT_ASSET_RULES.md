# Учти язык: CapCut Asset Rules

## Intro visuals

- Every one of the 60 lesson intros uses its own high-quality abstract stock-video source.
- Use open, documented licenses only. Preserve a manifest with the provider, source page or asset id, license, resolution, duration, and checksum.
- Reject people, text, logos, app interfaces, and repeated source clips for these intros.
- Deliver H.264 MP4, 1080x1920, 2.63 seconds, and no audio; the existing spoken intro remains on the native CapCut audio track.
- In the native draft, replace only the 60 intro slots at main video-track positions 1, 7, 13 through 355. Preserve all target timings, lesson slots, text, audio, and other tracks.
- Before changing the draft: close CapCut, back up every native mirror, verify the intro pack, then verify the four mirrors are byte-identical after the change.

## Lesson visuals

- Keep lesson phrase backgrounds separate from intro assets. Each phrase background must be semantically matched to the phrase and may not reuse generic intro clips.
- Never rely on automatic wrapping for Russian on-screen text. Insert breaks only between words or clear phrase groups.

## Native project copies

- Never modify the source lesson draft in place. Create a separately registered CapCut project with a unique `CODEWORD_NUMBER` name, then work only in that copy.
- Before a language or asset replacement, close CapCut and back up every native mirror that will be written.
- The root `draft_content.json`, root `template-2.tmp`, and both timeline mirrors must be byte-identical before and after any write. A clone must use one shared `update_time` across all four mirror payloads; per-file timestamps create a broken native draft state.
- Verify Home-project registration after cloning: exactly one visible entry, an existing draft JSON path, and `tm_draft_removed: 0`. Never replace an existing project name.

## Language-swap layout rule

- For this format, a language swap must preserve every existing phrase-text target time range and every text transform. The language-to-layer assignment is specified by the target project; never infer it from the source draft or from a prior language build. Do not move text windows merely to match voice order.
- Voice order may be swapped to English first and target language second. When a target-language voice is longer, move only that voice within its existing phrase cycle enough to prevent an overlap; never cut a spoken word or shift text windows.
- Intro voice copy and intro on-screen copy are separate assets. Translate every visible intro text into the video language, but do not replace an on-screen learning promise with the spoken Professor Lingman credit.
- For `SPANISH_1`, the original lower, first phrase layer is English and the original upper, second phrase layer is Spanish. The first phrase voice is the verified English package; the second phrase voice is the Spanish package. Every visible intro line is English: `Watch it twice / to remember more.`, `Learning Spanish / can be easier.`, and the separate URL `knowlyapps.com`.
- For `FRENCH_1`, the original lower, first phrase layer is English and the original upper, second phrase layer is French. The first phrase voice is the verified English package; the second phrase voice is the verified French package. Every visible intro line is English: `Watch it twice / to remember more.`, `Learning French / can be easier.`, and the separate URL `knowlyapps.com`.
- For `ITALIAN_2`, the original lower, first phrase layer is English and the original upper, second phrase layer is Italian. The first phrase voice is the verified English package; the second phrase voice is the verified Italian package. Every visible intro line is English: `Watch it twice / to remember more.`, `Learning Italian / can be easier.`, and the separate URL `knowlyapps.com`.
- For the Italian-to-Russian A1 version, the owner explicitly requires the original Russian intro information copy to remain unchanged: `Это видео рекомендуется / смотреть дважды / для лучшего запоминания`. The Russian on-screen lesson headline is `Учить итальянский можно проще:`. Neither string is an intro-voiceover instruction.
