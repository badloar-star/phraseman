// зачем (cards-056, образец cards-states №50, Авторизация 13.10): у отправляемого отклика на набор — «отправляется…», у неотправленного — «не отправлено»,
// на месте времени в шапке строки; раньше строка только тускнела, а у неотправленного была лишь пара «Повторить / Удалить» без пояснения.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app/community_packs/PackCommentsSheet.tsx'), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('шторка комментариев набора: подписи отправки', () => {
  it('на месте времени — «отправляется…» и «не отправлено» на 9 языках', () => {
    for (const piece of [
      "ru: 'отправляется…'", "uk: 'надсилається…'", "en: 'sending…'", "es: 'enviando…'", "'pt-BR': 'enviando…'", "vi: 'đang gửi…'", "id: 'mengirim…'", "tr: 'gönderiliyor…'", "pl: 'wysyłanie…'",
      "ru: 'не отправлено'", "uk: 'не надіслано'", "en: 'not sent'", "es: 'no enviado'", "'pt-BR': 'não enviado'", "vi: 'chưa gửi được'", "id: 'belum terkirim'", "tr: 'gönderilemedi'", "pl: 'nie wysłano'",
    ]) {
      expect(source).toContain(piece);
    }
    expect(source).toContain("item.status === 'published' ? timeAgoLabel(item.createdAtMs, lang) : item.status === 'sending'");
  });

  it('«Повторить» и «Удалить» у неотправленного остались, логика отправки не тронута', () => {
    expect(source).toContain('onPress={() => handleRetry(item)}');
    expect(source).toContain('onPress={() => handleDiscardFailed(item.id)}');
    expect(source).toContain("opacity: item.status === 'sending' ? 0.6 : 1,");
  });
});
