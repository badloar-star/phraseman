// Удобство №6 (владелец одобрил 04.11): долгое нажатие на реплику диалога — меню «Скопировать · Поделиться · Медленнее · В карточки».
// Шторка — общий ThemedChoiceModal; пузырь меняет View на Pressable в том же слоте (новых View нет); «Медленнее» — системный голос 0,7× (slowNow).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('меню реплики диалога', () => {
  const menu = read('components/dialogs/DialogueReplyMenu.tsx');
  it('общая шторка ThemedChoiceModal, 4 действия, строки Переводчика на 9 языках', () => {
    expect(menu).toContain("import ThemedChoiceModal, { type ThemedChoice } from '../ThemedChoiceModal';");
    for (const text of ['Скопировать', 'Скопіювати', 'Copy', 'Copiar', 'Sao chép', 'Salin', 'Kopyala', 'Kopiuj',
      'Поделиться', 'Поділитися', 'Share', 'Compartilhar', 'Chia sẻ', 'Bagikan', 'Paylaş', 'Udostępnij',
      'Медленнее', 'Повільніше', 'Slower', 'Más lento', 'Mais devagar', 'Chậm hơn', 'Lebih lambat', 'Daha yavaş', 'Wolniej',
      'В карточки', 'У картки', 'To cards', 'A tarjetas', 'Para cartões', 'Vào thẻ', 'Ke kartu', 'Kartlara ekle', 'Do kart']) {
      expect(menu).toContain(text);
    }
  });
  it('«В карточки» показывается только когда есть перевод реплики; лимит Free — тост как у сохранения из видео', () => {
    expect(menu).toContain('if (translation) list.push({ label: labels.toCards');
    expect(menu).toContain('videoCardSaveToast(result, lang)');
    expect(menu).toContain("source: 'dialog'");
  });
  it('«Медленнее»: системный голос на 0,7× сразу (slowNow), без ожидания повтора', () => {
    expect(menu).toContain('systemTtsOnly: true, slowNow: true');
    const audio = read('hooks/use-audio.ts');
    expect(audio).toContain('slowNow?: boolean;');
    // зачем (владелец 11.11.2026, «Убрать медленный повтор»): автозамедление повтора снято, кнопка «Медленнее» осталась
    expect(audio).toContain('const safeRate = slowNow ? SLOW_NOW_RATE : normalizeSpeechRate(undefined);');
    expect(audio).not.toContain('slowByRepeat');
  });
  it('пузырь: onLongPress меняет View на Pressable в том же слоте, без лишних View', () => {
    const chat = read('components/dialogs/glass/DialogueGlassChat.tsx');
    expect(chat).toContain('onLongPress?: () => void;');
    expect(chat).toContain('<Pressable accessibilityRole="text" delayLongPress={380} onLongPress={onLongPress} style={[styles.bubble, bubble]}>{children}</Pressable>');
  });
  it.each(['components/dialogs/DialogueV2FreeformScreen.tsx', 'components/dialogs/DialogueV2SessionScreen.tsx'])('%s: долгое нажатие открывает меню, меню рисуется один раз', (rel) => {
    const src = read(rel);
    expect(src).toContain('setReplyMenu({ id: message.id, text: message.text');
    expect(src).toContain('<DialogueReplyMenu target={replyMenu} onClose={closeReplyMenu} />');
    expect(src.split('<DialogueReplyMenu ').length).toBe(2);
  });
});
