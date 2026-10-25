/**
 * Подписи к модалке начисления монет по reasonKey (RU / UK / ES).
 */
import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

type ShardEarnLabel = { ru: string; uk: string; en: string; es: string } & Record<PlannedInterfaceLang, string>;

// зачем (голос PhraseMan, VOICE.md 25.10): подпись к монетам — что сделано и сколько, без пафоса («золотой стандарт», «диагноз закреплён»); generic_raw держит тест.
const LABELS: Record<string, ShardEarnLabel> = {
  lesson_first: {
    ru: "Первый урок позади — держи бонус!",
    uk: "Перший урок позаду — тримай бонус!",
    en: "First lesson done — here’s a bonus!",
    es: "¡Primera lección hecha! Toma un bonus",
    'pt-BR': "Primeira lição feita — toma um bônus!",
    vi: "Xong bài đầu tiên — tặng bạn phần thưởng!",
    id: "Pelajaran pertama beres — ini bonusnya!",
    tr: "İlk ders tamam — al sana bonus!",
    pl: "Pierwsza lekcja za tobą — łap bonus!",
  },
  lesson_perfect: {
    ru: "Ни одной ошибки — монеты заслужены",
    uk: "Жодної помилки — монети заслужено",
    en: "Zero mistakes — coins well earned",
    es: "Cero errores: monedas bien ganadas",
    'pt-BR': "Zero erros — moedas bem merecidas",
    vi: "Không một lỗi — xu xứng đáng",
    id: "Nol kesalahan — koinnya pantas",
    tr: "Sıfır hata — jetonları hak ettin",
    pl: "Zero błędów — monety zasłużone",
  },
  lesson_quiz_passed: {
    ru: "Зачёт сдан — монеты твои",
    uk: "Залік складено — монети твої",
    en: "Quiz passed — the coins are yours",
    es: "Prueba superada: las monedas son tuyas",
    'pt-BR': "Teste aprovado — as moedas são suas",
    vi: "Qua bài kiểm tra — xu là của bạn",
    id: "Kuis lulus — koinnya milikmu",
    tr: "Sınavı geçtin — jetonlar senin",
    pl: "Zaliczone — monety są twoje",
  },
  lesson_completed: {
    ru: "Раздел пройден целиком — вот приз",
    uk: "Розділ пройдено повністю — ось приз",
    en: "Whole section done — here’s your prize",
    es: "Sección completa: aquí tu premio",
    'pt-BR': "Seção completa — aqui está seu prêmio",
    vi: "Xong trọn phần — phần thưởng đây",
    id: "Satu bagian tuntas — ini hadiahnya",
    tr: "Bölümün tamamı bitti — ödülün burada",
    pl: "Cała sekcja za tobą — oto nagroda",
  },
  streak_7: {
    ru: "7 дней подряд — неделя без пропусков!",
    uk: "7 днів поспіль — тиждень без пропусків!",
    en: "7 days in a row — a week with no gaps!",
    es: "7 días seguidos: ¡una semana sin fallar!",
    'pt-BR': "7 dias seguidos — uma semana sem falhar!",
    vi: "7 ngày liên tiếp — cả tuần không nghỉ!",
    id: "7 hari berturut-turut — seminggu tanpa bolong!",
    tr: "7 gün üst üste — boşluksuz bir hafta!",
    pl: "7 dni z rzędu — tydzień bez przerwy!",
  },
  streak_30: {
    ru: "30 дней серии — целый месяц! Это уже привычка",
    uk: "30 днів серії — цілий місяць! Це вже звичка",
    en: "30-day streak — a whole month! That’s a habit now",
    es: "30 días de racha: ¡un mes entero! Ya es costumbre",
    'pt-BR': "30 dias de sequência — um mês inteiro! Já virou hábito",
    vi: "Chuỗi 30 ngày — tròn một tháng! Thành thói quen rồi",
    id: "Rangkaian 30 hari — sebulan penuh! Sudah jadi kebiasaan",
    tr: "30 günlük seri — koca bir ay! Artık alışkanlık",
    pl: "30 dni serii — cały miesiąc! To już nawyk",
  },
  topic_completed: {
    ru: "Тема пройдена целиком — большой шаг!",
    uk: "Тему пройдено повністю — великий крок!",
    en: "Whole topic done — a big step!",
    es: "Tema completo: ¡un gran paso!",
    'pt-BR': "Tema completo — um grande passo!",
    vi: "Xong trọn chủ đề — một bước lớn!",
    id: "Satu topik tuntas — langkah besar!",
    tr: "Konunun tamamı bitti — büyük adım!",
    pl: "Cały temat za tobą — duży krok!",
  },
  exam_excellent: {
    ru: "Экзамен на отлично — так держать!",
    uk: "Іспит на відмінно — так тримати!",
    en: "Aced the exam — keep it up!",
    es: "Examen sobresaliente: ¡sigue así!",
    'pt-BR': "Prova gabaritada — continue assim!",
    vi: "Bài thi xuất sắc — cứ thế phát huy!",
    id: "Ujian nilai sempurna — pertahankan!",
    tr: "Sınavda harika iş — böyle devam!",
    pl: "Egzamin na piątkę — tak trzymaj!",
  },
  diagnostic_test: {
    ru: "Проверка уровня пройдена — бонус на старт",
    uk: "Перевірку рівня пройдено — бонус на старт",
    en: "Level check done — a starter bonus",
    es: "Prueba de nivel hecha: bonus de inicio",
    'pt-BR': "Teste de nível feito — bônus de início",
    vi: "Xong bài kiểm tra trình độ — thưởng khởi đầu",
    id: "Cek level selesai — bonus awal",
    tr: "Seviye testi bitti — başlangıç bonusu",
    pl: "Sprawdzian poziomu zaliczony — bonus na start",
  },
  lessons_5_perfect: {
    ru: "Пять уроков подряд без ошибок — это талант",
    uk: "П’ять уроків поспіль без помилок — це талант",
    en: "Five flawless lessons in a row — that’s talent",
    es: "Cinco lecciones seguidas sin errores: eso es talento",
    'pt-BR': "Cinco lições seguidas sem erros — isso é talento",
    vi: "Năm bài liên tiếp không lỗi — đúng là tài năng",
    id: "Lima pelajaran beruntun tanpa salah — itu bakat",
    tr: "Üst üste beş hatasız ders — bu yetenek",
    pl: "Pięć lekcji z rzędu bez błędów — to talent",
  },
  release_wave_bonus: {
    ru: "Спасибо за обновление — держи бонус",
    uk: "Дякуємо за оновлення — тримай бонус",
    en: "Thanks for updating — here’s a bonus",
    es: "Gracias por actualizar: aquí tienes un bonus",
    'pt-BR': "Obrigado por atualizar — toma um bônus",
    vi: "Cảm ơn bạn đã cập nhật — tặng bạn phần thưởng",
    id: "Terima kasih sudah memperbarui — ini bonusnya",
    tr: "Güncellediğin için teşekkürler — al sana bonus",
    pl: "Dzięki za aktualizację — łap bonus",
  },
  remote_shard_reward: {
    ru: "Монеты от команды Phraseman — спасибо за помощь",
    uk: "Монети від команди Phraseman — дякуємо за допомогу",
    en: "Coins from the Phraseman team — thanks for your help",
    es: "Monedas del equipo de Phraseman: gracias por tu ayuda",
    'pt-BR': "Moedas da equipe Phraseman — obrigado pela ajuda",
    vi: "Xu từ đội Phraseman — cảm ơn bạn đã giúp",
    id: "Koin dari tim Phraseman — terima kasih atas bantuanmu",
    tr: "Phraseman ekibinden jeton — yardımın için teşekkürler",
    pl: "Monety od zespołu Phraseman — dzięki za pomoc",
  },
  achievement_shard: {
    ru: "Новое достижение — и монеты в придачу",
    uk: "Нове досягнення — і монети на додачу",
    en: "New achievement — with coins on top",
    es: "Nuevo logro, y monedas de regalo",
    'pt-BR': "Nova conquista — e moedas de brinde",
    vi: "Thành tích mới — kèm theo xu",
    id: "Pencapaian baru — plus koin",
    tr: "Yeni başarım — üstüne jeton",
    pl: "Nowe osiągnięcie — i monety w gratisie",
  },
  preposition_drill_perfect: {
    ru: "Предлоги без единой ошибки!",
    uk: "Прийменники без жодної помилки!",
    en: "Prepositions with zero mistakes!",
    es: "¡Preposiciones sin un solo error!",
    'pt-BR': "Preposições sem nenhum erro!",
    vi: "Giới từ không sai câu nào!",
    id: "Preposisi tanpa satu pun salah!",
    tr: "Edatlarda tek hata yok!",
    pl: "Przyimki bez jednego błędu!",
  },
  pos_mastery_level: {
    ru: "Новый уровень в отработке — монеты твои",
    uk: "Новий рівень у відпрацюванні — монети твої",
    en: "New practice level — the coins are yours",
    es: "Nuevo nivel de práctica: las monedas son tuyas",
    'pt-BR': "Novo nível de prática — as moedas são suas",
    vi: "Lên cấp luyện tập mới — xu là của bạn",
    id: "Level latihan baru — koinnya milikmu",
    tr: "Yeni alıştırma seviyesi — jetonlar senin",
    pl: "Nowy poziom ćwiczeń — monety są twoje",
  },
  pos_pool_perfect: {
    ru: "Слабое место закрыто без ошибок",
    uk: "Слабке місце закрито без помилок",
    en: "Weak spot fixed without a single mistake",
    es: "Punto débil superado sin errores",
    'pt-BR': "Ponto fraco resolvido sem erros",
    vi: "Điểm yếu đã khắc phục, không một lỗi",
    id: "Titik lemah beres tanpa salah",
    tr: "Zayıf nokta hatasız kapandı",
    pl: "Słaby punkt opanowany bez błędów",
  },
  fc_checkpoint: {
    ru: "Сундук недели в карточках открыт — внутри монеты",
    uk: "Скриня тижня в картках відкрита — усередині монети",
    en: "Weekly cards chest opened — coins inside",
    es: "Cofre semanal de tarjetas abierto: dentro hay monedas",
    'pt-BR': "Baú semanal dos cartões aberto — tem moedas dentro",
    vi: "Mở rương thẻ của tuần — bên trong có xu",
    id: "Peti kartu mingguan terbuka — isinya koin",
    tr: "Haftalık kart sandığı açıldı — içinde jeton var",
    pl: "Tygodniowa skrzynia kart otwarta — w środku monety",
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
