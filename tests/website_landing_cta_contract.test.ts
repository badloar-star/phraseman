import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const guidePaths = [
  'knowly-www/guides/index.html',
  'knowly-www/guides/how-to-learn-english/index.html',
  'knowly-www/guides/english-by-phrases/index.html',
  'knowly-www/guides/speaking-barrier/index.html',
  'knowly-www/guides/how-to-improve-english-pronunciation/index.html',
  'knowly-www/guides/english-phrases-for-travel/index.html',
  'knowly-www/guides/english-15-minutes-a-day/index.html',
];

describe('website landing conversion contract', () => {
  const home = read('knowly-www/index.html');
  const download = read('knowly-www/download/index.html');
  const start = read('knowly-www/assets/start.js');
  const llms = read('knowly-www/llms.txt');
  const guides = guidePaths.map(read);

  it('keeps plan selection only in the homepage top navigation', () => {
    const startLinks = home.match(/href="\/start\/"/g) ?? [];
    const header = home.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';

    expect(startLinks).toHaveLength(1);
    expect(header).toContain('href="/start/"');
    expect(header).toContain('Подобрать план');
    expect(download).not.toContain('href="/start/"');
    guides.forEach((guide) => expect(guide).not.toContain('href="/start/"'));
  });

  it('sends the primary homepage actions directly to download and the first lesson', () => {
    const directCtas = home.match(/href="\/download\/"[^>]*>Скачать бесплатно и начать первый урок<\/a>/g) ?? [];

    expect(directCtas.length).toBeGreaterThanOrEqual(3);
    expect(home).toMatch(/class="mobile-hero-cta"[^>]*href="\/download\/"[^>]*>Скачать бесплатно и начать первый урок<\/a>/);
    expect(home).toMatch(/class="btn-gold quiz-cta"[^>]*href="\/download\/"[^>]*>Скачать бесплатно и начать первый урок<\/a>/);
    expect(home).toMatch(/class="dock-cta"[^>]*href="\/download\/"[^>]*aria-label="Скачать бесплатно и начать первый урок"/);
    expect(home).toMatch(/class="mcta-dl"[^>]*href="\/download\/"[^>]*>Скачать бесплатно и начать первый урок<\/a>/);
    expect(home).toContain('data-store="ios"');
    expect(home).toContain('data-store="android"');
    expect(download).toContain('data-store="ios"');
    expect(download).toContain('data-store="android"');
  });

  it('does not advertise unavailable duels and preserves the real weekly leagues', () => {
    const marketing = [home, download, start, llms, ...guides].join('\n');

    expect(marketing).not.toMatch(/дуэл|real players|live duels?|\barena\b|в арене/i);
    expect(home).toContain('<h3>Еженедельные лиги</h3>');
    expect(download).toContain('<b><i>Лиги</i></b><span>каждую неделю</span>');
    expect(start).toContain("{ t: 'Уроки, фразы дня и лиги', free: '✓', prem: '✓' }");
    expect(llms).toContain('еженедельные лиги');
  });

  it('describes the actual six-question plan quiz everywhere', () => {
    const quizSurfaces = [start, llms, ...guides].join('\n');

    expect(start.match(/type: 'q'/g) ?? []).toHaveLength(6);
    expect(start).toContain('6 коротких вопросов');
    expect(quizSurfaces).not.toMatch(/7 (?:коротких )?вопрос/i);
  });
});
