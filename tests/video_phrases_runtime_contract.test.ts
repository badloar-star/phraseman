import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

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

  it('renders a phrase entry below every catalog video and keeps the home entry scoped to the opened video', () => {
    const card = read('components/youtube/YoutubeVideoCard.tsx');
    const videos = read('app/lingman_videos.tsx');
    const home = read('components/home/HomeYoutubeFeatureCard.tsx');
    expect(card).toContain('belowPlayer?: React.ReactNode');
    expect(card).toContain('{belowPlayer}');
    expect(card).toContain('return <>{card}{belowPlayer}</>;');
    expect(videos).toContain('belowPlayer={<YoutubeVideoPhrases');
    expect(videos).toContain('videoId={video.id}');
    expect(videos).toContain('expanded={expandedPhraseVideoId === video.id}');
    expect(videos).toContain('onToggle={() => setExpandedPhraseVideoId((current) => current === video.id ? null : video.id)}');
    expect(videos).not.toContain('belowPlayer={video.id === activeVideoId ? <YoutubeVideoPhrases');
    expect(home).toContain("const videoPackLanguage = normalizePackLanguage(snapshot.channel.languageTags[0]?.split('-')[0]);");
    expect(home).toContain('packLanguage={videoPackLanguage}');
    expect(home).toContain('sourceTitle={snapshot.channel.displayName}');
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
});
