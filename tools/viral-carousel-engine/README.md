# Phraseman Viral Carousel Engine

Local batch generator for Russian-speaking English learner carousels.

## Commands

```bash
npm run carousel:generate
npm run carousel:validate -- --input output/viral_ru_en_50_2026-06-12/posts.json
npm run social:generate -- --count 120 --batch social_mix_30plus_2026-06-12
```

Default generation creates:

```text
output/viral_ru_en_50_2026-06-12/
  post_001/
    slide_01.png
    ...
    caption.txt
    metadata.json
  posts.json
  manifest.json
  captions.csv
  publer_upload_template.csv
  quality_report.md
output/viral_ru_en_50_2026-06-12.zip
```

## Quality Rules

- Audience: Russian-speaking English learners.
- First slide must clearly mention English.
- 7-10 slides per carousel.
- No counters, top labels, footers, logos, or decorative brand text.
- Product spelling is exactly `Phraseman`.
- Final slide is contextual and must explain that Phraseman is a mobile app.
- Final slide ends with: `Скачивай бесплатно по ссылке в шапке профиля.`
- Publer CSV uses one row per carousel; slide URLs are grouped in one cell.

## GitHub References Installed Locally

Reference repos are cloned into ignored `.codex-tmp/github-carousel-references/`:

- `DataTalksClub/carousel-automation` for template batch rendering ideas.
- `frinyvonnick/node-html-to-image` for HTML-to-image API patterns.
- `Hainrixz/open-carrusel` for carousel editor/export workflow ideas.

The production generator does not depend on those repos at runtime. It uses `sharp`
for deterministic SVG-to-PNG rendering and `archiver` for ZIP output.

## Social Mix Pipeline

`social:generate` creates a broader Instagram/Facebook/Threads content mix for
Russian-speaking English learners aged 30+:

- text-first Threads posts
- Facebook discussion/story posts
- Instagram saveable cards
- phrase banks
- mistake fixes
- comment prompts
- carousel seeds

Default output:

```text
output/social_mix_30plus_2026-06-12/
  social_posts.json
  threads_text_posts.csv
  instagram_mix_posts.csv
  facebook_mix_posts.csv
  all_platform_mix.csv
  reel_scripts.csv
  strategy_report.md
  media/*.png
```

The core rule is adult usefulness first: work, doctors, banks, travel,
children's school, rent, documents, support, interviews, presentations, and
other real 30+ situations.

After verified 100k+ Instagram Reel research, the generator also produces:

- `reel_script` - live situation first, English lesson second
- `roleplay_sketch` - Russian literal thought vs adult English version
- `native_surprise` - one weird English contrast with a fast reveal

These are meant as short-form video briefs, not just text posts.
