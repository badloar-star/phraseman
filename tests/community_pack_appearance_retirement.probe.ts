import { readFileSync } from 'node:fs';

const source = readFileSync('app/community_pack_create.tsx', 'utf8');

if (/testID\s*=\s*["'][^"']*(?:color|theme|back|cover|appearance)[^"']*["']/i.test(source)) {
  throw new Error('appearance controls still exposed in community pack create UI');
}
if (/picker цветов\/рубашек удалён/.test(source) === false) {
  throw new Error('appearance retirement marker missing');
}
if (!source.includes('cardThemeKey: themeKey')) {
  throw new Error('canonical card theme payload missing');
}

console.log('COMMUNITY PACK APPEARANCE RETIREMENT: PASS');
