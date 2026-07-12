# Remove Constellations Implementation Plan

**Goal:** Remove the Constellations game from the repository and production while preserving Arena, duels, rankings, and shared systems.

**Scope:** Remove client routes and screens, isolated server modules, deployment exports, Firestore contracts, runtime configuration, tests, and production data. Preserve unrelated historical documentation and user ledger records.

**Verification:**

- A read-only removal contract rejects active Constellations integration points.
- Arena invite index coverage protects the live incoming-invite query.
- Focused Arena, Firestore security, lifecycle, and cost-control tests pass.
- Functions compile after the server modules are removed.
- Production inventory reports zero Constellations functions, documents, and indexes.
