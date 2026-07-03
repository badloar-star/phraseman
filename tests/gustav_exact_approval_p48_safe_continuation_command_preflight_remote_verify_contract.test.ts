import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav exact approval P48 safe continuation command preflight remote verify contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_exact_approval_p48_safe_continuation_command_preflight_v2_packet.ts'),
    'utf8',
  );

  it('requires P63 to carry P47 remote verify 36/36 before P48 command can be allowed', () => {
    expect(source).toContain('p63P47RemoteVerifyReady: boolean');
    expect(source).toContain('p63P47RemoteVerifyFound: number');
    expect(source).toContain('p63P47RemoteVerifyHashChecked: number');
    expect(source).toContain('input.p63P47RemoteVerifyReady');
    expect(source).toContain('input.p63P47RemoteVerifyFound === 36');
    expect(source).toContain('input.p63P47RemoteVerifyHashChecked === 36');
    expect(source).toContain("p63P47RemoteVerifyHashChecked = 35");
    expect(source).toContain('p63_p47_remote_verify_gap_rejected');
  });
});
