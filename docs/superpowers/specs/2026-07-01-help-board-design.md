# Phraseman Help Board Design

Date: 2026-07-01
Status: Draft for user review
Owner: Codex design pass

This document is a product and engineering design, not legal advice. Legal wording
must be reviewed before release.

## Goal

Add a Help Board where users ask language-learning questions, receive one
structured Compass answer, and then discuss with other users. The feature is a
Q&A board, not a general realtime chat.

The board is partitioned by both:

- `targetLang`: the language being studied, such as `en` or `fr`
- `uiLang`: the user's interface and explanation language, such as `ru`, `es`,
  `tr`, `pl`

Examples:

- English Help / RU: Russian-speaking users studying English
- English Help / ES: Spanish-speaking users studying English
- French Help / RU: Russian-speaking users studying French

No feed, topic, comment, score, report, or moderation queue is shared across
language pairs.

## Product Shape

The entry point is the existing top message button on Home. It opens a messages
surface with two tabs:

1. `Help Board`
2. `League Chat`

`Help Board` opens the current course board by default. If a user has more than
one study target, the screen shows a compact target-language switcher.

The Help Board list has four sub-tabs:

- `Hot`: active and useful topics with age decay
- `New`: newest visible topics
- `Unanswered`: topics with no human comments, even though Compass has answered
- `Best`: evergreen topics with high helpful scores

## User Flow

### Create Topic

The user taps a compose icon similar to Telegram's create-message affordance.

The form includes:

- question type: `how_to_say`, `check_phrase`, `grammar`, `translation`,
  `naturalness`, `other`
- title
- question body
- optional original phrase/context

On submit:

1. The client runs local moderation and basic validation.
2. A Cloud Function validates auth, age/access eligibility, board key, rate
   limits, text length, and moderation.
3. The topic is created with `compassStatus: "pending"`.
4. A server job/callable generates the Compass answer once.
5. The topic becomes visible when allowed by moderation policy. MVP can either:
   - show the topic immediately with a pending Compass answer, or
   - hold the topic until Compass completes if we want a cleaner first release.

Recommended MVP: show immediately if the user text passes moderation, with a
Compass skeleton state.

### Topic Detail

Users see:

- topic title
- question type
- author display name/avatar/aura where allowed
- original user question
- Compass answer
- human comments
- comment composer

Compass does not automatically respond to comments in v1. A future
`Ask Compass to clarify` action can be added behind limits, but it is out of
scope for v1.

### Actions

Every topic and comment has:

- Helpful vote
- Hide
- Report

Behavior:

- Helpful votes are server-authoritative, one vote per stable user per item.
- Hide is local-first and removes the item from that user's view.
- Report creates a moderation record and increments report counters.
- Admin can hide, restore, delete, mark resolved, mute/ban, and inspect context.

This mirrors the league chat safety pattern, but topic ranking requires
server-side voting integrity rather than local-only reactions.

## Compass Answer Design

Compass answers once per topic.

The answer language is `uiLang`. Examples and corrected phrases use
`targetLang`; translation questions may show both languages.

Recommended answer structure:

1. Short answer
2. Best natural version
3. Why it works
4. Alternatives by tone/register
5. Common mistake
6. One-line practice prompt

Tone:

- calm, warm, specific, and non-shaming
- plain language before grammar labels
- correct mistakes clearly without making the learner feel stupid
- avoid inflated promises like "this is always correct"
- say when context changes the answer

Research basis:

- Corrective feedback works best when the learner can notice the gap between
  their version and a better version. Explicit correction and metalinguistic
  explanation can help learners immediately because they are direct and low
  cognitive load.
- Feedback can also hurt motivation if it sounds face-threatening, so the tone
  must be respectful and specific.
- Prompt instructions should be clear, specific, include the desired format, and
  separate instructions from user context.

Sources:

- OpenAI prompt engineering guide:
  https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api
- OpenAI tone/context guidance:
  https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt
- Corrective feedback and L2 development:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9800285/
- Written corrective feedback review:
  https://journals.sagepub.com/doi/10.1177/21582440221135172

## Compass Prompt Requirements

Create a dedicated prompt module, not an inline string inside the callable.

System guidance:

- Role: language coach for Phraseman Help Board.
- Output language: `uiLang`.
- Learning target: `targetLang`.
- Output schema: structured JSON or a stable markdown-section contract.
- Safety: do not request or expose private data; refuse or redirect unsafe,
  illegal, medical, legal, financial, immigration, emergency, or confidential
  requests.
- Community fit: answer the user question, do not continue as a chat bot, do
  not mention hidden policy.

Few-shot examples should cover:

- phrase correction
- "how do I say..." request
- grammar/preposition question
- translation with context
- "does this sound natural?" question
- ambiguous question requiring context caveat
- unsafe/private-data request

## Ranking

Do not sort `Hot` by raw helpful count only. Old winners would stay at the top
forever.

Compute server-side ranking fields:

- `helpfulCount`
- `humanCommentCount`
- `lastHumanActivityAt`
- `createdAt`
- `hotScore`
- `bestScore`

Suggested v1 formula:

```text
engagement = helpfulCount * 5 + min(humanCommentCount, 20) * 2
ageHours = max(1, (now - createdAt) / 3600000)
activityHours = max(1, (now - lastHumanActivityAt) / 3600000)
hotScore = (engagement + 3 / sqrt(activityHours)) / pow(ageHours + 2, 1.15)
bestScore = helpfulCount * 5 + humanCommentCount
```

Tune constants after telemetry. `Hot` uses `hotScore`, `Best` uses `bestScore`,
`New` uses `createdAt`, and `Unanswered` uses `humanCommentCount == 0`.

Stack Exchange-style hot rankings commonly combine votes/engagement and age
decay; the exact constants should be empirical.
Reference: https://meta.stackexchange.com/questions/11602/what-formula-should-be-used-to-determine-hot-questions

## Data Model

Use root collections for admin queries and account deletion coverage.

### `help_board_topics/{topicId}`

Fields:

- `boardId`: `${targetLang}:${uiLang}`
- `targetLang`
- `uiLang`
- `type`
- `title`
- `questionText`
- `contextText`
- `authorUid`
- `authorAuthUid`
- `authorName`
- `authorAvatar`
- `authorAura`
- `status`: `visible | review | hidden | deleted`
- `compassStatus`: `pending | ready | failed | blocked`
- `compassAnswer`
- `compassModel`
- `compassPromptVersion`
- `helpfulCount`
- `humanCommentCount`
- `reportCount`
- `hotScore`
- `bestScore`
- `createdAt`
- `updatedAt`
- `lastHumanActivityAt`

### `help_board_comments/{commentId}`

Fields:

- `topicId`
- `boardId`
- `targetLang`
- `uiLang`
- author fields
- `text`
- `status`
- `helpfulCount`
- `reportCount`
- timestamps

### Supporting Collections

- `help_board_topic_votes/{topicId_stableUid}`
- `help_board_comment_votes/{commentId_stableUid}`
- `help_board_reports/{reportId}`
- `help_board_moderation_queue/{itemId}`
- `help_board_rate_limits/{stableUid}`
- `help_board_bans/{stableUid}`

Client writes should go through Cloud Functions except for carefully bounded
read-only queries. Firestore rules must not allow arbitrary topic/comment
creation or moderation-field edits from the client.

## Moderation

Reuse the league chat moderation concepts:

- local pre-check for quick UX
- server moderation as source of truth
- block links/contact details/spam/hate/threats/sexual content/profanity
- moderation queue for review cases
- report flow for topic and comment
- local hide flow
- admin mute/ban support

Help Board adds these requirements:

- Topic and comment reports must include `targetLang`, `uiLang`, `topicId`, and
  item type.
- Compass answers must be reportable because Google Play treats generated AI
  content as a safety responsibility for the developer.
- If a topic is hidden/deleted, comments stay retained for moderation/accounting
  but are not visible in the app.

## Legal And Store Risk

This is a legal-risk summary, not legal advice.

The current Terms and Privacy already cover broad UGC, chat, moderation, AI, and
OpenAI processing. They should still be updated before launch to name Help Board
explicitly, because the feature adds public questions, public comments,
helpfulness ranking, local hiding, reports, and a Compass answer generated from
the user's submitted question.

### Store Policy Requirements

Apple App Review Guideline 1.2 requires UGC apps/social services to include:

- filtering objectionable material
- reporting offensive content with timely response
- ability to block abusive users
- published contact information

Source: https://developer.apple.com/app-store/review/guidelines/

Google Play UGC policy requires users to accept terms before creating UGC,
defines objectionable content/behavior, and requires in-app reporting and
blocking for public UGC. It also expects ongoing moderation appropriate to the
UGC type.

Source: https://support.google.com/googleplay/android-developer/answer/9876937?hl=en

Google Play's AI-generated content policy makes the developer responsible for
preventing offensive generated content, child-exploitation content, deceptive
content, harmful-behavior encouragement, bullying/harassment, and similar
prohibited outputs.

Source: https://support.google.com/googleplay/android-developer/answer/14094294?hl=en

The EU DSA emphasizes easy illegal-content flagging, explanation of content
removal/suspension, appeal options for moderation decisions, and minor
protection. Phraseman may not be a very large platform, but the product should
adopt simple notice/action and audit principles early.

Source: https://digital-strategy.ec.europa.eu/en/policies/digital-services-act

### Terms To Update Before Launch

In `app/legal/terms_of_use_en.json` and `app/legal/terms_of_use_en_ios.json`,
update these areas:

- Section 4: add Help Board visibility to public/social/community data.
- Section 5: explicitly list Help Board topics, comments, helpful votes, reports,
  and Compass answers as User Content/community content where applicable.
- Section 6: keep external contact details, personal data, harassment, spam, and
  false reports prohibited.
- Section 12/13: clarify that Help Board and Compass answers are educational
  support, not guaranteed teacher/professional advice.
- Section 17/18: clarify ranking, visibility, moderation, and continued
  availability are not guaranteed.

Suggested plain-language concept:

```text
Help Board topics, questions, comments, helpful votes, reports, and related
profile fields may be visible to users in the relevant language board and to
moderators. Compass answers may be generated automatically from your submitted
question. Do not submit private, confidential, sensitive, or third-party personal
information. We may rank, hide, remove, restrict, de-identify, retain, or review
Help Board content for safety, moderation, legal compliance, abuse prevention,
service integrity, or support.
```

### Privacy Policy To Update Before Launch

In `app/legal/privacy_policy_en.json` and `app/legal/privacy_policy_en_ios.json`,
update these areas:

- Section 5: Help Board visibility by `targetLang + uiLang`.
- Section 6: topics, comments, reports, helpful votes, hidden item state,
  moderation status, ranking signals.
- Section 11: Help Board question text and context may be sent to OpenAI or
  another AI provider to generate the Compass answer.
- Section 16: disclose use for ranking, moderation, abuse prevention, AI safety,
  and product improvement.
- Section 18/19: include Help Board records in retention/account deletion
  coverage. Topic/comment deletion may require de-identification rather than
  physical deletion when needed for moderation integrity.

Suggested plain-language concept:

```text
When you use Help Board, we process your topic title, question, comments,
helpful votes, reports, language pair, ranking signals, moderation metadata,
author/profile fields, timestamps, app version, and related safety signals. To
generate a Compass answer, we may send the question, selected language pair, and
limited learning context to our AI provider. Other users in the same language
board may see visible topics, comments, author display fields, helpful counts,
and Compass answers.
```

### In-App Legal UX Gates

Before a user creates a topic or comment:

- require current Terms/Privacy acceptance if not already accepted
- show a short community rule sheet the first time
- block access in `teen_safe`/under-16 restricted mode
- display an AI disclosure near Compass answer on first exposure
- provide report/hide controls on topics, comments, and Compass answers

## Admin Design

Before editing `admin/index.html`, read `docs/design/ADMIN_UI_BIBLE.md` and
keep the admin simple, categorized, icon-supported, tooltip-rich, accessible,
and free of clutter.

Add a separate admin section: `Help Board`.

Top-level admin functions:

- Board filters: `targetLang`, `uiLang`, status, date range
- Topics: inspect, hide, restore, delete, mark resolved, retry Compass
- Comments: inspect, hide, restore, delete
- Reports: queue, reason, reported item, reporter, action status
- Compass: prompt version, failed generations, retry queue, sample previews
- Moderation: muted/banned users, report history, decision notes
- Limits/flags: create/comment/vote/report limits, rollout flags by board pair
- Analytics: topics created, Compass success/fail, comments, reports, helpful
  votes, unanswered count, top board pairs

Admin UI principles:

- One page task per view.
- Dangerous actions require confirmation and a visible outcome.
- Show collection names as secondary technical metadata, not primary labels.
- Every admin action should write audit fields.

## Frontend UX Principles

Use a calm educational/community utility style, not a landing-page style.

Design rules:

- large 44px+ touch targets
- icon plus text for unfamiliar actions
- compact filters/tabs at top
- no nested cards
- no large decorative hero
- readable body text
- stable list row heights
- loading and empty states for each tab
- report/hide actions behind a compact menu to avoid clutter

`ui-ux-pro-max` design-system search suggested a playful education/community
pattern, but for Phraseman's operational Help Board we should keep the existing
app visual language and use restrained community affordances rather than heavy
claymorphism.

## Access And Cost Controls

MVP limits:

- topic creation: low daily limit per stable user
- comments: rate-limited per topic and per user
- helpful votes: one per item per stable user
- Compass answer: one generated answer per topic
- admin retry: allowed with audit, prompt version recorded

No realtime global listener for all topics. Use paginated queries per board and
tab. Topic detail can subscribe only to that topic's comments or use refresh
polling/cache-first depending on cost tests.

## Acceptance Criteria

Product:

- Home message button opens a messages surface.
- First tab is Help Board; second tab is League Chat.
- Help Board defaults to current `targetLang + uiLang`.
- The four list tabs work: Hot, New, Unanswered, Best.
- Create topic generates exactly one Compass answer.
- Compass does not answer human comments in v1.
- Topic detail shows title, user question, Compass answer, comments, composer.
- Topic/comment/Compass answer can be reported and hidden.
- Topics/comments can be voted helpful.

Isolation:

- Board pair isolation is enforced in data model, queries, Cloud Functions, and
  rules.
- Users cannot post or read across a board pair unless the UI intentionally
  switches to that pair.

Safety:

- Under-16/teen-safe users cannot access Help Board.
- Local and server moderation run before visible posting.
- Report queues include enough context for admin decisions.
- Account deletion covers topics, comments, votes, reports, bans, rate limits,
  and moderation queues.

Legal:

- Terms and Privacy are updated before release.
- Store privacy/data safety disclosures are reviewed before release.
- UGC reporting/hiding/blocking/moderation exists before store submission.
- Compass answer has AI disclosure and report flow.

Admin:

- Admin has a separate Help Board management area.
- Admin supports language-pair filters.
- Admin actions are audited and reversible where possible.

## Non-Goals For V1

- General realtime global chat
- Compass replying to every comment
- Direct messages between users
- Mentions/tags
- Follow users
- User-to-user notifications for every comment
- Monetization of Help Board topics
- Public web indexing

## Open Implementation Decisions

These can be resolved in the implementation plan:

1. Whether topics are visible while Compass is pending or only after Compass is
   ready.
2. Whether topic detail uses realtime comments or cache-first paginated refresh.
3. Whether "block user" is local-only in v1 or backed by a server user-block
   collection.
4. Whether Compass answers are stored as structured JSON or markdown with a
   validated section contract.
5. Exact names for UI labels in each supported `uiLang`.
