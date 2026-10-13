# German Task 6C L02 capture producer v3

**Date:** 2026-10-12  
**Status:** `OFFLINE CONTRACT GREEN / PRODUCER NOT WIRED OR RUN`  
**Authority:** `HOLD_CAPTURE_ONLY`

This packet defines a bounded successor capture producer for exactly four
German L02 DWDS rows. It does not change the existing v2 transport, preparation
script, fail-closed GitHub workflow, remote-governance validator, Task 5 v2, or
any English or learner-facing content. The current workflow still exits with
`CAPTURE_PRODUCER_AND_EXTERNAL_GOVERNANCE_NOT_READY`; it does not invoke these
scripts and cannot create an attestation.

## Frozen predecessors

The v3 input digest binds these exact predecessors:

| Input                     | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Task 5 v2 bytes           | `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23` |
| Task 5 v2 canonical body  | `3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3` |
| transport v2 input digest | `d241bc8dfbeb828712972d58e8070aedc7ab9f7f5edf88d143902d3ff3c1163a` |
| transport v2 module       | `71dbacbe5c43ef32c956f8a8d1dc4c427c6ee8870232dc2bd07ea74f4afed752` |
| v2 preparation script     | `84f32d2592cd8efdc8d7b764efe1d3e49cbe4cd7950e2717ed0b83919307192a` |
| fail-closed workflow      | `5a0ed33bd69a70eee644e00266aecf0f35126ce1097f5f0d7f11d9fc6476b4a6` |

The successor digest also hashes a closed, path-sorted list of all four v3
modules and all three v3 scripts. There is no generic `captureScript` field.
Changing any executable byte changes the v3 digest; changing a frozen
predecessor is rejected before a digest can be returned.

## Closed roster

| source plan                     | lemma    | chapter      | checkpoint       | exact URL                           | slug     |
| ------------------------------- | -------- | ------------ | ---------------- | ----------------------------------- | -------- |
| `de_lex_plan_l02_c01_wohnen_v1` | `wohnen` | `de_l02_c01` | `de_l02_c01_s08` | `https://www.dwds.de/wb/wohnen`     | `wohnen` |
| `de_lex_plan_l02_c01_kueche_v1` | `Küche`  | `de_l02_c01` | `de_l02_c01_s08` | `https://www.dwds.de/wb/K%C3%BCche` | `kueche` |
| `de_lex_plan_l02_c02_tasse_v1`  | `Tasse`  | `de_l02_c02` | `de_l02_c02_s16` | `https://www.dwds.de/wb/Tasse`      | `tasse`  |
| `de_lex_plan_l02_c02_teller_v1` | `Teller` | `de_l02_c02` | `de_l02_c02_s16` | `https://www.dwds.de/wb/Teller`     | `teller` |

No caller can supply another URL, row, output root, repository, ref, commit,
network adapter, request header, or redirect policy.

## Runtime boundary

The production producer has a zero-argument entry point and fails before DNS
or file writes unless all of these are simultaneously true:

- `GITHUB_ACTIONS=true`, `CI=true`, and `RUNNER_ENVIRONMENT=github-hosted`;
- repository `badloar-star/phraseman`;
- event `workflow_dispatch` on protected `refs/heads/master`;
- exact workflow identity at `refs/heads/master`;
- lowercase 40-hex source SHA, equal workflow SHA and checked-out `HEAD`;
- real current directory equals the real `GITHUB_WORKSPACE`;
- `git status --porcelain=v1 --untracked-files=all` is empty;
- `RUNNER_TEMP` is an absolute, existing, non-symlink directory;
- exact root `$RUNNER_TEMP/learning-v2-de-task6c-l02-capture-v3` is absent.

The CLI does not accept arguments. Its network path calls Node `https`
directly; there is no injectable production adapter and no `fetch` fallback.
The offline tests call only pure validation/building functions with synthetic
bytes. They never call the producer entry point, DNS, HTTPS, GitHub, an
attestation service, or a remote-governance command.

## Network and byte protocol

The only allowed scheme/host/port are `https:`, `www.dwds.de`, and 443. User
info, query strings, fragments, redirects, private/reserved DNS results,
private/reserved connected peers, a peer outside the resolved set,
unauthorized TLS, TLS below 1.2, or the wrong certificate host are rejected.
DNS is resolved first and the request is pinned to a validated public address.
IPv6 classification denies the IETF protocol-assignment, documentation,
deprecated 6to4, and other listed non-global ranges inside `2000::/3`; merely
belonging to global-unicast space is not treated as proof of public reachability.

Request headers are the exact v2 headers. Response bytes come from
`IncomingMessage` chunks, after HTTP transfer framing and before content
decoding. `rawHeaders` are preserved in the canonical header transcript;
normalized rows use lowercase names, trimmed optional whitespace, and a stable
name/value sort. `identity`, `gzip`, Brotli, and deflate are decoded
deterministically. Multiple or comma-stacked content codings, noncanonical
content type, invalid UTF-8, wrong canonical link, title, headword, or source
anchor fail closed. Encoded bodies have a fixed maximum size. Compressed
codings also receive the decoded-size limit inside zlib, before an oversized
output buffer can be completed.

## Exact evidence root

The root contains exactly 13 regular files:

- `manifest.json`;
- four `headers/<slug>.normalized.json` files;
- four `encoded-entity/<slug>.bin` files;
- four `decoded-representation/<slug>.html` files.

JSON is recursively key-sorted, compact UTF-8 with exactly one final LF. The
manifest binds the v3 input digest, frozen predecessor, Task 5, workflow,
source SHA, closed network policy, all byte descriptors, DNS/TLS observations,
and capture window. A deterministic self-check reconstructs all 13 expected
files and rejects any mismatch.

Every manifest has these immutable authority values:

- `canonicalAdmission: FORBIDDEN`;
- `rowsPromoted: 0`;
- `task7Unlock: false`;
- `learnerFacing: false`;
- `releaseAuthorized: false`;
- `translationsPresent: false`.

## Deterministic archive and predicate

The archive builder accepts only the exact 13-file allowlist. It emits a pure
ustar buffer with byte-sorted paths, regular files only, mode `0644`, uid/gid
zero, mtime zero, empty owner names, exact checksums and padding, and two final
zero blocks. It has no clock, filesystem, network, compression, or caller-path
input.

The predicate is canonical JSON with type
`https://phraseman.app/attestations/learning-v2-de-task6c-l02-capture/v3`.
It binds the v3 contract and implementation hashes, predecessor, Task 5,
workflow/repository/ref/source SHA, manifest, all twelve evidence descriptors,
network/DNS/TLS policy, deterministic tar subject name, media type
`application/x-tar`, digest and length, and all HOLD authority values. It is
not a signature, receipt, Sigstore bundle, attestation, or admission.
The predicate builder accepts the validated exact 13-file map and archive
bytes, reconstructs the deterministic tar from those files, and requires byte
equality before deriving any descriptor. A caller-supplied digest, length, or
arbitrary regular file cannot become the predicate subject.

## Files

| Purpose                          | Path                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- |
| closed successor contract/digest | `modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3.ts` |
| guarded Node HTTPS producer      | `modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3.ts`          |
| deterministic ustar builder      | `modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3.ts`           |
| canonical predicate builder      | `modules/learning-v2/curriculum/de/task6c_l02_capture_predicate_de_v3.ts`         |
| inert producer CLI               | `scripts/produce_learning_v2_de_task6c_l02_capture_v3.ts`                         |
| inert archive CLI                | `scripts/build_learning_v2_de_task6c_l02_capture_archive_v3.ts`                   |
| inert predicate CLI              | `scripts/build_learning_v2_de_task6c_l02_capture_predicate_v3.ts`                 |
| producer/transport offline gate  | `tests/learning_v2_de_task6c_l02_capture_producer_v3_gate.ts`                     |
| archive offline gate             | `tests/learning_v2_de_task6c_l02_capture_archive_v3_gate.ts`                      |
| predicate offline gate           | `tests/learning_v2_de_task6c_l02_capture_predicate_v3_gate.ts`                    |

## Offline verification only

These commands are safe because they use synthetic bytes and do not invoke a
producer CLI or remote API:

```powershell
npx tsx tests/learning_v2_de_task6c_l02_capture_producer_v3_gate.ts
npx tsx tests/learning_v2_de_task6c_l02_capture_archive_v3_gate.ts
npx tsx tests/learning_v2_de_task6c_l02_capture_predicate_v3_gate.ts
```

The existing v2 transport/workflow and remote-governance offline gates remain
separate. The real remote-governance verifier is expected to stay nonzero until
its external conditions are actually proven.

## Residual boundary

This packet has not performed a capture and has no real evidence root, archive,
predicate, workflow run, artifact, attestation, signing certificate, Rekor
entry, receipt, production loader, canonical lexical admission, Task 7 unlock,
translation, learner session, owner mockup, publication, or release. Wiring the
producer into the workflow, granting write/OIDC permissions, executing it, and
verifying a Sigstore/GitHub attestation are separate security-critical changes
that require fresh review and explicit authority.
