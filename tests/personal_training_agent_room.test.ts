import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('Jesse Pinkman personal training room protocol', () => {
  const requiredFiles = [
    'tools/personal_training_agent_room/README.md',
    'tools/personal_training_agent_room/ROOM.md',
    'tools/personal_training_agent_room/JESSE_PINKMAN.md',
    'tools/personal_training_agent_room/prompts/10_IMPLEMENTATION_INTEGRATOR.md',
    'tools/personal_training_agent_room/templates/replacement_checklist.md',
  ];

  it('keeps the room files available for any agent session', () => {
    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    }
  });

  it('requires replace-mode before publishing diagnosis trainings', () => {
    const room = readRepoFile('tools/personal_training_agent_room/ROOM.md');
    const readme = readRepoFile('tools/personal_training_agent_room/README.md');
    const integrator = readRepoFile('tools/personal_training_agent_room/prompts/10_IMPLEMENTATION_INTEGRATOR.md');

    for (const content of [room, readme, integrator]) {
      expect(content).toContain('Replace');
      expect(content).toContain('diagnosis_training_<id>');
      expect(content).toContain('app/diagnosis_trainings.ts');
      expect(content).toContain('JESSE_REWORKED_PERSONAL_TRAINING');
    }

    expect(room).toContain('JESSE_REPLACE_MODE');
    expect(integrator).toContain('Replacement Sweep');
    expect(integrator).toContain('DIAGNOSIS_TRAININGS');
  });

  it('requires admin sync and personal training checks after publishing', () => {
    const room = readRepoFile('tools/personal_training_agent_room/ROOM.md');
    const readme = readRepoFile('tools/personal_training_agent_room/README.md');
    const integrator = readRepoFile('tools/personal_training_agent_room/prompts/10_IMPLEMENTATION_INTEGRATOR.md');
    const checklist = readRepoFile('tools/personal_training_agent_room/templates/replacement_checklist.md');

    for (const content of [room, readme, integrator, checklist]) {
      expect(content).toContain('npm run training:personal:sync-admin');
      expect(content).toContain('npm run training:personal:check');
    }
  });

  it('documents stale file names as forbidden', () => {
    const checklist = readRepoFile('tools/personal_training_agent_room/templates/replacement_checklist.md');
    for (const suffix of ['_new', '_v2', '_draft', '_backup', '_old', '_tmp', '_candidate']) {
      expect(checklist).toContain(suffix);
    }
  });
});
