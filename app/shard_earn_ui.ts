/**
 * Подписи к модалке осколков по reasonKey (RU / UK / ES).
 */
import type { ShardSource } from './shards_system';
import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

type ShardEarnLabel = { ru: string; uk: string; es: string } & Record<PlannedInterfaceLang, string>;

const LABELS: Record<string, ShardEarnLabel> = {
  lesson_first: {
    ru: 'Первый урок покорён — держи блестящий бонус',
    uk: 'Перший урок підкорено — тримай блискучий бонус',
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
    es: 'Perfecto: sin fallos; recompensa merecida',
    'pt-BR': "Perfeito: sem erros, recompensa merecida",
    vi: "Hoàn hảo: không lỗi nào, phần thưởng xứng đáng",
    id: "Sempurna: tanpa salah, hadiah yang pantas",
    tr: "Mükemmel: hiç hata yok, hak edilmiş ödül",
    pl: "Idealnie: bez błędów, zasłużona nagroda",
  },
  lesson_quiz_passed: {
    ru: 'Зачёт сдан — знания закреплены, жемчужины твои',
    uk: 'Залік здано — знання закріплені, перлини твої',
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
    es: '30 días de racha: disciplina que brilla',
    'pt-BR': "30 dias de sequência: disciplina que brilha",
    vi: "Chuỗi 30 ngày: kỷ luật thật sự đang tỏa sáng",
    id: "30 hari beruntun: disiplin sejati yang bersinar",
    tr: "30 günlük seri: parlayan gerçek disiplin",
    pl: "30 dni serii: dyscyplina, która błyszczy",
  },
  arena_win: {
    ru: 'Победа на Арене — славный бой, славная награда',
    uk: 'Перемога на Арені — славний бій, славна нагорода',
    es: 'Victoria en la Arena: combate limpio, premio a la altura',
    'pt-BR': "Vitória na Arena: bom combate, prêmio à altura",
    vi: "Thắng Arena: trận đấu đẹp, phần thưởng xứng tầm",
    id: "Menang di Arena: pertarungan hebat, hadiah sepadan",
    tr: "Arena zaferi: iyi mücadele, hak edilmiş ödül",
    pl: "Zwycięstwo na Arenie: dobry bój, godna nagroda",
  },
  arena_match_wager_win: {
    ru: 'Ставка сыграла — победа на Арене с двойным вкусом',
    uk: 'Ставка зіграла — перемога на Арені з подвійним смаком',
    es: 'Apuesta ganada en la Arena: victoria con sabor a oro',
    'pt-BR': "Aposta vencida na Arena: vitória com gosto de ouro",
    vi: "Thắng cược Arena: chiến thắng có vị vàng",
    id: "Taruhan Arena menang: kemenangan dengan rasa emas",
    tr: "Arena bahsi kazandı: altın tadında zafer",
    pl: "Wygrany zakład na Arenie: zwycięstwo ze smakiem złota",
  },
  arena_10_wins: {
    ru: '10 побед — серия мастера, бонус по традиции',
    uk: '10 перемог — серія майстра, бонус за традицією',
    es: '10 victorias: racha de maestría, bonus clásico',
    'pt-BR': "10 vitórias: sequência de mestre, bônus clássico",
    vi: "10 chiến thắng: chuỗi bậc thầy, bonus quen thuộc",
    id: "10 kemenangan: rentetan master, bonus klasik",
    tr: "10 zafer: ustalık serisi, klasik bonus",
    pl: "10 zwycięstw: mistrzowska seria, klasyczny bonus",
  },
  arena_rank_up_streak: {
    ru: 'Ранг выше после серии побед — заслуженный взлёт',
    uk: 'Ранг вище після серії перемог — заслужений зліт',
    es: 'Subiste de rango tras una racha: ascenso merecido',
    'pt-BR': "Você subiu de ranque após uma sequência: ascensão merecida",
    vi: "Tăng hạng sau chuỗi thắng: cú vươn lên xứng đáng",
    id: "Naik peringkat setelah rentetan menang: kenaikan yang pantas",
    tr: "Galibiyet serisiyle rütbe atladın: hak edilmiş yükseliş",
    pl: "Awans po serii zwycięstw: zasłużony wzlot",
  },
  daily_tasks_all: {
    ru: 'Три дневных вызова закрыты — день прожит с пользой',
    uk: 'Три денні виклики закриті — день прожитий з користю',
    es: 'Las 3 tareas del día: jornada redonda',
    'pt-BR': "As 3 tarefas do dia: jornada completa",
    vi: "Hoàn tất 3 nhiệm vụ ngày: một ngày trọn vẹn",
    id: "3 tugas harian selesai: hari yang produktif",
    tr: "Günün 3 görevi tamam: dolu dolu bir gün",
    pl: "3 zadania dnia ukończone: udany dzień",
  },
  topic_completed: {
    ru: 'Вся тема пройдена — большой рывок, большой приз',
    uk: 'Уся тема пройдена — великий ривок, великий приз',
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
    es: '5 lecciones perfectas seguidas: club de precisión',
    'pt-BR': "5 lições perfeitas seguidas: clube da precisão",
    vi: "5 bài học hoàn hảo liên tiếp: câu lạc bộ chuẩn xác",
    id: "5 pelajaran sempurna beruntun: klub presisi",
    tr: "Üst üste 5 kusursuz ders: hassasiyet kulübü",
    pl: "5 perfekcyjnych lekcji z rzędu: klub precyzji",
  },
  level_gift: {
    ru: 'Новый уровень — небольшой подарок за рост',
    uk: 'Новий рівень — невеликий подарунок за зростання',
    es: 'Nuevo nivel: un regalo por tu progreso',
    'pt-BR': "Novo nível: um presente pelo seu progresso",
    vi: "Cấp mới: món quà nhỏ cho bước tiến",
    id: "Level baru: hadiah kecil untuk progresmu",
    tr: "Yeni seviye: gelişimin için küçük bir hediye",
    pl: "Nowy poziom: mały prezent za postęp",
  },
  level_premium_gift: {
    ru: 'Плюс‑подарок за уровень — только для тех, кто идёт вперёд',
    uk: 'Плюс-подарунок за рівень — лише для тих, хто рухається вперед',
    es: 'Regalo Plus por subir: para quien no se detiene',
    'pt-BR': "Presente Plus por subir: para quem segue em frente",
    vi: "Quà Plus khi lên cấp: dành cho người luôn tiến bước",
    id: "Hadiah Plus saat naik level: untuk yang terus maju",
    tr: "Seviye Plus hediyesi: ilerlemeyi sürdürenler için",
    pl: "Prezent Plus za poziom: dla tych, którzy idą dalej",
  },
  release_wave_bonus: {
    ru: 'Бонус обновления — спасибо, что обновился',
    uk: 'Бонус оновлення — дякуємо, що оновився',
    es: 'Bonificación por actualizar: gracias por estar al día',
    'pt-BR': "Bônus de atualização: obrigado por estar em dia",
    vi: "Bonus cập nhật: cảm ơn bạn đã lên phiên bản mới",
    id: "Bonus pembaruan: terima kasih sudah memperbarui",
    tr: "Güncelleme bonusu: güncel kaldığın için teşekkürler",
    pl: "Bonus aktualizacji: dzięki, że jesteś na bieżąco",
  },
  remote_shard_reward: {
    ru: 'Команда начислила жемчужины — твоя помощь не забыта',
    uk: 'Команда нарахувала перлини — твоя допомога не забута',
    es: 'Perlas del equipo: tu ayuda cuenta',
    'pt-BR': "Pérolas da equipe: sua ajuda conta",
    vi: "Xu từ đội ngũ: sự hỗ trợ của bạn rất đáng giá",
    id: "Koin dari tim: bantuanmu berarti",
    tr: "Ekipten jetonlar: yardımın değerli",
    pl: "Monety od zespołu: twoja pomoc ma znaczenie",
  },
  streak_wager_win: {
    ru: 'Турнир на цепочку выигран — ставка окупилась с лихвой',
    uk: 'Стрік-турнір виграно — ставка окупилася з лихвою',
    es: 'Torneo de racha ganado: la apuesta rindió de sobra',
    'pt-BR': "Torneio de sequência vencido: a aposta rendeu muito",
    vi: "Thắng giải chuỗi ngày: lượt cược sinh lời lớn",
    id: "Turnamen rentetan dimenangkan: taruhan terbayar lebih",
    tr: "Seri turnuvası kazanıldı: bahis fazlasıyla karşılığını verdi",
    pl: "Turniej serii wygrany: zakład opłacił się z nawiązką",
  },
  club_boost_refund: {
    ru: 'Возврат жемчужин за буст клуба',
    uk: 'Повернення перлин за буст клубу',
    es: 'Devolución de perlas (boost del club)',
    'pt-BR': "Reembolso de pérolas pelo boost do clube",
    vi: "Hoàn xu cho boost câu lạc bộ",
    id: "Pengembalian koin untuk boost klub",
    tr: "Kulüp boostu için jeton iadesi",
    pl: "Zwrot monet za boost klubu",
  },
  achievement_shard: {
    ru: 'Достижение разблокировано — приз на полку почёта',
    uk: 'Досягнення розблоковано — приз на полицю пошани',
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
    es: 'Preposiciones a la perfección',
    'pt-BR': "Treino de preposições sem nenhum erro",
    vi: "Luyện giới từ không một lỗi",
    id: "Latihan preposisi tanpa satu pun salah",
    tr: "Edat alıştırması tek hatasız",
    pl: "Trening przyimków bez ani jednego błędu",
  },
  trainer_perfect_session: {
    ru: 'Умная тренировка без ошибок — слабые места под контролем',
    uk: 'Розумне тренування без помилок — слабкі місця під контролем',
    es: 'Sesión inteligente sin fallos: tus puntos débiles bajo control',
    'pt-BR': "Sessão inteligente sem erros: pontos fracos sob controle",
    vi: "Phiên luyện thông minh không lỗi: điểm yếu trong tầm kiểm soát",
    id: "Sesi pintar tanpa salah: titik lemah terkendali",
    tr: "Hatasız akıllı seans: zayıf yönler kontrol altında",
    pl: "Inteligentna sesja bez błędów: słabe punkty pod kontrolą",
  },
  pos_mastery_level: {
    ru: 'Уровень части речи повышен — персональная отработка принесла награду',
    uk: 'Рівень частини мови підвищено — персональне тренування принесло нагороду',
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
    es: 'Diagnóstico perfecto: el punto débil ya está más fuerte',
    'pt-BR': "Diagnóstico perfeito: o ponto fraco ficou bem mais forte",
    vi: "Chẩn đoán hoàn hảo: điểm yếu đã mạnh hơn rõ rệt",
    id: "Diagnosis sempurna: titik lemah kini jauh lebih kuat",
    tr: "Mükemmel tanı: zayıf nokta belirgin biçimde güçlendi",
    pl: "Diagnoza idealna: słaby punkt jest wyraźnie mocniejszy",
  },
  generic_raw: {
    ru: 'Начисление жемчужин',
    uk: 'Нарахування перлин',
    es: 'Perlas acreditados',
    'pt-BR': "Pérolas de conhecimento creditados",
    vi: "Đã cộng xu tri thức",
    id: "Koin pengetahuan dikreditkan",
    tr: "Bilgi jetonları eklendi",
    pl: "Monety wiedzy przyznane",
  },
};

function pickLabel(row: ShardEarnLabel, lang: Lang): string {
  if (lang === 'uk') return row.uk;
  if (lang === 'es') return row.es;
  return row.ru;
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
