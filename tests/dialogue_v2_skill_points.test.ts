// зачем (D207, задача координатора 12.11): диалог качает «Речь» за реплику голосом и «Слух» за реплику собеседника, понятую без подсказки.
// «Без подсказки» = для этой реплики не открывали перевод / «Почему так» и ответ — не дословная фраза из «Можно сказать…».
import fs from 'node:fs';
import path from 'node:path';

import { dialogueV2TurnSkillActions, type DialogueV2TurnSkillInput } from '../app/dialogue_v2_skill_points';

const base: DialogueV2TurnSkillInput = Object.freeze({
  scenarioId: 'cafe_01',
  learnerText: 'A latte, please.',
  voiced: false,
  partner: { id: 'persona_1', text: 'Hi! What can I get you?' },
  helpedPartnerIds: new Set<string>(),
  sayHintTexts: ['Can I have a coffee?'],
});
const actions = (patch: Partial<DialogueV2TurnSkillInput>) => dialogueV2TurnSkillActions({ ...base, ...patch }).map((event) => event.action);

describe('очки навыков за ход диалога', () => {
  it('голосом и без подсказки — «Речь» и «Слух»', () => {
    expect(actions({ voiced: true })).toEqual(['dialog_voice_reply', 'dialog_understood_no_hint']);
  });
  it('текстом без подсказки — только «Слух»', () => {
    expect(actions({})).toEqual(['dialog_understood_no_hint']);
  });
  it('открывал перевод или «Почему так» этой реплики — «Слуха» нет, голос считается', () => {
    expect(actions({ voiced: true, helpedPartnerIds: new Set(['persona_1']) })).toEqual(['dialog_voice_reply']);
  });
  it('помощь по другой реплике «Слух» не отнимает', () => {
    expect(actions({ helpedPartnerIds: new Set(['persona_0']) })).toEqual(['dialog_understood_no_hint']);
  });
  it('вставил фразу из «Можно сказать…» (регистр, пробелы и точка не важны) — «Слуха» нет', () => {
    expect(actions({ learnerText: '  can I have a   coffee ' })).toEqual([]);
    expect(actions({ learnerText: 'Can I have a coffee, please?' })).toEqual(['dialog_understood_no_hint']);
  });
  it('отвечать было не на что или реплика пустая — ничего', () => {
    expect(actions({ partner: null })).toEqual([]);
    expect(actions({ voiced: true, learnerText: '   ' })).toEqual([]);
  });
  it('ключ повтора — сценарий и сама фраза: та же фраза за день даёт половину, другая — полные очки', () => {
    const [voice, heard] = dialogueV2TurnSkillActions({ ...base, voiced: true, learnerText: 'A Latte,  please!' });
    expect(voice.itemKey).toBe('dialogue_v2:cafe_01:voice:a latte, please');
    expect(heard.itemKey).toBe('dialogue_v2:cafe_01:heard:hi! what can i get you');
  });
});

describe('подключение к экранам диалога', () => {
  const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8');
  const completion = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');
  it('экран диалога объявляет занятие и начисляет только за принятый сервером ход', () => {
    expect(route).toContain('useSkillSession();');
    expect(route).toContain("if (result.kind === 'reply' && !result.replayed) {");
    expect(route).toContain('skillActions.forEach((event) => noteSkillAction(event));');
  });
  it('перевод и «Почему так» отмечают реплику как подсказанную', () => {
    expect(route).toContain("markPartnerHelped(messageId, 'translation'); coaching.toggleTranslation(messageId);");
    expect(route).toContain("markPartnerHelped(messageId, 'why'); coaching.openWhy(messageId);");
  });
  it('итог диалога показывает «Навыки растут»', () => {
    expect(completion).toContain('<SkillsSessionGrowth style={{ marginTop: 22 }} testID="dialogue-v2-completion-skills" />');
  });
});
