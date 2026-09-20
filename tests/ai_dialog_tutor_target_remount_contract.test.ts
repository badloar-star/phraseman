import fs from 'fs';
import path from 'path';

describe('text tutor target remount boundary', () => {
  it('keys the stateful tutor session by the exact active study target', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app', 'ai_dialog_tutor_session.tsx'),
      'utf8',
    );
    const route = source.slice(source.indexOf('export default function TutorSessionRoute'));

    expect(route).toContain('const { studyTarget } = useStudyTarget();');
    expect(route).toContain('<TutorSession key={studyTarget} />');
  });
});
