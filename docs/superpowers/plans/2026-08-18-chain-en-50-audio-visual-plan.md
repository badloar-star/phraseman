# CHAIN EN 50 Audio and Visual Package Implementation Plan

Goal: Build the approved 50-chain CapCut package with 1050 high-quality OpenAI WAV voice files in folders 1–5 and 50 Soft 3D Clay alpha visuals in folder 6.

Architecture: Preserve the extracted package as the source of truth. A checkpointed local TTS runner reads ELEVENLABS_BATCH_MANIFEST.csv, maps folders 1–5 to Nova/Ash/Onyx/Coral, writes numbered WAV files, and resumes without regenerating completed files. Visuals are generated as one asset per chain from the approved constant-character style and are validated for real alpha, safe margins, and numbering before BUILD_TIMELINE.py --strict.

Tech Stack: Node.js fetch to OpenAI /v1/audio/speech using OPENAI_TTS_API_KEY, tts-1-hd, WAV output, PowerShell/ffprobe, built-in image generation for visual previews/assets, Python package builder and QA.

---

### Task 1: Prepare the package workspace

Files:
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/
- Read: .codex-tmp/chain_pack_extracted/CHAIN_EN_50_CAPCUT_PACK/PROJECT_CONFIG.json
- Read: .codex-tmp/chain_pack_extracted/CHAIN_EN_50_CAPCUT_PACK/ELEVENLABS_BATCH_MANIFEST.csv

- [ ] Copy the extracted source pack to the Desktop destination without modifying source master files.
- [ ] Verify folders 1, 2, 3, 4, 5, and 6 exist and contain their original README files.
- [ ] Run VALIDATE_PACKAGE.py before any media generation and require FINAL RESULT: PASS.

### Task 2: Generate checkpointed voice audio

Files:
- Create: .codex-tmp/de-l01-p1/build_chain_en_50_openai_audio.mjs
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/.audio_generation_state.json
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/1/*.wav
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/2/*.wav
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/3/*.wav
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/4/*.wav
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/5/*.wav

- [ ] Calculate the exact manifest character count and estimated spend before live generation.
- [ ] Map RU_PHRASE and RU_EXPLANATION to Nova, EN_VOICE_1 to Ash, EN_VOICE_2 to Onyx, and EN_VOICE_3 to Coral.
- [ ] Send one manifest row per /v1/audio/speech request with model tts-1-hd, response_format wav, and no added prompt text.
- [ ] Write each response atomically to its numbered folder/file and record completed manifest rows in the checkpoint.
- [ ] Resume from the checkpoint after interruption and never regenerate an existing valid WAV.
- [ ] Verify all 1050 files exist, are non-empty, and match the manifest count.

### Task 3: Generate the approved visual set

Files:
- Create: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/6/001.png … 050.png
- Create: .codex-tmp/de-l01-p1/visual_prompts_50.json
- Create: .codex-tmp/de-l01-p1/visual_generation_state.json

- [ ] Build one prompt per chain from VIDEO_DATA.json, keeping the same main character identity and the Soft 3D Clay Educational style.
- [ ] Require true transparent background, full object visibility, generous safe margins, no text, no logo, and no cropped edges.
- [ ] Generate exactly 50 visuals, one per chain, with checkpointing and no duplicate prompt/asset generation.
- [ ] Inspect alpha metadata and dimensions for every PNG.

### Task 4: Build and verify the CapCut draft

Files:
- Modify: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/BUILD_REPORT.txt
- Modify: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/VALIDATION_REPORT.txt
- Modify: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/PACKAGE_QA_REPORT.txt
- Modify: C:/Users/badlo/OneDrive/Desktop/CHAIN_EN_50_CAPCUT_FULL_PACK_RU_NOVA/draft_content.json

- [ ] Run BUILD_TIMELINE.py --strict so real WAV durations drive all timing.
- [ ] Run VALIDATE_PACKAGE.py and require FINAL RESULT: PASS.
- [ ] Confirm final folders contain exactly 250, 250, 250, 250, 50 WAV files and 50 PNG files.
- [ ] Confirm no audio or visual item is missing, duplicated, overlapped, or cropped.
- [ ] Deliver the Desktop package path and the final QA reports.
