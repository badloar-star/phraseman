import fs from 'fs';
import path from 'path';
import {
  createCustomizationInitialState,
  revalidateCustomizationSnapshot,
  type CustomizationSnapshot,
} from '../app/customization_snapshot';

const root = path.resolve(__dirname, '..');

function readProjectFile(...parts: string[]): string {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

function hydratedSnapshot(): CustomizationSnapshot {
  return {
    source: 'storage',
    updatedAt: 100,
    activeAvatar: 'custom:custom-gen-41:aurora:white',
    storedAuraSelection: 'aura-ember',
    totalXp: 1250,
    level: 18,
    shards: 77,
    ownedAvatars: { 'custom-gen-41': 'aurora:white' },
    ownedAuras: { 'aura-ember': true },
    giftedAvatarId: null,
    giftedAuraId: null,
  };
}

describe('avatar studio first frame', () => {
  it('seeds the route from the app snapshot instead of fake defaults', () => {
    const source = readProjectFile('app', 'avatar_select.tsx');
    expect(source).toContain('useAppSnapshotSelector');
    expect(source).toContain('createCustomizationInitialState');
    expect(source).toContain('patchAppSnapshotCustomizationSelection(snapshot);');
    expect(source).not.toContain('const [level, setLevel] = useState(1)');
    expect(source).not.toContain("const [activeAvatar, setActiveAvatar] = useState<string>('1')");
    expect(source).not.toContain('const [activeAuraId, setActiveAuraId] = useState<string | null>(null)');
    expect(source).toContain('createAccountScope: () => {');
    expect(source).toContain('withAccountTransitionLock(async () => {');
    expect(source).toContain('isCurrentAccountGeneration(accountToken)');
  });

  it('exposes all real values before delayed storage resolves', async () => {
    const hydrated = hydratedSnapshot();
    let resolveFresh!: (value: CustomizationSnapshot) => void;
    const delayed = new Promise<CustomizationSnapshot>((resolve) => { resolveFresh = resolve; });
    const initial = createCustomizationInitialState({ customization: hydrated });

    expect(initial.confirmed).toEqual(hydrated);
    expect(initial.previewAvatarValue).toBe(hydrated.activeAvatar);
    expect(initial.previewStoredAuraSelection).toBe(hydrated.storedAuraSelection);
    expect(initial.shards).toBe(77);
    expect(initial.ownedAvatars['custom-gen-41']).toBe('aurora:white');

    const publish = jest.fn();
    const pending = revalidateCustomizationSnapshot(initial.confirmed, () => delayed, publish);
    expect(publish).not.toHaveBeenCalled();
    resolveFresh(hydrated);
    await pending;
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes one coherent update only when delayed data differs', async () => {
    const current = hydratedSnapshot();
    const publish = jest.fn();
    const fresh = { ...current, updatedAt: 200, shards: 50, ownedAuras: { 'aura-storm': true as const } };

    await revalidateCustomizationSnapshot(current, async () => fresh, publish);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(fresh);
  });
});
