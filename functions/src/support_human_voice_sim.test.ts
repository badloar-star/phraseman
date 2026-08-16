import {
  classifySupportRisk,
  buildSafeHoldingReply,
  isPremiumAlternativePaymentQuestion,
  selectFinalAutoReply,
} from './support_auto_reply_policy';
import { findSupportHumanVoiceViolations } from './support_communication_bible';

/**
 * Симулятор живой поддержки.
 *
 * зачем (владелец, 2026-08-16: «мне надо чтобы Джарвис по-людски отвечал на
 * имейлы… моделируй ситуации, разные имейлы, будто от людей»): на проде из
 * 234 писем НИ ОДНОГО настоящего ответа — только заглушка «команда посмотрит
 * вручную». Этот файл — стенд, где видно, какие письма вообще доходят до
 * живого ответа, а какие блокируются ещё до генерации.
 *
 * Это НЕ тест конкретной функции. Это карта поведения на реальных
 * человеческих формулировках, которую можно перечитать после любой правки.
 */

interface Letter {
  readonly who: string;
  readonly subject: string;
  readonly body: string;
  /** Ждём ли мы, что на такое письмо можно ответить без ручной проверки. */
  readonly shouldAnswerItself: boolean;
}

const LETTERS: readonly Letter[] = Object.freeze([
  // ── Простые вопросы: тут Джарвис ОБЯЗАН отвечать сам ────────────────────
  {
    who: 'новичок спрашивает как заниматься',
    subject: 'Вопрос',
    body: 'Здравствуйте! Скачала приложение вчера. Подскажите, сколько минут в день лучше заниматься, чтобы был толк?',
    shouldAnswerItself: true,
  },
  {
    who: 'спрашивает про офлайн',
    subject: 'Интернет',
    body: 'Привет! А можно заниматься без интернета, в самолёте например?',
    shouldAnswerItself: true,
  },
  {
    who: 'благодарность',
    subject: 'Спасибо',
    body: 'Просто хотел сказать спасибо, приложение супер, занимаюсь месяц и уже чувствую прогресс!',
    shouldAnswerItself: true,
  },
  {
    who: 'просит новый язык',
    subject: 'Пожелание',
    body: 'Добрый день! Планируете добавить немецкий? Очень жду.',
    shouldAnswerItself: true,
  },
  {
    who: 'жалуется на сложность',
    subject: 'Тяжело',
    body: 'Здравствуйте. Уроки для меня слишком быстрые, я не успеваю запоминать слова. Что посоветуете?',
    shouldAnswerItself: true,
  },
  {
    who: 'спрашивает про сброс прогресса',
    subject: 'Начать заново',
    body: 'Хочу начать курс с нуля. Можно как-то обнулить прогресс?',
    shouldAnswerItself: true,
  },
  {
    who: 'english beginner',
    subject: 'How to start',
    body: 'Hi! I just installed the app. Where should I begin if my English is very basic?',
    shouldAnswerItself: true,
  },
  {
    who: 'раздражённый, но вопрос простой',
    subject: 'Ничего не понятно',
    body: 'Не могу разобраться где включить звук в упражнениях. Всё перерыл. Помогите уже.',
    shouldAnswerItself: true,
  },

  // ── Деньги и аккаунт: тут ручная проверка оправдана ─────────────────────
  {
    who: 'оплатил и не получил',
    subject: 'purchase in app',
    body: 'Hey! I paid for 80 pearls and received nothing. What should I do?',
    shouldAnswerItself: false,
  },
  {
    who: 'просит вернуть деньги',
    subject: 'Возврат',
    body: 'Здравствуйте, хочу вернуть деньги за годовую подписку, оформил случайно.',
    shouldAnswerItself: false,
  },
  {
    who: 'потерял доступ',
    subject: 'Не могу войти',
    body: 'Здравствуйте! Сменил телефон и не могу войти в свой аккаунт, весь прогресс там.',
    shouldAnswerItself: false,
  },
]);

describe('Симулятор: как Джарвис отвечает живым людям', () => {
  test('карта поведения по всем письмам', () => {
    const rows: string[] = [];
    let selfAnswered = 0;
    let blocked = 0;

    for (const letter of LETTERS) {
      const issue = `${letter.subject}\n${letter.body}`;
      const risk = classifySupportRisk(issue);
      const premiumRoute = isPremiumAlternativePaymentQuestion(issue);
      // Джарвис доходит до живой генерации только если тема безопасна.
      const reachesWriter = risk === 'safe' && !premiumRoute;
      if (reachesWriter) selfAnswered += 1; else blocked += 1;

      rows.push(
        `${reachesWriter ? 'ОТВЕЧАЕТ САМ ' : 'ЗАГЛУШКА    '} | risk=${risk.padEnd(8)} | ${letter.who}`,
      );
    }

    // eslint-disable-next-line no-console
    console.log('\n' + rows.join('\n')
      + `\n\nдоходит до живого ответа: ${selfAnswered} из ${LETTERS.length}, блокируется: ${blocked}\n`);

    expect(LETTERS.length).toBeGreaterThan(0);
  });

  // зачем этот тест (2026-08-16): классификатор пропускал письма к живой
  // генерации, но следом их рубил гейт доказательств — на «спасибо» и
  // «планируете немецкий?» доказательств в коде нет по природе вопроса.
  // Итог был: ноль настоящих ответов на проде. Проверяем СКВОЗНОЙ путь.
  test('болтовня без утверждений о продукте доходит до настоящего ответа', () => {
    const chatty = [
      ['Спасибо', 'Спасибо большое за тёплые слова! Очень приятно это слышать.'],
      ['Пожелание', 'Спасибо за идею — передал её команде, такие пожелания мы собираем.'],
    ] as const;

    for (const [subject, reply] of chatty) {
      const out = selectFinalAutoReply({
        issue: `${subject}\nтекст письма без упоминания функций`,
        risk: 'safe',
        context: {
          generatedAt: '2026-08-16T00:00:00.000Z', commit: 'a'.repeat(40), dirty: false,
          appVersion: '1.6.7', appBuild: '112', sourceFingerprint: 'f'.repeat(64),
          trustworthy: true, trustReason: 'verified_build_snapshot',
          queryConcepts: [], evidence: [],
        },
        draft: { reply, evidenceIds: [], confidence: 0.9, needsHuman: false },
        review: { approved: true, correctedReply: '', reasons: [] },
      });
      expect(out).toMatchObject({ grounded: true, reason: 'no_product_claim' });
    }
  });

  test('простые человеческие вопросы НЕ должны упираться в заглушку', () => {
    // зачем: именно это владелец и просит — «обращаться как живой человек».
    // Письмо «сколько заниматься в день» не содержит ничего, что требует
    // ручной проверки: ответ на него не зависит от чужого аккаунта и денег.
    const wrongly = LETTERS
      .filter((l) => l.shouldAnswerItself)
      .filter((l) => classifySupportRisk(`${l.subject}\n${l.body}`) !== 'safe')
      .map((l) => `${l.who} → ${classifySupportRisk(`${l.subject}\n${l.body}`)}`);
    expect(wrongly).toEqual([]);
  });

  test('деньги и доступ к аккаунту по-прежнему уходят на ручную проверку', () => {
    // зачем: живость не должна ломать защиту. Про чужую покупку Джарвис
    // выдумывать не имеет права.
    const leaked = LETTERS
      .filter((l) => !l.shouldAnswerItself)
      .filter((l) => classifySupportRisk(`${l.subject}\n${l.body}`) === 'safe'
        && !isPremiumAlternativePaymentQuestion(`${l.subject}\n${l.body}`))
      .map((l) => l.who);
    expect(leaked).toEqual([]);
  });

  test('заглушка, которую видит клиент, звучит по-человечески', () => {
    // зачем: даже когда Джарвис не может ответить по сути, текст не должен
    // быть казённым — это последнее, что видит живой человек.
    for (const risk of ['billing', 'account', 'safe'] as const) {
      const text = buildSafeHoldingReply('Здравствуйте! У меня вопрос.', risk);
      expect(findSupportHumanVoiceViolations(text, 'вопрос')).toEqual([]);
      expect(text).toMatch(/Здравствуйте/u);
    }
  });
});
