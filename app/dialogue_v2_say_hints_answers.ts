// dialogue_v2_say_hints_answers.ts — запасные ОТВЕТЫ на реплику собеседника для подсказок «Можно сказать…» (без сети, без ИИ).
// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»):
// журнал [DIALOG-HINTS] показал, что на «How are you today?» первой подсказкой шло «How are you?» — наборы из
// dialogue_v2_say_hints_local.ts собраны по ЦЕЛИ шага («о чём сказать»), а не как ответ на вопрос. Здесь — только фразы,
// которыми на такой вопрос действительно отвечают. Основной источник подсказок в сценариях — сервер (готовые ответы приходят
// вместе с репликой); этот набор нужен там, где сервер ещё ничего не прислал: заготовленная первая реплика и свободный разговор.
// Фразы без рода говорящего, как и в основном наборе. Переводы — на вычитку 10 · ПЕРЕВОДЧИКУ.
// Firebase-экономия: ноль чтений и вызовов — всё в бандле.
import type { LocalSayHint, SayHintInterfaceLang, SayHintStudyTarget } from './dialogue_v2_say_hints_local';

export type SayHintAnswerKind = 'howAreYou' | 'yesNo' | 'proposal';

type Meanings = Readonly<Record<SayHintInterfaceLang, string>>;
type Answer = Readonly<{ text: Readonly<Record<SayHintStudyTarget, string>>; meaning: Meanings }>;

const t = (en: string, es: string, fr: string, de: string) => ({ en, es, fr, de });
const m = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): Meanings =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

const ANSWERS: Readonly<Record<SayHintAnswerKind, readonly Answer[]>> = {
  howAreYou: [
    { text: t("I'm fine, thank you. And you?", 'Estoy bien, gracias. ¿Y tú?', 'Ça va bien, merci. Et toi ?', 'Mir geht es gut, danke. Und dir?'),
      meaning: m('У меня всё хорошо, спасибо. А у тебя?', 'У мене все добре, дякую. А в тебе?', "I'm fine, thank you. And you?", 'Estoy bien, gracias. ¿Y tú?', 'Estou bem, valeu. E você?', 'Mình khỏe, cảm ơn bạn. Còn bạn?', 'Aku baik, terima kasih. Kalau kamu?', 'İyiyim, teşekkürler. Ya sen?', 'Dobrze, dziękuję. A ty?') },
    { text: t('Pretty good, thanks.', 'Bastante bien, gracias.', 'Plutôt bien, merci.', 'Ganz gut, danke.'),
      meaning: m('Довольно хорошо, спасибо.', 'Доволі добре, дякую.', 'Pretty good, thanks.', 'Bastante bien, gracias.', 'Tudo bem, valeu.', 'Khá ổn, cảm ơn bạn.', 'Lumayan baik, terima kasih.', 'Oldukça iyiyim, teşekkürler.', 'Całkiem dobrze, dziękuję.') },
  ],
  yesNo: [
    { text: t('Yes, of course.', 'Sí, claro.', 'Oui, bien sûr.', 'Ja, klar.'),
      meaning: m('Да, конечно.', 'Так, звісно.', 'Yes, of course.', 'Sí, claro.', 'Sim, claro.', 'Vâng, tất nhiên.', 'Ya, tentu.', 'Evet, tabii.', 'Tak, oczywiście.') },
    { text: t('No, not really.', 'No, la verdad es que no.', 'Non, pas vraiment.', 'Nein, eigentlich nicht.'),
      meaning: m('Нет, не совсем.', 'Ні, не зовсім.', 'No, not really.', 'No, la verdad es que no.', 'Não, na verdade não.', 'Không, không hẳn.', 'Tidak, tidak juga.', 'Hayır, pek sayılmaz.', 'Nie, niezupełnie.') },
    { text: t("I don't know.", 'No lo sé.', 'Je ne sais pas.', 'Ich weiß nicht.'),
      meaning: m('Не знаю.', 'Не знаю.', "I don't know.", 'No lo sé.', 'Não sei.', 'Mình không biết.', 'Aku tidak tahu.', 'Bilmiyorum.', 'Nie wiem.') },
  ],
  proposal: [
    { text: t('Okay, agreed.', 'Vale, de acuerdo.', "D'accord, ça marche.", 'Okay, abgemacht.'),
      meaning: m('Хорошо, договорились.', 'Добре, домовилися.', 'Okay, agreed.', 'Vale, de acuerdo.', 'Beleza, combinado.', 'Được, thống nhất vậy nhé.', 'Oke, sepakat.', 'Tamam, anlaştık.', 'Dobrze, umowa stoi.') },
    { text: t('That works for me.', 'Me viene bien.', 'Ça me va.', 'Das passt mir.'),
      meaning: m('Мне подходит.', 'Мені підходить.', 'That works for me.', 'Me viene bien.', 'Para mim está ótimo.', 'Vậy là ổn với mình.', 'Itu cocok buatku.', 'Bana uyar.', 'Mi pasuje.') },
    { text: t("Sorry, I can't.", 'Lo siento, no puedo.', 'Pardon, je ne peux pas.', 'Tut mir leid, ich kann nicht.'),
      meaning: m('Извини, не могу.', 'Вибач, не можу.', "Sorry, I can't.", 'Lo siento, no puedo.', 'Desculpa, não posso.', 'Xin lỗi, mình không thể.', 'Maaf, aku tidak bisa.', 'Üzgünüm, yapamam.', 'Przepraszam, nie mogę.') },
  ],
};

const STUDY_TARGETS: readonly SayHintStudyTarget[] = ['en', 'es', 'fr', 'de'];
const INTERFACE_LANGS: readonly SayHintInterfaceLang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

/** Ответы на реплику собеседника. Неизвестный язык обучения → []; неизвестный язык интерфейса → смысл по-английски;
 *  язык интерфейса совпал с изучаемым → смысл null (вторая строка повторила бы фразу). */
export function answerSayHints(input: Readonly<{ studyTarget: string; kind: SayHintAnswerKind; interfaceLang: string }>): readonly LocalSayHint[] {
  const target = STUDY_TARGETS.find((lang) => lang === input.studyTarget);
  if (!target) {
    console.warn('[SAY-HINTS] unknown_study_target', JSON.stringify({ studyTarget: input.studyTarget, kind: input.kind })); // guard-ok: ранний выход пишет причину
    return [];
  }
  const ui = INTERFACE_LANGS.find((lang) => lang === input.interfaceLang) ?? 'en';
  return Object.freeze(ANSWERS[input.kind].map((answer) => Object.freeze({
    text: answer.text[target],
    meaning: ui === target ? null : answer.meaning[ui],
  })));
}
