# Level Gift Reward Icons Audit And DALL-E Prompts

Scope: actual rewards received from level gift chests. Chest/box icons are intentionally out of scope.

## Checklist

- [x] Audited every concrete `ALL_LEVEL_GIFT_DEFS` reward id.
- [x] Created one WebP asset per reward in `assets/images/level_gift_reward_icons/`.
- [x] Added `getLevelGiftRewardIcon(giftId)` mapping in `constants/levelGiftRewardIcons.ts`.
- [x] Added coverage test for reward id mapping and physical asset existence.
- [x] Connected reward icons in the single gift reveal modal.
- [x] Connected reward icons in the premium dual gift reveal modal.
- [x] Connected reward icons on the progress map milestone and active gift rows.
- [x] Connected reward icons in the saved level gifts inventory screen.
- [x] Kept chest/box icons separate for the other chest-icon session.

## Visual Rules

- Transparent background, WebP output, square canvas.
- No text, no numbers, no letters, no UI labels.
- No chests, wrapped boxes, crates, or generic present boxes for reward icons.
- Each icon must communicate the reward itself at 38-106 px.
- Match the app style: polished mobile game reward icon, soft glow, crisp silhouette, readable shape, gold/blue/purple accents without becoming one-note.

## Master Prompt

Use this base prompt, then append the reward-specific line from the table.

```text
Premium mobile game reward icon for a language-learning app, transparent background, centered object, crisp readable silhouette, 3/4 view, soft cinematic rim light, subtle gold and blue accents, polished semi-realistic 3D illustration, compact square composition, no text, no letters, no numbers, no chest, no wrapped gift box, no UI frame.
```

## Reward Prompt Bank

| Reward id | Prompt suffix |
| --- | --- |
| `energy_full` | Full energy refill: bright lightning battery core overflowing with golden electric sparks. |
| `energy_plus1` | One extra energy slot: single glowing energy capsule with a small attached spark node. |
| `energy_plus2` | Two extra energy slots: paired electric capsules connected by blue-gold arcs. |
| `energy_plus3` | Three extra energy slots: triangular cluster of three charged cells with epic glow. |
| `xp_50` | Small instant XP reward: compact starburst token with modest blue-gold shine. |
| `xp_100` | Medium instant XP reward: brighter experience crystal medal with layered sparkle. |
| `xp_250` | Large instant XP reward: heavy luminous experience gem with strong golden aura. |
| `xp_bank_150` | Stored double-XP bank: small sealed energy vault with glowing XP flame inside. |
| `xp_bank_300` | Rare stored double-XP bank: reinforced blue-gold energy vault, more luminous. |
| `xp_bank_600` | Epic stored double-XP bank: ornate charged vault with large radiant core. |
| `premium_xp_bank_1000` | Premium XP bank: black-gold royal energy vault with purple highlights and intense core. |
| `xp_2x_24h` | 24 hour double XP: twin flame burst orbiting an experience star. |
| `xp_2x_48h` | 48 hour double XP: epic rocket-like comet trail around a radiant star core. |
| `focus_10m_25` | Short focus boost: small stopwatch with glowing green-blue focus ring. |
| `focus_15m_50` | Strong focus boost: ornate stopwatch with larger gold ring and concentrated beam. |
| `hint_1` | One hint: single luminous idea bulb with tiny language spark. |
| `hint_3` | Three hints: cluster of three small idea lights around a central bulb. |
| `shards_3` | Three knowledge shards: three small cyan crystal fragments. |
| `shards_6` | Six knowledge shards: richer fan of six blue-purple crystal fragments. |
| `shards_10` | Ten knowledge shards: epic pile of many radiant crystal fragments. |
| `prem_shards_10` | Premium ten shards: black-gold base with ten purple-blue crystal fragments. |
| `prem_shards_15` | Premium fifteen shards: larger royal cluster of purple crystals and gold rim light. |
| `prem_shards_20` | Premium twenty shards: epic premium crystal hoard with intense gold aura. |
| `arena_extra_5` | Extra arena plays: stylized arena ticket with crossed duel sparks, no numbers. |
| `chain_shield_1` | One streak shield: single polished shield protecting a small glowing chain link. |
| `chain_shield_3` | Three day streak shield: stronger layered shield with three linked chain arcs, no digits. |
| `wager_discount_25` | Wager discount: lucky dice beside a sliced golden discount token, no percent sign. |
| `club_boost_free` | Club boost: small team crest with three abstract player silhouettes and upward glow. |
| `pack_voucher_48h` | Pack voucher: open learning card pass with hourglass glow, no box, no text. |
| `prem_pack_48h` | Premium pack access: black-gold learning pass with purple hourglass glow. |
| `choice_3_level` | Choice reward: three floating reward cards fanned out with question-star core, no gift box. |
| `cosmetic_avatar_common` | Common avatar cosmetic: friendly profile medallion with clean blue frame. |
| `cosmetic_avatar_aura` | Avatar aura cosmetic: profile medallion surrounded by soft magical ring. |
| `premium_cosmetic_avatar` | Premium avatar cosmetic: royal black-gold profile medallion with purple gem. |
| `premium_cosmetic_aura` | Premium aura cosmetic: profile medallion with layered purple-gold halo. |
| `prem_level_unlock_negotiator` | Unlock Negotiator level: elegant handshake seal with diplomatic gold-blue light. |
| `prem_level_unlock_dark_logic` | Unlock Dark Logic level: obsidian logic cube with violet neural lines. |
| `prem_level_unlock_wild_west` | Unlock Wild West level: sheriff star and desert card motif, no text. |
| `prem_level_unlock_royal_tea` | Unlock Royal Tea level: royal teacup crest with gold steam and jewel accent. |
| `prem_level_unlock_peaky_blinders` | Unlock Peaky Blinders level: vintage cap silhouette with dramatic gold rim light, no logo. |

## Current Artifact Coverage

All 40 reward ids have matching WebP files and are listed in `LEVEL_GIFT_REWARD_ICON_IDS`.
