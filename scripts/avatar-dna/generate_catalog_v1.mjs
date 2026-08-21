import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const numbered = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
const entitlement = (kind = 'free', rarity) => ({ kind, ...(rarity ? { rarity } : {}) });
const layer = (id, slot, z, file, extra = {}) => ({ id, slot, z, file, ...extra });
const item = (id, category, layers = [], extra = {}) => ({ id, assetVersion: 1, rigIds: ['human_v1'], category, entitlement: entitlement(), layers, occludes: [], conflicts: [], restoresOnRemove: false, ...extra });

const skinSwatches = ['#f5c6a5','#e9ad83','#d4936a','#b8734f','#8f5538','#623824'];
const irisEntries = [['iris_brown','brown'],['iris_hazel','hazel'],['iris_green','green'],['iris_blue','blue'],['iris_gray','gray'],['iris_amber','amber']];
const hairSwatches = [['hair_black','#211712'],['hair_dark_brown','#3b2419'],['hair_brown','#5b2b18'],['hair_auburn','#8a3f24'],['hair_blonde','#c59456']];

export const catalogV1 = {
  catalogVersion: 1,
  manifestVersion: 1,
  rigIds: ['human_v1'],
  items: [
    ...numbered('skin_', 6).map((id, index) => item(id, 'base', [], { swatchHex: skinSwatches[index] })),
    ...numbered('face_', 4).map((id, index) => item(id, 'base', [layer(`face.base.${index + 1}`, 'face', 70, 'face-base.webp', { tintFrom: 'skinTone' })])),
    ...numbered('body_', 2).map((id, index) => item(id, 'base', [layer(`body.base.${index + 1}`, 'body', 40, 'body-base.webp', { tintFrom: 'skinTone' })])),
    ...numbered('eyes_', 6).map((id, index) => item(id, 'face', [layer(`eyes.${index + 1}`, 'eyes', 75, 'eyes.webp', { clip: 'face.safe' })])),
    ...irisEntries.map(([id, name], index) => item(id, 'face', [layer(`iris.${name}`, 'iris', 76, 'iris.webp', { clip: 'face.safe' })], { swatchHex: ['#5b341f','#7b6435','#46704c','#47749b','#6f777c','#a66b24'][index] })),
    ...numbered('brows_', 4).map((id, index) => item(id, 'face', [layer(`brows.${index + 1}`, 'brows', 77, 'brows.webp', { clip: 'face.safe' })])),
    ...numbered('nose_', 4).map((id, index) => item(id, 'face', [layer(`nose.${index + 1}`, 'nose', 78, 'nose.webp', { clip: 'face.safe' })])),
    ...numbered('mouth_', 4).map((id, index) => item(id, 'face', [layer(`mouth.${index + 1}`, 'mouth', 79, 'mouth.webp', { clip: 'face.safe' })])),
    ...numbered('skin_detail_', 4).map((id, index) => item(id, 'face', [layer(`skin.detail.${index + 1}`, 'skin.detail', 82, 'skin-detail.webp', { clip: 'face.safe' })], { restoresOnRemove: true })),
    ...numbered('makeup_', 4).map((id, index) => item(id, 'face', [layer(`makeup.${index + 1}`, 'makeup', 88, 'makeup.webp', { clip: 'face.safe' })], { restoresOnRemove: true })),
    ...numbered('facial_hair_', 2).map((id, index) => item(id, 'face', [layer(`facial.hair.${index + 1}`, 'facial.hair', 90, 'facial-hair.webp', { clip: 'face.safe' })], { restoresOnRemove: true })),
    ...numbered('hair_', 8).map((id, index) => item(id, 'hair', [
      layer(`hair.${index + 1}.back`, 'hair.back', 30, 'hair-back.webp', { tintFrom: 'hairColor' }),
      layer(`hair.${index + 1}.front`, 'hair.front', 80, 'hair-front.webp', { tintFrom: 'hairColor' }),
    ], { restoresOnRemove: true })),
    ...hairSwatches.map(([id, swatchHex]) => item(id, 'hair', [], { swatchHex })),
    ...numbered('outfit_', 8).map((id, index) => item(id, 'look', [layer(`outfit.${index + 1}`, 'outfit', 60, 'outfit.webp')], { restoresOnRemove: true })),
    ...[['background_cream','cream'],['background_terracotta','terracotta'],['background_olive','olive'],['background_sunset','sunset']].map(([id, name]) => item(id, 'scene', [layer(`background.${name}`, 'background', 0, 'background.webp')], { restoresOnRemove: true })),
    item('headwear.cap.01', 'look', [layer('headwear.cap.01.front', 'headwear.front', 150, 'headwear-front.webp')], { entitlement: entitlement('reward', 'common'), restoresOnRemove: true }),
    item('headwear.beanie.01', 'look', [layer('headwear.beanie.01.front', 'headwear.front', 150, 'headwear-front.webp')], { entitlement: entitlement('reward', 'uncommon'), occludes: ['hair.front'], restoresOnRemove: true }),
    item('headwear.flower_crown.01', 'look', [layer('headwear.flower_crown.01.front', 'headwear.front', 150, 'headwear-front.webp')], { entitlement: entitlement('purchase', 'rare'), restoresOnRemove: true }),
    item('headwear.assassin_hood.01', 'look', [layer('hood.assassin.back', 'hood.back', 20, 'hood-back.webp'), layer('hood.assassin.shadow', 'makeup', 95, 'face-shadow.webp', { clip: 'face.safe' }), layer('hood.assassin.front', 'headwear.front', 150, 'hood-front.webp')], { entitlement: entitlement('reward', 'rare'), occludes: ['hair.front','ears'], conflicts: ['mask.domino.01','mask.festival.01','eyewear.round.01','eyewear.cat_eye.01'], restoresOnRemove: true }),
    item('mask.domino.01', 'look', [layer('mask.domino.01.front', 'mask', 130, 'mask.webp', { clip: 'face.safe' })], { entitlement: entitlement('reward', 'uncommon'), conflicts: ['eyewear.round.01','eyewear.cat_eye.01'], restoresOnRemove: true }),
    item('mask.festival.01', 'look', [layer('mask.festival.01.front', 'mask', 130, 'mask.webp', { clip: 'face.safe' })], { entitlement: entitlement('reward', 'rare'), conflicts: ['eyewear.round.01','eyewear.cat_eye.01'], restoresOnRemove: true }),
    item('eyewear.round.01', 'look', [layer('eyewear.round.01.front', 'eyewear', 120, 'eyewear.webp', { clip: 'face.safe' })], { entitlement: entitlement('purchase', 'common'), restoresOnRemove: true }),
    item('eyewear.cat_eye.01', 'look', [layer('eyewear.cat_eye.01.front', 'eyewear', 120, 'eyewear.webp', { clip: 'face.safe' })], { entitlement: entitlement('reward', 'uncommon'), restoresOnRemove: true }),
    item('ear_accessory.stud.01', 'look', [layer('ear.accessory.stud.01', 'ear.accessory', 110, 'ear-accessory.webp')], { entitlement: entitlement('reward', 'common'), restoresOnRemove: true }),
    item('ear_accessory.hoop.01', 'look', [layer('ear.accessory.hoop.01', 'ear.accessory', 110, 'ear-accessory.webp')], { entitlement: entitlement('purchase', 'uncommon'), restoresOnRemove: true }),
    item('neck_accessory.scarf.01', 'look', [layer('neck.accessory.scarf.01', 'neck.accessory', 125, 'neck-accessory.webp')], { entitlement: entitlement('reward', 'uncommon'), restoresOnRemove: true }),
    item('neck_accessory.pendant.01', 'look', [layer('neck.accessory.pendant.01', 'neck.accessory', 125, 'neck-accessory.webp')], { entitlement: entitlement('purchase', 'rare'), restoresOnRemove: true }),
  ],
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = valueFor('--out');
  if (!output) throw new Error('avatar_catalog_generate_invalid: output');
  await writeFile(path.resolve(output), `${JSON.stringify(catalogV1, null, 2)}\n`);
  console.log(`avatar-dna catalog generate: PASS (${catalogV1.items.length} items)`);
}
