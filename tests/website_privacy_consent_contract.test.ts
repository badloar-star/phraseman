import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website privacy consent contract', () => {
  it('requests only the quiz-plan email without marketing consent UI', () => {
    const start = read('knowly-www/assets/start.js');

    expect(start).toContain('submitLead(email);');
    expect(start).toContain('marketingConsent: false');
    expect(start).toContain('На этот адрес придёт только ваш персональный план.');
    expect(start).not.toContain('qlead-marketing-consent');
    expect(start).not.toContain('Можно присылать мне до двух писем');
  });

  it('does not schedule marketing nudges without explicit consent', () => {
    const leads = read('functions/src/web_leads.ts');

    expect(leads).toContain('const marketingConsent = body.marketingConsent === true;');
    expect(leads).toContain('marketingConsent: marketingConsent || existing?.marketingConsent === true');
    expect(leads).toContain('if (lead.marketingConsent !== true)');
  });

  it('lets visitors reopen cookie settings after the banner is dismissed', () => {
    const stats = read('knowly-www/assets/stats.js');

    expect(stats).toContain('window.KnowlyCookieSettings');
    expect(stats).toContain('data-cookie-settings');
  });

  // зачем: Apple (ITMS-90683) требует purpose string для КАЖДОГО чувствительного
  // API, на который ссылается любая слинкованная библиотека — даже когда само
  // приложение им не пользуется. Сборку 113 отклонили именно за отсутствие
  // NSCameraUsageDescription: его тянет react-native-webrtc (стек MAX-звонка),
  // хотя видео там не снимается. Старая версия этого сторожа запрещала
  // NSPhotoLibraryUsageDescription как «ненужное», но медиатеку тянут
  // expo-file-system/expo-image, а react-native-view-shot сохраняет картинку
  // с результатами — разрешение обосновано. Поэтому сторожим не отсутствие
  // строк, а то, что каждая объявленная строка непустая и объясняет причину.
  it('declares a purpose string for every sensitive API linked into the iOS build', () => {
    const infoPlist = JSON.parse(read('app.json')).expo.ios.infoPlist;

    // Камера — от react-native-webrtc; микрофон и распознавание речи — от
    // произношения и MAX-звонка; медиатека — от сохранения результатов.
    const required = [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSSpeechRecognitionUsageDescription',
      'NSPhotoLibraryUsageDescription',
    ];

    for (const key of required) {
      expect(typeof infoPlist[key]).toBe('string');
      expect(infoPlist[key].trim().length).toBeGreaterThan(20);
    }
  });

  it('loads cookie settings on generated legal pages', () => {
    const legalSync = read('scripts/sync-legal-html.mjs');

    expect(legalSync).toContain('<script src="/assets/stats.js" defer></script>');
  });
});
