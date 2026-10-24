// ЗАМОК по объявлениям в историях (слово владельца 24.10: «каждая должна продолжаться хотя бы секунд 10, и как в Инстаграме — при зажатии экрана она паузится»;
// решение координатора 24.10: объявления берём в 2.0.2). Падает, если объявление станет короче 10 с или удержание перестанет останавливать анимацию слайда.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Замок: объявления в историях — 10 секунд и пауза анимации при удержании', () => {
  const viewer = code(read('components/stories/StoryViewer.tsx'));
  const slides = code(read('components/stories/StorySlides.tsx'));
  const slide = code(read('components/stories/AnnouncementSlide.tsx'));

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «каждая должна продолжаться хотя бы секунд 10» — объявление тоже не короче STORY_SLIDE_MS
  it('длительность объявления — не меньше 10 секунд', () => {
    expect(viewer).toContain("current?.type==='announcement'?Math.max(STORY_SLIDE_MS,Number(current.payload.durationMs)||STORY_SLIDE_MS):STORY_SLIDE_MS;");
    expect(Number(/export const STORY_SLIDE_MS = (\d+);/u.exec(viewer)?.[1])).toBeGreaterThanOrEqual(10000);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «при зажатии экрана она паузится» — пауза просмотра доходит до анимации слайда
  it('пауза просмотра → StorySlide.paused → AnnouncementSlide гасит анимацию и возобновляет', () => {
    expect(viewer).toContain('setPausedUi(true);');
    expect(viewer).toContain('setPausedUi(false);');
    expect(viewer).toContain('paused={pausedUi}');
    expect(slides).toContain('paused?: boolean;');
    expect(slides).toContain('<AnnouncementSlide event={props.event} paused={props.paused} />');
    expect(slide).toContain('if (active && !reduce && !paused) {');
    expect(slide).toContain('cancelAnimation(motion)');
    expect(slide).toContain('}, [active, reduce, paused, motion]);');
  });

  it('раннему выходу «назад некуда» есть журнал', () => {
    expect(viewer).toContain('go: назад некуда');
  });
});
