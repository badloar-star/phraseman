import type { HeisenbergSourceLocale } from './source_locales';

export type QuizSourcePayloadDifficulty = 'easy' | 'medium' | 'hard';

export type QuizSourceLocalePayload = {
  prompt: string;
  explanations: [string, string, string, string];
};

export type QuizSourceLocalePayloadMap = Partial<Record<HeisenbergSourceLocale, QuizSourceLocalePayload>>;

const p = (prompt: string, explanations: [string, string, string, string]): QuizSourceLocalePayload => ({
  prompt,
  explanations,
});

export const QUIZ_SOURCE_LOCALE_PAYLOADS: Partial<
  Record<QuizSourcePayloadDifficulty, Record<number, QuizSourceLocalePayloadMap>>
> = {
  medium: {
    '111': {
      'pt-BR': {
        prompt: 'Ler livros me ajuda a relaxar',
        explanations: [
          'Quando uma ação funciona como sujeito, em inglês ela costuma vir com -ing: Reading books.',
          'Correto. Reading books funciona como um sujeito singular, por isso usamos helps.',
          'Reading books é tratado como uma ideia singular. Por isso precisa de helps, não help.',
          'Redding está escrito errado. Aqui a palavra certa é Reading.'
        ]
      },
      vi: {
        prompt: 'Đọc sách giúp tôi thư giãn',
        explanations: [
          'Khi một hành động làm chủ ngữ, tiếng Anh thường dùng dạng -ing: Reading books.',
          'Đúng. Reading books là một chủ ngữ số ít, nên động từ là helps.',
          'Reading books được xem như một ý số ít. Vì vậy cần helps, không phải help.',
          'Redding viết sai. Ở đây cần Reading.'
        ]
      },
      id: {
        prompt: 'Membaca buku membantu saya rileks',
        explanations: [
          'Ketika suatu tindakan menjadi subjek, bahasa Inggris biasanya memakai bentuk -ing: Reading books.',
          'Benar. Reading books berfungsi sebagai subjek tunggal, jadi verb-nya helps.',
          'Reading books dianggap sebagai satu gagasan tunggal. Karena itu perlu helps, bukan help.',
          'Redding salah ejaan. Di sini yang benar adalah Reading.'
        ]
      },
      tr: {
        prompt: 'Kitap okumak rahatlamama yardımcı olur',
        explanations: [
          'Bir eylem özne olduğunda İngilizcede genelde -ing kullanılır: Reading books.',
          'Doğru. Reading books tekil bir özne gibi çalışır, bu yüzden helps kullanılır.',
          'Reading books tek bir fikir gibi görülür. Bu yüzden help değil helps gerekir.',
          'Redding yanlış yazım. Burada gereken kelime Reading.'
        ]
      },
      pl: {
        prompt: 'Czytanie książek pomaga mi się zrelaksować',
        explanations: [
          'Gdy czynność jest podmiotem, w angielskim zwykle używamy formy -ing: Reading books.',
          'Dobrze. Reading books działa jak podmiot w liczbie pojedynczej, więc pasuje helps.',
          'Reading books traktujemy jak jedną ideę. Dlatego potrzebne jest helps, nie help.',
          'Redding to błąd w pisowni. Tutaj potrzebujesz Reading.'
        ]
      }
    },
    '112': {
      'pt-BR': {
        prompt: 'Ele me perguntou onde eu morava',
        explanations: [
          'Em uma indirect question não usamos ordem de pergunta. Where do I live não encaixa aqui.',
          'Correto. He asked me where I lived usa ordem afirmativa e backshift.',
          'Where I live pode funcionar em outro contexto, mas este item pede reported speech com lived. Termo-chave em ingl?s: asked..',
          'Wear significa vestir. Para onde, a palavra é where.'
        ]
      },
      vi: {
        prompt: 'Anh ấy hỏi tôi sống ở đâu',
        explanations: [
          'Trong câu hỏi gián tiếp, ta không dùng trật tự câu hỏi. Where do I live không hợp ở đây.',
          'Đúng. He asked me where I lived dùng trật tự câu khẳng định và lùi thì.',
          'Where I live có thể đúng trong ngữ cảnh khác, nhưng câu này đang luyện reported speech với lived. Thu?t ng? ti?ng Anh c?n gi?: asked..',
          'Wear nghĩa là mặc. Để nói ở đâu, cần where.'
        ]
      },
      id: {
        prompt: 'Dia bertanya di mana saya tinggal',
        explanations: [
          'Dalam indirect question, urutannya bukan urutan pertanyaan. Where do I live tidak cocok di sini.',
          'Benar. He asked me where I lived memakai urutan kalimat biasa dan backshift.',
          'Where I live bisa benar di konteks lain, tetapi item ini menargetkan reported speech dengan lived. Istilah Inggris yang perlu dipertahankan: asked..',
          'Wear berarti memakai pakaian. Untuk di mana, gunakan where.'
        ]
      },
      tr: {
        prompt: 'Bana nerede yaşadığımı sordu',
        explanations: [
          'Dolaylı soruda soru kelime sırası kullanılmaz. Where do I live burada uymaz.',
          'Doğru. He asked me where I lived düz cümle sırası ve backshift kullanır.',
          'Where I live başka bağlamda olabilir, ama bu soru reported speech içinde lived bekliyor. Korunmas? gereken ?ngilizce terim: asked..',
          'Wear giyinmek demektir. Nerede demek için where gerekir.'
        ]
      },
      pl: {
        prompt: 'Zapytał mnie, gdzie mieszkam',
        explanations: [
          'W pytaniu pośrednim nie używamy szyku pytania. Where do I live tutaj nie pasuje.',
          'Dobrze. He asked me where I lived ma szyk zdania oznajmującego i backshift.',
          'Where I live bywa możliwe w innym kontekście, ale to zadanie celuje w reported speech z lived. Angielski termin do zachowania: asked..',
          'Wear znaczy nosić ubranie. Dla gdzie potrzebujesz where.'
        ]
      }
    },
    '113': {
      'pt-BR': {
        prompt: 'Se o tempo estiver bom, vamos caminhar',
        explanations: [
          'No first conditional, não colocamos will na parte com if. Dizemos if the weather is good. Termo-chave em ingl?s: will be..',
          'Falta will no resultado se você fala de uma decisão futura concreta.',
          'Correto. A estrutura é If + present simple, will + verbo base.',
          'Whether fala de uma alternativa. Para clima, a palavra é weather.'
        ]
      },
      vi: {
        prompt: 'Nếu thời tiết đẹp, chúng ta sẽ đi dạo',
        explanations: [
          'Trong first conditional, phần có if không dùng will. Ta nói if the weather is good. Thu?t ng? ti?ng Anh c?n gi?: will be..',
          'Phần kết quả còn thiếu will nếu nói về một việc cụ thể trong tương lai.',
          'Đúng. Mẫu là If + present simple, will + động từ nguyên mẫu.',
          'Whether dùng cho lựa chọn hoặc liệu có. Nói thời tiết thì cần weather.'
        ]
      },
      id: {
        prompt: 'Jika cuacanya bagus, kita akan berjalan-jalan',
        explanations: [
          'Dalam first conditional, bagian dengan if tidak memakai will. Katakan if the weather is good. Istilah Inggris yang perlu dipertahankan: will be..',
          'Bagian hasilnya kurang will jika maksudnya keputusan konkret di masa depan.',
          'Benar. Polanya If + present simple, will + verb dasar.',
          'Whether dipakai untuk pilihan. Untuk cuaca, gunakan weather.'
        ]
      },
      tr: {
        prompt: 'Hava güzel olursa yürüyüşe çıkacağız',
        explanations: [
          'First conditional içinde if kısmına will koymayız. If the weather is good deriz. Korunmas? gereken ?ngilizce terim: will be..',
          'Gelecekteki somut sonuç için ana cümlede will eksik.',
          'Doğru. Yapı If + present simple, will + fiilin yalın hali.',
          'Whether seçenek anlamındaki if gibidir. Hava durumu için weather gerekir.'
        ]
      },
      pl: {
        prompt: 'Jeśli pogoda będzie dobra, pójdziemy na spacer',
        explanations: [
          'W first conditional nie dajemy will w części z if. Mówimy if the weather is good. Angielski termin do zachowania: will be..',
          'W części z wynikiem brakuje will, jeśli chodzi o konkretną przyszłą decyzję.',
          'Dobrze. Schemat to If + present simple, will + forma podstawowa czasownika.',
          'Whether dotyczy alternatywy. Dla pogody potrzebujesz weather.'
        ]
      }
    },
    '114': {
      'pt-BR': {
        prompt: 'Este livro foi encontrado no parque',
        explanations: [
          'Correto. Was found é voz passiva no passado: o livro foi encontrado.',
          'This book found parece que o livro encontrou algo. Aqui precisamos de passiva.',
          'Book está no singular, então usamos was, não were.',
          'Pound pode significar libra ou bater. Aqui a palavra certa é found.'
        ]
      },
      vi: {
        prompt: 'Cuốn sách này được tìm thấy trong công viên',
        explanations: [
          'Đúng. Was found là bị động ở quá khứ: cuốn sách được tìm thấy.',
          'This book found nghe như cuốn sách đã tìm thấy thứ gì đó. Ở đây cần bị động.',
          'Book là số ít, nên dùng was, không phải were.',
          'Pound có nghĩa là pao hoặc đập. Ở đây cần found.'
        ]
      },
      id: {
        prompt: 'Buku ini ditemukan di taman',
        explanations: [
          'Benar. Was found adalah bentuk pasif lampau: buku itu ditemukan.',
          'This book found terdengar seolah bukunya yang menemukan sesuatu. Di sini perlu pasif.',
          'Book itu tunggal, jadi gunakan was, bukan were.',
          'Pound bisa berarti pon atau memukul. Di sini perlu found.'
        ]
      },
      tr: {
        prompt: 'Bu kitap parkta bulundu',
        explanations: [
          'Doğru. Was found geçmiş zamanda edilgen yapıdır: kitap bulundu.',
          'This book found kitabın bir şey bulduğu gibi duyulur. Burada edilgen yapı gerekir.',
          'Book tekildir, bu yüzden were değil was kullanılır.',
          'Pound pound birimi veya vurmak anlamına gelebilir. Burada found gerekir.'
        ]
      },
      pl: {
        prompt: 'Ta książka została znaleziona w parku',
        explanations: [
          'Dobrze. Was found to strona bierna w czasie przeszłym: książka została znaleziona.',
          'This book found brzmi tak, jakby książka coś znalazła. Tutaj potrzebna jest strona bierna.',
          'Book jest w liczbie pojedynczej, więc używamy was, nie were.',
          'Pound może znaczyć funt albo uderzać. Tutaj potrzebujesz found.'
        ]
      }
    },
    '115': {
      'pt-BR': {
        prompt: 'Não havia ninguém lá',
        explanations: [
          'Correto. Nobody já traz a negação, então não precisamos de outra.',
          'No inglês padrão, evitamos dupla negação: wasn\'t nobody não é a opção esperada.',
          'Here significa aqui. A frase pede lá: there.',
          'No body separado fala de nenhum corpo físico. Para ninguém, use nobody.'
        ]
      },
      vi: {
        prompt: 'Không có ai ở đó',
        explanations: [
          'Đúng. Nobody đã mang nghĩa phủ định, nên không cần thêm phủ định nữa.',
          'Trong tiếng Anh chuẩn, tránh phủ định kép: wasn\'t nobody không phải đáp án mong đợi.',
          'Here nghĩa là ở đây. Câu này cần ở đó: there.',
          'No body tách ra nói về không có cơ thể. Để nói không ai, dùng nobody.'
        ]
      },
      id: {
        prompt: 'Tidak ada siapa pun di sana',
        explanations: [
          'Benar. Nobody sudah mengandung makna negatif, jadi tidak perlu negatif lain.',
          'Dalam bahasa Inggris standar, double negative dihindari: wasn\'t nobody bukan bentuk yang diharapkan.',
          'Here berarti di sini. Kalimat ini meminta di sana: there.',
          'No body secara terpisah berarti tidak ada tubuh. Untuk tidak ada orang, gunakan nobody.'
        ]
      },
      tr: {
        prompt: 'Orada kimse yoktu',
        explanations: [
          'Doğru. Nobody zaten olumsuz anlam taşır, bu yüzden ikinci olumsuzluk gerekmez.',
          'Standart İngilizcede çift olumsuzdan kaçınırız: wasn\'t nobody beklenen seçenek değil.',
          'Here burada demektir. Cümlede orada gerekiyor: there.',
          'No body ayrı yazılırsa fiziksel beden yok anlamına gelir. Kimse için nobody kullanılır.'
        ]
      },
      pl: {
        prompt: 'Nikogo tam nie było',
        explanations: [
          'Dobrze. Nobody samo niesie przeczenie, więc nie potrzeba drugiego.',
          'W standardowym angielskim unikamy podwójnego przeczenia: wasn\'t nobody nie jest oczekiwaną formą.',
          'Here znaczy tutaj. W zdaniu chodzi o tam: there.',
          'No body osobno mówi o braku ciała. Dla nikt używamy nobody.'
        ]
      }
    },
    '116': {
      'pt-BR': {
        prompt: 'Você deve ter esquecido suas chaves',
        explanations: [
          'You must forget soa como obrigação futura: você deve esquecer. Não é dedução sobre o passado.',
          'Correto. Must have forgotten expressa uma dedução forte sobre algo passado.',
          'Depois de must have precisamos do particípio: forgotten, não forgot.',
          'Forbidden significa proibido. Aqui precisamos de forgotten.'
        ]
      },
      vi: {
        prompt: 'Chắc hẳn bạn đã quên chìa khóa',
        explanations: [
          'You must forget nghe như một mệnh lệnh hoặc nghĩa vụ trong tương lai: bạn phải quên.',
          'Đúng. Must have forgotten diễn tả suy đoán chắc chắn về một việc trong quá khứ.',
          'Sau must have cần quá khứ phân từ: forgotten, không phải forgot.',
          'Forbidden nghĩa là bị cấm. Ở đây cần forgotten.'
        ]
      },
      id: {
        prompt: 'Kamu pasti sudah lupa kuncimu',
        explanations: [
          'You must forget terdengar seperti kewajiban masa depan: kamu harus lupa. Bukan dugaan tentang masa lalu.',
          'Benar. Must have forgotten menyatakan dugaan kuat tentang sesuatu yang sudah terjadi.',
          'Setelah must have perlu past participle: forgotten, bukan forgot.',
          'Forbidden berarti dilarang. Di sini perlu forgotten.'
        ]
      },
      tr: {
        prompt: 'Anahtarlarını unutmuş olmalısın',
        explanations: [
          'You must forget geleceğe dönük bir zorunluluk gibi duyulur: unutmalısın. Geçmişe dair çıkarım değil.',
          'Doğru. Must have forgotten geçmişte olmuş bir şey hakkında güçlü çıkarım verir.',
          'Must have sonrasında past participle gerekir: forgot değil forgotten.',
          'Forbidden yasaklanmış demektir. Burada forgotten gerekir.'
        ]
      },
      pl: {
        prompt: 'Musiałeś zapomnieć kluczy',
        explanations: [
          'You must forget brzmi jak obowiązek na przyszłość: musisz zapomnieć. To nie jest wniosek o przeszłości.',
          'Dobrze. Must have forgotten wyraża mocne przypuszczenie o czymś z przeszłości.',
          'Po must have potrzebny jest past participle: forgotten, nie forgot.',
          'Forbidden znaczy zakazany. Tutaj potrzebujesz forgotten.'
        ]
      }
    },
    '117': {
      'pt-BR': {
        prompt: 'Estou te esperando aqui há uma hora',
        explanations: [
          'I am waiting... for an hour não mostra bem que a ação começou antes e continua agora.',
          'Correto. Have been waiting mostra uma ação que começou antes e ainda continua.',
          'Weighting tem a ver com peso. Aqui você precisa de waiting: have been waiting for you.',
          'Wait you não funciona. Em inglês, esperamos por alguém: wait for you.'
        ]
      },
      vi: {
        prompt: 'Tôi đã đợi bạn ở đây một tiếng rồi',
        explanations: [
          'I am waiting... for an hour chưa nối rõ hành động bắt đầu trước đó với hiện tại.',
          'Đúng. Have been waiting cho thấy hành động bắt đầu trước đây và vẫn tiếp diễn.',
          'Weighting liên quan đến cân nặng. Ở đây cần waiting: have been waiting for you.',
          'Wait you không đúng. Tiếng Anh nói wait for you.'
        ]
      },
      id: {
        prompt: 'Saya sudah menunggumu di sini selama satu jam',
        explanations: [
          'I am waiting... for an hour tidak jelas menghubungkan aksi yang mulai sebelumnya dengan sekarang.',
          'Benar. Have been waiting menunjukkan aksi yang mulai dulu dan masih berlangsung.',
          'Weighting berhubungan dengan berat. Di sini perlu waiting: have been waiting for you.',
          'Wait you tidak tepat. Dalam bahasa Inggris, kita mengatakan wait for you.'
        ]
      },
      tr: {
        prompt: 'Bir saattir burada seni bekliyorum',
        explanations: [
          'I am waiting... for an hour geçmişte başlayan eylemi şimdiyle iyi bağlamaz.',
          'Doğru. Have been waiting eylemin önce başlayıp hala sürdüğünü gösterir.',
          'Weighting ağırlıkla ilgilidir. Burada waiting gerekir: have been waiting for you.',
          'Wait you doğru değil. İngilizcede birini beklemek wait for you şeklindedir.'
        ]
      },
      pl: {
        prompt: 'Czekam tu na ciebie od godziny',
        explanations: [
          'I am waiting... for an hour słabo łączy czynność rozpoczętą wcześniej z teraźniejszością.',
          'Dobrze. Have been waiting pokazuje czynność, która zaczęła się wcześniej i trwa nadal.',
          'Weighting dotyczy wagi. Tutaj potrzebujesz waiting: have been waiting for you.',
          'Wait you nie działa. Po angielsku czekamy na kogoś: wait for you.'
        ]
      }
    },
    '118': {
      'pt-BR': {
        prompt: 'Não se esqueça de tirar os sapatos',
        explanations: [
          'Correto. Take off é usado para tirar roupas, sapatos ou acessórios.',
          'Take out significa tirar para fora, mas não é a forma natural para tirar sapatos do corpo.',
          'Take away significa levar embora ou retirar algo, não tirar os sapatos que você está usando.',
          'Of tem um f. Aqui precisamos de off, com dois f.'
        ]
      },
      vi: {
        prompt: 'Đừng quên cởi giày',
        explanations: [
          'Đúng. Take off dùng để cởi quần áo, giày hoặc phụ kiện.',
          'Take out nghĩa là lấy ra, nhưng không tự nhiên khi nói cởi giày đang mang.',
          'Take away nghĩa là mang đi hoặc lấy đi, không phải cởi giày khỏi chân.',
          'Of chỉ có một chữ f. Ở đây cần off với hai chữ f.'
        ]
      },
      id: {
        prompt: 'Jangan lupa melepas sepatumu',
        explanations: [
          'Benar. Take off dipakai untuk melepas pakaian, sepatu, atau aksesori.',
          'Take out berarti mengeluarkan, tetapi bukan bentuk alami untuk melepas sepatu dari kaki.',
          'Take away berarti membawa pergi atau menyingkirkan sesuatu, bukan melepas sepatu yang dipakai.',
          'Of hanya satu f. Di sini perlu off dengan dua f.'
        ]
      },
      tr: {
        prompt: 'Ayakkabılarını çıkarmayı unutma',
        explanations: [
          'Doğru. Take off kıyafet, ayakkabı veya aksesuar çıkarmak için kullanılır.',
          'Take out dışarı çıkarmak demektir, ama ayakkabıyı ayağından çıkarmak için doğal seçenek değildir.',
          'Take away götürmek veya uzaklaştırmak demektir, giydiğin ayakkabıyı çıkarmak değil.',
          'Of tek f ile yazılır. Burada iki f ile off gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie zapomnij zdjąć butów',
        explanations: [
          'Dobrze. Take off używamy przy zdejmowaniu ubrań, butów lub dodatków.',
          'Take out znaczy wyjąć, ale nie jest naturalne przy zdejmowaniu butów z nóg.',
          'Take away znaczy zabrać albo usunąć coś, nie zdjąć buty, które masz na sobie.',
          'Of ma jedno f. Tutaj potrzebne jest off z dwoma f.'
        ]
      }
    },
    '119': {
      'pt-BR': {
        prompt: 'Vejo você no fim de semana',
        explanations: [
          'In the weekend não é a combinação esperada neste item.',
          'Falta the. A opção esperada é on the weekend.',
          'Correto. On the weekend é natural, especialmente no inglês americano.',
          'Sea significa mar. Para ver alguém, a palavra é see.'
        ]
      },
      vi: {
        prompt: 'Tôi sẽ gặp bạn vào cuối tuần',
        explanations: [
          'In the weekend không phải cụm được mong đợi trong câu này.',
          'Thiếu the. Đáp án mong đợi là on the weekend.',
          'Đúng. On the weekend nghe tự nhiên, đặc biệt trong tiếng Anh Mỹ.',
          'Sea nghĩa là biển. Để nói gặp hoặc thấy ai đó, cần see.'
        ]
      },
      id: {
        prompt: 'Sampai jumpa akhir pekan',
        explanations: [
          'In the weekend bukan kombinasi yang diharapkan dalam item ini.',
          'Kurang the. Pilihan yang diharapkan adalah on the weekend.',
          'Benar. On the weekend terdengar alami, terutama dalam bahasa Inggris Amerika.',
          'Sea berarti laut. Untuk melihat atau bertemu seseorang, gunakan see.'
        ]
      },
      tr: {
        prompt: 'Hafta sonu görüşürüz',
        explanations: [
          'In the weekend bu soruda beklenen kalıp değildir.',
          'The eksik. Beklenen seçenek on the weekend.',
          'Doğru. On the weekend doğaldır, özellikle Amerikan İngilizcesinde.',
          'Sea deniz demektir. Birini görmek için see gerekir.'
        ]
      },
      pl: {
        prompt: 'Zobaczę cię w weekend',
        explanations: [
          'In the weekend nie jest oczekiwanym połączeniem w tym zadaniu.',
          'Brakuje the. Oczekiwana opcja to on the weekend.',
          'Dobrze. On the weekend brzmi naturalnie, zwłaszcza w amerykańskim angielskim.',
          'Sea znaczy morze. Gdy chodzi o zobaczyć kogoś, potrzebujesz see.'
        ]
      }
    },
    '120': {
      'pt-BR': {
        prompt: 'Estou me acostumando a acordar cedo',
        explanations: [
          'I use to não expressa essa ideia. Além disso, este item fala de se acostumar agora.',
          'Correto. Getting used to + -ing significa estar se acostumando a fazer algo.',
          'Depois de used to nesta estrutura, precisamos de -ing: waking up.',
          'Cake significa bolo. Aqui precisamos de waking.'
        ]
      },
      vi: {
        prompt: 'Tôi đang dần quen với việc dậy sớm',
        explanations: [
          'I use to không diễn đạt ý này. Câu đang nói về việc đang dần quen ở hiện tại.',
          'Đúng. Getting used to + -ing nghĩa là đang quen dần với việc làm gì.',
          'Sau used to trong cấu trúc này cần dạng -ing: waking up.',
          'Cake nghĩa là bánh. Ở đây cần waking.'
        ]
      },
      id: {
        prompt: 'Saya mulai terbiasa bangun pagi',
        explanations: [
          'I use to tidak menyampaikan ide ini. Item ini membahas proses mulai terbiasa sekarang.',
          'Benar. Getting used to + -ing berarti sedang menjadi terbiasa melakukan sesuatu.',
          'Setelah used to dalam struktur ini, perlu bentuk -ing: waking up.',
          'Cake berarti kue. Di sini perlu waking.'
        ]
      },
      tr: {
        prompt: 'Erken uyanmaya alışıyorum',
        explanations: [
          'I use to bu fikri vermez. Ayrıca bu soru şu anda alışma sürecinden bahsediyor.',
          'Doğru. Getting used to + -ing bir şeyi yapmaya alışıyor olmak demektir.',
          'Bu yapıda used to sonrasında -ing gerekir: waking up.',
          'Cake kek demektir. Burada waking gerekir.'
        ]
      },
      pl: {
        prompt: 'Przyzwyczajam się do wczesnego wstawania',
        explanations: [
          'I use to nie wyraża tej myśli. To zadanie mówi o przyzwyczajaniu się teraz.',
          'Dobrze. Getting used to + -ing znaczy przyzwyczajać się do robienia czegoś.',
          'Po used to w tej strukturze potrzebna jest forma -ing: waking up.',
          'Cake znaczy ciasto. Tutaj potrzebujesz waking.'
        ]
      }
    },
    '121': {
      'pt-BR': {
        prompt: 'Preciso que alguém me ajude',
        explanations: [
          'Correto. I need someone to help me usa someone + to + verbo para dizer quem deve fazer a ação.',
          'I need that someone helps me copia outra estrutura. Aqui precisamos de someone to help me.',
          'Falta to entre someone e help. A estrutura natural é someone to help me.',
          'Salmon significa salmão. Aqui você precisa de someone: uma pessoa, não um peixe.'
        ]
      },
      vi: {
        prompt: 'Tôi cần ai đó giúp tôi',
        explanations: [
          'Đúng. I need someone to help me dùng someone + to + động từ để nói ai cần làm hành động.',
          'I need that someone helps me sao chép cấu trúc khác. Ở đây cần someone to help me.',
          'Thiếu to giữa someone và help. Cấu trúc tự nhiên là someone to help me.',
          'Salmon nghĩa là cá hồi. Ở đây cần someone: một người, không phải cá.'
        ]
      },
      id: {
        prompt: 'Saya butuh seseorang untuk membantu saya',
        explanations: [
          'Benar. I need someone to help me memakai someone + to + kata kerja untuk menyebut siapa yang melakukan aksi.',
          'I need that someone helps me menyalin struktur lain. Di sini perlu someone to help me.',
          'Kurang to antara someone dan help. Struktur alaminya adalah someone to help me.',
          'Salmon berarti ikan salmon. Di sini perlu someone: orang, bukan ikan.'
        ]
      },
      tr: {
        prompt: 'Birinin bana yardım etmesine ihtiyacım var',
        explanations: [
          'Doğru. I need someone to help me, eylemi kimin yapacağını söylemek için someone + to + fiil kullanır.',
          'I need that someone helps me başka bir yapıyı kopyalar. Burada someone to help me gerekir.',
          'Someone ile help arasında to eksik. Doğal yapı someone to help me.',
          'Salmon somon balığı demektir. Burada someone gerekir: balık değil, bir kişi.'
        ]
      },
      pl: {
        prompt: 'Potrzebuję, żeby ktoś mi pomógł',
        explanations: [
          'Dobrze. I need someone to help me używa someone + to + czasownik, żeby powiedzieć, kto ma wykonać czynność.',
          'I need that someone helps me kopiuje inną strukturę. Tutaj potrzebujesz someone to help me.',
          'Brakuje to między someone i help. Naturalna struktura to someone to help me.',
          'Salmon znaczy łosoś. Tutaj potrzebujesz someone: osoby, nie ryby.'
        ]
      }
    },
    '122': {
      'pt-BR': {
        prompt: 'Não consigo evitar rir disso',
        explanations: [
          'I can\'t not laugh é compreensível, mas este item treina a expressão natural can\'t help + -ing.',
          'Correto. Can\'t help laughing significa não conseguir evitar rir.',
          'Depois de can\'t help usamos -ing, não to + verbo: can\'t help laughing.',
          'Leafing significa folhear. Para rir, você precisa de laughing.'
        ]
      },
      vi: {
        prompt: 'Tôi không thể nhịn cười về điều này',
        explanations: [
          'I can\'t not laugh có thể hiểu được, nhưng item này luyện cách nói tự nhiên can\'t help + -ing.',
          'Đúng. Can\'t help laughing nghĩa là không thể nhịn cười.',
          'Sau can\'t help dùng dạng -ing, không dùng to + động từ: can\'t help laughing.',
          'Leafing nghĩa là lật giở trang sách. Để nói cười, cần laughing.'
        ]
      },
      id: {
        prompt: 'Saya tidak bisa menahan tawa tentang itu',
        explanations: [
          'I can\'t not laugh bisa dipahami, tetapi item ini melatih ungkapan alami can\'t help + -ing.',
          'Benar. Can\'t help laughing berarti tidak bisa menahan tawa.',
          'Setelah can\'t help gunakan -ing, bukan to + kata kerja: can\'t help laughing.',
          'Leafing berarti membalik-balik halaman. Untuk tertawa, perlu laughing.'
        ]
      },
      tr: {
        prompt: 'Buna gülmeden edemiyorum',
        explanations: [
          'I can\'t not laugh anlaşılır olabilir, ama bu soru doğal kalıp olan can\'t help + -ing yapısını çalıştırıyor.',
          'Doğru. Can\'t help laughing gülmeden duramamak demektir.',
          'Can\'t help sonrasında to + fiil değil, -ing kullanılır: can\'t help laughing.',
          'Leafing sayfa çevirmek demektir. Gülmek için laughing gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie mogę się powstrzymać od śmiechu z tego',
        explanations: [
          'I can\'t not laugh da się zrozumieć, ale to zadanie ćwiczy naturalną konstrukcję can\'t help + -ing.',
          'Dobrze. Can\'t help laughing znaczy nie móc powstrzymać śmiechu.',
          'Po can\'t help używamy -ing, nie to + czasownik: can\'t help laughing.',
          'Leafing znaczy kartkowanie. Do śmiechu potrzebujesz laughing.'
        ]
      }
    },
    '123': {
      'pt-BR': {
        prompt: 'Eu estava tomando banho quando alguém bateu',
        explanations: [
          'Correto. Was taking mostra uma ação em andamento, e knocked a interrompe.',
          'I took a shower pode soar como uma ação completa. Aqui precisamos do processo: was taking.',
          'Naked significa nu. Aqui você precisa de knocked: alguém bateu.',
          'Com I usamos was, não were, no past continuous.'
        ]
      },
      vi: {
        prompt: 'Tôi đang tắm thì có ai đó gõ cửa',
        explanations: [
          'Đúng. Was taking cho thấy hành động đang diễn ra, và knocked cắt ngang nó.',
          'I took a shower có thể nghe như một hành động đã xong. Ở đây cần quá trình: was taking.',
          'Naked nghĩa là khỏa thân. Ở đây cần knocked: ai đó gõ cửa.',
          'Với I dùng was, không dùng were, trong past continuous.'
        ]
      },
      id: {
        prompt: 'Saya sedang mandi ketika seseorang mengetuk',
        explanations: [
          'Benar. Was taking menunjukkan aksi yang sedang berlangsung, dan knocked memotongnya.',
          'I took a shower bisa terdengar seperti aksi selesai. Di sini perlu proses: was taking.',
          'Naked berarti telanjang. Di sini perlu knocked: seseorang mengetuk.',
          'Dengan I, gunakan was, bukan were, dalam past continuous.'
        ]
      },
      tr: {
        prompt: 'Biri kapıyı çaldığında duş alıyordum',
        explanations: [
          'Doğru. Was taking devam eden eylemi gösterir, knocked ise onu keser.',
          'I took a shower tamamlanmış bir eylem gibi duyulabilir. Burada süreç gerekir: was taking.',
          'Naked çıplak demektir. Burada knocked gerekir: biri kapıyı çaldı.',
          'Past continuous içinde I ile was kullanılır, were değil.'
        ]
      },
      pl: {
        prompt: 'Brałem prysznic, kiedy ktoś zapukał',
        explanations: [
          'Dobrze. Was taking pokazuje czynność w toku, a knocked ją przerywa.',
          'I took a shower może brzmieć jak zakończona czynność. Tutaj potrzebny jest proces: was taking.',
          'Naked znaczy nagi. Tutaj potrzebujesz knocked: ktoś zapukał.',
          'Z I używamy was, nie were, w past continuous.'
        ]
      }
    },
    '124': {
      'pt-BR': {
        prompt: 'Se eu tivesse tempo, eu te ajudaria',
        explanations: [
          'Correto. If I had time, I would help you expressa uma situação hipotética agora.',
          'If I have time, I will help you fala de uma possibilidade real no futuro, não de uma hipótese presente.',
          'Your significa seu/sua. No fim desta frase, precisamos de you.',
          'Thyme significa tomilho. Para tempo, a palavra é time.'
        ]
      },
      vi: {
        prompt: 'Nếu tôi có thời gian, tôi sẽ giúp bạn',
        explanations: [
          'Đúng. If I had time, I would help you diễn tả một tình huống giả định ở hiện tại.',
          'If I have time, I will help you nói về khả năng thật trong tương lai, không phải giả định hiện tại.',
          'Your nghĩa là của bạn. Cuối câu này cần you.',
          'Thyme nghĩa là cỏ xạ hương. Muốn nói thời gian, cần time.'
        ]
      },
      id: {
        prompt: 'Jika saya punya waktu, saya akan membantumu',
        explanations: [
          'Benar. If I had time, I would help you menyatakan situasi hipotetis saat ini.',
          'If I have time, I will help you membahas kemungkinan nyata di masa depan, bukan hipotesis sekarang.',
          'Your berarti milikmu. Di akhir kalimat ini perlu you.',
          'Thyme berarti timi. Untuk waktu, perlu time.'
        ]
      },
      tr: {
        prompt: 'Zamanım olsaydı sana yardım ederdim',
        explanations: [
          'Doğru. If I had time, I would help you şu anki varsayımsal bir durumu anlatır.',
          'If I have time, I will help you gerçek bir gelecek olasılığından söz eder, şimdiki varsayımdan değil.',
          'Your senin demektir. Bu cümlenin sonunda you gerekir.',
          'Thyme kekik demektir. Zaman için time gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdybym miał czas, pomógłbym ci',
        explanations: [
          'Dobrze. If I had time, I would help you wyraża sytuację hipotetyczną teraz.',
          'If I have time, I will help you mówi o realnej możliwości w przyszłości, nie o obecnej hipotezie.',
          'Your znaczy twój/twoja. Na końcu tego zdania potrzebujesz you.',
          'Thyme znaczy tymianek. Dla czasu potrzebujesz time.'
        ]
      }
    },
    '125': {
      'pt-BR': {
        prompt: 'O homem que mora aqui é muito gentil',
        explanations: [
          'Which costuma ser usado para coisas ou animais, não para uma pessoa neste item. Aqui vai who.',
          'Correto. Who lives here descreve o homem.',
          'Whose fala de posse. Aqui não perguntamos de quem é algo.',
          'Main significa principal. Aqui você precisa de man.'
        ]
      },
      vi: {
        prompt: 'Người đàn ông sống ở đây rất tốt bụng',
        explanations: [
          'Which thường dùng cho đồ vật hoặc động vật, không phải người trong item này. Ở đây dùng who.',
          'Đúng. Who lives here mô tả người đàn ông.',
          'Whose nói về sở hữu. Ở đây không hỏi cái gì thuộc về ai.',
          'Main nghĩa là chính/chủ yếu. Ở đây cần man.'
        ]
      },
      id: {
        prompt: 'Pria yang tinggal di sini sangat baik',
        explanations: [
          'Which biasanya dipakai untuk benda atau hewan, bukan orang dalam item ini. Di sini gunakan who.',
          'Benar. Who lives here menjelaskan pria itu.',
          'Whose membahas kepemilikan. Di sini kita tidak menanyakan milik siapa.',
          'Main berarti utama. Di sini perlu man.'
        ]
      },
      tr: {
        prompt: 'Burada yaşayan adam çok nazik',
        explanations: [
          'Which genelde şeyler veya hayvanlar için kullanılır, bu soruda kişi için değil. Burada who gerekir.',
          'Doğru. Who lives here adamı tanımlar.',
          'Whose sahiplik anlatır. Burada bir şeyin kime ait olduğunu sormuyoruz.',
          'Main ana/başlıca demektir. Burada man gerekir.'
        ]
      },
      pl: {
        prompt: 'Mężczyzna, który tu mieszka, jest bardzo miły',
        explanations: [
          'Which zwykle używa się do rzeczy lub zwierząt, nie do osoby w tym zadaniu. Tutaj pasuje who.',
          'Dobrze. Who lives here opisuje mężczyznę.',
          'Whose mówi o posiadaniu. Tutaj nie pytamy, do kogo coś należy.',
          'Main znaczy główny. Tutaj potrzebujesz man.'
        ]
      }
    },
    '126': {
      'pt-BR': {
        prompt: 'Eu mesmo consertei minha bicicleta',
        explanations: [
          'By me não é a forma esperada para dizer que fiz isso sozinho. Use by myself.',
          'Correto. By myself significa que fiz sozinho, sem ajuda.',
          'Myself sem by pode soar natural, mas este item pratica a expressão by myself.',
          'Shelf significa prateleira. My shelf não faz sentido aqui.'
        ]
      },
      vi: {
        prompt: 'Tôi tự sửa xe đạp của mình',
        explanations: [
          'By me không phải cách mong đợi để nói tôi tự làm một mình. Dùng by myself.',
          'Đúng. By myself nghĩa là tôi tự làm, không có trợ giúp.',
          'Myself không có by có thể tự nhiên, nhưng item này luyện cụm by myself.',
          'Shelf nghĩa là cái kệ. My shelf không hợp nghĩa ở đây.'
        ]
      },
      id: {
        prompt: 'Saya memperbaiki sepeda saya sendiri',
        explanations: [
          'By me bukan bentuk yang diharapkan untuk mengatakan saya melakukannya sendiri. Gunakan by myself.',
          'Benar. By myself berarti saya melakukannya sendiri, tanpa bantuan.',
          'Myself tanpa by bisa terdengar alami, tetapi item ini melatih ungkapan by myself.',
          'Shelf berarti rak. My shelf tidak masuk akal di sini.'
        ]
      },
      tr: {
        prompt: 'Bisikletimi kendim tamir ettim',
        explanations: [
          'By me bunu tek başıma yaptım demek için beklenen biçim değil. By myself kullan.',
          'Doğru. By myself tek başıma, yardım almadan demektir.',
          'By olmadan myself doğal olabilir, ama bu soru by myself ifadesini çalıştırıyor.',
          'Shelf raf demektir. My shelf burada anlamlı değil.'
        ]
      },
      pl: {
        prompt: 'Sam naprawiłem swój rower',
        explanations: [
          'By me nie jest oczekiwaną formą dla znaczenia, że zrobiłem to sam. Użyj by myself.',
          'Dobrze. By myself znaczy samodzielnie, bez pomocy.',
          'Myself bez by może brzmieć naturalnie, ale to zadanie ćwiczy wyrażenie by myself.',
          'Shelf znaczy półka. My shelf nie ma tutaj sensu.'
        ]
      }
    },
    '127': {
      'pt-BR': {
        prompt: 'Vamos nos encontrar no ponto de ônibus',
        explanations: [
          'In sugere estar dentro de algo. Um ponto de ônibus é um ponto de encontro: at.',
          'On soa como em cima do ponto. Para um ponto de encontro usamos at.',
          'Correto. At the bus stop marca um lugar específico para se encontrar.',
          'Boss significa chefe. Aqui você precisa de bus.'
        ]
      },
      vi: {
        prompt: 'Hãy gặp nhau ở trạm xe buýt',
        explanations: [
          'In gợi ý ở bên trong thứ gì đó. Trạm xe buýt là điểm gặp: at.',
          'On nghe như ở trên nóc trạm. Với điểm gặp, dùng at.',
          'Đúng. At the bus stop đánh dấu một địa điểm cụ thể để gặp nhau.',
          'Boss nghĩa là sếp. Ở đây cần bus.'
        ]
      },
      id: {
        prompt: 'Mari bertemu di halte bus',
        explanations: [
          'In memberi kesan berada di dalam sesuatu. Halte adalah titik pertemuan: at.',
          'On terdengar seperti di atas halte. Untuk titik pertemuan, gunakan at.',
          'Benar. At the bus stop menandai tempat khusus untuk bertemu.',
          'Boss berarti bos. Di sini perlu bus.'
        ]
      },
      tr: {
        prompt: 'Otobüs durağında buluşalım',
        explanations: [
          'In bir şeyin içinde olmayı düşündürür. Otobüs durağı bir buluşma noktasıdır: at.',
          'On durağın üstünde gibi duyulur. Buluşma noktası için at kullanılır.',
          'Doğru. At the bus stop belirli bir buluşma yerini gösterir.',
          'Boss patron demektir. Burada bus gerekir.'
        ]
      },
      pl: {
        prompt: 'Spotkajmy się na przystanku autobusowym',
        explanations: [
          'In sugeruje wnętrze czegoś. Przystanek to punkt spotkania: at.',
          'On brzmi jak na dachu przystanku. Dla punktu spotkania używamy at.',
          'Dobrze. At the bus stop wskazuje konkretne miejsce spotkania.',
          'Boss znaczy szef. Tutaj potrzebujesz bus.'
        ]
      }
    },
    '128': {
      'pt-BR': {
        prompt: 'Por favor, não se esqueça de apagar a luz',
        explanations: [
          'Em um pedido negativo precisamos de don\'t, não apenas not.',
          'Forget + -ing fala de esquecer algo que você já fez. Aqui é uma ação pendente: to turn off.',
          'Correto. Don\'t forget to turn off the light significa lembrar de apagar a luz.',
          'Night significa noite. Aqui você precisa de light.'
        ]
      },
      vi: {
        prompt: 'Làm ơn đừng quên tắt đèn',
        explanations: [
          'Trong một lời nhắc phủ định, cần don\'t, không chỉ not.',
          'Forget + -ing nói về quên một việc đã làm. Ở đây là hành động còn phải làm: to turn off.',
          'Đúng. Don\'t forget to turn off the light nghĩa là nhớ tắt đèn.',
          'Night nghĩa là đêm. Ở đây cần light.'
        ]
      },
      id: {
        prompt: 'Tolong jangan lupa mematikan lampu',
        explanations: [
          'Dalam permintaan negatif, perlu don\'t, bukan hanya not.',
          'Forget + -ing membahas lupa sesuatu yang sudah dilakukan. Di sini aksinya masih harus dilakukan: to turn off.',
          'Benar. Don\'t forget to turn off the light berarti ingat untuk mematikan lampu.',
          'Night berarti malam. Di sini perlu light.'
        ]
      },
      tr: {
        prompt: 'Lütfen ışığı kapatmayı unutma',
        explanations: [
          'Olumsuz bir ricada sadece not değil, don\'t gerekir.',
          'Forget + -ing yapılmış bir şeyi hatırlamamayı anlatır. Burada yapılacak eylem var: to turn off.',
          'Doğru. Don\'t forget to turn off the light ışığı kapatmayı hatırla demektir.',
          'Night gece demektir. Burada light gerekir.'
        ]
      },
      pl: {
        prompt: 'Proszę, nie zapomnij wyłączyć światła',
        explanations: [
          'W negatywnej prośbie potrzebujemy don\'t, nie samego not.',
          'Forget + -ing mówi o zapomnieniu czegoś, co już zrobiłeś. Tutaj chodzi o czynność do wykonania: to turn off.',
          'Dobrze. Don\'t forget to turn off the light znaczy pamiętaj, żeby wyłączyć światło.',
          'Night znaczy noc. Tutaj potrzebujesz light.'
        ]
      }
    },
    '129': {
      'pt-BR': {
        prompt: 'Acabei de terminar o trabalho',
        explanations: [
          'I just finished work pode soar natural, mas este item pratica have just finished para um resultado recente.',
          'Correto. Have just finished marca uma ação recém-terminada com resultado agora.',
          'Walk significa caminhada ou caminhar. Aqui você precisa de work.',
          'Com I usamos have, não has.'
        ]
      },
      vi: {
        prompt: 'Tôi vừa mới hoàn thành công việc',
        explanations: [
          'I just finished work có thể nghe tự nhiên, nhưng item này luyện have just finished cho kết quả mới xảy ra.',
          'Đúng. Have just finished đánh dấu hành động vừa kết thúc với kết quả ở hiện tại.',
          'Walk nghĩa là cuộc đi bộ hoặc đi bộ. Ở đây cần work.',
          'Với I dùng have, không dùng has.'
        ]
      },
      id: {
        prompt: 'Saya baru saja menyelesaikan pekerjaan',
        explanations: [
          'I just finished work bisa terdengar alami, tetapi item ini melatih have just finished untuk hasil yang baru terjadi.',
          'Benar. Have just finished menandai aksi yang baru selesai dengan hasil sekarang.',
          'Walk berarti jalan kaki atau berjalan. Di sini perlu work.',
          'Dengan I, gunakan have, bukan has.'
        ]
      },
      tr: {
        prompt: 'İşi az önce bitirdim',
        explanations: [
          'I just finished work doğal duyulabilir, ama bu soru yakın sonuç için have just finished yapısını çalıştırıyor.',
          'Doğru. Have just finished yeni tamamlanmış ve sonucu şimdi görülen bir eylemi gösterir.',
          'Walk yürüyüş veya yürümek demektir. Burada work gerekir.',
          'I ile have kullanılır, has değil.'
        ]
      },
      pl: {
        prompt: 'Właśnie skończyłem pracę',
        explanations: [
          'I just finished work może brzmieć naturalnie, ale to zadanie ćwiczy have just finished dla świeżego rezultatu.',
          'Dobrze. Have just finished oznacza czynność właśnie zakończoną z wynikiem teraz.',
          'Walk znaczy spacer albo chodzić. Tutaj potrzebujesz work.',
          'Z I używamy have, nie has.'
        ]
      }
    },
    '130': {
      'pt-BR': {
        prompt: 'Ela sugeriu ir ao cinema',
        explanations: [
          'Depois de suggest normalmente não usamos to + verbo. Usamos -ing.',
          'Correto. Suggest going é a estrutura natural.',
          'Gone é particípio; aqui precisamos da ação em -ing: going.',
          'Gown significa vestido formal. Aqui você precisa de going.'
        ]
      },
      vi: {
        prompt: 'Cô ấy đề nghị đi xem phim',
        explanations: [
          'Sau suggest thường không dùng to + động từ. Ta dùng dạng -ing.',
          'Đúng. Suggest going là cấu trúc tự nhiên.',
          'Gone là phân từ; ở đây cần hành động dạng -ing: going.',
          'Gown nghĩa là váy dạ hội. Ở đây cần going.'
        ]
      },
      id: {
        prompt: 'Dia menyarankan pergi ke bioskop',
        explanations: [
          'Setelah suggest biasanya tidak memakai to + kata kerja. Gunakan -ing.',
          'Benar. Suggest going adalah struktur alami.',
          'Gone adalah participle; di sini perlu aksi dengan -ing: going.',
          'Gown berarti gaun formal. Di sini perlu going.'
        ]
      },
      tr: {
        prompt: 'Sinemaya gitmeyi önerdi',
        explanations: [
          'Suggest sonrasında genelde to + fiil kullanmayız. -ing kullanılır.',
          'Doğru. Suggest going doğal yapıdır.',
          'Gone participle biçimidir; burada -ing ile eylem gerekir: going.',
          'Gown resmi elbise demektir. Burada going gerekir.'
        ]
      },
      pl: {
        prompt: 'Zaproponowała pójście do kina',
        explanations: [
          'Po suggest zwykle nie używamy to + czasownik. Używamy formy -ing.',
          'Dobrze. Suggest going to naturalna struktura.',
          'Gone to imiesłów; tutaj potrzebna jest czynność w -ing: going.',
          'Gown znaczy suknia wieczorowa. Tutaj potrzebujesz going.'
        ]
      }
    },
    '131': {
      'pt-BR': {
        prompt: 'Esta foto foi tirada em Paris',
        explanations: [
          'Correto. Was taken é past simple passive: a foto recebeu a ação.',
          'This photo took soa como se a foto tivesse tirado algo. Falta was para formar a passiva.',
          'Photo made in Paris copia a ideia de fazer foto. Em inglês usamos take a photo; aqui: was taken.',
          'Potato significa batata. Aqui precisamos de photo.'
        ]
      },
      vi: {
        prompt: 'Bức ảnh này được chụp ở Paris',
        explanations: [
          'Đúng. Was taken là past simple passive: bức ảnh nhận hành động.',
          'This photo took nghe như bức ảnh tự chụp thứ gì đó. Thiếu was để tạo câu bị động.',
          'Photo made in Paris sao chép ý "làm ảnh". Trong tiếng Anh dùng take a photo; ở đây: was taken.',
          'Potato nghĩa là khoai tây. Ở đây cần photo.'
        ]
      },
      id: {
        prompt: 'Foto ini diambil di Paris',
        explanations: [
          'Benar. Was taken adalah past simple passive: foto itu menerima aksi.',
          'This photo took terdengar seolah foto itu mengambil sesuatu. Kurang was untuk membentuk pasif.',
          'Photo made in Paris menyalin ide "membuat foto". Dalam bahasa Inggris gunakan take a photo; di sini: was taken.',
          'Potato berarti kentang. Di sini perlu photo.'
        ]
      },
      tr: {
        prompt: 'Bu fotoğraf Paris\'te çekildi',
        explanations: [
          'Doğru. Was taken past simple passive yapısıdır: fotoğraf eylemi alır.',
          'This photo took fotoğraf bir şey aldı gibi duyulur. Pasif yapı için was eksik.',
          'Photo made in Paris fotoğraf yapmak fikrini kopyalar. İngilizcede take a photo kullanılır; burada was taken.',
          'Potato patates demektir. Burada photo gerekir.'
        ]
      },
      pl: {
        prompt: 'To zdjęcie zostało zrobione w Paryżu',
        explanations: [
          'Dobrze. Was taken to past simple passive: zdjęcie otrzymało czynność.',
          'This photo took brzmi tak, jakby zdjęcie coś wzięło lub zrobiło. Brakuje was do strony biernej.',
          'Photo made in Paris kopiuje ideę robienia zdjęcia. Po angielsku używamy take a photo; tutaj: was taken.',
          'Potato znaczy ziemniak. Tutaj potrzebujesz photo.'
        ]
      }
    },
    '132': {
      'pt-BR': {
        prompt: 'Não há ninguém lá',
        explanations: [
          'Correto. There is nobody there já contém uma ideia negativa com nobody.',
          'Isn\'t + nobody cria dupla negação no inglês padrão. Use nobody sem not, ou isn\'t anybody.',
          'No anybody não funciona nesta estrutura. Escolha nobody ou not anybody.',
          'No body separado significa nenhum corpo. Para nenhuma pessoa, escreva nobody junto.'
        ]
      },
      vi: {
        prompt: 'Không có ai ở đó',
        explanations: [
          'Đúng. There is nobody there đã có ý phủ định với nobody.',
          'Isn\'t + nobody tạo phủ định kép trong tiếng Anh chuẩn. Dùng nobody không có not, hoặc isn\'t anybody.',
          'No anybody không dùng được trong cấu trúc này. Chọn nobody hoặc not anybody.',
          'No body viết tách nghĩa là không có cơ thể. Khi nói không có ai, viết liền: nobody.'
        ]
      },
      id: {
        prompt: 'Tidak ada siapa pun di sana',
        explanations: [
          'Benar. There is nobody there sudah memuat ide negatif dengan nobody.',
          'Isn\'t + nobody membuat negatif ganda dalam bahasa Inggris standar. Gunakan nobody tanpa not, atau isn\'t anybody.',
          'No anybody tidak cocok dalam struktur ini. Pilih nobody atau not anybody.',
          'No body yang dipisah berarti tidak ada tubuh. Untuk tidak ada orang, tulis nobody.'
        ]
      },
      tr: {
        prompt: 'Orada kimse yok',
        explanations: [
          'Doğru. There is nobody there cümlesinde nobody zaten olumsuz anlam taşır.',
          'Isn\'t + nobody standart İngilizcede çift olumsuzluk oluşturur. Not olmadan nobody ya da isn\'t anybody kullan.',
          'No anybody bu yapıda çalışmaz. Nobody veya not anybody seç.',
          'No body ayrı yazılınca beden yok demektir. Hiç kimse için nobody bitişik yazılır.'
        ]
      },
      pl: {
        prompt: 'Nikogo tam nie ma',
        explanations: [
          'Dobrze. There is nobody there zawiera już przeczenie w nobody.',
          'Isn\'t + nobody tworzy podwójne przeczenie w standardowym angielskim. Użyj nobody bez not albo isn\'t anybody.',
          'No anybody nie działa w tej strukturze. Wybierz nobody albo not anybody.',
          'No body osobno znaczy żadne ciało. Dla żadnej osoby pisz nobody razem.'
        ]
      }
    },
    '133': {
      'pt-BR': {
        prompt: 'Antes eu lia muito',
        explanations: [
          'I am used to read mistura outra estrutura. Para hábito passado usamos used to read.',
          'Correto. Used to read fala de um hábito do passado que já não é igual agora.',
          'I before read copia a ordem de outro idioma. Em inglês natural usamos used to read.',
          'Red significa vermelho. Para o verbo ler, precisamos de read.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi đọc rất nhiều',
        explanations: [
          'I am used to read trộn với cấu trúc khác. Với thói quen quá khứ, dùng used to read.',
          'Đúng. Used to read nói về thói quen trong quá khứ, giờ không còn như vậy.',
          'I before read sao chép trật tự từ của ngôn ngữ khác. Tiếng Anh tự nhiên dùng used to read.',
          'Red nghĩa là màu đỏ. Với động từ đọc, cần read.'
        ]
      },
      id: {
        prompt: 'Dulu saya banyak membaca',
        explanations: [
          'I am used to read mencampur struktur lain. Untuk kebiasaan masa lalu, gunakan used to read.',
          'Benar. Used to read membahas kebiasaan masa lalu yang sekarang tidak sama lagi.',
          'I before read menyalin urutan bahasa lain. Bahasa Inggris alami memakai used to read.',
          'Red berarti merah. Untuk kata kerja membaca, perlu read.'
        ]
      },
      tr: {
        prompt: 'Eskiden çok okurdum',
        explanations: [
          'I am used to read başka bir yapıyla karışır. Geçmiş alışkanlık için used to read kullanılır.',
          'Doğru. Used to read artık aynı olmayan geçmiş bir alışkanlığı anlatır.',
          'I before read başka bir dilin kelime sırasını kopyalar. Doğal İngilizcede used to read kullanılır.',
          'Red kırmızı demektir. Okumak fiili için read gerekir.'
        ]
      },
      pl: {
        prompt: 'Kiedyś dużo czytałem',
        explanations: [
          'I am used to read miesza inną strukturę. Dla dawnego nawyku używamy used to read.',
          'Dobrze. Used to read mówi o nawyku z przeszłości, który teraz nie jest już taki sam.',
          'I before read kopiuje szyk z innego języka. Naturalnie po angielsku używamy used to read.',
          'Red znaczy czerwony. Dla czasownika czytać potrzebujesz read.'
        ]
      }
    },
    '134': {
      'pt-BR': {
        prompt: 'Eu o conheço há cinco anos',
        explanations: [
          'I know him for five years não mostra bem que começou no passado e continua agora. Use have known.',
          'Since é para um ponto de início. Five years é duração, então precisamos de for.',
          'Correto. Have known him for five years conecta o passado com o presente.',
          'Nose significa nariz. Aqui precisamos de known, o particípio de know.'
        ]
      },
      vi: {
        prompt: 'Tôi đã biết anh ấy được năm năm',
        explanations: [
          'I know him for five years không thể hiện rõ việc bắt đầu trong quá khứ và vẫn tiếp tục. Dùng have known.',
          'Since dùng cho điểm bắt đầu. Five years là khoảng thời gian, nên cần for.',
          'Đúng. Have known him for five years nối quá khứ với hiện tại.',
          'Nose nghĩa là mũi. Ở đây cần known, phân từ của know.'
        ]
      },
      id: {
        prompt: 'Saya sudah mengenalnya selama lima tahun',
        explanations: [
          'I know him for five years tidak jelas menunjukkan mulai di masa lalu dan masih berlaku sekarang. Gunakan have known.',
          'Since untuk titik awal. Five years adalah durasi, jadi perlu for.',
          'Benar. Have known him for five years menghubungkan masa lalu dengan sekarang.',
          'Nose berarti hidung. Di sini perlu known, participle dari know.'
        ]
      },
      tr: {
        prompt: 'Onu beş yıldır tanıyorum',
        explanations: [
          'I know him for five years geçmişte başlayıp şimdi sürdüğünü iyi göstermez. Have known kullan.',
          'Since başlangıç noktası içindir. Five years bir süredir, bu yüzden for gerekir.',
          'Doğru. Have known him for five years geçmişi şimdiyle bağlar.',
          'Nose burun demektir. Burada know fiilinin participle biçimi olan known gerekir.'
        ]
      },
      pl: {
        prompt: 'Znam go od pięciu lat',
        explanations: [
          'I know him for five years nie pokazuje dobrze, że zaczęło się w przeszłości i trwa teraz. Użyj have known.',
          'Since jest dla punktu startu. Five years to okres, więc potrzebujemy for.',
          'Dobrze. Have known him for five years łączy przeszłość z teraźniejszością.',
          'Nose znaczy nos. Tutaj potrzebujesz known, imiesłowu od know.'
        ]
      }
    },
    '135': {
      'pt-BR': {
        prompt: 'Parei de fumar no ano passado',
        explanations: [
          'Depois de give up usamos -ing para a ação: give up smoking, não give up to smoke.',
          'Correto. Give up smoking significa abandonar o hábito de fumar.',
          'Give off significa emitir cheiro, fumaça ou luz. Para abandonar um hábito, precisamos de give up.',
          'Smocking é um tipo de costura ou franzido. Aqui precisamos de smoking.'
        ]
      },
      vi: {
        prompt: 'Tôi đã bỏ hút thuốc vào năm ngoái',
        explanations: [
          'Sau give up dùng -ing cho hành động: give up smoking, không phải give up to smoke.',
          'Đúng. Give up smoking nghĩa là bỏ thói quen hút thuốc.',
          'Give off nghĩa là tỏa mùi, khói hoặc ánh sáng. Để bỏ một thói quen, cần give up.',
          'Smocking là một kiểu may hoặc thêu. Ở đây cần smoking.'
        ]
      },
      id: {
        prompt: 'Saya berhenti merokok tahun lalu',
        explanations: [
          'Setelah give up gunakan -ing untuk aksinya: give up smoking, bukan give up to smoke.',
          'Benar. Give up smoking berarti berhenti dari kebiasaan merokok.',
          'Give off berarti mengeluarkan bau, asap, atau cahaya. Untuk meninggalkan kebiasaan, perlu give up.',
          'Smocking adalah jenis jahitan atau kerutan kain. Di sini perlu smoking.'
        ]
      },
      tr: {
        prompt: 'Geçen yıl sigarayı bıraktım',
        explanations: [
          'Give up sonrasında eylem için -ing kullanılır: give up smoking, give up to smoke değil.',
          'Doğru. Give up smoking sigara içme alışkanlığını bırakmak demektir.',
          'Give off koku, duman veya ışık yaymak demektir. Bir alışkanlığı bırakmak için give up gerekir.',
          'Smocking bir dikiş veya büzgü türüdür. Burada smoking gerekir.'
        ]
      },
      pl: {
        prompt: 'Rzuciłem palenie w zeszłym roku',
        explanations: [
          'Po give up używamy -ing dla czynności: give up smoking, nie give up to smoke.',
          'Dobrze. Give up smoking znaczy rzucić nawyk palenia.',
          'Give off znaczy wydzielać zapach, dym albo światło. Dla porzucenia nawyku potrzebujesz give up.',
          'Smocking to rodzaj szycia lub marszczenia materiału. Tutaj potrzebujesz smoking.'
        ]
      }
    },
    '136': {
      'pt-BR': {
        prompt: 'Se chover, vamos ficar em casa',
        explanations: [
          'No first conditional normalmente não usamos will na parte com if. Dizemos if it rains.',
          'Falta will na parte do resultado se falamos de uma decisão futura.',
          'Correto. If + present simple, will + verbo base para um resultado futuro realista.',
          'Homey significa caseiro ou acolhedor. Aqui precisamos de home.'
        ]
      },
      vi: {
        prompt: 'Nếu trời mưa, chúng tôi sẽ ở nhà',
        explanations: [
          'Trong first conditional, thường không dùng will ở mệnh đề if. Ta nói if it rains.',
          'Thiếu will ở phần kết quả nếu đang nói về quyết định trong tương lai.',
          'Đúng. If + present simple, will + động từ nguyên mẫu cho kết quả tương lai có thật.',
          'Homey nghĩa là ấm cúng/như ở nhà. Ở đây cần home.'
        ]
      },
      id: {
        prompt: 'Jika hujan, kami akan tinggal di rumah',
        explanations: [
          'Dalam first conditional, biasanya tidak memakai will di bagian if. Gunakan if it rains.',
          'Kurang will di bagian hasil jika membahas keputusan masa depan.',
          'Benar. If + present simple, will + kata kerja dasar untuk hasil masa depan yang realistis.',
          'Homey berarti terasa seperti rumah atau nyaman. Di sini perlu home.'
        ]
      },
      tr: {
        prompt: 'Yağmur yağarsa evde kalacağız',
        explanations: [
          'First conditional yapısında if bölümünde genelde will kullanılmaz. If it rains deriz.',
          'Gelecekteki sonuçtan söz ediyorsak sonuç bölümünde will eksik.',
          'Doğru. Gerçekçi gelecek sonucu için If + present simple, will + fiil kökü kullanılır.',
          'Homey ev gibi veya samimi demektir. Burada home gerekir.'
        ]
      },
      pl: {
        prompt: 'Jeśli będzie padać, zostaniemy w domu',
        explanations: [
          'W first conditional zwykle nie używamy will w części z if. Mówimy if it rains.',
          'Brakuje will w części z rezultatem, jeśli mówimy o przyszłej decyzji.',
          'Dobrze. If + present simple, will + czasownik podstawowy dla realnego przyszłego rezultatu.',
          'Homey znaczy domowy albo przytulny. Tutaj potrzebujesz home.'
        ]
      }
    },
    '137': {
      'pt-BR': {
        prompt: 'Quando eu era criança, eu nadava muito',
        explanations: [
          'Correto. Used to swim descreve um hábito do passado, especialmente claro com when I was a child.',
          'Am used to fala de estar acostumado agora e ainda pede -ing ou substantivo. Aqui não encaixa.',
          'Falta to depois de used. A estrutura é used to + verbo base.',
          'Slim significa emagrecer ou ser magro. Para nadar, precisamos de swim.'
        ]
      },
      vi: {
        prompt: 'Khi còn nhỏ, tôi thường bơi rất nhiều',
        explanations: [
          'Đúng. Used to swim mô tả thói quen quá khứ, rất rõ với when I was a child.',
          'Am used to nói về việc quen ở hiện tại và còn cần -ing hoặc danh từ. Ở đây không hợp.',
          'Thiếu to sau used. Cấu trúc là used to + động từ nguyên mẫu.',
          'Slim nghĩa là gầy hoặc trở nên gầy. Để nói bơi, cần swim.'
        ]
      },
      id: {
        prompt: 'Waktu kecil, saya dulu sering berenang',
        explanations: [
          'Benar. Used to swim menggambarkan kebiasaan masa lalu, terutama jelas dengan when I was a child.',
          'Am used to berarti terbiasa sekarang dan masih perlu -ing atau kata benda. Di sini tidak cocok.',
          'Kurang to setelah used. Strukturnya used to + kata kerja dasar.',
          'Slim berarti kurus atau menjadi kurus. Untuk berenang, perlu swim.'
        ]
      },
      tr: {
        prompt: 'Çocukken çok yüzerdim',
        explanations: [
          'Doğru. Used to swim geçmiş alışkanlığı anlatır; when I was a child bunu daha da netleştirir.',
          'Am used to şimdi alışkın olmayı anlatır ve -ing ya da isim ister. Burada uymaz.',
          'Used sonrasında to eksik. Yapı used to + fiil köküdür.',
          'Slim zayıflamak veya ince olmak demektir. Yüzmek için swim gerekir.'
        ]
      },
      pl: {
        prompt: 'Kiedy byłem dzieckiem, dużo pływałem',
        explanations: [
          'Dobrze. Used to swim opisuje dawny nawyk, szczególnie jasno z when I was a child.',
          'Am used to mówi o byciu przyzwyczajonym teraz i wymaga -ing albo rzeczownika. Tutaj nie pasuje.',
          'Brakuje to po used. Struktura to used to + podstawowa forma czasownika.',
          'Slim znaczy chudnąć albo być szczupłym. Do pływania potrzebujesz swim.'
        ]
      }
    },
    '138': {
      'pt-BR': {
        prompt: 'Esta é a pessoa que mora ao lado',
        explanations: [
          'Correto. Who conecta uma pessoa com a ação lives next door.',
          'Which costuma se referir a coisas ou animais. Para uma pessoa, aqui usamos who.',
          'Whose indica posse. Aqui não falamos de algo que pertence à pessoa.',
          'Parson significa pastor ou clérigo. Aqui precisamos de person.'
        ]
      },
      vi: {
        prompt: 'Đây là người sống nhà bên cạnh',
        explanations: [
          'Đúng. Who nối một người với hành động lives next door.',
          'Which thường nói về vật hoặc động vật. Với một người, ở đây dùng who.',
          'Whose chỉ sự sở hữu. Ở đây không nói về thứ gì thuộc về người đó.',
          'Parson nghĩa là mục sư hoặc giáo sĩ. Ở đây cần person.'
        ]
      },
      id: {
        prompt: 'Ini orang yang tinggal di sebelah',
        explanations: [
          'Benar. Who menghubungkan orang dengan aksi lives next door.',
          'Which biasanya merujuk pada benda atau hewan. Untuk orang, di sini gunakan who.',
          'Whose menunjukkan kepemilikan. Di sini tidak membahas sesuatu milik orang itu.',
          'Parson berarti pendeta. Di sini perlu person.'
        ]
      },
      tr: {
        prompt: 'Bu, yan tarafta yaşayan kişi',
        explanations: [
          'Doğru. Who bir kişiyi lives next door eylemiyle bağlar.',
          'Which genelde şeyler veya hayvanlar için kullanılır. Kişi için burada who kullanılır.',
          'Whose sahiplik gösterir. Burada kişiye ait bir şeyden bahsetmiyoruz.',
          'Parson din görevlisi demektir. Burada person gerekir.'
        ]
      },
      pl: {
        prompt: 'To osoba, która mieszka obok',
        explanations: [
          'Dobrze. Who łączy osobę z czynnością lives next door.',
          'Which zwykle odnosi się do rzeczy lub zwierząt. Dla osoby używamy tutaj who.',
          'Whose wskazuje posiadanie. Tutaj nie mówimy o czymś należącym do tej osoby.',
          'Parson znaczy duchowny. Tutaj potrzebujesz person.'
        ]
      }
    },
    '139': {
      'pt-BR': {
        prompt: 'Este livro foi escrito no século XIX',
        explanations: [
          'This book wrote soa como se o livro escrevesse algo. Precisamos de passiva.',
          'Correto. Was written é past simple passive: foi escrito.',
          'Rotten significa podre. Aqui precisamos de written.',
          'Na passiva precisamos do particípio: was written, não was write.'
        ]
      },
      vi: {
        prompt: 'Cuốn sách này được viết vào thế kỷ 19',
        explanations: [
          'This book wrote nghe như cuốn sách tự viết gì đó. Cần câu bị động.',
          'Đúng. Was written là past simple passive: đã được viết.',
          'Rotten nghĩa là thối rữa. Ở đây cần written.',
          'Trong câu bị động cần phân từ: was written, không phải was write.'
        ]
      },
      id: {
        prompt: 'Buku ini ditulis pada abad ke-19',
        explanations: [
          'This book wrote terdengar seolah buku itu menulis sesuatu. Perlu bentuk pasif.',
          'Benar. Was written adalah past simple passive: ditulis.',
          'Rotten berarti busuk. Di sini perlu written.',
          'Dalam pasif perlu participle: was written, bukan was write.'
        ]
      },
      tr: {
        prompt: 'Bu kitap 19. yüzyılda yazıldı',
        explanations: [
          'This book wrote kitap bir şey yazdı gibi duyulur. Pasif yapı gerekir.',
          'Doğru. Was written past simple passive yapısıdır: yazıldı.',
          'Rotten çürümüş demektir. Burada written gerekir.',
          'Pasifte participle gerekir: was written, was write değil.'
        ]
      },
      pl: {
        prompt: 'Ta książka została napisana w XIX wieku',
        explanations: [
          'This book wrote brzmi tak, jakby książka coś pisała. Potrzebujemy strony biernej.',
          'Dobrze. Was written to past simple passive: została napisana.',
          'Rotten znaczy zgniły. Tutaj potrzebujesz written.',
          'W stronie biernej potrzebny jest imiesłów: was written, nie was write.'
        ]
      }
    },
    '140': {
      'pt-BR': {
        prompt: 'Antes eu morava em Londres',
        explanations: [
          'Correto. Used to live fala de um estado ou hábito do passado que já não é igual.',
          'Am used to live mistura outra estrutura. Para estar acostumado seria used to living, mas aqui falamos do passado.',
          'Falta to depois de used. A forma é used to live.',
          'Leave significa ir embora ou deixar algo. Aqui precisamos de live: morar.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi từng sống ở London',
        explanations: [
          'Đúng. Used to live nói về trạng thái hoặc thói quen quá khứ, giờ không còn như vậy.',
          'Am used to live trộn cấu trúc khác. Nếu nói quen với điều gì, sẽ là used to living, nhưng ở đây nói về quá khứ.',
          'Thiếu to sau used. Dạng đúng là used to live.',
          'Leave nghĩa là rời đi hoặc để lại. Ở đây cần live: sống.'
        ]
      },
      id: {
        prompt: 'Dulu saya tinggal di London',
        explanations: [
          'Benar. Used to live membahas keadaan atau kebiasaan masa lalu yang sekarang tidak sama lagi.',
          'Am used to live mencampur struktur lain. Untuk terbiasa, bentuknya used to living, tetapi di sini membahas masa lalu.',
          'Kurang to setelah used. Bentuknya used to live.',
          'Leave berarti pergi atau meninggalkan sesuatu. Di sini perlu live: tinggal.'
        ]
      },
      tr: {
        prompt: 'Eskiden Londra\'da yaşardım',
        explanations: [
          'Doğru. Used to live artık aynı olmayan geçmiş bir durum veya alışkanlığı anlatır.',
          'Am used to live başka bir yapıyla karışır. Alışık olmak için used to living olurdu, ama burada geçmişten bahsediyoruz.',
          'Used sonrasında to eksik. Doğru biçim used to live.',
          'Leave ayrılmak veya bırakmak demektir. Burada live gerekir: yaşamak.'
        ]
      },
      pl: {
        prompt: 'Kiedyś mieszkałem w Londynie',
        explanations: [
          'Dobrze. Used to live mówi o dawnym stanie lub nawyku, który teraz nie jest już taki sam.',
          'Am used to live miesza inną strukturę. Dla przyzwyczajenia byłoby used to living, ale tutaj mówimy o przeszłości.',
          'Brakuje to po used. Forma to used to live.',
          'Leave znaczy wyjechać albo zostawić coś. Tutaj potrzebujesz live: mieszkać.'
        ]
      }
    },
    '141': {
      'pt-BR': {
        prompt: 'Esta é a pessoa cujo irmão é meu chefe',
        explanations: [
          'Correto. Whose mostra posse: o irmão pertence a essa pessoa.',
          'Who\'s significa who is ou who has. Não mostra posse; aqui precisamos de whose.',
          'Who não liga person + brother com sentido de posse. Precisamos de whose.',
          'Cheese significa queijo. Aqui precisamos de whose.'
        ]
      },
      vi: {
        prompt: 'Đây là người có anh trai là sếp của tôi',
        explanations: [
          'Đúng. Whose thể hiện sở hữu: người anh/em trai thuộc về người đó.',
          'Who\'s nghĩa là who is hoặc who has. Nó không thể hiện sở hữu; ở đây cần whose.',
          'Who không nối person + brother theo nghĩa sở hữu. Cần whose.',
          'Cheese nghĩa là phô mai. Ở đây cần whose.'
        ]
      },
      id: {
        prompt: 'Ini orang yang saudara laki-lakinya adalah bos saya',
        explanations: [
          'Benar. Whose menunjukkan kepemilikan: saudara laki-laki itu milik orang tersebut.',
          'Who\'s berarti who is atau who has. Itu tidak menunjukkan kepemilikan; di sini perlu whose.',
          'Who tidak bisa menghubungkan person + brother dengan makna kepemilikan. Perlu whose.',
          'Cheese berarti keju. Di sini perlu whose.'
        ]
      },
      tr: {
        prompt: 'Bu, kardeşi patronum olan kişi',
        explanations: [
          'Doğru. Whose sahiplik gösterir: kardeş o kişiye aittir.',
          'Who\'s, who is veya who has demektir. Sahiplik göstermez; burada whose gerekir.',
          'Who, person + brother yapısını sahiplik anlamıyla bağlayamaz. Whose gerekir.',
          'Cheese peynir demektir. Burada whose gerekir.'
        ]
      },
      pl: {
        prompt: 'To osoba, której brat jest moim szefem',
        explanations: [
          'Dobrze. Whose pokazuje posiadanie: brat należy do tej osoby.',
          'Who\'s znaczy who is albo who has. Nie pokazuje posiadania; tutaj potrzebujesz whose.',
          'Who nie połączy person + brother w znaczeniu posiadania. Potrzebujesz whose.',
          'Cheese znaczy ser. Tutaj potrzebujesz whose.'
        ]
      }
    },
    '142': {
      'pt-BR': {
        prompt: 'Eu me cortei enquanto preparava o jantar',
        explanations: [
          'Falta o processo. While I was cooking mostra que o jantar estava acontecendo quando você se cortou.',
          'Me não funciona quando sujeito e objeto são a mesma pessoa. Use myself.',
          'Correto. Cut myself + was cooking une um evento pontual a um processo no passado.',
          'Shelf significa prateleira. My shelf não é o mesmo que myself.'
        ]
      },
      vi: {
        prompt: 'Tôi bị đứt tay khi đang nấu bữa tối',
        explanations: [
          'Thiếu ý quá trình. While I was cooking cho thấy việc nấu ăn đang diễn ra khi bạn bị đứt tay.',
          'Me không dùng khi chủ ngữ và tân ngữ là cùng một người. Dùng myself.',
          'Đúng. Cut myself + was cooking nối một sự kiện ngắn với một quá trình trong quá khứ.',
          'Shelf nghĩa là cái kệ. My shelf không giống myself.'
        ]
      },
      id: {
        prompt: 'Saya teriris saat sedang memasak makan malam',
        explanations: [
          'Kurang nuansa proses. While I was cooking menunjukkan makan malam sedang dimasak saat kamu teriris.',
          'Me tidak cocok saat subjek dan objek orangnya sama. Gunakan myself.',
          'Benar. Cut myself + was cooking menggabungkan kejadian singkat dengan proses di masa lalu.',
          'Shelf berarti rak. My shelf tidak sama dengan myself.'
        ]
      },
      tr: {
        prompt: 'Akşam yemeği hazırlarken kendimi kestim',
        explanations: [
          'Süreç eksik. While I was cooking, kendini kestiğinde yemek yapma işinin sürdüğünü gösterir.',
          'Özne ve nesne aynı kişiyse me uygun değildir. Myself kullan.',
          'Doğru. Cut myself + was cooking kısa bir olayı geçmişte süren bir süreçle bağlar.',
          'Shelf raf demektir. My shelf, myself ile aynı değildir.'
        ]
      },
      pl: {
        prompt: 'Zaciąłem się, kiedy przygotowywałem kolację',
        explanations: [
          'Brakuje procesu. While I was cooking pokazuje, że gotowanie trwało, kiedy się zaciąłeś.',
          'Me nie działa, gdy podmiot i dopełnienie to ta sama osoba. Użyj myself.',
          'Dobrze. Cut myself + was cooking łączy punktowe wydarzenie z procesem w przeszłości.',
          'Shelf znaczy półka. My shelf to nie to samo co myself.'
        ]
      }
    },
    '143': {
      'pt-BR': {
        prompt: 'Não se esqueça de apagar a luz',
        explanations: [
          'Em uma ordem negativa usamos don\'t, não no antes do verbo.',
          'Falta to entre forget e turn off. A estrutura é don\'t forget to do something.',
          'Correto. Don\'t forget to turn off the light é um pedido claro e natural.',
          'Night significa noite. Aqui precisamos de light.'
        ]
      },
      vi: {
        prompt: 'Đừng quên tắt đèn',
        explanations: [
          'Trong mệnh lệnh phủ định dùng don\'t, không dùng no trước động từ.',
          'Thiếu to giữa forget và turn off. Cấu trúc là don\'t forget to do something.',
          'Đúng. Don\'t forget to turn off the light là lời nhắc rõ và tự nhiên.',
          'Night nghĩa là đêm. Ở đây cần light.'
        ]
      },
      id: {
        prompt: 'Jangan lupa mematikan lampu',
        explanations: [
          'Dalam perintah negatif gunakan don\'t, bukan no sebelum kata kerja.',
          'Kurang to antara forget dan turn off. Strukturnya don\'t forget to do something.',
          'Benar. Don\'t forget to turn off the light adalah permintaan yang jelas dan alami.',
          'Night berarti malam. Di sini perlu light.'
        ]
      },
      tr: {
        prompt: 'Işığı kapatmayı unutma',
        explanations: [
          'Olumsuz emirlerde fiilden önce no değil, don\'t kullanılır.',
          'Forget ile turn off arasında to eksik. Yapı don\'t forget to do something.',
          'Doğru. Don\'t forget to turn off the light açık ve doğal bir ricadır.',
          'Night gece demektir. Burada light gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie zapomnij wyłączyć światła',
        explanations: [
          'W negatywnym poleceniu używamy don\'t, nie no przed czasownikiem.',
          'Brakuje to między forget i turn off. Struktura to don\'t forget to do something.',
          'Dobrze. Don\'t forget to turn off the light to jasna i naturalna prośba.',
          'Night znaczy noc. Tutaj potrzebujesz light.'
        ]
      }
    },
    '144': {
      'pt-BR': {
        prompt: 'Eles mesmos fizeram isso',
        explanations: [
          'Com they precisamos da forma plural themselves, não themself.',
          'Theirselves não é a forma padrão esperada. A forma correta é themselves.',
          'Correto. Themselves mostra que fizeram sem ajuda.',
          'Shelves significa prateleiras. Aqui precisamos de themselves. Termo-chave em ingl?s: the shelves..'
        ]
      },
      vi: {
        prompt: 'Họ tự làm việc đó',
        explanations: [
          'Với they cần dạng số nhiều themselves, không phải themself.',
          'Theirselves không phải dạng chuẩn mong đợi. Dạng đúng là themselves.',
          'Đúng. Themselves cho thấy họ tự làm mà không có trợ giúp.',
          'Shelves nghĩa là những cái kệ. Ở đây cần themselves. Thu?t ng? ti?ng Anh c?n gi?: the shelves..'
        ]
      },
      id: {
        prompt: 'Mereka melakukannya sendiri',
        explanations: [
          'Dengan they, perlu bentuk jamak themselves, bukan themself.',
          'Theirselves bukan bentuk standar yang diharapkan. Bentuk yang benar adalah themselves.',
          'Benar. Themselves menunjukkan mereka melakukannya tanpa bantuan.',
          'Shelves berarti rak-rak. Di sini perlu themselves. Istilah Inggris yang perlu dipertahankan: the shelves..'
        ]
      },
      tr: {
        prompt: 'Bunu kendileri yaptılar',
        explanations: [
          'They ile çoğul biçim olan themselves gerekir, themself değil.',
          'Theirselves beklenen standart biçim değildir. Doğru biçim themselves.',
          'Doğru. Themselves bunu yardımsız yaptıklarını gösterir.',
          'Shelves raflar demektir. Burada themselves gerekir. Korunmas? gereken ?ngilizce terim: the shelves..'
        ]
      },
      pl: {
        prompt: 'Zrobili to sami',
        explanations: [
          'Z they potrzebujemy liczby mnogiej themselves, nie themself.',
          'Theirselves nie jest oczekiwaną standardową formą. Poprawna forma to themselves.',
          'Dobrze. Themselves pokazuje, że zrobili to bez pomocy.',
          'Shelves znaczy półki. Tutaj potrzebujesz themselves. Angielski termin do zachowania: the shelves..'
        ]
      }
    },
    '145': {
      'pt-BR': {
        prompt: 'Faz séculos que não o vejo',
        explanations: [
          'Didn\'t see him for ages não conecta tão claramente com o presente neste item.',
          'Correto. Haven\'t seen him for ages significa que até agora você não o viu.',
          'Since é para um ponto concreto de início. Ages é um período, então usamos for.',
          'Scene significa cena. Aqui precisamos de seen, o particípio de see.'
        ]
      },
      vi: {
        prompt: 'Lâu lắm rồi tôi không gặp anh ấy',
        explanations: [
          'Didn\'t see him for ages không nối rõ với hiện tại trong item này.',
          'Đúng. Haven\'t seen him for ages nghĩa là đến tận bây giờ bạn chưa gặp anh ấy.',
          'Since dùng cho điểm bắt đầu cụ thể. Ages là một khoảng thời gian, nên dùng for.',
          'Scene nghĩa là cảnh. Ở đây cần seen, phân từ của see.'
        ]
      },
      id: {
        prompt: 'Saya sudah lama sekali tidak melihatnya',
        explanations: [
          'Didn\'t see him for ages tidak begitu jelas terhubung dengan sekarang dalam item ini.',
          'Benar. Haven\'t seen him for ages berarti sampai sekarang kamu belum melihatnya.',
          'Since untuk titik awal yang konkret. Ages adalah periode, jadi gunakan for.',
          'Scene berarti adegan. Di sini perlu seen, participle dari see.'
        ]
      },
      tr: {
        prompt: 'Onu çok uzun zamandır görmedim',
        explanations: [
          'Didn\'t see him for ages bu soruda şimdiki zamanla bağlantıyı yeterince net vermez.',
          'Doğru. Haven\'t seen him for ages şimdiye kadar onu görmediğin anlamına gelir.',
          'Since belirli bir başlangıç noktası içindir. Ages bir süredir, bu yüzden for kullanılır.',
          'Scene sahne demektir. Burada see fiilinin participle biçimi olan seen gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie widziałem go od wieków',
        explanations: [
          'Didn\'t see him for ages w tym zadaniu nie łączy się tak jasno z teraźniejszością.',
          'Dobrze. Haven\'t seen him for ages znaczy, że do teraz go nie widziałeś.',
          'Since jest dla konkretnego punktu startu. Ages to okres, więc używamy for.',
          'Scene znaczy scena. Tutaj potrzebujesz seen, imiesłowu od see.'
        ]
      }
    },
    '146': {
      'pt-BR': {
        prompt: 'Não suporto lavar a louça',
        explanations: [
          'Hate wash não funciona: falta -ing ou to + verbo. Este item pratica hate + -ing.',
          'Correto. Hate washing fala de uma atividade que você não suporta.',
          'Wishing significa desejar. Para lavar pratos, precisamos de washing.',
          'Não misturamos to com -ing aqui. Diga hate washing, não hate to washing.'
        ]
      },
      vi: {
        prompt: 'Tôi ghét rửa bát',
        explanations: [
          'Hate wash không đúng: thiếu -ing hoặc to + động từ. Item này luyện hate + -ing.',
          'Đúng. Hate washing nói về một hoạt động bạn không chịu nổi.',
          'Wishing nghĩa là ước/ao ước. Để rửa bát, cần washing.',
          'Ở đây không trộn to với -ing. Nói hate washing, không phải hate to washing.'
        ]
      },
      id: {
        prompt: 'Saya benci mencuci piring',
        explanations: [
          'Hate wash tidak benar: kurang -ing atau to + kata kerja. Item ini melatih hate + -ing.',
          'Benar. Hate washing membahas aktivitas yang tidak kamu sukai.',
          'Wishing berarti berharap. Untuk mencuci piring, perlu washing.',
          'Jangan campur to dengan -ing di sini. Ucapkan hate washing, bukan hate to washing.'
        ]
      },
      tr: {
        prompt: 'Bulaşık yıkamaktan nefret ediyorum',
        explanations: [
          'Hate wash çalışmaz: -ing veya to + fiil eksik. Bu soru hate + -ing yapısını çalıştırıyor.',
          'Doğru. Hate washing dayanamadığın bir etkinliği anlatır.',
          'Wishing dilemek demektir. Bulaşık yıkamak için washing gerekir.',
          'Burada to ile -ing karıştırılmaz. Hate washing de, hate to washing değil.'
        ]
      },
      pl: {
        prompt: 'Nie znoszę zmywać naczyń',
        explanations: [
          'Hate wash nie działa: brakuje -ing albo to + czasownik. To zadanie ćwiczy hate + -ing.',
          'Dobrze. Hate washing mówi o czynności, której nie znosisz.',
          'Wishing znaczy życzenie albo pragnienie. Do mycia naczyń potrzebujesz washing.',
          'Nie mieszamy tutaj to z -ing. Powiedz hate washing, nie hate to washing.'
        ]
      }
    },
    '147': {
      'pt-BR': {
        prompt: 'Se eu o vir, vou te contar',
        explanations: [
          'No first conditional não usamos will na parte com if. Diga If I see him.',
          'Correto. If I see him, I will tell you usa presente depois de if e will no resultado.',
          'Tall significa alto. Aqui precisamos de tell: dizer ou contar.',
          'Seeing não encaixa logo depois de if nesta estrutura. Use see.'
        ]
      },
      vi: {
        prompt: 'Nếu tôi gặp anh ấy, tôi sẽ nói với bạn',
        explanations: [
          'Trong first conditional không dùng will ở mệnh đề if. Hãy nói If I see him.',
          'Đúng. If I see him, I will tell you dùng hiện tại sau if và will ở kết quả.',
          'Tall nghĩa là cao. Ở đây cần tell: nói hoặc kể.',
          'Seeing không hợp ngay sau if trong cấu trúc này. Dùng see.'
        ]
      },
      id: {
        prompt: 'Jika saya melihatnya, saya akan memberitahumu',
        explanations: [
          'Dalam first conditional, jangan pakai will di bagian if. Katakan If I see him.',
          'Benar. If I see him, I will tell you memakai present setelah if dan will pada hasilnya.',
          'Tall berarti tinggi. Di sini perlu tell: memberi tahu.',
          'Seeing tidak cocok langsung setelah if dalam struktur ini. Gunakan see.'
        ]
      },
      tr: {
        prompt: 'Onu görürsem sana söylerim',
        explanations: [
          'First conditional yapısında if bölümünde will kullanmayız. If I see him de.',
          'Doğru. If I see him, I will tell you if sonrasında present, sonuçta will kullanır.',
          'Tall uzun boylu demektir. Burada tell gerekir: söylemek.',
          'Seeing bu yapıda if sonrasında doğrudan uymaz. See kullan.'
        ]
      },
      pl: {
        prompt: 'Jeśli go zobaczę, powiem ci',
        explanations: [
          'W first conditional nie używamy will w części z if. Powiedz If I see him.',
          'Dobrze. If I see him, I will tell you używa czasu teraźniejszego po if i will w rezultacie.',
          'Tall znaczy wysoki. Tutaj potrzebujesz tell: powiedzieć.',
          'Seeing nie pasuje bezpośrednio po if w tej strukturze. Użyj see.'
        ]
      }
    },
    '148': {
      'pt-BR': {
        prompt: 'Antes eu lia muito, mas agora não',
        explanations: [
          'Am used to read muda a ideia: parece falar de estar acostumado agora. Para hábito antigo usamos used to.',
          'Correto. Used to read a lot fala de uma antiga rotina que já não é igual.',
          'Was used to read soa como passiva ou outra estrutura. Aqui precisamos só de used to read.',
          'Red significa vermelho. Para ler, precisamos de read.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi đọc rất nhiều, nhưng bây giờ thì không',
        explanations: [
          'Am used to read đổi ý nghĩa: nghe như quen đọc ở hiện tại. Với thói quen cũ, dùng used to.',
          'Đúng. Used to read a lot nói về thói quen cũ, giờ không còn như vậy.',
          'Was used to read nghe như bị động hoặc cấu trúc khác. Ở đây chỉ cần used to read.',
          'Red nghĩa là màu đỏ. Để nói đọc, cần read.'
        ]
      },
      id: {
        prompt: 'Dulu saya banyak membaca, tetapi sekarang tidak',
        explanations: [
          'Am used to read mengubah ide: terdengar seperti terbiasa sekarang. Untuk kebiasaan lama, gunakan used to.',
          'Benar. Used to read a lot membahas kebiasaan lama yang sekarang tidak sama lagi.',
          'Was used to read terdengar seperti pasif atau struktur lain. Di sini hanya perlu used to read.',
          'Red berarti merah. Untuk membaca, perlu read.'
        ]
      },
      tr: {
        prompt: 'Eskiden çok okurdum, ama artık okumuyorum',
        explanations: [
          'Am used to read anlamı değiştirir: şu anda alışkın olmak gibi duyulur. Eski alışkanlık için used to kullanılır.',
          'Doğru. Used to read a lot artık aynı olmayan eski bir alışkanlığı anlatır.',
          'Was used to read pasif veya başka bir yapı gibi duyulur. Burada sadece used to read gerekir.',
          'Red kırmızı demektir. Okumak için read gerekir.'
        ]
      },
      pl: {
        prompt: 'Kiedyś dużo czytałem, ale teraz nie',
        explanations: [
          'Am used to read zmienia sens: brzmi jak przyzwyczajenie teraz. Dla dawnego nawyku używamy used to.',
          'Dobrze. Used to read a lot mówi o dawnym nawyku, który teraz nie jest już taki sam.',
          'Was used to read brzmi jak strona bierna albo inna struktura. Tutaj potrzebujesz tylko used to read.',
          'Red znaczy czerwony. Do czytania potrzebujesz read.'
        ]
      }
    },
    '149': {
      'pt-BR': {
        prompt: 'Se chover, vou ficar em casa',
        explanations: [
          'No first conditional não colocamos will na parte com if. Além disso, com it precisamos de rains.',
          'Correto. If it rains, I will stay at home usa presente depois de if e will no resultado.',
          'Horse significa cavalo. Aqui precisamos de home.',
          'Com it no presente simples precisamos de rains, não rain.'
        ]
      },
      vi: {
        prompt: 'Nếu trời mưa, tôi sẽ ở nhà',
        explanations: [
          'Trong first conditional không dùng will ở mệnh đề if. Ngoài ra với it cần rains.',
          'Đúng. If it rains, I will stay at home dùng hiện tại sau if và will ở kết quả.',
          'Horse nghĩa là con ngựa. Ở đây cần home.',
          'Với it ở present simple cần rains, không phải rain.'
        ]
      },
      id: {
        prompt: 'Jika hujan, saya akan tinggal di rumah',
        explanations: [
          'Dalam first conditional, jangan pakai will di bagian if. Selain itu, dengan it perlu rains.',
          'Benar. If it rains, I will stay at home memakai present setelah if dan will pada hasilnya.',
          'Horse berarti kuda. Di sini perlu home.',
          'Dengan it dalam present simple, perlu rains, bukan rain.'
        ]
      },
      tr: {
        prompt: 'Yağmur yağarsa evde kalırım',
        explanations: [
          'First conditional yapısında if bölümünde will kullanmayız. Ayrıca it ile rains gerekir.',
          'Doğru. If it rains, I will stay at home if sonrasında present, sonuçta will kullanır.',
          'Horse at demektir. Burada home gerekir.',
          'It ile present simple içinde rains gerekir, rain değil.'
        ]
      },
      pl: {
        prompt: 'Jeśli będzie padać, zostanę w domu',
        explanations: [
          'W first conditional nie używamy will w części z if. Dodatkowo z it potrzebujemy rains.',
          'Dobrze. If it rains, I will stay at home używa czasu teraźniejszego po if i will w rezultacie.',
          'Horse znaczy koń. Tutaj potrzebujesz home.',
          'Z it w present simple potrzebujemy rains, nie rain.'
        ]
      }
    },
    '150': {
      'pt-BR': {
        prompt: 'Não vejo ninguém aqui',
        explanations: [
          'Don\'t já contém a negação. Com nobody vira dupla negação no inglês padrão.',
          'Nothing significa nada, mas aqui falamos de pessoas. Além disso, continua o problema de dupla negação.',
          'Correto. Em uma frase negativa, anyone funciona para falar de nenhuma pessoa.',
          'Sea significa mar. Aqui precisamos de see: ver.'
        ]
      },
      vi: {
        prompt: 'Tôi không thấy ai ở đây',
        explanations: [
          'Don\'t đã chứa phủ định. Với nobody sẽ thành phủ định kép trong tiếng Anh chuẩn.',
          'Nothing nghĩa là không có gì, nhưng ở đây nói về người. Ngoài ra vẫn có vấn đề phủ định kép.',
          'Đúng. Trong câu phủ định, anyone phù hợp để nói không có người nào.',
          'Sea nghĩa là biển. Ở đây cần see: nhìn thấy.'
        ]
      },
      id: {
        prompt: 'Saya tidak melihat siapa pun di sini',
        explanations: [
          'Don\'t sudah berisi negasi. Dengan nobody, itu menjadi negatif ganda dalam bahasa Inggris standar.',
          'Nothing berarti tidak ada benda, tetapi di sini membahas orang. Selain itu masih ada masalah negatif ganda.',
          'Benar. Dalam kalimat negatif, anyone cocok untuk menyebut tidak ada orang.',
          'Sea berarti laut. Di sini perlu see: melihat.'
        ]
      },
      tr: {
        prompt: 'Burada kimseyi görmüyorum',
        explanations: [
          'Don\'t zaten olumsuzluk taşır. Nobody ile standart İngilizcede çift olumsuzluk olur.',
          'Nothing hiçbir şey demektir, ama burada kişilerden bahsediyoruz. Ayrıca çift olumsuzluk sorunu devam eder.',
          'Doğru. Olumsuz cümlede anyone hiç kimse anlamı için uygundur.',
          'Sea deniz demektir. Burada see gerekir: görmek.'
        ]
      },
      pl: {
        prompt: 'Nie widzę tu nikogo',
        explanations: [
          'Don\'t już zawiera przeczenie. Z nobody powstaje podwójne przeczenie w standardowym angielskim.',
          'Nothing znaczy nic, ale tutaj mówimy o ludziach. Poza tym nadal jest problem podwójnego przeczenia.',
          'Dobrze. W zdaniu przeczącym anyone pasuje do znaczenia żadnej osoby.',
          'Sea znaczy morze. Tutaj potrzebujesz see: widzieć.'
        ]
      }
    },
    '151': {
      'pt-BR': {
        prompt: 'Odeio lavar a louça',
        explanations: [
          'Hate wash não funciona: falta -ing ou to + verbo. Este item pratica hate + -ing.',
          'Correto. Hate washing fala de uma atividade que você não gosta de fazer.',
          'Wishing significa desejar. Para lavar pratos, precisamos de washing.',
          'Não misturamos to com -ing aqui. Diga hate washing, não hate to washing.'
        ]
      },
      vi: {
        prompt: 'Tôi ghét rửa bát',
        explanations: [
          'Hate wash không đúng: thiếu -ing hoặc to + động từ. Item này luyện hate + -ing.',
          'Đúng. Hate washing nói về một hoạt động bạn không thích làm.',
          'Wishing nghĩa là ước. Để nói rửa bát, cần washing.',
          'Ở đây không trộn to với -ing. Nói hate washing, không phải hate to washing.'
        ]
      },
      id: {
        prompt: 'Saya benci mencuci piring',
        explanations: [
          'Hate wash tidak benar: kurang -ing atau to + kata kerja. Item ini melatih hate + -ing.',
          'Benar. Hate washing membahas aktivitas yang tidak kamu sukai.',
          'Wishing berarti berharap. Untuk mencuci piring, perlu washing.',
          'Jangan campur to dengan -ing di sini. Ucapkan hate washing, bukan hate to washing.'
        ]
      },
      tr: {
        prompt: 'Bulaşık yıkamaktan nefret ediyorum',
        explanations: [
          'Hate wash çalışmaz: -ing veya to + fiil eksik. Bu soru hate + -ing yapısını çalıştırıyor.',
          'Doğru. Hate washing yapmayı sevmediğin bir etkinliği anlatır.',
          'Wishing dilemek demektir. Bulaşık yıkamak için washing gerekir.',
          'Burada to ile -ing karıştırılmaz. Hate washing de, hate to washing değil.'
        ]
      },
      pl: {
        prompt: 'Nienawidzę zmywać naczyń',
        explanations: [
          'Hate wash nie działa: brakuje -ing albo to + czasownik. To zadanie ćwiczy hate + -ing.',
          'Dobrze. Hate washing mówi o czynności, której nie lubisz robić.',
          'Wishing znaczy życzenie albo pragnienie. Do mycia naczyń potrzebujesz washing.',
          'Nie mieszamy tutaj to z -ing. Powiedz hate washing, nie hate to washing.'
        ]
      }
    },
    '152': {
      'pt-BR': {
        prompt: 'Cortaram meu cabelo ontem',
        explanations: [
          'I cut my hair soa como se você mesmo tivesse cortado o cabelo. Aqui falamos de um serviço.',
          'Cat significa gato. Aqui precisamos de cut.',
          'Correto. I had my hair cut significa que alguém cortou seu cabelo.',
          'Cut não muda no particípio. Não dizemos cutted.'
        ]
      },
      vi: {
        prompt: 'Hôm qua tôi đã đi cắt tóc',
        explanations: [
          'I cut my hair nghe như bạn tự cắt tóc cho mình. Ở đây nói về một dịch vụ.',
          'Cat nghĩa là con mèo. Ở đây cần cut.',
          'Đúng. I had my hair cut nghĩa là ai đó đã cắt tóc cho bạn.',
          'Cut không đổi ở phân từ. Không nói cutted.'
        ]
      },
      id: {
        prompt: 'Rambut saya dipotong kemarin',
        explanations: [
          'I cut my hair terdengar seolah kamu memotong rambut sendiri. Di sini kita membahas layanan.',
          'Cat berarti kucing. Di sini perlu cut.',
          'Benar. I had my hair cut berarti seseorang memotong rambutmu.',
          'Cut tidak berubah dalam participle. Kita tidak mengatakan cutted.'
        ]
      },
      tr: {
        prompt: 'Dün saçımı kestirdim',
        explanations: [
          'I cut my hair saçı kendin kesmişsin gibi duyulur. Burada bir hizmetten bahsediyoruz.',
          'Cat kedi demektir. Burada cut gerekir.',
          'Doğru. I had my hair cut saçını birinin kestiği anlamına gelir.',
          'Cut participle biçiminde değişmez. Cutted demeyiz.'
        ]
      },
      pl: {
        prompt: 'Wczoraj obcięto mi włosy',
        explanations: [
          'I cut my hair brzmi tak, jakbyś sam obciął sobie włosy. Tutaj chodzi o usługę.',
          'Cat znaczy kot. Tutaj potrzebujesz cut.',
          'Dobrze. I had my hair cut znaczy, że ktoś obciął ci włosy.',
          'Cut nie zmienia się jako imiesłów. Nie mówimy cutted.'
        ]
      }
    },
    '153': {
      'pt-BR': {
        prompt: 'Ele me disse para esperar',
        explanations: [
          'Falta to antes de wait. A estrutura é told me to wait.',
          'Correto. Told me to wait transmite uma ordem ou pedido indireto.',
          'Said não leva me diretamente nesta estrutura. Use told me.',
          'Weight significa peso ou pesar. Aqui precisamos de wait: esperar.'
        ]
      },
      vi: {
        prompt: 'Anh ấy bảo tôi đợi',
        explanations: [
          'Thiếu to trước wait. Cấu trúc là told me to wait.',
          'Đúng. Told me to wait truyền đạt một mệnh lệnh hoặc lời yêu cầu gián tiếp.',
          'Said không đi trực tiếp với me trong cấu trúc này. Dùng told me.',
          'Weight nghĩa là cân nặng hoặc cân. Ở đây cần wait: chờ.'
        ]
      },
      id: {
        prompt: 'Dia menyuruh saya menunggu',
        explanations: [
          'Kurang to sebelum wait. Strukturnya told me to wait.',
          'Benar. Told me to wait menyampaikan perintah atau permintaan tidak langsung.',
          'Said tidak langsung diikuti me dalam struktur ini. Gunakan told me.',
          'Weight berarti berat atau menimbang. Di sini perlu wait: menunggu.'
        ]
      },
      tr: {
        prompt: 'Bana beklememi söyledi',
        explanations: [
          'Wait öncesinde to eksik. Yapı told me to wait.',
          'Doğru. Told me to wait dolaylı bir emir veya rica aktarır.',
          'Said bu yapıda doğrudan me almaz. Told me kullan.',
          'Weight ağırlık veya tartmak demektir. Burada wait gerekir: beklemek.'
        ]
      },
      pl: {
        prompt: 'Powiedział mi, żebym poczekał',
        explanations: [
          'Brakuje to przed wait. Struktura to told me to wait.',
          'Dobrze. Told me to wait przekazuje pośrednio polecenie albo prośbę.',
          'Said nie łączy się bezpośrednio z me w tej strukturze. Użyj told me.',
          'Weight znaczy waga albo ważyć. Tutaj potrzebujesz wait: czekać.'
        ]
      }
    },
    '154': {
      'pt-BR': {
        prompt: 'Estou no trabalho',
        explanations: [
          'In work não é a combinação normal para dizer que você está trabalhando ou no local de trabalho.',
          'On work copia outra lógica. A expressão fixa é at work.',
          'Correto. At work significa no trabalho.',
          'Walk significa caminhada ou caminhar. Aqui precisamos de work.'
        ]
      },
      vi: {
        prompt: 'Tôi đang ở chỗ làm',
        explanations: [
          'In work không phải cách kết hợp bình thường để nói bạn đang ở nơi làm việc.',
          'On work sao chép logic khác. Cụm cố định là at work.',
          'Đúng. At work nghĩa là ở nơi làm việc.',
          'Walk nghĩa là đi bộ hoặc cuộc đi bộ. Ở đây cần work.'
        ]
      },
      id: {
        prompt: 'Saya sedang di tempat kerja',
        explanations: [
          'In work bukan kombinasi normal untuk mengatakan sedang bekerja atau berada di tempat kerja.',
          'On work menyalin logika lain. Ungkapan tetapnya adalah at work.',
          'Benar. At work berarti di tempat kerja.',
          'Walk berarti jalan kaki atau berjalan. Di sini perlu work.'
        ]
      },
      tr: {
        prompt: 'İşteyim',
        explanations: [
          'In work işteyim veya çalışıyorum demek için normal birleşim değildir.',
          'On work başka bir mantığı kopyalar. Sabit ifade at work.',
          'Doğru. At work işte demektir.',
          'Walk yürüyüş veya yürümek demektir. Burada work gerekir.'
        ]
      },
      pl: {
        prompt: 'Jestem w pracy',
        explanations: [
          'In work nie jest normalnym połączeniem dla znaczenia, że jesteś w pracy.',
          'On work kopiuje inną logikę. Stałe wyrażenie to at work.',
          'Dobrze. At work znaczy w pracy.',
          'Walk znaczy spacer albo chodzić. Tutaj potrzebujesz work.'
        ]
      }
    },
    '155': {
      'pt-BR': {
        prompt: 'Eu estava assistindo TV quando o telefone tocou',
        explanations: [
          'Watched TV pode soar como ação completa ou sequência. Aqui precisamos do processo: was watching.',
          'Correto. Was watching mostra a ação em andamento, e rang a interrupção.',
          'Washing significa lavar. Aqui precisamos de watching: assistir TV.',
          'O passado de ring é rang, não ringed.'
        ]
      },
      vi: {
        prompt: 'Tôi đang xem TV thì điện thoại reo',
        explanations: [
          'Watched TV có thể nghe như hành động hoàn tất hoặc nối tiếp. Ở đây cần quá trình: was watching.',
          'Đúng. Was watching cho thấy hành động đang diễn ra, và rang là sự gián đoạn.',
          'Washing nghĩa là rửa. Ở đây cần watching: xem TV.',
          'Quá khứ của ring là rang, không phải ringed.'
        ]
      },
      id: {
        prompt: 'Saya sedang menonton TV ketika telepon berdering',
        explanations: [
          'Watched TV bisa terdengar seperti aksi selesai atau urutan. Di sini perlu proses: was watching.',
          'Benar. Was watching menunjukkan aksi sedang berlangsung, dan rang adalah gangguannya.',
          'Washing berarti mencuci. Di sini perlu watching: menonton TV.',
          'Past tense dari ring adalah rang, bukan ringed.'
        ]
      },
      tr: {
        prompt: 'Telefon çaldığında televizyon izliyordum',
        explanations: [
          'Watched TV tamamlanmış eylem veya sıra gibi duyulabilir. Burada süreç gerekir: was watching.',
          'Doğru. Was watching devam eden eylemi, rang ise kesintiyi gösterir.',
          'Washing yıkamak demektir. Burada watching gerekir: TV izlemek.',
          'Ring fiilinin geçmişi rang olur, ringed değil.'
        ]
      },
      pl: {
        prompt: 'Oglądałem telewizję, kiedy zadzwonił telefon',
        explanations: [
          'Watched TV może brzmieć jak zakończona czynność albo sekwencja. Tutaj potrzebny jest proces: was watching.',
          'Dobrze. Was watching pokazuje czynność w toku, a rang przerwanie.',
          'Washing znaczy mycie. Tutaj potrzebujesz watching: oglądanie telewizji.',
          'Czas przeszły od ring to rang, nie ringed.'
        ]
      }
    },
    '156': {
      'pt-BR': {
        prompt: 'Este é o filme de que eu gosto muito',
        explanations: [
          'Who usamos para pessoas. Movie é uma coisa, então aqui não encaixa.',
          'What não funciona como relativo depois de movie nesta frase. Precisamos de that ou which.',
          'Correto. That conecta movie com I really like de forma natural.',
          'Moving significa movimento, mudança ou comovente. Aqui precisamos de movie.'
        ]
      },
      vi: {
        prompt: 'Đây là bộ phim mà tôi rất thích',
        explanations: [
          'Who dùng cho người. Movie là một vật, nên ở đây không hợp.',
          'What không dùng như đại từ quan hệ sau movie trong câu này. Cần that hoặc which.',
          'Đúng. That nối movie với I really like một cách tự nhiên.',
          'Moving nghĩa là sự di chuyển, chuyển nhà hoặc cảm động. Ở đây cần movie.'
        ]
      },
      id: {
        prompt: 'Ini film yang sangat saya suka',
        explanations: [
          'Who dipakai untuk orang. Movie adalah benda, jadi tidak cocok di sini.',
          'What tidak berfungsi sebagai relative setelah movie dalam kalimat ini. Perlu that atau which.',
          'Benar. That menghubungkan movie dengan I really like secara alami.',
          'Moving berarti gerakan, pindahan, atau menyentuh hati. Di sini perlu movie.'
        ]
      },
      tr: {
        prompt: 'Bu, gerçekten sevdiğim film',
        explanations: [
          'Who kişiler için kullanılır. Movie bir şeydir, bu yüzden burada uymaz.',
          'What bu cümlede movie sonrasında relative olarak çalışmaz. That veya which gerekir.',
          'Doğru. That, movie ile I really like bölümünü doğal şekilde bağlar.',
          'Moving hareket, taşınma veya duygulandırıcı demektir. Burada movie gerekir.'
        ]
      },
      pl: {
        prompt: 'To film, który bardzo lubię',
        explanations: [
          'Who używamy dla osób. Movie to rzecz, więc tutaj nie pasuje.',
          'What nie działa jako zaimek względny po movie w tym zdaniu. Potrzebujemy that albo which.',
          'Dobrze. That naturalnie łączy movie z I really like.',
          'Moving znaczy ruch, przeprowadzka albo wzruszający. Tutaj potrzebujesz movie.'
        ]
      }
    },
    '157': {
      'pt-BR': {
        prompt: 'Eu o conheço desde a infância',
        explanations: [
          'Com since e uma relação que continua até agora, precisamos de present perfect: have known.',
          'For é para duração. Childhood funciona como ponto de início, então usamos since.',
          'Correto. Have known him since childhood conecta o passado com o presente.',
          'None significa nenhum ou nada. Aqui precisamos de known, particípio de know. Termo-chave em ingl?s: none him since childhood; have none him since; I have none him..'
        ]
      },
      vi: {
        prompt: 'Tôi biết anh ấy từ thời thơ ấu',
        explanations: [
          'Với since và một mối quan hệ vẫn tiếp tục đến hiện tại, cần present perfect: have known.',
          'For dùng cho khoảng thời gian. Childhood là điểm bắt đầu, nên dùng since.',
          'Đúng. Have known him since childhood nối quá khứ với hiện tại.',
          'None nghĩa là không có gì/không ai. Ở đây cần known, phân từ của know. Thu?t ng? ti?ng Anh c?n gi?: none him since childhood; have none him since; I have none him..'
        ]
      },
      id: {
        prompt: 'Saya mengenalnya sejak kecil',
        explanations: [
          'Dengan since dan hubungan yang masih berlangsung sampai sekarang, perlu present perfect: have known.',
          'For untuk durasi. Childhood berfungsi sebagai titik awal, jadi gunakan since.',
          'Benar. Have known him since childhood menghubungkan masa lalu dengan sekarang.',
          'None berarti tidak ada. Di sini perlu known, participle dari know. Istilah Inggris yang perlu dipertahankan: none him since childhood; have none him since; I have none him..'
        ]
      },
      tr: {
        prompt: 'Onu çocukluğumdan beri tanıyorum',
        explanations: [
          'Since ve şimdiye kadar süren bir ilişki varsa present perfect gerekir: have known.',
          'For süre içindir. Childhood başlangıç noktası gibi çalışır, bu yüzden since kullanılır.',
          'Doğru. Have known him since childhood geçmişi şimdiyle bağlar.',
          'None hiçbiri veya yok demektir. Burada know fiilinin participle biçimi known gerekir. Korunmas? gereken ?ngilizce terim: none him since childhood; have none him since; I have none him..'
        ]
      },
      pl: {
        prompt: 'Znam go od dzieciństwa',
        explanations: [
          'Z since i relacją trwającą do teraz potrzebujemy present perfect: have known.',
          'For jest dla okresu trwania. Childhood działa jak punkt startu, więc używamy since.',
          'Dobrze. Have known him since childhood łączy przeszłość z teraźniejszością.',
          'None znaczy żaden albo nic. Tutaj potrzebujesz known, imiesłowu od know. Angielski termin do zachowania: none him since childhood; have none him since; I have none him..'
        ]
      }
    },
    '158': {
      'pt-BR': {
        prompt: 'Antes eu fumava muito, mas agora não',
        explanations: [
          'Correto. Used to smoke fala de um hábito do passado que já não é igual.',
          'Am used to smoke soa como estar acostumado agora. Aqui falamos do passado.',
          'Was used to smoke soa como passiva ou outra estrutura. Para hábito antigo, basta used to smoke.',
          'Small talk significa conversa informal. Aqui precisamos de smoke.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi hút thuốc rất nhiều, nhưng bây giờ thì không',
        explanations: [
          'Đúng. Used to smoke nói về thói quen quá khứ, giờ không còn như vậy.',
          'Am used to smoke nghe như quen hút thuốc ở hiện tại. Ở đây nói về quá khứ.',
          'Was used to smoke nghe như bị động hoặc cấu trúc khác. Với thói quen cũ, chỉ cần used to smoke.',
          'Small talk nghĩa là nói chuyện xã giao. Ở đây cần smoke.'
        ]
      },
      id: {
        prompt: 'Dulu saya banyak merokok, tetapi sekarang tidak',
        explanations: [
          'Benar. Used to smoke membahas kebiasaan masa lalu yang sekarang tidak sama lagi.',
          'Am used to smoke terdengar seperti terbiasa sekarang. Di sini membahas masa lalu.',
          'Was used to smoke terdengar seperti pasif atau struktur lain. Untuk kebiasaan lama, cukup used to smoke.',
          'Small talk berarti obrolan ringan. Di sini perlu smoke.'
        ]
      },
      tr: {
        prompt: 'Eskiden çok sigara içerdim, ama artık içmiyorum',
        explanations: [
          'Doğru. Used to smoke artık aynı olmayan geçmiş bir alışkanlığı anlatır.',
          'Am used to smoke şu anda alışkın olmak gibi duyulur. Burada geçmişten bahsediyoruz.',
          'Was used to smoke pasif veya başka bir yapı gibi duyulur. Eski alışkanlık için used to smoke yeterlidir.',
          'Small talk gündelik sohbet demektir. Burada smoke gerekir.'
        ]
      },
      pl: {
        prompt: 'Kiedyś dużo paliłem, ale teraz nie',
        explanations: [
          'Dobrze. Used to smoke mówi o dawnym nawyku, który teraz nie jest już taki sam.',
          'Am used to smoke brzmi jak przyzwyczajenie teraz. Tutaj mówimy o przeszłości.',
          'Was used to smoke brzmi jak strona bierna albo inna struktura. Dla dawnego nawyku wystarczy used to smoke.',
          'Small talk znaczy luźna rozmowa. Tutaj potrzebujesz smoke.'
        ]
      }
    },
    '159': {
      'pt-BR': {
        prompt: 'Estou aqui há duas horas',
        explanations: [
          'I am here não mostra bem que começou antes e continua agora. Precisamos de have been.',
          'Since é para um ponto de início. Two hours é duração, então usamos for.',
          'Correto. Have been here for two hours conecta o passado com o presente.',
          'Bean significa feijão. Aqui precisamos de been.'
        ]
      },
      vi: {
        prompt: 'Tôi đã ở đây được hai tiếng rồi',
        explanations: [
          'I am here không thể hiện rõ việc bắt đầu trước đó và vẫn tiếp tục. Cần have been.',
          'Since dùng cho điểm bắt đầu. Two hours là khoảng thời gian, nên dùng for.',
          'Đúng. Have been here for two hours nối quá khứ với hiện tại.',
          'Bean nghĩa là hạt đậu. Ở đây cần been.'
        ]
      },
      id: {
        prompt: 'Saya sudah di sini selama dua jam',
        explanations: [
          'I am here tidak jelas menunjukkan mulai sebelumnya dan masih berlangsung sekarang. Perlu have been.',
          'Since untuk titik awal. Two hours adalah durasi, jadi gunakan for.',
          'Benar. Have been here for two hours menghubungkan masa lalu dengan sekarang.',
          'Bean berarti kacang. Di sini perlu been.'
        ]
      },
      tr: {
        prompt: 'İki saattir buradayım',
        explanations: [
          'I am here önce başlayıp şimdi sürdüğünü iyi göstermez. Have been gerekir.',
          'Since başlangıç noktası içindir. Two hours bir süredir, bu yüzden for kullanılır.',
          'Doğru. Have been here for two hours geçmişi şimdiyle bağlar.',
          'Bean fasulye demektir. Burada been gerekir.'
        ]
      },
      pl: {
        prompt: 'Jestem tu od dwóch godzin',
        explanations: [
          'I am here nie pokazuje dobrze, że zaczęło się wcześniej i trwa teraz. Potrzebujemy have been.',
          'Since jest dla punktu startu. Two hours to okres trwania, więc używamy for.',
          'Dobrze. Have been here for two hours łączy przeszłość z teraźniejszością.',
          'Bean znaczy fasola. Tutaj potrzebujesz been.'
        ]
      }
    },
    '160': {
      'pt-BR': {
        prompt: 'Se eu tivesse muito dinheiro, compraria uma ilha',
        explanations: [
          'Correto. If I had..., I would buy... expressa uma situação imaginária.',
          'No second conditional não colocamos would na parte com if. Dizemos If I had. Termo-chave em ingl?s: would have..',
          'Will mistura uma condição imaginária com resultado futuro real. Aqui precisamos de would. Termo-chave em ingl?s: had..',
          'Iceland é a Islândia. Para uma ilha qualquer, precisamos de island.'
        ]
      },
      vi: {
        prompt: 'Nếu tôi có nhiều tiền, tôi sẽ mua một hòn đảo',
        explanations: [
          'Đúng. If I had..., I would buy... diễn tả một tình huống tưởng tượng.',
          'Trong second conditional không đặt would ở mệnh đề if. Ta nói If I had. Thu?t ng? ti?ng Anh c?n gi?: would have..',
          'Will trộn điều kiện tưởng tượng với kết quả tương lai thật. Ở đây cần would. Thu?t ng? ti?ng Anh c?n gi?: had..',
          'Iceland là nước Iceland. Với một hòn đảo bất kỳ, cần island.'
        ]
      },
      id: {
        prompt: 'Jika saya punya banyak uang, saya akan membeli sebuah pulau',
        explanations: [
          'Benar. If I had..., I would buy... menyatakan situasi imajiner.',
          'Dalam second conditional, jangan letakkan would di bagian if. Katakan If I had. Istilah Inggris yang perlu dipertahankan: would have..',
          'Will mencampur kondisi imajiner dengan hasil masa depan nyata. Di sini perlu would. Istilah Inggris yang perlu dipertahankan: had..',
          'Iceland adalah negara Islandia. Untuk sebuah pulau, perlu island.'
        ]
      },
      tr: {
        prompt: 'Çok param olsaydı bir ada alırdım',
        explanations: [
          'Doğru. If I had..., I would buy... hayali bir durumu anlatır.',
          'Second conditional yapısında if bölümünde would kullanılmaz. If I had deriz. Korunmas? gereken ?ngilizce terim: would have..',
          'Will hayali koşulu gerçek gelecek sonucuyla karıştırır. Burada would gerekir. Korunmas? gereken ?ngilizce terim: had..',
          'Iceland İzlanda demektir. Herhangi bir ada için island gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdybym miał dużo pieniędzy, kupiłbym wyspę',
        explanations: [
          'Dobrze. If I had..., I would buy... wyraża sytuację wyobrażoną.',
          'W second conditional nie dajemy would w części z if. Mówimy If I had. Angielski termin do zachowania: would have..',
          'Will miesza warunek wyobrażony z realnym przyszłym rezultatem. Tutaj potrzebujemy would. Angielski termin do zachowania: had..',
          'Iceland to Islandia. Dla zwykłej wyspy potrzebujesz island.'
        ]
      }
    },
    '161': {
      'pt-BR': {
        prompt: 'Conheço o cara que mora aqui',
        explanations: [
          'Which normalmente usamos para coisas ou animais. Guy é uma pessoa, então aqui precisamos de who.',
          'Correto. Who liga the guy a lives here porque falamos de uma pessoa.',
          'Guy está no singular. Por isso o verbo precisa de -s: lives, não live.',
          'Leaves significa vai embora ou sai. Aqui precisamos de lives: mora.'
        ]
      },
      vi: {
        prompt: 'Tôi biết chàng trai sống ở đây',
        explanations: [
          'Which thường dùng cho đồ vật hoặc động vật. Guy là người, nên ở đây cần who.',
          'Đúng. Who nối the guy với lives here vì ta nói về một người.',
          'Guy là số ít, nên động từ cần -s: lives, không phải live.',
          'Leaves nghĩa là rời đi. Ở đây cần lives: sống.'
        ]
      },
      id: {
        prompt: 'Saya kenal pria yang tinggal di sini',
        explanations: [
          'Which biasanya dipakai untuk benda atau hewan. Guy adalah orang, jadi di sini perlu who.',
          'Benar. Who menghubungkan the guy dengan lives here karena kita membahas orang.',
          'Guy itu tunggal. Jadi kata kerjanya perlu -s: lives, bukan live.',
          'Leaves berarti pergi atau berangkat. Di sini perlu lives: tinggal.'
        ]
      },
      tr: {
        prompt: 'Burada yaşayan adamı tanıyorum',
        explanations: [
          'Which genelde nesneler veya hayvanlar için kullanılır. Guy bir kişi olduğu için burada who gerekir.',
          'Doğru. Who, bir kişiden bahsettiğimiz için the guy ile lives here kısmını bağlar.',
          'Guy tekildir. Bu yüzden fiil -s alır: lives, live değil.',
          'Leaves ayrılır veya gider demektir. Burada lives gerekir: yaşar.'
        ]
      },
      pl: {
        prompt: 'Znam faceta, który tu mieszka',
        explanations: [
          'Which zwykle używamy do rzeczy albo zwierząt. Guy to osoba, więc tutaj potrzebujemy who.',
          'Dobrze. Who łączy the guy z lives here, bo mówimy o osobie.',
          'Guy jest w liczbie pojedynczej. Dlatego czasownik potrzebuje -s: lives, nie live.',
          'Leaves znaczy odchodzi albo wyjeżdża. Tutaj potrzebujesz lives: mieszka.'
        ]
      }
    },
    '162': {
      'pt-BR': {
        prompt: 'Qualquer pessoa consegue fazer isso',
        explanations: [
          'Someone significa alguém: uma pessoa não especificada. Aqui queremos dizer qualquer pessoa.',
          'No one muda o sentido: significa que ninguém consegue fazer isso.',
          'Correto. Anyone em uma afirmação pode significar qualquer pessoa.',
          'Onion significa cebola. Aqui precisamos de anyone.'
        ]
      },
      vi: {
        prompt: 'Bất kỳ ai cũng có thể làm việc đó',
        explanations: [
          'Someone nghĩa là ai đó, một người không xác định. Ở đây cần nghĩa bất kỳ ai.',
          'No one đổi nghĩa hoàn toàn: không ai có thể làm việc đó.',
          'Đúng. Anyone trong câu khẳng định có thể mang nghĩa bất kỳ ai.',
          'Onion nghĩa là củ hành. Ở đây cần anyone.'
        ]
      },
      id: {
        prompt: 'Siapa pun bisa melakukannya',
        explanations: [
          'Someone berarti seseorang yang tidak disebutkan. Di sini maksudnya siapa pun.',
          'No one membalik makna: berarti tidak ada yang bisa melakukannya.',
          'Benar. Anyone dalam kalimat positif bisa berarti siapa pun.',
          'Onion berarti bawang. Di sini perlu anyone.'
        ]
      },
      tr: {
        prompt: 'Bunu herkes yapabilir',
        explanations: [
          'Someone belirsiz bir kişi demektir. Burada anlam herhangi biri olmalı.',
          'No one anlamı tersine çevirir: kimse bunu yapamaz demektir.',
          'Doğru. Anyone olumlu cümlede herhangi biri anlamına gelebilir.',
          'Onion soğan demektir. Burada anyone gerekir.'
        ]
      },
      pl: {
        prompt: 'Każdy może to zrobić',
        explanations: [
          'Someone znaczy ktoś, czyli nieokreślona osoba. Tutaj chodzi o każdego.',
          'No one zmienia sens na przeciwny: nikt nie może tego zrobić.',
          'Dobrze. Anyone w zdaniu twierdzącym może znaczyć każdy lub ktokolwiek.',
          'Onion znaczy cebula. Tutaj potrzebujesz anyone.'
        ]
      }
    },
    '163': {
      'pt-BR': {
        prompt: 'Tire o casaco!',
        explanations: [
          'Take out significa tirar algo de dentro de algum lugar. Para roupa no corpo usamos take off.',
          'Correto. Take off your coat é a forma natural de pedir para tirar o casaco.',
          'Cat significa gato. Aqui precisamos de coat: casaco.',
          'Of não é o phrasal verb. Para roupa é off, com dois f.'
        ]
      },
      vi: {
        prompt: 'Cởi áo khoác ra!',
        explanations: [
          'Take out nghĩa là lấy thứ gì đó ra khỏi một nơi. Với quần áo đang mặc, cần take off.',
          'Đúng. Take off your coat là cách tự nhiên để bảo ai đó cởi áo khoác.',
          'Cat nghĩa là mèo. Ở đây cần coat: áo khoác.',
          'Of không phải phrasal verb này. Với quần áo phải là off, có hai chữ f.'
        ]
      },
      id: {
        prompt: 'Lepaskan mantelmu!',
        explanations: [
          'Take out berarti mengeluarkan sesuatu dari suatu tempat. Untuk pakaian yang dipakai, gunakan take off.',
          'Benar. Take off your coat adalah cara alami untuk meminta seseorang melepas mantel.',
          'Cat berarti kucing. Di sini perlu coat: mantel.',
          'Of bukan phrasal verb ini. Untuk pakaian, tulis off dengan dua f.'
        ]
      },
      tr: {
        prompt: 'Montunu çıkar!',
        explanations: [
          'Take out bir şeyi bir yerden çıkarmak demektir. Üstündeki kıyafet için take off gerekir.',
          'Doğru. Take off your coat, birine montunu çıkarmasını söylemenin doğal yoludur.',
          'Cat kedi demektir. Burada coat gerekir: mont.',
          'Of bu phrasal verb değildir. Kıyafet için iki f ile off yazılır.'
        ]
      },
      pl: {
        prompt: 'Zdejmij płaszcz!',
        explanations: [
          'Take out znaczy wyjąć coś z jakiegoś miejsca. Przy ubraniu na sobie używamy take off.',
          'Dobrze. Take off your coat to naturalny sposób, żeby poprosić o zdjęcie płaszcza.',
          'Cat znaczy kot. Tutaj potrzebujesz coat: płaszcz.',
          'Of nie jest tym phrasal verb. Przy ubraniach piszemy off, z dwoma f.'
        ]
      }
    },
    '164': {
      'pt-BR': {
        prompt: 'Eu nunca comi caracóis',
        explanations: [
          'I never eat fala de hábito. Aqui falamos de experiência de vida, então precisamos de present perfect.',
          'Ate é past simple. Depois de have precisamos do particípio: eaten.',
          'Correto. I have never eaten snails significa que você nunca comeu caracóis na vida.',
          'Snakes são cobras. Aqui precisamos de snails: caracóis.'
        ]
      },
      vi: {
        prompt: 'Tôi chưa bao giờ ăn ốc sên',
        explanations: [
          'I never eat nói về thói quen. Ở đây là trải nghiệm trong đời, nên cần present perfect.',
          'Ate là past simple. Sau have cần phân từ: eaten.',
          'Đúng. I have never eaten snails nghĩa là bạn chưa từng ăn ốc sên trong đời.',
          'Snakes là rắn. Ở đây cần snails: ốc sên.'
        ]
      },
      id: {
        prompt: 'Saya belum pernah makan siput',
        explanations: [
          'I never eat membahas kebiasaan. Di sini maksudnya pengalaman hidup, jadi perlu present perfect.',
          'Ate adalah past simple. Setelah have perlu participle: eaten.',
          'Benar. I have never eaten snails berarti belum pernah makan siput seumur hidup.',
          'Snakes berarti ular. Di sini perlu snails: siput.'
        ]
      },
      tr: {
        prompt: 'Hiç salyangoz yemedim',
        explanations: [
          'I never eat alışkanlık anlatır. Burada yaşam deneyimi anlatıldığı için present perfect gerekir.',
          'Ate past simple biçimidir. Have sonrasında participle gerekir: eaten.',
          'Doğru. I have never eaten snails hayatında hiç salyangoz yemediğini anlatır.',
          'Snakes yılanlar demektir. Burada snails gerekir: salyangozlar.'
        ]
      },
      pl: {
        prompt: 'Nigdy nie jadłem ślimaków',
        explanations: [
          'I never eat mówi o nawyku. Tutaj chodzi o doświadczenie życiowe, więc potrzebujemy present perfect.',
          'Ate to past simple. Po have potrzebujemy imiesłowu: eaten.',
          'Dobrze. I have never eaten snails znaczy, że nigdy w życiu nie jadłeś ślimaków.',
          'Snakes to węże. Tutaj potrzebujesz snails: ślimaki.'
        ]
      }
    },
    '165': {
      'pt-BR': {
        prompt: 'Ele me disse que estava cansado',
        explanations: [
          'Said me não funciona assim. Com pessoa direta usamos told me, ou said to me em outra estrutura.',
          'Correto. Told me funciona quando dizemos a quem ele falou.',
          'Nesta tarefa usamos a mudança típica do reported speech: is vira was. Termo-chave em ingl?s: told..',
          'Tolled é usado para sino tocando. Aqui precisamos de told.'
        ]
      },
      vi: {
        prompt: 'Anh ấy nói với tôi rằng anh ấy mệt',
        explanations: [
          'Said me không dùng như vậy. Khi có người nhận trực tiếp, dùng told me hoặc said to me ở cấu trúc khác.',
          'Đúng. Told me dùng khi nói rõ anh ấy nói với ai.',
          'Trong bài này ta dùng đổi thì thường gặp trong reported speech: is thành was. Thu?t ng? ti?ng Anh c?n gi?: told..',
          'Tolled dùng cho tiếng chuông. Ở đây cần told.'
        ]
      },
      id: {
        prompt: 'Dia mengatakan kepada saya bahwa dia lelah',
        explanations: [
          'Said me tidak dipakai begitu. Dengan orang langsung, gunakan told me, atau said to me dalam struktur lain.',
          'Benar. Told me dipakai saat kita menyebut kepada siapa dia berbicara.',
          'Di latihan ini kita memakai perubahan khas reported speech: is menjadi was. Istilah Inggris yang perlu dipertahankan: told..',
          'Tolled dipakai untuk bunyi lonceng. Di sini perlu told.'
        ]
      },
      tr: {
        prompt: 'Bana yorgun olduğunu söyledi',
        explanations: [
          'Said me böyle kullanılmaz. Doğrudan kişi varsa told me kullanırız; başka yapıda said to me olabilir.',
          'Doğru. Kime söylediğini belirttiğimizde told me çalışır.',
          'Bu alıştırmada reported speech için tipik zaman kayması var: is, was olur. Korunmas? gereken ?ngilizce terim: told..',
          'Tolled çanın çalması için kullanılır. Burada told gerekir.'
        ]
      },
      pl: {
        prompt: 'Powiedział mi, że był zmęczony',
        explanations: [
          'Said me tak nie działa. Przy osobie bezpośredniej używamy told me albo said to me w innej strukturze.',
          'Dobrze. Told me działa, kiedy mówimy, komu coś powiedział.',
          'W tym zadaniu ćwiczymy typowe cofnięcie czasu w reported speech: is przechodzi w was. Angielski termin do zachowania: told..',
          'Tolled używa się przy biciu dzwonu. Tutaj potrzebujesz told.'
        ]
      }
    },
    '166': {
      'pt-BR': {
        prompt: 'Nós nos divertimos na festa',
        explanations: [
          'Enjoy normalmente precisa de objeto. Aqui falta ourselves para dizer que nos divertimos.',
          'Correto. We enjoyed ourselves at the party significa que nos divertimos na festa.',
          'Com we precisamos de ourselves, não ourself.',
          'Shelves significa prateleiras. Aqui precisamos de ourselves.'
        ]
      },
      vi: {
        prompt: 'Chúng tôi đã vui vẻ ở bữa tiệc',
        explanations: [
          'Enjoy thường cần tân ngữ. Ở đây thiếu ourselves để nói rằng chúng tôi đã vui vẻ.',
          'Đúng. We enjoyed ourselves at the party nghĩa là chúng tôi đã vui vẻ ở bữa tiệc.',
          'Với we cần ourselves, không phải ourself.',
          'Shelves nghĩa là kệ. Ở đây cần ourselves.'
        ]
      },
      id: {
        prompt: 'Kami bersenang-senang di pesta',
        explanations: [
          'Enjoy biasanya perlu objek. Di sini kurang ourselves untuk mengatakan kami bersenang-senang.',
          'Benar. We enjoyed ourselves at the party berarti kami bersenang-senang di pesta.',
          'Dengan we perlu ourselves, bukan ourself.',
          'Shelves berarti rak. Di sini perlu ourselves.'
        ]
      },
      tr: {
        prompt: 'Partide iyi vakit geçirdik',
        explanations: [
          'Enjoy genelde nesne ister. Burada iyi vakit geçirdiğimizi söylemek için ourselves eksik.',
          'Doğru. We enjoyed ourselves at the party partide iyi vakit geçirdik demektir.',
          'We ile ourselves gerekir, ourself değil.',
          'Shelves raflar demektir. Burada ourselves gerekir.'
        ]
      },
      pl: {
        prompt: 'Dobrze bawiliśmy się na imprezie',
        explanations: [
          'Enjoy zwykle potrzebuje dopełnienia. Tutaj brakuje ourselves, żeby powiedzieć, że dobrze się bawiliśmy.',
          'Dobrze. We enjoyed ourselves at the party znaczy, że dobrze bawiliśmy się na imprezie.',
          'Przy we potrzebujemy ourselves, nie ourself.',
          'Shelves znaczy półki. Tutaj potrzebujesz ourselves.'
        ]
      }
    },
    '167': {
      'pt-BR': {
        prompt: 'Ele perguntou onde eu morava',
        explanations: [
          'Where do I live é ordem de pergunta direta. Depois de asked usamos ordem normal: where I lived.',
          'Correto. Em pergunta indireta dizemos where I lived, sem do.',
          'Where I live pode aparecer se o lugar ainda for atual, mas aqui treinamos o backshift padrão: lived. Termo-chave em ingl?s: asked..',
          'Leafed não significa morar. Aqui precisamos de lived.'
        ]
      },
      vi: {
        prompt: 'Anh ấy hỏi tôi sống ở đâu',
        explanations: [
          'Where do I live là trật tự câu hỏi trực tiếp. Sau asked dùng trật tự thường: where I lived.',
          'Đúng. Trong câu hỏi gián tiếp nói where I lived, không có do.',
          'Where I live có thể dùng nếu nơi ở vẫn còn đúng, nhưng ở đây luyện backshift chuẩn: lived. Thu?t ng? ti?ng Anh c?n gi?: asked..',
          'Leafed không có nghĩa là sống ở đâu. Ở đây cần lived.'
        ]
      },
      id: {
        prompt: 'Dia bertanya di mana saya tinggal',
        explanations: [
          'Where do I live adalah urutan pertanyaan langsung. Setelah asked gunakan urutan biasa: where I lived.',
          'Benar. Dalam pertanyaan tidak langsung, katakan where I lived tanpa do.',
          'Where I live bisa muncul jika tempatnya masih berlaku, tetapi di sini latihan backshift standar: lived. Istilah Inggris yang perlu dipertahankan: asked..',
          'Leafed tidak berarti tinggal. Di sini perlu lived.'
        ]
      },
      tr: {
        prompt: 'Nerede yaşadığımı sordu',
        explanations: [
          'Where do I live doğrudan soru sırasıdır. Asked sonrasında düz sıra kullanırız: where I lived.',
          'Doğru. Dolaylı soruda do olmadan where I lived deriz.',
          'Yer hâlâ güncelse where I live olabilir, ama burada standart backshift çalışıyoruz: lived. Korunmas? gereken ?ngilizce terim: asked..',
          'Leafed yaşamak demek değildir. Burada lived gerekir.'
        ]
      },
      pl: {
        prompt: 'Zapytał, gdzie mieszkałem',
        explanations: [
          'Where do I live to szyk pytania bezpośredniego. Po asked używamy normalnego szyku: where I lived.',
          'Dobrze. W pytaniu pośrednim mówimy where I lived, bez do.',
          'Where I live może się pojawić, jeśli miejsce nadal jest aktualne, ale tutaj ćwiczymy standardowy backshift: lived. Angielski termin do zachowania: asked..',
          'Leafed nie znaczy mieszkać. Tutaj potrzebujesz lived.'
        ]
      }
    },
    '168': {
      'pt-BR': {
        prompt: 'Estou na fila',
        explanations: [
          'At line não soa natural para estar em uma fila. Aqui precisamos de in line.',
          'Correto. I am standing in line é natural no inglês americano.',
          'Queue pode funcionar no inglês britânico, mas aqui faltaria a ou the. A opção limpa é in line.',
          'Falta am. Para present continuous precisamos de I am standing.'
        ]
      },
      vi: {
        prompt: 'Tôi đang xếp hàng',
        explanations: [
          'At line nghe không tự nhiên khi nói đang đứng xếp hàng. Ở đây cần in line.',
          'Đúng. I am standing in line tự nhiên trong tiếng Anh Mỹ.',
          'Queue có thể dùng trong tiếng Anh Anh, nhưng ở đây thiếu a hoặc the. Phương án rõ nhất là in line.',
          'Thiếu am. Với present continuous cần I am standing.'
        ]
      },
      id: {
        prompt: 'Saya sedang mengantre',
        explanations: [
          'At line tidak terdengar alami untuk sedang antre. Di sini perlu in line.',
          'Benar. I am standing in line alami dalam bahasa Inggris Amerika.',
          'Queue bisa dipakai dalam bahasa Inggris Britania, tetapi di sini kurang a atau the. Pilihan bersihnya adalah in line.',
          'Kurang am. Untuk present continuous perlu I am standing.'
        ]
      },
      tr: {
        prompt: 'Sırada bekliyorum',
        explanations: [
          'At line sırada durmak için doğal değildir. Burada in line gerekir.',
          'Doğru. I am standing in line Amerikan İngilizcesinde doğaldır.',
          'Queue Britanya İngilizcesinde olabilir, ama burada a veya the eksik. En temiz seçenek in line.',
          'Am eksik. Present continuous için I am standing gerekir.'
        ]
      },
      pl: {
        prompt: 'Stoję w kolejce',
        explanations: [
          'At line nie brzmi naturalnie, gdy ktoś stoi w kolejce. Tutaj potrzebujemy in line.',
          'Dobrze. I am standing in line brzmi naturalnie w amerykańskim angielskim.',
          'Queue może działać w brytyjskim angielskim, ale tutaj brakowałoby a albo the. Najczystsza opcja to in line.',
          'Brakuje am. Do present continuous potrzebujemy I am standing.'
        ]
      }
    },
    '169': {
      'pt-BR': {
        prompt: 'Ela evita falar comigo',
        explanations: [
          'Depois de avoid não usamos to + verbo. Precisamos de avoid + -ing.',
          'Avoid não vai com o verbo cru talk. Falta -ing.',
          'Correto. Avoids talking to me significa que ela evita falar comigo.',
          'Tucking significa enfiar ou ajeitar para dentro. Aqui precisamos de talking.'
        ]
      },
      vi: {
        prompt: 'Cô ấy tránh nói chuyện với tôi',
        explanations: [
          'Sau avoid không dùng to + động từ. Cần avoid + -ing.',
          'Avoid không đi với động từ nguyên talk như vậy. Thiếu -ing.',
          'Đúng. Avoids talking to me nghĩa là cô ấy tránh nói chuyện với tôi.',
          'Tucking nghĩa là nhét hoặc gài vào trong. Ở đây cần talking.'
        ]
      },
      id: {
        prompt: 'Dia menghindari berbicara dengan saya',
        explanations: [
          'Setelah avoid, jangan gunakan to + verb. Perlu avoid + -ing.',
          'Avoid tidak diikuti kata kerja polos talk. Kurang -ing.',
          'Benar. Avoids talking to me berarti dia menghindari berbicara dengan saya.',
          'Tucking berarti menyelipkan atau memasukkan. Di sini perlu talking.'
        ]
      },
      tr: {
        prompt: 'Benimle konuşmaktan kaçınıyor',
        explanations: [
          'Avoid sonrasında to + fiil kullanmayız. Avoid + -ing gerekir.',
          'Avoid, çıplak talk fiiliyle gelmez. -ing eksik.',
          'Doğru. Avoids talking to me benimle konuşmaktan kaçınıyor demektir.',
          'Tucking içeri sıkıştırmak veya yerleştirmek demektir. Burada talking gerekir.'
        ]
      },
      pl: {
        prompt: 'Ona unika rozmawiania ze mną',
        explanations: [
          'Po avoid nie używamy to + czasownik. Potrzebujemy avoid + -ing.',
          'Avoid nie łączy się z gołym czasownikiem talk. Brakuje -ing.',
          'Dobrze. Avoids talking to me znaczy, że ona unika rozmowy ze mną.',
          'Tucking znaczy wkładać albo podwijać coś do środka. Tutaj potrzebujesz talking.'
        ]
      }
    },
    '170': {
      'pt-BR': {
        prompt: 'Estão consertando meu carro agora',
        explanations: [
          'My car is repairing soa como se o carro estivesse consertando a si mesmo. Aqui precisamos de passiva.',
          'Correto. Is being repaired mostra que alguém está consertando o carro agora.',
          'Prepared significa preparado. Aqui precisamos de repaired: consertado.',
          'Falta is. Para essa forma passiva precisamos de is being repaired.'
        ]
      },
      vi: {
        prompt: 'Xe của tôi đang được sửa bây giờ',
        explanations: [
          'My car is repairing nghe như chiếc xe tự sửa chính nó. Ở đây cần câu bị động.',
          'Đúng. Is being repaired cho thấy hiện giờ có người đang sửa xe.',
          'Prepared nghĩa là được chuẩn bị. Ở đây cần repaired: được sửa.',
          'Thiếu is. Với dạng bị động này cần is being repaired.'
        ]
      },
      id: {
        prompt: 'Mobil saya sedang diperbaiki sekarang',
        explanations: [
          'My car is repairing terdengar seperti mobil memperbaiki dirinya sendiri. Di sini perlu passive.',
          'Benar. Is being repaired menunjukkan seseorang sedang memperbaiki mobil sekarang.',
          'Prepared berarti disiapkan. Di sini perlu repaired: diperbaiki.',
          'Kurang is. Untuk bentuk passive ini perlu is being repaired.'
        ]
      },
      tr: {
        prompt: 'Arabam şu anda tamir ediliyor',
        explanations: [
          'My car is repairing, araba kendini tamir ediyormuş gibi duyulur. Burada passive gerekir.',
          'Doğru. Is being repaired şu anda birinin arabayı tamir ettiğini gösterir.',
          'Prepared hazırlanmış demektir. Burada repaired gerekir: tamir edilmiş.',
          'Is eksik. Bu passive yapı için is being repaired gerekir.'
        ]
      },
      pl: {
        prompt: 'Mój samochód jest teraz naprawiany',
        explanations: [
          'My car is repairing brzmi tak, jakby samochód naprawiał sam siebie. Tutaj potrzebujemy strony biernej.',
          'Dobrze. Is being repaired pokazuje, że ktoś teraz naprawia samochód.',
          'Prepared znaczy przygotowany. Tutaj potrzebujesz repaired: naprawiony.',
          'Brakuje is. Do tej formy strony biernej potrzebujemy is being repaired.'
        ]
      }
    },
    '171': {
      'pt-BR': {
        prompt: 'Eu estava andando pela rua quando vi meu professor',
        explanations: [
          'I walked soa mais como duas ações em sequência. Aqui precisamos de uma ação em progresso: was walking.',
          'Correto. Was walking mostra a ação de fundo, e saw marca o momento que interrompe.',
          'Seen precisa de have. No past simple usamos saw. Termo-chave em ingl?s: when..',
          'Working significa trabalhando. Aqui precisamos de walking: andando.'
        ]
      },
      vi: {
        prompt: 'Tôi đang đi trên phố thì nhìn thấy giáo viên của mình',
        explanations: [
          'I walked nghe giống hai hành động nối tiếp. Ở đây cần hành động đang diễn ra: was walking.',
          'Đúng. Was walking cho thấy hành động nền, còn saw là khoảnh khắc chen vào.',
          'Seen cần have. Ở past simple dùng saw. Thu?t ng? ti?ng Anh c?n gi?: when..',
          'Working nghĩa là đang làm việc. Ở đây cần walking: đang đi bộ.'
        ]
      },
      id: {
        prompt: 'Saya sedang berjalan di jalan ketika melihat guru saya',
        explanations: [
          'I walked terdengar seperti dua tindakan berurutan. Di sini perlu tindakan yang sedang berlangsung: was walking.',
          'Benar. Was walking menunjukkan aksi latar, dan saw menandai momen yang menyela.',
          'Seen perlu have. Dalam past simple gunakan saw. Istilah Inggris yang perlu dipertahankan: when..',
          'Working berarti sedang bekerja. Di sini perlu walking: berjalan.'
        ]
      },
      tr: {
        prompt: 'Öğretmenimi gördüğümde sokakta yürüyordum',
        explanations: [
          'I walked iki eylem arka arkaya olmuş gibi duyulur. Burada devam eden eylem gerekir: was walking.',
          'Doğru. Was walking arka plandaki eylemi gösterir, saw ise onu bölen anı verir.',
          'Seen için have gerekir. Past simple içinde saw kullanırız. Korunmas? gereken ?ngilizce terim: when..',
          'Working çalışmak demektir. Burada walking gerekir: yürümek.'
        ]
      },
      pl: {
        prompt: 'Szedłem ulicą, kiedy zobaczyłem swojego nauczyciela',
        explanations: [
          'I walked brzmi bardziej jak dwie czynności po kolei. Tutaj potrzebujemy czynności w toku: was walking.',
          'Dobrze. Was walking pokazuje tło, a saw moment, który je przerywa.',
          'Seen potrzebuje have. W past simple używamy saw. Angielski termin do zachowania: when..',
          'Working znaczy pracując. Tutaj potrzebujesz walking: idąc.'
        ]
      }
    },
    '172': {
      'pt-BR': {
        prompt: 'O hotel onde ficamos era muito antigo',
        explanations: [
          'Correto. Where funciona para o lugar onde a ação aconteceu: the hotel where we stayed.',
          'Which sozinho não completa a ideia. Seria which we stayed in, ou mais simples: where. Termo-chave em ingl?s: hotel which we stayed; The hotel which we..',
          'Who é para pessoas. Hotel é lugar, então precisamos de where.',
          'Stared significa olhou fixamente. Aqui precisamos de stayed: ficamos hospedados.'
        ]
      },
      vi: {
        prompt: 'Khách sạn nơi chúng tôi ở rất cũ',
        explanations: [
          'Đúng. Where dùng cho nơi hành động xảy ra: the hotel where we stayed.',
          'Which một mình chưa đủ ý. Cần which we stayed in, hoặc đơn giản hơn là where. Thu?t ng? ti?ng Anh c?n gi?: hotel which we stayed; The hotel which we..',
          'Who dùng cho người. Hotel là nơi chốn, nên cần where.',
          'Stared nghĩa là nhìn chằm chằm. Ở đây cần stayed: đã ở lại.'
        ]
      },
      id: {
        prompt: 'Hotel tempat kami menginap sangat tua',
        explanations: [
          'Benar. Where dipakai untuk tempat terjadinya tindakan: the hotel where we stayed.',
          'Which saja tidak melengkapi makna. Perlu which we stayed in, atau lebih sederhana: where. Istilah Inggris yang perlu dipertahankan: hotel which we stayed; The hotel which we..',
          'Who dipakai untuk orang. Hotel adalah tempat, jadi perlu where.',
          'Stared berarti menatap. Di sini perlu stayed: menginap.'
        ]
      },
      tr: {
        prompt: 'Kaldığımız otel çok eskiydi',
        explanations: [
          'Doğru. Where eylemin gerçekleştiği yer için kullanılır: the hotel where we stayed.',
          'Which tek başına fikri tamamlamaz. Which we stayed in ya da daha basit olarak where gerekir. Korunmas? gereken ?ngilizce terim: hotel which we stayed; The hotel which we..',
          'Who kişiler içindir. Hotel bir yer olduğu için where gerekir.',
          'Stared gözünü dikti demektir. Burada stayed gerekir: kaldık.'
        ]
      },
      pl: {
        prompt: 'Hotel, w którym się zatrzymaliśmy, był bardzo stary',
        explanations: [
          'Dobrze. Where działa dla miejsca, w którym coś się wydarzyło: the hotel where we stayed.',
          'Samo which nie domyka sensu. Trzeba powiedzieć which we stayed in albo prościej: where. Angielski termin do zachowania: hotel which we stayed; The hotel which we..',
          'Who jest dla osób. Hotel to miejsce, więc potrzebujemy where.',
          'Stared znaczy wpatrywał się. Tutaj potrzebujesz stayed: zatrzymaliśmy się.'
        ]
      }
    },
    '173': {
      'pt-BR': {
        prompt: 'Pare de fazer barulho!',
        explanations: [
          'Stop to make noise soa como parar para fazer barulho. Para interromper uma ação usamos stop + -ing.',
          'Correto. Stop making noise significa pare de fazer barulho.',
          'Nose significa nariz. Aqui precisamos de noise: barulho.',
          'Depois de stop, para parar uma ação, usamos making, não make.'
        ]
      },
      vi: {
        prompt: 'Đừng làm ồn nữa!',
        explanations: [
          'Stop to make noise nghe như dừng lại để tạo tiếng ồn. Để dừng một hành động, dùng stop + -ing.',
          'Đúng. Stop making noise nghĩa là đừng làm ồn nữa.',
          'Nose nghĩa là mũi. Ở đây cần noise: tiếng ồn.',
          'Sau stop, khi muốn dừng hành động, dùng making, không phải make.'
        ]
      },
      id: {
        prompt: 'Berhenti membuat berisik!',
        explanations: [
          'Stop to make noise terdengar seperti berhenti untuk membuat suara. Untuk menghentikan tindakan, gunakan stop + -ing.',
          'Benar. Stop making noise berarti berhenti membuat berisik.',
          'Nose berarti hidung. Di sini perlu noise: suara berisik.',
          'Setelah stop, untuk menghentikan tindakan, gunakan making, bukan make.'
        ]
      },
      tr: {
        prompt: 'Gürültü yapmayı bırak!',
        explanations: [
          'Stop to make noise gürültü yapmak için durmak gibi duyulur. Bir eylemi bırakmak için stop + -ing kullanırız.',
          'Doğru. Stop making noise gürültü yapmayı bırak demektir.',
          'Nose burun demektir. Burada noise gerekir: gürültü.',
          'Stop sonrasında bir eylemi bırakmak için making gerekir, make değil.'
        ]
      },
      pl: {
        prompt: 'Przestań hałasować!',
        explanations: [
          'Stop to make noise brzmi jak zatrzymać się, żeby hałasować. Żeby przerwać czynność, używamy stop + -ing.',
          'Dobrze. Stop making noise znaczy przestań hałasować.',
          'Nose znaczy nos. Tutaj potrzebujesz noise: hałas.',
          'Po stop, gdy przerywamy czynność, używamy making, nie make.'
        ]
      }
    },
    '174': {
      'pt-BR': {
        prompt: 'Eu me sinto bem',
        explanations: [
          'Em inglês não precisamos de myself aqui. A forma natural é I feel good.',
          'Correto. I feel good é uma forma natural de dizer que você se sente bem.',
          'I feel well pode ser gramatical, especialmente sobre saúde, mas aqui a resposta-alvo é a frase geral I feel good.',
          'Fill significa preencher. Aqui precisamos de feel: sentir.'
        ]
      },
      vi: {
        prompt: 'Tôi cảm thấy ổn',
        explanations: [
          'Trong tiếng Anh không cần myself ở đây. Cách tự nhiên là I feel good.',
          'Đúng. I feel good là cách tự nhiên để nói tôi cảm thấy ổn.',
          'I feel well có thể đúng, nhất là khi nói về sức khỏe, nhưng đáp án mục tiêu ở đây là I feel good.',
          'Fill nghĩa là đổ đầy. Ở đây cần feel: cảm thấy.'
        ]
      },
      id: {
        prompt: 'Saya merasa baik-baik saja',
        explanations: [
          'Dalam bahasa Inggris tidak perlu myself di sini. Bentuk alaminya adalah I feel good.',
          'Benar. I feel good adalah cara alami untuk mengatakan saya merasa baik-baik saja.',
          'I feel well bisa gramatikal, terutama untuk kesehatan, tetapi target di sini adalah frasa umum I feel good.',
          'Fill berarti mengisi. Di sini perlu feel: merasa.'
        ]
      },
      tr: {
        prompt: 'Kendimi iyi hissediyorum',
        explanations: [
          'İngilizcede burada myself gerekmez. Doğal biçim I feel good.',
          'Doğru. I feel good kendimi iyi hissediyorum demenin doğal yoludur.',
          'I feel well özellikle sağlık için gramatik olabilir, ama burada hedef genel ifade: I feel good.',
          'Fill doldurmak demektir. Burada feel gerekir: hissetmek.'
        ]
      },
      pl: {
        prompt: 'Czuję się dobrze',
        explanations: [
          'Po angielsku nie potrzebujemy tutaj myself. Naturalna forma to I feel good.',
          'Dobrze. I feel good to naturalny sposób, żeby powiedzieć czuję się dobrze.',
          'I feel well może być gramatyczne, zwłaszcza o zdrowiu, ale tutaj celem jest ogólne I feel good.',
          'Fill znaczy wypełniać. Tutaj potrzebujesz feel: czuć.'
        ]
      }
    },
    '175': {
      'pt-BR': {
        prompt: 'Estou acostumado a acordar cedo',
        explanations: [
          'Depois de be used to usamos substantivo ou -ing. Por isso precisamos de getting. Termo-chave em ingl?s: am used to..',
          'Correto. I am used to getting up early significa que estou acostumado a acordar cedo.',
          'Use to não expressa estar acostumado. Para hábito passado seria used to.',
          'Cup significa xícara. Aqui precisamos de get up, não get cup.'
        ]
      },
      vi: {
        prompt: 'Tôi đã quen dậy sớm',
        explanations: [
          'Sau be used to dùng danh từ hoặc -ing. Vì vậy cần getting. Thu?t ng? ti?ng Anh c?n gi?: am used to..',
          'Đúng. I am used to getting up early nghĩa là tôi đã quen dậy sớm.',
          'Use to không diễn tả đã quen. Nếu nói thói quen trong quá khứ thì là used to.',
          'Cup nghĩa là cái cốc. Ở đây cần get up, không phải get cup.'
        ]
      },
      id: {
        prompt: 'Saya terbiasa bangun pagi',
        explanations: [
          'Setelah be used to gunakan noun atau -ing. Jadi perlu getting. Istilah Inggris yang perlu dipertahankan: am used to..',
          'Benar. I am used to getting up early berarti saya terbiasa bangun pagi.',
          'Use to tidak berarti terbiasa. Untuk kebiasaan masa lalu, bentuknya used to.',
          'Cup berarti cangkir. Di sini perlu get up, bukan get cup.'
        ]
      },
      tr: {
        prompt: 'Erken kalkmaya alışkınım',
        explanations: [
          'Be used to sonrasında isim veya -ing kullanırız. Bu yüzden getting gerekir. Korunmas? gereken ?ngilizce terim: am used to..',
          'Doğru. I am used to getting up early erken kalkmaya alışkınım demektir.',
          'Use to alışkın olmak anlamı vermez. Geçmiş alışkanlık için used to olurdu.',
          'Cup fincan demektir. Burada get up gerekir, get cup değil.'
        ]
      },
      pl: {
        prompt: 'Jestem przyzwyczajony do wczesnego wstawania',
        explanations: [
          'Po be used to używamy rzeczownika albo formy -ing. Dlatego potrzebujemy getting. Angielski termin do zachowania: am used to..',
          'Dobrze. I am used to getting up early znaczy, że jestem przyzwyczajony do wczesnego wstawania.',
          'Use to nie wyraża przyzwyczajenia. Dla dawnego nawyku byłoby used to.',
          'Cup znaczy filiżanka. Tutaj potrzebujesz get up, nie get cup.'
        ]
      }
    },
    '176': {
      'pt-BR': {
        prompt: 'Este é o homem cujo carro eu comprei',
        explanations: [
          'Who\'s significa who is ou who has. Para posse precisamos de whose.',
          'Which não funciona para posse de uma pessoa nesta frase. Precisamos de whose.',
          'Correto. Whose car significa cujo carro.',
          'Cat significa gato. Aqui precisamos de car: carro.'
        ]
      },
      vi: {
        prompt: 'Đây là người đàn ông mà tôi đã mua xe của anh ấy',
        explanations: [
          'Who\'s nghĩa là who is hoặc who has. Để chỉ sở hữu, cần whose.',
          'Which không dùng để chỉ sở hữu của người trong câu này. Cần whose.',
          'Đúng. Whose car nghĩa là chiếc xe của người đó.',
          'Cat nghĩa là mèo. Ở đây cần car: xe hơi.'
        ]
      },
      id: {
        prompt: 'Ini pria yang mobilnya saya beli',
        explanations: [
          'Who\'s berarti who is atau who has. Untuk kepemilikan, perlu whose.',
          'Which tidak cocok untuk kepemilikan orang dalam kalimat ini. Perlu whose.',
          'Benar. Whose car berarti mobil milik siapa.',
          'Cat berarti kucing. Di sini perlu car: mobil.'
        ]
      },
      tr: {
        prompt: 'Bu, arabasını satın aldığım adam',
        explanations: [
          'Who\'s, who is veya who has demektir. Sahiplik için whose gerekir.',
          'Which bu cümlede bir kişinin sahipliğini anlatmak için çalışmaz. Whose gerekir.',
          'Doğru. Whose car arabası olan kişi anlamını verir.',
          'Cat kedi demektir. Burada car gerekir: araba.'
        ]
      },
      pl: {
        prompt: 'To mężczyzna, którego samochód kupiłem',
        explanations: [
          'Who\'s znaczy who is albo who has. Do posiadania potrzebujemy whose.',
          'Which nie działa tutaj dla posiadania przez osobę. Potrzebujemy whose.',
          'Dobrze. Whose car znaczy którego samochód.',
          'Cat znaczy kot. Tutaj potrzebujesz car: samochód.'
        ]
      }
    },
    '177': {
      'pt-BR': {
        prompt: 'Acabaram de entregar um pacote para ela',
        explanations: [
          'Correto. Has just had a parcel delivered mostra que ela acabou de receber uma entrega.',
          'Depois de has just não usamos deliver assim. Além disso, aqui não queremos dizer que ela entregou o pacote.',
          'She just deliver não está bem formado e muda o sentido.',
          'Delayed significa atrasado. Aqui precisamos de delivered: entregue.'
        ]
      },
      vi: {
        prompt: 'Cô ấy vừa được giao một bưu kiện',
        explanations: [
          'Đúng. Has just had a parcel delivered cho thấy cô ấy vừa nhận một bưu kiện.',
          'Sau has just không dùng deliver như vậy. Hơn nữa, ở đây không muốn nói cô ấy đi giao bưu kiện.',
          'She just deliver không đúng cấu trúc và đổi nghĩa.',
          'Delayed nghĩa là bị trì hoãn. Ở đây cần delivered: được giao.'
        ]
      },
      id: {
        prompt: 'Dia baru saja menerima kiriman paket',
        explanations: [
          'Benar. Has just had a parcel delivered menunjukkan dia baru saja menerima paket.',
          'Setelah has just, jangan gunakan deliver seperti itu. Selain itu, maknanya bukan dia mengirim paket.',
          'She just deliver tidak terbentuk dengan benar dan mengubah makna.',
          'Delayed berarti tertunda. Di sini perlu delivered: dikirimkan.'
        ]
      },
      tr: {
        prompt: 'Ona az önce bir paket teslim edildi',
        explanations: [
          'Doğru. Has just had a parcel delivered ona az önce bir paketin teslim edildiğini gösterir.',
          'Has just sonrasında deliver böyle kullanılmaz. Ayrıca burada paketi onun teslim ettiğini söylemiyoruz.',
          'She just deliver doğru kurulmamış ve anlamı değiştirir.',
          'Delayed gecikmiş demektir. Burada delivered gerekir: teslim edilmiş.'
        ]
      },
      pl: {
        prompt: 'Właśnie dostarczono jej paczkę',
        explanations: [
          'Dobrze. Has just had a parcel delivered pokazuje, że właśnie dostarczono jej paczkę.',
          'Po has just nie używamy deliver w tej formie. Poza tym nie chodzi o to, że ona dostarczyła paczkę.',
          'She just deliver jest źle zbudowane i zmienia sens.',
          'Delayed znaczy opóźniony. Tutaj potrzebujesz delivered: dostarczony.'
        ]
      }
    },
    '178': {
      'pt-BR': {
        prompt: 'Eu estava no trem quando você ligou',
        explanations: [
          'Com transporte público normalmente dizemos on the train, não in the train.',
          'Correto. I was on the train when you called soa natural.',
          'At the train não funciona para dizer que você estava viajando de trem.',
          'Rain significa chuva. Aqui precisamos de train: trem.'
        ]
      },
      vi: {
        prompt: 'Tôi đang ở trên tàu khi bạn gọi',
        explanations: [
          'Với phương tiện công cộng, thường nói on the train, không phải in the train.',
          'Đúng. I was on the train when you called nghe tự nhiên.',
          'At the train không dùng để nói đang đi tàu.',
          'Rain nghĩa là mưa. Ở đây cần train: tàu.'
        ]
      },
      id: {
        prompt: 'Saya berada di kereta ketika kamu menelepon',
        explanations: [
          'Untuk transportasi umum biasanya kita mengatakan on the train, bukan in the train.',
          'Benar. I was on the train when you called terdengar alami.',
          'At the train tidak cocok untuk mengatakan sedang bepergian dengan kereta.',
          'Rain berarti hujan. Di sini perlu train: kereta.'
        ]
      },
      tr: {
        prompt: 'Sen aradığında trendeydim',
        explanations: [
          'Toplu taşıma için genelde on the train deriz, in the train değil.',
          'Doğru. I was on the train when you called doğal duyulur.',
          'At the train trenle yolculuk ettiğini söylemek için kullanılmaz.',
          'Rain yağmur demektir. Burada train gerekir: tren.'
        ]
      },
      pl: {
        prompt: 'Byłem w pociągu, kiedy zadzwoniłeś',
        explanations: [
          'Przy transporcie publicznym po angielsku zwykle mówimy on the train, nie in the train.',
          'Dobrze. I was on the train when you called brzmi naturalnie.',
          'At the train nie działa, gdy mówimy, że ktoś jechał pociągiem.',
          'Rain znaczy deszcz. Tutaj potrzebujesz train: pociąg.'
        ]
      }
    },
    '179': {
      'pt-BR': {
        prompt: 'Ela estava tomando banho quando alguém bateu',
        explanations: [
          'Correto. Was taking mostra a ação em progresso, e knocked marca a interrupção.',
          'She took a shower soa mais como uma ação completa, não como fundo em progresso.',
          'Naked significa nu. Aqui precisamos de knocked: bateu.',
          'Depois de was precisamos de -ing: was taking, não was take.'
        ]
      },
      vi: {
        prompt: 'Cô ấy đang tắm thì có người gõ cửa',
        explanations: [
          'Đúng. Was taking cho thấy hành động đang diễn ra, còn knocked là sự chen vào.',
          'She took a shower nghe như hành động hoàn tất, không phải bối cảnh đang diễn ra.',
          'Naked nghĩa là khỏa thân. Ở đây cần knocked: gõ cửa.',
          'Sau was cần -ing: was taking, không phải was take.'
        ]
      },
      id: {
        prompt: 'Dia sedang mandi ketika seseorang mengetuk',
        explanations: [
          'Benar. Was taking menunjukkan aksi sedang berlangsung, dan knocked menandai gangguan.',
          'She took a shower terdengar seperti tindakan selesai, bukan latar yang sedang berlangsung.',
          'Naked berarti telanjang. Di sini perlu knocked: mengetuk.',
          'Setelah was perlu -ing: was taking, bukan was take.'
        ]
      },
      tr: {
        prompt: 'Biri kapıyı çaldığında duş alıyordu',
        explanations: [
          'Doğru. Was taking devam eden eylemi gösterir, knocked ise araya giren anı verir.',
          'She took a shower daha çok tamamlanmış bir eylem gibi duyulur, devam eden arka plan değil.',
          'Naked çıplak demektir. Burada knocked gerekir: kapıyı çaldı.',
          'Was sonrasında -ing gerekir: was taking, was take değil.'
        ]
      },
      pl: {
        prompt: 'Brała prysznic, kiedy ktoś zapukał',
        explanations: [
          'Dobrze. Was taking pokazuje czynność w toku, a knocked moment przerwania.',
          'She took a shower brzmi bardziej jak zakończona czynność, nie tło w toku.',
          'Naked znaczy nagi. Tutaj potrzebujesz knocked: zapukał.',
          'Po was potrzebujemy -ing: was taking, nie was take.'
        ]
      }
    },
    '180': {
      'pt-BR': {
        prompt: 'Apague a luz quando sair',
        explanations: [
          'Of não é o phrasal verb. Para desligar algo usamos off, com dois f.',
          'Correto. Turn off the light significa apagar a luz.',
          'Turn down significa diminuir a intensidade, não apagar completamente.',
          'Live significa viver. Aqui precisamos de leave: sair.'
        ]
      },
      vi: {
        prompt: 'Tắt đèn khi bạn rời đi',
        explanations: [
          'Of không phải phrasal verb này. Để tắt thứ gì đó, dùng off với hai chữ f.',
          'Đúng. Turn off the light nghĩa là tắt đèn.',
          'Turn down nghĩa là giảm cường độ, không phải tắt hẳn.',
          'Live nghĩa là sống. Ở đây cần leave: rời đi.'
        ]
      },
      id: {
        prompt: 'Matikan lampu saat kamu pergi',
        explanations: [
          'Of bukan phrasal verb ini. Untuk mematikan sesuatu, gunakan off dengan dua f.',
          'Benar. Turn off the light berarti mematikan lampu.',
          'Turn down berarti menurunkan intensitas, bukan mematikan sepenuhnya.',
          'Live berarti hidup atau tinggal. Di sini perlu leave: pergi.'
        ]
      },
      tr: {
        prompt: 'Çıkarken ışığı kapat',
        explanations: [
          'Of bu phrasal verb değildir. Bir şeyi kapatmak için iki f ile off kullanırız.',
          'Doğru. Turn off the light ışığı kapat demektir.',
          'Turn down ışığın şiddetini azaltmak demektir, tamamen kapatmak değil.',
          'Live yaşamak demektir. Burada leave gerekir: ayrılmak.'
        ]
      },
      pl: {
        prompt: 'Wyłącz światło, kiedy będziesz wychodzić',
        explanations: [
          'Of nie jest tym phrasal verb. Żeby coś wyłączyć, używamy off z dwoma f.',
          'Dobrze. Turn off the light znaczy wyłącz światło.',
          'Turn down znaczy zmniejszyć intensywność, nie całkiem wyłączyć.',
          'Live znaczy żyć albo mieszkać. Tutaj potrzebujesz leave: wychodzić.'
        ]
      }
    },
    '181': {
      'pt-BR': {
        prompt: 'Eu nunca experimentei sushi',
        explanations: [
          'Past simple pode aparecer em alguns contextos, mas aqui falamos de experiência de vida sem data exata. A resposta-alvo é present perfect.',
          'Correto. I have never tried sushi fala de uma experiência que chega até agora.',
          'Tired significa cansado. Aqui precisamos de tried: experimentou.',
          'Never já deixa a frase negativa. Haven\'t never cria uma dupla negação que não queremos aqui.'
        ]
      },
      vi: {
        prompt: 'Tôi chưa bao giờ thử sushi',
        explanations: [
          'Past simple có thể xuất hiện trong một số ngữ cảnh, nhưng ở đây nói về trải nghiệm trong đời không có thời điểm cụ thể. Đáp án mục tiêu là present perfect.',
          'Đúng. I have never tried sushi nói về trải nghiệm kéo dài đến hiện tại.',
          'Tired nghĩa là mệt. Ở đây cần tried: đã thử.',
          'Never đã làm câu mang nghĩa phủ định. Haven\'t never tạo phủ định kép không cần thiết.'
        ]
      },
      id: {
        prompt: 'Saya belum pernah mencoba sushi',
        explanations: [
          'Past simple bisa muncul dalam beberapa konteks, tetapi di sini kita membahas pengalaman hidup tanpa waktu spesifik. Targetnya present perfect.',
          'Benar. I have never tried sushi membahas pengalaman sampai sekarang.',
          'Tired berarti lelah. Di sini perlu tried: mencoba.',
          'Never sudah membuat kalimat negatif. Haven\'t never membuat negasi ganda yang tidak kita mau.'
        ]
      },
      tr: {
        prompt: 'Hiç suşi denemedim',
        explanations: [
          'Past simple bazı bağlamlarda görülebilir, ama burada belirli zamanı olmayan yaşam deneyimi anlatılıyor. Hedef cevap present perfect.',
          'Doğru. I have never tried sushi bugüne kadar olan deneyimi anlatır.',
          'Tired yorgun demektir. Burada tried gerekir: denedi.',
          'Never cümleyi zaten olumsuz yapar. Haven\'t never istemediğimiz çift olumsuzluk oluşturur.'
        ]
      },
      pl: {
        prompt: 'Nigdy nie próbowałem sushi',
        explanations: [
          'Past simple może pojawić się w niektórych kontekstach, ale tutaj mówimy o doświadczeniu życiowym bez konkretnej daty. Celem jest present perfect.',
          'Dobrze. I have never tried sushi mówi o doświadczeniu aż do teraz.',
          'Tired znaczy zmęczony. Tutaj potrzebujesz tried: próbowałem.',
          'Never już robi zdanie przeczące. Haven\'t never tworzy podwójne przeczenie, którego tu nie chcemy.'
        ]
      }
    },
    '182': {
      'pt-BR': {
        prompt: 'Você não deveria desistir de tentar aprender isso',
        explanations: [
          'Depois de give up não usamos to + verbo. Precisamos de give up + -ing.',
          'Correto. Give up trying significa desistir de tentar.',
          'Crying significa chorando. Aqui precisamos de trying: tentando.',
          'Give up não vai com try sem terminação. Falta -ing: trying.'
        ]
      },
      vi: {
        prompt: 'Bạn không nên từ bỏ việc cố học điều này',
        explanations: [
          'Sau give up không dùng to + động từ. Cần give up + -ing.',
          'Đúng. Give up trying nghĩa là từ bỏ việc cố gắng.',
          'Crying nghĩa là khóc. Ở đây cần trying: cố gắng.',
          'Give up không đi với try nguyên thể ở đây. Thiếu -ing: trying.'
        ]
      },
      id: {
        prompt: 'Kamu sebaiknya tidak menyerah mencoba mempelajari ini',
        explanations: [
          'Setelah give up jangan gunakan to + verb. Perlu give up + -ing.',
          'Benar. Give up trying berarti berhenti mencoba.',
          'Crying berarti menangis. Di sini perlu trying: mencoba.',
          'Give up tidak diikuti try polos. Kurang -ing: trying.'
        ]
      },
      tr: {
        prompt: 'Bunu öğrenmeye çalışmaktan vazgeçmemelisin',
        explanations: [
          'Give up sonrasında to + fiil kullanmayız. Give up + -ing gerekir.',
          'Doğru. Give up trying denemekten vazgeçmek demektir.',
          'Crying ağlamak demektir. Burada trying gerekir: denemek.',
          'Give up çıplak try ile gelmez. -ing eksik: trying.'
        ]
      },
      pl: {
        prompt: 'Nie powinieneś rezygnować z prób nauczenia się tego',
        explanations: [
          'Po give up nie używamy to + czasownik. Potrzebujemy give up + -ing.',
          'Dobrze. Give up trying znaczy przestać próbować.',
          'Crying znaczy płacząc. Tutaj potrzebujesz trying: próbując.',
          'Give up nie łączy się z gołym try. Brakuje -ing: trying.'
        ]
      }
    },
    '183': {
      'pt-BR': {
        prompt: 'Ele costumava ter cabelo comprido',
        explanations: [
          'Used to para hábitos ou estados do passado vai com verbo base: have, não having.',
          'Correto. He used to have long hair significa que antes ele tinha cabelo comprido.',
          'Air significa ar. Aqui precisamos de hair: cabelo.',
          'Na afirmativa precisamos de used to com d: He used to have.'
        ]
      },
      vi: {
        prompt: 'Trước đây anh ấy từng để tóc dài',
        explanations: [
          'Used to cho thói quen hoặc trạng thái trong quá khứ đi với động từ nguyên mẫu: have, không phải having.',
          'Đúng. He used to have long hair nghĩa là trước đây anh ấy từng có tóc dài.',
          'Air nghĩa là không khí. Ở đây cần hair: tóc.',
          'Trong câu khẳng định cần used to có chữ d: He used to have.'
        ]
      },
      id: {
        prompt: 'Dulu dia berambut panjang',
        explanations: [
          'Used to untuk kebiasaan atau keadaan masa lalu diikuti base verb: have, bukan having.',
          'Benar. He used to have long hair berarti dulu dia berambut panjang.',
          'Air berarti udara. Di sini perlu hair: rambut.',
          'Dalam kalimat positif perlu used to dengan d: He used to have.'
        ]
      },
      tr: {
        prompt: 'Eskiden uzun saçları vardı',
        explanations: [
          'Geçmiş alışkanlık veya durum için used to sonrasında fiilin yalın hali gelir: have, having değil.',
          'Doğru. He used to have long hair eskiden uzun saçları vardı demektir.',
          'Air hava demektir. Burada hair gerekir: saç.',
          'Olumlu cümlede d ile used to gerekir: He used to have.'
        ]
      },
      pl: {
        prompt: 'Kiedyś miał długie włosy',
        explanations: [
          'Used to dla dawnych nawyków albo stanów łączy się z podstawową formą czasownika: have, nie having.',
          'Dobrze. He used to have long hair znaczy, że kiedyś miał długie włosy.',
          'Air znaczy powietrze. Tutaj potrzebujesz hair: włosy.',
          'W zdaniu twierdzącym potrzebujemy used to z d: He used to have.'
        ]
      }
    },
    '184': {
      'pt-BR': {
        prompt: 'Esta é a mulher que trabalha no nosso escritório',
        explanations: [
          'Which normalmente usamos para coisas ou animais. Woman é uma pessoa, então precisamos de who.',
          'Correto. Who works liga woman a works in our office.',
          'Whose marca posse. Aqui não falamos de algo que pertence à mulher.',
          'Walks significa caminha. Aqui precisamos de works: trabalha.'
        ]
      },
      vi: {
        prompt: 'Đây là người phụ nữ làm việc trong văn phòng của chúng tôi',
        explanations: [
          'Which thường dùng cho đồ vật hoặc động vật. Woman là người, nên cần who.',
          'Đúng. Who works nối woman với works in our office.',
          'Whose chỉ sở hữu. Ở đây không nói về thứ gì thuộc về người phụ nữ.',
          'Walks nghĩa là đi bộ. Ở đây cần works: làm việc.'
        ]
      },
      id: {
        prompt: 'Ini wanita yang bekerja di kantor kami',
        explanations: [
          'Which biasanya dipakai untuk benda atau hewan. Woman adalah orang, jadi perlu who.',
          'Benar. Who works menghubungkan woman dengan works in our office.',
          'Whose menandai kepemilikan. Di sini kita tidak membahas sesuatu milik wanita itu.',
          'Walks berarti berjalan. Di sini perlu works: bekerja.'
        ]
      },
      tr: {
        prompt: 'Bu, ofisimizde çalışan kadın',
        explanations: [
          'Which genelde nesneler veya hayvanlar için kullanılır. Woman kişi olduğu için who gerekir.',
          'Doğru. Who works, woman ile works in our office kısmını bağlar.',
          'Whose sahiplik gösterir. Burada kadına ait bir şeyden bahsetmiyoruz.',
          'Walks yürür demektir. Burada works gerekir: çalışır.'
        ]
      },
      pl: {
        prompt: 'To kobieta, która pracuje w naszym biurze',
        explanations: [
          'Which zwykle używamy do rzeczy albo zwierząt. Woman to osoba, więc potrzebujemy who.',
          'Dobrze. Who works łączy woman z works in our office.',
          'Whose oznacza posiadanie. Tutaj nie mówimy o czymś, co należy do tej kobiety.',
          'Walks znaczy chodzi. Tutaj potrzebujesz works: pracuje.'
        ]
      }
    },
    '185': {
      'pt-BR': {
        prompt: 'Acabei de terminar o relatório',
        explanations: [
          'Essa frase pode ser gramatical com just now, mas aqui treinamos present perfect com just.',
          'Correto. I have just finished the report significa que acabei de terminar o relatório.',
          'Resort significa resort ou complexo turístico. Aqui precisamos de report: relatório.',
          'Depois de have precisamos do particípio: finished, não finish.'
        ]
      },
      vi: {
        prompt: 'Tôi vừa hoàn thành báo cáo',
        explanations: [
          'Câu này có thể đúng với just now, nhưng ở đây đang luyện present perfect với just.',
          'Đúng. I have just finished the report nghĩa là tôi vừa hoàn thành báo cáo.',
          'Resort nghĩa là khu nghỉ dưỡng. Ở đây cần report: báo cáo.',
          'Sau have cần phân từ: finished, không phải finish.'
        ]
      },
      id: {
        prompt: 'Saya baru saja menyelesaikan laporan',
        explanations: [
          'Kalimat ini bisa gramatikal dengan just now, tetapi di sini latihan present perfect dengan just.',
          'Benar. I have just finished the report berarti saya baru saja menyelesaikan laporan.',
          'Resort berarti resor. Di sini perlu report: laporan.',
          'Setelah have perlu participle: finished, bukan finish.'
        ]
      },
      tr: {
        prompt: 'Raporu az önce bitirdim',
        explanations: [
          'Bu cümle just now ile gramatik olabilir, ama burada just ile present perfect çalışıyoruz.',
          'Doğru. I have just finished the report raporu az önce bitirdim demektir.',
          'Resort tatil tesisi demektir. Burada report gerekir: rapor.',
          'Have sonrasında participle gerekir: finished, finish değil.'
        ]
      },
      pl: {
        prompt: 'Właśnie skończyłem raport',
        explanations: [
          'To zdanie może być gramatyczne z just now, ale tutaj ćwiczymy present perfect z just.',
          'Dobrze. I have just finished the report znaczy, że właśnie skończyłem raport.',
          'Resort znaczy kurort. Tutaj potrzebujesz report: raport.',
          'Po have potrzebujemy imiesłowu: finished, nie finish.'
        ]
      }
    },
    '186': {
      'pt-BR': {
        prompt: 'Eu estava lendo quando o telefone tocou',
        explanations: [
          'Read aqui não mostra bem a ação em progresso. Precisamos de was reading.',
          'Correto. Was reading mostra a ação de fundo, e rang marca o momento do telefone.',
          'Rung precisa de have. No past simple usamos rang. Termo-chave em ingl?s: when..',
          'Leading significa liderando ou guiando. Aqui precisamos de reading: lendo.'
        ]
      },
      vi: {
        prompt: 'Tôi đang đọc thì điện thoại reo',
        explanations: [
          'Read ở đây không thể hiện rõ hành động đang diễn ra. Cần was reading.',
          'Đúng. Was reading cho thấy hành động nền, còn rang là khoảnh khắc điện thoại reo.',
          'Rung cần have. Ở past simple dùng rang. Thu?t ng? ti?ng Anh c?n gi?: when..',
          'Leading nghĩa là dẫn đầu hoặc dẫn dắt. Ở đây cần reading: đang đọc.'
        ]
      },
      id: {
        prompt: 'Saya sedang membaca ketika telepon berdering',
        explanations: [
          'Read di sini tidak menunjukkan aksi yang sedang berlangsung dengan jelas. Perlu was reading.',
          'Benar. Was reading menunjukkan aksi latar, dan rang menandai momen telepon berbunyi.',
          'Rung perlu have. Dalam past simple gunakan rang. Istilah Inggris yang perlu dipertahankan: when..',
          'Leading berarti memimpin atau membimbing. Di sini perlu reading: membaca.'
        ]
      },
      tr: {
        prompt: 'Telefon çaldığında okuyordum',
        explanations: [
          'Read burada devam eden eylemi iyi göstermez. Was reading gerekir.',
          'Doğru. Was reading arka plandaki eylemi gösterir, rang ise telefonun çaldığı anı verir.',
          'Rung için have gerekir. Past simple içinde rang kullanırız. Korunmas? gereken ?ngilizce terim: when..',
          'Leading liderlik etmek veya yönlendirmek demektir. Burada reading gerekir: okumak.'
        ]
      },
      pl: {
        prompt: 'Czytałem, kiedy zadzwonił telefon',
        explanations: [
          'Read tutaj nie pokazuje dobrze czynności w toku. Potrzebujemy was reading.',
          'Dobrze. Was reading pokazuje czynność w tle, a rang moment telefonu.',
          'Rung potrzebuje have. W past simple używamy rang. Angielski termin do zachowania: when..',
          'Leading znaczy prowadząc. Tutaj potrzebujesz reading: czytając.'
        ]
      }
    },
    '187': {
      'pt-BR': {
        prompt: 'Este é o livro de que eu mais gosto',
        explanations: [
          'What não funciona como relativo depois de book nesta frase. Precisamos de that ou which.',
          'Who é para pessoas. Book é uma coisa.',
          'Correto. That liga book a I like most de forma natural.',
          'Cook significa cozinheiro. Aqui precisamos de book: livro.'
        ]
      },
      vi: {
        prompt: 'Đây là cuốn sách mà tôi thích nhất',
        explanations: [
          'What không dùng như đại từ quan hệ sau book trong câu này. Cần that hoặc which.',
          'Who dùng cho người. Book là đồ vật.',
          'Đúng. That nối book với I like most một cách tự nhiên.',
          'Cook nghĩa là đầu bếp. Ở đây cần book: sách.'
        ]
      },
      id: {
        prompt: 'Ini buku yang paling saya suka',
        explanations: [
          'What tidak berfungsi sebagai relative setelah book dalam kalimat ini. Perlu that atau which.',
          'Who dipakai untuk orang. Book adalah benda.',
          'Benar. That menghubungkan book dengan I like most secara alami.',
          'Cook berarti juru masak. Di sini perlu book: buku.'
        ]
      },
      tr: {
        prompt: 'En çok sevdiğim kitap bu',
        explanations: [
          'What bu cümlede book sonrasında relative olarak çalışmaz. That veya which gerekir.',
          'Who kişiler için kullanılır. Book bir nesnedir.',
          'Doğru. That, book ile I like most kısmını doğal biçimde bağlar.',
          'Cook aşçı demektir. Burada book gerekir: kitap.'
        ]
      },
      pl: {
        prompt: 'To książka, którą lubię najbardziej',
        explanations: [
          'What nie działa jako zaimek względny po book w tym zdaniu. Potrzebujemy that albo which.',
          'Who jest dla osób. Book to rzecz.',
          'Dobrze. That naturalnie łączy book z I like most.',
          'Cook znaczy kucharz. Tutaj potrzebujesz book: książka.'
        ]
      }
    },
    '188': {
      'pt-BR': {
        prompt: 'Minha carteira foi roubada',
        explanations: [
          'My wallet stole soa como se a carteira tivesse roubado algo. Aqui precisamos de passiva.',
          'Correto. My wallet was stolen coloca a carteira como vítima da ação.',
          'Stalled significa parou ou travou. Aqui precisamos de stolen: roubada.',
          'Has stolen ainda soa ativo. Para passiva seria has been stolen, mas aqui a opção correta é was stolen.'
        ]
      },
      vi: {
        prompt: 'Ví của tôi đã bị đánh cắp',
        explanations: [
          'My wallet stole nghe như cái ví đi ăn cắp thứ gì đó. Ở đây cần bị động.',
          'Đúng. My wallet was stolen đặt cái ví là nạn nhân của hành động.',
          'Stalled nghĩa là bị kẹt hoặc dừng lại. Ở đây cần stolen: bị đánh cắp.',
          'Has stolen vẫn nghe như chủ động. Bị động sẽ là has been stolen, nhưng ở đây đáp án đúng là was stolen.'
        ]
      },
      id: {
        prompt: 'Dompet saya dicuri',
        explanations: [
          'My wallet stole terdengar seperti dompet mencuri sesuatu. Di sini perlu passive.',
          'Benar. My wallet was stolen menempatkan dompet sebagai korban tindakan.',
          'Stalled berarti macet atau terhenti. Di sini perlu stolen: dicuri.',
          'Has stolen masih terdengar aktif. Bentuk pasifnya has been stolen, tetapi di sini jawaban benar adalah was stolen.'
        ]
      },
      tr: {
        prompt: 'Cüzdanım çalındı',
        explanations: [
          'My wallet stole cüzdan bir şey çalmış gibi duyulur. Burada passive gerekir.',
          'Doğru. My wallet was stolen cüzdanı eylemin kurbanı yapar.',
          'Stalled durdu veya takıldı demektir. Burada stolen gerekir: çalınmış.',
          'Has stolen hâlâ aktif duyulur. Passive için has been stolen olurdu, ama burada doğru seçenek was stolen.'
        ]
      },
      pl: {
        prompt: 'Skradziono mi portfel',
        explanations: [
          'My wallet stole brzmi tak, jakby portfel coś ukradł. Tutaj potrzebujemy strony biernej.',
          'Dobrze. My wallet was stolen ustawia portfel jako ofiarę czynności.',
          'Stalled znaczy zatrzymał się albo zaciął. Tutaj potrzebujesz stolen: skradziony.',
          'Has stolen nadal brzmi aktywnie. Strona bierna to has been stolen, ale tutaj poprawna opcja to was stolen.'
        ]
      }
    },
    '189': {
      'pt-BR': {
        prompt: 'Ele sugeriu ir ao cinema',
        explanations: [
          'Depois de suggest não usamos to + verbo. Precisamos de -ing ou uma oração com that.',
          'Correto. He suggested going to the cinema é uma forma natural com gerúndio.',
          'Correto. He suggested that we go to the cinema também é uma estrutura válida.',
          'Gown significa vestido ou toga. Aqui precisamos de going.'
        ]
      },
      vi: {
        prompt: 'Anh ấy gợi ý đi xem phim',
        explanations: [
          'Sau suggest không dùng to + động từ. Cần -ing hoặc mệnh đề với that.',
          'Đúng. He suggested going to the cinema là cách tự nhiên với gerund.',
          'Đúng. He suggested that we go to the cinema cũng là cấu trúc đúng.',
          'Gown nghĩa là áo choàng hoặc lễ phục. Ở đây cần going.'
        ]
      },
      id: {
        prompt: 'Dia menyarankan pergi ke bioskop',
        explanations: [
          'Setelah suggest jangan gunakan to + verb. Perlu -ing atau klausa dengan that.',
          'Benar. He suggested going to the cinema adalah bentuk alami dengan gerund.',
          'Benar. He suggested that we go to the cinema juga struktur yang valid.',
          'Gown berarti gaun atau jubah. Di sini perlu going.'
        ]
      },
      tr: {
        prompt: 'Sinemaya gitmeyi önerdi',
        explanations: [
          'Suggest sonrasında to + fiil kullanmayız. -ing veya that içeren bir yan cümle gerekir.',
          'Doğru. He suggested going to the cinema gerund ile doğal bir yapıdır.',
          'Doğru. He suggested that we go to the cinema da geçerli bir yapıdır.',
          'Gown elbise veya cüppe demektir. Burada going gerekir.'
        ]
      },
      pl: {
        prompt: 'Zaproponował pójście do kina',
        explanations: [
          'Po suggest nie używamy to + czasownik. Potrzebujemy -ing albo zdania z that.',
          'Dobrze. He suggested going to the cinema to naturalna forma z gerundium.',
          'Dobrze. He suggested that we go to the cinema też jest poprawną strukturą.',
          'Gown znaczy suknia albo toga. Tutaj potrzebujesz going.'
        ]
      }
    },
    '190': {
      'pt-BR': {
        prompt: 'Não consigo me acostumar a acordar cedo',
        explanations: [
          'Depois de get used to usamos substantivo ou -ing. Precisamos de waking up.',
          'Correto. I can\'t get used to waking up early significa que não consigo me acostumar a acordar cedo.',
          'Falta a letra d: get used to. Sem used, a estrutura quebra.',
          'Walking significa andando. Aqui precisamos de waking: acordando.'
        ]
      },
      vi: {
        prompt: 'Tôi không thể quen với việc dậy sớm',
        explanations: [
          'Sau get used to dùng danh từ hoặc -ing. Cần waking up.',
          'Đúng. I can\'t get used to waking up early nghĩa là tôi không thể quen với việc dậy sớm.',
          'Thiếu chữ d: get used to. Không có used thì cấu trúc bị sai.',
          'Walking nghĩa là đi bộ. Ở đây cần waking: thức dậy.'
        ]
      },
      id: {
        prompt: 'Saya tidak bisa terbiasa bangun pagi',
        explanations: [
          'Setelah get used to gunakan noun atau -ing. Perlu waking up.',
          'Benar. I can\'t get used to waking up early berarti saya tidak bisa terbiasa bangun pagi.',
          'Kurang huruf d: get used to. Tanpa used, strukturnya rusak.',
          'Walking berarti berjalan. Di sini perlu waking: bangun.'
        ]
      },
      tr: {
        prompt: 'Erken uyanmaya alışamıyorum',
        explanations: [
          'Get used to sonrasında isim veya -ing kullanırız. Waking up gerekir.',
          'Doğru. I can\'t get used to waking up early erken uyanmaya alışamıyorum demektir.',
          'D harfi eksik: get used to. Used olmadan yapı bozulur.',
          'Walking yürümek demektir. Burada waking gerekir: uyanmak.'
        ]
      },
      pl: {
        prompt: 'Nie mogę przyzwyczaić się do wczesnego wstawania',
        explanations: [
          'Po get used to używamy rzeczownika albo formy -ing. Potrzebujemy waking up.',
          'Dobrze. I can\'t get used to waking up early znaczy, że nie mogę przyzwyczaić się do wczesnego wstawania.',
          'Brakuje litery d: get used to. Bez used struktura się rozpada.',
          'Walking znaczy chodząc. Tutaj potrzebujesz waking: budząc się.'
        ]
      }
    },
    '191': {
      'pt-BR': {
        prompt: 'A casa em que eu moro é muito antiga',
        explanations: [
          'Who é para pessoas. House é uma coisa, então aqui não encaixa.',
          'Where já traz a ideia de lugar. Com in no final, esta opção fica duplicada.',
          'Correto. Which I live in liga house à ideia de morar nela.',
          'Leave significa sair ou ir embora. Aqui precisamos de live: morar.'
        ]
      },
      vi: {
        prompt: 'Ngôi nhà nơi tôi sống rất cũ',
        explanations: [
          'Who dùng cho người. House là đồ vật, nên ở đây không phù hợp.',
          'Where đã mang ý nghĩa nơi chốn. Thêm in ở cuối làm câu bị lặp ý.',
          'Đúng. Which I live in nối house với ý sống trong đó.',
          'Leave nghĩa là rời đi. Ở đây cần live: sống.'
        ]
      },
      id: {
        prompt: 'Rumah tempat saya tinggal sangat tua',
        explanations: [
          'Who dipakai untuk orang. House adalah benda, jadi tidak cocok di sini.',
          'Where sudah membawa makna tempat. Dengan in di akhir, opsi ini menjadi rangkap.',
          'Benar. Which I live in menghubungkan house dengan ide tinggal di dalamnya.',
          'Leave berarti pergi atau meninggalkan. Di sini perlu live: tinggal.'
        ]
      },
      tr: {
        prompt: 'Yaşadığım ev çok eski',
        explanations: [
          'Who kişiler için kullanılır. House bir şeydir, bu yüzden burada uymaz.',
          'Where zaten yer anlamını taşır. Sondaki in ile bu seçenek tekrar yapar.',
          'Doğru. Which I live in, house ile içinde yaşama fikrini bağlar.',
          'Leave ayrılmak veya gitmek demektir. Burada live gerekir: yaşamak.'
        ]
      },
      pl: {
        prompt: 'Dom, w którym mieszkam, jest bardzo stary',
        explanations: [
          'Who jest dla osób. House to rzecz, więc tutaj nie pasuje.',
          'Where już zawiera ideę miejsca. Z in na końcu ta opcja robi się zdublowana.',
          'Dobrze. Which I live in łączy house z ideą mieszkania w nim.',
          'Leave znaczy wyjść albo opuścić. Tutaj potrzebujesz live: mieszkać.'
        ]
      }
    },
    '192': {
      'pt-BR': {
        prompt: 'Ela perguntou onde eu tinha comprado esta bolsa',
        explanations: [
          'Where did I buy é ordem de pergunta direta. Depois de asked usamos ordem normal.',
          'Correto. Where I had bought funciona como pergunta indireta com backshift.',
          'Where I buy mistura presente com um relato no passado. Aqui precisamos de bought ou had bought.',
          'Back significa costas ou para trás. Aqui precisamos de bag: bolsa.'
        ]
      },
      vi: {
        prompt: 'Cô ấy hỏi tôi đã mua chiếc túi này ở đâu',
        explanations: [
          'Where did I buy là trật tự câu hỏi trực tiếp. Sau asked dùng trật tự thường.',
          'Đúng. Where I had bought là câu hỏi gián tiếp với backshift.',
          'Where I buy trộn hiện tại với lời thuật lại trong quá khứ. Ở đây cần bought hoặc had bought.',
          'Back nghĩa là lưng hoặc phía sau. Ở đây cần bag: túi.'
        ]
      },
      id: {
        prompt: 'Dia bertanya di mana saya membeli tas ini',
        explanations: [
          'Where did I buy adalah urutan pertanyaan langsung. Setelah asked gunakan urutan biasa.',
          'Benar. Where I had bought bekerja sebagai pertanyaan tidak langsung dengan backshift.',
          'Where I buy mencampur present dengan laporan masa lalu. Di sini perlu bought atau had bought.',
          'Back berarti punggung atau belakang. Di sini perlu bag: tas.'
        ]
      },
      tr: {
        prompt: 'Bu çantayı nereden aldığımı sordu',
        explanations: [
          'Where did I buy doğrudan soru sırasıdır. Asked sonrasında düz sıra kullanılır.',
          'Doğru. Where I had bought backshift içeren dolaylı soru olarak çalışır.',
          'Where I buy şimdiki zamanı geçmişteki aktarımla karıştırır. Burada bought veya had bought gerekir.',
          'Back sırt veya geri demektir. Burada bag gerekir: çanta.'
        ]
      },
      pl: {
        prompt: 'Zapytała, gdzie kupiłem tę torbę',
        explanations: [
          'Where did I buy to szyk pytania bezpośredniego. Po asked używamy zwykłego szyku.',
          'Dobrze. Where I had bought działa jako pytanie pośrednie z backshift.',
          'Where I buy miesza teraźniejszość z relacją w przeszłości. Tutaj potrzebujemy bought albo had bought.',
          'Back znaczy plecy albo wstecz. Tutaj potrzebujesz bag: torba.'
        ]
      }
    },
    '193': {
      'pt-BR': {
        prompt: 'Antes eu trabalhava em um banco grande',
        explanations: [
          'Correto. Used to work mostra uma situação habitual do passado que já não é igual.',
          'Usually worked fala de frequência no passado, mas não mostra tão claramente o contraste com agora.',
          'Walk significa caminhar. Aqui precisamos de work: trabalhar.',
          'Falta to. A estrutura é used to + verbo base.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi từng làm việc ở một ngân hàng lớn',
        explanations: [
          'Đúng. Used to work cho thấy một tình trạng quen thuộc trong quá khứ mà bây giờ không còn như vậy.',
          'Usually worked nói về tần suất trong quá khứ, nhưng không nêu rõ sự tương phản với hiện tại.',
          'Walk nghĩa là đi bộ. Ở đây cần work: làm việc.',
          'Thiếu to. Cấu trúc là used to + động từ nguyên mẫu.'
        ]
      },
      id: {
        prompt: 'Dulu saya bekerja di bank besar',
        explanations: [
          'Benar. Used to work menunjukkan keadaan kebiasaan masa lalu yang sekarang tidak sama lagi.',
          'Usually worked membahas frekuensi di masa lalu, tetapi tidak sejelas kontras dengan sekarang.',
          'Walk berarti berjalan. Di sini perlu work: bekerja.',
          'Kurang to. Strukturnya used to + base verb.'
        ]
      },
      tr: {
        prompt: 'Eskiden büyük bir bankada çalışırdım',
        explanations: [
          'Doğru. Used to work artık aynı olmayan geçmiş bir durumu gösterir.',
          'Usually worked geçmişteki sıklığı anlatır, ama şimdiyle olan karşıtlığı o kadar net vermez.',
          'Walk yürümek demektir. Burada work gerekir: çalışmak.',
          'To eksik. Yapı used to + fiilin yalın halidir.'
        ]
      },
      pl: {
        prompt: 'Kiedyś pracowałem w dużym banku',
        explanations: [
          'Dobrze. Used to work pokazuje dawną sytuację, która teraz nie jest już taka sama.',
          'Usually worked mówi o częstotliwości w przeszłości, ale nie pokazuje tak jasno kontrastu z teraz.',
          'Walk znaczy chodzić. Tutaj potrzebujesz work: pracować.',
          'Brakuje to. Struktura to used to + podstawowa forma czasownika.'
        ]
      }
    },
    '194': {
      'pt-BR': {
        prompt: 'Ele finalmente parou de fumar',
        explanations: [
          'Depois de give up não usamos to + verbo. Precisamos de give up + -ing.',
          'Correto. Gave up smoking significa parou de fumar.',
          'Smoking\'s não funciona aqui. Não precisamos de possessivo nem contração.',
          'Smocking é outra palavra ligada a costura ou franzido. Aqui precisamos de smoking.'
        ]
      },
      vi: {
        prompt: 'Cuối cùng anh ấy đã bỏ hút thuốc',
        explanations: [
          'Sau give up không dùng to + động từ. Cần give up + -ing.',
          'Đúng. Gave up smoking nghĩa là đã bỏ hút thuốc.',
          'Smoking\'s không dùng ở đây. Không cần sở hữu cách hay rút gọn.',
          'Smocking là một từ khác liên quan đến may mặc hoặc xếp nếp. Ở đây cần smoking.'
        ]
      },
      id: {
        prompt: 'Dia akhirnya berhenti merokok',
        explanations: [
          'Setelah give up jangan gunakan to + verb. Perlu give up + -ing.',
          'Benar. Gave up smoking berarti berhenti merokok.',
          'Smoking\'s tidak berfungsi di sini. Tidak perlu possessive atau contraction.',
          'Smocking adalah kata lain yang terkait jahitan atau kerutan kain. Di sini perlu smoking.'
        ]
      },
      tr: {
        prompt: 'Sonunda sigarayı bıraktı',
        explanations: [
          'Give up sonrasında to + fiil kullanmayız. Give up + -ing gerekir.',
          'Doğru. Gave up smoking sigarayı bıraktı demektir.',
          'Smoking\'s burada çalışmaz. İyelik veya kısaltma gerekmiyor.',
          'Smocking dikiş veya kumaş büzgüsüyle ilgili başka bir kelimedir. Burada smoking gerekir.'
        ]
      },
      pl: {
        prompt: 'W końcu rzucił palenie',
        explanations: [
          'Po give up nie używamy to + czasownik. Potrzebujemy give up + -ing.',
          'Dobrze. Gave up smoking znaczy rzucił palenie.',
          'Smoking\'s tutaj nie działa. Nie potrzebujemy dzierżawy ani skrótu.',
          'Smocking to inne słowo związane z szyciem albo marszczeniem materiału. Tutaj potrzebujesz smoking.'
        ]
      }
    },
    '195': {
      'pt-BR': {
        prompt: 'Ela disse que viria mais tarde',
        explanations: [
          'Will pode ficar se a frase ainda for atual, mas aqui treinamos backshift depois de said: would.',
          'Correto. Said that she would come later é reported speech padrão.',
          'Told normalmente precisa de objeto: told me, told him. Aqui usamos said.',
          'Calm significa acalmar ou calmo. Aqui precisamos de come: vir.'
        ]
      },
      vi: {
        prompt: 'Cô ấy nói rằng cô ấy sẽ đến muộn hơn',
        explanations: [
          'Will có thể giữ lại nếu câu vẫn còn hiện hành, nhưng ở đây luyện backshift sau said: would.',
          'Đúng. Said that she would come later là reported speech chuẩn.',
          'Told thường cần tân ngữ: told me, told him. Ở đây dùng said.',
          'Calm nghĩa là bình tĩnh hoặc làm dịu. Ở đây cần come: đến.'
        ]
      },
      id: {
        prompt: 'Dia berkata bahwa dia akan datang nanti',
        explanations: [
          'Will bisa tetap jika kalimatnya masih aktual, tetapi di sini latihan backshift setelah said: would.',
          'Benar. Said that she would come later adalah reported speech standar.',
          'Told biasanya perlu object: told me, told him. Di sini gunakan said.',
          'Calm berarti tenang atau menenangkan. Di sini perlu come: datang.'
        ]
      },
      tr: {
        prompt: 'Daha sonra geleceğini söyledi',
        explanations: [
          'Cümle hâlâ güncelse will kalabilir, ama burada said sonrasında backshift çalışıyoruz: would.',
          'Doğru. Said that she would come later standart reported speech yapısıdır.',
          'Told genelde nesne ister: told me, told him. Burada said kullanırız.',
          'Calm sakin veya sakinleşmek demektir. Burada come gerekir: gelmek.'
        ]
      },
      pl: {
        prompt: 'Powiedziała, że przyjdzie później',
        explanations: [
          'Will może zostać, jeśli zdanie nadal jest aktualne, ale tutaj ćwiczymy backshift po said: would.',
          'Dobrze. Said that she would come later to standardowy reported speech.',
          'Told zwykle potrzebuje dopełnienia: told me, told him. Tutaj używamy said.',
          'Calm znaczy spokojny albo uspokoić. Tutaj potrzebujesz come: przyjść.'
        ]
      }
    },
    '196': {
      'pt-BR': {
        prompt: 'Espere por mim cinco minutos',
        explanations: [
          'Correto. Wait for me é a parte-chave: em inglês esperamos for someone.',
          'Falta for. Wait me não funciona em inglês padrão para esperar alguém.',
          'Weight significa peso. Aqui precisamos de wait: esperar.',
          'Waiting não funciona como imperativo. Para pedir, usamos wait.'
        ]
      },
      vi: {
        prompt: 'Hãy đợi tôi năm phút',
        explanations: [
          'Đúng. Wait for me là phần quan trọng: trong tiếng Anh ta wait for someone.',
          'Thiếu for. Wait me không dùng trong tiếng Anh chuẩn để nói đợi ai đó.',
          'Weight nghĩa là cân nặng. Ở đây cần wait: đợi.',
          'Waiting không dùng như mệnh lệnh. Để yêu cầu, dùng wait.'
        ]
      },
      id: {
        prompt: 'Tunggu saya lima menit',
        explanations: [
          'Benar. Wait for me adalah bagian penting: dalam bahasa Inggris kita wait for someone.',
          'Kurang for. Wait me tidak berfungsi dalam bahasa Inggris standar untuk menunggu seseorang.',
          'Weight berarti berat. Di sini perlu wait: menunggu.',
          'Waiting tidak berfungsi sebagai perintah. Untuk meminta, gunakan wait.'
        ]
      },
      tr: {
        prompt: 'Beni beş dakika bekle',
        explanations: [
          'Doğru. Wait for me kilit kısımdır: İngilizcede wait for someone deriz.',
          'For eksik. Birini beklemek için standart İngilizcede wait me kullanılmaz.',
          'Weight ağırlık demektir. Burada wait gerekir: beklemek.',
          'Waiting emir olarak çalışmaz. Rica etmek için wait kullanırız.'
        ]
      },
      pl: {
        prompt: 'Poczekaj na mnie pięć minut',
        explanations: [
          'Dobrze. Wait for me to kluczowa część: po angielsku czekamy for someone.',
          'Brakuje for. Wait me nie działa w standardowym angielskim, gdy czekamy na kogoś.',
          'Weight znaczy waga. Tutaj potrzebujesz wait: czekać.',
          'Waiting nie działa jako tryb rozkazujący. Żeby poprosić, używamy wait.'
        ]
      }
    },
    '197': {
      'pt-BR': {
        prompt: 'Alguém está de pé no jardim',
        explanations: [
          'Correto. Somebody fala de uma pessoa não identificada que está ali agora.',
          'Anyone costuma aparecer em perguntas, negativas ou no sentido de qualquer pessoa. Aqui queremos alguém específico.',
          'Stands soa mais como hábito ou posição geral. Agora precisamos de is standing.',
          'Some body separado soa como algum corpo. Aqui precisamos de somebody junto.'
        ]
      },
      vi: {
        prompt: 'Có ai đó đang đứng trong vườn',
        explanations: [
          'Đúng. Somebody nói về một người chưa xác định đang ở đó bây giờ.',
          'Anyone thường dùng trong câu hỏi, phủ định hoặc nghĩa bất kỳ ai. Ở đây cần một người cụ thể nào đó.',
          'Stands nghe giống thói quen hoặc vị trí chung. Ngay lúc này cần is standing.',
          'Some body tách ra nghe như một cơ thể nào đó. Ở đây cần viết liền: somebody.'
        ]
      },
      id: {
        prompt: 'Seseorang sedang berdiri di taman',
        explanations: [
          'Benar. Somebody membahas orang tak dikenal yang sedang ada di sana sekarang.',
          'Anyone biasanya muncul dalam pertanyaan, negatif, atau makna siapa pun. Di sini maksudnya seseorang yang spesifik.',
          'Stands terdengar seperti kebiasaan atau posisi umum. Saat ini perlu is standing.',
          'Some body terpisah terdengar seperti sebuah tubuh. Di sini perlu somebody digabung.'
        ]
      },
      tr: {
        prompt: 'Bahçede biri duruyor',
        explanations: [
          'Doğru. Somebody şu anda orada duran kimliği belirsiz bir kişiyi anlatır.',
          'Anyone genelde soru, olumsuz cümle veya herhangi biri anlamında kullanılır. Burada belirli ama bilinmeyen biri gerekir.',
          'Stands daha çok alışkanlık veya genel duruş gibi duyulur. Şu anda is standing gerekir.',
          'Some body ayrı yazılınca bir beden gibi duyulur. Burada birleşik somebody gerekir.'
        ]
      },
      pl: {
        prompt: 'Ktoś stoi w ogrodzie',
        explanations: [
          'Dobrze. Somebody mówi o niezidentyfikowanej osobie, która jest tam teraz.',
          'Anyone zwykle pojawia się w pytaniach, przeczeniach albo w znaczeniu ktokolwiek. Tutaj chodzi o kogoś konkretnego.',
          'Stands brzmi bardziej jak nawyk albo ogólna pozycja. Teraz potrzebujemy is standing.',
          'Some body osobno brzmi jak jakieś ciało. Tutaj potrzebujesz somebody razem.'
        ]
      }
    },
    '198': {
      'pt-BR': {
        prompt: 'Perdi minhas chaves',
        explanations: [
          'Correto. I have lost my keys mostra o resultado atual: agora não estou com as chaves.',
          'Kiss significa beijo. Aqui precisamos de keys: chaves.',
          'I lost my keys pode ser gramatical, especialmente em AmE, mas este cartão treina present perfect com resultado agora.',
          'Depois de have precisamos do particípio: lost, não lose.'
        ]
      },
      vi: {
        prompt: 'Tôi đã mất chìa khóa',
        explanations: [
          'Đúng. I have lost my keys cho thấy kết quả hiện tại: bây giờ tôi không có chìa khóa.',
          'Kiss nghĩa là nụ hôn. Ở đây cần keys: chìa khóa.',
          'I lost my keys có thể đúng ngữ pháp, nhất là trong AmE, nhưng thẻ này luyện present perfect với kết quả hiện tại.',
          'Sau have cần phân từ: lost, không phải lose.'
        ]
      },
      id: {
        prompt: 'Saya kehilangan kunci saya',
        explanations: [
          'Benar. I have lost my keys menunjukkan hasil sekarang: kuncinya tidak ada.',
          'Kiss berarti ciuman. Di sini perlu keys: kunci.',
          'I lost my keys bisa gramatikal, terutama dalam AmE, tetapi kartu ini melatih present perfect dengan hasil sekarang.',
          'Setelah have perlu participle: lost, bukan lose.'
        ]
      },
      tr: {
        prompt: 'Anahtarlarımı kaybettim',
        explanations: [
          'Doğru. I have lost my keys şu anki sonucu gösterir: anahtarlar yok.',
          'Kiss öpücük demektir. Burada keys gerekir: anahtarlar.',
          'I lost my keys özellikle AmE içinde gramatik olabilir, ama bu kart şu anki sonuçla present perfect çalıştırır.',
          'Have sonrasında participle gerekir: lost, lose değil.'
        ]
      },
      pl: {
        prompt: 'Zgubiłem klucze',
        explanations: [
          'Dobrze. I have lost my keys pokazuje obecny rezultat: teraz nie mam kluczy.',
          'Kiss znaczy pocałunek. Tutaj potrzebujesz keys: klucze.',
          'I lost my keys może być gramatyczne, zwłaszcza w AmE, ale ta karta ćwiczy present perfect z obecnym rezultatem.',
          'Po have potrzebujemy imiesłowu: lost, nie lose.'
        ]
      }
    },
    '199': {
      'pt-BR': {
        prompt: 'Se eu tivesse tempo agora, iria com você',
        explanations: [
          'Have mistura presente real com would. Para uma situação imaginária usamos had.',
          'Correto. If I had..., I would... expressa uma situação imaginária agora.',
          'Will não encaixa com condição imaginária. Aqui precisamos de would. Termo-chave em ingl?s: had..',
          'Thyme significa tomilho. Aqui precisamos de time: tempo.'
        ]
      },
      vi: {
        prompt: 'Nếu bây giờ tôi có thời gian, tôi sẽ đi cùng bạn',
        explanations: [
          'Have trộn hiện tại thực với would. Với tình huống tưởng tượng, dùng had.',
          'Đúng. If I had..., I would... diễn tả tình huống tưởng tượng ở hiện tại.',
          'Will không hợp với điều kiện tưởng tượng. Ở đây cần would. Thu?t ng? ti?ng Anh c?n gi?: had..',
          'Thyme nghĩa là cỏ xạ hương. Ở đây cần time: thời gian.'
        ]
      },
      id: {
        prompt: 'Jika saya punya waktu sekarang, saya akan pergi denganmu',
        explanations: [
          'Have mencampur present nyata dengan would. Untuk situasi imajiner, gunakan had.',
          'Benar. If I had..., I would... menyatakan situasi imajiner sekarang.',
          'Will tidak cocok dengan kondisi imajiner. Di sini perlu would. Istilah Inggris yang perlu dipertahankan: had..',
          'Thyme berarti timi. Di sini perlu time: waktu.'
        ]
      },
      tr: {
        prompt: 'Şu anda zamanım olsaydı seninle giderdim',
        explanations: [
          'Have gerçek şimdiki zamanla would yapısını karıştırır. Hayali durum için had kullanırız.',
          'Doğru. If I had..., I would... şu anki hayali bir durumu anlatır.',
          'Will hayali koşulla uymaz. Burada would gerekir. Korunmas? gereken ?ngilizce terim: had..',
          'Thyme kekik demektir. Burada time gerekir: zaman.'
        ]
      },
      pl: {
        prompt: 'Gdybym miał teraz czas, poszedłbym z tobą',
        explanations: [
          'Have miesza realną teraźniejszość z would. Dla sytuacji wyobrażonej używamy had.',
          'Dobrze. If I had..., I would... wyraża sytuację wyobrażoną teraz.',
          'Will nie pasuje do warunku wyobrażonego. Tutaj potrzebujemy would. Angielski termin do zachowania: had..',
          'Thyme znaczy tymianek. Tutaj potrzebujesz time: czas.'
        ]
      }
    },
    '200': {
      'pt-BR': {
        prompt: 'Gosto de ouvir música',
        explanations: [
          'Depois de enjoy não usamos to + verbo. Precisamos de enjoy + -ing.',
          'Correto. Enjoy listening to music soa natural e mantém listen to.',
          'Falta to. Em inglês dizemos listen to music.',
          'Glistening significa brilhando. Aqui precisamos de listening: ouvindo.'
        ]
      },
      vi: {
        prompt: 'Tôi thích nghe nhạc',
        explanations: [
          'Sau enjoy không dùng to + động từ. Cần enjoy + -ing.',
          'Đúng. Enjoy listening to music nghe tự nhiên và giữ đúng listen to.',
          'Thiếu to. Tiếng Anh nói listen to music.',
          'Glistening nghĩa là lấp lánh. Ở đây cần listening: nghe.'
        ]
      },
      id: {
        prompt: 'Saya suka mendengarkan musik',
        explanations: [
          'Setelah enjoy jangan gunakan to + verb. Perlu enjoy + -ing.',
          'Benar. Enjoy listening to music terdengar alami dan tetap memakai listen to.',
          'Kurang to. Dalam bahasa Inggris kita mengatakan listen to music.',
          'Glistening berarti berkilau. Di sini perlu listening: mendengarkan.'
        ]
      },
      tr: {
        prompt: 'Müzik dinlemeyi seviyorum',
        explanations: [
          'Enjoy sonrasında to + fiil kullanmayız. Enjoy + -ing gerekir.',
          'Doğru. Enjoy listening to music doğal duyulur ve listen to yapısını korur.',
          'To eksik. İngilizcede listen to music deriz.',
          'Glistening parıldamak demektir. Burada listening gerekir: dinlemek.'
        ]
      },
      pl: {
        prompt: 'Lubię słuchać muzyki',
        explanations: [
          'Po enjoy nie używamy to + czasownik. Potrzebujemy enjoy + -ing.',
          'Dobrze. Enjoy listening to music brzmi naturalnie i zachowuje listen to.',
          'Brakuje to. Po angielsku mówimy listen to music.',
          'Glistening znaczy błyszcząc. Tutaj potrzebujesz listening: słuchając.'
        ]
      }
    },
    '201': {
      'pt-BR': {
        prompt: 'Ela me pediu para abrir a janela',
        explanations: [
          'Correto. Ask + object + to + verbo funciona para pedir que alguém faça algo.',
          'Falta to. Depois de asked me precisamos de to open.',
          'Asked me that I open não é a estrutura natural para este pedido.',
          'Oven significa forno. Aqui precisamos de open: abrir.'
        ]
      },
      vi: {
        prompt: 'Cô ấy nhờ tôi mở cửa sổ',
        explanations: [
          'Đúng. Ask + object + to + động từ dùng để nhờ ai làm gì.',
          'Thiếu to. Sau asked me cần to open.',
          'Asked me that I open không phải cấu trúc tự nhiên cho yêu cầu này.',
          'Oven nghĩa là lò nướng. Ở đây cần open: mở.'
        ]
      },
      id: {
        prompt: 'Dia meminta saya membuka jendela',
        explanations: [
          'Benar. Ask + object + to + verb dipakai untuk meminta seseorang melakukan sesuatu.',
          'Kurang to. Setelah asked me perlu to open.',
          'Asked me that I open bukan struktur alami untuk permintaan ini.',
          'Oven berarti oven. Di sini perlu open: membuka.'
        ]
      },
      tr: {
        prompt: 'Pencereyi açmamı istedi',
        explanations: [
          'Doğru. Ask + object + to + fiil birinden bir şey yapmasını istemek için kullanılır.',
          'To eksik. Asked me sonrasında to open gerekir.',
          'Asked me that I open bu rica için doğal yapı değildir.',
          'Oven fırın demektir. Burada open gerekir: açmak.'
        ]
      },
      pl: {
        prompt: 'Poprosiła mnie, żebym otworzył okno',
        explanations: [
          'Dobrze. Ask + object + to + czasownik działa, gdy prosimy kogoś o zrobienie czegoś.',
          'Brakuje to. Po asked me potrzebujemy to open.',
          'Asked me that I open nie jest naturalną strukturą dla tej prośby.',
          'Oven znaczy piekarnik. Tutaj potrzebujesz open: otworzyć.'
        ]
      }
    },
    '202': {
      'pt-BR': {
        prompt: 'Vou encontrar você na estação',
        explanations: [
          'On the station não é a preposição natural para combinar em uma estação.',
          'Correto. Meet you at the station trata a estação como ponto de encontro.',
          'In the station pode falar de estar dentro, mas para ponto de encontro usamos at.',
          'Session significa sessão. Aqui precisamos de station: estação.'
        ]
      },
      vi: {
        prompt: 'Tôi sẽ gặp bạn ở nhà ga',
        explanations: [
          'On the station không phải giới từ tự nhiên để hẹn gặp ở nhà ga.',
          'Đúng. Meet you at the station xem nhà ga như điểm hẹn.',
          'In the station có thể nói về ở bên trong, nhưng điểm hẹn dùng at.',
          'Session nghĩa là buổi hoặc phiên. Ở đây cần station: nhà ga.'
        ]
      },
      id: {
        prompt: 'Saya akan menemuimu di stasiun',
        explanations: [
          'On the station bukan preposisi alami untuk janjian di stasiun.',
          'Benar. Meet you at the station memperlakukan stasiun sebagai titik temu.',
          'In the station bisa berarti berada di dalam, tetapi untuk titik temu gunakan at.',
          'Session berarti sesi. Di sini perlu station: stasiun.'
        ]
      },
      tr: {
        prompt: 'Seninle istasyonda buluşacağım',
        explanations: [
          'On the station istasyonda buluşmak için doğal preposition değildir.',
          'Doğru. Meet you at the station istasyonu buluşma noktası olarak alır.',
          'In the station içeride olmayı anlatabilir, ama buluşma noktası için at kullanırız.',
          'Session oturum demektir. Burada station gerekir: istasyon.'
        ]
      },
      pl: {
        prompt: 'Spotkam cię na dworcu',
        explanations: [
          'On the station nie jest naturalnym przyimkiem dla spotkania na dworcu.',
          'Dobrze. Meet you at the station traktuje stację jako punkt spotkania.',
          'In the station może mówić o byciu w środku, ale dla punktu spotkania używamy at.',
          'Session znaczy sesja. Tutaj potrzebujesz station: stacja.'
        ]
      }
    },
    '203': {
      'pt-BR': {
        prompt: 'Segunda-feira é o dia em que estou muito ocupado',
        explanations: [
          'Which não liga bem day a uma ideia de tempo nesta frase.',
          'Where é para lugares. Monday não é lugar.',
          'What não funciona como relativo depois de day aqui.',
          'Correto. When liga day ao momento em que estou ocupado.'
        ]
      },
      vi: {
        prompt: 'Thứ Hai là ngày tôi rất bận',
        explanations: [
          'Which không nối day với ý thời gian tốt trong câu này.',
          'Where dùng cho nơi chốn. Monday không phải nơi chốn.',
          'What không dùng như đại từ quan hệ sau day ở đây.',
          'Đúng. When nối day với thời điểm tôi bận.'
        ]
      },
      id: {
        prompt: 'Senin adalah hari ketika saya sangat sibuk',
        explanations: [
          'Which tidak menghubungkan day dengan ide waktu dengan baik dalam kalimat ini.',
          'Where dipakai untuk tempat. Monday bukan tempat.',
          'What tidak berfungsi sebagai relative setelah day di sini.',
          'Benar. When menghubungkan day dengan waktu ketika saya sibuk.'
        ]
      },
      tr: {
        prompt: 'Pazartesi çok meşgul olduğum gündür',
        explanations: [
          'Which bu cümlede day ile zaman fikrini iyi bağlamaz.',
          'Where yerler için kullanılır. Monday bir yer değildir.',
          'What burada day sonrasında relative olarak çalışmaz.',
          'Doğru. When, day ile meşgul olduğum zamanı bağlar.'
        ]
      },
      pl: {
        prompt: 'Poniedziałek to dzień, kiedy jestem bardzo zajęty',
        explanations: [
          'Which nie łączy dobrze day z ideą czasu w tym zdaniu.',
          'Where jest dla miejsc. Monday nie jest miejscem.',
          'What nie działa tutaj jako zaimek względny po day.',
          'Dobrze. When łączy day z momentem, kiedy jestem zajęty.'
        ]
      }
    },
    '204': {
      'pt-BR': {
        prompt: 'Eu já vi este filme',
        explanations: [
          'Already saw pode soar natural em AmE, mas este cartão treina present perfect com already.',
          'Correto. I have already seen this movie fala de uma experiência completada antes de agora.',
          'Scene significa cena. Aqui precisamos de seen, particípio de see.',
          'Depois de have precisamos de seen, não saw.'
        ]
      },
      vi: {
        prompt: 'Tôi đã xem bộ phim này rồi',
        explanations: [
          'Already saw có thể nghe tự nhiên trong AmE, nhưng thẻ này luyện present perfect với already.',
          'Đúng. I have already seen this movie nói về trải nghiệm đã hoàn thành trước hiện tại.',
          'Scene nghĩa là cảnh. Ở đây cần seen, phân từ của see.',
          'Sau have cần seen, không phải saw.'
        ]
      },
      id: {
        prompt: 'Saya sudah pernah melihat film ini',
        explanations: [
          'Already saw bisa terdengar alami dalam AmE, tetapi kartu ini melatih present perfect dengan already.',
          'Benar. I have already seen this movie membahas pengalaman yang sudah selesai sebelum sekarang.',
          'Scene berarti adegan. Di sini perlu seen, participle dari see.',
          'Setelah have perlu seen, bukan saw.'
        ]
      },
      tr: {
        prompt: 'Bu filmi zaten gördüm',
        explanations: [
          'Already saw AmE içinde doğal duyulabilir, ama bu kart already ile present perfect çalıştırır.',
          'Doğru. I have already seen this movie şu andan önce tamamlanmış bir deneyimi anlatır.',
          'Scene sahne demektir. Burada see fiilinin participle biçimi olan seen gerekir.',
          'Have sonrasında seen gerekir, saw değil.'
        ]
      },
      pl: {
        prompt: 'Już widziałem ten film',
        explanations: [
          'Already saw może brzmieć naturalnie w AmE, ale ta karta ćwiczy present perfect z already.',
          'Dobrze. I have already seen this movie mówi o doświadczeniu zakończonym przed teraz.',
          'Scene znaczy scena. Tutaj potrzebujesz seen, imiesłów od see.',
          'Po have potrzebujemy seen, nie saw.'
        ]
      }
    },
    '205': {
      'pt-BR': {
        prompt: 'Ontem a esta hora o sol estava brilhando',
        explanations: [
          'Correto. Was shining mostra o que estava acontecendo naquele momento específico ontem.',
          'Shone pode ser gramatical, mas aqui queremos enfatizar o processo em andamento naquele momento.',
          'Sinning significa pecando. Aqui precisamos de shining: brilhando.',
          'Sun é singular, então usamos was, não were.'
        ]
      },
      vi: {
        prompt: 'Hôm qua vào giờ này mặt trời đang chiếu sáng',
        explanations: [
          'Đúng. Was shining cho thấy điều đang xảy ra vào đúng thời điểm đó hôm qua.',
          'Shone có thể đúng ngữ pháp, nhưng ở đây muốn nhấn mạnh quá trình đang diễn ra lúc đó.',
          'Sinning nghĩa là phạm tội. Ở đây cần shining: chiếu sáng.',
          'Sun là số ít, nên dùng was, không phải were.'
        ]
      },
      id: {
        prompt: 'Kemarin pada jam segini matahari sedang bersinar',
        explanations: [
          'Benar. Was shining menunjukkan apa yang sedang terjadi pada waktu spesifik kemarin.',
          'Shone bisa gramatikal, tetapi di sini kita menekankan proses yang sedang berlangsung saat itu.',
          'Sinning berarti berdosa. Di sini perlu shining: bersinar.',
          'Sun itu tunggal, jadi gunakan was, bukan were.'
        ]
      },
      tr: {
        prompt: 'Dün bu saatte güneş parlıyordu',
        explanations: [
          'Doğru. Was shining dün o belirli anda ne olduğunu gösterir.',
          'Shone gramatik olabilir, ama burada o anda süren süreci vurgulamak istiyoruz.',
          'Sinning günah işlemek demektir. Burada shining gerekir: parlamak.',
          'Sun tekildir, bu yüzden were değil was kullanırız.'
        ]
      },
      pl: {
        prompt: 'Wczoraj o tej porze świeciło słońce',
        explanations: [
          'Dobrze. Was shining pokazuje, co działo się w tym konkretnym momencie wczoraj.',
          'Shone może być gramatyczne, ale tutaj chcemy podkreślić proces trwający w tamtej chwili.',
          'Sinning znaczy grzesząc. Tutaj potrzebujesz shining: świecąc.',
          'Sun jest w liczbie pojedynczej, więc używamy was, nie were.'
        ]
      }
    },
    '206': {
      'pt-BR': {
        prompt: 'Ela preparou o café da manhã sozinha',
        explanations: [
          'Correto. By herself significa que ela fez isso sozinha ou sem ajuda.',
          'Herselves não existe para she. A forma correta é herself.',
          'Herself\'s não funciona aqui. Não precisamos de possessivo.',
          'Hershelf mistura herself com shelf. Shelf significa prateleira.'
        ]
      },
      vi: {
        prompt: 'Cô ấy tự chuẩn bị bữa sáng',
        explanations: [
          'Đúng. By herself nghĩa là cô ấy làm một mình hoặc không có trợ giúp.',
          'Herselves không tồn tại cho she. Dạng đúng là herself.',
          'Herself\'s không dùng ở đây. Không cần sở hữu cách.',
          'Hershelf trộn herself với shelf. Shelf nghĩa là cái kệ.'
        ]
      },
      id: {
        prompt: 'Dia menyiapkan sarapan sendiri',
        explanations: [
          'Benar. By herself berarti dia melakukannya sendiri atau tanpa bantuan.',
          'Herselves tidak ada untuk she. Bentuk yang benar adalah herself.',
          'Herself\'s tidak berfungsi di sini. Tidak perlu possessive.',
          'Hershelf mencampur herself dengan shelf. Shelf berarti rak.'
        ]
      },
      tr: {
        prompt: 'Kahvaltıyı kendi başına hazırladı',
        explanations: [
          'Doğru. By herself bunu tek başına veya yardım almadan yaptığını anlatır.',
          'Herselves she için yoktur. Doğru biçim herself.',
          'Herself\'s burada çalışmaz. İyelik gerekmiyor.',
          'Hershelf, herself ile shelf kelimesini karıştırır. Shelf raf demektir.'
        ]
      },
      pl: {
        prompt: 'Sama przygotowała śniadanie',
        explanations: [
          'Dobrze. By herself znaczy, że zrobiła to sama albo bez pomocy.',
          'Herselves nie istnieje dla she. Poprawna forma to herself.',
          'Herself\'s tutaj nie działa. Nie potrzebujemy dzierżawy.',
          'Hershelf miesza herself z shelf. Shelf znaczy półka.'
        ]
      }
    },
    '207': {
      'pt-BR': {
        prompt: 'Prefiro assistir a filmes a ler livros',
        explanations: [
          'Para comparar duas atividades com prefer, este cartão usa a forma paralela -ing + to + -ing.',
          'Correto. Prefer watching movies to reading books compara duas atividades de forma natural.',
          'Washing significa lavando. Aqui precisamos de watching: assistindo.',
          'Depois de prefer, para comparar, usamos to, não than, nesta estrutura.'
        ]
      },
      vi: {
        prompt: 'Tôi thích xem phim hơn đọc sách',
        explanations: [
          'Khi so sánh hai hoạt động với prefer, thẻ này dùng dạng song song -ing + to + -ing.',
          'Đúng. Prefer watching movies to reading books so sánh hai hoạt động một cách tự nhiên.',
          'Washing nghĩa là rửa. Ở đây cần watching: xem.',
          'Sau prefer để so sánh trong cấu trúc này dùng to, không phải than.'
        ]
      },
      id: {
        prompt: 'Saya lebih suka menonton film daripada membaca buku',
        explanations: [
          'Untuk membandingkan dua aktivitas dengan prefer, kartu ini memakai bentuk paralel -ing + to + -ing.',
          'Benar. Prefer watching movies to reading books membandingkan dua aktivitas secara alami.',
          'Washing berarti mencuci. Di sini perlu watching: menonton.',
          'Setelah prefer untuk perbandingan, gunakan to, bukan than, dalam struktur ini.'
        ]
      },
      tr: {
        prompt: 'Kitap okumaktansa film izlemeyi tercih ederim',
        explanations: [
          'Prefer ile iki etkinliği karşılaştırırken bu kart paralel -ing + to + -ing yapısını kullanır.',
          'Doğru. Prefer watching movies to reading books iki etkinliği doğal biçimde karşılaştırır.',
          'Washing yıkamak demektir. Burada watching gerekir: izlemek.',
          'Bu yapıda prefer sonrasında karşılaştırma için than değil to kullanırız.'
        ]
      },
      pl: {
        prompt: 'Wolę oglądać filmy niż czytać książki',
        explanations: [
          'Gdy porównujemy dwie czynności z prefer, ta karta używa równoległej formy -ing + to + -ing.',
          'Dobrze. Prefer watching movies to reading books naturalnie porównuje dwie czynności.',
          'Washing znaczy myjąc. Tutaj potrzebujesz watching: oglądając.',
          'Po prefer w tym porównaniu używamy to, nie than.'
        ]
      }
    },
    '208': {
      'pt-BR': {
        prompt: 'Pacotes são entregues todos os dias',
        explanations: [
          'Parcels deliver soa como se os pacotes entregassem algo. Precisamos de passiva.',
          'Correto. Parcels are delivered every day usa present simple passive.',
          'Delayed significa atrasados. Aqui precisamos de delivered: entregues.',
          'Parcels é plural, então usamos are, não is.'
        ]
      },
      vi: {
        prompt: 'Bưu kiện được giao mỗi ngày',
        explanations: [
          'Parcels deliver nghe như các bưu kiện tự đi giao thứ gì đó. Cần bị động.',
          'Đúng. Parcels are delivered every day dùng present simple passive.',
          'Delayed nghĩa là bị trì hoãn. Ở đây cần delivered: được giao.',
          'Parcels là số nhiều, nên dùng are, không phải is.'
        ]
      },
      id: {
        prompt: 'Paket dikirim setiap hari',
        explanations: [
          'Parcels deliver terdengar seperti paket mengirim sesuatu. Perlu passive.',
          'Benar. Parcels are delivered every day memakai present simple passive.',
          'Delayed berarti tertunda. Di sini perlu delivered: dikirim.',
          'Parcels itu plural, jadi gunakan are, bukan is.'
        ]
      },
      tr: {
        prompt: 'Paketler her gün teslim edilir',
        explanations: [
          'Parcels deliver paketler bir şey teslim ediyormuş gibi duyulur. Passive gerekir.',
          'Doğru. Parcels are delivered every day present simple passive kullanır.',
          'Delayed gecikmiş demektir. Burada delivered gerekir: teslim edilmiş.',
          'Parcels çoğuldur, bu yüzden is değil are kullanırız.'
        ]
      },
      pl: {
        prompt: 'Paczki są dostarczane codziennie',
        explanations: [
          'Parcels deliver brzmi tak, jakby paczki coś dostarczały. Potrzebujemy strony biernej.',
          'Dobrze. Parcels are delivered every day używa present simple passive.',
          'Delayed znaczy opóźnione. Tutaj potrzebujesz delivered: dostarczane.',
          'Parcels jest w liczbie mnogiej, więc używamy are, nie is.'
        ]
      }
    },
    '209': {
      'pt-BR': {
        prompt: 'Não esqueça suas chaves',
        explanations: [
          'Not forget não funciona como imperativo negativo. Precisamos de don\'t.',
          'Correto. Don\'t forget your keys é a forma natural de dizer isso.',
          'Cheese significa queijo. Aqui precisamos de keys: chaves.',
          'Depois de don\'t usamos o verbo base: forget, não forgotten.'
        ]
      },
      vi: {
        prompt: 'Đừng quên chìa khóa của bạn',
        explanations: [
          'Not forget không dùng như mệnh lệnh phủ định. Cần don\'t.',
          'Đúng. Don\'t forget your keys là cách tự nhiên để nói câu này.',
          'Cheese nghĩa là phô mai. Ở đây cần keys: chìa khóa.',
          'Sau don\'t dùng động từ nguyên mẫu: forget, không phải forgotten.'
        ]
      },
      id: {
        prompt: 'Jangan lupa kuncimu',
        explanations: [
          'Not forget tidak berfungsi sebagai imperative negatif. Perlu don\'t.',
          'Benar. Don\'t forget your keys adalah cara alami untuk mengatakannya.',
          'Cheese berarti keju. Di sini perlu keys: kunci.',
          'Setelah don\'t gunakan base verb: forget, bukan forgotten.'
        ]
      },
      tr: {
        prompt: 'Anahtarlarını unutma',
        explanations: [
          'Not forget olumsuz emir olarak çalışmaz. Don\'t gerekir.',
          'Doğru. Don\'t forget your keys bunu söylemenin doğal yoludur.',
          'Cheese peynir demektir. Burada keys gerekir: anahtarlar.',
          'Don\'t sonrasında fiilin yalın hali kullanılır: forget, forgotten değil.'
        ]
      },
      pl: {
        prompt: 'Nie zapomnij kluczy',
        explanations: [
          'Not forget nie działa jako przeczący tryb rozkazujący. Potrzebujemy don\'t.',
          'Dobrze. Don\'t forget your keys to naturalny sposób, żeby to powiedzieć.',
          'Cheese znaczy ser. Tutaj potrzebujesz keys: klucze.',
          'Po don\'t używamy podstawowej formy czasownika: forget, nie forgotten.'
        ]
      }
    },
    '210': {
      'pt-BR': {
        prompt: 'Você morava aqui antes?',
        explanations: [
          'Depois de did usamos a forma base use, não used.',
          'Correto. Did you use to live here? pergunta sobre uma situação habitual do passado.',
          'Leave significa sair ou ir embora. Aqui precisamos de live: morar.',
          'You used to live here? soa como afirmação com entonação de pergunta; a forma padrão usa did.'
        ]
      },
      vi: {
        prompt: 'Trước đây bạn từng sống ở đây à?',
        explanations: [
          'Sau did dùng dạng nguyên mẫu use, không phải used.',
          'Đúng. Did you use to live here? hỏi về một tình trạng quen thuộc trong quá khứ.',
          'Leave nghĩa là rời đi. Ở đây cần live: sống.',
          'You used to live here? nghe như câu khẳng định lên giọng hỏi; dạng chuẩn dùng did.'
        ]
      },
      id: {
        prompt: 'Apakah dulu kamu tinggal di sini?',
        explanations: [
          'Setelah did gunakan bentuk dasar use, bukan used.',
          'Benar. Did you use to live here? menanyakan keadaan kebiasaan di masa lalu.',
          'Leave berarti pergi atau meninggalkan. Di sini perlu live: tinggal.',
          'You used to live here? terdengar seperti pernyataan dengan intonasi tanya; bentuk standar memakai did.'
        ]
      },
      tr: {
        prompt: 'Eskiden burada mı yaşıyordun?',
        explanations: [
          'Did sonrasında used değil, yalın use kullanırız.',
          'Doğru. Did you use to live here? geçmişteki alışılmış bir durumu sorar.',
          'Leave ayrılmak veya gitmek demektir. Burada live gerekir: yaşamak.',
          'You used to live here? soru tonlamalı bir düz cümle gibi duyulur; standart biçim did kullanır.'
        ]
      },
      pl: {
        prompt: 'Czy kiedyś tu mieszkałeś?',
        explanations: [
          'Po did używamy podstawowej formy use, nie used.',
          'Dobrze. Did you use to live here? pyta o dawną sytuację albo nawyk.',
          'Leave znaczy wyjść albo opuścić. Tutaj potrzebujesz live: mieszkać.',
          'You used to live here? brzmi jak zdanie twierdzące z intonacją pytania; standardowa forma używa did.'
        ]
      }
    },
    '211': {
      'pt-BR': {
        prompt: 'Quem é este homem na foto?',
        explanations: [
          'Correto. Para dizer quem aparece dentro de uma foto, usamos in the photo.',
          'On the photo seria sobre a superfície da foto, não sobre a pessoa que aparece nela.',
          'At the photo não funciona para falar de uma imagem.',
          'Potato significa batata. Aqui precisamos de photo.'
        ]
      },
      vi: {
        prompt: 'Người đàn ông này trong ảnh là ai?',
        explanations: [
          'Đúng. Để nói ai xuất hiện trong ảnh, dùng in the photo.',
          'On the photo sẽ nói về trên bề mặt tấm ảnh, không phải người xuất hiện trong ảnh.',
          'At the photo không dùng để nói về một bức ảnh.',
          'Potato nghĩa là khoai tây. Ở đây cần photo.'
        ]
      },
      id: {
        prompt: 'Siapa pria ini di foto?',
        explanations: [
          'Benar. Untuk mengatakan siapa yang muncul dalam foto, gunakan in the photo.',
          'On the photo berarti di atas permukaan foto, bukan orang yang muncul di dalamnya.',
          'At the photo tidak cocok untuk membahas gambar.',
          'Potato berarti kentang. Di sini perlu photo.'
        ]
      },
      tr: {
        prompt: 'Fotoğraftaki bu adam kim?',
        explanations: [
          'Doğru. Bir fotoğrafta kimin göründüğünü söylemek için in the photo kullanırız.',
          'On the photo fotoğrafın yüzeyinde demektir, fotoğrafta görünen kişi değil.',
          'At the photo bir görselden bahsetmek için çalışmaz.',
          'Potato patates demektir. Burada photo gerekir.'
        ]
      },
      pl: {
        prompt: 'Kim jest ten mężczyzna na zdjęciu?',
        explanations: [
          'Dobrze. Gdy mówimy, kto pojawia się na zdjęciu, używamy in the photo.',
          'On the photo oznaczałoby na powierzchni zdjęcia, nie osobę widoczną na nim.',
          'At the photo nie działa, gdy mówimy o obrazie.',
          'Potato znaczy ziemniak. Tutaj potrzebujesz photo.'
        ]
      }
    },
    '212': {
      'pt-BR': {
        prompt: 'Ele evita falar comigo',
        explanations: [
          'Depois de avoid não usamos to + verbo. Precisamos de avoid + -ing.',
          'Correto. Avoids talking to me significa que ele evita falar comigo.',
          'My é possessivo. Depois de with precisamos de me.',
          'Tucking significa enfiar ou ajeitar para dentro. Aqui precisamos de talking.'
        ]
      },
      vi: {
        prompt: 'Anh ấy tránh nói chuyện với tôi',
        explanations: [
          'Sau avoid không dùng to + động từ. Cần avoid + -ing.',
          'Đúng. Avoids talking to me nghĩa là anh ấy tránh nói chuyện với tôi.',
          'My là sở hữu. Sau with cần me.',
          'Tucking nghĩa là nhét hoặc gài vào trong. Ở đây cần talking.'
        ]
      },
      id: {
        prompt: 'Dia menghindari berbicara dengan saya',
        explanations: [
          'Setelah avoid jangan gunakan to + verb. Perlu avoid + -ing.',
          'Benar. Avoids talking to me berarti dia menghindari berbicara dengan saya.',
          'My adalah possessive. Setelah with perlu me.',
          'Tucking berarti menyelipkan atau memasukkan. Di sini perlu talking.'
        ]
      },
      tr: {
        prompt: 'Benimle konuşmaktan kaçınıyor',
        explanations: [
          'Avoid sonrasında to + fiil kullanmayız. Avoid + -ing gerekir.',
          'Doğru. Avoids talking to me benimle konuşmaktan kaçınıyor demektir.',
          'My iyeliktir. With sonrasında me gerekir.',
          'Tucking içeri sokmak veya yerleştirmek demektir. Burada talking gerekir.'
        ]
      },
      pl: {
        prompt: 'On unika rozmowy ze mną',
        explanations: [
          'Po avoid nie używamy to + czasownik. Potrzebujemy avoid + -ing.',
          'Dobrze. Avoids talking to me znaczy, że on unika rozmowy ze mną.',
          'My jest dzierżawcze. Po with potrzebujemy me.',
          'Tucking znaczy wkładać albo podwijać do środka. Tutaj potrzebujesz talking.'
        ]
      }
    },
    '213': {
      'pt-BR': {
        prompt: 'Bebi três xícaras de café hoje',
        explanations: [
          'Drank pode funcionar em alguns contextos, mas com today como período não terminado treinamos present perfect.',
          'Correto. I have drunk three cups of coffee today conecta a ação ao dia atual.',
          'Depois de have precisamos de drunk, não drank.',
          'Cough significa tosse. Aqui precisamos de coffee: café.'
        ]
      },
      vi: {
        prompt: 'Hôm nay tôi đã uống ba tách cà phê',
        explanations: [
          'Drank có thể dùng trong một số ngữ cảnh, nhưng với today là khoảng thời gian chưa kết thúc, ta luyện present perfect.',
          'Đúng. I have drunk three cups of coffee today nối hành động với ngày hiện tại.',
          'Sau have cần drunk, không phải drank.',
          'Cough nghĩa là ho. Ở đây cần coffee: cà phê.'
        ]
      },
      id: {
        prompt: 'Saya sudah minum tiga cangkir kopi hari ini',
        explanations: [
          'Drank bisa berfungsi dalam beberapa konteks, tetapi dengan today sebagai periode yang belum selesai, kita melatih present perfect.',
          'Benar. I have drunk three cups of coffee today menghubungkan tindakan dengan hari ini.',
          'Setelah have perlu drunk, bukan drank.',
          'Cough berarti batuk. Di sini perlu coffee: kopi.'
        ]
      },
      tr: {
        prompt: 'Bugün üç fincan kahve içtim',
        explanations: [
          'Drank bazı bağlamlarda çalışabilir, ama today bitmemiş dönem olduğu için present perfect çalışıyoruz.',
          'Doğru. I have drunk three cups of coffee today eylemi bugüne bağlar.',
          'Have sonrasında drunk gerekir, drank değil.',
          'Cough öksürük demektir. Burada coffee gerekir: kahve.'
        ]
      },
      pl: {
        prompt: 'Wypiłem dziś trzy filiżanki kawy',
        explanations: [
          'Drank może działać w niektórych kontekstach, ale z today jako niedokończonym okresem ćwiczymy present perfect.',
          'Dobrze. I have drunk three cups of coffee today łączy czynność z dzisiejszym dniem.',
          'Po have potrzebujemy drunk, nie drank.',
          'Cough znaczy kaszel. Tutaj potrzebujesz coffee: kawa.'
        ]
      }
    },
    '214': {
      'pt-BR': {
        prompt: 'O livro que comprei ontem é muito interessante',
        explanations: [
          'Who é usado para pessoas. Book é uma coisa.',
          'What não funciona como relativo depois de book nesta frase.',
          'Correto. Which liga the book a I bought yesterday.',
          'Boat significa barco. Aqui precisamos de bought: comprei.'
        ]
      },
      vi: {
        prompt: 'Cuốn sách tôi mua hôm qua rất thú vị',
        explanations: [
          'Who dùng cho người. Book là đồ vật.',
          'What không dùng như đại từ quan hệ sau book trong câu này.',
          'Đúng. Which nối the book với I bought yesterday.',
          'Boat nghĩa là thuyền. Ở đây cần bought: đã mua.'
        ]
      },
      id: {
        prompt: 'Buku yang saya beli kemarin sangat menarik',
        explanations: [
          'Who dipakai untuk orang. Book adalah benda.',
          'What tidak berfungsi sebagai relative setelah book dalam kalimat ini.',
          'Benar. Which menghubungkan the book dengan I bought yesterday.',
          'Boat berarti perahu. Di sini perlu bought: membeli.'
        ]
      },
      tr: {
        prompt: 'Dün aldığım kitap çok ilginç',
        explanations: [
          'Who kişiler için kullanılır. Book bir nesnedir.',
          'What bu cümlede book sonrasında relative olarak çalışmaz.',
          'Doğru. Which, the book ile I bought yesterday kısmını bağlar.',
          'Boat tekne demektir. Burada bought gerekir: satın aldım.'
        ]
      },
      pl: {
        prompt: 'Książka, którą kupiłem wczoraj, jest bardzo interesująca',
        explanations: [
          'Who jest dla osób. Book to rzecz.',
          'What nie działa jako zaimek względny po book w tym zdaniu.',
          'Dobrze. Which łączy the book z I bought yesterday.',
          'Boat znaczy łódź. Tutaj potrzebujesz bought: kupiłem.'
        ]
      }
    },
    '215': {
      'pt-BR': {
        prompt: 'Alguém viu meu telefone?',
        explanations: [
          'Correto. Has anybody seen...? é uma pergunta natural porque anybody busca uma resposta aberta.',
          'Anybody é singular nesta estrutura, então usamos has, não have.',
          'Somebody pode ser gramatical, mas soa como se você esperasse que uma pessoa específica tivesse visto. Aqui a pergunta aberta pede anybody.',
          'Scene significa cena. Aqui precisamos de seen, particípio de see.'
        ]
      },
      vi: {
        prompt: 'Có ai thấy điện thoại của tôi không?',
        explanations: [
          'Đúng. Has anybody seen...? là câu hỏi tự nhiên vì anybody tìm một câu trả lời mở.',
          'Anybody là số ít trong cấu trúc này, nên dùng has, không phải have.',
          'Somebody có thể đúng ngữ pháp, nhưng nghe như bạn mong một người cụ thể đã thấy. Câu hỏi mở ở đây cần anybody.',
          'Scene nghĩa là cảnh. Ở đây cần seen, phân từ của see.'
        ]
      },
      id: {
        prompt: 'Apakah ada yang melihat ponsel saya?',
        explanations: [
          'Benar. Has anybody seen...? adalah pertanyaan alami karena anybody mencari jawaban terbuka.',
          'Anybody itu singular dalam struktur ini, jadi gunakan has, bukan have.',
          'Somebody bisa gramatikal, tetapi terdengar seperti kamu mengharapkan orang tertentu melihatnya. Pertanyaan terbuka di sini memakai anybody.',
          'Scene berarti adegan. Di sini perlu seen, participle dari see.'
        ]
      },
      tr: {
        prompt: 'Telefonumu gören oldu mu?',
        explanations: [
          'Doğru. Has anybody seen...? açıktaki bir cevap aradığı için doğal bir sorudur.',
          'Anybody bu yapıda tekildir, bu yüzden have değil has kullanırız.',
          'Somebody gramatik olabilir, ama belirli birinin görmüş olmasını bekliyormuşsun gibi duyulur. Burada açık soru için anybody gerekir.',
          'Scene sahne demektir. Burada see fiilinin participle biçimi seen gerekir.'
        ]
      },
      pl: {
        prompt: 'Czy ktoś widział mój telefon?',
        explanations: [
          'Dobrze. Has anybody seen...? to naturalne pytanie, bo anybody szuka otwartej odpowiedzi.',
          'Anybody jest w tej strukturze pojedyncze, więc używamy has, nie have.',
          'Somebody może być gramatyczne, ale brzmi tak, jakbyś oczekiwał, że konkretna osoba to widziała. Tutaj pytanie otwarte prosi o anybody.',
          'Scene znaczy scena. Tutaj potrzebujesz seen, imiesłów od see.'
        ]
      }
    },
    '216': {
      'pt-BR': {
        prompt: 'Uma escola nova está sendo construída na nossa região',
        explanations: [
          'A new school is building soa como se a escola estivesse construindo algo. Precisamos de passiva.',
          'Correto. Is being built mostra que a escola está em processo de construção.',
          'Billed significa faturada ou cobrada. Aqui precisamos de built: construída.',
          'Falta is. Para esta passiva precisamos de is being built.'
        ]
      },
      vi: {
        prompt: 'Một trường học mới đang được xây ở khu vực của chúng tôi',
        explanations: [
          'A new school is building nghe như ngôi trường đang tự xây thứ gì đó. Cần bị động.',
          'Đúng. Is being built cho thấy trường đang trong quá trình được xây.',
          'Billed nghĩa là bị tính tiền. Ở đây cần built: được xây.',
          'Thiếu is. Với dạng bị động này cần is being built.'
        ]
      },
      id: {
        prompt: 'Sekolah baru sedang dibangun di daerah kami',
        explanations: [
          'A new school is building terdengar seperti sekolah sedang membangun sesuatu. Perlu passive.',
          'Benar. Is being built menunjukkan sekolah sedang dalam proses dibangun.',
          'Billed berarti ditagih. Di sini perlu built: dibangun.',
          'Kurang is. Untuk passive ini perlu is being built.'
        ]
      },
      tr: {
        prompt: 'Bölgemizde yeni bir okul inşa ediliyor',
        explanations: [
          'A new school is building okul bir şey inşa ediyormuş gibi duyulur. Passive gerekir.',
          'Doğru. Is being built okulun yapım sürecinde olduğunu gösterir.',
          'Billed faturalandırılmış demektir. Burada built gerekir: inşa edilmiş.',
          'Is eksik. Bu passive yapı için is being built gerekir.'
        ]
      },
      pl: {
        prompt: 'W naszej okolicy buduje się nowa szkoła',
        explanations: [
          'A new school is building brzmi tak, jakby szkoła coś budowała. Potrzebujemy strony biernej.',
          'Dobrze. Is being built pokazuje, że szkoła jest w trakcie budowy.',
          'Billed znaczy obciążona rachunkiem. Tutaj potrzebujesz built: zbudowana.',
          'Brakuje is. Do tej strony biernej potrzebujemy is being built.'
        ]
      }
    },
    '217': {
      'pt-BR': {
        prompt: 'Se eu o vir amanhã, darei a ele seu bilhete',
        explanations: [
          'No first conditional não usamos will na parte com if. Usamos present simple: if I see.',
          'Correto. If I see..., I will give... combina condição real e resultado futuro.',
          'Sea significa mar. Aqui precisamos de see: ver.',
          'Na parte do resultado precisamos de will give para falar do futuro.'
        ]
      },
      vi: {
        prompt: 'Nếu ngày mai tôi gặp anh ấy, tôi sẽ đưa anh ấy ghi chú của bạn',
        explanations: [
          'Trong first conditional không dùng will ở mệnh đề if. Dùng present simple: if I see.',
          'Đúng. If I see..., I will give... kết hợp điều kiện thực và kết quả tương lai.',
          'Sea nghĩa là biển. Ở đây cần see: thấy.',
          'Ở phần kết quả cần will give để nói về tương lai.'
        ]
      },
      id: {
        prompt: 'Jika saya melihatnya besok, saya akan memberinya catatanmu',
        explanations: [
          'Dalam first conditional, jangan gunakan will di bagian if. Gunakan present simple: if I see.',
          'Benar. If I see..., I will give... menggabungkan kondisi nyata dan hasil masa depan.',
          'Sea berarti laut. Di sini perlu see: melihat.',
          'Di bagian hasil, perlu will give untuk berbicara tentang masa depan.'
        ]
      },
      tr: {
        prompt: 'Yarın onu görürsem notunu ona vereceğim',
        explanations: [
          'First conditional yapısında if bölümünde will kullanmayız. Present simple kullanırız: if I see.',
          'Doğru. If I see..., I will give... gerçek koşul ve gelecek sonucu birleştirir.',
          'Sea deniz demektir. Burada see gerekir: görmek.',
          'Sonuç bölümünde gelecek için will give gerekir.'
        ]
      },
      pl: {
        prompt: 'Jeśli zobaczę go jutro, przekażę mu twoją notatkę',
        explanations: [
          'W first conditional nie używamy will w części z if. Używamy present simple: if I see.',
          'Dobrze. If I see..., I will give... łączy realny warunek i przyszły rezultat.',
          'Sea znaczy morze. Tutaj potrzebujesz see: zobaczyć.',
          'W części rezultatu potrzebujemy will give, żeby mówić o przyszłości.'
        ]
      }
    },
    '218': {
      'pt-BR': {
        prompt: 'Este é o restaurante onde jantamos na semana passada',
        explanations: [
          'Which sozinho não completa a ideia de lugar. Seria which we had dinner at, ou mais natural: where.',
          'Correto. Where liga restaurant ao lugar onde jantamos.',
          'What não funciona como relativo depois de restaurant.',
          'Diner significa lanchonete pequena ou cliente. Aqui precisamos de dinner: jantar.'
        ]
      },
      vi: {
        prompt: 'Đây là nhà hàng nơi chúng tôi ăn tối tuần trước',
        explanations: [
          'Which một mình chưa hoàn thành ý về nơi chốn. Có thể là which we had dinner at, hoặc tự nhiên hơn: where.',
          'Đúng. Where nối restaurant với nơi chúng tôi đã ăn tối.',
          'What không dùng như đại từ quan hệ sau restaurant.',
          'Diner nghĩa là quán ăn nhỏ hoặc người ăn. Ở đây cần dinner: bữa tối.'
        ]
      },
      id: {
        prompt: 'Ini restoran tempat kami makan malam minggu lalu',
        explanations: [
          'Which saja tidak melengkapi ide tempat. Bisa which we had dinner at, atau lebih alami: where.',
          'Benar. Where menghubungkan restaurant dengan tempat kami makan malam.',
          'What tidak berfungsi sebagai relative setelah restaurant.',
          'Diner berarti restoran kecil atau orang yang makan. Di sini perlu dinner: makan malam.'
        ]
      },
      tr: {
        prompt: 'Geçen hafta akşam yemeği yediğimiz restoran bu',
        explanations: [
          'Which tek başına yer fikrini tamamlamaz. Which we had dinner at olabilir, ama daha doğal olan where.',
          'Doğru. Where, restaurant ile akşam yemeği yediğimiz yeri bağlar.',
          'What restaurant sonrasında relative olarak çalışmaz.',
          'Diner küçük lokanta veya yemek yiyen kişi demektir. Burada dinner gerekir: akşam yemeği.'
        ]
      },
      pl: {
        prompt: 'To restauracja, w której jedliśmy kolację w zeszłym tygodniu',
        explanations: [
          'Samo which nie domyka idei miejsca. Byłoby which we had dinner at albo naturalniej: where.',
          'Dobrze. Where łączy restaurant z miejscem, gdzie jedliśmy kolację.',
          'What nie działa jako zaimek względny po restaurant.',
          'Diner znaczy mały bar albo osoba jedząca. Tutaj potrzebujesz dinner: kolacja.'
        ]
      }
    },
    '219': {
      'pt-BR': {
        prompt: 'Deixei meus óculos em algum lugar por aqui',
        explanations: [
          'Anywhere costuma funcionar em negativas, perguntas ou no sentido de qualquer lugar. Aqui queremos algum lugar específico.',
          'Correto. Somewhere here significa em algum lugar por aqui.',
          'Nowhere significa em nenhum lugar. Muda o sentido.',
          'Somewhat significa um pouco. Aqui precisamos de somewhere.'
        ]
      },
      vi: {
        prompt: 'Tôi để kính của mình đâu đó quanh đây',
        explanations: [
          'Anywhere thường dùng trong câu phủ định, câu hỏi hoặc nghĩa bất cứ đâu. Ở đây cần một nơi nào đó cụ thể.',
          'Đúng. Somewhere here nghĩa là đâu đó quanh đây.',
          'Nowhere nghĩa là không ở đâu cả. Nó đổi nghĩa.',
          'Somewhat nghĩa là hơi hoặc phần nào. Ở đây cần somewhere.'
        ]
      },
      id: {
        prompt: 'Saya meninggalkan kacamata saya di suatu tempat di sekitar sini',
        explanations: [
          'Anywhere biasanya dipakai dalam negatif, pertanyaan, atau makna tempat mana pun. Di sini maksudnya suatu tempat tertentu.',
          'Benar. Somewhere here berarti di suatu tempat di sekitar sini.',
          'Nowhere berarti tidak di mana pun. Itu mengubah makna.',
          'Somewhat berarti agak atau sedikit. Di sini perlu somewhere.'
        ]
      },
      tr: {
        prompt: 'Gözlüğümü buralarda bir yere bıraktım',
        explanations: [
          'Anywhere genelde olumsuz cümle, soru veya herhangi bir yer anlamında kullanılır. Burada belirli bir yer gerekir.',
          'Doğru. Somewhere here buralarda bir yer demektir.',
          'Nowhere hiçbir yerde demektir. Anlamı değiştirir.',
          'Somewhat biraz veya kısmen demektir. Burada somewhere gerekir.'
        ]
      },
      pl: {
        prompt: 'Zostawiłem okulary gdzieś tutaj',
        explanations: [
          'Anywhere zwykle działa w przeczeniach, pytaniach albo w znaczeniu gdziekolwiek. Tutaj chodzi o jakieś konkretne miejsce.',
          'Dobrze. Somewhere here znaczy gdzieś tutaj.',
          'Nowhere znaczy nigdzie. Zmienia sens.',
          'Somewhat znaczy trochę albo do pewnego stopnia. Tutaj potrzebujesz somewhere.'
        ]
      }
    },
    '220': {
      'pt-BR': {
        prompt: 'O livro está na prateleira',
        explanations: [
          'In the shelf soa como dentro do material ou espaço da prateleira. Para a superfície usamos on.',
          'Correto. The book is on the shelf é a forma natural.',
          'At the shelf não é a preposição natural para a posição do livro.',
          'Self significa eu mesmo ou si mesmo. Aqui precisamos de shelf: prateleira.'
        ]
      },
      vi: {
        prompt: 'Cuốn sách nằm trên kệ',
        explanations: [
          'In the shelf nghe như ở bên trong chất liệu hoặc không gian của kệ. Với bề mặt dùng on.',
          'Đúng. The book is on the shelf là cách tự nhiên.',
          'At the shelf không phải giới từ tự nhiên để nói vị trí của cuốn sách.',
          'Self nghĩa là bản thân. Ở đây cần shelf: kệ.'
        ]
      },
      id: {
        prompt: 'Buku itu ada di rak',
        explanations: [
          'In the shelf terdengar seperti di dalam bahan atau ruang rak. Untuk permukaan gunakan on.',
          'Benar. The book is on the shelf adalah bentuk alami.',
          'At the shelf bukan preposisi alami untuk posisi buku.',
          'Self berarti diri sendiri. Di sini perlu shelf: rak.'
        ]
      },
      tr: {
        prompt: 'Kitap rafta',
        explanations: [
          'In the shelf rafın malzemesinin veya boşluğunun içinde gibi duyulur. Yüzey için on kullanırız.',
          'Doğru. The book is on the shelf doğal biçimdir.',
          'At the shelf kitabın konumu için doğal preposition değildir.',
          'Self kişinin kendisi demektir. Burada shelf gerekir: raf.'
        ]
      },
      pl: {
        prompt: 'Książka leży na półce',
        explanations: [
          'In the shelf brzmi jak wewnątrz materiału albo przestrzeni półki. Dla powierzchni używamy on.',
          'Dobrze. The book is on the shelf to naturalna forma.',
          'At the shelf nie jest naturalnym przyimkiem dla położenia książki.',
          'Self znaczy ja sam albo siebie. Tutaj potrzebujesz shelf: półka.'
        ]
      }
    },
    '221': {
      'pt-BR': {
        prompt: 'Esta é a cidade onde nasci',
        explanations: [
          'Which sozinho não completa bem a ideia de lugar. Seria in which, ou mais natural: where.',
          'When é para tempo. City é um lugar, então precisamos de where.',
          'Correto. Where conecta city com o lugar onde a pessoa nasceu.',
          'Borne existe em outros usos, mas aqui precisamos de born: nascido.'
        ]
      },
      vi: {
        prompt: 'Đây là thành phố nơi tôi sinh ra',
        explanations: [
          'Which một mình không hoàn thành tốt ý về nơi chốn. Có thể là in which, hoặc tự nhiên hơn: where.',
          'When dùng cho thời gian. City là nơi chốn, nên cần where.',
          'Đúng. Where nối city với nơi người đó sinh ra.',
          'Borne có trong vài cách dùng khác, nhưng ở đây cần born: được sinh ra.'
        ]
      },
      id: {
        prompt: 'Ini kota tempat saya lahir',
        explanations: [
          'Which saja tidak melengkapi gagasan tempat dengan baik. Bisa in which, atau lebih alami: where.',
          'When untuk waktu. City adalah tempat, jadi perlu where.',
          'Benar. Where menghubungkan city dengan tempat seseorang lahir.',
          'Borne ada dalam penggunaan lain, tetapi di sini perlu born: lahir.'
        ]
      },
      tr: {
        prompt: 'Burası doğduğum şehir',
        explanations: [
          'Which tek başına yer fikrini iyi tamamlamaz. In which olabilir, ama daha doğal olan where.',
          'When zaman içindir. City bir yerdir, bu yüzden where gerekir.',
          'Doğru. Where, city ile doğulan yeri bağlar.',
          'Borne başka kullanımlarda vardır, ama burada born gerekir: doğmuş.'
        ]
      },
      pl: {
        prompt: 'To miasto, w którym się urodziłem',
        explanations: [
          'Samo which nie domyka dobrze idei miejsca. Może być in which, ale naturalniej: where.',
          'When dotyczy czasu. City to miejsce, więc potrzebne jest where.',
          'Dobrze. Where łączy city z miejscem, w którym ktoś się urodził.',
          'Borne istnieje w innych użyciach, ale tutaj potrzebne jest born: urodzony.'
        ]
      }
    },
    '222': {
      'pt-BR': {
        prompt: 'Agora estamos no cinema',
        explanations: [
          'On the cinema soa como em cima do prédio. Não é esse o sentido.',
          'In the cinema pode significar dentro do prédio, mas a frase-alvo aqui é at the cinema.',
          'Correto. At the cinema é a forma natural para estar no cinema como lugar ou atividade.',
          'Scenario é cenário ou situação. A palavra certa aqui é cinema.'
        ]
      },
      vi: {
        prompt: 'Bây giờ chúng tôi đang ở rạp chiếu phim',
        explanations: [
          'On the cinema nghe như ở trên nóc rạp. Không phải ý này.',
          'In the cinema có thể là bên trong tòa nhà, nhưng câu mục tiêu ở đây là at the cinema.',
          'Đúng. At the cinema là cách tự nhiên để nói đang ở rạp chiếu phim.',
          'Scenario nghĩa là kịch bản hoặc tình huống. Ở đây cần cinema.'
        ]
      },
      id: {
        prompt: 'Kami sekarang berada di bioskop',
        explanations: [
          'On the cinema terdengar seperti di atas gedung bioskop. Bukan itu maksudnya.',
          'In the cinema bisa berarti di dalam gedung, tetapi target kalimat ini adalah at the cinema.',
          'Benar. At the cinema adalah bentuk alami untuk berada di bioskop.',
          'Scenario berarti skenario atau situasi. Di sini perlu cinema.'
        ]
      },
      tr: {
        prompt: 'Şu anda sinemadayız',
        explanations: [
          'On the cinema sinema binasının üstünde gibi duyulur. Burada anlam bu değil.',
          'In the cinema bina içinde olmayı anlatabilir, ama bu sorudaki hedef at the cinema.',
          'Doğru. At the cinema sinemada olmak için doğal ifadedir.',
          'Scenario senaryo veya durum demektir. Burada cinema gerekir.'
        ]
      },
      pl: {
        prompt: 'Jesteśmy teraz w kinie',
        explanations: [
          'On the cinema brzmi jak na dachu kina. Nie o to tutaj chodzi.',
          'In the cinema może znaczyć wewnątrz budynku, ale celem w tym zadaniu jest at the cinema.',
          'Dobrze. At the cinema to naturalna forma dla bycia w kinie.',
          'Scenario znaczy scenariusz albo sytuacja. Tutaj potrzebujesz cinema.'
        ]
      }
    },
    '223': {
      'pt-BR': {
        prompt: 'Eu estava preparando o jantar quando o telefone tocou',
        explanations: [
          'I cooked dinner soa como ação completa. Aqui precisamos de uma ação em progresso: was cooking.',
          'Correto. Was cooking mostra a ação em andamento quando o telefone tocou.',
          'Choking significa engasgando. Aqui precisamos de cooking.',
          'Was ringing muda o foco para o toque como ação prolongada. O evento súbito é rang.'
        ]
      },
      vi: {
        prompt: 'Tôi đang nấu bữa tối thì điện thoại reo',
        explanations: [
          'I cooked dinner nghe như hành động đã hoàn tất. Ở đây cần hành động đang diễn ra: was cooking.',
          'Đúng. Was cooking cho thấy hành động đang tiếp diễn khi điện thoại reo.',
          'Choking nghĩa là bị nghẹn. Ở đây cần cooking.',
          'Was ringing đổi trọng tâm sang tiếng chuông kéo dài. Sự kiện bất chợt là rang.'
        ]
      },
      id: {
        prompt: 'Saya sedang memasak makan malam ketika telepon berdering',
        explanations: [
          'I cooked dinner terdengar seperti tindakan selesai. Di sini perlu tindakan yang sedang berlangsung: was cooking.',
          'Benar. Was cooking menunjukkan tindakan sedang berlangsung saat telepon berdering.',
          'Choking berarti tersedak. Di sini perlu cooking.',
          'Was ringing mengubah fokus menjadi dering yang berlangsung. Peristiwa tiba-tiba adalah rang.'
        ]
      },
      tr: {
        prompt: 'Telefon çaldığında akşam yemeği hazırlıyordum',
        explanations: [
          'I cooked dinner tamamlanmış bir eylem gibi duyulur. Burada devam eden eylem gerekir: was cooking.',
          'Doğru. Was cooking, telefon çaldığında eylemin sürdüğünü gösterir.',
          'Choking boğulmak demektir. Burada cooking gerekir.',
          'Was ringing odağı uzayan çalmaya kaydırır. Ani olay rang ile anlatılır.'
        ]
      },
      pl: {
        prompt: 'Przygotowywałem kolację, kiedy zadzwonił telefon',
        explanations: [
          'I cooked dinner brzmi jak czynność zakończona. Tutaj potrzebna jest czynność w toku: was cooking.',
          'Dobrze. Was cooking pokazuje, że czynność trwała, gdy telefon zadzwonił.',
          'Choking znaczy dusić się. Tutaj potrzebujesz cooking.',
          'Was ringing przesuwa uwagę na dzwonienie jako proces. Nagłe zdarzenie to rang.'
        ]
      }
    },
    '224': {
      'pt-BR': {
        prompt: 'Nós nos divertimos muito na festa',
        explanations: [
          'Enjoy us não funciona aqui. Com enjoy usamos o reflexivo: ourselves.',
          'Correto. Enjoy ourselves significa se divertir.',
          'Shelves são prateleiras. O reflexivo é ourselves. Termo-chave em ingl?s: our shelves..',
          'Panty é outra palavra e muda completamente o sentido. Aqui é party.'
        ]
      },
      vi: {
        prompt: 'Chúng tôi đã rất vui ở bữa tiệc',
        explanations: [
          'Enjoy us không đúng ở đây. Với enjoy cần đại từ phản thân: ourselves.',
          'Đúng. Enjoy ourselves nghĩa là vui vẻ, tận hưởng.',
          'Shelves là những cái kệ. Đại từ phản thân là ourselves. Thu?t ng? ti?ng Anh c?n gi?: our shelves..',
          'Panty là từ khác và đổi hẳn nghĩa. Ở đây cần party.'
        ]
      },
      id: {
        prompt: 'Kami bersenang-senang di pesta',
        explanations: [
          'Enjoy us tidak cocok di sini. Dengan enjoy gunakan bentuk refleksif: ourselves.',
          'Benar. Enjoy ourselves berarti bersenang-senang.',
          'Shelves berarti rak-rak. Bentuk refleksifnya ourselves. Istilah Inggris yang perlu dipertahankan: our shelves..',
          'Panty adalah kata lain dan mengubah makna. Di sini perlu party.'
        ]
      },
      tr: {
        prompt: 'Partide çok eğlendik',
        explanations: [
          'Enjoy us burada çalışmaz. Enjoy ile dönüşlü zamir kullanırız: ourselves.',
          'Doğru. Enjoy ourselves eğlenmek demektir.',
          'Shelves raflar demektir. Dönüşlü zamir ourselves olur. Korunmas? gereken ?ngilizce terim: our shelves..',
          'Panty başka bir kelimedir ve anlamı tamamen değiştirir. Burada party gerekir.'
        ]
      },
      pl: {
        prompt: 'Świetnie bawiliśmy się na imprezie',
        explanations: [
          'Enjoy us tutaj nie działa. Z enjoy używamy formy zwrotnej: ourselves.',
          'Dobrze. Enjoy ourselves znaczy dobrze się bawić.',
          'Shelves to półki. Forma zwrotna to ourselves. Angielski termin do zachowania: our shelves..',
          'Panty to inne słowo i całkiem zmienia sens. Tutaj potrzebujesz party.'
        ]
      }
    },
    '225': {
      'pt-BR': {
        prompt: 'Pare de fazer barulho',
        explanations: [
          'Stop to make noise soa como parar para fazer barulho. Para interromper a ação, usamos stop + -ing.',
          'Correto. Stop making noise significa pare de fazer barulho.',
          'Nose é nariz. Aqui precisamos de noise: barulho.',
          'Depois de stop, para esta ideia, precisamos de making, não make.'
        ]
      },
      vi: {
        prompt: 'Đừng làm ồn nữa',
        explanations: [
          'Stop to make noise nghe như dừng lại để làm ồn. Để dừng một hành động, dùng stop + -ing.',
          'Đúng. Stop making noise nghĩa là đừng làm ồn nữa.',
          'Nose là cái mũi. Ở đây cần noise: tiếng ồn.',
          'Sau stop, với ý này cần making, không phải make.'
        ]
      },
      id: {
        prompt: 'Berhentilah membuat suara berisik',
        explanations: [
          'Stop to make noise terdengar seperti berhenti agar bisa membuat suara. Untuk menghentikan tindakan, pakai stop + -ing.',
          'Benar. Stop making noise berarti berhenti membuat suara berisik.',
          'Nose berarti hidung. Di sini perlu noise: suara berisik.',
          'Setelah stop untuk makna ini, perlu making, bukan make.'
        ]
      },
      tr: {
        prompt: 'Gürültü yapmayı bırak',
        explanations: [
          'Stop to make noise gürültü yapmak için durmak gibi duyulur. Eylemi bırakmak için stop + -ing kullanılır.',
          'Doğru. Stop making noise, gürültü yapmayı bırak demektir.',
          'Nose burun demektir. Burada noise gerekir: gürültü.',
          'Bu anlamda stop sonrasında make değil making gerekir.'
        ]
      },
      pl: {
        prompt: 'Przestań hałasować',
        explanations: [
          'Stop to make noise brzmi jak zatrzymać się, żeby hałasować. Gdy przerywamy czynność, używamy stop + -ing.',
          'Dobrze. Stop making noise znaczy przestań hałasować.',
          'Nose znaczy nos. Tutaj potrzebujesz noise: hałas.',
          'Po stop w tym znaczeniu potrzebne jest making, nie make.'
        ]
      }
    },
    '226': {
      'pt-BR': {
        prompt: 'Chegamos a Londres',
        explanations: [
          'Arrive to não é a combinação padrão para cidades. Usamos arrive in.',
          'Correto. Com cidades e países, a forma natural é arrive in London.',
          'Arrive on não funciona para uma cidade.',
          'Loudon está escrito errado. A cidade é London.'
        ]
      },
      vi: {
        prompt: 'Chúng tôi đã đến London',
        explanations: [
          'Arrive to không phải cách kết hợp chuẩn với thành phố. Ta dùng arrive in.',
          'Đúng. Với thành phố và quốc gia, cách tự nhiên là arrive in London.',
          'Arrive on không dùng cho một thành phố.',
          'Loudon viết sai. Thành phố là London.'
        ]
      },
      id: {
        prompt: 'Kami tiba di London',
        explanations: [
          'Arrive to bukan pasangan standar untuk kota. Gunakan arrive in.',
          'Benar. Untuk kota dan negara, bentuk alami adalah arrive in London.',
          'Arrive on tidak cocok untuk sebuah kota.',
          'Loudon salah ejaan. Kotanya adalah London.'
        ]
      },
      tr: {
        prompt: 'Londra’ya vardık',
        explanations: [
          'Arrive to şehirler için standart kullanım değildir. Arrive in kullanırız.',
          'Doğru. Şehirler ve ülkelerle doğal biçim arrive in London olur.',
          'Arrive on bir şehir için çalışmaz.',
          'Loudon yanlış yazım. Şehir London.'
        ]
      },
      pl: {
        prompt: 'Przyjechaliśmy do Londynu',
        explanations: [
          'Arrive to nie jest standardowym połączeniem z miastami. Używamy arrive in.',
          'Dobrze. Z miastami i krajami naturalna forma to arrive in London.',
          'Arrive on nie działa dla miasta.',
          'Loudon to błąd w pisowni. Miasto to London.'
        ]
      }
    },
    '227': {
      'pt-BR': {
        prompt: 'Não vamos ao cinema hoje',
        explanations: [
          'Correto. Let\'s not go... é a forma natural para uma sugestão negativa.',
          'Let\'s don\'t mistura duas estruturas. Depois de let\'s usamos not, não don\'t.',
          'No let\'s go não é a ordem natural para essa sugestão negativa.',
          'Grow significa crescer. Aqui precisamos de go.'
        ]
      },
      vi: {
        prompt: 'Hôm nay chúng ta đừng đi xem phim',
        explanations: [
          'Đúng. Let\'s not go... là cách tự nhiên để đưa ra đề xuất phủ định.',
          'Let\'s don\'t trộn hai cấu trúc. Sau let\'s dùng not, không dùng don\'t.',
          'No let\'s go không phải trật tự tự nhiên cho đề xuất phủ định này.',
          'Grow nghĩa là lớn lên. Ở đây cần go.'
        ]
      },
      id: {
        prompt: 'Jangan pergi ke bioskop hari ini',
        explanations: [
          'Benar. Let\'s not go... adalah bentuk alami untuk saran negatif.',
          'Let\'s don\'t mencampur dua struktur. Setelah let\'s gunakan not, bukan don\'t.',
          'No let\'s go bukan urutan alami untuk saran negatif ini.',
          'Grow berarti tumbuh. Di sini perlu go.'
        ]
      },
      tr: {
        prompt: 'Bugün sinemaya gitmeyelim',
        explanations: [
          'Doğru. Let\'s not go... olumsuz öneri için doğal biçimdir.',
          'Let\'s don\'t iki yapıyı karıştırır. Let\'s sonrasında don\'t değil not kullanırız.',
          'No let\'s go bu olumsuz öneri için doğal kelime sırası değildir.',
          'Grow büyümek demektir. Burada go gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie chodźmy dziś do kina',
        explanations: [
          'Dobrze. Let\'s not go... to naturalna forma negatywnej propozycji.',
          'Let\'s don\'t miesza dwie struktury. Po let\'s używamy not, nie don\'t.',
          'No let\'s go nie jest naturalnym szykiem dla takiej negatywnej propozycji.',
          'Grow znaczy rosnąć. Tutaj potrzebujesz go.'
        ]
      }
    },
    '228': {
      'pt-BR': {
        prompt: 'Não há nada na caixa',
        explanations: [
          'Correto. Nothing já contém a negação, então there is funciona.',
          'There isn\'t nothing cria dupla negação em inglês padrão.',
          'No thing separado não é a forma natural aqui. Use nothing.',
          'Noting é outra palavra ou erro de escrita. Aqui precisamos de nothing.'
        ]
      },
      vi: {
        prompt: 'Không có gì trong hộp',
        explanations: [
          'Đúng. Nothing đã mang nghĩa phủ định, nên there is dùng được.',
          'There isn\'t nothing tạo phủ định kép trong tiếng Anh chuẩn.',
          'No thing tách ra không phải cách tự nhiên ở đây. Dùng nothing.',
          'Noting là từ khác hoặc lỗi chính tả. Ở đây cần nothing.'
        ]
      },
      id: {
        prompt: 'Tidak ada apa-apa di dalam kotak',
        explanations: [
          'Benar. Nothing sudah mengandung negasi, jadi there is cocok.',
          'There isn\'t nothing membuat double negative dalam bahasa Inggris standar.',
          'No thing terpisah bukan bentuk alami di sini. Gunakan nothing.',
          'Noting adalah kata lain atau salah ejaan. Di sini perlu nothing.'
        ]
      },
      tr: {
        prompt: 'Kutuda hiçbir şey yok',
        explanations: [
          'Doğru. Nothing zaten olumsuz anlam taşır, bu yüzden there is kullanılır.',
          'There isn\'t nothing standart İngilizcede çift olumsuzluk yapar.',
          'No thing ayrı yazıldığında burada doğal değildir. Nothing kullanılır.',
          'Noting başka bir kelime veya yazım hatasıdır. Burada nothing gerekir.'
        ]
      },
      pl: {
        prompt: 'W pudełku nic nie ma',
        explanations: [
          'Dobrze. Nothing już zawiera przeczenie, więc there is pasuje.',
          'There isn\'t nothing tworzy podwójne przeczenie w standardowym angielskim.',
          'No thing osobno nie brzmi tu naturalnie. Użyj nothing.',
          'Noting to inne słowo albo błąd w pisowni. Tutaj potrzebujesz nothing.'
        ]
      }
    },
    '229': {
      'pt-BR': {
        prompt: 'Vou me encontrar com um amigo amanhã',
        explanations: [
          'Correto. Present continuous com tomorrow mostra um plano já combinado.',
          'Present simple soa mais como horário fixo ou rotina. Aqui é um arranjo pessoal.',
          'Fiend significa demônio ou inimigo cruel. Aqui precisamos de friend.',
          'Depois de will usamos verbo base, não meeting.'
        ]
      },
      vi: {
        prompt: 'Ngày mai tôi sẽ gặp một người bạn',
        explanations: [
          'Đúng. Present continuous với tomorrow cho thấy một kế hoạch đã sắp xếp.',
          'Present simple nghe giống lịch cố định hoặc thói quen hơn. Ở đây là cuộc hẹn cá nhân.',
          'Fiend nghĩa là ác quỷ hoặc kẻ xấu. Ở đây cần friend.',
          'Sau will dùng động từ nguyên mẫu, không dùng meeting.'
        ]
      },
      id: {
        prompt: 'Saya akan bertemu dengan seorang teman besok',
        explanations: [
          'Benar. Present continuous dengan tomorrow menunjukkan rencana yang sudah diatur.',
          'Present simple lebih terdengar seperti jadwal tetap atau rutinitas. Ini janji pribadi.',
          'Fiend berarti iblis atau musuh jahat. Di sini perlu friend.',
          'Setelah will gunakan verb dasar, bukan meeting.'
        ]
      },
      tr: {
        prompt: 'Yarın bir arkadaşımla buluşuyorum',
        explanations: [
          'Doğru. Tomorrow ile present continuous, ayarlanmış bir planı gösterir.',
          'Present simple daha çok sabit program veya rutin gibi duyulur. Burada kişisel randevu var.',
          'Fiend şeytan veya kötü düşman demektir. Burada friend gerekir.',
          'Will sonrasında meeting değil yalın fiil kullanılır.'
        ]
      },
      pl: {
        prompt: 'Jutro spotykam się z przyjacielem',
        explanations: [
          'Dobrze. Present continuous z tomorrow pokazuje już ustalony plan.',
          'Present simple brzmi bardziej jak stały harmonogram albo rutyna. Tutaj chodzi o prywatne ustalenie.',
          'Fiend znaczy demon albo okrutny wróg. Tutaj potrzebujesz friend.',
          'Po will używamy formy podstawowej czasownika, nie meeting.'
        ]
      }
    },
    '230': {
      'pt-BR': {
        prompt: 'Tem alguém na cozinha',
        explanations: [
          'Correto. Someone é singular, então usamos is.',
          'Someone é singular. Are não combina com esse sujeito.',
          'Some people é plural, então precisaria de are, não is.',
          'Some bone parece algum osso. Aqui a palavra é someone.'
        ]
      },
      vi: {
        prompt: 'Có ai đó trong bếp',
        explanations: [
          'Đúng. Someone là số ít, nên dùng is.',
          'Someone là số ít. Are không hợp với chủ ngữ này.',
          'Some people là số nhiều, nên cần are, không phải is.',
          'Some bone nghe như một cái xương nào đó. Ở đây cần someone.'
        ]
      },
      id: {
        prompt: 'Ada seseorang di dapur',
        explanations: [
          'Benar. Someone itu tunggal, jadi gunakan is.',
          'Someone itu tunggal. Are tidak cocok dengan subjek ini.',
          'Some people itu jamak, jadi perlu are, bukan is.',
          'Some bone terdengar seperti suatu tulang. Di sini perlu someone.'
        ]
      },
      tr: {
        prompt: 'Mutfakta biri var',
        explanations: [
          'Doğru. Someone tekildir, bu yüzden is kullanılır.',
          'Someone tekildir. Are bu özneyle uyuşmaz.',
          'Some people çoğuldur, bu yüzden is değil are gerekir.',
          'Some bone bir kemik gibi duyulur. Burada someone gerekir.'
        ]
      },
      pl: {
        prompt: 'Ktoś jest w kuchni',
        explanations: [
          'Dobrze. Someone jest liczbą pojedynczą, więc używamy is.',
          'Someone jest liczbą pojedynczą. Are nie pasuje do tego podmiotu.',
          'Some people jest liczbą mnogą, więc potrzebne byłoby are, nie is.',
          'Some bone brzmi jak jakaś kość. Tutaj potrzebujesz someone.'
        ]
      }
    },
    '231': {
      'pt-BR': {
        prompt: 'Eu costumava jogar futebol nos fins de semana',
        explanations: [
          'Was + verbo base não funciona para esse hábito passado. Aqui precisamos de used to.',
          'Correto. Used to + verbo base fala de algo que era habitual no passado.',
          'Pray significa rezar. Para futebol, o verbo é play.',
          'Falta to depois de used: used to play.'
        ]
      },
      vi: {
        prompt: 'Trước đây tôi thường chơi bóng đá vào cuối tuần',
        explanations: [
          'Was + động từ nguyên mẫu không diễn tả thói quen quá khứ như vậy. Ở đây cần used to.',
          'Đúng. Used to + động từ nguyên mẫu nói về việc từng là thói quen trong quá khứ.',
          'Pray nghĩa là cầu nguyện. Với bóng đá cần play.',
          'Sau used còn thiếu to: used to play.'
        ]
      },
      id: {
        prompt: 'Dulu saya biasa bermain sepak bola pada akhir pekan',
        explanations: [
          'Was + verb dasar tidak dipakai untuk kebiasaan masa lalu seperti ini. Di sini perlu used to.',
          'Benar. Used to + verb dasar berbicara tentang kebiasaan di masa lalu.',
          'Pray berarti berdoa. Untuk sepak bola, gunakan play.',
          'Setelah used masih perlu to: used to play.'
        ]
      },
      tr: {
        prompt: 'Eskiden hafta sonları futbol oynardım',
        explanations: [
          'Was + yalın fiil bu geçmiş alışkanlığı anlatmaz. Burada used to gerekir.',
          'Doğru. Used to + yalın fiil geçmişteki alışkanlığı anlatır.',
          'Pray dua etmek demektir. Futbol için play gerekir.',
          'Used sonrası to eksik: used to play.'
        ]
      },
      pl: {
        prompt: 'Kiedyś grałem w piłkę nożną w weekendy',
        explanations: [
          'Was + forma podstawowa czasownika nie działa dla takiego dawnego nawyku. Tutaj potrzebne jest used to.',
          'Dobrze. Used to + podstawowa forma czasownika mówi o nawyku z przeszłości.',
          'Pray znaczy modlić się. Do piłki nożnej potrzebujesz play.',
          'Po used brakuje to: used to play.'
        ]
      }
    }
  },
  hard: {
    '1': {
      'pt-BR': {
        prompt: 'Ele não só chegou atrasado, como também esqueceu seus documentos',
        explanations: [
          'Quando Not only abre a frase, usamos inversão: Not only was he late.',
          'Correto. Not only no início puxa was para antes do sujeito.',
          'Departments são departamentos. Aqui a palavra certa é documents.',
          'Falta but e a posição de also fica estranha. A forma natural é but he also forgot.'
        ]
      },
      vi: {
        prompt: 'Anh ấy không chỉ đến muộn mà còn quên giấy tờ của mình',
        explanations: [
          'Khi Not only đứng đầu câu, cần đảo ngữ: Not only was he late.',
          'Đúng. Not only ở đầu câu kéo was lên trước chủ ngữ.',
          'Departments là phòng ban. Ở đây cần documents.',
          'Thiếu but và vị trí also nghe không tự nhiên. Tự nhiên là but he also forgot.'
        ]
      },
      id: {
        prompt: 'Dia tidak hanya terlambat, tetapi juga lupa membawa dokumennya',
        explanations: [
          'Saat Not only membuka kalimat, perlu inversion: Not only was he late.',
          'Benar. Not only di awal membuat was datang sebelum subjek.',
          'Departments berarti departemen. Di sini yang benar documents.',
          'Kurang but dan posisi also terdengar tidak alami. Bentuk alami: but he also forgot.'
        ]
      },
      tr: {
        prompt: 'Sadece geç kalmakla kalmadı, belgelerini de unuttu',
        explanations: [
          'Cümle Not only ile başlarsa inversion gerekir: Not only was he late.',
          'Doğru. Baştaki Not only, was kelimesini özneden önce getirir.',
          'Departments departmanlar demektir. Burada documents gerekir.',
          'But eksik ve also\'nun yeri doğal değil. Doğal yapı: but he also forgot.'
        ]
      },
      pl: {
        prompt: 'Nie tylko się spóźnił, ale też zapomniał dokumentów',
        explanations: [
          'Gdy Not only stoi na początku zdania, potrzebna jest inwersja: Not only was he late.',
          'Dobrze. Początkowe Not only przenosi was przed podmiot.',
          'Departments to działy. Tutaj potrzebujesz documents.',
          'Brakuje but, a pozycja also brzmi nienaturalnie. Naturalnie: but he also forgot.'
        ]
      }
    },
    '2': {
      'pt-BR': {
        prompt: 'Eu me incomodo quando me dizem o que fazer',
        explanations: [
          'Depois de resent normalmente usamos -ing, não infinitivo com to.',
          'Correto. Resent being told significa se incomodar por receber ordens.',
          'Dew é orvalho. Aqui a palavra é do.',
          'Say me não é natural aqui. Para dar instruções a alguém, usamos tell me.'
        ]
      },
      vi: {
        prompt: 'Tôi bực mình khi bị bảo phải làm gì',
        explanations: [
          'Sau resent thường dùng dạng -ing, không dùng to + verb.',
          'Đúng. Resent being told nghĩa là bực vì bị bảo phải làm gì.',
          'Dew nghĩa là sương. Ở đây cần do.',
          'Say me không tự nhiên ở đây. Khi ra lệnh hoặc hướng dẫn ai, dùng tell me.'
        ]
      },
      id: {
        prompt: 'Saya kesal ketika disuruh-suruh',
        explanations: [
          'Setelah resent biasanya memakai bentuk -ing, bukan to + verb.',
          'Benar. Resent being told berarti kesal karena diberi perintah.',
          'Dew berarti embun. Di sini perlu do.',
          'Say me tidak alami di sini. Untuk instruksi kepada seseorang, gunakan tell me.'
        ]
      },
      tr: {
        prompt: 'Bana ne yapacağımın söylenmesine kızarım',
        explanations: [
          'Resent sonrasında genelde to + fiil değil, -ing kullanılır.',
          'Doğru. Resent being told, birinin sana ne yapacağını söylemesine kızmak demektir.',
          'Dew çiy demektir. Burada do gerekir.',
          'Say me burada doğal değildir. Birine talimat vermek için tell me kullanılır.'
        ]
      },
      pl: {
        prompt: 'Nie znoszę, gdy mówi mi się, co mam robić',
        explanations: [
          'Po resent zwykle używamy formy -ing, nie bezokolicznika z to.',
          'Dobrze. Resent being told znaczy mieć niechęć do tego, że ktoś wydaje polecenia.',
          'Dew znaczy rosa. Tutaj potrzebujesz do.',
          'Say me nie brzmi tu naturalnie. Przy dawaniu poleceń używamy tell me.'
        ]
      }
    },
    '3': {
      'pt-BR': {
        prompt: 'Estou atolado de trabalho por causa deste novo projeto',
        explanations: [
          'Correto. Snowed under with work quer dizer estar sobrecarregado de trabalho.',
          'Snowed below não é a expressão. A expressão é snowed under.',
          'Showed under mistura outra palavra. Aqui precisamos de snowed.',
          'Have very much work soa pouco natural. A forma comum seria have a lot of work.'
        ]
      },
      vi: {
        prompt: 'Tôi đang ngập trong công việc vì dự án mới này',
        explanations: [
          'Đúng. Snowed under with work nghĩa là bị công việc chất quá nhiều.',
          'Snowed below không phải thành ngữ này. Thành ngữ là snowed under.',
          'Showed under dùng nhầm từ. Ở đây cần snowed.',
          'Have very much work nghe không tự nhiên. Thường nói have a lot of work.'
        ]
      },
      id: {
        prompt: 'Saya sedang kewalahan dengan pekerjaan karena proyek baru ini',
        explanations: [
          'Benar. Snowed under with work berarti sangat kewalahan oleh pekerjaan.',
          'Snowed below bukan ungkapannya. Ungkapannya adalah snowed under.',
          'Showed under memakai kata lain. Di sini perlu snowed.',
          'Have very much work terdengar tidak alami. Bentuk umum: have a lot of work.'
        ]
      },
      tr: {
        prompt: 'Bu yeni proje yüzünden işlere gömülmüş durumdayım',
        explanations: [
          'Doğru. Snowed under with work, işten çok bunalmış olmak demektir.',
          'Snowed below bu ifade değildir. Doğru ifade snowed under.',
          'Showed under farklı bir kelimeyle karışmış. Burada snowed gerekir.',
          'Have very much work doğal duyulmaz. Yaygın biçim have a lot of work olurdu.'
        ]
      },
      pl: {
        prompt: 'Jestem teraz zawalony pracą przez ten nowy projekt',
        explanations: [
          'Dobrze. Snowed under with work znaczy być mocno przytłoczonym pracą.',
          'Snowed below nie jest tym idiomem. Idiom to snowed under.',
          'Showed under miesza inne słowo. Tutaj potrzebujesz snowed.',
          'Have very much work brzmi nienaturalnie. Zwykle powiedzielibyśmy have a lot of work.'
        ]
      }
    },
    '4': {
      'pt-BR': {
        prompt: 'Sugiro que ele renuncie imediatamente',
        explanations: [
          'Depois de suggest that em estilo formal, o verbo pode ficar na forma base: he resign.',
          'Correto. I suggest that he resign usa a forma base no subjuntivo.',
          'Resigned coloca a ação no passado. A sugestão é para agora.',
          'Re-sign significa assinar de novo. Resign sem hífen é renunciar.'
        ]
      },
      vi: {
        prompt: 'Tôi đề nghị anh ấy từ chức ngay lập tức',
        explanations: [
          'Sau suggest that trong văn phong trang trọng, động từ có thể ở dạng nguyên mẫu: he resign.',
          'Đúng. I suggest that he resign dùng dạng nguyên mẫu trong subjunctive.',
          'Resigned đưa hành động về quá khứ. Lời đề nghị là cho hiện tại.',
          'Re-sign nghĩa là ký lại. Resign không có gạch nối là từ chức.'
        ]
      },
      id: {
        prompt: 'Saya menyarankan agar dia segera mengundurkan diri',
        explanations: [
          'Setelah suggest that dalam gaya formal, verb bisa memakai bentuk dasar: he resign.',
          'Benar. I suggest that he resign memakai bentuk dasar dalam subjunctive.',
          'Resigned membuat tindakannya menjadi masa lalu. Saran ini untuk sekarang.',
          'Re-sign berarti menandatangani lagi. Resign tanpa tanda hubung berarti mengundurkan diri.'
        ]
      },
      tr: {
        prompt: 'Onun hemen istifa etmesini öneriyorum',
        explanations: [
          'Suggest that sonrasında resmi kullanımda fiil yalın halde olabilir: he resign.',
          'Doğru. I suggest that he resign, subjunctive içinde yalın fiil kullanır.',
          'Resigned eylemi geçmişe taşır. Öneri şu anla ilgilidir.',
          'Re-sign yeniden imzalamak demektir. Resign, tire olmadan istifa etmektir.'
        ]
      },
      pl: {
        prompt: 'Sugeruję, żeby natychmiast zrezygnował',
        explanations: [
          'Po suggest that w stylu formalnym czasownik może mieć formę podstawową: he resign.',
          'Dobrze. I suggest that he resign używa formy podstawowej w trybie łączącym.',
          'Resigned przenosi czynność w przeszłość. Sugestia dotyczy teraźniejszości.',
          'Re-sign znaczy podpisać ponownie. Resign bez myślnika znaczy zrezygnować ze stanowiska.'
        ]
      }
    },
    '5': {
      'pt-BR': {
        prompt: 'Dizem que ele ganhou uma fortuna com criptomoedas',
        explanations: [
          'Earn fala mais do presente ou hábito. Aqui a fortuna já foi ganha, então precisamos de have earned.',
          'Correto. He is said to have earned reporta uma ação anterior ao momento em que falam dele.',
          'It is said him não é a estrutura correta. Use He is said to... ou It is said that he...',
          'Fortunate é adjetivo: sortudo. Aqui precisamos do substantivo fortune.'
        ]
      },
      vi: {
        prompt: 'Người ta nói anh ấy đã kiếm được cả gia tài từ tiền mã hóa',
        explanations: [
          'Earn nghe như hiện tại hoặc thói quen. Ở đây việc kiếm tiền đã xảy ra, nên cần have earned.',
          'Đúng. He is said to have earned nói về hành động xảy ra trước thời điểm người ta nói.',
          'It is said him không phải cấu trúc đúng. Dùng He is said to... hoặc It is said that he...',
          'Fortunate là tính từ: may mắn. Ở đây cần danh từ fortune.'
        ]
      },
      id: {
        prompt: 'Katanya dia menghasilkan banyak uang dari kripto',
        explanations: [
          'Earn lebih terdengar seperti masa kini atau kebiasaan. Di sini hartanya sudah didapat, jadi perlu have earned.',
          'Benar. He is said to have earned melaporkan tindakan yang terjadi sebelum orang membicarakannya.',
          'It is said him bukan struktur yang benar. Pakai He is said to... atau It is said that he...',
          'Fortunate adalah kata sifat: beruntung. Di sini perlu noun fortune.'
        ]
      },
      tr: {
        prompt: 'Kripto paradan bir servet kazandığı söyleniyor',
        explanations: [
          'Earn daha çok şimdiki durum veya alışkanlık gibi duyulur. Servet önceden kazanıldığı için have earned gerekir.',
          'Doğru. He is said to have earned, söylenme anından önceki bir eylemi bildirir.',
          'It is said him doğru yapı değildir. He is said to... veya It is said that he... kullanılır.',
          'Fortunate şanslı demektir. Burada isim olan fortune gerekir.'
        ]
      },
      pl: {
        prompt: 'Mówi się, że dorobił się fortuny na kryptowalutach',
        explanations: [
          'Earn brzmi bardziej jak teraźniejszość albo nawyk. Tutaj fortuna została już zdobyta, więc potrzebne jest have earned.',
          'Dobrze. He is said to have earned raportuje czynność wcześniejszą niż samo mówienie o niej.',
          'It is said him nie jest poprawną strukturą. Użyj He is said to... albo It is said that he...',
          'Fortunate to przymiotnik: mający szczęście. Tutaj potrzebujesz rzeczownika fortune.'
        ]
      }
    },
    '6': {
      'pt-BR': {
        prompt: 'Estou em uma encruzilhada agora e não sei qual caminho profissional escolher',
        explanations: [
          'Crosswords são palavras cruzadas. A expressão para uma decisão importante é crossroads.',
          'Correto. At a crossroads significa estar em um ponto de decisão.',
          'A expressão idiomática usa at, não on: at a crossroads.',
          'A tradução literal soa pesada. Em inglês natural usamos o idiom at a crossroads.'
        ]
      },
      vi: {
        prompt: 'Bây giờ tôi đang đứng trước ngã rẽ và không biết nên chọn con đường sự nghiệp nào',
        explanations: [
          'Crosswords là trò ô chữ. Thành ngữ cho điểm phải quyết định là crossroads.',
          'Đúng. At a crossroads nghĩa là đang ở một điểm phải lựa chọn.',
          'Thành ngữ dùng at, không dùng on: at a crossroads.',
          'Dịch từng chữ nghe nặng nề. Tiếng Anh tự nhiên dùng at a crossroads.'
        ]
      },
      id: {
        prompt: 'Saya sedang berada di persimpangan dan tidak tahu jalur karier mana yang harus dipilih',
        explanations: [
          'Crosswords berarti teka-teki silang. Ungkapan untuk titik keputusan adalah crossroads.',
          'Benar. At a crossroads berarti berada di titik harus membuat pilihan.',
          'Idiom ini memakai at, bukan on: at a crossroads.',
          'Terjemahan literal terdengar berat. Bahasa Inggris alami memakai at a crossroads.'
        ]
      },
      tr: {
        prompt: 'Şu anda bir yol ayrımındayım ve hangi kariyer yolunu seçeceğimi bilmiyorum',
        explanations: [
          'Crosswords bulmaca demektir. Önemli karar noktası için ifade crossroads olur.',
          'Doğru. At a crossroads, karar noktasında olmak demektir.',
          'Bu deyim on değil at kullanır: at a crossroads.',
          'Kelime kelime çeviri ağır duyulur. Doğal İngilizce at a crossroads der.'
        ]
      },
      pl: {
        prompt: 'Jestem teraz na rozdrożu i nie wiem, którą ścieżkę kariery wybrać',
        explanations: [
          'Crosswords to krzyżówki. Idiom dla ważnego punktu decyzji to crossroads.',
          'Dobrze. At a crossroads znaczy być w punkcie, w którym trzeba wybrać.',
          'Ten idiom używa at, nie on: at a crossroads.',
          'Dosłowne tłumaczenie brzmi ciężko. Naturalnie po angielsku mówimy at a crossroads.'
        ]
      }
    },
    '7': {
      'pt-BR': {
        prompt: 'Se eu não estivesse tão ocupado esta semana, iria ao show com você amanhã',
        explanations: [
          'Correto. Second conditional usa If + past form e would + verbo base.',
          'Na parte com if não usamos wouldn\'t para formar a condição imaginária.',
          'Will deixa a segunda parte real demais. Em second conditional precisamos de would.',
          'To marrow parece uma confusão sonora. A palavra certa é tomorrow.'
        ]
      },
      vi: {
        prompt: 'Nếu tuần này tôi không quá bận, ngày mai tôi sẽ đi xem hòa nhạc với bạn',
        explanations: [
          'Đúng. Second conditional dùng If + dạng quá khứ và would + động từ nguyên mẫu.',
          'Trong mệnh đề if, ta không dùng wouldn\'t để tạo điều kiện giả định như vậy.',
          'Will làm vế sau quá thật. Trong second conditional cần would.',
          'To marrow là nhầm âm. Từ đúng là tomorrow.'
        ]
      },
      id: {
        prompt: 'Jika minggu ini saya tidak begitu sibuk, saya akan pergi ke konser bersamamu besok',
        explanations: [
          'Benar. Second conditional memakai If + bentuk lampau dan would + verb dasar.',
          'Di bagian if, kita tidak memakai wouldn\'t untuk membentuk kondisi imajiner seperti ini.',
          'Will membuat bagian hasil terlalu nyata. Dalam second conditional perlu would.',
          'To marrow adalah kekeliruan bunyi. Kata yang benar tomorrow.'
        ]
      },
      tr: {
        prompt: 'Bu hafta bu kadar meşgul olmasaydım, yarın seninle konsere giderdim',
        explanations: [
          'Doğru. Second conditional, If + geçmiş biçim ve would + yalın fiil kullanır.',
          'If kısmında bu hayali koşulu kurmak için wouldn\'t kullanmayız.',
          'Will sonucu fazla gerçek yapar. Second conditional içinde would gerekir.',
          'To marrow ses benzerliği hatasıdır. Doğru kelime tomorrow.'
        ]
      },
      pl: {
        prompt: 'Gdybym nie był w tym tygodniu tak zajęty, poszedłbym jutro z tobą na koncert',
        explanations: [
          'Dobrze. Second conditional używa If + forma przeszła oraz would + forma podstawowa.',
          'W części z if nie używamy wouldn\'t do budowania takiego warunku wyobrażonego.',
          'Will robi wynik zbyt realny. W second conditional potrzebne jest would.',
          'To marrow to pomyłka brzmieniowa. Poprawne słowo to tomorrow.'
        ]
      }
    },
    '8': {
      'pt-BR': {
        prompt: 'Precisamos resolver alguns detalhes antes do lançamento do projeto',
        explanations: [
          'Correto. Iron out details significa resolver ou ajustar detalhes.',
          'Retails não é details. Aqui falamos de detalhes, não de varejo.',
          'O phrasal verb é iron out, não iron after.',
          'Smooth the details dá para entender, mas não é a expressão natural aqui.'
        ]
      },
      vi: {
        prompt: 'Chúng ta cần xử lý vài chi tiết trước khi dự án ra mắt',
        explanations: [
          'Đúng. Iron out details nghĩa là giải quyết hoặc chỉnh lại các chi tiết.',
          'Retails không phải details. Ở đây nói về chi tiết, không phải bán lẻ.',
          'Phrasal verb là iron out, không phải iron after.',
          'Smooth the details có thể hiểu được, nhưng không phải cách diễn đạt tự nhiên ở đây.'
        ]
      },
      id: {
        prompt: 'Kita perlu membereskan beberapa detail sebelum peluncuran proyek',
        explanations: [
          'Benar. Iron out details berarti menyelesaikan atau merapikan detail.',
          'Retails bukan details. Di sini maksudnya detail, bukan retail.',
          'Phrasal verb-nya iron out, bukan iron after.',
          'Smooth the details bisa dipahami, tetapi bukan ungkapan alami di sini.'
        ]
      },
      tr: {
        prompt: 'Proje lansmanından önce birkaç ayrıntıyı netleştirmemiz gerekiyor',
        explanations: [
          'Doğru. Iron out details, ayrıntıları çözmek veya netleştirmek demektir.',
          'Retails, details değildir. Burada perakendeden değil ayrıntılardan söz ediyoruz.',
          'Phrasal verb iron out olur, iron after değil.',
          'Smooth the details anlaşılabilir ama burada doğal ifade değildir.'
        ]
      },
      pl: {
        prompt: 'Musimy dopracować kilka szczegółów przed startem projektu',
        explanations: [
          'Dobrze. Iron out details znaczy rozwiązać albo dopracować szczegóły.',
          'Retails to nie details. Tutaj chodzi o szczegóły, nie handel detaliczny.',
          'Phrasal verb to iron out, nie iron after.',
          'Smooth the details da się zrozumieć, ale nie jest tu naturalnym zwrotem.'
        ]
      }
    },
    '9': {
      'pt-BR': {
        prompt: 'Mal eu entrei na casa, o telefone tocou',
        explanations: [
          'Scarcely combina naturalmente com when, não than.',
          'Quando Scarcely vem no início, usamos inversão: Scarcely had I entered.',
          'Correto. Scarcely had I entered... when... é uma estrutura formal com inversão.',
          'Horse é cavalo. Aqui precisamos de house: casa.'
        ]
      },
      vi: {
        prompt: 'Tôi vừa mới bước vào nhà thì điện thoại reo',
        explanations: [
          'Scarcely đi tự nhiên với when, không phải than.',
          'Khi Scarcely đứng đầu câu, cần đảo ngữ: Scarcely had I entered.',
          'Đúng. Scarcely had I entered... when... là cấu trúc trang trọng có đảo ngữ.',
          'Horse là con ngựa. Ở đây cần house: ngôi nhà.'
        ]
      },
      id: {
        prompt: 'Baru saja saya masuk rumah, telepon berdering',
        explanations: [
          'Scarcely secara alami berpasangan dengan when, bukan than.',
          'Jika Scarcely ada di awal, perlu inversion: Scarcely had I entered.',
          'Benar. Scarcely had I entered... when... adalah struktur formal dengan inversion.',
          'Horse berarti kuda. Di sini perlu house: rumah.'
        ]
      },
      tr: {
        prompt: 'Eve girer girmez telefon çaldı',
        explanations: [
          'Scarcely doğal olarak when ile kullanılır, than ile değil.',
          'Scarcely cümle başına gelirse inversion gerekir: Scarcely had I entered.',
          'Doğru. Scarcely had I entered... when... inversion içeren resmi bir yapıdır.',
          'Horse at demektir. Burada house gerekir: ev.'
        ]
      },
      pl: {
        prompt: 'Ledwie wszedłem do domu, zadzwonił telefon',
        explanations: [
          'Scarcely naturalnie łączy się z when, nie z than.',
          'Gdy Scarcely stoi na początku zdania, potrzebna jest inwersja: Scarcely had I entered.',
          'Dobrze. Scarcely had I entered... when... to formalna struktura z inwersją.',
          'Horse znaczy koń. Tutaj potrzebujesz house: dom.'
        ]
      }
    },
    '10': {
      'pt-BR': {
        prompt: 'Em hipótese alguma você deve interromper o diretor durante o discurso dele',
        explanations: [
          'Quando On no account abre a frase, usamos inversão: should you, não you should.',
          'Correto. On no account should you... é uma forma forte de dizer que não se deve fazer algo.',
          'Interpret significa interpretar ou traduzir. Aqui precisamos de interrupt.',
          'A expressão fixa é on no account, não in no account.'
        ]
      },
      vi: {
        prompt: 'Tuyệt đối không được ngắt lời giám đốc trong lúc ông ấy phát biểu',
        explanations: [
          'Khi On no account đứng đầu câu, cần đảo ngữ: should you, không phải you should.',
          'Đúng. On no account should you... là cách nhấn mạnh rằng tuyệt đối không nên làm điều đó.',
          'Interpret nghĩa là diễn giải hoặc phiên dịch. Ở đây cần interrupt.',
          'Cụm cố định là on no account, không phải in no account.'
        ]
      },
      id: {
        prompt: 'Dalam keadaan apa pun kamu tidak boleh menyela direktur saat pidatonya',
        explanations: [
          'Saat On no account membuka kalimat, perlu inversion: should you, bukan you should.',
          'Benar. On no account should you... adalah cara tegas untuk mengatakan sesuatu tidak boleh dilakukan.',
          'Interpret berarti menafsirkan atau menerjemahkan lisan. Di sini perlu interrupt.',
          'Ungkapan tetapnya adalah on no account, bukan in no account.'
        ]
      },
      tr: {
        prompt: 'Müdürü konuşması sırasında hiçbir şekilde bölmemelisin',
        explanations: [
          'On no account cümle başına gelirse inversion gerekir: should you, you should değil.',
          'Doğru. On no account should you... bir şeyi kesinlikle yapmamak gerektiğini güçlü biçimde söyler.',
          'Interpret yorumlamak veya tercüme etmek demektir. Burada interrupt gerekir.',
          'Sabit ifade on no account olur, in no account değil.'
        ]
      },
      pl: {
        prompt: 'Pod żadnym pozorem nie wolno przerywać dyrektorowi podczas przemówienia',
        explanations: [
          'Gdy On no account stoi na początku zdania, potrzebna jest inwersja: should you, nie you should.',
          'Dobrze. On no account should you... mocno mówi, że absolutnie nie należy czegoś robić.',
          'Interpret znaczy interpretować albo tłumaczyć ustnie. Tutaj potrzebujesz interrupt.',
          'Stałe wyrażenie to on no account, nie in no account.'
        ]
      }
    },
    '11': {
      'pt-BR': {
        prompt: 'Finalmente consegui fazer com que ele assinasse o contrato',
        explanations: [
          'Depois de get him falta to antes de sign. A estrutura é get someone to do something: get him to sign.',
          'Make someone do something não leva to, mas aqui a frase usa make him to, que não funciona.',
          'Correto. Get him to sign significa conseguir que ele assine.',
          'Sing significa cantar. Aqui precisamos de sign: assinar.'
        ]
      },
      vi: {
        prompt: 'Cuối cùng tôi đã thuyết phục được anh ấy ký hợp đồng',
        explanations: [
          'Sau get him còn thiếu to trước sign. Cấu trúc là get someone to do something: get him to sign.',
          'Make someone do something không dùng to, nhưng ở đây make him to không đúng.',
          'Đúng. Get him to sign nghĩa là khiến hoặc thuyết phục anh ấy ký.',
          'Sing nghĩa là hát. Ở đây cần sign: ký.'
        ]
      },
      id: {
        prompt: 'Akhirnya saya berhasil membuat dia menandatangani kontrak',
        explanations: [
          'Setelah get him kurang to sebelum sign. Strukturnya adalah get someone to do something: get him to sign.',
          'Make someone do something tidak memakai to, tetapi make him to di sini tidak benar.',
          'Benar. Get him to sign berarti berhasil membuat dia menandatangani.',
          'Sing berarti menyanyi. Di sini perlu sign: menandatangani.'
        ]
      },
      tr: {
        prompt: 'Sonunda ona sözleşmeyi imzalatmayı başardım',
        explanations: [
          'Get him sonrasında sign öncesinde to eksik. Yapı get someone to do something: get him to sign olur.',
          'Make someone do something to almaz, ama burada make him to çalışmaz.',
          'Doğru. Get him to sign, ona imzalatmayı başarmak demektir.',
          'Sing şarkı söylemek demektir. Burada sign gerekir: imzalamak.'
        ]
      },
      pl: {
        prompt: 'W końcu udało mi się namówić go do podpisania umowy',
        explanations: [
          'Po get him brakuje to przed sign. Struktura to get someone to do something: get him to sign.',
          'Make someone do something nie bierze to, ale tutaj make him to nie działa.',
          'Dobrze. Get him to sign znaczy doprowadzić do tego, żeby podpisał.',
          'Sing znaczy śpiewać. Tutaj potrzebujesz sign: podpisać.'
        ]
      }
    },
    '12': {
      'pt-BR': {
        prompt: 'Se você acha que ele vai te ajudar com dinheiro, está procurando no lugar errado',
        explanations: [
          'A expressão fixa é bark up the wrong tree. Falta up.',
          'Correto. Barking up the wrong tree significa procurar a solução ou a pessoa errada.',
          'Walking on the wrong way é literal demais e não é o idiom natural.',
          'Tea significa chá. A expressão termina com tree.'
        ]
      },
      vi: {
        prompt: 'Nếu bạn nghĩ anh ấy sẽ giúp bạn tiền bạc, bạn đang nhầm hướng',
        explanations: [
          'Thành ngữ cố định là bark up the wrong tree. Còn thiếu up.',
          'Đúng. Barking up the wrong tree nghĩa là tìm sai hướng hoặc nhắm sai người.',
          'Walking on the wrong way quá sát nghĩa và không phải thành ngữ tự nhiên.',
          'Tea nghĩa là trà. Thành ngữ kết thúc bằng tree.'
        ]
      },
      id: {
        prompt: 'Jika kamu pikir dia akan membantumu dengan uang, kamu salah sasaran',
        explanations: [
          'Ungkapan tetapnya bark up the wrong tree. Kurang up.',
          'Benar. Barking up the wrong tree berarti mencari solusi atau orang yang salah.',
          'Walking on the wrong way terlalu literal dan bukan idiom alami.',
          'Tea berarti teh. Ungkapannya berakhir dengan tree.'
        ]
      },
      tr: {
        prompt: 'Onun sana para konusunda yardım edeceğini düşünüyorsan yanlış kapıyı çalıyorsun',
        explanations: [
          'Sabit ifade bark up the wrong tree olur. Up eksik.',
          'Doğru. Barking up the wrong tree, çözümü veya kişiyi yanlış yerde aramak demektir.',
          'Walking on the wrong way fazla kelime kelime ve doğal deyim değildir.',
          'Tea çay demektir. İfade tree ile biter.'
        ]
      },
      pl: {
        prompt: 'Jeśli myślisz, że pomoże ci finansowo, szukasz w złym miejscu',
        explanations: [
          'Stałe wyrażenie to bark up the wrong tree. Brakuje up.',
          'Dobrze. Barking up the wrong tree znaczy szukać rozwiązania albo osoby w złym miejscu.',
          'Walking on the wrong way jest zbyt dosłowne i nie jest naturalnym idiomem.',
          'Tea znaczy herbata. Wyrażenie kończy się słowem tree.'
        ]
      }
    },
    '13': {
      'pt-BR': {
        prompt: 'Ele supostamente desviou fundos públicos',
        explanations: [
          'Correto. Allegedly mostra que algo é afirmado, mas não apresentado como provado; embezzled public funds é preciso.',
          'Allergicly não encaixa. Parece allergy, alergia.',
          'They say that he took state money passa a ideia, mas é bem menos preciso e formal.',
          'Finds significa achados. Aqui precisamos de funds: fundos.'
        ]
      },
      vi: {
        prompt: 'Người ta cáo buộc anh ấy đã biển thủ công quỹ',
        explanations: [
          'Đúng. Allegedly cho thấy điều này được nói hoặc cáo buộc, chưa được trình bày như sự thật đã chứng minh.',
          'Allergicly không phù hợp. Nó gợi đến allergy, dị ứng.',
          'They say that he took state money truyền ý, nhưng kém chính xác và kém trang trọng hơn.',
          'Finds nghĩa là những thứ tìm thấy. Ở đây cần funds: quỹ.'
        ]
      },
      id: {
        prompt: 'Dia diduga menggelapkan dana publik',
        explanations: [
          'Benar. Allegedly menunjukkan sesuatu dikatakan atau dituduhkan, tetapi belum dinyatakan terbukti.',
          'Allergicly tidak cocok. Itu terdengar terkait allergy, alergi.',
          'They say that he took state money menyampaikan ide, tetapi jauh kurang tepat dan formal.',
          'Finds berarti temuan. Di sini perlu funds: dana.'
        ]
      },
      tr: {
        prompt: 'Kamu fonlarını zimmetine geçirdiği iddia ediliyor',
        explanations: [
          'Doğru. Allegedly, bir şeyin iddia edildiğini ama kanıtlanmış gibi sunulmadığını gösterir.',
          'Allergicly burada uymaz. Allergy, alerji kelimesini çağrıştırır.',
          'They say that he took state money anlamı verir ama çok daha az kesin ve resmidir.',
          'Finds buluntular demektir. Burada funds gerekir: fonlar.'
        ]
      },
      pl: {
        prompt: 'Rzekomo sprzeniewierzył środki publiczne',
        explanations: [
          'Dobrze. Allegedly pokazuje, że coś jest twierdzone, ale nie przedstawiane jako udowodnione.',
          'Allergicly tutaj nie pasuje. Kojarzy się z allergy, alergią.',
          'They say that he took state money oddaje sens, ale jest dużo mniej precyzyjne i formalne.',
          'Finds znaczy znaleziska. Tutaj potrzebujesz funds: fundusze.'
        ]
      }
    },
    '14': {
      'pt-BR': {
        prompt: 'Encontrei por acaso este manuscrito raro no porão',
        explanations: [
          'Stumble above não expressa encontrar algo por acaso. A combinação natural é stumble upon.',
          'Correto. Stumble upon significa encontrar algo inesperadamente.',
          'Accidental é adjetivo. Aqui seria accidentally found, mas o phrasal verb é melhor.',
          'Mumbled significa murmurou. Aqui precisamos de stumbled.'
        ]
      },
      vi: {
        prompt: 'Tôi tình cờ bắt gặp bản thảo hiếm này trong tầng hầm',
        explanations: [
          'Stumble above không diễn tả việc tình cờ tìm thấy. Cụm tự nhiên là stumble upon.',
          'Đúng. Stumble upon nghĩa là tình cờ tìm thấy điều gì đó.',
          'Accidental là tính từ. Ở đây sẽ là accidentally found, nhưng phrasal verb tự nhiên hơn.',
          'Mumbled nghĩa là lẩm bẩm. Ở đây cần stumbled.'
        ]
      },
      id: {
        prompt: 'Saya tidak sengaja menemukan manuskrip langka ini di ruang bawah tanah',
        explanations: [
          'Stumble above tidak berarti menemukan sesuatu secara kebetulan. Kombinasi alami adalah stumble upon.',
          'Benar. Stumble upon berarti menemukan sesuatu tanpa sengaja.',
          'Accidental adalah adjective. Di sini seharusnya accidentally found, tetapi phrasal verb lebih alami.',
          'Mumbled berarti bergumam. Di sini perlu stumbled.'
        ]
      },
      tr: {
        prompt: 'Bodrumda bu nadir el yazmasına tesadüfen rastladım',
        explanations: [
          'Stumble above tesadüfen bulmak anlamını vermez. Doğal ifade stumble upon olur.',
          'Doğru. Stumble upon bir şeyi beklenmedik şekilde bulmak demektir.',
          'Accidental sıfattır. Burada accidentally found olabilirdi, ama phrasal verb daha doğaldır.',
          'Mumbled mırıldandı demektir. Burada stumbled gerekir.'
        ]
      },
      pl: {
        prompt: 'Przypadkiem natknąłem się na ten rzadki manuskrypt w piwnicy',
        explanations: [
          'Stumble above nie oznacza przypadkowo czegoś znaleźć. Naturalne połączenie to stumble upon.',
          'Dobrze. Stumble upon znaczy natknąć się na coś niespodziewanie.',
          'Accidental to przymiotnik. Tutaj byłoby accidentally found, ale phrasal verb brzmi lepiej.',
          'Mumbled znaczy mamrotał. Tutaj potrzebujesz stumbled.'
        ]
      }
    },
    '15': {
      'pt-BR': {
        prompt: 'Tamanha era sua ira que todos ficaram em silêncio',
        explanations: [
          'Correto. Such was his wrath that... é uma estrutura formal para enfatizar a intensidade.',
          'So was his wrath não funciona assim. Seria algo como So great was his wrath that...',
          'Dá para entender, mas anger was so big e all became silent soam pouco naturais.',
          'Rat significa rato. Aqui precisamos de wrath: ira.'
        ]
      },
      vi: {
        prompt: 'Cơn giận của anh ấy lớn đến mức mọi người đều im lặng',
        explanations: [
          'Đúng. Such was his wrath that... là cấu trúc trang trọng để nhấn mạnh mức độ.',
          'So was his wrath không dùng như vậy. Có thể là So great was his wrath that...',
          'Có thể hiểu được, nhưng anger was so big và all became silent nghe không tự nhiên.',
          'Rat nghĩa là con chuột. Ở đây cần wrath: cơn thịnh nộ.'
        ]
      },
      id: {
        prompt: 'Begitu besar amarahnya sehingga semua orang terdiam',
        explanations: [
          'Benar. Such was his wrath that... adalah struktur formal untuk menekankan intensitas.',
          'So was his wrath tidak bekerja seperti itu. Bisa: So great was his wrath that...',
          'Bisa dimengerti, tetapi anger was so big dan all became silent terdengar kurang alami.',
          'Rat berarti tikus. Di sini perlu wrath: kemurkaan.'
        ]
      },
      tr: {
        prompt: 'Öfkesi o kadar büyüktü ki herkes sustu',
        explanations: [
          'Doğru. Such was his wrath that... yoğunluğu vurgulayan resmi bir yapıdır.',
          'So was his wrath bu şekilde çalışmaz. So great was his wrath that... gibi olurdu.',
          'Anlaşılır, ama anger was so big ve all became silent doğal duyulmaz.',
          'Rat sıçan demektir. Burada wrath gerekir: öfke.'
        ]
      },
      pl: {
        prompt: 'Taki był jego gniew, że wszyscy zamilkli',
        explanations: [
          'Dobrze. Such was his wrath that... to formalna struktura do podkreślenia intensywności.',
          'So was his wrath tak nie działa. Możliwe byłoby So great was his wrath that...',
          'Da się zrozumieć, ale anger was so big i all became silent brzmią nienaturalnie.',
          'Rat znaczy szczur. Tutaj potrzebujesz wrath: gniew.'
        ]
      }
    },
    '16': {
      'pt-BR': {
        prompt: 'Em nenhuma circunstância você deve revelar esta senha',
        explanations: [
          'Quando Under no circumstances vem no início, usamos inversão: should you, não you should.',
          'Correto. Under no circumstances should you... é uma proibição forte e formal.',
          'Close significa fechar. Aqui precisamos de disclose: revelar.',
          'A expressão fixa aqui é under no circumstances, e também faltaria inversão.'
        ]
      },
      vi: {
        prompt: 'Trong mọi trường hợp, bạn không được tiết lộ mật khẩu này',
        explanations: [
          'Khi Under no circumstances đứng đầu câu, cần đảo ngữ: should you, không phải you should.',
          'Đúng. Under no circumstances should you... là lệnh cấm mạnh và trang trọng.',
          'Close nghĩa là đóng. Ở đây cần disclose: tiết lộ.',
          'Cụm cố định ở đây là under no circumstances, và câu này cũng thiếu đảo ngữ.'
        ]
      },
      id: {
        prompt: 'Dalam keadaan apa pun kamu tidak boleh mengungkapkan kata sandi ini',
        explanations: [
          'Saat Under no circumstances ada di awal, perlu inversion: should you, bukan you should.',
          'Benar. Under no circumstances should you... adalah larangan kuat dan formal.',
          'Close berarti menutup. Di sini perlu disclose: mengungkapkan.',
          'Ungkapan tetapnya adalah under no circumstances, dan kalimat ini juga kurang inversion.'
        ]
      },
      tr: {
        prompt: 'Hiçbir koşulda bu şifreyi açıklamamalısın',
        explanations: [
          'Under no circumstances cümle başına gelirse inversion gerekir: should you, you should değil.',
          'Doğru. Under no circumstances should you... güçlü ve resmi bir yasak anlatır.',
          'Close kapatmak demektir. Burada disclose gerekir: açıklamak.',
          'Buradaki sabit ifade under no circumstances olur, ayrıca inversion da eksik.'
        ]
      },
      pl: {
        prompt: 'Pod żadnym pozorem nie powinieneś ujawniać tego hasła',
        explanations: [
          'Gdy Under no circumstances stoi na początku, potrzebna jest inwersja: should you, nie you should.',
          'Dobrze. Under no circumstances should you... to mocny i formalny zakaz.',
          'Close znaczy zamknąć. Tutaj potrzebujesz disclose: ujawnić.',
          'Stałe wyrażenie to under no circumstances, a do tego brakuje inwersji.'
        ]
      }
    },
    '17': {
      'pt-BR': {
        prompt: 'É vital que ela chegue a tempo para a cerimônia',
        explanations: [
          'Arrives é comum na fala cotidiana, mas aqui o alvo é o subjuntivo formal depois de It is vital that.',
          'Correto. No subjuntivo mandativo usamos a forma base: she arrive. Termo-chave em ingl?s: vital..',
          'Arrived coloca a ação no passado e quebra a ideia de exigência.',
          'Archive significa arquivar. Aqui precisamos de arrive: chegar.'
        ]
      },
      vi: {
        prompt: 'Điều cực kỳ quan trọng là cô ấy đến đúng giờ buổi lễ',
        explanations: [
          'Arrives phổ biến trong lời nói hằng ngày, nhưng mục tiêu ở đây là subjunctive trang trọng sau It is vital that.',
          'Đúng. Trong mandative subjunctive, ta dùng dạng nguyên mẫu: she arrive. Thu?t ng? ti?ng Anh c?n gi?: vital..',
          'Arrived đưa hành động về quá khứ và phá nghĩa yêu cầu.',
          'Archive nghĩa là lưu trữ. Ở đây cần arrive: đến.'
        ]
      },
      id: {
        prompt: 'Sangat penting agar dia tiba tepat waktu untuk upacara',
        explanations: [
          'Arrives umum dalam percakapan, tetapi target di sini adalah subjunctive formal setelah It is vital that.',
          'Benar. Dalam mandative subjunctive, gunakan bentuk dasar: she arrive. Istilah Inggris yang perlu dipertahankan: vital..',
          'Arrived membuat tindakan menjadi masa lalu dan merusak makna keharusan.',
          'Archive berarti mengarsipkan. Di sini perlu arrive: tiba.'
        ]
      },
      tr: {
        prompt: 'Törene zamanında varması hayati önem taşıyor',
        explanations: [
          'Arrives günlük konuşmada yaygındır, ama burada hedef It is vital that sonrası resmi subjunctive yapıdır.',
          'Doğru. Mandative subjunctive içinde yalın fiil kullanılır: she arrive. Korunmas? gereken ?ngilizce terim: vital..',
          'Arrived eylemi geçmişe taşır ve gereklilik anlamını bozar.',
          'Archive arşivlemek demektir. Burada arrive gerekir: varmak.'
        ]
      },
      pl: {
        prompt: 'To niezwykle ważne, żeby przybyła punktualnie na ceremonię',
        explanations: [
          'Arrives jest częste w codziennej mowie, ale tutaj celem jest formalny subjunctive po It is vital that.',
          'Dobrze. W mandative subjunctive używamy formy podstawowej: she arrive. Angielski termin do zachowania: vital..',
          'Arrived przenosi czynność w przeszłość i psuje sens wymagania.',
          'Archive znaczy archiwizować. Tutaj potrzebujesz arrive: przybyć.'
        ]
      }
    },
    '18': {
      'pt-BR': {
        prompt: 'Não quero desempenhar um papel secundário neste negócio',
        explanations: [
          'A expressão fixa é play second fiddle, sem a.',
          'Correto. Play second fiddle significa ter um papel secundário.',
          'Middle significa meio. A palavra da expressão é fiddle.',
          'Play the second role dá para entender, mas não é o idiom natural.'
        ]
      },
      vi: {
        prompt: 'Tôi không muốn đóng vai phụ trong việc kinh doanh này',
        explanations: [
          'Cụm cố định là play second fiddle, không có a.',
          'Đúng. Play second fiddle nghĩa là giữ vai trò thứ yếu.',
          'Middle nghĩa là ở giữa. Từ trong thành ngữ là fiddle.',
          'Play the second role có thể hiểu được, nhưng không phải thành ngữ tự nhiên.'
        ]
      },
      id: {
        prompt: 'Saya tidak ingin memainkan peran kedua dalam bisnis ini',
        explanations: [
          'Ungkapan tetapnya play second fiddle, tanpa a.',
          'Benar. Play second fiddle berarti memiliki peran kedua atau kurang utama.',
          'Middle berarti tengah. Kata dalam ungkapan ini adalah fiddle.',
          'Play the second role bisa dimengerti, tetapi bukan idiom alami.'
        ]
      },
      tr: {
        prompt: 'Bu işte ikinci planda kalmak istemiyorum',
        explanations: [
          'Sabit ifade play second fiddle olur, a kullanılmaz.',
          'Doğru. Play second fiddle ikinci planda kalmak demektir.',
          'Middle orta demektir. İfadedeki kelime fiddle olur.',
          'Play the second role anlaşılır ama doğal deyim değildir.'
        ]
      },
      pl: {
        prompt: 'Nie chcę grać drugich skrzypiec w tym biznesie',
        explanations: [
          'Stałe wyrażenie to play second fiddle, bez a.',
          'Dobrze. Play second fiddle znaczy pełnić drugorzędną rolę.',
          'Middle znaczy środek. Słowo w idiomie to fiddle.',
          'Play the second role da się zrozumieć, ale nie jest naturalnym idiomem.'
        ]
      }
    },
    '19': {
      'pt-BR': {
        prompt: 'Ele não só é um músico brilhante, mas também um artista talentoso',
        explanations: [
          'Quando Not only abre a frase, usamos inversão: is he, não he is.',
          'Correto. Not only is he... but he is also... mantém a estrutura enfática.',
          'Physician significa médico. Aqui precisamos de musician.',
          'Falta but also e também falta inversão depois de Not only.'
        ]
      },
      vi: {
        prompt: 'Anh ấy không chỉ là một nhạc sĩ xuất sắc mà còn là một họa sĩ tài năng',
        explanations: [
          'Khi Not only đứng đầu câu, cần đảo ngữ: is he, không phải he is.',
          'Đúng. Not only is he... but he is also... giữ cấu trúc nhấn mạnh.',
          'Physician nghĩa là bác sĩ. Ở đây cần musician.',
          'Thiếu but also và cũng thiếu đảo ngữ sau Not only.'
        ]
      },
      id: {
        prompt: 'Dia bukan hanya musisi hebat, tetapi juga seniman berbakat',
        explanations: [
          'Saat Not only membuka kalimat, perlu inversion: is he, bukan he is.',
          'Benar. Not only is he... but he is also... mempertahankan struktur penekanan.',
          'Physician berarti dokter. Di sini perlu musician.',
          'Kurang but also dan juga kurang inversion setelah Not only.'
        ]
      },
      tr: {
        prompt: 'O sadece harika bir müzisyen değil, aynı zamanda yetenekli bir sanatçı',
        explanations: [
          'Not only cümle başına gelirse inversion gerekir: is he, he is değil.',
          'Doğru. Not only is he... but he is also... vurgulu yapıyı korur.',
          'Physician doktor demektir. Burada musician gerekir.',
          'But also eksik ve Not only sonrasında inversion da eksik.'
        ]
      },
      pl: {
        prompt: 'Jest nie tylko świetnym muzykiem, ale też utalentowanym artystą',
        explanations: [
          'Gdy Not only stoi na początku zdania, potrzebna jest inwersja: is he, nie he is.',
          'Dobrze. Not only is he... but he is also... zachowuje strukturę emfatyczną.',
          'Physician znaczy lekarz. Tutaj potrzebujesz musician.',
          'Brakuje but also i brakuje też inwersji po Not only.'
        ]
      }
    },
    '20': {
      'pt-BR': {
        prompt: 'Lamento profundamente não ter contado a verdade a ela antes',
        explanations: [
          'Correto. Regret not having told deixa claro que você lamenta uma ação que não aconteceu antes.',
          'Regret to... aparece em outros contextos, por exemplo ao anunciar uma notícia ruim.',
          'Not telling pode funcionar em alguns contextos, mas not having told marca melhor a anterioridade.',
          'Tolled significa tocar um sino. Aqui precisamos de told.'
        ]
      },
      vi: {
        prompt: 'Tôi rất hối tiếc vì đã không nói cho cô ấy sự thật sớm hơn',
        explanations: [
          'Đúng. Regret not having told nói rõ rằng bạn tiếc vì một hành động trước đó đã không xảy ra.',
          'Regret to... dùng trong ngữ cảnh khác, ví dụ khi thông báo tin xấu.',
          'Not telling có thể dùng trong vài ngữ cảnh, nhưng not having told nhấn mạnh thời điểm trước đó hơn.',
          'Tolled nghĩa là đánh chuông. Ở đây cần told.'
        ]
      },
      id: {
        prompt: 'Saya sangat menyesal karena tidak memberitahunya kebenaran lebih awal',
        explanations: [
          'Benar. Regret not having told menjelaskan bahwa kamu menyesali tindakan yang tidak terjadi sebelumnya.',
          'Regret to... muncul dalam konteks lain, misalnya saat menyampaikan kabar buruk.',
          'Not telling bisa dipakai dalam beberapa konteks, tetapi not having told lebih jelas menunjukkan tindakan sebelumnya.',
          'Tolled berarti membunyikan lonceng. Di sini perlu told.'
        ]
      },
      tr: {
        prompt: 'Ona gerçeği daha önce söylememiş olduğum için çok pişmanım',
        explanations: [
          'Doğru. Regret not having told, daha önce gerçekleşmeyen bir eylem için pişmanlığı açık gösterir.',
          'Regret to... başka bağlamlarda, örneğin kötü haber verirken kullanılır.',
          'Not telling bazı bağlamlarda olabilir, ama not having told önceki zamanı daha net gösterir.',
          'Tolled çan çaldı demektir. Burada told gerekir.'
        ]
      },
      pl: {
        prompt: 'Bardzo żałuję, że nie powiedziałem jej prawdy wcześniej',
        explanations: [
          'Dobrze. Regret not having told jasno pokazuje żal za czynność, która wcześniej się nie wydarzyła.',
          'Regret to... występuje w innych kontekstach, na przykład przy przekazywaniu złej wiadomości.',
          'Not telling może działać w niektórych kontekstach, ale not having told lepiej zaznacza wcześniejszość.',
          'Tolled znaczy zadzwonił dzwonem. Tutaj potrzebujesz told.'
        ]
      }
    },
    '21': {
      'pt-BR': {
        prompt: 'As habilidades culinárias dela são incomparáveis',
        explanations: [
          'Correto. Second to none significa que ninguém é melhor.',
          'Second to nothing não é a expressão fixa.',
          'Have no equals dá para entender, mas não é tão natural; a forma idiomática é second to none.',
          'Noun significa substantivo. Aqui precisamos de none.'
        ]
      },
      vi: {
        prompt: 'Kỹ năng nấu ăn của cô ấy không ai sánh bằng',
        explanations: [
          'Đúng. Second to none nghĩa là không ai tốt hơn.',
          'Second to nothing không phải cụm cố định.',
          'Have no equals có thể hiểu được, nhưng không tự nhiên bằng thành ngữ second to none.',
          'Noun nghĩa là danh từ. Ở đây cần none.'
        ]
      },
      id: {
        prompt: 'Kemampuan memasaknya tidak ada tandingannya',
        explanations: [
          'Benar. Second to none berarti tidak ada yang lebih baik.',
          'Second to nothing bukan ungkapan tetapnya.',
          'Have no equals bisa dimengerti, tetapi tidak sealami second to none.',
          'Noun berarti kata benda. Di sini perlu none.'
        ]
      },
      tr: {
        prompt: 'Onun aşçılık becerileri rakipsiz',
        explanations: [
          'Doğru. Second to none, kimseden aşağı kalmamak ve en iyilerden olmak demektir.',
          'Second to nothing sabit ifade değildir.',
          'Have no equals anlaşılır ama second to none kadar doğal değildir.',
          'Noun isim demektir. Burada none gerekir.'
        ]
      },
      pl: {
        prompt: 'Jej umiejętności kulinarne nie mają sobie równych',
        explanations: [
          'Dobrze. Second to none znaczy, że nikt nie jest lepszy.',
          'Second to nothing nie jest stałym wyrażeniem.',
          'Have no equals da się zrozumieć, ale idiomatycznie lepiej brzmi second to none.',
          'Noun znaczy rzeczownik. Tutaj potrzebujesz none.'
        ]
      }
    },
    '22': {
      'pt-BR': {
        prompt: 'Ele nem imaginava que sua vida estava prestes a mudar',
        explanations: [
          'Quando Little vem no início com sentido negativo, precisamos de inversão: did he.',
          'Depois de did usamos verbo base: know, não knew.',
          'Correto. Little did he know... é uma inversão enfática muito natural.',
          'Leaf significa folha. Aqui precisamos de life: vida.'
        ]
      },
      vi: {
        prompt: 'Anh ấy không hề biết rằng cuộc đời mình sắp thay đổi',
        explanations: [
          'Khi Little đứng đầu câu với nghĩa phủ định, cần đảo ngữ: did he.',
          'Sau did dùng động từ nguyên mẫu: know, không phải knew.',
          'Đúng. Little did he know... là đảo ngữ nhấn mạnh rất tự nhiên.',
          'Leaf nghĩa là chiếc lá. Ở đây cần life: cuộc đời.'
        ]
      },
      id: {
        prompt: 'Dia sama sekali tidak tahu bahwa hidupnya akan segera berubah',
        explanations: [
          'Saat Little ada di awal dengan makna negatif, perlu inversion: did he.',
          'Setelah did gunakan verb dasar: know, bukan knew.',
          'Benar. Little did he know... adalah inversion penekanan yang sangat alami.',
          'Leaf berarti daun. Di sini perlu life: hidup.'
        ]
      },
      tr: {
        prompt: 'Hayatının yakında değişeceğini hiç bilmiyordu',
        explanations: [
          'Little olumsuz anlamla cümle başına gelirse inversion gerekir: did he.',
          'Did sonrasında fiil yalın olur: know, knew değil.',
          'Doğru. Little did he know... çok doğal bir vurgulu inversion yapısıdır.',
          'Leaf yaprak demektir. Burada life gerekir: hayat.'
        ]
      },
      pl: {
        prompt: 'Nie miał pojęcia, że jego życie zaraz się zmieni',
        explanations: [
          'Gdy Little stoi na początku z negatywnym sensem, potrzebna jest inwersja: did he.',
          'Po did używamy formy podstawowej: know, nie knew.',
          'Dobrze. Little did he know... to bardzo naturalna inwersja emfatyczna.',
          'Leaf znaczy liść. Tutaj potrzebujesz life: życie.'
        ]
      }
    },
    '23': {
      'pt-BR': {
        prompt: 'Se eu não fosse tão tímido, teria falado com ela ontem',
        explanations: [
          'Would speak não combina com yesterday. Para resultado passado, precisamos de would have spoken.',
          'Hadn\'t been pode funcionar se falamos só daquele momento passado, mas aqui o foco é timidez como traço geral.',
          'Correto. É mixed conditional: condição geral agora, resultado que não aconteceu ontem.',
          'Yes today não é tomorrow nem yesterday. Aqui precisamos de yesterday.'
        ]
      },
      vi: {
        prompt: 'Nếu tôi không nhút nhát như vậy, hôm qua tôi đã nói chuyện với cô ấy',
        explanations: [
          'Would speak không hợp với yesterday. Với kết quả trong quá khứ, cần would have spoken.',
          'Hadn\'t been có thể dùng nếu chỉ nói về thời điểm quá khứ đó, nhưng ở đây trọng tâm là tính nhút nhát nói chung.',
          'Đúng. Đây là mixed conditional: điều kiện chung hiện tại, kết quả không xảy ra hôm qua.',
          'Yes today không phải tomorrow hay yesterday. Ở đây cần yesterday.'
        ]
      },
      id: {
        prompt: 'Jika saya tidak begitu pemalu, saya pasti sudah berbicara dengannya kemarin',
        explanations: [
          'Would speak tidak cocok dengan yesterday. Untuk hasil masa lalu, perlu would have spoken.',
          'Hadn\'t been bisa berfungsi jika hanya membahas momen masa lalu itu, tetapi di sini fokusnya sifat pemalu secara umum.',
          'Benar. Ini mixed conditional: kondisi umum sekarang, hasil yang tidak terjadi kemarin.',
          'Yes today bukan tomorrow atau yesterday. Di sini perlu yesterday.'
        ]
      },
      tr: {
        prompt: 'Bu kadar utangaç olmasaydım, dün onunla konuşurdum',
        explanations: [
          'Would speak yesterday ile uyuşmaz. Geçmiş sonuç için would have spoken gerekir.',
          'Hadn\'t been sadece o geçmiş andaki durumu anlatıyorsa olabilir, ama burada odak genel utangaçlık özelliği.',
          'Doğru. Bu mixed conditional: şimdi geçerli genel koşul, dün gerçekleşmeyen sonuç.',
          'Yes today ne tomorrow ne yesterday demektir. Burada yesterday gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdybym nie był taki nieśmiały, porozmawiałbym z nią wczoraj',
        explanations: [
          'Would speak nie pasuje do yesterday. Dla przeszłego wyniku potrzebne jest would have spoken.',
          'Hadn\'t been może działać, jeśli chodzi tylko o tamten moment, ale tutaj nacisk jest na ogólną nieśmiałość.',
          'Dobrze. To mixed conditional: ogólny warunek teraz, wynik, który nie wydarzył się wczoraj.',
          'Yes today nie jest ani tomorrow, ani yesterday. Tutaj potrzebujesz yesterday.'
        ]
      }
    },
    '24': {
      'pt-BR': {
        prompt: 'Por favor, me mantenha informado sobre quaisquer mudanças no projeto',
        explanations: [
          'Correto. Keep me in the loop significa mantenha-me informado.',
          'Hoop significa aro. A expressão usa loop.',
          'In course of não é a expressão natural para ficar informado.',
          'A expressão fixa é in the loop, não at the loop.'
        ]
      },
      vi: {
        prompt: 'Vui lòng cập nhật cho tôi mọi thay đổi trong dự án',
        explanations: [
          'Đúng. Keep me in the loop nghĩa là hãy cập nhật thông tin cho tôi.',
          'Hoop nghĩa là cái vòng. Thành ngữ dùng loop.',
          'In course of không phải cách tự nhiên để nói được cập nhật thông tin.',
          'Cụm cố định là in the loop, không phải at the loop.'
        ]
      },
      id: {
        prompt: 'Tolong beri saya kabar tentang perubahan apa pun dalam proyek',
        explanations: [
          'Benar. Keep me in the loop berarti tetap memberi saya informasi.',
          'Hoop berarti lingkaran atau ring. Ungkapannya memakai loop.',
          'In course of bukan ungkapan alami untuk tetap mendapat informasi.',
          'Ungkapan tetapnya in the loop, bukan at the loop.'
        ]
      },
      tr: {
        prompt: 'Lütfen projedeki değişikliklerden beni haberdar et',
        explanations: [
          'Doğru. Keep me in the loop, beni gelişmelerden haberdar et demektir.',
          'Hoop çember demektir. İfade loop kullanır.',
          'In course of bilgi almak anlamında doğal ifade değildir.',
          'Sabit ifade in the loop olur, at the loop değil.'
        ]
      },
      pl: {
        prompt: 'Proszę, informuj mnie o wszelkich zmianach w projekcie',
        explanations: [
          'Dobrze. Keep me in the loop znaczy informuj mnie na bieżąco.',
          'Hoop znaczy obręcz. W idiomie jest loop.',
          'In course of nie jest naturalnym wyrażeniem dla bycia informowanym.',
          'Stałe wyrażenie to in the loop, nie at the loop.'
        ]
      }
    },
    '25': {
      'pt-BR': {
        prompt: 'Insisto que ele saia da reunião imediatamente',
        explanations: [
          'Leaves é indicativo. Em estilo formal, depois de insist that usamos a forma base: he leave.',
          'Correto. I insist that he leave... usa o subjuntivo mandativo.',
          'Insist on him to leave não é a estrutura correta. Seria insist on his leaving ou insist that he leave.',
          'Live significa viver. Aqui precisamos de leave: sair.'
        ]
      },
      vi: {
        prompt: 'Tôi khăng khăng yêu cầu anh ấy rời cuộc họp ngay lập tức',
        explanations: [
          'Leaves là dạng indicative. Trong văn phong trang trọng, sau insist that dùng dạng nguyên mẫu: he leave.',
          'Đúng. I insist that he leave... dùng mandative subjunctive.',
          'Insist on him to leave không phải cấu trúc đúng. Có thể là insist on his leaving hoặc insist that he leave.',
          'Live nghĩa là sống. Ở đây cần leave: rời đi.'
        ]
      },
      id: {
        prompt: 'Saya bersikeras agar dia segera meninggalkan rapat',
        explanations: [
          'Leaves adalah indicative. Dalam gaya formal, setelah insist that gunakan bentuk dasar: he leave.',
          'Benar. I insist that he leave... memakai mandative subjunctive.',
          'Insist on him to leave bukan struktur yang benar. Bisa insist on his leaving atau insist that he leave.',
          'Live berarti hidup. Di sini perlu leave: pergi.'
        ]
      },
      tr: {
        prompt: 'Toplantıdan hemen ayrılması konusunda ısrar ediyorum',
        explanations: [
          'Leaves indicative biçimdir. Resmi kullanımda insist that sonrasında yalın fiil gelir: he leave.',
          'Doğru. I insist that he leave... mandative subjunctive kullanır.',
          'Insist on him to leave doğru yapı değildir. Insist on his leaving veya insist that he leave olur.',
          'Live yaşamak demektir. Burada leave gerekir: ayrılmak.'
        ]
      },
      pl: {
        prompt: 'Nalegam, żeby natychmiast opuścił spotkanie',
        explanations: [
          'Leaves to tryb oznajmujący. W stylu formalnym po insist that używamy formy podstawowej: he leave.',
          'Dobrze. I insist that he leave... używa mandative subjunctive.',
          'Insist on him to leave nie jest poprawną strukturą. Można insist on his leaving albo insist that he leave.',
          'Live znaczy żyć. Tutaj potrzebujesz leave: wyjść.'
        ]
      }
    },
    '26': {
      'pt-BR': {
        prompt: 'Só quando a polícia chegou a multidão se acalmou',
        explanations: [
          'Correto. It was only when... that... é uma cleft sentence natural para enfatizar o momento.',
          'A estrutura usa that, não than.',
          'Com Only when no início, você precisaria de inversão: Only when... did the crowd calm down.',
          'Cloud significa nuvem. Aqui precisamos de crowd: multidão.'
        ]
      },
      vi: {
        prompt: 'Chỉ khi cảnh sát đến, đám đông mới bình tĩnh lại',
        explanations: [
          'Đúng. It was only when... that... là cleft sentence tự nhiên để nhấn mạnh thời điểm.',
          'Cấu trúc này dùng that, không phải than.',
          'Với Only when ở đầu câu, cần đảo ngữ: Only when... did the crowd calm down.',
          'Cloud nghĩa là đám mây. Ở đây cần crowd: đám đông.'
        ]
      },
      id: {
        prompt: 'Baru ketika polisi tiba, kerumunan menjadi tenang',
        explanations: [
          'Benar. It was only when... that... adalah cleft sentence alami untuk menekankan waktu.',
          'Struktur ini memakai that, bukan than.',
          'Dengan Only when di awal, perlu inversion: Only when... did the crowd calm down.',
          'Cloud berarti awan. Di sini perlu crowd: kerumunan.'
        ]
      },
      tr: {
        prompt: 'Polis geldiğinde kalabalık sakinleşti',
        explanations: [
          'Doğru. It was only when... that... zamanı vurgulayan doğal bir cleft sentence yapısıdır.',
          'Bu yapı than değil that kullanır.',
          'Only when cümle başına gelirse inversion gerekir: Only when... did the crowd calm down.',
          'Cloud bulut demektir. Burada crowd gerekir: kalabalık.'
        ]
      },
      pl: {
        prompt: 'Dopiero kiedy przyjechała policja, tłum się uspokoił',
        explanations: [
          'Dobrze. It was only when... that... to naturalna cleft sentence do podkreślenia momentu.',
          'Ta struktura używa that, nie than.',
          'Z Only when na początku potrzebna byłaby inwersja: Only when... did the crowd calm down.',
          'Cloud znaczy chmura. Tutaj potrzebujesz crowd: tłum.'
        ]
      }
    },
    '27': {
      'pt-BR': {
        prompt: 'Nossa empresa ficou no vermelho por três anos',
        explanations: [
          'Correto. In the red significa perder dinheiro ou estar no prejuízo.',
          'Into the red pode descrever movimento para prejuízo, mas aqui o estado é in the red.',
          'In the loss não é a expressão natural.',
          'Bed significa cama. Aqui precisamos de red.'
        ]
      },
      vi: {
        prompt: 'Công ty chúng tôi bị lỗ trong ba năm',
        explanations: [
          'Đúng. In the red nghĩa là thua lỗ hoặc đang trong tình trạng lỗ.',
          'Into the red có thể nói về chuyển sang lỗ, nhưng ở đây là trạng thái: in the red.',
          'In the loss không phải cụm tự nhiên.',
          'Bed nghĩa là cái giường. Ở đây cần red.'
        ]
      },
      id: {
        prompt: 'Perusahaan kami berada dalam kondisi merugi selama tiga tahun',
        explanations: [
          'Benar. In the red berarti merugi atau berada dalam kerugian.',
          'Into the red bisa menggambarkan bergerak menuju rugi, tetapi di sini keadaannya in the red.',
          'In the loss bukan ungkapan alami.',
          'Bed berarti tempat tidur. Di sini perlu red.'
        ]
      },
      tr: {
        prompt: 'Şirketimiz üç yıl boyunca zarardaydı',
        explanations: [
          'Doğru. In the red para kaybetmek veya zararda olmak demektir.',
          'Into the red zarara geçişi anlatabilir, ama burada durum in the red olur.',
          'In the loss doğal ifade değildir.',
          'Bed yatak demektir. Burada red gerekir.'
        ]
      },
      pl: {
        prompt: 'Nasza firma była pod kreską przez trzy lata',
        explanations: [
          'Dobrze. In the red znaczy tracić pieniądze albo być na minusie.',
          'Into the red może opisywać wejście w straty, ale tutaj chodzi o stan: in the red.',
          'In the loss nie jest naturalnym wyrażeniem.',
          'Bed znaczy łóżko. Tutaj potrzebujesz red.'
        ]
      }
    },
    '28': {
      'pt-BR': {
        prompt: 'Se não fosse pelo apoio dele, eu teria desistido',
        explanations: [
          'Correto. Were it not for... é uma forma formal de dizer if it were not for.',
          'Wasn\'t é mais informal e aqui não é a forma elevada que o exercício busca.',
          'Where fala de lugar. Aqui precisamos de were.',
          'Would give up muda o resultado para presente ou futuro; aqui queremos would have given up.'
        ]
      },
      vi: {
        prompt: 'Nếu không có sự ủng hộ của anh ấy, tôi đã bỏ cuộc',
        explanations: [
          'Đúng. Were it not for... là cách trang trọng để nói if it were not for.',
          'Wasn\'t thân mật hơn và không phải dạng trang trọng mà bài này nhắm tới.',
          'Where nói về nơi chốn. Ở đây cần were.',
          'Would give up chuyển kết quả sang hiện tại hoặc tương lai; ở đây cần would have given up.'
        ]
      },
      id: {
        prompt: 'Kalau bukan karena dukungannya, saya pasti sudah menyerah',
        explanations: [
          'Benar. Were it not for... adalah bentuk formal dari if it were not for.',
          'Wasn\'t lebih informal dan bukan bentuk tinggi yang ditargetkan latihan ini.',
          'Where berbicara tentang tempat. Di sini perlu were.',
          'Would give up mengubah hasil ke masa kini atau masa depan; di sini perlu would have given up.'
        ]
      },
      tr: {
        prompt: 'Onun desteği olmasaydı pes ederdim',
        explanations: [
          'Doğru. Were it not for... if it were not for yapısının resmi biçimidir.',
          'Wasn\'t daha gündeliktir ve bu alıştırmanın hedeflediği yüksek biçim değildir.',
          'Where yer bildirir. Burada were gerekir.',
          'Would give up sonucu şimdiye veya geleceğe taşır; burada would have given up gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdyby nie jego wsparcie, poddałbym się',
        explanations: [
          'Dobrze. Were it not for... to formalna wersja if it were not for.',
          'Wasn\'t jest bardziej potoczne i nie jest podniosłą formą, której szuka ćwiczenie.',
          'Where dotyczy miejsca. Tutaj potrzebujesz were.',
          'Would give up przesuwa wynik do teraźniejszości albo przyszłości; tutaj potrzebne jest would have given up.'
        ]
      }
    },
    '29': {
      'pt-BR': {
        prompt: 'Ele não queria pular, mas os amigos estavam incentivando',
        explanations: [
          'Correto. Egg someone on significa incentivar ou provocar alguém a fazer algo, muitas vezes imprudente.',
          'Egging him up não é o phrasal verb correto.',
          'Adding him on significa outra coisa e não expressa provocar ou incentivar.',
          'Aching significa doendo. Aqui precisamos de egging.'
        ]
      },
      vi: {
        prompt: 'Anh ấy không muốn nhảy, nhưng bạn bè cứ xúi anh ấy',
        explanations: [
          'Đúng. Egg someone on nghĩa là xúi hoặc kích động ai làm gì đó, thường là việc thiếu thận trọng.',
          'Egging him up không phải phrasal verb đúng.',
          'Adding him on nghĩa khác và không diễn tả việc xúi giục.',
          'Aching nghĩa là đau. Ở đây cần egging.'
        ]
      },
      id: {
        prompt: 'Dia tidak ingin melompat, tetapi teman-temannya terus mengomporinya',
        explanations: [
          'Benar. Egg someone on berarti mendorong atau memanas-manasi seseorang melakukan sesuatu.',
          'Egging him up bukan phrasal verb yang benar.',
          'Adding him on berarti hal lain dan tidak menyatakan memanas-manasi.',
          'Aching berarti sakit atau nyeri. Di sini perlu egging.'
        ]
      },
      tr: {
        prompt: 'Atlamak istemiyordu ama arkadaşları onu kışkırtıyordu',
        explanations: [
          'Doğru. Egg someone on, birini bir şeyi yapmaya kışkırtmak demektir.',
          'Egging him up doğru phrasal verb değildir.',
          'Adding him on başka bir anlama gelir ve kışkırtmayı anlatmaz.',
          'Aching ağrıyan demektir. Burada egging gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie chciał skoczyć, ale przyjaciele go podpuszczali',
        explanations: [
          'Dobrze. Egg someone on znaczy podpuszczać albo zachęcać kogoś do czegoś, często nierozsądnego.',
          'Egging him up nie jest poprawnym phrasal verb.',
          'Adding him on znaczy coś innego i nie oddaje podpuszczania.',
          'Aching znaczy bolący. Tutaj potrzebujesz egging.'
        ]
      }
    },
    '30': {
      'pt-BR': {
        prompt: 'Ele detesta ser tratado como criança',
        explanations: [
          'Depois de resent usamos -ing, não infinitivo com to. Termo-chave em ingl?s: to be..',
          'Correto. Resents being treated expressa que ele se incomoda com esse tratamento.',
          'Depois de being precisamos de particípio: treated, não treating.',
          'Traded significa negociado ou trocado. Aqui precisamos de treated.'
        ]
      },
      vi: {
        prompt: 'Anh ấy rất khó chịu khi bị đối xử như trẻ con',
        explanations: [
          'Sau resent dùng dạng -ing, không dùng to + verb. Thu?t ng? ti?ng Anh c?n gi?: to be..',
          'Đúng. Resents being treated diễn tả rằng anh ấy khó chịu vì cách đối xử đó.',
          'Sau being cần quá khứ phân từ: treated, không phải treating.',
          'Traded nghĩa là được giao dịch hoặc trao đổi. Ở đây cần treated.'
        ]
      },
      id: {
        prompt: 'Dia sangat tidak suka diperlakukan seperti anak kecil',
        explanations: [
          'Setelah resent gunakan bentuk -ing, bukan to + verb. Istilah Inggris yang perlu dipertahankan: to be..',
          'Benar. Resents being treated menyatakan dia tidak suka mendapat perlakuan itu.',
          'Setelah being perlu past participle: treated, bukan treating.',
          'Traded berarti diperdagangkan atau ditukar. Di sini perlu treated.'
        ]
      },
      tr: {
        prompt: 'Ona çocuk gibi davranılmasından çok rahatsız oluyor',
        explanations: [
          'Resent sonrasında to + fiil değil, -ing kullanılır. Korunmas? gereken ?ngilizce terim: to be..',
          'Doğru. Resents being treated, bu muameleden rahatsız olduğunu anlatır.',
          'Being sonrasında participle gerekir: treated, treating değil.',
          'Traded takas edildi veya alınıp satıldı demektir. Burada treated gerekir.'
        ]
      },
      pl: {
        prompt: 'Bardzo nie znosi, gdy traktuje się go jak dziecko',
        explanations: [
          'Po resent używamy formy -ing, nie bezokolicznika z to. Angielski termin do zachowania: to be..',
          'Dobrze. Resents being treated wyraża, że przeszkadza mu takie traktowanie.',
          'Po being potrzebny jest participle: treated, nie treating.',
          'Traded znaczy sprzedawany albo wymieniany. Tutaj potrzebujesz treated.'
        ]
      }
    },
    '31': {
      'pt-BR': {
        prompt: 'Só trabalhando duro ele conseguiu alcançar o sucesso',
        explanations: [
          'Quando Only by abre a frase, precisamos de inversão: did he, não he could.',
          'Correto. Only by working hard did he achieve success usa inversão enfática.',
          'Depois de did usamos o verbo base: achieve, não achieved.',
          'Archive significa arquivar. Aqui precisamos de achieve: alcançar.'
        ]
      },
      vi: {
        prompt: 'Chỉ bằng cách làm việc chăm chỉ, anh ấy mới đạt được thành công',
        explanations: [
          'Khi Only by đứng đầu câu, cần đảo ngữ: did he, không phải he could.',
          'Đúng. Only by working hard did he achieve success dùng đảo ngữ nhấn mạnh.',
          'Sau did dùng động từ nguyên mẫu: achieve, không phải achieved.',
          'Archive nghĩa là lưu trữ. Ở đây cần achieve: đạt được.'
        ]
      },
      id: {
        prompt: 'Hanya dengan bekerja keras dia bisa meraih kesuksesan',
        explanations: [
          'Saat Only by membuka kalimat, perlu inversion: did he, bukan he could.',
          'Benar. Only by working hard did he achieve success memakai inversion penekanan.',
          'Setelah did gunakan verb dasar: achieve, bukan achieved.',
          'Archive berarti mengarsipkan. Di sini perlu achieve: meraih.'
        ]
      },
      tr: {
        prompt: 'Ancak çok çalışarak başarıya ulaşabildi',
        explanations: [
          'Only by cümle başına gelirse inversion gerekir: did he, he could değil.',
          'Doğru. Only by working hard did he achieve success vurgulu inversion kullanır.',
          'Did sonrasında fiil yalın olur: achieve, achieved değil.',
          'Archive arşivlemek demektir. Burada achieve gerekir: başarmak.'
        ]
      },
      pl: {
        prompt: 'Tylko dzięki ciężkiej pracy udało mu się osiągnąć sukces',
        explanations: [
          'Gdy Only by stoi na początku zdania, potrzebna jest inwersja: did he, nie he could.',
          'Dobrze. Only by working hard did he achieve success używa inwersji emfatycznej.',
          'Po did używamy formy podstawowej: achieve, nie achieved.',
          'Archive znaczy archiwizować. Tutaj potrzebujesz achieve: osiągnąć.'
        ]
      }
    },
    '32': {
      'pt-BR': {
        prompt: 'Precisamos resolver os últimos detalhes antes do lançamento',
        explanations: [
          'Correto. Iron out details significa resolver ou ajustar detalhes.',
          'Iron up não é o phrasal verb correto.',
          'Smooth the details dá para entender, mas não é a expressão idiomática natural aqui.',
          'Retails significa vendas no varejo. Aqui precisamos de details.'
        ]
      },
      vi: {
        prompt: 'Chúng ta cần xử lý những chi tiết cuối cùng trước khi ra mắt',
        explanations: [
          'Đúng. Iron out details nghĩa là xử lý hoặc chỉnh lại các chi tiết.',
          'Iron up không phải phrasal verb đúng.',
          'Smooth the details có thể hiểu được, nhưng không phải cách nói thành ngữ tự nhiên ở đây.',
          'Retails nghĩa là bán lẻ. Ở đây cần details.'
        ]
      },
      id: {
        prompt: 'Kita perlu membereskan detail terakhir sebelum peluncuran',
        explanations: [
          'Benar. Iron out details berarti menyelesaikan atau merapikan detail.',
          'Iron up bukan phrasal verb yang benar.',
          'Smooth the details bisa dimengerti, tetapi bukan ungkapan idiomatis alami di sini.',
          'Retails berarti ritel. Di sini perlu details.'
        ]
      },
      tr: {
        prompt: 'Lansmandan önce son ayrıntıları netleştirmemiz gerekiyor',
        explanations: [
          'Doğru. Iron out details ayrıntıları çözmek veya netleştirmek demektir.',
          'Iron up doğru phrasal verb değildir.',
          'Smooth the details anlaşılır, ama burada doğal deyimsel ifade değildir.',
          'Retails perakende satışlar demektir. Burada details gerekir.'
        ]
      },
      pl: {
        prompt: 'Musimy dopracować ostatnie szczegóły przed startem',
        explanations: [
          'Dobrze. Iron out details znaczy rozwiązać albo dopracować szczegóły.',
          'Iron up nie jest poprawnym phrasal verb.',
          'Smooth the details da się zrozumieć, ale tutaj nie brzmi jak naturalny idiom.',
          'Retails znaczy sprzedaż detaliczna. Tutaj potrzebujesz details.'
        ]
      }
    },
    '33': {
      'pt-BR': {
        prompt: 'As palavras dele contradizem suas ações',
        explanations: [
          'Correto. Be at odds with significa estar em desacordo ou em contradição com algo.',
          'A expressão fixa usa at, não on.',
          'Adds significa acrescenta. Aqui precisamos de odds.',
          'Go different from não é uma forma natural para esta ideia.'
        ]
      },
      vi: {
        prompt: 'Lời nói của anh ấy mâu thuẫn với hành động của anh ấy',
        explanations: [
          'Đúng. Be at odds with nghĩa là bất đồng hoặc mâu thuẫn với điều gì đó.',
          'Cụm cố định dùng at, không phải on.',
          'Adds nghĩa là thêm vào. Ở đây cần odds.',
          'Go different from không phải cách nói tự nhiên cho ý này.'
        ]
      },
      id: {
        prompt: 'Kata-katanya bertentangan dengan tindakannya',
        explanations: [
          'Benar. Be at odds with berarti tidak sejalan atau bertentangan dengan sesuatu.',
          'Ungkapan tetapnya memakai at, bukan on.',
          'Adds berarti menambahkan. Di sini perlu odds.',
          'Go different from bukan bentuk alami untuk ide ini.'
        ]
      },
      tr: {
        prompt: 'Sözleri eylemleriyle çelişiyor',
        explanations: [
          'Doğru. Be at odds with bir şeyle uyuşmamak veya çelişmek demektir.',
          'Sabit ifade at kullanır, on değil.',
          'Adds ekler demektir. Burada odds gerekir.',
          'Go different from bu fikir için doğal bir yapı değildir.'
        ]
      },
      pl: {
        prompt: 'Jego słowa są sprzeczne z jego czynami',
        explanations: [
          'Dobrze. Be at odds with znaczy być w sprzeczności albo niezgodzie z czymś.',
          'Stałe wyrażenie używa at, nie on.',
          'Adds znaczy dodaje. Tutaj potrzebujesz odds.',
          'Go different from nie jest naturalną formą dla tej myśli.'
        ]
      }
    },
    '34': {
      'pt-BR': {
        prompt: 'Mal ele terminou o discurso, o público explodiu em aplausos',
        explanations: [
          'Quando Hardly vem no início, usamos inversão: had he finished.',
          'Correto. Hardly had he finished... when... é a estrutura natural.',
          'Com hardly usamos when, não than.',
          'Peach significa pêssego. Aqui precisamos de speech: discurso.'
        ]
      },
      vi: {
        prompt: 'Anh ấy vừa kết thúc bài phát biểu thì khán giả bùng nổ trong tiếng vỗ tay',
        explanations: [
          'Khi Hardly đứng đầu câu, dùng đảo ngữ: had he finished.',
          'Đúng. Hardly had he finished... when... là cấu trúc tự nhiên.',
          'Với hardly ta dùng when, không phải than.',
          'Peach nghĩa là quả đào. Ở đây cần speech: bài phát biểu.'
        ]
      },
      id: {
        prompt: 'Begitu dia selesai berpidato, penonton langsung bergemuruh dengan tepuk tangan',
        explanations: [
          'Saat Hardly ada di awal, gunakan inversion: had he finished.',
          'Benar. Hardly had he finished... when... adalah struktur alami.',
          'Dengan hardly gunakan when, bukan than.',
          'Peach berarti persik. Di sini perlu speech: pidato.'
        ]
      },
      tr: {
        prompt: 'Konuşmasını bitirir bitirmez seyirciler alkışlarla coştu',
        explanations: [
          'Hardly cümle başına gelirse inversion kullanılır: had he finished.',
          'Doğru. Hardly had he finished... when... doğal yapıdır.',
          'Hardly ile when kullanılır, than değil.',
          'Peach şeftali demektir. Burada speech gerekir: konuşma.'
        ]
      },
      pl: {
        prompt: 'Ledwie skończył przemówienie, publiczność wybuchła oklaskami',
        explanations: [
          'Gdy Hardly stoi na początku, używamy inwersji: had he finished.',
          'Dobrze. Hardly had he finished... when... to naturalna struktura.',
          'Z hardly używamy when, nie than.',
          'Peach znaczy brzoskwinia. Tutaj potrzebujesz speech: przemówienie.'
        ]
      }
    },
    '35': {
      'pt-BR': {
        prompt: 'Se eu não tivesse aceitado aquele emprego naquela época, agora não seria tão rico',
        explanations: [
          'Didn\'t accept não marca bem uma condição passada não realizada. Precisamos de past perfect: hadn\'t accepted.',
          'Wouldn\'t have been joga o resultado para o passado, mas now pede resultado presente.',
          'Correto. É mixed conditional: condição passada, resultado presente.',
          'Stealthy significa furtivo. Aqui precisamos de wealthy: rico.'
        ]
      },
      vi: {
        prompt: 'Nếu lúc đó tôi không nhận công việc ấy, bây giờ tôi đã không giàu như vậy',
        explanations: [
          'Didn\'t accept không đánh dấu rõ điều kiện quá khứ không xảy ra. Cần past perfect: hadn\'t accepted.',
          'Wouldn\'t have been đưa kết quả về quá khứ, nhưng now yêu cầu kết quả hiện tại.',
          'Đúng. Đây là mixed conditional: điều kiện quá khứ, kết quả hiện tại.',
          'Stealthy nghĩa là lén lút. Ở đây cần wealthy: giàu có.'
        ]
      },
      id: {
        prompt: 'Jika dulu saya tidak menerima pekerjaan itu, sekarang saya tidak akan sekaya ini',
        explanations: [
          'Didn\'t accept tidak cukup menandai kondisi masa lalu yang tidak terjadi. Perlu past perfect: hadn\'t accepted.',
          'Wouldn\'t have been membawa hasil ke masa lalu, tetapi now meminta hasil masa kini.',
          'Benar. Ini mixed conditional: kondisi masa lalu, hasil masa kini.',
          'Stealthy berarti diam-diam atau sembunyi-sembunyi. Di sini perlu wealthy: kaya.'
        ]
      },
      tr: {
        prompt: 'O işi o zaman kabul etmemiş olsaydım, şimdi bu kadar zengin olmazdım',
        explanations: [
          'Didn\'t accept gerçekleşmemiş geçmiş koşulu iyi göstermez. Past perfect gerekir: hadn\'t accepted.',
          'Wouldn\'t have been sonucu geçmişe taşır, ama now şimdiki sonucu ister.',
          'Doğru. Bu mixed conditional: geçmiş koşul, şimdiki sonuç.',
          'Stealthy gizli veya sinsi demektir. Burada wealthy gerekir: zengin.'
        ]
      },
      pl: {
        prompt: 'Gdybym wtedy nie przyjął tej pracy, teraz nie byłbym tak bogaty',
        explanations: [
          'Didn\'t accept nie zaznacza dobrze niespełnionego warunku w przeszłości. Potrzebne jest past perfect: hadn\'t accepted.',
          'Wouldn\'t have been przenosi wynik do przeszłości, ale now wymaga wyniku w teraźniejszości.',
          'Dobrze. To mixed conditional: warunek przeszły, wynik teraźniejszy.',
          'Stealthy znaczy skryty albo podstępny. Tutaj potrzebujesz wealthy: bogaty.'
        ]
      }
    },
    '36': {
      'pt-BR': {
        prompt: 'Quando ela ouviu a notícia, ficou completamente sem palavras',
        explanations: [
          'Correto. At a loss for words significa não saber o que dizer.',
          'A expressão fixa usa at a loss, não in a loss.',
          'Loose significa solto. Aqui precisamos de loss.',
          'Didn\'t find words é tradução literal e não soa natural.'
        ]
      },
      vi: {
        prompt: 'Khi nghe tin đó, cô ấy hoàn toàn không nói nên lời',
        explanations: [
          'Đúng. At a loss for words nghĩa là không biết phải nói gì.',
          'Cụm cố định dùng at a loss, không phải in a loss.',
          'Loose nghĩa là lỏng hoặc rời. Ở đây cần loss.',
          'Didn\'t find words là dịch sát từng chữ và không tự nhiên.'
        ]
      },
      id: {
        prompt: 'Ketika mendengar berita itu, dia benar-benar kehabisan kata-kata',
        explanations: [
          'Benar. At a loss for words berarti tidak tahu harus berkata apa.',
          'Ungkapan tetapnya at a loss, bukan in a loss.',
          'Loose berarti longgar. Di sini perlu loss.',
          'Didn\'t find words adalah terjemahan literal dan tidak terdengar alami.'
        ]
      },
      tr: {
        prompt: 'Haberi duyduğunda tamamen ne diyeceğini bilemedi',
        explanations: [
          'Doğru. At a loss for words ne söyleyeceğini bilememek demektir.',
          'Sabit ifade at a loss kullanır, in a loss değil.',
          'Loose gevşek demektir. Burada loss gerekir.',
          'Didn\'t find words kelime kelime çeviridir ve doğal duyulmaz.'
        ]
      },
      pl: {
        prompt: 'Kiedy usłyszała wiadomość, kompletnie zabrakło jej słów',
        explanations: [
          'Dobrze. At a loss for words znaczy nie wiedzieć, co powiedzieć.',
          'Stałe wyrażenie to at a loss, nie in a loss.',
          'Loose znaczy luźny. Tutaj potrzebujesz loss.',
          'Didn\'t find words jest dosłownym tłumaczeniem i nie brzmi naturalnie.'
        ]
      }
    },
    '37': {
      'pt-BR': {
        prompt: 'Só quando chegou em casa ele percebeu que tinha perdido a carteira',
        explanations: [
          'Com Not until no início, precisamos de inversão: did he realize.',
          'Depois de did usamos o verbo base: realize, não realized.',
          'Correto. Not until... did he realize... é uma inversão enfática correta.',
          'Valet é manobrista ou assistente. Aqui precisamos de wallet: carteira.'
        ]
      },
      vi: {
        prompt: 'Chỉ khi về đến nhà, anh ấy mới nhận ra mình đã mất ví',
        explanations: [
          'Với Not until ở đầu câu, cần đảo ngữ: did he realize.',
          'Sau did dùng động từ nguyên mẫu: realize, không phải realized.',
          'Đúng. Not until... did he realize... là đảo ngữ nhấn mạnh đúng.',
          'Valet là người phục vụ hoặc người đỗ xe. Ở đây cần wallet: ví.'
        ]
      },
      id: {
        prompt: 'Baru ketika tiba di rumah, dia menyadari bahwa dompetnya hilang',
        explanations: [
          'Dengan Not until di awal, perlu inversion: did he realize.',
          'Setelah did gunakan verb dasar: realize, bukan realized.',
          'Benar. Not until... did he realize... adalah inversion penekanan yang benar.',
          'Valet adalah petugas parkir atau asisten. Di sini perlu wallet: dompet.'
        ]
      },
      tr: {
        prompt: 'Eve vardığında cüzdanını kaybettiğini fark etti',
        explanations: [
          'Not until cümle başında olursa inversion gerekir: did he realize.',
          'Did sonrasında fiil yalın olur: realize, realized değil.',
          'Doğru. Not until... did he realize... doğru bir vurgulu inversion yapısıdır.',
          'Valet vale veya yardımcı demektir. Burada wallet gerekir: cüzdan.'
        ]
      },
      pl: {
        prompt: 'Dopiero gdy wrócił do domu, zrozumiał, że zgubił portfel',
        explanations: [
          'Z Not until na początku potrzebna jest inwersja: did he realize.',
          'Po did używamy formy podstawowej: realize, nie realized.',
          'Dobrze. Not until... did he realize... to poprawna inwersja emfatyczna.',
          'Valet to parkingowy albo lokaj. Tutaj potrzebujesz wallet: portfel.'
        ]
      }
    },
    '38': {
      'pt-BR': {
        prompt: 'Já está mais do que na hora de resolvermos esta questão',
        explanations: [
          'Depois de It is high time normalmente usamos uma forma de passado: resolved.',
          'Correto. It is high time we resolved this issue significa que já era hora de fazer isso.',
          'For we to não é correto. Seria for us to, mas aqui a estrutura natural é we resolved.',
          'Tissue significa tecido ou lenço. Aqui precisamos de issue: questão.'
        ]
      },
      vi: {
        prompt: 'Đã đến lúc chúng ta giải quyết vấn đề này rồi',
        explanations: [
          'Sau It is high time thường dùng dạng quá khứ: resolved.',
          'Đúng. It is high time we resolved this issue nghĩa là đã đến lúc phải làm việc đó.',
          'For we to không đúng. Có thể là for us to, nhưng cấu trúc tự nhiên ở đây là we resolved.',
          'Tissue nghĩa là khăn giấy hoặc mô. Ở đây cần issue: vấn đề.'
        ]
      },
      id: {
        prompt: 'Sudah saatnya kita menyelesaikan masalah ini',
        explanations: [
          'Setelah It is high time biasanya gunakan bentuk past: resolved.',
          'Benar. It is high time we resolved this issue berarti sudah waktunya melakukan itu.',
          'For we to tidak benar. Seharusnya for us to, tetapi struktur alami di sini adalah we resolved.',
          'Tissue berarti tisu atau jaringan. Di sini perlu issue: masalah.'
        ]
      },
      tr: {
        prompt: 'Bu meseleyi çözmemizin artık zamanı geldi',
        explanations: [
          'It is high time sonrasında genellikle past biçim kullanılır: resolved.',
          'Doğru. It is high time we resolved this issue artık bunu yapma zamanı geldi demektir.',
          'For we to doğru değildir. For us to olabilir, ama burada doğal yapı we resolved olur.',
          'Tissue doku veya mendil demektir. Burada issue gerekir: mesele.'
        ]
      },
      pl: {
        prompt: 'Najwyższy czas, żebyśmy rozwiązali tę sprawę',
        explanations: [
          'Po It is high time zwykle używamy formy przeszłej: resolved.',
          'Dobrze. It is high time we resolved this issue znaczy, że już najwyższy czas to zrobić.',
          'For we to jest niepoprawne. Byłoby for us to, ale tutaj naturalna struktura to we resolved.',
          'Tissue znaczy tkanka albo chusteczka. Tutaj potrzebujesz issue: sprawa.'
        ]
      }
    },
    '39': {
      'pt-BR': {
        prompt: 'A intervenção dele só piorou a situação',
        explanations: [
          'Correto. Exacerbate significa fazer algo ruim ficar ainda pior.',
          'Exasperate significa irritar ou desesperar uma pessoa. Aqui falamos de piorar uma situação.',
          'More worse é incorreto; worse já é comparativo.',
          'Interface significa interface. Aqui precisamos de interference: intervenção.'
        ]
      },
      vi: {
        prompt: 'Sự can thiệp của anh ấy chỉ làm tình hình tệ hơn',
        explanations: [
          'Đúng. Exacerbate nghĩa là làm một điều xấu trở nên tệ hơn.',
          'Exasperate nghĩa là làm ai đó bực tức hoặc phát cáu. Ở đây nói về làm tình huống tệ hơn.',
          'More worse là sai; worse vốn đã là dạng so sánh.',
          'Interface nghĩa là giao diện. Ở đây cần interference: sự can thiệp.'
        ]
      },
      id: {
        prompt: 'Campur tangannya hanya memperburuk situasi',
        explanations: [
          'Benar. Exacerbate berarti membuat sesuatu yang buruk menjadi lebih buruk.',
          'Exasperate berarti membuat seseorang kesal atau jengkel. Di sini yang dibahas adalah memperburuk situasi.',
          'More worse tidak benar; worse sudah bentuk comparative.',
          'Interface berarti antarmuka. Di sini perlu interference: campur tangan.'
        ]
      },
      tr: {
        prompt: 'Müdahalesi durumu sadece daha da kötüleştirdi',
        explanations: [
          'Doğru. Exacerbate kötü bir şeyi daha da kötüleştirmek demektir.',
          'Exasperate bir insanı kızdırmak veya çileden çıkarmak demektir. Burada bir durumu kötüleştirmekten bahsediyoruz.',
          'More worse yanlıştır; worse zaten comparative biçimdir.',
          'Interface arayüz demektir. Burada interference gerekir: müdahale.'
        ]
      },
      pl: {
        prompt: 'Jego ingerencja tylko pogorszyła sytuację',
        explanations: [
          'Dobrze. Exacerbate znaczy sprawić, że coś złego staje się jeszcze gorsze.',
          'Exasperate znaczy zirytować albo doprowadzić kogoś do rozpaczy. Tutaj chodzi o pogorszenie sytuacji.',
          'More worse jest niepoprawne; worse samo jest już stopniem wyższym.',
          'Interface znaczy interfejs. Tutaj potrzebujesz interference: ingerencja.'
        ]
      }
    },
    '40': {
      'pt-BR': {
        prompt: 'Em hipótese alguma você deve apertar este botão',
        explanations: [
          'Quando On no account vem no início, precisamos de inversão: should you, não you should.',
          'Correto. On no account should you... significa em hipótese alguma você deve...',
          'Praise significa elogiar. Aqui precisamos de press: apertar.',
          'A expressão fixa é on no account, não in no account.'
        ]
      },
      vi: {
        prompt: 'Tuyệt đối không được nhấn nút này',
        explanations: [
          'Khi On no account đứng đầu câu, cần đảo ngữ: should you, không phải you should.',
          'Đúng. On no account should you... nghĩa là tuyệt đối không được...',
          'Praise nghĩa là khen ngợi. Ở đây cần press: nhấn.',
          'Cụm cố định là on no account, không phải in no account.'
        ]
      },
      id: {
        prompt: 'Dalam keadaan apa pun kamu tidak boleh menekan tombol ini',
        explanations: [
          'Saat On no account ada di awal, perlu inversion: should you, bukan you should.',
          'Benar. On no account should you... berarti dalam keadaan apa pun jangan...',
          'Praise berarti memuji. Di sini perlu press: menekan.',
          'Ungkapan tetapnya on no account, bukan in no account.'
        ]
      },
      tr: {
        prompt: 'Bu düğmeye hiçbir şekilde basmamalısın',
        explanations: [
          'On no account cümle başına gelirse inversion gerekir: should you, you should değil.',
          'Doğru. On no account should you... hiçbir şekilde yapmamalısın demektir.',
          'Praise övmek demektir. Burada press gerekir: basmak.',
          'Sabit ifade on no account olur, in no account değil.'
        ]
      },
      pl: {
        prompt: 'Pod żadnym pozorem nie wolno naciskać tego przycisku',
        explanations: [
          'Gdy On no account stoi na początku, potrzebna jest inwersja: should you, nie you should.',
          'Dobrze. On no account should you... znaczy pod żadnym pozorem nie powinieneś...',
          'Praise znaczy chwalić. Tutaj potrzebujesz press: naciskać.',
          'Stałe wyrażenie to on no account, nie in no account.'
        ]
      }
    },
    '41': {
      'pt-BR': {
        prompt: 'Preciso que revisem meu relatório até amanhã',
        explanations: [
          'Esta opção diz que você mesmo precisa revisar o relatório. Aqui queremos que outra pessoa o revise.',
          'A estrutura have something done precisa de particípio: checked, não check.',
          'Correto. Have my report checked significa fazer com que revisem meu relatório.',
          'Choked significa engasgado. Aqui precisamos de checked: revisado.'
        ]
      },
      vi: {
        prompt: 'Tôi cần nhờ người kiểm tra báo cáo của mình trước ngày mai',
        explanations: [
          'Phương án này nói rằng chính bạn cần kiểm tra báo cáo. Ở đây ta muốn người khác kiểm tra nó.',
          'Cấu trúc have something done cần quá khứ phân từ: checked, không phải check.',
          'Đúng. Have my report checked nghĩa là nhờ người khác kiểm tra báo cáo của mình.',
          'Choked nghĩa là bị nghẹn. Ở đây cần checked: được kiểm tra.'
        ]
      },
      id: {
        prompt: 'Saya perlu meminta laporan saya diperiksa sebelum besok',
        explanations: [
          'Pilihan ini mengatakan kamu sendiri perlu memeriksa laporan. Di sini yang dimaksud adalah orang lain memeriksanya.',
          'Struktur have something done membutuhkan past participle: checked, bukan check.',
          'Benar. Have my report checked berarti membuat laporan saya diperiksa oleh orang lain.',
          'Choked berarti tersedak. Di sini perlu checked: diperiksa.'
        ]
      },
      tr: {
        prompt: 'Raporumu yarına kadar kontrol ettirmem gerekiyor',
        explanations: [
          'Bu seçenek raporu senin kontrol etmen gerektiğini söyler. Burada başka birinin kontrol etmesini istiyoruz.',
          'Have something done yapısı participle ister: checked, check değil.',
          'Doğru. Have my report checked raporumu kontrol ettirmek demektir.',
          'Choked boğulmuş veya tıkanmış demektir. Burada checked gerekir: kontrol edilmiş.'
        ]
      },
      pl: {
        prompt: 'Muszę mieć sprawdzony raport do jutra',
        explanations: [
          'Ta opcja mówi, że sam musisz sprawdzić raport. Tutaj chodzi o to, żeby ktoś inny go sprawdził.',
          'Struktura have something done wymaga participle: checked, nie check.',
          'Dobrze. Have my report checked znaczy zlecić sprawdzenie mojego raportu.',
          'Choked znaczy zakrztuszony. Tutaj potrzebujesz checked: sprawdzony.'
        ]
      }
    },
    '42': {
      'pt-BR': {
        prompt: 'Seu palpite foi totalmente certeiro',
        explanations: [
          'Correto. Hit the nail on the head significa acertar exatamente.',
          'A expressão fixa usa on, não in.',
          'O idiom usa hit, não beat.',
          'Mail significa correio. Aqui precisamos de nail: prego.'
        ]
      },
      vi: {
        prompt: 'Phỏng đoán của bạn hoàn toàn chính xác',
        explanations: [
          'Đúng. Hit the nail on the head nghĩa là nói hoặc đoán trúng chính xác.',
          'Cụm cố định dùng on, không phải in.',
          'Thành ngữ dùng hit, không phải beat.',
          'Mail nghĩa là thư hoặc bưu điện. Ở đây cần nail: cái đinh.'
        ]
      },
      id: {
        prompt: 'Tebakanmu benar-benar tepat',
        explanations: [
          'Benar. Hit the nail on the head berarti benar-benar tepat.',
          'Ungkapan tetapnya memakai on, bukan in.',
          'Idiom ini memakai hit, bukan beat.',
          'Mail berarti surat atau pos. Di sini perlu nail: paku.'
        ]
      },
      tr: {
        prompt: 'Tahminin tamamen isabetliydi',
        explanations: [
          'Doğru. Hit the nail on the head tam isabet etmek demektir.',
          'Sabit ifade on kullanır, in değil.',
          'Deyim hit kullanır, beat değil.',
          'Mail posta demektir. Burada nail gerekir: çivi.'
        ]
      },
      pl: {
        prompt: 'Twoje przypuszczenie było całkowicie trafne',
        explanations: [
          'Dobrze. Hit the nail on the head znaczy trafić dokładnie w sedno.',
          'Stałe wyrażenie używa on, nie in.',
          'Idiom używa hit, nie beat.',
          'Mail znaczy poczta. Tutaj potrzebujesz nail: gwóźdź.'
        ]
      }
    },
    '43': {
      'pt-BR': {
        prompt: 'Resumindo, decidimos cancelar o projeto',
        explanations: [
          'Correto. To cut a long story short significa resumindo; scrap aqui significa cancelar o projeto.',
          'A expressão termina com short, não shortly.',
          'Short speaking é uma tradução literal e não soa natural.',
          'Store significa loja. Aqui precisamos de story: história.'
        ]
      },
      vi: {
        prompt: 'Tóm lại, chúng tôi quyết định hủy dự án',
        explanations: [
          'Đúng. To cut a long story short nghĩa là tóm lại; scrap ở đây nghĩa là hủy dự án.',
          'Cụm này kết thúc bằng short, không phải shortly.',
          'Short speaking là dịch sát từng chữ và không tự nhiên.',
          'Store nghĩa là cửa hàng. Ở đây cần story: câu chuyện.'
        ]
      },
      id: {
        prompt: 'Singkat cerita, kami memutuskan membatalkan proyek itu',
        explanations: [
          'Benar. To cut a long story short berarti singkatnya; scrap di sini berarti membatalkan proyek.',
          'Ungkapan ini berakhir dengan short, bukan shortly.',
          'Short speaking adalah terjemahan literal dan tidak terdengar alami.',
          'Store berarti toko. Di sini perlu story: cerita.'
        ]
      },
      tr: {
        prompt: 'Uzun lafın kısası, projeyi iptal etmeye karar verdik',
        explanations: [
          'Doğru. To cut a long story short uzun lafın kısasıdır; scrap burada projeyi iptal etmek demektir.',
          'İfade short ile biter, shortly değil.',
          'Short speaking kelime kelime çeviridir ve doğal duyulmaz.',
          'Store mağaza demektir. Burada story gerekir: hikaye.'
        ]
      },
      pl: {
        prompt: 'Krótko mówiąc, zdecydowaliśmy się anulować projekt',
        explanations: [
          'Dobrze. To cut a long story short znaczy krótko mówiąc; scrap tutaj znaczy skasować projekt.',
          'Wyrażenie kończy się na short, nie shortly.',
          'Short speaking to dosłowne tłumaczenie i nie brzmi naturalnie.',
          'Store znaczy sklep. Tutaj potrzebujesz story: historia.'
        ]
      }
    },
    '44': {
      'pt-BR': {
        prompt: 'Ela defende implementar novos métodos de ensino',
        explanations: [
          'Depois de advocate, se vem uma ação diretamente, usamos -ing: implementing, não to implement.',
          'Correto. She advocates implementing... significa que ela apoia implementar esses métodos.',
          'Advocate for pode aparecer em outros contextos, mas aqui o padrão buscado é advocate + -ing sem for.',
          'Imploding significa implodindo. Aqui precisamos de implementing.'
        ]
      },
      vi: {
        prompt: 'Cô ấy ủng hộ việc áp dụng các phương pháp giảng dạy mới',
        explanations: [
          'Sau advocate, nếu hành động đi ngay sau đó, dùng dạng -ing: implementing, không phải to implement.',
          'Đúng. She advocates implementing... nghĩa là cô ấy ủng hộ việc áp dụng các phương pháp đó.',
          'Advocate for có thể xuất hiện trong ngữ cảnh khác, nhưng mẫu ở đây là advocate + -ing, không có for.',
          'Imploding nghĩa là nổ sập vào bên trong. Ở đây cần implementing.'
        ]
      },
      id: {
        prompt: 'Dia mendukung penerapan metode pengajaran baru',
        explanations: [
          'Setelah advocate, jika tindakan langsung mengikuti, gunakan -ing: implementing, bukan to implement.',
          'Benar. She advocates implementing... berarti dia mendukung penerapan metode itu.',
          'Advocate for bisa muncul dalam konteks lain, tetapi pola yang dicari di sini adalah advocate + -ing tanpa for.',
          'Imploding berarti runtuh ke dalam. Di sini perlu implementing.'
        ]
      },
      tr: {
        prompt: 'Yeni öğretim yöntemlerinin uygulanmasını savunuyor',
        explanations: [
          'Advocate sonrasında eylem doğrudan gelirse -ing kullanılır: implementing, to implement değil.',
          'Doğru. She advocates implementing... bu yöntemlerin uygulanmasını destekliyor demektir.',
          'Advocate for başka bağlamlarda görülebilir, ama burada hedeflenen kalıp for olmadan advocate + -ing.',
          'Imploding içe doğru çökmek demektir. Burada implementing gerekir.'
        ]
      },
      pl: {
        prompt: 'Opowiada się za wdrażaniem nowych metod nauczania',
        explanations: [
          'Po advocate, gdy czynność idzie bezpośrednio dalej, używamy -ing: implementing, nie to implement.',
          'Dobrze. She advocates implementing... znaczy, że popiera wdrażanie tych metod.',
          'Advocate for może pojawiać się w innych kontekstach, ale tutaj szukany wzorzec to advocate + -ing bez for.',
          'Imploding znaczy zapadać się do środka. Tutaj potrzebujesz implementing.'
        ]
      }
    },
    '45': {
      'pt-BR': {
        prompt: 'Mal eu entrei no escritório, o telefone tocou',
        explanations: [
          'Quando No sooner vem no início, usamos inversão: had I entered.',
          'Correto. No sooner had I entered... than... é a estrutura natural.',
          'No sooner combina com than, não com when.',
          'Officer significa oficial ou funcionário. Aqui precisamos de office: escritório.'
        ]
      },
      vi: {
        prompt: 'Tôi vừa bước vào văn phòng thì điện thoại reo',
        explanations: [
          'Khi No sooner đứng đầu câu, dùng đảo ngữ: had I entered.',
          'Đúng. No sooner had I entered... than... là cấu trúc tự nhiên.',
          'No sooner đi với than, không phải when.',
          'Officer nghĩa là sĩ quan hoặc viên chức. Ở đây cần office: văn phòng.'
        ]
      },
      id: {
        prompt: 'Begitu saya masuk kantor, telepon berdering',
        explanations: [
          'Saat No sooner ada di awal, gunakan inversion: had I entered.',
          'Benar. No sooner had I entered... than... adalah struktur alami.',
          'No sooner berpasangan dengan than, bukan when.',
          'Officer berarti petugas atau pejabat. Di sini perlu office: kantor.'
        ]
      },
      tr: {
        prompt: 'Ofise girer girmez telefon çaldı',
        explanations: [
          'No sooner cümle başına gelirse inversion kullanılır: had I entered.',
          'Doğru. No sooner had I entered... than... doğal yapıdır.',
          'No sooner than ile kullanılır, when ile değil.',
          'Officer memur veya subay demektir. Burada office gerekir: ofis.'
        ]
      },
      pl: {
        prompt: 'Ledwie wszedłem do biura, zadzwonił telefon',
        explanations: [
          'Gdy No sooner stoi na początku, używamy inwersji: had I entered.',
          'Dobrze. No sooner had I entered... than... to naturalna struktura.',
          'No sooner łączy się z than, nie z when.',
          'Officer znaczy urzędnik albo oficer. Tutaj potrzebujesz office: biuro.'
        ]
      }
    },
    '46': {
      'pt-BR': {
        prompt: 'Você não pode simplesmente voltar atrás no acordo agora',
        explanations: [
          'Correto. Back out of significa voltar atrás ou se retirar de um acordo.',
          'A expressão back out precisa de of antes daquilo de que você se retira.',
          'Take back from não é a forma natural para se retirar de um acordo.',
          'Bake significa assar. Aqui precisamos de back.'
        ]
      },
      vi: {
        prompt: 'Bây giờ bạn không thể cứ thế rút khỏi thỏa thuận',
        explanations: [
          'Đúng. Back out of nghĩa là rút lui hoặc rút khỏi một thỏa thuận.',
          'Cụm back out cần of trước thứ mà bạn rút khỏi.',
          'Take back from không phải cách nói tự nhiên để rút khỏi một thỏa thuận.',
          'Bake nghĩa là nướng bánh. Ở đây cần back.'
        ]
      },
      id: {
        prompt: 'Kamu tidak bisa begitu saja mundur dari kesepakatan sekarang',
        explanations: [
          'Benar. Back out of berarti mundur atau menarik diri dari suatu kesepakatan.',
          'Ungkapan back out membutuhkan of sebelum hal yang ditinggalkan.',
          'Take back from bukan bentuk alami untuk mundur dari kesepakatan.',
          'Bake berarti memanggang. Di sini perlu back.'
        ]
      },
      tr: {
        prompt: 'Şimdi anlaşmadan öylece çekilemezsin',
        explanations: [
          'Doğru. Back out of bir anlaşmadan geri çekilmek demektir.',
          'Back out ifadesi, çekildiğin şeyden önce of ister.',
          'Take back from bir anlaşmadan çekilmek için doğal yapı değildir.',
          'Bake pişirmek demektir. Burada back gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie możesz teraz tak po prostu wycofać się z umowy',
        explanations: [
          'Dobrze. Back out of znaczy wycofać się z umowy albo zobowiązania.',
          'Wyrażenie back out potrzebuje of przed tym, z czego się wycofujesz.',
          'Take back from nie jest naturalną formą dla wycofania się z umowy.',
          'Bake znaczy piec. Tutaj potrzebujesz back.'
        ]
      }
    },
    '47': {
      'pt-BR': {
        prompt: 'Precisamos examinar o contrato com muito cuidado',
        explanations: [
          'Esta opção é compreensível, mas simples. Aqui buscamos o verbo preciso scrutinize.',
          'Correto. Scrutinize significa examinar algo com muito cuidado.',
          'Scrutinize leva objeto direto. Não precisa de about.',
          'Contact significa contato. Aqui precisamos de contract: contrato.'
        ]
      },
      vi: {
        prompt: 'Chúng ta cần xem xét hợp đồng thật kỹ',
        explanations: [
          'Phương án này hiểu được, nhưng đơn giản hơn. Ở đây ta cần động từ chính xác scrutinize.',
          'Đúng. Scrutinize nghĩa là xem xét điều gì đó rất kỹ.',
          'Scrutinize nhận tân ngữ trực tiếp. Không cần about.',
          'Contact nghĩa là liên hệ hoặc danh bạ. Ở đây cần contract: hợp đồng.'
        ]
      },
      id: {
        prompt: 'Kita perlu menelaah kontrak itu dengan sangat teliti',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi lebih sederhana. Di sini targetnya verb yang tepat: scrutinize.',
          'Benar. Scrutinize berarti memeriksa sesuatu dengan sangat teliti.',
          'Scrutinize mengambil object langsung. Tidak perlu about.',
          'Contact berarti kontak. Di sini perlu contract: kontrak.'
        ]
      },
      tr: {
        prompt: 'Sözleşmeyi çok dikkatli incelememiz gerekiyor',
        explanations: [
          'Bu seçenek anlaşılır, ama daha basit. Burada hedeflenen kesin fiil scrutinize.',
          'Doğru. Scrutinize bir şeyi çok dikkatli incelemek demektir.',
          'Scrutinize doğrudan object alır. About gerekmez.',
          'Contact iletişim veya kişi kaydı demektir. Burada contract gerekir: sözleşme.'
        ]
      },
      pl: {
        prompt: 'Musimy bardzo dokładnie przeanalizować umowę',
        explanations: [
          'Ta opcja jest zrozumiała, ale prostsza. Tutaj szukamy precyzyjnego czasownika scrutinize.',
          'Dobrze. Scrutinize znaczy bardzo dokładnie coś przeanalizować.',
          'Scrutinize bierze bezpośredni object. Nie potrzebuje about.',
          'Contact znaczy kontakt. Tutaj potrzebujesz contract: umowa.'
        ]
      }
    },
    '48': {
      'pt-BR': {
        prompt: 'Se ela não fosse tão arrogante, não o teria ofendido naquela época',
        explanations: [
          'Esta opção deixa offend no presente ou futuro, mas a ofensa já aconteceu no passado: precisamos de offended.',
          'Hadn\'t been fala mais de uma condição passada concreta. Aqui a ideia é uma característica geral.',
          'Correto. É mixed conditional: condição geral presente, resultado passado.',
          'Thin significa fino ou magro. Aqui precisamos de then: então.'
        ]
      },
      vi: {
        prompt: 'Nếu cô ấy không kiêu ngạo như vậy, lúc đó cô ấy đã không làm anh ấy tổn thương',
        explanations: [
          'Phương án này để offend ở hiện tại hoặc tương lai, nhưng việc làm tổn thương đã xảy ra trong quá khứ: cần offended.',
          'Hadn\'t been thiên về một điều kiện quá khứ cụ thể. Ở đây ý là một tính cách chung.',
          'Đúng. Đây là mixed conditional: điều kiện chung hiện tại, kết quả quá khứ.',
          'Thin nghĩa là mỏng hoặc gầy. Ở đây cần then: lúc đó.'
        ]
      },
      id: {
        prompt: 'Jika dia tidak begitu arogan, saat itu dia tidak akan menyinggungnya',
        explanations: [
          'Pilihan ini menaruh offend di masa kini atau masa depan, padahal tindakannya sudah terjadi di masa lalu: perlu offended.',
          'Hadn\'t been lebih mengarah ke kondisi masa lalu tertentu. Di sini idenya adalah sifat umum.',
          'Benar. Ini mixed conditional: kondisi umum masa kini, hasil masa lalu.',
          'Thin berarti tipis atau kurus. Di sini perlu then: saat itu.'
        ]
      },
      tr: {
        prompt: 'O bu kadar kibirli olmasaydı, o zaman onu incitmezdi',
        explanations: [
          'Bu seçenek offend fiilini şimdiye veya geleceğe bırakır, ama kırıcı davranış geçmişte oldu: offended gerekir.',
          'Hadn\'t been daha çok belirli bir geçmiş koşulu anlatır. Burada fikir genel bir kişilik özelliği.',
          'Doğru. Bu mixed conditional: şimdiki genel koşul, geçmiş sonuç.',
          'Thin ince veya zayıf demektir. Burada then gerekir: o zaman.'
        ]
      },
      pl: {
        prompt: 'Gdyby nie była taka arogancka, wtedy by go nie obraziła',
        explanations: [
          'Ta opcja zostawia offend w teraźniejszości albo przyszłości, ale obraza wydarzyła się w przeszłości: potrzebne jest offended.',
          'Hadn\'t been mówi raczej o konkretnym warunku w przeszłości. Tutaj chodzi o ogólną cechę.',
          'Dobrze. To mixed conditional: ogólny warunek teraźniejszy, wynik przeszły.',
          'Thin znaczy cienki albo szczupły. Tutaj potrzebujesz then: wtedy.'
        ]
      }
    },
    '49': {
      'pt-BR': {
        prompt: 'Eu não esperava que ele me traísse por uma promoção',
        explanations: [
          'O idiom é throw someone under the bus, não put someone under the bus.',
          'Correto. Throw someone under the bus significa trair alguém ou culpá-lo para se proteger.',
          'Buzz significa zumbido ou rumor. Aqui precisamos de bus.',
          'A expressão fixa leva the bus, não apenas bus.'
        ]
      },
      vi: {
        prompt: 'Tôi không ngờ anh ấy lại bán đứng tôi vì một lần thăng chức',
        explanations: [
          'Thành ngữ là throw someone under the bus, không phải put someone under the bus.',
          'Đúng. Throw someone under the bus nghĩa là phản bội hoặc đổ lỗi cho ai để tự bảo vệ mình.',
          'Buzz nghĩa là tiếng vo ve hoặc tin đồn. Ở đây cần bus.',
          'Cụm cố định có the bus, không chỉ bus.'
        ]
      },
      id: {
        prompt: 'Saya tidak menyangka dia akan mengorbankan saya demi promosi',
        explanations: [
          'Idiomnya adalah throw someone under the bus, bukan put someone under the bus.',
          'Benar. Throw someone under the bus berarti mengkhianati atau menyalahkan seseorang demi melindungi diri.',
          'Buzz berarti dengung atau rumor. Di sini perlu bus.',
          'Ungkapan tetapnya memakai the bus, bukan hanya bus.'
        ]
      },
      tr: {
        prompt: 'Terfi için beni harcamasını beklemiyordum',
        explanations: [
          'Deyim throw someone under the bus olur, put someone under the bus değil.',
          'Doğru. Throw someone under the bus birini satmak veya kendini korumak için suçlamak demektir.',
          'Buzz uğultu veya söylenti demektir. Burada bus gerekir.',
          'Sabit ifade the bus kullanır, sadece bus değil.'
        ]
      },
      pl: {
        prompt: 'Nie spodziewałem się, że poświęci mnie dla awansu',
        explanations: [
          'Idiom to throw someone under the bus, nie put someone under the bus.',
          'Dobrze. Throw someone under the bus znaczy zdradzić kogoś albo obwinić go, żeby chronić siebie.',
          'Buzz znaczy brzęczenie albo plotka. Tutaj potrzebujesz bus.',
          'Stałe wyrażenie ma the bus, nie samo bus.'
        ]
      }
    },
    '50': {
      'pt-BR': {
        prompt: 'Me incomoda ser tratado como algo garantido',
        explanations: [
          'Correto. Resent being taken for granted expressa incômodo por não ser valorizado.',
          'Depois de resent, para esta ideia passiva, precisamos de being taken.',
          'A expressão fixa é taken for granted. Grantedly não funciona aqui.',
          'Debt significa dívida. Aqui precisamos de granted.'
        ]
      },
      vi: {
        prompt: 'Tôi bực vì mình bị xem là điều hiển nhiên',
        explanations: [
          'Đúng. Resent being taken for granted diễn tả sự khó chịu vì không được trân trọng.',
          'Sau resent, với ý bị động này, cần being taken.',
          'Cụm cố định là taken for granted. Grantedly không dùng ở đây.',
          'Debt nghĩa là khoản nợ. Ở đây cần granted.'
        ]
      },
      id: {
        prompt: 'Saya kesal karena dianggap sudah pasti ada',
        explanations: [
          'Benar. Resent being taken for granted menyatakan rasa kesal karena tidak dihargai.',
          'Setelah resent, untuk ide pasif ini, perlu being taken.',
          'Ungkapan tetapnya taken for granted. Grantedly tidak berfungsi di sini.',
          'Debt berarti utang. Di sini perlu granted.'
        ]
      },
      tr: {
        prompt: 'Beni cepte görmelerine içerliyorum',
        explanations: [
          'Doğru. Resent being taken for granted değer verilmemesine içerlemek demektir.',
          'Resent sonrasında bu passive fikir için being taken gerekir.',
          'Sabit ifade taken for granted olur. Grantedly burada işlemez.',
          'Debt borç demektir. Burada granted gerekir.'
        ]
      },
      pl: {
        prompt: 'Mam żal, że traktuje się mnie jak coś oczywistego',
        explanations: [
          'Dobrze. Resent being taken for granted wyraża żal o to, że ktoś cię nie docenia.',
          'Po resent, dla tej pasywnej myśli, potrzebne jest being taken.',
          'Stałe wyrażenie to taken for granted. Grantedly tutaj nie działa.',
          'Debt znaczy dług. Tutaj potrzebujesz granted.'
        ]
      }
    },
    '51': {
      'pt-BR': {
        prompt: 'Consegui fazer com que ele reconsiderasse sua decisão',
        explanations: [
          'Correto. Get someone to do something significa conseguir que alguém faça algo.',
          'Depois de get him precisamos de to antes do verbo: get him to reconsider.',
          'Com make someone do não usamos to. Se quiser manter to, a estrutura correta é get him to...',
          'Reconcile significa reconciliar ou resolver um conflito. Aqui precisamos de reconsider.'
        ]
      },
      vi: {
        prompt: 'Tôi đã thuyết phục được anh ấy xem xét lại quyết định của mình',
        explanations: [
          'Đúng. Get someone to do something nghĩa là khiến hoặc thuyết phục ai đó làm gì.',
          'Sau get him cần to trước động từ: get him to reconsider.',
          'Với make someone do, không dùng to. Nếu muốn giữ to, cấu trúc đúng là get him to...',
          'Reconcile nghĩa là hòa giải hoặc làm lành. Ở đây cần reconsider: xem xét lại.'
        ]
      },
      id: {
        prompt: 'Saya berhasil membuatnya mempertimbangkan kembali keputusannya',
        explanations: [
          'Benar. Get someone to do something berarti berhasil membuat seseorang melakukan sesuatu.',
          'Setelah get him perlu to sebelum verb: get him to reconsider.',
          'Dengan make someone do, jangan gunakan to. Jika ingin memakai to, struktur yang benar adalah get him to...',
          'Reconcile berarti mendamaikan atau menyelesaikan konflik. Di sini perlu reconsider.'
        ]
      },
      tr: {
        prompt: 'Kararını yeniden gözden geçirmesini sağladım',
        explanations: [
          'Doğru. Get someone to do something birinin bir şeyi yapmasını sağlamak demektir.',
          'Get him sonrasında fiilden önce to gerekir: get him to reconsider.',
          'Make someone do yapısında to kullanılmaz. To kalacaksa doğru yapı get him to... olur.',
          'Reconcile barıştırmak veya uzlaştırmak demektir. Burada reconsider gerekir.'
        ]
      },
      pl: {
        prompt: 'Udało mi się skłonić go do ponownego rozważenia decyzji',
        explanations: [
          'Dobrze. Get someone to do something znaczy skłonić kogoś, żeby coś zrobił.',
          'Po get him potrzebne jest to przed czasownikiem: get him to reconsider.',
          'Z make someone do nie używamy to. Jeśli zostaje to, poprawna struktura to get him to...',
          'Reconcile znaczy pojednać albo pogodzić. Tutaj potrzebujesz reconsider.'
        ]
      }
    },
    '52': {
      'pt-BR': {
        prompt: 'Em nenhuma circunstância você tem permissão para revelar esta senha',
        explanations: [
          'Quando Under no circumstances vem no início, usamos inversão: are you, não you are.',
          'Correto. Under no circumstances are you allowed to... é uma proibição forte e formal.',
          'Enclose significa colocar em um envelope ou cercar. Aqui precisamos de disclose: revelar.',
          'A expressão fixa é under no circumstances, não in no circumstances.'
        ]
      },
      vi: {
        prompt: 'Trong mọi trường hợp, bạn không được phép tiết lộ mật khẩu này',
        explanations: [
          'Khi Under no circumstances đứng đầu câu, dùng đảo ngữ: are you, không phải you are.',
          'Đúng. Under no circumstances are you allowed to... là lệnh cấm mạnh và trang trọng.',
          'Enclose nghĩa là đặt vào phong bì hoặc bao quanh. Ở đây cần disclose: tiết lộ.',
          'Cụm cố định là under no circumstances, không phải in no circumstances.'
        ]
      },
      id: {
        prompt: 'Dalam keadaan apa pun kamu tidak diizinkan mengungkapkan kata sandi ini',
        explanations: [
          'Saat Under no circumstances ada di awal, gunakan inversion: are you, bukan you are.',
          'Benar. Under no circumstances are you allowed to... adalah larangan kuat dan formal.',
          'Enclose berarti memasukkan ke amplop atau mengelilingi. Di sini perlu disclose: mengungkapkan.',
          'Ungkapan tetapnya under no circumstances, bukan in no circumstances.'
        ]
      },
      tr: {
        prompt: 'Hiçbir koşulda bu şifreyi açıklamana izin verilmez',
        explanations: [
          'Under no circumstances cümle başına gelirse inversion kullanılır: are you, you are değil.',
          'Doğru. Under no circumstances are you allowed to... güçlü ve resmi bir yasaktır.',
          'Enclose zarfa koymak veya çevrelemek demektir. Burada disclose gerekir: açıklamak.',
          'Sabit ifade under no circumstances olur, in no circumstances değil.'
        ]
      },
      pl: {
        prompt: 'Pod żadnym pozorem nie wolno ci ujawniać tego hasła',
        explanations: [
          'Gdy Under no circumstances stoi na początku, używamy inwersji: are you, nie you are.',
          'Dobrze. Under no circumstances are you allowed to... to mocny i formalny zakaz.',
          'Enclose znaczy włożyć do koperty albo otoczyć. Tutaj potrzebujesz disclose: ujawnić.',
          'Stałe wyrażenie to under no circumstances, nie in no circumstances.'
        ]
      }
    },
    '53': {
      'pt-BR': {
        prompt: 'Se eu não tivesse reprovado naquele exame no ano passado, agora já seria médico formado',
        explanations: [
          'Didn\'t fail não marca bem uma condição passada não realizada. Precisamos de hadn\'t failed.',
          'Would have been leva o resultado ao passado, mas now pede resultado presente: would be.',
          'Correto. É mixed conditional: condição passada, resultado presente.',
          'Docker significa trabalhador portuário. Aqui precisamos de doctor.'
        ]
      },
      vi: {
        prompt: 'Nếu năm ngoái tôi không trượt kỳ thi đó, bây giờ tôi đã là bác sĩ có chứng chỉ',
        explanations: [
          'Didn\'t fail không đánh dấu rõ điều kiện quá khứ không xảy ra. Cần hadn\'t failed.',
          'Would have been đưa kết quả về quá khứ, nhưng now yêu cầu kết quả hiện tại: would be.',
          'Đúng. Đây là mixed conditional: điều kiện quá khứ, kết quả hiện tại.',
          'Docker nghĩa là công nhân bốc xếp ở cảng. Ở đây cần doctor.'
        ]
      },
      id: {
        prompt: 'Jika saya tidak gagal ujian itu tahun lalu, sekarang saya sudah menjadi dokter berkualifikasi',
        explanations: [
          'Didn\'t fail tidak cukup menandai kondisi masa lalu yang tidak terjadi. Perlu hadn\'t failed.',
          'Would have been membawa hasil ke masa lalu, tetapi now meminta hasil masa kini: would be.',
          'Benar. Ini mixed conditional: kondisi masa lalu, hasil masa kini.',
          'Docker berarti pekerja pelabuhan. Di sini perlu doctor.'
        ]
      },
      tr: {
        prompt: 'Geçen yıl o sınavda kalmamış olsaydım, şimdi nitelikli bir doktor olurdum',
        explanations: [
          'Didn\'t fail gerçekleşmemiş geçmiş koşulu iyi göstermez. Hadn\'t failed gerekir.',
          'Would have been sonucu geçmişe taşır, ama now şimdiki sonucu ister: would be.',
          'Doğru. Bu mixed conditional: geçmiş koşul, şimdiki sonuç.',
          'Docker liman işçisi demektir. Burada doctor gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdybym nie oblał tamtego egzaminu w zeszłym roku, teraz byłbym już wykwalifikowanym lekarzem',
        explanations: [
          'Didn\'t fail nie zaznacza dobrze niespełnionego warunku w przeszłości. Potrzebne jest hadn\'t failed.',
          'Would have been przenosi wynik do przeszłości, ale now wymaga wyniku teraźniejszego: would be.',
          'Dobrze. To mixed conditional: warunek przeszły, wynik teraźniejszy.',
          'Docker znaczy pracownik portowy. Tutaj potrzebujesz doctor.'
        ]
      }
    },
    '54': {
      'pt-BR': {
        prompt: 'Só depois que ele foi embora percebi meu erro',
        explanations: [
          'Correto. Only after he left did I realize... usa inversão depois do bloco inicial.',
          'Com Only after no início, na segunda parte precisamos de did I realize, não I realized.',
          'Release significa soltar ou liberar. Aqui precisamos de realize: perceber.',
          'Leaf significa folha de árvore. Aqui precisamos de left: foi embora.'
        ]
      },
      vi: {
        prompt: 'Chỉ sau khi anh ấy rời đi, tôi mới nhận ra lỗi của mình',
        explanations: [
          'Đúng. Only after he left did I realize... dùng đảo ngữ sau cụm mở đầu.',
          'Với Only after ở đầu câu, phần sau cần did I realize, không phải I realized.',
          'Release nghĩa là thả ra hoặc giải phóng. Ở đây cần realize: nhận ra.',
          'Leaf nghĩa là chiếc lá. Ở đây cần left: đã rời đi.'
        ]
      },
      id: {
        prompt: 'Baru setelah dia pergi, saya menyadari kesalahan saya',
        explanations: [
          'Benar. Only after he left did I realize... memakai inversion setelah bagian pembuka.',
          'Dengan Only after di awal, bagian kedua perlu did I realize, bukan I realized.',
          'Release berarti melepaskan atau membebaskan. Di sini perlu realize: menyadari.',
          'Leaf berarti daun. Di sini perlu left: pergi.'
        ]
      },
      tr: {
        prompt: 'Ancak o gittikten sonra hatamı fark ettim',
        explanations: [
          'Doğru. Only after he left did I realize... başlangıç bloğundan sonra inversion kullanır.',
          'Only after başta olursa ikinci bölümde did I realize gerekir, I realized değil.',
          'Release serbest bırakmak demektir. Burada realize gerekir: fark etmek.',
          'Leaf yaprak demektir. Burada left gerekir: gitti.'
        ]
      },
      pl: {
        prompt: 'Dopiero po jego wyjściu zdałem sobie sprawę z błędu',
        explanations: [
          'Dobrze. Only after he left did I realize... używa inwersji po bloku początkowym.',
          'Z Only after na początku w drugiej części potrzebne jest did I realize, nie I realized.',
          'Release znaczy wypuścić albo uwolnić. Tutaj potrzebujesz realize: zdać sobie sprawę.',
          'Leaf znaczy liść. Tutaj potrzebujesz left: wyszedł.'
        ]
      }
    },
    '55': {
      'pt-BR': {
        prompt: 'Preciso revisar meu francês antes da viagem',
        explanations: [
          'Correto. Brush up on significa revisar ou refrescar conhecimentos que você já tem.',
          'A expressão fixa precisa de on: brush up on my French.',
          'Fresh não funciona assim para dizer revisar um idioma. Aqui precisamos de brush up on.',
          'Blush significa corar. Aqui precisamos de brush.'
        ]
      },
      vi: {
        prompt: 'Tôi cần ôn lại tiếng Pháp trước chuyến đi',
        explanations: [
          'Đúng. Brush up on nghĩa là ôn lại hoặc làm mới kiến thức bạn đã có.',
          'Cụm cố định cần on: brush up on my French.',
          'Fresh không dùng như vậy để nói ôn lại một ngôn ngữ. Ở đây cần brush up on.',
          'Blush nghĩa là đỏ mặt. Ở đây cần brush.'
        ]
      },
      id: {
        prompt: 'Saya perlu menyegarkan kembali bahasa Prancis saya sebelum perjalanan',
        explanations: [
          'Benar. Brush up on berarti mengulang atau menyegarkan kembali kemampuan yang sudah dimiliki.',
          'Ungkapan tetapnya membutuhkan on: brush up on my French.',
          'Fresh tidak dipakai seperti ini untuk menyatakan mengulang bahasa. Di sini perlu brush up on.',
          'Blush berarti tersipu. Di sini perlu brush.'
        ]
      },
      tr: {
        prompt: 'Yolculuktan önce Fransızcamı tazelemem gerekiyor',
        explanations: [
          'Doğru. Brush up on zaten bildiğin bir şeyi tekrar etmek veya tazelemek demektir.',
          'Sabit ifade on ister: brush up on my French.',
          'Fresh bir dili tekrar etmek için bu şekilde kullanılmaz. Burada brush up on gerekir.',
          'Blush kızarmak demektir. Burada brush gerekir.'
        ]
      },
      pl: {
        prompt: 'Muszę odświeżyć francuski przed podróżą',
        explanations: [
          'Dobrze. Brush up on znaczy odświeżyć albo powtórzyć wiedzę, którą już masz.',
          'Stałe wyrażenie potrzebuje on: brush up on my French.',
          'Fresh nie działa tak przy odświeżaniu języka. Tutaj potrzebujesz brush up on.',
          'Blush znaczy rumienić się. Tutaj potrzebujesz brush.'
        ]
      }
    },
    '56': {
      'pt-BR': {
        prompt: 'É descaradamente óbvio que ele está mentindo',
        explanations: [
          'Depois de It is precisamos de adjetivo: obvious, não obviously.',
          'Correto. Blatantly obvious significa descaradamente ou claramente óbvio.',
          'Opened obvious não é uma combinação natural para esta ideia.',
          'Oblivious significa alheio ou sem perceber algo. Aqui precisamos de obvious.'
        ]
      },
      vi: {
        prompt: 'Rõ ràng đến mức trắng trợn là anh ấy đang nói dối',
        explanations: [
          'Sau It is cần tính từ: obvious, không phải obviously.',
          'Đúng. Blatantly obvious nghĩa là rõ ràng một cách trắng trợn.',
          'Opened obvious không phải kết hợp tự nhiên cho ý này.',
          'Oblivious nghĩa là không nhận ra điều gì đó. Ở đây cần obvious.'
        ]
      },
      id: {
        prompt: 'Sangat jelas bahwa dia sedang berbohong',
        explanations: [
          'Setelah It is perlu adjective: obvious, bukan obviously.',
          'Benar. Blatantly obvious berarti sangat jelas atau terang-terangan jelas.',
          'Opened obvious bukan kombinasi alami untuk ide ini.',
          'Oblivious berarti tidak sadar akan sesuatu. Di sini perlu obvious.'
        ]
      },
      tr: {
        prompt: 'Yalan söylediği apaçık ortada',
        explanations: [
          'It is sonrasında adjective gerekir: obvious, obviously değil.',
          'Doğru. Blatantly obvious apaçık veya bariz şekilde belli demektir.',
          'Opened obvious bu fikir için doğal bir birleşim değildir.',
          'Oblivious bir şeyin farkında olmayan demektir. Burada obvious gerekir.'
        ]
      },
      pl: {
        prompt: 'To rażąco oczywiste, że kłamie',
        explanations: [
          'Po It is potrzebny jest przymiotnik: obvious, nie obviously.',
          'Dobrze. Blatantly obvious znaczy rażąco albo bezsprzecznie oczywiste.',
          'Opened obvious nie jest naturalnym połączeniem dla tej myśli.',
          'Oblivious znaczy nieświadomy czegoś. Tutaj potrzebujesz obvious.'
        ]
      }
    },
    '57': {
      'pt-BR': {
        prompt: 'Ele não só chegou atrasado, mas também esqueceu os documentos',
        explanations: [
          'Quando Not only abre a frase, usamos inversão: was he, não he was.',
          'Correto. Not only was he late, but he also... mantém a estrutura enfática.',
          'Arguments significa argumentos ou discussões. Aqui precisamos de documents.',
          'Lately significa ultimamente. Aqui precisamos de late: atrasado.'
        ]
      },
      vi: {
        prompt: 'Anh ấy không chỉ đến muộn mà còn quên tài liệu',
        explanations: [
          'Khi Not only mở đầu câu, cần đảo ngữ: was he, không phải he was.',
          'Đúng. Not only was he late, but he also... giữ cấu trúc nhấn mạnh.',
          'Arguments nghĩa là lập luận hoặc cuộc tranh cãi. Ở đây cần documents.',
          'Lately nghĩa là gần đây. Ở đây cần late: muộn.'
        ]
      },
      id: {
        prompt: 'Dia bukan hanya terlambat, tetapi juga lupa membawa dokumen',
        explanations: [
          'Saat Not only membuka kalimat, perlu inversion: was he, bukan he was.',
          'Benar. Not only was he late, but he also... mempertahankan struktur penekanan.',
          'Arguments berarti argumen atau perdebatan. Di sini perlu documents.',
          'Lately berarti akhir-akhir ini. Di sini perlu late: terlambat.'
        ]
      },
      tr: {
        prompt: 'Sadece geç kalmakla kalmadı, belgeleri de unuttu',
        explanations: [
          'Not only cümle başına gelirse inversion gerekir: was he, he was değil.',
          'Doğru. Not only was he late, but he also... vurgulu yapıyı korur.',
          'Arguments argümanlar veya tartışmalar demektir. Burada documents gerekir.',
          'Lately son zamanlarda demektir. Burada late gerekir: geç.'
        ]
      },
      pl: {
        prompt: 'Nie tylko się spóźnił, ale też zapomniał dokumentów',
        explanations: [
          'Gdy Not only otwiera zdanie, potrzebna jest inwersja: was he, nie he was.',
          'Dobrze. Not only was he late, but he also... zachowuje strukturę emfatyczną.',
          'Arguments znaczy argumenty albo spory. Tutaj potrzebujesz documents.',
          'Lately znaczy ostatnio. Tutaj potrzebujesz late: spóźniony.'
        ]
      }
    },
    '58': {
      'pt-BR': {
        prompt: 'A saúde do paciente começou a se deteriorar ontem à noite',
        explanations: [
          'Esta opção é compreensível, mas simples. Aqui buscamos o verbo preciso deteriorate.',
          'Decorate significa decorar. Aqui precisamos de deteriorate: piorar.',
          'Correto. Deteriorate significa piorar ou se deteriorar.',
          'Depois de began aqui precisamos de to + verbo: began to deteriorate.'
        ]
      },
      vi: {
        prompt: 'Sức khỏe của bệnh nhân bắt đầu xấu đi vào tối qua',
        explanations: [
          'Phương án này hiểu được, nhưng đơn giản hơn. Ở đây ta cần động từ chính xác deteriorate.',
          'Decorate nghĩa là trang trí. Ở đây cần deteriorate: xấu đi.',
          'Đúng. Deteriorate nghĩa là xấu đi hoặc suy giảm.',
          'Sau began ở đây cần to + động từ: began to deteriorate.'
        ]
      },
      id: {
        prompt: 'Kesehatan pasien mulai memburuk tadi malam',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi lebih sederhana. Di sini targetnya verb yang tepat: deteriorate.',
          'Decorate berarti menghias. Di sini perlu deteriorate: memburuk.',
          'Benar. Deteriorate berarti memburuk atau menurun.',
          'Setelah began di sini perlu to + verb: began to deteriorate.'
        ]
      },
      tr: {
        prompt: 'Hastanın sağlığı dün gece kötüleşmeye başladı',
        explanations: [
          'Bu seçenek anlaşılır, ama daha basit. Burada hedeflenen kesin fiil deteriorate.',
          'Decorate süslemek demektir. Burada deteriorate gerekir: kötüleşmek.',
          'Doğru. Deteriorate kötüleşmek veya bozulmak demektir.',
          'Began sonrasında burada to + fiil gerekir: began to deteriorate.'
        ]
      },
      pl: {
        prompt: 'Stan zdrowia pacjenta zaczął się pogarszać zeszłej nocy',
        explanations: [
          'Ta opcja jest zrozumiała, ale prostsza. Tutaj szukamy precyzyjnego czasownika deteriorate.',
          'Decorate znaczy dekorować. Tutaj potrzebujesz deteriorate: pogarszać się.',
          'Dobrze. Deteriorate znaczy pogarszać się albo niszczeć.',
          'Po began tutaj potrzebne jest to + czasownik: began to deteriorate.'
        ]
      }
    },
    '59': {
      'pt-BR': {
        prompt: 'É imperativo que ele chegue a tempo para a reunião',
        explanations: [
          'Arrives é indicativo. Aqui buscamos subjuntivo formal depois de It is imperative that.',
          'For him arrive mistura estruturas; com for faltaria to arrive, mas aqui o padrão é that he arrive. Termo-chave em ingl?s: imperative..',
          'Correto. No mandative subjunctive usamos a forma base: he arrive.',
          'Archive significa arquivar. Aqui precisamos de arrive: chegar.'
        ]
      },
      vi: {
        prompt: 'Điều bắt buộc là anh ấy phải đến cuộc họp đúng giờ',
        explanations: [
          'Arrives là indicative. Ở đây mục tiêu là subjunctive trang trọng sau It is imperative that.',
          'For him arrive trộn cấu trúc; với for cần to arrive, nhưng mẫu ở đây là that he arrive. Thu?t ng? ti?ng Anh c?n gi?: imperative..',
          'Đúng. Trong mandative subjunctive dùng dạng nguyên mẫu: he arrive.',
          'Archive nghĩa là lưu trữ. Ở đây cần arrive: đến.'
        ]
      },
      id: {
        prompt: 'Sangat penting agar dia tiba tepat waktu untuk rapat',
        explanations: [
          'Arrives adalah indicative. Di sini targetnya subjunctive formal setelah It is imperative that.',
          'For him arrive mencampur struktur; dengan for perlu to arrive, tetapi polanya di sini that he arrive. Istilah Inggris yang perlu dipertahankan: imperative..',
          'Benar. Dalam mandative subjunctive gunakan bentuk dasar: he arrive.',
          'Archive berarti mengarsipkan. Di sini perlu arrive: tiba.'
        ]
      },
      tr: {
        prompt: 'Toplantıya zamanında varması zorunludur',
        explanations: [
          'Arrives indicative biçimdir. Burada hedef It is imperative that sonrasında resmi subjunctive kullanımıdır.',
          'For him arrive yapıları karıştırır; for ile to arrive gerekir, ama buradaki kalıp that he arrive. Korunmas? gereken ?ngilizce terim: imperative..',
          'Doğru. Mandative subjunctive içinde yalın fiil kullanılır: he arrive.',
          'Archive arşivlemek demektir. Burada arrive gerekir: varmak.'
        ]
      },
      pl: {
        prompt: 'To konieczne, żeby przybył na spotkanie punktualnie',
        explanations: [
          'Arrives to tryb oznajmujący. Tutaj chodzi o formalny subjunctive po It is imperative that.',
          'For him arrive miesza struktury; przy for brakowałoby to arrive, ale tutaj wzorzec to that he arrive. Angielski termin do zachowania: imperative..',
          'Dobrze. W mandative subjunctive używamy formy podstawowej: he arrive.',
          'Archive znaczy archiwizować. Tutaj potrzebujesz arrive: przybyć.'
        ]
      }
    },
    '60': {
      'pt-BR': {
        prompt: 'Alega-se que ele está envolvido neste escândalo',
        explanations: [
          'Correto. He is alleged to be involved... é uma forma passiva e formal para uma acusação não comprovada.',
          'They allege him to involve não soa natural aqui. A forma limpa é he is alleged to be involved.',
          'Depois de alleged precisamos de to: alleged to be involved.',
          'Evolved significa evoluído. Aqui precisamos de involved: envolvido.'
        ]
      },
      vi: {
        prompt: 'Người ta cáo buộc anh ấy có liên quan đến vụ bê bối này',
        explanations: [
          'Đúng. He is alleged to be involved... là dạng bị động trang trọng cho một cáo buộc chưa được chứng minh.',
          'They allege him to involve không tự nhiên ở đây. Cách gọn là he is alleged to be involved.',
          'Sau alleged cần to: alleged to be involved.',
          'Evolved nghĩa là đã tiến hóa hoặc phát triển. Ở đây cần involved: liên quan.'
        ]
      },
      id: {
        prompt: 'Dia diduga terlibat dalam skandal ini',
        explanations: [
          'Benar. He is alleged to be involved... adalah bentuk passive formal untuk tuduhan yang belum terbukti.',
          'They allege him to involve tidak terdengar alami di sini. Bentuk yang rapi adalah he is alleged to be involved.',
          'Setelah alleged perlu to: alleged to be involved.',
          'Evolved berarti berevolusi atau berkembang. Di sini perlu involved: terlibat.'
        ]
      },
      tr: {
        prompt: 'Bu skandala karıştığı iddia ediliyor',
        explanations: [
          'Doğru. He is alleged to be involved... kanıtlanmamış bir iddia için resmi passive yapıdır.',
          'They allege him to involve burada doğal duyulmaz. Temiz yapı he is alleged to be involved olur.',
          'Alleged sonrasında to gerekir: alleged to be involved.',
          'Evolved evrimleşmiş veya gelişmiş demektir. Burada involved gerekir: dahil olmuş.'
        ]
      },
      pl: {
        prompt: 'Zarzuca się mu udział w tym skandalu',
        explanations: [
          'Dobrze. He is alleged to be involved... to formalna strona bierna dla nieudowodnionego zarzutu.',
          'They allege him to involve nie brzmi tutaj naturalnie. Czysta forma to he is alleged to be involved.',
          'Po alleged potrzebne jest to: alleged to be involved.',
          'Evolved znaczy rozwinięty albo ewoluowany. Tutaj potrzebujesz involved: zamieszany.'
        ]
      }
    },
    '61': {
      'pt-BR': {
        prompt: 'Pode-se dizer que é o melhor filme do ano',
        explanations: [
          'Correto. Arguably permite afirmar algo com força, mas deixando espaço para discussão.',
          'Possible to say... dá para entender, mas não é uma frase natural e completa aqui.',
          'Arguable é adjetivo. Aqui precisamos do advérbio arguably.',
          'Moving não é movie. Aqui falamos de um filme, não de movimento.'
        ]
      },
      vi: {
        prompt: 'Có thể nói đây là bộ phim hay nhất của năm',
        explanations: [
          'Đúng. Arguably cho phép nói điều gì đó khá mạnh, nhưng vẫn chừa chỗ cho tranh luận.',
          'Possible to say... có thể hiểu, nhưng không phải câu tự nhiên và hoàn chỉnh ở đây.',
          'Arguable là tính từ. Ở đây cần trạng từ arguably.',
          'Moving không phải movie. Ở đây đang nói về một bộ phim, không phải chuyển động.'
        ]
      },
      id: {
        prompt: 'Bisa dibilang ini film terbaik tahun ini',
        explanations: [
          'Benar. Arguably memungkinkan pernyataan kuat tetapi tetap membuka ruang untuk perdebatan.',
          'Possible to say... bisa dimengerti, tetapi bukan kalimat alami dan lengkap di sini.',
          'Arguable adalah adjective. Di sini perlu adverb arguably.',
          'Moving bukan movie. Di sini kita membahas film, bukan gerakan.'
        ]
      },
      tr: {
        prompt: 'Yılın en iyi filmi olduğu söylenebilir',
        explanations: [
          'Doğru. Arguably güçlü bir iddia kurar ama tartışmaya da alan bırakır.',
          'Possible to say... anlaşılır, ama burada doğal ve tam bir cümle değildir.',
          'Arguable adjective biçimdir. Burada adverb olan arguably gerekir.',
          'Moving movie değildir. Burada hareketten değil filmden söz ediyoruz.'
        ]
      },
      pl: {
        prompt: 'Można powiedzieć, że to najlepszy film roku',
        explanations: [
          'Dobrze. Arguably pozwala powiedzieć coś mocno, ale zostawia miejsce na dyskusję.',
          'Possible to say... da się zrozumieć, ale tutaj nie jest naturalnym i pełnym zdaniem.',
          'Arguable to przymiotnik. Tutaj potrzebujesz przysłówka arguably.',
          'Moving to nie movie. Tutaj mówimy o filmie, nie o ruchu.'
        ]
      }
    },
    '62': {
      'pt-BR': {
        prompt: 'Parece que ele assumiu uma tarefa grande demais',
        explanations: [
          'Esta opção é compreensível, mas soa literal demais para esta ideia.',
          'Correto. Bite off more than you can chew significa assumir mais do que consegue dar conta.',
          'O idiom termina em chew. O it final sobra.',
          'Shoe significa sapato. Aqui precisamos de chew: mastigar.'
        ]
      },
      vi: {
        prompt: 'Có vẻ anh ấy đã ôm một việc quá sức',
        explanations: [
          'Phương án này hiểu được, nhưng quá sát nghĩa cho ý này.',
          'Đúng. Bite off more than you can chew nghĩa là nhận nhiều hơn khả năng xử lý.',
          'Thành ngữ kết thúc ở chew. Từ it cuối câu là thừa.',
          'Shoe nghĩa là giày. Ở đây cần chew: nhai.'
        ]
      },
      id: {
        prompt: 'Sepertinya dia mengambil tugas yang terlalu besar',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi terlalu literal untuk ide ini.',
          'Benar. Bite off more than you can chew berarti mengambil lebih banyak daripada yang bisa ditangani.',
          'Idiom ini berakhir pada chew. It di akhir tidak perlu.',
          'Shoe berarti sepatu. Di sini perlu chew: mengunyah.'
        ]
      },
      tr: {
        prompt: 'Görünüşe göre altından kalkamayacağı bir işe girişti',
        explanations: [
          'Bu seçenek anlaşılır, ama bu fikir için fazla kelime kelime kalır.',
          'Doğru. Bite off more than you can chew altından kalkabileceğinden fazlasını üstlenmek demektir.',
          'Deyim chew ile biter. Sondaki it fazladır.',
          'Shoe ayakkabı demektir. Burada chew gerekir: çiğnemek.'
        ]
      },
      pl: {
        prompt: 'Wygląda na to, że wziął na siebie zbyt trudne zadanie',
        explanations: [
          'Ta opcja jest zrozumiała, ale zbyt dosłowna dla tej myśli.',
          'Dobrze. Bite off more than you can chew znaczy wziąć na siebie więcej, niż można udźwignąć.',
          'Idiom kończy się na chew. Końcowe it jest zbędne.',
          'Shoe znaczy but. Tutaj potrzebujesz chew: żuć.'
        ]
      }
    },
    '63': {
      'pt-BR': {
        prompt: 'Nunca antes eu tinha visto um espetáculo tão impressionante',
        explanations: [
          'Quando Never before vem no início, usamos inversão: had I seen.',
          'Correto. Never before had I seen... usa inversão e past perfect.',
          'Site significa local ou site da internet. Aqui precisamos de sight: vista ou espetáculo.',
          'Did I seen mistura o auxiliar errado com a forma errada. Aqui precisamos de had I seen.'
        ]
      },
      vi: {
        prompt: 'Chưa bao giờ trước đây tôi thấy một cảnh tượng ngoạn mục như vậy',
        explanations: [
          'Khi Never before đứng đầu câu, dùng đảo ngữ: had I seen.',
          'Đúng. Never before had I seen... dùng đảo ngữ và past perfect.',
          'Site nghĩa là địa điểm hoặc website. Ở đây cần sight: cảnh tượng.',
          'Did I seen trộn trợ động từ sai với dạng sai. Ở đây cần had I seen.'
        ]
      },
      id: {
        prompt: 'Belum pernah sebelumnya saya melihat pemandangan sehebat itu',
        explanations: [
          'Saat Never before ada di awal, gunakan inversion: had I seen.',
          'Benar. Never before had I seen... memakai inversion dan past perfect.',
          'Site berarti lokasi atau situs web. Di sini perlu sight: pemandangan.',
          'Did I seen mencampur auxiliary yang salah dengan bentuk yang salah. Di sini perlu had I seen.'
        ]
      },
      tr: {
        prompt: 'Daha önce hiç bu kadar nefes kesici bir manzara görmemiştim',
        explanations: [
          'Never before cümle başına gelirse inversion kullanılır: had I seen.',
          'Doğru. Never before had I seen... inversion ve past perfect kullanır.',
          'Site yer veya internet sitesi demektir. Burada sight gerekir: manzara.',
          'Did I seen yanlış yardımcıyı yanlış biçimle karıştırır. Burada had I seen gerekir.'
        ]
      },
      pl: {
        prompt: 'Nigdy wcześniej nie widziałem tak zapierającego dech widoku',
        explanations: [
          'Gdy Never before stoi na początku, używamy inwersji: had I seen.',
          'Dobrze. Never before had I seen... używa inwersji i past perfect.',
          'Site znaczy miejsce albo strona internetowa. Tutaj potrzebujesz sight: widok.',
          'Did I seen miesza zły operator ze złą formą. Tutaj potrzebujesz had I seen.'
        ]
      }
    },
    '64': {
      'pt-BR': {
        prompt: 'Eu preferiria que você não revelasse esta informação confidencial',
        explanations: [
          'Correto. Com would rather + outra pessoa usamos uma forma de passado: you didn\'t disclose.',
          'Don\'t é presente. Aqui precisamos de didn\'t para a solicitação soar correta.',
          'Esta opção significa que eu não quero revelar a informação. Mas a frase pede que você não a revele.',
          'Inflammation significa inflamação. Aqui precisamos de information.'
        ]
      },
      vi: {
        prompt: 'Tôi muốn bạn đừng tiết lộ thông tin mật này',
        explanations: [
          'Đúng. Với would rather + người khác, ta dùng dạng quá khứ: you didn\'t disclose.',
          'Don\'t là hiện tại. Ở đây cần didn\'t để lời yêu cầu đúng hơn.',
          'Phương án này nghĩa là tôi không muốn tiết lộ thông tin. Nhưng câu đang yêu cầu bạn đừng tiết lộ.',
          'Inflammation nghĩa là sự viêm. Ở đây cần information.'
        ]
      },
      id: {
        prompt: 'Saya lebih suka kamu tidak mengungkapkan informasi rahasia ini',
        explanations: [
          'Benar. Dengan would rather + orang lain, gunakan bentuk past: you didn\'t disclose.',
          'Don\'t adalah present. Di sini perlu didn\'t agar permintaannya benar.',
          'Pilihan ini berarti saya sendiri tidak ingin mengungkapkan informasi. Padahal kalimat meminta kamu tidak mengungkapkannya.',
          'Inflammation berarti peradangan. Di sini perlu information.'
        ]
      },
      tr: {
        prompt: 'Bu gizli bilgiyi açıklamamanı tercih ederim',
        explanations: [
          'Doğru. Would rather + başka kişi yapısında past biçim kullanılır: you didn\'t disclose.',
          'Don\'t present biçimdir. Burada isteğin doğru duyulması için didn\'t gerekir.',
          'Bu seçenek benim bilgiyi açıklamak istemediğim anlamına gelir. Ama cümle senin açıklamamanı istiyor.',
          'Inflammation iltihap demektir. Burada information gerekir.'
        ]
      },
      pl: {
        prompt: 'Wolałbym, żebyś nie ujawniał tych poufnych informacji',
        explanations: [
          'Dobrze. Z would rather + inna osoba używamy formy przeszłej: you didn\'t disclose.',
          'Don\'t to teraźniejszość. Tutaj potrzebne jest didn\'t, żeby prośba brzmiała poprawnie.',
          'Ta opcja znaczy, że ja nie chcę ujawniać informacji. A zdanie prosi, żebyś ty jej nie ujawniał.',
          'Inflammation znaczy zapalenie. Tutaj potrzebujesz information.'
        ]
      }
    },
    '65': {
      'pt-BR': {
        prompt: 'As ações dele contradizem suas palavras',
        explanations: [
          'A expressão fixa usa at, não on.',
          'Correto. Be at odds with significa estar em contradição ou desacordo com algo.',
          'Dá para entender a ideia, mas é uma tradução literal e não soa natural.',
          'Adds significa acrescenta. Aqui precisamos de odds.'
        ]
      },
      vi: {
        prompt: 'Hành động của anh ấy mâu thuẫn với lời nói của anh ấy',
        explanations: [
          'Cụm cố định dùng at, không phải on.',
          'Đúng. Be at odds with nghĩa là mâu thuẫn hoặc bất đồng với điều gì đó.',
          'Có thể hiểu ý, nhưng đây là dịch sát và không tự nhiên.',
          'Adds nghĩa là thêm vào. Ở đây cần odds.'
        ]
      },
      id: {
        prompt: 'Tindakannya bertentangan dengan kata-katanya',
        explanations: [
          'Ungkapan tetapnya memakai at, bukan on.',
          'Benar. Be at odds with berarti bertentangan atau tidak sejalan dengan sesuatu.',
          'Idenya bisa dimengerti, tetapi ini terjemahan literal dan tidak alami.',
          'Adds berarti menambahkan. Di sini perlu odds.'
        ]
      },
      tr: {
        prompt: 'Eylemleri sözleriyle çelişiyor',
        explanations: [
          'Sabit ifade at kullanır, on değil.',
          'Doğru. Be at odds with bir şeyle çelişmek veya uyuşmamak demektir.',
          'Fikir anlaşılır, ama kelime kelime çeviridir ve doğal duyulmaz.',
          'Adds ekler demektir. Burada odds gerekir.'
        ]
      },
      pl: {
        prompt: 'Jego czyny są sprzeczne z jego słowami',
        explanations: [
          'Stałe wyrażenie używa at, nie on.',
          'Dobrze. Be at odds with znaczy być w sprzeczności albo niezgodzie z czymś.',
          'Sens da się zrozumieć, ale to dosłowne tłumaczenie i nie brzmi naturalnie.',
          'Adds znaczy dodaje. Tutaj potrzebujesz odds.'
        ]
      }
    },
    '66': {
      'pt-BR': {
        prompt: 'Se ele fosse mais diplomático, não teria magoado os sentimentos dela no jantar de ontem',
        explanations: [
          'Correto. Were he more tactful... é uma inversão formal de If he were, com resultado passado.',
          'O jantar foi ontem, então o resultado precisa de wouldn\'t have offended.',
          'Depois de wouldn\'t precisamos de have + particípio: wouldn\'t have offended.',
          'Appended significa adicionou ou anexou. Aqui precisamos de offended: ofendeu.'
        ]
      },
      vi: {
        prompt: 'Nếu anh ấy tế nhị hơn, anh ấy đã không làm tổn thương cảm xúc của cô ấy trong bữa tối hôm qua',
        explanations: [
          'Đúng. Were he more tactful... là đảo ngữ trang trọng của If he were, với kết quả quá khứ.',
          'Bữa tối là hôm qua, nên kết quả cần wouldn\'t have offended.',
          'Sau wouldn\'t cần have + quá khứ phân từ: wouldn\'t have offended.',
          'Appended nghĩa là thêm vào hoặc đính kèm. Ở đây cần offended: làm tổn thương.'
        ]
      },
      id: {
        prompt: 'Jika dia lebih bijaksana, dia tidak akan menyakiti perasaannya saat makan malam kemarin',
        explanations: [
          'Benar. Were he more tactful... adalah inversion formal dari If he were, dengan hasil masa lalu.',
          'Makan malamnya kemarin, jadi hasilnya perlu wouldn\'t have offended.',
          'Setelah wouldn\'t perlu have + past participle: wouldn\'t have offended.',
          'Appended berarti menambahkan atau melampirkan. Di sini perlu offended: menyinggung.'
        ]
      },
      tr: {
        prompt: 'Daha nazik olsaydı, dünkü yemekte onun duygularını incitmezdi',
        explanations: [
          'Doğru. Were he more tactful... If he were yapısının resmi inversion biçimidir ve geçmiş sonuçla kullanılır.',
          'Yemek dün olduğu için sonuç wouldn\'t have offended gerektirir.',
          'Wouldn\'t sonrasında have + participle gerekir: wouldn\'t have offended.',
          'Appended ekledi veya iliştirdi demektir. Burada offended gerekir: incitti.'
        ]
      },
      pl: {
        prompt: 'Gdyby był bardziej taktowny, nie zraniłby jej uczuć podczas wczorajszej kolacji',
        explanations: [
          'Dobrze. Were he more tactful... to formalna inwersja od If he were, z wynikiem w przeszłości.',
          'Kolacja była wczoraj, więc wynik potrzebuje wouldn\'t have offended.',
          'Po wouldn\'t potrzebujemy have + participle: wouldn\'t have offended.',
          'Appended znaczy dodał albo załączył. Tutaj potrzebujesz offended: uraził.'
        ]
      }
    },
    '67': {
      'pt-BR': {
        prompt: 'Precisamos resolver todos os detalhes antes de assinar o acordo',
        explanations: [
          'Correto. Iron out details significa resolver ou ajustar detalhes.',
          'Iron off não é o phrasal verb correto para esta ideia.',
          'Smooth over costuma significar amenizar ou encobrir um conflito; aqui queremos trabalhar os detalhes.',
          'Retails significa vendas no varejo. Aqui precisamos de details.'
        ]
      },
      vi: {
        prompt: 'Chúng ta cần xử lý tất cả chi tiết trước khi ký thỏa thuận',
        explanations: [
          'Đúng. Iron out details nghĩa là xử lý hoặc chỉnh lại các chi tiết.',
          'Iron off không phải phrasal verb đúng cho ý này.',
          'Smooth over thường là làm dịu hoặc che đi một xung đột; ở đây ta cần xử lý chi tiết.',
          'Retails nghĩa là bán lẻ. Ở đây cần details.'
        ]
      },
      id: {
        prompt: 'Kita perlu membereskan semua detail sebelum menandatangani perjanjian',
        explanations: [
          'Benar. Iron out details berarti menyelesaikan atau merapikan detail.',
          'Iron off bukan phrasal verb yang benar untuk ide ini.',
          'Smooth over biasanya berarti meredakan atau menutupi konflik; di sini kita ingin mengerjakan detail.',
          'Retails berarti ritel. Di sini perlu details.'
        ]
      },
      tr: {
        prompt: 'Anlaşmayı imzalamadan önce tüm ayrıntıları netleştirmemiz gerekiyor',
        explanations: [
          'Doğru. Iron out details ayrıntıları çözmek veya netleştirmek demektir.',
          'Iron off bu fikir için doğru phrasal verb değildir.',
          'Smooth over genelde bir çatışmayı yatıştırmak veya üstünü örtmek demektir; burada ayrıntıları çalışmak istiyoruz.',
          'Retails perakende satışlar demektir. Burada details gerekir.'
        ]
      },
      pl: {
        prompt: 'Musimy dopracować wszystkie szczegóły przed podpisaniem umowy',
        explanations: [
          'Dobrze. Iron out details znaczy rozwiązać albo dopracować szczegóły.',
          'Iron off nie jest poprawnym phrasal verb dla tej myśli.',
          'Smooth over zwykle znaczy załagodzić albo zatuszować konflikt; tutaj chodzi o dopracowanie szczegółów.',
          'Retails znaczy sprzedaż detaliczna. Tutaj potrzebujesz details.'
        ]
      }
    },
    '68': {
      'pt-BR': {
        prompt: 'Mal a peça começou, alguém espirrou alto',
        explanations: [
          'Correto. Scarcely had the play started when... usa inversão e when.',
          'Quando Scarcely vem no início, precisamos de inversão: had the play started.',
          'Scarcely combina com when, não com than.',
          'Plea significa súplica ou declaração legal. Aqui precisamos de play: peça.'
        ]
      },
      vi: {
        prompt: 'Vở kịch vừa bắt đầu thì ai đó hắt hơi rất to',
        explanations: [
          'Đúng. Scarcely had the play started when... dùng đảo ngữ và when.',
          'Khi Scarcely đứng đầu câu, cần đảo ngữ: had the play started.',
          'Scarcely đi với when, không phải than.',
          'Plea nghĩa là lời cầu xin hoặc lời khai pháp lý. Ở đây cần play: vở kịch.'
        ]
      },
      id: {
        prompt: 'Begitu pertunjukan dimulai, seseorang bersin keras',
        explanations: [
          'Benar. Scarcely had the play started when... memakai inversion dan when.',
          'Saat Scarcely ada di awal, perlu inversion: had the play started.',
          'Scarcely berpasangan dengan when, bukan than.',
          'Plea berarti permohonan atau pernyataan hukum. Di sini perlu play: pertunjukan.'
        ]
      },
      tr: {
        prompt: 'Oyun başlar başlamaz biri yüksek sesle hapşırdı',
        explanations: [
          'Doğru. Scarcely had the play started when... inversion ve when kullanır.',
          'Scarcely cümle başına gelirse inversion gerekir: had the play started.',
          'Scarcely when ile kullanılır, than ile değil.',
          'Plea yakarış veya hukuki beyan demektir. Burada play gerekir: oyun.'
        ]
      },
      pl: {
        prompt: 'Ledwie sztuka się zaczęła, ktoś głośno kichnął',
        explanations: [
          'Dobrze. Scarcely had the play started when... używa inwersji i when.',
          'Gdy Scarcely stoi na początku, potrzebna jest inwersja: had the play started.',
          'Scarcely łączy się z when, nie z than.',
          'Plea znaczy prośba albo oświadczenie prawne. Tutaj potrzebujesz play: sztuka.'
        ]
      }
    },
    '69': {
      'pt-BR': {
        prompt: 'Consegui fazer com que ele refizesse o relatório',
        explanations: [
          'Com make someone do não usamos to: made him redo. Mas aqui a opção natural buscada usa get.',
          'Correto. Get him to redo significa conseguir que ele refaça o relatório.',
          'Depois de get him precisamos de to antes do verbo: get him to redo.',
          'Radio não significa refazer. Aqui precisamos de redo.'
        ]
      },
      vi: {
        prompt: 'Tôi đã khiến anh ấy làm lại báo cáo',
        explanations: [
          'Với make someone do, không dùng to: made him redo. Nhưng ở đây đáp án tự nhiên cần get.',
          'Đúng. Get him to redo nghĩa là khiến hoặc thuyết phục anh ấy làm lại báo cáo.',
          'Sau get him cần to trước động từ: get him to redo.',
          'Radio không có nghĩa là làm lại. Ở đây cần redo.'
        ]
      },
      id: {
        prompt: 'Saya berhasil membuatnya mengerjakan ulang laporan itu',
        explanations: [
          'Dengan make someone do, jangan gunakan to: made him redo. Namun jawaban alami di sini memakai get.',
          'Benar. Get him to redo berarti membuatnya mengerjakan ulang laporan itu.',
          'Setelah get him perlu to sebelum verb: get him to redo.',
          'Radio bukan berarti mengerjakan ulang. Di sini perlu redo.'
        ]
      },
      tr: {
        prompt: 'Raporu yeniden yapmasını sağladım',
        explanations: [
          'Make someone do yapısında to kullanılmaz: made him redo. Ama burada aranan doğal seçenek get kullanır.',
          'Doğru. Get him to redo raporu yeniden yapmasını sağlamak demektir.',
          'Get him sonrasında fiilden önce to gerekir: get him to redo.',
          'Radio yeniden yapmak demek değildir. Burada redo gerekir.'
        ]
      },
      pl: {
        prompt: 'Skłoniłem go do przerobienia raportu',
        explanations: [
          'Z make someone do nie używamy to: made him redo. Ale tutaj naturalna szukana opcja używa get.',
          'Dobrze. Get him to redo znaczy skłonić go, żeby przerobił raport.',
          'Po get him potrzebne jest to przed czasownikiem: get him to redo.',
          'Radio nie znaczy przerobić. Tutaj potrzebujesz redo.'
        ]
      }
    },
    '70': {
      'pt-BR': {
        prompt: 'Você não pode fazer serviço malfeito quando constrói uma casa',
        explanations: [
          'Do corners é uma tradução literal e não é o idiom correto.',
          'Correto. Cut corners significa economizar esforço, tempo ou dinheiro prejudicando a qualidade.',
          'Hose significa mangueira. Aqui precisamos de house: casa.',
          'A expressão fixa é cut corners, sem the.'
        ]
      },
      vi: {
        prompt: 'Bạn không thể làm ẩu khi xây nhà',
        explanations: [
          'Do corners là dịch sát nghĩa và không phải thành ngữ đúng.',
          'Đúng. Cut corners nghĩa là tiết kiệm công sức, thời gian hoặc tiền bạc bằng cách làm giảm chất lượng.',
          'Hose nghĩa là vòi nước. Ở đây cần house: ngôi nhà.',
          'Cụm cố định là cut corners, không có the.'
        ]
      },
      id: {
        prompt: 'Kamu tidak boleh bekerja asal-asalan saat membangun rumah',
        explanations: [
          'Do corners adalah terjemahan literal dan bukan idiom yang benar.',
          'Benar. Cut corners berarti menghemat usaha, waktu, atau uang dengan mengorbankan kualitas.',
          'Hose berarti selang. Di sini perlu house: rumah.',
          'Ungkapan tetapnya cut corners, tanpa the.'
        ]
      },
      tr: {
        prompt: 'Ev inşa ederken işi kestirmeden yapamazsın',
        explanations: [
          'Do corners kelime kelime çeviridir ve doğru deyim değildir.',
          'Doğru. Cut corners kaliteyi düşürerek emek, zaman veya para kısmak demektir.',
          'Hose hortum demektir. Burada house gerekir: ev.',
          'Sabit ifade cut corners olur, the olmadan.'
        ]
      },
      pl: {
        prompt: 'Nie wolno iść na skróty, kiedy budujesz dom',
        explanations: [
          'Do corners to dosłowne tłumaczenie i nie jest poprawnym idiomem.',
          'Dobrze. Cut corners znaczy oszczędzać wysiłek, czas albo pieniądze kosztem jakości.',
          'Hose znaczy wąż ogrodowy. Tutaj potrzebujesz house: dom.',
          'Stałe wyrażenie to cut corners, bez the.'
        ]
      }
    },
    '71': {
      'pt-BR': {
        prompt: 'Preciso mandar verificar meu carro antes da viagem',
        explanations: [
          'Correto. Have my car checked significa fazer com que verifiquem meu carro.',
          'I need that my car checked não é uma estrutura natural depois de need.',
          'Em have something done precisamos de particípio: checked, não check.',
          'Cheeked se relaciona com cheek, bochecha. Aqui precisamos de checked.'
        ]
      },
      vi: {
        prompt: 'Tôi cần nhờ người kiểm tra xe trước chuyến đi',
        explanations: [
          'Đúng. Have my car checked nghĩa là nhờ người khác kiểm tra xe của mình.',
          'I need that my car checked không phải cấu trúc tự nhiên sau need.',
          'Trong have something done cần quá khứ phân từ: checked, không phải check.',
          'Cheeked liên quan đến cheek, má. Ở đây cần checked.'
        ]
      },
      id: {
        prompt: 'Saya perlu meminta mobil saya diperiksa sebelum perjalanan',
        explanations: [
          'Benar. Have my car checked berarti membuat mobil saya diperiksa oleh orang lain.',
          'I need that my car checked bukan struktur alami setelah need.',
          'Dalam have something done perlu past participle: checked, bukan check.',
          'Cheeked terkait dengan cheek, pipi. Di sini perlu checked.'
        ]
      },
      tr: {
        prompt: 'Yolculuktan önce arabamı kontrol ettirmem gerekiyor',
        explanations: [
          'Doğru. Have my car checked arabamı kontrol ettirmek demektir.',
          'I need that my car checked need sonrasında doğal bir yapı değildir.',
          'Have something done yapısında participle gerekir: checked, check değil.',
          'Cheeked cheek yani yanak kelimesiyle ilgilidir. Burada checked gerekir.'
        ]
      },
      pl: {
        prompt: 'Muszę mieć sprawdzony samochód przed podróżą',
        explanations: [
          'Dobrze. Have my car checked znaczy zlecić sprawdzenie samochodu.',
          'I need that my car checked nie jest naturalną strukturą po need.',
          'W have something done potrzebny jest participle: checked, nie check.',
          'Cheeked wiąże się z cheek, policzek. Tutaj potrzebujesz checked.'
        ]
      }
    },
    '72': {
      'pt-BR': {
        prompt: 'Ela precisa examinar cuidadosamente todos os documentos antes de assinar o contrato',
        explanations: [
          'Esta opção dá para entender, mas very good não funciona como advérbio aqui e a frase é mais simples.',
          'Correto. Scrutinize significa examinar algo com muito cuidado.',
          'Depois de needs precisamos de to antes do verbo: needs to scrutinize.',
          'Monuments significa monumentos. Aqui precisamos de documents.'
        ]
      },
      vi: {
        prompt: 'Cô ấy cần xem xét kỹ tất cả tài liệu trước khi ký hợp đồng',
        explanations: [
          'Phương án này hiểu được, nhưng very good không dùng làm trạng từ ở đây và câu đơn giản hơn.',
          'Đúng. Scrutinize nghĩa là xem xét điều gì đó rất kỹ.',
          'Sau needs cần to trước động từ: needs to scrutinize.',
          'Monuments nghĩa là tượng đài. Ở đây cần documents.'
        ]
      },
      id: {
        prompt: 'Dia perlu menelaah semua dokumen dengan teliti sebelum menandatangani kontrak',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi very good tidak berfungsi sebagai adverb di sini dan kalimatnya lebih sederhana.',
          'Benar. Scrutinize berarti memeriksa sesuatu dengan sangat teliti.',
          'Setelah needs perlu to sebelum verb: needs to scrutinize.',
          'Monuments berarti monumen. Di sini perlu documents.'
        ]
      },
      tr: {
        prompt: 'Sözleşmeyi imzalamadan önce tüm belgeleri dikkatle incelemesi gerekiyor',
        explanations: [
          'Bu seçenek anlaşılır, ama very good burada adverb olarak işlemez ve cümle daha basittir.',
          'Doğru. Scrutinize bir şeyi çok dikkatli incelemek demektir.',
          'Needs sonrasında fiilden önce to gerekir: needs to scrutinize.',
          'Monuments anıtlar demektir. Burada documents gerekir.'
        ]
      },
      pl: {
        prompt: 'Musi dokładnie przeanalizować wszystkie dokumenty przed podpisaniem umowy',
        explanations: [
          'Ta opcja jest zrozumiała, ale very good nie działa tutaj jako przysłówek i zdanie jest prostsze.',
          'Dobrze. Scrutinize znaczy bardzo dokładnie coś przeanalizować.',
          'Po needs potrzebne jest to przed czasownikiem: needs to scrutinize.',
          'Monuments znaczy pomniki. Tutaj potrzebujesz documents.'
        ]
      }
    },
    '73': {
      'pt-BR': {
        prompt: 'Já está mais do que na hora de você começar a se preparar para os exames',
        explanations: [
          'Depois de It is high time normalmente usamos uma forma de passado: started.',
          'For you to start é possível em outros contextos, mas aqui buscamos o padrão high time + sujeito + passado.',
          'Correto. It is high time you started... expressa que já era hora de começar.',
          'Stared significa olhou fixamente. Aqui precisamos de started.'
        ]
      },
      vi: {
        prompt: 'Đã đến lúc bạn bắt đầu chuẩn bị cho các kỳ thi rồi',
        explanations: [
          'Sau It is high time thường dùng dạng quá khứ: started.',
          'For you to start có thể dùng trong ngữ cảnh khác, nhưng ở đây mục tiêu là high time + chủ ngữ + quá khứ.',
          'Đúng. It is high time you started... diễn tả đã đến lúc phải bắt đầu.',
          'Stared nghĩa là nhìn chằm chằm. Ở đây cần started.'
        ]
      },
      id: {
        prompt: 'Sudah saatnya kamu mulai mempersiapkan diri untuk ujian',
        explanations: [
          'Setelah It is high time biasanya gunakan bentuk past: started.',
          'For you to start bisa dipakai dalam konteks lain, tetapi di sini targetnya high time + subject + past.',
          'Benar. It is high time you started... menyatakan sudah waktunya mulai.',
          'Stared berarti menatap. Di sini perlu started.'
        ]
      },
      tr: {
        prompt: 'Sınavlara hazırlanmaya başlamanın artık zamanı geldi',
        explanations: [
          'It is high time sonrasında genellikle past biçim kullanılır: started.',
          'For you to start başka bağlamlarda olabilir, ama burada hedef high time + özne + past kalıbıdır.',
          'Doğru. It is high time you started... artık başlamanın zamanı geldiğini anlatır.',
          'Stared dik dik baktı demektir. Burada started gerekir.'
        ]
      },
      pl: {
        prompt: 'Najwyższy czas, żebyś zaczął przygotowywać się do egzaminów',
        explanations: [
          'Po It is high time zwykle używamy formy przeszłej: started.',
          'For you to start jest możliwe w innych kontekstach, ale tutaj szukamy wzorca high time + podmiot + przeszłość.',
          'Dobrze. It is high time you started... mówi, że już najwyższy czas zacząć.',
          'Stared znaczy wpatrywał się. Tutaj potrzebujesz started.'
        ]
      }
    },
    '74': {
      'pt-BR': {
        prompt: 'Em hipótese alguma você deve violar estes regulamentos',
        explanations: [
          'Quando On no account vem no início, precisamos de inversão: should you, não you should.',
          'Esta opção dá para entender, mas não tem a estrutura enfática e formal que buscamos.',
          'Correto. On no account should you breach... significa em hipótese alguma você deve violar...',
          'Brooch significa broche. Aqui precisamos de breach: violar.'
        ]
      },
      vi: {
        prompt: 'Tuyệt đối không được vi phạm các quy định này',
        explanations: [
          'Khi On no account đứng đầu câu, cần đảo ngữ: should you, không phải you should.',
          'Phương án này hiểu được, nhưng không có cấu trúc nhấn mạnh và trang trọng đang cần.',
          'Đúng. On no account should you breach... nghĩa là tuyệt đối không được vi phạm...',
          'Brooch nghĩa là ghim cài áo. Ở đây cần breach: vi phạm.'
        ]
      },
      id: {
        prompt: 'Dalam keadaan apa pun kamu tidak boleh melanggar peraturan ini',
        explanations: [
          'Saat On no account ada di awal, perlu inversion: should you, bukan you should.',
          'Pilihan ini bisa dimengerti, tetapi tidak memiliki struktur penekanan formal yang dicari.',
          'Benar. On no account should you breach... berarti dalam keadaan apa pun kamu tidak boleh melanggar...',
          'Brooch berarti bros. Di sini perlu breach: melanggar.'
        ]
      },
      tr: {
        prompt: 'Bu kuralları hiçbir şekilde ihlal etmemelisin',
        explanations: [
          'On no account cümle başına gelirse inversion gerekir: should you, you should değil.',
          'Bu seçenek anlaşılır, ama aradığımız vurgulu ve resmi yapıya sahip değildir.',
          'Doğru. On no account should you breach... hiçbir şekilde ihlal etmemelisin demektir.',
          'Brooch broş demektir. Burada breach gerekir: ihlal etmek.'
        ]
      },
      pl: {
        prompt: 'Pod żadnym pozorem nie wolno naruszać tych przepisów',
        explanations: [
          'Gdy On no account stoi na początku, potrzebna jest inwersja: should you, nie you should.',
          'Ta opcja jest zrozumiała, ale nie ma emfatycznej i formalnej struktury, której szukamy.',
          'Dobrze. On no account should you breach... znaczy pod żadnym pozorem nie powinieneś naruszać...',
          'Brooch znaczy broszka. Tutaj potrzebujesz breach: naruszyć.'
        ]
      }
    },
    '75': {
      'pt-BR': {
        prompt: 'Ele incitou o amigo a se envolver em uma briga',
        explanations: [
          'Correto. Egg someone on significa incitar ou incentivar alguém, muitas vezes a fazer algo imprudente.',
          'Esta opção dá para entender, mas não é a expressão idiomática natural.',
          'Com objeto curto, o natural é egged his friend on, não egged on his friend.',
          'Ached significa doeu. Aqui precisamos de egged.'
        ]
      },
      vi: {
        prompt: 'Anh ấy xúi bạn mình lao vào một cuộc đánh nhau',
        explanations: [
          'Đúng. Egg someone on nghĩa là xúi hoặc kích động ai đó, thường làm việc thiếu thận trọng.',
          'Phương án này hiểu được, nhưng không phải cách nói thành ngữ tự nhiên.',
          'Với tân ngữ ngắn, tự nhiên hơn là egged his friend on, không phải egged on his friend.',
          'Ached nghĩa là đau nhức. Ở đây cần egged.'
        ]
      },
      id: {
        prompt: 'Dia mengompori temannya agar terlibat dalam perkelahian',
        explanations: [
          'Benar. Egg someone on berarti mendorong atau memanas-manasi seseorang, sering untuk tindakan gegabah.',
          'Pilihan ini bisa dimengerti, tetapi bukan ungkapan idiomatis alami.',
          'Dengan object pendek, bentuk alami adalah egged his friend on, bukan egged on his friend.',
          'Ached berarti sakit atau nyeri. Di sini perlu egged.'
        ]
      },
      tr: {
        prompt: 'Arkadaşını kavgaya karışması için kışkırttı',
        explanations: [
          'Doğru. Egg someone on birini, çoğu zaman düşüncesizce, bir şeyi yapmaya kışkırtmak demektir.',
          'Bu seçenek anlaşılır, ama doğal deyimsel ifade değildir.',
          'Kısa object ile doğal olan egged his friend on, egged on his friend değil.',
          'Ached ağrıdı demektir. Burada egged gerekir.'
        ]
      },
      pl: {
        prompt: 'Podpuszczał przyjaciela, żeby wdał się w bójkę',
        explanations: [
          'Dobrze. Egg someone on znaczy podpuszczać albo zachęcać kogoś, często do nierozsądnego działania.',
          'Ta opcja jest zrozumiała, ale nie jest naturalnym idiomem.',
          'Przy krótkim dopełnieniu naturalne jest egged his friend on, nie egged on his friend.',
          'Ached znaczy bolał. Tutaj potrzebujesz egged.'
        ]
      }
    },
    '76': {
      'pt-BR': {
        prompt: 'Se ela não tivesse gastado todo o dinheiro ontem, agora não estaria em uma situação tão desesperadora',
        explanations: [
          'Didn\'t spend não marca bem uma condição passada não realizada. Precisamos de had not spent.',
          'Correto. É mixed conditional: condição passada, resultado presente.',
          'Would not have been leva o resultado ao passado, mas now pede would not be.',
          'Skate significa patim. Aqui precisamos de state: situação ou estado.'
        ]
      },
      vi: {
        prompt: 'Nếu hôm qua cô ấy không tiêu hết tiền, bây giờ cô ấy đã không ở trong tình trạng tuyệt vọng như vậy',
        explanations: [
          'Didn\'t spend không đánh dấu rõ điều kiện quá khứ không xảy ra. Cần had not spent.',
          'Đúng. Đây là mixed conditional: điều kiện quá khứ, kết quả hiện tại.',
          'Would not have been đưa kết quả về quá khứ, nhưng now yêu cầu would not be.',
          'Skate nghĩa là giày trượt. Ở đây cần state: tình trạng.'
        ]
      },
      id: {
        prompt: 'Jika dia tidak menghabiskan semua uang kemarin, sekarang dia tidak akan berada dalam keadaan separah itu',
        explanations: [
          'Didn\'t spend tidak cukup menandai kondisi masa lalu yang tidak terjadi. Perlu had not spent.',
          'Benar. Ini mixed conditional: kondisi masa lalu, hasil masa kini.',
          'Would not have been membawa hasil ke masa lalu, tetapi now meminta would not be.',
          'Skate berarti sepatu luncur. Di sini perlu state: keadaan.'
        ]
      },
      tr: {
        prompt: 'Dün bütün parayı harcamamış olsaydı, şimdi bu kadar çaresiz durumda olmazdı',
        explanations: [
          'Didn\'t spend gerçekleşmemiş geçmiş koşulu iyi göstermez. Had not spent gerekir.',
          'Doğru. Bu mixed conditional: geçmiş koşul, şimdiki sonuç.',
          'Would not have been sonucu geçmişe taşır, ama now would not be ister.',
          'Skate paten demektir. Burada state gerekir: durum.'
        ]
      },
      pl: {
        prompt: 'Gdyby wczoraj nie wydała wszystkich pieniędzy, teraz nie byłaby w tak rozpaczliwej sytuacji',
        explanations: [
          'Didn\'t spend nie zaznacza dobrze niespełnionego warunku w przeszłości. Potrzebne jest had not spent.',
          'Dobrze. To mixed conditional: warunek przeszły, wynik teraźniejszy.',
          'Would not have been przenosi wynik do przeszłości, ale now wymaga would not be.',
          'Skate znaczy łyżwa albo deskorolka. Tutaj potrzebujesz state: stan.'
        ]
      }
    },
    '77': {
      'pt-BR': {
        prompt: 'Diz-se que ele se apropriou de uma grande quantia de dinheiro',
        explanations: [
          'Esta opção está correta em sentido, mas o exercício busca a forma passiva mais avançada com He is reported to have...',
          'Correto. He is reported to have appropriated... mostra que a ação aconteceu antes do relato.',
          'To appropriate não marca bem que a ação já aconteceu. Precisamos de to have appropriated.',
          'Sun significa sol. Aqui precisamos de sum: quantia.'
        ]
      },
      vi: {
        prompt: 'Có tin rằng anh ấy đã chiếm dụng một khoản tiền lớn',
        explanations: [
          'Phương án này đúng về nghĩa, nhưng bài tập cần dạng bị động nâng cao hơn với He is reported to have...',
          'Đúng. He is reported to have appropriated... cho thấy hành động đã xảy ra trước bản tin.',
          'To appropriate không thể hiện rõ hành động đã xảy ra. Cần to have appropriated.',
          'Sun nghĩa là mặt trời. Ở đây cần sum: khoản tiền.'
        ]
      },
      id: {
        prompt: 'Dia dilaporkan telah menggelapkan sejumlah besar uang',
        explanations: [
          'Pilihan ini benar secara makna, tetapi latihan menargetkan bentuk passive lebih lanjut dengan He is reported to have...',
          'Benar. He is reported to have appropriated... menunjukkan tindakan sudah terjadi sebelum laporan.',
          'To appropriate tidak cukup menandai bahwa tindakan sudah terjadi. Perlu to have appropriated.',
          'Sun berarti matahari. Di sini perlu sum: jumlah uang.'
        ]
      },
      tr: {
        prompt: 'Büyük miktarda parayı zimmetine geçirdiği bildiriliyor',
        explanations: [
          'Bu seçenek anlam olarak doğru, ama alıştırma He is reported to have... ile daha ileri passive yapıyı arıyor.',
          'Doğru. He is reported to have appropriated... eylemin haberden önce gerçekleştiğini gösterir.',
          'To appropriate eylemin zaten gerçekleştiğini iyi göstermez. To have appropriated gerekir.',
          'Sun güneş demektir. Burada sum gerekir: tutar.'
        ]
      },
      pl: {
        prompt: 'Podaje się, że przywłaszczył sobie dużą sumę pieniędzy',
        explanations: [
          'Ta opcja jest poprawna znaczeniowo, ale ćwiczenie szuka bardziej zaawansowanej strony biernej z He is reported to have...',
          'Dobrze. He is reported to have appropriated... pokazuje, że czynność wydarzyła się przed doniesieniem.',
          'To appropriate nie zaznacza dobrze, że czynność już się wydarzyła. Potrzebne jest to have appropriated.',
          'Sun znaczy słońce. Tutaj potrzebujesz sum: suma.'
        ]
      }
    },
    '78': {
      'pt-BR': {
        prompt: 'Ele sempre consegue sair impune',
        explanations: [
          'Esta opção copia a imagem de outro idioma, mas não é o idiom inglês.',
          'Correto. Get away with murder significa que alguém sai impune de tudo.',
          'A expressão fixa usa with, não from.',
          'Mutter significa murmúrio. Aqui precisamos de murder.'
        ]
      },
      vi: {
        prompt: 'Anh ấy luôn thoát tội',
        explanations: [
          'Phương án này mượn hình ảnh từ ngôn ngữ khác, nhưng không phải thành ngữ tiếng Anh.',
          'Đúng. Get away with murder nghĩa là ai đó luôn thoát tội hoặc không bị phạt.',
          'Cụm cố định dùng with, không phải from.',
          'Mutter nghĩa là lẩm bẩm. Ở đây cần murder.'
        ]
      },
      id: {
        prompt: 'Dia selalu berhasil lolos begitu saja',
        explanations: [
          'Pilihan ini menyalin gambaran dari bahasa lain, tetapi bukan idiom bahasa Inggris.',
          'Benar. Get away with murder berarti seseorang lolos dari akibat atau hukuman.',
          'Ungkapan tetapnya memakai with, bukan from.',
          'Mutter berarti bergumam. Di sini perlu murder.'
        ]
      },
      tr: {
        prompt: 'Her zaman yaptığının yanına kar kalıyor',
        explanations: [
          'Bu seçenek başka bir dildeki imgeyi kopyalar, ama İngilizce deyim değildir.',
          'Doğru. Get away with murder birinin her şeyden cezasız kurtulması demektir.',
          'Sabit ifade with kullanır, from değil.',
          'Mutter mırıldanma demektir. Burada murder gerekir.'
        ]
      },
      pl: {
        prompt: 'Zawsze wszystko uchodzi mu płazem',
        explanations: [
          'Ta opcja kopiuje obraz z innego języka, ale nie jest angielskim idiomem.',
          'Dobrze. Get away with murder znaczy, że komuś wszystko uchodzi bezkarnie.',
          'Stałe wyrażenie używa with, nie from.',
          'Mutter znaczy mamrotanie. Tutaj potrzebujesz murder.'
        ]
      }
    },
    '79': {
      'pt-BR': {
        prompt: 'Nunca antes eu tinha visto um espetáculo tão majestoso',
        explanations: [
          'Quando Never before vem no início, usamos inversão: had I seen.',
          'Correto. Never before had I seen... usa inversão e past perfect.',
          'Have não encaixa se falamos de um ponto passado fechado. Aqui precisamos de had.',
          'Site significa local ou site da internet. Aqui precisamos de sight: espetáculo ou vista.'
        ]
      },
      vi: {
        prompt: 'Chưa bao giờ trước đây tôi thấy một cảnh tượng hùng vĩ như vậy',
        explanations: [
          'Khi Never before đứng đầu câu, dùng đảo ngữ: had I seen.',
          'Đúng. Never before had I seen... dùng đảo ngữ và past perfect.',
          'Have không hợp nếu nói về một thời điểm quá khứ đã khép lại. Ở đây cần had.',
          'Site nghĩa là địa điểm hoặc website. Ở đây cần sight: cảnh tượng.'
        ]
      },
      id: {
        prompt: 'Belum pernah sebelumnya saya melihat pemandangan semegah itu',
        explanations: [
          'Saat Never before ada di awal, gunakan inversion: had I seen.',
          'Benar. Never before had I seen... memakai inversion dan past perfect.',
          'Have tidak cocok jika kita bicara tentang titik masa lalu yang sudah selesai. Di sini perlu had.',
          'Site berarti lokasi atau situs web. Di sini perlu sight: pemandangan.'
        ]
      },
      tr: {
        prompt: 'Daha önce hiç bu kadar görkemli bir manzara görmemiştim',
        explanations: [
          'Never before cümle başına gelirse inversion kullanılır: had I seen.',
          'Doğru. Never before had I seen... inversion ve past perfect kullanır.',
          'Geçmişte kapanmış bir noktadan söz ediyorsak have uymaz. Burada had gerekir.',
          'Site yer veya internet sitesi demektir. Burada sight gerekir: manzara.'
        ]
      },
      pl: {
        prompt: 'Nigdy wcześniej nie widziałem tak wspaniałego widoku',
        explanations: [
          'Gdy Never before stoi na początku, używamy inwersji: had I seen.',
          'Dobrze. Never before had I seen... używa inwersji i past perfect.',
          'Have nie pasuje, jeśli mówimy o zamkniętym punkcie w przeszłości. Tutaj potrzebujesz had.',
          'Site znaczy miejsce albo strona internetowa. Tutaj potrzebujesz sight: widok.'
        ]
      }
    },
    '80': {
      'pt-BR': {
        prompt: 'Eu preferiria que você não revelasse esta informação',
        explanations: [
          'Esta opção pode aparecer no inglês americano, mas aqui buscamos o padrão com passado: didn\'t disclose. Termo-chave em ingl?s: rather..',
          'Correto. Would rather you didn\'t... é uma forma natural e educada de pedir que alguém não faça algo.',
          'Don\'t é presente. Neste padrão precisamos de didn\'t.',
          'Enclosed significa anexado ou fechado. Aqui precisamos de disclose: revelar.'
        ]
      },
      vi: {
        prompt: 'Tôi muốn bạn đừng tiết lộ thông tin này',
        explanations: [
          'Phương án này có thể xuất hiện trong tiếng Anh Mỹ, nhưng ở đây ta cần mẫu với quá khứ: didn\'t disclose. Thu?t ng? ti?ng Anh c?n gi?: rather..',
          'Đúng. Would rather you didn\'t... là cách tự nhiên và lịch sự để yêu cầu ai đó đừng làm gì.',
          'Don\'t là hiện tại. Trong mẫu này cần didn\'t.',
          'Enclosed nghĩa là được đính kèm hoặc bị đóng kín. Ở đây cần disclose: tiết lộ.'
        ]
      },
      id: {
        prompt: 'Saya lebih suka kamu tidak mengungkapkan informasi ini',
        explanations: [
          'Pilihan ini bisa muncul dalam American English, tetapi di sini targetnya pola dengan past: didn\'t disclose. Istilah Inggris yang perlu dipertahankan: rather..',
          'Benar. Would rather you didn\'t... adalah cara alami dan sopan untuk meminta seseorang tidak melakukan sesuatu.',
          'Don\'t adalah present. Dalam pola ini perlu didn\'t.',
          'Enclosed berarti terlampir atau tertutup. Di sini perlu disclose: mengungkapkan.'
        ]
      },
      tr: {
        prompt: 'Bu bilgiyi açıklamamanı tercih ederim',
        explanations: [
          'Bu seçenek Amerikan İngilizcesinde görülebilir, ama burada past kullanılan kalıp hedefleniyor: didn\'t disclose. Korunmas? gereken ?ngilizce terim: rather..',
          'Doğru. Would rather you didn\'t... birinden bir şeyi yapmamasını istemenin doğal ve nazik yoludur.',
          'Don\'t present biçimdir. Bu kalıpta didn\'t gerekir.',
          'Enclosed ekli veya kapalı demektir. Burada disclose gerekir: açıklamak.'
        ]
      },
      pl: {
        prompt: 'Wolałbym, żebyś nie ujawniał tej informacji',
        explanations: [
          'Ta opcja może występować w amerykańskim angielskim, ale tutaj szukamy wzorca z przeszłością: didn\'t disclose. Angielski termin do zachowania: rather..',
          'Dobrze. Would rather you didn\'t... to naturalny i uprzejmy sposób proszenia, żeby ktoś czegoś nie robił.',
          'Don\'t to teraźniejszość. W tym wzorcu potrzebne jest didn\'t.',
          'Enclosed znaczy załączony albo zamknięty. Tutaj potrzebujesz disclose: ujawnić.'
        ]
      }
    },
    '81': {
      'pt-BR': {
        prompt: 'A empresa está em uma encruzilhada neste momento',
        explanations: [
          'Correto. At a crossroads significa estar em um momento importante de decisão.',
          'On the cross of roads traduz a imagem literalmente, mas o idiom natural é at a crossroads.',
          'A expressão fixa usa crossroads no plural, mesmo para uma única situação.',
          'Crosswords significa palavras cruzadas. Aqui precisamos de crossroads.'
        ]
      },
      vi: {
        prompt: 'Công ty hiện đang đứng trước một ngã rẽ quan trọng',
        explanations: [
          'Đúng. At a crossroads nghĩa là đang ở một thời điểm cần đưa ra quyết định quan trọng.',
          'On the cross of roads dịch hình ảnh quá sát nghĩa; idiom tự nhiên là at a crossroads.',
          'Cụm cố định dùng crossroads ở số nhiều, ngay cả khi chỉ nói về một tình huống.',
          'Crosswords nghĩa là trò ô chữ. Ở đây cần crossroads.'
        ]
      },
      id: {
        prompt: 'Perusahaan sedang berada di persimpangan jalan saat ini',
        explanations: [
          'Benar. At a crossroads berarti berada pada titik keputusan yang penting.',
          'On the cross of roads menerjemahkan gambarnya secara harfiah; idiom yang alami adalah at a crossroads.',
          'Ungkapan tetapnya memakai crossroads dalam bentuk plural, bahkan untuk satu situasi.',
          'Crosswords berarti teka-teki silang. Di sini perlu crossroads.'
        ]
      },
      tr: {
        prompt: 'Şirket şu anda bir yol ayrımında',
        explanations: [
          'Doğru. At a crossroads önemli bir karar anında olmak demektir.',
          'On the cross of roads imgeyi kelimesi kelimesine çevirir; doğal idiom at a crossroads olur.',
          'Sabit ifade tek bir durum için bile crossroads biçimini kullanır.',
          'Crosswords bulmaca demektir. Burada crossroads gerekir.'
        ]
      },
      pl: {
        prompt: 'Firma jest teraz na rozdrożu',
        explanations: [
          'Dobrze. At a crossroads znaczy być w ważnym momencie decyzji.',
          'On the cross of roads tłumaczy obraz dosłownie, ale naturalny idiom to at a crossroads.',
          'Stałe wyrażenie używa crossroads w liczbie mnogiej, nawet dla jednej sytuacji.',
          'Crosswords znaczy krzyżówki. Tutaj potrzebujesz crossroads.'
        ]
      }
    },
    '82': {
      'pt-BR': {
        prompt: 'Se eu tivesse aceitado aquela oferta naquela época, agora seria rico',
        explanations: [
          'Took não marca bem uma condição passada que não aconteceu. Precisamos de had taken.',
          'Correto. É mixed conditional: condição passada, resultado presente.',
          'Would have been leva o resultado ao passado, mas now pede would be.',
          'Reach significa alcançar. Aqui precisamos de rich: rico.'
        ]
      },
      vi: {
        prompt: 'Nếu lúc đó tôi đã nhận lời đề nghị ấy, bây giờ tôi đã giàu',
        explanations: [
          'Took không đánh dấu rõ một điều kiện quá khứ không xảy ra. Cần had taken.',
          'Đúng. Đây là mixed conditional: điều kiện quá khứ, kết quả hiện tại.',
          'Would have been đưa kết quả về quá khứ, nhưng now cần would be.',
          'Reach nghĩa là vươn tới hoặc đạt tới. Ở đây cần rich: giàu.'
        ]
      },
      id: {
        prompt: 'Jika dulu saya menerima tawaran itu, sekarang saya akan kaya',
        explanations: [
          'Took tidak cukup menandai kondisi masa lalu yang tidak terjadi. Perlu had taken.',
          'Benar. Ini mixed conditional: kondisi masa lalu, hasil masa kini.',
          'Would have been membawa hasil ke masa lalu, tetapi now meminta would be.',
          'Reach berarti mencapai. Di sini perlu rich: kaya.'
        ]
      },
      tr: {
        prompt: 'O teklifi o zaman kabul etmiş olsaydım, şimdi zengin olurdum',
        explanations: [
          'Took gerçekleşmemiş geçmiş koşulu iyi göstermez. Had taken gerekir.',
          'Doğru. Bu mixed conditional: geçmiş koşul, şimdiki sonuç.',
          'Would have been sonucu geçmişe taşır, ama now would be ister.',
          'Reach ulaşmak demektir. Burada rich gerekir: zengin.'
        ]
      },
      pl: {
        prompt: 'Gdybym wtedy przyjął tamtą ofertę, teraz byłbym bogaty',
        explanations: [
          'Took nie zaznacza dobrze niespełnionego warunku w przeszłości. Potrzebne jest had taken.',
          'Dobrze. To mixed conditional: warunek przeszły, wynik teraźniejszy.',
          'Would have been przenosi wynik do przeszłości, ale now wymaga would be.',
          'Reach znaczy sięgać albo osiągać. Tutaj potrzebujesz rich: bogaty.'
        ]
      }
    },
    '83': {
      'pt-BR': {
        prompt: 'Precisamos resolver todos os detalhes antes de o evento começar',
        explanations: [
          'Correto. Iron out details significa resolver ou ajustar detalhes.',
          'Smooth all the details é uma tradução literal demais. A expressão natural é iron out.',
          'Iron off não é o phrasal verb correto para esta ideia.',
          'Icon significa ícone. Aqui precisamos de iron.'
        ]
      },
      vi: {
        prompt: 'Chúng ta cần xử lý tất cả chi tiết trước khi sự kiện bắt đầu',
        explanations: [
          'Đúng. Iron out details nghĩa là xử lý hoặc điều chỉnh các chi tiết.',
          'Smooth all the details dịch quá sát nghĩa. Cách nói tự nhiên là iron out.',
          'Iron off không phải phrasal verb đúng cho ý này.',
          'Icon nghĩa là biểu tượng. Ở đây cần iron.'
        ]
      },
      id: {
        prompt: 'Kita perlu membereskan semua detail sebelum acara dimulai',
        explanations: [
          'Benar. Iron out details berarti menyelesaikan atau merapikan detail.',
          'Smooth all the details terlalu harfiah. Ungkapan alami adalah iron out.',
          'Iron off bukan phrasal verb yang benar untuk ide ini.',
          'Icon berarti ikon. Di sini perlu iron.'
        ]
      },
      tr: {
        prompt: 'Etkinlik başlamadan önce tüm ayrıntıları netleştirmemiz gerekiyor',
        explanations: [
          'Doğru. Iron out details ayrıntıları çözmek veya netleştirmek demektir.',
          'Smooth all the details fazla kelimesi kelimesine bir çeviri. Doğal ifade iron out.',
          'Iron off bu anlam için doğru phrasal verb değildir.',
          'Icon ikon demektir. Burada iron gerekir.'
        ]
      },
      pl: {
        prompt: 'Musimy dopracować wszystkie szczegóły przed rozpoczęciem wydarzenia',
        explanations: [
          'Dobrze. Iron out details znaczy rozwiązać albo dopracować szczegóły.',
          'Smooth all the details jest zbyt dosłowne. Naturalne wyrażenie to iron out.',
          'Iron off nie jest właściwym phrasal verb dla tej myśli.',
          'Icon znaczy ikona. Tutaj potrzebujesz iron.'
        ]
      }
    },
    '84': {
      'pt-BR': {
        prompt: 'É essencial que ele chegue à reunião a tempo',
        explanations: [
          'Arrives é indicativo. Aqui buscamos a forma base depois de It is essential that.',
          'Correto. No mandative subjunctive usamos he arrive, sem s. Termo-chave em ingl?s: essential..',
          'For him arriving não é a estrutura correta para esta ideia. Termo-chave em ingl?s: essential..',
          'Derived significa derivado ou procedente. Aqui precisamos de arrive: chegar.'
        ]
      },
      vi: {
        prompt: 'Điều cần thiết là anh ấy đến cuộc họp đúng giờ',
        explanations: [
          'Arrives là dạng chỉ định. Ở đây cần dạng gốc sau It is essential that.',
          'Đúng. Trong mandative subjunctive, ta dùng he arrive, không có s. Thu?t ng? ti?ng Anh c?n gi?: essential..',
          'For him arriving không phải cấu trúc đúng cho ý này. Thu?t ng? ti?ng Anh c?n gi?: essential..',
          'Derived nghĩa là bắt nguồn hoặc được suy ra. Ở đây cần arrive: đến.'
        ]
      },
      id: {
        prompt: 'Sangat penting agar dia tiba di rapat tepat waktu',
        explanations: [
          'Arrives adalah bentuk indicative. Di sini targetnya bentuk dasar setelah It is essential that.',
          'Benar. Dalam mandative subjunctive, gunakan he arrive, tanpa s. Istilah Inggris yang perlu dipertahankan: essential..',
          'For him arriving bukan struktur yang benar untuk ide ini. Istilah Inggris yang perlu dipertahankan: essential..',
          'Derived berarti berasal atau diturunkan. Di sini perlu arrive: tiba.'
        ]
      },
      tr: {
        prompt: 'Toplantıya zamanında varması şarttır',
        explanations: [
          'Arrives indicative biçimdir. Burada It is essential that sonrasında temel biçim aranır.',
          'Doğru. Mandative subjunctive içinde he arrive kullanılır, s eklenmez. Korunmas? gereken ?ngilizce terim: essential..',
          'For him arriving bu fikir için doğru yapı değildir. Korunmas? gereken ?ngilizce terim: essential..',
          'Derived türemiş veya kaynaklanmış demektir. Burada arrive gerekir: varmak.'
        ]
      },
      pl: {
        prompt: 'To niezbędne, żeby przybył na spotkanie punktualnie',
        explanations: [
          'Arrives to tryb oznajmujący. Tutaj po It is essential that szukamy formy podstawowej.',
          'Dobrze. W mandative subjunctive używamy he arrive, bez s. Angielski termin do zachowania: essential..',
          'For him arriving nie jest poprawną strukturą dla tej myśli. Angielski termin do zachowania: essential..',
          'Derived znaczy pochodzący albo wyprowadzony. Tutaj potrzebujesz arrive: przybyć.'
        ]
      }
    },
    '85': {
      'pt-BR': {
        prompt: 'Ela não queria mais desempenhar um papel secundário neste projeto',
        explanations: [
          'Second guitar é tradução literal. O idiom inglês usa fiddle.',
          'Correto. Play second fiddle significa ter um papel secundário.',
          'A expressão fixa é play second fiddle, sem a.',
          'Riddle significa enigma. Aqui precisamos de fiddle.'
        ]
      },
      vi: {
        prompt: 'Cô ấy không còn muốn đóng vai phụ trong dự án này',
        explanations: [
          'Second guitar là bản dịch sát nghĩa. Idiom tiếng Anh dùng fiddle.',
          'Đúng. Play second fiddle nghĩa là giữ vai trò phụ.',
          'Cụm cố định là play second fiddle, không có a.',
          'Riddle nghĩa là câu đố. Ở đây cần fiddle.'
        ]
      },
      id: {
        prompt: 'Dia tidak lagi mau memainkan peran kedua dalam proyek ini',
        explanations: [
          'Second guitar adalah terjemahan harfiah. Idiom bahasa Inggris memakai fiddle.',
          'Benar. Play second fiddle berarti memainkan peran kedua atau kurang utama.',
          'Ungkapan tetapnya adalah play second fiddle, tanpa a.',
          'Riddle berarti teka-teki. Di sini perlu fiddle.'
        ]
      },
      tr: {
        prompt: 'Bu projede artık ikinci planda kalmak istemiyordu',
        explanations: [
          'Second guitar kelimesi kelimesine çeviridir. İngilizce idiom fiddle kullanır.',
          'Doğru. Play second fiddle ikinci planda kalmak demektir.',
          'Sabit ifade play second fiddle şeklindedir, a kullanılmaz.',
          'Riddle bilmece demektir. Burada fiddle gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie chciała już grać drugich skrzypiec w tym projekcie',
        explanations: [
          'Second guitar to tłumaczenie dosłowne. Angielski idiom używa fiddle.',
          'Dobrze. Play second fiddle znaczy odgrywać drugorzędną rolę.',
          'Stałe wyrażenie to play second fiddle, bez a.',
          'Riddle znaczy zagadka. Tutaj potrzebujesz fiddle.'
        ]
      }
    },
    '86': {
      'pt-BR': {
        prompt: 'Eles demonstraram pouquíssima consideração pelas regras de segurança',
        explanations: [
          'Esta opção dá para entender, mas soa como tradução literal e é menos natural.',
          'Correto. Scant regard for significa pouquíssima consideração por algo.',
          'A colocação natural é regard for, não regard to, nesta frase.',
          'Reward significa recompensa. Aqui precisamos de regard.'
        ]
      },
      vi: {
        prompt: 'Họ tỏ ra rất ít coi trọng các quy định an toàn',
        explanations: [
          'Phương án này hiểu được, nhưng nghe như dịch sát nghĩa và kém tự nhiên.',
          'Đúng. Scant regard for nghĩa là rất ít coi trọng hoặc rất ít quan tâm đến điều gì.',
          'Cách kết hợp tự nhiên là regard for, không phải regard to, trong câu này.',
          'Reward nghĩa là phần thưởng. Ở đây cần regard.'
        ]
      },
      id: {
        prompt: 'Mereka menunjukkan sangat sedikit kepedulian terhadap peraturan keselamatan',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi terdengar seperti terjemahan harfiah dan kurang alami.',
          'Benar. Scant regard for berarti sangat sedikit perhatian atau kepedulian terhadap sesuatu.',
          'Kolokasi alami dalam kalimat ini adalah regard for, bukan regard to.',
          'Reward berarti hadiah atau imbalan. Di sini perlu regard.'
        ]
      },
      tr: {
        prompt: 'Güvenlik kurallarına çok az önem verdiler',
        explanations: [
          'Bu seçenek anlaşılır, ama kelimesi kelimesine çeviri gibi ve daha az doğal duyulur.',
          'Doğru. Scant regard for bir şeye çok az önem vermek demektir.',
          'Bu cümlede doğal collocation regard for, regard to değil.',
          'Reward ödül demektir. Burada regard gerekir.'
        ]
      },
      pl: {
        prompt: 'Okazali znikomy szacunek dla przepisów bezpieczeństwa',
        explanations: [
          'Ta opcja jest zrozumiała, ale brzmi zbyt dosłownie i mniej naturalnie.',
          'Dobrze. Scant regard for znaczy bardzo mały szacunek albo małą uwagę wobec czegoś.',
          'Naturalna kolokacja w tym zdaniu to regard for, nie regard to.',
          'Reward znaczy nagroda. Tutaj potrzebujesz regard.'
        ]
      }
    },
    '87': {
      'pt-BR': {
        prompt: 'Ao que parece, ele não conhecia as regras quando tomou a decisão',
        explanations: [
          'Correto. Seemingly apresenta algo que parece verdadeiro com base nas informações disponíveis.',
          'By the look não é uma forma natural de expressar esta ideia.',
          'Falamos de uma decisão específica, então the decision encaixa melhor que a decision.',
          'Swimmingly significa sem problemas. Aqui precisamos de seemingly.'
        ]
      },
      vi: {
        prompt: 'Có vẻ anh ấy không biết các quy định khi đưa ra quyết định',
        explanations: [
          'Đúng. Seemingly giới thiệu điều có vẻ đúng dựa trên thông tin hiện có.',
          'By the look không phải cách tự nhiên để diễn đạt ý này.',
          'Ở đây nói về một quyết định cụ thể, nên the decision hợp hơn a decision.',
          'Swimmingly nghĩa là trôi chảy hoặc thuận lợi. Ở đây cần seemingly.'
        ]
      },
      id: {
        prompt: 'Tampaknya dia tidak mengetahui peraturan saat mengambil keputusan',
        explanations: [
          'Benar. Seemingly menyampaikan sesuatu yang tampaknya benar berdasarkan informasi yang ada.',
          'By the look bukan cara alami untuk mengungkapkan ide ini.',
          'Kita membahas keputusan tertentu, jadi the decision lebih cocok daripada a decision.',
          'Swimmingly berarti berjalan lancar. Di sini perlu seemingly.'
        ]
      },
      tr: {
        prompt: 'Görünüşe göre kararı verirken kurallardan habersizdi',
        explanations: [
          'Doğru. Seemingly eldeki bilgiye göre doğru görünen bir şeyi anlatır.',
          'By the look bu fikri anlatmak için doğal bir ifade değildir.',
          'Burada belirli bir karardan söz ediyoruz, bu yüzden the decision a decision yerine daha uygundur.',
          'Swimmingly sorunsuzca demektir. Burada seemingly gerekir.'
        ]
      },
      pl: {
        prompt: 'Najwyraźniej nie znał przepisów, kiedy podejmował decyzję',
        explanations: [
          'Dobrze. Seemingly wprowadza coś, co wydaje się prawdziwe na podstawie dostępnych informacji.',
          'By the look nie jest naturalnym sposobem wyrażenia tej myśli.',
          'Mówimy o konkretnej decyzji, więc the decision pasuje lepiej niż a decision.',
          'Swimmingly znaczy gładko albo bez problemów. Tutaj potrzebujesz seemingly.'
        ]
      }
    },
    '88': {
      'pt-BR': {
        prompt: 'Só quando chegou em casa ela percebeu que tinha perdido a carteira',
        explanations: [
          'Com Not until no início, precisamos de inversão: did she realize.',
          'Correto. Not until... did she realize... é uma inversão enfática correta.',
          'Esta opção é mais literal e também perde a estrutura enfática buscada.',
          'Release significa liberar ou soltar. Aqui precisamos de realize: perceber.'
        ]
      },
      vi: {
        prompt: 'Chỉ khi về đến nhà, cô ấy mới nhận ra mình đã mất ví',
        explanations: [
          'Khi Not until đứng đầu câu, cần đảo ngữ: did she realize.',
          'Đúng. Not until... did she realize... là cấu trúc đảo ngữ nhấn mạnh đúng.',
          'Phương án này sát nghĩa hơn và cũng mất cấu trúc nhấn mạnh đang cần.',
          'Release nghĩa là thả ra hoặc phát hành. Ở đây cần realize: nhận ra.'
        ]
      },
      id: {
        prompt: 'Baru ketika sampai di rumah, dia menyadari bahwa dompetnya hilang',
        explanations: [
          'Saat Not until ada di awal, perlu inversion: did she realize.',
          'Benar. Not until... did she realize... adalah inversion penekanan yang benar.',
          'Pilihan ini lebih harfiah dan juga kehilangan struktur penekanan yang dicari.',
          'Release berarti melepaskan atau merilis. Di sini perlu realize: menyadari.'
        ]
      },
      tr: {
        prompt: 'Eve vardığında cüzdanını kaybettiğini fark etti',
        explanations: [
          'Not until cümle başına gelirse inversion gerekir: did she realize.',
          'Doğru. Not until... did she realize... doğru bir vurgulu inversion yapısıdır.',
          'Bu seçenek daha düz çeviri gibi ve aranan vurgulu yapıyı da kaybediyor.',
          'Release bırakmak veya serbest bırakmak demektir. Burada realize gerekir: fark etmek.'
        ]
      },
      pl: {
        prompt: 'Dopiero gdy wróciła do domu, zrozumiała, że zgubiła portfel',
        explanations: [
          'Gdy Not until stoi na początku, potrzebna jest inwersja: did she realize.',
          'Dobrze. Not until... did she realize... to poprawna inwersja emfatyczna.',
          'Ta opcja jest bardziej dosłowna i traci szukaną strukturę emfatyczną.',
          'Release znaczy uwolnić albo wypuścić. Tutaj potrzebujesz realize: zdać sobie sprawę.'
        ]
      }
    },
    '89': {
      'pt-BR': {
        prompt: 'Vou fazer com que ele reescreva este relatório até o fim da tarde',
        explanations: [
          'Depois de get him precisamos de to antes do verbo: get him to rewrite.',
          'Com make someone do não usamos to. Se quiser usar to, a estrutura é get him to...',
          'Correto. Get someone to do something significa fazer com que alguém faça algo.',
          'Reunite significa reunir novamente. Aqui precisamos de rewrite: reescrever.'
        ]
      },
      vi: {
        prompt: 'Tôi sẽ khiến anh ấy viết lại báo cáo này trước buổi tối',
        explanations: [
          'Sau get him cần to trước động từ: get him to rewrite.',
          'Với make someone do, không dùng to. Nếu muốn có to, cấu trúc là get him to...',
          'Đúng. Get someone to do something nghĩa là khiến hoặc thuyết phục ai làm việc gì.',
          'Reunite nghĩa là đoàn tụ hoặc hợp lại. Ở đây cần rewrite: viết lại.'
        ]
      },
      id: {
        prompt: 'Saya akan membuatnya menulis ulang laporan ini sebelum malam',
        explanations: [
          'Setelah get him perlu to sebelum verb: get him to rewrite.',
          'Dengan make someone do, kita tidak memakai to. Jika ingin memakai to, strukturnya get him to...',
          'Benar. Get someone to do something berarti membuat atau membujuk seseorang melakukan sesuatu.',
          'Reunite berarti menyatukan kembali. Di sini perlu rewrite: menulis ulang.'
        ]
      },
      tr: {
        prompt: 'Bu raporu akşama kadar yeniden yazmasını sağlayacağım',
        explanations: [
          'Get him sonrasında fiilden önce to gerekir: get him to rewrite.',
          'Make someone do yapısında to kullanılmaz. To kullanmak istiyorsan yapı get him to... olmalı.',
          'Doğru. Get someone to do something birinin bir şeyi yapmasını sağlamak demektir.',
          'Reunite yeniden birleştirmek demektir. Burada rewrite gerekir: yeniden yazmak.'
        ]
      },
      pl: {
        prompt: 'Sprawię, że przepisze ten raport do wieczora',
        explanations: [
          'Po get him potrzebne jest to przed czasownikiem: get him to rewrite.',
          'W make someone do nie używamy to. Jeśli chcesz użyć to, struktura to get him to...',
          'Dobrze. Get someone to do something znaczy sprawić, żeby ktoś coś zrobił.',
          'Reunite znaczy ponownie połączyć. Tutaj potrzebujesz rewrite: przepisać.'
        ]
      }
    },
    '90': {
      'pt-BR': {
        prompt: 'Foi Mark quem me contou toda a verdade sobre o que aconteceu',
        explanations: [
          'Esta opção conta o fato, mas não marca a ênfase em Mark.',
          'Correto. It was Mark who... é uma cleft sentence para enfatizar a pessoa.',
          'Mark faz a ação, então precisamos de who, não whom.',
          'Mask significa máscara. Aqui precisamos do nome Mark.'
        ]
      },
      vi: {
        prompt: 'Chính Mark là người đã kể cho tôi toàn bộ sự thật về chuyện đã xảy ra',
        explanations: [
          'Phương án này kể lại sự việc, nhưng không nhấn mạnh Mark.',
          'Đúng. It was Mark who... là cleft sentence dùng để nhấn mạnh người.',
          'Mark là người thực hiện hành động, nên cần who, không phải whom.',
          'Mask nghĩa là mặt nạ. Ở đây cần tên Mark.'
        ]
      },
      id: {
        prompt: 'Mark-lah yang memberitahuku seluruh kebenaran tentang apa yang terjadi',
        explanations: [
          'Pilihan ini menyampaikan faktanya, tetapi tidak menekankan Mark.',
          'Benar. It was Mark who... adalah cleft sentence untuk menekankan orangnya.',
          'Mark melakukan tindakan, jadi perlu who, bukan whom.',
          'Mask berarti topeng. Di sini perlu nama Mark.'
        ]
      },
      tr: {
        prompt: 'Olanlarla ilgili tüm gerçeği bana Mark anlattı',
        explanations: [
          'Bu seçenek olayı anlatıyor, ama vurguyu Mark üzerinde kurmuyor.',
          'Doğru. It was Mark who... kişiyi vurgulamak için kullanılan cleft sentence yapısıdır.',
          'Mark eylemi yapan kişidir, bu yüzden whom değil who gerekir.',
          'Mask maske demektir. Burada Mark adı gerekir.'
        ]
      },
      pl: {
        prompt: 'To Mark powiedział mi całą prawdę o tym, co się stało',
        explanations: [
          'Ta opcja przekazuje fakt, ale nie podkreśla Marka.',
          'Dobrze. It was Mark who... to cleft sentence używane do podkreślenia osoby.',
          'Mark wykonuje czynność, więc potrzebne jest who, nie whom.',
          'Mask znaczy maska. Tutaj potrzebujesz imienia Mark.'
        ]
      }
    },
    '91': {
      'pt-BR': {
        prompt: 'Resumindo, tivemos que começar tudo do zero',
        explanations: [
          'Correto. To cut a long story short introduz um resumo antes de ir direto ao ponto.',
          'Shorter speaking é uma tradução literal; não soa natural em inglês.',
          'A expressão fixa termina com short, não shortly.',
          'Cat significa gato. Aqui precisamos de cut.'
        ]
      },
      vi: {
        prompt: 'Tóm lại, chúng tôi đã phải bắt đầu lại từ đầu',
        explanations: [
          'Đúng. To cut a long story short dùng để tóm tắt trước khi đi thẳng vào ý chính.',
          'Shorter speaking là bản dịch sát nghĩa; nghe không tự nhiên trong tiếng Anh.',
          'Cụm cố định kết thúc bằng short, không phải shortly.',
          'Cat nghĩa là con mèo. Ở đây cần cut.'
        ]
      },
      id: {
        prompt: 'Singkat cerita, kami harus memulai semuanya dari awal',
        explanations: [
          'Benar. To cut a long story short dipakai untuk meringkas sebelum langsung ke inti.',
          'Shorter speaking adalah terjemahan harfiah; tidak terdengar alami dalam bahasa Inggris.',
          'Ungkapan tetapnya berakhir dengan short, bukan shortly.',
          'Cat berarti kucing. Di sini perlu cut.'
        ]
      },
      tr: {
        prompt: 'Uzun lafın kısası, her şeye sıfırdan başlamak zorunda kaldık',
        explanations: [
          'Doğru. To cut a long story short, uzun bir anlatıyı özetleyip asıl noktaya geçmek için kullanılır.',
          'Shorter speaking kelimesi kelimesine çeviri gibi duyulur; doğal İngilizce değildir.',
          'Sabit ifade short ile biter, shortly değil.',
          'Cat kedi demektir. Burada cut gerekir.'
        ]
      },
      pl: {
        prompt: 'Krótko mówiąc, musieliśmy zacząć wszystko od zera',
        explanations: [
          'Dobrze. To cut a long story short wprowadza streszczenie przed przejściem do sedna.',
          'Shorter speaking to dosłowne tłumaczenie; nie brzmi naturalnie po angielsku.',
          'Stałe wyrażenie kończy się na short, nie shortly.',
          'Cat znaczy kot. Tutaj potrzebujesz cut.'
        ]
      }
    },
    '92': {
      'pt-BR': {
        prompt: 'Ninguém esperava que ele recuasse no último minuto',
        explanations: [
          'Correto. Back down significa recuar ou deixar de defender uma posição.',
          'Esta opção traduz a ideia de forma literal demais e não usa o phrasal verb correto: back down.',
          'Com last minute usamos at, não in.',
          'Bake significa assar. Aqui precisamos de back.'
        ]
      },
      vi: {
        prompt: 'Không ai ngờ anh ấy sẽ rút lui vào phút cuối',
        explanations: [
          'Đúng. Back down nghĩa là rút lui hoặc ngừng bảo vệ lập trường.',
          'Phương án này dịch ý quá sát nghĩa và không dùng đúng phrasal verb: back down.',
          'Với last minute, dùng at, không phải in.',
          'Bake nghĩa là nướng. Ở đây cần back.'
        ]
      },
      id: {
        prompt: 'Tidak ada yang menyangka dia akan mundur pada menit terakhir',
        explanations: [
          'Benar. Back down berarti mundur atau berhenti mempertahankan posisi.',
          'Pilihan ini menerjemahkan ide terlalu harfiah dan tidak memakai phrasal verb yang benar: back down.',
          'Dengan last minute, gunakan at, bukan in.',
          'Bake berarti memanggang. Di sini perlu back.'
        ]
      },
      tr: {
        prompt: 'Son anda geri adım atacağını kimse beklemiyordu',
        explanations: [
          'Doğru. Back down geri adım atmak veya bir tutumu savunmayı bırakmak demektir.',
          'Bu seçenek fikri fazla kelimesi kelimesine çeviriyor ve doğru phrasal verb olan back down kullanmıyor.',
          'Last minute ile at kullanılır, in değil.',
          'Bake fırında pişirmek demektir. Burada back gerekir.'
        ]
      },
      pl: {
        prompt: 'Nikt nie spodziewał się, że wycofa się w ostatniej chwili',
        explanations: [
          'Dobrze. Back down znaczy wycofać się albo przestać bronić stanowiska.',
          'Ta opcja tłumaczy myśl zbyt dosłownie i nie używa właściwego phrasal verb: back down.',
          'Z last minute używamy at, nie in.',
          'Bake znaczy piec. Tutaj potrzebujesz back.'
        ]
      }
    },
    '93': {
      'pt-BR': {
        prompt: 'Preciso mandar consertar meu notebook até amanhã',
        explanations: [
          'Correto. Have my laptop fixed mostra que outra pessoa fará o conserto por você.',
          'Esta estrutura é literal demais. Em inglês natural usamos have something done.',
          'Falta o particípio: fixed.',
          'Faxed significa enviado por fax. Aqui precisamos de fixed.'
        ]
      },
      vi: {
        prompt: 'Tôi cần nhờ người sửa máy tính xách tay của tôi trước ngày mai',
        explanations: [
          'Đúng. Have my laptop fixed cho thấy người khác sẽ sửa máy tính cho bạn.',
          'Cấu trúc này quá sát nghĩa. Trong tiếng Anh tự nhiên dùng have something done.',
          'Thiếu phân từ: fixed.',
          'Faxed nghĩa là được gửi bằng fax. Ở đây cần fixed.'
        ]
      },
      id: {
        prompt: 'Laptop saya harus diperbaiki sebelum besok',
        explanations: [
          'Benar. Have my laptop fixed menunjukkan orang lain akan memperbaiki laptop itu untukmu.',
          'Struktur ini terlalu harfiah. Dalam bahasa Inggris alami gunakan have something done.',
          'Kurang participle: fixed.',
          'Faxed berarti dikirim lewat faks. Di sini perlu fixed.'
        ]
      },
      tr: {
        prompt: 'Yarına kadar dizüstü bilgisayarımı tamir ettirmem gerekiyor',
        explanations: [
          'Doğru. Have my laptop fixed bilgisayarı senin yerine başka birinin tamir edeceğini gösterir.',
          'Bu yapı fazla doğrudan çeviri. Doğal İngilizcede have something done kullanılır.',
          'Participle biçimi eksik: fixed.',
          'Faxed faksla gönderilmiş demektir. Burada fixed gerekir.'
        ]
      },
      pl: {
        prompt: 'Muszę oddać laptopa do naprawy przed jutrem',
        explanations: [
          'Dobrze. Have my laptop fixed pokazuje, że ktoś inny naprawi laptopa za ciebie.',
          'Ta struktura jest zbyt dosłowna. W naturalnym angielskim używamy have something done.',
          'Brakuje imiesłowu: fixed.',
          'Faxed znaczy wysłany faksem. Tutaj potrzebujesz fixed.'
        ]
      }
    },
    '94': {
      'pt-BR': {
        prompt: 'Não deveríamos nos precipitar e comemorar antes de recebermos os resultados',
        explanations: [
          'Correto. Jump the gun significa agir ou comemorar cedo demais.',
          'Esta opção dá para entender, mas não é o idiom natural.',
          'A expressão fixa usa the gun, não a gun.',
          'Gum significa chiclete ou gengiva. Aqui precisamos de gun.'
        ]
      },
      vi: {
        prompt: 'Chúng ta không nên vội mừng trước khi có kết quả',
        explanations: [
          'Đúng. Jump the gun nghĩa là hành động hoặc ăn mừng quá sớm.',
          'Phương án này hiểu được, nhưng không phải idiom tự nhiên.',
          'Cụm cố định dùng the gun, không phải a gun.',
          'Gum nghĩa là kẹo cao su hoặc lợi. Ở đây cần gun.'
        ]
      },
      id: {
        prompt: 'Kita tidak seharusnya terburu-buru merayakan sebelum mendapatkan hasilnya',
        explanations: [
          'Benar. Jump the gun berarti bertindak atau merayakan terlalu cepat.',
          'Pilihan ini bisa dimengerti, tetapi bukan idiom yang alami.',
          'Ungkapan tetapnya memakai the gun, bukan a gun.',
          'Gum berarti permen karet atau gusi. Di sini perlu gun.'
        ]
      },
      tr: {
        prompt: 'Sonuçları almadan acele edip kutlama yapmamalıyız',
        explanations: [
          'Doğru. Jump the gun çok erken davranmak veya kutlamak demektir.',
          'Bu seçenek anlaşılır, ama doğal idiom değildir.',
          'Sabit ifade the gun kullanır, a gun değil.',
          'Gum sakız veya diş eti demektir. Burada gun gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie powinniśmy wyprzedzać faktów i świętować, zanim dostaniemy wyniki',
        explanations: [
          'Dobrze. Jump the gun znaczy zadziałać albo świętować za wcześnie.',
          'Ta opcja jest zrozumiała, ale nie jest naturalnym idiomem.',
          'Stałe wyrażenie używa the gun, nie a gun.',
          'Gum znaczy guma do żucia albo dziąsło. Tutaj potrzebujesz gun.'
        ]
      }
    },
    '95': {
      'pt-BR': {
        prompt: 'Fico incomodado quando me dizem o que fazer',
        explanations: [
          'Esta opção dá para entender, mas o exercício busca uma forma mais precisa com resent being told.',
          'Correto. Resent being told what to do expressa incômodo por receber ordens.',
          'Depois de resent usamos -ing, não to be.',
          'Tolled é usado para sinos ou pedágios. Aqui precisamos de told.'
        ]
      },
      vi: {
        prompt: 'Tôi khó chịu khi bị bảo phải làm gì',
        explanations: [
          'Phương án này hiểu được, nhưng bài tập cần cách nói chính xác hơn với resent being told.',
          'Đúng. Resent being told what to do diễn tả sự khó chịu khi bị ra lệnh.',
          'Sau resent dùng -ing, không dùng to be.',
          'Tolled dùng cho chuông hoặc thu phí. Ở đây cần told.'
        ]
      },
      id: {
        prompt: 'Saya kesal ketika diberi tahu harus melakukan apa',
        explanations: [
          'Pilihan ini bisa dimengerti, tetapi latihan mencari bentuk yang lebih tepat dengan resent being told.',
          'Benar. Resent being told what to do menyatakan rasa kesal saat diberi perintah.',
          'Setelah resent gunakan -ing, bukan to be.',
          'Tolled dipakai untuk lonceng atau biaya tol. Di sini perlu told.'
        ]
      },
      tr: {
        prompt: 'Bana ne yapacağımın söylenmesinden hoşlanmıyorum',
        explanations: [
          'Bu seçenek anlaşılır, ama alıştırma resent being told ile daha kesin bir ifade arıyor.',
          'Doğru. Resent being told what to do emir verilmesinden rahatsız olmayı anlatır.',
          'Resent sonrasında -ing kullanılır, to be değil.',
          'Tolled çan veya geçiş ücreti bağlamında kullanılır. Burada told gerekir.'
        ]
      },
      pl: {
        prompt: 'Nie znoszę, gdy mówi mi się, co mam robić',
        explanations: [
          'Ta opcja jest zrozumiała, ale zadanie szuka dokładniejszej formy z resent being told.',
          'Dobrze. Resent being told what to do wyraża niechęć do otrzymywania poleceń.',
          'Po resent używamy -ing, nie to be.',
          'Tolled używa się przy dzwonach albo opłatach. Tutaj potrzebujesz told.'
        ]
      }
    },
    '96': {
      'pt-BR': {
        prompt: 'Foi só então que percebi o quanto aquilo era importante',
        explanations: [
          'Se começar com Only then, precisamos de inversão: Only then did I realize...',
          'Correto. It was only then that... enfatiza o momento em que a compreensão aconteceu.',
          'Nesta estrutura usamos that, não which.',
          'Thin significa fino ou magro. Aqui precisamos de then.'
        ]
      },
      vi: {
        prompt: 'Chỉ khi đó tôi mới nhận ra điều đó quan trọng đến mức nào',
        explanations: [
          'Nếu bắt đầu bằng Only then, cần đảo ngữ: Only then did I realize...',
          'Đúng. It was only then that... nhấn mạnh thời điểm nhận ra.',
          'Trong cấu trúc này dùng that, không phải which.',
          'Thin nghĩa là mỏng hoặc gầy. Ở đây cần then.'
        ]
      },
      id: {
        prompt: 'Baru saat itu saya menyadari betapa pentingnya hal itu',
        explanations: [
          'Jika mulai dengan Only then, perlu inversion: Only then did I realize...',
          'Benar. It was only then that... menekankan momen terjadinya pemahaman.',
          'Dalam struktur ini gunakan that, bukan which.',
          'Thin berarti tipis. Di sini perlu then.'
        ]
      },
      tr: {
        prompt: 'Bunun ne kadar önemli olduğunu ancak o zaman anladım',
        explanations: [
          'Only then ile başlarsan inversion gerekir: Only then did I realize...',
          'Doğru. It was only then that... anlamanın gerçekleştiği anı vurgular.',
          'Bu yapıda which değil that kullanılır.',
          'Thin ince veya zayıf demektir. Burada then gerekir.'
        ]
      },
      pl: {
        prompt: 'Dopiero wtedy zrozumiałem, jak ważne to było',
        explanations: [
          'Jeśli zaczynasz od Only then, potrzebna jest inwersja: Only then did I realize...',
          'Dobrze. It was only then that... podkreśla moment zrozumienia.',
          'W tej strukturze używamy that, nie which.',
          'Thin znaczy cienki albo chudy. Tutaj potrzebujesz then.'
        ]
      }
    },
    '97': {
      'pt-BR': {
        prompt: 'Eles tiveram que cancelar a reunião por causa da chuva forte',
        explanations: [
          'Esta opção é correta e clara, mas mais básica; o exercício busca o phrasal verb call off.',
          'Correto. Call off the meeting significa cancelar a reunião.',
          'Call out muda o sentido: chamar, apontar ou criticar, não cancelar.',
          'Of é preposição. O phrasal verb usa off com dois f.'
        ]
      },
      vi: {
        prompt: 'Họ đã phải hủy cuộc họp vì mưa lớn',
        explanations: [
          'Phương án này đúng và rõ, nhưng cơ bản hơn; bài tập cần phrasal verb call off.',
          'Đúng. Call off the meeting nghĩa là hủy cuộc họp.',
          'Call out đổi nghĩa: gọi, chỉ ra hoặc phê bình, không phải hủy.',
          'Of là giới từ. Phrasal verb dùng off với hai chữ f.'
        ]
      },
      id: {
        prompt: 'Mereka harus membatalkan rapat karena hujan deras',
        explanations: [
          'Pilihan ini benar dan jelas, tetapi lebih dasar; latihan mencari phrasal verb call off.',
          'Benar. Call off the meeting berarti membatalkan rapat.',
          'Call out mengubah makna: memanggil, menunjukkan, atau mengkritik, bukan membatalkan.',
          'Of adalah preposition. Phrasal verb memakai off dengan dua f.'
        ]
      },
      tr: {
        prompt: 'Şiddetli yağmur yüzünden toplantıyı iptal etmek zorunda kaldılar',
        explanations: [
          'Bu seçenek doğru ve açık, ama daha temel; alıştırma call off phrasal verbünü arıyor.',
          'Doğru. Call off the meeting toplantıyı iptal etmek demektir.',
          'Call out anlamı değiştirir: çağırmak, belirtmek veya eleştirmek, iptal etmek değil.',
          'Of bir preposition. Phrasal verb iki f ile off kullanır.'
        ]
      },
      pl: {
        prompt: 'Musieli odwołać spotkanie z powodu ulewnego deszczu',
        explanations: [
          'Ta opcja jest poprawna i jasna, ale prostsza; zadanie szuka phrasal verb call off.',
          'Dobrze. Call off the meeting znaczy odwołać spotkanie.',
          'Call out zmienia sens: zawołać, wskazać albo skrytykować, nie odwołać.',
          'Of to przyimek. Phrasal verb używa off z dwoma f.'
        ]
      }
    },
    '98': {
      'pt-BR': {
        prompt: 'Se eu tivesse reservado os ingressos com antecedência, agora não estaria nesta fila',
        explanations: [
          'Correto. É mixed conditional: ação passada não realizada, resultado presente em progresso.',
          'Booked sem had não marca bem a condição passada não realizada.',
          'Wouldn\'t stand pode aparecer em outros contextos, mas aqui now pede wouldn\'t be standing.',
          'Baked significa assado. Aqui precisamos de booked.'
        ]
      },
      vi: {
        prompt: 'Nếu tôi đã đặt vé trước, bây giờ tôi đã không phải đứng trong hàng này',
        explanations: [
          'Đúng. Đây là mixed conditional: hành động quá khứ không xảy ra, kết quả hiện tại đang diễn ra.',
          'Booked không có had không đánh dấu rõ điều kiện quá khứ không xảy ra.',
          'Wouldn\'t stand có thể dùng trong ngữ cảnh khác, nhưng ở đây now cần wouldn\'t be standing.',
          'Baked nghĩa là được nướng. Ở đây cần booked.'
        ]
      },
      id: {
        prompt: 'Jika saya sudah memesan tiket sebelumnya, sekarang saya tidak akan berdiri di antrean ini',
        explanations: [
          'Benar. Ini mixed conditional: tindakan masa lalu yang tidak terjadi, hasil masa kini yang sedang berlangsung.',
          'Booked tanpa had tidak cukup menandai kondisi masa lalu yang tidak terjadi.',
          'Wouldn\'t stand bisa muncul dalam konteks lain, tetapi di sini now meminta wouldn\'t be standing.',
          'Baked berarti dipanggang. Di sini perlu booked.'
        ]
      },
      tr: {
        prompt: 'Biletleri önceden ayırtmış olsaydım, şu anda bu sırada bekliyor olmazdım',
        explanations: [
          'Doğru. Bu mixed conditional: gerçekleşmemiş geçmiş eylem, şu anda süren sonuç.',
          'Had olmadan booked gerçekleşmemiş geçmiş koşulu iyi göstermez.',
          'Wouldn\'t stand başka bağlamlarda olabilir, ama burada now wouldn\'t be standing ister.',
          'Baked fırınlanmış demektir. Burada booked gerekir.'
        ]
      },
      pl: {
        prompt: 'Gdybym zarezerwował bilety wcześniej, teraz nie stałbym w tej kolejce',
        explanations: [
          'Dobrze. To mixed conditional: niespełnione działanie w przeszłości, trwający wynik teraz.',
          'Booked bez had nie zaznacza dobrze niespełnionego warunku w przeszłości.',
          'Wouldn\'t stand może działać w innych kontekstach, ale tutaj now wymaga wouldn\'t be standing.',
          'Baked znaczy upieczony. Tutaj potrzebujesz booked.'
        ]
      }
    },
    '99': {
      'pt-BR': {
        prompt: 'Eu realmente preciso dar uma revisada no meu francês antes da viagem',
        explanations: [
          'Clean up my French soa como limpar o idioma; não é natural para revisar uma habilidade.',
          'Correto. Brush up on significa revisar ou refrescar uma habilidade.',
          'A expressão fixa precisa de up on: brush up on my French.',
          'Blush significa corar. Aqui precisamos de brush.'
        ]
      },
      vi: {
        prompt: 'Tôi thật sự cần ôn lại tiếng Pháp trước chuyến đi',
        explanations: [
          'Clean up my French nghe như dọn dẹp ngôn ngữ; không tự nhiên khi nói ôn lại kỹ năng.',
          'Đúng. Brush up on nghĩa là ôn lại hoặc làm mới một kỹ năng.',
          'Cụm cố định cần up on: brush up on my French.',
          'Blush nghĩa là đỏ mặt. Ở đây cần brush.'
        ]
      },
      id: {
        prompt: 'Saya benar-benar perlu menyegarkan kembali bahasa Prancis saya sebelum perjalanan',
        explanations: [
          'Clean up my French terdengar seperti membersihkan bahasa; tidak alami untuk meninjau keterampilan.',
          'Benar. Brush up on berarti mengulang atau menyegarkan kembali suatu kemampuan.',
          'Ungkapan tetapnya perlu up on: brush up on my French.',
          'Blush berarti memerah karena malu. Di sini perlu brush.'
        ]
      },
      tr: {
        prompt: 'Yolculuktan önce Fransızcamı gerçekten tazelemem gerekiyor',
        explanations: [
          'Clean up my French dili temizlemek gibi duyulur; bir beceriyi tazelemek için doğal değildir.',
          'Doğru. Brush up on bir beceriyi gözden geçirmek veya tazelemek demektir.',
          'Sabit ifade up on ister: brush up on my French.',
          'Blush kızarmak demektir. Burada brush gerekir.'
        ]
      },
      pl: {
        prompt: 'Naprawdę muszę odświeżyć francuski przed podróżą',
        explanations: [
          'Clean up my French brzmi jak sprzątanie języka; nie jest naturalne dla odświeżania umiejętności.',
          'Dobrze. Brush up on znaczy powtórzyć albo odświeżyć umiejętność.',
          'Stałe wyrażenie potrzebuje up on: brush up on my French.',
          'Blush znaczy rumienić się. Tutaj potrzebujesz brush.'
        ]
      }
    },
    '100': {
      'pt-BR': {
        prompt: 'Você acertou em cheio ao dizer que nos falta disciplina',
        explanations: [
          'Correto. Hit the nail on the head significa acertar exatamente.',
          'O idiom não fala de finger. Precisamos de nail.',
          'Esta opção é literal demais. Em inglês usamos a imagem de nail.',
          'Snail significa caracol. Aqui precisamos de nail.'
        ]
      },
      vi: {
        prompt: 'Bạn nói rất trúng khi bảo rằng chúng ta thiếu kỷ luật',
        explanations: [
          'Đúng. Hit the nail on the head nghĩa là nói hoặc đoán chính xác.',
          'Idiom này không nói về finger. Cần nail.',
          'Phương án này quá sát nghĩa. Trong tiếng Anh dùng hình ảnh nail.',
          'Snail nghĩa là ốc sên. Ở đây cần nail.'
        ]
      },
      id: {
        prompt: 'Kamu tepat sekali saat mengatakan bahwa kita kurang disiplin',
        explanations: [
          'Benar. Hit the nail on the head berarti benar-benar tepat.',
          'Idiom ini tidak membahas finger. Perlu nail.',
          'Pilihan ini terlalu harfiah. Dalam bahasa Inggris digunakan gambaran nail.',
          'Snail berarti siput. Di sini perlu nail.'
        ]
      },
      tr: {
        prompt: 'Disiplinimizin eksik olduğunu söyleyerek tam isabet ettin',
        explanations: [
          'Doğru. Hit the nail on the head tam olarak doğru söylemek demektir.',
          'Bu idiom finger hakkında değildir. Nail gerekir.',
          'Bu seçenek fazla doğrudan çeviri. İngilizcede nail imgesi kullanılır.',
          'Snail salyangoz demektir. Burada nail gerekir.'
        ]
      },
      pl: {
        prompt: 'Trafiłeś w sedno, mówiąc, że brakuje nam dyscypliny',
        explanations: [
          'Dobrze. Hit the nail on the head znaczy trafić dokładnie w sedno.',
          'Ten idiom nie mówi o finger. Potrzebujemy nail.',
          'Ta opcja jest zbyt dosłowna. W angielskim używa się obrazu nail.',
          'Snail znaczy ślimak. Tutaj potrzebujesz nail.'
        ]
      }
    }
  }
};

export function getStructuredQuizSourceLocalePayload(
  difficulty: QuizSourcePayloadDifficulty,
  ordinal: number,
  locale: HeisenbergSourceLocale,
): QuizSourceLocalePayload | null {
  return QUIZ_SOURCE_LOCALE_PAYLOADS[difficulty]?.[ordinal]?.[locale] ?? null;
}
