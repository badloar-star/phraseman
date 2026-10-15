# German Learning V2 — Task 6B1 lexical review receipt 2026-10-08

**Recorded reviewer verdict:** bounded Task 6B1 source implementation
`ACCEPTED`.

**Final findings:** exact-spec review `P0=0`, `P1=0`, `P2=0`; quality review
`P0=0`, `P1=0`, `P2=0`.

**Scope:** one canonical German lexical-sense row for `Nachbarin`, its closed
item-specific source evidence, the lexical-only evidence resolver and Task 6
kernel seam, plus the focused lexical gate. This receipt records the external
review results; it is not a self-approval, full Task 6 completion, learner
session approval or release approval.

## Exact reviewed freeze

| Artifact                                                                 | SHA-256                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts`   | `e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59` |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts`       | `8c3b4650337fcb7502f4ad848464363d4cf9575a9fc0bcd76d06176438e6b045` |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `e40ca8faa4524f44436b5f838bc7d6eb60a3905c5f6611f70f3265db0861b0b0` |
| `modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts`     | `4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d` |
| `tests/learning_v2_de_lexical_registry_gate.ts`                          | `61b0cd798872a0eb3621fa223f369613c41432e3898822a44172cd68c6e31a08` |

The independent verifier recorded identical before/after hashes in
`.tmp/de-task6b1-lexical-row/verify-freeze4/hash-before.log` and
`.tmp/de-task6b1-lexical-row/verify-freeze4/hash-after.log`.

## Reviewer identities and scope boundaries

- `de_task6b1_freeze4_spec` performed the fresh exact-spec review of the final
  bounded integration bytes and returned `PASS`, `P0=0`, `P1=0`, `P2=0`.
- `de_task6b1_freeze4_quality` performed the fresh quality review of the final
  bounded integration bytes and returned `PASS`, `P0=0`, `P1=0`, `P2=0`.
- `de_task6b1_native` performed the German source-fidelity review on the
  unchanged evidence module at SHA
  `8c3b4650337fcb7502f4ad848464363d4cf9575a9fc0bcd76d06176438e6b045`
  and lexical JSON at SHA
  `e40ca8faa4524f44436b5f838bc7d6eb60a3905c5f6611f70f3265db0861b0b0`.
  It also independently rechecked the live DWDS response. This was a
  source/native review; it did **not** review the later base-contract or test
  integration bytes.
- `de_task6b1_verifier` independently ran deterministic gates against the
  final five-file freeze and confirmed hash stability. Its logs are under
  `.tmp/de-task6b1-lexical-row/verify-freeze4/`. Deterministic verification is
  not a substitute for the separate spec, quality or source-native reviews.

No reviewer authored or mutated the reviewed source files.

## Canonical row and evidence boundary

The registry contains exactly one row:

- canonical ID: `de_lex_l01_c01_nachbarin_v1`;
- source plan: `de_lex_plan_l01_c01_nachbarin_v1`;
- lemma and sense: `Nachbarin` — `female person living nearby`;
- noun package: `die Nachbarin`, plural `Nachbarinnen`;
- verb fields: all `null`;
- production policy: `productive`, region `null`;
- evidence IDs:
  `DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001` and
  `DE-REG-BASELINE-001`.

The item-specific record supports only the lemma, exact sense, noun POS,
gender/article and plural. Its declared limitation is
`NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY`. Productive
Germany-baseline use is therefore separately bound to `DE-REG-BASELINE-001`;
it is not inferred from dictionary silence. The resolver is lexical-only,
requires the evidence record's canonical ID and supported claims to match the
current lexical row, and does not widen grammar, phrase-frame or pronunciation
evidence acceptance.

The focused result is:

```text
TASK6_CONTRACT_KERNEL_PARTIAL lexical=PASS actualTask5Plans=BOUND verifiedLexicalItemEvidenceRows=1 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD
```

`verifiedLexicalItemEvidenceRows=1` means that the single bounded registry row
passed the source, identity and contract checks. `rowsPromoted=0` remains the
workflow admission counter: this receipt does not claim release promotion.

## Source capture and current verification dates

The historical transport cache metadata remains provenance, not a runtime or
required-gate dependency:

- cache capture/access date: `2026-10-07`;
- cache path:
  `.tmp/de-task6a-exact-transport/.cache/47db1ae871efbfe6dfe9aa8874eed57219c125b38d9153d0a99a577d7fbafb02.json`;
- cache SHA-256:
  `ed554682fa1947a20f780615a6768da1d4c95703d4fac1d9ad1bdba4ad4644f5`;
- recorded response size: `69935` bytes;
- recorded response SHA-256:
  `550baada63bde85a8cecd4faf23048b0e96df8af528577a78265dc9acfeec895`.

Independent source verification occurred on `2026-10-08`. The source/native
reviewer confirmed the same live DWDS response size and hash, the article
`https://www.dwds.de/wb/Nachbarin#d-1-1`, the definition
`weibliche Person, die in unmittelbarer Nähe wohnt`, and the forms
`die Nachbarin` / `Nachbarinnen`. The normalized definition is 49 characters
with SHA-256
`1fe61df7ff89d0230f07258661b1d9f88dd6ba51b7de9f147c230b543676b004`.

The core lexical gate validates the committed typed provenance and definition
identity without reading the ignored cache. It therefore runs in a clean
checkout. Live transport/source verification remains a separate review action
and is not simulated by the core gate.

## TDD and repair history

The implementation remained fail-closed through the following meaningful RED
cases. Logs are under `.tmp/de-task6b1-lexical-row/`.

1. `red-positive.log`: the initial canonical row failed with
   `undeclared_evidence_id`; the lexical-only item-evidence seam was absent.
2. `red-baseline-policy.log`: a row could change its production policy while
   retaining the same dictionary evidence; the separate baseline policy check
   was added.
3. `freeze1-red-full-parser.log`: standalone parsing accepted the trusted item
   registry, but the full course parser did not thread it through its lexical
   loop.
4. `freeze1-red-cache-independence.log`: an injected failure proved that the
   required gate depended on an ignored `.tmp` cache. Mandatory disk reads were
   removed while provenance metadata was preserved.
5. `freeze2-red-evidence-row-scope.log`: the Nachbarin item evidence could be
   reused by another lexical row. Row identity and supported-claim matching
   were added for standalone, full-blueprint and kernel paths.
6. `freeze3-red-canonical-wrapper.log`: the canonical serializer omitted the
   trusted lexical registry when calling the full parser. Explicit forwarding,
   exact-row roundtrip, idempotence and evidence-array-order checks were added.

The final lexical gate also rejects altered date, anchor, hashes, source claim,
source-plan ID, canonical ID, unknown or colliding evidence IDs, duplicate item
evidence, TEMP authority laundering, production or packet-contact overclaims,
missing baseline, missing noun package, untrusted input, another row citing the
item evidence, and the same canonical ID with altered lemma or sense.

## Deterministic verification

The following focused commands passed on the final freeze:

```text
npx --no-install tsx tests/learning_v2_de_lexical_registry_gate.ts
npx --no-install tsx tests/learning_v2_de_phrase_frame_gate.ts
npx --no-install tsx tests/learning_v2_de_pronunciation_registry_gate.ts
npx --no-install tsx tests/learning_v2_de_blueprint_schema_gate.ts
```

Decisive outputs and logs:

- lexical: one verified item-evidence row, zero promoted rows, Task 7 contacts
  unverified; `verify-freeze4/lexical-registry-gate.log`;
- phrase frames: `PASS`, quantity `UNVERIFIED_UNTIL_TASK7`, native judgement
  `REQUIRED`, zero promoted rows; `verify-freeze4/learning_v2_de_phrase_frame_gate.log`;
- pronunciation: `PASS`, actual lesson owner bound, packet contacts
  `UNVERIFIED_UNTIL_TASK7`, zero promoted rows;
  `verify-freeze4/learning_v2_de_pronunciation_registry_gate.log`;
- full blueprint closed schema: `PASS`, completeness intentionally separate;
  `verify-freeze4/learning_v2_de_blueprint_schema_gate.log`.

Scoped strict TypeScript passed for the four TypeScript files:

```text
npx --no-install tsc --noEmit --pretty false --skipLibCheck --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop true modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts tests/learning_v2_de_lexical_registry_gate.ts
```

The empty verifier log `verify-freeze4/ts-strict-4.log` records exit `0`.
Scoped ESLint also passed with exit `0` for those same four TypeScript files;
the empty log is `verify-freeze4/eslint-4.log`.

```text
npx --no-install eslint modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts tests/learning_v2_de_lexical_registry_gate.ts
```

The recenter command passed all 31 tests:

```text
node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs content/learning-v2-course/pipeline/recenter_pack.test.mjs content/learning-v2-course/pipeline/recenter_receipt.test.mjs
```

`verify-freeze4/recenter-3.log` records `tests 31`, `pass 31`, `fail 0`,
`cancelled 0`, `skipped 0`, `todo 0`.

## Formatting and diff evidence

The four companion files — item evidence, lexical JSON, Task 6 kernel and
lexical gate — pass scoped Prettier. The whole
`course_blueprint_contract_de_v1.ts` remains legacy formatting debt and still
fails a whole-file Prettier check; `verify-freeze4/prettier-5.log` records that
warning. This is not reported as a five-file Prettier pass.

```text
npx --no-install prettier --check modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts tests/learning_v2_de_lexical_registry_gate.ts
```

Root independently extracted and compared the following B1-touched
base-contract fragments in memory: the new evidence import,
`assertLexicalEvidenceIds`,
standalone registry wrapper, lexical wrapper, canonical wrapper, and the
changed `validateLexicalSense` and `parseGermanCourseBlueprintDeV1` signatures
all matched Prettier output exactly. The base file was not globally reformatted.

`verify-freeze4/diff-5.log` records the bounded tracked diff, and the verifier's
hash-before/hash-after logs prove that verification did not mutate the five
reviewed source files.

## Accepted Task 6B0 dependency

Task 6B1 depends on the previously accepted Task 6B0 registry contract kernel.
Task 6B0 freeze6 received fresh exact-spec/native regression and quality
reviews with no open findings, plus independent deterministic verification.
B1 then added only the reviewed lexical item-evidence seam. The current kernel
identity is:

```text
modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts
4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d
```

The B0 limitations remain active: the kernel is bounded semantic validation,
not a general German NLP oracle; phrase-frame quantity and native phrase
judgement remain later-stage work; pronunciation packet contacts remain
unverified until Task 7; and no claim is made that all lexical plans or all
German verb valencies have been adjudicated.

## Explicit HOLD boundary

- Task 6 remains `PARTIAL`; this receipt covers B1 only.
- Task 7 packet materialization and exact lexical packet contacts are
  `UNVERIFIED`.
- No phrase-frame or pronunciation registry data was promoted by B1.
- No RU/UK learner-facing session, prompt, distractor, feedback, audio or
  localization was authored.
- No full-course lexical completion, all-verb adjudication or release readiness
  is claimed.
- Learner authoring, release, audio, mockup and deployment remain `HOLD`.
- No commit, push, deployment, key use or API call is part of this receipt.

## Next safe step

After a fresh guardian reread and a separately bounded Task 6B2 packet, the
next safe action is **source adjudication of `Aufzug` as a B2 candidate only**.
It is not authorization to create another canonical row, author a packet or
learner session, or begin release work.
