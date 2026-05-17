import type { HeisenbergSourceLocale } from './source_locales';

export type PersonalTrainingSummarySourceCopy = {
  title: string;
  shortDiagnosis: string;
};

export type PersonalTrainingSummarySourceLocaleMap = Partial<
  Record<HeisenbergSourceLocale, PersonalTrainingSummarySourceCopy>
>;

export const PERSONAL_TRAINING_SUMMARY_SOURCE_LOCALES: Record<string, PersonalTrainingSummarySourceLocaleMap> = {
  adjective_comparison: {
    es: {
      title: 'Cheaper / More Expensive / Better: comparación sin lío',
      shortDiagnosis: 'Mezclas comparación corta, comparación larga, excepciones y comparación de igualdad.',
    },
    'pt-BR': {
      title: 'Cheaper / More Expensive / Better: comparação sem bagunça',
      shortDiagnosis: 'Você mistura comparação curta, comparação longa, exceções e comparação de igualdade.',
    },
    vi: {
      title: 'Cheaper / More Expensive / Better: so sánh không rối',
      shortDiagnosis: 'Bạn đang trộn so sánh ngắn, so sánh dài, ngoại lệ và so sánh ngang bằng.',
    },
    id: {
      title: 'Cheaper / More Expensive / Better: perbandingan tanpa bingung',
      shortDiagnosis: 'Kamu mencampur perbandingan pendek, perbandingan panjang, pengecualian, dan perbandingan setara.',
    },
    tr: {
      title: 'Cheaper / More Expensive / Better: karışmadan karşılaştırma',
      shortDiagnosis: 'Kısa karşılaştırmayı, uzun karşılaştırmayı, istisnaları ve eşitlik karşılaştırmasını karıştırıyorsun.',
    },
    pl: {
      title: 'Cheaper / More Expensive / Better: porównania bez chaosu',
      shortDiagnosis: 'Mylisz krótkie porównania, długie porównania, wyjątki i porównania równości.',
    },
  },
  adjective_vs_adverb: {
    es: {
      title: 'Good o well: dónde se rompe la elección',
      shortDiagnosis: 'Eliges por traducción, pero el inglés mira qué papel tiene la palabra en la frase.',
    },
    'pt-BR': {
      title: 'Good ou well: onde a escolha quebra',
      shortDiagnosis: 'Você escolhe pela tradução, mas o inglês olha para o papel da palavra na frase.',
    },
    vi: {
      title: 'Good hay well: chỗ lựa chọn dễ sai',
      shortDiagnosis: 'Bạn chọn theo bản dịch, nhưng tiếng Anh nhìn vai trò của từ trong câu.',
    },
    id: {
      title: 'Good atau well: di mana pilihannya sering salah',
      shortDiagnosis: 'Kamu memilih berdasarkan terjemahan, padahal bahasa Inggris melihat peran kata dalam frasa.',
    },
    tr: {
      title: 'Good mu well mi: seçim nerede bozuluyor',
      shortDiagnosis: 'Çeviriye göre seçiyorsun, ama İngilizce kelimenin cümledeki görevine bakıyor.',
    },
    pl: {
      title: 'Good czy well: gdzie wybór się sypie',
      shortDiagnosis: 'Wybierasz po tłumaczeniu, a angielski patrzy na rolę słowa w zdaniu.',
    },
  },
  adverb_frequency_position: {
    es: {
      title: 'Always / Often / Never: dónde ponerlos para sonar natural',
      shortDiagnosis: 'Conoces always, often y never, pero los colocas donde el inglés empieza a sonar raro.',
    },
    'pt-BR': {
      title: 'Always / Often / Never: onde colocar para soar natural',
      shortDiagnosis: 'Você conhece always, often e never, mas coloca em lugares onde o inglês começa a soar estranho.',
    },
    vi: {
      title: 'Always / Often / Never: đặt ở đâu để nghe tự nhiên',
      shortDiagnosis: 'Bạn biết always, often và never, nhưng đặt chúng vào vị trí khiến tiếng Anh nghe gượng.',
    },
    id: {
      title: 'Always / Often / Never: posisi yang terdengar natural',
      shortDiagnosis: 'Kamu tahu always, often, dan never, tetapi menaruhnya di posisi yang membuat bahasa Inggris terdengar aneh.',
    },
    tr: {
      title: 'Always / Often / Never: doğal duyulması için nereye koymalı',
      shortDiagnosis: 'Always, often ve never kelimelerini biliyorsun ama İngilizcenin kulağa tuhaf geldiği yerlere koyuyorsun.',
    },
    pl: {
      title: 'Always / Often / Never: gdzie je stawiać, żeby brzmiało naturalnie',
      shortDiagnosis: 'Znasz always, often i never, ale stawiasz je tam, gdzie angielski zaczyna brzmieć nienaturalnie.',
    },
  },
  article_a_an: {
    es: {
      title: 'A o An: elegir por sonido',
      shortDiagnosis: 'Confundes a y an: probablemente miras la letra, no escuchas el sonido.',
    },
    'pt-BR': {
      title: 'A ou An: escolha pelo som',
      shortDiagnosis: 'Você confunde a e an: provavelmente olha para a letra, não para o som.',
    },
    vi: {
      title: 'A hay An: chọn theo âm thanh',
      shortDiagnosis: 'Bạn nhầm a và an: có lẽ bạn nhìn chữ cái thay vì nghe âm.',
    },
    id: {
      title: 'A atau An: pilih berdasarkan bunyi',
      shortDiagnosis: 'Kamu tertukar a dan an: kemungkinan kamu melihat huruf, bukan bunyinya.',
    },
    tr: {
      title: 'A mı An mı: sese göre seç',
      shortDiagnosis: "A ve an'i karıştırıyorsun: büyük ihtimalle sese değil harfe bakıyorsun.",
    },
    pl: {
      title: 'A czy An: wybieramy po dźwięku',
      shortDiagnosis: 'Mylisz a i an: prawdopodobnie patrzysz na literę, a nie słuchasz dźwięku.',
    },
  },
  article_the_specific: {
    es: {
      title: 'The: cuando algo ya es específico',
      shortDiagnosis: 'Confundes the con a/an u omites el artículo cuando el objeto ya está claro para la otra persona.',
    },
    'pt-BR': {
      title: 'The: quando o objeto já é específico',
      shortDiagnosis: 'Você confunde the com a/an ou pula o artigo quando o objeto já está claro para o interlocutor.',
    },
    vi: {
      title: 'The: khi thứ đó đã cụ thể',
      shortDiagnosis: 'Bạn nhầm the với a/an hoặc bỏ mạo từ khi người nghe đã hiểu vật nào.',
    },
    id: {
      title: 'The: saat bendanya sudah spesifik',
      shortDiagnosis: 'Kamu mencampur the dengan a/an atau melewatkan artikel saat bendanya sudah jelas bagi lawan bicara.',
    },
    tr: {
      title: 'The: nesne artık belirliyken',
      shortDiagnosis: "Nesne karşı taraf için artık belliyken the ile a/an'i karıştırıyor ya da artikeli atlıyorsun.",
    },
    pl: {
      title: 'The: kiedy rzecz jest już konkretna',
      shortDiagnosis: 'Mylisz the z a/an albo pomijasz przedimek, gdy rzecz jest już jasna dla rozmówcy.',
    },
  },
  article_zero: {
    es: {
      title: 'Zero Article: cuando no usamos artículo',
      shortDiagnosis: 'Usas artículo donde el inglés muchas veces deja la palabra sin artículo.',
    },
    'pt-BR': {
      title: 'Zero Article: quando não usamos artigo',
      shortDiagnosis: 'Você coloca artigo onde o inglês muitas vezes deixa a palavra sem artigo.',
    },
    vi: {
      title: 'Zero Article: khi không cần mạo từ',
      shortDiagnosis: 'Bạn thêm mạo từ vào những chỗ tiếng Anh thường để danh từ không có mạo từ.',
    },
    id: {
      title: 'Zero Article: saat artikel tidak diperlukan',
      shortDiagnosis: 'Kamu memakai artikel di tempat yang dalam bahasa Inggris sering dibiarkan tanpa artikel.',
    },
    tr: {
      title: 'Zero Article: artikel gerekmediğinde',
      shortDiagnosis: 'İngilizcenin çoğu zaman artikelsiz bıraktığı yerlere artikel koyuyorsun.',
    },
    pl: {
      title: 'Zero Article: kiedy przedimek nie jest potrzebny',
      shortDiagnosis: 'Stawiasz przedimek tam, gdzie angielski często zostawia rzeczownik bez przedimka.',
    },
  },
  condition_second_basic: {
    es: {
      title: 'If I had time, I would call: situación imaginaria',
      shortDiagnosis: 'Mezclas un plan real con una situación imaginaria: If I have time, I will call vs If I had time, I would call.',
    },
    'pt-BR': {
      title: 'If I had time, I would call: situação imaginária',
      shortDiagnosis: 'Você mistura plano real e situação imaginária: If I have time, I will call vs If I had time, I would call.',
    },
    vi: {
      title: 'If I had time, I would call: tình huống giả định',
      shortDiagnosis: 'Bạn đang trộn kế hoạch thật với tình huống tưởng tượng: If I have time, I will call và If I had time, I would call.',
    },
    id: {
      title: 'If I had time, I would call: situasi imajiner',
      shortDiagnosis: 'Kamu mencampur rencana nyata dan situasi imajiner: If I have time, I will call vs If I had time, I would call.',
    },
    tr: {
      title: 'If I had time, I would call: hayali durum',
      shortDiagnosis: 'Gerçek planla hayali durumu karıştırıyorsun: If I have time, I will call ve If I had time, I would call.',
    },
    pl: {
      title: 'If I had time, I would call: sytuacja wyobrażona',
      shortDiagnosis: 'Mylisz realny plan z sytuacją wyobrażoną: If I have time, I will call vs If I had time, I would call.',
    },
  },
  condition_zero_first: {
    es: {
      title: 'If it rains, I will stay: condición real',
      shortDiagnosis: 'Pones will justo después de if, aunque el inglés normalmente deja will en el resultado.',
    },
    'pt-BR': {
      title: 'If it rains, I will stay: condição real',
      shortDiagnosis: 'Você coloca will logo depois de if, mas o inglês geralmente deixa will no resultado.',
    },
    vi: {
      title: 'If it rains, I will stay: điều kiện thật',
      shortDiagnosis: 'Bạn đặt will ngay sau if, trong khi tiếng Anh thường giữ will ở phần kết quả.',
    },
    id: {
      title: 'If it rains, I will stay: kondisi nyata',
      shortDiagnosis: 'Kamu menaruh will langsung setelah if, padahal bahasa Inggris biasanya menaruh will di bagian hasil.',
    },
    tr: {
      title: 'If it rains, I will stay: gerçek koşul',
      shortDiagnosis: "Will'i if'ten hemen sonra koyuyorsun, ama İngilizce will'i genellikle sonuç kısmında tutar.",
    },
    pl: {
      title: 'If it rains, I will stay: realny warunek',
      shortDiagnosis: 'Stawiasz will od razu po if, choć angielski zwykle trzyma will w części z rezultatem.',
    },
  },
  conjunction_logic: {
    es: {
      title: 'And / But / Because / So / If / When: cómo no romper la conexión',
      shortDiagnosis: 'Eliges and, but, because, so, if, when y although por traducción, pero hay que elegirlos por la lógica entre ideas.',
    },
    'pt-BR': {
      title: 'And / But / Because / So / If / When: como não quebrar a ligação',
      shortDiagnosis: 'Você escolhe and, but, because, so, if, when e although pela tradução, mas precisa escolher pela lógica entre as ideias.',
    },
    vi: {
      title: 'And / But / Because / So / If / When: nối ý không bị sai',
      shortDiagnosis: 'Bạn chọn and, but, because, so, if, when và although theo bản dịch, nhưng cần chọn theo quan hệ giữa các ý.',
    },
    id: {
      title: 'And / But / Because / So / If / When: agar hubungan ide tidak rusak',
      shortDiagnosis: 'Kamu memilih and, but, because, so, if, when, dan although berdasarkan terjemahan, padahal harus berdasarkan logika antaride.',
    },
    tr: {
      title: 'And / But / Because / So / If / When: bağlantıyı bozmadan kullanmak',
      shortDiagnosis: 'And, but, because, so, if, when ve although kelimelerini çeviriye göre seçiyorsun; oysa fikirler arasındaki ilişkiye göre seçmek gerekir.',
    },
    pl: {
      title: 'And / But / Because / So / If / When: jak nie zepsuć połączenia',
      shortDiagnosis: 'Wybierasz and, but, because, so, if, when i although po tłumaczeniu, a trzeba wybierać po relacji między myślami.',
    },
  },
  determiner_this_that_these_those: {
    es: {
      title: 'This / That / These / Those: una cosa o varias, cerca o lejos',
      shortDiagnosis: 'Eliges this/that/these/those por traducción, no por la situación.',
    },
    'pt-BR': {
      title: 'This / That / These / Those: um ou vários, perto ou longe',
      shortDiagnosis: 'Você escolhe this/that/these/those pela tradução, não pela situação.',
    },
    vi: {
      title: 'This / That / These / Those: một hay nhiều, gần hay xa',
      shortDiagnosis: 'Bạn chọn this/that/these/those theo bản dịch, không theo tình huống.',
    },
    id: {
      title: 'This / That / These / Those: satu atau banyak, dekat atau jauh',
      shortDiagnosis: 'Kamu memilih this/that/these/those berdasarkan terjemahan, bukan berdasarkan situasinya.',
    },
    tr: {
      title: 'This / That / These / Those: tek mi çoğul mu, yakın mı uzak mı',
      shortDiagnosis: 'This/that/these/those seçimlerini duruma göre değil, çeviriye göre yapıyorsun.',
    },
    pl: {
      title: 'This / That / These / Those: jedno czy kilka, blisko czy daleko',
      shortDiagnosis: 'Wybierasz this/that/these/those po tłumaczeniu, a nie po sytuacji.',
    },
  },
  future_present_continuous_arrangements: {
    es: {
      title: 'Present Continuous para planes futuros acordados',
      shortDiagnosis: 'Ves am meeting y piensas solo en “ahora”, aunque tomorrow puede convertirlo en un plan futuro.',
    },
    'pt-BR': {
      title: 'Present Continuous para planos futuros combinados',
      shortDiagnosis: 'Você vê am meeting e pensa só em “agora”, embora tomorrow possa transformar isso em um plano futuro.',
    },
    vi: {
      title: 'Present Continuous cho kế hoạch tương lai đã hẹn',
      shortDiagnosis: 'Bạn thấy am meeting và chỉ nghĩ là “ngay bây giờ”, dù tomorrow có thể biến nó thành kế hoạch tương lai.',
    },
    id: {
      title: 'Present Continuous untuk rencana masa depan yang sudah diatur',
      shortDiagnosis: 'Kamu melihat am meeting dan hanya berpikir “sedang sekarang”, padahal tomorrow bisa membuatnya menjadi rencana masa depan.',
    },
    tr: {
      title: 'Gelecek planları için Present Continuous',
      shortDiagnosis: 'Am meeting gördüğünde sadece “şu anda” diye düşünüyorsun, oysa tomorrow bunu gelecek planı yapabilir.',
    },
    pl: {
      title: 'Present Continuous dla ustalonych planów w przyszłości',
      shortDiagnosis: 'Widzisz am meeting i myślisz tylko “teraz”, choć tomorrow może zrobić z tego plan na przyszłość.',
    },
  },
  future_will_going_to: {
    es: {
      title: 'Will / Going to: futuro sin adivinar',
      shortDiagnosis: 'Traduces las dos formas como futuro y pierdes la diferencia: decisión ahora, promesa, predicción, plan o señales visibles.',
    },
    'pt-BR': {
      title: 'Will / Going to: futuro sem adivinhação',
      shortDiagnosis: 'Você traduz as duas formas como futuro e perde a diferença: decisão agora, promessa, previsão, plano ou sinais visíveis.',
    },
    vi: {
      title: 'Will / Going to: nói về tương lai không đoán mò',
      shortDiagnosis: 'Bạn dịch cả hai dạng là tương lai và bỏ lỡ khác biệt: quyết định lúc nói, lời hứa, dự đoán, kế hoạch hay dấu hiệu rõ ràng.',
    },
    id: {
      title: 'Will / Going to: masa depan tanpa menebak-nebak',
      shortDiagnosis: 'Kamu menerjemahkan keduanya sebagai masa depan dan kehilangan bedanya: keputusan saat ini, janji, prediksi, rencana, atau tanda yang terlihat.',
    },
    tr: {
      title: 'Will / Going to: tahmin etmeden gelecek zaman',
      shortDiagnosis: 'İki formu da gelecek diye çeviriyorsun ve farkı kaçırıyorsun: o anki karar, söz, tahmin, plan veya görünen işaret.',
    },
    pl: {
      title: 'Will / Going to: przyszłość bez zgadywania',
      shortDiagnosis: 'Tłumaczysz obie formy jako przyszłość i gubisz różnicę: decyzja teraz, obietnica, prognoza, plan albo widoczne oznaki.',
    },
  },
  imperative_basic: {
    es: {
      title: 'Órdenes y peticiones: Open / Don’t open',
      shortDiagnosis: 'Añades you, to o no donde el inglés necesita una orden corta.',
    },
    'pt-BR': {
      title: 'Comandos e pedidos: Open / Don’t open',
      shortDiagnosis: 'Você acrescenta you, to ou no onde o inglês precisa de um comando curto.',
    },
    vi: {
      title: 'Mệnh lệnh và yêu cầu: Open / Don’t open',
      shortDiagnosis: 'Bạn thêm you, to hoặc no vào chỗ tiếng Anh chỉ cần một câu lệnh ngắn.',
    },
    id: {
      title: 'Perintah dan permintaan: Open / Don’t open',
      shortDiagnosis: 'Kamu menambahkan you, to, atau no di tempat bahasa Inggris membutuhkan perintah singkat.',
    },
    tr: {
      title: 'Komutlar ve istekler: Open / Don’t open',
      shortDiagnosis: 'İngilizcenin kısa bir komuta ihtiyaç duyduğu yerde you, to veya no ekliyorsun.',
    },
    pl: {
      title: 'Polecenia i prośby: Open / Don’t open',
      shortDiagnosis: 'Dodajesz you, to albo no tam, gdzie angielski potrzebuje krótkiego polecenia.',
    },
  },
  infinitive_vs_gerund_basic: {
    es: {
      title: 'To learn / Learning: combinaciones ya hechas',
      shortDiagnosis: 'Adivinas si decir to learn o learning, porque la traducción parece igual.',
    },
    'pt-BR': {
      title: 'To learn / Learning: combinações prontas',
      shortDiagnosis: 'Você tenta adivinhar se deve dizer to learn ou learning, porque a tradução parece igual.',
    },
    vi: {
      title: 'To learn / Learning: các cụm dùng sẵn',
      shortDiagnosis: 'Bạn đoán xem nên nói to learn hay learning, vì khi dịch ra thì trông như nhau.',
    },
    id: {
      title: 'To learn / Learning: pasangan yang sudah tetap',
      shortDiagnosis: 'Kamu menebak harus memakai to learn atau learning, karena terjemahannya terlihat sama.',
    },
    tr: {
      title: 'To learn / Learning: hazır kalıplar',
      shortDiagnosis: 'To learn mı learning mi demek gerektiğini tahmin ediyorsun, çünkü çeviride ikisi aynı görünüyor.',
    },
    pl: {
      title: 'To learn / Learning: gotowe połączenia',
      shortDiagnosis: 'Zgadujesz, czy powiedzieć to learn czy learning, bo w tłumaczeniu wygląda to tak samo.',
    },
  },
  modal_base_form: {
    es: {
      title: 'Can, should, must: acción sin cola extra',
      shortDiagnosis: 'Añades una palabra o terminación extra después de can, should, must y palabras parecidas.',
    },
    'pt-BR': {
      title: 'Can, should, must: verbo sem pedaço extra',
      shortDiagnosis: 'Você adiciona uma palavra ou terminação extra depois de can, should, must e palavras parecidas.',
    },
    vi: {
      title: 'Can, should, must: động từ không có phần thừa phía sau',
      shortDiagnosis: 'Bạn thêm từ hoặc đuôi thừa sau can, should, must và những từ tương tự.',
    },
    id: {
      title: 'Can, should, must: aksi tanpa tambahan yang tidak perlu',
      shortDiagnosis: 'Kamu menambahkan kata atau akhiran ekstra setelah can, should, must, dan kata sejenisnya.',
    },
    tr: {
      title: 'Can, should, must: fazladan ek olmadan eylem',
      shortDiagnosis: 'Can, should, must ve benzerlerinden sonra fazladan kelime ya da ek ekliyorsun.',
    },
    pl: {
      title: 'Can, should, must: czasownik bez zbędnego dodatku',
      shortDiagnosis: 'Dodajesz zbędne słowo albo końcówkę po can, should, must i podobnych słowach.',
    },
  },
  modal_can_could_ability_request: {
    es: {
      title: 'Can / Could: puedo ahora, podía antes, petición',
      shortDiagnosis: 'Mezclas can y could: habilidad presente, habilidad pasada, petición y forma después del modal.',
    },
    'pt-BR': {
      title: 'Can / Could: posso agora, podia antes, pedido',
      shortDiagnosis: 'Você mistura can e could: habilidade no presente, habilidade no passado, pedido e a forma depois do modal.',
    },
    vi: {
      title: 'Can / Could: có thể bây giờ, đã có thể trước đây, lời nhờ',
      shortDiagnosis: 'Bạn trộn can và could: khả năng hiện tại, khả năng trong quá khứ, lời nhờ và dạng động từ sau modal.',
    },
    id: {
      title: 'Can / Could: bisa sekarang, dulu bisa, permintaan',
      shortDiagnosis: 'Kamu mencampur can dan could: kemampuan sekarang, kemampuan dulu, permintaan, dan bentuk setelah modal.',
    },
    tr: {
      title: 'Can / Could: şimdi yapabilirim, eskiden yapabiliyordum, rica',
      shortDiagnosis: 'Can ve could kullanımını karıştırıyorsun: şimdiki beceri, geçmiş beceri, rica ve modaldan sonraki fiil formu.',
    },
    pl: {
      title: 'Can / Could: mogę teraz, mogłem wcześniej, prośba',
      shortDiagnosis: 'Mylisz can i could: umiejętność teraz, umiejętność w przeszłości, prośbę i formę po czasowniku modalnym.',
    },
  },
  modal_force: {
    es: {
      title: 'Can / Should / Must: elegir la fuerza',
      shortDiagnosis: 'Eliges una palabra parecida, pero cambias el sentido: se puede, conviene, hay que, no se puede o no es obligatorio.',
    },
    'pt-BR': {
      title: 'Can / Should / Must: escolhendo a força',
      shortDiagnosis: 'Você escolhe uma palavra parecida, mas muda o sentido: pode, deveria, precisa, não pode ou não é obrigatório.',
    },
    vi: {
      title: 'Can / Should / Must: chọn đúng mức độ',
      shortDiagnosis: 'Bạn chọn một từ có vẻ giống nhau nhưng làm đổi nghĩa: được phép, nên, phải, không được hoặc không bắt buộc.',
    },
    id: {
      title: 'Can / Should / Must: memilih tingkat kekuatan',
      shortDiagnosis: 'Kamu memilih kata yang mirip, tetapi mengubah makna: boleh, sebaiknya, harus, tidak boleh, atau tidak wajib.',
    },
    tr: {
      title: 'Can / Should / Must: anlam gücünü seçmek',
      shortDiagnosis: 'Benzer görünen bir kelime seçiyorsun ama anlamı değiştiriyorsun: yapılabilir, yapılmalı, zorunlu, yasak veya şart değil.',
    },
    pl: {
      title: 'Can / Should / Must: wybieramy siłę znaczenia',
      shortDiagnosis: 'Wybierasz podobne słowo, ale zmieniasz sens: można, warto, trzeba, nie wolno albo nie trzeba.',
    },
  },
  modal_may_might_probability: {
    es: {
      title: 'May / Might: posible, pero no seguro',
      shortDiagnosis: 'Mezclas probabilidad con habilidad, futuro seguro y errores después de may/might.',
    },
    'pt-BR': {
      title: 'May / Might: possível, mas não certo',
      shortDiagnosis: 'Você mistura probabilidade com habilidade, futuro certo e erros depois de may/might.',
    },
    vi: {
      title: 'May / Might: có thể, nhưng không chắc',
      shortDiagnosis: 'Bạn trộn khả năng xảy ra với năng lực, tương lai chắc chắn và lỗi sau may/might.',
    },
    id: {
      title: 'May / Might: mungkin, tetapi belum pasti',
      shortDiagnosis: 'Kamu mencampur kemungkinan dengan kemampuan, masa depan yang pasti, dan kesalahan setelah may/might.',
    },
    tr: {
      title: 'May / Might: mümkün ama kesin değil',
      shortDiagnosis: 'Olasılığı beceriyle, kesin gelecekle ve may/might sonrası form hatalarıyla karıştırıyorsun.',
    },
    pl: {
      title: 'May / Might: możliwe, ale niepewne',
      shortDiagnosis: 'Mylisz prawdopodobieństwo z umiejętnością, pewną przyszłością i błędami po may/might.',
    },
  },
  modal_should_must_have_to: {
    es: {
      title: 'Should / Must / Have to: no todo es “tengo que”',
      shortDiagnosis: 'Mezclas consejo, regla fuerte, necesidad externa, prohibición y “no es obligatorio”.',
    },
    'pt-BR': {
      title: 'Should / Must / Have to: nem tudo é “ter que”',
      shortDiagnosis: 'Você mistura conselho, regra forte, necessidade externa, proibição e “não é obrigatório”.',
    },
    vi: {
      title: 'Should / Must / Have to: không phải cái nào cũng là “phải”',
      shortDiagnosis: 'Bạn trộn lời khuyên, quy tắc nghiêm, nhu cầu từ bên ngoài, lệnh cấm và “không bắt buộc”.',
    },
    id: {
      title: 'Should / Must / Have to: tidak semuanya berarti “harus”',
      shortDiagnosis: 'Kamu mencampur saran, aturan tegas, kebutuhan dari luar, larangan, dan “tidak wajib”.',
    },
    tr: {
      title: 'Should / Must / Have to: hepsi “zorunda” demek değil',
      shortDiagnosis: 'Tavsiye, katı kural, dış zorunluluk, yasak ve “gerek yok” anlamlarını karıştırıyorsun.',
    },
    pl: {
      title: 'Should / Must / Have to: nie każde znaczy “muszę”',
      shortDiagnosis: 'Mylisz radę, twardą zasadę, zewnętrzną konieczność, zakaz i “nie trzeba”.',
    },
  },
  modifier_very_really_quite: {
    es: {
      title: 'Very / Really / Quite: matices de intensidad',
      shortDiagnosis: 'Conoces very, really y quite, pero los eliges como si todos fueran “muy”. Por eso la frase suena demasiado fuerte o poco natural.',
    },
    'pt-BR': {
      title: 'Very / Really / Quite: nuances de intensidade',
      shortDiagnosis: 'Você conhece very, really e quite, mas trata tudo como “muito”. A frase fica forte demais ou pouco natural.',
    },
    vi: {
      title: 'Very / Really / Quite: sắc thái nhấn mạnh',
      shortDiagnosis: 'Bạn biết very, really và quite, nhưng dùng chúng như cùng một nghĩa “rất”. Vì vậy câu nghe quá mạnh hoặc không tự nhiên.',
    },
    id: {
      title: 'Very / Really / Quite: nuansa penekanan',
      shortDiagnosis: 'Kamu tahu very, really, dan quite, tetapi memakainya seolah semuanya berarti “sangat”. Akibatnya kalimat terdengar terlalu keras atau tidak natural.',
    },
    tr: {
      title: 'Very / Really / Quite: vurgu tonları',
      shortDiagnosis: 'Very, really ve quite kelimelerini biliyorsun ama hepsini “çok” gibi seçiyorsun. Bu yüzden cümle ya fazla sert ya da doğal olmayan bir tona kayıyor.',
    },
    pl: {
      title: 'Very / Really / Quite: odcienie wzmocnienia',
      shortDiagnosis: 'Znasz very, really i quite, ale wybierasz je jak jedno “bardzo”. Przez to zdanie brzmi za mocno albo nienaturalnie.',
    },
  },
  noun_possessive_apostrophe_s: {
    es: {
      title: "John's phone / friends' car: a quién pertenece",
      shortDiagnosis: "Saltas el apóstrofo o lo pones donde no va: Johns phone, friend's en vez de friends'.",
    },
    'pt-BR': {
      title: "John's phone / friends' car: a quem pertence",
      shortDiagnosis: "Você pula o apóstrofo ou coloca no lugar errado: Johns phone, friend's em vez de friends'.",
    },
    vi: {
      title: "John's phone / friends' car: vật thuộc về ai",
      shortDiagnosis: "Bạn bỏ dấu apostrophe hoặc đặt sai chỗ: Johns phone, friend's thay vì friends'.",
    },
    id: {
      title: "John's phone / friends' car: milik siapa",
      shortDiagnosis: "Kamu melewatkan apostrof atau menaruhnya di tempat yang salah: Johns phone, friend's bukannya friends'.",
    },
    tr: {
      title: "John's phone / friends' car: eşya kime ait",
      shortDiagnosis: "Apostrofu atlıyor ya da yanlış yere koyuyorsun: friends' yerine Johns phone veya friend's.",
    },
    pl: {
      title: "John's phone / friends' car: do kogo należy rzecz",
      shortDiagnosis: "Pomijasz apostrof albo stawiasz go w złym miejscu: Johns phone, friend's zamiast friends'.",
    },
  },
  noun_singular_plural_basic: {
    es: {
      title: 'Book / Books: una cosa o varias',
      shortDiagnosis: 'Usas una forma de la palabra donde el inglés pide otra.',
    },
    'pt-BR': {
      title: 'Book / Books: uma coisa ou várias',
      shortDiagnosis: 'Você usa uma forma da palavra quando o inglês pede outra.',
    },
    vi: {
      title: 'Book / Books: một vật hay nhiều vật',
      shortDiagnosis: 'Bạn dùng một dạng của từ trong khi tiếng Anh cần dạng khác.',
    },
    id: {
      title: 'Book / Books: satu benda atau beberapa benda',
      shortDiagnosis: 'Kamu memakai satu bentuk kata di tempat bahasa Inggris meminta bentuk yang lain.',
    },
    tr: {
      title: 'Book / Books: tek şey mi birden fazla mı',
      shortDiagnosis: 'İngilizcenin başka bir form istediği yerde kelimenin tek bir formunu kullanıyorsun.',
    },
    pl: {
      title: 'Book / Books: jedna rzecz czy kilka',
      shortDiagnosis: 'Używasz jednej formy słowa tam, gdzie angielski wymaga innej.',
    },
  },
  object_order_give_me_it: {
    es: {
      title: 'Give me the book / Give it to me: orden sin lío',
      shortDiagnosis: 'Mezclas dos órdenes correctos y terminas creando frases raras como give me it.',
    },
    'pt-BR': {
      title: 'Give me the book / Give it to me: ordem sem bagunça',
      shortDiagnosis: 'Você mistura duas ordens corretas e acaba criando frases estranhas como give me it.',
    },
    vi: {
      title: 'Give me the book / Give it to me: trật tự câu không rối',
      shortDiagnosis: 'Bạn trộn hai trật tự đúng và tạo ra những câu lạ như give me it.',
    },
    id: {
      title: 'Give me the book / Give it to me: urutan tanpa bingung',
      shortDiagnosis: 'Kamu mencampur dua urutan yang benar dan menghasilkan frasa aneh seperti give me it.',
    },
    tr: {
      title: 'Give me the book / Give it to me: karışmadan kelime sırası',
      shortDiagnosis: 'İki doğru sıralamayı karıştırıp give me it gibi tuhaf ifadeler çıkarıyorsun.',
    },
    pl: {
      title: 'Give me the book / Give it to me: szyk bez chaosu',
      shortDiagnosis: 'Mieszasz dwa poprawne szyki i wychodzą dziwne frazy typu give me it.',
    },
  },
  past_continuous_basic: {
    es: {
      title: 'Past Continuous: proceso en el pasado',
      shortDiagnosis: 'Quieres decir que la acción estaba ocurriendo en ese momento, pero olvidas was/were o dejas el verbo sin -ing.',
    },
    'pt-BR': {
      title: 'Past Continuous: processo no passado',
      shortDiagnosis: 'Você quer dizer que a ação estava acontecendo naquele momento, mas esquece was/were ou deixa o verbo sem -ing.',
    },
    vi: {
      title: 'Past Continuous: hành động đang diễn ra trong quá khứ',
      shortDiagnosis: 'Bạn muốn nói hành động đang diễn ra vào thời điểm đó, nhưng quên was/were hoặc để động từ thiếu -ing.',
    },
    id: {
      title: 'Past Continuous: proses yang sedang berlangsung di masa lalu',
      shortDiagnosis: 'Kamu ingin mengatakan bahwa aksi sedang berlangsung saat itu, tetapi lupa was/were atau memakai kata kerja tanpa -ing.',
    },
    tr: {
      title: 'Past Continuous: geçmişte devam eden süreç',
      shortDiagnosis: 'O anda eylemin devam ettiğini söylemek istiyorsun ama was/were unutuluyor ya da fiil -ing olmadan kalıyor.',
    },
    pl: {
      title: 'Past Continuous: proces w przeszłości',
      shortDiagnosis: 'Chcesz powiedzieć, że czynność trwała w tamtym momencie, ale zapominasz was/were albo zostawiasz czasownik bez -ing.',
    },
  },
  past_simple_vs_past_continuous: {
    es: {
      title: 'Past Simple vs Past Continuous: hecho o proceso',
      shortDiagnosis: 'Ves una sola traducción en pasado, pero no decides el papel de la acción: hecho, evento o proceso de fondo.',
    },
    'pt-BR': {
      title: 'Past Simple vs Past Continuous: fato ou processo',
      shortDiagnosis: 'Você vê uma tradução no passado, mas não decide o papel da ação: fato, evento ou processo de fundo.',
    },
    vi: {
      title: 'Past Simple vs Past Continuous: sự kiện hay quá trình',
      shortDiagnosis: 'Bạn thấy cùng một bản dịch quá khứ, nhưng chưa quyết định vai trò của hành động: sự kiện, việc xảy ra hay quá trình nền.',
    },
    id: {
      title: 'Past Simple vs Past Continuous: fakta atau proses',
      shortDiagnosis: 'Kamu melihat satu terjemahan masa lalu, tetapi belum menentukan peran aksinya: fakta, peristiwa, atau proses latar.',
    },
    tr: {
      title: 'Past Simple vs Past Continuous: olay mı süreç mi',
      shortDiagnosis: 'Geçmiş zamanda tek bir çeviri görüyorsun ama eylemin rolünü seçmiyorsun: gerçek, olay ya da arka plandaki süreç.',
    },
    pl: {
      title: 'Past Simple vs Past Continuous: fakt czy proces',
      shortDiagnosis: 'Widzisz jedno tłumaczenie w przeszłości, ale nie wybierasz roli czynności: fakt, wydarzenie czy proces w tle.',
    },
  },
};

export function getPersonalTrainingSummarySourceLocales(id: string): PersonalTrainingSummarySourceLocaleMap {
  return PERSONAL_TRAINING_SUMMARY_SOURCE_LOCALES[id] ?? {};
}
