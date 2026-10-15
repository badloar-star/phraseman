# German Task 6C L02 authorized identity live capture v4

**Date:** 2026-10-12  
**Status:** `CAPTURED / SELF-VALIDATED / HOLD_CAPTURE_ONLY`  
**Maximum authority:** `HOLD_CAPTURE_ONLY`

This task is the separate live-capture step required by the independently
reviewed inert v4 transport. It may issue only the four closed-roster public
DWDS HTTPS `GET` requests and may write only a new timestamped German evidence
root. It does not authorize lexical admission, Task 7, learner content, RU/UK
translations, audio, mockup changes, release, publication, production writes,
English-contour edits, or use of an OpenAI/project API key.

## Frozen predecessor

| Artifact                                                                           | SHA-256                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4.ts` | `fe43a73bdc1af25124006e2bfc9f445d5feab40cc14e00712b38a045b7adfc6a` |
| `scripts/inspect_learning_v2_de_task6c_l02_identity_capture_v4.ts`                 | `09f43dd4a5e9e46e1b0dfd35fd6ac5a105e5c17707738e8e7e1783e2f10740bf` |
| `tests/learning_v2_de_task6c_l02_identity_capture_transport_v4_gate.ts`            | `32fd5d871d73dbe8e7dde34a7454f4ccc5fc1ca50ddbda84e97e1be095047aa0` |
| `docs/v2/curriculum/de/task6c-l02-identity-capture-transport-v4/README.md`         | `e4e27990457bd7897c84f29685fd1fc0a4df026cbefe1a1feeb98b5d29ad2c90` |

The exact transport input digest is
`46b37ef51279390e64dfe29f10ce256a0525684718df1a04d93ac4af43a768b2`.
The runner checks all five values both before the first request and after the
last response. A mismatch fails closed before evidence is written.

## Runner boundary

`scripts/capture_learning_v2_de_task6c_l02_identity_sources_v4.ts` uses Node
`https.request` directly. It does not call `setEncoding`, follow redirects,
decompress, transform response chunks, or accept a caller-selected URL. The
request options contain the frozen method and three application header values;
the only excluded automatic request header is the mandatory HTTP `Host`
header. DNS results, the connected peer, TLS observations, raw response
headers, raw trailers, response lifecycle flags, and Buffer-valued `data`
chunks all come from the same request/`IncomingMessage` path.

No output directory is created until all four responses pass the frozen v4
response validator and the complete 13-file map passes its in-memory
self-validator. The runner then writes a new timestamped evidence root with
exclusive file creation and rereads all 13 files through the same validator.
It never overwrites or deletes an existing path.

Run from the repository root:

```powershell
npx --no-install tsx scripts/capture_learning_v2_de_task6c_l02_identity_sources_v4.ts
```

Successful execution still means only `HOLD_CAPTURE_ONLY`. Fresh independent
German-native, exact-spec, and adversarial reviews of the live bytes are
required before a separate admission task may even be considered.

## Executed capture

- capture window: `2026-10-12T08:55:52.906Z` through
  `2026-10-12T08:55:53.518Z`;
- repository source SHA at capture start:
  `0385d872c1d3a93911432e6a4cef38a97aed5549`;
- runner SHA-256:
  `311781451a460a54ac9799f7bfb01d313d8a48e104ef0a684656e4b9c9432feb`;
- evidence root:
  `modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z`;
- exact file count: `13`;
- manifest SHA-256:
  `e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535`.

The in-memory 13-file map passed the frozen self-validator before any output
path was created. The same 13 files were then reread from disk and passed the
self-validator again. Encoded entity bytes and decoded representation bytes
are byte-identical for every row:

| Slug     |  Bytes | Entity/representation SHA-256                                      |
| -------- | -----: | ------------------------------------------------------------------ |
| `wohnen` | 105840 | `1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce` |
| `kueche` | 103719 | `6b416970816020195cb24b458209c78327f404e8d0e71b5c9f6b43692509af3e` |
| `tasse`  |  87110 | `b2c6778db4fdc35540b354128ec30370027e41ec035769cc013140a852d269bb` |
| `teller` |  74185 | `7be76f44dd449c750844755fbb553bdc5e66f9edcc3a197fdb9afcb0a5d01b9b` |

Normalized-header transcript SHA-256 values are:

- `wohnen`: `f6da2cb323390bb29f294757bad80c4e71a2a4e76605ca7af82673d6d84861b3`;
- `kueche`: `57ab4f72c9f4d6183f63926d4ef47bc174b2594058cb65df654110653e10d545`;
- `tasse`: `8d7df3bd958f07a8ef774cea7d0d44bad03076a723f43fb9241202f4749d850d`;
- `teller`: `d7dc3d71737f746f3ea73f1c55e67f89b0310f056c4715d923f587f3e254cddd`.

No canonical admission, row promotion, Task 7 unlock, learner-facing content,
translation, mockup, audio, release, publication, production mutation, English
change, deletion, commit, or push occurred. The output remains pending three
fresh independent live-byte reviews.
