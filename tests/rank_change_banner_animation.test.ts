import { readFileSync } from 'fs';
import path from 'path';

const bannerPath = path.join(process.cwd(), 'components', 'RankChangeBanner.tsx');

describe('RankChangeBanner animation lifecycle', () => {
  const source = readFileSync(bannerPath, 'utf8');
  const animationBlock = source.slice(
    source.indexOf('const animationKey'),
    source.indexOf('const isUp'),
  );

  it('keeps the latest close handler without restarting the toast on parent rerenders', () => {
    expect(source).toContain('const onCloseRef = useRef(onClose);');
    expect(source).toContain('onCloseRef.current = onClose;');
    expect(animationBlock).toContain('onCloseRef.current()');
    expect(animationBlock).toContain('}, [anim, duration, animationKey, isHybrid]);');
    expect(animationBlock).not.toContain('}, [anim, duration, onClose]);');
  });
});
