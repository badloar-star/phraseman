# German Task 6C L02 identity capture transport v4

**Date:** 2026-10-12  
**Status:** `OFFLINE CONTRACT GREEN / LIVE CAPTURE NOT RUN`  
**Authority:** `HOLD_CAPTURE_ONLY`

This is a new, inert German-only successor contract for the four L02 DWDS
source rows. It resolves the byte-semantics ambiguity of the older capture by
requesting only HTTP identity encoding. It does not modify or supersede Task 5
v2, transport v2, producer v3, their workflow/governance files, English
content, Task 7, learner content, a mockup, publication, or release.

## Exact frozen input

The contract verifies and binds the current German Task 5 v2 bytes:

| Field                  | Exact value                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| path                   | `modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json`  |
| byte SHA-256           | `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23` |
| canonical body SHA-256 | `3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3` |

The closed roster is exactly `wohnen`, `Küche`, `Tasse`, and `Teller`, with
their Task 5 v2 source-plan, chapter, checkpoint, `d-1-1` anchor, canonical
DWDS URL, and output slug. No fifth row or caller-selected URL is accepted.

## Request and response contract

Each future live request must use all of these exact values:

- method `GET`;
- the roster row's exact HTTPS `www.dwds.de` URL, with no query, fragment,
  user info, alternate host, or alternate port;
- `Accept: text/html,application/xhtml+xml`;
- `Accept-Encoding: identity`;
- `User-Agent: Phraseman-Learning-V2-evidence/4.0`;
- redirect policy `REJECT`, maximum redirects `0`.

The capture observation must repeat the actual method, exact three-header map,
redirect mode, and redirect limit. Validation compares that observation to the
frozen request policy before accepting response bytes. A manifest that merely
hardcodes the desired policy cannot hide an observed `POST`, compressed
request, extra header, `FOLLOW`, or nonzero redirect limit.

The response is accepted structurally only for status `200`, the exact final
URL, one exact HTML UTF-8 content type, and either no `Content-Encoding` header
or one exact `identity` value. `gzip`, `br`, `deflate`, stacked values,
duplicates, invalid UTF-8, a wrong canonical link/title/headword/anchor, and a
redirect all fail closed. `Transfer-Encoding` may be absent or occur exactly
once as the OWS-trimmed, ASCII-case-insensitive token `chunked`. Chunked is
accepted only for HTTP/1.1, with no `Content-Length`, trailer declaration, or
received trailers; Node `IncomingMessage` data chunks are the dechunked entity
bytes, not a content decoding. Every other transfer coding, list, parameter,
empty value, or duplicate fails closed. Without `Transfer-Encoding`,
`Content-Length` may be absent or may occur exactly once as a canonical
unsigned decimal equal to the observed entity-byte length; duplicates,
combined values, noncanonical numbers, and length mismatches fail closed.
Validation occurs only after `end`, with `response.complete === true`, no
abort/error/close-before-end, and empty `rawTrailers`.

The headword check follows the saved DWDS structure rather than a synthetic
`<h1><b>…` shortcut. It requires exactly one
`<h1 class="dwdswb-ft-lemmaansatz">` block, an exact case-sensitive lemma in
its leading `<b>…</b>`, and only the optional plain DWDS article tail
`, der|die|das`. A wrong lemma, wrong class, additional markup, or duplicate
headword block fails closed.

Canonical link, title, headword, and source-anchor checks use a conservative
HTML lexical scan. Title/script/style/noscript/template/textarea bodies are
excluded from identity matching; nested template structure is rejected
conservatively. Script bodies using legacy `<!--` escaping or nested
`<script` tokens are rejected instead of approximating the WHATWG
double-escaped tokenizer. There must be exactly one `html`, `head`, and `body`, in the
strictly nested order
`htmlStart < headStart < headEnd < bodyStart < bodyEnd < htmlEnd`; structural
sections outside `html`, overlaps, reordered sections, and `head` nested in
`body` fail closed. Intervening element wrappers around `head` or `body` also
fail closed, keeping both as direct structural children. Canonical candidates
are counted across the entire active document; the sole semantic
`link[rel~=canonical]` must be the exact frozen representation inside the real
`head`. Source-anchor IDs are also counted across the entire active document;
the sole matching ID must be inside the real `body`. The title must occur
as exactly one start/end pair and be a direct parser-safe child of the real
`head`. Every active element carrying the identity headword class is counted;
the sole candidate must be the exact required `h1` inside the real `body`. A
semantic marker pass treats HTML attribute names as
ASCII-case-insensitive, matches `rel` as ASCII-case-insensitive
whitespace-delimited tokens, and counts conflicting or duplicate canonical
links, titles, headword classes, and IDs before requiring the one exact frozen
DWDS representation. Identity-relevant `rel`, `class`, and `id` values
containing `&` fail closed instead of approximating HTML character-reference
decoding. Thus case variants or character references cannot hide a second
identity marker. A conservative head-state check permits only parser-safe
direct head children and ASCII whitespace/comments between them. Any direct
element or non-whitespace text that would make an HTML parser auto-close
`head` rejects the document, so later lexical metadata cannot be mistaken for
active head metadata. The unsupported legacy raw/inert elements `xmp`,
`iframe`, `noembed`, `noframes`, and `plaintext`, and foreign namespace roots
`svg` and `math`, cause whole-document rejection instead of being lexically
interpreted. `title` outside the modeled head and any `select` or `frameset`
also reject the whole document, as do their parser-sensitive `option`,
`optgroup`, and `frame` forms. `noscript` is skipped in body context but
rejected as a head child because its parsing depends on the scripting flag.
Body `noscript` is accepted only through a dedicated DATA-state mini-tokenizer:
the sole permitted fallback elements are `div`, `br`, `a`, `img`, and `p`;
attributes must parse strictly and must not include `id`; `div`/`a`/`p` must
balance; `br`/`img` remain void; and the identity headword class is forbidden
on every fallback element so it cannot become a scripting-disabled duplicate.
Comments, declarations, nested
`noscript`, all raw/RCDATA/parser-state elements, malformed tags, and fake
closing tokens inside quoted attributes fail closed. This preserves marker
uniqueness under both scripting modes while admitting all 16 saved DWDS
fallback blocks.
Parser-sensitive gaps around
`html`/`head`/`body` accept only ASCII whitespace and strictly terminated
comments; non-whitespace text, abrupt/nested/malformed comment forms, or a
missing exact HTML doctype fail closed. Malformed tag/comment structure fails
closed. Main-document tag names must match the modeled ASCII HTML name grammar;
an otherwise tokenizable but unsupported name such as one containing `_` is
rejected rather than skipped, so marker-bearing custom tags cannot evade the
global inventories.
Therefore expected strings hidden in an HTML comment, template, textarea, or
raw-text body cannot rescue wrong live metadata.

Every DNS and connected-peer value must be a syntactically valid public IPv4
or IPv6 address; private, loopback, link-local, documentation, protocol-only,
multicast, and other denied ranges fail closed. The connected peer must also
match one of the resolved addresses by normalized numeric identity.

Because identity encoding is confirmed first, the preserved entity bytes
(after HTTP transfer framing removal) and decoded-representation bytes must be
byte-identical. The 13-file evidence shape still stores both copies so their
paths, lengths, hashes, and equality are explicit:

- `manifest.json`;
- four canonical normalized-header transcripts;
- four `encoded-entity/*.bin` files;
- four byte-identical `decoded-representation/*.html` files.

All JSON is recursively key-sorted, compact UTF-8, with exactly one final LF.
The self-validator rejects reordered/pretty JSON, invalid UTF-8, file-set
changes, header/body mutations, encoded/decoded divergence, invalid timestamps,
Task 5/input-digest drift, roster drift, and any authority escalation.
The 8 MiB body cap is accumulated and enforced for every chunk before
`Buffer.concat`, so multiple individually small chunks cannot bypass the cap.

## Authority boundary

Every output is fixed to:

- `status: HOLD_CAPTURE_ONLY`;
- `canonicalAdmission: FORBIDDEN`;
- `rowsPromoted: 0`;
- `task7Unlock: false`;
- `learnerFacing: false`;
- `releaseAuthorized: false`;
- `translationsPresent: false`.

There is deliberately no network producer, GitHub workflow change, signature,
attestation, runner receipt, trust root, canonical loader, lexical admission,
Task 7 unlock, learner session, or release path in this packet. The production
loader always fails with
`CAPTURE_V4_SEPARATE_AUTHORIZED_LIVE_TASK_REQUIRED`; it does not inspect local
evidence and cannot be changed by adding locally shaped files.

## Files and offline verification

| Purpose                                     | Path                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| contract, pure builders, fail-closed loader | `modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4.ts` |
| inert contract inspection                   | `scripts/inspect_learning_v2_de_task6c_l02_identity_capture_v4.ts`                 |
| structural and hostile gate                 | `tests/learning_v2_de_task6c_l02_identity_capture_transport_v4_gate.ts`            |

Safe offline commands:

```powershell
npx --no-install tsx tests/learning_v2_de_task6c_l02_identity_capture_transport_v4_gate.ts
npx --no-install tsx scripts/inspect_learning_v2_de_task6c_l02_identity_capture_v4.ts
```

The first command uses only synthetic in-memory bytes. The second only prints
the frozen contract and `HOLD` boundary. Neither opens a network connection or
writes evidence.

## Required next task before any evidence use

A separate explicitly authorized live-capture task must implement and run the
exact request outside this inert packet. It must preserve raw response headers
and bind `rawHeaders`, `httpVersion`, Buffer-valued `data` chunks, `end`,
`complete`, `aborted`, errors, close ordering, and `rawTrailers` from the same
Node `IncomingMessage`. It must not call `setEncoding`, decompress, or transform
the chunks. The adapter validates only after normal `end`; for HTTP/1.1
`chunked`, Node must already have removed chunk framing. It must enforce the
same transfer-encoding, content-length, completeness, and no-trailers rules
before producing an observation.
It must then receive fresh independent German-native, exact-spec, and
adversarial reviews. Their platform histories must supply the runner evidence;
the author, this module, a repo-local key, or a caller-provided receipt cannot
manufacture reviewer independence. Until those reviews and a separately
approved admission task pass, any future v4 capture remains `HOLD_CAPTURE_ONLY`.
