// зачем (владелец 11.11: «экран "звонит" лишний — объедини его с брифингом»): тексты звонка живут в шапке брифинга.
// Отдельным чистым файлом (только i18n), чтобы маршрут брифинга брал слова без анимаций и нативных модулей.
import { triLang, type Lang } from '../../constants/i18n';

/** Что брифинг показывает в шапке вместо плашки уровня и названия, когда сцена открыта. */
export type DialogueBriefingCall = Readonly<{ kicker: string; title: string; answer: string }>;

export function briefingCallText(lang: Lang) {
  return {
    incoming: (lvl: string) => triLang(lang, { ru: `Входящий · диалог ${lvl}`, uk: `Вхідний · діалог ${lvl}`, en: `Incoming · ${lvl} dialogue`, es: `Llamada entrante · diálogo ${lvl}`, 'pt-BR': `Chamada recebida · diálogo ${lvl}`, vi: `Cuộc gọi đến · hội thoại ${lvl}`, id: `Panggilan masuk · dialog ${lvl}`, tr: `Gelen arama · ${lvl} diyalog`, pl: `Połączenie przychodzące · dialog ${lvl}`, fr: `Appel entrant · dialogue ${lvl}`, de: `Eingehender Anruf · Dialog ${lvl}` }),
    calling: (name: string) => triLang(lang, { ru: `${name} звонит`, uk: `${name} телефонує`, en: `${name} is calling`, es: `${name} te llama`, 'pt-BR': `${name} está ligando`, vi: `${name} đang gọi`, id: `${name} menelepon`, tr: `${name} arıyor`, pl: `${name} dzwoni`, fr: `${name} t’appelle`, de: `${name} ruft an` }),
    partner: triLang(lang, { ru: 'Собеседник', uk: 'Співрозмовник', en: 'Your partner', es: 'Tu interlocutor', 'pt-BR': 'Seu parceiro', vi: 'Người trò chuyện', id: 'Lawan bicara', tr: 'Muhatabın', pl: 'Rozmówca', fr: 'Ton interlocuteur', de: 'Dein Gegenüber' }),
    answer: triLang(lang, { ru: 'Ответить', uk: 'Відповісти', en: 'Answer', es: 'Contestar', 'pt-BR': 'Atender', vi: 'Trả lời', id: 'Jawab', tr: 'Cevapla', pl: 'Odbierz', fr: 'Répondre', de: 'Annehmen' }),
  };
}

/** Собирает шапку-звонок для открытой сцены; без имени собеседника — «Собеседник звонит». */
export function buildBriefingCall(lang: Lang, cefr: string, partnerName: string | null | undefined): DialogueBriefingCall {
  const c = briefingCallText(lang);
  const name = partnerName?.trim() || c.partner;
  return Object.freeze({ kicker: c.incoming(cefr), title: c.calling(name), answer: c.answer });
}
