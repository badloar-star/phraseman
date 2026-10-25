// зачем (Ядро e384e0228, Переводчик f4cb658a2, 26.10): окно согласия ИИ-диалогов обещало «запись голоса остаётся на телефоне»,
// а голос распознаёт сервис телефона (Apple / Google), который может обработать его на своих серверах. Текст обязан это
// называть на всех 9 языках и совпадать с политикой (раздел 13).
import { readSource } from './helpers/read_source';

const LANGS = ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl'];

describe('окно согласия ИИ-диалогов: правда про голос', () => {
  const src = readSource('components/AiDialogConsentModal.tsx');
  const block = src.slice(src.indexOf('const body = triLang(lang, {'), src.indexOf('});', src.indexOf('const body = triLang(lang, {')));

  it.each(LANGS)('%s: называет OpenAI, Apple и Google', (lang) => {
    const line = block.split('\n').find((l) => l.trimStart().startsWith(`${lang}: '`));
    expect(line).toBeDefined();
    for (const word of ['OpenAI', 'Apple', 'Google']) expect(line).toContain(word);
  });

  it('прежних обещаний без оговорки в тексте окна нет', () => {
    for (const old of ['запись голоса остаётся на телефоне', 'your voice recording stays on your phone', 'запис голосу залишається на телефоні']) {
      expect(block).not.toContain(old); // текст окна; комментарий-предупреждение рядом сам называет старую фразу
    }
  });

  it('политика (раздел 13) говорит то же: Google на Android, Apple на iPhone, может обрабатывать на серверах', () => {
    for (const rel of ['legal/privacy_policy_en.json', 'legal/privacy_policy_en_ios.json']) {
      const policy = readSource(rel);
      expect(policy).toContain("system speech recogniser, which may be provided by Google");
      expect(policy).toContain("may process your voice on the device or on Apple's servers");
    }
  });
});
