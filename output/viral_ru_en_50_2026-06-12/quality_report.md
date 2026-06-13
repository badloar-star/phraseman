# Viral Carousel Quality Report

Batch: viral_ru_en_50_2026-06-12
Posts: 50
Slides: 400
Validation: PASSED

## Format Mix

- diagnosis_ru_learner: 10
- meant_vs_heard: 10
- english_emergency_kit: 10
- live_situation_breakdown: 10
- textbook_vs_real_english: 10

## Style Mix

- dark_drama: 20
- cream_editorial: 30

## Pipeline Improvements Applied

- Deterministic 1080x1350 SVG-to-PNG rendering through sharp.
- Auto text wrapping and font shrinking before PNG export.
- Strict first-slide English marker validation.
- Contextual final-slide CTA validation with exact Phraseman spelling.
- Duplicate post, duplicate caption, counter, footer, top-label and bad-spelling guards.
- Publer CSV keeps one row per carousel, not one row per slide.
- ZIP export for batch handoff.

## GitHub References

- DataTalksClub/carousel-automation: template batch rendering pattern.
- frinyvonnick/node-html-to-image: HTML-to-image API reference.
- Hainrixz/open-carrusel: local-first carousel workflow reference.
