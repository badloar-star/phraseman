# YouTube requests and complaints

**Goal:** Persist AI-classified requests/complaints across connected channels, with accurate deduplicated counts, category/channel filters, ranked colored bars and source links. Apply owner-approved response rules.

**Architecture:** Server-only existing settings collection stores a bounded feedback catalogue and per-comment deduplication receipts. Existing comments retain classification status. A production callable classifies new batches with existing spend limits. No local OpenAI calls. Browser renders aggregate counts and samples; publication still requires exact owner approval.

**Tech:** TypeScript Cloud Functions, Firestore transactions, vanilla JS/CSS existing admin.

- [x] Pure parsing/aggregation tests: reject foreign/duplicate IDs; reuse canonical topics; count a comment once per topic; multi-channel aggregation.
- [x] Backend: AI classifier, atomic durable receipts + aggregate, skip own comments, resume after failure, bounded storage; explicit Jarvis contract.
- [x] Owner prompt: first person, commentator language, natural wisdom not platitudes, no voice/AI replies, no level/variant claims, EN/ES courses, support links, no invented promises. Retain category guidance for extra facts.
- [x] UI: fifth subsection, type/category/channel/search filters, top 15 colored horizontal bars with exact counts and source samples, classification progress and retry. Scan button includes classification; passive reads do not incur AI spend.
- [x] Verify mocked backend/UI and types; read-only review; publish functions and hosting; verify public assets. No real public replies and no local project AI requests.
