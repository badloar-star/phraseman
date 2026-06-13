# Russian English Niche Viral Pattern Research

Date: 2026-06-12

## Scope

Goal: inspect Russian-language English-learning posts/Reels with very high visible engagement and extract patterns for Phraseman content.

Important limitation: Instagram, Threads, and Facebook do not expose a clean public endpoint for arbitrary competitor post discovery. Likes are often hidden in the UI and search indexing is incomplete. I therefore separated the corpus into:

- verified `100k+ likes`
- strong control posts around `80k+ likes`
- low/mid controls from the same niche

Metrics below were verified through public Instagram shortcode metadata via `instaloader`, then the top Reels were downloaded locally for visual frame inspection.

## Verified 100k+ Posts

| Shortcode | Account | Likes | Comments | Views | URL |
|---|---:|---:|---:|---:|---|
| `DKAuvQUtBlW` | `enzhe1` | 153,746 | 556 | 634,709 | https://www.instagram.com/reel/DKAuvQUtBlW/ |
| `DO5nOnWDHi2` | `inch_wilnish` | 133,128 | 807 | 1,306,092 | https://www.instagram.com/reel/DO5nOnWDHi2/ |

## Strong Control Posts

| Shortcode | Account | Likes | Comments | Views | URL |
|---|---:|---:|---:|---:|---|
| `DN1OloHWpLQ` | `enzhe1` | 82,875 | 708 | 901,026 | https://www.instagram.com/reel/DN1OloHWpLQ/ |
| `CjVibxzADv-` | `enzhe1` | 83,948 | 345 | 1,654,884 | https://www.instagram.com/reel/CjVibxzADv-/ |

## What The 100k+ Winners Had In Common

1. The hook is a situation, not a topic.
   - Example pattern: `English with a taxi driver`, `that cheap tutor for your kid`.
   - The viewer understands the scene before they understand the lesson.

2. Low-polish realism beats poster polish.
   - Handheld phone footage, face close-up, car/door/home lighting.
   - It feels like a real moment, not an educational ad.

3. The lesson appears after the emotional hook.
   - The first reason to watch is curiosity, humor, recognition, or mild cringe.
   - The English takeaway is inserted once attention is already earned.

4. It uses social identity pressure.
   - `I also say it wrong`.
   - `My kid's tutor is like this`.
   - `This is what happens when Russians translate directly`.

5. The unit of value is tiny.
   - One distinction.
   - One phrase.
   - One mini-rule.
   - One scene.

6. Captions are not doing the heavy lifting.
   - The verified 100k+ posts had empty or minimal captions.
   - This points to first-frame/video retention as the main growth lever.

## What Underperformed In The Sample

The low/mid control posts were often correct educational content but looked like generic lessons:

- isolated vocabulary list
- standard teacher card
- hashtag-heavy caption
- no adult situation
- no human conflict
- no immediate story

Useful does not automatically mean viral. Useful becomes viral when it is attached to recognition, status, humor, or a real-life problem.

## New Pipeline Rule

For every batch, include content that starts from one of these viral structures:

- `real_scene_reel`: adult real-life situation first, phrase second
- `roleplay_sketch`: Russian literal thought vs adult English version
- `native_surprise`: one weird English contrast that creates a quick mental click
- `social_identity_prompt`: asks viewers how they would say it, without shaming them
- `saveable_card`: only after the hook has a real use case

## What Changed In The Generator

Added new content types to `generate-social-mix.mjs`:

- `reel_script`
- `roleplay_sketch`
- `native_surprise`

Added output:

- `reel_scripts.csv`

These are not meant to be posted as plain text only. They are production briefs for short Reels/Stories/TikTok-style video posts, because the strongest verified examples were video-native.
