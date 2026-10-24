// зачем (владелец 24.10: «Диалоги должны быть с подсказками, что сказать — постоянно, я ноль»): локальный набор фраз —
// у каждого типа шага и каждого языка обучения ровно 3 фразы, у каждой смысл на 9 языках интерфейса; тип шага по подписи цели.
import {
  localSayHints,
  sayHintGoalKindForFreeformTurn,
  sayHintGoalKindForObjectiveLabel,
  type SayHintGoalKind,
} from '../app/dialogue_v2_say_hints_local';
import { sanitizeDialogSayHints } from '../components/dialogs/hints/dialog_say_hints_model';

const KINDS: SayHintGoalKind[] = ['greet', 'introduce', 'howAreYou', 'order', 'askHelp', 'thanks', 'goodbye', 'askQuestion', 'suggest', 'confirm', 'apologize', 'generic'];
const TARGETS = ['en', 'es', 'fr', 'de'];
const UI = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('локальные подсказки «Можно сказать…»', () => {
  it('каждый тип × язык обучения × язык интерфейса: 3 фразы, все проходят очистку Дизайна, смысл есть (кроме совпадения языков)', () => {
    for (const goalKind of KINDS) for (const studyTarget of TARGETS) for (const interfaceLang of UI) {
      const hints = localSayHints({ studyTarget, goalKind, interfaceLang });
      expect(hints).toHaveLength(3);
      expect(sanitizeDialogSayHints(hints)).toHaveLength(3);
      for (const hint of hints) {
        if (interfaceLang === studyTarget) expect(hint.meaning).toBeNull();
        else expect(hint.meaning?.trim().length ?? 0).toBeGreaterThan(1);
      }
    }
  });

  it('фразы разных языков обучения разные (не забыт перевод с английского)', () => {
    for (const goalKind of KINDS) {
      const en = localSayHints({ studyTarget: 'en', goalKind, interfaceLang: 'ru' }).map((h) => h.text);
      for (const studyTarget of ['es', 'fr', 'de']) {
        const other = localSayHints({ studyTarget, goalKind, interfaceLang: 'ru' }).map((h) => h.text);
        expect(other.filter((text, i) => text === en[i])).toEqual([]);
      }
    }
  });

  it('неизвестный язык обучения → пусто с журналом; неизвестный язык интерфейса → смысл по-английски', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(localSayHints({ studyTarget: 'it', goalKind: 'greet', interfaceLang: 'ru' })).toEqual([]);
    expect(String(warn.mock.calls[0]?.[0])).toContain('[SAY-HINTS] unknown_study_target');
    warn.mockRestore();
    expect(localSayHints({ studyTarget: 'es', goalKind: 'greet', interfaceLang: 'xx' })[0]?.meaning).toBe('Hello!');
  });

  it('тип шага по подписи цели', () => {
    const cases: Array<[string, SayHintGoalKind]> = [
      ['поздороваться', 'greet'],
      ['представиться', 'introduce'],
      ['спросить цену', 'order'],
      ['подтвердить заказ', 'order'],
      ['попросить повторить непонятное', 'askHelp'],
      ['предложить конкретную помощь', 'suggest'],
      ['поблагодарить за встречу', 'thanks'],
      ['закрыть тему естественно.', 'goodbye'],
      ['договориться о следующем шаге.', 'confirm'],
      ['задать один простой вопрос', 'askQuestion'],
      ['извиниться', 'apologize'],
      ['say goodbye', 'goodbye'],
      ['ask the price', 'order'],
      ['назвать место', 'generic'],
      ['', 'generic'],
    ];
    for (const [label, kind] of cases) expect([label, sayHintGoalKindForObjectiveLabel(label)]).toEqual([label, kind]);
    expect(sayHintGoalKindForObjectiveLabel(undefined)).toBe('generic');
  });

  it('свободный диалог: приветствие → о себе → как дела → общие', () => {
    expect([0, 1, 2, 3, 9].map(sayHintGoalKindForFreeformTurn)).toEqual(['greet', 'introduce', 'howAreYou', 'generic', 'generic']);
  });
});
