import fs from 'fs';
import path from 'path';

describe('text tutor memory deployment boundary', () => {
  it('exports four text-only memory callables from default Functions and leaves MAX sealed', () => {
    const defaultIndex = fs.readFileSync(path.join(process.cwd(), 'functions/src/index.ts'), 'utf8');
    const maxIndex = fs.readFileSync(path.join(process.cwd(), 'functions-max/index.ts'), 'utf8');
    const executableMax = maxIndex.split(/\r?\n/).filter((line) => !line.trimStart().startsWith('//')).join('\n');

    for (const name of [
      'tutorTextGetMemory',
      'tutorTextUpdateMemory',
      'tutorTextDeleteMemoryItem',
      'tutorTextClearMemory',
    ]) {
      expect(defaultIndex).toContain(`exports.${name} = ${name};`);
    }
    expect(executableMax).not.toMatch(/maxVoice(?:Get|Update|Delete|Clear)Memory/);
  });

  it('uses the lightweight text adapter rather than importing the MAX mint graph', () => {
    const client = fs.readFileSync(path.join(process.cwd(), 'app/max_memory_client.ts'), 'utf8');
    expect(client).toContain("from './tutor_text_memory_callable'");
    expect(client).not.toContain("from './max_call_mint_request'");
  });
});
