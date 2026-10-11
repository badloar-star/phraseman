# German Learning V2 — Task 6B2 source adjudication draft: `Aufzug`

**Status:** `HOLD — awaiting independent native-German and exact-spec review`.

## Question

Does the restricted Task 5 candidate `de_lex_plan_l01_c02_aufzug_v1` have
source support for exactly the building-lift sense, noun category, article and
plural? This draft does not decide curriculum placement, productive policy,
regional status, packet contact, release readiness or learner-facing wording.

## Fresh source observation

On 2026-10-11 an HTTP GET of
`https://www.dwds.de/wb/Aufzug` returned HTTP 200 and 106091 UTF-8 bytes. The
current full-response SHA-256 was
`3095127ec9db6895e26327875b19fbe6af03418883120ff1d8884e1991ddb042`.

The DWDS form section identifies `Aufzug, der` as a masculine noun and gives
the plural `Aufzüge`. The relevant lexical sense is the elevator/lift sense;
the source also distinguishes other numbered senses of the same lemma. The existing
candidate's sense anchor is `https://www.dwds.de/wb/Aufzug#d-1-2` and its
historical source snapshot has a different response hash. That difference is a
provenance fact, not evidence that the lexical claim is false: the current
response must be independently reviewed before any source record is accepted.

An independent dictionary cross-check, Duden's entry
`https://www.duden.de/rechtschreibung/Aufzug`, also describes the lift sense
and gives `der Aufzug` / `die Aufzüge`. It is corroboration only; it does not
replace the task's DWDS evidence boundary.

## Narrow fact/inference split

### Source-backed facts awaiting review

- lemma: `Aufzug`;
- grammatical category: masculine noun;
- article: `der`;
- plural: `Aufzüge`;
- DWDS source wording at the selected anchor: `Vorrichtung zum Hochziehen,
  Lift`, distinguished from the other numbered senses of the same lemma.

### Curriculum interpretation awaiting review

- narrowed curriculum gloss: `lift in a building`.

### Not established by these sources

- `productive` Germany-baseline policy;
- any regional-production or receptive status;
- exact Task 7 packet contact or first scored use;
- a learner-facing translation, exercise, audio, mockup, release or approval.

The mandatory limitation remains
`NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY`.

## Scope check

This Task 6B2 draft adds no lexical registry row and changes no existing
registry, evidence module, test, learner-facing source, RU/UK text, mockup,
audio, release or English-contour artifact. The already-present canonical
`Aufzug` bytes are outside this draft's authority and remain unaccepted.

## Required closure

1. Fresh independent guardian/recenter receipt bound to the exact input hashes.
2. Fresh native-German review of the exact DWDS sense, form and numbered-sense
   split, recording reviewer identity, independence, reviewed hashes and verdict.
3. Fresh exact-spec review recording the same metadata and verifying the
   limitation and scope boundary.
4. A deterministic scope diff showing no promotion or learner-facing mutation.
5. Only then may this draft receive `SOURCE_ADJUDICATED`; a separate task would
   still be required for any canonical registry action.
