# German Task 6 v2 migration authority — Phase A

**Date:** 2026-10-12  
**Status:** `HOLD_MIGRATION_PHASE_A`  
**Maximum authority:** contract and evidence migration only

Phase A creates a new additive German Task6-v2 contract surface bound to Task5
v2 canonical body SHA
`3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3`.
It does not modify or import the Task6-v1 authority surface. Existing canonical
IDs `de_lex_l01_c01_nachbarin_v1` and `de_lex_l01_c02_aufzug_v1` remain
unchanged and are listed only as a preservation boundary. The preservation
claim is fail-closed against the exact v1 lexical-evidence module, Task6
contract, canonical-registry byte and canonical-body identities, and canonical
registry gate. Those v1 bytes are preservation anchors only; they are not v2
evidence and cannot admit a v2 row.

The L02 source-admission candidate remains content-addressed by
`d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c`;
its live capture manifest remains
`e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535`.
Evidence membership is not canonical admission. The separate productive de-DE
regional baseline `DE-REG-BASELINE-001` remains required; DWDS does not replace
that authority.

For `wohnen`, the only adjudicated meaning is the `d-1-1` residence core. The
contract records an `intransitive residence frame`, `INSEPARABLE`, auxiliary
`haben`, and ordered slots `subject`, `residence-location complement`.
Complement obligatoriness and case government remain explicitly `UNCLAIMED`.
The `d-1-2` temporary-lodging sense, metaphorical examples, object frames,
role reordering and extra slots are rejected.

Authority remains fail-closed:

- `rowsPromoted: 0`;
- `canonicalAdmission: FORBIDDEN`;
- `task7Unlock: false`;
- `learnerFacing: false`;
- `phraseClaims: false`;
- `releaseAuthorized: false`.

No L02 phrase frame, Task7 contact, learner-facing RU/UK material, audio,
mockup, runtime, release, publication or production authority is created.
Canonical materialization is a separate Phase B and requires GREEN Phase A
plus fresh native, exact-spec and adversarial review of the frozen Phase A
bytes.
