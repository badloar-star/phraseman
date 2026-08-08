import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { ACHIEVEMENT_ES } from './achievements_es_locale';
import { addShardsRaw, getShardsBalance } from './shards_system';
import { registerXP } from './xp_manager';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { writeFriendEvent } from './firestore_friend_activity';
import { DEV_MODE, IS_STORE_RELEASE } from './config';
import {
  achievementStateKey,
  achievementLessonMarathonDayKey,
  activeRecallAchievementCorrectCountKey,
  comboAchievementCounterKey,
  achievementLessonPerfectPassesKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  dailyTasksAchievementAllDoneStreakKey,
  dailyTasksAchievementNoRerollStreakKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementSourceSetKey,
  flashcardsAchievementViewStreakKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsSavedKey,
  lessonPassCountKey,
  lessonProgressKey,
  quizAchievementCounterKey,
  quizPerfectLevelsTodayKey,
  quizPerfectStreakKey,
  shareAchievementCounterKey,
  storageStudyTarget,
  trainerAchievementCorrectCountKey,
  trainerAchievementCorrectStreakKey,
  trainerAchievementPerfectSessionCountKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

const safeAchievementEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

/**
 * Достижения: ru/uk здесь; es — achievements_es_locale.ts.
 *
 * Качество текстов проверяем по 10 правилам:
 * 1. Соответствие коду — условие разблокировки = checkAchievements + источники событий.
 * 2. Без ложных деталей — не обещаем то, чего триггер не проверяет.
 * 3. Ясные числа — пороги дней, XP, уроков, % как в коде.
 * 4. Различие метрик — «цепочка активности (опыт)» ≠ «вход в приложение подряд».
 * 5. Единый стиль — короткое имя + одно предложение «что сделать».
 * 6. Пары RU/UK — тот же смысл, естественная грамматика.
 * 7. Секреты — не раскрывать условие лишнего до получения (где задумано).
 * 8. Без технического жаргона в UI — никаких id вроде gem_* в описании.
 * 9. Согласованность с ES — тот же смысл, что ACHIEVEMENT_ES.
 * 10. Краткость — описание до ~120 символов RU, без воды.
 */

export interface Achievement {
  id:       string;
  icon:     string;           // emoji (резерв / шаринг)
  category: 'streak' | 'lessons' | 'xp' | 'quiz' | 'combo' | 'special' | 'medal';
  nameRu:   string;
  nameUk:   string;
  nameEs?:  string;
  descRu:   string;
  descUk:   string;
  descEs?:  string;
  xp:       number;           // XP при первой разблокировке
  secret?:  boolean;          // скрыто, пока не получено
}

export interface AchievementState {
  id:          string;
  unlockedAt:  string | null; // ISO datetime
  notified:    boolean;       // показан тост
  /**
   * +1 осколок за достижение: после разблокировки = false, пока не забрано в магазине.
   * Для обратной совместимости: незаклеймленным в старых версиях считаем как true (до миграции shardClaimed).
   */
  shardClaimed?: boolean;
}

type AchievementLocalePicker = (achievement: Achievement) => string | undefined;
type PlannedAchievementLang = Extract<Lang, 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl'>;
type PlannedAchievementCopy = Record<PlannedAchievementLang, { name: string; description: string }>;
type PlannedAchievementField = 'name' | 'description';

const ACHIEVEMENT_PLANNED_COPY: Partial<Record<string, PlannedAchievementCopy>> = {
  streak_3: {
    'pt-BR': { name: 'Primeiros três', description: 'Ganhe XP no app por 3 dias seguidos na sequência de atividade.' },
    vi: { name: 'Ba ngày đầu tiên', description: 'Nhận XP trong ứng dụng 3 ngày liên tiếp trong chuỗi hoạt động.' },
    id: { name: 'Tiga pertama', description: 'Dapatkan XP di aplikasi selama 3 hari berturut-turut dalam streak aktivitas.' },
    tr: { name: 'İlk üç', description: 'Etkinlik serisinde 3 gün üst üste uygulamada XP kazan.' },
    pl: { name: 'Pierwsze trzy', description: 'Zdobywaj XP w aplikacji przez 3 dni z rzędu w serii aktywności.' },
  },
  streak_7: {
    'pt-BR': { name: 'Uma semana seguida', description: '7 dias seguidos com XP; congelamento, reparo ou escudo podem preservar a sequência.' },
    vi: { name: 'Một tuần liên tiếp', description: '7 ngày liên tiếp có XP; đóng băng, sửa chuỗi hoặc khiên có thể giữ chuỗi.' },
    id: { name: 'Seminggu berturut-turut', description: '7 hari berturut-turut dengan XP; freeze, perbaikan, atau shield bisa menjaga streak.' },
    tr: { name: 'Bir hafta üst üste', description: 'XP kazanılan 7 gün üst üste; dondurma, onarım veya kalkan seriyi koruyabilir.' },
    pl: { name: 'Tydzień z rzędu', description: '7 dni z rzędu ze zdobytym XP; zamrożenie, naprawa lub tarcza mogą ochronić serię.' },
  },
  streak_14: {
    'pt-BR': { name: 'Duas semanas', description: '14 dias seguidos com XP; isso não é o mesmo que entrar todos os dias.' },
    vi: { name: 'Hai tuần', description: '14 ngày liên tiếp có XP; khác với việc chỉ đăng nhập hằng ngày.' },
    id: { name: 'Dua minggu', description: '14 hari berturut-turut dengan XP; ini berbeda dari login harian.' },
    tr: { name: 'İki hafta', description: 'XP kazanılan 14 gün üst üste; bu günlük giriş yapmakla aynı şey değildir.' },
    pl: { name: 'Dwa tygodnie', description: '14 dni z rzędu ze zdobytym XP; to nie to samo co codzienne logowanie.' },
  },
  streak_30: {
    'pt-BR': { name: 'Um mês firme', description: 'Ganhe XP pelo menos uma vez por dia durante 30 dias seguidos.' },
    vi: { name: 'Một tháng bền bỉ', description: 'Nhận XP ít nhất một lần mỗi ngày trong 30 ngày liên tiếp.' },
    id: { name: 'Sebulan konsisten', description: 'Dapatkan XP setidaknya sekali sehari selama 30 hari berturut-turut.' },
    tr: { name: 'Bir ay ayakta', description: '30 gün üst üste her gün en az bir kez XP kazan.' },
    pl: { name: 'Miesiąc w rytmie', description: 'Zdobywaj XP co najmniej raz dziennie przez 30 dni z rzędu.' },
  },
  streak_60: {
    'pt-BR': { name: 'Dois meses', description: 'Mantenha a sequência de atividade por 60 dias seguidos.' },
    vi: { name: 'Hai tháng', description: 'Duy trì chuỗi hoạt động trong 60 ngày liên tiếp.' },
    id: { name: 'Dua bulan', description: 'Pertahankan streak aktivitas selama 60 hari berturut-turut.' },
    tr: { name: 'İki ay', description: 'Etkinlik serisini 60 gün üst üste sürdür.' },
    pl: { name: 'Dwa miesiące', description: 'Utrzymaj serię aktywności przez 60 dni z rzędu.' },
  },
  streak_100: {
    'pt-BR': { name: 'Cem dias', description: '100 dias seguidos sem dias vazios na sequência.' },
    vi: { name: 'Một trăm ngày', description: '100 ngày liên tiếp không có ngày trống trong chuỗi.' },
    id: { name: 'Seratus hari', description: '100 hari berturut-turut tanpa hari kosong dalam streak.' },
    tr: { name: 'Yüz gün', description: 'Seride boş gün bırakmadan 100 gün üst üste devam et.' },
    pl: { name: 'Sto dni', description: '100 dni z rzędu bez pustych dni w serii.' },
  },
  streak_200: {
    'pt-BR': { name: 'Duzentos dias', description: '200 dias seguidos com XP diário.' },
    vi: { name: 'Hai trăm ngày', description: '200 ngày liên tiếp có XP mỗi ngày.' },
    id: { name: 'Dua ratus hari', description: '200 hari berturut-turut dengan XP harian.' },
    tr: { name: 'İki yüz gün', description: 'Günlük XP ile 200 gün üst üste devam et.' },
    pl: { name: 'Dwieście dni', description: '200 dni z rzędu z codziennym XP.' },
  },
  streak_365: {
    'pt-BR': { name: 'Um ano inteiro', description: 'Mantenha a sequência por 365 dias seguidos, como no contador.' },
    vi: { name: 'Cả một năm', description: 'Duy trì chuỗi 365 ngày liên tiếp như trên bộ đếm.' },
    id: { name: 'Setahun penuh', description: 'Pertahankan streak selama 365 hari berturut-turut seperti di penghitung.' },
    tr: { name: 'Tam bir yıl', description: 'Sayaçtaki seri gibi 365 gün üst üste devam et.' },
    pl: { name: 'Cały rok', description: 'Utrzymaj serię przez 365 dni z rzędu, tak jak pokazuje licznik.' },
  },
  streak_500: {
    'pt-BR': { name: '500 dias', description: '500 dias seguidos com XP: uma persistência rara.' },
    vi: { name: '500 ngày', description: '500 ngày liên tiếp có XP: sự bền bỉ hiếm có.' },
    id: { name: '500 hari', description: '500 hari berturut-turut dengan XP: ketekunan yang langka.' },
    tr: { name: '500 gün', description: 'XP ile 500 gün üst üste: nadir bir kararlılık.' },
    pl: { name: '500 dni', description: '500 dni z rzędu ze zdobytym XP: rzadka wytrwałość.' },
  },
  streak_repair: {
    'pt-BR': { name: 'Fênix', description: 'Use o reparo após exatamente um dia perdido e conclua uma lição no mesmo dia.' },
    vi: { name: 'Phượng hoàng', description: 'Dùng sửa chuỗi sau đúng một ngày bỏ lỡ và hoàn thành bài học trong cùng ngày.' },
    id: { name: 'Phoenix', description: 'Gunakan perbaikan setelah tepat satu hari terlewat dan selesaikan pelajaran di hari yang sama.' },
    tr: { name: 'Anka kuşu', description: 'Tam bir günü kaçırdıktan sonra onarımı kullan ve aynı gün bir dersi bitir.' },
    pl: { name: 'Feniks', description: 'Użyj naprawy po dokładnie jednym opuszczonym dniu i ukończ lekcję tego samego dnia.' },
  },
  perfect_week: {
    'pt-BR': { name: 'Semana perfeita', description: 'Ganhe XP todos os dias, de segunda a domingo, na mesma semana do calendário.' },
    vi: { name: 'Tuần hoàn hảo', description: 'Nhận XP mỗi ngày từ thứ Hai đến Chủ nhật trong cùng một tuần lịch.' },
    id: { name: 'Minggu sempurna', description: 'Dapatkan XP setiap hari dari Senin sampai Minggu dalam satu minggu kalender.' },
    tr: { name: 'Kusursuz hafta', description: 'Aynı takvim haftasında pazartesiden pazara her gün XP kazan.' },
    pl: { name: 'Idealny tydzień', description: 'Zdobywaj XP codziennie od poniedziałku do niedzieli w jednym tygodniu kalendarzowym.' },
  },
  streak_150: {
    'pt-BR': { name: 'Cento e cinquenta', description: '150 dias seguidos com XP, sem nenhum dia vazio.' },
    vi: { name: 'Một trăm năm mươi', description: '150 ngày liên tiếp có XP, không có ngày trống.' },
    id: { name: 'Seratus lima puluh', description: '150 hari berturut-turut dengan XP, tanpa hari kosong.' },
    tr: { name: 'Yüz elli', description: 'Boş gün olmadan 150 gün üst üste XP kazan.' },
    pl: { name: 'Sto pięćdziesiąt', description: '150 dni z rzędu ze zdobytym XP, bez pustego dnia.' },
  },
  streak_250: {
    'pt-BR': { name: 'Um quarto de milhar', description: 'Mantenha a sequência de atividade por 250 dias seguidos.' },
    vi: { name: 'Một phần tư nghìn', description: 'Duy trì chuỗi hoạt động trong 250 ngày liên tiếp.' },
    id: { name: 'Seperempat ribu', description: 'Pertahankan streak aktivitas selama 250 hari berturut-turut.' },
    tr: { name: 'Çeyrek bin', description: 'Etkinlik serisini 250 gün üst üste koru.' },
    pl: { name: 'Ćwierć tysiąca', description: 'Utrzymaj serię aktywności przez 250 dni z rzędu.' },
  },
  streak_750: {
    'pt-BR': { name: '750 dias', description: '750 dias seguidos com XP diário.' },
    vi: { name: '750 ngày', description: '750 ngày liên tiếp có XP mỗi ngày.' },
    id: { name: '750 hari', description: '750 hari berturut-turut dengan XP harian.' },
    tr: { name: '750 gün', description: 'Günlük XP ile 750 gün üst üste devam et.' },
    pl: { name: '750 dni', description: '750 dni z rzędu z codziennym XP.' },
  },
  streak_1000: {
    'pt-BR': { name: 'Mil dias', description: 'Mantenha a sequência de atividade por 1000 dias seguidos.' },
    vi: { name: 'Một nghìn ngày', description: 'Duy trì chuỗi hoạt động trong 1000 ngày liên tiếp.' },
    id: { name: 'Seribu hari', description: 'Pertahankan streak aktivitas selama 1000 hari berturut-turut.' },
    tr: { name: 'Bin gün', description: 'Etkinlik serisini 1000 gün üst üste sürdür.' },
    pl: { name: 'Tysiąc dni', description: 'Utrzymaj serię aktywności przez 1000 dni z rzędu.' },
  },
  streak_clean_365: {
    'pt-BR': { name: 'Ano limpo', description: '365 dias de sequência sem reparo ou congelamento nesse período.' },
    vi: { name: 'Một năm sạch', description: '365 ngày chuỗi không dùng sửa chuỗi hoặc đóng băng trong giai đoạn đó.' },
    id: { name: 'Setahun bersih', description: '365 hari streak tanpa perbaikan atau freeze selama periode itu.' },
    tr: { name: 'Temiz yıl', description: 'Bu dönemde onarım veya dondurma olmadan 365 günlük seri.' },
    pl: { name: 'Czysty rok', description: '365 dni serii bez naprawy ani zamrożenia w tym okresie.' },
  },
  perfect_month: {
    'pt-BR': { name: 'Mês sem vazio', description: 'Ganhe XP todos os dias de um mesmo mês do calendário.' },
    vi: { name: 'Tháng không bỏ trống', description: 'Nhận XP mỗi ngày trong cùng một tháng lịch.' },
    id: { name: 'Sebulan tanpa kosong', description: 'Dapatkan XP setiap hari dalam satu bulan kalender.' },
    tr: { name: 'Boşluksuz ay', description: 'Aynı takvim ayında her gün XP kazan.' },
    pl: { name: 'Miesiąc bez pustki', description: 'Zdobywaj XP każdego dnia jednego miesiąca kalendarzowego.' },
  },
  night_week: {
    'pt-BR': { name: 'Turno da noite', description: 'Ganhe XP à noite por 7 dias seguidos: das 23:00 às 5:00.' },
    vi: { name: 'Ca đêm', description: 'Nhận XP ban đêm 7 ngày liên tiếp: từ 23:00 đến 5:00.' },
    id: { name: 'Shift malam', description: 'Dapatkan XP malam hari selama 7 hari berturut-turut: pukul 23.00-05.00.' },
    tr: { name: 'Gece vardiyası', description: '7 gün üst üste gece XP kazan: 23:00 ile 5:00 arasında.' },
    pl: { name: 'Nocna zmiana', description: 'Zdobywaj XP nocą przez 7 dni z rzędu: od 23:00 do 5:00.' },
  },
  early_week: {
    'pt-BR': { name: 'Modo cedo', description: 'Ganhe XP pela manhã por 7 dias seguidos: das 5:00 às 7:00.' },
    vi: { name: 'Chế độ dậy sớm', description: 'Nhận XP buổi sáng 7 ngày liên tiếp: từ 5:00 đến 7:00.' },
    id: { name: 'Mode pagi', description: 'Dapatkan XP pagi hari selama 7 hari berturut-turut: pukul 05.00-07.00.' },
    tr: { name: 'Erken mod', description: '7 gün üst üste sabah XP kazan: 5:00 ile 7:00 arasında.' },
    pl: { name: 'Tryb poranny', description: 'Zdobywaj XP rano przez 7 dni z rzędu: od 5:00 do 7:00.' },
  },
  lesson_1: {
    'pt-BR': { name: 'Primeiro passo', description: 'Conclua uma lição: conta quando houver 45 ou mais respostas certas.' },
    vi: { name: 'Bước đầu tiên', description: 'Hoàn thành một bài học: được tính khi có ít nhất 45 câu trả lời đúng.' },
    id: { name: 'Langkah pertama', description: 'Selesaikan satu pelajaran: dihitung jika ada 45 jawaban benar atau lebih.' },
    tr: { name: 'İlk adım', description: 'Bir dersi tamamla: 45 veya daha fazla doğru cevapla sayılır.' },
    pl: { name: 'Pierwszy krok', description: 'Ukończ jedną lekcję: zaliczenie od co najmniej 45 poprawnych odpowiedzi.' },
  },
  lesson_3: {
    'pt-BR': { name: 'Três lições', description: 'Complete três lições diferentes com crédito total.' },
    vi: { name: 'Ba bài học', description: 'Hoàn thành tổng cộng ba bài học khác nhau với đủ điều kiện.' },
    id: { name: 'Tiga pelajaran', description: 'Selesaikan total tiga pelajaran berbeda dengan kelulusan penuh.' },
    tr: { name: 'Üç ders', description: 'Toplam üç farklı dersi tam geçişle tamamla.' },
    pl: { name: 'Trzy lekcje', description: 'Ukończ łącznie trzy różne lekcje z pełnym zaliczeniem.' },
  },
  lesson_5: {
    'pt-BR': { name: 'Cinco lições', description: 'Leve cinco lições até o crédito.' },
    vi: { name: 'Năm bài học', description: 'Đưa năm bài học đến mức được tính hoàn thành.' },
    id: { name: 'Lima pelajaran', description: 'Selesaikan lima pelajaran sampai lulus.' },
    tr: { name: 'Beş ders', description: 'Beş dersi geçerli tamamlanma düzeyine getir.' },
    pl: { name: 'Pięć lekcji', description: 'Doprowadź pięć lekcji do zaliczenia.' },
  },
  lesson_10: {
    'pt-BR': { name: 'Dez lições', description: 'Tenha dez lições com crédito no seu progresso.' },
    vi: { name: 'Mười bài học', description: 'Có mười bài học được tính hoàn thành trong tiến độ.' },
    id: { name: 'Sepuluh pelajaran', description: 'Miliki sepuluh pelajaran yang sudah lulus dalam progresmu.' },
    tr: { name: 'On ders', description: 'İlerlemede on dersi geçerli şekilde tamamla.' },
    pl: { name: 'Dziesięć lekcji', description: 'Miej dziesięć lekcji z zaliczeniem w postępach.' },
  },
  lesson_15: {
    'pt-BR': { name: 'Quinze', description: 'Conclua 15 lições pelas regras de crédito.' },
    vi: { name: 'Mười lăm', description: 'Hoàn thành 15 bài học theo quy tắc được tính.' },
    id: { name: 'Lima belas', description: 'Selesaikan 15 pelajaran sesuai aturan kelulusan.' },
    tr: { name: 'On beş', description: '15 dersi geçiş kurallarına göre tamamla.' },
    pl: { name: 'Piętnaście', description: 'Ukończ 15 lekcji zgodnie z zasadami zaliczenia.' },
  },
  lesson_20: {
    'pt-BR': { name: 'Vinte lições', description: 'Complete 20 lições com crédito total.' },
    vi: { name: 'Hai mươi bài học', description: 'Hoàn thành 20 bài học với đủ điều kiện.' },
    id: { name: 'Dua puluh pelajaran', description: 'Selesaikan 20 pelajaran dengan kelulusan penuh.' },
    tr: { name: 'Yirmi ders', description: '20 dersi tam geçişle tamamla.' },
    pl: { name: 'Dwadzieścia lekcji', description: 'Ukończ 20 lekcji z pełnym zaliczeniem.' },
  },
  lesson_all: {
    'pt-BR': { name: 'Curso completo', description: 'Complete todas as 32 lições pelo menos uma vez com crédito.' },
    vi: { name: 'Trọn khóa học', description: 'Hoàn thành đủ 32 bài học ít nhất một lần với điều kiện được tính.' },
    id: { name: 'Kursus lengkap', description: 'Selesaikan semua 32 pelajaran setidaknya sekali dengan kelulusan.' },
    tr: { name: 'Tam kurs', description: '32 dersin tamamını en az bir kez geçerli şekilde tamamla.' },
    pl: { name: 'Pełny kurs', description: 'Ukończ wszystkie 32 lekcje co najmniej raz z zaliczeniem.' },
  },
  lesson_perfect: {
    'pt-BR': { name: 'Sem erros', description: 'Passe uma lição sem respostas marcadas como erro e com 45 ou mais acertos.' },
    vi: { name: 'Không sai câu nào', description: 'Hoàn thành bài học không có câu bị đánh dấu sai và có ít nhất 45 câu đúng.' },
    id: { name: 'Tanpa satu kesalahan', description: 'Selesaikan pelajaran tanpa jawaban salah dan dengan 45 jawaban benar atau lebih.' },
    tr: { name: 'Hatasız', description: 'Bir dersi hata işaretli cevap olmadan ve 45 veya daha fazla doğruyla bitir.' },
    pl: { name: 'Bez błędu', description: 'Przejdź lekcję bez odpowiedzi oznaczonych jako błąd i z co najmniej 45 poprawnymi.' },
  },
  lesson_perfect3: {
    'pt-BR': { name: 'Três perfeitas', description: 'Três lições diferentes sem nenhum erro no progresso.' },
    vi: { name: 'Ba bài hoàn hảo', description: 'Ba bài học khác nhau không có lỗi nào trong tiến độ.' },
    id: { name: 'Tiga sempurna', description: 'Tiga pelajaran berbeda tanpa satu pun kesalahan dalam progres.' },
    tr: { name: 'Üç kusursuz', description: 'İlerlemede hiç hata olmadan üç farklı dersi tamamla.' },
    pl: { name: 'Trzy idealne', description: 'Trzy różne lekcje bez ani jednego błędu w postępach.' },
  },
  lesson_all_perfect: {
    'pt-BR': { name: 'Absoluto', description: 'Todas as 32 lições perfeitas: sem erro em cada uma.' },
    vi: { name: 'Tuyệt đối', description: 'Cả 32 bài học đều hoàn hảo: không có lỗi trong từng bài.' },
    id: { name: 'Absolut', description: 'Semua 32 pelajaran sempurna: tanpa kesalahan di setiap pelajaran.' },
    tr: { name: 'Mutlak', description: '32 dersin tamamı kusursuz: her birinde hata yok.' },
    pl: { name: 'Absolut', description: 'Wszystkie 32 lekcje idealnie: bez błędu w każdej.' },
  },
  lesson_all_2x: {
    'pt-BR': { name: 'Segunda volta', description: 'Todas as 32 lições concluídas pelo menos 2 vezes.' },
    vi: { name: 'Vòng thứ hai', description: 'Hoàn thành cả 32 bài học ít nhất 2 lần.' },
    id: { name: 'Putaran kedua', description: 'Semua 32 pelajaran diselesaikan setidaknya 2 kali.' },
    tr: { name: 'İkinci tur', description: '32 dersin tamamı en az 2 kez tamamlandı.' },
    pl: { name: 'Drugi obieg', description: 'Wszystkie 32 lekcje ukończone co najmniej 2 razy.' },
  },
  lesson_all_3x: {
    'pt-BR': { name: 'Curso triplo', description: 'Todas as 32 lições concluídas pelo menos 3 vezes.' },
    vi: { name: 'Khóa học ba lượt', description: 'Hoàn thành cả 32 bài học ít nhất 3 lần.' },
    id: { name: 'Kursus tiga kali', description: 'Semua 32 pelajaran diselesaikan setidaknya 3 kali.' },
    tr: { name: 'Üçlü kurs', description: '32 dersin tamamı en az 3 kez tamamlandı.' },
    pl: { name: 'Potrójny kurs', description: 'Wszystkie 32 lekcje ukończone co najmniej 3 razy.' },
  },
  lesson_all_5x: {
    'pt-BR': { name: 'Quinta volta', description: 'Todas as 32 lições concluídas pelo menos 5 vezes.' },
    vi: { name: 'Vòng thứ năm', description: 'Hoàn thành cả 32 bài học ít nhất 5 lần.' },
    id: { name: 'Putaran kelima', description: 'Semua 32 pelajaran diselesaikan setidaknya 5 kali.' },
    tr: { name: 'Beşinci tur', description: '32 dersin tamamı en az 5 kez tamamlandı.' },
    pl: { name: 'Piąty obieg', description: 'Wszystkie 32 lekcje ukończone co najmniej 5 razy.' },
  },
  lesson_perfect10: {
    'pt-BR': { name: 'Dez perfeitas', description: '10 lições diferentes sem nenhum erro no progresso.' },
    vi: { name: 'Mười bài hoàn hảo', description: '10 bài học khác nhau không có lỗi nào trong tiến độ.' },
    id: { name: 'Sepuluh sempurna', description: '10 pelajaran berbeda tanpa satu pun kesalahan dalam progres.' },
    tr: { name: 'On kusursuz', description: 'İlerlemede hiç hata olmadan 10 farklı dersi tamamla.' },
    pl: { name: 'Dziesięć idealnych', description: '10 różnych lekcji bez ani jednego błędu w postępach.' },
  },
  lesson_b2_perfect: {
    'pt-BR': { name: 'B2 sem erros', description: 'Lições 29-32 perfeitas: sem erro em cada uma.' },
    vi: { name: 'B2 không lỗi', description: 'Bài 29-32 hoàn hảo: không có lỗi trong từng bài.' },
    id: { name: 'B2 tanpa kesalahan', description: 'Pelajaran 29-32 sempurna: tanpa kesalahan di setiap pelajaran.' },
    tr: { name: 'Hatasız B2', description: '29-32. dersler kusursuz: her birinde hata yok.' },
    pl: { name: 'B2 bez błędów', description: 'Lekcje 29-32 idealnie: bez błędu w każdej.' },
  },
  lesson_marathon_day: {
    'pt-BR': { name: 'Maratona de estudo', description: 'Conclua 10 lições diferentes com crédito em um único dia.' },
    vi: { name: 'Marathon học tập', description: 'Hoàn thành 10 bài học khác nhau được tính trong một ngày.' },
    id: { name: 'Maraton belajar', description: 'Selesaikan 10 pelajaran berbeda dengan kelulusan dalam satu hari.' },
    tr: { name: 'Öğrenme maratonu', description: 'Bir günde 10 farklı dersi geçerli şekilde tamamla.' },
    pl: { name: 'Maraton nauki', description: 'W jeden dzień ukończ 10 różnych lekcji z zaliczeniem.' },
  },
  lesson_all_perfect_2x: {
    'pt-BR': { name: 'Absoluto II', description: 'Todas as 32 lições concluídas perfeitamente pelo menos 2 vezes.' },
    vi: { name: 'Tuyệt đối II', description: 'Cả 32 bài học được hoàn thành hoàn hảo ít nhất 2 lần.' },
    id: { name: 'Absolut II', description: 'Semua 32 pelajaran diselesaikan sempurna setidaknya 2 kali.' },
    tr: { name: 'Mutlak II', description: '32 dersin tamamı en az 2 kez kusursuz tamamlandı.' },
    pl: { name: 'Absolut II', description: 'Wszystkie 32 lekcje ukończone idealnie co najmniej 2 razy.' },
  },
  xp_100: {
    'pt-BR': { name: 'Primeira centena', description: 'Acumule 100 XP no contador de experiência total.' },
    vi: { name: 'Một trăm đầu tiên', description: 'Tích lũy 100 XP trong bộ đếm tổng kinh nghiệm.' },
    id: { name: 'Seratus pertama', description: 'Kumpulkan 100 XP di penghitung total pengalaman.' },
    tr: { name: 'İlk yüz', description: 'Toplam deneyim sayacında 100 XP biriktir.' },
    pl: { name: 'Pierwsza setka', description: 'Zbierz 100 XP na liczniku całkowitego doświadczenia.' },
  },
  xp_250: {
    'pt-BR': { name: '250 de XP', description: '250 XP no total, independentemente de como você ganhou.' },
    vi: { name: '250 XP', description: '250 XP tổng cộng, không tính bạn kiếm được bằng cách nào.' },
    id: { name: '250 XP', description: '250 XP total, tanpa memperhitungkan cara mendapatkannya.' },
    tr: { name: '250 XP', description: 'Nasıl kazandığından bağımsız olarak toplam 250 XP.' },
    pl: { name: '250 XP', description: '250 XP łącznie, bez względu na to, jak zostały zdobyte.' },
  },
  xp_500: {
    'pt-BR': { name: 'Quinhentos', description: '500 XP no contador geral.' },
    vi: { name: 'Năm trăm', description: '500 XP trên bộ đếm tổng.' },
    id: { name: 'Lima ratus', description: '500 XP di penghitung umum.' },
    tr: { name: 'Beş yüz', description: 'Genel sayaçta 500 XP.' },
    pl: { name: 'Pięćset', description: '500 XP na głównym liczniku.' },
  },
  xp_1000: {
    'pt-BR': { name: 'Mil XP', description: '1.000 XP no total.' },
    vi: { name: 'Một nghìn XP', description: 'Tổng cộng 1.000 XP.' },
    id: { name: 'Seribu XP', description: 'Total 1.000 XP.' },
    tr: { name: 'Bin XP', description: 'Toplam 1.000 XP.' },
    pl: { name: 'Tysiąc XP', description: 'Łącznie 1 000 XP.' },
  },
  xp_2500: {
    'pt-BR': { name: '2.500 de XP', description: '2.500 XP no total.' },
    vi: { name: '2.500 XP', description: 'Tổng cộng 2.500 XP.' },
    id: { name: '2.500 XP', description: 'Total 2.500 XP.' },
    tr: { name: '2.500 XP', description: 'Toplam 2.500 XP.' },
    pl: { name: '2 500 XP', description: 'Łącznie 2 500 XP.' },
  },
  xp_5000: {
    'pt-BR': { name: 'Cinco mil', description: '5.000 XP no total.' },
    vi: { name: 'Năm nghìn', description: 'Tổng cộng 5.000 XP.' },
    id: { name: 'Lima ribu', description: 'Total 5.000 XP.' },
    tr: { name: 'Beş bin', description: 'Toplam 5.000 XP.' },
    pl: { name: 'Pięć tysięcy', description: 'Łącznie 5 000 XP.' },
  },
  xp_10000: {
    'pt-BR': { name: 'Dez mil', description: '10.000 XP no total.' },
    vi: { name: 'Mười nghìn', description: 'Tổng cộng 10.000 XP.' },
    id: { name: 'Sepuluh ribu', description: 'Total 10.000 XP.' },
    tr: { name: 'On bin', description: 'Toplam 10.000 XP.' },
    pl: { name: 'Dziesięć tysięcy', description: 'Łącznie 10 000 XP.' },
  },
  xp_20000: {
    'pt-BR': { name: 'Vinte mil', description: '20.000 XP no total.' },
    vi: { name: 'Hai mươi nghìn', description: 'Tổng cộng 20.000 XP.' },
    id: { name: 'Dua puluh ribu', description: 'Total 20.000 XP.' },
    tr: { name: 'Yirmi bin', description: 'Toplam 20.000 XP.' },
    pl: { name: 'Dwadzieścia tysięcy', description: 'Łącznie 20 000 XP.' },
  },
  xp_50000: {
    'pt-BR': { name: 'Cinquenta mil', description: '50.000 XP no total.' },
    vi: { name: 'Năm mươi nghìn', description: 'Tổng cộng 50.000 XP.' },
    id: { name: 'Lima puluh ribu', description: 'Total 50.000 XP.' },
    tr: { name: 'Elli bin', description: 'Toplam 50.000 XP.' },
    pl: { name: 'Pięćdziesiąt tysięcy', description: 'Łącznie 50 000 XP.' },
  },
  xp_75000: {
    'pt-BR': { name: '75K e sem parar', description: '75.000 XP no total. O caminho para seis dígitos está aberto.' },
    vi: { name: '75K và chưa dừng lại', description: 'Tổng cộng 75.000 XP. Con đường đến sáu chữ số đã mở.' },
    id: { name: '75K dan terus lanjut', description: 'Total 75.000 XP. Jalan menuju enam digit terbuka.' },
    tr: { name: '75K ve durmak yok', description: 'Toplam 75.000 XP. Altı haneye giden yol açıldı.' },
    pl: { name: '75K i dalej', description: 'Łącznie 75 000 XP. Droga do sześciu cyfr jest otwarta.' },
  },
  xp_100000: {
    'pt-BR': { name: 'Lenda', description: '100.000 XP no total.' },
    vi: { name: 'Huyền thoại', description: 'Tổng cộng 100.000 XP.' },
    id: { name: 'Legenda', description: 'Total 100.000 XP.' },
    tr: { name: 'Efsane', description: 'Toplam 100.000 XP.' },
    pl: { name: 'Legenda', description: 'Łącznie 100 000 XP.' },
  },
  xp_150000: {
    'pt-BR': { name: '150K de XP', description: 'Acumule 150.000 XP no total.' },
    vi: { name: '150K XP', description: 'Tích lũy tổng cộng 150.000 XP.' },
    id: { name: '150K XP', description: 'Kumpulkan total 150.000 XP.' },
    tr: { name: '150K XP', description: 'Toplam 150.000 XP biriktir.' },
    pl: { name: '150K XP', description: 'Zbierz łącznie 150 000 XP.' },
  },
  xp_250000: {
    'pt-BR': { name: 'Um quarto de milhão', description: 'Acumule 250.000 XP no total.' },
    vi: { name: 'Một phần tư triệu', description: 'Tích lũy tổng cộng 250.000 XP.' },
    id: { name: 'Seperempat juta', description: 'Kumpulkan total 250.000 XP.' },
    tr: { name: 'Çeyrek milyon', description: 'Toplam 250.000 XP biriktir.' },
    pl: { name: 'Ćwierć miliona', description: 'Zbierz łącznie 250 000 XP.' },
  },
  xp_500000: {
    'pt-BR': { name: 'Meio milhão', description: 'Acumule 500.000 XP no total.' },
    vi: { name: 'Nửa triệu', description: 'Tích lũy tổng cộng 500.000 XP.' },
    id: { name: 'Setengah juta', description: 'Kumpulkan total 500.000 XP.' },
    tr: { name: 'Yarım milyon', description: 'Toplam 500.000 XP biriktir.' },
    pl: { name: 'Pół miliona', description: 'Zbierz łącznie 500 000 XP.' },
  },
  xp_750000: {
    'pt-BR': { name: 'Três quartos', description: 'Acumule 750.000 XP no total.' },
    vi: { name: 'Ba phần tư', description: 'Tích lũy tổng cộng 750.000 XP.' },
    id: { name: 'Tiga perempat', description: 'Kumpulkan total 750.000 XP.' },
    tr: { name: 'Üç çeyrek', description: 'Toplam 750.000 XP biriktir.' },
    pl: { name: 'Trzy czwarte', description: 'Zbierz łącznie 750 000 XP.' },
  },
  xp_1000000: {
    'pt-BR': { name: 'Milionário de XP', description: 'Acumule 1.000.000 XP no total.' },
    vi: { name: 'Triệu phú XP', description: 'Tích lũy tổng cộng 1.000.000 XP.' },
    id: { name: 'Jutawan XP', description: 'Kumpulkan total 1.000.000 XP.' },
    tr: { name: 'XP milyoneri', description: 'Toplam 1.000.000 XP biriktir.' },
    pl: { name: 'Milioner XP', description: 'Zbierz łącznie 1 000 000 XP.' },
  },
  xp_2000000: {
    'pt-BR': { name: 'Dois milhões', description: 'Acumule 2.000.000 XP no total.' },
    vi: { name: 'Hai triệu', description: 'Tích lũy tổng cộng 2.000.000 XP.' },
    id: { name: 'Dua juta', description: 'Kumpulkan total 2.000.000 XP.' },
    tr: { name: 'İki milyon', description: 'Toplam 2.000.000 XP biriktir.' },
    pl: { name: 'Dwa miliony', description: 'Zbierz łącznie 2 000 000 XP.' },
  },
  weekly_xp_5000: {
    'pt-BR': { name: 'Semana de 5K', description: 'Ganhe 5.000 XP em uma única semana do calendário.' },
    vi: { name: 'Tuần 5K', description: 'Nhận 5.000 XP trong một tuần lịch.' },
    id: { name: 'Minggu 5K', description: 'Dapatkan 5.000 XP dalam satu minggu kalender.' },
    tr: { name: '5K haftası', description: 'Tek bir takvim haftasında 5.000 XP kazan.' },
    pl: { name: 'Tydzień na 5K', description: 'Zdobądź 5 000 XP w jednym tygodniu kalendarzowym.' },
  },
  weekly_xp_10000: {
    'pt-BR': { name: 'Semana de 10K', description: 'Ganhe 10.000 XP em uma única semana do calendário.' },
    vi: { name: 'Tuần 10K', description: 'Nhận 10.000 XP trong một tuần lịch.' },
    id: { name: 'Minggu 10K', description: 'Dapatkan 10.000 XP dalam satu minggu kalender.' },
    tr: { name: '10K haftası', description: 'Tek bir takvim haftasında 10.000 XP kazan.' },
    pl: { name: 'Tydzień na 10K', description: 'Zdobądź 10 000 XP w jednym tygodniu kalendarzowym.' },
  },
  wager_win: {
    'pt-BR': { name: 'Arriscou e venceu', description: 'Ganhe uma aposta de sequência: mantenha a série até o fim sem cair abaixo do nível inicial.' },
    vi: { name: 'Mạo hiểm và thắng', description: 'Thắng cược chuỗi: giữ chuỗi đến hết hạn mà không xuống dưới mức lúc đặt cược.' },
    id: { name: 'Berani dan menang', description: 'Menangkan taruhan streak: pertahankan streak sampai akhir tanpa turun di bawah level awal.' },
    tr: { name: 'Risk aldın, kazandın', description: 'Seri bahsini kazan: süre sonuna kadar başlangıç seviyesinin altına düşmeden seriyi koru.' },
    pl: { name: 'Ryzyko i wygrana', description: 'Wygraj zakład o serię: utrzymaj ją do końca, nie spadając poniżej poziomu z chwili zakładu.' },
  },
  wager_win_3: {
    'pt-BR': { name: 'Três apostas certas', description: 'Ganhe 3 apostas de sequência no total.' },
    vi: { name: 'Ba cược thắng', description: 'Thắng tổng cộng 3 cược chuỗi.' },
    id: { name: 'Tiga taruhan menang', description: 'Menangkan total 3 taruhan rangkaian.' },
    tr: { name: 'Üç başarılı bahis', description: 'Toplam 3 seri bahsi kazan.' },
    pl: { name: 'Trzy udane zakłady', description: 'Wygraj łącznie 3 zakłady o serię.' },
  },
  wager_win_10: {
    'pt-BR': { name: 'Mão fria', description: 'Ganhe 10 apostas de sequência no total.' },
    vi: { name: 'Tay lạnh', description: 'Thắng tổng cộng 10 cược chuỗi.' },
    id: { name: 'Tangan dingin', description: 'Menangkan total 10 taruhan rangkaian.' },
    tr: { name: 'Soğukkanlı el', description: 'Toplam 10 seri bahsi kazan.' },
    pl: { name: 'Zimna ręka', description: 'Wygraj łącznie 10 zakładów o serię.' },
  },
  personal_best: {
    'pt-BR': { name: 'Melhor semana', description: 'Bata seu recorde de XP semanal em uma semana do calendário.' },
    vi: { name: 'Tuần tốt nhất', description: 'Phá kỷ lục XP theo tuần lịch của bạn.' },
    id: { name: 'Minggu terbaik', description: 'Pecahkan rekor XP mingguanmu dalam satu minggu kalender.' },
    tr: { name: 'En iyi hafta', description: 'Bir takvim haftasındaki haftalık XP rekorunu kır.' },
    pl: { name: 'Najlepszy tydzień', description: 'Pobij swój rekord tygodniowego XP w tygodniu kalendarzowym.' },
  },
  level_50: {
    'pt-BR': { name: 'Nível 50', description: 'Alcance o nível 50. Você já não é iniciante; é uma lenda.' },
    vi: { name: 'Cấp 50', description: 'Đạt cấp 50. Bạn không còn là người mới nữa; bạn là huyền thoại.' },
    id: { name: 'Level 50', description: 'Capai level 50. Kamu bukan pemula lagi; kamu legenda.' },
    tr: { name: '50. seviye', description: '50. seviyeye ulaş. Artık yeni başlayan değil, efsanesin.' },
    pl: { name: 'Poziom 50', description: 'Osiągnij poziom 50. Nie jesteś już nowicjuszem; jesteś legendą.' },
  },
  quiz_first: {
    'pt-BR': { name: 'Primeiro quiz', description: 'Conclua qualquer quiz uma vez, em qualquer dificuldade.' },
    vi: { name: 'Quiz đầu tiên', description: 'Hoàn thành bất kỳ quiz nào một lần, ở mọi độ khó.' },
    id: { name: 'Kuis pertama', description: 'Selesaikan kuis apa pun satu kali, di tingkat kesulitan apa pun.' },
    tr: { name: 'İlk quiz', description: 'Herhangi bir zorlukta bir quiz’i bir kez tamamla.' },
    pl: { name: 'Pierwszy quiz', description: 'Ukończ dowolny quiz raz, na dowolnym poziomie trudności.' },
  },
  quiz_medium: {
    'pt-BR': { name: 'Nível médio', description: 'Conclua um quiz no nível Medium.' },
    vi: { name: 'Cấp trung bình', description: 'Hoàn thành một quiz cấp Medium.' },
    id: { name: 'Level menengah', description: 'Selesaikan kuis level Medium.' },
    tr: { name: 'Orta seviye', description: 'Medium seviyesinde bir quiz’i tamamla.' },
    pl: { name: 'Poziom średni', description: 'Ukończ quiz na poziomie Medium.' },
  },
  quiz_hard: {
    'pt-BR': { name: 'Aceitou o desafio', description: 'Conclua totalmente um quiz no nível Hard.' },
    vi: { name: 'Nhận thử thách', description: 'Hoàn thành trọn vẹn một quiz cấp Hard.' },
    id: { name: 'Menerima tantangan', description: 'Selesaikan sepenuhnya kuis level Hard.' },
    tr: { name: 'Meydan okumayı kabul ettin', description: 'Hard seviyesinde bir quiz’i tamamen bitir.' },
    pl: { name: 'Wyzwanie przyjęte', description: 'Ukończ w całości quiz na poziomie Hard.' },
  },
  quiz_all_levels: {
    'pt-BR': { name: 'Conjunto completo', description: 'Passe por Easy, Medium e Hard pelo menos uma vez, em três sessões separadas.' },
    vi: { name: 'Đủ bộ', description: 'Hoàn thành Easy, Medium và Hard ít nhất một lần, trong ba phiên riêng.' },
    id: { name: 'Set lengkap', description: 'Selesaikan Easy, Medium, dan Hard setidaknya sekali dalam tiga sesi terpisah.' },
    tr: { name: 'Tam set', description: 'Easy, Medium ve Hard seviyelerini en az bir kez, üç ayrı oturumda tamamla.' },
    pl: { name: 'Pełny zestaw', description: 'Przejdź Easy, Medium i Hard co najmniej raz, w trzech osobnych sesjach.' },
  },
  quiz_perfect_easy: {
    'pt-BR': { name: 'Ideal no Easy', description: 'Quiz Easy: todas as respostas desta tentativa estão corretas.' },
    vi: { name: 'Hoàn hảo ở Easy', description: 'Quiz Easy: tất cả câu trả lời trong lượt này đều đúng.' },
    id: { name: 'Easy sempurna', description: 'Kuis Easy: semua jawaban dalam sesi ini benar.' },
    tr: { name: 'Easy kusursuz', description: 'Easy quiz: bu denemedeki tüm cevaplar doğru.' },
    pl: { name: 'Idealny Easy', description: 'Quiz Easy: wszystkie odpowiedzi w tym podejściu są poprawne.' },
  },
  quiz_perfect: {
    'pt-BR': { name: 'Nervos de aço', description: 'Conclua um quiz Hard sem nenhum erro.' },
    vi: { name: 'Thần kinh thép', description: 'Hoàn thành quiz Hard không mắc lỗi nào.' },
    id: { name: 'Saraf baja', description: 'Selesaikan kuis Hard tanpa satu pun kesalahan.' },
    tr: { name: 'Çelik sinirler', description: 'Hard quiz’i tek hata yapmadan tamamla.' },
    pl: { name: 'Stalowe nerwy', description: 'Ukończ quiz Hard bez ani jednego błędu.' },
  },
  quiz_perfect_medium: {
    'pt-BR': { name: 'Mira certeira', description: 'Quiz Medium sem erros: todas as respostas da tentativa estão corretas.' },
    vi: { name: 'Bắn chuẩn', description: 'Quiz Medium không lỗi: tất cả câu trả lời trong lượt này đều đúng.' },
    id: { name: 'Tembakan tepat', description: 'Kuis Medium tanpa kesalahan: semua jawaban dalam sesi ini benar.' },
    tr: { name: 'Keskin nişancı', description: 'Hatasız Medium quiz: bu denemedeki tüm cevaplar doğru.' },
    pl: { name: 'Celny strzał', description: 'Quiz Medium bez błędów: wszystkie odpowiedzi w podejściu są poprawne.' },
  },
  quiz_triple_perfect: {
    'pt-BR': { name: 'Três vezes ideal', description: 'Easy, Medium e Hard perfeitos: um quiz separado para cada nível.' },
    vi: { name: 'Ba lần hoàn hảo', description: 'Hoàn hảo Easy, Medium và Hard: mỗi cấp một quiz riêng.' },
    id: { name: 'Tiga kali sempurna', description: 'Easy, Medium, dan Hard sempurna: satu kuis terpisah untuk tiap level.' },
    tr: { name: 'Üç kez kusursuz', description: 'Kusursuz Easy, Medium ve Hard: her seviye için ayrı bir quiz.' },
    pl: { name: 'Trzykrotny ideał', description: 'Idealny Easy, Medium i Hard: osobny quiz na każdy poziom.' },
  },
  quiz_speed_demon: {
    'pt-BR': { name: 'Na velocidade', description: 'Conclua totalmente um quiz Hard 5 vezes; o contador fica no app.' },
    vi: { name: 'Tốc độ cao', description: 'Hoàn thành trọn vẹn quiz Hard 5 lần; bộ đếm được lưu trong ứng dụng.' },
    id: { name: 'Dengan kecepatan', description: 'Selesaikan kuis Hard sepenuhnya 5 kali; penghitung disimpan di aplikasi.' },
    tr: { name: 'Hız modunda', description: 'Hard quiz’i 5 kez tamamen bitir; sayaç uygulamada tutulur.' },
    pl: { name: 'Na szybkości', description: 'Ukończ w całości quiz Hard 5 razy; licznik jest zapisany w aplikacji.' },
  },
  quiz_10_completed: {
    'pt-BR': { name: 'Primeiros dez', description: '10 sessões de quiz concluídas. Siga em frente.' },
    vi: { name: 'Mười lần đầu', description: 'Hoàn thành 10 phiên quiz. Cứ tiến lên.' },
    id: { name: 'Sepuluh pertama', description: '10 sesi kuis selesai. Terus maju.' },
    tr: { name: 'İlk on', description: '10 quiz oturumu tamamlandı. Devam et.' },
    pl: { name: 'Pierwsze dziesięć', description: '10 sesji quizu ukończone. Naprzód.' },
  },
  quiz_25_completed: {
    'pt-BR': { name: '25 quizzes', description: '25 sessões de quiz concluídas.' },
    vi: { name: '25 quiz', description: 'Hoàn thành 25 phiên quiz.' },
    id: { name: '25 kuis', description: '25 sesi kuis selesai.' },
    tr: { name: '25 quiz', description: '25 quiz oturumu tamamlandı.' },
    pl: { name: '25 quizów', description: '25 sesji quizu ukończone.' },
  },
  quiz_50_completed: {
    'pt-BR': { name: '50 quizzes', description: '50 sessões de quiz concluídas.' },
    vi: { name: '50 quiz', description: 'Hoàn thành 50 phiên quiz.' },
    id: { name: '50 kuis', description: '50 sesi kuis selesai.' },
    tr: { name: '50 quiz', description: '50 quiz oturumu tamamlandı.' },
    pl: { name: '50 quizów', description: '50 sesji quizu ukończone.' },
  },
  quiz_100_completed: {
    'pt-BR': { name: 'Cem quizzes', description: '100 sessões de quiz concluídas.' },
    vi: { name: 'Một trăm quiz', description: 'Hoàn thành 100 phiên quiz.' },
    id: { name: 'Seratus kuis', description: '100 sesi kuis selesai.' },
    tr: { name: 'Yüz quiz', description: '100 quiz oturumu tamamlandı.' },
    pl: { name: 'Sto quizów', description: '100 sesji quizu ukończone.' },
  },
  quiz_hard_10: {
    'pt-BR': { name: 'Dez Hard', description: 'Conclua um quiz Hard 10 vezes.' },
    vi: { name: 'Mười Hard', description: 'Hoàn thành quiz cấp Hard 10 lần.' },
    id: { name: 'Sepuluh Hard', description: 'Selesaikan kuis level Hard 10 kali.' },
    tr: { name: 'On Hard', description: 'Hard seviyesinde quiz’i 10 kez tamamla.' },
    pl: { name: 'Dziesięć Hard', description: 'Ukończ quiz na poziomie Hard 10 razy.' },
  },
  quiz_hard_25: {
    'pt-BR': { name: 'Morador do Hard', description: 'Conclua um quiz Hard 25 vezes.' },
    vi: { name: 'Cư dân Hard', description: 'Hoàn thành quiz cấp Hard 25 lần.' },
    id: { name: 'Penghuni Hard', description: 'Selesaikan kuis level Hard 25 kali.' },
    tr: { name: 'Hard sakini', description: 'Hard seviyesinde quiz’i 25 kez tamamla.' },
    pl: { name: 'Bywalec Hard', description: 'Ukończ quiz na poziomie Hard 25 razy.' },
  },
  quiz_hard_perfect_3: {
    'pt-BR': { name: 'Três Hard sem erro', description: 'Passe 3 vezes por um quiz Hard sem nenhum erro.' },
    vi: { name: 'Ba Hard không lỗi', description: 'Hoàn thành quiz Hard 3 lần không mắc lỗi nào.' },
    id: { name: 'Tiga Hard tanpa salah', description: 'Selesaikan kuis Hard 3 kali tanpa satu pun kesalahan.' },
    tr: { name: 'Üç hatasız Hard', description: 'Hard quiz’i 3 kez tek hata yapmadan tamamla.' },
    pl: { name: 'Trzy Hard bez błędu', description: 'Przejdź quiz Hard 3 razy bez ani jednego błędu.' },
  },
  quiz_hard_perfect_10: {
    'pt-BR': { name: 'Dez sem errar', description: 'Passe 10 vezes por um quiz Hard sem nenhum erro.' },
    vi: { name: 'Mười lần không trượt', description: 'Hoàn thành quiz Hard 10 lần không mắc lỗi nào.' },
    id: { name: 'Sepuluh tanpa meleset', description: 'Selesaikan kuis Hard 10 kali tanpa satu pun kesalahan.' },
    tr: { name: 'On hatasız', description: 'Hard quiz’i 10 kez tek hata yapmadan tamamla.' },
    pl: { name: 'Dziesięć bez pudła', description: 'Przejdź quiz Hard 10 razy bez ani jednego błędu.' },
  },
  quiz_perfect_7_days: {
    'pt-BR': { name: 'Semana perfeita de quizzes', description: 'Por 7 dias seguidos, conclua pelo menos um quiz sem erro.' },
    vi: { name: 'Tuần quiz hoàn hảo', description: '7 ngày liên tiếp hoàn thành ít nhất một quiz không lỗi.' },
    id: { name: 'Minggu kuis sempurna', description: '7 hari berturut-turut selesaikan setidaknya satu kuis tanpa kesalahan.' },
    tr: { name: 'Kusursuz quiz haftası', description: '7 gün üst üste en az bir quiz’i hatasız tamamla.' },
    pl: { name: 'Idealny tydzień quizów', description: 'Przez 7 dni z rzędu ukończ co najmniej jeden quiz bez błędu.' },
  },
  quiz_all_levels_perfect_same_day: {
    'pt-BR': { name: 'Três coroas em um dia', description: 'No mesmo dia, passe por Easy, Medium e Hard sem erros.' },
    vi: { name: 'Ba vương miện trong ngày', description: 'Trong một ngày, hoàn thành Easy, Medium và Hard không lỗi.' },
    id: { name: 'Tiga mahkota sehari', description: 'Dalam satu hari, selesaikan Easy, Medium, dan Hard tanpa kesalahan.' },
    tr: { name: 'Bir günde üç taç', description: 'Bir günde Easy, Medium ve Hard seviyelerini hatasız tamamla.' },
    pl: { name: 'Trzy korony w dzień', description: 'W jeden dzień przejdź Easy, Medium i Hard bez błędów.' },
  },
  combo_3: {
    'pt-BR': { name: 'No fluxo', description: '3 respostas certas seguidas durante uma lição.' },
    vi: { name: 'Đang vào guồng', description: '3 câu trả lời đúng liên tiếp trong bài học.' },
    id: { name: 'Dalam alur', description: '3 jawaban benar berturut-turut selama pelajaran.' },
    tr: { name: 'Akışta', description: 'Ders sırasında üst üste 3 doğru cevap.' },
    pl: { name: 'W rytmie', description: '3 poprawne odpowiedzi z rzędu podczas lekcji.' },
  },
  combo_10: {
    'pt-BR': { name: 'Atirador certeiro', description: '10 respostas certas seguidas nos passos da lição.' },
    vi: { name: 'Xạ thủ', description: '10 câu đúng liên tiếp trong các bước bài học.' },
    id: { name: 'Penembak jitu', description: '10 jawaban benar berturut-turut di langkah pelajaran.' },
    tr: { name: 'Keskin nişancı', description: 'Ders adımlarında üst üste 10 doğru cevap.' },
    pl: { name: 'Strzelec wyborowy', description: '10 poprawnych odpowiedzi z rzędu w krokach lekcji.' },
  },
  combo_20: {
    'pt-BR': { name: 'Inabalável', description: '20 respostas certas seguidas sem errar.' },
    vi: { name: 'Không thể phá vỡ', description: '20 câu trả lời đúng liên tiếp không trượt.' },
    id: { name: 'Tak tergoyahkan', description: '20 jawaban benar berturut-turut tanpa meleset.' },
    tr: { name: 'Sarsılmaz', description: 'Iska yapmadan üst üste 20 doğru cevap.' },
    pl: { name: 'Niezłomny', description: '20 poprawnych odpowiedzi z rzędu bez pudła.' },
  },
  combo_50: {
    'pt-BR': { name: 'Máquina', description: '50 respostas certas seguidas em uma série.' },
    vi: { name: 'Cỗ máy', description: '50 câu trả lời đúng liên tiếp trong một chuỗi.' },
    id: { name: 'Mesin', description: '50 jawaban benar berturut-turut dalam satu seri.' },
    tr: { name: 'Makine', description: 'Tek bir seride üst üste 50 doğru cevap.' },
    pl: { name: 'Maszyna', description: '50 poprawnych odpowiedzi z rzędu w jednej serii.' },
  },
  combo_100: {
    'pt-BR': { name: 'Invencível', description: '100 respostas certas seguidas em uma série.' },
    vi: { name: 'Bất bại', description: '100 câu trả lời đúng liên tiếp trong một chuỗi.' },
    id: { name: 'Tak terkalahkan', description: '100 jawaban benar berturut-turut dalam satu seri.' },
    tr: { name: 'Yenilmez', description: 'Tek bir seride üst üste 100 doğru cevap.' },
    pl: { name: 'Niepokonany', description: '100 poprawnych odpowiedzi z rzędu w jednej serii.' },
  },
  combo_150: {
    'pt-BR': { name: '150 seguidas', description: '150 respostas certas seguidas em uma série.' },
    vi: { name: '150 liên tiếp', description: '150 câu trả lời đúng liên tiếp trong một chuỗi.' },
    id: { name: '150 berturut-turut', description: '150 jawaban benar berturut-turut dalam satu seri.' },
    tr: { name: 'Üst üste 150', description: 'Tek bir seride üst üste 150 doğru cevap.' },
    pl: { name: '150 z rzędu', description: '150 poprawnych odpowiedzi z rzędu w jednej serii.' },
  },
  combo_250: {
    'pt-BR': { name: 'Ritmo sobre-humano', description: '250 respostas certas seguidas em uma série.' },
    vi: { name: 'Nhịp độ phi thường', description: '250 câu trả lời đúng liên tiếp trong một chuỗi.' },
    id: { name: 'Ritme di luar manusia', description: '250 jawaban benar berturut-turut dalam satu seri.' },
    tr: { name: 'İnsanüstü ritim', description: 'Tek bir seride üst üste 250 doğru cevap.' },
    pl: { name: 'Nieludzki rytm', description: '250 poprawnych odpowiedzi z rzędu w jednej serii.' },
  },
  combo_500: {
    'pt-BR': { name: 'Erro proibido', description: '500 respostas certas seguidas em uma série.' },
    vi: { name: 'Cấm sai', description: '500 câu trả lời đúng liên tiếp trong một chuỗi.' },
    id: { name: 'Kesalahan dilarang', description: '500 jawaban benar berturut-turut dalam satu seri.' },
    tr: { name: 'Hata yasak', description: 'Tek bir seride üst üste 500 doğru cevap.' },
    pl: { name: 'Błąd zakazany', description: '500 poprawnych odpowiedzi z rzędu w jednej serii.' },
  },
  daily_task_first: {
    'pt-BR': { name: 'Primeira tarefa', description: 'Conclua uma das tarefas diárias na tela de tarefas.' },
    vi: { name: 'Nhiệm vụ đầu tiên', description: 'Hoàn thành một nhiệm vụ hằng ngày trên màn hình nhiệm vụ.' },
    id: { name: 'Tugas pertama', description: 'Selesaikan salah satu tugas harian di layar tugas.' },
    tr: { name: 'İlk görev', description: 'Görevler ekranındaki günlük görevlerden birini tamamla.' },
    pl: { name: 'Pierwsze zadanie', description: 'Wykonaj jedno z zadań dziennych na ekranie zadań.' },
  },
  all_daily: {
    'pt-BR': { name: 'Tudo em um dia', description: 'Em um dia do calendário, conclua todas as três tarefas diárias.' },
    vi: { name: 'Xong hết trong ngày', description: 'Trong một ngày lịch, hoàn thành cả ba nhiệm vụ hằng ngày.' },
    id: { name: 'Semua dalam sehari', description: 'Dalam satu hari kalender, selesaikan ketiga tugas harian.' },
    tr: { name: 'Bir günde hepsi', description: 'Bir takvim gününde üç günlük görevin tamamını bitir.' },
    pl: { name: 'Wszystko w dzień', description: 'W jeden dzień kalendarzowy zamknij wszystkie trzy zadania dzienne.' },
  },
  daily_all_3: {
    'pt-BR': { name: 'Três dias em ordem', description: 'Conclua todas as tarefas diárias por 3 dias seguidos.' },
    vi: { name: 'Ba ngày gọn gàng', description: 'Hoàn thành tất cả nhiệm vụ hằng ngày trong 3 ngày liên tiếp.' },
    id: { name: 'Tiga hari rapi', description: 'Selesaikan semua tugas harian selama 3 hari berturut-turut.' },
    tr: { name: 'Üç gün düzen', description: '3 gün üst üste tüm günlük görevleri tamamla.' },
    pl: { name: 'Trzy dni porządku', description: 'Przez 3 dni z rzędu zamykaj wszystkie zadania dzienne.' },
  },
  daily_all_7: {
    'pt-BR': { name: 'Semana sem pendências', description: 'Conclua todas as tarefas diárias por 7 dias seguidos.' },
    vi: { name: 'Tuần không nợ nhiệm vụ', description: 'Hoàn thành tất cả nhiệm vụ hằng ngày trong 7 ngày liên tiếp.' },
    id: { name: 'Seminggu tanpa sisa', description: 'Selesaikan semua tugas harian selama 7 hari berturut-turut.' },
    tr: { name: 'Eksiksiz hafta', description: '7 gün üst üste tüm günlük görevleri tamamla.' },
    pl: { name: 'Tydzień bez zaległości', description: 'Przez 7 dni z rzędu zamykaj wszystkie zadania dzienne.' },
  },
  daily_all_14: {
    'pt-BR': { name: 'Duas semanas em ordem', description: 'Conclua todas as tarefas diárias por 14 dias seguidos.' },
    vi: { name: 'Hai tuần gọn gàng', description: 'Hoàn thành tất cả nhiệm vụ hằng ngày trong 14 ngày liên tiếp.' },
    id: { name: 'Dua minggu rapi', description: 'Selesaikan semua tugas harian selama 14 hari berturut-turut.' },
    tr: { name: 'İki hafta düzen', description: '14 gün üst üste tüm günlük görevleri tamamla.' },
    pl: { name: 'Dwa tygodnie porządku', description: 'Przez 14 dni z rzędu zamykaj wszystkie zadania dzienne.' },
  },
  daily_all_30: {
    'pt-BR': { name: '30 dias sem pendências', description: 'Conclua todas as tarefas diárias por 30 dias seguidos.' },
    vi: { name: '30 ngày không nợ nhiệm vụ', description: 'Hoàn thành tất cả nhiệm vụ hằng ngày trong 30 ngày liên tiếp.' },
    id: { name: '30 hari tanpa sisa', description: 'Selesaikan semua tugas harian selama 30 hari berturut-turut.' },
    tr: { name: '30 gün eksiksiz', description: '30 gün üst üste tüm günlük görevleri tamamla.' },
    pl: { name: '30 dni bez zaległości', description: 'Przez 30 dni z rzędu zamykaj wszystkie zadania dzienne.' },
  },
  daily_no_reroll: {
    'pt-BR': { name: 'Sem trocas', description: 'Conclua todas as tarefas do dia sem substituir nenhuma delas.' },
    vi: { name: 'Không đổi nhiệm vụ', description: 'Hoàn thành tất cả nhiệm vụ trong ngày mà không đổi nhiệm vụ nào.' },
    id: { name: 'Tanpa ganti', description: 'Selesaikan semua tugas hari ini tanpa mengganti satu pun.' },
    tr: { name: 'Değiştirmeden', description: 'Günün tüm görevlerini hiçbirini değiştirmeden tamamla.' },
    pl: { name: 'Bez zamian', description: 'Zamknij wszystkie zadania dnia, nie wymieniając żadnego.' },
  },
  daily_no_reroll_7: {
    'pt-BR': { name: 'Semana sem trocas', description: 'Por 7 dias seguidos, conclua todas as tarefas sem substituições.' },
    vi: { name: 'Tuần không đổi nhiệm vụ', description: '7 ngày liên tiếp hoàn thành tất cả nhiệm vụ mà không đổi.' },
    id: { name: 'Seminggu tanpa ganti', description: 'Selama 7 hari berturut-turut, selesaikan semua tugas tanpa mengganti.' },
    tr: { name: 'Değişimsiz hafta', description: '7 gün üst üste tüm görevleri değiştirmeden tamamla.' },
    pl: { name: 'Tydzień bez zamian', description: 'Przez 7 dni z rzędu zamykaj wszystkie zadania bez wymian.' },
  },
  daily_no_reroll_30: {
    'pt-BR': { name: 'Sem negociação', description: 'Por 30 dias seguidos, conclua todas as tarefas sem substituições.' },
    vi: { name: 'Không mặc cả', description: '30 ngày liên tiếp hoàn thành tất cả nhiệm vụ mà không đổi.' },
    id: { name: 'Tanpa tawar-menawar', description: 'Selama 30 hari berturut-turut, selesaikan semua tugas tanpa mengganti.' },
    tr: { name: 'Pazarlıksız', description: '30 gün üst üste tüm görevleri değiştirmeden tamamla.' },
    pl: { name: 'Bez targowania', description: 'Przez 30 dni z rzędu zamykaj wszystkie zadania bez wymian.' },
  },
  daily_phrase_first: {
    'pt-BR': { name: 'Frase do dia', description: 'Abra o cartão da frase do dia e leia a explicação.' },
    vi: { name: 'Cụm từ trong ngày', description: 'Mở thẻ cụm từ trong ngày và đọc phần giải thích.' },
    id: { name: 'Frasa hari ini', description: 'Buka kartu frasa harian dan baca penjelasannya.' },
    tr: { name: 'Günün ifadesi', description: 'Günün ifadesi kartını aç ve açıklamayı oku.' },
    pl: { name: 'Fraza dnia', description: 'Otwórz kartę frazy dnia i przeczytaj wyjaśnienie.' },
  },
  daily_phrase_save: {
    'pt-BR': { name: 'Para a coleção', description: 'Salve a frase do dia nos cartões.' },
    vi: { name: 'Cho vào kho', description: 'Lưu cụm từ trong ngày vào thẻ.' },
    id: { name: 'Masuk koleksi', description: 'Simpan frasa harian ke kartu.' },
    tr: { name: 'Koleksiyona', description: 'Günün ifadesini kartlara kaydet.' },
    pl: { name: 'Do skarbca', description: 'Zapisz frazę dnia w kartach.' },
  },
  daily_phrase_read_30: {
    'pt-BR': { name: '30 frases do dia', description: 'Abra e leia 30 frases do dia.' },
    vi: { name: '30 cụm từ trong ngày', description: 'Mở và đọc 30 cụm từ trong ngày.' },
    id: { name: '30 frasa harian', description: 'Buka dan baca 30 frasa harian.' },
    tr: { name: '30 günün ifadesi', description: '30 günün ifadesini aç ve oku.' },
    pl: { name: '30 fraz dnia', description: 'Otwórz i przeczytaj 30 fraz dnia.' },
  },
  daily_phrase_save_30: {
    'pt-BR': { name: 'Frases em reserva', description: 'Salve 30 frases do dia nos cartões.' },
    vi: { name: 'Cụm từ dự trữ', description: 'Lưu 30 cụm từ trong ngày vào thẻ.' },
    id: { name: 'Frasa cadangan', description: 'Simpan 30 frasa harian ke kartu.' },
    tr: { name: 'Yedek ifadeler', description: '30 günün ifadesini kartlara kaydet.' },
    pl: { name: 'Frazy w zapasie', description: 'Zapisz 30 fraz dnia w kartach.' },
  },
  daily_phrase_save_100: {
    'pt-BR': { name: 'Cem frases na coleção', description: 'Salve 100 frases do dia nos cartões.' },
    vi: { name: 'Một trăm cụm từ trong kho', description: 'Lưu 100 cụm từ trong ngày vào thẻ.' },
    id: { name: 'Seratus frasa di koleksi', description: 'Simpan 100 frasa harian ke kartu.' },
    tr: { name: 'Koleksiyonda yüz ifade', description: '100 günün ifadesini kartlara kaydet.' },
    pl: { name: 'Sto fraz w skarbcu', description: 'Zapisz 100 fraz dnia w kartach.' },
  },
  login_7: {
    'pt-BR': { name: 'Aluno fiel', description: 'Abra o app por 7 dias seguidos na sequência de login.' },
    vi: { name: 'Học viên trung thành', description: 'Mở ứng dụng 7 ngày liên tiếp trong chuỗi đăng nhập.' },
    id: { name: 'Murid setia', description: 'Buka aplikasi selama 7 hari berturut-turut dalam streak login.' },
    tr: { name: 'Sadık öğrenci', description: 'Giriş serisinde 7 gün üst üste uygulamayı aç.' },
    pl: { name: 'Wierny uczeń', description: 'Otwieraj aplikację przez 7 dni z rzędu w serii logowania.' },
  },
  login_14: {
    'pt-BR': { name: 'Duas semanas', description: 'Abra o app por 14 dias seguidos.' },
    vi: { name: 'Hai tuần', description: 'Mở ứng dụng 14 ngày liên tiếp.' },
    id: { name: 'Dua minggu', description: 'Buka aplikasi selama 14 hari berturut-turut.' },
    tr: { name: 'İki hafta', description: 'Uygulamayı 14 gün üst üste aç.' },
    pl: { name: 'Dwa tygodnie', description: 'Otwieraj aplikację przez 14 dni z rzędu.' },
  },
  login_30: {
    'pt-BR': { name: 'Um mês no app', description: '30 dias seguidos com pelo menos um login por dia.' },
    vi: { name: 'Một tháng trong ứng dụng', description: '30 ngày liên tiếp có ít nhất một lần mở ứng dụng mỗi ngày.' },
    id: { name: 'Sebulan di aplikasi', description: '30 hari berturut-turut dengan setidaknya satu login per hari.' },
    tr: { name: 'Uygulamada bir ay', description: '30 gün üst üste her gün en az bir giriş yap.' },
    pl: { name: 'Miesiąc w aplikacji', description: '30 dni z rzędu z co najmniej jednym logowaniem dziennie.' },
  },
  login_60: {
    'pt-BR': { name: 'Dois meses', description: 'Abra o app todos os dias por 60 dias seguidos.' },
    vi: { name: 'Hai tháng', description: 'Mở ứng dụng mỗi ngày trong 60 ngày liên tiếp.' },
    id: { name: 'Dua bulan', description: 'Buka aplikasi setiap hari selama 60 hari berturut-turut.' },
    tr: { name: 'İki ay', description: '60 gün üst üste her gün uygulamaya gir.' },
    pl: { name: 'Dwa miesiące', description: 'Wchodź do aplikacji codziennie przez 60 dni z rzędu.' },
  },
  login_100: {
    'pt-BR': { name: '100 logins seguidos', description: 'Abra o app por 100 dias seguidos.' },
    vi: { name: '100 lần mở liên tiếp', description: 'Mở ứng dụng 100 ngày liên tiếp.' },
    id: { name: '100 login berturut-turut', description: 'Buka aplikasi selama 100 hari berturut-turut.' },
    tr: { name: 'Üst üste 100 giriş', description: 'Uygulamayı 100 gün üst üste aç.' },
    pl: { name: '100 logowań z rzędu', description: 'Otwieraj aplikację przez 100 dni z rzędu.' },
  },
  login_200: {
    'pt-BR': { name: '200 logins seguidos', description: 'Abra o app por 200 dias seguidos.' },
    vi: { name: '200 lần mở liên tiếp', description: 'Mở ứng dụng 200 ngày liên tiếp.' },
    id: { name: '200 login berturut-turut', description: 'Buka aplikasi selama 200 hari berturut-turut.' },
    tr: { name: 'Üst üste 200 giriş', description: 'Uygulamayı 200 gün üst üste aç.' },
    pl: { name: '200 logowań z rzędu', description: 'Otwieraj aplikację przez 200 dni z rzędu.' },
  },
  login_365: {
    'pt-BR': { name: 'Um ano inteiro no app', description: '365 dias seguidos com login diário.' },
    vi: { name: 'Cả năm trong ứng dụng', description: '365 ngày liên tiếp có mở ứng dụng mỗi ngày.' },
    id: { name: 'Setahun penuh di aplikasi', description: '365 hari berturut-turut dengan login harian.' },
    tr: { name: 'Uygulamada tam bir yıl', description: '365 gün üst üste günlük giriş yap.' },
    pl: { name: 'Cały rok w aplikacji', description: '365 dni z rzędu z codziennym logowaniem.' },
  },
  comeback: {
    'pt-BR': { name: 'Retorno', description: 'Volte após cerca de 7 dias ou mais sem atividade para ativar o bônus de retorno.' },
    vi: { name: 'Trở lại', description: 'Quay lại sau khoảng 7 ngày trở lên không hoạt động để nhận thưởng chào mừng trở lại.' },
    id: { name: 'Kembali lagi', description: 'Kembali setelah sekitar 7 hari atau lebih tanpa aktivitas untuk memicu bonus kembali.' },
    tr: { name: 'Geri dönüş', description: 'Yaklaşık 7 gün veya daha uzun süre etkinlik olmadan geri dön ve dönüş bonusunu tetikle.' },
    pl: { name: 'Powrót', description: 'Wróć po około 7 lub więcej dniach bez aktywności, aby uruchomić bonus powrotu.' },
  },
  diagnosis: {
    'pt-BR': { name: 'Diagnóstico feito', description: 'Conclua o teste diagnóstico de nível até o fim.' },
    vi: { name: 'Đã chẩn đoán', description: 'Hoàn thành bài kiểm tra chẩn đoán trình độ đến cuối.' },
    id: { name: 'Diagnosis selesai', description: 'Selesaikan tes diagnosis level sampai akhir.' },
    tr: { name: 'Tanı kondu', description: 'Seviye tanılama testini sonuna kadar tamamla.' },
    pl: { name: 'Diagnoza gotowa', description: 'Ukończ test diagnostyczny poziomu do końca.' },
  },
  night_owl: {
    'pt-BR': { name: 'Coruja noturna', description: 'Ganhe XP no app das 23:00 às 5:00 no horário local.' },
    vi: { name: 'Cú đêm', description: 'Nhận XP trong ứng dụng từ 23:00 đến 5:00 theo giờ địa phương.' },
    id: { name: 'Burung malam', description: 'Dapatkan XP di aplikasi antara pukul 23.00 dan 05.00 waktu setempat.' },
    tr: { name: 'Gece kuşu', description: 'Yerel saate göre 23:00 ile 5:00 arasında uygulamada XP kazan.' },
    pl: { name: 'Nocny marek', description: 'Zdobądź XP w aplikacji między 23:00 a 5:00 czasu lokalnego.' },
  },
  early_bird: {
    'pt-BR': { name: 'Madrugador', description: 'Ganhe XP entre 5:00 e 7:00 no horário local.' },
    vi: { name: 'Chim dậy sớm', description: 'Nhận XP từ 5:00 đến 7:00 theo giờ địa phương.' },
    id: { name: 'Bangun pagi', description: 'Dapatkan XP antara pukul 05.00 dan 07.00 waktu setempat.' },
    tr: { name: 'Erkenci', description: 'Yerel saate göre 5:00 ile 7:00 arasında XP kazan.' },
    pl: { name: 'Ranny ptaszek', description: 'Zdobądź XP między 5:00 a 7:00 czasu lokalnego.' },
  },
  exam_first: {
    'pt-BR': { name: 'Exame aprovado', description: 'Passe no exame após uma lição pelo menos uma vez.' },
    vi: { name: 'Đã qua kỳ thi', description: 'Vượt qua bài thi sau bài học ít nhất một lần.' },
    id: { name: 'Ujian lulus', description: 'Lulus ujian setelah pelajaran setidaknya sekali.' },
    tr: { name: 'Sınav geçildi', description: 'Bir dersten sonraki sınavı en az bir kez geç.' },
    pl: { name: 'Egzamin zdany', description: 'Zdaj egzamin po lekcji co najmniej raz.' },
  },
  exam_ace: {
    'pt-BR': { name: 'Aluno nota alta', description: 'Faça pelo menos 90% no exame da lição.' },
    vi: { name: 'Học viên xuất sắc', description: 'Đạt ít nhất 90% trong bài thi của bài học.' },
    id: { name: 'Siswa unggul', description: 'Raih minimal 90% pada ujian pelajaran.' },
    tr: { name: 'Pekiyi', description: 'Ders sınavında en az %90 al.' },
    pl: { name: 'Prymus', description: 'Zdobądź co najmniej 90% na egzaminie lekcji.' },
  },
  exam_ace_5: {
    'pt-BR': { name: 'Cinco ótimos exames', description: 'Faça pelo menos 90% no exame 5 vezes.' },
    vi: { name: 'Năm bài thi xuất sắc', description: 'Đạt ít nhất 90% trong bài thi 5 lần.' },
    id: { name: 'Lima ujian unggul', description: 'Raih minimal 90% pada ujian sebanyak 5 kali.' },
    tr: { name: 'Beş harika sınav', description: 'Sınavda 5 kez en az %90 al.' },
    pl: { name: 'Pięć świetnych egzaminów', description: 'Zdobądź co najmniej 90% na egzaminie 5 razy.' },
  },
  exam_ace_10: {
    'pt-BR': { name: 'Dez ótimos exames', description: 'Faça pelo menos 90% no exame 10 vezes.' },
    vi: { name: 'Mười bài thi xuất sắc', description: 'Đạt ít nhất 90% trong bài thi 10 lần.' },
    id: { name: 'Sepuluh ujian unggul', description: 'Raih minimal 90% pada ujian sebanyak 10 kali.' },
    tr: { name: 'On harika sınav', description: 'Sınavda 10 kez en az %90 al.' },
    pl: { name: 'Dziesięć świetnych egzaminów', description: 'Zdobądź co najmniej 90% na egzaminie 10 razy.' },
  },
  flashcards_session: {
    'pt-BR': { name: 'Todas as cartas de uma vez', description: 'Em uma visita à coleção, veja cada cartão salvo.' },
    vi: { name: 'Tất cả thẻ trong một lượt', description: 'Trong một lần vào màn hình bộ sưu tập, xem từng thẻ đã lưu.' },
    id: { name: 'Semua kartu sekaligus', description: 'Dalam satu sesi di layar koleksi, lihat setiap kartu yang tersimpan.' },
    tr: { name: 'Tüm kartlar tek seferde', description: 'Koleksiyon ekranına bir girişte kayıtlı her kartı görüntüle.' },
    pl: { name: 'Wszystkie karty naraz', description: 'Podczas jednego wejścia do kolekcji obejrzyj każdą zapisaną kartę.' },
  },
  flashcards_save_25: {
    'pt-BR': { name: 'Seu dicionário', description: 'Salve 25 cartões na coleção.' },
    vi: { name: 'Từ điển của bạn', description: 'Lưu 25 thẻ vào bộ sưu tập.' },
    id: { name: 'Kamusmu sendiri', description: 'Simpan 25 kartu ke koleksi.' },
    tr: { name: 'Kendi sözlüğün', description: 'Koleksiyona 25 kart kaydet.' },
    pl: { name: 'Własny słownik', description: 'Zapisz 25 kart w kolekcji.' },
  },
  flashcards_save_50: {
    'pt-BR': { name: 'Arquivista', description: 'Salve 50 cartões na coleção.' },
    vi: { name: 'Người lưu trữ', description: 'Lưu 50 thẻ vào bộ sưu tập.' },
    id: { name: 'Arsiparis', description: 'Simpan 50 kartu ke koleksi.' },
    tr: { name: 'Arşivci', description: 'Koleksiyona 50 kart kaydet.' },
    pl: { name: 'Archiwista', description: 'Zapisz 50 kart w kolekcji.' },
  },
  flashcards_save_100: {
    'pt-BR': { name: '100 cartões', description: 'Salve 100 cartões na coleção.' },
    vi: { name: '100 thẻ', description: 'Lưu 100 thẻ vào bộ sưu tập.' },
    id: { name: '100 kartu', description: 'Simpan 100 kartu ke koleksi.' },
    tr: { name: '100 kart', description: 'Koleksiyona 100 kart kaydet.' },
    pl: { name: '100 kart', description: 'Zapisz 100 kart w kolekcji.' },
  },
  flashcards_save_250: {
    'pt-BR': { name: 'Grande arquivo', description: 'Salve 250 cartões na coleção.' },
    vi: { name: 'Kho lưu trữ lớn', description: 'Lưu 250 thẻ vào bộ sưu tập.' },
    id: { name: 'Arsip besar', description: 'Simpan 250 kartu ke koleksi.' },
    tr: { name: 'Büyük arşiv', description: 'Koleksiyona 250 kart kaydet.' },
    pl: { name: 'Wielkie archiwum', description: 'Zapisz 250 kart w kolekcji.' },
  },
  flashcards_flip_100: {
    'pt-BR': { name: 'Cem viradas', description: 'Vire cartões 100 vezes durante a revisão.' },
    vi: { name: 'Một trăm lần lật', description: 'Lật thẻ 100 lần khi ôn tập.' },
    id: { name: 'Seratus balik', description: 'Balik kartu 100 kali saat mengulang.' },
    tr: { name: 'Yüz çevirme', description: 'Tekrarda kartları 100 kez çevir.' },
    pl: { name: 'Sto obrotów', description: 'Obróć karty 100 razy podczas powtórki.' },
  },
  flashcards_flip_500: {
    'pt-BR': { name: '500 viradas', description: 'Vire cartões 500 vezes durante a revisão.' },
    vi: { name: '500 lần lật', description: 'Lật thẻ 500 lần khi ôn tập.' },
    id: { name: '500 balik', description: 'Balik kartu 500 kali saat mengulang.' },
    tr: { name: '500 çevirme', description: 'Tekrarda kartları 500 kez çevir.' },
    pl: { name: '500 obrotów', description: 'Obróć karty 500 razy podczas powtórki.' },
  },
  flashcards_flip_1000: {
    'pt-BR': { name: 'Mil viradas', description: 'Vire cartões 1000 vezes durante a revisão.' },
    vi: { name: 'Một nghìn lần lật', description: 'Lật thẻ 1000 lần khi ôn tập.' },
    id: { name: 'Seribu balik', description: 'Balik kartu 1000 kali saat mengulang.' },
    tr: { name: 'Bin çevirme', description: 'Tekrarda kartları 1000 kez çevir.' },
    pl: { name: 'Tysiąc obrotów', description: 'Obróć karty 1000 razy podczas powtórki.' },
  },
  flashcards_view_7_days: {
    'pt-BR': { name: 'Semana de cartões', description: 'Veja cartões na coleção por 7 dias seguidos.' },
    vi: { name: 'Tuần thẻ học', description: 'Xem thẻ trong bộ sưu tập 7 ngày liên tiếp.' },
    id: { name: 'Minggu kartu', description: 'Lihat kartu di koleksi selama 7 hari berturut-turut.' },
    tr: { name: 'Kart haftası', description: 'Koleksiyonda 7 gün üst üste kartları görüntüle.' },
    pl: { name: 'Tydzień kart', description: 'Przeglądaj karty w kolekcji przez 7 dni z rzędu.' },
  },
  flashcards_view_14_days: {
    'pt-BR': { name: 'Duas semanas de cartões', description: 'Veja cartões na coleção por 14 dias seguidos.' },
    vi: { name: 'Hai tuần thẻ học', description: 'Xem thẻ trong bộ sưu tập 14 ngày liên tiếp.' },
    id: { name: 'Dua minggu kartu', description: 'Lihat kartu di koleksi selama 14 hari berturut-turut.' },
    tr: { name: 'İki kart haftası', description: 'Koleksiyonda 14 gün üst üste kartları görüntüle.' },
    pl: { name: 'Dwa tygodnie kart', description: 'Przeglądaj karty w kolekcji przez 14 dni z rzędu.' },
  },
  flashcards_view_30_days: {
    'pt-BR': { name: 'Mês de cartões', description: 'Veja cartões na coleção por 30 dias seguidos.' },
    vi: { name: 'Tháng thẻ học', description: 'Xem thẻ trong bộ sưu tập 30 ngày liên tiếp.' },
    id: { name: 'Bulan kartu', description: 'Lihat kartu di koleksi selama 30 hari berturut-turut.' },
    tr: { name: 'Kart ayı', description: 'Koleksiyonda 30 gün üst üste kartları görüntüle.' },
    pl: { name: 'Miesiąc kart', description: 'Przeglądaj karty w kolekcji przez 30 dni z rzędu.' },
  },
  flashcards_sources_4: {
    'pt-BR': { name: 'Quatro fontes', description: 'Salve cartões de uma lição ou quiz, palavras, verbos e frase do dia.' },
    vi: { name: 'Bốn nguồn', description: 'Lưu thẻ từ bài học hoặc quiz, từ vựng, động từ và cụm từ trong ngày.' },
    id: { name: 'Empat sumber', description: 'Simpan kartu dari pelajaran atau kuis, kata, verba, dan frasa harian.' },
    tr: { name: 'Dört kaynak', description: 'Ders veya quiz, kelimeler, fiiller ve günün ifadesinden kart kaydet.' },
    pl: { name: 'Cztery źródła', description: 'Zapisz karty z lekcji lub quizu, słów, czasowników i frazy dnia.' },
  },
};

const ACHIEVEMENT_NAME_PICKERS: Record<Lang, AchievementLocalePicker> = {
  ru: (achievement) => achievement.nameRu,
  uk: (achievement) => achievement.nameUk,
  es: (achievement) => achievement.nameEs ?? ACHIEVEMENT_ES[achievement.id]?.nameEs,
  'pt-BR': (achievement) => plannedAchievementCopy(achievement, 'pt-BR', 'name'),
  vi: (achievement) => plannedAchievementCopy(achievement, 'vi', 'name'),
  id: (achievement) => plannedAchievementCopy(achievement, 'id', 'name'),
  tr: (achievement) => plannedAchievementCopy(achievement, 'tr', 'name'),
  pl: (achievement) => plannedAchievementCopy(achievement, 'pl', 'name'),
};

const ACHIEVEMENT_DESC_PICKERS: Record<Lang, AchievementLocalePicker> = {
  ru: (achievement) => achievement.descRu,
  uk: (achievement) => achievement.descUk,
  es: (achievement) => achievement.descEs ?? ACHIEVEMENT_ES[achievement.id]?.descEs,
  'pt-BR': (achievement) => plannedAchievementCopy(achievement, 'pt-BR', 'description'),
  vi: (achievement) => plannedAchievementCopy(achievement, 'vi', 'description'),
  id: (achievement) => plannedAchievementCopy(achievement, 'id', 'description'),
  tr: (achievement) => plannedAchievementCopy(achievement, 'tr', 'description'),
  pl: (achievement) => plannedAchievementCopy(achievement, 'pl', 'description'),
};

const MEDAL_BLOCK_LESSON_RANGES: Record<string, string> = {
  a1: '1-8',
  a2: '9-18',
  b1: '19-28',
  b2: '29-32',
};

const MEDAL_TIER_REQUIRED_PASSES: Record<string, number> = {
  ruby: 2,
  emerald: 3,
  diamond: 4,
  obsidian: 7,
  mythic: 10,
};

const MEDAL_TIER_LABELS: Record<string, Record<PlannedAchievementLang, string>> = {
  ruby: { 'pt-BR': 'rubi', vi: 'ruby', id: 'ruby', tr: 'yakut', pl: 'rubin' },
  emerald: { 'pt-BR': 'esmeralda', vi: 'ngọc lục bảo', id: 'zamrud', tr: 'zümrüt', pl: 'szmaragd' },
  diamond: { 'pt-BR': 'diamante', vi: 'kim cương', id: 'berlian', tr: 'elmas', pl: 'diament' },
  obsidian: { 'pt-BR': 'obsidiana', vi: 'obsidian', id: 'obsidian', tr: 'obsidyen', pl: 'obsydian' },
  mythic: { 'pt-BR': 'mítica', vi: 'thần thoại', id: 'mitis', tr: 'efsanevi', pl: 'mityczna' },
};

function plannedMedalAchievementCopy(
  achievementId: string,
  lang: PlannedAchievementLang,
  field: PlannedAchievementField,
): string | undefined {
  if (achievementId === 'gem_all_complete') {
    const copy: PlannedAchievementCopy = {
      'pt-BR': { name: 'Colecionador de medalhas', description: 'Colete a medalha mais alta, diamante, nos quatro blocos: A1, A2, B1 e B2.' },
      vi: { name: 'Nhà sưu tập huy chương', description: 'Sưu tầm huy chương cao nhất, kim cương, ở cả bốn khối: A1, A2, B1 và B2.' },
      id: { name: 'Kolektor medali', description: 'Kumpulkan medali tertinggi, berlian, di keempat blok: A1, A2, B1, dan B2.' },
      tr: { name: 'Madalya koleksiyoncusu', description: 'Dört blokta da en yüksek, elmas madalyayı topla: A1, A2, B1 ve B2.' },
      pl: { name: 'Kolekcjoner medali', description: 'Zbierz najwyższy, diamentowy medal we wszystkich czterech blokach: A1, A2, B1 i B2.' },
    };
    return copy[lang][field];
  }
  if (achievementId === 'gem_all_obsidian') {
    const copy: PlannedAchievementCopy = {
      'pt-BR': { name: 'Todas as obsidianas', description: 'Colete a medalha de obsidiana em A1, A2, B1 e B2.' },
      vi: { name: 'Tất cả obsidian', description: 'Sưu tầm huy chương obsidian ở A1, A2, B1 và B2.' },
      id: { name: 'Semua obsidian', description: 'Kumpulkan medali obsidian di A1, A2, B1, dan B2.' },
      tr: { name: 'Tüm obsidyenler', description: 'A1, A2, B1 ve B2 için obsidyen madalyayı topla.' },
      pl: { name: 'Wszystkie obsydiany', description: 'Zbierz obsydianowy medal w A1, A2, B1 i B2.' },
    };
    return copy[lang][field];
  }
  if (achievementId === 'gem_all_mythic') {
    const copy: PlannedAchievementCopy = {
      'pt-BR': { name: 'Todas as míticas', description: 'Colete a medalha mítica em A1, A2, B1 e B2.' },
      vi: { name: 'Tất cả thần thoại', description: 'Sưu tầm huy chương thần thoại ở A1, A2, B1 và B2.' },
      id: { name: 'Semua mitis', description: 'Kumpulkan medali mitis di A1, A2, B1, dan B2.' },
      tr: { name: 'Tüm efsaneviler', description: 'A1, A2, B1 ve B2 için efsanevi madalyayı topla.' },
      pl: { name: 'Wszystkie mityczne', description: 'Zbierz mityczny medal w A1, A2, B1 i B2.' },
    };
    return copy[lang][field];
  }

  const match = achievementId.match(/^gem_(a1|a2|b1|b2)_(ruby|emerald|diamond|obsidian|mythic)$/u);
  if (!match) return undefined;

  const [, block, tier] = match;
  const blockLabel = block.toUpperCase();
  const tierLabel = MEDAL_TIER_LABELS[tier]?.[lang];
  const lessonRange = MEDAL_BLOCK_LESSON_RANGES[block];
  const requiredPasses = MEDAL_TIER_REQUIRED_PASSES[tier];
  if (!tierLabel || !lessonRange || !requiredPasses) return undefined;

  if (field === 'name') return `${blockLabel} ${tierLabel}`;

  const descriptions: Record<PlannedAchievementLang, string> = {
    'pt-BR': `Lições ${lessonRange}: cada uma concluída pelo menos ${requiredPasses} vezes.`,
    vi: `Bài ${lessonRange}: mỗi bài hoàn thành ít nhất ${requiredPasses} lần.`,
    id: `Pelajaran ${lessonRange}: masing-masing diselesaikan setidaknya ${requiredPasses} kali.`,
    tr: `${lessonRange}. dersler: her biri en az ${requiredPasses} kez tamamlandı.`,
    pl: `Lekcje ${lessonRange}: każda ukończona co najmniej ${requiredPasses} razy.`,
  };
  return descriptions[lang];
}

function plannedAchievementCopy(
  achievement: Achievement,
  lang: PlannedAchievementLang,
  field: PlannedAchievementField,
): string {
  return (
    ACHIEVEMENT_PLANNED_COPY[achievement.id]?.[lang][field] ??
    plannedMedalAchievementCopy(achievement.id, lang, field) ??
    plannedAchievementNeedsReview(lang, achievement.id, field)
  );
}

function plannedAchievementNeedsReview(
  lang: PlannedAchievementLang,
  achievementId: string,
  field: PlannedAchievementField,
): string {
  return `needs-review:${lang}:achievement.${achievementId}.${field}`;
}

export function achievementNameForLang(a: Achievement, lang: Lang): string {
  const localized = ACHIEVEMENT_NAME_PICKERS[lang](a);
  return localized ?? a.nameRu;
}

export function achievementDescForLang(a: Achievement, lang: Lang): string {
  const localized = ACHIEVEMENT_DESC_PICKERS[lang](a);
  return localized ?? a.descRu;
}

// Список достижений пополняется без миграции: новые id подхватываются loadAchievementStates().

const ACHIEVEMENTS_WITH_RETIRED_FEATURES: Achievement[] = [
  // Серии (streak) — streak_count: дни подряд с начислением XP (см. updateStreakOnActivity)
  {
    id: 'streak_3', icon:'🔥', category:'streak', xp:30,
    nameRu:'Первые три',        nameUk:'Перші три',
    descRu:'Три дня подряд с опытом — первый шаг к настоящей серии.',     descUk:'Три дні поспіль отримуй досвід у додатку (серія активності).',
  },
  {
    id: 'streak_7', icon:'🥇', category:'streak', xp:75,
    nameRu:'Неделя подряд',       nameUk:'Тиждень поспіль',
    descRu:'7 дней подряд с опытом — первая настоящая серия.',    descUk:'7 днів поспіль з нарахуванням досвіду; заморозка, відновлення або щит можуть зберегти серію.',
  },
  {
    id: 'streak_14', icon:'🥈', category:'streak', xp:120,
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней без перерыва. Привычка уже формируется.',   descUk:'14 днів поспіль з досвідом; це не те саме, що щоденний вхід.',
  },
  {
    id: 'streak_30', icon:'📅', category:'streak', xp:200,
    nameRu:'Месяц в строю',     nameUk:'Місяць у строю',
    descRu:'30 дней подряд. Это уже не эксперимент — это режим.',   descUk:'30 днів поспіль отримуй хоча б раз досвід за день.',
  },
  {
    id: 'streak_60', icon:'📆', category:'streak', xp:350,
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней без пропуска. Половина пути к сотне.',   descUk:'60 днів поспіль тримай серію активності.',
  },
  {
    id: 'streak_100', icon:'💯', category:'streak', xp:500,
    nameRu:'Сто дней',          nameUk:'Сто днів',
    descRu:'100 дней подряд. Сотня — это уже характер.',  descUk:'100 днів поспіль без «пустих» днів для серії.',
  },
  {
    id: 'streak_200', icon:'⭐', category:'streak', xp:750,
    nameRu:'Двести дней',       nameUk:'Двісті днів',
    descRu:'200 дней без перерыва. Это уже образ жизни.',  descUk:'200 днів поспіль із щоденним досвідом.',
  },
  {
    id: 'streak_365', icon:'🎉', category:'streak', xp:1200,
    nameRu:'Целый год',         nameUk:'Цілий рік',
    descRu:'Целый год подряд. Это не просто серия — это часть тебя.',  descUk:'365 днів поспіль тримай серію як у лічильнику стріка.',
  },
  {
    id: 'streak_500', icon:'👑', category:'streak', xp:2000,
    nameRu:'500 дней',          nameUk:'500 днів',
    descRu:'500 дней подряд с опытом — редкое упорство.',  descUk:'500 днів поспіль з досвідом — рідкісна наполегливість.',
    secret: true,
  },
  {
    id: 'streak_repair', icon:'🔁', category:'streak', xp:100,
    nameRu:'Феникс',            nameUk:'Фенікс',
    descRu:'Пропустил день — и тут же вернулся. Феникс возрождается.', descUk:'Встигни скористатися відновленням після рівно одного пропущеного дня й завершити урок того ж дня.',
  },
  {
    id: 'perfect_week', icon:'✨', category:'streak', xp:150,
    nameRu:'Идеальная неделя',  nameUk:'Ідеальний тиждень',
    descRu:'Каждый день с понедельника по воскресенье — ни одного пропуска.', descUk:'Отримуй досвід кожен день із понеділка по неділю одного календарного тижня.',
  },

  // Уроки — «завершён» = ≥45 верных в прогрессе урока
  {
    id: 'lesson_1', icon:'📘', category:'lessons', xp:25,
    nameRu:'Первый шаг',        nameUk:'Перший крок',
    descRu:'Пройди первый урок до конца и получи зачёт.',       descUk:'Заверши один урок: зарахунок при ≥45 правильних відповідей.',
  },
  {
    id: 'lesson_3', icon:'📗', category:'lessons', xp:50,
    nameRu:'Три урока',         nameUk:'Три уроки',
    descRu:'Три урока пройдено. Ритм набирается.',  descUk:'Усього три різні уроки з повним зарахунком.',
  },
  {
    id: 'lesson_5', icon:'📙', category:'lessons', xp:75,
    nameRu:'Пять уроков',       nameUk:'П\'ять уроків',
    descRu:'Пять уроков позади. Уже знаешь, как это работает.',          descUk:'П\'ять уроків доведено до зарахунку.',
  },
  {
    id: 'lesson_10', icon:'🎓', category:'lessons', xp:150,
    nameRu:'Десять уроков',     nameUk:'Десять уроків',
    descRu:'Десять уроков. Ты уже не новичок.',         descUk:'Десять уроків із зарахунком у активі.',
  },
  {
    id: 'lesson_15', icon:'📚', category:'lessons', xp:225,
    nameRu:'Пятнадцать',        nameUk:'П\'ятнадцять',
    descRu:'15 уроков пройдено. Половина курса близко.',         descUk:'15 уроків завершено за правилами зарахунку.',
  },
  {
    id: 'lesson_20', icon:'🏫', category:'lessons', xp:300,
    nameRu:'Двадцать уроков',   nameUk:'Двадцять уроків',
    descRu:'20 уроков. До финала рукой подать.',         descUk:'20 уроків із повним зарахунком.',
  },
  {
    id: 'lesson_all', icon:'🏆', category:'lessons', xp:600,
    nameRu:'Полный курс',       nameUk:'Повний курс',
    descRu:'Все 32 урока пройдены. Курс завершён.',      descUk:'Усі 32 уроки хоча б раз із зарахунком.',
  },
  {
    id: 'lesson_perfect', icon:'✅', category:'lessons', xp:100,
    nameRu:'Ни одной ошибки',   nameUk:'Жодної помилки',
    descRu:'Урок пройден идеально — ни одного промаха.',   descUk:'Пройди урок без відповідей «помилка» й із зарахунком (≥45 правильних).',
  },
  {
    id: 'lesson_perfect3', icon:'💯', category:'lessons', xp:200,
    nameRu:'Три идеальных',    nameUk:'Три ідеальних',
    descRu:'Три урока — и ни одной ошибки в каждом.', descUk:'Три різні уроки без жодної помилки в прогресі.',
  },
  {
    id: 'lesson_all_perfect', icon:'🌟', category:'lessons', xp:1500,
    nameRu:'Абсолют',           nameUk:'Абсолют',
    descRu:'Все 32 урока — без единой ошибки. Чище некуда.', descUk:'Усі 32 уроки ідеально: без «помилка» в кожному.',
    secret: true,
  },

  // XP — user_total_xp
  {
    id: 'xp_100', icon:'⚡', category:'xp', xp:20,
    nameRu:'Первая сотня',      nameUk:'Перша сотня',
    descRu:'Первые 100 XP. Начало положено.',            descUk:'Накопич 100 XP у лічильнику «всього досвіду».',
  },
  {
    id: 'xp_250', icon:'✨', category:'xp', xp:30,
    nameRu:'250 опыта',         nameUk:'250 досвіду',
    descRu:'250 XP — и это только начало.',            descUk:'250 XP загалом (незалежно від джерела).',
  },
  {
    id: 'xp_500', icon:'💫', category:'xp', xp:50,
    nameRu:'Пятьсот',           nameUk:'П\'ятсот',
    descRu:'500 XP. Темп взят — не останавливайся.',            descUk:'500 XP на загальному лічильнику.',
  },
  {
    id: 'xp_1000', icon:'⭐', category:'xp', xp:75,
    nameRu:'Тысячник',          nameUk:'Тисячник',
    descRu:'Первая тысяча опыта. Дальше — больше.',          descUk:'1 000 XP загалом.',
  },
  {
    id: 'xp_2500', icon:'🌟', category:'xp', xp:100,
    nameRu:'2 500 опыта',       nameUk:'2 500 досвіду',
    descRu:'2 500 XP — и ни одной причины останавливаться.',          descUk:'2 500 XP загалом.',
  },
  {
    id: 'xp_5000', icon:'💎', category:'xp', xp:150,
    nameRu:'Пять тысяч',        nameUk:'П\'ять тисяч',
    descRu:'5 000 XP. Ты уже далеко ушёл от старта.',          descUk:'5 000 XP загалом.',
  },
  {
    id: 'xp_10000', icon:'🏅', category:'xp', xp:200,
    nameRu:'Десять тысяч',      nameUk:'Десять тисяч',
    descRu:'10 000 XP. Это уже серьёзный результат.',         descUk:'10 000 XP загалом.',
  },
  {
    id: 'xp_20000', icon:'🎖️', category:'xp', xp:300,
    nameRu:'Двадцать тысяч',    nameUk:'Двадцять тисяч',
    descRu:'20 000 XP. Английский уже не тот, что был.',         descUk:'20 000 XP загалом.',
  },
  {
    id: 'xp_50000', icon:'🏆', category:'xp', xp:500,
    nameRu:'Пятьдесят тысяч',    nameUk:'П\'ятдесят тисяч',
    descRu:'50 000 XP. Полпути к легенде.',         descUk:'50 000 XP загалом.',
    secret: true,
  },
  {
    id: 'xp_100000', icon:'👑', category:'xp', xp:1000,
    nameRu:'Легенда',           nameUk:'Легенда',
    descRu:'100 000 XP. Это не просто число — это путь.',        descUk:'100 000 XP загалом.',
    secret: true,
  },
  {
    id: 'wager_win', icon:'🎲', category:'xp', xp:150,
    nameRu:'Рискнул — победил', nameUk:'Ризикнув — переміг',
    descRu:'Поставил на свою серию — и удержал её до конца. Слово не разошлось с делом.', descUk:'Виграй парі на стрік: тримай серію до кінця терміну, не падаючи нижче рівня на момент ставки.',
  },
  {
    id: 'personal_best', icon:'📈', category:'xp', xp:100,
    nameRu:'Лучшая неделя',     nameUk:'Найкращий тиждень',
    descRu:'Побей свой рекорд недельных очков опыта за календарную неделю.', descUk:'Побий свій рекорд тижневих очок досвіду за календарний тиждень.',
  },

  // Квизы

  // Комбо и ежедневки (combo — подряд верных в уроке lesson1.tsx)
  {
    id: 'combo_3', icon:'🎯', category:'combo', xp:20,
    nameRu:'В потоке',          nameUk:'У потоці',
    descRu:'3 верных ответа подряд во время урока.',   descUk:'3 вірні відповіді поспіль під час уроку.',
  },
  {
    id: 'combo_10', icon:'🎯', category:'combo', xp:60,
    nameRu:'Снайпер',           nameUk:'Снайпер',
    descRu:'10 верных подряд на шагах урока.',         descUk:'10 вірних поспіль на кроках уроку.',
  },
  {
    id: 'combo_20', icon:'🧱', category:'combo', xp:120,
    nameRu:'Несокрушимый',      nameUk:'Незламний',
    descRu:'20 верных ответов подряд без промаха.',         descUk:'20 вірних відповідей поспіль без промаху.',
  },
  {
    id: 'combo_50', icon:'🤖', category:'combo', xp:300,
    nameRu:'Машина',            nameUk:'Машина',
    descRu:'50 верных ответов подряд в одной «серии».', descUk:'50 вірних відповідей поспіль в одній «серії».',
  },
  {
    id: 'combo_100', icon:'🦾', category:'combo', xp:600,
    nameRu:'Непобедимый',       nameUk:'Непереможний',
    descRu:'100 верных ответов подряд в одной серии.', descUk:'100 вірних відповідей поспіль в одній серії.',
    secret: true,
  },
  {
    id: 'daily_task_first', icon:'📋', category:'combo', xp:30,
    nameRu:'Первое задание',    nameUk:'Перше завдання',
    descRu:'Выполни одно из ежедневных заданий на экране задач.', descUk:'Виконай одне з щоденних завдань на екрані завдань.',
  },
  {
    id: 'all_daily', icon:'✅', category:'combo', xp:100,
    nameRu:'Всё за день',       nameUk:'Усе за день',
    descRu:'За один календарный день закрой все три ежедневных задания.', descUk:'За один календарний день закрий усі три щоденні завдання.',
  },
  {
    id: 'daily_all_3', icon:'📌', category:'combo', xp:140,
    nameRu:'Три дня порядка', nameUk:'Три дні порядку',
    descRu:'Три дня подряд закрывай все ежедневные задания.', descUk:'Три дні поспіль закривай усі щоденні завдання.',
  },
  {
    id: 'daily_all_7', icon:'🗓️', category:'combo', xp:350,
    nameRu:'Неделя без хвостов', nameUk:'Тиждень без хвостів',
    descRu:'Семь дней подряд закрывай все ежедневные задания.', descUk:'Сім днів поспіль закривай усі щоденні завдання.',
    secret: true,
  },
  {
    id: 'daily_no_reroll', icon:'🎯', category:'combo', xp:120,
    nameRu:'Без замен', nameUk:'Без замін',
    descRu:'Закрой все задания дня, не заменив ни одно из них.', descUk:'Закрий усі завдання дня, не замінивши жодного з них.',
  },
  {
    id: 'daily_phrase_first', icon:'💬', category:'combo', xp:35,
    nameRu:'Фраза дня', nameUk:'Фраза дня',
    descRu:'Открой карточку фразы дня и прочитай объяснение.', descUk:'Відкрий картку фрази дня й прочитай пояснення.',
  },
  {
    id: 'daily_phrase_save', icon:'🗂️', category:'combo', xp:60,
    nameRu:'В копилку', nameUk:'До скарбнички',
    descRu:'Сохрани фразу дня в карточки.', descUk:'Збережи фразу дня в картки.',
  },

  // Входы — счётчик цепочки ежедневного входа (login_bonus_v1), отдельно от цепочки дней по XP
  {
    id: 'login_7', icon:'🎒', category:'special', xp:75,
    nameRu:'Верный ученик',     nameUk:'Вірний учень',
    descRu:'7 дней подряд открывал приложение. Привычка складывается.',     descUk:'7 днів поспіль заходь у додаток (ланцюжок входу).',
  },
  {
    id: 'login_14', icon:'📆', category:'special', xp:120,
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней подряд открывай приложение.',    descUk:'14 днів поспіль відкривай додаток.',
  },
  {
    id: 'login_30', icon:'🗓️', category:'special', xp:200,
    nameRu:'Месяц в приложении', nameUk:'Місяць у додатку',
    descRu:'30 дней подряд — Phraseman уже часть дня.',    descUk:'30 днів поспіль хоча б з одним входом на день.',
  },
  {
    id: 'login_60', icon:'📌', category:'special', xp:350,
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней подряд заходи в приложение каждый день.',    descUk:'60 днів поспіль заходь у додаток кожен день.',
  },
  {
    id: 'login_365', icon:'🎊', category:'special', xp:1200,
    nameRu:'Целый год в приложении',  nameUk:'Цілий рік у додатку',
    descRu:'365 дней подряд с ежедневным входом.',   descUk:'365 днів поспіль із щоденним входом.',
    secret: true,
  },
  {
    id: 'comeback', icon:'👋', category:'special', secret: true, xp:100,
    nameRu:'Возвращение', nameUk:'Повернення',
    descRu:'Вернулся после долгого перерыва — и сразу взял себя в руки.', descUk:'Повернись після ~7 і більше днів без активності: спрацює вітальний бонус повернення.',
  },
  {
    id: 'diagnosis', icon:'🔬', category:'special', xp:50,
    nameRu:'Диагноз поставлен', nameUk:'Діагноз поставлено',
    descRu:'Пройди диагностический тест уровня до конца.', descUk:'Пройди діагностичний тест рівня до кінця.',
  },
  {
    id: 'night_owl', icon:'🦉', category:'special', secret: true, xp:75,
    nameRu:'Ночная сова',      nameUk:'Нічна сова',
    descRu:'Получи опыт в приложении с 23:00 до 5:00 по местному времени.', descUk:'Отримай досвід у додатку з 23:00 до 5:00 за місцевим часом.',
  },
  {
    id: 'early_bird', icon:'🐦', category:'special', secret: true, xp:75,
    nameRu:'Жаворонок',        nameUk:'Рання пташка',
    descRu:'Получи опыт между 5:00 и 7:00 по местному времени.',    descUk:'Отримай досвід між 5:00 і 7:00 за місцевим часом.',
  },

  // Медали CEFR: ruby/emerald/diamond по минимальному числу проходов среди уроков блока (pass_count)
  { id: 'gem_a1_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'A1 рубин',      nameUk:'A1 рубін',      descRu:'Уроки 1–8 пройдены дважды. Фундамент заложен.',    descUk:'Уроки 1–8: кожен завершено мінімум 2 рази (зарахування уроку).' },
  { id: 'gem_a1_emerald', icon:'💎', category:'medal', xp:250, nameRu:'A1 изумруд',    nameUk:'A1 смарагд',    descRu:'Уроки 1–8 пройдены трижды. Материал уже в крови.',    descUk:'Уроки 1–8: мінімум 3 проходи в кожного.' },
  { id: 'gem_a1_diamond', icon:'💎', category:'medal', xp:400, nameRu:'A1 бриллиант',  nameUk:'A1 діамант',    descRu:'Уроки 1–8 пройдены четыре раза. Это уже автоматизм.',    descUk:'Уроки 1–8: мінімум 4 проходи в кожного.', secret:true },
  { id: 'gem_a2_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'A2 рубин',      nameUk:'A2 рубін',      descRu:'Уроки 9–18 пройдены дважды. A2 закрепляется.',    descUk:'Уроки 9–18: кожен мінімум 2 повних проходи.' },
  { id: 'gem_a2_emerald', icon:'💎', category:'medal', xp:250, nameRu:'A2 изумруд',    nameUk:'A2 смарагд',    descRu:'Уроки 9–18 пройдены трижды. Уверенность растёт.',    descUk:'Уроки 9–18: мінімум 3 проходи на кожен.' },
  { id: 'gem_a2_diamond', icon:'💎', category:'medal', xp:400, nameRu:'A2 бриллиант',  nameUk:'A2 діамант',    descRu:'Уроки 9–18 пройдены четыре раза. A2 — твой уровень.',    descUk:'Уроки 9–18: мінімум 4 проходи на кожен.', secret:true },
  { id: 'gem_b1_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'B1 рубин',      nameUk:'B1 рубін',      descRu:'Уроки 19–28 пройдены дважды. B1 в работе.',    descUk:'Уроки 19–28: кожен урок блоку ≥2 проходів.' },
  { id: 'gem_b1_emerald', icon:'💎', category:'medal', xp:250, nameRu:'B1 изумруд',    nameUk:'B1 смарагд',    descRu:'Уроки 19–28 пройдены трижды. Грамматика становится инстинктом.',    descUk:'Уроки 19–28: по ≥3 проходи на урок.' },
  { id: 'gem_b1_diamond', icon:'💎', category:'medal', xp:400, nameRu:'B1 бриллиант',  nameUk:'B1 діамант',    descRu:'Уроки 19–28 пройдены четыре раза. B1 — твой фундамент.',    descUk:'Уроки 19–28: по ≥4 проходи на урок.', secret:true },
  { id: 'gem_b2_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'B2 рубин',      nameUk:'B2 рубін',      descRu:'Уроки 29–32 пройдены дважды. Финальный блок освоен.',    descUk:'Уроки 29–32: кожен урок ≥2 повних зарахунків.' },
  { id: 'gem_b2_emerald', icon:'💎', category:'medal', xp:250, nameRu:'B2 изумруд',    nameUk:'B2 смарагд',    descRu:'Уроки 29–32 пройдены трижды. Уровень B2 реальный.',    descUk:'Уроки 29–32: по ≥3 проходи кожен.' },
  { id: 'gem_b2_diamond', icon:'💎', category:'medal', xp:400, nameRu:'B2 бриллиант',  nameUk:'B2 діамант',    descRu:'Уроки 29–32 пройдены четыре раза. Это вершина курса.',    descUk:'Уроки 29–32: по ≥4 проходи на кожен урок.', secret:true },

  // Экзамены урока
  {
    id: 'exam_first', icon:'📜', category:'special', xp:75,
    nameRu:'Экзамен сдан',       nameUk:'Іспит складено',
    descRu:'Сдай экзамен после урока (финальный тест урока) хотя бы один раз.', descUk:'Здай іспит після уроку (фінальний тест) хоча б один раз.',
  },
  {
    id: 'exam_ace', icon:'🎓', category:'special', secret: true, xp:250,
    nameRu:'Отличник',          nameUk:'Відмінник',
    descRu:'Набери не менее 90% на экзамене урока.',  descUk:'Набери не менш як 90% на іспиті уроку.',
  },

  // Карточки — все сохранённые в flashcards_v1 за один визит экрана коллекции
  {
    id: 'flashcards_session', icon:'🃏', category:'special', xp:50,
    nameRu:'Все карточки за раз',         nameUk:'Усі картки за раз',
    descRu:'За один заход на экран коллекции просмотри каждую сохранённую карточку.', descUk:'За один захід на екран колекції переглянь кожну збережену картку.',
  },
  {
    id: 'flashcards_save_25', icon:'🗂️', category:'special', xp:120,
    nameRu:'Свой словарь', nameUk:'Свій словник',
    descRu:'Сохрани 25 карточек в коллекцию.', descUk:'Збережи 25 карток у колекцію.',
  },
  {
    id: 'flashcards_save_50', icon:'🗃️', category:'special', xp:250,
    nameRu:'Архивариус', nameUk:'Архіваріус',
    descRu:'Сохрани 50 карточек в коллекцию.', descUk:'Збережи 50 карток у колекцію.',
    secret: true,
  },
  {
    id: 'flashcards_flip_100', icon:'🔄', category:'special', xp:220,
    nameRu:'Сто переворотов', nameUk:'Сто переворотів',
    descRu:'Переверни карточки 100 раз при повторении.', descUk:'Переверни картки 100 разів під час повторення.',
  },
  {
    id: 'flashcards_view_7_days', icon:'📆', category:'special', xp:260,
    nameRu:'Карточная неделя', nameUk:'Карткова неділя',
    descRu:'Семь дней подряд просматривай карточки в коллекции.', descUk:'Сім днів поспіль переглядай картки в колекції.',
    secret: true,
  },
  {
    id: 'flashcards_sources_4', icon:'🧩', category:'special', xp:180,
    nameRu:'Четыре источника', nameUk:'Чотири джерела',
    descRu:'Сохрани карточки из урока, слов, глаголов и фразы дня.', descUk:'Збережи картки з уроку, слів, дієслів і фрази дня.',
  },
  {
    id: 'recall_first', icon:'🧠', category:'special', xp:40,
    nameRu:'Вспомнил сам', nameUk:'Згадав сам',
    descRu:'Дай первый верный ответ в Моей практике.', descUk:'Дай першу правильну відповідь у Моїй практиці.',
  },
  {
    id: 'recall_50', icon:'🧩', category:'special', xp:180,
    nameRu:'Память крепнет', nameUk:'Пам\'ять міцнішає',
    descRu:'Набери 50 верных ответов в Моей практике.', descUk:'Набери 50 правильних відповідей у Моїй практиці.',
  },
  {
    id: 'shards_100', icon:'💎', category:'special', secret: true, xp:250,
    nameRu:'Собиратель жемчужин', nameUk:'Збирач перлин',
    descRu:'Доведи баланс до 100 жемчужин.', descUk:'Доведи баланс до 100 перлин.',
  },
  {
    id: 'shards_spent_100', icon:'💠', category:'special', secret: true, xp:220,
    nameRu:'Жемчужины в дело', nameUk:'Перлини в діло',
    descRu:'Потрать суммарно 100 жемчужин в магазине, лиге или на энергию.', descUk:'Витрать загалом 100 перлин у магазині, лізі або на енергію.',
  },
  {
    id: 'energy_refill_first', icon:'⚡', category:'special', xp:70,
    nameRu:'Второе дыхание', nameUk:'Друге дихання',
    descRu:'Восстанови энергию за жемчужины первый раз.', descUk:'Віднови енергію за перлини вперше.',
  },
  {
    id: 'energy_refill_5', icon:'🔋', category:'special', xp:180,
    nameRu:'На полном заряде', nameUk:'На повному заряді',
    descRu:'Пять раз восстанови энергию за жемчужины.', descUk:'П\'ять разів віднови енергію за перлини.',
    secret: true,
  },
  {
    id: 'league_result_first', icon:'🏁', category:'special', xp:70,
    nameRu:'Итоги недели', nameUk:'Підсумки тижня',
    descRu:'Первая неделя в лиге позади. Посмотрим, куда выведет следующая.', descUk:'Отримай перший тижневий результат у лізі.',
  },
  {
    id: 'league_top3', icon:'🥉', category:'special', xp:180,
    nameRu:'В тройке', nameUk:'У трійці',
    descRu:'Заверши неделю в топ-3 своей лиги.', descUk:'Заверши тиждень у топ-3 своєї ліги.',
  },
  {
    id: 'league_champion', icon:'👑', category:'special', xp:320,
    nameRu:'Первый в группе', nameUk:'Перший у групі',
    descRu:'Заверши неделю на первом месте в группе лиги.', descUk:'Заверши тиждень на першому місці в групі ліги.',
    secret: true,
  },
  {
    id: 'league_promoted', icon:'⬆️', category:'special', xp:160,
    nameRu:'Повышение', nameUk:'Підвищення',
    descRu:'Перейди в более высокую лигу по итогам недели.', descUk:'Перейди до вищої ліги за підсумками тижня.',
  },
  {
    id: 'league_diamond', icon:'💎', category:'special', xp:500,
    nameRu:'Алмазная планка', nameUk:'Діамантова планка',
    descRu:'Доберись до Алмазной лиги или выше.', descUk:'Дістанься Діамантової ліги або вище.',
    secret: true,
  },
  {
    id: 'league_boost_first', icon:'🚀', category:'special', xp:60,
    nameRu:'Разгон недели', nameUk:'Розгін тижня',
    descRu:'Активируй первый личный буст очков лиги.', descUk:'Активуй перший особистий буст очок ліги.',
  },
  {
    id: 'league_boost_5', icon:'📈', category:'special', xp:180,
    nameRu:'Турбо-привычка', nameUk:'Турбо-звичка',
    descRu:'Активируй 5 личных бустов очков лиги.', descUk:'Активуй 5 особистих бустів очок ліги.',
  },
  {
    id: 'league_boost_x3', icon:'✖️', category:'special', xp:140,
    nameRu:'Тройной ход', nameUk:'Потрійний хід',
    descRu:'Активируй личный буст лиги с множителем x3.', descUk:'Активуй особистий буст ліги з множником x3.',
    secret: true,
  },

  // Секрет: все алмазные гемы по A1–B2
  {
    id: 'gem_all_complete', icon:'🏆', category:'medal', secret: true, xp:1000,
    nameRu:'Коллекционер медалей', nameUk:'Колекціонер медалей',
    descRu:'Собери высшую (алмазную) медаль по всем четырём блокам: A1, A2, B1 и B2.', descUk:'Збери найвищу (діамантову) медаль з усіх чотирьох блоків: A1, A2, B1 і B2.',
  },

  // ── Социал / Друзья ───────────────────────────────────────────────────────
  {
    id: 'social_friend_first', icon:'🤝', category:'special', xp:50,
    nameRu:'Не один в поле',  nameUk:'Не один у полі',
    descRu:'Добавь первого друга через код приглашения.', descUk:'Додай першого друга через код запрошення.',
  },
  {
    id: 'social_friends_3', icon:'👯', category:'special', xp:75,
    nameRu:'Своя тусовка',  nameUk:'Своя компанія',
    descRu:'Собери в друзьях сразу трёх человек.', descUk:'Збери в друзях одразу трьох людей.',
  },
  {
    id: 'social_friends_10', icon:'🌐', category:'special', xp:200,
    nameRu:'Магнит для людей',  nameUk:'Магніт для людей',
    descRu:'10 друзей в списке. Ты явно умеешь находить общий язык.', descUk:'10 друзів у списку. Ти явно вмієш знаходити спільну мову.',
    secret: true,
  },
  {
    id: 'social_gift_send', icon:'🎁', category:'special', xp:40,
    nameRu:'Дед Мороз',  nameUk:'Дід Мороз',
    descRu:'Отправь другу подарок — просто потому что можешь.', descUk:'Відправ подарунок другу — щит, прискорення досвіду або жетон арени.',
  },
  {
    id: 'social_gift_5', icon:'🎀', category:'special', xp:150,
    nameRu:'Санта на постоянке',  nameUk:'Санта на постійці',
    descRu:'Отправил 5 подарков друзьям. Щедрость — твоё второе имя.', descUk:'Надіслав 5 подарунків друзям. Щедрість — твоє друге ім\'я.',
  },
  {
    id: 'social_gift_10', icon:'💝', category:'special', xp:260,
    nameRu:'Большая щедрость', nameUk:'Велика щедрість',
    descRu:'Отправь 10 подарков друзьям.', descUk:'Надішли 10 подарунків друзям.',
    secret: true,
  },
  {
    id: 'social_like_received', icon:'❤️', category:'special', xp:30,
    nameRu:'Тебя заметили',  nameUk:'Тебе помітили',
    descRu:'Друг отметил лайком одно из твоих достижений. Слава пришла.', descUk:'Друг відзначив лайком одне з твоїх досягнень. Слава прийшла.',
  },
  {
    id: 'social_likes_5', icon:'💗', category:'special', xp:120,
    nameRu:'Пять отметок', nameUk:'П\'ять відміток',
    descRu:'Получи 5 лайков от друзей на свои достижения.', descUk:'Отримай 5 лайків від друзів на свої досягнення.',
  },
  // ── Арена (расширение) ────────────────────────────────────────────────────

  // ── Тренер / Active Recall ────────────────────────────────────────────────
  {
    id: 'trainer_session', icon:'🧘', category:'special', xp:50,
    nameRu:'Первая тренировка',  nameUk:'Перше тренування',
    descRu:'Пройди первую сессию в режиме «Моя практика».', descUk:'Пройди першу сесію в режимі «Моя практика».',
  },
  {
    id: 'trainer_100_correct', icon:'🧠', category:'special', xp:200,
    nameRu:'Стальная память',  nameUk:'Сталева пам\'ять',
    descRu:'100 правильных ответов суммарно в «Моей практике». Эти слова уже часть тебя.', descUk:'100 правильних відповідей загалом у «Моїй практиці». Ці слова вже частина тебе.',
    secret: true,
  },
  {
    id: 'trainer_7_days', icon:'📅', category:'special', xp:260,
    nameRu:'Неделя практики', nameUk:'Тиждень практики',
    descRu:'Семь дней подряд дай хотя бы один верный ответ в тренировке.', descUk:'Сім днів поспіль дай хоча б одну правильну відповідь у тренуванні.',
  },
  {
    id: 'trainer_500_correct', icon:'🏋️', category:'special', xp:600,
    nameRu:'Пятьсот точных', nameUk:'П\'ятсот точних',
    descRu:'500 правильных ответов суммарно в тренировках.', descUk:'500 правильних відповідей загалом у тренуваннях.',
    secret: true,
  },
  {
    id: 'trainer_perfect_session', icon:'💯', category:'special', xp:180,
    nameRu:'Чистая сессия', nameUk:'Чиста сесія',
    descRu:'Заверши тренировку из 5+ вопросов без ошибки.', descUk:'Заверши тренування з 5+ питань без помилки.',
  },

  // ── Кастомизация ──────────────────────────────────────────────────────────
  {
    id: 'avatar_custom', icon:'🎨', category:'special', xp:50,
    nameRu:'Своё лицо',  nameUk:'Своє обличчя',
    descRu:'Выбери уникальный аватар в настройках профиля.', descUk:'Вибери унікальний аватар у налаштуваннях профілю.',
  },
  {
    id: 'profile_themed', icon:'🖼️', category:'special', xp:35,
    nameRu:'Интерьер готов',  nameUk:'Інтер\'єр готовий',
    descRu:'Установи стиль оформления профильной карточки.', descUk:'Встанови стиль оформлення для картки профілю.',
  },

  // ── Карточки / Паки ───────────────────────────────────────────────────────
  {
    id: 'pack_purchased', icon:'📦', category:'special', xp:60,
    nameRu:'Коллекционер',  nameUk:'Колекціонер',
    descRu:'Первый набор карточек в коллекции — начало большой библиотеки.', descUk:'Отримай перший набір карток: покупка, community-пак або ваучер.',
  },
  {
    id: 'pack_5_purchased', icon:'📚', category:'special', xp:180,
    nameRu:'Библиотекарь',  nameUk:'Бібліотекар',
    descRu:'5 наборов карточек в коллекции. Слов становится всё больше.', descUk:'5 наборів карток у колекції. Слів стає дедалі більше.',
    secret: true,
  },

  // ── Шаринг ────────────────────────────────────────────────────────────────
  {
    id: 'share_achievement', icon:'📣', category:'special', xp:35,
    nameRu:'Громкое достижение',  nameUk:'Гучне досягнення',
    descRu:'Поделись разблокированным достижением — пусть все знают.', descUk:'Поділись розблокованим досягненням — нехай усі знають.',
  },

  // ── Вехи / Milestones ─────────────────────────────────────────────────────
  {
    id: 'level_50', icon:'👑', category:'xp', xp:400,
    nameRu:'Полтинник',  nameUk:'П\'ятдесятник',
    descRu:'Достигни 50-го уровня. Ты уже не новичок — ты легенда.', descUk:'Досягни 50-го рівня. Ти вже не новачок — ти легенда.',
    secret: true,
  },
  {
    id: 'xp_75000', icon:'🚀', category:'xp', xp:300,
    nameRu:'75К — и не останавливаться',  nameUk:'75К — і не зупинятись',
    descRu:'75 000 опыта суммарно. Путь к шестизначному числу открыт.', descUk:'75 000 досвіду загалом. Шлях до шестизначного числа відкрито.',
    secret: true,
  },
  {
    id: 'wager_win_3', icon:'🍀', category:'xp', xp:200,
    nameRu:'Три удачные ставки',  nameUk:'Три вдалі ставки',
    descRu:'Выиграй 3 пари на свою серию суммарно.', descUk:'Виграй 3 парі на свою серію загалом.',
    secret: true,
  },

  // ── Medium / Hardcore layer ───────────────────────────────────────────────
  { id: 'streak_150', icon:'🔥', category:'streak', xp:650, nameRu:'Полторы сотни', nameUk:'Півтори сотні', descRu:'150 дней без перерыва. Здесь уже не воля, а характер.', descUk:'150 днів поспіль отримуй досвід без порожнього дня.' },
  { id: 'streak_250', icon:'🏔️', category:'streak', xp:900, nameRu:'Четверть тысячи', nameUk:'Чверть тисячі', descRu:'250 дней подряд. Четверть тысячи — это отдельная категория людей.', descUk:'250 днів поспіль тримай серію активності.', secret:true },
  { id: 'streak_750', icon:'🗿', category:'streak', xp:3000, nameRu:'750 дней', nameUk:'750 днів', descRu:'750 дней. Это уже монументально.', descUk:'750 днів поспіль із щоденним досвідом.', secret:true },
  { id: 'streak_1000', icon:'👑', category:'streak', xp:5000, nameRu:'Тысяча дней', nameUk:'Тисяча днів', descRu:'1000 дней без пропуска. Тысяча. Этого не описать словами.', descUk:'1000 днів поспіль тримай серію активності.', secret:true },
  { id: 'streak_clean_365', icon:'🛡️', category:'streak', xp:1800, nameRu:'Чистый год', nameUk:'Чистий рік', descRu:'Год без единой починки или заморозки. Только ты и дисциплина.', descUk:'365 днів серії без відновлення чи заморозки за цей відрізок.', secret:true },
  { id: 'perfect_month', icon:'📅', category:'streak', xp:800, nameRu:'Месяц без пустоты', nameUk:'Місяць без порожнечі', descRu:'Каждый день целого месяца — ни одного пропуска.', descUk:'Отримуй досвід щодня одного календарного місяця.', secret:true },
  { id: 'night_week', icon:'🌙', category:'streak', xp:350, nameRu:'Ночная смена', nameUk:'Нічна зміна', descRu:'7 дней подряд получай опыт ночью: с 23:00 до 5:00.', descUk:'7 днів поспіль отримуй досвід уночі: з 23:00 до 5:00.', secret:true },
  { id: 'early_week', icon:'🌅', category:'streak', xp:300, nameRu:'Ранний режим', nameUk:'Ранній режим', descRu:'7 дней подряд получай опыт утром: с 5:00 до 7:00.', descUk:'7 днів поспіль отримуй досвід уранці: з 5:00 до 7:00.', secret:true },

  { id: 'lesson_all_2x', icon:'🔁', category:'lessons', xp:700, nameRu:'Второй круг', nameUk:'Друге коло', descRu:'Все 32 урока завершены минимум по 2 раза.', descUk:'Усі 32 уроки завершено мінімум по 2 рази.' },
  { id: 'lesson_all_3x', icon:'🔂', category:'lessons', xp:1000, nameRu:'Тройной курс', nameUk:'Потрійний курс', descRu:'Все 32 урока завершены минимум по 3 раза.', descUk:'Усі 32 уроки завершено мінімум по 3 рази.', secret:true },
  { id: 'lesson_all_5x', icon:'♾️', category:'lessons', xp:1800, nameRu:'Пятый круг', nameUk:'П’яте коло', descRu:'Все 32 урока завершены минимум по 5 раз.', descUk:'Усі 32 уроки завершено мінімум по 5 разів.', secret:true },
  { id: 'lesson_perfect10', icon:'💯', category:'lessons', xp:400, nameRu:'Десять идеальных', nameUk:'Десять ідеальних', descRu:'10 разных уроков — и ни одной ошибки в каждом.', descUk:'10 різних уроків без жодної помилки в прогресі.' },
  { id: 'lesson_b2_perfect', icon:'🎓', category:'lessons', xp:500, nameRu:'B2 без ошибок', nameUk:'B2 без помилок', descRu:'Уроки 29–32 пройдены идеально — ни единой ошибки.', descUk:'Уроки 29–32 ідеально: без «помилка» в кожному.', secret:true },
  { id: 'lesson_marathon_day', icon:'🏁', category:'lessons', xp:700, nameRu:'Учебный марафон', nameUk:'Навчальний марафон', descRu:'За один день заверши 10 разных уроков с зачётом.', descUk:'За один день заверши 10 різних уроків із зарахунком.', secret:true },
  { id: 'lesson_all_perfect_2x', icon:'🌟', category:'lessons', xp:2500, nameRu:'Абсолют II', nameUk:'Абсолют II', descRu:'Все 32 урока пройдены идеально минимум по 2 раза.', descUk:'Усі 32 уроки пройдено ідеально мінімум по 2 рази.', secret:true },

  { id: 'xp_150000', icon:'⚡', category:'xp', xp:1200, nameRu:'150К опыта', nameUk:'150К досвіду', descRu:'150 000 XP. Ты в топе тех, кто не бросил.', descUk:'Накопич 150 000 XP загалом.', secret:true },
  { id: 'xp_250000', icon:'🚀', category:'xp', xp:1800, nameRu:'Четверть миллиона', nameUk:'Чверть мільйона', descRu:'250 000 XP. Четверть миллиона — это редкость.', descUk:'Накопич 250 000 XP загалом.', secret:true },
  { id: 'xp_500000', icon:'💎', category:'xp', xp:3000, nameRu:'Полмиллиона', nameUk:'Пів мільйона', descRu:'500 000 XP. Полмиллиона — и ты всё ещё здесь.', descUk:'Накопич 500 000 XP загалом.', secret:true },
  { id: 'xp_750000', icon:'🏆', category:'xp', xp:4200, nameRu:'Три четверти', nameUk:'Три чверті', descRu:'750 000 XP. Три четверти пути к миллиону.', descUk:'Накопич 750 000 XP загалом.', secret:true },
  { id: 'xp_1000000', icon:'👑', category:'xp', xp:6000, nameRu:'Миллионер опыта', nameUk:'Мільйонер досвіду', descRu:'Миллион XP. Это не просто цифра — это история.', descUk:'Накопич 1 000 000 XP загалом.', secret:true },
  { id: 'xp_2000000', icon:'♾️', category:'xp', xp:9000, nameRu:'Два миллиона', nameUk:'Два мільйони', descRu:'Два миллиона XP. Слов нет — только уважение.', descUk:'Накопич 2 000 000 XP загалом.', secret:true },
  { id: 'weekly_xp_5000', icon:'📈', category:'xp', xp:400, nameRu:'Неделя на 5К', nameUk:'Тиждень на 5К', descRu:'Набери 5 000 XP за одну календарную неделю.', descUk:'Набери 5 000 XP за один календарний тиждень.', secret:true },
  { id: 'weekly_xp_10000', icon:'🔥', category:'xp', xp:900, nameRu:'Неделя мясорубки', nameUk:'Тиждень м’ясорубки', descRu:'Набери 10 000 XP за одну календарную неделю.', descUk:'Набери 10 000 XP за один календарний тиждень.', secret:true },
  { id: 'wager_win_10', icon:'🎲', category:'xp', xp:600, nameRu:'Холодная рука', nameUk:'Холодна рука', descRu:'Выиграй 10 пари на свою серию суммарно.', descUk:'Виграй 10 парі на свою серію загалом.', secret:true },

  { id: 'combo_150', icon:'⚡', category:'combo', xp:800, nameRu:'150 подряд', nameUk:'150 поспіль', descRu:'150 верных ответов подряд в одной серии.', descUk:'150 правильних відповідей поспіль в одній серії.', secret:true },
  { id: 'combo_250', icon:'🧠', category:'combo', xp:1200, nameRu:'Нечеловеческий ритм', nameUk:'Нелюдський ритм', descRu:'250 верных ответов подряд в одной серии.', descUk:'250 правильних відповідей поспіль в одній серії.', secret:true },
  { id: 'combo_500', icon:'☢️', category:'combo', xp:2500, nameRu:'Ошибка запрещена', nameUk:'Помилка заборонена', descRu:'500 верных ответов подряд в одной серии.', descUk:'500 правильних відповідей поспіль в одній серії.', secret:true },
  { id: 'daily_all_14', icon:'📌', category:'combo', xp:600, nameRu:'Две недели порядка', nameUk:'Два тижні порядку', descRu:'14 дней подряд закрывай все ежедневные задания.', descUk:'14 днів поспіль закривай усі щоденні завдання.', secret:true },
  { id: 'daily_all_30', icon:'🗓️', category:'combo', xp:1200, nameRu:'30 дней без хвостов', nameUk:'30 днів без хвостів', descRu:'30 дней подряд закрывай все ежедневные задания.', descUk:'30 днів поспіль закривай усі щоденні завдання.', secret:true },
  { id: 'daily_no_reroll_7', icon:'🎯', category:'combo', xp:450, nameRu:'Неделя без замен', nameUk:'Тиждень без замін', descRu:'7 дней подряд закрой все задания без замен.', descUk:'7 днів поспіль закрий усі завдання без замін.', secret:true },
  { id: 'daily_no_reroll_30', icon:'🏆', category:'combo', xp:1400, nameRu:'Без торга', nameUk:'Без торгу', descRu:'30 дней подряд закрой все задания без замен.', descUk:'30 днів поспіль закрий усі завдання без замін.', secret:true },
  { id: 'daily_phrase_read_30', icon:'💬', category:'combo', xp:250, nameRu:'30 фраз дня', nameUk:'30 фраз дня', descRu:'Открой и прочитай 30 фраз дня.', descUk:'Відкрий і прочитай 30 фраз дня.' },
  { id: 'daily_phrase_save_30', icon:'🗂️', category:'combo', xp:350, nameRu:'Фразы в запасе', nameUk:'Фрази в запасі', descRu:'Сохрани 30 фраз дня в карточки.', descUk:'Збережи 30 фраз дня в картки.', secret:true },
  { id: 'daily_phrase_save_100', icon:'🗃️', category:'combo', xp:900, nameRu:'Сто фраз в копилке', nameUk:'Сто фраз у скарбничці', descRu:'Сохрани 100 фраз дня в карточки.', descUk:'Збережи 100 фраз дня в картки.', secret:true },

  { id: 'login_100', icon:'📆', category:'special', xp:500, nameRu:'100 входов подряд', nameUk:'100 входів поспіль', descRu:'100 дней подряд открывай приложение.', descUk:'100 днів поспіль відкривай додаток.', secret:true },
  { id: 'login_200', icon:'🗓️', category:'special', xp:850, nameRu:'200 входов подряд', nameUk:'200 входів поспіль', descRu:'200 дней подряд открывай приложение.', descUk:'200 днів поспіль відкривай додаток.', secret:true },
  { id: 'exam_ace_5', icon:'🎓', category:'special', xp:400, nameRu:'Пять отличных экзаменов', nameUk:'П’ять відмінних іспитів', descRu:'5 раз набери не менее 90% на экзамене.', descUk:'5 разів набери не менш як 90% на іспиті.', secret:true },
  { id: 'exam_ace_10', icon:'🏆', category:'special', xp:800, nameRu:'Десять отличных', nameUk:'Десять відмінних', descRu:'10 раз набери не менее 90% на экзамене.', descUk:'10 разів набери не менш як 90% на іспиті.', secret:true },
  { id: 'flashcards_save_100', icon:'🗃️', category:'special', xp:500, nameRu:'100 карточек', nameUk:'100 карток', descRu:'Сохрани 100 карточек в коллекцию.', descUk:'Збережи 100 карток у колекцію.', secret:true },
  { id: 'flashcards_save_250', icon:'📚', category:'special', xp:1000, nameRu:'Большой архив', nameUk:'Великий архів', descRu:'Сохрани 250 карточек в коллекцию.', descUk:'Збережи 250 карток у колекцію.', secret:true },
  { id: 'flashcards_flip_500', icon:'🔄', category:'special', xp:650, nameRu:'500 переворотов', nameUk:'500 переворотів', descRu:'Переверни карточки 500 раз при повторении.', descUk:'Переверни картки 500 разів під час повторення.', secret:true },
  { id: 'flashcards_flip_1000', icon:'♾️', category:'special', xp:1200, nameRu:'Тысяча переворотов', nameUk:'Тисяча переворотів', descRu:'Переверни карточки 1000 раз при повторении.', descUk:'Переверни картки 1000 разів під час повторення.', secret:true },
  { id: 'flashcards_view_14_days', icon:'📆', category:'special', xp:500, nameRu:'Две карточные недели', nameUk:'Два карткові тижні', descRu:'14 дней подряд просматривай карточки в коллекции.', descUk:'14 днів поспіль переглядай картки в колекції.', secret:true },
  { id: 'flashcards_view_30_days', icon:'🗓️', category:'special', xp:1000, nameRu:'Карточный месяц', nameUk:'Картковий місяць', descRu:'30 дней подряд просматривай карточки в коллекции.', descUk:'30 днів поспіль переглядай картки в колекції.', secret:true },
  { id: 'shards_250', icon:'💎', category:'special', xp:500, nameRu:'250 жемчужин', nameUk:'250 перлин', descRu:'Доведи баланс до 250 жемчужин.', descUk:'Доведи баланс до 250 перлин.', secret:true },
  { id: 'shards_500', icon:'💎', category:'special', xp:900, nameRu:'500 жемчужин', nameUk:'500 перлин', descRu:'Доведи баланс до 500 жемчужин.', descUk:'Доведи баланс до 500 перлин.', secret:true },
  { id: 'shards_1000', icon:'💎', category:'special', xp:1800, nameRu:'Тысяча жемчужин', nameUk:'Тисяча перлин', descRu:'Доведи баланс до 1000 жемчужин.', descUk:'Доведи баланс до 1000 перлин.', secret:true },
  { id: 'shards_spent_500', icon:'💠', category:'special', xp:800, nameRu:'500 жемчужин в дело', nameUk:'500 перлин у діло', descRu:'Потрать суммарно 500 жемчужин.', descUk:'Витрать загалом 500 перлин.', secret:true },
  { id: 'shards_spent_1000', icon:'💠', category:'special', xp:1500, nameRu:'Большой оборот', nameUk:'Великий обіг', descRu:'Потрать суммарно 1000 жемчужин.', descUk:'Витрать загалом 1000 перлин.', secret:true },
  { id: 'energy_refill_10', icon:'🔋', category:'special', xp:400, nameRu:'10 зарядок', nameUk:'10 зарядок', descRu:'10 раз восстанови энергию за жемчужины.', descUk:'10 разів віднови енергію за перлини.', secret:true },
  { id: 'energy_refill_25', icon:'⚡', category:'special', xp:900, nameRu:'25 зарядок', nameUk:'25 зарядок', descRu:'25 раз восстанови энергию за жемчужины.', descUk:'25 разів віднови енергію за перлини.', secret:true },
  { id: 'league_top3_5', icon:'🥉', category:'special', xp:500, nameRu:'Пять недель в топ-3', nameUk:'П’ять тижнів у топ-3', descRu:'5 раз заверши неделю в топ-3 своей лиги.', descUk:'5 разів заверши тиждень у топ-3 своєї ліги.', secret:true },
  { id: 'league_champion_5', icon:'👑', category:'special', xp:850, nameRu:'Пять чемпионств', nameUk:'П’ять чемпіонств', descRu:'5 раз заверши неделю первым в группе лиги.', descUk:'5 разів заверши тиждень першим у групі ліги.', secret:true },
  { id: 'league_champion_10', icon:'🏆', category:'special', xp:1600, nameRu:'Десять чемпионств', nameUk:'Десять чемпіонств', descRu:'10 раз заверши неделю первым в группе лиги.', descUk:'10 разів заверши тиждень першим у групі ліги.', secret:true },
  { id: 'league_diamond_4_weeks', icon:'💎', category:'special', xp:1000, nameRu:'Месяц в Алмазе', nameUk:'Місяць у Діаманті', descRu:'4 недельных результата подряд получи в Алмазной лиге или выше.', descUk:'4 тижневі результати поспіль отримай у Діамантовій лізі або вище.', secret:true },
  { id: 'social_friends_25', icon:'🌐', category:'special', xp:450, nameRu:'25 друзей', nameUk:'25 друзів', descRu:'25 друзей. Phraseman стал общим делом.', descUk:'25 друзів у списку.', secret:true },
  { id: 'social_friends_50', icon:'🌍', category:'special', xp:900, nameRu:'50 друзей', nameUk:'50 друзів', descRu:'50 друзей. Ты строишь настоящее сообщество.', descUk:'50 друзів у списку.', secret:true },
  { id: 'social_gift_25', icon:'🎁', category:'special', xp:550, nameRu:'25 подарков', nameUk:'25 подарунків', descRu:'Отправь 25 подарков друзьям.', descUk:'Надішли 25 подарунків друзям.', secret:true },
  { id: 'social_gift_100', icon:'💝', category:'special', xp:1500, nameRu:'100 подарков', nameUk:'100 подарунків', descRu:'Отправь 100 подарков друзьям.', descUk:'Надішли 100 подарунків друзям.', secret:true },
  { id: 'social_likes_25', icon:'❤️', category:'special', xp:450, nameRu:'25 лайков', nameUk:'25 лайків', descRu:'Получи 25 лайков от друзей на свои достижения.', descUk:'Отримай 25 лайків від друзів на свої досягнення.', secret:true },
  { id: 'social_likes_100', icon:'💗', category:'special', xp:1200, nameRu:'100 лайков', nameUk:'100 лайків', descRu:'Получи 100 лайков от друзей на свои достижения.', descUk:'Отримай 100 лайків від друзів на свої досягнення.', secret:true },
  { id: 'trainer_1000_correct', icon:'🧠', category:'special', xp:1000, nameRu:'1000 точных', nameUk:'1000 точних', descRu:'1000 правильных ответов в тренировках. Память уже не та — она лучше.', descUk:'1000 правильних відповідей загалом у тренуваннях.', secret:true },
  { id: 'trainer_2500_correct', icon:'🏋️', category:'special', xp:1800, nameRu:'2500 точных', nameUk:'2500 точних', descRu:'2500 правильных ответов. Эти слова уже часть тебя.', descUk:'2500 правильних відповідей загалом у тренуваннях.', secret:true },
  { id: 'trainer_10000_correct', icon:'👑', category:'special', xp:4500, nameRu:'10000 точных', nameUk:'10000 точних', descRu:'10 000 правильных ответов в тренировках. Это уже энциклопедия.', descUk:'10000 правильних відповідей загалом у тренуваннях.', secret:true },
  { id: 'trainer_perfect_10_sessions', icon:'💯', category:'special', xp:600, nameRu:'10 чистых тренировок', nameUk:'10 чистих тренувань', descRu:'10 раз заверши тренировку из 5+ вопросов без ошибки.', descUk:'10 разів заверши тренування з 5+ питань без помилки.', secret:true },
  { id: 'trainer_perfect_50_sessions', icon:'🏆', category:'special', xp:1600, nameRu:'50 чистых тренировок', nameUk:'50 чистих тренувань', descRu:'50 раз заверши тренировку из 5+ вопросов без ошибки.', descUk:'50 разів заверши тренування з 5+ питань без помилки.', secret:true },
  { id: 'pack_10_purchased', icon:'📚', category:'special', xp:450, nameRu:'10 наборов', nameUk:'10 наборів', descRu:'10 наборов карточек в коллекции.', descUk:'10 наборів карток у колекції.', secret:true },
  { id: 'pack_25_purchased', icon:'📦', category:'special', xp:1000, nameRu:'25 наборов', nameUk:'25 наборів', descRu:'25 наборов карточек в коллекции.', descUk:'25 наборів карток у колекції.', secret:true },
  { id: 'share_achievement_10', icon:'📣', category:'special', xp:250, nameRu:'10 громких побед', nameUk:'10 гучних перемог', descRu:'Поделись 10 разблокированными достижениями.', descUk:'Поділись 10 розблокованими досягненнями.', secret:true },

  { id: 'gem_a1_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'A1 обсидиан', nameUk:'A1 обсидіан', descRu:'Уроки 1–8: каждый завершён минимум 7 раз.', descUk:'Уроки 1–8: кожен завершено мінімум 7 разів.', secret:true },
  { id: 'gem_a1_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'A1 мифик', nameUk:'A1 міфік', descRu:'Уроки 1–8: каждый завершён минимум 10 раз.', descUk:'Уроки 1–8: кожен завершено мінімум 10 разів.', secret:true },
  { id: 'gem_a2_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'A2 обсидиан', nameUk:'A2 обсидіан', descRu:'Уроки 9–18: каждый завершён минимум 7 раз.', descUk:'Уроки 9–18: кожен завершено мінімум 7 разів.', secret:true },
  { id: 'gem_a2_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'A2 мифик', nameUk:'A2 міфік', descRu:'Уроки 9–18: каждый завершён минимум 10 раз.', descUk:'Уроки 9–18: кожен завершено мінімум 10 разів.', secret:true },
  { id: 'gem_b1_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'B1 обсидиан', nameUk:'B1 обсидіан', descRu:'Уроки 19–28: каждый завершён минимум 7 раз.', descUk:'Уроки 19–28: кожен завершено мінімум 7 разів.', secret:true },
  { id: 'gem_b1_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'B1 мифик', nameUk:'B1 міфік', descRu:'Уроки 19–28: каждый завершён минимум 10 раз.', descUk:'Уроки 19–28: кожен завершено мінімум 10 разів.', secret:true },
  { id: 'gem_b2_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'B2 обсидиан', nameUk:'B2 обсидіан', descRu:'Уроки 29–32: каждый завершён минимум 7 раз.', descUk:'Уроки 29–32: кожен завершено мінімум 7 разів.', secret:true },
  { id: 'gem_b2_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'B2 мифик', nameUk:'B2 міфік', descRu:'Уроки 29–32: каждый завершён минимум 10 раз.', descUk:'Уроки 29–32: кожен завершено мінімум 10 разів.', secret:true },
  { id: 'gem_all_obsidian', icon:'🏆', category:'medal', xp:2200, nameRu:'Все обсидианы', nameUk:'Усі обсидіани', descRu:'Собери обсидиановую медаль по A1, A2, B1 и B2.', descUk:'Збери обсидіанову медаль за A1, A2, B1 і B2.', secret:true },
  { id: 'gem_all_mythic', icon:'👑', category:'medal', xp:4000, nameRu:'Все мифики', nameUk:'Усі міфіки', descRu:'Собери мифическую медаль по A1, A2, B1 и B2.', descUk:'Збери міфічну медаль за A1, A2, B1 і B2.', secret:true },
];

export const isRetiredQuizArenaAchievement = (achievement: Pick<Achievement, 'id'>): boolean =>
  achievement.id.startsWith('quiz_') || achievement.id.startsWith('arena_');

export const ALL_ACHIEVEMENTS: Achievement[] = ACHIEVEMENTS_WITH_RETIRED_FEATURES.filter(
  (achievement) => !isRetiredQuizArenaAchievement(achievement),
);

// AsyncStorage

const STORAGE_KEY = 'achievements_v1';
/** Одноразовая миграция: сброс shardClaimed у уже открытых (старые версии могли оставить true по ошибке). */
const SHARD_REOPEN_INTEGRITY_KEY = 'achievements_shard_reopen_mis_migrated_v1';

const ACHIEVEMENT_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

const isTargetAchievement = (id: string): boolean => {
  const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) return false;
  if (achievement.category === 'lessons' || achievement.category === 'quiz' || achievement.category === 'medal') return true;
  return (
    id.startsWith('lesson_') ||
    id.startsWith('gem_') ||
    id.startsWith('quiz_') ||
    id.startsWith('combo_') ||
    id.startsWith('exam_') ||
    id.startsWith('flashcards_') ||
    id.startsWith('recall_') ||
    id.startsWith('trainer_') ||
    id.startsWith('daily_phrase') ||
    id.startsWith('daily_task') ||
    id.startsWith('daily_all') ||
    id.startsWith('daily_no_reroll') ||
    id.startsWith('pack_') ||
    id.startsWith('share_achievement') ||
    id === 'all_daily' ||
    id === 'diagnosis'
  );
};

const normalizeAchievementState = (s: AchievementState): AchievementState => ({
  ...s,
  notified: s.notified ?? false,
  shardClaimed: s.unlockedAt === null ? true : (s.shardClaimed === undefined ? false : s.shardClaimed),
});

const commitAchievementStoragePairs = async (
  pairs: readonly (readonly [string, string])[],
  accountToken: AccountGenerationToken,
): Promise<boolean> => withAccountTransitionLock(async () => {
  if (!isCurrentAccountGeneration(accountToken)) return false;
  return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return false;
    for (const [key, value] of pairs) {
      if (!isCurrentAccountGeneration(accountToken)) return false;
      await AsyncStorage.setItem(key, value);
      if (!isCurrentAccountGeneration(accountToken)) return false;
    }
    return true;
  });
});

const loadAchievementStatesFromKey = async (
  key: string,
  ids: Set<string> = new Set(ALL_ACHIEVEMENTS.map(a => a.id)),
  accountToken: AccountGenerationToken,
  persistMigrations = true,
): Promise<AchievementState[]> => {
  try {
    if (!isCurrentAccountGeneration(accountToken)) return [];
    const raw = await AsyncStorage.getItem(key);
    if (!isCurrentAccountGeneration(accountToken)) return [];
    if (raw) {
      const parsed: AchievementState[] = JSON.parse(raw);
      let normalizedDirty = false;
      const normalized = parsed.map(s => {
        const n = normalizeAchievementState(s);
        if (n.notified !== s.notified || n.shardClaimed !== s.shardClaimed) normalizedDirty = true;
        return n;
      });
      let next = normalized.filter(s => ids.has(s.id));
      const hadObsolete = next.length !== normalized.length;
      const knownIds = new Set(next.map(s => s.id));
      let addedNew = false;
      for (const a of ALL_ACHIEVEMENTS) {
        if (!ids.has(a.id)) continue;
        if (!knownIds.has(a.id)) {
          next.push({ id: a.id, unlockedAt: null, notified: false, shardClaimed: true });
          knownIds.add(a.id);
          addedNew = true;
        }
      }
      let shouldWrite = hadObsolete || addedNew || normalizedDirty;
      const integrity = await AsyncStorage.getItem(`${SHARD_REOPEN_INTEGRITY_KEY}:${key}`);
      if (!isCurrentAccountGeneration(accountToken)) return [];
      const writes: Array<readonly [string, string]> = [];
      if (integrity !== '1') {
        for (const s of next) {
          if (s.unlockedAt !== null) {
            s.shardClaimed = false;
          }
        }
        shouldWrite = true;
        writes.push([`${SHARD_REOPEN_INTEGRITY_KEY}:${key}`, '1']);
      }
      if (shouldWrite) {
        writes.push([key, JSON.stringify(next)]);
      }
      if (persistMigrations && writes.length > 0) {
        const committed = await commitAchievementStoragePairs(writes, accountToken);
        if (!committed) return [];
      }
      return next;
    }
    const initial: AchievementState[] = ALL_ACHIEVEMENTS
      .filter(a => ids.has(a.id))
      .map(a => ({ id: a.id, unlockedAt: null, notified: false, shardClaimed: true }));
    if (!isCurrentAccountGeneration(accountToken)) return [];
    if (persistMigrations) {
      const committed = await commitAchievementStoragePairs([[key, JSON.stringify(initial)]], accountToken);
      if (!committed) return [];
    }
    return initial;
  } catch { return []; }
};

const targetAchievementIds = (): Set<string> =>
  new Set(ALL_ACHIEVEMENTS.filter(a => isTargetAchievement(a.id)).map(a => a.id));

const globalAchievementIds = (): Set<string> =>
  new Set(ALL_ACHIEVEMENTS.filter(a => !isTargetAchievement(a.id)).map(a => a.id));

const loadAchievementStatesForTargetInternal = async (
  studyTarget: RuntimeStudyTarget | undefined,
  accountToken: AccountGenerationToken,
  persistMigrations: boolean,
): Promise<AchievementState[]> => {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    const [globalStates, targetStates] = await Promise.all([
      loadAchievementStatesFromKey(STORAGE_KEY, globalAchievementIds(), accountToken, persistMigrations),
      loadAchievementStatesFromKey(
        achievementStateKey('fr'),
        targetAchievementIds(),
        accountToken,
        persistMigrations,
      ),
    ]);
    if (!isCurrentAccountGeneration(accountToken)) return [];
    return [...globalStates, ...targetStates];
  }
  return loadAchievementStatesFromKey(STORAGE_KEY, undefined, accountToken, persistMigrations);
};

export const loadAchievementStatesForTarget = async (
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
): Promise<AchievementState[]> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return [];
  return enqueueAchievementOperation(
    operationToken,
    () => loadAchievementStatesForTargetInternal(studyTarget, operationToken, true),
    [],
  );
};

const loadAchievementStatesInternal = async (
  accountToken: AccountGenerationToken,
  persistMigrations: boolean,
): Promise<AchievementState[]> => {
  const [legacyStates, frenchStates] = await Promise.all([
    loadAchievementStatesFromKey(STORAGE_KEY, undefined, accountToken, persistMigrations),
    loadAchievementStatesFromKey(
      achievementStateKey('fr'),
      targetAchievementIds(),
      accountToken,
      persistMigrations,
    ),
  ]);
  if (!isCurrentAccountGeneration(accountToken)) return [];
  const byId = new Map<string, AchievementState>();
  for (const state of legacyStates) byId.set(state.id, state);
  for (const state of frenchStates) {
    const existing = byId.get(state.id);
    if (!existing || (existing.unlockedAt === null && state.unlockedAt !== null)) {
      byId.set(state.id, state);
    } else if (existing.unlockedAt !== null && state.unlockedAt !== null) {
      byId.set(state.id, {
        ...existing,
        notified: existing.notified && state.notified,
        shardClaimed: existing.shardClaimed && state.shardClaimed,
      });
    }
  }
  return ALL_ACHIEVEMENTS.map(a => byId.get(a.id)).filter(Boolean) as AchievementState[];
};

export const loadAchievementStates = async (
  accountToken?: AccountGenerationToken,
): Promise<AchievementState[]> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return [];
  return enqueueAchievementOperation(
    operationToken,
    () => loadAchievementStatesInternal(operationToken, true),
    [],
  );
};

const achievementStatePairs = (
  states: AchievementState[],
  studyTarget?: RuntimeStudyTarget,
): Array<readonly [string, string]> => {
  const target = storageStudyTarget(studyTarget);
  const targetIds = targetAchievementIds();
  if (target === 'fr') {
    return [
      [STORAGE_KEY, JSON.stringify(states.filter(s => !targetIds.has(s.id)))],
      [achievementStateKey('fr'), JSON.stringify(states.filter(s => targetIds.has(s.id)))],
    ];
  }
  return [[STORAGE_KEY, JSON.stringify(states)]];
};

const saveStates = async (
  states: AchievementState[],
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
): Promise<boolean> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return false;
  return commitAchievementStoragePairs(achievementStatePairs(states, studyTarget), operationToken);
};

const unlockOne = (states: AchievementState[], id: string): boolean => {
  const existing = states.find(s => s.id === id);
  if (existing) {
    if (existing.unlockedAt !== null) return false;
    existing.unlockedAt = new Date().toISOString();
    existing.shardClaimed = false;
    return true;
  }
  states.push({ id, unlockedAt: new Date().toISOString(), notified: false, shardClaimed: false });
  return true;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const localDayKey = (date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const localMonthKey = (date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const daysInLocalMonth = (date = new Date()): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const localWeekKey = (date = new Date()): string => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return localDayKey(start);
};

const shiftLocalDayKey = (key: string, days: number): string => {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDayKey(date);
};

const bumpStoredCounter = async (
  key: string,
  amount: number,
  accountToken: AccountGenerationToken,
): Promise<number> => {
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const add = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (add <= 0) return parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
  const cur = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const next = cur + add;
  return await commitAchievementStoragePairs([[key, String(next)]], accountToken) ? next : 0;
};

const bumpConsecutiveDayStreak = async (key: string, accountToken: AccountGenerationToken): Promise<number> => {
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const today = localDayKey();
  let prev: { lastDay?: string; streak?: number } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  if (prev.lastDay === today) return Math.max(1, Math.floor(prev.streak ?? 1));
  const yesterday = shiftLocalDayKey(today, -1);
  const nextStreak = prev.lastDay === yesterday
    ? Math.max(0, Math.floor(prev.streak ?? 0)) + 1
    : 1;
  return await commitAchievementStoragePairs(
    [[key, JSON.stringify({ lastDay: today, streak: nextStreak })]],
    accountToken,
  ) ? nextStreak : 0;
};

const bumpConsecutiveWeekStreak = async (key: string, accountToken: AccountGenerationToken): Promise<number> => {
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const week = localWeekKey();
  let prev: { lastWeek?: string; streak?: number } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  if (prev.lastWeek === week) return Math.max(1, Math.floor(prev.streak ?? 1));
  const previousWeek = localWeekKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 7));
  const nextStreak = prev.lastWeek === previousWeek
    ? Math.max(0, Math.floor(prev.streak ?? 0)) + 1
    : 1;
  return await commitAchievementStoragePairs(
    [[key, JSON.stringify({ lastWeek: week, streak: nextStreak })]],
    accountToken,
  ) ? nextStreak : 0;
};

const readConsecutiveDayStreakValue = async (key: string): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return Math.max(0, Math.floor(parsed?.streak ?? 0));
  } catch { return 0; }
};

const bumpMonthlyActivityDays = async (
  key: string,
  accountToken: AccountGenerationToken,
): Promise<{ monthKey: string; count: number; daysInMonth: number; isLastDay: boolean }> => {
  const now = new Date();
  const monthKey = localMonthKey(now);
  const today = localDayKey(now);
  const daysInMonth = daysInLocalMonth(now);
  let prev: { monthKey?: string; days?: string[] } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  if (!isCurrentAccountGeneration(accountToken)) return { monthKey, count: 0, daysInMonth, isLastDay: false };
  const days = prev.monthKey === monthKey && Array.isArray(prev.days)
    ? prev.days.filter((x): x is string => typeof x === 'string')
    : [];
  if (!days.includes(today)) days.push(today);
  const committed = await commitAchievementStoragePairs([[key, JSON.stringify({ monthKey, days })]], accountToken);
  if (!committed) return { monthKey, count: 0, daysInMonth, isLastDay: false };
  return { monthKey, count: days.length, daysInMonth, isLastDay: now.getDate() === daysInMonth };
};

const addStoredSetValue = async (
  key: string,
  value: string,
  accountToken: AccountGenerationToken,
): Promise<number> => {
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const normalized = value.trim();
  if (!normalized) {
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed = JSON.parse(raw ?? '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    }
    catch { return 0; }
  }
  let values: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    values = Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch {
    values = [];
  }
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  if (!values.includes(normalized)) {
    values.push(normalized);
    if (!await commitAchievementStoragePairs([[key, JSON.stringify(values)]], accountToken)) return 0;
  }
  return values.length;
};

const ACHIEVEMENT_BACKFILL_KEY = 'achievements_progress_backfill_v3';

// зачем: ставки на свою серию живы (xp_manager.ts), а Арена удалена — счётчик
// побед по ставкам копится на живом событии 'wager_win' под этим ключом
// (см. case 'wager_win'); старый achievement_arena_wager_win_count остаётся
// только для обратной совместимости при восстановлении.
const WAGER_WIN_COUNT_KEY = 'achievement_wager_win_count';

const readStoredCounter = async (key: string): Promise<number> =>
  parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;

// зачем: readQuizAchievementCounterAcrossTargets и bumpQuizAchievementCounter
// удалены вместе с достижениями викторин — счётчики achievement_quiz_* больше
// никто не читает и не увеличивает.

const setStoredCounterAtLeast = async (
  key: string,
  value: number,
  accountToken: AccountGenerationToken,
): Promise<number> => {
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const cur = await readStoredCounter(key);
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  if (safe > cur) {
    return await commitAchievementStoragePairs([[key, String(safe)]], accountToken) ? safe : 0;
  }
  return cur;
};

const readStoredNumberSet = async (key: string): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(x => Math.floor(Number(x))).filter(x => Number.isFinite(x) && x > 0)
      : [];
  } catch { return []; }
};

const addStoredNumberSetValue = async (
  key: string,
  value: number,
  accountToken: AccountGenerationToken,
): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const values = await readStoredNumberSet(key);
  if (!isCurrentAccountGeneration(accountToken)) return 0;
  if (safe > 0 && !values.includes(safe)) {
    values.push(safe);
    if (!await commitAchievementStoragePairs([[key, JSON.stringify(values)]], accountToken)) return 0;
  }
  return values.length;
};

const readStoredStringList = async (key: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const readStoredObjectList = async (key: string): Promise<Array<Record<string, unknown>>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      : [];
  } catch {
    return [];
  }
};

const ACHIEVEMENT_PROGRESS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

const achievementProgressTargetsForEvent = (studyTarget?: RuntimeStudyTarget): readonly RuntimeStudyTarget[] => {
  if (studyTarget === null || studyTarget === undefined) return ACHIEVEMENT_PROGRESS_TARGETS;
  return storageStudyTarget(studyTarget) === 'fr' ? ['fr'] : ['en'];
};

const readStoredObjectLists = async (keys: readonly string[]): Promise<Array<Record<string, unknown>>> => {
  const lists = await Promise.all(keys.map(readStoredObjectList));
  return lists.flat();
};

const readStoredStringLists = async (keys: readonly string[]): Promise<string[]> => {
  const lists = await Promise.all(keys.map(readStoredStringList));
  return lists.flat();
};

const COURSE_ACHIEVEMENT_RANGES: Record<string, [number, number]> = {
  a1: [1, 8],
  a2: [9, 18],
  b1: [19, 28],
  b2: [29, 32],
};

const readLessonPassCounts = async (): Promise<number[]> => {
  const lessonIds = Array.from({ length: 32 }, (_, i) => i + 1);
  const keys = lessonIds.flatMap(lessonId =>
    ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget => lessonPassCountKey(lessonId, studyTarget)),
  );
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const map = Object.fromEntries(pairs);
    return lessonIds.map(lessonId => Math.max(
      ...ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget =>
        Math.max(0, parseInt(map[lessonPassCountKey(lessonId, studyTarget)] ?? '0', 10) || 0),
      ),
    ));
  } catch {
    return Array.from({ length: 32 }, () => 0);
  }
};

const countPerfectLessonsInRange = async (from: number, to: number): Promise<number> => {
  const lessonIds = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const keys = lessonIds.flatMap(lessonId =>
    ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget => lessonProgressKey(lessonId, studyTarget)),
  );
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const map = Object.fromEntries(pairs);
    let count = 0;
    for (const lessonId of lessonIds) {
      const perfectForAnyTarget = ACHIEVEMENT_PROGRESS_TARGETS.some(studyTarget => {
        const raw = map[lessonProgressKey(lessonId, studyTarget)];
        if (!raw) return false;
        try {
          const p: string[] = JSON.parse(raw);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          const wrong = p.filter(x => x === 'wrong').length;
          return correct >= 45 && wrong === 0;
        } catch {
          return false;
        }
      });
      if (perfectForAnyTarget) count++;
    }
    return count;
  } catch { return 0; }
};

const readPerfectLessonPassCounts = async (): Promise<number[]> => {
  const lessonIds = Array.from({ length: 32 }, (_, i) => i + 1);
  const keys = lessonIds.flatMap(lessonId =>
    ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget =>
      achievementLessonPerfectPassesKey(lessonId, studyTarget),
    ),
  );
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const map = Object.fromEntries(pairs);
    return lessonIds.map(lessonId => Math.max(
      ...ACHIEVEMENT_PROGRESS_TARGETS.map(studyTarget => {
        const raw = map[achievementLessonPerfectPassesKey(lessonId, studyTarget)];
        try {
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch { return 0; }
      }),
    ));
  } catch {
    return Array.from({ length: 32 }, () => 0);
  }
};

const unlockLessonPassAchievements = async (unlock: (id: string) => void): Promise<void> => {
  const passCounts = await readLessonPassCounts();
  const countAtLeast = (n: number) => passCounts.filter(c => c >= n).length;
  if (countAtLeast(2) >= 32) unlock('lesson_all_2x');
  if (countAtLeast(3) >= 32) unlock('lesson_all_3x');
  if (countAtLeast(5) >= 32) unlock('lesson_all_5x');

  const obsidianLevels: string[] = [];
  const mythicLevels: string[] = [];
  for (const [level, [from, to]] of Object.entries(COURSE_ACHIEVEMENT_RANGES)) {
    const slice = passCounts.slice(from - 1, to);
    const minPasses = slice.length > 0 ? Math.min(...slice) : 0;
    if (minPasses >= 7) {
      unlock(`gem_${level}_obsidian`);
      obsidianLevels.push(level);
    }
    if (minPasses >= 10) {
      unlock(`gem_${level}_mythic`);
      mythicLevels.push(level);
    }
  }
  if (obsidianLevels.length >= 4) unlock('gem_all_obsidian');
  if (mythicLevels.length >= 4) unlock('gem_all_mythic');
};

const countCompletedLessonsAcrossAchievementTargets = async (): Promise<number> => {
  const passCounts = await readLessonPassCounts();
  return passCounts.filter(count => count >= 1).length;
};

const unlockWeeklyXpAchievements = async (unlock: (id: string) => void): Promise<void> => {
  const currentWeek = await readStoredCounter('week_points');
  const peak = await readStoredCounter('week_xp_peak_best_v1');
  const best = Math.max(currentWeek, peak);
  if (best >= 5000) unlock('weekly_xp_5000');
  if (best >= 10000) unlock('weekly_xp_10000');
};

const markStreakSafetyUsed = async (accountToken: AccountGenerationToken): Promise<void> => {
  const streak = await readStoredCounter('streak_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  await commitAchievementStoragePairs([['achievement_streak_safety_used_v1', JSON.stringify({
    streak,
    day: localDayKey(),
  })]], accountToken);
};

const backfillAchievementsFromLocalState = async (
  unlock: (id: string) => void,
  force = false,
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  if (!accountToken || !isCurrentAccountGeneration(accountToken)) return;
  if (!force && (await AsyncStorage.getItem(ACHIEVEMENT_BACKFILL_KEY)) === '1') return;
  if (!isCurrentAccountGeneration(accountToken)) return;

  const [trainerCorrect, legacyRecallCorrect] = await Promise.all([
    readStoredCounter(trainerAchievementCorrectCountKey(studyTarget)),
    readStoredCounter(activeRecallAchievementCorrectCountKey(studyTarget)),
  ]);
  if (!isCurrentAccountGeneration(accountToken)) return;
  const practiceCorrect = Math.max(trainerCorrect, legacyRecallCorrect);
  if (practiceCorrect > 0) {
    await Promise.all([
      setStoredCounterAtLeast(trainerAchievementCorrectCountKey(studyTarget), practiceCorrect, accountToken),
      setStoredCounterAtLeast(activeRecallAchievementCorrectCountKey(studyTarget), practiceCorrect, accountToken),
    ]);
    if (!isCurrentAccountGeneration(accountToken)) return;
    if (practiceCorrect >= 1) unlock('recall_first');
    if (practiceCorrect >= 50) unlock('recall_50');
    if (practiceCorrect >= 100) unlock('trainer_100_correct');
    if (practiceCorrect >= 500) unlock('trainer_500_correct');
    if (practiceCorrect >= 1000) unlock('trainer_1000_correct');
    if (practiceCorrect >= 2500) unlock('trainer_2500_correct');
    if (practiceCorrect >= 10000) unlock('trainer_10000_correct');
  }

  const eventTargets = achievementProgressTargetsForEvent(studyTarget);
  const savedCards = await readStoredObjectLists(eventTargets.map(flashcardsSavedKey));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (savedCards.length > 0) {
    await setStoredCounterAtLeast(flashcardsAchievementSavedCountKey(studyTarget), savedCards.length, accountToken);
    if (!isCurrentAccountGeneration(accountToken)) return;
    if (savedCards.length >= 25) unlock('flashcards_save_25');
    if (savedCards.length >= 50) unlock('flashcards_save_50');
    if (savedCards.length >= 100) unlock('flashcards_save_100');
    if (savedCards.length >= 250) unlock('flashcards_save_250');

    const sources = new Set<string>();
    for (const card of savedCards) {
      const source = typeof card.source === 'string' ? card.source : '';
      if (source) sources.add(source);
    }
    const sourceSetKey = flashcardsAchievementSourceSetKey(studyTarget);
    const storedSources = await readStoredStringList(sourceSetKey);
    if (!isCurrentAccountGeneration(accountToken)) return;
    storedSources.forEach(source => sources.add(source));
    if (sources.size > storedSources.length) {
      if (!await commitAchievementStoragePairs([[sourceSetKey, JSON.stringify([...sources])]], accountToken)) return;
    }
    if (sources.size >= 4) unlock('flashcards_sources_4');
  }

  const [officialPacks, legacyPacks, communityPacks] = await Promise.all([
    readStoredStringLists(eventTargets.map(flashcardsOwnedPacksKey)),
    readStoredStringLists(eventTargets.map(flashcardsMarketDevOwnedPacksKey)),
    readStoredStringLists(eventTargets.map(flashcardsCommunityOwnedPacksKey)),
  ]);
  if (!isCurrentAccountGeneration(accountToken)) return;
  const packCount = new Set([...officialPacks, ...legacyPacks, ...communityPacks]).size;
  if (packCount >= 1) unlock('pack_purchased');
  if (packCount >= 5) unlock('pack_5_purchased');
  if (packCount >= 10) unlock('pack_10_purchased');
  if (packCount >= 25) unlock('pack_25_purchased');

  const lifetimeSpent = await readStoredCounter('shards_lifetime_spent_v1');
  if (!isCurrentAccountGeneration(accountToken)) return;
  const achievementSpent = await setStoredCounterAtLeast('achievement_shards_spent_total', lifetimeSpent, accountToken);
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (achievementSpent >= 100) unlock('shards_spent_100');
  if (achievementSpent >= 500) unlock('shards_spent_500');
  if (achievementSpent >= 1000) unlock('shards_spent_1000');

  const totalXP = await readStoredCounter('user_total_xp');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (totalXP >= 100) unlock('xp_100');
  if (totalXP >= 250) unlock('xp_250');
  if (totalXP >= 500) unlock('xp_500');
  if (totalXP >= 1000) unlock('xp_1000');
  if (totalXP >= 2500) unlock('xp_2500');
  if (totalXP >= 5000) unlock('xp_5000');
  if (totalXP >= 10000) unlock('xp_10000');
  if (totalXP >= 20000) unlock('xp_20000');
  if (totalXP >= 50000) unlock('xp_50000');
  if (totalXP >= 75000) unlock('xp_75000');
  if (totalXP >= 100000) unlock('xp_100000');
  if (totalXP >= 150000) unlock('xp_150000');
  if (totalXP >= 250000) unlock('xp_250000');
  if (totalXP >= 500000) unlock('xp_500000');
  if (totalXP >= 750000) unlock('xp_750000');
  if (totalXP >= 1000000) unlock('xp_1000000');
  if (totalXP >= 2000000) unlock('xp_2000000');
  const level = getLevelFromXP(totalXP);
  if (level >= 50) unlock('level_50');

  await unlockWeeklyXpAchievements(unlock);
  if (!isCurrentAccountGeneration(accountToken)) return;
  await unlockLessonPassAchievements(unlock);
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (await countPerfectLessonsInRange(29, 32) >= 4) unlock('lesson_b2_perfect');
  if (!isCurrentAccountGeneration(accountToken)) return;
  const perfectPasses = await readPerfectLessonPassCounts();
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (perfectPasses.filter(count => count >= 2).length >= 32) unlock('lesson_all_perfect_2x');

  // зачем: достижения арены и викторин удалены вместе с самими фичами, поэтому
  // счётчики achievement_quiz_* / achievement_arena_win_count больше никем не
  // читаются — убраны 4 лишних обращения к AsyncStorage на каждый пересчёт.
  const comboBest = await readStoredCounter(comboAchievementCounterKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (comboBest >= 150) unlock('combo_150');
  if (comboBest >= 250) unlock('combo_250');
  if (comboBest >= 500) unlock('combo_500');

  const dailyAllStreak = await readConsecutiveDayStreakValue(dailyTasksAchievementAllDoneStreakKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (dailyAllStreak >= 3) unlock('daily_all_3');
  if (dailyAllStreak >= 7) unlock('daily_all_7');
  if (dailyAllStreak >= 14) unlock('daily_all_14');
  if (dailyAllStreak >= 30) unlock('daily_all_30');

  const noRerollStreak = await readConsecutiveDayStreakValue(dailyTasksAchievementNoRerollStreakKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (noRerollStreak >= 7) unlock('daily_no_reroll_7');
  if (noRerollStreak >= 30) unlock('daily_no_reroll_30');

  const phraseReads = await readStoredCounter(dailyPhraseAchievementReadCountKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (phraseReads >= 30) unlock('daily_phrase_read_30');
  const phraseSaves = await readStoredCounter(dailyPhraseAchievementSaveCountKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (phraseSaves >= 30) unlock('daily_phrase_save_30');
  if (phraseSaves >= 100) unlock('daily_phrase_save_100');

  const shards = await readStoredCounter('shards_balance');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (shards >= 100) unlock('shards_100');
  if (shards >= 250) unlock('shards_250');
  if (shards >= 500) unlock('shards_500');
  if (shards >= 1000) unlock('shards_1000');

  const flips = await readStoredCounter(flashcardsAchievementFlipCountKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (flips >= 100) unlock('flashcards_flip_100');
  if (flips >= 500) unlock('flashcards_flip_500');
  if (flips >= 1000) unlock('flashcards_flip_1000');

  const flashViewStreak = await readConsecutiveDayStreakValue(flashcardsAchievementViewStreakKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (flashViewStreak >= 7) unlock('flashcards_view_7_days');
  if (flashViewStreak >= 14) unlock('flashcards_view_14_days');
  if (flashViewStreak >= 30) unlock('flashcards_view_30_days');

  const refills = await readStoredCounter('achievement_energy_refill_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (refills >= 1) unlock('energy_refill_first');
  if (refills >= 5) unlock('energy_refill_5');
  if (refills >= 10) unlock('energy_refill_10');
  if (refills >= 25) unlock('energy_refill_25');

  const top3 = await readStoredCounter('achievement_league_top3_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (top3 >= 5) unlock('league_top3_5');
  const champion = await readStoredCounter('achievement_league_champion_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (champion >= 5) unlock('league_champion_5');
  if (champion >= 10) unlock('league_champion_10');
  if (await readConsecutiveDayStreakValue('achievement_league_diamond_week_streak_v1') >= 4) unlock('league_diamond_4_weeks');
  if (!isCurrentAccountGeneration(accountToken)) return;

  const gifts = await readStoredCounter('achievement_gift_sent_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (gifts >= 5) unlock('social_gift_5');
  if (gifts >= 10) unlock('social_gift_10');
  if (gifts >= 25) unlock('social_gift_25');
  if (gifts >= 100) unlock('social_gift_100');

  const perfectSessions = await readStoredCounter(trainerAchievementPerfectSessionCountKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (perfectSessions >= 10) unlock('trainer_perfect_10_sessions');
  if (perfectSessions >= 50) unlock('trainer_perfect_50_sessions');

  const shares = await readStoredCounter(shareAchievementCounterKey(studyTarget));
  if (!isCurrentAccountGeneration(accountToken)) return;
  if (shares >= 10) unlock('share_achievement_10');

  await commitAchievementStoragePairs([[ACHIEVEMENT_BACKFILL_KEY, '1']], accountToken);
};

export type AchievementEvent =
  | { type: 'streak';         streak:    number }
  | { type: 'xp';             totalXP:   number }
  | { type: 'lesson_complete'; lessonCount: number; wasPerfect?: boolean; perfectCount?: number; lessonId?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'lesson_perfect_pass'; lessonId: number; passCount: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'quiz';           level: string; perfect?: boolean; studyTarget?: RuntimeStudyTarget }
  | { type: 'combo';          count: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'daily_task';     allDone?: boolean; noReroll?: boolean; studyTarget?: RuntimeStudyTarget }
  | { type: 'login';          consecutiveDays: number }
  | { type: 'comeback' }
  | { type: 'wager_win' }
  | { type: 'personal_best' }
  | { type: 'streak_repair' }
  | { type: 'perfect_week' }
  | { type: 'diagnosis'; studyTarget?: RuntimeStudyTarget }
  | { type: 'time_of_day' }
  | { type: 'backfill'; studyTarget?: RuntimeStudyTarget }
  | { type: 'exam';            pct: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'flashcards_session'; studyTarget?: RuntimeStudyTarget }
  | { type: 'flashcard_saved'; source?: string; count?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'flashcard_flipped'; count?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'flashcard_viewed'; count?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'daily_phrase'; action: 'read' | 'save'; studyTarget?: RuntimeStudyTarget }
  | { type: 'active_recall'; correct?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'arena_win' }
  | { type: 'shards'; balance: number }
  | { type: 'shards_spent'; amount: number }
  | { type: 'energy_refill' }
  | { type: 'league_result'; myRank: number; totalInGroup: number; promoted?: boolean; newLeagueId?: number }
  | { type: 'league_boost'; multiplier: number }
  | { type: 'gem'; level: string; gem: 'ruby' | 'emerald' | 'diamond'; studyTarget?: RuntimeStudyTarget }
  // ── Новые события ────────────────────────────────────────────────────────
  | { type: 'friend_added';   totalFriends: number }
  | { type: 'gift_sent' }
  | { type: 'achievement_liked'; likeTotal?: number }
  | { type: 'arena_wager_win'; count?: number }
  | { type: 'trainer_correct'; correct: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'trainer_session_result'; correct: number; wrong: number; total: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'avatar_custom_set' }
  | { type: 'profile_theme_set' }
  | { type: 'pack_purchased';  totalPacks: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'achievement_shared'; studyTarget?: RuntimeStudyTarget }
  | { type: 'level_reached';  level: number }
  | { type: 'quiz_session_count'; count: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'streak_freeze_used' }
  | { type: 'wager_win_streak'; count: number };

const ACHIEVEMENT_QUEUE_MAX_ACCOUNTS = 8;
const achievementQueueByAccount = new Map<string, {
  tail: Promise<unknown>;
  accountToken: AccountGenerationToken;
}>();

function pruneStaleAchievementQueues(): void {
  for (const [key, entry] of achievementQueueByAccount) {
    if (!isCurrentAccountGeneration(entry.accountToken)) achievementQueueByAccount.delete(key);
  }
}

function enqueueAchievementOperation<T>(
  accountToken: AccountGenerationToken,
  operation: () => Promise<T>,
  capacityFallback: T,
): Promise<T> {
  const accountKey = accountToken.stableId ? accountScopeKey(accountToken) : null;
  if (!accountKey || !isCurrentAccountGeneration(accountToken)) return Promise.resolve(capacityFallback);
  pruneStaleAchievementQueues();
  const existing = achievementQueueByAccount.get(accountKey);
  if (!existing && achievementQueueByAccount.size >= ACHIEVEMENT_QUEUE_MAX_ACCOUNTS) {
    return Promise.resolve(capacityFallback);
  }
  const result = (existing?.tail ?? Promise.resolve()).then(operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  ).finally(() => {
    if (achievementQueueByAccount.get(accountKey)?.tail === tail) achievementQueueByAccount.delete(accountKey);
  });
  achievementQueueByAccount.set(accountKey, { tail, accountToken });
  return result;
}

export const checkAchievements = async (
  event: AchievementEvent,
  accountToken?: AccountGenerationToken,
): Promise<Achievement[]> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return [];
  return enqueueAchievementOperation(operationToken, async () => {
  const execute = async (): Promise<Achievement[]> => {
  try {
    const eventStudyTarget = 'studyTarget' in event ? event.studyTarget : undefined;
    const states = await loadAchievementStatesForTargetInternal(eventStudyTarget, operationToken, true);
    if (!isCurrentAccountGeneration(operationToken)) return [];
    const justUnlocked: Achievement[] = [];

    const u = (id: string) => {
      if (unlockOne(states, id)) {
        const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
        if (def) justUnlocked.push(def);
      }
    };

    // зачем: владелец на новом аккаунте увидел лавину тостов. Backfill — это НЕ достижение
    // «прямо сейчас», а сверка уже накопленного локального состояния (пройденные уроки,
    // сохранённые карточки, счётчики тренажёра). Раньше его разблокировки шли в общий поток
    // и вываливались тостами по 3.8с штука. Теперь помечаем их notified сразу: XP за них
    // начисляется как обычно, на экране достижений они видны, но празднования не устраивают.
    const backfilledIds = new Set<string>();
    const backfillUnlock = (id: string) => {
      const before = justUnlocked.length;
      u(id);
      if (justUnlocked.length > before) backfilledIds.add(id);
    };
    await backfillAchievementsFromLocalState(
      backfillUnlock,
      event.type === 'backfill',
      eventStudyTarget,
      operationToken,
    );
    if (!isCurrentAccountGeneration(operationToken)) return [];

    switch (event.type) {
      case 'streak': {
        const s = event.streak;
        if (s >= 3)   u('streak_3');
        if (s >= 7)   u('streak_7');
        if (s >= 14)  u('streak_14');
        if (s >= 30)  u('streak_30');
        if (s >= 60)  u('streak_60');
        if (s >= 100) u('streak_100');
        if (s >= 150) u('streak_150');
        if (s >= 200) u('streak_200');
        if (s >= 250) u('streak_250');
        if (s >= 365) u('streak_365');
        if (s >= 500) u('streak_500');
        if (s >= 750) u('streak_750');
        if (s >= 1000) u('streak_1000');
        if (s >= 365) {
          let lastSafetyStreak: number | null = null;
          try {
            const raw = await AsyncStorage.getItem('achievement_streak_safety_used_v1');
            if (!isCurrentAccountGeneration(operationToken)) return [];
            const parsed = raw ? JSON.parse(raw) : null;
            const n = Math.floor(Number(parsed?.streak));
            if (Number.isFinite(n) && n > 0) lastSafetyStreak = n;
          } catch (e) {
            if (__DEV__) console.warn('[achievements]', e);
          }
          if (lastSafetyStreak === null || s - lastSafetyStreak >= 365) u('streak_clean_365');
        }
        {
          const month = await bumpMonthlyActivityDays('achievement_perfect_month_days_v1', operationToken);
          if (month.isLastDay && month.count >= month.daysInMonth) u('perfect_month');
        }
        break;
      }
      case 'xp': {
        const xp = event.totalXP;
        if (xp >= 100)   u('xp_100');
        if (xp >= 250)   u('xp_250');
        if (xp >= 500)   u('xp_500');
        if (xp >= 1000)  u('xp_1000');
        if (xp >= 2500)  u('xp_2500');
        if (xp >= 5000)  u('xp_5000');
        if (xp >= 10000)  u('xp_10000');
        if (xp >= 20000)  u('xp_20000');
        if (xp >= 50000)  u('xp_50000');
        if (xp >= 75000)  u('xp_75000');
        if (xp >= 100000) u('xp_100000');
        if (xp >= 150000) u('xp_150000');
        if (xp >= 250000) u('xp_250000');
        if (xp >= 500000) u('xp_500000');
        if (xp >= 750000) u('xp_750000');
        if (xp >= 1000000) u('xp_1000000');
        if (xp >= 2000000) u('xp_2000000');
        await unlockWeeklyXpAchievements(u);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        break;
      }
      case 'lesson_complete': {
        const storedLessonCount = await countCompletedLessonsAcrossAchievementTargets();
        if (!isCurrentAccountGeneration(operationToken)) return [];
        const storedPerfectCount = await countPerfectLessonsInRange(1, 32);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        const c = Math.max(event.lessonCount, storedLessonCount);
        const perfectCount = Math.max(event.perfectCount ?? 0, storedPerfectCount);
        if (c >= 1)  u('lesson_1');
        if (c >= 3)  u('lesson_3');
        if (c >= 5)  u('lesson_5');
        if (c >= 10) u('lesson_10');
        if (c >= 15) u('lesson_15');
        if (c >= 20) u('lesson_20');
        if (c >= 32) u('lesson_all');
        if (event.wasPerfect) {
          u('lesson_perfect');
          if (perfectCount >= 3)  u('lesson_perfect3');
          if (perfectCount >= 10) u('lesson_perfect10');
          if (perfectCount >= 32) u('lesson_all_perfect');
        }
        if (perfectCount >= 10) u('lesson_perfect10');
        if (await countPerfectLessonsInRange(29, 32) >= 4) u('lesson_b2_perfect');
        if (!isCurrentAccountGeneration(operationToken)) return [];
        if (event.lessonId && event.lessonId >= 1 && event.lessonId <= 32) {
          const dayKey = achievementLessonMarathonDayKey(localDayKey(), event.studyTarget);
          const completedToday = await addStoredSetValue(dayKey, String(Math.floor(event.lessonId)), operationToken);
          if (completedToday >= 10) u('lesson_marathon_day');
        }
        await unlockLessonPassAchievements(u);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        break;
      }
      case 'lesson_perfect_pass': {
        const lessonId = Math.floor(event.lessonId);
        if (lessonId >= 1 && lessonId <= 32) {
          await addStoredNumberSetValue(achievementLessonPerfectPassesKey(lessonId, event.studyTarget), event.passCount, operationToken);
          const perfectPasses = await readPerfectLessonPassCounts();
          if (!isCurrentAccountGeneration(operationToken)) return [];
          if (perfectPasses.filter(count => count >= 2).length >= 32) u('lesson_all_perfect_2x');
        }
        break;
      }
      case 'quiz': {
        // зачем: викторины удалены из приложения (см. RETIRED_QUIZ_ARENA_TASK_TYPES
        // в daily_tasks.ts), вместе с ними удалены и их достижения. Обработчик
        // остаётся заглушкой ради совместимости типа события, но больше не пишет
        // счётчики в AsyncStorage — их всё равно никто не читал, а каждая запись
        // раздувала achievements_state, который целиком уезжает в Firestore.
        break;
      }
      case 'combo': {
        await setStoredCounterAtLeast(comboAchievementCounterKey(event.studyTarget), event.count, operationToken);
        if (event.count >= 3)  u('combo_3');
        if (event.count >= 10) u('combo_10');
        if (event.count >= 20) u('combo_20');
        if (event.count >= 50)  u('combo_50');
        if (event.count >= 100) u('combo_100');
        if (event.count >= 150) u('combo_150');
        if (event.count >= 250) u('combo_250');
        if (event.count >= 500) u('combo_500');
        break;
      }
      case 'daily_task': {
        u('daily_task_first');
        if (event.allDone) {
          u('all_daily');
          const streak = await bumpConsecutiveDayStreak(dailyTasksAchievementAllDoneStreakKey(event.studyTarget), operationToken);
          if (streak >= 3) u('daily_all_3');
          if (streak >= 7) u('daily_all_7');
          if (streak >= 14) u('daily_all_14');
          if (streak >= 30) u('daily_all_30');
          if (event.noReroll) {
            u('daily_no_reroll');
            const noRerollStreak = await bumpConsecutiveDayStreak(dailyTasksAchievementNoRerollStreakKey(event.studyTarget), operationToken);
            if (noRerollStreak >= 7) u('daily_no_reroll_7');
            if (noRerollStreak >= 30) u('daily_no_reroll_30');
          }
        }
        break;
      }
      case 'login': {
        const d = event.consecutiveDays;
        if (d >= 7)  u('login_7');
        if (d >= 14) u('login_14');
        if (d >= 30) u('login_30');
        if (d >= 60)  u('login_60');
        if (d >= 100) u('login_100');
        if (d >= 200) u('login_200');
        if (d >= 365) u('login_365');
        break;
      }
      case 'comeback':      u('comeback');      break;
      case 'wager_win': {
        // зачем: ставки живы (пари на свою серию, xp_manager.ts), а вот Арена удалена.
        // Раньше счётчик 3/10 висел на мёртвом событии arena_wager_win и достижения
        // были недостижимы — теперь копим на живом событии, ключ один.
        u('wager_win');
        const wagerTotal = await bumpStoredCounter(WAGER_WIN_COUNT_KEY, 1, operationToken);
        if (wagerTotal >= 3)  u('wager_win_3');
        if (wagerTotal >= 10) u('wager_win_10');
        break;
      }
      case 'personal_best': u('personal_best'); break;
      case 'streak_repair':
        await markStreakSafetyUsed(operationToken);
        u('streak_repair');
        break;
      case 'perfect_week':  u('perfect_week');  break;
      case 'diagnosis':     u('diagnosis');     break;
      case 'time_of_day': {
        const h = new Date().getHours();
        if (h >= 23 || h < 5) {
          u('night_owl');
          const streak = await bumpConsecutiveDayStreak('achievement_night_xp_streak_v1', operationToken);
          if (streak >= 7) u('night_week');
        }
        if (h >= 5 && h < 7) {
          u('early_bird');
          const streak = await bumpConsecutiveDayStreak('achievement_early_xp_streak_v1', operationToken);
          if (streak >= 7) u('early_week');
        }
        break;
      }
      case 'backfill': {
        break;
      }
      case 'exam': {
        u('exam_first');
        if (event.pct >= 90) {
          u('exam_ace');
          const aces = await bumpStoredCounter('achievement_exam_ace_count', 1, operationToken);
          if (aces >= 5) u('exam_ace_5');
          if (aces >= 10) u('exam_ace_10');
        }
        break;
      }
      case 'flashcards_session': u('flashcards_session'); break;
      case 'flashcard_saved': {
        const saved = await bumpStoredCounter(flashcardsAchievementSavedCountKey(event.studyTarget), event.count ?? 1, operationToken);
        if (saved >= 25) u('flashcards_save_25');
        if (saved >= 50) u('flashcards_save_50');
        if (saved >= 100) u('flashcards_save_100');
        if (saved >= 250) u('flashcards_save_250');
        if (event.source) {
          const sources = await addStoredSetValue(flashcardsAchievementSourceSetKey(event.studyTarget), event.source, operationToken);
          if (sources >= 4) u('flashcards_sources_4');
        }
        break;
      }
      case 'flashcard_flipped': {
        const flips = await bumpStoredCounter(flashcardsAchievementFlipCountKey(event.studyTarget), event.count ?? 1, operationToken);
        if (flips >= 100) u('flashcards_flip_100');
        if (flips >= 500) u('flashcards_flip_500');
        if (flips >= 1000) u('flashcards_flip_1000');
        break;
      }
      case 'flashcard_viewed': {
        const count = Math.max(0, Math.floor(event.count ?? 1));
        if (count > 0) {
          const streak = await bumpConsecutiveDayStreak(flashcardsAchievementViewStreakKey(event.studyTarget), operationToken);
          if (streak >= 7) u('flashcards_view_7_days');
          if (streak >= 14) u('flashcards_view_14_days');
          if (streak >= 30) u('flashcards_view_30_days');
        }
        break;
      }
      case 'daily_phrase': {
        if (event.action === 'read') {
          u('daily_phrase_first');
          const reads = await bumpStoredCounter(dailyPhraseAchievementReadCountKey(event.studyTarget), 1, operationToken);
          if (reads >= 30) u('daily_phrase_read_30');
        }
        if (event.action === 'save') {
          u('daily_phrase_save');
          const saves = await bumpStoredCounter(dailyPhraseAchievementSaveCountKey(event.studyTarget), 1, operationToken);
          if (saves >= 30) u('daily_phrase_save_30');
          if (saves >= 100) u('daily_phrase_save_100');
        }
        break;
      }
      case 'active_recall': {
        const key = activeRecallAchievementCorrectCountKey(event.studyTarget);
        const add = Math.max(1, Math.floor(event.correct ?? 1));
        const next = await bumpStoredCounter(key, add, operationToken);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        if (next >= 1) u('recall_first');
        if (next >= 50) u('recall_50');
        break;
      }
      case 'arena_win': {
        // зачем: Арена удалена — достижения арены выпилены, счётчик
        // achievement_arena_win_count никто не читал. Заглушка ради совместимости
        // типа события; каждая запись зря раздувала achievements_state в Firestore.
        break;
      }
      case 'shards': {
        if (event.balance >= 100) u('shards_100');
        if (event.balance >= 250) u('shards_250');
        if (event.balance >= 500) u('shards_500');
        if (event.balance >= 1000) u('shards_1000');
        break;
      }
      case 'shards_spent': {
        const spent = await bumpStoredCounter('achievement_shards_spent_total', event.amount, operationToken);
        if (spent >= 100) u('shards_spent_100');
        if (spent >= 500) u('shards_spent_500');
        if (spent >= 1000) u('shards_spent_1000');
        break;
      }
      case 'energy_refill': {
        const refills = await bumpStoredCounter('achievement_energy_refill_count', 1, operationToken);
        if (refills >= 1) u('energy_refill_first');
        if (refills >= 5) u('energy_refill_5');
        if (refills >= 10) u('energy_refill_10');
        if (refills >= 25) u('energy_refill_25');
        break;
      }
      case 'league_result': {
        const rank = Math.max(1, Math.floor(event.myRank));
        const total = Math.max(0, Math.floor(event.totalInGroup));
        if (total >= 2) u('league_result_first');
        if (total >= 3 && rank <= 3) {
          u('league_top3');
          const top3 = await bumpStoredCounter('achievement_league_top3_count', 1, operationToken);
          if (top3 >= 5) u('league_top3_5');
        }
        if (total >= 2 && rank === 1) {
          u('league_champion');
          const champion = await bumpStoredCounter('achievement_league_champion_count', 1, operationToken);
          if (champion >= 5) u('league_champion_5');
          if (champion >= 10) u('league_champion_10');
        }
        if (event.promoted) u('league_promoted');
        if ((event.newLeagueId ?? 0) >= 8) {
          u('league_diamond');
          const diamondStreak = await bumpConsecutiveWeekStreak('achievement_league_diamond_week_streak_v1', operationToken);
          if (diamondStreak >= 4) u('league_diamond_4_weeks');
        }
        break;
      }
      case 'league_boost': {
        const boosts = await bumpStoredCounter('achievement_league_boost_count', 1, operationToken);
        if (boosts >= 1) u('league_boost_first');
        if (boosts >= 5) u('league_boost_5');
        if (event.multiplier >= 3) u('league_boost_x3');
        break;
      }
      case 'gem': {
        const lvlKey = event.level.toLowerCase();
        if (event.gem === 'ruby')    u(`gem_${lvlKey}_ruby`);
        if (event.gem === 'emerald') u(`gem_${lvlKey}_emerald`);
        if (event.gem === 'diamond') {
          u(`gem_${lvlKey}_diamond`);
          const allDiamonds = ['gem_a1_diamond','gem_a2_diamond','gem_b1_diamond','gem_b2_diamond']
            .every(id => states.find(s => s.id === id)?.unlockedAt !== null);
          if (allDiamonds) u('gem_all_complete');
        }
        await unlockLessonPassAchievements(u);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        break;
      }

      // ── Новые события ──────────────────────────────────────────────────────
      case 'friend_added': {
        const tf = event.totalFriends;
        if (tf >= 1)  u('social_friend_first');
        if (tf >= 3)  u('social_friends_3');
        if (tf >= 10) u('social_friends_10');
        if (tf >= 25) u('social_friends_25');
        if (tf >= 50) u('social_friends_50');
        break;
      }
      case 'gift_sent': {
        const giftKey = 'achievement_gift_sent_count';
        const next = await bumpStoredCounter(giftKey, 1, operationToken);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        if (next >= 1) u('social_gift_send');
        if (next >= 5) u('social_gift_5');
        if (next >= 10) u('social_gift_10');
        if (next >= 25) u('social_gift_25');
        if (next >= 100) u('social_gift_100');
        break;
      }
      case 'achievement_liked': {
        u('social_like_received');
        if ((event.likeTotal ?? 0) >= 5) u('social_likes_5');
        if ((event.likeTotal ?? 0) >= 25) u('social_likes_25');
        if ((event.likeTotal ?? 0) >= 100) u('social_likes_100');
        break;
      }
      case 'arena_wager_win': {
        // зачем: Арена удалена — событие больше никто не шлёт. Заглушка ради
        // совместимости типа; счёт ставок теперь ведёт case 'wager_win' выше,
        // и лишняя запись в AsyncStorage не раздувает achievements_state.
        break;
      }
      case 'trainer_correct': {
        const trainerKey = trainerAchievementCorrectCountKey(event.studyTarget);
        const add = Math.max(1, Math.floor(event.correct));
        const next = await bumpStoredCounter(trainerKey, add, operationToken);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        await setStoredCounterAtLeast(activeRecallAchievementCorrectCountKey(event.studyTarget), next, operationToken);
        if (!isCurrentAccountGeneration(operationToken)) return [];
        if (next >= 1)   u('recall_first');
        if (next >= 50)  u('recall_50');
        if (next >= 100) u('trainer_100_correct');
        if (next >= 500) u('trainer_500_correct');
        if (next >= 1000) u('trainer_1000_correct');
        if (next >= 2500) u('trainer_2500_correct');
        if (next >= 10000) u('trainer_10000_correct');
        {
          const streak = await bumpConsecutiveDayStreak(trainerAchievementCorrectStreakKey(event.studyTarget), operationToken);
          if (streak >= 7) u('trainer_7_days');
        }
        break;
      }
      case 'trainer_session_result': {
        if (event.total > 0) u('trainer_session');
        if (event.total >= 5 && event.wrong <= 0 && event.correct >= event.total) {
          u('trainer_perfect_session');
          const perfectSessions = await bumpStoredCounter(trainerAchievementPerfectSessionCountKey(event.studyTarget), 1, operationToken);
          if (perfectSessions >= 10) u('trainer_perfect_10_sessions');
          if (perfectSessions >= 50) u('trainer_perfect_50_sessions');
        }
        break;
      }
      case 'avatar_custom_set': {
        u('avatar_custom');
        break;
      }
      case 'profile_theme_set': {
        u('profile_themed');
        break;
      }
      case 'pack_purchased': {
        const tp = event.totalPacks;
        if (tp >= 1) u('pack_purchased');
        if (tp >= 5) u('pack_5_purchased');
        if (tp >= 10) u('pack_10_purchased');
        if (tp >= 25) u('pack_25_purchased');
        break;
      }
      case 'achievement_shared': {
        u('share_achievement');
        const shares = await bumpStoredCounter(shareAchievementCounterKey(event.studyTarget), 1, operationToken);
        if (shares >= 10) u('share_achievement_10');
        break;
      }
      case 'level_reached': {
        if (event.level >= 50) u('level_50');
        break;
      }
      case 'quiz_session_count': {
        // зачем: заглушка — достижения викторин удалены вместе с самой фичей,
        // читать счётчик больше незачем (см. case 'quiz' выше).
        break;
      }
      case 'streak_freeze_used': {
        await markStreakSafetyUsed(operationToken);
        break;
      }
      case 'wager_win_streak': {
        if (event.count >= 3) u('wager_win_3');
        if (event.count >= 10) u('wager_win_10');
        break;
      }
    }

    if (justUnlocked.length > 0) {
      // зачем: _achievementLock (локальная цепочка промисов этого модуля) и withStorageLock
      // (глобальный мьютекс storage_mutex) — ДВА независимых замка над одним хранилищем.
      // claimAchievementShardReward/markAchievementsNotified пишут под вторым, а этот путь
      // писал вообще без него: между чтением states (500 строк выше) и записью успевал
      // пройти claim, и его shardClaimed затирался целиком — награда снова показывалась как
      // «забрать», а тост об уже показанном достижении всплывал повторно.
      // Читать всё под глобальным мьютексом нельзя: между чтением и записью лежит длинная
      // асинхронная логика, и держать на ней замок, общий с осколками/заданиями/стриками, —
      // прямой путь к залипанию. Поэтому пишем слиянием: под замком перечитываем свежий
      // снимок и накатываем на него ТОЛЬКО свои разблокировки, не трогая чужие поля.
      const unlockedIds = new Set(justUnlocked.map((a) => a.id));
      const fresh = await loadAchievementStatesForTargetInternal(eventStudyTarget, operationToken, false);
      if (!isCurrentAccountGeneration(operationToken)) return [];
      const freshById = new Map(fresh.map((s) => [s.id, s]));
      for (const row of states) {
          if (!unlockedIds.has(row.id)) continue;
          const current = freshById.get(row.id);
          if (!current) {
            // Той же логикой гасим тост и когда строки в свежем снимке ещё нет:
            // иначе backfill-достижение проскочило бы в очередь тостов этим путём.
            freshById.set(row.id, backfilledIds.has(row.id) ? { ...row, notified: true } : row);
            continue;
          }
          // Разблокировка идемпотентна: если параллельный путь уже проставил unlockedAt,
          // оставляем более раннюю метку. Остальные поля (shardClaimed, notified) — чужая
          // зона ответственности, их снимок свежее нашего.
          if (current.unlockedAt === null) current.unlockedAt = row.unlockedAt;
          // Тихий backfill: гасим тост сразу в том же снимке, чтобы getPendingNotifications
          // его уже не поднял. Только для СВОИХ backfill-разблокировок (см. backfilledIds) —
          // достижения, добытые живым действием игрока, празднуются как раньше.
          if (backfilledIds.has(row.id)) current.notified = true;
      }
      const saved = await saveStates(Array.from(freshById.values()), eventStudyTarget, operationToken);
      if (!saved) return [];
      if (!isCurrentAccountGeneration(operationToken)) return [];
      emitAppEvent('achievement_unlocked');

      const userName = await AsyncStorage.getItem('user_name').catch(() => null);
      if (!isCurrentAccountGeneration(operationToken)) return [];
      const lang = (await AsyncStorage.getItem('app_lang').catch(() => null))
        || (await AsyncStorage.getItem('user_lang').catch(() => null));
      if (!isCurrentAccountGeneration(operationToken)) return [];
      const safeUser = userName || 'Player';
      const safeLang = (lang as 'ru' | 'uk') || 'ru';
      for (const ach of justUnlocked) {
        if (ach.xp > 0) {
          const xpAmt = ach.xp;
          // Нельзя await registerXP отсюда: вызывающий registerXP (урок/задание) уже держит xp-lock —
          // вложенный await навсегда висит на цепочке _xpLock (мертвая блокировка, «Забрать» крутится).
          setTimeout(() => {
            void registerXP(xpAmt, 'achievement_reward', safeUser, safeLang, undefined, {
              eventId: [
                'achievement',
                safeAchievementEventPart(ach.id, 80),
                'reward',
              ].join(':'),
              payload: {
                achievementId: ach.id,
                nameRu: ach.nameRu,
              },
              accountToken: operationToken,
            }).catch(() => {});
          }, 0);
        }
        writeFriendEvent('achievement', { id: ach.id, nameRu: ach.nameRu, icon: ach.icon }).catch(() => {});
      }
    }
    return justUnlocked;
  } catch { return []; }
  };
  return isCurrentAccountGeneration(operationToken) ? execute() : [];
  }, []);
};

const ACHIEVEMENT_SHARD_PAYOUT_PENDING_PREFIX = 'achievement_shard_payout_pending_v1:';
const ACHIEVEMENT_SHARD_PAYOUT_PENDING_LIMIT = 64;

const achievementPayoutOwnerHash = (stableId: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < stableId.length; index += 1) {
    hash ^= stableId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const achievementPayoutOpId = (stableId: string, achievementId: string): string => {
  const safeId = achievementId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48);
  return `achievement:${achievementPayoutOwnerHash(stableId)}:${safeId}`;
};

const achievementPayoutPendingKey = (stableId: string): string =>
  `${ACHIEVEMENT_SHARD_PAYOUT_PENDING_PREFIX}${encodeURIComponent(stableId)}`;

const readAchievementPayoutPending = async (
  stableId: string,
  accountToken: AccountGenerationToken,
): Promise<Record<string, string> | null> => {
  if (!isCurrentAccountGeneration(accountToken, stableId)) return null;
  try {
    const raw = await AsyncStorage.getItem(achievementPayoutPendingKey(stableId));
    if (!isCurrentAccountGeneration(accountToken, stableId)) return null;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>)
      .filter((entry): entry is [string, string] => (
        typeof entry[0] === 'string'
        && typeof entry[1] === 'string'
        && /^[A-Za-z0-9_:-]{8,80}$/.test(entry[1])
      ))
      .slice(-ACHIEVEMENT_SHARD_PAYOUT_PENDING_LIMIT));
  } catch {
    return {};
  }
};

export const claimAchievementShardReward = async (
  achievementId: string,
  accountToken?: AccountGenerationToken,
): Promise<boolean> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return false;
  return enqueueAchievementOperation(operationToken, async () => {
  const states = await loadAchievementStatesInternal(operationToken, true);
  if (!isCurrentAccountGeneration(operationToken)) return false;
  const state = states.find(x => x.id === achievementId);
  if (!state || state.unlockedAt === null || state.shardClaimed) return false;
  const ownerStableId = operationToken.stableId ?? '';
  const pending = await readAchievementPayoutPending(ownerStableId, operationToken);
  if (!pending || !isCurrentAccountGeneration(operationToken, ownerStableId)) return false;
  const payoutOpId = pending[achievementId] ?? achievementPayoutOpId(ownerStableId, achievementId);
  if (!pending[achievementId]) {
    pending[achievementId] = payoutOpId;
    const pendingEntries = Object.entries(pending).slice(-ACHIEVEMENT_SHARD_PAYOUT_PENDING_LIMIT);
    const journaled = await commitAchievementStoragePairs([[
      achievementPayoutPendingKey(ownerStableId),
      JSON.stringify(Object.fromEntries(pendingEntries)),
    ]], operationToken);
    if (!journaled || !isCurrentAccountGeneration(operationToken, ownerStableId)) return false;
  }

  // зачем: владелец вернул награду за достижения — экран всё это время обещал
  // «+1 жемчужина» и показывал кнопку «Получить», но выплата была обнулена
  // экономикой «Монеты и Звёзды», и игрок жал кнопку впустую. Теперь код
  // совпадает с обещанием на экране: ровно +1 жемчужина за достижение.
  const ACHIEVEMENT_SHARD_PAYOUT = 1 as number;
  if (ACHIEVEMENT_SHARD_PAYOUT <= 0) return true;

  const n = await addShardsRaw(ACHIEVEMENT_SHARD_PAYOUT, `achievement:${achievementId}`, {
    showEarnModal: false,
    skipServerAwait: true,
    accountToken: operationToken,
    idempotencyKey: payoutOpId,
  });
  if (!isCurrentAccountGeneration(operationToken, ownerStableId) || n < 1) return false;
  if (n >= 1) {
    const freshStates = await loadAchievementStatesInternal(operationToken, false);
    if (!isCurrentAccountGeneration(operationToken, ownerStableId)) return false;
    const freshState = freshStates.find(x => x.id === achievementId);
    if (!freshState || freshState.unlockedAt === null) return false;
    freshState.shardClaimed = true;
    delete pending[achievementId];
    const finalized = await commitAchievementStoragePairs([
      ...achievementStatePairs(freshStates),
      [achievementPayoutPendingKey(ownerStableId), JSON.stringify(pending)],
    ], operationToken);
    if (!finalized || !isCurrentAccountGeneration(operationToken, ownerStableId)) return false;
    try {
      const balance = await getShardsBalance();
      if (!isCurrentAccountGeneration(operationToken, ownerStableId)) return false;
      emitAppEvent('shards_balance_updated', { balance });
    } catch (e) {
      if (__DEV__) console.warn('[achievements]', e);
    }
    return true;
  }
  return false;
  }, false);
};

export const hasPendingShardReward = (state: AchievementState | undefined): boolean =>
  !!state && state.unlockedAt !== null && state.shardClaimed === false;

export const markAchievementsNotified = async (
  ids: string[],
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return;
  await enqueueAchievementOperation(operationToken, async () => {
    const states = await loadAchievementStatesInternal(operationToken, true);
    if (!isCurrentAccountGeneration(operationToken)) return;
    ids.forEach(id => {
      const s = states.find(s => s.id === id);
      if (s) s.notified = true;
    });
    await saveStates(states, undefined, operationToken);
    if (!isCurrentAccountGeneration(operationToken)) return;
  }, undefined);
};

export const getPendingNotifications = async (
  accountToken?: AccountGenerationToken,
): Promise<Achievement[]> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return [];
  return enqueueAchievementOperation(operationToken, async () => {
  try {
    const states = await loadAchievementStatesInternal(operationToken, true);
    if (!isCurrentAccountGeneration(operationToken)) return [];
    return states
      .filter(s => s.unlockedAt !== null && !s.notified)
      .map(s => ALL_ACHIEVEMENTS.find(a => a.id === s.id))
      .filter(Boolean) as Achievement[];
  } catch { return []; }
  }, []);
};

export const unlockAllAchievements = async (
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return;
  await enqueueAchievementOperation(operationToken, async () => {
  try {
    const states = await loadAchievementStatesInternal(operationToken, true);
    if (!isCurrentAccountGeneration(operationToken)) return;
    const now = new Date().toISOString();
    const existingIds = new Set(states.map(s => s.id));

    states.forEach(state => {
      if (state.unlockedAt === null) {
        state.unlockedAt = now;
        state.notified = true;
        state.shardClaimed = true;
      }
    });

    ALL_ACHIEVEMENTS.forEach(achievement => {
      if (!existingIds.has(achievement.id)) {
        states.push({ id: achievement.id, unlockedAt: now, notified: true, shardClaimed: true });
      }
    });

    await saveStates(states, undefined, operationToken);
    if (!isCurrentAccountGeneration(operationToken)) return;
  } catch (e) {
    if (__DEV__) console.warn('[achievements]', e);
  }
  }, undefined);
};

export const devSeedAchievementsSmoke = async (): Promise<{ total: number; unlocked: number; missing: string[] }> => {
  const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;
  const isTestRuntime = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  if ((!isDevRuntime && !DEV_MODE && !isTestRuntime) || IS_STORE_RELEASE) {
    throw new Error('devSeedAchievementsSmoke is not available in production builds');
  }
  const operationToken = captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) {
    return { total: ALL_ACHIEVEMENTS.length, unlocked: 0, missing: ALL_ACHIEVEMENTS.map(a => a.id) };
  }

  await unlockAllAchievements(operationToken);
  if (!isCurrentAccountGeneration(operationToken)) {
    return { total: ALL_ACHIEVEMENTS.length, unlocked: 0, missing: ALL_ACHIEVEMENTS.map(a => a.id) };
  }

  const now = new Date().toISOString();
  const fullLessonProgress = JSON.stringify(Array.from({ length: 50 }, () => 'correct'));
  const lessonPairs: Array<[string, string]> = Array.from({ length: 32 }, (_, i) => [
    `lesson${i + 1}_progress`,
    fullLessonProgress,
  ]);

  const seeded = await commitAchievementStoragePairs([
    ['streak_count', '500'],
    ['user_total_xp', '100000'],
    ['login_bonus_v1', JSON.stringify({ consecutiveDays: 365, lastClaimDate: now })],
    ['achievement_active_recall_correct_count', '50'],
    ['shards_balance', '100'],
    // Новые счётчики для новых достижений
    ['achievement_all_daily_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    ['achievement_gift_sent_count', '10'],
    ['achievement_league_boost_count', '5'],
    ['achievement_energy_refill_count', '5'],
    ['achievement_shards_spent_total', '100'],
    ['achievement_flashcards_saved_count', '50'],
    ['achievement_flashcards_flip_count', '100'],
    ['achievement_flashcards_view_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    ['achievement_flashcards_source_set_v1', JSON.stringify(['lesson', 'word', 'verb', 'daily_phrase'])],
    ['achievement_trainer_correct_count', '500'],
    ['achievement_trainer_correct_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    // зачем: 10 — порог верхнего достижения wager_win_10, чтобы QA-сид открывал
    // оба живых достижения по ставкам (wager_win_3 и wager_win_10).
    ['achievement_wager_win_count', '10'],
    ['pack_purchased_count', '5'],
    ...lessonPairs,
  ], operationToken);
  if (!seeded || !isCurrentAccountGeneration(operationToken)) {
    return { total: ALL_ACHIEVEMENTS.length, unlocked: 0, missing: ALL_ACHIEVEMENTS.map(a => a.id) };
  }

  const states = await loadAchievementStates(operationToken);
  if (!isCurrentAccountGeneration(operationToken)) {
    return { total: ALL_ACHIEVEMENTS.length, unlocked: 0, missing: ALL_ACHIEVEMENTS.map(a => a.id) };
  }
  const unlockedIds = new Set(states.filter(s => s.unlockedAt !== null).map(s => s.id));
  const missing = ALL_ACHIEVEMENTS.map(a => a.id).filter(id => !unlockedIds.has(id));

  return {
    total: ALL_ACHIEVEMENTS.length,
    unlocked: ALL_ACHIEVEMENTS.length - missing.length,
    missing,
  };
};

export default {};
