import type {
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';
import { EPISODE_01_SESSION_05_VOCABULARY_V1 } from './episode_01_session_05_vocabulary_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type Target = 'hi' | 'thanks' | 'please' | 'bye';
type PhraseCopy = Readonly<{ meaning: string; explanation: string; prompt: string }>;

const COPY: Readonly<Record<Target, Readonly<Record<Locale, PhraseCopy>>>> = {
  hi: {
    ru: { meaning: 'Привет', explanation: 'Hi открывает короткий неформальный разговор. Это уже полное приветствие: после него не требуется am или описание состояния.', prompt: 'Выберите короткое неформальное приветствие.' },
    uk: { meaning: 'Привіт', explanation: 'Hi відкриває коротку неформальну розмову. Це вже повне привітання: після нього не потрібні am чи опис стану.', prompt: 'Оберіть коротке неформальне привітання.' },
    es: { meaning: 'Hola', explanation: 'Hi abre una conversación informal breve. Ya es un saludo completo: no necesita am ni una descripción de estado.', prompt: 'Elige el saludo informal breve.' },
    'pt-BR': { meaning: 'Oi', explanation: 'Hi abre uma conversa informal breve. Já é uma saudação completa: não precisa de am nem de uma descrição de estado.', prompt: 'Escolha a saudação informal curta.' },
    vi: { meaning: 'Chào / Xin chào', explanation: 'Hi mở đầu một cuộc trò chuyện thân mật ngắn. Đây đã là lời chào trọn vẹn, không cần thêm am hay trạng thái.', prompt: 'Chọn lời chào thân mật ngắn.' },
    id: { meaning: 'Hai / Halo', explanation: 'Hi membuka percakapan informal yang singkat. Ini sudah merupakan sapaan lengkap tanpa am atau keterangan keadaan.', prompt: 'Pilih sapaan informal yang singkat.' },
    tr: { meaning: 'Merhaba', explanation: 'Hi kısa ve gündelik bir konuşmayı açar. Tek başına tam bir selamdır; ardından am ya da durum açıklaması gerekmez.', prompt: 'Kısa gündelik selamı seçin.' },
    pl: { meaning: 'Cześć', explanation: 'Hi rozpoczyna krótką nieformalną rozmowę. Jest już pełnym powitaniem i nie potrzebuje am ani opisu stanu.', prompt: 'Wybierz krótkie nieformalne powitanie.' },
  },
  thanks: {
    ru: { meaning: 'Спасибо', explanation: 'Thanks — самостоятельная дружелюбная благодарность за помощь, подарок или информацию. Она отвечает на доброе действие собеседника.', prompt: 'Выберите короткую благодарность.' },
    uk: { meaning: 'Дякую', explanation: 'Thanks — самостійна дружня подяка за допомогу, подарунок або інформацію. Вона відповідає на добру дію співрозмовника.', prompt: 'Оберіть коротку подяку.' },
    es: { meaning: 'Gracias', explanation: 'Thanks es un agradecimiento amistoso y completo por ayuda, un regalo o información. Responde a una acción amable de la otra persona.', prompt: 'Elige el agradecimiento breve.' },
    'pt-BR': { meaning: 'Obrigado / Obrigada', explanation: 'Thanks é um agradecimento amistoso e completo por ajuda, presente ou informação. Responde a uma ação gentil da outra pessoa.', prompt: 'Escolha o agradecimento curto.' },
    vi: { meaning: 'Cảm ơn', explanation: 'Thanks là lời cảm ơn thân thiện, trọn vẹn cho sự giúp đỡ, món quà hoặc thông tin. Nó đáp lại hành động tốt của người đối diện.', prompt: 'Chọn lời cảm ơn ngắn.' },
    id: { meaning: 'Terima kasih', explanation: 'Thanks adalah ucapan terima kasih ramah yang lengkap atas bantuan, hadiah, atau informasi. Ucapan ini menanggapi tindakan baik lawan bicara.', prompt: 'Pilih ucapan terima kasih yang singkat.' },
    tr: { meaning: 'Teşekkürler', explanation: 'Thanks yardım, hediye ya da bilgi karşısında kullanılan samimi ve tamamlanmış bir teşekkürdür. Karşıdakinin iyi davranışına cevap verir.', prompt: 'Kısa teşekkür sözünü seçin.' },
    pl: { meaning: 'Dzięki', explanation: 'Thanks to samodzielne, przyjazne podziękowanie za pomoc, prezent lub informację. Odpowiada na życzliwe działanie rozmówcy.', prompt: 'Wybierz krótkie podziękowanie.' },
  },
  please: {
    ru: { meaning: 'Пожалуйста', explanation: 'Please сопровождает просьбу и показывает уважение к выбору собеседника. Здесь это готовый вежливый сигнал, а не название предмета.', prompt: 'Выберите вежливый сигнал для просьбы.' },
    uk: { meaning: 'Будь ласка', explanation: 'Please супроводжує прохання й показує повагу до вибору співрозмовника. Тут це готовий ввічливий сигнал, а не назва предмета.', prompt: 'Оберіть ввічливий сигнал для прохання.' },
    es: { meaning: 'Por favor', explanation: 'Please acompaña una petición y muestra respeto por la decisión de la otra persona. Aquí es una señal cortés completa, no el nombre de un objeto.', prompt: 'Elige la señal cortés para una petición.' },
    'pt-BR': { meaning: 'Por favor', explanation: 'Please acompanha um pedido e mostra respeito pela escolha da outra pessoa. Aqui é um sinal de cortesia completo, não o nome de um objeto.', prompt: 'Escolha o sinal de cortesia para um pedido.' },
    vi: { meaning: 'Làm ơn / Vui lòng', explanation: 'Please đi cùng lời nhờ và thể hiện sự tôn trọng lựa chọn của người đối diện. Ở đây nó là tín hiệu lịch sự trọn vẹn, không phải tên đồ vật.', prompt: 'Chọn tín hiệu lịch sự cho lời nhờ.' },
    id: { meaning: 'Tolong / Silakan', explanation: 'Please menyertai permintaan dan menghormati pilihan lawan bicara. Di sini kata itu adalah penanda sopan yang utuh, bukan nama benda.', prompt: 'Pilih penanda sopan untuk permintaan.' },
    tr: { meaning: 'Lütfen', explanation: 'Please ricaya eşlik eder ve karşıdakinin seçimine saygı gösterir. Burada bir nesne adı değil, tamamlanmış bir nezaket işaretidir.', prompt: 'Rica için nazik işareti seçin.' },
    pl: { meaning: 'Proszę', explanation: 'Please towarzyszy prośbie i okazuje szacunek dla wyboru rozmówcy. Tutaj jest gotowym sygnałem uprzejmości, a nie nazwą przedmiotu.', prompt: 'Wybierz uprzejmy sygnał prośby.' },
  },
  bye: {
    ru: { meaning: 'Пока / До свидания', explanation: 'Bye завершает короткий разговор и ясно показывает, что контакт заканчивается. Это самостоятельное дружелюбное прощание.', prompt: 'Выберите короткое дружелюбное прощание.' },
    uk: { meaning: 'Бувай / До побачення', explanation: 'Bye завершує коротку розмову й чітко показує, що контакт закінчується. Це самостійне дружнє прощання.', prompt: 'Оберіть коротке дружнє прощання.' },
    es: { meaning: 'Adiós / Chao', explanation: 'Bye cierra una conversación breve y deja claro que el contacto termina. Es una despedida amistosa completa.', prompt: 'Elige la despedida amistosa breve.' },
    'pt-BR': { meaning: 'Tchau', explanation: 'Bye encerra uma conversa breve e deixa claro que o contato termina. É uma despedida amistosa completa.', prompt: 'Escolha a despedida amistosa curta.' },
    vi: { meaning: 'Tạm biệt', explanation: 'Bye khép lại một cuộc trò chuyện ngắn và báo rõ rằng cuộc trao đổi kết thúc. Đây là lời tạm biệt thân thiện trọn vẹn.', prompt: 'Chọn lời tạm biệt thân thiện ngắn.' },
    id: { meaning: 'Sampai jumpa / Dadah', explanation: 'Bye menutup percakapan singkat dan menandai bahwa kontak berakhir. Ini merupakan salam perpisahan ramah yang lengkap.', prompt: 'Pilih salam perpisahan ramah yang singkat.' },
    tr: { meaning: 'Hoşça kal / Görüşürüz', explanation: 'Bye kısa konuşmayı kapatır ve iletişimin bittiğini açıkça gösterir. Tek başına tamamlanmış samimi bir vedalaşmadır.', prompt: 'Kısa samimi vedalaşmayı seçin.' },
    pl: { meaning: 'Pa / Do widzenia', explanation: 'Bye kończy krótką rozmowę i jasno sygnalizuje zakończenie kontaktu. Jest samodzielnym przyjaznym pożegnaniem.', prompt: 'Wybierz krótkie przyjazne pożegnanie.' },
  },
};

function vocabulary(target: Target) {
  const entry = EPISODE_01_SESSION_05_VOCABULARY_V1.find((item) => item.target === target);
  if (!entry) throw new Error(`session_05_vocabulary_missing:${target}`);
  return entry;
}

function details(target: Target): NonNullable<EpisodeSourcePhrase['localizedDetails']> {
  const entry = vocabulary(target);
  const traps = entry.contacts.build_form.distractors;
  return Object.fromEntries(LOCALES.map((locale) => {
    const copy = COPY[target][locale];
    const distractors = traps.map((trap) => ({
      value: trap.value,
      reason: trap.feedback[locale] ?? '',
      trapType: trap.trapType,
    }));
    return [locale, {
      meaning: copy.meaning,
      explanation: copy.explanation,
      distractors,
      words: [{ correct: target, prompt: copy.prompt, distractors }],
    } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
}

function phrase(target: Target, english: string): EpisodeSourcePhrase {
  const entry = vocabulary(target);
  const traps = entry.contacts.build_form.distractors;
  const intentFeature = target === 'hi'
    ? 'greeting'
    : target === 'bye'
      ? 'farewell'
      : 'politeness';
  return {
    id: `e01-s05-${target}`,
    english,
    russian: COPY[target].ru.meaning,
    explanation: COPY[target].ru.explanation,
    words: [{
      correct: target,
      category: 'fixed_expression',
      distractors: traps.map((trap) => ({
        value: trap.value,
        reasonCode: `${trap.trapType}:${target}:${trap.value}`,
        trapType: trap.trapType,
        why: trap.feedback.ru ?? '',
      })),
    }],
    localizedDetails: details(target),
    features: ['fixed_expression', intentFeature],
  };
}

export const EPISODE_01_SESSION_05_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('hi', 'Hi'),
  phrase('thanks', 'Thanks'),
  phrase('please', 'Please'),
  phrase('bye', 'Bye'),
]);
