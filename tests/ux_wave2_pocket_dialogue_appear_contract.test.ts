// Сторож (UX-волна 2, 04.11, владелец одобрил): в диалоге плавно появляются только НОВЫЕ реплики
// (история и восстановление — без анимации), Reduce Motion отключает движение. Без новых View в ленте (Animated.View заменяет View).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Реплики диалога', () => {
  const chat = read('components/dialogs/glass/DialogueGlassChat.tsx');
  it('пузырь анимируется только с appear и без Reduce Motion; новых View нет', () => {
    expect(chat).toContain('appear?: boolean;');
    expect(chat).toContain('const animate = appear === true && !reduceMotion;');
    expect(chat).toContain('useNativeDriver: true');
    expect(chat).toContain('<Animated.View testID={testID} style={[styles.row');
  });
  it.each(['components/dialogs/DialogueV2FreeformScreen.tsx', 'components/dialogs/DialogueV2SessionScreen.tsx'])('%s: appear только у реплик, пришедших после открытия экрана', (rel) => {
    const src = read(rel);
    expect(src).toContain('initialMessageIdsRef.current = new Set(messages.map((m) => m.id));');
    expect(src).toContain('appear={!initialMessageIdsRef.current?.has(message.id)}');
  });
});
