// ════════════════════════════════════════════════════════════════════════════
// PaywallProofCards.tsx — «галерея доказательств» (ниже фолда, для сомневающихся):
//   MirrorCard      — «Уже твоё»: зеркало прогресса (endowment, из v1)
//   PercentileCard  — честное соцдоказательство из СВОИХ данных юзера
//   CompareCard     — сжатое сравнение Free → Premium (5 строк, читаемый шрифт)
//   FaqCard         — 3 вопроса, бьющие в страх №1 («забуду отменить»)
// Отзывы намеренно НЕ здесь: рендер только verified-отзывов через
// paywall_testimonials (пока их нет — секции нет; не выдумываем).
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import type { ProgressMirror } from '../../app/paywall_progress_mirror';
import type { PaywallChrome } from './paywallShared';
import { hapticTap } from '../../hooks/use-haptics';

// ── обёртка-карточка ──────────────────────────────────────────────────────────
function ProofCard({ title, chrome, children }: { title: string; chrome: PaywallChrome; children: React.ReactNode }) {
  return (
    <View style={[S.card, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
      <Text style={[S.cardTitle, { color: chrome.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// ── «Уже твоё» ────────────────────────────────────────────────────────────────
export function MirrorCard({ lang, chrome, mirror }: { lang: Lang; chrome: PaywallChrome; mirror: ProgressMirror }) {
  const stats: { value: number; label: string }[] = [];
  if (mirror.phrases > 0) stats.push({ value: mirror.phrases, label: triLang(lang, {
    ru: 'фраз',
    uk: 'фраз',
    es: 'frases',
    'pt-BR': 'frases',
    vi: 'cụm từ',
    id: 'frasa',
    tr: 'ifade',
    pl: 'fraz',
  }) });
  if (mirror.words > 0) stats.push({ value: mirror.words, label: triLang(lang, {
    ru: 'слов',
    uk: 'слів',
    es: 'palabras',
    'pt-BR': 'palavras',
    vi: 'từ',
    id: 'kata',
    tr: 'kelime',
    pl: 'słów',
  }) });
  if (mirror.xp > 0) stats.push({ value: mirror.xp, label: 'XP' });
  if (mirror.streak > 0) stats.push({ value: mirror.streak, label: triLang(lang, {
    ru: 'дн. серия',
    uk: 'дн. серія',
    es: 'días racha',
    'pt-BR': 'dias seguidos',
    vi: 'ngày chuỗi',
    id: 'hari runtutan',
    tr: 'gün seri',
    pl: 'dni serii',
  }) });
  if (!stats.length) return null;
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Уже твоё',
      uk: 'Вже твоє',
      es: 'Ya es tuyo',
      'pt-BR': 'Já é seu',
      vi: 'Đã là của bạn',
      id: 'Sudah milikmu',
      tr: 'Zaten senin',
      pl: 'Już twoje',
    })} chrome={chrome}>
      <View style={S.mirrorRow}>
        {stats.slice(0, 4).map((s) => (
          <View key={s.label} style={[S.mirrorStat, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
            <Text style={[S.mirrorValue, { color: chrome.textPrimary }]}>{s.value.toLocaleString('ru-RU')}</Text>
            <Text style={[S.mirrorLabel, { color: chrome.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[S.mirrorLine, { color: chrome.textPrimary }]}>
        {triLang(lang, {
          ru: 'Plus держит этот темп.',
          uk: 'Plus тримає цей темп.',
          es: 'Plus mantiene este ritmo.',
          'pt-BR': 'Plus mantém esse ritmo.',
          vi: 'Plus giữ nhịp này.',
          id: 'Plus menjaga ritme ini.',
          tr: 'Plus bu tempoyu korur.',
          pl: 'Plus utrzymuje to tempo.',
        })}
      </Text>
    </ProofCard>
  );
}

// ── перцентиль ────────────────────────────────────────────────────────────────
export function PercentileCard({ lang, chrome, line }: { lang: Lang; chrome: PaywallChrome; line: string }) {
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Твоё место',
      uk: 'Твоє місце',
      es: 'Tu lugar',
      'pt-BR': 'Seu lugar',
      vi: 'Vị trí của bạn',
      id: 'Posisimu',
      tr: 'Yeriniz',
      pl: 'Twoje miejsce',
    })} chrome={chrome}>
      <View style={S.pctRow}>
        <Ionicons name="trending-up" size={22} color={chrome.textMuted} />
        <Text style={[S.pctText, { color: chrome.textPrimary }]}>{line}</Text>
      </View>
    </ProofCard>
  );
}

// ── что даёт Premium (стиль «итог + чипы» сверху, «польза-в-заголовке» снизу) ──
// Тексты сверены с реальными лимитами в коде (см. ниже), без «тумана» и неправды:
//   • Квизы: лимит 3/день ЛЮБОЙ сложности (quiz_daily_limit.ts: FREE_DAILY_QUIZ_LIMIT=3).
//     НЕ «только Easy» — все уровни блокируются единым дневным лимитом, не сложностью.
//   • Уроки: free = 1–8 (monetization_policy.ts: FREE_LESSON_LIMIT=8). Правда.
//   • Энергия free: +1 за ~10 мин. Произношение/диалоги/тренер: закрыты/пробные.
type LocCell = Record<Lang, string>;

// Стиль 4 — компактные чипы-доказательства под главным итогом.
type ValueChip = { icon: keyof typeof Ionicons.glyphMap; label: LocCell };
const VALUE_CHIPS: ValueChip[] = [
  { icon: 'chatbubbles-outline', label: { ru: 'Диалоги без лимита', uk: 'Діалоги без ліміту', es: 'Diálogos sin límite', 'pt-BR': 'Diálogos sem limite', vi: 'Hội thoại không giới hạn', id: 'Dialog tanpa batas', tr: 'Sınırsız diyalog', pl: 'Dialogi bez limitu' } },
  { icon: 'mic-outline', label: { ru: 'Оценка речи', uk: 'Оцінка мовлення', es: 'Evaluación de voz', 'pt-BR': 'Avaliação da fala', vi: 'Chấm phát âm', id: 'Penilaian ucapan', tr: 'Konuşma puanı', pl: 'Ocena mowy' } },
  { icon: 'locate-outline', label: { ru: 'Тренер ошибок', uk: 'Тренер помилок', es: 'Entrenador de errores', 'pt-BR': 'Treinador de erros', vi: 'Luyện điểm yếu', id: 'Pelatih kesalahan', tr: 'Hata antrenörü', pl: 'Trener błędów' } },
  { icon: 'flash-outline', label: { ru: 'Безлимит квизов', uk: 'Безліміт квізів', es: 'Quizzes sin límite', 'pt-BR': 'Quizzes sem limite', vi: 'Quiz không giới hạn', id: 'Kuis tanpa batas', tr: 'Sınırsız quiz', pl: 'Quizy bez limitu' } },
  { icon: 'book-outline', label: { ru: 'Весь уровень уроков', uk: 'Весь рівень уроків', es: 'Nivel completo', 'pt-BR': 'Nível completo', vi: 'Toàn bộ cấp độ', id: 'Seluruh level', tr: 'Tüm seviye', pl: 'Cały poziom' } },
  { icon: 'map-outline', label: { ru: 'Личный план', uk: 'Особистий план', es: 'Plan personal', 'pt-BR': 'Plano pessoal', vi: 'Kế hoạch cá nhân', id: 'Rencana pribadi', tr: 'Kişisel plan', pl: 'Plan osobisty' } },
];

// Стиль 2 — карточки «польза в заголовке» (продаём результат, а не функцию).
type ValueCard = { icon: keyof typeof Ionicons.glyphMap; title: LocCell; desc: LocCell };
const VALUE_CARDS: ValueCard[] = [
  {
    icon: 'chatbubble-ellipses-outline',
    title: { ru: 'Заговорить, а не зубрить', uk: 'Заговорити, а не зубрити', es: 'Hablar, no memorizar', 'pt-BR': 'Falar, não decorar', vi: 'Nói được, không học vẹt', id: 'Bicara, bukan menghafal', tr: 'Konuş, ezberleme', pl: 'Mówić, nie wkuwać' },
    desc: { ru: 'Живые диалоги с ИИ без лимита — он поправит каждую реплику и подскажет фразу.', uk: 'Живі діалоги з ШІ без ліміту — він виправить кожну репліку й підкаже фразу.', es: 'Diálogos reales con IA sin límite: corrige cada frase y te sugiere qué decir.', 'pt-BR': 'Diálogos reais com IA sem limite: corrige cada fala e sugere o que dizer.', vi: 'Hội thoại thật với AI không giới hạn — sửa từng câu và gợi ý cách nói.', id: 'Dialog nyata dengan AI tanpa batas — mengoreksi tiap ucapan dan menyarankan frasa.', tr: 'Yapay zekâ ile sınırsız canlı diyalog — her cümleyi düzeltir ve ne diyeceğini önerir.', pl: 'Żywe dialogi z AI bez limitu — poprawia każdą wypowiedź i podpowiada frazę.' },
  },
  {
    icon: 'mic-outline',
    title: { ru: 'Слышать свой английский', uk: 'Чути свою англійську', es: 'Oír tu inglés', 'pt-BR': 'Ouvir seu inglês', vi: 'Nghe tiếng Anh của bạn', id: 'Dengar bahasa Inggrismu', tr: 'Kendi İngilizceni duy', pl: 'Słyszeć swój angielski' },
    desc: { ru: 'Произноси вслух — приложение оценит речь и покажет, где звук уехал.', uk: 'Вимовляй уголос — застосунок оцінить мовлення й покаже, де звук поїхав.', es: 'Habla en voz alta: la app evalúa tu voz y muestra dónde falla el sonido.', 'pt-BR': 'Fale em voz alta: o app avalia sua fala e mostra onde o som escapou.', vi: 'Nói thành tiếng — ứng dụng chấm phát âm và chỉ chỗ sai.', id: 'Ucapkan dengan lantang — aplikasi menilai ucapan dan menunjukkan letak salahnya.', tr: 'Sesli konuş — uygulama konuşmanı puanlar ve sesin nerede kaydığını gösterir.', pl: 'Mów na głos — aplikacja oceni mowę i pokaże, gdzie dźwięk uciekł.' },
  },
  {
    icon: 'navigate-outline',
    title: { ru: 'Перестать топтаться на месте', uk: 'Перестати тупцювати на місці', es: 'Dejar de estancarte', 'pt-BR': 'Parar de empacar', vi: 'Hết giậm chân tại chỗ', id: 'Berhenti jalan di tempat', tr: 'Yerinde saymayı bırak', pl: 'Przestać dreptać w miejscu' },
    desc: { ru: 'Тренер находит твои слабые фразы и собирает идеальный набор на повтор.', uk: 'Тренер знаходить твої слабкі фрази й збирає ідеальний набір на повтор.', es: 'El entrenador detecta tus frases débiles y arma el set ideal para repasar.', 'pt-BR': 'O treinador acha suas frases fracas e monta o conjunto ideal para revisar.', vi: 'Huấn luyện viên tìm cụm từ yếu và lập bộ ôn hoàn hảo cho bạn.', id: 'Pelatih menemukan frasa lemahmu dan menyusun set latihan ideal.', tr: 'Antrenör zayıf ifadelerini bulur ve tekrar için ideal seti kurar.', pl: 'Trener znajduje twoje słabe frazy i układa idealny zestaw do powtórki.' },
  },
  {
    icon: 'infinite-outline',
    title: { ru: 'Учиться без стоп-сигналов', uk: 'Навчатися без стоп-сигналів', es: 'Aprender sin frenos', 'pt-BR': 'Aprender sem freios', vi: 'Học không gặp đèn đỏ', id: 'Belajar tanpa rambu berhenti', tr: 'Dur işareti olmadan öğren', pl: 'Uczyć się bez stop-sygnałów' },
    desc: { ru: 'Безлимит квизов и энергии, весь уровень уроков открыт сразу — без пауз.', uk: 'Безліміт квізів та енергії, весь рівень уроків відкрито одразу — без пауз.', es: 'Quizzes y energía sin límite y todo el nivel abierto al instante, sin pausas.', 'pt-BR': 'Quizzes e energia sem limite e o nível inteiro aberto na hora, sem pausas.', vi: 'Quiz và năng lượng không giới hạn, mở cả cấp độ ngay — không gián đoạn.', id: 'Kuis dan energi tanpa batas, seluruh level langsung terbuka — tanpa jeda.', tr: 'Sınırsız quiz ve enerji, tüm seviye hemen açık — molasız.', pl: 'Bez limitu quizów i energii, cały poziom otwarty od razu — bez przerw.' },
  },
];

// Главный итог сверху (эмоция-результат). Подзаголовок намеренно без числа «2×» —
// это недоказуемое обещание; вместо него — конкретная фокус-выгода.
const HERO_LINE: LocCell = {
  ru: 'Plus ведёт тебя к разговору', uk: 'Plus веде тебе до розмови', es: 'Plus te lleva a hablar', 'pt-BR': 'Plus te leva a falar', vi: 'Plus đưa bạn đến giao tiếp', id: 'Plus membawamu sampai bicara', tr: 'Plus seni konuşmaya götürür', pl: 'Plus prowadzi cię do rozmowy',
};

export function CompareCard({ lang, chrome }: { lang: Lang; chrome: PaywallChrome }) {
  const pick = (d: LocCell) => triLang(lang, d);
  const accent = chrome.tc.heroAccent;
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Что даёт Plus',
      uk: 'Що дає Plus',
      es: 'Qué te da Plus',
      'pt-BR': 'O que o Plus oferece',
      vi: 'Plus mang lại gì',
      id: 'Apa yang Plus berikan',
      tr: 'Plus ne sunar',
      pl: 'Co daje Plus',
    })} chrome={chrome}>
      {/* Стиль 4 — главный итог + чипы-доказательства */}
      <View style={S.valHero}>
        <View style={[S.valHeroBadge, { backgroundColor: `${accent}1A`, borderColor: `${accent}33` }]}>
          <Ionicons name="rocket-outline" size={20} color={accent} />
        </View>
        <Text style={[S.valHeroLine, { color: chrome.textPrimary }]}>{pick(HERO_LINE)}</Text>
      </View>
      <View style={S.valChips}>
        {VALUE_CHIPS.map((chip) => (
          <View key={chip.label.ru} style={[S.valChip, { backgroundColor: `${accent}14`, borderColor: `${accent}26` }]}>
            <Ionicons name={chip.icon} size={13} color={accent} style={S.valChipIcon} />
            <Text style={[S.valChipText, { color: chrome.textPrimary }]} numberOfLines={1}>{pick(chip.label)}</Text>
          </View>
        ))}
      </View>

      {/* Стиль 2 — карточки «польза в заголовке» */}
      <View style={S.valCards}>
        {VALUE_CARDS.map((card) => (
          <View key={card.title.ru} style={[S.valCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
            <View style={S.valCardHead}>
              <Ionicons name={card.icon} size={17} color={accent} style={S.valCardIcon} />
              <Text style={[S.valCardTitle, { color: chrome.textPrimary }]} numberOfLines={2}>{pick(card.title)}</Text>
            </View>
            <Text style={[S.valCardDesc, { color: chrome.textMuted }]}>{pick(card.desc)}</Text>
          </View>
        ))}
      </View>
    </ProofCard>
  );
}

// ── FAQ: 3 вопроса прямо в страх «забуду отменить» ────────────────────────────
export function FaqCard({ lang, chrome, trialDays, priceLine }: {
  lang: Lang;
  chrome: PaywallChrome;
  trialDays: number | null;
  /** «2 990 ₽ за год» — для честного ответа про списание. */
  priceLine: string;
}) {
  const [open, setOpen] = useState(0);
  const qa: { q: string; a: string }[] = [
    ...(trialDays ? [{
      q: triLang(lang, {
        ru: 'Что будет после триала?',
        uk: 'Що буде після тріалу?',
        es: '¿Qué pasa tras la prueba?',
        'pt-BR': 'O que acontece depois do teste?',
        vi: 'Sau thời gian dùng thử thì sao?',
        id: 'Apa yang terjadi setelah uji coba?',
        tr: 'Denemeden sonra ne olur?',
        pl: 'Co będzie po okresie próbnym?',
      }),
      a: triLang(lang, {
        ru: `${trialDays} дн. всё открыто бесплатно. За день до конца пришлём пуш. Отменишь — деньги не спишутся. Не отменишь — ${priceLine}.`,
        uk: `${trialDays} дн. усе відкрито безкоштовно. За день до кінця надішлемо пуш. Скасуєш — гроші не спишуться. Не скасуєш — ${priceLine}.`,
        es: `${trialDays} días todo gratis. Un día antes te avisamos. Si cancelas, no se cobra nada. Si no, ${priceLine}.`,
        'pt-BR': `${trialDays} dias com tudo liberado grátis. Um dia antes, enviaremos um aviso. Se cancelar, nada é cobrado. Se não, ${priceLine}.`,
        vi: `${trialDays} ngày mở tất cả miễn phí. Trước khi kết thúc một ngày, chúng tôi sẽ gửi nhắc nhở. Hủy thì không bị trừ tiền. Không hủy thì ${priceLine}.`,
        id: `${trialDays} hari semua terbuka gratis. Sehari sebelum berakhir, kami kirim notifikasi. Kalau dibatalkan, tidak ada tagihan. Kalau tidak, ${priceLine}.`,
        tr: `${trialDays} gün boyunca her şey ücretsiz açık. Bitmeden bir gün önce bildirim göndeririz. İptal edersen ücret alınmaz. Etmezsen ${priceLine}.`,
        pl: `${trialDays} dni wszystko jest otwarte za darmo. Dzień przed końcem wyślemy powiadomienie. Anulujesz — nic nie pobierzemy. Nie anulujesz — ${priceLine}.`,
      }),
    }] : []),
    {
      q: triLang(lang, {
        ru: 'Как отменить?',
        uk: 'Як скасувати?',
        es: '¿Cómo cancelo?',
        'pt-BR': 'Como cancelar?',
        vi: 'Hủy bằng cách nào?',
        id: 'Bagaimana cara membatalkan?',
        tr: 'Nasıl iptal ederim?',
        pl: 'Jak anulować?',
      }),
      a: triLang(lang, {
        ru: 'Настройки телефона → Подписки → Phraseman → Отменить. Две минуты, без писем и звонков. Доступ останется до конца оплаченного срока.',
        uk: 'Налаштування телефона → Підписки → Phraseman → Скасувати. Дві хвилини, без листів і дзвінків. Доступ лишиться до кінця оплаченого строку.',
        es: 'Ajustes del teléfono → Suscripciones → Phraseman → Cancelar. Dos minutos, sin correos ni llamadas. El acceso sigue hasta el final del período pagado.',
        'pt-BR': 'Ajustes do telefone → Assinaturas → Phraseman → Cancelar. Dois minutos, sem e-mails nem ligações. O acesso continua até o fim do período pago.',
        vi: 'Cài đặt điện thoại → Đăng ký → Phraseman → Hủy. Hai phút, không email hay cuộc gọi. Quyền truy cập vẫn còn đến hết kỳ đã thanh toán.',
        id: 'Pengaturan ponsel → Langganan → Phraseman → Batalkan. Dua menit, tanpa email atau telepon. Akses tetap aktif sampai periode berbayar berakhir.',
        tr: 'Telefon ayarları → Abonelikler → Phraseman → İptal et. İki dakika, e-posta veya arama yok. Erişim ücretli dönem bitene kadar sürer.',
        pl: 'Ustawienia telefonu → Subskrypcje → Phraseman → Anuluj. Dwie minuty, bez maili i telefonów. Dostęp zostaje do końca opłaconego okresu.',
      }),
    },
    {
      q: triLang(lang, {
        ru: 'Что входит в Plus?',
        uk: 'Що входить у Plus?',
        es: '¿Qué incluye Plus?',
        'pt-BR': 'O que inclui o Plus?',
        vi: 'Plus bao gồm những gì?',
        id: 'Apa saja isi Plus?',
        tr: 'Plus neleri içerir?',
        pl: 'Co zawiera Plus?',
      }),
      a: triLang(lang, {
        ru: 'Все уроки и уровни, безлимит энергии и карточек, все квизы, заморозка серии, занятия офлайн.',
        uk: 'Усі уроки й рівні, безліміт енергії та карток, усі квізи, заморозка серії, заняття офлайн.',
        es: 'Todas las lecciones y niveles, energía y tarjetas sin límite, todos los quizzes, protección de racha y modo offline.',
        'pt-BR': 'Todas as lições e níveis, energia e cartões sem limite, todos os quizzes, proteção de sequência e modo offline.',
        vi: 'Tất cả bài học và cấp độ, năng lượng và thẻ không giới hạn, mọi quiz, bảo vệ chuỗi và học offline.',
        id: 'Semua pelajaran dan level, energi dan kartu tanpa batas, semua kuis, perlindungan runtutan, dan mode offline.',
        tr: 'Tüm dersler ve seviyeler, sınırsız enerji ve kartlar, tüm quizler, seri koruması ve offline çalışma.',
        pl: 'Wszystkie lekcje i poziomy, energia i fiszki bez limitu, wszystkie quizy, ochrona serii i nauka offline.',
      }),
    },
  ];
  return (
    <ProofCard title={triLang(lang, {
      ru: 'Частые вопросы',
      uk: 'Часті питання',
      es: 'Preguntas frecuentes',
      'pt-BR': 'Perguntas frequentes',
      vi: 'Câu hỏi thường gặp',
      id: 'Pertanyaan umum',
      tr: 'Sık sorulan sorular',
      pl: 'Częste pytania',
    })} chrome={chrome}>
      {qa.map((item, i) => {
        const isOpen = open === i;
        return (
          <TouchableOpacity
            key={item.q}
            activeOpacity={0.7}
            onPress={() => {
              hapticTap();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpen(isOpen ? -1 : i);
            }}
            style={[S.faqQ, i < qa.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: chrome.cardBorder }]}
          >
            <View style={S.faqHead}>
              <Text style={[S.faqQText, { color: chrome.textPrimary }]}>{item.q}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={chrome.textMuted} />
            </View>
            {isOpen && <Text style={[S.faqA, { color: chrome.textMuted }]}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </ProofCard>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 13, marginTop: 12 },
  cardTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },

  mirrorRow: { flexDirection: 'row', gap: 8 },
  mirrorStat: { flex: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  mirrorValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  mirrorLabel: { fontSize: 9.5, marginTop: 2 },
  mirrorLine: { fontSize: 12, marginTop: 10, lineHeight: 17 },

  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctText: { flex: 1, fontSize: 12.5, lineHeight: 18 },

  // Стиль 4 — главный итог + чипы
  valHero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  valHeroBadge: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  valHeroLine: { flex: 1, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, lineHeight: 19 },
  valChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  valChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 11 },
  valChipIcon: { marginRight: 5 },
  valChipText: { fontSize: 12, fontWeight: '600' },

  // Стиль 2 — карточки «польза в заголовке»
  valCards: { marginTop: 14, gap: 9 },
  valCard: { borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  valCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  valCardIcon: { flexShrink: 0 },
  valCardTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  valCardDesc: { fontSize: 12, lineHeight: 16.5 },

  faqQ: { paddingVertical: 10 },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  faqQText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  faqA: { fontSize: 11.5, lineHeight: 16.5, marginTop: 7 },
});
