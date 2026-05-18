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
  phrasal_particle_pair: {
    es: {
      title: 'Turn on / look up: aprende la pareja completa',
      shortDiagnosis: 'Ves el primer verbo, pero pierdes la partícula corta después. Por eso cambia el sentido de toda la frase.',
    },
    'pt-BR': {
      title: 'Turn on / look up: aprenda o par completo',
      shortDiagnosis: 'Você vê o primeiro verbo, mas perde a partícula curta depois dele. Por isso o sentido da frase muda.',
    },
    vi: {
      title: 'Turn on / look up: học cả cụm, không tách rời',
      shortDiagnosis: 'Bạn nhìn thấy động từ đầu tiên, nhưng bỏ mất phần ngắn phía sau. Vì vậy nghĩa của cả cụm bị đổi.',
    },
    id: {
      title: 'Turn on / look up: pelajari pasangannya utuh',
      shortDiagnosis: 'Kamu melihat kata kerja pertama, tetapi kehilangan partikel pendek setelahnya. Akibatnya makna frasa berubah.',
    },
    tr: {
      title: 'Turn on / look up: çifti bütün öğren',
      shortDiagnosis: 'İlk fiili görüyorsun ama arkasındaki kısa parçayı kaçırıyorsun. Bu yüzden tüm ifadenin anlamı değişiyor.',
    },
    pl: {
      title: 'Turn on / look up: ucz się całej pary',
      shortDiagnosis: 'Widzisz pierwszy czasownik, ale gubisz krótką cząstkę po nim. Przez to zmienia się sens całej frazy.',
    },
  },
  preposition_common_verb_patterns: {
    es: {
      title: 'Listen to / Wait for / Depend on: bloques fijos',
      shortDiagnosis: 'Sabes las palabras, pero pierdes el pequeño cierre: listen to, wait for, depend on, look at.',
    },
    'pt-BR': {
      title: 'Listen to / Wait for / Depend on: blocos fixos',
      shortDiagnosis: 'Você conhece as palavras, mas perde a pequena parte final: listen to, wait for, depend on, look at.',
    },
    vi: {
      title: 'Listen to / Wait for / Depend on: cụm cố định',
      shortDiagnosis: 'Bạn biết các từ riêng lẻ, nhưng bỏ mất phần đuôi nhỏ: listen to, wait for, depend on, look at.',
    },
    id: {
      title: 'Listen to / Wait for / Depend on: pasangan tetap',
      shortDiagnosis: 'Kamu tahu kata-katanya, tetapi kehilangan bagian kecil di belakang: listen to, wait for, depend on, look at.',
    },
    tr: {
      title: 'Listen to / Wait for / Depend on: kalıp bağlar',
      shortDiagnosis: 'Kelimeleri biliyorsun ama küçük son parçayı kaçırıyorsun: listen to, wait for, depend on, look at.',
    },
    pl: {
      title: 'Listen to / Wait for / Depend on: gotowe połączenia',
      shortDiagnosis: 'Znasz słowa, ale gubisz mały ogon: listen to, wait for, depend on, look at.',
    },
  },
  preposition_direction: {
    es: {
      title: 'Home / Onto / Out of: trampas de dirección',
      shortDiagnosis: 'Reconoces la palabra, pero eliges el bloque pequeño equivocado: to home, on en vez de onto, from en vez de out of.',
    },
    'pt-BR': {
      title: 'Home / Onto / Out of: armadilhas de direção',
      shortDiagnosis: 'Você reconhece a palavra, mas escolhe o bloco pequeno errado: to home, on em vez de onto, from em vez de out of.',
    },
    vi: {
      title: 'Home / Onto / Out of: bẫy hướng di chuyển',
      shortDiagnosis: 'Bạn nhận ra từ quen thuộc, nhưng chọn sai mảnh nhỏ: to home, on thay vì onto, from thay vì out of.',
    },
    id: {
      title: 'Home / Onto / Out of: jebakan arah',
      shortDiagnosis: 'Kamu mengenali katanya, tetapi memilih potongan kecil yang salah: to home, on alih-alih onto, from alih-alih out of.',
    },
    tr: {
      title: 'Home / Onto / Out of: yön tuzakları',
      shortDiagnosis: 'Tanıdık kelimeyi görüyorsun ama küçük parçayı yanlış seçiyorsun: to home, onto yerine on, out of yerine from.',
    },
    pl: {
      title: 'Home / Onto / Out of: pułapki kierunku',
      shortDiagnosis: 'Rozpoznajesz słowo, ale wybierasz zły mały element: to home, on zamiast onto, from zamiast out of.',
    },
  },
  preposition_direction_to_into_from: {
    es: {
      title: 'To / Into / From / Out of: hacia dónde va la acción',
      shortDiagnosis: 'Mezclas palabras pequeñas de movimiento: hacia un lugar, hacia dentro, desde un lugar y desde dentro hacia fuera.',
    },
    'pt-BR': {
      title: 'To / Into / From / Out of: para onde a ação se move',
      shortDiagnosis: 'Você mistura pequenas palavras de movimento: para um lugar, para dentro, de um lugar e de dentro para fora.',
    },
    vi: {
      title: 'To / Into / From / Out of: hành động đi theo hướng nào',
      shortDiagnosis: 'Bạn nhầm các từ nhỏ chỉ chuyển động: đến một nơi, vào bên trong, từ một nơi và từ trong ra ngoài.',
    },
    id: {
      title: 'To / Into / From / Out of: arah geraknya aksi',
      shortDiagnosis: 'Kamu mencampur kata kecil untuk gerakan: menuju tempat, masuk ke dalam, dari suatu tempat, dan keluar dari dalam.',
    },
    tr: {
      title: 'To / Into / From / Out of: eylem nereye hareket ediyor',
      shortDiagnosis: 'Hareketin küçük kelimelerini karıştırıyorsun: bir yere doğru, içeri doğru, bir yerden ve içeriden dışarı.',
    },
    pl: {
      title: 'To / Into / From / Out of: dokąd idzie ruch',
      shortDiagnosis: 'Mylisz małe słowa ruchu: do miejsca, do środka, z miejsca i ze środka na zewnątrz.',
    },
  },
  preposition_duration_for_since: {
    es: {
      title: 'For / Since: duración o punto de inicio',
      shortDiagnosis: 'Confundes for y since: uno habla de cuánto dura algo, el otro marca cuándo empezó.',
    },
    'pt-BR': {
      title: 'For / Since: duração ou ponto de início',
      shortDiagnosis: 'Você confunde for e since: um fala de quanto tempo algo dura, o outro marca quando começou.',
    },
    vi: {
      title: 'For / Since: khoảng thời gian hay điểm bắt đầu',
      shortDiagnosis: 'Bạn nhầm for và since: một cái nói kéo dài bao lâu, cái kia đánh dấu lúc bắt đầu.',
    },
    id: {
      title: 'For / Since: durasi atau titik mulai',
      shortDiagnosis: 'Kamu mencampur for dan since: yang satu menyatakan lamanya, yang lain menandai kapan mulai.',
    },
    tr: {
      title: 'For / Since: süre mi başlangıç noktası mı',
      shortDiagnosis: 'For ve since karışıyor: biri ne kadar sürdüğünü, diğeri ne zaman başladığını gösterir.',
    },
    pl: {
      title: 'For / Since: czas trwania czy punkt startu',
      shortDiagnosis: 'Mylisz for i since: jedno mówi, jak długo coś trwa, a drugie wskazuje, kiedy się zaczęło.',
    },
  },
  preposition_place_in_on_at: {
    es: {
      title: 'In / On / At: lugar',
      shortDiagnosis: 'Confundes in, on y at para lugar: dentro, superficie o punto concreto.',
    },
    'pt-BR': {
      title: 'In / On / At: lugar',
      shortDiagnosis: 'Você confunde in, on e at para lugar: dentro, superfície ou ponto específico.',
    },
    vi: {
      title: 'In / On / At: địa điểm',
      shortDiagnosis: 'Bạn nhầm in, on và at khi nói nơi chốn: bên trong, bề mặt hay một điểm cụ thể.',
    },
    id: {
      title: 'In / On / At: tempat',
      shortDiagnosis: 'Kamu mencampur in, on, dan at untuk tempat: di dalam, di permukaan, atau di titik tertentu.',
    },
    tr: {
      title: 'In / On / At: yer',
      shortDiagnosis: 'Yer anlatırken in, on ve at karışıyor: içeride, yüzeyde ya da belirli bir noktada.',
    },
    pl: {
      title: 'In / On / At: miejsce',
      shortDiagnosis: 'Mylisz in, on i at dla miejsca: w środku, na powierzchni albo w konkretnym punkcie.',
    },
  },
  preposition_time_in_on_at: {
    es: {
      title: 'In / On / At: tiempo',
      shortDiagnosis: 'Confundes in, on y at para tiempo: hora exacta, día/fecha o período amplio.',
    },
    'pt-BR': {
      title: 'In / On / At: tempo',
      shortDiagnosis: 'Você confunde in, on e at para tempo: hora exata, dia/data ou período amplo.',
    },
    vi: {
      title: 'In / On / At: thời gian',
      shortDiagnosis: 'Bạn nhầm in, on và at khi nói thời gian: giờ cụ thể, ngày/ngày tháng hay khoảng thời gian rộng.',
    },
    id: {
      title: 'In / On / At: waktu',
      shortDiagnosis: 'Kamu mencampur in, on, dan at untuk waktu: jam tepat, hari/tanggal, atau periode yang luas.',
    },
    tr: {
      title: 'In / On / At: zaman',
      shortDiagnosis: 'Zaman anlatırken in, on ve at karışıyor: tam saat, gün/tarih ya da geniş dönem.',
    },
    pl: {
      title: 'In / On / At: czas',
      shortDiagnosis: 'Mylisz in, on i at dla czasu: dokładną godzinę, dzień/datę albo szerszy okres.',
    },
  },
  preposition_time_place: {
    es: {
      title: 'In / On / At: lugar o tiempo',
      shortDiagnosis: 'Traduces directo y por eso se mezclan. Primero decide si hablas de lugar o de tiempo.',
    },
    'pt-BR': {
      title: 'In / On / At: lugar ou tempo',
      shortDiagnosis: 'Você traduz direto e por isso mistura tudo. Primeiro decida se está falando de lugar ou de tempo.',
    },
    vi: {
      title: 'In / On / At: nơi chốn hay thời gian',
      shortDiagnosis: 'Bạn dịch thẳng nên dễ lẫn. Trước tiên hãy xác định đang nói về nơi chốn hay thời gian.',
    },
    id: {
      title: 'In / On / At: tempat atau waktu',
      shortDiagnosis: 'Kamu menerjemahkan langsung, jadi semuanya tercampur. Tentukan dulu ini tentang tempat atau waktu.',
    },
    tr: {
      title: 'In / On / At: yer mi zaman mı',
      shortDiagnosis: 'Doğrudan çevirince hepsi karışıyor. Önce yerden mi zamandan mı söz ettiğini seç.',
    },
    pl: {
      title: 'In / On / At: miejsce czy czas',
      shortDiagnosis: 'Tłumaczysz wprost i wszystko się miesza. Najpierw ustal, czy chodzi o miejsce, czy o czas.',
    },
  },
  present_perfect_for_since: {
    es: {
      title: 'Present Perfect: for o since',
      shortDiagnosis: 'Mezclas for three years y since 2020, y se rompe la frase sobre cuánto tiempo sigue algo.',
    },
    'pt-BR': {
      title: 'Present Perfect: for ou since',
      shortDiagnosis: 'Você mistura for three years e since 2020, e a frase sobre há quanto tempo algo continua fica quebrada.',
    },
    vi: {
      title: 'Present Perfect: for hay since',
      shortDiagnosis: 'Bạn nhầm for three years và since 2020, nên câu nói về việc điều gì đó kéo dài bao lâu bị sai.',
    },
    id: {
      title: 'Present Perfect: for atau since',
      shortDiagnosis: 'Kamu mencampur for three years dan since 2020, sehingga kalimat tentang sudah berapa lama sesuatu berlangsung jadi rusak.',
    },
    tr: {
      title: 'Present Perfect: for mı since mi',
      shortDiagnosis: 'For three years ile since 2020 karışıyor; bu yüzden bir şeyin ne kadar süredir devam ettiğini anlatan cümle bozuluyor.',
    },
    pl: {
      title: 'Present Perfect: for czy since',
      shortDiagnosis: 'Mylisz for three years i since 2020, więc zdanie o tym, jak długo coś trwa, zaczyna się psuć.',
    },
  },
  present_perfect_questions_negatives: {
    es: {
      title: 'Present Perfect: preguntas y negativos',
      shortDiagnosis: 'Usas did, olvidas poner have/has al principio o eliges see después de haven’t en vez de seen.',
    },
    'pt-BR': {
      title: 'Present Perfect: perguntas e negativos',
      shortDiagnosis: 'Você usa did, esquece de colocar have/has no começo ou usa see depois de haven’t em vez de seen.',
    },
    vi: {
      title: 'Present Perfect: câu hỏi và phủ định',
      shortDiagnosis: 'Bạn dùng did, quên đưa have/has lên đầu hoặc dùng see sau haven’t thay vì seen.',
    },
    id: {
      title: 'Present Perfect: pertanyaan dan negatif',
      shortDiagnosis: 'Kamu memakai did, lupa menaruh have/has di depan, atau memakai see setelah haven’t, bukan seen.',
    },
    tr: {
      title: 'Present Perfect: sorular ve olumsuzlar',
      shortDiagnosis: 'Did kullanıyor, have/has öğesini başa almayı unutuyor ya da haven’t sonrası seen yerine see kullanıyorsun.',
    },
    pl: {
      title: 'Present Perfect: pytania i przeczenia',
      shortDiagnosis: 'Używasz did, zapominasz dać have/has na początek albo po haven’t wybierasz see zamiast seen.',
    },
  },
  present_perfect_vs_past_simple: {
    es: {
      title: 'Present Perfect vs Past Simple: resultado ahora o tiempo pasado',
      shortDiagnosis: 'Ves una traducción parecida y no sabes cuándo usar have done y cuándo usar did.',
    },
    'pt-BR': {
      title: 'Present Perfect vs Past Simple: resultado agora ou tempo passado',
      shortDiagnosis: 'Você vê uma tradução parecida e não sabe quando usar have done e quando usar did.',
    },
    vi: {
      title: 'Present Perfect vs Past Simple: kết quả hiện tại hay thời điểm quá khứ',
      shortDiagnosis: 'Bạn thấy bản dịch gần giống nhau và không biết khi nào dùng have done, khi nào dùng did.',
    },
    id: {
      title: 'Present Perfect vs Past Simple: hasil sekarang atau waktu lampau',
      shortDiagnosis: 'Kamu melihat terjemahan yang mirip dan tidak tahu kapan memakai have done dan kapan memakai did.',
    },
    tr: {
      title: 'Present Perfect vs Past Simple: şu anki sonuç mu geçmiş zaman mı',
      shortDiagnosis: 'Benzer bir çeviri görüyorsun ve ne zaman have done, ne zaman did kullanacağını seçemiyorsun.',
    },
    pl: {
      title: 'Present Perfect vs Past Simple: wynik teraz czy czas w przeszłości',
      shortDiagnosis: 'Widzisz podobne tłumaczenie i nie wiesz, kiedy użyć have done, a kiedy did.',
    },
  },
  pronoun_case: {
    es: {
      title: 'I / Me, He / Him: quién hace y a quién afecta',
      shortDiagnosis: 'Confundes pronombres de sujeto y de objeto: I/me, he/him, she/her, we/us, they/them.',
    },
    'pt-BR': {
      title: 'I / Me, He / Him: quem faz e quem recebe',
      shortDiagnosis: 'Você confunde pronomes de sujeito e de objeto: I/me, he/him, she/her, we/us, they/them.',
    },
    vi: {
      title: 'I / Me, He / Him: ai làm và ai bị tác động',
      shortDiagnosis: 'Bạn nhầm đại từ chủ ngữ và đại từ tân ngữ: I/me, he/him, she/her, we/us, they/them.',
    },
    id: {
      title: 'I / Me, He / Him: siapa melakukan dan siapa terkena',
      shortDiagnosis: 'Kamu mencampur kata ganti subjek dan objek: I/me, he/him, she/her, we/us, they/them.',
    },
    tr: {
      title: 'I / Me, He / Him: kim yapıyor, kime oluyor',
      shortDiagnosis: 'Özne zamirleriyle nesne zamirlerini karıştırıyorsun: I/me, he/him, she/her, we/us, they/them.',
    },
    pl: {
      title: 'I / Me, He / Him: kto robi i kogo dotyczy',
      shortDiagnosis: 'Mylisz zaimki podmiotu i dopełnienia: I/me, he/him, she/her, we/us, they/them.',
    },
  },
  pronoun_possessive: {
    es: {
      title: 'My o mine: de quién es',
      shortDiagnosis: 'Confundes la palabra que va antes del objeto con la palabra que reemplaza el objeto.',
    },
    'pt-BR': {
      title: 'My ou mine: de quem é',
      shortDiagnosis: 'Você confunde a palavra que vem antes do objeto com a palavra que substitui o objeto.',
    },
    vi: {
      title: 'My hay mine: của ai',
      shortDiagnosis: 'Bạn nhầm từ đứng trước đồ vật với từ thay thế cho chính đồ vật đó.',
    },
    id: {
      title: 'My atau mine: milik siapa',
      shortDiagnosis: 'Kamu mencampur kata yang berdiri sebelum benda dengan kata yang menggantikan benda itu.',
    },
    tr: {
      title: 'My mı mine mı: kime ait',
      shortDiagnosis: 'Nesneden önce gelen kelimeyle nesnenin yerine geçen kelimeyi karıştırıyorsun.',
    },
    pl: {
      title: 'My czy mine: do kogo należy',
      shortDiagnosis: 'Mylisz słowo stojące przed rzeczą ze słowem, które zastępuje tę rzecz.',
    },
  },
  quantifier_some_any: {
    es: {
      title: 'Some / Any: hay algo o no hay nada',
      shortDiagnosis: 'Mezclas some y any porque traduces la palabra, no el tipo de situación.',
    },
    'pt-BR': {
      title: 'Some / Any: existe algo ou não existe nada',
      shortDiagnosis: 'Você mistura some e any porque traduz a palavra, não o tipo de situação.',
    },
    vi: {
      title: 'Some / Any: có gì đó hay không có gì',
      shortDiagnosis: 'Bạn nhầm some và any vì dịch từng từ, thay vì nhìn kiểu tình huống.',
    },
    id: {
      title: 'Some / Any: ada sesuatu atau tidak ada sama sekali',
      shortDiagnosis: 'Kamu mencampur some dan any karena menerjemahkan katanya, bukan melihat jenis situasinya.',
    },
    tr: {
      title: 'Some / Any: bir şey var mı yok mu',
      shortDiagnosis: 'Some ve any karışıyor çünkü kelimeyi çeviriyorsun, durumun türüne bakmıyorsun.',
    },
    pl: {
      title: 'Some / Any: coś jest czy nic nie ma',
      shortDiagnosis: 'Mylisz some i any, bo tłumaczysz słowo, zamiast patrzeć na typ sytuacji.',
    },
  },
  relative_clauses_who_which_that: {
    es: {
      title: 'Who / Which / That: unir una frase',
      shortDiagnosis: 'Pones la misma palabra en todas partes, pero el inglés mira si hablas de una persona, una cosa, una idea o pertenencia.',
    },
    'pt-BR': {
      title: 'Who / Which / That: conectando a frase',
      shortDiagnosis: 'Você usa a mesma palavra em todos os casos, mas o inglês olha se é pessoa, coisa, ideia ou posse.',
    },
    vi: {
      title: 'Who / Which / That: nối câu cho đúng',
      shortDiagnosis: 'Bạn dùng một từ cho mọi trường hợp, nhưng tiếng Anh nhìn xem đó là người, vật, ý tưởng hay quan hệ sở hữu.',
    },
    id: {
      title: 'Who / Which / That: menyambung frasa',
      shortDiagnosis: 'Kamu memakai kata yang sama di semua tempat, padahal bahasa Inggris melihat apakah itu orang, benda, ide, atau kepemilikan.',
    },
    tr: {
      title: 'Who / Which / That: cümleyi bağlamak',
      shortDiagnosis: 'Her yere aynı kelimeyi koyuyorsun, ama İngilizce kişi mi, şey mi, fikir mi, aitlik mi olduğuna bakar.',
    },
    pl: {
      title: 'Who / Which / That: łączenie zdania',
      shortDiagnosis: 'Wstawiasz wszędzie to samo słowo, a angielski patrzy, czy chodzi o osobę, rzecz, ideę czy przynależność.',
    },
  },
  reported_speech_basic: {
    es: {
      title: 'He said that...: contar lo que dijo alguien',
      shortDiagnosis: 'Mantienes la forma de la cita: I am, where did I live, told that. En reported speech eso rompe la frase.',
    },
    'pt-BR': {
      title: 'He said that...: contar o que alguém disse',
      shortDiagnosis: 'Você mantém a forma da citação: I am, where did I live, told that. Em reported speech isso quebra a frase.',
    },
    vi: {
      title: 'He said that...: thuật lại lời người khác',
      shortDiagnosis: 'Bạn giữ nguyên dạng câu trực tiếp: I am, where did I live, told that. Trong reported speech, điều đó làm câu sai.',
    },
    id: {
      title: 'He said that...: menceritakan ucapan orang lain',
      shortDiagnosis: 'Kamu mempertahankan bentuk kutipan langsung: I am, where did I live, told that. Dalam reported speech, itu merusak kalimat.',
    },
    tr: {
      title: 'He said that...: birinin söylediğini aktarmak',
      shortDiagnosis: 'Alıntı biçimini olduğu gibi bırakıyorsun: I am, where did I live, told that. Reported speech içinde bu cümleyi bozar.',
    },
    pl: {
      title: 'He said that...: opowiadanie, co ktoś powiedział',
      shortDiagnosis: 'Zostawiasz kształt cytatu: I am, where did I live, told that. W reported speech to psuje zdanie.',
    },
  },
  there_is_are: {
    es: {
      title: 'There is / There are: decir que hay algo en algún sitio',
      shortDiagnosis: 'Sabes decir hay, pero eliges el bloque inglés equivocado.',
    },
    'pt-BR': {
      title: 'There is / There are: dizer que existe algo em algum lugar',
      shortDiagnosis: 'Você sabe dizer existe ou tem, mas escolhe o bloco inglês errado.',
    },
    vi: {
      title: 'There is / There are: nói rằng có thứ gì đó ở đâu đó',
      shortDiagnosis: 'Bạn biết cách nói có, nhưng chọn sai cụm tiếng Anh.',
    },
    id: {
      title: 'There is / There are: mengatakan ada sesuatu di suatu tempat',
      shortDiagnosis: 'Kamu tahu cara mengatakan ada, tetapi memilih blok bahasa Inggris yang salah.',
    },
    tr: {
      title: 'There is / There are: bir yerde bir şey var demek',
      shortDiagnosis: 'Var demeyi biliyorsun, ama İngilizcede yanlış kalıbı seçiyorsun.',
    },
    pl: {
      title: 'There is / There are: jak powiedzieć, że coś gdzieś jest',
      shortDiagnosis: 'Wiesz, jak powiedzieć jest, ale wybierasz zły angielski blok.',
    },
  },
  to_be_present_agreement: {
    es: {
      title: 'Am / Is / Are: qué forma usar',
      shortDiagnosis: 'Confundes am, is y are en presente porque no los conectas con el sujeto.',
    },
    'pt-BR': {
      title: 'Am / Is / Are: qual forma usar',
      shortDiagnosis: 'Você confunde am, is e are no presente porque não liga a forma ao sujeito.',
    },
    vi: {
      title: 'Am / Is / Are: dùng dạng nào',
      shortDiagnosis: 'Bạn nhầm am, is và are ở hiện tại vì chưa nối đúng dạng với chủ ngữ.',
    },
    id: {
      title: 'Am / Is / Are: bentuk mana yang dipakai',
      shortDiagnosis: 'Kamu mencampur am, is, dan are dalam present tense karena tidak menghubungkannya dengan subjek.',
    },
    tr: {
      title: 'Am / Is / Are: hangi biçimi kullanmalı',
      shortDiagnosis: 'Şimdiki zamanda am, is ve are karışıyor çünkü biçimi özneyle eşleştirmiyorsun.',
    },
    pl: {
      title: 'Am / Is / Are: której formy użyć',
      shortDiagnosis: 'Mylisz am, is i are w teraźniejszości, bo nie łączysz formy z podmiotem.',
    },
  },
  too_enough: {
    es: {
      title: 'Too / Enough: demasiado o suficiente',
      shortDiagnosis: 'Mezclas too y enough, y además colocas enough en el lugar equivocado.',
    },
    'pt-BR': {
      title: 'Too / Enough: demais ou suficiente',
      shortDiagnosis: 'Você mistura too e enough, e ainda coloca enough no lugar errado.',
    },
    vi: {
      title: 'Too / Enough: quá hay đủ',
      shortDiagnosis: 'Bạn nhầm too và enough, rồi còn đặt enough sai vị trí.',
    },
    id: {
      title: 'Too / Enough: terlalu atau cukup',
      shortDiagnosis: 'Kamu mencampur too dan enough, lalu menaruh enough di posisi yang salah.',
    },
    tr: {
      title: 'Too / Enough: fazla mı yeterli mi',
      shortDiagnosis: 'Too ve enough karışıyor; ayrıca enough kelimesini yanlış yere koyuyorsun.',
    },
    pl: {
      title: 'Too / Enough: zbyt czy wystarczająco',
      shortDiagnosis: 'Mylisz too i enough, a do tego stawiasz enough w złym miejscu.',
    },
  },
  used_to_basic: {
    es: {
      title: 'Used to: antes sí, ahora ya no',
      shortDiagnosis: 'Mezclas used to, did use to, be used to y hábitos que siguen ocurriendo ahora.',
    },
    'pt-BR': {
      title: 'Used to: antes era assim, agora não',
      shortDiagnosis: 'Você mistura used to, did use to, be used to e hábitos que ainda acontecem agora.',
    },
    vi: {
      title: 'Used to: trước đây có, bây giờ không còn',
      shortDiagnosis: 'Bạn nhầm used to, did use to, be used to và những thói quen vẫn đang xảy ra hiện nay.',
    },
    id: {
      title: 'Used to: dulu begitu, sekarang tidak lagi',
      shortDiagnosis: 'Kamu mencampur used to, did use to, be used to, dan kebiasaan yang masih terjadi sekarang.',
    },
    tr: {
      title: 'Used to: eskiden vardı, şimdi yok',
      shortDiagnosis: 'Used to, did use to, be used to ve şu anda devam eden alışkanlıkları karıştırıyorsun.',
    },
    pl: {
      title: 'Used to: kiedyś tak było, teraz już nie',
      shortDiagnosis: 'Mylisz used to, did use to, be used to i nawyki, które dzieją się teraz.',
    },
  },
  verb_past_simple_negative_question: {
    es: {
      title: 'Did / Didn’t: preguntas y negativos en pasado',
      shortDiagnosis: 'Intentas marcar el pasado dos veces: Did you went? I didn’t bought.',
    },
    'pt-BR': {
      title: 'Did / Didn’t: perguntas e negativos no passado',
      shortDiagnosis: 'Você tenta marcar o passado duas vezes: Did you went? I didn’t bought.',
    },
    vi: {
      title: 'Did / Didn’t: câu hỏi và phủ định ở quá khứ',
      shortDiagnosis: 'Bạn cố đánh dấu quá khứ hai lần: Did you went? I didn’t bought.',
    },
    id: {
      title: 'Did / Didn’t: pertanyaan dan negatif lampau',
      shortDiagnosis: 'Kamu mencoba menandai masa lalu dua kali: Did you went? I didn’t bought.',
    },
    tr: {
      title: 'Did / Didn’t: geçmişte soru ve olumsuz',
      shortDiagnosis: 'Geçmiş zamanı iki kez göstermeye çalışıyorsun: Did you went? I didn’t bought.',
    },
    pl: {
      title: 'Did / Didn’t: pytania i przeczenia w przeszłości',
      shortDiagnosis: 'Próbujesz pokazać przeszłość dwa razy: Did you went? I didn’t bought.',
    },
  },
  verb_past_simple_regular_irregular: {
    es: {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Hablas del pasado, pero dejas el verbo en presente o creas formas como goed y buyed.',
    },
    'pt-BR': {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Você fala do passado, mas deixa o verbo no presente ou cria formas como goed e buyed.',
    },
    vi: {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Bạn nói về quá khứ, nhưng để động từ ở hiện tại hoặc tạo dạng như goed và buyed.',
    },
    id: {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Kamu berbicara tentang masa lalu, tetapi membiarkan kata kerja bentuk sekarang atau membuat bentuk seperti goed dan buyed.',
    },
    tr: {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Geçmişten söz ediyorsun ama fiili şimdiki biçimde bırakıyor ya da goed ve buyed gibi biçimler kuruyorsun.',
    },
    pl: {
      title: 'Past Simple: worked, went, bought',
      shortDiagnosis: 'Mówisz o przeszłości, ale zostawiasz czasownik w formie teraźniejszej albo tworzysz formy typu goed i buyed.',
    },
  },
  verb_present_continuous_basic: {
    es: {
      title: 'I am working: acción ahora',
      shortDiagnosis: 'Omites am/is/are antes de -ing, o pones am/is/are y olvidas la forma con -ing.',
    },
    'pt-BR': {
      title: 'I am working: ação acontecendo agora',
      shortDiagnosis: 'Você pula am/is/are antes de -ing, ou coloca am/is/are e esquece a forma com -ing.',
    },
    vi: {
      title: 'I am working: hành động đang diễn ra bây giờ',
      shortDiagnosis: 'Bạn bỏ am/is/are trước -ing, hoặc có am/is/are nhưng quên dạng -ing.',
    },
    id: {
      title: 'I am working: aksi yang sedang terjadi sekarang',
      shortDiagnosis: 'Kamu melewatkan am/is/are sebelum -ing, atau memakai am/is/are tetapi lupa bentuk -ing.',
    },
    tr: {
      title: 'I am working: şu anda olan eylem',
      shortDiagnosis: '-ing öncesinde am/is/are atlanıyor ya da am/is/are var ama fiilde -ing unutuluyor.',
    },
    pl: {
      title: 'I am working: czynność dzieje się teraz',
      shortDiagnosis: 'Pomijasz am/is/are przed -ing albo dajesz am/is/are, ale zapominasz formy z -ing.',
    },
  },
  verb_present_perfect_basic: {
    es: {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Quieres hablar de un resultado ahora, pero rompes el patrón: have saw, has finish, I have lost my keys yesterday.',
    },
    'pt-BR': {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Você quer falar de um resultado agora, mas quebra o padrão: have saw, has finish, I have lost my keys yesterday.',
    },
    vi: {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Bạn muốn nói về kết quả hiện tại, nhưng làm sai mẫu: have saw, has finish, I have lost my keys yesterday.',
    },
    id: {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Kamu ingin berbicara tentang hasil sekarang, tetapi merusak polanya: have saw, has finish, I have lost my keys yesterday.',
    },
    tr: {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Şu anki sonuçtan söz etmek istiyorsun ama kalıbı bozuyorsun: have saw, has finish, I have lost my keys yesterday.',
    },
    pl: {
      title: 'Present Perfect: have/has + V3',
      shortDiagnosis: 'Chcesz mówić o wyniku teraz, ale psujesz wzór: have saw, has finish, I have lost my keys yesterday.',
    },
  },
  verb_present_simple_negative_question: {
    es: {
      title: 'Do / Does: preguntas y negaciones',
      shortDiagnosis: 'Confundes do y does, y dejas -s después de does.',
    },
    'pt-BR': {
      title: 'Do / Does: perguntas e negações',
      shortDiagnosis: 'Você confunde do e does, e deixa -s depois de does.',
    },
    vi: {
      title: 'Do / Does: câu hỏi và phủ định',
      shortDiagnosis: 'Bạn nhầm do và does, rồi vẫn giữ -s sau does.',
    },
    id: {
      title: 'Do / Does: pertanyaan dan negatif',
      shortDiagnosis: 'Kamu mencampur do dan does, lalu tetap meninggalkan -s setelah does.',
    },
    tr: {
      title: 'Do / Does: sorular ve olumsuzlar',
      shortDiagnosis: 'Do ve does karışıyor; ayrıca does sonrasında -s bırakıyorsun.',
    },
    pl: {
      title: 'Do / Does: pytania i przeczenia',
      shortDiagnosis: 'Mylisz do i does, a po does zostawiasz -s.',
    },
  },
  verb_present_simple_statement: {
    es: {
      title: 'I work / She works: hábitos y hechos',
      shortDiagnosis: 'Añades am/is/are o -ing donde hace falta una frase simple: I work, she works.',
    },
    'pt-BR': {
      title: 'I work / She works: hábitos e fatos',
      shortDiagnosis: 'Você coloca am/is/are ou -ing onde a frase precisa ser simples: I work, she works.',
    },
    vi: {
      title: 'I work / She works: thói quen và sự thật',
      shortDiagnosis: 'Bạn thêm am/is/are hoặc -ing vào chỗ cần một câu đơn giản: I work, she works.',
    },
    id: {
      title: 'I work / She works: kebiasaan dan fakta',
      shortDiagnosis: 'Kamu menambahkan am/is/are atau -ing di tempat yang perlu frasa biasa: I work, she works.',
    },
    tr: {
      title: 'I work / She works: alışkanlıklar ve gerçekler',
      shortDiagnosis: 'Basit bir cümle gereken yerde am/is/are ya da -ing ekliyorsun: I work, she works.',
    },
    pl: {
      title: 'I work / She works: nawyki i fakty',
      shortDiagnosis: 'Dodajesz am/is/are albo -ing tam, gdzie potrzebne jest zwykłe zdanie: I work, she works.',
    },
  },
  verb_present_simple_vs_continuous: {
    es: {
      title: 'Present Simple o Continuous: normalmente o ahora',
      shortDiagnosis: 'Traduces ambas formas como presente y eliges la estructura al azar.',
    },
    'pt-BR': {
      title: 'Present Simple ou Continuous: normalmente ou agora',
      shortDiagnosis: 'Você traduz as duas formas como presente e escolhe a estrutura no chute.',
    },
    vi: {
      title: 'Present Simple hay Continuous: thường lệ hay ngay lúc này',
      shortDiagnosis: 'Bạn dịch cả hai là thì hiện tại rồi đoán cấu trúc.',
    },
    id: {
      title: 'Present Simple atau Continuous: biasanya atau sekarang',
      shortDiagnosis: 'Kamu menerjemahkan keduanya sebagai waktu sekarang lalu menebak bentuknya.',
    },
    tr: {
      title: 'Present Simple mi Continuous mı: genelde mi şimdi mi',
      shortDiagnosis: 'İkisini de şimdiki zaman diye çeviriyor ve yapıyı tahmin ederek seçiyorsun.',
    },
    pl: {
      title: 'Present Simple czy Continuous: zwykle czy teraz',
      shortDiagnosis: 'Tłumaczysz obie formy jako teraźniejszość i zgadujesz konstrukcję.',
    },
  },
  verb_third_person: {
    es: {
      title: 'He / She / It: verbo con -s',
      shortDiagnosis: 'Olvidas el pequeño final -s/-es en afirmaciones de Present Simple con he, she e it.',
    },
    'pt-BR': {
      title: 'He / She / It: verbo com -s',
      shortDiagnosis: 'Você esquece o pequeno final -s/-es em afirmações no Present Simple com he, she e it.',
    },
    vi: {
      title: 'He / She / It: động từ có -s',
      shortDiagnosis: 'Bạn quên đuôi nhỏ -s/-es trong câu khẳng định Present Simple với he, she và it.',
    },
    id: {
      title: 'He / She / It: kata kerja dengan -s',
      shortDiagnosis: 'Kamu lupa akhiran kecil -s/-es dalam kalimat afirmatif Present Simple dengan he, she, dan it.',
    },
    tr: {
      title: 'He / She / It: fiilde -s',
      shortDiagnosis: 'He, she ve it ile Present Simple olumlu cümlelerde küçük -s/-es sonunu unutuyorsun.',
    },
    pl: {
      title: 'He / She / It: czasownik z -s',
      shortDiagnosis: 'Zapominasz małej końcówki -s/-es w zdaniach twierdzących Present Simple z he, she i it.',
    },
  },
  verb_was_were: {
    es: {
      title: 'Was / Were: be en pasado',
      shortDiagnosis: 'Confundes was y were, o dejas am/is/are cuando el sentido ya está en pasado.',
    },
    'pt-BR': {
      title: 'Was / Were: be no passado',
      shortDiagnosis: 'Você confunde was e were, ou deixa am/is/are quando o sentido já está no passado.',
    },
    vi: {
      title: 'Was / Were: be ở quá khứ',
      shortDiagnosis: 'Bạn nhầm was và were, hoặc vẫn dùng am/is/are khi nghĩa đã ở quá khứ.',
    },
    id: {
      title: 'Was / Were: be bentuk lampau',
      shortDiagnosis: 'Kamu mencampur was dan were, atau tetap memakai am/is/are ketika maknanya sudah lampau.',
    },
    tr: {
      title: 'Was / Were: be fiilinin geçmişi',
      shortDiagnosis: 'Was ve were karışıyor ya da anlam geçmişteyken am/is/are bırakıyorsun.',
    },
    pl: {
      title: 'Was / Were: be w przeszłości',
      shortDiagnosis: 'Mylisz was i were albo zostawiasz am/is/are tam, gdzie sens jest już przeszły.',
    },
  },
  word_order_basic_question: {
    es: {
      title: 'Preguntas: Do you work? / Are you ready?',
      shortDiagnosis: 'Construyes la pregunta inglesa como una afirmación con entonación, pero el inglés necesita mover el auxiliar.',
    },
    'pt-BR': {
      title: 'Perguntas: Do you work? / Are you ready?',
      shortDiagnosis: 'Você monta a pergunta em inglês como uma afirmação com entonação, mas o inglês precisa mover o auxiliar.',
    },
    vi: {
      title: 'Câu hỏi: Do you work? / Are you ready?',
      shortDiagnosis: 'Bạn tạo câu hỏi tiếng Anh như một câu khẳng định kèm ngữ điệu, nhưng tiếng Anh cần đưa trợ động từ lên trước.',
    },
    id: {
      title: 'Pertanyaan: Do you work? / Are you ready?',
      shortDiagnosis: 'Kamu membentuk pertanyaan bahasa Inggris seperti pernyataan dengan intonasi, padahal bahasa Inggris perlu memindahkan auxiliary.',
    },
    tr: {
      title: 'Sorular: Do you work? / Are you ready?',
      shortDiagnosis: 'İngilizce soruyu tonlamalı bir düz cümle gibi kuruyorsun, ama İngilizcede yardımcı fiilin öne gelmesi gerekir.',
    },
    pl: {
      title: 'Pytania: Do you work? / Are you ready?',
      shortDiagnosis: 'Budujesz angielskie pytanie jak twierdzenie z intonacją, a angielski wymaga przesunięcia operatora.',
    },
  },
  word_order_basic_statement: {
    es: {
      title: 'I like coffee: orden básico de la frase',
      shortDiagnosis: 'Sabes las palabras, pero las mueves con demasiada libertad. En inglés la frase suele sostenerse en quién + acción + qué.',
    },
    'pt-BR': {
      title: 'I like coffee: ordem básica da frase',
      shortDiagnosis: 'Você conhece as palavras, mas move tudo com liberdade demais. Em inglês, a frase costuma seguir quem + ação + o quê.',
    },
    vi: {
      title: 'I like coffee: trật tự câu cơ bản',
      shortDiagnosis: 'Bạn biết các từ, nhưng di chuyển chúng quá tự do. Câu tiếng Anh thường dựa vào ai + hành động + cái gì.',
    },
    id: {
      title: 'I like coffee: urutan dasar kalimat',
      shortDiagnosis: 'Kamu tahu kata-katanya, tetapi memindahkannya terlalu bebas. Kalimat bahasa Inggris biasanya bertumpu pada siapa + aksi + apa.',
    },
    tr: {
      title: 'I like coffee: temel cümle sırası',
      shortDiagnosis: 'Kelimeleri biliyorsun ama onları fazla serbest taşıyorsun. İngilizcede düz cümle genelde kim + eylem + ne iskeletine dayanır.',
    },
    pl: {
      title: 'I like coffee: podstawowy szyk zdania',
      shortDiagnosis: 'Znasz słowa, ale przesuwasz je zbyt swobodnie. Angielskie zdanie zwykle trzyma się szkieletu kto + czynność + co.',
    },
  },
};

export function getPersonalTrainingSummarySourceLocales(id: string): PersonalTrainingSummarySourceLocaleMap {
  return PERSONAL_TRAINING_SUMMARY_SOURCE_LOCALES[id] ?? {};
}
