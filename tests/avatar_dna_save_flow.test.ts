import { saveAvatarDNADraft } from '../modules/avatar-dna/save_flow';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import fs from 'node:fs';
import path from 'node:path';

describe('Avatar DNA local-first save flow', () => {
  it('ships gated entry and the shared hybrid dirty-exit choices', () => {
    const root = path.resolve(__dirname, '..');
    const studio = fs.readFileSync(path.join(root, 'app/avatar_dna_studio.tsx'), 'utf8');
    const entry = fs.readFileSync(path.join(root, 'app/avatar_select.tsx'), 'utf8');
    const admin = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
    expect(studio).toContain('<ThemedChoiceModal');
    expect(studio).toContain('copy.saveAndClose');
    expect(studio).toContain('copy.continueEditing');
    expect(studio).toContain('copy.discardChanges');
    expect(entry).toContain('{avatarDNAEnabled ? <Pressable');
    expect(admin).toContain("key: 'avatar_dna_enabled'");
    expect(admin).toContain("key: 'avatar_dna_rollout_pct'");
  });

  it('commits local DNA before starting best-effort public sync', async () => {
    const calls: string[] = [];
    const dna = starterAvatarDNA('starter_warm_01');
    const stored = { confirmedDNA: dna } as never;

    const result = await saveAvatarDNADraft(dna, {
      validate: async () => { calls.push('validate'); return dna; },
      renderLocal: async () => { calls.push('render-local'); return { portrait: 'portrait_1', studio: 'studio_1' }; },
      commitLocal: async () => { calls.push('commit-local'); return { status: 'committed' }; },
      readCommitted: async () => stored,
      patchSnapshot: () => { calls.push('patch-snapshot'); },
      enqueueSync: () => { calls.push('enqueue-sync'); },
    });

    expect(result).toEqual({ status: 'committed', state: stored });
    expect(calls).toEqual(['validate', 'render-local', 'commit-local', 'patch-snapshot', 'enqueue-sync']);
  });

  it('never patches or syncs after a stale-account commit', async () => {
    const calls: string[] = [];
    const dna = starterAvatarDNA('starter_warm_01');
    const result = await saveAvatarDNADraft(dna, {
      validate: async () => dna,
      renderLocal: async () => ({ portrait: 'portrait_1', studio: 'studio_1' }),
      commitLocal: async () => ({ status: 'stale-account' }),
      readCommitted: async () => null,
      patchSnapshot: () => { calls.push('patch'); },
      enqueueSync: () => { calls.push('sync'); },
    });

    expect(result).toEqual({ status: 'stale-account' });
    expect(calls).toEqual([]);
  });

  it('treats sync enqueue as best effort after the durable local commit', async () => {
    const dna = starterAvatarDNA('starter_warm_01');
    const stored = { confirmedDNA: dna } as never;
    const result = await saveAvatarDNADraft(dna, {
      validate: async () => dna,
      renderLocal: async () => ({ portrait: 'portrait_1', studio: 'studio_1' }),
      commitLocal: async () => ({ status: 'committed' }),
      readCommitted: async () => stored,
      patchSnapshot: () => {},
      enqueueSync: () => { throw new Error('offline'); },
    });

    expect(result).toEqual({ status: 'committed', state: stored });
  });
});
