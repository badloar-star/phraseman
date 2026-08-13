# Olive Noir — theme audit

Date: 2026-08-12. Scope: all persisted `ThemeMode` variants, their palette
contracts, picker/access, backgrounds, feature chrome, and static image maps.

| Theme | Existing role | Olive decision |
| --- | --- | --- |
| `dark` | Forest, green action language | Keep unchanged; Olive is not a recolor. |
| `gold` | Reward-only black-gold luxury | Keep reward identity; do not alias its metallic visuals. |
| `minimalDark` / `candyBlue` | Legacy compatibility | Keep aliases only for legacy storage. |
| `midnight`, `ember`, `aurora`, `volt` | Animated cinema family | Olive stays static: no bloom, particles, neon, orbs. |
| `business`, `businessLight` | Removed flat compatibility modes | Keep unchanged; Olive is non-flat and dark. |
| `indigo` | Default free theme | Keep default; Olive is Plus-only. |
| `sagePorcelain` | Free light calm theme | Keep light/free role; Olive is its dark premium counterpart. |

Olive Noir contract: `#050604` piano-black base, deep olive tonal surfaces,
warm ivory text `#F4ECD8`, champagne action token `#C9A84C`, muted sage success,
and restrained black shadows (maximum radius 16). Surface hierarchy comes from
tone and shadow; Olive adds no closed container outlines.

Asset decision: every Olive asset is statically required before generation. The
required suite includes picker, Season Pass, home, Flashcards, personal plans,
weekly systems, streaks, trainer, social, tournament, and referral art. Raw
generation sheets remain outside `assets/images`; final files are compressed WebP.

No data schema, collection, field, or content contract changed in this work; the
Jarvis firestore readers and contract table are therefore out of scope.
