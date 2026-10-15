# English Learning V2 audio inventory dry run — 2026-10-14

Command: `node scripts/generate_learning_v2_factory_production_audio.mjs` (dry-run; no `--apply`).

Scope: current `modules/learning-v2/content/factory_native/generated_release/en` tree. The script found 186 learner session files.

```json
{
  "mode": "dry-run",
  "model": "gpt-4o-mini-tts",
  "voices": ["ash", "onyx", "nova", "coral"],
  "uniqueTranscriptCount": 1020,
  "expectedFileCount": 4080,
  "reusableFileCount": 2508,
  "missingFileCount": 1572,
  "estimatedCharacters": 28524,
  "estimatedAudioMinutes": 39.78,
  "conservativeEstimatedCostUsd": 1.19,
  "concurrency": 6,
  "outputDir": "assets/audio/learning-v2/factory-production-v1"
}
```

Interpretation: these are script estimates, not measured duration, an invoice, or authorization to spend. No API calls or file writes occurred. The estimate is based on the script's internal word-rate/cost formula and may not equal actual provider billing. `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND` was unset in both the process environment and `.env.local`.

This inventory is for the current generated-release tree; it does not grant permission to generate audio or prove that every transcript is semantically final. Content must be audited before bulk audio generation so edits do not strand newly stale audio. In S01 specifically, the exact `I am fine.` clip remains missing for the final listening task.
