import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website privacy consent contract', () => {
  // зачем: страница сбора e-mail квиз-плана (knowly-www/assets/start.js) удалена коммитом 1d70c8fc5 (release 1.6.21 build 127), submitLead
  // в knowly-www не существует. Прежняя проверка читала несуществующий файл. По смыслу «сайт не просит маркетинговое согласие» теперь
  // проверяем так: ни одна страница/скрипт сайта не содержит UI маркетингового согласия и не шлёт marketingConsent: true. Если сбор
  // вернут — тест сразу потребует явного решения (адрес и согласие должны быть отражены в политике).
  it('has no marketing-consent collection anywhere on the website', () => {
    const walk = (dir: string): string[] => fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(rel);
      return /.(html|js)$/.test(entry.name) ? [rel] : [];
    });
    const files = walk('knowly-www');
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const text = read(file);
      expect(text).not.toContain('qlead-marketing-consent');
      expect(text).not.toContain('Можно присылать мне до двух писем');
      expect(text).not.toMatch(/marketingConsents*:s*true/);
    }
    expect(files.some((file) => /start.js$/.test(file) && read(file).includes('submitLead'))).toBe(false);
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

    // Камера — от react-native-webrtc/expo-modules-core; микрофон и распознавание
    // речи — от произношения и MAX-звонка; медиатека — от expo-file-system/
    // expo-image и сохранения результатов; движение — от sensor-модуля внутри
    // react-native-reanimated (useAnimatedSensor в приложении не вызывается,
    // но CMMotionManager всё равно слинкован).
    const required = [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSSpeechRecognitionUsageDescription',
      'NSPhotoLibraryUsageDescription',
      'NSMotionUsageDescription',
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
