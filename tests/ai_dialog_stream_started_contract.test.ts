import fs from 'fs';
import path from 'path';

describe('dialog stream started-frame contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_stream_client.ts'), 'utf8');

  it('recognizes started as a server frame before deciding fallback safety', () => {
    expect(source).toContain("| { type: 'started' }");
    expect(source).toContain("if (frame.type === 'started')");
    expect(source).toContain("new DialogStreamError('network', false)");
    expect(source).toContain("new DialogStreamError('dialog_stream_incomplete', false)");
    expect(source).not.toContain('!sawAnyFrame');
  });
});
