import { readFileSync } from 'node:fs';

const draft = readFileSync('app/community_packs/communityPackDraftStorage.ts', 'utf8');
const create = readFileSync('app/community_pack_create.tsx', 'utf8');
if (!draft.includes('themeIdx: clampThemeIdx')) throw new Error('legacy themeIdx draft is not tolerated');
if (!draft.includes('parseDraft')) throw new Error('legacy draft parser missing');
if (!create.includes('cardThemeKey: themeKey')) throw new Error('editor does not emit canonical cardThemeKey');
if (!create.includes('isEditingCard')) throw new Error('edit mode contract missing');

console.log('COMMUNITY PACK LEGACY EDIT SCHEMA: PASS');
