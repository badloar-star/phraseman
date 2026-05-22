import React, { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { ERROR_REPORT_COMMENT_MIN_LEN, submitErrorReport } from '../app/error_report';
import XpGainBadge from './XpGainBadge';

/** Экраны с общим набором категорий (не урок/квиз). */
const GENERAL_APP_SCREEN_IDS = new Set([
  'home',
  'arena_lobby',
  'arena_game',
  'daily_tasks',
  'flashcards_collection',
  'flashcards_hub',
  'trainer',
  'progress_map',
  'streak_stats',
  'achievements',
  'community_pack_create',
  'friends_tab',
  'shards_shop',
  'settings_tab',
  'lessons_tab',
  'premium_modal',
]);

type PlannedReportLabel = {
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

type ReportCategory = { key: string; label: string };
type LocalizedReportCategory = ReportCategory;
type LegacyReportLabel = { primary: string; secondary: string; tertiary: string };

const REPORT_CATEGORY_OTHER_LABEL: LegacyReportLabel = {
  primary: 'Другое',
  secondary: 'Інше',
  tertiary: 'Otro',
};

const CATEGORY_LABEL_PLANNED: Record<string, PlannedReportLabel> = {
  'Неверный правильный ответ': {
    'pt-BR': 'A resposta marcada como correta está errada',
    vi: 'Đáp án được đánh dấu là đúng bị sai',
    id: 'Jawaban yang ditandai benar ternyata salah',
    tr: 'Doğru işaretlenen cevap hatalı',
    pl: 'Odpowiedź oznaczona jako poprawna jest błędna',
  },
  'Опечатка / ошибка в тексте': {
    'pt-BR': 'Erro de digitação ou no texto',
    vi: 'Lỗi chính tả hoặc lỗi trong văn bản',
    id: 'Salah ketik atau kesalahan teks',
    tr: 'Yazım hatası veya metin hatası',
    pl: 'Literówka lub błąd w tekście',
  },
  'Неточный перевод': {
    'pt-BR': 'Tradução imprecisa',
    vi: 'Bản dịch chưa chính xác',
    id: 'Terjemahan kurang akurat',
    tr: 'Çeviri hatalı veya eksik',
    pl: 'Niedokładne tłumaczenie',
  },
  'Неверная подсказка к уроку': {
    'pt-BR': 'Dica incorreta na lição',
    vi: 'Gợi ý trong bài học bị sai',
    id: 'Petunjuk di pelajaran keliru',
    tr: 'Dersteki ipucu yanlış',
    pl: 'Błędna podpowiedź w lekcji',
  },
  'Баг интерфейса': {
    'pt-BR': 'Falha na interface',
    vi: 'Lỗi giao diện',
    id: 'Bug antarmuka',
    tr: 'Arayüz hatası',
    pl: 'Błąd interfejsu',
  },
  'Другое': {
    'pt-BR': 'Outro',
    vi: 'Khác',
    id: 'Lainnya',
    tr: 'Diğer',
    pl: 'Inne',
  },
  'Все варианты неправильные': {
    'pt-BR': 'Todas as opções estão erradas',
    vi: 'Tất cả lựa chọn đều sai',
    id: 'Semua pilihan salah',
    tr: 'Tüm seçenekler yanlış',
    pl: 'Wszystkie odpowiedzi są błędne',
  },
  'Сбивает подсказка / формулировка': {
    'pt-BR': 'A dica ou o enunciado confunde',
    vi: 'Gợi ý hoặc cách diễn đạt gây nhầm lẫn',
    id: 'Petunjuk atau kalimatnya membingungkan',
    tr: 'İpucu veya ifade kafa karıştırıyor',
    pl: 'Podpowiedź lub sformułowanie myli',
  },
  'Неверная форма глагола': {
    'pt-BR': 'Forma verbal incorreta',
    vi: 'Dạng động từ bị sai',
    id: 'Bentuk kata kerja salah',
    tr: 'Fiil biçimi yanlış',
    pl: 'Nieprawidłowa forma czasownika',
  },
  'Ошибка в объяснении': {
    'pt-BR': 'Erro na explicação',
    vi: 'Lỗi trong phần giải thích',
    id: 'Kesalahan dalam penjelasan',
    tr: 'Açıklamada hata',
    pl: 'Błąd w wyjaśnieniu',
  },
  'Опечатка в тексте': {
    'pt-BR': 'Erro de digitação no texto',
    vi: 'Lỗi chính tả trong văn bản',
    id: 'Salah ketik dalam teks',
    tr: 'Metinde yazım hatası',
    pl: 'Literówka w tekście',
  },
  'Неточный пример': {
    'pt-BR': 'Exemplo impreciso',
    vi: 'Ví dụ chưa chính xác',
    id: 'Contoh kurang akurat',
    tr: 'Örnek hatalı veya eksik',
    pl: 'Niedokładny przykład',
  },
  'Криво отображается интерфейс': {
    'pt-BR': 'A interface aparece quebrada ou cobre conteúdo',
    vi: 'Giao diện hiển thị sai hoặc che nội dung',
    id: 'Antarmuka tampil rusak atau menutupi konten',
    tr: 'Arayüz bozuk görünüyor veya içeriği kapatıyor',
    pl: 'Interfejs wyświetla się źle lub zasłania treść',
  },
  'Не срабатывает кнопка или переход': {
    'pt-BR': 'Um botão ou uma tela não responde',
    vi: 'Nút hoặc màn hình không phản hồi',
    id: 'Tombol atau perpindahan layar tidak merespons',
    tr: 'Bir düğme veya geçiş çalışmıyor',
    pl: 'Przycisk lub przejście nie działa',
  },
  'Прогресс, опыт или награды': {
    'pt-BR': 'Progresso, XP ou recompensas',
    vi: 'Tiến độ, XP hoặc phần thưởng',
    id: 'Progres, XP, atau hadiah',
    tr: 'İlerleme, XP veya ödüller',
    pl: 'Postęp, XP lub nagrody',
  },
  'Подписка, покупка или осколки': {
    'pt-BR': 'Assinatura, compra ou fragmentos',
    vi: 'Gói đăng ký, giao dịch mua hoặc mảnh',
    id: 'Langganan, pembelian, atau pecahan',
    tr: 'Abonelik, satın alma veya parçalar',
    pl: 'Subskrypcja, zakup lub odłamki',
  },
  'Неверный текст или картинка на экране': {
    'pt-BR': 'Texto ou imagem incorretos na tela',
    vi: 'Văn bản hoặc hình ảnh trên màn hình bị sai',
    id: 'Teks atau gambar di layar salah',
    tr: 'Ekrandaki metin veya görsel yanlış',
    pl: 'Nieprawidłowy tekst lub obraz na ekranie',
  },
};

interface Props {
  screen: string;
  /** машинно-читаемый ключ для поиска в коде: "lesson_5_phrase_42", "irregular_verb_go" */
  dataId: string;
  /** человекочитаемый текст: фраза, вопрос, слово */
  dataText?: string;
  /** What the user actually entered/assembled before sending the report. */
  userAnswer?: string;
  style?: object;
  onSuccess?: (xpGained: number) => void;
  /** Только красный флаг без подписи (напр. угол карточки описания) */
  variant?: 'default' | 'icon-flag';
  accessibilityLabel?: string;
  testID?: string;
  textColor?: string;
}

const REPORT_CATEGORY_SETS: Record<string, ReportCategory[]> = {
  lesson: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'hint',          label: 'Неверная подсказка к уроку|Неправильна підказка до уроку|Pista equivocada en la lección' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  /** Разбор вопросов Арены после матча (см. arena_results). */
  arena_results_review: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'all_wrong',     label: 'Все варианты неправильные|Усі варіанти неправильні|Todas las opciones son incorrectas' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  quiz: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'all_wrong',     label: 'Все варианты неправильные|Усі варіанти неправильні|Todas las opciones son incorrectas' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  exam: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'all_wrong',     label: 'Все варианты неправильные|Усі варіанти неправильні|Todas las opciones son incorrectas' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  flashcards: [
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  lesson_words: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'hint',          label: 'Сбивает подсказка / формулировка|Плутає підказка / формулювання|La pista o el enunciado confunden' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  lesson_irregular_verbs: [
    { key: 'wrong_form',    label: 'Неверная форма глагола|Неправильна форма дієслова|Forma verbal incorrecta' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'all_wrong',     label: 'Все варианты неправильные|Усі варіанти неправильні|Todas las opciones son incorrectas' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  review: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  theory: [
    { key: 'explanation',   label: 'Ошибка в объяснении|Помилка в поясненні|Fallo en la explicación' },
    { key: 'typo',          label: 'Опечатка в тексте|Друкарська помилка в тексті|Error ortográfico en el texto' },
    { key: 'example',       label: 'Неточный пример|Неточний приклад|Ejemplo inexacto' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  /** Вкладки и экраны без привязки к одному заданию. */
  general: [
    { key: 'ui_bug',           label: 'Криво отображается интерфейс|Криво відображається інтерфейс|La interfaz se ve mal o tapa contenido' },
    { key: 'broken_action',    label: 'Не срабатывает кнопка или переход|Не спрацьовує кнопка чи перехід|No responde un botón o una pantalla' },
    { key: 'progress_rewards', label: 'Прогресс, опыт или награды|Прогрес, досвід чи нагороди|Progreso, XP o recompensas' },
    { key: 'payment_premium', label: 'Подписка, покупка или осколки|Підписка, покупка чи уламки|Suscripción, compra o fragmentos' },
    { key: 'content_wrong',    label: 'Неверный текст или картинка на экране|Невірний текст чи зображення|Texto o imagen incorrectos en pantalla' },
    { key: 'other',            label: 'Другое|Інше|Otro' },
  ],
  level_exam: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'all_wrong',     label: 'Все варианты неправильные|Усі варіанти неправильні|Todas las opciones son incorrectas' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
};

function getCategoriesForScreen(screen: string) {
  if (GENERAL_APP_SCREEN_IDS.has(screen)) {
    return REPORT_CATEGORY_SETS.general;
  }
  if (screen === 'level_exam') {
    return REPORT_CATEGORY_SETS.level_exam;
  }
  if (screen.startsWith('lesson_') && !screen.includes('words') && !screen.includes('irregular')) {
    return REPORT_CATEGORY_SETS.lesson;
  }
  // Longer keys first so `lesson_words` / `lesson_irregular_verbs` are not swallowed by `lesson`.
  const keys = Object.keys(REPORT_CATEGORY_SETS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (screen.includes(key)) return REPORT_CATEGORY_SETS[key];
  }
  return REPORT_CATEGORY_SETS.lesson;
}

function splitReportCategoryLabel(label: string): LegacyReportLabel {
  const [ruCopy, ukCopy, esCopy] = label.split('|').map(part => part.trim());
  return {
    primary: ruCopy || REPORT_CATEGORY_OTHER_LABEL.primary,
    secondary: ukCopy || REPORT_CATEGORY_OTHER_LABEL.secondary,
    tertiary: esCopy || REPORT_CATEGORY_OTHER_LABEL.tertiary,
  };
}

function plannedReportCategoryLabel(category: ReportCategory, legacy: LegacyReportLabel): PlannedReportLabel {
  const planned = CATEGORY_LABEL_PLANNED[legacy.primary];
  if (planned) return planned;
  const explicitOther = CATEGORY_LABEL_PLANNED[REPORT_CATEGORY_OTHER_LABEL.primary];
  if (category.key === 'other') return explicitOther;
  return {
    'pt-BR': 'Categoria em revisão',
    vi: 'Danh mục đang được rà soát',
    id: 'Kategori sedang ditinjau',
    tr: 'Kategori inceleniyor',
    pl: 'Kategoria w trakcie przeglądu',
  };
}

export function reportErrorCategoriesForLang(screen: string, lang: Lang): LocalizedReportCategory[] {
  return getCategoriesForScreen(screen).map(category => {
    const legacy = splitReportCategoryLabel(category.label);
    const planned = plannedReportCategoryLabel(category, legacy);
    return {
      ...category,
      label: triLang(lang, {
        ru: legacy.primary,
        uk: legacy.secondary,
        es: legacy.tertiary,
        'pt-BR': planned['pt-BR'],
        vi: planned.vi,
        id: planned.id,
        tr: planned.tr,
        pl: planned.pl,
      }),
    };
  });
}

export default function ReportErrorButton({
  screen,
  dataId,
  dataText,
  userAnswer,
  style,
  onSuccess,
  variant = 'default',
  accessibilityLabel,
  testID,
  textColor,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const maxSheetHeight = Math.max(360, Dimensions.get('window').height - insets.top - 12);
  const categories = reportErrorCategoriesForLang(screen, lang);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [throttled, setThrottled] = useState(false);
  const [commentRequiredError, setCommentRequiredError] = useState(false);

  const handleOpen = () => {
    setSelected(null);
    setComment('');
    setCommentRequiredError(false);
    setSent(false);
    setThrottled(false);
    setVisible(true);
  };

  const commentTrimmed = comment.trim();
  const commentOk = commentTrimmed.length >= ERROR_REPORT_COMMENT_MIN_LEN;

  const handleSend = async () => {
    if (!selected || sending) return;
    if (!commentOk) {
      setCommentRequiredError(true);
      return;
    }
    setCommentRequiredError(false);
    setSending(true);
    const nameRaw = await AsyncStorage.getItem('user_name') ?? '';
    const storedLang = (
      (await AsyncStorage.getItem('app_lang')) ??
      (await AsyncStorage.getItem('app_language')) ??
      'ru'
    );
    const langRaw = storedLang === 'uk' || storedLang === 'es' ? storedLang : 'ru';
    const result = await submitErrorReport(
      {
        screen,
        category: selected,
        dataId,
        dataText: dataText ?? dataId,
        userAnswer,
        comment: commentTrimmed,
      },
      nameRaw,
      langRaw,
    );
    setSending(false);
    if (result === 'invalid_comment') {
      setCommentRequiredError(true);
      return;
    }
    if (result === 'throttled') {
      setThrottled(true);
      return;
    }
    setSent(true);
    setTimeout(() => {
      setVisible(false);
      onSuccess?.(10);
    }, 4000);
  };

  const isFlag = variant === 'icon-flag';

  const a11yLabel = accessibilityLabel || triLang(lang, {
    ru: 'Сообщить об ошибке в тексте карточки',
    uk: 'Повідомити про помилку в тексті картки',
    es: 'Informar de un error en el texto de la tarjeta',
    'pt-BR': 'Informar um erro no texto do cartão',
    vi: 'Báo lỗi trong văn bản của thẻ',
    id: 'Laporkan kesalahan pada teks kartu',
    tr: 'Kart metnindeki hatayı bildir',
    pl: 'Zgłoś błąd w tekście karty',
  });

  return (
    <>
      <TouchableOpacity
        testID={testID}
        onPress={handleOpen}
        style={[isFlag ? styles.triggerFlag : styles.trigger, style]}
        hitSlop={isFlag ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {isFlag ? (
          <Ionicons name="flag" size={17} color={t.wrong} />
        ) : (
          <Text
            style={[styles.triggerText, { color: textColor ?? t.textSecond, fontSize: f.sub }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {triLang(lang, {
              ru: 'Сообщить о баге',
              uk: 'Повідомити про баг',
              es: 'Informar de un fallo',
              'pt-BR': 'Reportar erro',
              vi: 'Báo lỗi',
              id: 'Laporkan bug',
              tr: 'Hata bildir',
              pl: 'Zgłoś błąd',
            })}
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                paddingBottom: 36 + insets.bottom,
                maxHeight: maxSheetHeight,
                marginTop: insets.top + 8,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            {throttled ? (
              <View style={styles.successBox}>
                <Text style={styles.successEmoji}>⏱️</Text>
                <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                  {triLang(lang, {
                    ru: 'Подождите минуту',
                    uk: 'Зачекайте хвилину',
                    es: 'Espera un minuto',
                    'pt-BR': 'Espere um minuto',
                    vi: 'Vui lòng chờ một phút',
                    id: 'Tunggu sebentar',
                    tr: 'Bir dakika bekle',
                    pl: 'Poczekaj chwilę',
                  })}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Вы уже отправили репорт меньше минуты назад. Попробуйте через минуту.',
                    uk: 'Ви вже надіслали репорт менше хвилини тому. Спробуйте за хвилину.',
                    es: 'Enviaste un informe hace menos de un minuto. Espera un momento antes de volver a intentarlo.',
                    'pt-BR': 'Você enviou um relatório há menos de um minuto. Tente novamente daqui a pouco.',
                    vi: 'Bạn vừa gửi báo cáo chưa đầy một phút trước. Hãy thử lại sau một lát.',
                    id: 'Kamu sudah mengirim laporan kurang dari satu menit lalu. Coba lagi sebentar lagi.',
                    tr: 'Bir dakikadan kısa süre önce bildirim gönderdin. Birazdan tekrar dene.',
                    pl: 'Wysłano już zgłoszenie mniej niż minutę temu. Spróbuj ponownie za chwilę.',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                >
                  <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>{triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' })}</Text>
                </TouchableOpacity>
              </View>
            ) : sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                  {triLang(lang, { ru: 'Сообщение принято!', uk: 'Повідомлення прийнято!', es: '¡Mensaje recibido!', 'pt-BR': 'Mensagem recebida!', vi: 'Đã nhận báo cáo!', id: 'Laporan diterima!', tr: 'Bildirim alındı!', pl: 'Zgłoszenie przyjęte!' })}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Если баг подтвердится — получишь 💎 Осколок.',
                    uk: 'Якщо баг підтвердиться — отримаєш 💎 Осколок.',
                    es: 'Si confirmamos el fallo, recibirás un fragmento de conocimiento (💎).',
                    'pt-BR': 'Se confirmarmos o erro, você receberá um fragmento de conhecimento (💎).',
                    vi: 'Nếu lỗi được xác nhận, bạn sẽ nhận một mảnh kiến thức (💎).',
                    id: 'Jika bug terkonfirmasi, kamu akan menerima satu pecahan pengetahuan (💎).',
                    tr: 'Hata doğrulanırsa bir bilgi parçası (💎) alacaksın.',
                    pl: 'Jeśli błąd się potwierdzi, otrzymasz odłamek wiedzy (💎).',
                  })}
                </Text>
                <XpGainBadge amount={10} visible={sent} />
                <TouchableOpacity
                  onPress={() => { setVisible(false); onSuccess?.(10); }}
                  style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                >
                  <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                    {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
                  {triLang(lang, {
                    ru: 'Сообщить о проблеме',
                    uk: 'Повідомити про проблему',
                    es: 'Informar de un problema',
                    'pt-BR': 'Reportar um problema',
                    vi: 'Báo cáo sự cố',
                    id: 'Laporkan masalah',
                    tr: 'Sorun bildir',
                    pl: 'Zgłoś problem',
                  })}
                </Text>
                <Text style={[styles.sub, { color: t.textSecond, fontSize: f.sub }]}>
                  {triLang(lang, {
                    ru: 'Выберите тип проблемы — мы исправим как можно скорее',
                    uk: 'Оберіть тип проблеми — ми виправимо якомога швидше',
                    es: 'Elige el tipo de problema y lo revisaremos cuanto antes.',
                    'pt-BR': 'Escolha o tipo de problema e vamos revisar o quanto antes.',
                    vi: 'Chọn loại sự cố, chúng tôi sẽ kiểm tra sớm nhất có thể.',
                    id: 'Pilih jenis masalah, kami akan meninjaunya secepat mungkin.',
                    tr: 'Sorun türünü seç, en kısa sürede kontrol edelim.',
                    pl: 'Wybierz typ problemu, a sprawdzimy go jak najszybciej.',
                  })}
                </Text>

                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {categories.map(cat => {
                    const active = selected === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setSelected(cat.key)}
                        style={[
                          styles.category,
                          {
                            borderColor: active ? t.accent : t.border,
                            backgroundColor: active ? t.accent + '22' : t.bgCard,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? t.accent : t.textPrimary, fontSize: f.body }}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput
                  style={[styles.input, {
                    color: t.textPrimary,
                    borderColor: commentRequiredError && !commentOk ? t.wrong : t.border,
                    borderWidth: commentRequiredError && !commentOk ? 2 : 1,
                    backgroundColor:
                      commentRequiredError && !commentOk ? `${t.wrong}14` : t.bgSurface,
                    fontSize: f.body,
                  }]}
                  placeholder={triLang(lang, { ru: 'Комментарий', uk: 'Коментар', es: 'Comentario', 'pt-BR': 'Comentário', vi: 'Bình luận', id: 'Komentar', tr: 'Yorum', pl: 'Komentarz' })}
                  placeholderTextColor={t.textSecond}
                  value={comment}
                  onChangeText={(text) => {
                    setComment(text);
                    if (text.trim().length >= ERROR_REPORT_COMMENT_MIN_LEN) {
                      setCommentRequiredError(false);
                    }
                  }}
                  multiline
                  maxLength={200}
                />

                <View style={styles.row}>
                  <TouchableOpacity onPress={() => setVisible(false)} style={styles.btnCancel}>
                    <Text style={{ color: t.textSecond, fontSize: f.body }}>
                      {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!selected || sending}
                    style={[styles.btnSend, { backgroundColor: selected ? t.accent : t.border }]}
                  >
                    <Text style={{ color: selected ? t.correctText : t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingVertical: 4, paddingHorizontal: 8, opacity: 0.7 },
  triggerText: { flexShrink: 1, maxWidth: 220 },
  triggerFlag: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.92,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, padding: 24, gap: 12,
  },
  title: { fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: 4 },
  category: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
  input: { borderRadius: 12, padding: 12, minHeight: 100, textAlignVertical: 'top', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  btnSend: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  successBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontWeight: '800' },
});
