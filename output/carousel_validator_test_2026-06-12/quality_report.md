# Viral Carousel Quality Report

Batch: carousel_validator_test_2026-06-12
Posts: 10
Slides: 80
Validation: PASSED

## Format Mix

- diagnosis_ru_learner: 2
- meant_vs_heard: 2
- english_emergency_kit: 2
- live_situation_breakdown: 2
- textbook_vs_real_english: 2

## Style Mix

- dark_drama: 4
- cream_editorial: 6

## Pipeline Improvements Applied

- Deterministic 1080x1350 SVG-to-PNG rendering through sharp.
- Auto text wrapping and font shrinking before PNG export.
- Strict first-slide English marker validation.
- Carousel research upgrade: stronger first-slide retention bridge, save value, adult use case, and real-situation framing.
- 20 audience validator agents with hard score thresholds before export.
- Visual style remains locked to the proven themes: `dark_drama` and `cream_editorial`.
- Contextual final-slide CTA validation with exact Phraseman spelling.
- Duplicate post, duplicate caption, counter, footer, top-label and bad-spelling guards.
- Publer CSV keeps one row per carousel, not one row per slide.
- ZIP export for batch handoff.

## Audience Validators

- adult_work_call: 30+ работа и звонки, threshold 76
- busy_parent: родители 30+, threshold 74
- relocation_adult: переезд/жизнь за границей, threshold 75
- travel_practical: путешествия 30+, threshold 74
- medical_safety: медицина и безопасность, threshold 73
- service_conflict: сервис/поддержка, threshold 75
- beginner_a2: A2 боится говорить, threshold 78
- intermediate_b1: B1 хочет звучать взрослее, threshold 78
- skeptical_adult: скептик устал от инфоцыганства, threshold 80
- save_collector: сохраняет полезные карусели, threshold 82
- commenter_prompt: комментирует свои варианты, threshold 70
- instagram_scanner: быстро сканирует первый слайд, threshold 82
- facebook_reader: читает длиннее в Facebook, threshold 74
- threads_text_mindset: любит узнаваемую мысль, threshold 72
- anti_schoolbook: не хочет школьный английский, threshold 80
- tone_politeness: боится звучать грубо, threshold 80
- retention_editor: редактор удержания, threshold 84
- product_fit: потенциальный пользователь Phraseman, threshold 86
- no_generic_lessons: устал от общих уроков, threshold 82
- share_to_friend: отправляет другу, threshold 76

## GitHub References

- DataTalksClub/carousel-automation: template batch rendering pattern.
- frinyvonnick/node-html-to-image: HTML-to-image API reference.
- Hainrixz/open-carrusel: local-first carousel workflow reference.
