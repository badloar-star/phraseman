# 39 New Avatar Auras — Design

## Goal

Replace the rejected aura mock set with 39 wholly new animated aura designs for Phraseman. The collection must serve visibly different tastes rather than recoloring one ring. It contains 37 ordinary auras, one Plus aura, and one Pro aura.

This phase produces a review gallery only. It does not alter live ownership, prices, product IDs, or production app asset mappings.

## Non-negotiable geometry

- The avatar is a hexagon, never a circle.
- Every aura is centered on the exact hex center.
- Rotating elements follow a circular path, never an ellipse.
- Every aura uses three independently animatable transparent layers: `base`, `flow`, and `accents`.
- Each delivered layer is a 320×320 transparent WebP.
- Visible pixels keep at least 20 px transparent padding on all four sides.
- The complete aura is large enough to read around the hex but cannot cross its preview frame.
- No neighboring-atlas fragments, flat cut edges, text, logos, UI, or baked avatar.
- Motion uses transform/opacity only and respects `prefers-reduced-motion`.

## Audience spectrum and collection

### Calm and minimal — five

1. Still Halo — thin pearl ring with two quiet gaps.
2. Moonline — silver lunar arcs with one slow satellite.
3. Soft Tide — pale blue water ribbon with low-amplitude light.
4. Quiet Orbit — sparse white orbit lines and tiny points.
5. Pearl Breath — translucent pearl mist breathing around the hex.

### Nature and organic — five

6. Moss Current — moss-green living current with drifting spores.
7. Coral Bloom — warm coral petals opening around the hex.
8. Frost Petal — crystalline ice leaves with snow sparks.
9. Storm Vine — electric vine tendrils following a circular trellis.
10. Sunflower Pulse — golden petal rays and a soft green pulse.

### Technology and cyber — five

11. Neon Circuit — cyan circuit segments with scanning nodes.
12. Data Ring — blue data ticks and packet lights.
13. Quantum Grid — broken violet grid planes rotating in depth.
14. Plasma Gear — mechanical plasma teeth and an energy core.
15. Holo Scan — holographic sweep lines with calibration sparks.

### Cosmic and mystical — five

16. Lunar Sigil — moonstone runes on a broken circular seal.
17. Solar Eclipse — black-gold corona with orbiting embers.
18. Star Choir — several fine star paths moving at different speeds.
19. Nebula Gate — purple-blue gas gate with bright condensations.
20. Astral Eyes — abstract eye-shaped lights distributed around a circle.

### Aggressive and energetic — five

21. Ember Claw — red-orange claw arcs without a literal animal.
22. Magma Rift — cracked magma plates and lava particles.
23. Thunder Fang — angular electric strokes on a circular route.
24. Inferno Crown — rising flame blades with a hot core.
25. Acid Surge — toxic lime liquid lashes and droplets.

### Playful and expressive — four

26. Candy Comet — glossy candy-color comets and star sprinkles.
27. Bubble Pop — iridescent bubbles orbiting at varied sizes.
28. Pixel Party — chunky luminous pixels and arcade trails.
29. Rainbow Loop — controlled spectral ribbon with clean color separation.

### Luxury and status — four

30. Gilded Laurel — polished gold laurel fragments and dust.
31. Diamond Orbit — faceted clear crystals on a cold-white orbit.
32. Velvet Gold — deep burgundy velvet energy with gold edging.
33. Regal Wings — abstract symmetrical gold-white feather sweeps.

### Dark and rebellious — four

34. Void Thorn — black-violet thorns with restrained purple light.
35. Blood Moon — dark crimson eclipse fragments and red ash.
36. Obsidian Smoke — glossy black shards inside circular smoke.
37. Phantom Chain — spectral chain links orbiting through fog.

### Subscription signatures — two

38. Plus: Solar Sovereign — unmistakably premium white-gold solar architecture, more layered and refined than every ordinary aura.
39. Pro: Reality Breaker — the collection's strongest design: a blue-violet gravitational rupture, refracted space shards, and a controlled singularity orbit.

## Generation approach

Use four generation atlases to keep the Codex session safe. Each atlas is a strict 6×6 grid. A three-cell horizontal group contains the `base`, `flow`, and `accents` layers for one aura; unused cells remain empty. Generated files are copied immediately into the ignored `.codex-tmp/avatar-aura-v2/` workspace before any further generation.

Black or nontransparent atlas backgrounds are converted mechanically to alpha. The pipeline then splits cells, removes only background-connected noise, centers each layer as a set, applies one uniform scale per aura, and exports 117 WebPs. It never redraws a generated element during cleanup.

## Gallery

The replacement gallery shows all 39 auras in a responsive grid. Each card contains a dark animated preview and light static preview around the same hex avatar. It displays the aura name, audience family, and motion recipe. The rejected old set is not rendered anywhere in the new gallery.

## Acceptance gates

- Exactly 39 cards and 117 unique layer assets.
- Exactly 37 ordinary, one Plus, and one Pro aura.
- Every layer is 320×320 WebP with alpha.
- At least 20 px of transparent padding on every side.
- Center offset no greater than 1.5 px for each complete layer set.
- Maximum rotation radius no greater than 145 px.
- No visible pixels touch the canvas boundary.
- Every aura is visibly distinct in silhouette, palette, and accent language.
- Plus clearly outranks ordinary; Pro clearly outranks Plus.
- Gallery contains no payload from the rejected set.
- Dark/light screenshots and reduced-motion behavior are checked before presentation.

