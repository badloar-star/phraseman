HOLD — do not generate TTS now.

- P1: The conditional TTS exception requires an explicit audio request, a narrow batch plan, and `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1` ([AGENTS.md](C:/appsprojects/phraseman/AGENTS.md:366)). The prior voiceover request likely satisfies the first condition, but the spend guard is false. A fresh deterministic invocation was blocked by the guard before key or network use.
- P2: Process-level `OPENAI_TTS_API_KEY` is absent, but `.env.local` currently contains a nonempty TTS key. This does not grant authorization; the false spend guard remains decisive.

Manifest verification found:

- Exact `I am fine.`: 0 entries.
- `fine`, `I am here.`, `I am ready.`, and `I am happy.`: four voices each; all 16 files exist and match size and SHA-256.

Bounded next step: audit only the current written session in sequence, reuse only exact transcript matches, and record `HOLD/audio_incomplete` for the four missing `I am fine.` voice coordinates. Do not substitute `fine` or longer phrases, do not mark the session green, and do not advance to an unwritten session if closure is sequentially required. A four-coordinate dry-run/cost plan may be prepared; generation requires the human to intentionally enable the spend guard.

No external API was called and no files or audio were changed.
