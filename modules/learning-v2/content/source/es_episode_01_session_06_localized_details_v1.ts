import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для двух
// фраз сессии 6 на восьми объяснительных локалях (без 'es' — целевой язык).
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_06_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s06-es-unico': {
    ru: { meaning: 'Это единственно в своём роде', explanation: 'Так говорят о предмете или решении мужского рода, которому нет равных или замены. Тильда над ú здесь не украшение, а часть смысла: без неё слово читалось бы с другим ударением.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico без тильды над u читалось бы с другим ударением. Нужная форма пишется с тильдой: único, не unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Какой признак нужен для предмета мужского рода?', distractors: [
          { value: 'única', reason: 'Única — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico без тильды над u читалось бы с другим ударением. Нужная форма пишется с тильдой: único, не unico.', trapType: 'orthographic' },
        ]},
      ]},
    uk: { meaning: 'Це єдине у своєму роді', explanation: 'Так кажуть про предмет чи рішення чоловічого роду, якому немає рівних чи заміни. Тильда над ú тут не прикраса, а частина сенсу: без неї слово читалося б з іншим наголосом.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico без тильди над u читалося б з іншим наголосом. Потрібна форма пишеться з тильдою: único, не unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Яка ознака потрібна для предмета чоловічого роду?', distractors: [
          { value: 'única', reason: 'Única — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico без тильди над u читалося б з іншим наголосом. Потрібна форма пишеться з тильдою: único, не unico.', trapType: 'orthographic' },
        ]},
      ]},
    en: { meaning: 'It is one of a kind', explanation: 'This is how you talk about a masculine thing or decision that has no equal or replacement. The tilde over ú is not decoration here, it is part of the meaning: without it, the word would be read with a different stress.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única is the feminine form, ending in -a. A masculine noun needs the -o form: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico without the tilde over u would be read with a different stress. The correct form has a tilde: único, not unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Which quality is needed for a masculine noun?', distractors: [
          { value: 'única', reason: 'Única is the feminine form, ending in -a. A masculine noun needs the -o form: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico without the tilde over u would be read with a different stress. The correct form has a tilde: único, not unico.', trapType: 'orthographic' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é único no seu gênero', explanation: 'É assim que se fala de uma coisa ou decisão masculina que não tem igual ou substituto. O til sobre ú não é decoração aqui, é parte do significado: sem ele, a palavra seria lida com um acento diferente.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico sem o til sobre u seria lida com um acento diferente. A forma correta tem til: único, não unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Qual qualidade é necessária para um substantivo masculino?', distractors: [
          { value: 'única', reason: 'Única é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico sem o til sobre u seria lida com um acento diferente. A forma correta tem til: único, não unico.', trapType: 'orthographic' },
        ]},
      ]},
    vi: { meaning: 'Cái này là duy nhất', explanation: 'Đây là cách nói về một vật hoặc quyết định giống đực không có gì sánh bằng hay thay thế được. Dấu ngã trên ú ở đây không phải trang trí, mà là một phần của nghĩa: nếu không có nó, từ sẽ được đọc với trọng âm khác.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico không có dấu ngã trên u sẽ được đọc với trọng âm khác. Dạng đúng có dấu ngã: único, không phải unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Đặc điểm nào cần cho danh từ giống đực?', distractors: [
          { value: 'única', reason: 'Única là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico không có dấu ngã trên u sẽ được đọc với trọng âm khác. Dạng đúng có dấu ngã: único, không phải unico.', trapType: 'orthographic' },
        ]},
      ]},
    id: { meaning: 'Ini satu-satunya', explanation: 'Beginilah cara membicarakan benda atau keputusan maskulin yang tidak ada tandingannya atau penggantinya. Tanda tilde di atas ú bukan hiasan di sini, itu bagian dari makna: tanpanya, kata itu akan dibaca dengan tekanan berbeda.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico tanpa tilde di atas u akan dibaca dengan tekanan berbeda. Bentuk yang benar memiliki tilde: único, bukan unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Sifat mana yang diperlukan untuk kata benda maskulin?', distractors: [
          { value: 'única', reason: 'Única adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico tanpa tilde di atas u akan dibaca dengan tekanan berbeda. Bentuk yang benar memiliki tilde: único, bukan unico.', trapType: 'orthographic' },
        ]},
      ]},
    tr: { meaning: 'Bu tek ve eşsiz', explanation: 'Eşi ya da yerine geçecek başka bir şeyi olmayan eril bir nesne veya karar böyle anlatılır. Buradaki ú üzerindeki tilde bir süs değil, anlamın bir parçasıdır: onsuz kelime farklı bir vurguyla okunurdu.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'única', reason: 'Única, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Tildesiz unico farklı bir vurguyla okunurdu. Doğru biçimde tilde vardır: único, unico değil.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Eril bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'única', reason: 'Única, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Tildesiz unico farklı bir vurguyla okunurdu. Doğru biçimde tilde vardır: único, unico değil.', trapType: 'orthographic' },
        ]},
      ]},
    pl: { meaning: 'To jest jedyne w swoim rodzaju', explanation: 'Tak mówi się o rzeczy lub decyzji rodzaju męskiego, która nie ma sobie równych ani zamiennika. Tylda nad ú nie jest tu ozdobą, to część znaczenia: bez niej słowo czytałoby się z innym akcentem.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico bez tyldy nad u czytałoby się z innym akcentem. Poprawna forma ma tyldę: único, nie unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Jaka cecha jest potrzebna dla rzeczownika męskiego?', distractors: [
          { value: 'única', reason: 'Única to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico bez tyldy nad u czytałoby się z innym akcentem. Poprawna forma ma tyldę: único, nie unico.', trapType: 'orthographic' },
        ]},
      ]},
  },
  'es-e01-s06-es-unica': {
    ru: { meaning: 'Это единственно в своём роде (о предмете женского рода)', explanation: 'Та же оценка, но предмет женского рода — например, идея или возможность. Меняется только концовка признака: -o становится -a, а тильда над ú остаётся на месте в обеих формах.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про единственность. Нужно única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Какой признак нужен для предмета женского рода?', distractors: [
          { value: 'único', reason: 'Único — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про единственность. Нужно única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це єдине у своєму роді (про предмет жіночого роду)', explanation: 'Та сама оцінка, але предмет жіночого роду — наприклад, ідея чи можливість. Змінюється лише закінчення ознаки: -o стає -a, а тильда над ú лишається на місці в обох формах.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про єдиність. Потрібно única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Яка ознака потрібна для предмета жіночого роду?', distractors: [
          { value: 'único', reason: 'Único — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про єдиність. Потрібно única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is one of a kind (about a feminine noun)', explanation: 'The same verdict, but about a feminine noun — an idea or an opportunity, for example. Only the ending of the quality changes: -o becomes -a, while the tilde over ú stays in place in both forms.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único is the masculine form, ending in -o. A feminine noun needs the -a form: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about uniqueness. It needs única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Which quality is needed for a feminine noun?', distractors: [
          { value: 'único', reason: 'Único is the masculine form, ending in -o. A feminine noun needs the -a form: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about uniqueness. It needs única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é única no seu gênero (sobre um substantivo feminino)', explanation: 'O mesmo veredito, mas sobre um substantivo feminino — uma ideia ou uma oportunidade, por exemplo. Só a terminação da qualidade muda: -o vira -a, e o til sobre ú permanece no lugar nas duas formas.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre singularidade. Precisa de única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Qual qualidade é necessária para um substantivo feminino?', distractors: [
          { value: 'único', reason: 'Único é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre singularidade. Precisa de única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này là duy nhất (về danh từ giống cái)', explanation: 'Cùng một nhận định, nhưng về danh từ giống cái — ví dụ như một ý tưởng hay một cơ hội. Chỉ đuôi của đặc điểm thay đổi: -o thành -a, còn dấu ngã trên ú vẫn giữ nguyên ở cả hai dạng.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về sự duy nhất. Cần única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Đặc điểm nào cần cho danh từ giống cái?', distractors: [
          { value: 'único', reason: 'Único là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về sự duy nhất. Cần única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini satu-satunya (tentang kata benda feminin)', explanation: 'Penilaian yang sama, tetapi tentang kata benda feminin — sebuah ide atau peluang, misalnya. Hanya akhiran sifatnya yang berubah: -o menjadi -a, sedangkan tilde di atas ú tetap di tempatnya di kedua bentuk.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang keunikan. Perlu única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Sifat mana yang diperlukan untuk kata benda feminin?', distractors: [
          { value: 'único', reason: 'Único adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang keunikan. Perlu única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu tek ve eşsiz (dişil bir isim hakkında)', explanation: 'Aynı yargı, ama dişil bir isim hakkında — örneğin bir fikir ya da bir fırsat. Sadece niteliğin sonu değişir: -o, -a olur; ú üzerindeki tilde her iki biçimde de yerinde kalır.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'único', reason: 'Único, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera "doğru" demektir — eşsizlikle ilgisi olmayan tamamen farklı bir nitelik. Única gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Dişil bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'único', reason: 'Único, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera "doğru" demektir — eşsizlikle ilgisi olmayan tamamen farklı bir nitelik. Única gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest jedyne w swoim rodzaju (o rzeczowniku żeńskim)', explanation: 'Ten sam osąd, ale o rzeczowniku żeńskim — na przykład pomyśle czy okazji. Zmienia się tylko końcówka cechy: -o staje się -a, a tylda nad ú pozostaje na miejscu w obu formach.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o wyjątkowości. Potrzebne jest única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?', distractors: [
          { value: 'único', reason: 'Único to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o wyjątkowości. Potrzebne jest única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
