import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const numbered = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
const entitlement = (kind = 'free', rarity) => ({ kind, ...(rarity ? { rarity } : {}) });
const layer = (id, slot, z, file, extra = {}) => ({ id, slot, z, file, ...extra });
const item = (id, category, layers = [], extra = {}) => ({ id, assetVersion: 1, rigIds: ['human_v1'], category, entitlement: entitlement(), layers, occludes: [], conflicts: [], restoresOnRemove: false, ...extra });
const rarityFor = (index) => ['common','common','uncommon','uncommon','rare','rare','epic','epic'][Math.min(7, Math.max(0, index - 2))];
const unlockEntitlement = (index) => index < 2 ? entitlement() : entitlement(index % 2 === 0 ? 'purchase' : 'reward', rarityFor(index));

const skinSwatches = ['#f8d8c1','#f5c6a5','#d4936a','#c8845e','#b8734f','#a86748','#8f5538','#79462f','#623824','#45291d'];
const irisEntries = [['iris_brown','brown','#5b341f'],['iris_hazel','hazel','#7b6435'],['iris_green','green','#46704c'],['iris_blue','blue','#47749b'],['iris_gray','gray','#6f777c'],['iris_amber','amber','#a66b24'],['iris_violet','violet','#73558d'],['iris_teal','teal','#2f7b7b'],['iris_honey','honey','#bd852d'],['iris_black','black','#231f20']];
const hairSwatches = [['hair_black','#211712'],['hair_dark_brown','#3b2419'],['hair_brown','#5b2b18'],['hair_auburn','#8a3f24'],['hair_blonde','#c59456'],['hair_platinum','#ded1bd'],['hair_red','#a83524'],['hair_rose','#a95769'],['hair_blue','#335c87'],['hair_green','#416b50']];
const backgrounds = ['cream','terracotta','olive','sunset','sky','lavender','forest','ocean','night','studio'];
const headwearNames = ['cap','beanie','flower_crown','assassin_hood','bucket_hat','beret','tiara','cowboy_hat','turban','cat_ears'];
const maskNames = ['domino','festival','fox','phantom','cyber','masquerade','oni','bandana','star','lace'];
const eyewearNames = ['round','cat_eye','aviator','square','heart','monocle','visor','goggles','half_moon','rimless'];
const earAccessoryNames = ['stud','hoop','drop','pearl','star','feather','cuff','lightning','flower','chain'];
const neckAccessoryNames = ['scarf','pendant','choker','bow','bandana','beads','medallion','collar','tie','chain'];
const eyewearIds = eyewearNames.map((name) => `eyewear.${name}.01`);
const maskIds = maskNames.map((name) => `mask.${name}.01`);

export const catalogV1 = {
  catalogVersion: 1,
  manifestVersion: 1,
  rigIds: ['human_v1'],
  items: [
    ...numbered('skin_', 10).map((id, index) => item(id, 'base', [], { swatchHex: skinSwatches[index] })),
    ...numbered('face_', 10).map((id, index) => item(id, 'base', [layer(`face.base.${index + 1}.mask`, 'face', 70, 'face-mask.webp', { tintFrom: 'skinTone' }), layer(`face.base.${index + 1}.shading`, 'face', 71, 'face-shading.webp')], { entitlement: unlockEntitlement(index) })),
    ...numbered('body_', 10).map((id, index) => item(id, 'base', [layer(`body.base.${index + 1}.mask`, 'body', 40, 'body-mask.webp', { tintFrom: 'skinTone' }), layer(`body.base.${index + 1}.shading`, 'body', 41, 'body-shading.webp')], { entitlement: unlockEntitlement(index) })),
    ...numbered('eyes_', 10).map((id, index) => item(id, 'face', [layer(`eyes.${index + 1}`, 'eyes', 75, 'eyes.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index) })),
    ...irisEntries.map(([id, name, swatchHex]) => item(id, 'face', [layer(`iris.${name}.mask`, 'iris', 76, 'iris-mask.webp', { clip: 'face.safe', tintFrom: 'irisColor' }), layer(`iris.${name}.shading`, 'iris', 76, 'iris-shading.webp', { clip: 'face.safe' })], { swatchHex })),
    ...numbered('brows_', 10).map((id, index) => item(id, 'face', [layer(`brows.${index + 1}`, 'brows', 77, 'brows.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index) })),
    ...numbered('nose_', 10).map((id, index) => item(id, 'face', [layer(`nose.${index + 1}`, 'nose', 78, 'nose.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index) })),
    ...numbered('mouth_', 10).map((id, index) => item(id, 'face', [layer(`mouth.${index + 1}`, 'mouth', 79, 'mouth.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index) })),
    ...numbered('skin_detail_', 10).map((id, index) => item(id, 'face', [layer(`skin.detail.${index + 1}`, 'skin.detail', 82, 'skin-detail.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...numbered('makeup_', 10).map((id, index) => item(id, 'face', [layer(`makeup.${index + 1}`, 'makeup', 88, 'makeup.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...numbered('facial_hair_', 10).map((id, index) => item(id, 'face', [layer(`facial.hair.${index + 1}`, 'facial.hair', 90, 'facial-hair.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...numbered('hair_', 10).map((id, index) => item(id, 'hair', [
      layer(`hair.${index + 1}.back.mask`, 'hair.back', 30, 'hair-back-mask.webp', { tintFrom: 'hairColor' }),
      layer(`hair.${index + 1}.back.shading`, 'hair.back', 31, 'hair-back-shading.webp'),
      layer(`hair.${index + 1}.front.mask`, 'hair.front', 80, 'hair-front-mask.webp', { tintFrom: 'hairColor' }),
      layer(`hair.${index + 1}.front.shading`, 'hair.front', 81, 'hair-front-shading.webp'),
    ], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...hairSwatches.map(([id, swatchHex]) => item(id, 'hair', [], { swatchHex })),
    ...numbered('outfit_', 10).map((id, index) => item(id, 'look', [layer(`outfit.${index + 1}`, 'outfit', 60, 'outfit.webp')], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...backgrounds.map((name, index) => item(`background_${name}`, 'scene', [layer(`background.${name}`, 'background', 0, 'background.webp')], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...headwearNames.filter((name) => name !== 'assassin_hood').map((name, index) => item(`headwear.${name}.01`, 'look', [layer(`headwear.${name}.01.front`, 'headwear.front', 150, 'headwear-front.webp')], { entitlement: unlockEntitlement(index + 2), ...(name === 'beanie' || name === 'bucket_hat' || name === 'turban' ? { occludes: ['hair.front'] } : {}), restoresOnRemove: true })),
    item('headwear.assassin_hood.01', 'look', [layer('hood.assassin.back', 'hood.back', 20, 'hood-back.webp'), layer('hood.assassin.shadow', 'makeup', 95, 'face-shadow.webp', { clip: 'face.safe' }), layer('hood.assassin.front', 'headwear.front', 150, 'hood-front.webp')], { entitlement: entitlement('reward', 'rare'), occludes: ['hair.front','ears'], conflicts: [...maskIds, ...eyewearIds], restoresOnRemove: true }),
    ...maskNames.map((name, index) => item(`mask.${name}.01`, 'look', [layer(`mask.${name}.01.front`, 'mask', 130, 'mask.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index + 2), conflicts: eyewearIds, restoresOnRemove: true })),
    ...eyewearNames.map((name, index) => item(`eyewear.${name}.01`, 'look', [layer(`eyewear.${name}.01.front`, 'eyewear', 120, 'eyewear.webp', { clip: 'face.safe' })], { entitlement: unlockEntitlement(index + 2), restoresOnRemove: true })),
    ...earAccessoryNames.map((name, index) => item(`ear_accessory.${name}.01`, 'look', [layer(`ear.accessory.${name}.01`, 'ear.accessory', 110, 'ear-accessory.webp')], { entitlement: unlockEntitlement(index + 2), restoresOnRemove: true })),
    ...neckAccessoryNames.map((name, index) => item(`neck_accessory.${name}.01`, 'look', [layer(`neck.accessory.${name}.01`, 'neck.accessory', 125, 'neck-accessory.webp')], { entitlement: unlockEntitlement(index + 2), restoresOnRemove: true })),
    ...numbered('aura_', 10).map((id, index) => item(id, 'scene', [layer(`aura.${index + 1}`, 'aura', 160, 'aura.webp')], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...numbered('frame_', 10).map((id, index) => item(id, 'scene', [layer(`frame.${index + 1}`, 'frame', 170, 'frame.webp')], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
    ...numbered('foreground_fx_', 10).map((id, index) => item(id, 'scene', [layer(`foreground.fx.${index + 1}`, 'foreground.fx', 175, 'foreground-fx.webp')], { entitlement: unlockEntitlement(index), restoresOnRemove: true })),
  ],
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = valueFor('--out');
  if (!output) throw new Error('avatar_catalog_generate_invalid: output');
  await writeFile(path.resolve(output), `${JSON.stringify(catalogV1, null, 2)}\n`);
  console.log(`avatar-dna catalog generate: PASS (${catalogV1.items.length} items)`);
}
