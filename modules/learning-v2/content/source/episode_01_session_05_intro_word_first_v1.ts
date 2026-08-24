import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CORRECT = new Set(["i'm busy", 'i am here', 'busy', "i'm", 'i am', 'am', 'i']);
const TERMS = ["I'm busy", 'I’m busy', 'I am here', "I'm", 'I’m', 'I am', 'busy', 'am', 'I'];

const normalized = (value: string): string =>
  value.replace(/[’]/gu, "'").toLocaleLowerCase('en');
const matches = (value: string, candidate: string): boolean =>
  candidate === 'I' ? value === candidate : normalized(value) === normalized(candidate);

function markBody(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    const letter = /\p{L}/u;
    const boundary = (start: number, length: number): boolean =>
      !letter.test(text[start - 1] ?? '') && !letter.test(text[start + length] ?? '');
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) =>
        matches(text.slice(cursor, cursor + candidate.length), candidate) &&
        boundary(cursor, candidate.length));
      if (term) {
        const exact = text.slice(cursor, cursor + term.length);
        runs.push({
          text: exact,
          semantic: CORRECT.has(normalized(term)) ? 'targetCorrect' : 'targetWrong',
        });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) =>
        matches(text.slice(end, end + candidate.length), candidate) &&
        boundary(end, candidate.length))) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_05_WORD_FIRST_TITLE = L({
  ru: 'Четыре вежливых сигнала', uk: 'Чотири ввічливі сигнали', es: 'Cuatro señales de cortesía',
  'pt-BR': 'Quatro sinais de cortesia', vi: 'Bốn tín hiệu lịch sự', id: 'Empat penanda sopan',
  tr: 'Dört nazik işaret', pl: 'Cztery uprzejme sygnały',
});

export const EPISODE_01_SESSION_05_WORD_FIRST_SUMMARY = L({
  ru: 'Приветствие, благодарность, просьба и прощание звучат как готовые короткие формулы.',
  uk: 'Привітання, подяка, прохання й прощання звучать як готові короткі формули.',
  es: 'El saludo, el agradecimiento, la petición y la despedida funcionan como fórmulas breves completas.',
  'pt-BR': 'Saudação, agradecimento, pedido e despedida funcionam como fórmulas curtas completas.',
  vi: 'Lời chào, lời cảm ơn, lời nhờ và lời tạm biệt hoạt động như những công thức ngắn trọn vẹn.',
  id: 'Sapaan, ucapan terima kasih, permintaan, dan perpisahan berfungsi sebagai rumus singkat yang utuh.',
  tr: 'Selamlama, teşekkür, rica ve vedalaşma hazır kısa kalıplar gibi çalışır.',
  pl: 'Powitanie, podziękowanie, prośba i pożegnanie działają jak gotowe krótkie formuły.',
});

export const EPISODE_01_SESSION_05_WORD_FIRST_GOAL = L({
  ru: 'Различать и уместно использовать hi, thanks, please и bye.',
  uk: 'Розрізняти й доречно вживати hi, thanks, please та bye.',
  es: 'Distinguir y usar con naturalidad hi, thanks, please y bye.',
  'pt-BR': 'Distinguir e usar com naturalidade hi, thanks, please e bye.',
  vi: 'Phân biệt và dùng đúng lúc hi, thanks, please và bye.',
  id: 'Membedakan dan memakai hi, thanks, please, serta bye dengan tepat.',
  tr: 'Hi, thanks, please ve bye sözlerini ayırt edip yerinde kullanmak.',
  pl: 'Rozróżniać i stosować we właściwej sytuacji hi, thanks, please oraz bye.',
});

const conceptBody = L({
  ru: 'Фраза I am here собирает сообщение из человека, связки и места. Короткие реплики общения часто устроены иначе: они целиком выполняют одно действие. Намерение разговора выбирается раньше слов — открыть контакт, поблагодарить за помощь, смягчить просьбу или закончить беседу. Поэтому такую формулу полезно узнавать как один речевой жест, а не переводить каждый кусочек отдельно.',
  uk: 'Фраза I am here складає повідомлення з людини, зв’язки й місця. Короткі репліки спілкування часто влаштовані інакше: вони цілком виконують одну дію. Намір розмови обирається раніше за слова — відкрити контакт, подякувати за допомогу, пом’якшити прохання або завершити бесіду. Тому таку формулу корисно впізнавати як один мовленнєвий жест, а не перекладати кожен шматок окремо.',
  es: 'I am here construye un mensaje con persona, enlace y lugar. Las intervenciones sociales breves suelen funcionar de otra manera: toda la fórmula realiza una sola acción. La intención de la conversación se decide antes que las palabras: abrir el contacto, agradecer ayuda, suavizar una petición o cerrar el intercambio. Por eso conviene reconocer cada fórmula como un gesto completo y no traducir sus partes por separado.',
  'pt-BR': 'I am here monta uma mensagem com pessoa, ligação e lugar. As falas sociais curtas costumam funcionar de outro modo: a fórmula inteira realiza uma única ação. A intenção da conversa vem antes das palavras — abrir o contato, agradecer uma ajuda, suavizar um pedido ou encerrar a troca. Por isso, vale reconhecer cada fórmula como um gesto completo, sem traduzir pedaço por pedaço.',
  vi: 'I am here ghép một thông báo từ người nói, từ nối và nơi chốn. Những lời đáp xã giao ngắn thường hoạt động khác: cả công thức cùng thực hiện một hành động. Ý định của cuộc trò chuyện được chọn trước từ ngữ — mở lời, cảm ơn sự giúp đỡ, làm lời nhờ nhẹ hơn hoặc khép lại cuộc nói chuyện. Vì vậy nên nhận ra công thức như một cử chỉ lời nói trọn vẹn, thay vì dịch từng mảnh.',
  id: 'I am here menyusun pesan dari orang, penghubung, dan tempat. Ucapan sosial yang singkat sering bekerja secara berbeda: seluruh rumus melakukan satu tindakan. Niat percakapan dipilih sebelum kata-katanya—membuka kontak, berterima kasih atas bantuan, menghaluskan permintaan, atau menutup percakapan. Karena itu, kenali rumus sebagai satu gerak tutur yang utuh, bukan terjemahan potongan demi potongan.',
  tr: 'I am here kişi, bağlantı ve yer parçalarından bir bildirim kurar. Kısa sosyal sözler çoğu zaman başka türlü çalışır: bütün kalıp tek bir eylem yapar. Konuşmanın amacı sözcüklerden önce seçilir; iletişimi açmak, yardıma teşekkür etmek, ricayı yumuşatmak ya da konuşmayı kapatmak. Bu yüzden kalıbı parça parça çevirmek yerine tek bir konuşma hareketi olarak tanımak gerekir.',
  pl: 'I am here buduje komunikat z osoby, łącznika i miejsca. Krótkie wypowiedzi społeczne często działają inaczej: cała formuła wykonuje jedno działanie. Intencja rozmowy pojawia się przed słowami — rozpocząć kontakt, podziękować za pomoc, złagodzić prośbę albo zakończyć rozmowę. Dlatego warto rozpoznawać formułę jako jeden gest językowy, zamiast tłumaczyć każdy fragment osobno.',
});

const formulaBody = L({
  ru: 'Сначала определите действие: приветствие, благодарность, просьба или прощание. Затем возьмите готовую формулу целиком. Здесь не нужно достраивать I am и подбирать состояние, как в I’m busy. Короткая реплика уже закончена, если она точно соответствует ситуации. Полезная привычка — связывать её не с одним русским словом, а с моментом, когда собеседник должен её услышать.',
  uk: 'Спочатку визначте дію: привітання, подяка, прохання або прощання. Потім візьміть готову формулу цілком. Тут не треба добудовувати I am і добирати стан, як у I’m busy. Коротка репліка вже завершена, якщо вона точно відповідає ситуації. Корисна звичка — пов’язувати її не з одним українським словом, а з моментом, коли співрозмовник має її почути.',
  es: 'Primero identifica la acción: saludo, agradecimiento, petición o despedida. Después toma la fórmula completa. No hace falta añadir I am ni buscar un estado como en I’m busy. La intervención breve ya está terminada cuando encaja exactamente con la situación. La costumbre útil es asociarla no con una sola traducción, sino con el momento en que la otra persona necesita oírla.',
  'pt-BR': 'Primeiro identifique a ação: saudação, agradecimento, pedido ou despedida. Depois use a fórmula inteira. Não é preciso completar I am nem escolher um estado como em I’m busy. A fala curta já está completa quando corresponde exatamente à situação. O hábito útil é associá-la não a uma única tradução, mas ao momento em que a outra pessoa precisa ouvi-la.',
  vi: 'Trước hết hãy xác định hành động: chào hỏi, cảm ơn, nhờ vả hay tạm biệt. Sau đó dùng trọn công thức. Không cần thêm I am hoặc chọn một trạng thái như trong I’m busy. Lời đáp ngắn đã hoàn chỉnh khi nó khớp chính xác với tình huống. Thói quen hữu ích là gắn nó với thời điểm người đối diện cần nghe, chứ không chỉ với một từ dịch.',
  id: 'Tentukan dulu tindakannya: sapaan, ucapan terima kasih, permintaan, atau perpisahan. Setelah itu gunakan rumus secara utuh. Tidak perlu menambahkan I am atau memilih keadaan seperti dalam I’m busy. Ucapan pendek sudah lengkap jika tepat dengan situasinya. Biasakan mengaitkannya dengan saat lawan bicara perlu mendengarnya, bukan dengan satu kata terjemahan saja.',
  tr: 'Önce eylemi belirleyin: selamlama, teşekkür, rica ya da vedalaşma. Sonra hazır kalıbı bütünüyle kullanın. I’m busy sözündeki gibi I am yapısını tamamlamak veya bir durum seçmek gerekmez. Kısa söz duruma tam uyuyorsa zaten bitmiştir. Yararlı alışkanlık, onu tek bir çeviriyle değil karşıdakinin duyması gereken anla eşleştirmektir.',
  pl: 'Najpierw określ działanie: powitanie, podziękowanie, prośba albo pożegnanie. Potem wybierz gotową formułę w całości. Nie trzeba dobudowywać I am ani wybierać stanu jak w I’m busy. Krótka wypowiedź jest już pełna, jeśli dokładnie pasuje do sytuacji. Warto łączyć ją nie z jednym tłumaczeniem, lecz z momentem, w którym rozmówca powinien ją usłyszeć.',
});

const trapBody = L({
  ru: 'Похожее написание ещё не означает ту же реплику. В I’m busy апостроф и точное слово удерживают знакомую конструкцию; в короткой формуле один другой звук тоже может превратить её в постороннее слово. Точное звучание и написание нужно проверять вместе с ситуацией. Если вариант похож глазами, но не выполняет нужное действие, он не становится допустимым ответом.',
  uk: 'Схоже написання ще не означає ту саму репліку. В I’m busy апостроф і точне слово втримують знайому конструкцію; у короткій формулі один інший звук також може перетворити її на стороннє слово. Точне звучання й написання треба перевіряти разом із ситуацією. Якщо варіант схожий на вигляд, але не виконує потрібної дії, він не стає правильною відповіддю.',
  es: 'Una escritura parecida no garantiza la misma intervención. En I’m busy, el apóstrofo y la palabra exacta sostienen la construcción conocida; en una fórmula breve, un sonido distinto también puede convertirla en otra palabra. Hay que comprobar pronunciación y escritura exactas junto con la situación. Si una opción se parece a la vista pero no realiza la acción necesaria, no sirve como respuesta.',
  'pt-BR': 'Uma escrita parecida não garante a mesma fala. Em I’m busy, o apóstrofo e a palavra exata mantêm a construção conhecida; numa fórmula curta, um som diferente também pode transformá-la em outra palavra. É preciso conferir pronúncia e escrita exatas junto com a situação. Se uma opção parece semelhante, mas não realiza a ação necessária, ela não serve como resposta.',
  vi: 'Cách viết giống nhau chưa chắc tạo ra cùng một lời đáp. Trong I’m busy, dấu nháy và từ chính xác giữ nguyên cấu trúc đã biết; trong công thức ngắn, chỉ một âm khác cũng có thể biến nó thành từ khác. Cần kiểm tra cách phát âm và cách viết chính xác cùng với tình huống. Một phương án nhìn có vẻ giống nhưng không thực hiện đúng hành động thì vẫn không phải đáp án.',
  id: 'Tulisan yang mirip belum tentu menghasilkan ucapan yang sama. Dalam I’m busy, apostrof dan kata yang tepat menjaga susunan yang dikenal; dalam rumus singkat, satu bunyi berbeda juga dapat mengubahnya menjadi kata lain. Periksa bunyi dan ejaan yang tepat bersama situasinya. Pilihan yang tampak mirip tetapi tidak melakukan tindakan yang diperlukan tetap bukan jawaban.',
  tr: 'Benzer yazım aynı sözü garanti etmez. I’m busy içinde kesme işareti ve doğru sözcük bilinen yapıyı korur; kısa bir kalıpta farklı tek bir ses de sözü başka bir kelimeye çevirebilir. Tam sesletim ve yazım durumla birlikte denetlenmelidir. Seçenek göze benziyor ama gereken eylemi yapmıyorsa doğru cevap olmaz.',
  pl: 'Podobny zapis nie gwarantuje tej samej wypowiedzi. W I’m busy apostrof i dokładne słowo utrzymują znaną konstrukcję; w krótkiej formule jeden inny dźwięk także może zmienić ją w obce słowo. Dokładne brzmienie i zapis trzeba sprawdzać razem z sytuacją. Jeśli wariant wygląda podobnie, ale nie wykonuje potrzebnego działania, nie jest poprawną odpowiedzią.',
});

const conceptCorrect = L({ ru: 'Намерение разговора', uk: 'Намір розмови', es: 'La intención de la conversación', 'pt-BR': 'A intenção da conversa', vi: 'Ý định của cuộc trò chuyện', id: 'Niat percakapan', tr: 'Konuşmanın amacı', pl: 'Intencja rozmowy' });
const formulaCorrect = L({ ru: 'Готовую формулу целиком', uk: 'Готову формулу цілком', es: 'La fórmula completa', 'pt-BR': 'A fórmula inteira', vi: 'Trọn công thức', id: 'Rumus secara utuh', tr: 'Hazır kalıbı bütünüyle', pl: 'Gotową formułę w całości' });
const trapCorrect = L({ ru: 'Точное звучание и написание', uk: 'Точне звучання й написання', es: 'Pronunciación y escritura exactas', 'pt-BR': 'Pronúncia e escrita exatas', vi: 'Cách phát âm và cách viết chính xác', id: 'Bunyi dan ejaan yang tepat', tr: 'Tam sesletim ve yazım', pl: 'Dokładne brzmienie i zapis' });

export const EPISODE_01_SESSION_05_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Короткая реплика выполняет действие', uk: 'Коротка репліка виконує дію', es: 'Una fórmula breve realiza una acción', 'pt-BR': 'Uma fórmula curta realiza uma ação', vi: 'Lời đáp ngắn thực hiện một hành động', id: 'Ucapan singkat melakukan satu tindakan', tr: 'Kısa söz bir eylem yapar', pl: 'Krótka formuła wykonuje działanie' }),
    body: conceptBody, bodyRuns: markBody(conceptBody),
    question: {
      prompt: L({ ru: 'Что выбирают раньше слов?', uk: 'Що обирають раніше за слова?', es: '¿Qué se decide antes que las palabras?', 'pt-BR': 'O que vem antes das palavras?', vi: 'Điều gì được chọn trước từ ngữ?', id: 'Apa yang dipilih sebelum kata-katanya?', tr: 'Sözcüklerden önce ne seçilir?', pl: 'Co pojawia się przed słowami?' }),
      choices: [conceptCorrect, L({ ru: 'Количество букв', uk: 'Кількість літер', es: 'El número de letras', 'pt-BR': 'O número de letras', vi: 'Số lượng chữ cái', id: 'Jumlah huruf', tr: 'Harf sayısı', pl: 'Liczba liter' }), L({ ru: 'Длину перевода', uk: 'Довжину перекладу', es: 'La longitud de la traducción', 'pt-BR': 'O tamanho da tradução', vi: 'Độ dài bản dịch', id: 'Panjang terjemahan', tr: 'Çeviri uzunluğu', pl: 'Długość tłumaczenia' })],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'Намерение разговора определяет, нужен ли сигнал приветствия, благодарности, просьбы или прощания.', uk: 'Намір розмови визначає, чи потрібен сигнал привітання, подяки, прохання або прощання.', es: 'La intención de la conversación determina si hace falta saludar, agradecer, pedir o despedirse.', 'pt-BR': 'A intenção da conversa determina se é preciso saudar, agradecer, pedir ou se despedir.', vi: 'Ý định của cuộc trò chuyện quyết định cần chào, cảm ơn, nhờ hay tạm biệt.', id: 'Niat percakapan menentukan apakah perlu menyapa, berterima kasih, meminta, atau berpamitan.', tr: 'Konuşmanın amacı selamlama, teşekkür, rica ya da vedalaşma gereğini belirler.', pl: 'Intencja rozmowy decyduje, czy trzeba powitać, podziękować, poprosić czy się pożegnać.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Ситуация выбирает готовую формулу', uk: 'Ситуація обирає готову формулу', es: 'La situación elige la fórmula', 'pt-BR': 'A situação escolhe a fórmula', vi: 'Tình huống chọn công thức', id: 'Situasi memilih rumus', tr: 'Durum hazır kalıbı seçer', pl: 'Sytuacja wybiera formułę' }),
    body: formulaBody, bodyRuns: markBody(formulaBody),
    question: {
      prompt: L({ ru: 'Как брать короткую вежливую реплику?', uk: 'Як брати коротку ввічливу репліку?', es: '¿Cómo se usa una intervención cortés breve?', 'pt-BR': 'Como usar uma fala curta de cortesia?', vi: 'Nên dùng lời lịch sự ngắn thế nào?', id: 'Bagaimana memakai ucapan sopan yang singkat?', tr: 'Kısa nazik söz nasıl kullanılır?', pl: 'Jak użyć krótkiej uprzejmej wypowiedzi?' }),
      choices: [formulaCorrect, L({ ru: 'По одной случайной букве', uk: 'По одній випадковій літері', es: 'Una letra al azar', 'pt-BR': 'Uma letra aleatória', vi: 'Từng chữ ngẫu nhiên', id: 'Satu huruf acak', tr: 'Rastgele birer harf', pl: 'Po jednej przypadkowej literze' }), L({ ru: 'Через I am и любое слово', uk: 'Через I am і будь-яке слово', es: 'Con I am y cualquier palabra', 'pt-BR': 'Com I am e qualquer palavra', vi: 'Bằng I am và từ bất kỳ', id: 'Dengan I am dan kata apa saja', tr: 'I am ve herhangi bir sözcükle', pl: 'Przez I am i dowolne słowo' })],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'Готовую формулу целиком связывают с конкретным действием, поэтому она сразу звучит законченно.', uk: 'Готову формулу цілком пов’язують із конкретною дією, тому вона відразу звучить завершено.', es: 'La fórmula completa se asocia con una acción concreta y por eso ya suena terminada.', 'pt-BR': 'A fórmula inteira se liga a uma ação concreta e, por isso, já soa completa.', vi: 'Trọn công thức gắn với một hành động cụ thể nên tự nó đã trọn ý.', id: 'Rumus secara utuh dikaitkan dengan tindakan tertentu sehingga langsung terdengar lengkap.', tr: 'Hazır kalıbı bütünüyle belirli bir eyleme bağlamak onu tamamlanmış kılar.', pl: 'Gotową formułę w całości łączy się z konkretnym działaniem, więc od razu brzmi pełnie.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Похожее слово может быть чужим', uk: 'Схоже слово може бути стороннім', es: 'Una palabra parecida puede ser otra', 'pt-BR': 'Uma palavra parecida pode ser outra', vi: 'Từ giống nhau có thể mang nghĩa khác', id: 'Kata yang mirip bisa berbeda', tr: 'Benzer sözcük başka olabilir', pl: 'Podobne słowo może być inne' }),
    body: trapBody, bodyRuns: markBody(trapBody),
    question: {
      prompt: L({ ru: 'Что проверяют вместе с ситуацией?', uk: 'Що перевіряють разом із ситуацією?', es: '¿Qué se comprueba junto con la situación?', 'pt-BR': 'O que se confere junto com a situação?', vi: 'Cần kiểm tra điều gì cùng với tình huống?', id: 'Apa yang diperiksa bersama situasinya?', tr: 'Durumla birlikte ne denetlenir?', pl: 'Co sprawdza się razem z sytuacją?' }),
      choices: [trapCorrect, L({ ru: 'Только длину слова', uk: 'Лише довжину слова', es: 'Solo la longitud', 'pt-BR': 'Só o tamanho', vi: 'Chỉ độ dài', id: 'Hanya panjangnya', tr: 'Yalnızca uzunluğu', pl: 'Tylko długość' }), L({ ru: 'Любое похожее начало', uk: 'Будь-який схожий початок', es: 'Cualquier comienzo parecido', 'pt-BR': 'Qualquer começo parecido', vi: 'Bất kỳ phần đầu giống nhau', id: 'Awal apa pun yang mirip', tr: 'Herhangi bir benzer başlangıç', pl: 'Dowolny podobny początek' })],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'Точное звучание и написание отделяют нужную формулу от похожего, но постороннего слова.', uk: 'Точне звучання й написання відділяють потрібну формулу від схожого, але стороннього слова.', es: 'Pronunciación y escritura exactas separan la fórmula necesaria de una palabra parecida pero ajena.', 'pt-BR': 'Pronúncia e escrita exatas separam a fórmula necessária de uma palavra parecida, mas alheia.', vi: 'Cách phát âm và cách viết chính xác tách công thức cần dùng khỏi một từ chỉ nhìn giống.', id: 'Bunyi dan ejaan yang tepat memisahkan rumus yang diperlukan dari kata mirip yang tidak sesuai.', tr: 'Tam sesletim ve yazım gereken kalıbı benzer ama ilgisiz sözcükten ayırır.', pl: 'Dokładne brzmienie i zapis oddzielają potrzebną formułę od podobnego, lecz obcego słowa.' }),
    },
  },
]);
