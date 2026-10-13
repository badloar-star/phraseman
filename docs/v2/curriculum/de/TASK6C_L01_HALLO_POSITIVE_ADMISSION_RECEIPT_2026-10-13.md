# German Task 6C L01 `Hallo!` positive canonical admission receipt

<!-- TASK5_V3_SHA256: 5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe -->
<!-- LEXICAL_EVIDENCE_SHA256: 10c1b3de298b46d7e3f0e6e6388349e551ebe4647c2941b55731ab86f8ddc38f -->
<!-- LEXICAL_REGISTRY_V3_SHA256: 475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb -->
<!-- TASK6_V3_SHA256: 8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862 -->
<!-- INVENTORY_V3_SHA256: 702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88 -->
<!-- ADMISSION_MANIFEST_SHA256: e8f42204720575759449574c109b8220f9479c6fe1479cec3db20bbefa460e28 -->
<!-- ADMISSION_MODULE_SHA256: b79bd859df63aa55ab612f4e6ee13ccddb8a86abf3552e15bb33d753a1a661a3 -->
<!-- ADMISSION_GATE_SHA256: 5c3ad895f68937cd47cd3ec504a660d67f2be504fa9143e11250db0827fd5147 -->

Date: 2026-10-13

Decision: exact positive canonical admission for `Hallo!` only.

- Source plan: `de_lex_plan_l01_c01_hallo_v2`
- Canonical lexical sense: `de_lex_l01_c01_hallo_v2`
- Canonical phrase frame: `de_pf_l01_c01_hallo_v2`
- Source interpretation: `Interjektion` → `fixed_expression`
- Admitted register: `colloquial`; `neutral` is forbidden
- First introduction: `de_l01_c01_s01`
- First scored checkpoint: `de_l01_c01_s08`
- Greeting and participant identification remain distinct interactions
- The unattested composite `Hallo, Nachbarin!` is forbidden
- Inventory after this admission: `7 resolved / 281 unresolved / 1792 packet IDs / 0 materialized`

Independent review status: `CLOSED`

<!-- HALLO_REVIEW_RECORD {"lens":"native_linguistic","reviewerTask":"/root/de_hallo_native_review","evidenceClass":"ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY","reviewedBytes":"PRE_REPAIR_EXACT_HASHES_UNAVAILABLE","temporalScope":"PREDATES_P1_AUTHORITY_BOUNDARY_REPAIR","controlling":false,"verdict":"PASS","p0":0,"p1":0,"p2":0,"findings":[],"independence":"NOT_SELF_PROVED_BY_THIS_RECEIPT","authority":"NO_AUTHORITY"} -->
<!-- HALLO_REVIEW_RECORD {"lens":"post_repair_spec","reviewerTask":"/root/de_hallo_postrepair_spec_review","evidenceClass":"ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY","moduleSha256":"def576446c54a6f26660095ecdcfcad1c31948ebc20c8bc3469ba9fb9239351b","gateSha256":"84f72f8e27342dd778be6c3bc6d066bbfb27eb3b9f933394201c3279a92a0dda","receiptSha256":"6d480cec6002889081b0db915915a30427b3df28f7e1f16e17fb141655279691","verdict":"PASS","p0":0,"p1":0,"p2":0,"findings":[],"hostileCases":["preauthoring=true","learner-facing=true","release=true"],"independence":"NOT_SELF_PROVED_BY_THIS_RECEIPT","authority":"NO_AUTHORITY"} -->
<!-- HALLO_REVIEW_RECORD {"lens":"adversarial","reviewerTask":"/root/de_hallo_adversarial_review","evidenceClass":"ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY","moduleSha256":"def576446c54a6f26660095ecdcfcad1c31948ebc20c8bc3469ba9fb9239351b","gateSha256":"84f72f8e27342dd778be6c3bc6d066bbfb27eb3b9f933394201c3279a92a0dda","receiptSha256":"6d480cec6002889081b0db915915a30427b3df28f7e1f16e17fb141655279691","verdict":"PASS","p0":0,"p1":0,"p2":0,"findings":[],"attackClasses":["source","interaction","hash","authority"],"independence":"NOT_SELF_PROVED_BY_THIS_RECEIPT","authority":"NO_AUTHORITY"} -->

- Native linguistic review `/root/de_hallo_native_review`: `PASS`,
  `P0=0`, `P1=0`, `P2=0`. It predates the P1 authority-boundary repair;
  its exact reviewed hashes are unavailable in the orchestration summary, so it
  is non-controlling linguistic evidence and is not represented as a final-byte
  review.
- Post-repair specification review `/root/de_hallo_postrepair_spec_review`:
  `PASS`, `P0=0`, `P1=0`, `P2=0`, bound to the reviewed module, gate, and
  receipt snapshot hashes in its record. It rejected all three tested hostile
  grants: preauthoring, learner-facing, and release.
- Adversarial review `/root/de_hallo_adversarial_review`: `PASS`, `P0=0`,
  `P1=0`, `P2=0`, bound to the same reviewed snapshot. Its scope covered
  source, interaction, hash, and authority attacks.

These are orchestration-attested transcript summaries. This receipt does not
self-prove reviewer independence, and no review grants downstream authority.

Task 7 unlock: `false`

Preauthoring authority: `false`

Learner-facing authority: `false`

Release authorization: `false`

Consumer cutover: `NONE`

The receipt does not authorize learner content, mockup changes, a local release,
production publication, or any default-consumer cutover.
