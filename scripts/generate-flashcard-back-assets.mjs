import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'assets', 'images', 'flashcard_backs');
const SINGLE_W = 164;
const SINGLE_H = 224;
const CARD_X = 12;
const CARD_Y = 10;
const CARD_W = 140;
const CARD_H = 204;
const FAN_W = 329;
const FAN_H = 268;

const officialBacks = [
  { id: 'official_prep_in_en', bg: ['#14502a', '#041409'], accent: '#d9f3d6', foil: '#9ee6a8', pattern: 'gate', motif: 'portal_phrase' },
  { id: 'official_prep_on_en', bg: ['#811425', '#26040a'], accent: '#f5d37b', foil: '#d6a23a', pattern: 'compass', motif: 'surface_compass' },
  { id: 'official_prep_at_en', bg: ['#11345a', '#06101d'], accent: '#e8c66b', foil: '#caa34a', pattern: 'blueprint', motif: 'map_pin_target' },
  { id: 'official_prep_to_en', bg: ['#202225', '#050607'], accent: '#cfd3cf', foil: '#8a938e', pattern: 'diamond', motif: 'route_arrow' },
  { id: 'official_prep_by_en', bg: ['#7c4a20', '#1e1007'], accent: '#e7b76a', foil: '#b67a35', pattern: 'wood', motif: 'beside_marker' },
  { id: 'official_negotiator_en', bg: ['#15355c', '#06111f'], accent: '#e2b65b', foil: '#d7a948', pattern: 'seal', motif: 'deal_table' },
  { id: 'official_dark_logic_en', bg: ['#14582d', '#031108'], accent: '#d8ba68', foil: '#b98837', pattern: 'logic', motif: 'logic_case' },
  { id: 'official_wild_west_en', bg: ['#8b5527', '#1c0d05'], accent: '#edbd71', foil: '#c98436', pattern: 'sheriff', motif: 'western_badge' },
  { id: 'official_royal_tea_en', bg: ['#fff7e8', '#eac8a9'], accent: '#c58a71', foil: '#d0a85a', pattern: 'rose', motif: 'tea_cup_rose' },
  { id: 'official_peaky_blinders_en', bg: ['#222326', '#050505'], accent: '#d4d6d2', foil: '#8c918c', pattern: 'pinstripe', motif: 'cap_suit' },
];

const communityBacks = [
  { id: 'community_01_aqua_circuit', bg: ['#00a9b8', '#05343d'], accent: '#e1fff9', foil: '#6ff8e6', pattern: 'circuit', motif: 'study_circuit' },
  { id: 'community_02_coral_sunset', bg: ['#ff7658', '#6f1f26'], accent: '#ffe3b6', foil: '#ffb66a', pattern: 'sunset', motif: 'dialogue_sunset' },
  { id: 'community_03_violet_nebula', bg: ['#6f32d8', '#130921'], accent: '#f2d9ff', foil: '#a78bfa', pattern: 'nebula', motif: 'quiz_orbit' },
  { id: 'community_04_ivory_marble', bg: ['#fff9ee', '#dfc19a'], accent: '#c79c63', foil: '#d6aa68', pattern: 'marble', motif: 'library_arch' },
  { id: 'community_05_neon_grid', bg: ['#29106a', '#010211'], accent: '#00f0ff', foil: '#ff29d7', pattern: 'grid', motif: 'syntax_brackets' },
  { id: 'community_06_forest_rune', bg: ['#17643a', '#04160c'], accent: '#d8c16a', foil: '#80c970', pattern: 'rune', motif: 'word_leaf' },
  { id: 'community_07_glacier_blue', bg: ['#b8ebff', '#266b8e'], accent: '#effbff', foil: '#7ec8ff', pattern: 'ice', motif: 'memory_snowflake' },
  { id: 'community_08_ruby_velvet', bg: ['#9b1022', '#30020a'], accent: '#f4c276', foil: '#d39b45', pattern: 'velvet', motif: 'debate_podium' },
  { id: 'community_09_brass_clockwork', bg: ['#8c5a24', '#1c0d05'], accent: '#f3ca78', foil: '#c9913b', pattern: 'gear', motif: 'grammar_clock' },
  { id: 'community_10_paper_manuscript', bg: ['#f2d39d', '#9e7043'], accent: '#6f4422', foil: '#b5844d', pattern: 'manuscript', motif: 'notes_scroll' },
  { id: 'community_11_obsidian_star', bg: ['#1f2024', '#020304'], accent: '#c9d1c7', foil: '#777f79', pattern: 'obsidian', motif: 'focus_moon' },
  { id: 'community_12_mint_enamel', bg: ['#8dffe3', '#167c72'], accent: '#f2fff8', foil: '#c6f6d5', pattern: 'enamel', motif: 'flash_cards' },
  { id: 'community_13_royal_purple', bg: ['#4b1aa3', '#170633'], accent: '#f1cf78', foil: '#d6a94e', pattern: 'royal', motif: 'crown_phrasebook' },
  { id: 'community_14_desert_sand', bg: ['#deb777', '#7b5526'], accent: '#fff0be', foil: '#bf8540', pattern: 'sand', motif: 'desert_route' },
  { id: 'community_15_sakura_ink', bg: ['#fff1f4', '#d78ca2'], accent: '#b85d7a', foil: '#d8a25d', pattern: 'sakura', motif: 'sakura_journal' },
  { id: 'community_16_steel_blueprint', bg: ['#13507c', '#061725'], accent: '#bfe8ff', foil: '#6fb4dd', pattern: 'blueprint', motif: 'lab_blueprint' },
  { id: 'community_17_cyber_lime', bg: ['#173d16', '#020902'], accent: '#c8ff00', foil: '#8eea28', pattern: 'cyber', motif: 'terminal_prompt' },
  { id: 'community_18_aurora', bg: ['#1e3f8f', '#041125'], accent: '#a8fff3', foil: '#b775ff', pattern: 'aurora', motif: 'word_path' },
  { id: 'community_19_coffee_leather', bg: ['#5f3218', '#120704'], accent: '#d7a66a', foil: '#9f672e', pattern: 'leather', motif: 'coffee_notes' },
  { id: 'community_20_crystal_prism', bg: ['#caefff', '#7d76d8'], accent: '#ffffff', foil: '#ffd1ff', pattern: 'prism', motif: 'crystal_recall' },
  { id: 'community_21_midnight_moon', bg: ['#0f2d61', '#030816'], accent: '#f5d778', foil: '#9fb5ff', pattern: 'night', motif: 'moon_dictionary' },
  { id: 'community_22_teal_mosaic', bg: ['#0f7a79', '#042023'], accent: '#97ffed', foil: '#64d6c0', pattern: 'mosaic', motif: 'mosaic_tiles' },
  { id: 'community_23_amber_glass', bg: ['#d87806', '#3b1400'], accent: '#ffd179', foil: '#f0a83a', pattern: 'glass', motif: 'amber_lantern' },
  { id: 'community_24_ink_noir', bg: ['#25262b', '#030304'], accent: '#d9d7cf', foil: '#8f8b82', pattern: 'smoke', motif: 'noir_casebook' },
  { id: 'community_25_garden_botanical', bg: ['#f4f2df', '#88a86d'], accent: '#517a42', foil: '#b7c476', pattern: 'botanical', motif: 'botanical_verbs' },
  { id: 'community_26_ocean_pearl', bg: ['#167ca1', '#063142'], accent: '#dffff7', foil: '#b9e7d9', pattern: 'pearl', motif: 'ocean_pearl' },
  { id: 'community_27_crimson_chess', bg: ['#7f1018', '#220307'], accent: '#f2c46d', foil: '#c99b41', pattern: 'chess', motif: 'strategy_knight' },
  { id: 'community_28_cloud_silver', bg: ['#d9e3f2', '#7b8798'], accent: '#ffffff', foil: '#b7c4d8', pattern: 'cloud', motif: 'cloud_sync' },
  { id: 'community_29_rainbow_foil', bg: ['#f47aff', '#42e6d9'], accent: '#ffffff', foil: '#ffe070', pattern: 'foil', motif: 'rainbow_prism' },
  { id: 'community_30_slate_minimal', bg: ['#3d424b', '#12151a'], accent: '#c8ced8', foil: '#7f8998', pattern: 'minimal', motif: 'minimal_stack' },
];

const allBacks = [...officialBacks, ...communityBacks];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function patternSvg(kind, accent, foil) {
  const a = esc(accent);
  const f = esc(foil);
  switch (kind) {
    case 'circuit':
      return `<path d="M-20 45H48V20h42v34h74M12 118h52v-26h42v26h70M30 170h28v-28h68v-30h46" stroke="${a}" stroke-width="2" opacity=".35" fill="none"/><g fill="${f}" opacity=".7"><circle cx="48" cy="45" r="3"/><circle cx="90" cy="20" r="3"/><circle cx="64" cy="118" r="3"/><circle cx="126" cy="142" r="3"/></g>`;
    case 'sunset':
      return `<circle cx="${CARD_W / 2}" cy="83" r="34" fill="${f}" opacity=".28"/><path d="M8 111c34-18 60-18 94 0s54 18 82 0" stroke="${a}" stroke-width="3" opacity=".34" fill="none"/><path d="M12 132c32-12 66-12 102 0s50 12 70 0" stroke="${f}" stroke-width="2" opacity=".28" fill="none"/>`;
    case 'nebula':
      return `<path d="M33 60c43-42 115 2 78 48-30 37-82 13-62-21 17-28 55-12 43 11" stroke="${a}" stroke-width="3" opacity=".5" fill="none"/><g fill="${f}" opacity=".8"><circle cx="33" cy="43" r="2"/><circle cx="104" cy="44" r="2"/><circle cx="118" cy="142" r="2"/><circle cx="42" cy="163" r="2"/></g>`;
    case 'marble':
      return `<path d="M-8 35c34 16 28 46 72 52s37 42 82 51M22-8c8 48 54 46 54 94 0 32 28 42 58 52M-10 150c48-14 62 13 92 2 25-9 30-35 70-29" stroke="${f}" stroke-width="2" opacity=".38" fill="none"/>`;
    case 'grid':
      return `<path d="M0 0h140v204M0 20h140M0 40h140M0 60h140M0 80h140M0 100h140M0 120h140M0 140h140M0 160h140M0 180h140M20 0v204M40 0v204M60 0v204M80 0v204M100 0v204M120 0v204" stroke="${a}" stroke-width="1" opacity=".18"/><path d="M0 204 140 0M-30 204 110 0M30 204 170 0" stroke="${f}" stroke-width="2" opacity=".22"/>`;
    case 'rune':
      return `<path d="M28 46v112m0-56 28-38m-28 38 31 42M109 46v112m0-56-28-38m28 38-31 42" stroke="${a}" stroke-width="2.3" opacity=".46" fill="none"/><circle cx="70" cy="102" r="54" stroke="${f}" stroke-width="1.5" opacity=".26" fill="none"/>`;
    case 'ice':
      return `<path d="M70 20v164M24 102h92M38 48l64 108M102 48 38 156" stroke="${a}" stroke-width="1.5" opacity=".35"/><path d="M70 30 82 52H58ZM70 174l12-22H58Z" fill="${f}" opacity=".35"/>`;
    case 'velvet':
      return `<path d="M0 24c44 12 94 12 140 0M0 180c44-12 94-12 140 0M24 0c12 44 12 160 0 204M116 0c-12 44-12 160 0 204" stroke="${a}" stroke-width="2" opacity=".22"/><circle cx="70" cy="102" r="58" stroke="${f}" stroke-width="1.5" opacity=".25" fill="none"/>`;
    case 'gear':
      return `<g stroke="${a}" stroke-width="2" opacity=".42" fill="none"><circle cx="43" cy="61" r="28"/><circle cx="99" cy="142" r="32"/><path d="M43 25v72M7 61h72M19 37l50 50M69 37 19 87M99 99v86M56 142h86M69 112l60 60M129 112l-60 60"/></g>`;
    case 'manuscript':
      return `<g stroke="${a}" stroke-width="1.5" opacity=".34"><path d="M22 42h96M18 62h104M24 82h84M18 116h104M24 136h88M18 156h96"/></g><circle cx="103" cy="87" r="19" stroke="${f}" stroke-width="2" opacity=".4" fill="none"/>`;
    case 'obsidian':
      return `<path d="M70 12 95 75 132 102 94 128 70 192 46 128 8 102 45 75Z" fill="${f}" opacity=".12"/><path d="M70 30 86 84 114 102 86 120 70 174 54 120 26 102 54 84Z" stroke="${a}" stroke-width="2" opacity=".5" fill="none"/>`;
    case 'blueprint':
      return `<g stroke="${a}" stroke-width="1.3" opacity=".36" fill="none"><path d="M18 28h104v148H18z"/><path d="M18 70h104M18 134h104M42 28v148M98 28v148"/><circle cx="70" cy="102" r="44"/><path d="M26 102h88M70 58v88"/></g>`;
    case 'cyber':
      return `<path d="M16 34h56l22 30h34M22 168h50l23-34h31M70 0v204" stroke="${a}" stroke-width="3" opacity=".35" fill="none"/><path d="M24 52h40l20 28M116 152H78l-22-28" stroke="${f}" stroke-width="1.5" opacity=".45" fill="none"/>`;
    case 'aurora':
      return `<path d="M-8 145C22 78 48 142 76 70c28-72 48 6 76-38v188H-8Z" fill="${a}" opacity=".16"/><path d="M-8 166C28 102 54 158 83 89c26-62 43 2 70-30" stroke="${f}" stroke-width="8" opacity=".18" fill="none"/>`;
    case 'leather':
      return `<path d="M-10 38c42-16 67 18 107 0 24-11 40-8 56 1M-10 92c42-16 67 18 107 0 24-11 40-8 56 1M-10 148c42-16 67 18 107 0 24-11 40-8 56 1" stroke="${a}" stroke-width="2" opacity=".25" fill="none"/>`;
    case 'prism':
    case 'foil':
      return `<path d="M8 38 58 18l74 53-20 93-82 20-24-86Z" fill="${a}" opacity=".16"/><path d="M8 38l62 64 62-31M70 102l42 62M70 102 30 184" stroke="${f}" stroke-width="2" opacity=".4" fill="none"/><path d="M16 154 126 46" stroke="#ffffff" stroke-width="8" opacity=".12"/>`;
    case 'night':
      return `<circle cx="92" cy="64" r="29" fill="${f}" opacity=".28"/><circle cx="103" cy="57" r="29" fill="#06101f" opacity=".95"/><g fill="${a}" opacity=".7"><circle cx="30" cy="48" r="2"/><circle cx="42" cy="148" r="2"/><circle cx="112" cy="150" r="2"/></g>`;
    case 'mosaic':
      return `<path d="M0 42 35 8l42 26 45-22 28 54-38 32 18 58-54 35-44-25-40 14V42Z" stroke="${a}" stroke-width="2" opacity=".28" fill="none"/><path d="M35 8v158M77 34 32 166M122 12 76 191M0 96h140" stroke="${f}" stroke-width="1.5" opacity=".25"/>`;
    case 'glass':
      return `<path d="M8 30h124v144H8z" fill="${f}" opacity=".1"/><path d="M10 172 131 32M42 180 132 84M6 118 88 28" stroke="${a}" stroke-width="5" opacity=".12"/><path d="M8 30h124v144H8z" stroke="${f}" stroke-width="2" opacity=".28" fill="none"/>`;
    case 'smoke':
      return `<path d="M36 190c-38-56 52-56 10-109-31-39 32-44 19-75M91 194c-46-50 48-70 2-112-35-32 24-52 5-76" stroke="${a}" stroke-width="11" opacity=".16" fill="none"/><path d="M27 180c-24-44 46-45 12-89" stroke="${f}" stroke-width="6" opacity=".15" fill="none"/>`;
    case 'botanical':
    case 'sakura':
      return `<path d="M20 184C60 130 20 80 72 22M118 184C82 132 124 76 70 22" stroke="${a}" stroke-width="2.2" opacity=".42" fill="none"/><g fill="${f}" opacity=".42"><ellipse cx="42" cy="97" rx="10" ry="5" transform="rotate(-28 42 97)"/><ellipse cx="98" cy="106" rx="10" ry="5" transform="rotate(28 98 106)"/><ellipse cx="61" cy="54" rx="9" ry="5" transform="rotate(-24 61 54)"/></g>`;
    case 'pearl':
    case 'cloud':
      return `<path d="M20 124c-4-32 31-41 49-22 15-29 67-18 58 24 28 3 25 45-5 45H29c-34 0-37-42-9-47Z" fill="${a}" opacity=".16"/><circle cx="70" cy="99" r="36" fill="${f}" opacity=".16"/><path d="M22 145h96" stroke="${a}" stroke-width="2" opacity=".25"/>`;
    case 'chess':
      return `<g opacity=".22">${Array.from({ length: 8 }, (_, y) => Array.from({ length: 6 }, (_, x) => ((x + y) % 2 ? `<rect x="${x * 24}" y="${y * 26}" width="24" height="26" fill="${a}"/>` : '')).join('')).join('')}</g><path d="M36 38h68v128H36z" stroke="${f}" stroke-width="2" opacity=".35" fill="none"/>`;
    case 'pinstripe':
      return `<path d="M16 0v204M40 0v204M64 0v204M88 0v204M112 0v204M136 0v204" stroke="${a}" stroke-width="1.5" opacity=".25"/><path d="M70 22 118 102 70 182 22 102Z" stroke="${f}" stroke-width="2" opacity=".42" fill="none"/>`;
    case 'wood':
      return `<path d="M18 0c-9 42 13 61 0 104s8 63 0 100M64 0c14 37-14 68 0 104s-9 64 0 100M112 0c-10 44 12 72 0 106s10 63 0 98" stroke="${a}" stroke-width="3" opacity=".25" fill="none"/>`;
    case 'gate':
      return `<path d="M38 176V75c0-44 64-44 64 0v101M50 176V76c0-29 40-29 40 0v100M32 176h76" stroke="${a}" stroke-width="2" opacity=".36" fill="none"/><path d="M70 46v130M38 104h64" stroke="${f}" stroke-width="1.5" opacity=".3"/>`;
    case 'compass':
      return `<circle cx="70" cy="102" r="58" stroke="${a}" stroke-width="2" opacity=".34" fill="none"/><path d="M70 26v152M-6 102h152M28 60l84 84M112 60l-84 84" stroke="${f}" stroke-width="1.4" opacity=".26"/>`;
    case 'logic':
      return `<path d="M24 42h92v120H24zM24 82h92M48 42v120M92 42v120" stroke="${a}" stroke-width="2" opacity=".28" fill="none"/><path d="M28 158 112 46" stroke="${f}" stroke-width="2" opacity=".28"/>`;
    case 'seal':
      return `<circle cx="70" cy="102" r="59" stroke="${a}" stroke-width="2" opacity=".35" fill="none"/><circle cx="70" cy="102" r="38" stroke="${f}" stroke-width="2" opacity=".32" fill="none"/><path d="M28 102h84" stroke="${a}" stroke-width="3" opacity=".23"/>`;
    case 'sheriff':
      return `<path d="M70 24 86 76l54 2-43 33 15 54-42-31-42 31 15-54L0 78l54-2Z" fill="${a}" opacity=".14"/><path d="M70 44 82 83l40 2-32 24 12 40-32-23-32 23 12-40-32-24 40-2Z" stroke="${f}" stroke-width="2" opacity=".36" fill="none"/>`;
    case 'rose':
      return `<path d="M34 178C58 134 37 82 70 38c34 44 12 96 36 140" stroke="${a}" stroke-width="2" opacity=".35" fill="none"/><circle cx="70" cy="84" r="34" fill="${f}" opacity=".16"/><path d="M44 86c16-28 47-29 53 0-12 31-43 31-53 0Z" stroke="${a}" stroke-width="2" opacity=".36" fill="none"/>`;
    case 'ornate':
    case 'royal':
    case 'sand':
    case 'enamel':
    case 'minimal':
    default:
      return `<circle cx="70" cy="102" r="57" stroke="${a}" stroke-width="2" opacity=".28" fill="none"/><path d="M70 24 112 102 70 180 28 102Z" stroke="${f}" stroke-width="2" opacity=".32" fill="none"/><path d="M28 48c22 0 22 22 42 22s20-22 42-22M28 156c22 0 22-22 42-22s20 22 42 22" stroke="${a}" stroke-width="1.8" opacity=".32" fill="none"/>`;
  }
}

function motifSvg(kind, accent, foil) {
  const a = esc(accent);
  const f = esc(foil);
  const frame = `<circle cx="70" cy="102" r="47" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 49 103 102 70 155 37 102Z" stroke="${f}" stroke-width="1.6" opacity=".42" fill="none"/>`;
  const smallSpark = `<g stroke="${f}" stroke-width="2" stroke-linecap="round" opacity=".72"><path d="M35 61v10M30 66h10M104 61v10M99 66h10M35 133v10M30 138h10M104 133v10M99 138h10"/></g>`;
  switch (kind) {
    case 'portal_phrase':
      return `${frame}<path d="M46 139V86c0-32 48-32 48 0v53M57 139V88c0-18 26-18 26 0v51M42 139h56" stroke="${f}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M53 102h34M60 118h20" stroke="${a}" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="82" r="4" fill="${f}"/>`;
    case 'surface_compass':
      return `${frame}<ellipse cx="70" cy="124" rx="40" ry="10" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 57 84 105 70 145 56 105Z" fill="${f}"/><path d="M33 124h74M70 76v62" stroke="${f}" stroke-width="2.5" stroke-linecap="round" opacity=".72"/>`;
    case 'map_pin_target':
      return `${frame}<circle cx="70" cy="116" r="32" stroke="${a}" stroke-width="3" fill="none"/><circle cx="70" cy="116" r="17" stroke="${f}" stroke-width="3" fill="none"/><path d="M70 55c-18 0-31 13-31 30 0 24 31 54 31 54s31-30 31-54c0-17-13-30-31-30Z" stroke="${f}" stroke-width="4" fill="none"/><circle cx="70" cy="85" r="9" fill="${f}" opacity=".92"/>`;
    case 'route_arrow':
      return `${frame}<path d="M38 132c19-54 56 5 64-49" stroke="${f}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M95 76l15 5-12 11" stroke="${f}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="38" cy="132" r="6" fill="${a}"/><path d="M45 75h26M45 92h16" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'beside_marker':
      return `${frame}<path d="M52 65v78M88 65v78" stroke="${f}" stroke-width="5" stroke-linecap="round"/><path d="M41 84h22M77 122h22" stroke="${a}" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="102" r="17" stroke="${f}" stroke-width="3" fill="none"/><circle cx="88" cy="102" r="17" stroke="${f}" stroke-width="3" fill="none"/><path d="M62 102h16" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'deal_table':
      return `${frame}<path d="M34 116h72M45 133h50" stroke="${a}" stroke-width="4" stroke-linecap="round"/><path d="M38 101h24l9-11 9 11h24M50 116l15-15 8 8 8-8 15 15" stroke="${f}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M42 84h21M77 84h21" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'logic_case':
      return `${frame}<rect x="43" y="82" width="54" height="40" rx="6" stroke="${f}" stroke-width="4" fill="none"/><path d="M58 82v-10h24v10M43 101h54" stroke="${f}" stroke-width="4" stroke-linecap="round"/><path d="M48 135h14v-14M78 135h14v-14M62 135h16" stroke="${a}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    case 'western_badge':
      return `${frame}<path d="M70 56 82 88l34 3-27 20 9 34-28-20-28 20 9-34-27-20 34-3Z" fill="${f}" opacity=".94"/><circle cx="70" cy="102" r="20" stroke="${a}" stroke-width="4" fill="none"/><path d="M53 102h34" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case 'tea_cup_rose':
      return `${frame}<path d="M45 96h42v20c0 13-10 22-21 22s-21-9-21-22Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M87 101h8c11 0 11 18-1 18h-7M47 145h45" stroke="${f}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M61 83c2-17 25-16 27 1-6 15-22 16-27-1Z" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 95c-3 8-8 13-16 16" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'cap_suit':
      return `${frame}<path d="M38 81c18-13 46-13 64 0l-9 16H47Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M48 98h44M52 98l-12 42M88 98l12 42" stroke="${f}" stroke-width="4" stroke-linecap="round"/><path d="M60 111l10 16 10-16M70 127v22" stroke="${a}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'study_circuit':
      return `${frame}<rect x="45" y="72" width="50" height="62" rx="5" stroke="${f}" stroke-width="4" fill="none"/><path d="M56 84h28M56 99h22M56 114h30M40 62h20v10M100 142H80v-10M36 102h18M86 102h18" stroke="${a}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    case 'dialogue_sunset':
      return `${frame}<circle cx="70" cy="79" r="20" fill="${f}" opacity=".75"/><path d="M38 119h35v20l-12-9H38Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M70 105h32v20H82l-12 9Z" stroke="${a}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M35 145c21-10 49-10 70 0" stroke="${f}" stroke-width="3" stroke-linecap="round" opacity=".72"/>`;
    case 'quiz_orbit':
      return `${frame}<circle cx="70" cy="102" r="18" fill="${f}" opacity=".78"/><ellipse cx="70" cy="102" rx="48" ry="17" stroke="${a}" stroke-width="3" fill="none"/><ellipse cx="70" cy="102" rx="17" ry="48" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 69c8 0 14 5 14 13 0 12-14 12-14 23M70 125v4" stroke="${f}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case 'library_arch':
      return `${frame}<path d="M42 139V82c0-26 56-26 56 0v57M54 139V84c0-13 32-13 32 0v55" stroke="${f}" stroke-width="4" fill="none"/><path d="M49 139h42M54 104h32M61 121h18" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'syntax_brackets':
      return `${frame}<path d="M53 72 35 102l18 30M87 72l18 30-18 30M64 136 77 68" stroke="${f}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M50 148h40" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'word_leaf':
      return `${frame}<path d="M40 120c43-68 70-47 60 19-36 7-58-2-60-19Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M45 121c22-7 39-19 55-42M48 74h44M55 88h30" stroke="${a}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    case 'memory_snowflake':
      return `${frame}<path d="M70 61v82M35 102h70M43 75l54 54M97 75l-54 54" stroke="${f}" stroke-width="4" stroke-linecap="round"/><rect x="55" y="87" width="30" height="30" rx="6" stroke="${a}" stroke-width="3" fill="none"/>`;
    case 'debate_podium':
      return `${frame}<path d="M40 131h60M48 115h44M56 92h28v23H56Z" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M38 82h25M77 82h25M51 69v25M89 69v25" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'grammar_clock':
      return `${frame}<circle cx="70" cy="102" r="33" stroke="${f}" stroke-width="4" fill="none"/><path d="M70 77v26l20 12" stroke="${f}" stroke-width="4" stroke-linecap="round"/><path d="M44 68l-12-12M96 68l12-12M42 138l-12 12M98 138l12 12" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'notes_scroll':
      return `${frame}<path d="M48 76h44v56c0 11-9 18-20 13-9-4-17-2-24 3Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M56 91h26M56 106h23M56 121h29" stroke="${a}" stroke-width="3" stroke-linecap="round"/><path d="M92 76c13 0 13 18 0 18" stroke="${f}" stroke-width="4" fill="none"/>`;
    case 'focus_moon':
      return `${frame}<circle cx="62" cy="95" r="30" fill="${f}" opacity=".86"/><circle cx="76" cy="87" r="30" fill="#050607" opacity=".78"/><path d="M43 135h54M55 146h30" stroke="${a}" stroke-width="3" stroke-linecap="round"/>${smallSpark}`;
    case 'flash_cards':
      return `${frame}<rect x="40" y="83" width="42" height="54" rx="5" stroke="${f}" stroke-width="4" fill="none" transform="rotate(-9 61 110)"/><rect x="58" y="73" width="42" height="54" rx="5" stroke="${a}" stroke-width="4" fill="none" transform="rotate(9 79 100)"/><path d="M56 111h27M62 125h18" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown_phrasebook':
      return `${frame}<path d="M42 92 58 113 70 82l12 31 16-21-7 44H49Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M53 148h34M55 122h30" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'desert_route':
      return `${frame}<path d="M40 132c14-32 35-13 45-42 5-14 12-23 24-28" stroke="${f}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M100 61l13 1-6 11" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 146c24-10 48-10 72 0M45 75h18" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'sakura_journal':
      return `${frame}<rect x="47" y="75" width="46" height="62" rx="5" stroke="${f}" stroke-width="4" fill="none"/><path d="M58 91h24M58 106h20M58 121h26" stroke="${a}" stroke-width="3" stroke-linecap="round"/><g fill="${f}" opacity=".82"><ellipse cx="91" cy="82" rx="7" ry="12" transform="rotate(35 91 82)"/><ellipse cx="101" cy="93" rx="7" ry="12" transform="rotate(95 101 93)"/><ellipse cx="88" cy="98" rx="7" ry="12" transform="rotate(150 88 98)"/></g>`;
    case 'lab_blueprint':
      return `${frame}<path d="M51 65h38M70 65v35l24 42H46l24-42" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M55 124h30M60 86h20M42 148h56" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'terminal_prompt':
      return `${frame}<rect x="39" y="78" width="62" height="49" rx="6" stroke="${f}" stroke-width="4" fill="none"/><path d="M51 94l12 9-12 9M68 112h19" stroke="${a}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M47 139h46" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`;
    case 'word_path':
      return `${frame}<path d="M39 129c12-45 47-6 62-52" stroke="${f}" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="40" cy="129" r="6" fill="${a}"/><circle cx="70" cy="104" r="6" fill="${a}"/><circle cx="101" cy="77" r="6" fill="${a}"/><path d="M49 146h42" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`;
    case 'coffee_notes':
      return `${frame}<path d="M49 91h34v24c0 11-8 19-17 19s-17-8-17-19Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M83 97h8c9 0 9 16-1 16h-7M50 142h40M50 72h35M56 80h23" stroke="${a}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    case 'crystal_recall':
      return `${frame}<path d="M42 86 58 66h24l16 20-28 54Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M42 86h56M58 66l12 74M82 66l-12 74M54 146h32" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'moon_dictionary':
      return `${frame}<path d="M48 78h44v61H48Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M70 78v61M55 94h10M76 94h10M55 110h10M76 110h10" stroke="${a}" stroke-width="3" stroke-linecap="round"/><circle cx="91" cy="67" r="15" fill="${f}" opacity=".74"/><circle cx="97" cy="63" r="15" fill="#06101f" opacity=".9"/>`;
    case 'mosaic_tiles':
      return `${frame}<g stroke="${f}" stroke-width="3" fill="none"><rect x="44" y="77" width="23" height="23" rx="3"/><rect x="73" y="77" width="23" height="23" rx="3"/><rect x="44" y="106" width="23" height="23" rx="3"/><rect x="73" y="106" width="23" height="23" rx="3"/></g><path d="M55 88l30 30M85 88l-30 30" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'amber_lantern':
      return `${frame}<path d="M55 85h30l6 48H49Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M59 85c0-16 22-16 22 0M70 95c10 15 7 29-6 35 3-14-9-17 6-35Z" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M52 143h36" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`;
    case 'noir_casebook':
      return `${frame}<rect x="45" y="76" width="50" height="61" rx="5" stroke="${f}" stroke-width="4" fill="none"/><path d="M58 94h22M58 109h18M58 124h25" stroke="${a}" stroke-width="3" stroke-linecap="round"/><circle cx="95" cy="85" r="14" stroke="${a}" stroke-width="4" fill="none"/><path d="M105 95l12 12" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case 'botanical_verbs':
      return `${frame}<path d="M70 142V69M70 107c-28-27-45-15-43 14 20 6 34-1 43-14ZM70 101c28-27 45-15 43 14-20 6-34-1-43-14Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M47 146h46" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'ocean_pearl':
      return `${frame}<path d="M43 112c-7-30 23-50 49-36 25 13 28 54 2 69-24 14-54-5-51-33Z" stroke="${f}" stroke-width="4" fill="none"/><circle cx="70" cy="111" r="20" fill="${f}" opacity=".78"/><circle cx="62" cy="102" r="6" fill="#ffffff" opacity=".7"/><path d="M43 145h54" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'strategy_knight':
      return `${frame}<path d="M59 135h33l-7-23c13-10 10-32-8-38l-19-7 8 17-17 12 8 15-6 24Z" stroke="${f}" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M50 146h49M73 91h1" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case 'cloud_sync':
      return `${frame}<path d="M41 119c-3-25 23-32 37-18 11-23 49-12 43 18 21 3 18 34-5 34H50c-25 0-31-29-9-34Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M61 127h25l-8-8M78 135l8-8" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'rainbow_prism':
      return `${frame}<path d="M42 86 58 66h24l16 20-28 54Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M70 88 34 68M70 103 33 103M70 118 34 138M70 88l36-20M70 103h37M70 118l36 20" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'minimal_stack':
      return `${frame}<rect x="49" y="78" width="42" height="54" rx="5" stroke="${f}" stroke-width="4" fill="none"/><path d="M43 86h6M43 124h6M91 86h6M91 124h6M58 95h24M58 112h24" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`;
    case 'gate':
      return `<path d="M49 132V83c0-29 42-29 42 0v49M58 132V84c0-17 24-17 24 0v48M45 132h50" stroke="${f}" stroke-width="3" fill="none"/><circle cx="70" cy="102" r="48" stroke="${a}" stroke-width="2.5" fill="none"/>`;
    case 'compass':
      return `<circle cx="70" cy="102" r="43" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 57 82 102 70 147 58 102Z" fill="${f}"/><path d="M25 102h90M70 57v90" stroke="${f}" stroke-width="2" opacity=".65"/>`;
    case 'handshake':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><path d="M38 104h22l10-12 10 12h22M52 119l14-14 8 8 8-8 13 13" stroke="${f}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'briefcase':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><rect x="46" y="85" width="48" height="36" rx="5" stroke="${f}" stroke-width="4" fill="none"/><path d="M59 85v-8h22v8M46 101h48" stroke="${f}" stroke-width="4" fill="none"/>`;
    case 'star':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><path d="M70 56 82 88l34 2-27 21 9 34-28-20-28 20 9-34-27-21 34-2Z" fill="${f}" opacity=".92"/>`;
    case 'rose':
      return `<circle cx="70" cy="102" r="44" stroke="${a}" stroke-width="3" fill="none"/><path d="M48 102c0-25 44-34 50 1-8 35-47 35-50-1Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M70 132c-4 20-14 30-28 36M75 132c8 18 19 27 36 30" stroke="${a}" stroke-width="4" fill="none"/>`;
    case 'gear':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><circle cx="70" cy="102" r="26" stroke="${f}" stroke-width="5" fill="none"/><path d="M70 66v72M34 102h72M45 77l50 50M95 77l-50 50" stroke="${f}" stroke-width="4" stroke-linecap="round"/>`;
    case 'moon':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><circle cx="62" cy="97" r="31" fill="${f}"/><circle cx="76" cy="88" r="31" fill="rgba(0,0,0,.62)"/>`;
    case 'leaf':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><path d="M41 119c41-68 66-50 58 17-37 8-56-1-58-17Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M45 120c21-5 38-16 53-36" stroke="${f}" stroke-width="3" fill="none"/>`;
    case 'flower':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><g fill="${f}" opacity=".9"><ellipse cx="70" cy="75" rx="10" ry="22"/><ellipse cx="70" cy="129" rx="10" ry="22"/><ellipse cx="43" cy="102" rx="22" ry="10"/><ellipse cx="97" cy="102" rx="22" ry="10"/></g><circle cx="70" cy="102" r="10" fill="${a}"/>`;
    case 'gem':
    case 'prism':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><path d="M42 86 58 66h24l16 20-28 52Z" stroke="${f}" stroke-width="4" fill="none"/><path d="M42 86h56M58 66l12 72M82 66l-12 72" stroke="${f}" stroke-width="2.5"/>`;
    case 'pearl':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><circle cx="70" cy="102" r="28" fill="${f}" opacity=".84"/><circle cx="60" cy="91" r="9" fill="#ffffff" opacity=".7"/>`;
    case 'chess':
      return `<circle cx="70" cy="102" r="45" stroke="${a}" stroke-width="3" fill="none"/><path d="M59 135h22l6-44H53Zm-3 0h28v11H56zM61 79c0-13 18-13 18 0 0 12-18 12-18 0Z" fill="${f}"/>`;
    case 'sun':
    case 'snow':
    case 'circle':
    default:
      return `<circle cx="70" cy="102" r="46" stroke="${a}" stroke-width="3" fill="none"/><circle cx="70" cy="102" r="24" stroke="${f}" stroke-width="5" fill="none"/><path d="M70 58v20M70 126v20M26 102h20M94 102h20M39 71l14 14M87 119l14 14M101 71 87 85M53 119l-14 14" stroke="${f}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function singleSvg(spec) {
  const bg0 = esc(spec.bg[0]);
  const bg1 = esc(spec.bg[1]);
  const accent = esc(spec.accent);
  const foil = esc(spec.foil);
  const uid = spec.id.replace(/[^a-z0-9_]/gi, '_');
  return `
<svg width="${SINGLE_W}" height="${SINGLE_H}" viewBox="0 0 ${SINGLE_W} ${SINGLE_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg_${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg0}"/>
      <stop offset=".58" stop-color="${bg1}"/>
      <stop offset="1" stop-color="#020403"/>
    </linearGradient>
    <radialGradient id="shine_${uid}" cx=".35" cy=".18" r=".75">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".26"/>
      <stop offset=".38" stop-color="#ffffff" stop-opacity=".05"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".18"/>
    </radialGradient>
    <clipPath id="clip_${uid}">
      <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="7"/>
    </clipPath>
  </defs>
  <g>
    <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="7" fill="url(#bg_${uid})" stroke="${accent}" stroke-width="2"/>
    <g clip-path="url(#clip_${uid})" transform="translate(${CARD_X} ${CARD_Y})">
      <rect width="${CARD_W}" height="${CARD_H}" fill="url(#shine_${uid})"/>
      ${patternSvg(spec.pattern, spec.accent, spec.foil)}
      <circle cx="70" cy="102" r="62" fill="${bg1}" opacity=".22"/>
      <circle cx="70" cy="102" r="54" fill="none" stroke="${foil}" stroke-width="1.4" opacity=".34"/>
      <circle cx="70" cy="102" r="44" fill="none" stroke="${accent}" stroke-width="1.2" opacity=".28"/>
      <path d="M26 36c22 8 66 8 88 0M26 168c22-8 66-8 88 0" stroke="${foil}" stroke-width="1.3" stroke-linecap="round" opacity=".32" fill="none"/>
      <path d="M24 102h18M98 102h18M70 24v18M70 162v18" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" opacity=".34"/>
      <g opacity=".95">${motifSvg(spec.motif, spec.accent, spec.foil)}</g>
      <path d="M16 18h28M16 18v28M124 18H96M124 18v28M16 186h28M16 186v-28M124 186H96M124 186v-28" stroke="${foil}" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>
      <path d="M8 8h124v188H8z" fill="none" stroke="${accent}" stroke-width="1.2" opacity=".55"/>
      <path d="M16 16h108v172H16z" fill="none" stroke="${foil}" stroke-width="1" opacity=".42"/>
    </g>
  </g>
</svg>`;
}

async function renderSingle(spec) {
  return sharp(Buffer.from(singleSvg(spec))).png().toBuffer();
}

async function writeSingle(spec) {
  const buffer = await renderSingle(spec);
  await sharp(buffer).webp({ quality: 92, effort: 5 }).toFile(path.join(OUT_DIR, `${spec.id}.webp`));
  return buffer;
}

async function writeFan(spec, singleBuffer) {
  const variants = [
    { angle: -10, cx: 107, cy: 144 },
    { angle: 0, cx: 164, cy: 126 },
    { angle: 10, cx: 221, cy: 144 },
  ];
  const composites = [];
  for (const v of variants) {
    const rendered = await sharp(singleBuffer)
      .resize({ width: 148, height: 202, fit: 'contain' })
      .rotate(v.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });
    composites.push({
      input: rendered.data,
      left: Math.round(v.cx - rendered.info.width / 2),
      top: Math.round(v.cy - rendered.info.height / 2),
    });
  }
  await sharp({
    create: {
      width: FAN_W,
      height: FAN_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 92, effort: 5 })
    .toFile(path.join(OUT_DIR, `${spec.id}_fan.webp`));
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const spec of allBacks) {
  const single = await writeSingle(spec);
  await writeFan(spec, single);
}

console.log(`Generated ${allBacks.length * 2} flashcard back assets in ${OUT_DIR}`);
