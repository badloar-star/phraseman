/**
 * Подписи к модалке начисления монет по reasonKey (RU / UK / ES).
 */
import type { ShardSource } from './shards_system';
import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

type ShardEarnLabel = { ru: string; uk: string; en: string; es: string } & Record<PlannedInterfaceLang, string>;

const LABELS: Record<string, ShardEarnLabel> = {
  lesson_first: {
    ru: 'Первый урок покорён — держи блестящий бонус',
    uk: 'Перший урок підкорено — тримай блискучий бонус',
    en: 'First lesson conquered — here\'s a shiny bonus',
    es: 'Primera lección completada: brillo extra para ti',
    'pt-BR': "Primeira lição concluída: brilho extra para você",
    vi: "Bài học đầu tiên hoàn tất: tặng bạn chút lấp lánh",
    id: "Pelajaran pertama selesai: bonus berkilau untukmu",
    tr: "İlk ders tamamlandı: sana parlak bir bonus",
    pl: "Pierwsza lekcja ukończona: błyszczący bonus dla ciebie",
  },
  lesson_perfect: {
    ru: 'Идеально: ни одной ошибки, заслуженная награда',
    uk: 'Ідеально: жодної помилки — заслужена нагорода',
    en: 'Perfect: not a single mistake, a well-earned reward',
    es: 'Perfecto: sin fallos; recompensa merecida',
    'pt-BR': "Perfeito: sem erros, recompensa merecida",
    vi: "Hoàn hảo: không lỗi nào, phần thưởng xứng đáng",
    id: "Sempurna: tanpa salah, hadiah yang pantas",
    tr: "Mükemmel: hiç hata yok, hak edilmiş ödül",
    pl: "Idealnie: bez błędów, zasłużona nagroda",
  },
  lesson_quiz_passed: {
    ru: 'Зачёт сдан — знания закреплены, монеты твои',
    uk: 'Залік здано — знання закріплені, монети твої',
    en: 'Quiz passed — knowledge locked in, coins are yours',
    es: 'Examen de nivel superado: conocimiento asegurado',
    'pt-BR': "Teste de nível superado: conhecimento consolidado",
    vi: "Bài kiểm tra cấp độ đã qua: kiến thức đã vững",
    id: "Ujian level lulus: pengetahuan sudah mantap",
    tr: "Seviye sınavı geçildi: bilgi pekişti",
    pl: "Test poziomu zaliczony: wiedza utrwalona",
  },
  lesson_completed: {
    ru: 'Раздел закрыт полностью — приз за упорство',
    uk: 'Розділ закрито повністю — приз за наполегливість',
    en: 'Section fully cleared — a prize for persistence',
    es: 'Sección cerrada al completo: premio por constancia',
    'pt-BR': "Seção concluída por inteiro: prêmio pela persistência",
    vi: "Hoàn tất toàn bộ phần: phần thưởng cho sự bền bỉ",
    id: "Bagian selesai penuh: hadiah untuk ketekunan",
    tr: "Bölüm tamamen bitti: sebat ödülü",
    pl: "Sekcja zamknięta w całości: nagroda za wytrwałość",
  },
  streak_7: {
    ru: '7 дней подряд — редкая регулярность, редкий бонус',
    uk: '7 днів поспіль — рідкісна регулярність, рідкісний бонус',
    en: '7 days in a row — rare consistency, rare bonus',
    es: '7 días seguidos: constancia que merece brillo extra',
    'pt-BR': "7 dias seguidos: constância que merece brilho extra",
    vi: "7 ngày liên tiếp: đều đặn hiếm có, bonus xứng đáng",
    id: "7 hari berturut-turut: konsistensi langka, bonus langka",
    tr: "7 gün üst üste: ekstra parıltıyı hak eden düzen",
    pl: "7 dni z rzędu: regularność warta dodatkowego blasku",
  },
  streak_30: {
    ru: '30 дней цепочки подряд — настоящая дисциплина заслужила сияние',
    uk: '30 днів стріку — справжня дисципліна заслуговує сяйва',
    en: '30-day streak — real discipline earns a real glow',
    es: '30 días de racha: disciplina que brilla',
    'pt-BR': "30 dias de sequência: disciplina que brilha",
    vi: "Chuỗi 30 ngày: kỷ luật thật sự đang tỏa sáng",
    id: "30 hari beruntun: disiplin sejati yang bersinar",
    tr: "30 günlük seri: parlayan gerçek disiplin",
    pl: "30 dni serii: dyscyplina, która błyszczy",
  },
  topic_completed: {
    ru: 'Вся тема пройдена — большой рывок, большой приз',
    uk: 'Уся тема пройдена — великий ривок, великий приз',
    en: 'Whole topic done — big leap, big prize',
    es: 'Tema completado: gran salto, gran recompensa',
    'pt-BR': "Tema concluído: grande salto, grande recompensa",
    vi: "Hoàn tất chủ đề: bước tiến lớn, phần thưởng lớn",
    id: "Topik selesai: lompatan besar, hadiah besar",
    tr: "Konu tamamlandı: büyük sıçrama, büyük ödül",
    pl: "Temat ukończony: duży krok, duża nagroda",
  },
  exam_excellent: {
    ru: 'Экзамен на отлично — золотой стандарт знаний',
    uk: 'Іспит на відмінно — золотий стандарт знань',
    en: 'Exam aced — the gold standard of knowledge',
    es: 'Examen excelente: estándar de oro',
    'pt-BR': "Exame excelente: padrão ouro",
    vi: "Bài thi xuất sắc: chuẩn vàng",
    id: "Ujian luar biasa: standar emas",
    tr: "Sınav harika: altın standart",
    pl: "Egzamin na świetnie: złoty standard",
  },
  diagnostic_test: {
    ru: 'Диагностика пройдена — отправная точка с бонусом',
    uk: 'Діагностика пройдена — відправна точка з бонусом',
    en: 'Diagnostic done — a starting point with a bonus',
    es: 'Test de diagnóstico: punto de partida con regalo',
    'pt-BR': "Teste diagnóstico concluído: ponto de partida com presente",
    vi: "Hoàn tất chẩn đoán: điểm khởi đầu kèm quà",
    id: "Tes diagnostik selesai: titik awal dengan hadiah",
    tr: "Tanı testi tamam: hediyeli başlangıç noktası",
    pl: "Diagnostyka ukończona: punkt startu z bonusem",
  },
  lessons_5_perfect: {
    ru: 'Пять идеальных уроков подряд — клуб перфекционистов',
    uk: 'П\'ять ідеальних уроків поспіль — клуб перфекціоністів',
    en: 'Five flawless lessons in a row — welcome to the perfectionist club',
    es: '5 lecciones perfectas seguidas: club de precisión',
    'pt-BR': "5 lições perfeitas seguidas: clube da precisão",
    vi: "5 bài học hoàn hảo liên tiếp: câu lạc bộ chuẩn xác",
    id: "5 pelajaran sempurna beruntun: klub presisi",
    tr: "Üst üste 5 kusursuz ders: hassasiyet kulübü",
    pl: "5 perfekcyjnych lekcji z rzędu: klub precyzji",
  },
  release_wave_bonus: {
    ru: 'Бонус обновления — спасибо, что обновился',
    uk: 'Бонус оновлення — дякуємо, що оновився',
    en: 'Update bonus — thanks for updating',
    es: 'Bonificación por actualizar: gracias por estar al día',
    'pt-BR': "Bônus de atualização: obrigado por estar em dia",
    vi: "Bonus cập nhật: cảm ơn bạn đã lên phiên bản mới",
    id: "Bonus pembaruan: terima kasih sudah memperbarui",
    tr: "Güncelleme bonusu: güncel kaldığın için teşekkürler",
    pl: "Bonus aktualizacji: dzięki, że jesteś na bieżąco",
  },
  remote_shard_reward: {
    ru: 'Команда начислила монеты — твоя помощь не забыта',
    uk: 'Команда нарахувала монети — твоя допомога не забута',
    en: 'The team credited coins — your help wasn\'t forgotten',
    es: 'Monedas del equipo: tu ayuda cuenta',
    'pt-BR': "Moedas da equipe: sua ajuda conta",
    vi: "Xu từ đội ngũ: sự hỗ trợ của bạn rất đáng giá",
    id: "Koin dari tim: bantuanmu berarti",
    tr: "Ekipten jetonlar: yardımın değerli",
    pl: "Monety od zespołu: twoja pomoc ma znaczenie",
  },
  achievement_shard: {
    ru: 'Достижение разблокировано — приз на полку почёта',
    uk: 'Досягнення розблоковано — приз на полицю пошани',
    en: 'Achievement unlocked — a prize for the trophy shelf',
    es: 'Logro desbloqueado: premio para la vitrina',
    'pt-BR': "Conquista desbloqueada: prêmio para a vitrine",
    vi: "Đã mở thành tích: phần thưởng lên kệ danh dự",
    id: "Pencapaian terbuka: hadiah untuk etalase",
    tr: "Başarım açıldı: onur rafına ödül",
    pl: "Osiągnięcie odblokowane: nagroda do gabloty",
  },
  preposition_drill_perfect: {
    ru: 'Тренажёр предлогов без единой ошибки',
    uk: 'Тренажер прийменників без жодної помилки',
    en: 'Preposition drill, not a single mistake',
    es: 'Preposiciones a la perfección',
    'pt-BR': "Treino de preposições sem nenhum erro",
    vi: "Luyện giới từ không một lỗi",
    id: "Latihan preposisi tanpa satu pun salah",
    tr: "Edat alıştırması tek hatasız",
    pl: "Trening przyimków bez ani jednego błędu",
  },
  pos_mastery_level: {
    ru: 'Уровень части речи повышен — персональная отработка принесла награду',
    uk: 'Рівень частини мови підвищено — персональне тренування принесло нагороду',
    en: 'Part-of-speech level up — focused practice paid off',
    es: 'Nivel gramatical subido: recompensa por práctica personalizada',
    'pt-BR': "Nível gramatical subiu: treino personalizado trouxe recompensa",
    vi: "Cấp từ loại tăng: luyện tập cá nhân đã mang về phần thưởng",
    id: "Level kelas kata naik: latihan personal memberi hadiah",
    tr: "Sözcük türü seviyesi yükseldi: kişisel çalışma ödül getirdi",
    pl: "Poziom części mowy wzrósł: trening osobisty przyniósł nagrodę",
  },
  pos_pool_perfect: {
    ru: 'Диагноз закреплён идеально — слабое место стало заметно крепче',
    uk: 'Діагноз закріплено ідеально — слабке місце стало помітно міцнішим',
    en: 'Diagnosis nailed perfectly — that weak spot just got noticeably stronger',
    es: 'Diagnóstico perfecto: el punto débil ya está más fuerte',
    'pt-BR': "Diagnóstico perfeito: o ponto fraco ficou bem mais forte",
    vi: "Chẩn đoán hoàn hảo: điểm yếu đã mạnh hơn rõ rệt",
    id: "Diagnosis sempurna: titik lemah kini jauh lebih kuat",
    tr: "Mükemmel tanı: zayıf nokta belirgin biçimde güçlendi",
    pl: "Diagnoza idealna: słaby punkt jest wyraźnie mocniejszy",
  },
  fc_checkpoint: {
    ru: 'Сундук недельного трека карточек открыт — награда в монетах',
    uk: 'Скриню тижневого треку карток відкрито — нагорода в монетах',
    en: 'Weekly flashcard chest opened — reward in coins',
    es: 'Cofre del progreso semanal abierto: recompensa en monedas',
    'pt-BR': 'Baú do progresso semanal aberto: recompensa em moedas',
    vi: 'Đã mở rương tiến độ tuần: phần thưởng bằng xu',
    id: 'Peti progres mingguan terbuka: hadiah berupa koin',
    tr: 'Haftalık ilerleme sandığı açıldı: ödül jeton olarak',
    pl: 'Skrzynia tygodniowego postępu otwarta: nagroda w monetach',
  },
  generic_raw: {
    ru: 'Начисление монет',
    uk: 'Нарахування монет',
    en: 'Coins credited',
    es: 'Monedas acreditadas',
    'pt-BR': "Moedas creditadas",
    vi: "Đã cộng xu",
    id: "Koin dikreditkan",
    tr: "Jetonlar eklendi",
    pl: "Monety przyznane",
  },
};

function pickLabel(row: ShardEarnLabel, lang: Lang): string {
  return row[lang];
}

export function labelForShardModalReason(key: string | undefined, lang: Lang): string {
  if (!key) {
    return pickLabel(LABELS.generic_raw, lang);
  }
  const row = LABELS[key];
  if (row) return pickLabel(row, lang);
  return key;
}

/** Склейка из нескольких типов наград за урок (одна модалка). */
export function formatLessonShardBatchReason(keys: ShardSource[], lang: Lang): string {
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    return pickLabel(LABELS.generic_raw, lang);
  }
  if (unique.length === 1) {
    return labelForShardModalReason(unique[0], lang);
  }
  const sep = ' · ';
  const parts = unique.map((k) => labelForShardModalReason(k, lang));
  return parts.join(sep);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
