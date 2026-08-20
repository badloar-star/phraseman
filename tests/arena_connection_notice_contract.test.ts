import fs from 'fs';
import path from 'path';

import { arenaText } from '../modules/arena/copy';

const ROOT = path.join(__dirname, '..');
const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const OFFLINE_COPY: Record<(typeof LANGS)[number], { title: string; hint: string }> = {
  ru: { title: 'Нет подключения', hint: 'Свежие данные появятся, когда вернётся сеть. Для матча нужна сеть.' },
  uk: { title: 'Немає з’єднання', hint: 'Свіжі дані з’являться, коли повернеться мережа. Для матчу потрібна мережа.' },
  es: { title: 'Sin conexión', hint: 'Los datos actuales aparecerán cuando vuelva la conexión. Necesitas conexión para jugar.' },
  'pt-BR': { title: 'Sem conexão', hint: 'Os dados atuais aparecem quando a conexão voltar. É preciso conexão para jogar.' },
  vi: { title: 'Không có kết nối', hint: 'Dữ liệu mới sẽ xuất hiện khi có mạng lại. Cần mạng để bắt đầu trận.' },
  id: { title: 'Tidak ada koneksi', hint: 'Data terbaru muncul saat jaringan kembali. Perlu jaringan untuk bertanding.' },
  tr: { title: 'Bağlantı yok', hint: 'Güncel veriler ağ geri gelince görünecek. Maç için ağ gerekli.' },
  pl: { title: 'Brak połączenia', hint: 'Aktualne dane pojawią się po powrocie sieci. Do meczu potrzebna jest sieć.' },
};

describe('ArenaConnectionNotice contract', () => {
  it('uses the approved offline title and hint in every supported language', () => {
    for (const lang of LANGS) {
      expect(arenaText(lang, 'hubOffline')).toBe(OFFLINE_COPY[lang].title);
      expect(arenaText(lang, 'hubOfflineHint')).toBe(OFFLINE_COPY[lang].hint);
    }
  });

  it('keeps the offline notice accessible and its accent retry control legible', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'arena', 'ArenaConnectionNotice.tsx'), 'utf8');

    expect(source).toContain('testID="arena-hub-offline"');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain("arenaText(lang, 'retry')");
    expect(source).toContain('onRetry');
    expect(source).toContain('backgroundColor: P.accent');
    expect(source).toContain('color: P.okInk');
    expect(source).not.toMatch(/retryText[^\n]*color:\s*['\"](?:#fff|white)['\"]/i);
  });
});
