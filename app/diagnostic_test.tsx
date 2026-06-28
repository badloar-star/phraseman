import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { checkAchievements } from './achievements';
import { updateMultipleTaskProgress } from './daily_tasks';
import { safeRouterBack } from './navigation_back';
import { loadSettings } from './settings_edu';
import { shuffle } from './utils_shuffle';
import { isCorrectAnswer } from '../constants/contractions';
import { registerXP } from './xp_manager';
import { recordMistakeFromDiagnostic } from './active_recall';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { awardOneTime } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import ClozeGapText from '../components/ClozeGapText';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient, type ThemeMode } from '../constants/theme';
import { loadExamReadinessSnapshot, type ExamReadinessSnapshot, EXAM_LESSON_DONE_THRESHOLD } from './exam_readiness';
import { trackFeatureBlocked, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from './diagnostic_target_gate';
import { diagnosticLastKey, diagnosticOpenFlagKey, lessonProgressKey } from './target_storage_keys';
import { getHomeMenuImages } from './home_menu_icons';

const TIMER_SEC = 30;

const safeDiagnosticEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

const makeDiagnosticAttemptId = (): string =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function examMenuImage(themeMode: ThemeMode) {
  return getHomeMenuImages(themeMode).exam;
}

/** Encabezado del tipo «build»: mismo texto en pantalla y en reportes. */
const DIAGNOSTIC_BUILD_HEADER = {
  ru: '🧩 Собери фразу из слов',
  uk: '🧩 Збери фразу зі слів',
  es: '🧩 Arma la frase con las palabras',
  'pt-BR': '🧩 Monte a frase com as palavras',
  vi: '🧩 Sắp xếp từ thành câu',
  id: '🧩 Susun frasa dari kata-kata',
  tr: '🧩 Kelimelerden ifadeyi kur',
  pl: '🧩 Ułóż frazę ze słów',
} as const;

/** Подписи без эмодзи — для VoiceOver / TalkBack. */
const DIAGNOSTIC_SKILL_A11Y = {
  build: { ru: 'Задание: собрать фразу из слов', uk: 'Завдання: зібрати фразу зі слів', es: 'Tarea: formar la frase con las palabras', 'pt-BR': 'Tarefa: montar a frase com as palavras', vi: 'Nhiệm vụ: sắp xếp từ thành câu', id: 'Tugas: susun frasa dari kata-kata', tr: 'Görev: kelimelerden ifadeyi kur', pl: 'Zadanie: ułóż frazę ze słów' },
  choice4: { ru: 'Задание: выбрать верный вариант', uk: 'Завдання: обрати правильний варіант', es: 'Tarea: elegir la opción correcta', 'pt-BR': 'Tarefa: escolher a opção correta', vi: 'Nhiệm vụ: chọn đáp án đúng', id: 'Tugas: pilih jawaban yang benar', tr: 'Görev: doğru seçeneği seç', pl: 'Zadanie: wybierz poprawną odpowiedź' },
  match: { ru: 'Задание: сопоставить слово и значение', uk: 'Завдання: зіставити слово й значення', es: 'Tarea: relacionar palabra y significado', 'pt-BR': 'Tarefa: relacionar palavra e significado', vi: 'Nhiệm vụ: nối từ với nghĩa', id: 'Tugas: cocokkan kata dan arti', tr: 'Görev: kelimeyle anlamı eşleştir', pl: 'Zadanie: połącz słowo ze znaczeniem' },
  type: { ru: 'Задание: ввести пропущенное слово', uk: 'Завдання: ввести пропущене слово', es: 'Tarea: escribir la palabra que falta', 'pt-BR': 'Tarefa: digitar a palavra que falta', vi: 'Nhiệm vụ: nhập từ còn thiếu', id: 'Tugas: ketik kata yang hilang', tr: 'Görev: eksik kelimeyi yaz', pl: 'Zadanie: wpisz brakujące słowo' },
} as const;

function diagnosticBuildHeader(lang: Lang): string {
  return triLang(lang, {
    ru: DIAGNOSTIC_BUILD_HEADER.ru,
    uk: DIAGNOSTIC_BUILD_HEADER.uk,
    es: DIAGNOSTIC_BUILD_HEADER.es,
    'pt-BR': '🧩 Monte a frase com as palavras',
    vi: '🧩 Sắp xếp từ thành câu',
    id: '🧩 Susun frasa dari kata-kata',
    tr: '🧩 Kelimelerden ifadeyi kur',
    pl: '🧩 Ułóż frazę ze słów',
  });
}

function diagnosticSkillA11y(lang: Lang, kind: keyof typeof DIAGNOSTIC_SKILL_A11Y): string {
  const copy = DIAGNOSTIC_SKILL_A11Y[kind];
  const planned = {
    build: {
      'pt-BR': 'Tarefa: montar a frase com as palavras',
      vi: 'Nhiệm vụ: sắp xếp từ thành câu',
      id: 'Tugas: susun frasa dari kata-kata',
      tr: 'Görev: kelimelerden ifadeyi kur',
      pl: 'Zadanie: ułóż frazę ze słów',
    },
    choice4: {
      'pt-BR': 'Tarefa: escolher a opção correta',
      vi: 'Nhiệm vụ: chọn đáp án đúng',
      id: 'Tugas: pilih jawaban yang benar',
      tr: 'Görev: doğru seçeneği seç',
      pl: 'Zadanie: wybierz poprawną odpowiedź',
    },
    match: {
      'pt-BR': 'Tarefa: relacionar palavra e significado',
      vi: 'Nhiệm vụ: nối từ với nghĩa',
      id: 'Tugas: cocokkan kata dan arti',
      tr: 'Görev: kelimeyle anlamı eşleştir',
      pl: 'Zadanie: połącz słowo ze znaczeniem',
    },
    type: {
      'pt-BR': 'Tarefa: digitar a palavra que falta',
      vi: 'Nhiệm vụ: nhập từ còn thiếu',
      id: 'Tugas: ketik kata yang hilang',
      tr: 'Görev: eksik kelimeyi yaz',
      pl: 'Zadanie: wpisz brakujące słowo',
    },
  }[kind];
  return triLang(lang, {
    ru: copy.ru,
    uk: copy.uk,
    es: copy.es,
    'pt-BR': planned['pt-BR'],
    vi: planned.vi,
    id: planned.id,
    tr: planned.tr,
    pl: planned.pl,
  });
}

function diagnosticUiCopy(lang: Lang) {
  return {
    loadError: triLang(lang, {
      ru: 'Вопросы не загрузились. Проверь сеть и попробуй снова.',
      uk: 'Не вдалося завантажити питання. Спробуй пізніше.',
      es: 'No se pudieron cargar las preguntas. Inténtalo más tarde.',
      'pt-BR': 'Não foi possível carregar as perguntas. Tente novamente mais tarde.',
      vi: 'Không thể tải câu hỏi. Hãy thử lại sau.',
      id: 'Pertanyaan tidak dapat dimuat. Coba lagi nanti.',
      tr: 'Sorular yüklenemedi. Daha sonra tekrar dene.',
      pl: 'Nie udało się wczytać pytań. Spróbuj później.',
    }),
    back: triLang(lang, {
      ru: 'Вернуться',
      uk: 'Повернутися',
      es: 'Volver',
      'pt-BR': 'Voltar',
      vi: 'Quay lại',
      id: 'Kembali',
      tr: 'Geri',
      pl: 'Wstecz',
    }),
    cancel: triLang(lang, {
      ru: 'Отменить',
      uk: 'Відмінити',
      es: 'Cancelar',
      'pt-BR': 'Cancelar',
      vi: 'Hủy',
      id: 'Batal',
      tr: 'İptal',
      pl: 'Anuluj',
    }),
    continue: triLang(lang, {
      ru: 'Продолжить',
      uk: 'Далі',
      es: 'Siguiente',
      'pt-BR': 'Continuar',
      vi: 'Tiếp tục',
      id: 'Lanjutkan',
      tr: 'Devam et',
      pl: 'Kontynuuj',
    }),
    buildPlaceholder: triLang(lang, {
      ru: 'Тапни слово снизу...',
      uk: 'Торкнись слова нижче...',
      es: 'Toca una palabra abajo...',
      'pt-BR': 'Toque em uma palavra abaixo...',
      vi: 'Chạm vào một từ bên dưới...',
      id: 'Ketuk kata di bawah...',
      tr: 'Aşağıdaki bir kelimeye dokun...',
      pl: 'Dotknij słowa poniżej...',
    }),
    check: triLang(lang, {
      ru: 'Проверить',
      uk: 'Перевірити',
      es: 'Comprobar',
      'pt-BR': 'Verificar',
      vi: 'Kiểm tra',
      id: 'Periksa',
      tr: 'Kontrol et',
      pl: 'Sprawdź',
    }),
    typeHere: triLang(lang, {
      ru: 'Введи ответ...',
      uk: 'Введи відповідь...',
      es: 'Escribe aquí...',
      'pt-BR': 'Digite aqui...',
      vi: 'Nhập câu trả lời...',
      id: 'Ketik jawaban...',
      tr: 'Yanıtı yaz...',
      pl: 'Wpisz odpowiedź...',
    }),
    correctAnswerPrefix: triLang(lang, {
      ru: 'Правильный ответ',
      uk: 'Правильна відповідь',
      es: 'Respuesta correcta',
      'pt-BR': 'Resposta correta',
      vi: 'Đáp án đúng',
      id: 'Jawaban benar',
      tr: 'Doğru cevap',
      pl: 'Poprawna odpowiedź',
    }),
    options: triLang(lang, {
      ru: 'Варианты',
      uk: 'Варіанти',
      es: 'Opciones',
      'pt-BR': 'Opções',
      vi: 'Lựa chọn',
      id: 'Pilihan',
      tr: 'Seçenekler',
      pl: 'Opcje',
    }),
    skip: triLang(lang, {
      ru: 'Пропустить',
      uk: 'Пропустити',
      es: 'Omitir',
      'pt-BR': 'Pular',
      vi: 'Bỏ qua',
      id: 'Lewati',
      tr: 'Atla',
      pl: 'Pomiń',
    }),
    secondSuffix: triLang(lang, {
      ru: 'с',
      uk: 'с',
      es: 's',
      'pt-BR': 's',
      vi: ' giây',
      id: ' dtk',
      tr: ' sn',
      pl: ' s',
    }),
  };
}

type QType = 'fill' | 'build' | 'choice4' | 'type' | 'match';

interface Question {
  phrase:  string;
  hintRU:  string;
  hintUK:  string;
  hintES:  string;
  hintPTBR?: string;
  hintVI?: string;
  hintID?: string;
  hintTR?: string;
  hintPL?: string;
  opts:    string[];
  optsUK?: string[];
  optsES?: string[];
  correct: number;
  level:   'A1'|'A2'|'B1'|'B2'|'C1';
  type?:   QType;
  words?:  string[];
  answer?: string;
}

const DIAGNOSTIC_PLANNED_OPTIONS: Record<string, Record<PlannedInterfaceLang, string[]>> = {
  'What does "book" mean?': {
    'pt-BR': ['livro', 'casa', 'mesa', 'cadeira'],
    vi: ['sách', 'nhà', 'bàn', 'ghế'],
    id: ['buku', 'rumah', 'meja', 'kursi'],
    tr: ['kitap', 'ev', 'masa', 'sandalye'],
    pl: ['książka', 'dom', 'stół', 'krzesło'],
  },
  'What does "water" mean?': {
    'pt-BR': ['fogo', 'água', 'terra', 'ar'],
    vi: ['lửa', 'nước', 'đất', 'không khí'],
    id: ['api', 'air', 'tanah', 'udara'],
    tr: ['ateş', 'su', 'toprak', 'hava'],
    pl: ['ogień', 'woda', 'ziemia', 'powietrze'],
  },
  'What does "friend" mean?': {
    'pt-BR': ['inimigo', 'colega', 'amigo', 'professor'],
    vi: ['kẻ thù', 'đồng nghiệp', 'bạn', 'giáo viên'],
    id: ['musuh', 'rekan kerja', 'teman', 'guru'],
    tr: ['düşman', 'meslektaş', 'arkadaş', 'öğretmen'],
    pl: ['wróg', 'kolega', 'przyjaciel', 'nauczyciel'],
  },
  'What does "happy" mean?': {
    'pt-BR': ['triste', 'com raiva', 'cansado', 'feliz'],
    vi: ['buồn', 'tức giận', 'mệt', 'hạnh phúc'],
    id: ['sedih', 'marah', 'lelah', 'bahagia'],
    tr: ['üzgün', 'kızgın', 'yorgun', 'mutlu'],
    pl: ['smutny', 'zły', 'zmęczony', 'szczęśliwy'],
  },
  'What does "small" mean?': {
    'pt-BR': ['grande', 'médio', 'velho', 'pequeno'],
    vi: ['lớn', 'trung bình', 'cũ', 'nhỏ'],
    id: ['besar', 'sedang', 'tua', 'kecil'],
    tr: ['büyük', 'orta', 'eski', 'küçük'],
    pl: ['duży', 'średni', 'stary', 'mały'],
  },
  'What does "father" mean?': {
    'pt-BR': ['mãe', 'pai', 'irmão', 'filha'],
    vi: ['mẹ', 'cha', 'anh/em trai', 'con gái'],
    id: ['ibu', 'ayah', 'saudara laki-laki', 'anak perempuan'],
    tr: ['anne', 'baba', 'erkek kardeş', 'kız evlat'],
    pl: ['matka', 'ojciec', 'brat', 'córka'],
  },
  'What does "night" mean?': {
    'pt-BR': ['manhã', 'noite', 'tarde', 'dia'],
    vi: ['buổi sáng', 'đêm', 'buổi tối', 'ngày'],
    id: ['pagi', 'malam', 'sore', 'hari'],
    tr: ['sabah', 'gece', 'akşam', 'gün'],
    pl: ['poranek', 'noc', 'wieczór', 'dzień'],
  },
  'What does "good" mean?': {
    'pt-BR': ['ruim', 'bom', 'triste', 'com raiva'],
    vi: ['xấu', 'tốt', 'buồn', 'tức giận'],
    id: ['buruk', 'baik', 'sedih', 'marah'],
    tr: ['kötü', 'iyi', 'üzgün', 'kızgın'],
    pl: ['zły', 'dobry', 'smutny', 'zagniewany'],
  },
  'What does "dog" mean?': {
    'pt-BR': ['cachorro', 'gato', 'cavalo', 'pássaro'],
    vi: ['chó', 'mèo', 'ngựa', 'chim'],
    id: ['anjing', 'kucing', 'kuda', 'burung'],
    tr: ['köpek', 'kedi', 'at', 'kuş'],
    pl: ['pies', 'kot', 'koń', 'ptak'],
  },
  'What does "window" mean?': {
    'pt-BR': ['parede', 'porta', 'janela', 'chão'],
    vi: ['tường', 'cửa ra vào', 'cửa sổ', 'sàn nhà'],
    id: ['dinding', 'pintu', 'jendela', 'lantai'],
    tr: ['duvar', 'kapı', 'pencere', 'zemin'],
    pl: ['ściana', 'drzwi', 'okno', 'podłoga'],
  },
  'What does "tired" mean?': {
    'pt-BR': ['com fome', 'alegre', 'cansado', 'com raiva'],
    vi: ['đói', 'vui vẻ', 'mệt', 'tức giận'],
    id: ['lapar', 'gembira', 'lelah', 'marah'],
    tr: ['aç', 'neşeli', 'yorgun', 'kızgın'],
    pl: ['głodny', 'radosny', 'zmęczony', 'zły'],
  },
  'What does "quickly" mean?': {
    'pt-BR': ['devagar', 'em voz alta', 'em voz baixa', 'rapidamente'],
    vi: ['chậm', 'to tiếng', 'nhỏ tiếng', 'nhanh'],
    id: ['pelan', 'keras', 'lirih', 'cepat'],
    tr: ['yavaşça', 'yüksek sesle', 'kısık sesle', 'hızlıca'],
    pl: ['wolno', 'głośno', 'cicho', 'szybko'],
  },
  'What does "buy" mean?': {
    'pt-BR': ['vender', 'encontrar', 'comprar', 'perder'],
    vi: ['bán', 'tìm thấy', 'mua', 'mất'],
    id: ['menjual', 'menemukan', 'membeli', 'kehilangan'],
    tr: ['satmak', 'bulmak', 'satın almak', 'kaybetmek'],
    pl: ['sprzedawać', 'znajdować', 'kupować', 'tracić'],
  },
  'What does "always" mean?': {
    'pt-BR': ['nunca', 'às vezes', 'raramente', 'sempre'],
    vi: ['không bao giờ', 'đôi khi', 'hiếm khi', 'luôn luôn'],
    id: ['tidak pernah', 'kadang-kadang', 'jarang', 'selalu'],
    tr: ['asla', 'bazen', 'nadiren', 'her zaman'],
    pl: ['nigdy', 'czasami', 'rzadko', 'zawsze'],
  },
  'What does "late" mean?': {
    'pt-BR': ['cedo', 'por muito tempo', 'com frequência', 'tarde'],
    vi: ['sớm', 'lâu', 'thường xuyên', 'muộn'],
    id: ['awal', 'lama', 'sering', 'terlambat'],
    tr: ['erken', 'uzun süre', 'sık sık', 'geç'],
    pl: ['wcześnie', 'długo', 'często', 'późno'],
  },
  'What does "loud" mean?': {
    'pt-BR': ['baixo', 'alto/em voz alta', 'rápido', 'estreito'],
    vi: ['nhỏ tiếng', 'to tiếng', 'nhanh', 'hẹp'],
    id: ['pelan', 'keras/nyaring', 'cepat', 'sempit'],
    tr: ['sessiz', 'yüksek sesli', 'hızlı', 'dar'],
    pl: ['cicho', 'głośno', 'szybko', 'wąsko'],
  },
  'What does "hungry" mean?': {
    'pt-BR': ['saciado', 'saboroso', 'com fome', 'doce'],
    vi: ['no', 'ngon', 'đói', 'ngọt'],
    id: ['kenyang', 'enak', 'lapar', 'manis'],
    tr: ['tok', 'lezzetli', 'aç', 'tatlı'],
    pl: ['syty', 'smaczny', 'głodny', 'słodki'],
  },
  'What does "necessary" mean?': {
    'pt-BR': ['impossível', 'necessário/indispensável', 'desnecessário', 'fácil'],
    vi: ['bất khả thi', 'cần thiết', 'thừa', 'dễ'],
    id: ['mustahil', 'perlu/wajib', 'berlebihan', 'mudah'],
    tr: ['imkânsız', 'gerekli/zorunlu', 'gereksiz', 'kolay'],
    pl: ['niemożliwy', 'konieczny/niezbędny', 'zbędny', 'łatwy'],
  },
  'She has been working here for years.': {
    'pt-BR': ['Ela trabalha aqui há anos', 'Ela trabalhava aqui há anos', 'Ela vai trabalhar aqui', 'Ela trabalharia aqui'],
    vi: ['Cô ấy đã làm việc ở đây nhiều năm', 'Cô ấy từng làm việc ở đây nhiều năm', 'Cô ấy sẽ làm việc ở đây', 'Cô ấy sẽ làm việc ở đây nếu có điều kiện'],
    id: ['Dia sudah bekerja di sini selama bertahun-tahun', 'Dia dulu bekerja di sini selama bertahun-tahun', 'Dia akan bekerja di sini', 'Dia akan bekerja di sini jika memungkinkan'],
    tr: ['Yıllardır burada çalışıyor', 'Yıllarca burada çalıştı', 'Burada çalışacak', 'Burada çalışırdı'],
    pl: ['Pracuje tu od lat', 'Pracowała tu latami', 'Będzie tu pracować', 'Pracowałaby tu'],
  },
  'The report must be submitted by Friday.': {
    'pt-BR': ['O relatório pode ser entregue na sexta-feira', 'O relatório deve ser entregue até sexta-feira', 'O relatório foi entregue na sexta-feira', 'Vão entregar o relatório na sexta-feira'],
    vi: ['Báo cáo có thể được nộp vào thứ Sáu', 'Báo cáo phải được nộp trước thứ Sáu', 'Báo cáo đã được nộp vào thứ Sáu', 'Họ sẽ nộp báo cáo vào thứ Sáu'],
    id: ['Laporan boleh diserahkan pada hari Jumat', 'Laporan harus diserahkan sebelum hari Jumat', 'Laporan diserahkan pada hari Jumat', 'Mereka akan menyerahkan laporan pada hari Jumat'],
    tr: ['Rapor cuma günü teslim edilebilir', 'Rapor cuma gününe kadar teslim edilmelidir', 'Rapor cuma günü teslim edildi', 'Raporu cuma günü teslim edecekler'],
    pl: ['Raport można złożyć w piątek', 'Raport musi zostać złożony do piątku', 'Raport został złożony w piątek', 'Złożą raport w piątek'],
  },
  'Hardly had she arrived when they left.': {
    'pt-BR': ['Mal ela chegou, eles foram embora', 'Ela chegou e eles foram embora', 'Ela não queria chegar', 'Eles foram embora antes de ela chegar'],
    vi: ['Cô ấy vừa đến thì họ rời đi', 'Cô ấy đến và họ rời đi', 'Cô ấy không muốn đến', 'Họ rời đi trước khi cô ấy đến'],
    id: ['Baru saja dia tiba, mereka pergi', 'Dia tiba dan mereka pergi', 'Dia tidak ingin datang', 'Mereka pergi sebelum dia tiba'],
    tr: ['O gelir gelmez onlar ayrıldı', 'O geldi ve onlar ayrıldı', 'Gelmek istemedi', 'O gelmeden önce ayrıldılar'],
    pl: ['Ledwie przybyła, a oni wyszli', 'Przybyła i oni wyszli', 'Nie chciała przyjść', 'Wyszli przed jej przybyciem'],
  },
  'She would rather stay home than go out.': {
    'pt-BR': ['Ela não pode ficar em casa', 'Ela preferiria ficar em casa', 'Ela não vai para casa', 'Ela vai passear'],
    vi: ['Cô ấy không thể ở nhà', 'Cô ấy thà ở nhà hơn', 'Cô ấy không về nhà', 'Cô ấy đi dạo'],
    id: ['Dia tidak bisa tinggal di rumah', 'Dia lebih suka tinggal di rumah', 'Dia tidak pulang', 'Dia pergi jalan-jalan'],
    tr: ['Evde kalamaz', 'Evde kalmayı tercih ederdi', 'Eve gitmiyor', 'Dışarı yürüyüşe çıkıyor'],
    pl: ['Nie może zostać w domu', 'Wolałaby zostać w domu', 'Nie idzie do domu', 'Idzie na spacer'],
  },
};

function isPlannedDiagnosticLang(lang: Lang): lang is PlannedInterfaceLang {
  return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl';
}

function diagnosticQuestionOptions(lang: Lang, q?: Question): string[] {
  if (!q) return [];
  if (isPlannedDiagnosticLang(lang)) {
    return DIAGNOSTIC_PLANNED_OPTIONS[q.phrase]?.[lang] ?? q.opts;
  }
  let selectedOptions = q.opts;
  if (lang === 'uk' && q.optsUK) selectedOptions = q.optsUK;
  if (lang === 'es' && q.optsES) selectedOptions = q.optsES;
  return selectedOptions;
}

/** Стабильный id для агрегации оценок (не зависит от порядка после shuffle). */
function diagnosticContentRatingItemId(q: Question): string {
  const typ = q.type ?? 'choice4';
  if (q.type === 'build' && q.answer) {
    return `diag_build_${q.answer.replace(/\s+/g, '_').slice(0, 150)}`;
  }
  return `diag_${typ}_${q.phrase.replace(/\s+/g, '_').slice(0, 120)}_c${q.correct}_${q.level}`;
}

function diagnosticQuestionHint(lang: Lang, q: Question): string {
  return triLang(lang, {
    ru: q.hintRU,
    uk: q.hintUK,
    es: q.hintES,
    'pt-BR': q.hintPTBR ?? q.hintES,
    vi: q.hintVI ?? q.hintES,
    id: q.hintID ?? q.hintES,
    tr: q.hintTR ?? q.hintES,
    pl: q.hintPL ?? q.hintES,
  });
}

const POOL: Question[] = [
  // ── A1: To Be ────────────────────────────────────────────────────────────
  {phrase:'She ___ a teacher.',            hintRU:'Она ___ учитель.',            hintUK:'Вона ___ вчитель.',         hintES:'Ella ___ profesora.', opts:['am','is','are','be'],                  correct:1, level:'A1'},
  {phrase:'We ___ at home.',               hintRU:'Мы ___ дома.',                hintUK:'Ми ___ вдома.',             hintES:'Nosotros ___ en casa.', opts:['is','am','are','be'],                  correct:2, level:'A1'},
  {phrase:'I ___ not tired.',              hintRU:'Я ___ не устал.',              hintUK:'Я ___ не втомився.',        hintES:'Yo no ___ cansado.', opts:['is','am','are','be'],                  correct:1, level:'A1'},
  {phrase:'This ___ a cat.',               hintRU:'Это ___ кошка.',               hintUK:'Це ___ кішка.',             hintES:'Esto ___ un gato.', opts:['am','are','is','be'],                  correct:2, level:'A1'},
  {phrase:'They ___ students.',            hintRU:'Они ___ студенты.',            hintUK:'Вони ___ студенти.',        hintES:'Ellos ___ estudiantes.', opts:['is','am','are','be'],                  correct:2, level:'A1'},
  {phrase:'Who ___ you?',                  hintRU:'Кто ___ ты?',                 hintUK:'Хто ___ ти?',               hintES:'¿Quién ___ tú?', opts:['am','is','are','be'],                  correct:2, level:'A1'},
  {phrase:'He ___ not a doctor.',          hintRU:'Он ___ не врач.',              hintUK:'Він ___ не лікар.',         hintES:'Él no ___ médico.', opts:['am','is','are','be'],                  correct:1, level:'A1'},
  {phrase:'We ___ not at home.',           hintRU:'Мы ___ не дома.',              hintUK:'Ми ___ не вдома.',          hintES:'Nosotros no ___ en casa.', opts:['is','am','are','be'],                  correct:2, level:'A1'},
  // A1: Articles
  {phrase:'I am ___ engineer.',            hintRU:'Я ___ инженер.',               hintUK:'Я ___ інженер.',            hintES:'Soy ___ ingeniero.', opts:['a','an','the','—'],                    correct:1, level:'A1'},
  {phrase:'She is ___ teacher.',           hintRU:'Она ___ учитель.',             hintUK:'Вона ___ вчитель.',         hintES:'Ella es ___ profesora.', opts:['a','an','the','—'],                    correct:0, level:'A1'},
  {phrase:'He loves ___ sun.',             hintRU:'Он любит ___ солнце.',         hintUK:'Він любить ___ сонце.',     hintES:'Él ama ___ sol.', opts:['a','an','the','—'],                    correct:2, level:'A1'},
  {phrase:'___ apple a day keeps doctors away.',hintRU:'___ яблоко в день...',    hintUK:'___ яблуко на день...',     hintES:'___ manzana al día...', opts:['A','An','The','—'],                    correct:1, level:'A1'},
  // A1: Basic pronouns & possessives
  {phrase:'___ name is Anna.',             hintRU:'___ имя — Анна.',              hintUK:'___ ім\'я — Анна.',          hintES:'___ nombre es Anna.', opts:['Her','She','His','Him'],               correct:0, level:'A1'},
  {phrase:'This is ___ book.',             hintRU:'Это ___ книга.',               hintUK:'Це ___ книга.',             hintES:'Este es ___ libro.', opts:['my','me','I','mine'],                  correct:0, level:'A1'},
  {phrase:'___ are ready.',                hintRU:'___ готовы.',                  hintUK:'___ готові.',               hintES:'___ listos.', opts:['We','Our','Us','Ours'],                correct:0, level:'A1'},
  // A1: Match — English→translation
  {phrase:'What does "book" mean?',        hintRU:'Что значит «book»?',           hintUK:'Що значить «book»?',        hintES:'¿Qué significa «book»?', opts:['книга','дом','стол','стул'],           optsUK:['книга','дім','стіл','стілець'],          optsES:['libro','casa','mesa','silla'],          correct:0, level:'A1', type:'match'},
  {phrase:'What does "water" mean?',       hintRU:'Что значит «water»?',          hintUK:'Що значить «water»?',       hintES:'¿Qué significa «water»?', opts:['огонь','вода','земля','воздух'],       optsUK:['вогонь','вода','земля','повітря'],       optsES:['fuego','agua','tierra','aire'],       correct:1, level:'A1', type:'match'},
  {phrase:'What does "friend" mean?',      hintRU:'Что значит «friend»?',         hintUK:'Що значить «friend»?',      hintES:'¿Qué significa «friend»?', opts:['враг','коллега','друг','учитель'],     optsUK:['ворог','колега','друг','вчитель'],       optsES:['enemigo','compañero','amigo','profesor'],       correct:2, level:'A1', type:'match'},
  {phrase:'What does "happy" mean?',       hintRU:'Что значит «happy»?',          hintUK:'Що значить «happy»?',       hintES:'¿Qué significa «happy»?', opts:['грустный','злой','усталый','счастливый'],optsUK:['сумний','злий','втомлений','щасливий'],optsES:['triste','enfadado','cansado','feliz'],correct:3, level:'A1', type:'match'},
  {phrase:'What does "small" mean?',       hintRU:'Что значит «small»?',          hintUK:'Що значить «small»?',       hintES:'¿Qué significa «small»?', opts:['большой','средний','старый','маленький'],optsUK:['великий','середній','старий','маленький'],optsES:['grande','mediano','viejo','pequeño'],correct:3, level:'A1', type:'match'},
  {phrase:'It ___ sunny and warm today.',  hintRU:'Сегодня ___ солнечно и тепло.',  hintUK:'Сьогодні ___ сонячно і тепло.', hintES:'Hoy ___ buen tiempo (sol y calor).', opts:['am','is','are','be'],              correct:1, level:'A1'},
  {phrase:'I ___ 12 years old.',            hintRU:'Мне ___ 12 лет.',               hintUK:'Мені ___ 12 років.',         hintES:'Tengo 12 años.', opts:['am','is','are','be'],                 correct:0, level:'A1'},
  {phrase:'What does "father" mean?',       hintRU:'Что значит «father»?',         hintUK:'Що значить «father»?',       hintES:'¿Qué significa «father»?', opts:['мать','отец','брат','дочь'],        optsUK:['мати','батько','брат','донька'],         optsES:['madre','padre','hermano','hija'],         correct:1, level:'A1', type:'match'},
  {phrase:'___ books are on the table.',   hintRU:'___ книги на столе.',          hintUK:'___ книжки на столі.',         hintES:'___ libros están en la mesa.', opts:['This','That','These','Those'],     correct:2, level:'A1'},
  {phrase:'How ___ you?',                  hintRU:'Как ___, как дела?',          hintUK:'Як ___, як справи?',          hintES:'¿Cómo ___?', opts:['am','is','are','be'],                 correct:2, level:'A1'},
  {phrase:'There ___ two keys here.',     hintRU:'___ два ключа здесь.',         hintUK:'___ два ключі тут.',          hintES:'___ dos llaves aquí.', opts:['am','is','are','be'],                 correct:2, level:'A1'},
  {phrase:'I need ___ hour to sleep.',     hintRU:'Мне нужен ___ час отдыха.',    hintUK:'Мені потрібна ___ година відпочинку.', hintES:'Necesito ___ hora para dormir.', opts:['a','an','the','—'],                    correct:1, level:'A1'},
  {phrase:'I have ___ old cat.',            hintRU:'У меня ___ старый кот.',        hintUK:'У мене ___ старий кіт.',      hintES:'Tengo ___ gato viejo.', opts:['a','an','the','—'],                    correct:1, level:'A1'},
  {phrase:'My parents ___ at work.',       hintRU:'Мои родители ___ на работе.',  hintUK:'Мої батьки ___ на роботі.', hintES:'Mis padres ___ en el trabajo.', opts:['am','is','are','be'],                 correct:2, level:'A1'},
  {phrase:'___ this your car?',            hintRU:'___ это твоя машина?',         hintUK:'___ це твоя машина?',        hintES:'¿___ este tu coche?', opts:['Is','Are','Am','Be'],                 correct:0, level:'A1'},
  {phrase:'I ___ a student in this class.', hintRU:'Я ___ ученик в этом классе.', hintUK:'Я ___ учень у цьому класі.',  hintES:'Yo ___ estudiante en esta clase.', opts:['am','is','are','be'],                 correct:0, level:'A1'},
  {phrase:'A cat ___ a long tail.',        hintRU:'У кошки ___ длинный хвост.',   hintUK:'У кота ___ довгий хвіст.',   hintES:'Un gato ___ cola larga.', opts:['have','has','is','are'],             correct:1, level:'A1'},
  {phrase:'What does "night" mean?',       hintRU:'Что значит «night»?',          hintUK:'Що значить «night»?',         hintES:'¿Qué significa «night»?', opts:['утро','ночь','вечер','день'],        optsUK:['ранок','ніч','вечір','день'],            optsES:['mañana','noche','tarde','día'],            correct:1, level:'A1', type:'match'},
  {phrase:'What does "good" mean?',        hintRU:'Что значит «good»?',            hintUK:'Що значить «good»?',          hintES:'¿Qué significa «good»?', opts:['плохой','хороший','грустный','злой'], optsUK:['поганий','добрий','сумний','злий'],      optsES:['malo','bueno','triste','enfadado'],      correct:1, level:'A1', type:'match'},
  {phrase:'What does "dog" mean?',         hintRU:'Что значит «dog»?',            hintUK:'Що значить «dog»?',           hintES:'¿Qué significa «dog»?', opts:['собака','кошка','лошадь','птица'],     optsUK:['собака','кіт','кінь','птах'],           optsES:['perro','gato','caballo','pájaro'],           correct:0, level:'A1', type:'match'},
  {phrase:'I ___ a new phone. He has a tablet.', hintRU:'У меня ___ новый телефон.', hintUK:'У мене ___ новий телефон.',  hintES:'Yo ___ un móvil nuevo.', opts:['have','has','is','am'],        correct:0, level:'A1'},
  {phrase:'What does "window" mean?',       hintRU:'Что значит «window»?',         hintUK:'Що значить «window»?',       hintES:'¿Qué significa «window»?', opts:['стена','дверь','окно','пол'],          optsUK:['стіна','двері','вікно','підлога'],   optsES:['pared','puerta','ventana','suelo'],   correct:2, level:'A1', type:'match'},

  // ── A2: Present Simple ────────────────────────────────────────────────────
  {phrase:'She ___ every day.',            hintRU:'Она ___ каждый день.',         hintUK:'Вона ___ щодня.',           hintES:'Ella ___ todos los días.', opts:['work','works','worked','working'],      correct:1, level:'A2'},
  {phrase:'They ___ not understand.',      hintRU:'Они ___ не понимают.',         hintUK:'Вони ___ не розуміють.',    hintES:'Ellos no entienden.', opts:['does','do','did','doing'],             correct:1, level:'A2'},
  {phrase:'He ___ football.',              hintRU:'Он ___ в футбол.',             hintUK:'Він ___ у футбол.',         hintES:'Él ___ al fútbol.', opts:['play','plays','played','playing'],      correct:1, level:'A2'},
  {phrase:'I ___ to school.',              hintRU:'Я ___ в школу.',               hintUK:'Я ___ до школи.',           hintES:'Yo ___ al cole.', opts:['go','goes','went','going'],             correct:0, level:'A2'},
  {phrase:'She ___ English.',              hintRU:'Она ___ по-английски.',        hintUK:'Вона ___ англійською.',     hintES:'Ella ___ inglés.', opts:['speak','speaks','spoke','speaking'],    correct:1, level:'A2'},
  {phrase:'We ___ not know.',              hintRU:'Мы ___ не знаем.',             hintUK:'Ми ___ не знаємо.',         hintES:'Nosotros no lo sabemos.', opts:['does','do','did','doing'],             correct:1, level:'A2'},
  {phrase:'He ___ not smoke.',             hintRU:'Он ___ не курит.',             hintUK:'Він ___ не курить.',        hintES:'Él no fuma.', opts:['do','does','did','doing'],             correct:1, level:'A2'},
  {phrase:'They ___ in London.',           hintRU:'Они ___ в Лондоне.',           hintUK:'Вони ___ у Лондоні.',       hintES:'Ellos ___ en Londres.', opts:['live','lives','lived','living'],        correct:0, level:'A2'},
  // A2: Have/Has
  {phrase:'She ___ a new car.',            hintRU:'У неё ___ новая машина.',      hintUK:'У неї ___ нова машина.',    hintES:'Ella ___ un coche nuevo.', opts:['have','has','had','having'],           correct:1, level:'A2'},
  {phrase:'I ___ two brothers.',           hintRU:'У меня ___ два брата.',        hintUK:'У мене ___ два брати.',     hintES:'Yo ___ dos hermanos.', opts:['have','has','had','having'],           correct:0, level:'A2'},
  // A2: There is/are
  {phrase:'There ___ a book on the table.',hintRU:'___ книга на столе.',          hintUK:'___ книга на столі.',       hintES:'___ un libro en la mesa.', opts:['are','am','is','be'],                  correct:2, level:'A2'},
  {phrase:'There ___ many people here.',   hintRU:'___ много людей здесь.',       hintUK:'___ багато людей тут.',     hintES:'___ mucha gente aquí.', opts:['is','am','are','be'],                  correct:2, level:'A2'},
  // A2: Past simple regular
  {phrase:'She ___ the letter yesterday.', hintRU:'Она ___ письмо вчера.',        hintUK:'Вона ___ листа вчора.',     hintES:'Ella ___ la carta ayer.', opts:['sends','sent','send','sending'],       correct:1, level:'A2'},
  {phrase:'They ___ football last week.',  hintRU:'Они ___ в футбол на прошлой неделе.',hintUK:'Вони ___ у футбол минулого тижня.',hintES:'Ellos ___ al fútbol la semana pasada.',opts:['play','plays','played','playing'],correct:2, level:'A2'},
  {phrase:'I ___ him yesterday.',          hintRU:'Я ___ ему вчера.',             hintUK:'Я ___ йому вчора.',         hintES:'Ayer ___ (a él) → past simple: «called».', opts:['call','calls','called','calling'],      correct:2, level:'A2'},
  // A2: Prepositions
  {phrase:"I wake up ___ 7 o\'clock.",      hintRU:'Я просыпаюсь ___ 7 часов.',    hintUK:'Я прокидаюсь ___ 7 годині.',hintES:'Me levanto ___ las 7.',opts:['in','on','at','by'],                  correct:2, level:'A2'},
  {phrase:'She was born ___ Monday.',      hintRU:'Она родилась ___ понедельник.',hintUK:'Вона народилася ___ понеділок.',hintES:'Nació ___ un lunes.',opts:['in','on','at','by'],               correct:1, level:'A2'},
  {phrase:'He lives ___ London.',          hintRU:'Он живёт ___ Лондоне.',        hintUK:'Він живе ___ Лондоні.',     hintES:'Vive ___ Londres.', opts:['in','on','at','by'],                  correct:0, level:'A2'},
  // A2: Future (will/going to)
  {phrase:'She ___ come tomorrow.',        hintRU:'Она придёт завтра.',            hintUK:'Вона прийде завтра.',       hintES:'Ella ___ venir mañana.', opts:['will','would','shall','is'],           correct:0, level:'A2'},
  {phrase:'I ___ going to study tonight.', hintRU:'Сегодня вечером я ___ подучиться.', hintUK:'Сьогодні ввечері я ___ повчитися.', hintES:'I ___ going to… → «am» (be going to).', opts:['am','is','are','be'],            correct:0, level:'A2'},
  {phrase:'It ___ rain tomorrow.',         hintRU:'Завтра пойдёт дождь.',         hintUK:'Завтра йтиме дощ.',          hintES:'Mañana lloverá.', opts:['will','would','is going to','shall'],  correct:0, level:'A2'},
  // A2: Match vocabulary
  {phrase:'What does "tired" mean?',       hintRU:'Что значит «tired»?',          hintUK:'Що значить «tired»?',       hintES:'¿Qué significa «tired»?', opts:['голодный','радостный','усталый','злой'],   optsUK:['голодний','радісний','втомлений','злий'],   optsES:['hambriento','alegre','cansado','enfadado'],   correct:2, level:'A2', type:'match'},
  {phrase:'What does "quickly" mean?',     hintRU:'Что значит «quickly»?',        hintUK:'Що значить «quickly»?',     hintES:'¿Qué significa «quickly»?', opts:['медленно','громко','тихо','быстро'],        optsUK:['повільно','гучно','тихо','швидко'],         optsES:['despacio','en voz alta','en voz baja','rápido'],         correct:3, level:'A2', type:'match'},
  {phrase:'What does "buy" mean?',         hintRU:'Что значит «buy»?',            hintUK:'Що значить «buy»?',         hintES:'¿Qué significa «buy»?', opts:['продавать','находить','покупать','терять'], optsUK:['продавати','знаходити','купувати','втрачати'],optsES:['vender','encontrar','comprar','perder'],correct:2, level:'A2', type:'match'},
  {phrase:'What does "always" mean?',      hintRU:'Что значит «always»?',         hintUK:'Що значить «always»?',      hintES:'¿Qué significa «always»?', opts:['никогда','иногда','редко','всегда'],        optsUK:['ніколи','іноді','рідко','завжди'],          optsES:['nunca','a veces','raramente','siempre'],          correct:3, level:'A2', type:'match'},
  {phrase:'I can ___ a little English.',  hintRU:'Я немного ___ по-английски.',  hintUK:'Я трохи ___ англійською.', hintES:'Puedo hablar un poco de inglés.', opts:['speak','speaks','speaking','spoke'],    correct:0, level:'A2'},
  {phrase:'Hurry! The train ___!',         hintRU:'Скорее! Поезд уходит сейчас.',   hintUK:'Швидше! Поїзд ось-ось поїде.',   hintES:'¡Date prisa! ¡El tren está saliendo!',   opts:['leave','leaves','is leaving','left'],  correct:2, level:'A2'},
  {phrase:'I usually ___ to work by bus.', hintRU:'Я обычно ___ на работу на автобусе.', hintUK:'Я зазвичай ___ на роботу автобусом.', hintES:'Normalmente voy al trabajo en autobús.', opts:['go','goes','went','going'],  correct:0, level:'A2'},
  {phrase:'What does "late" mean?',        hintRU:'Что значит «late»?',         hintUK:'Що значить «late»?',         hintES:'¿Qué significa «late»?', opts:['рано','долго','часто','поздно'],      optsUK:['рано','довго','часто','пізно'],         optsES:['temprano','mucho rato','a menudo','tarde'],         correct:3, level:'A2', type:'match'},
  {phrase:'I am ___ TV right now.',        hintRU:'Я сейчас ___ телевизор.',     hintUK:'Я зараз ___ телевізор.',   hintES:'Ahora mismo estoy viendo la tele.', opts:['watching','watched','watch','watches'],  correct:0, level:'A2'},
  {phrase:'It often ___ in London.',      hintRU:'В Лондоне часто ___.',        hintUK:'В Лондоні часто ___.',     hintES:'En Londres llueve a menudo.', opts:['rain','rains','rained','raining'],      correct:1, level:'A2'},
  {phrase:'We look ___ the teacher in class.', hintRU:'Мы смотрим ___ учителя.',  hintUK:'Ми дивимося на вчителя ___.', hintES:'En clase miramos al profesor.', opts:['at','on','in','to'],              correct:0, level:'A2'},
  {phrase:'She is very kind ___ me.',     hintRU:'Она очень добрая ___ мне.',   hintUK:'Вона дуже добра ___. (до кого/чого?)', hintES:'«amable conmigo» → en inglés: kind ___ me → «to».', opts:['to','for','with','of'],  correct:0, level:'A2'},
  {phrase:'I want ___ coffee, please.',   hintRU:'___ кофе, пожалуйста.',         hintUK:'___ кави, будь ласка.',     hintES:'Quiero ___ café, por favor.', opts:['some','any','a','an'],            correct:0, level:'A2'},
  {phrase:'I ___ my homework an hour ago.', hintRU:'Я сделал уроки час назад.',   hintUK:'Я зробив уроки годину тому.', hintES:'Terminé los deberes hace una hora.', opts:['finished','finish','am finishing','finishes'], correct:0, level:'A2'},
  {phrase:'It was cold, so I ___ a coat.', hintRU:'Было холодно, я ___ пальто.',  hintUK:'Було холодно, я ___ пальто.', hintES:'Hacía frío, así que me ___ un abrigo.', opts:['put on','took off','bought','lost'],  correct:0, level:'A2'},
  {phrase:'What does "loud" mean?',        hintRU:'Что значит «loud»?',         hintUK:'Що значить «loud»?',         hintES:'¿Qué significa «loud»?', opts:['тихо','громко','быстро','узко'],  optsUK:['тихо','гучно','швидко','вузько'],  optsES:['bajo','alto/en voz alta','rápido','estrecho'],  correct:1, level:'A2', type:'match'},
  {phrase:'What does "hungry" mean?',     hintRU:'Что значит «hungry»?',       hintUK:'Що значить «hungry»?',       hintES:'¿Qué significa «hungry»?', opts:['сытый','вкусный','голодный','сладкий'],  optsUK:['ситий','солодкий','голодний','солоний'], optsES:['saciado','rico/delicioso','hambriento','dulce'], correct:2, level:'A2', type:'match'},
  {phrase:'I ___ a teacher last year, now I work in a bank.', hintRU:'Раньше я ___, сейчас в банке.', hintUK:'Раніше я ___, тепер у банку.', hintES:'El año pasado fui profesor/a; ahora trabajo en un banco.', opts:['was','were','am','is'], correct:0, level:'A2'},
  {phrase:'The train ___ at 5 p.m. every day.', hintRU:'Поезд ___ в 5 вечера ежедневно.',  hintUK:'Поїзд ___ щодня о 17:00.',  hintES:'El tren ___ todos los días a las 17:00.',  opts:['leaves','leave','is leaving','left'],    correct:0, level:'A2'},
  {phrase:'I will walk in the park if the weather ___ good tomorrow.', hintRU:'Прогулка, если завтра ___.', hintUK:'Прогулянка, якщо завтра ___.', hintES:'Pasearé por el parque si mañana ___ buen tiempo.', opts:['is','will be','was','is being'],  correct:0, level:'A2'},
  {phrase:'I don\'t drink milk. I don\'t like ___.', hintRU:'Молока не ___. (напиток = it)', hintUK:'Молока не ___. (напій = it)', hintES:'No bebo leche; no ___ gusta (= it).', opts:['it','this','that','them'],  correct:0, level:'A2'},
  {phrase:'The shop ___ at 6 p.m. on Sundays.',  hintRU:'По воскр. в 18:00 магазин ___.(закр.)',  hintUK: 'Щонеділі о 18:00 магазин ___.(закрив.)',  hintES:'Los domingos la tienda ___ a las 18:00 (cerrar).',  opts:['closes',"close", 'is closing', 'is closed'],  correct:0, level:'A2'},

  // ── B1: Past Simple ───────────────────────────────────────────────────────
  {phrase:'She did not ___.',              hintRU:'Она не ___.',                  hintUK:'Вона не ___.',              hintES:'Ella no ___ (forma base después de did).', opts:['tell','told','tells','telling'],       correct:0, level:'B1'},
  {phrase:'We ___ speak tomorrow.',        hintRU:'Мы ___ говорить завтра.',      hintUK:'Ми ___ говорити завтра.',   hintES:'Mañana ___ hablar.', opts:['will','would','shall','should'],       correct:0, level:'B1'},
  {phrase:'She ___ when I called.',        hintRU:'Она ___ когда я позвонил.',    hintUK:'Вона ___, коли я зателефонував.',hintES:'Acción en curso en el pasado cuando llamaste → past continuous.',opts:['sleep','slept','was sleeping','had slept'],correct:2,level:'B1'},
  {phrase:'He ___ to London last year.',   hintRU:'Он ___ в Лондон в прошлом году.',hintUK:'Він ___ до Лондона минулого року.',hintES:'El año pasado ___ a Londres.',opts:['go','goes','went','gone'],   correct:2, level:'B1'},
  {phrase:'I ___ not see her last night.', hintRU:'Я ___ не видел её вчера.',     hintUK:'Я ___ не бачив її вчора.',  hintES:'Anoche no ___ verla.',  opts:['do','did','does','doing'],             correct:1, level:'B1'},
  {phrase:'They ___ a lot of money.',      hintRU:'Они ___ много денег.',         hintUK:'Вони ___ багато грошей.',   hintES:'Gastaron mucho dinero (past simple).',   opts:['spend','spends','spent','spending'],   correct:2, level:'B1'},
  {phrase:'She ___ the book last week.',   hintRU:'Она ___ книгу на прошлой неделе.',hintUK:'Вона ___ книгу минулого тижня.',hintES:'La semana pasada ___ el libro.',opts:['read','reads','has read','readed'],correct:0, level:'B1'},
  // B1: Present Perfect
  {phrase:'They ___ already left.',        hintRU:'Они ___ уже ушли.',            hintUK:'Вони ___ вже пішли.',       hintES:'Ellos ya ___ ido (= present perfect).', opts:['have','has','had','did'],              correct:0, level:'B1'},
  {phrase:"I ___ never been to Paris.",    hintRU:'Я ___ никогда не был в Париже.',hintUK:'Я ___ ніколи не був у Парижі.',hintES:'Nunca he estado en París.',opts:['have','has','had','was'],          correct:0, level:'B1'},
  {phrase:'She ___ just finished.',        hintRU:'Она ___ только что закончила.', hintUK:'Вона ___ щойно закінчила.',hintES:'Ella acaba de terminar / ___ terminado.',opts:['have','has','had','is'],               correct:1, level:'B1'},
  {phrase:'Have you ever ___ sushi?',      hintRU:'Ты когда-нибудь ___ суши?',    hintUK:'Ти коли-небудь ___ суші?',  hintES:'¿Alguna vez has probado sushi?',  opts:['eat','ate','eating','eaten'],          correct:3, level:'B1'},
  // B1: Passive Voice
  {phrase:'The book ___ written by him.',  hintRU:'Книга ___ написана им.',       hintUK:'Книга ___ написана ним.',   hintES:'El libro fue escrito por él.', opts:['was','were','is','be'],                correct:0, level:'B1'},
  {phrase:'The letter ___ sent yesterday.',hintRU:'Письмо ___ отправлено вчера.', hintUK:'Лист ___ надіслано вчора.', hintES:'La carta ___ enviada ayer.', opts:['was','were','is','been'],              correct:0, level:'B1'},
  {phrase:'Cars ___ made in factories.',   hintRU:'Машины ___ делают на заводах (пассив).',hintUK:'Машини ___, як правило, збирають на заводах (пас.).',hintES:'Los coches se fabrican en fábricas (voz pasiva).',opts:['is','am','are','were'],            correct:2, level:'B1'},
  // B1: Modal verbs
  {phrase:'You ___ wear a seatbelt.',      hintRU:'Ты ___ пристегнуться.',        hintUK:'Ти ___ пристебнутися.',     hintES:'Es norma / recomendación: «should» + infinitivo.', opts:['can','should','would','might'],        correct:1, level:'B1'},
  {phrase:'She ___ speak three languages.',hintRU:'Она ___ говорить на трёх языках.',hintUK:'Вона ___ говорити трьома мовами.',hintES:'Ella puede hablar tres idiomas.',opts:['should','must','can','shall'],correct:2, level:'B1'},
  {phrase:'You ___ eat less sugar.',       hintRU:'Тебе ___ есть меньше сахара.', hintUK:'Тобі ___ їсти менше цукру.', hintES:'Deberías comer menos azúcar.', opts:['can','could','should','would'],       correct:2, level:'B1'},
  {phrase:'If I knew, I ___.',             hintRU:'Если бы я знал, я бы ___.',    hintUK:'Якби я знав, я б ___.',     hintES:'Si lo supiera, lo ___ (condicional).', opts:['say','said','would say','will say'],   correct:2, level:'B1'},
  {phrase:'She ___ wait for you.',         hintRU:'Она ___ ждать тебя.',          hintUK:'Вона ___ чекати тебе.',     hintES:'Ella esperará/te esperará.', opts:['will','would','shall','is'],           correct:0, level:'B1'},
  {phrase:'I ___ not do this.',            hintRU:'Я не ___ этого делать.',       hintUK:'Я не ___ цього робити.',    hintES:'No haré/no voy a hacer esto.', opts:['should','shall','would','will'],       correct:0, level:'B1'},
  {phrase:'He ___ have helped.',           hintRU:'Он ___ помочь.',               hintUK:'Він ___ допомогти.',        hintES:'Podría haber ayudado.', opts:['could','can','would','shall'],         correct:0, level:'B1'},
  // B1: Conditional type 1
  {phrase:'If it rains, I ___ stay home.', hintRU:'Если будет дождь, я ___ дома.', hintUK:'Якщо буде дощ, я ___ вдома.',hintES:'Si llueve, me quedaré en casa.',opts:['will','would','shall','should'],      correct:0, level:'B1'},
  {phrase:'If you work hard, you ___ succeed.',hintRU:'Если ты будешь стараться, ты ___.', hintUK:'Якщо ти будеш старатися, ти ___.',hintES:'Condicional 1: resultado en futuro probable → «will».',opts:['will','would','shall','should'],correct:0, level:'B1'},
  // B1: Comparatives
  {phrase:'She is ___ than her sister.',   hintRU:'Она ___ своей сестры.',        hintUK:'Вона ___ своєї сестри.',    hintES:'Ella es más alta que su hermana (comparativo).', opts:['tall','taller','tallest','most tall'], correct:1, level:'B1'},
  {phrase:"It\'s ___ book I\'ve read.",      hintRU:'Это ___ книга, что я читал.',  hintUK:'Це ___ книга, яку я читав.', hintES:'Es el mejor libro que he leído (superlativo).', opts:['good','better','the best','best'],    correct:2, level:'B1'},
  // B1: Build questions
  {phrase:'Собери фразу из слов:', hintRU:'Они уже ушли.', hintUK:'Вони вже пішли.', hintES:'Ya se han marchado.', hintPTBR:'Eles já foram embora.', hintVI:'Họ đã rời đi rồi.', hintID:'Mereka sudah pergi.', hintTR:'Onlar çoktan ayrıldı.', hintPL:'Oni już wyszli.',
   opts:['have','They','left','already'], correct:0, level:'B1', type:'build',
   words:['They','have','already','left'], answer:'They have already left'},
  {phrase:'Собери фразу из слов:', hintRU:'Она читала когда я пришёл.', hintUK:'Вона читала коли я прийшов.', hintES:'Estaba leyendo cuando yo llegué.', hintPTBR:'Ela estava lendo quando eu cheguei.', hintVI:'Cô ấy đang đọc khi tôi đến.', hintID:'Dia sedang membaca ketika saya datang.', hintTR:'Ben geldiğimde o okuyordu.', hintPL:'Ona czytała, kiedy przyszedłem.',
   opts:['I','was','when','She','reading','came'], correct:0, level:'B1', type:'build',
   words:['She','was','reading','when','I','came'], answer:'She was reading when I came'},
  // B1: Type questions
  {phrase:'She has ___ working here for years.', hintRU:'Она ___ работает здесь годами.', hintUK:'Вона ___ працює тут роками.', hintES:'Have/has + been + -ing → «been».',
   opts:['been','be','being','was'], correct:0, level:'B1', type:'type', answer:'been'},
  {phrase:'Have you ___ read this book?',  hintRU:'Ты ___ читал эту книгу?',      hintUK:'Ти ___ читав цю книгу?',    hintES:'Pregunta con «have»: «___» = alguna vez → «ever».', opts:['ever','never','always','yet'], correct:0, level:'B1', type:'type', answer:'ever'},
  {phrase:'I ___ in London since 2019.',  hintRU:'Я ___ в Лондоне с 2019.',       hintUK:'Я ___ в Лондоні з 2019.',   hintES:'Desde 2019 → present perfect → «have lived».', opts:['live','lived',"have lived",'am living'], correct:2, level:'B1'},
  {phrase:'Each of the boys ___ a ticket.', hintRU:'У каждого мальчика ___ билет.', hintUK:'У кожного хлопчика ___ квиток.', hintES:'«Each of…» → verbo en singular → «has».', opts:['have','has','is','are'],     correct:1, level:'B1'},
  {phrase:"I\'ll call you when I ___.",    hintRU:'Позвоню, как только ___.',   hintUK:'Зателефоную, щойно ___.',  hintES:'Tras «when»: present simple, no futuro → «arrive».', opts:['arrive','arrived','will arrive','arriving'], correct:0, level:'B1'},
  {phrase:'By 2020, she ___ in Paris for 10 years.', hintRU:'К 2020-му она 10 лет жила в Париже.', hintUK:'До 2020 вона 10 років жила в Парижі.', hintES:'Antes de un punto del pasado → past perfect → «had lived».', opts:['has lived',"had lived","was living","lived"], correct:1, level:'B1'},
  {phrase:'The police ___ the thief yesterday.',       hintRU:'Полиция ___. (поймала вора)',  hintUK:'Поліція ___. (злодія)',  hintES:'La policía ___ al ladrón ayer.', opts:['catches',"caught","has caught","was catching"], correct:1, level:'B1'},
  {phrase:'I have never ___ a horse.',  hintRU:'Никогда не ___. (ездил верхом)', hintUK:'Ніколи не ___. (їздив верхи)', hintES:'Nunca he ___ a caballo (participio)', opts:['ride','rode','rides','ridden'],   correct:3, level:'B1'},
  {phrase:'This is the first time I ___ here.',  hintRU:'Первый раз, как я ___. (здесь)', hintUK:'Перший раз, як я ___. (тут)', hintES:'Es la primera vez que ___ aquí (present perfect).', opts:['am','was','have been',"has been"], correct:2, level:'B1'},
  {phrase:'You look tired. You ___ to bed early.',  hintRU:'___ спать раньше.',  hintUK:'___ спати раніше.',     hintES:'Consejo: «should go» (deberías irte).', opts:['should go','go','went','are going'],     correct:0, level:'B1'},
  {phrase:'The kitchen ___ at the moment.',  hintRU:'Сейчас ___. (пасс. — сейчас покрашено)',  hintUK:'Зараз ___. (пас. — сейчас «красят» кухню)', hintES:'La cocina se está pintando → pasiva progresiva.', opts:['paints',"is being painted","is painting","painted"], correct:1, level:'B1'},
  {phrase:'He asked what time the train ___.',  hintRU:'Спросил, во сколько ___. (поезд)', hintUK:'Запитав, о котрій ___. (потяг)', hintES:'Horario fijo → present simple → «leaves».', opts:['leaves','left','is leaving',"has left"], correct:0, level:'B1'},
  {phrase:'If I ___ you, I would not say that.',  hintRU:'Будь ___, не сказал бы.',  hintUK:'Будь ___, не сказав би цього.', hintES:'Si yo fuera tú ... (If I ___ you)', opts:['am','am not','was','were'],  correct:3, level:'B1'},
  {phrase:'We are looking forward ___ the concert.',  hintRU:'С нетерпением ___. (концерт)',  hintUK:'З нетерпінням ___. (концерт)', hintES:'«look forward to» + nombre/gerundio → «to».', opts:['at','on','to','for'],  correct:2, level:'B1'},
  {phrase:'What does "necessary" mean?',  hintRU:'«necessary» — это…',  hintUK:'Що значить «necessary»?',  hintES:'¿Qué significa «necessary»?', opts:['невозможный','нужный/необх.','лишний','лёгкий'],  optsUK:['неможливий','потрібний','зайвий','легкий'], optsES:['imposible','necesario/indispensable','superfluo','fácil/ligero'],  correct:1, level:'B1', type:'match'},
  {phrase:"She doesn\'t mind ___ late.",  hintRU:'Поздно ___ — не волнует.',  hintUK:'Пізно ___ — не заважає.',  hintES:'«mind» + gerundio → «working».', opts:['work','to work',"working",'works'],  correct:2, level:'B1'},
  {phrase:'I wish I ___ how to play the guitar.',  hintRU:'Как ___, вот мечта...',  hintUK:'Вміти б ___. (гітара)',  hintES:'«wish» + past simple del verbo «know» → «knew».', opts:['knew',"will know", 'know', 'am knowing'],  correct:0, level:'B1'},
  {phrase:"Before I moved, I had never ___ a flight.",  hintRU:'Раньше никогда не ___.(пер. раз летал, перф.)',  hintUK:'Раніше ніколи не ___.(пер. раз, перф.)',  hintES:'«had never» + participio de «take» → «taken».',  opts:['take',"took", 'taken', 'taking'],  correct:2, level:'B1'},

  // ── B2 ────────────────────────────────────────────────────────────────────
  {phrase:'It ___ already done.',          hintRU:'Это уже ___.',                 hintUK:'Це вже ___.',               hintES:'Pasiva con present perfect → «has been».', opts:['was','been','has been','had'],          correct:2, level:'B2'},
  {phrase:'I should ___ earlier.',         hintRU:'Мне нужно было ___ раньше.',   hintUK:'Мені треба ___ раніше.',    hintES:'«should have» + participio → «have come».', opts:['come','came','have come','had come'],   correct:2, level:'B2'},
  {phrase:'He has never ___ me.',          hintRU:'Он так и не ___ мне.',         hintUK:'Він так і не ___ мені.',    hintES:'Present perfect negado → participio → «called».', opts:['calls','called','has called','call'],   correct:1, level:'B2'},
  {phrase:'If she ___, she would know.',   hintRU:'Если бы она ___, знала.',      hintUK:'Якби вона ___, знала.',     hintES:'II condicional: «if» + past simple → «asked».', opts:['ask','asked','would ask','has asked'],  correct:1, level:'B2'},
  // B2: Passive Voice complex
  {phrase:'The report ___ submitted by Friday.',hintRU:'Отчёт ___ сдан до пятницы.',hintUK:'Звіт ___ здано до п\'ятниці.',hintES:'Obligación + pasiva: «must be» + participio.',opts:['must be','must have','should','is'],correct:0, level:'B2'},
  {phrase:'The new law ___ passed last year.',hintRU:'Новый закон ___ принят в прошлом году.',hintUK:'Новий закон ___ прийнятий торік.',hintES:'Pasado simple pasivo → «was» + participio.',opts:['was','were','has been','had been'],correct:0, level:'B2'},
  {phrase:'English ___ spoken worldwide.', hintRU:'На английском ___ говорят по всему миру.',hintUK:'Англійською ___ говорять у всьому світі.',hintES:'Presente pasivo (hecho general) → «is».',opts:['is','are','was','were'],correct:0, level:'B2'},
  // B2: Reported speech
  {phrase:'He said he ___ tired.',         hintRU:'Он сказал, что ___ устал.',    hintUK:'Він сказав, що ___ втомлений.',hintES:'Estilo indirecto: «was» (backshift).',opts:['is','was','were','be'],             correct:1, level:'B2'},
  {phrase:'She told me she ___ leave.',    hintRU:'Она сказала, что ___ уйдёт.',  hintUK:'Вона сказала, що ___ піде.',hintES:'Futuro en el pasado → «would».',opts:['will','would','shall','should'],        correct:1, level:'B2'},
  {phrase:'He asked where I ___.',         hintRU:'Он спросил, где я ___.',       hintUK:'Він запитав, де я ___.',    hintES:'Pasado en estilo indirecto → «lived».', opts:['live','lived','living','lives'],        correct:1, level:'B2'},
  // B2: Conditional type 2
  {phrase:'If I ___ rich, I would travel.',hintRU:'Если бы я ___ богат, путешествовал бы.',hintUK:'Якби я ___ багатий, подорожував би.',hintES:'If II: contrafactual con «were».',opts:['am','was','were','be'],correct:2, level:'B2'},
  {phrase:'She would help if she ___.',    hintRU:'Она бы помогла, если бы ___.',  hintUK:'Вона б допомогла, якби ___.',hintES:'If II: conocimiento hipotético → «knew».',opts:['can','could','had','knew'],          correct:3, level:'B2'},
  // B2: Relative clauses
  {phrase:'The man ___ called is my friend.',hintRU:'Мужчина, ___ позвонил — мой друг.',hintUK:'Чоловік, ___ зателефонував — мій друг.',hintES:'Persona (sujeto) → «who».',opts:['who','which','whose','whom'],correct:0, level:'B2'},
  {phrase:'The book ___ I read was great.',hintRU:'Книга, ___ я читал, была отличной.',hintUK:'Книга, ___ я читав, була чудовою.',hintES:'Cosa (objeto) → «which».',opts:['who','which','whose','whom'],  correct:1, level:'B2'},
  {phrase:'The girl ___ mother is a doctor studies here.',hintRU:'Девочка, ___ мать — врач, учится здесь.',hintUK:'Дівчина, ___ мати — лікар, навчається тут.',hintES:'Posesión («cuya madre») → «whose».',opts:['who','which','whose','whom'],correct:2, level:'B2'},
  // B2: Gerunds/Infinitives
  {phrase:'She enjoys ___.',               hintRU:'Она любит ___.',               hintUK:'Вона любить ___.',          hintES:'«enjoy» + gerundio → «dancing».', opts:['dance','dances','dancing','to dance'], correct:2, level:'B2'},
  {phrase:'I want you ___ this.',          hintRU:'Я хочу, чтобы ты ___ это.',    hintUK:'Я хочу, щоб ти ___ це.',    hintES:'«want» + objeto + «to» + inf. → «to do».', opts:['do','doing','to do','done'],           correct:2, level:'B2'},
  {phrase:'He avoided ___ the problem.',   hintRU:'Он избегал ___ проблемы.',     hintUK:'Він уникав ___ проблеми.',  hintES:'«avoid» + gerundio → «discussing».', opts:['discuss','discussed','discussing','to discuss'],correct:2, level:'B2'},
  {phrase:'She decided ___ earlier.',      hintRU:'Она решила ___ раньше.',       hintUK:'Вона вирішила ___ раніше.',  hintES:'«decide» + «to» + inf. → «to leave».', opts:['leave','left','leaving','to leave'],  correct:3, level:'B2'},
  // B2: Build questions
  {phrase:'Собери фразу из слов:', hintRU:'Если бы я знал, я бы сказал.', hintUK:'Якби я знав, я б сказав.', hintES:'Si lo supiera, lo diría.', hintPTBR:'Se eu soubesse, eu diria.', hintVI:'Nếu tôi biết, tôi sẽ nói.', hintID:'Kalau saya tahu, saya akan mengatakannya.', hintTR:'Bilseydim söylerdim.', hintPL:'Gdybym wiedział, powiedziałbym.',
   opts:['say','I knew','would','If','I'], correct:0, level:'B2', type:'build',
   words:['If','I','knew','I','would','say'], answer:'If I knew I would say'},
  {phrase:'Собери фразу из слов:', hintRU:'Письмо было написано ею.', hintUK:'Лист був написаний нею.', hintES:'La carta fue escrita por ella.', hintPTBR:'A carta foi escrita por ela.', hintVI:'Bức thư được cô ấy viết.', hintID:'Surat itu ditulis olehnya.', hintTR:'Mektup onun tarafından yazıldı.', hintPL:'List został napisany przez nią.',
   opts:['The','was','letter','written','her','by'], correct:0, level:'B2', type:'build',
   words:['The','letter','was','written','by','her'], answer:'The letter was written by her'},
  // B2: choice4 — translation
  {phrase:'She has been working here for years.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:', hintES:'Elige la traducción correcta:',
   opts:['Она работает здесь годами','Она работала здесь годами','Она будет работать здесь','Она работала бы здесь'],
   optsUK:['Вона працює тут роками','Вона працювала тут роками','Вона буде тут працювати','Вона б тут працювала'],
   optsES:['Lleva años trabajando aquí','Trabajaba aquí durante años','Trabajará aquí','Trabajaría aquí'],
   correct:0, level:'B2', type:'choice4'},
  {phrase:'The report must be submitted by Friday.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:', hintES:'Elige la traducción correcta:',
   opts:['Отчёт можно сдать в пятницу','Отчёт должен быть сдан до пятницы','Отчёт был сдан в пятницу','Отчёт сдадут в пятницу'],
   optsUK:["Звіт можна здати в п\'ятницю","Звіт має бути зданий до п\'ятниці","Звіт був зданий у п\'ятницю","Звіт здадуть у п\'ятницю"],
   optsES:['Se puede entregar el informe el viernes','El informe debe entregarse antes del viernes','El informe se entregó el viernes','Entregarán el informe el viernes'],
   correct:1, level:'B2', type:'choice4'},
  // B2: Type questions
  {phrase:'She has been here ___ 2010.',   hintRU:'Она здесь ___ 2010 года.',     hintUK:'Вона тут ___ 2010 року.',   hintES:'Punto en el tiempo → «since» (no «for»).', opts:['for','since','during','from'], correct:1, level:'B2', type:'type', answer:'since'},
  {phrase:'They ___ each other for years.',hintRU:'Они знают друг друга ___ годами.',hintUK:'Вони знають одне одного ___ роки.',hintES:'«for years» + experiencia hasta ahora → «have known».',opts:['know','knew','have known','known'],correct:2, level:'B2', type:'type', answer:'have known'},
  {phrase:"I\'d rather you ___ a little more polite.", hintRU:'Лучше бы ты был ___.', hintUK:'Краще б ти був ___.', hintES:'«would rather you» + «were» (subjuntivo formal).', opts:['be','am','is','are'],     correct:0, level:'B2'},
  {phrase:'The manager demanded that the report ___ on time.', hintRU:'Руководитель требовал, чтобы отчёт ___.', hintUK:'Керівник вимагав, щоб звіт ___.', hintES:'Tras demand: forma base («be»), no «is/was».', opts:['is','be','was','will be'],         correct:1, level:'B2'},
  {phrase:'Not only was the food cold, but the service was also ___.',  hintRU:'И еда холодная, и обслуживание ___.',  hintUK:'Їжа холодна, а обслуговування ___.', hintES:'Balance con «cold» → servicio «poor» (malo/deficiente).', opts:['slow','poor',"very expensive",'rude'],  correct:1, level:'B2'},
  {phrase:"It\'s high time you ___ a haircut.",  hintRU:'Пора тебе ___. (сделай стрижку)',  hintUK:'Що й тобі ___. (стрижка)',  hintES:'Tras «it\'s high time you» → past simple coloquial → «got».',  opts:['get','got',"get one",'are getting'],  correct:1, level:'B2'},
  {phrase:"I\'d sooner ___ home than go to that party.",  hintRU:'___ домой, чем на вечеринку',  hintUK:'___ вдома, ніж на вечірку', hintES:'«sooner» + infinitivo sin «to» → «stay».', opts:['stay',"stayed", 'to stay', 'staying'],  correct:0, level:'B2'},
  {phrase:"No sooner had we arrived than it ___.",  hintRU:'Как приехали, тут ___. (заминка/паника)',  hintUK:'Щойно прибули, як...',  hintES:'Patrón «No sooner… than»: «than» + past simple.',  opts:['began to rain',"began","had begun", 'rains'],  correct:0, level:'B2'},
  {phrase:'I remember ___ the door, but the keys were gone anyway.',  hintRU:'___. (что сделал с дверью? герунд/инфин.)',  hintUK:'___. (що зробив; герундій/інфін.)',  hintES:'«remember» + gerundio (hecho vivido) → «locking».',  opts:['lock','to lock',"locking",'locked'],  correct:2, level:'B2'},
  {phrase:"She can\'t help ___. (always talks too much); it\'s just her way.",  hintRU:'___. (не в силах удержаться)',  hintUK:'___. (не може втриматися)',  hintES:'«can\'t help» + gerundio → «talking».',  opts:['talk','talks',"talking", 'to talk'],  correct:2, level:'B2'},
  {phrase:'In five years, this area ___ a new business district.', hintRU:'К концу пятилетки район ___.',  hintUK:'За 5 років район ___. (стане повністю змін. районом)', hintES:'«In five years» → futuro perfecto → «will have become».',  opts:['will be',"will have become",'is','has become'],  correct:1, level:'B2'},
  {phrase:"So confusing was the sign that I ___ the wrong way.",  hintRU:'Настолько ___ указатель, что...',  hintUK:'Показник ___, тому...',  hintES:'Inversión por «So…»: resultado en pasado → «drove».',  opts:['drove',"drives","was driving", 'was driven'],  correct:0, level:'B2'},
  {phrase:'I suggest that he ___ a professional.', hintRU: 'Предлагаю, чтобы ___. (нанял)', hintUK: 'Пропоную, щоб ___. (найм)', hintES:'Tras «suggest that» → forma base (sin -s) → «see».', opts:['see','saw',"saw a doctor",'sees'],  correct:0, level:'B2'},
  {phrase:'I must have the report ___ by noon.',  hintRU:'Сделай так, чтоб отчёт ___. (готов) к полудню',  hintUK: 'Щоб звіт ___. (був гот.) до 12:00',  hintES:'«have» + objeto + participio (causativa) → «finished».',  opts:['finished',"is finished",'to finish', 'be finishing'],  correct:0, level:'B2'},
  {phrase:"They can\'t find their keys, ___?",  hintRU:'___. (тег-вопрос).',  hintUK: '___. (пит. тег)',  hintES:'Tras modal negativo («can\'t») → mismo auxiliar positivo («can»).',  opts:['do they',"can they", 'are they', 'can\'t they'],  correct:1, level:'B2'},
  {phrase:'The children might ___ lost in the crowd.',  hintRU:'___. (модальное+perf?)',  hintUK: '___. (модальний+perf)',  hintES:'Deducción: «might have» + participio → «have been».',  opts:['have been',"be",'get','have got'],  correct:0, level:'B2'},
  {phrase:"She\'s the woman ___ son won the contest.",  hintRU:'___.(relative pron.)',  hintUK: '___(відн. займ.)',  hintES:'Relativo posesivo («cuyo hijo») → «whose».',  opts:['whose',"who", 'which', 'whom'],  correct:0, level:'B2'},

  // ── C1 ────────────────────────────────────────────────────────────────────
  {phrase:'If you had come, you ___ her.', hintRU:'Если бы ты пришёл, ты ___ её.',hintUK:'Якби ти прийшов, ти ___ її.', hintES:'III tipo: «would have» + participio → «met».', opts:['meet','met','would have met','had met'],correct:2, level:'C1'},
  {phrase:'He is said ___ been rich.',     hintRU:'Говорят, что он ___ богатым.',  hintUK:'Кажуть, що він ___ багатим.', hintES:'«be said to» + infinitivo perfecto → «to have».', opts:['to have','to be','having','being'], correct:0, level:'C1'},
  {phrase:'Should I ___ told you earlier?',hintRU:'Следовало мне сказать тебе раньше?', hintUK:'Чи варто було сказати тобі раніше?', hintES:'«Should I have + participio?» → falta «have».', opts:['have','had','be','been'], correct:0, level:'C1'},
  // C1: Conditional type 3
  {phrase:'If she ___ harder, she would have passed.',hintRU:'Если бы она старалась...',hintUK:'Якби вона старалася...',hintES:'III tipo: contrafactual pasado → «had worked».',opts:['worked','had worked','would work','was working'],correct:1,level:'C1'},
  {phrase:'He would ___ the report if he had tried harder.',hintRU:'Он бы ___ отчёт, если бы постарался.',hintUK:'Він би ___ звіт, якби постарався.',hintES:'Resultado hipotético pasado → «have finished».',opts:['finish','finished','have finished','had finished'],correct:2,level:'C1'},
  {phrase:'If I had known, I ___ the truth.',hintRU:'Если бы я знал, я бы ___ правду.',hintUK:'Якби я знав, я б ___ правду.',hintES:'If III + «would have told».',opts:['would tell','told','would have told','had told'],correct:2,level:'C1'},
  // C1: Complex passive/perfect
  {phrase:'The project ___ completed by next month.',hintRU:'Проект ___ завершён к следующему месяцу.',hintUK:'Проект ___ завершено до наступного місяця.',hintES:'Futuro + pasiva: «will be» + participio.',opts:['will be','would be','is being','has been'],correct:0,level:'C1'},
  {phrase:'By the time she arrived, he ___ everything.',hintRU:'К тому времени он ___ всё.',hintUK:'На той час він ___ все.',hintES:'Antes de un hecho pasado → past perfect → «had finished».',opts:['finish','has finished','had finished','was finishing'],correct:2,level:'C1'},
  {phrase:'She ___ have been waiting for hours.',hintRU:'Она ___ ждать часами.',     hintUK:'Вона ___ чекати годинами.',   hintES:'Deducción fuerte: «must have been» + -ing.',   opts:['must','can','shall','will'],        correct:0, level:'C1'},
  // C1: Cleft sentences / inversion
  {phrase:'Not only ___ she sing, she also dances.',hintRU:'Она не только поёт...',hintUK:'Вона не тільки співає...',      hintES:'Inversión: «Not only» + auxiliar/modal + sujeto → «can».',      opts:['can','does','is','has'],             correct:1, level:'C1'},
  {phrase:'___ had I left when it started raining.',hintRU:'Как только я вышел...',hintUK:'Щойно я вийшов...',             hintES:'Patrón «Hardly» + inversión + past perfect.',             opts:['Hardly','Barely','No sooner','Scarcely'],correct:0,level:'C1'},
  // C1: Choice4
  {phrase:'Hardly had she arrived when they left.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:', hintES:'Elige la traducción correcta:',
   opts:['Едва она прибыла, как они ушли','Она прибыла и они ушли','Она не хотела приходить','Они ушли до её прибытия'],
   optsUK:['Ледве вона прибула, як вони пішли','Вона прибула і вони пішли','Вона не хотіла приходити','Вони пішли до її прибуття'],
   optsES:['Apenas había llegado cuando se fueron','Ella llegó y ellos se fueron','No quería llegar','Se fueron antes de que llegara'],
   correct:0, level:'C1', type:'choice4'},
  {phrase:'She would rather stay home than go out.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:', hintES:'Elige la traducción correcta:',
   opts:['Она не может остаться дома','Ей лучше было бы остаться дома','Она не идёт домой','Она идёт гулять'],
   optsUK:['Вона не може залишитися вдома','Їй краще залишитися вдома','Вона не йде додому','Вона йде гуляти'],
   optsES:['No puede quedarse en casa','Preferiría quedarse en casa','No va a casa','Va a dar un paseo'],
   correct:1, level:'C1', type:'choice4'},
  // C1: Type
  {phrase:'___ she studied, better results she got.',hintRU:'Чем больше занималась...',hintUK:'Чим більше займалася...',hintES:'Correlativo: «The + comparativo..., the + comparativo».',opts:['More','The more','The most','Most'],correct:1, level:'C1', type:'type', answer:'The'},
  {phrase:'He is used to ___ up early.',   hintRU:'Он привык вставать рано.',     hintUK:'Він звик вставати рано.',    hintES:'«be used to» + gerundio → «waking».',    opts:['wake','wakes','waking','woken'],    correct:2, level:'C1', type:'type', answer:'waking'},
  // C1: Build
  {phrase:'Собери фразу из слов:', hintRU:'Если бы она пришла, ты бы её встретил.', hintUK:'Якби вона прийшла, ти б її зустрів.', hintES:'Si hubiera venido ella, la habrías conocido.', hintPTBR:'Se ela tivesse vindo, você a teria conhecido.', hintVI:'Nếu cô ấy đã đến, bạn đã gặp cô ấy rồi.', hintID:'Jika dia datang, kamu pasti sudah bertemu dengannya.', hintTR:'Eğer o gelseydi, onunla tanışmış olurdun.', hintPL:'Gdyby przyszła, spotkałbyś ją.',
   opts:['had come','you','If','have met','would','she','her'], correct:0, level:'C1', type:'build',
   words:['If','she','had','come','you','would','have','met','her'], answer:'If she had come you would have met her'},
  {phrase:'Were I you, I ___ accept that offer.', hintRU:'Будь я на твоём месте, я бы согласился на это предложение.', hintUK:'Будь я на твоєму місці, я б погодився на пропозицію.', hintES:'If II invertido («Were I you») → «would».',
   opts:['will','would','am','shall'], correct:1, level:'C1'},
  {phrase:'Scarcely ___ home when the phone rang.', hintRU:'Едва я ___, зазвонил телефон.', hintUK:'Ледве я ___, зазвонив телефон.', hintES:'«Scarcely» + inversión + pasado anterior.',
   opts:['had I got','I had got','did I get','I got'], correct:0, level:'C1'},
  {phrase:"I would sooner resign than ___ a decision I cannot defend.",  hintRU: 'would sooner + инфинитив без to после than.',  hintUK: 'would sooner + інф. без to після than.',  hintES:'would sooner + infinitivo sin «to» después de «than».',  opts:['make',"to make", 'to have made', 'made'],  correct:0, level:'C1'},
  {phrase:"Little ___ the risks when he agreed to the deal.",  hintRU:'Он и не подозревал об опасностях. (инверсия)',  hintUK:'Він і не здогадувався про ризики. (інверсія)',  hintES:'«Little» + negación + inversión → «did he realize».',  opts:['did he realize',"he realized", 'he had realized', 'has he realized'],  correct:0, level:'C1'},
  {phrase:'The committee recommended that the plan ___ as soon as possible.',  hintRU: 'Субъюнктив после recommend: be done, не is/was.',  hintUK: 'Суб\'юнктив у реченні рекомендації: be.',  hintES:'Tras «recommend that»: base verbal + pasiva → «be put into action».',  opts:['be put into action',"is put into action", 'is being put', 'be putting'],  correct:0, level:'C1'},
  {phrase:'The witness flatly denied ___ at the building that night.',  hintRU: 'После deny + герундий (being), не инфинитив.',  hintUK: 'Після deny + герундій (being), не інфінітив.',  hintES:'Tras «deny» + gerundio de «be» → «being».',  opts:['being',"to be", 'to have', 'be'],  correct:0, level:'C1'},
  {phrase:"Were it not for your help, the project would ___.",  hintRU: 'Условие III (инверсия): без твоей помощи проект бы провалился.',  hintUK: 'Умова III (інверсія): без твоєї допомоги проєкт...',  hintES:'«Were it not for…» → resultado hipotético → «have failed».',  opts:['have failed',"fail", "be failing", "failed"],  correct:0, level:'C1'},
  {phrase:'On no account ___ the documents be left unattended.',  hintRU: 'On no account + инверсия.',  hintUK: 'On no account + інверсія.',  hintES:'Negación enfática + modal + inversión → «should».',  opts:['should',"can the", "is to", "must the employees"],  correct:0, level:'C1'},
  {phrase:'Only on Sundays ___ we visit my grandparents in the country.',  hintRU:'Only on Sundays + инверсия (do/did).',  hintUK:'Only on Sundays + інверсія (do/did).',  hintES:'«Only…» al inicio + auxiliar del presente simple → «do».',  opts:['do',"are we", 'we do', 'will we'],  correct:0, level:'C1'},
  {phrase:"But for the bad weather, the flight ___ on time that day.",  hintRU: 'Без плохой погоды рейс был бы вовремя (III тип).',  hintUK: 'Якби не погана погода, рейс був би вчасно (III тип).',  hintES:'«But for…» = sin…; contrafactual pasado → «would not have been».',  opts:['would not have been',"would have been", 'is not', 'has not been'],  correct:1, level:'C1'},
  {phrase:'So rarely ___ such honesty that everyone was taken aback.',  hintRU:'So rarely + инверсия.',  hintUK:'So rarely + інверсія.',  hintES:'«So rarely» + inversión + pasado simple → «did we see».',  opts:['did we see',"we saw", 'we had seen', 'have we seen'],  correct:0, level:'C1'},
  {phrase:"She would rather we ___ a minute before deciding.",  hintRU:'would rather + подлежащее + Past Simple.',  hintUK: 'would rather + підмет + past simple (waited).',  hintES:'«would rather» + otro sujeto + pasado (cortesía) → «waited».',  opts:['waited',"wait", 'had waited', 'were waiting'],  correct:0, level:'C1'},
  {phrase:'I have never seen such a mess—nor ___ I want to see one again.',  hintRU: 'ellipsis + nor + инверсия.',  hintUK: 'еліпсис + nor + інверсія.',  hintES:'Tras «nor»: auxiliar «do» + inversión (mismo tiempo).',  opts:['do',"will", 'have I', 'did I want to'],  correct:0, level:'C1'},
  {phrase:'The CEO made his assistant ___ the entire file again.',  hintRU: 'make + дополнение + bare inf.',  hintUK: 'make + object + інфінітив без to.',  hintES:'«make» + objeto + infinitivo sin «to» → «type».',  opts:['type',"to type", 'typing', 'to have typed'],  correct:0, level:'C1'},

// POOL: expanded for more random 4/level draws (pickQuestions + shuffle)
];

const STRICT_DIAGNOSTIC_POOL: Question[] = [
  {phrase:'She ___ from Spain, but her parents are from Italy.', hintRU:'Она ___ из Испании, но её родители из Италии.', hintUK:'Вона ___ з Іспанії, але її батьки з Італії.', hintES:'Ella ___ de España, pero sus padres son de Italia.', opts:['am','is','are','be'], correct:1, level:'A1'},
  {phrase:'I have ___ umbrella in my bag.', hintRU:'У меня в сумке ___ зонт.', hintUK:'У мене в сумці ___ парасоля.', hintES:'Tengo ___ paraguas en mi bolso.', opts:['a','an','the','-'], correct:1, level:'A1'},
  {phrase:'These ___ my keys, not yours.', hintRU:'Это мои ключи, не твои.', hintUK:'Це мої ключі, не твої.', hintES:'Estas ___ mis llaves, no las tuyas.', opts:['is','am','are','be'], correct:2, level:'A1'},
  {phrase:'___ your brother at home now?', hintRU:'Твой брат сейчас дома?', hintUK:'Твій брат зараз удома?', hintES:'¿Tu hermano está en casa ahora?', opts:['Is','Are','Do','Does'], correct:0, level:'A1'},

  {phrase:'She usually drinks coffee, but today she ___ tea.', hintRU:'Обычно она пьёт кофе, но сегодня пьёт чай.', hintUK:'Зазвичай вона п\'є каву, але сьогодні п\'є чай.', hintES:'Normalmente toma café, pero hoy está tomando té.', opts:['drinks','is drinking','drink','drank'], correct:1, level:'A2'},
  {phrase:"He doesn't ___ to work on Sundays.", hintRU:'Он не ходит на работу по воскресеньям.', hintUK:'Він не ходить на роботу щонеділі.', hintES:'No va al trabajo los domingos.', opts:['goes','go','went','going'], correct:1, level:'A2'},
  {phrase:"I ___ my keys yesterday, so I couldn't open the door.", hintRU:'Вчера я потерял ключи, поэтому не смог открыть дверь.', hintUK:'Учора я загубив ключі, тому не зміг відчинити двері.', hintES:'Ayer perdí las llaves, así que no pude abrir la puerta.', opts:['lose','lost','have lost','was losing'], correct:1, level:'A2'},
  {phrase:'There ___ a lot of people in the room five minutes ago.', hintRU:'Пять минут назад в комнате было много людей.', hintUK:'П\'ять хвилин тому в кімнаті було багато людей.', hintES:'Hace cinco minutos había mucha gente en la habitación.', opts:['is','are','was','were'], correct:3, level:'A2'},

  {phrase:"I've known her ___ we were children.", hintRU:'Я знаю её с тех пор, как мы были детьми.', hintUK:'Я знаю її відтоді, як ми були дітьми.', hintES:'La conozco desde que éramos niños.', opts:['for','since','during','from'], correct:1, level:'B1'},
  {phrase:'If it rains tomorrow, we ___ at home.', hintRU:'Если завтра пойдёт дождь, мы останемся дома.', hintUK:'Якщо завтра піде дощ, ми залишимося вдома.', hintES:'Si mañana llueve, nos quedaremos en casa.', opts:['stay','stayed','will stay','would stay'], correct:2, level:'B1'},
  {phrase:'This is the hotel ___ we stayed last summer.', hintRU:'Это отель, где мы останавливались прошлым летом.', hintUK:'Це готель, де ми зупинялися минулого літа.', hintES:'Este es el hotel donde nos alojamos el verano pasado.', opts:['which','where','who','whose'], correct:1, level:'B1'},
  {phrase:'I was cooking when somebody ___ the doorbell.', hintRU:'Я готовил, когда кто-то позвонил в дверь.', hintUK:'Я готував, коли хтось подзвонив у двері.', hintES:'Estaba cocinando cuando alguien llamó al timbre.', opts:['rings','rang','has rung','was ringing'], correct:1, level:'B1'},

  {phrase:'By the time we arrived, the film ___.', hintRU:'К тому моменту, как мы приехали, фильм уже начался.', hintUK:'Коли ми приїхали, фільм уже почався.', hintES:'Cuando llegamos, la película ya había empezado.', opts:['started','has started','had started','was starting'], correct:2, level:'B2'},
  {phrase:'I wish I ___ more careful yesterday.', hintRU:'Жаль, что вчера я не был осторожнее.', hintUK:'Шкода, що вчора я не був обережнішим.', hintES:'Ojalá hubiera sido más cuidadoso ayer.', opts:['am','was','had been','would be'], correct:2, level:'B2'},
  {phrase:'The report is expected ___ by Friday.', hintRU:'Ожидается, что отчёт будет готов к пятнице.', hintUK:'Очікується, що звіт буде готовий до п\'ятниці.', hintES:'Se espera que el informe esté terminado para el viernes.', opts:['finish','to finish','to be finished','finished'], correct:2, level:'B2'},
  {phrase:'Hardly had we sat down ___ the lights went out.', hintRU:'Едва мы сели, как погас свет.', hintUK:'Ледве ми сіли, як згасло світло.', hintES:'Apenas nos sentamos, se apagaron las luces.', opts:['than','when','then','while'], correct:1, level:'B2'},

  {phrase:'Had I known the truth, I ___ differently.', hintRU:'Если бы я знал правду, я бы поступил иначе.', hintUK:'Якби я знав правду, я б вчинив інакше.', hintES:'Si hubiera sabido la verdad, habría actuado de otra manera.', opts:['will act','would act','would have acted','had acted'], correct:2, level:'C1'},
  {phrase:'Not until the meeting ended ___ what had happened.', hintRU:'Только когда встреча закончилась, я понял, что произошло.', hintUK:'Лише коли зустріч завершилася, я зрозумів, що сталося.', hintES:'Solo cuando terminó la reunión entendí lo que había pasado.', opts:['I understood','did I understand','had I understood','I had understood'], correct:1, level:'C1'},
  {phrase:'The proposal was rejected, ___ surprised everyone in the room.', hintRU:'Предложение отклонили, что удивило всех в комнате.', hintUK:'Пропозицію відхилили, що здивувало всіх у кімнаті.', hintES:'La propuesta fue rechazada, lo cual sorprendió a todos en la sala.', opts:['what','that','which','who'], correct:2, level:'C1'},
  {phrase:'Rarely ___ such a convincing argument.', hintRU:'Редко я слышал такой убедительный аргумент.', hintUK:'Рідко я чув такий переконливий аргумент.', hintES:'Rara vez he oído un argumento tan convincente.', opts:['I have heard','have I heard','I had heard','did I heard'], correct:1, level:'C1'},
];

const ACTIVE_DIAGNOSTIC_POOL = STRICT_DIAGNOSTIC_POOL;

// Result thresholds (based on 20 questions)
const LEVEL_RESULTS = [
  {min:0,  level:'A1', ru:'Начальный ориентир',    uk:'Початковий орієнтир',    es:'Nivel inicial (orientativo)', 'pt-BR':'Nível inicial (orientativo)', vi:'Mức khởi đầu (tham khảo)', id:'Level awal (orientatif)', tr:'Başlangıç seviyesi (tahmini)', pl:'Poziom początkowy (orientacyjnie)',
    msgRU:'База ещё формируется — это нормально. Двигайся по урокам: словарь, грамматика и теория дадут опору.',
    msgUK:'База ще формується — це нормально. Рухайся за уроками: словник, граматика й теорія дадуть опору.',
    msgES:'Estás cimentando bases: es habitual. Sigue el hilo de lecciones (léxico, gramática y teoría) para afianzar.',
    msgPTBR:'A base ainda está se formando — isso é normal. Siga pelas aulas: vocabulário, gramática e teoria vão dar apoio.',
    msgVI:'Nền tảng vẫn đang hình thành — điều này bình thường. Hãy học theo các bài: từ vựng, ngữ pháp và lý thuyết sẽ tạo điểm tựa.',
    msgID:'Dasarnya masih terbentuk — itu wajar. Ikuti pelajaran: kosakata, tata bahasa, dan teori akan memberi pijakan.',
    msgTR:'Temel hâlâ oluşuyor — bu normal. Dersleri takip et: kelime, dil bilgisi ve teori sana dayanak sağlar.',
    msgPL:'Podstawy dopiero się układają — to normalne. Idź przez lekcje: słownictwo, gramatyka i teoria dadzą oparcie.'},
  {min:4,  level:'A2', ru:'Базовый ориентир',  uk:'Базовий орієнтир',   es:'Nivel básico (orientativo)', 'pt-BR':'Nível básico (orientativo)', vi:'Mức cơ bản (tham khảo)', id:'Level dasar (orientatif)', tr:'Temel seviye (tahmini)', pl:'Poziom podstawowy (orientacyjnie)',
    msgRU:'Структуры узнаваемы — углуби лексику и грамматику в упражнениях уроков; скорость придёт с привычкой.',
    msgUK:'Структури впізнавані — поглиб лексику й граматику в вправках уроків; швидкість з\'явиться з практикою.',
    msgES:'Reconoces patrones: refuerza léxico y gramática en las lecciones; la rapidez mejora con la práctica habitual.',
    msgPTBR:'Você já reconhece padrões: reforce vocabulário e gramática nas aulas; a velocidade vem com a prática.',
    msgVI:'Bạn đã nhận ra các mẫu câu: hãy củng cố từ vựng và ngữ pháp trong bài học; tốc độ sẽ tăng nhờ luyện tập.',
    msgID:'Kamu sudah mengenali pola: perkuat kosakata dan tata bahasa di pelajaran; kecepatan akan datang lewat kebiasaan.',
    msgTR:'Kalıpları tanıyorsun: derslerde kelime ve dil bilgisini güçlendir; hız düzenli pratikle gelir.',
    msgPL:'Rozpoznajesz już schematy: wzmacniaj słownictwo i gramatykę w lekcjach; tempo przyjdzie z praktyką.'},
  {min:8,  level:'B1', ru:'Средний ориентир',       uk:'Середній орієнтир',       es:'Intermedio (orientativo)', 'pt-BR':'Intermediário (orientativo)', vi:'Trung cấp (tham khảo)', id:'Menengah (orientatif)', tr:'Orta seviye (tahmini)', pl:'Średnio zaawansowany (orientacyjnie)',
    msgRU:'Увереннее держишь материал курса. Отмечай пробелы в темах и возвращайся к блокам «Теория» и «Словарь».',
    msgUK:'Впевненіше тримаєш матеріал курсу. Познач прогалини в темах і повертайся до «Теорії» та «Словника».',
    msgES:'Manejas mejor el contenido del curso. Marca lagunas y repasa «Teoría» y «Vocabulario» donde haga falta.',
    msgPTBR:'Você domina melhor o conteúdo do curso. Marque lacunas e revise “Teoria” e “Vocabulário” quando precisar.',
    msgVI:'Bạn nắm nội dung khóa học chắc hơn. Hãy ghi lại lỗ hổng và quay lại phần “Lý thuyết” và “Từ vựng” khi cần.',
    msgID:'Kamu makin mantap dengan materi kursus. Tandai celah dan ulangi “Teori” serta “Kosakata” saat perlu.',
    msgTR:'Kurs içeriğini daha sağlam tutuyorsun. Eksik konuları işaretle ve gerektiğinde “Teori” ile “Kelime” bölümlerine dön.',
    msgPL:'Coraz pewniej trzymasz materiał kursu. Zaznacz luki i wracaj do sekcji „Teoria” oraz „Słownictwo”.'},
  {min:12, level:'B2', ru:'Выше среднего', uk:'Вище середнього', es:'Intermedio alto (orientativo)', 'pt-BR':'Intermediário alto (orientativo)', vi:'Trung cấp cao (tham khảo)', id:'Menengah atas (orientatif)', tr:'Üst orta seviye (tahmini)', pl:'Wyższy średni (orientacyjnie)',
    msgRU:'Сильный результат в формате теста — не про «талант», а про накопленную практику. Закрепляй слабые темы.',
    msgUK:'Сильний результат у форматі тесту — це про практику, не про «здібності». Закріплюй слабкі теми.',
    msgES:'Muy buen resultado en este formato: refleja práctica acumulada, no «capacidad». Refuerza temas flojos.',
    msgPTBR:'Resultado forte neste formato: é prática acumulada, não “talento”. Reforce os temas mais fracos.',
    msgVI:'Kết quả tốt trong dạng bài này: đó là nhờ luyện tập tích lũy, không phải “năng khiếu”. Hãy củng cố các chủ đề yếu.',
    msgID:'Hasil yang kuat untuk format tes ini: ini soal latihan yang terkumpul, bukan “bakat”. Perkuat topik yang masih lemah.',
    msgTR:'Bu test formatında güçlü sonuç: bu “yetenek” değil, birikmiş pratik. Zayıf konuları pekiştir.',
    msgPL:'Mocny wynik w tym formacie: to efekt zebranej praktyki, nie „talentu”. Utrwal słabsze tematy.'},
  {min:16, level:'C1', ru:'Продвинутый ориентир',   uk:'Просунутий орієнтир',     es:'Avanzado (orientativo)', 'pt-BR':'Avançado (orientativo)', vi:'Nâng cao (tham khảo)', id:'Mahir (orientatif)', tr:'İleri seviye (tahmini)', pl:'Zaawansowany (orientacyjnie)',
    msgRU:'Высокий балл по заданиям приложения — продолжай полировать детали через уроки и повторение.',
    msgUK:'Високий бал за завдання застосунку — продовжуй шліфувати деталі через уроки й повторення.',
    msgES:'Puntuación alta en el formato de la app: sigue puliendo matices con lecciones y repaso.',
    msgPTBR:'Pontuação alta no formato do app: continue lapidando detalhes com aulas e revisão.',
    msgVI:'Điểm cao trong định dạng của ứng dụng: hãy tiếp tục mài giũa chi tiết qua bài học và ôn tập.',
    msgID:'Skor tinggi dalam format aplikasi: terus poles detail lewat pelajaran dan pengulangan.',
    msgTR:'Uygulama formatında yüksek puan: dersler ve tekrarlarla ayrıntıları parlatmaya devam et.',
    msgPL:'Wysoki wynik w formacie aplikacji: dalej dopracowuj szczegóły przez lekcje i powtórki.'},
  {min:20, level:'C2', ru:'Максимум в тесте', uk:'Максимум у тесті', es:'Tope en este test', 'pt-BR':'Máximo neste teste', vi:'Tối đa trong bài kiểm tra này', id:'Maksimum di tes ini', tr:'Bu testte maksimum', pl:'Maksimum w tym teście',
    msgRU:'Все задания верны — отличный ориентир. Закрепи результат регулярными повторениями уроков.',
    msgUK:'Усі завдання вірні — чудовий орієнтир. Закріпи результат регулярним повторенням уроків.',
    msgES:'Pleno en este formato: mantén el nivel con repaso habitual en las lecciones.',
    msgPTBR:'Você acertou tudo neste formato: mantenha o nível com revisão regular nas aulas.',
    msgVI:'Bạn làm đúng toàn bộ trong định dạng này: hãy giữ phong độ bằng cách ôn bài đều đặn.',
    msgID:'Semuanya benar dalam format ini: pertahankan level dengan pengulangan rutin di pelajaran.',
    msgTR:'Bu formatta tüm sorular doğru: derslerde düzenli tekrar yaparak seviyeyi koru.',
    msgPL:'Wszystkie zadania poprawne w tym formacie: utrzymaj poziom regularnymi powtórkami lekcji.'},
];

// CHANGELOG v2: Level-based scoring — level = highest consecutive level with ≥3/4 correct.
// Simple total-count scoring (16/20 → C1) was too generous and allowed C1 via guessing.
const getResult = (score: number, qs?: Question[], ans?: boolean[]) => {
  if (qs && ans && ans.length === qs.length && qs.length > 0) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
    let bestLevel = 'A1';
    for (const lv of levels) {
      const lvIdxs = qs.reduce<number[]>((acc, q, i) => q.level === lv ? [...acc, i] : acc, []);
      const lvCorrect = lvIdxs.filter(i => ans[i]).length;
      if (lvCorrect >= 3) bestLevel = lv; // 75% threshold per level
      else break; // levels are sequential — can\'t skip a failed level
    }
    if (score === qs.length) bestLevel = 'C2'; // perfect score only
    return LEVEL_RESULTS.find(r => r.level === bestLevel) || LEVEL_RESULTS[0];
  }
  return [...LEVEL_RESULTS].reverse().find(r => score >= r.min) || LEVEL_RESULTS[0];
};

function diagnosticResultTitle(lang: Lang, result: (typeof LEVEL_RESULTS)[number]): string {
  return triLang(lang, {
    ru: result.ru,
    uk: result.uk,
    es: result.es,
    'pt-BR': result['pt-BR'],
    vi: result.vi,
    id: result.id,
    tr: result.tr,
    pl: result.pl,
  });
}

function diagnosticResultMessage(lang: Lang, result: (typeof LEVEL_RESULTS)[number]): string {
  return triLang(lang, {
    ru: result.msgRU,
    uk: result.msgUK,
    es: result.msgES,
    'pt-BR': result.msgPTBR,
    vi: result.msgVI,
    id: result.msgID,
    tr: result.msgTR,
    pl: result.msgPL,
  });
}

function diagnosticDateLocale(lang: Lang): string {
  return triLang(lang, {
    ru: 'ru-RU',
    uk: 'uk-UA',
    es: 'es-ES',
    'pt-BR': 'pt-BR',
    vi: 'vi-VN',
    id: 'id-ID',
    tr: 'tr-TR',
    pl: 'pl-PL',
  });
}

// Pick 20 questions: 4×A1, 4×A2, 4×B1, 4×B2, 4×C1 — mix of types
const pickQuestions = () => {
  const result: Question[] = [];
  for (const lv of ['A1','A2','B1','B2','C1'] as const) {
    const lvPool = shuffle(ACTIVE_DIAGNOSTIC_POOL.filter(q => q.level === lv));
    result.push(...lvPool.slice(0, 4));
  }
  return result;
};

type Phase = 'intro' | 'quiz' | 'result';

function FrenchDiagnosticUnavailable({
  lang,
  onBack,
  onLessons,
  sx,
  t,
  f,
}: {
  lang: string;
  onBack: () => void;
  onLessons: () => void;
  sx: ReturnType<typeof screenTextOnGradient>;
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
}) {
  const copy = frenchDiagnosticGateCopy(lang);
  return (
    <ScreenGradient artBackdrop="diagnosticTest">
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale onPress={onBack}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <Ionicons name="shield-checkmark-outline" size={40} color={t.textSecond} />
            </View>
            <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
              {copy.title}
            </Text>
            <Text style={{ color: sx.muted, fontSize: f.bodyLg, lineHeight: 25, textAlign: 'center', marginBottom: 26 }}>
              {copy.body}
            </Text>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={onLessons}
              style={{ backgroundColor: t.bgSurface, borderWidth: 0.5, borderColor: t.border, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 14 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{copy.cta}</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default function DiagnosticTest() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const params = useLocalSearchParams();
  const isFromOnboarding = params.fromOnboarding === '1';
  const { theme: t , f, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang, s } = useLang();
  const { studyTarget } = useStudyTarget();
  const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget);
  const diagnosticUi = useMemo(() => diagnosticUiCopy(lang), [lang]);
  const { isUnlimited, spendOne } = useEnergy();
  const [noEnergy, setNoEnergy] = useState(false);

  const [phase,       setPhase]    = useState<Phase>('intro');
  const [questions, setQuestions]  = useState<Question[]>(() => (frenchDiagnosticBlocked ? [] : pickQuestions()));
  const [idx,         setIdx]      = useState(0);
  const [score,       setScore]    = useState(0);
  const [chosen,      setChosen]   = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typeSubmitted, setTypeSubmitted] = useState(false);
  const [buildSelected, setBuildSelected] = useState<string[]>([]);
  const [buildBank,     setBuildBank]     = useState<string[]>([]);
  const [buildSubmitted, setBuildSubmitted] = useState(false);
  const [timeLeft,    setTimeLeft] = useState(TIMER_SEC);
  const [prevResult,  setPrev]     = useState<{ score: number; level: string; date: string } | null>(null);
  const [hapticsOn,   setHapticsOn]= useState(true);
  const [autoAdvance, setAutoAdvance]= useState(false);
  const { playCorrect } = useCorrectSound();
  const [examLessonsDone, setExamLessonsDone] = useState(0);
  const [examReadiness, setExamReadiness] = useState<ExamReadinessSnapshot>({
    percent: 0,
    currentLesson: 1,
    phrasesLearnedTotal: 0,
    wrongInActiveScope: 0,
  });

  const locked      = useRef(false);
  const inputRef    = useRef<any>(null);
  const handleSkipRef = useRef<() => void>(() => {});
  const handleTimeUpRef = useRef<() => void>(() => {});
  const timerAnim   = useRef(new Animated.Value(1)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeUpFired = useRef(false);
  const answersRef  = useRef<boolean[]>([]);
  const userNameRef = useRef<string>('');
  const diagnosticAttemptIdRef = useRef<string>(makeDiagnosticAttemptId());

  const awardDiagnosticAnswerXp = (question: Question, questionIndex: number, mode: string) => {
    if (!userNameRef.current) return;
    registerXP(2, 'diagnostic_test', userNameRef.current, lang, undefined, {
      eventId: [
        'diagnostic',
        safeDiagnosticEventPart(studyTarget),
        safeDiagnosticEventPart(diagnosticAttemptIdRef.current),
        'answer',
        questionIndex,
        safeDiagnosticEventPart(question.phrase, 40),
      ].join(':'),
      payload: {
        studyTarget,
        questionIndex,
        mode,
        level: question.level,
        question: question.phrase,
      },
    }).catch(() => {});
  };

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const tryStartDiagnosticQuiz = async () => {
    hapticTap();
    clearAutoAdvanceTimer();
    if (frenchDiagnosticBlocked) {
      void trackFeatureBlocked('diagnostic', 'start', 'french_diagnostic_source_gate', { studyTarget }, 'diagnostic_test');
      return;
    }
    void trackFeatureStart('diagnostic', 'start', { total: questions.length }, 'diagnostic_test');
    if (!isUnlimited) {
      const ok = await spendOne();
      if (!ok) {
        void trackFeatureBlocked('diagnostic', 'start', 'no_energy', { total: questions.length }, 'diagnostic_test');
        setNoEnergy(true);
        return;
      }
    }
    diagnosticAttemptIdRef.current = makeDiagnosticAttemptId();
    setPhase('quiz');
    locked.current = false;
  };

  const tryRestartDiagnosticQuiz = async () => {
    hapticTap();
    clearAutoAdvanceTimer();
    if (frenchDiagnosticBlocked) {
      void trackFeatureBlocked('diagnostic', 'restart', 'french_diagnostic_source_gate', { studyTarget }, 'diagnostic_test');
      return;
    }
    void trackFeatureStart('diagnostic', 'restart', { total: questions.length }, 'diagnostic_test');
    if (!isUnlimited) {
      const ok = await spendOne();
      if (!ok) {
        void trackFeatureBlocked('diagnostic', 'restart', 'no_energy', { total: questions.length }, 'diagnostic_test');
        setNoEnergy(true);
        return;
      }
    }
    setIdx(0);
    setScore(0);
    setChosen(null);
    setTypedAnswer('');
    setTypeSubmitted(false);
    diagnosticAttemptIdRef.current = makeDiagnosticAttemptId();
    setPhase('quiz');
    locked.current = false;
  };

  const loadDiagnosticLast = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem(diagnosticLastKey(studyTarget));
      if (!v) {
        setPrev(null);
        return;
      }
      const parsed = JSON.parse(v) as { score?: unknown; level?: unknown; date?: unknown };
      if (
        typeof parsed.score === 'number' &&
        typeof parsed.level === 'string' &&
        typeof parsed.date === 'string'
      ) {
        setPrev({ score: parsed.score, level: parsed.level, date: parsed.date });
      } else {
        setPrev(null);
      }
    } catch {
      setPrev(null);
    }
  }, [studyTarget]);

  useEffect(() => {
    if (frenchDiagnosticBlocked) {
      setQuestions([]);
      setPhase('intro');
      return;
    }
    setQuestions((current) => (current.length > 0 ? current : pickQuestions()));
  }, [frenchDiagnosticBlocked]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) userNameRef.current = n; });
    void loadDiagnosticLast();
    loadSettings().then(s => {
      setHapticsOn(s.haptics);
      setAutoAdvance(s.autoAdvance ?? false);
    });
  }, [loadDiagnosticLast]);

  const loadExamLessonsDone = useCallback(async () => {
    const lessonKeys = Array.from({ length: 32 }, (_, i) => lessonProgressKey(i + 1, studyTarget));
    const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
    let done = 0;
    for (const [, saved] of lessonEntries) {
      if (!saved) continue;
      try {
        const p: string[] = JSON.parse(saved);
        const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
        if (correct >= EXAM_LESSON_DONE_THRESHOLD) done++;
      } catch { /* skip corrupt */ }
    }
    setExamLessonsDone(done);
  }, [studyTarget]);

  const loadExamReadiness = useCallback(async () => {
    try {
      const snap = await loadExamReadinessSnapshot(studyTarget);
      setExamReadiness(snap);
    } catch {
      /* keep previous */
    }
  }, [studyTarget]);

  useFocusEffect(
    useCallback(() => {
      void loadExamLessonsDone();
      void loadDiagnosticLast();
      void loadExamReadiness();
    }, [loadExamLessonsDone, loadDiagnosticLast, loadExamReadiness]),
  );

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timeUpFired.current = false;
    setTimeLeft(TIMER_SEC);
    setTypedAnswer('');
    setTypeSubmitted(false);
    setBuildSelected([]);
    setBuildSubmitted(false);
    const curQ = questions[idx];
    setBuildBank(curQ?.type === 'build' && curQ.words ? shuffle([...curQ.words]) : []);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, { toValue: 0, duration: TIMER_SEC * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          if (!timeUpFired.current) {
            timeUpFired.current = true;
            handleTimeUpRef.current();
          }
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [idx, phase, questions]);

  const advance = (newScore: number) => {
    clearAutoAdvanceTimer();
    if (idx + 1 >= questions.length) {
      const res = getResult(newScore, questions, answersRef.current);
      const lastPayload = {
        score: newScore,
        level: res.level,
        date: new Date().toLocaleDateString(diagnosticDateLocale(lang)),
      };
      void AsyncStorage.setItem(diagnosticLastKey(studyTarget), JSON.stringify(lastPayload));
      setPrev(lastPayload);
      checkAchievements({ type: 'diagnosis', studyTarget }).catch(() => {});
      updateMultipleTaskProgress(
        [{ type: 'diagnostic_complete', increment: 1 }],
        { studyTarget },
      ).catch(() => {});
      awardOneTime('diagnostic_test').catch(() => {});
      void trackFeatureSuccess('diagnostic', 'complete', {
        score: newScore,
        total: questions.length,
        level: res.level,
      }, 'diagnostic_test');
      setPhase('result');
    } else {
      setIdx(i => i + 1);
      setChosen(null);
      setTypedAnswer('');
      setTypeSubmitted(false);
      locked.current = false;
    }
  };

  const scheduleDiagnosticAdvance = (newScore: number, delayMs: number) => {
    clearAutoAdvanceTimer();
    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      advance(newScore);
    }, delayMs);
  };

  const stopQuestionTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerAnim.stopAnimation();
  };

  useEffect(() => () => {
    clearAutoAdvanceTimer();
    stopQuestionTimer();
  }, []);

  /** Время вышло: без выбора варианта и без показа правильного ответа — сразу дальше, как неверно. */
  const handleTimeUp = () => {
    if (locked.current || chosen !== null || typeSubmitted || buildSubmitted) return;
    locked.current = true;
    stopQuestionTimer();
    answersRef.current = [...answersRef.current, false];
    const qq = questions[idx];
    if (qq) void recordMistakeFromDiagnostic(qq, studyTarget);
    if (hapticsOn) void hapticError();
    advance(score);
  };

  const handleSkip = () => {
    if (locked.current || chosen !== null || typeSubmitted || buildSubmitted) return;
    locked.current = true;
    stopQuestionTimer();
    setChosen(-1);
    answersRef.current = [...answersRef.current, false];
    const qq = questions[idx];
    if (qq) void recordMistakeFromDiagnostic(qq, studyTarget);
    scheduleDiagnosticAdvance(score, 900);
  };
  handleSkipRef.current = handleSkip;
  handleTimeUpRef.current = handleTimeUp;

  const handleAnswer = (ci: number) => {
    if (locked.current || chosen !== null) return;
    const cur = questions[idx];
    if (!cur) {
      locked.current = false;
      return;
    }
    locked.current = true;
    stopQuestionTimer();
    setChosen(ci);
    const isRight = ci === cur.correct;
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    if (isRight) {
      setScore(ns);
      playCorrect();
      awardDiagnosticAnswerXp(cur, idx, 'choice');
    } else if (hapticsOn) {
      void hapticError();
    }
    if (!isRight) {
      const qq = questions[idx];
      if (qq) void recordMistakeFromDiagnostic(qq, studyTarget);
    }
    if (autoAdvance) scheduleDiagnosticAdvance(ns, 1500);
  };

  const handleTypeSubmit = () => {
    if (locked.current || typeSubmitted) return;
    const q = questions[idx];
    // Normalize: lowercase, trim, strip trailing punctuation (? ! .) so typing "?" doesn't cause error
    const expectedAnswer = q?.answer || q?.opts?.[q.correct];
    if (!expectedAnswer) { locked.current = false; return; }
    locked.current = true;
    stopQuestionTimer();
    const isRight = isCorrectAnswer(typedAnswer, expectedAnswer);
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    setTypeSubmitted(true);
    setChosen(isRight && q ? q.correct : -1);
    if (isRight) {
      setScore(ns);
      playCorrect();
      if (q) awardDiagnosticAnswerXp(q, idx, 'type');
    } else if (hapticsOn) {
      void hapticError();
    }
    if (!isRight) {
      const qq = questions[idx];
      if (qq) void recordMistakeFromDiagnostic(qq, studyTarget);
    }
    if (autoAdvance) scheduleDiagnosticAdvance(ns, 1500);
  };

  const handleBuildSubmit = () => {
    if (locked.current || buildSubmitted || buildSelected.length === 0) return;
    const cur = questions[idx];
    if (!cur) return;
    locked.current = true;
    stopQuestionTimer();
    const expected = cur.answer || '';
    const isRight = isCorrectAnswer(buildSelected.join(' '), expected);
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    setBuildSubmitted(true);
    setChosen(isRight ? 0 : -1);
    if (isRight) {
      setScore(ns);
      playCorrect();
      awardDiagnosticAnswerXp(cur, idx, 'build');
    } else if (hapticsOn) {
      void hapticError();
    }
    if (!isRight) {
      const qq = questions[idx];
      if (qq) void recordMistakeFromDiagnostic(qq, studyTarget);
    }
    if (autoAdvance) scheduleDiagnosticAdvance(ns, 1500);
  };

  if (frenchDiagnosticBlocked) {
    return (
      <FrenchDiagnosticUnavailable
        lang={lang}
        onBack={() => safeRouterBack(router)}
        onLessons={() => router.replace('/(tabs)/lessons' as any)}
        sx={sx}
        t={t}
        f={f}
      />
    );
  }

  const q = questions[idx] ?? questions[0];
  const qOpts = diagnosticQuestionOptions(lang, q);
  const result = getResult(score, questions, answersRef.current);

  if (phase === 'quiz' && (!q || questions.length === 0)) {
    return (
      <ScreenGradient artBackdrop="diagnosticTest">
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center' }}>
                {diagnosticUi.loadError}
              </Text>
              <TapScale onPress={() => safeRouterBack(router)} style={{ marginTop: 20 }}>
                <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '700' }}>
                  {diagnosticUi.back}
                </Text>
              </TapScale>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }
  const barColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1], outputRange: [t.wrong, t.bgSurface, t.textSecond],
  });

  // ── ИНТРО ────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <>
    <ScreenGradient artBackdrop="diagnosticTest">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        {!isFromOnboarding && (
          <TapScale onPress={() => safeRouterBack(router)}>
            <Ionicons name="chevron-back" size={28} color={sx.primary} />
          </TapScale>
        )}
        <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700', marginLeft: isFromOnboarding ? 0 : 8 }}>
          {s.diagnostic.start}
        </Text>
      </View>
      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ padding: 24 }}>
        {prevResult && (
          <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border, marginBottom: 20, width: '100%' }}>
            <Text style={{ color: t.textSecond, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              {s.diagnostic.prevResult}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} numberOfLines={2}>
              {prevResult.level} — {diagnosticResultTitle(lang, LEVEL_RESULTS.find(r => r.level === prevResult.level) ?? LEVEL_RESULTS[0])}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 10 }}>
              {s.diagnostic.correct}: {prevResult.score} / {questions.length}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 4 }}>
              {triLang(lang, { ru: 'Дата', uk: 'Дата', es: 'Fecha', 'pt-BR': 'Data', vi: 'Ngày', id: 'Tanggal', tr: 'Tarih', pl: 'Data' })}: {prevResult.date}
            </Text>
          </View>
        )}

        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 16,
            padding: 16,
            borderWidth: 0.5,
            borderColor: t.border,
            marginBottom: 20,
            width: '100%',
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
            {s.diagnostic.examReadinessTitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12, gap: 6 }}>
            <Text style={{ color: t.accent, fontSize: f.numLg + 10, fontWeight: '800' }}>{examReadiness.percent}</Text>
            <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '700' }}>%</Text>
          </View>
          <View
            style={{
              width: '100%',
              height: 8,
              backgroundColor: t.bgSurface2,
              borderRadius: 4,
              marginTop: 12,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${examReadiness.percent}%` as `${number}%`,
                height: '100%',
                backgroundColor: t.correct,
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: t.bgSurface,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderWidth: 0.5,
            borderColor: t.border,
            marginTop: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
          onPress={() => { hapticTap(); router.push('/exam'); }}
          activeOpacity={0.85}
        >
          <Image source={examMenuImage(themeMode)} style={{ width: 56, height: 56, flexShrink: 0 }} contentFit="contain" cachePolicy="memory-disk" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>{s.home.examBtn}</Text>
            <Text style={{ color: t.textSecond, fontSize: f.label, marginTop: 4 }}>
              {examLessonsDone}/32 {triLang(lang, { ru: 'уроков', uk: 'уроків', es: 'lecciones', 'pt-BR': 'lições', vi: 'bài học', id: 'pelajaran', tr: 'ders', pl: 'lekcji' })}
            </Text>
            <View style={{ width: '100%', height: 4, backgroundColor: t.bgSurface2, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.round((examLessonsDone / 32) * 100)}%` as `${number}%`,
                  height: '100%',
                  backgroundColor: t.correct,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 0.5, borderColor: t.border, marginTop: 12 }}
          onPress={() => { void tryStartDiagnosticQuiz(); }}
          activeOpacity={0.85}
        >
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}
            numberOfLines={2}
          >
            {s.diagnostic.startTest}
          </Text>
        </TouchableOpacity>

        {!isUnlimited && (
          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 10 }}>
            {triLang(lang, {
              ru: '1 ⚡ за старт диагностики',
              uk: '1 ⚡ за початок діагностики',
              es: '1 ⚡ al empezar el test de nivel',
              'pt-BR': '1 ⚡ para iniciar o teste de nível',
              vi: '1 ⚡ để bắt đầu bài kiểm tra trình độ',
              id: '1 ⚡ untuk memulai tes level',
              tr: 'Seviye testini başlatmak için 1 ⚡',
              pl: '1 ⚡ za rozpoczęcie testu poziomującego',
            })}
          </Text>
        )}

        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 16,
            padding: 16,
            borderWidth: 0.5,
            borderColor: t.border,
            marginTop: 20,
            width: '100%',
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
            {s.diagnostic.currentEnglishLevelTitle}
          </Text>
          {prevResult ? (
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700', marginTop: 12, lineHeight: 26 }} numberOfLines={3}>
              {prevResult.level} — {diagnosticResultTitle(lang, LEVEL_RESULTS.find(r => r.level === prevResult.level) ?? LEVEL_RESULTS[0])}
            </Text>
          ) : (
            <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: 'bold', marginTop: 10, lineHeight: 24 }}>
              {s.diagnostic.currentEnglishLevelHintBeforeTest}
            </Text>
          )}
        </View>

      </BouncyScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} />
    </>
  );

  // ── РЕЗУЛЬТАТ ────────────────────────────────────────────────────────────
  if (phase === 'result') return (
    <>
    <ScreenGradient artBackdrop="diagnosticTest">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
          <Ionicons name="school-outline" size={44} color={t.textSecond} />
        </View>
        <Text style={{ color: sx.second, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          {s.diagnostic.yourLevel}
        </Text>
        <Text style={{ color: sx.primary, fontSize: f.numLg + 16, fontWeight: '700' }} numberOfLines={1}>{result.level}</Text>
        <Text style={{ color: sx.second, fontSize: f.h1, fontWeight: '600', marginTop: 4 }}>
          {diagnosticResultTitle(lang, result)}
        </Text>
        <Text style={{ color: sx.second, fontSize: f.body, textAlign: 'center', marginTop: 16, lineHeight: 24, marginBottom: 28 }}>
          {diagnosticResultMessage(lang, result)}
        </Text>
        <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: t.border, width: '100%', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 6 }}>
            {s.diagnostic.correct}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg + 12, fontWeight: '700' }} numberOfLines={1}>{score} / {questions.length}</Text>
          {score > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: t.correctBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="star" size={14} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '600' }}>
                {s.diagnostic.points(score)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12, borderWidth: 0.5, borderColor: t.border }}
          onPress={() => { void tryRestartDiagnosticQuiz(); }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {s.diagnostic.again}
          </Text>
        </TouchableOpacity>
        <TapScale style={{ padding: 14 }} onPress={() => { hapticTap(); router.replace('/(tabs)/home' as any); }}>
          <Text style={{ color: sx.second, fontSize: f.body }}>{s.diagnostic.backHome}</Text>
        </TapScale>
      </BouncyScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} />
    </>
  );

  // ── ВОПРОС ────────────────────────────────────────────────────────────────
  const isTyping = q.type === 'type';
  const isBuilding = q.type === 'build';
  const isAnswered = chosen !== null || typeSubmitted || buildSubmitted;
  const correctAnswer = isTyping ? (q?.answer || q?.opts?.[q.correct] || '') : '';
  const continueA11yLabel = diagnosticUi.continue;
  const continueButtonLabel = `${diagnosticUi.continue} →`;

  return (
    <ScreenGradient artBackdrop="diagnosticTest">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}>
          {isFromOnboarding ? (
            <TapScale onPress={() => { AsyncStorage.removeItem(diagnosticOpenFlagKey(studyTarget)); router.replace('/(tabs)/home' as any); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: sx.primary, fontSize: f.body, fontWeight: '600' }}>
                {diagnosticUi.cancel}
              </Text>
            </TapScale>
          ) : (
            <TapScale onPress={() => safeRouterBack(router)}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
          )}
          <Text style={{ color: sx.second, fontSize: f.body, fontWeight: '500' }}>{idx + 1} / {questions.length}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={16} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '600' }}>{score}</Text>
          </View>
        </View>

        {/* Таймер-бар */}
        <View style={{ height: 5, backgroundColor: t.border, marginHorizontal: 16, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
          <Animated.View style={{
            height: '100%', borderRadius: 3, backgroundColor: barColor,
            width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }} />
        </View>
        <Text style={{ color: sx.second, fontSize: f.label, textAlign: 'right', marginRight: 16, marginBottom: 12 }}>
          {isAnswered ? '—' : `${timeLeft}${diagnosticUi.secondSuffix}`}
        </Text>

        <BouncyScrollView
          style={{ flex: 1 }}
          decelerationRate="normal"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: Math.max(24, insets.bottom + 24),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={{ flexGrow: 1, justifyContent: 'space-between' }}>
          <View>
          {/* Тип вопроса */}
          {q.type === 'build' && (
            <Text
              style={{ color: sx.second, fontSize: f.label, marginBottom: 4 }}
              accessibilityRole="text"
              accessibilityLabel={diagnosticSkillA11y(lang, 'build')}
            >
              {diagnosticBuildHeader(lang)}
            </Text>
          )}
          {q.type === 'choice4' && (
            <Text
              style={{ color: sx.second, fontSize: f.label, marginBottom: 4 }}
              accessibilityRole="text"
              accessibilityLabel={diagnosticSkillA11y(lang, 'choice4')}
            >
              {triLang(lang, { ru: '🔤 Выбери верный вариант', uk: '🔤 Обери правильний варіант', es: '🔤 Elige la opción correcta', 'pt-BR': '🔤 Escolha a opção correta', vi: '🔤 Chọn đáp án đúng', id: '🔤 Pilih jawaban yang benar', tr: '🔤 Doğru seçeneği seç', pl: '🔤 Wybierz poprawną odpowiedź' })}
            </Text>
          )}
          {q.type === 'match' && (
            <Text
              style={{ color: sx.second, fontSize: f.label, marginBottom: 4 }}
              accessibilityRole="text"
              accessibilityLabel={diagnosticSkillA11y(lang, 'match')}
            >
              {triLang(lang, { ru: '🔗 Сопоставь слово и значение', uk: '🔗 Зістав слово й значення', es: '🔗 Relaciona palabra y significado', 'pt-BR': '🔗 Relacione palavra e significado', vi: '🔗 Nối từ với nghĩa', id: '🔗 Cocokkan kata dan arti', tr: '🔗 Kelimeyle anlamı eşleştir', pl: '🔗 Połącz słowo ze znaczeniem' })}
            </Text>
          )}
          {q.type === 'type' && (
            <Text
              style={{ color: sx.second, fontSize: f.label, marginBottom: 4 }}
              accessibilityRole="text"
              accessibilityLabel={diagnosticSkillA11y(lang, 'type')}
            >
              {triLang(lang, { ru: '⌨️ Введи пропущенное слово', uk: '⌨️ Введи пропущене слово', es: '⌨️ Escribe la palabra que falta', 'pt-BR': '⌨️ Digite a palavra que falta', vi: '⌨️ Nhập từ còn thiếu', id: '⌨️ Ketik kata yang hilang', tr: '⌨️ Eksik kelimeyi yaz', pl: '⌨️ Wpisz brakujące słowo' })}
            </Text>
          )}

          <ClozeGapText
            text={q.type === 'build' ? diagnosticQuestionHint(lang, q) : q.phrase}
            style={{ color: sx.primary, fontSize: f.numMd + 6, fontWeight: '500', lineHeight: 36, marginBottom: 12 }}
          />
          </View>

          <View style={{ paddingBottom: 16 }}>
          {/* BUILD — интерактивная сборка фразы */}
          {isBuilding && (
            <View>
              {/* Answer area */}
              <View style={{
                minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', gap: 6,
                backgroundColor: buildSubmitted ? (chosen === 0 ? t.correctBg : t.wrongBg) : t.bgCard,
                borderRadius: 12, padding: 10, marginBottom: 8,
                borderWidth: 1.5,
                borderColor: buildSubmitted ? (chosen === 0 ? t.correct : t.wrong) : (buildSelected.length > 0 ? t.textSecond : t.border),
              }}>
                {buildSelected.length === 0 ? (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontStyle: 'italic', alignSelf: 'center' }}>
                    {diagnosticUi.buildPlaceholder}
                  </Text>
                ) : (
                  buildSelected.map((word, wi) => (
                    <TouchableOpacity
                      key={wi}
                      onPress={() => {
                        if (buildSubmitted) return;
                        setBuildSelected(prev => prev.filter((_, i) => i !== wi));
                        setBuildBank(prev => [...prev, word]);
                      }}
                      style={{ backgroundColor: t.bgSurface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.border }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body }}>{word}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              {buildSubmitted && chosen !== 0 && (
                <Text style={{ color: t.correct, fontSize: f.sub, marginBottom: 8, marginLeft: 4 }}>
                  ✓ {q.answer}
                </Text>
              )}
              {/* Word bank */}
              {!buildSubmitted && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {buildBank.map((word, wi) => (
                    <TouchableOpacity
                      key={wi}
                      onPress={() => {
                        setBuildBank(prev => prev.filter((_, i) => i !== wi));
                        setBuildSelected(prev => [...prev, word]);
                      }}
                      style={{ backgroundColor: t.bgSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: t.border }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body }}>{word}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Submit */}
              {!buildSubmitted && (
                <TouchableOpacity
                  style={{
                    backgroundColor: buildSelected.length > 0 ? t.bgSurface : t.bgCard,
                    borderRadius: 12, padding: 14, alignItems: 'center',
                    borderWidth: 1, borderColor: buildSelected.length > 0 ? t.textSecond : t.border,
                    opacity: buildSelected.length > 0 ? 1 : 0.45,
                  }}
                  onPress={handleBuildSubmit}
                  disabled={buildSelected.length === 0}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: buildSelected.length > 0 ? t.textPrimary : t.textMuted, fontSize: f.body, fontWeight: '600' }}>
                    {diagnosticUi.check}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TYPE — текстовый ввод */}
          {isTyping && (
            <View style={{ marginBottom: 16 }}>
              <View style={{
                flexDirection: 'row', borderWidth: 1.5,
                borderColor: typeSubmitted ? (chosen === q.correct ? t.correct : t.wrong) : t.border,
                borderRadius: 14, overflow: 'hidden', backgroundColor: t.bgCard,
              }}>
                <TextInput
                  ref={inputRef}
                  style={{ flex: 1, padding: 16, fontSize: f.h2, color: t.textPrimary, fontWeight: '500' }}
                  placeholder={diagnosticUi.typeHere}
                  placeholderTextColor={t.textSecond}
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  editable={!typeSubmitted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleTypeSubmit}
                />
                {!typeSubmitted && (
                  <TouchableOpacity
                    style={{ backgroundColor: t.bgSurface, paddingHorizontal: 16, justifyContent: 'center', borderLeftWidth: 0.5, borderLeftColor: t.border }}
                    onPress={handleTypeSubmit}
                  >
                    <Ionicons name="checkmark" size={22} color={t.textSecond} />
                  </TouchableOpacity>
                )}
              </View>
              {typeSubmitted && chosen !== q.correct && (
                <Text style={{ color: t.correct, fontSize: f.sub, marginTop: 8, marginLeft: 4 }}>
                  ✓ {diagnosticUi.correctAnswerPrefix}: {correctAnswer}
                </Text>
              )}
            </View>
          )}

          {/* Выбор вариантов */}
          {!isTyping && !isBuilding && (
            <View style={{ gap: 10 }}>
              {qOpts.map((opt, ci) => {
                let bg = t.bgCard, border = t.border, tc = t.textPrimary;
                if (chosen !== null) {
                  if (ci === q.correct)                    { bg = t.correctBg; border = t.correct; tc = t.correct; }
                  else if (ci === chosen && chosen !== -1) { bg = t.wrongBg;   border = t.wrong;   tc = t.wrong;   }
                }
                if (chosen === -1 && ci === q.correct)     { bg = t.correctBg; border = t.correct; tc = t.correct; }
                return (
                  <TouchableOpacity key={ci}
                    style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 18 }}
                    onPress={() => { hapticTap(); handleAnswer(ci); }}
                    activeOpacity={0.8}
                    disabled={chosen !== null}
                  >
                    <Text style={{ color: tc, fontSize: f.h2, fontWeight: '500' }}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {q && (
            <ReportErrorButton
              screen="exam"
              dataId={`diagnostic_q${idx}_${String(q.phrase).replace(/\s+/g,'_').slice(0,30)}`}
              dataText={(() => {
                const qSummary =
                  q.type === 'build'
                    ? `${diagnosticBuildHeader(lang)} — ${diagnosticQuestionHint(lang, q)}`
                    : `Q: ${q.phrase}`;
                const optsForReport = diagnosticQuestionOptions(lang, q);
                return [
                  qSummary,
                  `${diagnosticUi.options}: ${optsForReport.map((o: string, i: number) => i === q.correct ? `[✓${o}]` : o).join(' | ')}`,
                ].join('\n');
              })()}
              style={{ alignSelf: 'flex-end', paddingHorizontal: 16 }}
              textColor={sx.muted}
            />
          )}

          {/* ADDED: кнопка "Пропустить" — пропустить вопрос если не знаешь ответа. Засчитывается как неверно. */}
          {!isAnswered && (
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
              onPress={() => { hapticTap(); handleSkip(); }}
              activeOpacity={0.5}
            >
              <Text style={{ color: sx.muted, fontSize: f.body }}>
                {diagnosticUi.skip}
              </Text>
            </TouchableOpacity>
          )}
          </View>
        </View>
        </BouncyScrollView>
        {isAnswered && !autoAdvance && (
          <View
            testID="diagnostic-continue-footer"
            style={{
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: Math.max(12, insets.bottom + 12),
              borderTopWidth: 1,
              borderTopColor: t.border,
            }}
          >
            <TouchableOpacity
              style={{
                minHeight: 52,
                backgroundColor: `${t.accent}22`,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: t.accent,
              }}
              onPress={() => { hapticTap(); advance(score); }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={continueA11yLabel}
            >
              <Text style={{ color: t.accent, fontSize: f.bodyLg, fontWeight: '800' }}>
                {continueButtonLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </ContentWrap>
      </SafeAreaView>
    </KeyboardAvoidingView>
    </ScreenGradient>
  );
}
