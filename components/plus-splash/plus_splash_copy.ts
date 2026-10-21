// ════════════════════════════════════════════════════════════════════════════
// plus_splash_copy.ts — тексты заставки Plus (№35) на 9 языках: заголовок, подзаголовок, четыре выгоды.
//
// зачем (владелец 21.10, эталон plus-launch-etalon.html): русский текст взят из эталона слово в слово. Остальные языки сверены «Переводчиком»
// (docs/work/tasks/plus-splash-copy-review-2026-10-21.md): «стоп» и «счётчик» буквально не переводятся (остановки транспорта, «прибор»),
// поэтому в en/es/pt/vi/id/tr — «без пауз / без перерывов / без лимита / не ждать до завтра». Кнопка, строка под ней, «Не сейчас», «PHRASEMAN PLUS»
// берутся из готовых фраз пейвола (PaywallPlusCopy), здесь только то, чего в пейволе нет. Порядок в кортеже: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const pick = (lang: Lang, v: Nine): string => {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = v;
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
};

export const PLUS_SPLASH_COPY = {
  title: ['Больше практики — без стопов', 'Більше практики — без зупинок', 'More practice, no interruptions', 'Más práctica, sin pausas', 'Mais prática, sem pausas', 'Luyện nhiều hơn — không gián đoạn', 'Lebih banyak latihan, tanpa jeda', 'Daha çok pratik, kesintisiz', 'Więcej praktyki — bez przerw'],
  subtitle: ['Всё, что помогает заговорить: живые диалоги, голос и повтор слабых мест.', 'Усе, що допомагає заговорити: живі діалоги, голос і повтор слабких місць.', 'Everything that gets you talking: real dialogues, voice practice and work on weak spots.', 'Todo lo que te ayuda a hablar: diálogos reales, voz y repaso de los puntos débiles.', 'Tudo o que ajuda a falar: diálogos reais, voz e revisão dos pontos fracos.', 'Mọi thứ giúp bạn nói được: hội thoại thật, giọng nói và ôn lại điểm yếu.', 'Semua yang membantumu mulai bicara: dialog nyata, latihan suara, dan mengulang bagian yang lemah.', 'Konuşmanı sağlayan her şey: canlı diyaloglar, ses ve zayıf noktaların tekrarı.', 'Wszystko, co pomaga zacząć mówić: żywe dialogi, głos i powtórki słabych miejsc.'],
  b1Title: ['Диалоги без счётчика', 'Діалоги без лічильника', 'Unlimited dialogues', 'Diálogos sin límite', 'Diálogos sem limite', 'Hội thoại không giới hạn', 'Dialog tanpa batas', 'Sınırsız diyalog', 'Dialogi bez limitu'],
  b1Text: ['Рабочие и бытовые ситуации — без дневного лимита', 'Робочі й побутові ситуації — без денного ліміту', 'Work and everyday situations, whenever you want', 'Situaciones de trabajo y del día a día, cuando quieras', 'Situações de trabalho e do dia a dia, quando quiser', 'Tình huống công việc và đời thường, lúc nào cũng được', 'Situasi kerja dan sehari-hari, kapan pun kamu mau', 'İş ve günlük durumlar, istediğin zaman', 'Sytuacje w pracy i na co dzień — kiedy chcesz'],
  b2Title: ['Говоришь вслух', 'Говориш уголос', 'Speak out loud', 'Hablas en voz alta', 'Você fala em voz alta', 'Nói thành tiếng', 'Bicara dengan lantang', 'Sesli konuşursun', 'Mówisz na głos'],
  b2Text: ['Phraseman оценивает, насколько точно сказано', 'Phraseman оцінює, наскільки точно сказано', 'Phraseman checks how accurately you said it', 'Phraseman evalúa la precisión de lo que dices', 'O Phraseman avalia a precisão do que foi dito', 'Phraseman đánh giá câu nói chính xác đến đâu', 'Phraseman menilai seberapa tepat ucapannya', 'Phraseman söylenenin ne kadar doğru olduğunu değerlendirir', 'Phraseman ocenia, jak dokładnie mówisz'],
  b3Title: ['Слабые места', 'Слабкі місця', 'Weak spots', 'Puntos débiles', 'Pontos fracos', 'Điểm yếu', 'Titik lemah', 'Zayıf noktalar', 'Słabe miejsca'],
  b3Text: ['Трудные фразы возвращаются, пока не станут уверенными', 'Важкі фрази повертаються, поки не закріпляться', 'Hard phrases come back until they stick', 'Las frases difíciles vuelven hasta que se fijan', 'As frases difíceis voltam até ficarem firmes', 'Câu khó quay lại cho đến khi bạn nhớ chắc', 'Frasa sulit muncul lagi sampai benar-benar dikuasai', 'Zor ifadeler iyice oturana kadar geri gelir', 'Trudne frazy wracają, aż się utrwalą'],
  b4Title: ['Без дневных стопов', 'Без денних зупинок', 'No waiting for tomorrow', 'Sin esperar a mañana', 'Sem esperar até amanhã', 'Không phải chờ đến mai', 'Tak perlu menunggu besok', 'Yarını beklemek yok', 'Bez czekania do jutra'],
  b4Text: ['Энергия не тратится — занимайся сколько хочется', 'Енергія не витрачається — вчись скільки хочеш', 'Energy isn’t spent — practice as long as you like', 'No se gasta energía: practica todo lo que quieras', 'A energia não é gasta — estude o quanto quiser', 'Không tốn năng lượng — học bao lâu tùy thích', 'Energi tidak terpakai — belajarlah sepuasnya', 'Enerji harcanmaz — istediğin kadar çalış', 'Energia się nie zużywa — ćwicz, ile chcesz'],
} as const satisfies Record<string, Nine>;

export type PlusSplashCopyKey = keyof typeof PLUS_SPLASH_COPY;

export function plusSplashText(lang: Lang, key: PlusSplashCopyKey): string {
  return pick(lang, PLUS_SPLASH_COPY[key]);
}

/** Четыре выгоды: значок Ionicons + ключи названия и пояснения (порядок и значки — как в эталоне). */
export const PLUS_SPLASH_BENEFITS: readonly Readonly<{ icon: 'chatbubbles' | 'mic' | 'refresh' | 'flash'; title: PlusSplashCopyKey; text: PlusSplashCopyKey }>[] = [
  { icon: 'chatbubbles', title: 'b1Title', text: 'b1Text' },
  { icon: 'mic', title: 'b2Title', text: 'b2Text' },
  { icon: 'refresh', title: 'b3Title', text: 'b3Text' },
  { icon: 'flash', title: 'b4Title', text: 'b4Text' },
];
