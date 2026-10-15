// зачем (решения владельца 12.10, журнал п.81 (13): «состояния из макетов СДЕЛАТЬ в приложении»): «Отправляем заявку…» (community-010) и бейдж «PLUS» на микрофоне (dialogs-028).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('community-010: «Отправляем заявку…» — состояние достижимо в приложении', () => {
  const friends = read('app/(tabs)/friends.tsx');
  const kit = read('components/friends/FriendsGlassKit.tsx');

  it('на тапе «Добавить»: карточка скрывается сразу (Optimistic UI), а вместо преждевременного «Заявка отправлена!» — ожидание', () => {
    const start = friends.indexOf('const handleAddFound = useCallback');
    const body = friends.slice(start, friends.indexOf("friends:add_request_start", start));
    expect(body).toContain('setFoundUser(null);');
    expect(body).toContain("'Отправляем заявку…'");
    expect(body).toContain("'pending'");
    expect(body).not.toContain("'Заявка отправлена!'");
  });

  it('все 9 языков для текста ожидания; «Заявка отправлена!» показывается ТОЛЬКО по результату sent', () => {
    for (const text of ['Отправляем заявку…', 'Надсилаємо заявку…', 'Sending request…', 'Enviando solicitud…', 'Enviando solicitação…', 'Đang gửi lời mời…', 'Mengirim permintaan…', 'İstek gönderiliyor…', 'Wysyłamy zaproszenie…']) {
      expect(friends).toContain(text);
    }
    const sentBranch = friends.slice(friends.indexOf("if (result === 'sent') {"), friends.indexOf("} else if (result === 'already_friends') {"));
    expect(sentBranch).toContain("'Заявка отправлена!'");
  });

  it('ожидание не гаснет по обычным 2,5 с — только по страховочному потолку 20 с, пока не придёт результат', () => {
    expect(friends).toContain('const FRIEND_FEEDBACK_PENDING_CEILING_MS = 20_000;');
    expect(friends).toContain("tone === 'pending' ? FRIEND_FEEDBACK_PENDING_CEILING_MS : 2500");
  });

  it('строка ответа рисует pending тихим тоном и крутилкой, а не значком результата', () => {
    expect(kit).toContain("tone: 'error' | 'success' | 'pending';");
    expect(kit).toContain("tone === 'pending' ? t.textMuted : t.correct");
    expect(kit).toContain("tone === 'pending'\n        ? <ActivityIndicator");
  });
});

describe('dialogs-028: бейдж остатка/«PLUS» на микрофоне', () => {
  const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');

  it('значок на микрофоне — общая цифра остатка (MicAllowanceBadge, на нуле «PLUS» внутри него); цвета — токены темы, не hex', () => {
    // зачем (владелец 15.10, D196): вместо отдельного значка «PLUS» по старому состоянию — цифра общего дневного счётчика; проп micPlusBadge остался для подписи диктора
    expect(screen).toContain('micPlusBadge?: boolean;');
    expect(screen).toContain('micPlusBadge = false,');
    expect(screen).toContain('<MicAllowanceBadge size="sm" testID="dialogue-v2-voice-allowance" />');
    const badge = read('components/MicAllowanceBadge.tsx');
    expect(badge).toContain('plusFill: g.cta, plusInk: g.ctaInk');
    expect(badge).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('озвучка для экранных дикторов: у кнопки с бейджем в подписи есть «Plus»', () => {
    expect(screen).toContain("${micPlusBadge ? ', Plus' : ''}");
  });

  it('сам бейдж не меняет поведение кнопки: нажатие, блокировка и прозрачность остаются прежними', () => {
    expect(screen).toContain('onPressIn={onStartVoice}');
    expect(screen).toContain('opacity: sending || voiceUnavailable ? 0.55 : 1');
  });
});
