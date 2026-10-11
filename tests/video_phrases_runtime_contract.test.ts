import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const loadDocumentSplitter = (source: string): ((text: string) => string[]) => {
  const implementation = source.match(
    /function splitVideoPhraseDocumentText\(text\)\{[\s\S]*?(?=\n\s*byId\('vp-channel-filters'\))/,
  )?.[0];
  if (!implementation) throw new Error('splitVideoPhraseDocumentText implementation not found');
  return new Function(`${implementation}; return splitVideoPhraseDocumentText;`)() as (text: string) => string[];
};

describe('video phrases runtime contracts', () => {
  it('loads the DOCX parser from an origin allowed by the admin CSP', () => {
    const source = read('admin/v2/legacy.html');
    expect(source).toContain('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js');
    expect(source).not.toContain('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  });

  it('does not reuse a document when the admin switches videos', () => {
    const source = read('admin/v2/legacy.html');
    expect(source).toContain('id="vp-parse" disabled');
    expect(source).toMatch(/const file=byId\('vp-file'\);const documentText=byId\('vp-document-text'\);const parse=byId\('vp-parse'\);[\s\S]*file\)file\.value='';[\s\S]*documentText\)documentText\.value='';[\s\S]*parse\)parse\.disabled=true/);
    expect(source).toContain('if(parse)parse.disabled=false');
  });

  it('keeps edited rows in the admin state after saving', () => {
    const source = read('admin/v2/legacy.html');
    expect(source).toMatch(/const phrases=readRows\(\);state\.phrases=phrases;[\s\S]*adminSaveVideoPhraseDraft/);
  });

  it('keeps the phrase card and save icon as sibling actions', () => {
    const source = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(source).toContain('<View key={phrase.id}');
    expect(source).not.toContain('<Pressable key={phrase.id}');
  });

  it('renders a phrase entry below every catalog video and keeps the entry scoped to the opened video', () => {
    const card = read('components/youtube/YoutubeVideoCard.tsx');
    const videos = read('app/lingman_videos.tsx');
    expect(card).toContain('belowPlayer?: React.ReactNode');
    expect(card).toContain('{belowPlayer}');
    expect(card).toContain('return <>{card}{belowPlayer}</>;');
    // зачем (вкладка «Видео» по макету video.html, 8688eca0b): фразы под каждым полным
    // роликом; в компактном плейлисте — только под открытым, чтобы список не разбухал.
    // зачем (PM-111, cd8b8c059): под открытым роликом ещё «Тренировать фразы ролика», поэтому фрагмент.
    // зачем (владелец 11.10, video-redesign #c1): ролик из сетки открывается экраном ролика, и список фраз живёт там (раскрыт сразу).
    const watch = read('app/lingman_video_watch.tsx');
    expect(watch).toContain('<YoutubeVideoPhrases');
    expect(watch).toContain('defaultExpanded');
    expect(watch).toContain('videoId={videoId}');
    expect(videos).toContain("pathname: '/lingman_video_watch'");
    expect(videos).not.toContain('belowPlayer={video.id === activeVideoId ? <YoutubeVideoPhrases');
  });

  it('uses one controlled accordion state for catalog phrase lists, including the premiere hero', () => {
    const videos = read('app/lingman_videos.tsx');
    const phrases = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(videos).toContain('const [expandedPhraseVideoId, setExpandedPhraseVideoId] = useState<string | null>(null);');
    expect(videos).toContain('expanded={expandedPhraseVideoId === hero.id}');
    expect(videos).toContain('onToggle={() => setExpandedPhraseVideoId((current) => current === hero.id ? null : hero.id)}');
    expect(videos).not.toContain('{hero && activeVideoId === hero.id ? <YoutubeVideoPhrases');
    expect(phrases).toContain('expanded?: boolean;');
    expect(phrases).toContain('onToggle?: () => void;');
    expect(phrases).toContain('const isExpanded = expanded ?? localExpanded;');
  });

  it('gives video phrase saving a large tap target and immediate optimistic state', () => {
    const phrases = read('components/youtube/YoutubeVideoPhrases.tsx');
    const button = read('components/SaveToCardsButton.tsx');
    expect(phrases).toContain('setSavedIds((current) => new Set(current).add(phrase.id));');
    expect(phrases).toContain('setSavedIds((current) => {');
    expect(button).toContain('hitSlop={8}');
    expect(button).toContain('width: 52');
    expect(button).toContain('height: 52');
  });

  it('labels the opened phrase detail as Подробно', () => {
    const source = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(source).toContain("explanation: 'Подробно'");
    expect(source).not.toContain("explanation: 'Объяснение'");
  });

  it('hides the phrases surface when a video has no published phrases', () => {
    const source = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(source).toContain('if (!phrases.length) return null;');
    expect(source).not.toContain('video-phrases-empty');
    expect(source).not.toContain('Для этого видео фразы ещё не добавлены.');
    expect(source).toContain("if (state === 'loading')");
    expect(source).toContain("if (state === 'error')");
  });

  it('extracts long phrase documents in bounded batches before review', () => {
    const source = read('admin/v2/legacy.html');
    expect(source).toContain('function splitVideoPhraseDocumentText');
    expect(source).toContain('const batches=splitVideoPhraseDocumentText(text);');
    expect(source).toContain('for(let index=0;index<batches.length;index+=1)');
    expect(source).toContain('state.phrases=phrases');
  });

  it('splits a generic long document without phrase markers into safe complete ordered batches', () => {
    const source = read('admin/v2/legacy.html');
    const split = loadDocumentSplitter(source);
    const text = Array.from(
      { length: 400 },
      (_, index) => `Paragraph ${index + 1}. ${'Content in original order. '.repeat(12)}`,
    ).join('\n\n');

    const batches = split(text);

    expect(text.length).toBeGreaterThan(60_000);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((batch) => batch.length < 60_000)).toBe(true);
    expect(batches.join('')).toBe(text);
    expect(source).not.toContain("if(text.length>60000)throw new Error('В документе больше 60 000 символов");
  });
});
