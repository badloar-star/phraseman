#!/usr/bin/env python3
"""Generate Russian phonetic transcriptions for all 300 phrases in track[13].

Produces a JSON file: transcriptions_for_track13.json
Format: {"phrase": "transcription", ...}

Usage:
    python generate_transcription_for_track13.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from openai_dev_guard import require_codex_openai_tts_only

sys.stdout.reconfigure(encoding="utf-8")

require_codex_openai_tts_only(action="Track 13 OpenAI transcription generation", endpoint="chat/completions")
API_KEY = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing — never hardcode secrets
MODEL = "gpt-4o-mini"
OUT_PATH = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604/transcriptions_track13.json")

SYSTEM_PROMPT = """You convert English phrases into IPA phonetic transcription.
Rules:
- Use standard IPA notation (International Phonetic Alphabet)
- Use American English pronunciation
- Include primary stress marks (ˈ) and secondary stress marks (ˌ) where applicable
- Wrap the transcription in forward slashes: /.../
- No explanations, no translation — only the IPA transcription

Examples:
"I ordered a coffee" → /aɪ ˈɔːrdərd ə ˈkɒfi/
"Can you help me with the dishes?" → /kæn juː hɛlp miː wɪð ðə ˈdɪʃɪz/
"She made a list of groceries" → /ʃiː meɪd ə lɪst əv ˈɡroʊsəriːz/
"Please turn off the lights" → /pliːz tɜːrn ɒf ðə laɪts/
"The living room feels very cozy" → /ðə ˈlɪvɪŋ ruːm fiːlz ˈvɛri ˈkoʊzi/
"""

def transcribe_batch(phrases: list[str]) -> dict[str, str]:
    import urllib.request

    results = {}
    # Process in batches of 20 to stay within token limits
    batch_size = 20
    total = len(phrases)

    for i in range(0, total, batch_size):
        batch = phrases[i:i + batch_size]
        print(f"  Batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({len(batch)} phrases)...", flush=True)

        # Build numbered list for batch
        numbered = "\n".join(f'{j+1}. "{p}"' for j, p in enumerate(batch))
        user_msg = f"Дай транскрипцию для каждой фразы. Отвечай только пронумерованным списком в том же порядке:\n\n{numbered}"

        payload = json.dumps({
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "temperature": 0.1,
            "max_tokens": 1500,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
        )

        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read())
                    text = data["choices"][0]["message"]["content"].strip()
                    break
            except Exception as e:
                if attempt == 2:
                    print(f"  ERROR: {e}", flush=True)
                    for p in batch:
                        results[p] = p  # fallback to original
                    break
                time.sleep(2)
        else:
            continue

        # Parse numbered response
        lines = text.split("\n")
        trans_list = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Remove number prefix like "1. " or "1) "
            if line and line[0].isdigit():
                dot_idx = line.find(".")
                paren_idx = line.find(")")
                sep = min(x for x in [dot_idx, paren_idx] if x > 0) if any(x > 0 for x in [dot_idx, paren_idx]) else -1
                if sep > 0:
                    line = line[sep+1:].strip()
            # Remove surrounding quotes
            line = line.strip('"\'""«»')
            if line:
                trans_list.append(line)

        # Align with batch
        for j, phrase in enumerate(batch):
            if j < len(trans_list):
                results[phrase] = trans_list[j]
            else:
                results[phrase] = phrase  # fallback

        time.sleep(0.5)

    return results


def main() -> None:
    # Load phrases from the phrase pack JSON (english originals — not from track[13] which may be already modified)
    phrases_json = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604/chains_800_unique_phrases.json")
    all_phrases = json.loads(phrases_json.read_text(encoding="utf-8"))

    # The project uses the first 100 phrases — collect all chain steps for those
    # Chain format: 4 steps per phrase (step1=verb, step2=+obj, step3=+prep, step4=full)
    # track[13] has 300 segs = 3 chain steps per phrase (steps 1-3, step 4 is full shown in track[14])
    # We need to build the same chain steps as the apply script did
    # The simplest approach: collect unique english texts from track[14] (primary EN, not modified)
    import os
    proj_dir = Path(os.environ["LOCALAPPDATA"]) / "CapCut/User Data/Projects/com.lveditor.draft/ЦЕПИ ЦЕПИ ЦЕПИ (1)"
    content = json.loads((proj_dir / "draft_content.json").read_text(encoding="utf-8"))

    tracks = content.get("tracks", [])
    mats = content.get("materials", {})
    texts = {m["id"]: m for m in mats.get("texts", [])}

    # track[14] has the original English text (not modified)
    t14 = tracks[14]
    phrases_raw = []
    for s in t14["segments"]:
        mid = s["material_id"]
        mat = texts.get(mid, {})
        content_val = mat.get("content", "")
        try:
            parsed = json.loads(content_val)
            text = parsed.get("text", "")
        except Exception:
            text = content_val
        text_clean = text.replace("\n", " ").strip()
        phrases_raw.append(text_clean)

    unique_phrases = list(dict.fromkeys(phrases_raw))  # deduplicate preserving order
    print(f"Total segments: {len(phrases_raw)}, unique: {len(unique_phrases)}", flush=True)

    # Load existing cache if any
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    cache: dict[str, str] = {}
    if OUT_PATH.exists():
        cache = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        print(f"Loaded cache: {len(cache)} entries", flush=True)

    to_generate = [p for p in unique_phrases if p not in cache]
    print(f"Need to generate: {len(to_generate)}", flush=True)

    if to_generate:
        new_results = transcribe_batch(to_generate)
        cache.update(new_results)
        OUT_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {len(cache)} transcriptions to {OUT_PATH}", flush=True)

    # Verify
    print("\nSample transcriptions:")
    for p in list(cache.items())[:8]:
        print(f"  {p[0]!r} → {p[1]!r}")


if __name__ == "__main__":
    main()
