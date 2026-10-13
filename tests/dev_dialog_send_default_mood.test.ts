// зачем (Макеты dialogs-019, разбор 13.10): шапка диалога под названием показывает настроение собеседника («Доволен»), а не запасное «Диалог».
// Настоящий ответ сервера несёт настроение всегда; подставной ход (dev_dialog_send) отдавал mood пустым — кадр расходился с образцом.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('подставной ход диалога: настроение в шапке', () => {
  it('без dev_dialog_mood подставной ход отдаёт «Доволен» (smile), с ним — заданное', () => {
    const client = read('app/dialogue_v2_turn_coaching_client.ts');
    expect(client).toContain("mood: devMood ?? 'smile', activeObjectiveId: null, dialogueEnded: devEnd,");
    expect(client).not.toContain('mood: devMood, activeObjectiveId: null');
  });

  it('шапка показывает настроение, а запасная подпись «Диалог» — только когда настроения ещё нет', () => {
    const header = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(header).toContain('{headerMood?.label ?? labels.subtitle}');
    const label = read('components/dialogs/glass/DialogueGlassSessionParts.tsx');
    expect(label).toContain("ru: 'Доволен', uk: 'Задоволений', en: 'Pleased'");
  });
});
