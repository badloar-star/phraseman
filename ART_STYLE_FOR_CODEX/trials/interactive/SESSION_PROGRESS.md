# Session progress — 2026-10-13

## Latest direct owner corrections — take precedence

- Dark streak stages2,3,4 generated across all five design families: fifteen new
  versioned-free source/base/accent sets, prompts saved per stage. All fifteen
  alignment and 1–8 percent mask area gates pass. No image jobs remain running.
- Stage1..4 now available, twenty dark stage choices total. Stages5..10 and all
  light streak stage counterparts remain missing; full streak deliverable incomplete.
  Stage4 option1 visually resembles stage3 more than intended: progression still
  requires visual review, do not declare all silhouettes approved.
- Real streak tiers read from constants/streakIconAssets.ts:0,10,...90, copied into
  inventory and preview config. Home header tests prove stage2=10 days, stage10=90.
  Fresh read-only review found no concrete correctness issues in this binding.
- Rebuild after generation:125 numbered choices,92 original Claude pages. Other
  authors' newly created pages retained. Current HTTP verifier checks282 resources.

- Five dark streak_01 directions generated and prepared: all unchanged alignment
  and 1–8 percent mask area gates pass. Sources and final base/white accents are
  solely in trials/S2_clay/dark. Prompt manifest saved in interactive.
- Added streak selector (ten stage slots plus freeze), actual Home header reads
  streakKey and independently selected variant. Two fixture checks prove first-stage
  option5 and freeze option1 update the Home header. Stages2..10 and light stage1
  remain missing, explicitly labelled not ready; no overall-series completion claim.
- Removed dark fallback for missing light mode in src and added empty Home placeholder.
  Fresh reviewer identified stale dark artwork in original iframe; regression failed
  before fix, then passed after preserving/restoring image.hidden on mode changes.
- Follow-up review found inline display:block overrides the default hidden rule on
  wrapped images. Added scoped iframe CSS img[data-preview-original-hidden][hidden]
  display:none!important, with failing-before-fix regression. Fresh re-review found
  no concrete follow-on findings. This is still not rendered browser proof.
- Current rebuild: 110 options, 86 original pages (another author's new page retained),
  252 HTTP resources all200, 104 exact revision-mask pair checks pass.
- Nonblocking owner question renewed: permission for alpha-only programmatic cleanup
  of light contours. No reply received yet, no alpha cleanup performed.
- Fresh full asset inventory audit (not visual acceptance): 283 tracked icons,
  2830 required candidate/theme pairs, 2706 missing, 20 incomplete, 104 pass only
  technical asset gates. Overall goal remains far from complete; no scope reduction.

- Owner selected actual preview variants, then explicitly requested matching light
  versions and continued generation of the rest. Read aria-pressed DOM from owner's
  existing IAB tab 3 (no navigation/reload): selection saved in
  owner-selection-2026-10-13.json. continue9, phrase2, mistakes9, video1, cards1,
  saved3, lessons2, dialogs3, today3, all six ranks1, AI-off3.
- Generated matching light continue9r1, phrase2r1, mistakes9r1, video1r1, AI-off3r1;
  all five accent alignment gates pass (phrase/mistakes need --inset=4). Generated
  light rank1 option1r3 and ranks2..6 option1r1: all alignment and component count
  gates pass. Light cutout edge speckles remain visible: NOT final visual approval.
- Generated five dark streak_freeze options and separate white accent files. All
  alignment gates pass; options2/4 fall outside generic 1–8 percent area window
  and remain drafts in picker. Five silhouettes are visibly different.
- Workbench rebuilt with 105 numbered choices; 242 registered URLs load, no
  failures. Existing browser session has not been reloaded so owner work is preserved.
- Browser read-only inspection now succeeded on owner's already-open tab. Thirteen
  actual Home images report complete and nonzero naturalWidth. Screenshot confirms
  rendered Home and selected picker tiles, but does NOT prove every screen/theme.
  Console contains an observer TypeError from older loaded document; current rebuilt
  document has not been reproduced in browser. Do not dismiss or fabricate a fix.

- DO NOT CHANGE THE APPROVED CROWN. Removed all new crown candidates from the
  workbench and removed automatic crown replacement. Original approved art stays.
  Trial experiments are retained, not used. Requirements manifest records crown lock.
- Owner screenshot showed the HTML SOURCE EDITOR, not a rendered preview. Do not
  call opening a file tab a successful mockup display.
- Correct browser URL now served by the dedicated read-only preview service:
  http://127.0.0.1:8893/ redirects to the canonical interactive/index.html path,
  preserving relative resource URLs. 212 registered resources return HTTP 200;
  three private paths are denied. HTTP evidence is not browser-rendering evidence.
  Unified exec session 93638 hosts preview-server.mjs, bound to loopback only and
  restricted to ART_STYLE_FOR_CODEX and docs/design/v2-app static types.
  Actual browser rendering remains unverified; previous browser policy rejections
  must not be bypassed. Owner was given browser URL, not another file-editor link.
- Owner requests speed. No further crown generation; focus on actual interactive
  preview and remaining requested icons. Five dark AI-off variants pass asset gates.
- Fixed iframe AI toggle updates with a scoped aria-checked observer; three live
  toggle fixture checks pass. Read-only review found no concrete issues in this chunk.
- Rank light previews no longer substitute dark artwork when the light pair is
  missing. Regression test reproduced the substitution before the fix.

The active goal remains incomplete. This continuation made concrete asset,
preview and verification progress. Do not mark the goal complete from this file.

## Authoritative artifacts

- `index.html`: full HTML workbench built from `home_styles.html`; snapshots of
  85 current original Claude HTML pages; 23 named theme palettes, hue/intensity sliders,
  dark/light, independent candidate selection persisted in localStorage.
- `tower-variants.html`: derivative of the existing `spire.html` SVG construction;
  five geometric profiles, twelve actual stone leagues and fifteen clickable floors.
- `tower-atlas.html`: all 60 league/profile combinations, with lazy-loaded interactive
  original screens. No tower raster artwork is used in these previews.
- `requirements.json`: full requirement inventory, including 53 actual scenario objects
  found in `app/ai_dialog_scenarios.ts`. The user's 15 topic symbols are also retained.
- `candidate-preparation-report.json`: measured base/layer preparation results;
  failed historical draft results remain visible. Never treat every row as PASS.
- `verification-evidence.json`: VM-based selection, asset path, theme endpoint and
  floor geometry evidence. This is not rendered browser verification.

## Asset progress

- `cards_option_01..05`: dark and light, with white accent layers; all ten pairs
  passed `accentAlignment` using unchanged project thresholds.
- `cards_empty_saved_option_01` and `05`: dark and light, white accent layers, passed.
- Saved option `02r1`: dark and light, passed after removing the inset detail groove.
- Saved options `03r2` and `04r2`: dark and light, passed after simplifying the detail
  and using a four-source-pixel inward alpha edge to avoid painting the neutral bevel.
- Source PNGs and earlier revisions are retained under `trials/S2_clay/{dark,light}`.
- The workbench chooses the latest revision for each numbered candidate.
- Forty existing `continue`, `phrase`, `mistakes`, `video` dark candidates are shown;
  these are not complete deliverables: matching light variants and accepted accents
  remain to be produced. Five cards and five saved candidates bring the selection
  count to 50, not 50 finished dual-theme sets.
- Added `lessons`, `dialogs`, and `today` options 01..05 in both modes, with
  prepared base and white accent WebP files. The workbench now offers 65 choices,
  including the forty older dark-only previews. This does not mean 65 completed sets.
- Fresh requirement audit now includes all 184 owner-listed UI catalog entries
  in addition to the 100 large-art/scenario IDs: 284 tracked IDs, 2840 candidate/mode
  pairs before any justified semantic deduplication; 50 pass asset checks,
  20 are incomplete and 2770 are missing. This audit includes
  alpha, dimensions, size, white mask, accent area and unchanged alignment gates.
- Eight concepts now have larger same-object accent details in both themes:
  cards 03/04 r1, lessons 02/05 r1, dialogs 04 r1, today 03/05 r1,
  today 01 r2. Fresh area and unchanged alignment checks pass for all sixteen.
- VISUAL QA REMAINS OPEN: new light edits show rough/speckled silhouette edges,
  particularly lessons 05, dialogs 04 and today 01. Do not equate technical asset
  checks with visual acceptance. No rough revision is approved for production.
- Latest VM verification passes: 138 theme endpoints, 60 tower geometry profiles,
  15 floors each and 60 atlas frames. Browser visual verification remains unperformed.
- `requirement-asset-audit.json` is the current measured completeness evidence;
  do not confuse the older alignment-only preparation report with full acceptance.
- Added 30 dark rank concepts (`spire_rank_1..6_option_01..05`), five different
  silhouettes: ring/banner, plain pennant, medal, shield, rectangular plaque.
  These are DRAFTS, not thirty accepted assets. Most fail the unchanged interior-edge
  alignment gate because the chevrons have a broad rounded highlight.
- Targeted flat-front chevron edit of rank 1 option 01r1 succeeds: interior-edge
  percentage drops from 17.8 to 0.9, all area/alignment gates pass. Use that source
  edit approach to repair the other failed concepts, not mask manipulation or gate weakening.
- `rank-chevron-audit.json`: 22 of 30 dark masks have the expected large component
  count; eight have a wrong count: rank4/option2, rank5/options1..4,
  rank6/options2..4. Correct their actual source chevrons before making light pairs.
- Light rank1 option01r1 source exists but remains UNPREPARED and visibly rejected:
  numerous white alpha-edge fragments. Do not register it as accepted.
- Workbench now offers 95 draft choices, including all thirty dark rank concepts.
  Six ranks are independently selectable; a twelve-stone selector maps to six
  badges and the original Spire headers; selected rank has 24/64/96px previews.
  These DOM bridges still lack browser-rendered proof.
- Fixed and regression-tested revised mask paths: masks now use the same revision
  filename as their base. Also fixed color swatches: they switch to custom theme
  and synchronize the visible theme selector. Read-only JS review verified the
  swatch defect; latest VM tests pass. No production assets or app sources changed.
- Latest full asset audit: 54 technical passes, 46 incomplete, 2740 missing pairs.
  This is not a visual acceptance count. Goal remains active and incomplete.

## Required next work

### Latest rank continuation

- All thirty DARK rank candidates now pass dimensions/size/alpha/white-mask/area
  and unchanged alignment checks. Fresh connected-component audit: 30 correct,
  0 wrong, 30 light masks missing. This is technical evidence, not browser acceptance.
- Current chosen revisions: rank1/options1,3,4,5 r1; rank2/options1,3,4,5 r1;
  rank3/options1,3,4,5 r1; rank4/all r1; rank5/all r1; rank6/all r1.
  Rank1/option2, rank2/option2, rank3/option2 keep their original passing sources.
- Masks for rank1/option3r1 and rank4/option3r1 use four-pixel inward bevel
  exclusion. Preserve that flag if re-running preparation; a default re-run would
  include the neutral bevel again. No thresholds changed or masks redrawn.
- Preparation report now keys sources by canonical absolute path, avoiding duplicate
  relative/absolute entries and stale first-match records. Regression test passed.
- Workbench candidate metadata now exposes validation status. Rank masks are shown
  only when alignment, area and exact component-count evidence all pass.
- Added two bounded original-header DOM fixture checks: choose Алмаз and change its
  selected option; twelve-tier mapping and original suffix are retained. These are
  not browser/layout proof.
- Light rank1/option01r2 source is rejected too: magenta opaque intermediate plus
  builtin background extraction still produced white fragments. Both files are
  retained as experiments, not registered candidate pairs.
- Asked owner asynchronously whether exact programmatic alpha cleanup using the
  paired dark silhouette is allowed. No reply yet. Do not assume permission and
  do not keep retrying the same failed background extraction blindly. Other icon
  families and screen work can continue meanwhile; the whole goal is not blocked.
- Latest full asset audit: 80 technical passes, 20 incomplete, 2740 missing pairs.
  All production imports remain unauthorized until owner selection.

1. Repair light-image silhouette speckles using the builtin image editing tool,
   preserving geometry and existing marker size; re-run unchanged checks. Add the
   spire tile family; complete existing continue/phrase/mistakes/video candidates.
2. Produce five choices for every streak tier, freeze state/overlay, 500-day crown,
   six rank badges (mapping twelve stone leagues), flags ES/FR and AI-off.
3. Produce all requested dialogue topic/scenario choices; do not replace this with
   a few representative family examples.
4. Apply the selected images and masks in each affected original screen. The
   current bridge only recognizes several existing image filenames and changes
   bases; accent overlays in all embedded original screens still need work.
5. Fix preview theme fidelity across all source pages; the current bridge applies
   common CSS variables only. Hardcoded original values are not yet all adapted.
6. Perform actual browser rendering and interaction verification. Previous browser
   tools rejected file navigation and localhost; do not bypass a policy rejection.
   `open_in_codex` file requests returned queued, so visible opening is unproven.
7. Audit every requirement before completion. Do not import production assets until
   the owner selects candidates.

## Rebuild / verify

Run from `C:\appsprojects\phraseman`:

```
node ART_STYLE_FOR_CODEX/trials/build-tower-comparison.mjs
node ART_STYLE_FOR_CODEX/trials/build-icon-workbench.mjs
node ART_STYLE_FOR_CODEX/trials/inventory-icon-requirements.mjs
node ART_STYLE_FOR_CODEX/trials/verify-workbench.mjs
```

Image generation uses only the built-in tool. No project API key or automation
state was accessed. No production tower or app source was changed this turn.
