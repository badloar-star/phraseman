import type { HeisenbergSourceLocale } from './source_locales';

export type IrregularVerbSourceLocaleMap = Partial<Record<HeisenbergSourceLocale, string>>;

export interface IrregularVerb {
  base: string;
  past: string;
  pp: string;
  /** Дополнительные допустимые формы past simple (напр. be → was|were, burn → burned|burnt). */
  altPast?: readonly string[];
  /** Дополнительные допустимые формы past participle (напр. get → gotten|got в BrE). */
  altPp?: readonly string[];
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
  sourceLocales?: IrregularVerbSourceLocaleMap;
}

/** Все допустимые ответы для целевой формы глагола (включая варианты). */
export function acceptedFormsFor(verb: IrregularVerb, formKey: 'past' | 'pp' | 'base'): string[] {
  if (formKey === 'base') return [verb.base];
  if (formKey === 'past') return [verb.past, ...(verb.altPast ?? [])];
  return [verb.pp, ...(verb.altPp ?? [])];
}

const IRREGULAR_VERB_GLOSSARY: Record<string, IrregularVerb> = {
  be: { base: 'be', past: 'was', pp: 'been', ru: 'Быть (тж. were во мн.ч.)', uk: 'Бути (тж. were у мн.)', es: 'Ser / estar (tb. were en plural)', 'pt-BR': 'Ser / estar (tb. were no plural)', vi: 'Thì / là / ở (số nhiều: were)', id: 'Menjadi / ada (jamak: were)', tr: 'Olmak (çoğul: were)', pl: 'Być (w l.mn. were)', altPast: ['were'] },
  do: { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити', es: 'Hacer', 'pt-BR': 'Fazer', vi: 'Làm', id: 'Melakukan', tr: 'Yapmak / etmek', pl: 'Robić' },
  break: { base: 'break', past: 'broke', pp: 'broken', ru: 'Ломать', uk: 'Ламати', es: 'Romper', 'pt-BR': 'Quebrar / romper', vi: 'Làm vỡ / phá vỡ', id: 'Memecahkan / merusak', tr: 'Kırmak', pl: 'Łamać / zepsuć' },
  bring: { base: 'bring', past: 'brought', pp: 'brought', ru: 'Приносить', uk: 'Приносити', es: 'Traer', 'pt-BR': 'Trazer', vi: 'Mang đến', id: 'Membawa', tr: 'Getirmek', pl: 'Przynosić' },
  build: { base: 'build', past: 'built', pp: 'built', ru: 'Строить', uk: 'Будувати', es: 'Construir', 'pt-BR': 'Construir', vi: 'Xây dựng', id: 'Membangun', tr: 'İnşa etmek', pl: 'Budować' },
  buy: { base: 'buy', past: 'bought', pp: 'bought', ru: 'Покупать', uk: 'Купувати', es: 'Comprar', 'pt-BR': 'Comprar', vi: 'Mua', id: 'Membeli', tr: 'Satın almak', pl: 'Kupować' },
  choose: { base: 'choose', past: 'chose', pp: 'chosen', ru: 'Выбирать', uk: 'Вибирати', es: 'Elegir', 'pt-BR': 'Escolher', vi: 'Chọn', id: 'Memilih', tr: 'Seçmek', pl: 'Wybierać' },
  come: { base: 'come', past: 'came', pp: 'come', ru: 'Приходить', uk: 'Приходити', es: 'Venir', 'pt-BR': 'Vir', vi: 'Đến', id: 'Datang', tr: 'Gelmek', pl: 'Przychodzić' },
  cost: { base: 'cost', past: 'cost', pp: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'Costar', 'pt-BR': 'Custar', vi: 'Có giá', id: 'Berharga', tr: 'Mal olmak', pl: 'Kosztować' },
  drink: { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити', es: 'Beber', 'pt-BR': 'Beber', vi: 'Uống', id: 'Minum', tr: 'İçmek', pl: 'Pić' },
  drive: { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити', es: 'Conducir', 'pt-BR': 'Dirigir', vi: 'Lái xe', id: 'Mengemudi', tr: 'Araba sürmek', pl: 'Prowadzić' },
  eat: { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти', es: 'Comer', 'pt-BR': 'Comer', vi: 'Ăn', id: 'Makan', tr: 'Yemek', pl: 'Jeść' },
  fall: { base: 'fall', past: 'fell', pp: 'fallen', ru: 'Падать', uk: 'Падати', es: 'Caer', 'pt-BR': 'Cair', vi: 'Rơi / ngã', id: 'Jatuh', tr: 'Düşmek', pl: 'Upadać' },
  feel: { base: 'feel', past: 'felt', pp: 'felt', ru: 'Чувствовать', uk: 'Відчувати', es: 'Sentir', 'pt-BR': 'Sentir', vi: 'Cảm thấy', id: 'Merasa', tr: 'Hissetmek', pl: 'Czuć' },
  find: { base: 'find', past: 'found', pp: 'found', ru: 'Находить', uk: 'Знаходити', es: 'Encontrar', 'pt-BR': 'Encontrar', vi: 'Tìm thấy', id: 'Menemukan', tr: 'Bulmak', pl: 'Znajdować' },
  forget: { base: 'forget', past: 'forgot', pp: 'forgotten', ru: 'Забывать', uk: 'Забувати', es: 'Olvidar', 'pt-BR': 'Esquecer', vi: 'Quên', id: 'Melupakan', tr: 'Unutmak', pl: 'Zapominać' },
  get: { base: 'get', past: 'got', pp: 'gotten', altPp: ['got'], ru: 'Получать', uk: 'Отримувати', es: 'Conseguir', 'pt-BR': 'Conseguir / receber', vi: 'Nhận / có được', id: 'Mendapatkan', tr: 'Almak / elde etmek', pl: 'Dostać / uzyskać' },
  give: { base: 'give', past: 'gave', pp: 'given', ru: 'Давать', uk: 'Давати', es: 'Dar', 'pt-BR': 'Dar', vi: 'Đưa / cho', id: 'Memberi', tr: 'Vermek', pl: 'Dawać' },
  go: { base: 'go', past: 'went', pp: 'gone', ru: 'Идти; ехать', uk: 'Іти; їхати', es: 'Ir', 'pt-BR': 'Ir', vi: 'Đi', id: 'Pergi', tr: 'Gitmek', pl: 'Iść / jechać' },
  have: { base: 'have', past: 'had', pp: 'had', ru: 'Иметь', uk: 'Мати', es: 'Tener', 'pt-BR': 'Ter', vi: 'Có', id: 'Mempunyai', tr: 'Sahip olmak', pl: 'Mieć' },
  hear: { base: 'hear', past: 'heard', pp: 'heard', ru: 'Слышать', uk: 'Чути', es: 'Oír', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Mendengar', tr: 'Duymak', pl: 'Słyszeć' },
  hit: { base: 'hit', past: 'hit', pp: 'hit', ru: 'Ударять', uk: 'Вдаряти', es: 'Golpear', 'pt-BR': 'Bater / atingir', vi: 'Đánh / trúng', id: 'Memukul', tr: 'Vurmak', pl: 'Uderzać' },
  hurt: { base: 'hurt', past: 'hurt', pp: 'hurt', ru: 'Причинять боль', uk: 'Завдавати болю', es: 'Herir', 'pt-BR': 'Machucar / ferir', vi: 'Làm đau', id: 'Menyakiti', tr: 'İncitmek / yaralamak', pl: 'Ranić' },
  keep: { base: 'keep', past: 'kept', pp: 'kept', ru: 'Держать; хранить', uk: 'Тримати; зберігати', es: 'Mantener', 'pt-BR': 'Manter / guardar', vi: 'Giữ', id: 'Menyimpan / mempertahankan', tr: 'Tutmak / saklamak', pl: 'Trzymać / zachować' },
  know: { base: 'know', past: 'knew', pp: 'known', ru: 'Знать', uk: 'Знати', es: 'Saber / conocer', 'pt-BR': 'Saber / conhecer', vi: 'Biết', id: 'Tahu / mengenal', tr: 'Bilmek / tanımak', pl: 'Wiedzieć / znać' },
  leave: { base: 'leave', past: 'left', pp: 'left', ru: 'Уходить; оставлять', uk: 'Іти; залишати', es: 'Salir / dejar', 'pt-BR': 'Sair / deixar', vi: 'Rời đi / để lại', id: 'Pergi / meninggalkan', tr: 'Ayrılmak / bırakmak', pl: 'Wychodzić / zostawiać' },
  let: { base: 'let', past: 'let', pp: 'let', ru: 'Позволять', uk: 'Дозволяти', es: 'Dejar', 'pt-BR': 'Deixar / permitir', vi: 'Cho phép', id: 'Membiarkan / mengizinkan', tr: 'İzin vermek / bırakmak', pl: 'Pozwalać' },
  lose: { base: 'lose', past: 'lost', pp: 'lost', ru: 'Терять', uk: 'Втрачати', es: 'Perder', 'pt-BR': 'Perder', vi: 'Mất / thua', id: 'Kehilangan / kalah', tr: 'Kaybetmek', pl: 'Tracić' },
  make: { base: 'make', past: 'made', pp: 'made', ru: 'Делать; заставлять', uk: 'Робити; змушувати', es: 'Hacer', 'pt-BR': 'Fazer', vi: 'Làm / tạo ra', id: 'Membuat', tr: 'Yapmak', pl: 'Robić' },
  meet: { base: 'meet', past: 'met', pp: 'met', ru: 'Встречать', uk: 'Зустрічати', es: 'Conocer', 'pt-BR': 'Conhecer / encontrar', vi: 'Gặp', id: 'Bertemu', tr: 'Tanışmak / görüşmek', pl: 'Spotykać / poznać' },
  pay: { base: 'pay', past: 'paid', pp: 'paid', ru: 'Платить', uk: 'Платити', es: 'Pagar', 'pt-BR': 'Pagar', vi: 'Trả tiền', id: 'Membayar', tr: 'Ödemek', pl: 'Płacić' },
  put: { base: 'put', past: 'put', pp: 'put', ru: 'Класть; ставить', uk: 'Класти; ставити', es: 'Poner', 'pt-BR': 'Colocar / pôr', vi: 'Đặt', id: 'Meletakkan', tr: 'Koymak', pl: 'Kłaść' },
  read: { base: 'read', past: 'read', pp: 'read', ru: 'Читать', uk: 'Читати', es: 'Leer', 'pt-BR': 'Ler', vi: 'Đọc', id: 'Membaca', tr: 'Okumak', pl: 'Czytać' },
  ring: { base: 'ring', past: 'rang', pp: 'rung', ru: 'Звонить', uk: 'Дзвонити', es: 'Sonar / llamar', 'pt-BR': 'Tocar / telefonar', vi: 'Reo / gọi điện', id: 'Berdering / menelepon', tr: 'Çalmak / telefon etmek', pl: 'Dzwonić' },
  run: { base: 'run', past: 'ran', pp: 'run', ru: 'Бегать', uk: 'Бігати', es: 'Correr', 'pt-BR': 'Correr', vi: 'Chạy', id: 'Berlari', tr: 'Koşmak', pl: 'Biegać' },
  say: { base: 'say', past: 'said', pp: 'said', ru: 'Сказать', uk: 'Сказати', es: 'Decir', 'pt-BR': 'Dizer', vi: 'Nói', id: 'Mengatakan', tr: 'Söylemek', pl: 'Powiedzieć' },
  see: { base: 'see', past: 'saw', pp: 'seen', ru: 'Видеть', uk: 'Бачити', es: 'Ver', 'pt-BR': 'Ver', vi: 'Thấy / nhìn', id: 'Melihat', tr: 'Görmek', pl: 'Widzieć' },
  sell: { base: 'sell', past: 'sold', pp: 'sold', ru: 'Продавать', uk: 'Продавати', es: 'Vender', 'pt-BR': 'Vender', vi: 'Bán', id: 'Menjual', tr: 'Satmak', pl: 'Sprzedawać' },
  send: { base: 'send', past: 'sent', pp: 'sent', ru: 'Отправлять', uk: 'Надсилати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Mengirim', tr: 'Göndermek', pl: 'Wysyłać' },
  shake: { base: 'shake', past: 'shook', pp: 'shaken', ru: 'Трясти', uk: 'Трусити', es: 'Sacudir', 'pt-BR': 'Sacudir', vi: 'Lắc', id: 'Mengguncang', tr: 'Sallamak', pl: 'Potrząsać' },
  sing: { base: 'sing', past: 'sang', pp: 'sung', ru: 'Петь', uk: 'Співати', es: 'Cantar', 'pt-BR': 'Cantar', vi: 'Hát', id: 'Bernyanyi', tr: 'Şarkı söylemek', pl: 'Śpiewać' },
  sit: { base: 'sit', past: 'sat', pp: 'sat', ru: 'Сидеть', uk: 'Сидіти', es: 'Sentarse / estar sentado', 'pt-BR': 'Sentar-se / estar sentado', vi: 'Ngồi', id: 'Duduk', tr: 'Oturmak', pl: 'Siedzieć' },
  sleep: { base: 'sleep', past: 'slept', pp: 'slept', ru: 'Спать', uk: 'Спати', es: 'Dormir', 'pt-BR': 'Dormir', vi: 'Ngủ', id: 'Tidur', tr: 'Uyumak', pl: 'Spać' },
  speak: { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити', es: 'Hablar', 'pt-BR': 'Falar', vi: 'Nói', id: 'Berbicara', tr: 'Konuşmak', pl: 'Mówić' },
  stand: { base: 'stand', past: 'stood', pp: 'stood', ru: 'Стоять', uk: 'Стояти', es: 'Estar de pie', 'pt-BR': 'Ficar de pé', vi: 'Đứng', id: 'Berdiri', tr: 'Ayakta durmak', pl: 'Stać' },
  strike: { base: 'strike', past: 'struck', pp: 'struck', ru: 'Ударять', uk: 'Вдаряти', es: 'Golpear', 'pt-BR': 'Bater / atingir', vi: 'Đánh / đập', id: 'Memukul', tr: 'Vurmak', pl: 'Uderzać' },
  take: { base: 'take', past: 'took', pp: 'taken', ru: 'Брать', uk: 'Брати', es: 'Tomar', 'pt-BR': 'Pegar / tomar', vi: 'Lấy / mang', id: 'Mengambil', tr: 'Almak', pl: 'Brać' },
  tell: { base: 'tell', past: 'told', pp: 'told', ru: 'Рассказывать; говорить', uk: 'Розповідати; говорити', es: 'Contar', 'pt-BR': 'Contar / dizer', vi: 'Kể / nói', id: 'Memberi tahu / menceritakan', tr: 'Anlatmak / söylemek', pl: 'Mówić / opowiadać' },
  think: { base: 'think', past: 'thought', pp: 'thought', ru: 'Думать', uk: 'Думати', es: 'Pensar', 'pt-BR': 'Pensar', vi: 'Nghĩ', id: 'Berpikir', tr: 'Düşünmek', pl: 'Myśleć' },
  understand: { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти', es: 'Entender', 'pt-BR': 'Entender', vi: 'Hiểu', id: 'Mengerti', tr: 'Anlamak', pl: 'Rozumieć' },
  wake: { base: 'wake', past: 'woke', pp: 'woken', ru: 'Просыпаться; будить', uk: 'Прокидатися; будити', es: 'Despertarse', 'pt-BR': 'Acordar / acordar alguém', vi: 'Thức dậy / đánh thức', id: 'Bangun / membangunkan', tr: 'Uyanmak / uyandırmak', pl: 'Budzić się / budzić' },
  wear: { base: 'wear', past: 'wore', pp: 'worn', ru: 'Носить', uk: 'Носити', es: 'Llevar (puesto)', 'pt-BR': 'Vestir / usar', vi: 'Mặc', id: 'Memakai', tr: 'Giymek', pl: 'Nosić' },
  write: { base: 'write', past: 'wrote', pp: 'written', ru: 'Писать', uk: 'Писати', es: 'Escribir', 'pt-BR': 'Escrever', vi: 'Viết', id: 'Menulis', tr: 'Yazmak', pl: 'Pisać' },
};

const IRREGULAR_VERB_SOURCE_LOCALES: Record<string, IrregularVerbSourceLocaleMap> = {
  be: { es: 'Ser / estar (tb. were en plural)', 'pt-BR': 'Ser / estar (tb. were no plural)', vi: 'Thì / là / ở (số nhiều: were)', id: 'Menjadi / ada (jamak: were)', tr: 'Olmak (çoğul: were)', pl: 'Być (w l.mn. were)' },
  do: { es: 'Hacer', 'pt-BR': 'Fazer', vi: 'Làm', id: 'Melakukan', tr: 'Yapmak / etmek', pl: 'Robić' },
  break: { es: 'Romper', 'pt-BR': 'Quebrar / romper', vi: 'Làm vỡ / phá vỡ', id: 'Memecahkan / merusak', tr: 'Kırmak', pl: 'Łamać / zepsuć' },
  bring: { es: 'Traer', 'pt-BR': 'Trazer', vi: 'Mang đến', id: 'Membawa', tr: 'Getirmek', pl: 'Przynosić' },
  build: { es: 'Construir', 'pt-BR': 'Construir', vi: 'Xây dựng', id: 'Membangun', tr: 'İnşa etmek', pl: 'Budować' },
  buy: { es: 'Comprar', 'pt-BR': 'Comprar', vi: 'Mua', id: 'Membeli', tr: 'Satın almak', pl: 'Kupować' },
  choose: { es: 'Elegir', 'pt-BR': 'Escolher', vi: 'Chọn', id: 'Memilih', tr: 'Seçmek', pl: 'Wybierać' },
  come: { es: 'Venir', 'pt-BR': 'Vir', vi: 'Đến', id: 'Datang', tr: 'Gelmek', pl: 'Przychodzić' },
  cost: { es: 'Costar', 'pt-BR': 'Custar', vi: 'Có giá', id: 'Berharga', tr: 'Mal olmak', pl: 'Kosztować' },
  drink: { es: 'Beber', 'pt-BR': 'Beber', vi: 'Uống', id: 'Minum', tr: 'İçmek', pl: 'Pić' },
  drive: { es: 'Conducir', 'pt-BR': 'Dirigir', vi: 'Lái xe', id: 'Mengemudi', tr: 'Araba sürmek', pl: 'Prowadzić' },
  eat: { es: 'Comer', 'pt-BR': 'Comer', vi: 'Ăn', id: 'Makan', tr: 'Yemek', pl: 'Jeść' },
  fall: { es: 'Caer', 'pt-BR': 'Cair', vi: 'Rơi / ngã', id: 'Jatuh', tr: 'Düşmek', pl: 'Upadać' },
  feel: { es: 'Sentir', 'pt-BR': 'Sentir', vi: 'Cảm thấy', id: 'Merasa', tr: 'Hissetmek', pl: 'Czuć' },
  find: { es: 'Encontrar', 'pt-BR': 'Encontrar', vi: 'Tìm thấy', id: 'Menemukan', tr: 'Bulmak', pl: 'Znajdować' },
  forget: { es: 'Olvidar', 'pt-BR': 'Esquecer', vi: 'Quên', id: 'Melupakan', tr: 'Unutmak', pl: 'Zapominać' },
  get: { es: 'Conseguir', 'pt-BR': 'Conseguir / receber', vi: 'Nhận / có được', id: 'Mendapatkan', tr: 'Almak / elde etmek', pl: 'Dostać / uzyskać' },
  give: { es: 'Dar', 'pt-BR': 'Dar', vi: 'Đưa / cho', id: 'Memberi', tr: 'Vermek', pl: 'Dawać' },
  go: { es: 'Ir', 'pt-BR': 'Ir', vi: 'Đi', id: 'Pergi', tr: 'Gitmek', pl: 'Iść / jechać' },
  have: { es: 'Tener', 'pt-BR': 'Ter', vi: 'Có', id: 'Mempunyai', tr: 'Sahip olmak', pl: 'Mieć' },
  hear: { es: 'Oír', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Mendengar', tr: 'Duymak', pl: 'Słyszeć' },
  hit: { es: 'Golpear', 'pt-BR': 'Bater / atingir', vi: 'Đánh / trúng', id: 'Memukul', tr: 'Vurmak', pl: 'Uderzać' },
  hurt: { es: 'Herir', 'pt-BR': 'Machucar / ferir', vi: 'Làm đau', id: 'Menyakiti', tr: 'İncitmek / yaralamak', pl: 'Ranić' },
  keep: { es: 'Mantener', 'pt-BR': 'Manter / guardar', vi: 'Giữ', id: 'Menyimpan / mempertahankan', tr: 'Tutmak / saklamak', pl: 'Trzymać / zachować' },
  know: { es: 'Saber / conocer', 'pt-BR': 'Saber / conhecer', vi: 'Biết', id: 'Tahu / mengenal', tr: 'Bilmek / tanımak', pl: 'Wiedzieć / znać' },
  leave: { es: 'Salir / dejar', 'pt-BR': 'Sair / deixar', vi: 'Rời đi / để lại', id: 'Pergi / meninggalkan', tr: 'Ayrılmak / bırakmak', pl: 'Wychodzić / zostawiać' },
  let: { es: 'Dejar', 'pt-BR': 'Deixar / permitir', vi: 'Cho phép', id: 'Membiarkan / mengizinkan', tr: 'İzin vermek / bırakmak', pl: 'Pozwalać' },
  lose: { es: 'Perder', 'pt-BR': 'Perder', vi: 'Mất / thua', id: 'Kehilangan / kalah', tr: 'Kaybetmek', pl: 'Tracić' },
  make: { es: 'Hacer', 'pt-BR': 'Fazer', vi: 'Làm / tạo ra', id: 'Membuat', tr: 'Yapmak', pl: 'Robić' },
  meet: { es: 'Conocer', 'pt-BR': 'Conhecer / encontrar', vi: 'Gặp', id: 'Bertemu', tr: 'Tanışmak / görüşmek', pl: 'Spotykać / poznać' },
  pay: { es: 'Pagar', 'pt-BR': 'Pagar', vi: 'Trả tiền', id: 'Membayar', tr: 'Ödemek', pl: 'Płacić' },
  put: { es: 'Poner', 'pt-BR': 'Colocar / pôr', vi: 'Đặt', id: 'Meletakkan', tr: 'Koymak', pl: 'Kłaść' },
  read: { es: 'Leer', 'pt-BR': 'Ler', vi: 'Đọc', id: 'Membaca', tr: 'Okumak', pl: 'Czytać' },
  ring: { es: 'Sonar / llamar', 'pt-BR': 'Tocar / telefonar', vi: 'Reo / gọi điện', id: 'Berdering / menelepon', tr: 'Çalmak / telefon etmek', pl: 'Dzwonić' },
  run: { es: 'Correr', 'pt-BR': 'Correr', vi: 'Chạy', id: 'Berlari', tr: 'Koşmak', pl: 'Biegać' },
  say: { es: 'Decir', 'pt-BR': 'Dizer', vi: 'Nói', id: 'Mengatakan', tr: 'Söylemek', pl: 'Powiedzieć' },
  see: { es: 'Ver', 'pt-BR': 'Ver', vi: 'Thấy / nhìn', id: 'Melihat', tr: 'Görmek', pl: 'Widzieć' },
  sell: { es: 'Vender', 'pt-BR': 'Vender', vi: 'Bán', id: 'Menjual', tr: 'Satmak', pl: 'Sprzedawać' },
  send: { es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Mengirim', tr: 'Göndermek', pl: 'Wysyłać' },
  shake: { es: 'Sacudir', 'pt-BR': 'Sacudir', vi: 'Lắc', id: 'Mengguncang', tr: 'Sallamak', pl: 'Potrząsać' },
  sing: { es: 'Cantar', 'pt-BR': 'Cantar', vi: 'Hát', id: 'Bernyanyi', tr: 'Şarkı söylemek', pl: 'Śpiewać' },
  sit: { es: 'Sentarse / estar sentado', 'pt-BR': 'Sentar-se / estar sentado', vi: 'Ngồi', id: 'Duduk', tr: 'Oturmak', pl: 'Siedzieć' },
  sleep: { es: 'Dormir', 'pt-BR': 'Dormir', vi: 'Ngủ', id: 'Tidur', tr: 'Uyumak', pl: 'Spać' },
  speak: { es: 'Hablar', 'pt-BR': 'Falar', vi: 'Nói', id: 'Berbicara', tr: 'Konuşmak', pl: 'Mówić' },
  stand: { es: 'Estar de pie', 'pt-BR': 'Ficar de pé', vi: 'Đứng', id: 'Berdiri', tr: 'Ayakta durmak', pl: 'Stać' },
  strike: { es: 'Golpear', 'pt-BR': 'Bater / atingir', vi: 'Đánh / đập', id: 'Memukul', tr: 'Vurmak', pl: 'Uderzać' },
  take: { es: 'Tomar', 'pt-BR': 'Pegar / tomar', vi: 'Lấy / mang', id: 'Mengambil', tr: 'Almak', pl: 'Brać' },
  tell: { es: 'Contar', 'pt-BR': 'Contar / dizer', vi: 'Kể / nói', id: 'Memberi tahu / menceritakan', tr: 'Anlatmak / söylemek', pl: 'Mówić / opowiadać' },
  think: { es: 'Pensar', 'pt-BR': 'Pensar', vi: 'Nghĩ', id: 'Berpikir', tr: 'Düşünmek', pl: 'Myśleć' },
  understand: { es: 'Entender', 'pt-BR': 'Entender', vi: 'Hiểu', id: 'Mengerti', tr: 'Anlamak', pl: 'Rozumieć' },
  wake: { es: 'Despertarse', 'pt-BR': 'Acordar / acordar alguém', vi: 'Thức dậy / đánh thức', id: 'Bangun / membangunkan', tr: 'Uyanmak / uyandırmak', pl: 'Budzić się / budzić' },
  wear: { es: 'Llevar (puesto)', 'pt-BR': 'Vestir / usar', vi: 'Mặc', id: 'Memakai', tr: 'Giymek', pl: 'Nosić' },
  write: { es: 'Escribir', 'pt-BR': 'Escrever', vi: 'Viết', id: 'Menulis', tr: 'Yazmak', pl: 'Pisać' },
};

const LESSON_IRREGULAR_BASES = {
  1: ['be'],
  2: ['do'],
  3: ['buy', 'come', 'cost', 'drink', 'drive', 'eat', 'feel', 'forget', 'hear', 'know', 'read', 'speak', 'take', 'understand', 'wear', 'write'],
  4: ['break', 'lose', 'pay', 'see', 'sell', 'send'],
  5: ['find', 'sing', 'sleep'],
  6: ['get', 'go', 'keep', 'meet', 'put'],
  7: ['have'],
  8: ['leave', 'run'],
  9: [],
  10: [],
  11: [],
  12: ['bring', 'build', 'choose', 'give', 'make', 'say', 'sit', 'stand', 'tell', 'think'],
  13: [],
  14: [],
  15: [],
  16: ['wake'],
  17: [],
  18: ['let'],
  19: [],
  20: [],
  21: [],
  22: [],
  23: [],
  24: [],
  25: ['ring'],
  26: [],
  27: [],
  28: ['hurt'],
  29: [],
  30: [],
  31: ['fall', 'hit', 'shake', 'strike'],
  32: [],
} satisfies Record<number, string[]>;

function verbsForLesson(bases: string[]): IrregularVerb[] {
  return bases.map((base) => {
    const verb = IRREGULAR_VERB_GLOSSARY[base];
    if (!verb) throw new Error(`Missing irregular verb glossary row: ${base}`);
    return {
      ...verb,
      sourceLocales: IRREGULAR_VERB_SOURCE_LOCALES[base],
    };
  });
}

export const IRREGULAR_VERBS_BY_LESSON: Record<number, IrregularVerb[]> = Object.fromEntries(
  Object.entries(LESSON_IRREGULAR_BASES).map(([lessonId, bases]) => [Number(lessonId), verbsForLesson(bases)])
) as Record<number, IrregularVerb[]>;

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).filter(([, verbs]) => verbs.length > 0).map(([lessonId]) => Number(lessonId))
);

export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([lessonId, verbs]) => [Number(lessonId), verbs.length])
);

// ── Порции (chunking) ──────────────────────────────────────────────────────────
// Большие списки глаголов учим волнами по ~5-6, чтобы снизить когнитивную нагрузку
// (урок 3 — 16 глаголов). Если в уроке мало глаголов, порция одна.

/** Целевой размер одной порции тренировки. */
export const IRREGULAR_VERB_PORTION_SIZE = 6;

/** Порог, при котором список вообще делится на порции (иначе одна порция). */
const PORTION_MIN_TO_SPLIT = 8;

/**
 * Делит глаголы урока на порции по ~IRREGULAR_VERB_PORTION_SIZE.
 * Балансирует так, чтобы не было хвоста из 1 глагола (16 → 6+5+5, а не 6+6+4).
 */
export function portionsForVerbs(verbs: IrregularVerb[], size = IRREGULAR_VERB_PORTION_SIZE): IrregularVerb[][] {
  if (verbs.length < PORTION_MIN_TO_SPLIT) return verbs.length > 0 ? [verbs] : [];
  const portionCount = Math.ceil(verbs.length / size);
  const balanced = Math.ceil(verbs.length / portionCount);
  const out: IrregularVerb[][] = [];
  for (let i = 0; i < verbs.length; i += balanced) {
    out.push(verbs.slice(i, i + balanced));
  }
  return out;
}

/** Кол-во порций тренировки для урока. */
export function portionCountForLesson(lessonId: number): number {
  return portionsForVerbs(IRREGULAR_VERBS_BY_LESSON[lessonId] ?? []).length;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
