import fs from 'fs';
import path from 'path';
import { AVATAR_DNA_COPY, AVATAR_DNA_LOCALES } from '../app/avatar_dna_copy';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Avatar DNA Studio structure', () => {
  it('ships the complete editor composition and one virtualized grid', () => {
    const expected = [
      'components/avatar-dna/AvatarDNAHero.tsx',
      'components/avatar-dna/AvatarDNATabs.tsx',
      'components/avatar-dna/AvatarDNACatalog.tsx',
      'components/avatar-dna/AvatarDNAItemCard.tsx',
      'components/avatar-dna/AvatarDNAConflictNotice.tsx',
      'components/avatar-dna/AvatarDNAEditor.tsx',
      'app/avatar_dna_studio.tsx',
    ];
    expected.forEach((file) => expect(fs.existsSync(path.join(root, file))).toBe(true));

    const catalog = read('components/avatar-dna/AvatarDNACatalog.tsx');
    const editor = read('components/avatar-dna/AvatarDNAEditor.tsx');
    expect((catalog.match(/\bFlatList\b/g) ?? [])).toHaveLength(2); // import + one render
    expect(catalog).toContain('numColumns={3}');
    expect(editor).not.toContain('ScrollView');
    const tabs = read('components/avatar-dna/AvatarDNATabs.tsx');
    ['base', 'face', 'hair', 'look', 'scene'].forEach((id) => expect(tabs).toContain(`'${id}'`));
  });

  it('uses shared motion tokens only for controls and never animates the character', () => {
    const editor = read('components/avatar-dna/AvatarDNAEditor.tsx');
    expect(editor).toMatch(/import .*PRESS.*LUM.*CHK.*motionHybrid/);
    expect(editor).not.toMatch(/withSpring\s*\(\s*\{/);
    expect(editor).not.toMatch(/duration\s*:\s*\d/);
    const stage = read('components/avatar-dna/AvatarDNAStage.tsx');
    expect(stage).not.toMatch(/react-native-reanimated|\bAnimated\b/);
  });

  it('has complete copy for every supported interface locale', () => {
    expect(AVATAR_DNA_LOCALES).toEqual(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
    const baselineKeys = Object.keys(AVATAR_DNA_COPY.ru).sort();
    AVATAR_DNA_LOCALES.forEach((locale) => {
      expect(Object.keys(AVATAR_DNA_COPY[locale]).sort()).toEqual(baselineKeys);
      expect(Object.values(AVATAR_DNA_COPY[locale]).every((value) => value.trim().length > 0)).toBe(true);
    });
  });

  it('registers the route and adds the entry without replacing legacy Studio', () => {
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="avatar_dna_studio" options={{ headerShown: false }} />');
    const legacyStudio = read('app/avatar_select.tsx');
    expect(AVATAR_DNA_COPY.ru.createCharacter).toBe('Создать персонажа');
    expect(legacyStudio).toContain('createCharacter');
    expect(legacyStudio).toContain('CustomizationHero');
    expect(legacyStudio).toContain('CustomizationCatalogCard');
  });
});
