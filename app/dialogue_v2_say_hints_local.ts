// dialogue_v2_say_hints_local.ts — локальный набор подсказок «Можно сказать…» для Диалогов (без сети, без ИИ).
// зачем (владелец 24.10 через координатора: «Диалоги должны быть с подсказками, что сказать — постоянно, я ноль, но хочу учиться»;
// формат — 2 · ДИЗАЙН 24.10): к релизу 25.10 подсказки нужны сразу, а поле фраз в ответе хода появится только после релиза
// (свободный диалог отдаёт простой текст). Поэтому — заготовленный набор по цели шага: 3 простые фразы на изучаемом языке и смысл
// каждой на языке интерфейса. Фразы подобраны без рода говорящего (не «enchanté/enchantée», не «seguro/segura»), чтобы
// подходили любому ученику. Перевод — на вычитку 10 · ПЕРЕВОДЧИКУ.
// Firebase-экономия: ноль чтений и вызовов — всё в бандле, ~10 КБ текста.

export type SayHintStudyTarget = 'en' | 'es' | 'fr' | 'de';
export type SayHintLevel = 'A0' | 'A1' | 'A2';
export type SayHintGoalKind = 'greet' | 'introduce' | 'howAreYou' | 'order' | 'askHelp' | 'thanks' | 'goodbye'
  // зачем: по замеру 24.10 восемь типов Дизайна покрывали 40 из 468 целей сценариев — остальные (спросить, предложить,
  // договориться, извиниться) получали «Да, конечно / Не знаю», бесполезные для шага. Четыре типа ниже — самые частые глаголы целей.
  | 'askQuestion' | 'suggest' | 'confirm' | 'apologize' | 'generic';
export type SayHintInterfaceLang = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

export type LocalSayHint = Readonly<{ text: string; meaning: string | null }>;

type Meanings = Readonly<Record<SayHintInterfaceLang, string>>;
type Concept = Readonly<{ text: Readonly<Record<SayHintStudyTarget, string>>; meaning: Meanings }>;

const t = (en: string, es: string, fr: string, de: string) => ({ en, es, fr, de });
const m = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): Meanings =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

// Один набор для всех уровней: для 25.10 нужен именно старт «с нуля»; уровень принимается, чтобы позже развести наборы без смены вызова.
const CONCEPTS: Readonly<Record<SayHintGoalKind, readonly Concept[]>> = {
  greet: [
    { text: t('Hello!', '¡Hola!', 'Bonjour !', 'Hallo!'),
      meaning: m('Привет!', 'Привіт!', 'Hello!', '¡Hola!', 'Olá!', 'Xin chào!', 'Halo!', 'Merhaba!', 'Cześć!') },
    { text: t("Hi! How's your day going?", '¡Hola! ¿Qué tal tu día?', 'Salut ! Ta journée se passe bien ?', 'Hallo! Wie läuft dein Tag?'),
      meaning: m('Привет! Как проходит день?', 'Привіт! Як минає день?', "Hi! How's your day going?", '¡Hola! ¿Qué tal tu día?', 'Oi! Como está sendo o seu dia?', 'Chào bạn! Hôm nay của bạn thế nào?', 'Hai! Bagaimana harimu?', 'Selam! Günün nasıl geçiyor?', 'Cześć! Jak mija dzień?') },
    { text: t('Nice to meet you.', 'Mucho gusto.', "C'est un plaisir de vous rencontrer.", 'Freut mich, dich kennenzulernen.'),
      meaning: m('Приятно познакомиться.', 'Приємно познайомитися.', 'Nice to meet you.', 'Mucho gusto.', 'Prazer em conhecer você.', 'Rất vui được gặp bạn.', 'Senang bertemu denganmu.', 'Tanıştığımıza memnun oldum.', 'Miło mi cię poznać.') },
  ],
  introduce: [
    { text: t("I'm just starting to learn.", 'Estoy empezando a aprender.', 'Je commence à apprendre.', 'Ich lerne gerade erst.'),
      meaning: m('Я только начинаю учиться.', 'Я тільки починаю вчитися.', "I'm just starting to learn.", 'Estoy empezando a aprender.', 'Estou só começando a aprender.', 'Mình mới bắt đầu học.', 'Aku baru mulai belajar.', 'Öğrenmeye yeni başlıyorum.', 'Dopiero zaczynam się uczyć.') },
    { text: t('Let me tell you a bit about myself.', 'Te cuento un poco sobre mí.', 'Je vais me présenter un peu.', 'Ich erzähle kurz etwas über mich.'),
      meaning: m('Расскажу немного о себе.', 'Розкажу трохи про себе.', 'Let me tell you a bit about myself.', 'Te cuento un poco sobre mí.', 'Vou contar um pouco sobre mim.', 'Mình kể một chút về bản thân nhé.', 'Aku cerita sedikit tentang diriku.', 'Biraz kendimden bahsedeyim.', 'Opowiem trochę o sobie.') },
    { text: t("And what's your name?", '¿Y cómo te llamas?', "Et toi, comment tu t'appelles ?", 'Und wie heißt du?'),
      meaning: m('А как тебя зовут?', 'А як тебе звати?', "And what's your name?", '¿Y cómo te llamas?', 'E qual é o seu nome?', 'Còn bạn tên là gì?', 'Kalau kamu, namamu siapa?', 'Peki senin adın ne?', 'A jak ty masz na imię?') },
  ],
  howAreYou: [
    { text: t('How are you?', '¿Cómo estás?', 'Comment ça va ?', 'Wie geht es dir?'),
      meaning: m('Как дела?', 'Як справи?', 'How are you?', '¿Cómo estás?', 'Como você está?', 'Bạn khỏe không?', 'Apa kabar?', 'Nasılsın?', 'Jak się masz?') },
    { text: t("I'm fine, thank you.", 'Estoy bien, gracias.', 'Ça va bien, merci.', 'Mir geht es gut, danke.'),
      meaning: m('У меня всё хорошо, спасибо.', 'У мене все добре, дякую.', "I'm fine, thank you.", 'Estoy bien, gracias.', 'Estou bem, valeu.', 'Mình khỏe, cảm ơn bạn.', 'Aku baik, terima kasih.', 'İyiyim, teşekkürler.', 'Dobrze, dziękuję.') },
    { text: t('And you?', '¿Y tú?', 'Et toi ?', 'Und dir?'),
      meaning: m('А у тебя?', 'А в тебе?', 'And you?', '¿Y tú?', 'E você?', 'Còn bạn?', 'Kalau kamu?', 'Ya sen?', 'A ty?') },
  ],
  order: [
    { text: t("I'd like a coffee, please.", 'Quisiera un café, por favor.', "Je voudrais un café, s'il vous plaît.", 'Ich hätte gern einen Kaffee, bitte.'),
      meaning: m('Мне кофе, пожалуйста.', 'Мені каву, будь ласка.', "I'd like a coffee, please.", 'Quisiera un café, por favor.', 'Eu queria um café, por favor.', 'Cho mình một ly cà phê nhé.', 'Saya mau kopi satu, ya.', 'Bir kahve alabilir miyim, lütfen?', 'Poproszę kawę.') },
    { text: t('How much is it?', '¿Cuánto cuesta?', "C'est combien ?", 'Was kostet das?'),
      meaning: m('Сколько это стоит?', 'Скільки це коштує?', 'How much is it?', '¿Cuánto cuesta?', 'Quanto custa?', 'Cái này bao nhiêu tiền?', 'Berapa harganya?', 'Bu ne kadar?', 'Ile to kosztuje?') },
    { text: t('The bill, please.', 'La cuenta, por favor.', "L'addition, s'il vous plaît.", 'Die Rechnung, bitte.'),
      meaning: m('Счёт, пожалуйста.', 'Рахунок, будь ласка.', 'The bill, please.', 'La cuenta, por favor.', 'A conta, por favor.', 'Cho mình xin hóa đơn.', 'Minta bonnya, ya.', 'Hesap, lütfen.', 'Poproszę rachunek.') },
  ],
  askHelp: [
    { text: t('Can you help me, please?', '¿Me puedes ayudar, por favor?', "Tu peux m'aider, s'il te plaît ?", 'Kannst du mir bitte helfen?'),
      meaning: m('Можешь мне помочь?', 'Можеш мені допомогти?', 'Can you help me, please?', '¿Me puedes ayudar, por favor?', 'Você pode me ajudar, por favor?', 'Bạn giúp mình được không?', 'Bisa bantu aku?', 'Bana yardım eder misin?', 'Możesz mi pomóc?') },
    { text: t("Sorry, I don't understand.", 'Perdona, no entiendo.', 'Pardon, je ne comprends pas.', 'Entschuldigung, ich verstehe das nicht.'),
      meaning: m('Извини, я не понимаю.', 'Вибач, я не розумію.', "Sorry, I don't understand.", 'Perdona, no entiendo.', 'Desculpa, não entendi.', 'Xin lỗi, mình không hiểu.', 'Maaf, aku tidak mengerti.', 'Pardon, anlamadım.', 'Przepraszam, nie rozumiem.') },
    { text: t('Can you say it more simply?', '¿Puedes decirlo más fácil?', 'Tu peux le dire plus simplement ?', 'Kannst du das einfacher sagen?'),
      meaning: m('Можешь сказать проще?', 'Можеш сказати простіше?', 'Can you say it more simply?', '¿Puedes decirlo más fácil?', 'Você pode falar de um jeito mais simples?', 'Bạn nói đơn giản hơn được không?', 'Bisa bilang dengan lebih sederhana?', 'Daha basit söyleyebilir misin?', 'Możesz powiedzieć to prościej?') },
  ],
  thanks: [
    { text: t('Thank you very much!', '¡Muchas gracias!', 'Merci beaucoup !', 'Vielen Dank!'),
      meaning: m('Большое спасибо!', 'Щиро дякую!', 'Thank you very much!', '¡Muchas gracias!', 'Valeu mesmo!', 'Cảm ơn bạn rất nhiều!', 'Terima kasih banyak!', 'Çok teşekkürler!', 'Bardzo dziękuję!') },
    { text: t('That really helps.', 'Eso me ayuda mucho.', "Ça m'aide beaucoup.", 'Das hilft mir sehr.'),
      meaning: m('Это мне очень помогает.', 'Це мені дуже допомагає.', 'That really helps.', 'Eso me ayuda mucho.', 'Isso me ajuda muito.', 'Điều đó giúp mình nhiều lắm.', 'Itu sangat membantu.', 'Bu bana çok yardımcı oluyor.', 'To mi bardzo pomaga.') },
    { text: t("That's very kind of you.", 'Eres muy amable.', "C'est très gentil.", 'Das ist sehr nett von dir.'),
      meaning: m('Это очень мило с твоей стороны.', 'Це дуже мило з твого боку.', "That's very kind of you.", 'Eres muy amable.', 'Você é muito gentil.', 'Bạn thật tốt bụng.', 'Kamu baik sekali.', 'Çok naziksin.', 'To bardzo miłe z twojej strony.') },
  ],
  goodbye: [
    { text: t('Goodbye!', '¡Adiós!', 'Au revoir !', 'Auf Wiedersehen!'),
      meaning: m('До свидания!', 'До побачення!', 'Goodbye!', '¡Adiós!', 'Tchau!', 'Tạm biệt!', 'Sampai jumpa!', 'Hoşça kal!', 'Do widzenia!') },
    { text: t('See you soon!', '¡Hasta pronto!', 'À bientôt !', 'Bis bald!'),
      meaning: m('До скорого!', 'До зустрічі!', 'See you soon!', '¡Hasta pronto!', 'Até logo!', 'Hẹn sớm gặp lại!', 'Sampai nanti!', 'Görüşürüz!', 'Do zobaczenia!') },
    { text: t('Have a nice day!', '¡Que tengas un buen día!', 'Bonne journée !', 'Schönen Tag noch!'),
      meaning: m('Хорошего дня!', 'Гарного дня!', 'Have a nice day!', '¡Que tengas un buen día!', 'Tenha um ótimo dia!', 'Chúc bạn một ngày tốt lành!', 'Semoga harimu menyenangkan!', 'İyi günler!', 'Miłego dnia!') },
  ],
  askQuestion: [
    { text: t('What do you think?', '¿Qué te parece?', "Qu'est-ce que tu en penses ?", 'Was meinst du?'),
      meaning: m('Как ты думаешь?', 'Як ти думаєш?', 'What do you think?', '¿Qué te parece?', 'O que você acha?', 'Bạn nghĩ sao?', 'Menurutmu bagaimana?', 'Sence nasıl?', 'Co o tym myślisz?') },
    { text: t('When is a good time for you?', '¿Cuándo te viene bien?', "Quand est-ce que ça t'arrange ?", 'Wann passt es dir?'),
      meaning: m('Когда тебе удобно?', 'Коли тобі зручно?', 'When is a good time for you?', '¿Cuándo te viene bien?', 'Quando fica bom para você?', 'Khi nào bạn tiện?', 'Kapan kamu bisa?', 'Sana ne zaman uyar?', 'Kiedy ci pasuje?') },
    { text: t('Where exactly?', '¿Dónde exactamente?', 'Où exactement ?', 'Wo genau?'),
      meaning: m('Где именно?', 'Де саме?', 'Where exactly?', '¿Dónde exactamente?', 'Onde exatamente?', 'Chính xác là ở đâu?', 'Tepatnya di mana?', 'Tam olarak nerede?', 'Gdzie dokładnie?') },
  ],
  suggest: [
    { text: t('How about tomorrow?', '¿Qué tal mañana?', 'Et si on disait demain ?', 'Wie wäre es mit morgen?'),
      meaning: m('Может, завтра?', 'Може, завтра?', 'How about tomorrow?', '¿Qué tal mañana?', 'Que tal amanhã?', 'Ngày mai thì sao?', 'Bagaimana kalau besok?', 'Yarına ne dersin?', 'Może jutro?') },
    { text: t("Let's meet at six.", 'Quedamos a las seis.', 'On se voit à six heures.', 'Treffen wir uns um sechs.'),
      meaning: m('Давай встретимся в шесть.', 'Давай зустрінемося о шостій.', "Let's meet at six.", 'Quedamos a las seis.', 'Vamos nos encontrar às seis.', 'Mình gặp nhau lúc sáu giờ nhé.', 'Ayo ketemu jam enam.', 'Saat altıda buluşalım.', 'Spotkajmy się o szóstej.') },
    { text: t('I have an idea.', 'Tengo una idea.', "J'ai une idée.", 'Ich habe eine Idee.'),
      meaning: m('У меня есть идея.', 'У мене є ідея.', 'I have an idea.', 'Tengo una idea.', 'Tenho uma ideia.', 'Mình có một ý này.', 'Aku punya ide.', 'Bir fikrim var.', 'Mam pomysł.') },
  ],
  confirm: [
    { text: t('Okay, agreed.', 'Vale, de acuerdo.', "D'accord, ça marche.", 'Okay, abgemacht.'),
      meaning: m('Хорошо, договорились.', 'Добре, домовилися.', 'Okay, agreed.', 'Vale, de acuerdo.', 'Beleza, combinado.', 'Được, thống nhất vậy nhé.', 'Oke, sepakat.', 'Tamam, anlaştık.', 'Dobrze, umowa stoi.') },
    { text: t('That works for me.', 'Me viene bien.', 'Ça me va.', 'Das passt mir.'),
      meaning: m('Мне подходит.', 'Мені підходить.', 'That works for me.', 'Me viene bien.', 'Para mim está ótimo.', 'Vậy là ổn với mình.', 'Itu cocok buatku.', 'Bana uyar.', 'Mi pasuje.') },
    { text: t('So, see you then!', 'Entonces, ¡nos vemos!', 'Alors, à plus tard !', 'Also, bis dann!'),
      meaning: m('Тогда до встречи!', 'Тоді до зустрічі!', 'So, see you then!', 'Entonces, ¡nos vemos!', 'Então, até lá!', 'Vậy hẹn gặp bạn nhé!', 'Kalau begitu, sampai ketemu!', 'O zaman görüşürüz!', 'To do zobaczenia!') },
  ],
  apologize: [
    { text: t('Sorry!', '¡Perdón!', 'Pardon !', 'Entschuldigung!'),
      meaning: m('Извини!', 'Вибач!', 'Sorry!', '¡Perdón!', 'Desculpa!', 'Xin lỗi nhé!', 'Maaf!', 'Özür dilerim!', 'Przepraszam!') },
    { text: t('Sorry, my mistake.', 'Perdón, es culpa mía.', "Pardon, c'est de ma faute.", 'Entschuldigung, das war mein Fehler.'),
      meaning: m('Прости, это моя ошибка.', 'Вибач, це моя помилка.', 'Sorry, my mistake.', 'Perdón, es culpa mía.', 'Desculpa, foi erro meu.', 'Xin lỗi, đó là lỗi của mình.', 'Maaf, itu salahku.', 'Pardon, benim hatam.', 'Przepraszam, to mój błąd.') },
    { text: t("It won't happen again.", 'No volverá a pasar.', 'Ça ne se reproduira pas.', 'Das kommt nicht wieder vor.'),
      meaning: m('Больше не повторится.', 'Більше не повториться.', "It won't happen again.", 'No volverá a pasar.', 'Não vai acontecer de novo.', 'Lần sau sẽ không như vậy nữa.', 'Tidak akan terulang lagi.', 'Bir daha olmayacak.', 'To się więcej nie powtórzy.') },
  ],
  generic: [
    { text: t('Yes, of course.', 'Sí, claro.', 'Oui, bien sûr.', 'Ja, klar.'),
      meaning: m('Да, конечно.', 'Так, звісно.', 'Yes, of course.', 'Sí, claro.', 'Sim, claro.', 'Vâng, tất nhiên.', 'Ya, tentu.', 'Evet, tabii.', 'Tak, oczywiście.') },
    { text: t("I don't know.", 'No lo sé.', 'Je ne sais pas.', 'Ich weiß nicht.'),
      meaning: m('Не знаю.', 'Не знаю.', "I don't know.", 'No lo sé.', 'Não sei.', 'Mình không biết.', 'Aku tidak tahu.', 'Bilmiyorum.', 'Nie wiem.') },
    { text: t('Tell me more, please.', 'Cuéntame más, por favor.', "Dis-m'en plus, s'il te plaît.", 'Erzähl mir bitte mehr.'),
      meaning: m('Расскажи подробнее, пожалуйста.', 'Розкажи докладніше, будь ласка.', 'Tell me more, please.', 'Cuéntame más, por favor.', 'Me conta mais, por favor.', 'Kể thêm cho mình nghe nhé.', 'Ceritakan lebih banyak, ya.', 'Biraz daha anlatır mısın?', 'Opowiedz więcej, proszę.') },
  ],
};

const STUDY_TARGETS: readonly SayHintStudyTarget[] = ['en', 'es', 'fr', 'de'];
const INTERFACE_LANGS: readonly SayHintInterfaceLang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

/** Подсказки по цели шага. Неизвестный язык обучения → []; неизвестный язык интерфейса → смысл по-английски.
 *  Язык интерфейса совпал с изучаемым (en/en, es/es) → смысл null: вторая строка повторила бы фразу. */
export function localSayHints(input: Readonly<{
  studyTarget: string;
  level?: SayHintLevel;
  goalKind: SayHintGoalKind;
  interfaceLang: string;
}>): readonly LocalSayHint[] {
  const target = STUDY_TARGETS.find((lang) => lang === input.studyTarget);
  if (!target) {
    console.warn('[SAY-HINTS] unknown_study_target', JSON.stringify({ studyTarget: input.studyTarget, goalKind: input.goalKind }));
    return [];
  }
  const ui = INTERFACE_LANGS.find((lang) => lang === input.interfaceLang) ?? 'en';
  const concepts = CONCEPTS[input.goalKind] ?? CONCEPTS.generic;
  return Object.freeze(concepts.map((concept) => Object.freeze({
    text: concept.text[target],
    meaning: ui === target ? null : concept.meaning[ui],
  })));
}

// Порядок важен: «поблагодарить за встречу» — благодарность, а не прощание; «закрыть тему/чат» — прощание;
// «подтвердить заказ» — заказ; «попросить помощь» — просьба, а «предложить помощь» — предложение.
const GOAL_KIND_KEYWORDS: ReadonlyArray<readonly [SayHintGoalKind, RegExp]> = [
  ['apologize', /извин|прости|вибач|apolog|sorry|disculp/iu],
  ['greet', /поздорова|приветств|привітат|вітан|greet|say hello|saluda|cumpriment/iu],
  ['introduce', /представ|назвать себя|назови себя|о себе|про себе|introduce|your name|presenta/iu],
  ['howAreYou', /как дела|як справи|how are you/iu],
  ['order', /заказ|замов|купит|оплат|цен[уаы]|order|buy|pay|price|pedir/iu],
  ['askHelp', /(?:попрос|запрос|попрох)\S*\s+(?:\S+\s+)?(?:помощ|допомог|повтор)|непонятн|незрозумі|ask for help|help me|ayuda/iu],
  ['thanks', /благодар|подяк|дякув|thank|agradec/iu],
  ['goodbye', /прощ|завершит|закрыть|закрити|goodbye|bye|end the chat|despedi/iu],
  ['confirm', /подтверд|договор|зафиксир|согласова|закреп|agree|confirm/iu],
  ['suggest', /предлож|suggest|offer|propon/iu],
  ['askQuestion', /спрос|уточн|задать|запрос|ask\b|pregunt/iu],
];

/** Тип подсказки по подписи цели шага сценария (подписи у сценариев свои, id objective_01… общие и смысла не несут). */
export function sayHintGoalKindForObjectiveLabel(label: string | null | undefined): SayHintGoalKind {
  const text = typeof label === 'string' ? label.trim() : '';
  if (!text) return 'generic';
  for (const [kind, re] of GOAL_KIND_KEYWORDS) if (re.test(text)) return kind;
  return 'generic';
}

/** Свободный диалог без целей: первая реплика — приветствие, вторая — о себе, дальше — общие фразы для поддержания разговора. */
export function sayHintGoalKindForFreeformTurn(learnerTurnsSent: number): SayHintGoalKind {
  if (learnerTurnsSent <= 0) return 'greet';
  if (learnerTurnsSent === 1) return 'introduce';
  if (learnerTurnsSent === 2) return 'howAreYou';
  return 'generic';
}
