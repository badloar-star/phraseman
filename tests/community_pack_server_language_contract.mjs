import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('functions/src/community_packs.ts', 'utf8');

// зачем (10.10): тип языка набора вынесен в community_pack_language.ts (D127 «Без языка», D130 итальянский).
assert.match(source, /packLanguage\?: CommunityPackLanguage/);
const languages = fs.readFileSync('functions/src/community_pack_language.ts', 'utf8');
assert.match(languages, /COMMUNITY_STUDY_PACK_LANGUAGES = \['en', 'fr', 'de', 'es', 'it'\] as const/);
assert.match(languages, /COMMUNITY_NO_PACK_LANGUAGE = 'none' as const/);
assert.match(source, /targetText\?: string/);
assert.match(source, /translationText\?: string/);
assert.match(source, /raw\.packLanguage/);
assert.match(source, /targetText/);
assert.match(source, /translationText/);
assert.match(source, /packLanguage: payload\.packLanguage/);
