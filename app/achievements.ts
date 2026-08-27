import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from './personal_progress_store';
import type { Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { ACHIEVEMENT_ES } from './achievements_es_locale';
import {
  ACHIEVEMENT_CATALOG_V2,
  type AchievementDefinitionV2,
} from './achievement_catalog_v2';
import { evaluateFoundationAchievements } from './achievement_evaluator_v2';
import { resolveCleanStreakDays } from './achievement_clean_streak_v2';
import {
  ACHIEVEMENT_ACCESS_PLUS_PAID_KEY,
  ACHIEVEMENT_ACCESS_PRO_PAID_KEY,
  loadFoundationProgress,
  reduceFoundationActiveDateHistory,
  reduceFoundationActiveDay,
  reduceFoundationLeagueResult,
  reduceFoundationLegacyCounters,
  reduceFoundationShardBalance,
  updateFoundationProgress,
  type AchievementFoundationProgressV2,
} from './achievement_progress_v2';
import { getForegroundUsageMs } from './foreground_usage_ms';
import { decodeActiveDays } from './friends_together/together_days';
import { peekCurrentAccountCreatedAtMs } from './account_created_at';
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
import {
  achievementStateKey,
  storageStudyTarget,
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

export type Achievement = AchievementDefinitionV2;

export interface AchievementState {
  id:          string;
  unlockedAt:  string | null; // ISO datetime
  notified:    boolean;       // показан тост
  /**
   * Legacy marker from retired achievement pearl rewards.
   * Kept only so older persisted snapshots remain readable; new unlocks never create a pending reward.
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
    'pt-BR': { name: 'Quatro fontes', description: 'Salve cartões de uma lição, palavras, verbos e frase do dia.' },
    vi: { name: 'Bốn nguồn', description: 'Lưu thẻ từ bài học, từ vựng, động từ và cụm từ trong ngày.' },
    id: { name: 'Empat sumber', description: 'Simpan kartu dari pelajaran atau kuis, kata, verba, dan frasa harian.' },
    tr: { name: 'Dört kaynak', description: 'Ders, kelimeler, fiiller ve günün ifadesinden kart kaydet.' },
    pl: { name: 'Cztery źródła', description: 'Zapisz karty z lekcji, słów, czasowników i frazy dnia.' },
  },
};

const ACHIEVEMENT_NAME_PICKERS: Record<Lang, AchievementLocalePicker> = {
  ru: (achievement) => achievement.nameRu,
  uk: (achievement) => achievement.nameUk,
  // зачем: English — чисто UI-язык, контентного nameEn нет и не планируется
  // (см. app/source_locales.ts) — фолбэк на RU, как остальные picker'ы на
  // недостающие переводы.
  en: (achievement) => achievement.nameRu,
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
  en: (achievement) => achievement.descRu,
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
    (field === 'name' ? achievement.nameRu : achievement.descRu)
  );
}

export function achievementNameForLang(a: Achievement, lang: Lang): string {
  const localized = ACHIEVEMENT_NAME_PICKERS[lang](a);
  return localized ?? a.nameRu;
}

export function achievementDescForLang(a: Achievement, lang: Lang): string {
  const localized = ACHIEVEMENT_DESC_PICKERS[lang](a);
  return localized ?? a.descRu;
}

/**
 * The owner-approved museum pass separates the human story from the exact
 * unlock condition. RU/UK currently share that canonical condition; other
 * locales keep their existing localized one-line description until their
 * dedicated condition copy is approved, so the UI never shows Russian text in
 * a different locale.
 */
export function achievementConditionForLang(a: Achievement, lang: Lang): string | undefined {
  if (lang === 'ru') return a.conditionRu;
  if (lang === 'uk') return a.conditionUk;
  if (lang === 'es') return a.conditionEs;
  return undefined;
}

// Список достижений пополняется без миграции: новые id подхватываются loadAchievementStates().

export const ALL_ACHIEVEMENTS: Achievement[] = [...ACHIEVEMENT_CATALOG_V2];

// AsyncStorage

const STORAGE_KEY = 'achievements_v1';

const isTargetAchievement = (id: string): boolean => {
  const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) return false;
  if (achievement.category === 'lessons' || achievement.category === 'medal') return true;
  return (
    id.startsWith('lesson_') ||
    id.startsWith('gem_') ||
    id.startsWith('combo_') ||
    id.startsWith('exam_') ||
    id.startsWith('flashcards_') ||
    id.startsWith('mistake_') ||
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
  shardClaimed: s.shardClaimed ?? true,
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
      // One-time semantic-preserving rename: the old league_diamond award meant
      // reaching Diamond and maps exactly to the new immutable reached-league ID.
      // Other deleted IDs are intentionally not repurposed.
      const legacyDiamond = normalized.find((state) => state.id === 'league_diamond');
      if (
        legacyDiamond
        && legacyDiamond.unlockedAt !== null
        && ids.has('league_reached_diamond')
        && !normalized.some((state) => state.id === 'league_reached_diamond')
      ) {
        normalized.push({ ...legacyDiamond, id: 'league_reached_diamond' });
        normalizedDirty = true;
      }
      let next = normalized.filter(s => ids.has(s.id));
      const hadObsolete = next.length !== normalized.length;
      const knownIds = new Set(next.map(s => s.id));
      let addedNew = false;
      for (const a of ALL_ACHIEVEMENTS) {
        if (!ids.has(a.id)) continue;
        if (a.retired) continue;
        if (!knownIds.has(a.id)) {
          next.push({ id: a.id, unlockedAt: null, notified: false, shardClaimed: true });
          knownIds.add(a.id);
          addedNew = true;
        }
      }
      let shouldWrite = hadObsolete || addedNew || normalizedDirty;
      const writes: Array<readonly [string, string]> = [];
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
      .filter(a => ids.has(a.id) && !a.retired)
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
    existing.shardClaimed = true;
    return true;
  }
  states.push({ id, unlockedAt: new Date().toISOString(), notified: false, shardClaimed: true });
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

const ACHIEVEMENT_BACKFILL_KEY = 'achievements_progress_backfill_v4';

// Победы по ставкам на свою серию копятся на живом событии wager_win.
const WAGER_WIN_COUNT_KEY = 'achievement_wager_win_count';

const readStoredCounter = async (key: string): Promise<number> => {
  if (key === 'user_total_xp' || key === 'streak_count') {
    await hydratePersonalProgress();
    const progress = getPersonalProgressSnapshot();
    return key === 'user_total_xp' ? progress.totalXp : progress.streakCount;
  }
  return parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
};

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

const ACHIEVEMENT_STREAK_SAFETY_USED_KEY = 'achievement_streak_safety_used_v1';

const markStreakSafetyUsed = async (accountToken: AccountGenerationToken): Promise<void> => {
  const streak = await readStoredCounter('streak_count');
  if (!isCurrentAccountGeneration(accountToken)) return;
  await commitAchievementStoragePairs([[ACHIEVEMENT_STREAK_SAFETY_USED_KEY, JSON.stringify({
    streak,
    day: localDayKey(),
  })]], accountToken);
};

export type AchievementEvent =
  | { type: 'streak';         streak:    number }
  | { type: 'xp';             totalXP:   number }
  | { type: 'lesson_complete'; lessonCount: number; wasPerfect?: boolean; perfectCount?: number; lessonId?: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'lesson_perfect_pass'; lessonId: number; passCount: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'combo';          count: number; studyTarget?: RuntimeStudyTarget }
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
  | { type: 'shards'; balance: number }
  | { type: 'foreground_usage'; totalMs: number }
  | { type: 'active_day'; activeDate: string; previousActiveDate?: string | null }
  | { type: 'shards_spent'; amount: number }
  | {
      type: 'league_result';
      weekId?: string;
      points?: number;
      prevLeagueId?: number;
      myRank: number;
      totalInGroup: number;
      promoted?: boolean;
      newLeagueId?: number;
      confirmed?: boolean;
    }
  | {
      type: 'league_history';
      results: Array<{
        weekId: string;
        points: number;
        prevLeagueId: number;
        newLeagueId: number;
        myRank: number;
        totalInGroup: number;
        confirmed: true;
      }>;
    }
  | { type: 'league_boost'; multiplier: number }
  | { type: 'gem'; level: string; gem: 'ruby' | 'emerald' | 'diamond'; studyTarget?: RuntimeStudyTarget }
  // ── Новые события ────────────────────────────────────────────────────────
  | { type: 'friend_added';   totalFriends: number }
  | { type: 'gift_sent' }
  | { type: 'achievement_liked'; likeTotal?: number }
  | { type: 'mistake_practice_progress'; corrected: number; voiceCorrected: number; independentDays: number; perfectSession?: boolean; studyTarget?: RuntimeStudyTarget }
  | { type: 'avatar_custom_set' }
  | { type: 'profile_theme_set' }
  | { type: 'pack_purchased';  totalPacks: number; studyTarget?: RuntimeStudyTarget }
  | { type: 'achievement_shared'; studyTarget?: RuntimeStudyTarget }
  | { type: 'level_reached';  level: number }
  | { type: 'streak_freeze_used' }
  | { type: 'wager_win_streak'; count: number };

// Старые экраны пока могут отправлять совместимые события, но удалённые награды
// больше не должны ни читать прогресс, ни писать achievement-счётчики.
const FOUNDATION_ACHIEVEMENT_EVENT_TYPES: ReadonlySet<AchievementEvent['type']> = new Set([
  'streak',
  'xp',
  'backfill',
  'shards',
  'foreground_usage',
  'active_day',
  'league_result',
  'league_history',
  'streak_repair',
  'streak_freeze_used',
]);

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

const readCleanStreakDays = async (
  streakDays: number,
  accountToken: AccountGenerationToken,
): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENT_STREAK_SAFETY_USED_KEY);
    if (!isCurrentAccountGeneration(accountToken)) return 0;
    const parsed = raw ? JSON.parse(raw) as { streak?: unknown } : null;
    const lastSafetyStreak = Math.max(0, Math.floor(Number(parsed?.streak) || 0));
    const resolution = resolveCleanStreakDays(streakDays, lastSafetyStreak);
    if (resolution.resetDetected) {
      const cleared = await commitAchievementStoragePairs([[
        ACHIEVEMENT_STREAK_SAFETY_USED_KEY,
        JSON.stringify({ streak: 0, day: '' }),
      ]], accountToken);
      if (!cleared) return 0;
    }
    return isCurrentAccountGeneration(accountToken) ? resolution.cleanStreakDays : 0;
  } catch {
    return isCurrentAccountGeneration(accountToken) ? streakDays : 0;
  }
};

const readActiveDaysTotal = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem('active_days_v1');
    const parsed = raw ? JSON.parse(raw) as { anchor?: unknown; bits?: unknown } : null;
    if (!parsed || typeof parsed.anchor !== 'string' || typeof parsed.bits !== 'string') return 0;
    return decodeActiveDays({ anchor: parsed.anchor, bits: parsed.bits }).size;
  } catch {
    return 0;
  }
};

const readLifetimeActiveDateHistory = async (): Promise<string[]> => {
  const dates = new Set<string>();
  try {
    const pairs = await AsyncStorage.multiGet([
      'active_days_v1',
      'daily_stats',
      'stats_daily_breakdown_v1',
      'phraseman_foreground_daily_ms_v1',
    ]);
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (key === 'active_days_v1') {
          if (parsed && typeof parsed.anchor === 'string' && typeof parsed.bits === 'string') {
            decodeActiveDays({ anchor: parsed.anchor, bits: parsed.bits }).forEach((day) => dates.add(day));
          }
          continue;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        for (const [day, value] of Object.entries(parsed)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
          const hasActivity = typeof value === 'number'
            ? value > 0
            : value && typeof value === 'object'
              ? Object.values(value as Record<string, unknown>).some((entry) => Number(entry) > 0)
              : Number(value) > 0;
          if (hasActivity) dates.add(day);
        }
      } catch { /* one malformed legacy map must not hide the others */ }
    }
  } catch { /* fail-soft */ }
  return [...dates].sort();
};

const reduceFoundationEventProgress = async (
  event: AchievementEvent,
  token: AccountGenerationToken,
): Promise<AchievementFoundationProgressV2> => {
  if (event.type === 'shards') {
    return updateFoundationProgress(
      (current) => reduceFoundationShardBalance(current, event.balance),
      token,
    );
  }
  if (event.type === 'league_result') {
    return updateFoundationProgress(
      (current) => reduceFoundationLeagueResult(current, {
        weekId: event.weekId ?? '',
        points: event.points ?? 0,
        prevLeagueId: event.prevLeagueId ?? event.newLeagueId ?? 0,
        newLeagueId: event.newLeagueId ?? event.prevLeagueId ?? 0,
        myRank: event.myRank,
        totalInGroup: event.totalInGroup,
        confirmed: event.confirmed === true,
      }),
      token,
    );
  }
  if (event.type === 'league_history') {
    return updateFoundationProgress(
      (current) => event.results.slice(0, 1_000).reduce(
        (state, evidence) => reduceFoundationLeagueResult(state, evidence),
        current,
      ),
      token,
    );
  }
  if (event.type === 'active_day') {
    return updateFoundationProgress(
      (current) => reduceFoundationActiveDay(
        current,
        event.activeDate,
        event.previousActiveDate,
      ),
      token,
    );
  }
  if (event.type === 'backfill') {
    const [championCount, diamondPlusWeeks, activeDates] = await Promise.all([
      readStoredCounter('achievement_league_champion_count'),
      readConsecutiveDayStreakValue('achievement_league_diamond_week_streak_v1'),
      readLifetimeActiveDateHistory(),
    ]);
    if (!isCurrentAccountGeneration(token)) return loadFoundationProgress(token);
    return updateFoundationProgress(
      (current) => reduceFoundationActiveDateHistory(
        reduceFoundationLegacyCounters(current, { championCount, diamondPlusWeeks }),
        activeDates,
      ),
      token,
    );
  }
  return loadFoundationProgress(token);
};

const evaluateFoundationSnapshot = async (
  event: AchievementEvent,
  states: readonly AchievementState[],
  progress: AchievementFoundationProgressV2,
  accountToken: AccountGenerationToken,
): Promise<string[]> => {
  const [storedStreak, storedXp, foregroundMs, activeDaysTotal, paidPairs] = await Promise.all([
    readStoredCounter('streak_count'),
    readStoredCounter('user_total_xp'),
    getForegroundUsageMs(),
    readActiveDaysTotal(),
    AsyncStorage.multiGet([ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY]),
  ]);
  const streakDays = event.type === 'streak' ? Math.max(storedStreak, event.streak) : storedStreak;
  const totalXpBeforeAchievementRewards = event.type === 'xp'
    ? Math.max(storedXp, event.totalXP)
    : storedXp;
  const cleanStreakDays = await readCleanStreakDays(streakDays, accountToken);
  const createdAtMs = peekCurrentAccountCreatedAtMs();
  const accountAgeDays = createdAtMs === null
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdAtMs) / 86_400_000));
  const unlockedBeforeBatch = new Set(
    states.filter((state) => state.unlockedAt !== null).map((state) => state.id),
  );

  return evaluateFoundationAchievements({
    streakDays,
    cleanStreakDays,
    totalXpBeforeAchievementRewards,
    maxEligibleShardBalance: progress.maxEligibleShardBalance,
    reachedLeagueIds: progress.reachedLeagueIds,
    championCount: Math.max(progress.legacyChampionCount, progress.championWeeks.length),
    championLeagueIds: progress.championLeagueIds,
    diamondPlusConsecutiveWeeks: progress.diamondPlusConsecutiveWeeks,
    foregroundMs: event.type === 'foreground_usage'
      ? Math.max(foregroundMs, Math.max(0, Math.floor(event.totalMs)))
      : foregroundMs,
    paidAccess: {
      plus: progress.paidAccess.plus || paidPairs[0]?.[1] === 'true',
      pro: progress.paidAccess.pro || paidPairs[1]?.[1] === 'true',
    },
    activeDaysTotal: Math.max(activeDaysTotal, progress.activeDates.length),
    accountAgeDays,
    comebackQualified: progress.comeback?.qualified === true,
    unlockedBeforeBatch,
  });
};

export const checkAchievements = async (
  event: AchievementEvent,
  accountToken?: AccountGenerationToken,
): Promise<Achievement[]> => {
  if (!FOUNDATION_ACHIEVEMENT_EVENT_TYPES.has(event.type)) return [];
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
      const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
      if (!def || def.retired) return;
      if (unlockOne(states, id)) {
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
    if (event.type === 'streak_freeze_used' || event.type === 'streak_repair') {
      await markStreakSafetyUsed(operationToken);
      if (!isCurrentAccountGeneration(operationToken)) return [];
    }

    const backfillMarker = await AsyncStorage.getItem(ACHIEVEMENT_BACKFILL_KEY);
    if (!isCurrentAccountGeneration(operationToken)) return [];
    const progress = await reduceFoundationEventProgress(event, operationToken);
    if (!isCurrentAccountGeneration(operationToken)) return [];
    const eligibleIds = await evaluateFoundationSnapshot(event, states, progress, operationToken);
    if (!isCurrentAccountGeneration(operationToken)) return [];
    const silentBackfill = event.type === 'backfill'
      || event.type === 'league_history'
      || backfillMarker !== '1';
    for (const id of eligibleIds) {
      if (silentBackfill) backfillUnlock(id);
      else u(id);
    }
    if (backfillMarker !== '1') {
      await commitAchievementStoragePairs([[ACHIEVEMENT_BACKFILL_KEY, '1']], operationToken);
      if (!isCurrentAccountGeneration(operationToken)) return [];
    }

    if (justUnlocked.length > 0) {
      // зачем: _achievementLock (локальная цепочка промисов этого модуля) и withStorageLock
      // (глобальный мьютекс storage_mutex) — ДВА независимых замка над одним хранилищем.
      // markAchievementsNotified пишет под вторым, а этот путь писал вообще без него:
      // между чтением states (500 строк выше) и записью notification state мог потеряться,
      // из-за чего тост об уже показанном достижении всплывал повторно.
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
          // оставляем более раннюю метку. Остальные legacy/notification-поля берём из
          // свежего снимка, чтобы не перезаписывать параллельное сохранение.
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
      }
    }
    return justUnlocked;
  } catch (error) {
    // зачем (аудит 2026-08-26): раньше здесь стояло глухое `catch { return [] }`.
    // Любая опечатка внутри 116 строк выдачи гасила достижения и XP У ВСЕХ молча —
    // снаружи это неотличимо от «нечего разблокировать». Теперь отказ виден.
    // Импорт ленивый: файл на горячем пути, а debug-logger тянет app_health.
    void import('./debug-logger')
      .then(({ DebugLogger }) => DebugLogger.error('achievements.ts:checkAchievements', error, 'critical'))
      .catch(() => {});
    return [];
  }
  };
  return isCurrentAccountGeneration(operationToken) ? execute() : [];
  }, []);
};

/**
 * Retired API kept fail-closed for source compatibility with older callers.
 * Historical shardClaimed data and payout journals are intentionally left untouched.
 */
export const claimAchievementShardReward = async (
  achievementId: string,
  accountToken?: AccountGenerationToken,
): Promise<boolean> => {
  void achievementId;
  void accountToken;
  return false;
};

export const hasPendingShardReward = (_state: AchievementState | undefined): boolean => false;

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

export default {};
