# League Progress Artifacts — design

## Goal

Replace the 12 current league icons with a more premium, legible, and distinctive DALL·E-generated set. The visual quality and material language must match the newest Daily Challenge icons while preserving the league screen's existing behavior and asset contract.

## Scope

- Generate exactly 12 league icons: Copper, Bronze, Silver, Gold, Platinum, Emerald, Sapphire, Ruby, Diamond, Black Diamond, Ether, and Supreme.
- Replace only the existing files under `assets/images/levels/league-v6-icons/`.
- Keep every current filename and static `require()` mapping unchanged.
- Do not add league card backgrounds or unused variants.
- Remove the unused `league-v6-cards` assets and their dead runtime wiring.

## Visual direction

Use a unified “Progress Artifacts” system inspired by the latest assets in `assets/images/daily_task_icons/by_id/`:

- premium game-like 3D collectible rendering;
- polished gold ornament, colored enamel, gemstone accents, and controlled inner glow;
- strong centered silhouette readable at small mobile sizes;
- high material contrast and crisp bevels;
- no text, numbers, letters, logos, people, hands, or scenery;
- transparent final background with clean antialiased edges;
- consistent camera, lighting, scale, and visual density across the set.

The icon must remain understandable without relying on color alone. Each league therefore receives a different primary silhouette:

| League | Primary artifact | Material identity |
|---|---|---|
| Copper | Initiator's winged helmet | warm hammered copper, subtle teal patina |
| Bronze | Eternal torch | dark bronze, amber flame, restrained red enamel |
| Silver | Explorer's compass | polished silver, icy blue needle |
| Gold | Master artisan's hammer | rich yellow gold, deep blue enamel |
| Platinum | Orbital knowledge sphere | platinum rings, pale violet-white core |
| Emerald | Living codex | emerald crystal book, gold filigree |
| Sapphire | Royal crown | deep sapphire crystal, cool gold trim |
| Ruby | Phoenix flame relic | ruby crystal flame, dark gold base |
| Diamond | Magister owl | clear diamond facets, silver-white frame |
| Black Diamond | Thought portal | black diamond prism, violet rim light |
| Ether | Ascension crystal | floating cyan-violet crystal, gold orbitals |
| Supreme | Laureled victory cup | luminous gold trophy, white-gold laurel, multigem crown |

## Generation and review flow

1. Generate Copper and Supreme first to validate both ends of the progression.
2. Show both outputs in the Codex chat for owner review.
3. After approval, generate the remaining ten icons one at a time through the built-in DALL·E capability.
4. Use a flat removable chroma-key background during generation, then remove it locally.
5. Normalize each final to a transparent 384×384 WebP with at least 32 px top and bottom safety padding.
6. Compress final assets and replace the already-wired filenames only after visual approval.

## Quality gates

- All 12 final files are 384×384 WebP with alpha.
- Every icon has at least 32 px top and bottom transparent padding.
- No tall dark side artifacts, text, watermark, accidental letters, or background residue.
- Silhouettes remain distinct in a 64–84 px app rendering.
- The set reads as one family while rank value and visual richness rise clearly from Copper to Supreme.
- `tests/league_icon_assets.test.ts` passes after replacement.
- No source file refers to `cardImageUri` or `league-v6-cards`.

## Non-goals

- No league screen redesign.
- No changes to league names, colors, rewards, navigation, or gameplay.
- No new background cards, alternate icon sets, or speculative bundled assets.
