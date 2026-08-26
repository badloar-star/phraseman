import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import {
  ERROR_REPORT_COMMENT_MIN_LEN,
  ERROR_REPORT_FREE_TEXT_CATEGORY,
  submitErrorReport,
} from '../app/error_report';

interface Props {
  screen: string;
  /** Машинно-читаемый ключ для поиска в коде: "lesson_5_phrase_42", "irregular_verb_go" */
  dataId: string;
  /** Человекочитаемый контекст: фраза, вопрос, слово или экран. */
  dataText?: string;
  /** What the user actually entered/assembled before sending the report. */
  userAnswer?: string;
  style?: object;
  onSuccess?: (xpGained: number) => void;
  /** Только красный флаг без подписи. */
  variant?: 'default' | 'icon-flag';
  accessibilityLabel?: string;
  testID?: string;
  textColor?: string;
}

type ReportErrorCategory = {
  key: string;
  label: string;
};

type ReportErrorCategoryLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const REPORT_ERROR_CATEGORY_LABELS: Record<string, Record<ReportErrorCategoryLang, string>> = {
  typo_translation: {
    ru: 'Ошибка в тексте или переводе',
    uk: 'Помилка в тексті або перекладі',
    es: 'Error en el texto o la traducción',
    'pt-BR': 'Erro no texto ou na tradução',
    vi: 'Lỗi trong văn bản hoặc bản dịch',
    id: 'Kesalahan teks atau terjemahan',
    tr: 'Metin veya çeviri hatası',
    pl: 'Błąd w tekście albo tłumaczeniu',
  },
  audio_pronunciation: {
    ru: 'Проблема со звуком или произношением',
    uk: 'Проблема зі звуком або вимовою',
    es: 'Problema de audio o pronunciación',
    'pt-BR': 'Problema de áudio ou pronúncia',
    vi: 'Sự cố âm thanh hoặc phát âm',
    id: 'Masalah audio atau pelafalan',
    tr: 'Ses veya telaffuz sorunu',
    pl: 'Problem z dźwiękiem albo wymową',
  },
  exercise_logic: {
    ru: 'Неверный ответ или логика задания',
    uk: 'Неправильна відповідь або логіка завдання',
    es: 'Respuesta o lógica del ejercicio incorrecta',
    'pt-BR': 'Resposta ou lógica do exercício incorreta',
    vi: 'Đáp án hoặc logic bài tập sai',
    id: 'Jawaban atau logika latihan keliru',
    tr: 'Yanıt veya alıştırma mantığı hatalı',
    pl: 'Nieprawidłowa odpowiedź albo logika ćwiczenia',
  },
  payment_premium: {
    ru: 'Подписка, покупка или жемчужины',
    uk: 'Підписка, покупка або перлини',
    es: 'Suscripción, compra o perlas',
    'pt-BR': 'Assinatura, compra ou pérolas',
    vi: 'Gói đăng ký, giao dịch mua hoặc xu thưởng',
    id: 'Langganan, pembelian, atau koin',
    tr: 'Abonelik, satın alma veya jetonlar',
    pl: 'Subskrypcja, zakup albo monety',
  },
  other: {
    ru: 'Другая проблема',
    uk: 'Інша проблема',
    es: 'Otro problema',
    'pt-BR': 'Outro problema',
    vi: 'Sự cố khác',
    id: 'Masalah lainnya',
    tr: 'Başka bir sorun',
    pl: 'Inny problem',
  },
};

const REPORT_ERROR_GENERAL_KEYS = ['typo_translation', 'audio_pronunciation', 'exercise_logic', 'other'] as const;
const REPORT_ERROR_HOME_KEYS = ['payment_premium', 'typo_translation', 'other'] as const;

function normalizeReportErrorCategoryLang(lang: string): ReportErrorCategoryLang {
  return lang === 'uk' || lang === 'es' || lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl'
    ? lang
    : 'ru';
}

export function reportErrorCategoriesForLang(screen: string, lang: string): ReportErrorCategory[] {
  const normalizedLang = normalizeReportErrorCategoryLang(lang);
  const keys = screen === 'home' ? REPORT_ERROR_HOME_KEYS : REPORT_ERROR_GENERAL_KEYS;

  return keys.map((key) => ({
    key,
    label: REPORT_ERROR_CATEGORY_LABELS[key][normalizedLang],
  }));
}

function ReportErrorButton({
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
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const maxSheetHeight = Math.max(360, Dimensions.get('window').height - insets.top - 12);
  const [visible, setVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [throttled, setThrottled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [commentRequiredError, setCommentRequiredError] = useState(false);

  const handleOpen = () => {
    setComment('');
    setCommentRequiredError(false);
    setSent(false);
    setThrottled(false);
    setFailed(false);
    setVisible(true);
  };

  const commentTrimmed = comment.trim();
  const commentOk = commentTrimmed.length >= ERROR_REPORT_COMMENT_MIN_LEN;

  const handleSend = () => {
    if (sending) return;
    if (!commentOk) {
      setCommentRequiredError(true);
      return;
    }
    const optimisticComment = commentTrimmed;
    setCommentRequiredError(false);
    setFailed(false);
    setThrottled(false);
    setSent(true);
    setSending(true);

    void (async () => {
      let result: Awaited<ReturnType<typeof submitErrorReport>> = 'failed';
      try {
        const nameRaw = await AsyncStorage.getItem('user_name') ?? '';
        const storedLang = (
          (await AsyncStorage.getItem('app_lang')) ??
          (await AsyncStorage.getItem('app_language')) ??
          'ru'
        );
        const langRaw = storedLang === 'uk' || storedLang === 'es' ? storedLang : 'ru';
        result = await submitErrorReport(
          {
            screen,
            category: ERROR_REPORT_FREE_TEXT_CATEGORY,
            dataId,
            dataText: dataText ?? dataId,
            userAnswer,
            comment: optimisticComment,
          },
          nameRaw,
          langRaw,
        );
      } catch {
        result = 'failed';
      }
      setSending(false);
      if (result === 'invalid_comment') {
        setSent(false);
        setCommentRequiredError(true);
        return;
      }
      if (result === 'throttled') {
        setSent(false);
        setThrottled(true);
        return;
      }
      if (result === 'failed') {
        setSent(false);
        setFailed(true);
        return;
      }
      onSuccess?.(10);
      setTimeout(() => {
        setVisible(false);
      }, 900);
    })();
  };

  const isFlag = variant === 'icon-flag';

  const a11yLabel = accessibilityLabel || triLang(lang, {
    ru: 'Сообщить о проблеме на этом экране',
    uk: 'Повідомити про проблему на цьому екрані',
    en: 'Report a problem on this screen',
    es: 'Informar de un problema en esta pantalla',
    'pt-BR': 'Reportar um problema nesta tela',
    vi: 'Báo cáo sự cố trên màn hình này',
    id: 'Laporkan masalah di layar ini',
    tr: 'Bu ekrandaki sorunu bildir',
    pl: 'Zgłoś problem na tym ekranie',
  });

  const inputError = commentRequiredError && !commentOk
    ? triLang(lang, {
        ru: `Минимум ${ERROR_REPORT_COMMENT_MIN_LEN} символов.`,
        uk: `Мінімум ${ERROR_REPORT_COMMENT_MIN_LEN} символів.`,
        en: `At least ${ERROR_REPORT_COMMENT_MIN_LEN} characters.`,
        es: `Mínimo ${ERROR_REPORT_COMMENT_MIN_LEN} caracteres.`,
        'pt-BR': `Mínimo de ${ERROR_REPORT_COMMENT_MIN_LEN} caracteres.`,
        vi: `Tối thiểu ${ERROR_REPORT_COMMENT_MIN_LEN} ký tự.`,
        id: `Minimal ${ERROR_REPORT_COMMENT_MIN_LEN} karakter.`,
        tr: `En az ${ERROR_REPORT_COMMENT_MIN_LEN} karakter.`,
        pl: `Minimum ${ERROR_REPORT_COMMENT_MIN_LEN} znaków.`,
      })
    : '';

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
            numberOfLines={2}
          >
            {triLang(lang, {
              ru: 'Нашёл ошибку?',
              uk: 'Знайшов помилку?',
              en: 'Found an error?',
              es: '¿Has visto un error?',
              'pt-BR': 'Achou um erro?',
              vi: 'Thấy lỗi gì không?',
              id: 'Menemukan kesalahan?',
              tr: 'Bir hata mı buldun?',
              pl: 'Znalazłeś błąd?',
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
                  paddingBottom: 36 + bottomInset,
                  maxHeight: maxSheetHeight,
                  marginTop: insets.top + 8,
                },
              ]}
              onPress={e => e.stopPropagation()}
            >
              {failed ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, {
                      ru: 'Не отправилось',
                      uk: 'Не вдалося надіслати',
                      en: 'Couldn’t send',
                      es: 'No se pudo enviar',
                      'pt-BR': 'Não foi possível enviar',
                      vi: 'Không gửi được',
                      id: 'Gagal terkirim',
                      tr: 'Gönderilemedi',
                      pl: 'Nie udało się wysłać',
                    })}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Проверь интернет и попробуй еще раз.',
                      uk: 'Перевір інтернет і спробуй ще раз.',
                      en: 'Check your connection and try again.',
                      es: 'Revisa internet e inténtalo de nuevo.',
                      'pt-BR': 'Verifique a internet e tente de novo.',
                      vi: 'Hãy kiểm tra mạng rồi thử lại.',
                      id: 'Periksa internet lalu coba lagi.',
                      tr: 'İnterneti kontrol edip tekrar dene.',
                      pl: 'Sprawdź internet i spróbuj ponownie.',
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setFailed(false);
                      setSending(false);
                    }}
                    style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : throttled ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, {
                      ru: 'Подожди минуту',
                      uk: 'Зачекайте хвилину',
                      en: 'Wait a minute',
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
                      ru: 'Ты уже отправил репорт меньше минуты назад. Попробуй через минуту.',
                      uk: 'Ви вже надіслали репорт менше хвилини тому. Спробуйте за хвилину.',
                      en: 'You sent a report less than a minute ago. Try again in a moment.',
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
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : sent ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, { ru: 'Сообщение принято!', uk: 'Повідомлення прийнято!', en: 'Message received!', es: '¡Mensaje recibido!', 'pt-BR': 'Mensagem recebida!', vi: 'Đã nhận báo cáo!', id: 'Laporan diterima!', tr: 'Bildirim alındı!', pl: 'Zgłoszenie przyjęte!' })}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Если ошибка подтвердится — получишь жемчужину.',
                      uk: 'Якщо помилка підтвердиться — отримаєш перлину.',
                      en: 'If the error is confirmed, you’ll get a pearl.',
                      es: 'Si confirmamos el error, recibirás una perla.',
                      'pt-BR': 'Se confirmarmos o erro, você receberá uma pérola.',
                      vi: 'Nếu lỗi được xác nhận, bạn sẽ nhận một viên ngọc trai.',
                      id: 'Jika kesalahan terkonfirmasi, kamu akan menerima satu mutiara.',
                      tr: 'Hata doğrulanırsa bir inci alacaksın.',
                      pl: 'Jeśli błąd się potwierdzi, otrzymasz perłę.',
                    })}
                  </Text>
                  {sending ? (
                    <View style={styles.optimisticStatus}>
                      <ActivityIndicator size="small" color={t.textSecond} />
                      <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Отправляем в фоне', uk: 'Надсилаємо у фоні', en: 'Sending in the background', es: 'Enviando en segundo plano', 'pt-BR': 'Enviando em segundo plano', vi: 'Đang gửi trong nền', id: 'Mengirim di latar belakang', tr: 'Arka planda gönderiliyor', pl: 'Wysyłanie w tle' })}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => setVisible(false)}
                    style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, {
                      ru: 'Нашёл ошибку?',
                      uk: 'Знайшов помилку?',
                      en: 'Found an error?',
                      es: '¿Has visto un error?',
                      'pt-BR': 'Achou um erro?',
                      vi: 'Thấy lỗi gì không?',
                      id: 'Menemukan kesalahan?',
                      tr: 'Bir hata mı buldun?',
                      pl: 'Znalazłeś błąd?',
                    })}
                  </Text>
                  <Text style={[styles.sub, { color: t.textSecond, fontSize: f.sub }]}>
                    {triLang(lang, {
                      ru: 'Опиши, что не так — мы починим.',
                      uk: 'Опиши, що не так — ми виправимо.',
                      en: 'Describe what’s wrong — we’ll fix it.',
                      es: 'Cuéntanos qué pasa y lo arreglamos.',
                      'pt-BR': 'Conta o que está errado e a gente conserta.',
                      vi: 'Kể xem chỗ nào sai — bọn mình sẽ sửa.',
                      id: 'Ceritakan apa yang salah — kami perbaiki.',
                      tr: 'Neyin yanlış olduğunu yaz — düzeltelim.',
                      pl: 'Napisz, co jest nie tak — naprawimy.',
                    })}
                  </Text>

                  <TextInput
                    style={[styles.input, {
                      color: t.textPrimary,
                      borderColor: commentRequiredError && !commentOk ? t.wrong : t.border,
                      borderWidth: commentRequiredError && !commentOk ? 2 : 1,
                      backgroundColor:
                        commentRequiredError && !commentOk ? `${t.wrong}14` : t.bgSurface,
                      fontSize: f.body,
                    }]}
                    placeholder={triLang(lang, {
                      ru: 'Что случилось?',
                      uk: 'Що сталося?',
                      en: 'What happened?',
                      es: '¿Qué ocurrió?',
                      'pt-BR': 'O que aconteceu?',
                      vi: 'Điều gì đã xảy ra?',
                      id: 'Apa yang terjadi?',
                      tr: 'Ne oldu?',
                      pl: 'Co się stało?',
                    })}
                    placeholderTextColor={t.textSecond}
                    value={comment}
                    onChangeText={(text) => {
                      setComment(text);
                      if (text.trim().length >= ERROR_REPORT_COMMENT_MIN_LEN) {
                        setCommentRequiredError(false);
                      }
                    }}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  {inputError ? (
                    <Text
                      style={[
                        styles.inputHint,
                        {
                          color: t.wrong,
                          fontSize: f.caption,
                        },
                      ]}
                    >
                      {inputError}
                    </Text>
                  ) : null}

                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => setVisible(false)} style={styles.btnCancel}>
                      <Text style={{ color: t.textSecond, fontSize: f.body }}>
                        {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={sending}
                      style={[styles.btnSend, { backgroundColor: !sending ? t.accent : t.border }]}
                    >
                      <View style={styles.btnSendContent}>
                        {sending ? <ActivityIndicator size="small" color={t.textPrimary} /> : null}
                        <Text style={{ color: !sending ? t.correctText : t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                          {sending
                            ? triLang(lang, { ru: 'Отправляю...', uk: 'Надсилаю...', en: 'Sending...', es: 'Enviando...', 'pt-BR': 'Enviando...', vi: 'Đang gửi...', id: 'Mengirim...', tr: 'Gönderiliyor...', pl: 'Wysyłanie...' })
                            : triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                        </Text>
                      </View>
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

export default memo(ReportErrorButton);

const styles = StyleSheet.create({
  trigger: { paddingVertical: 4, paddingHorizontal: 8, opacity: 0.7 },
  // Без жёсткого maxWidth/обрезания: при крупном системном шрифте «Нашёл ошибку?»
  // не влезало в 220px и резалось в «нашёл ошиб…». numberOfLines={2} даёт перенос.
  triggerText: { flexShrink: 1 },
  triggerFlag: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.92,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    padding: 24,
    gap: 12,
  },
  title: { fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: 4 },
  input: { borderRadius: 12, padding: 12, minHeight: 150, textAlignVertical: 'top', marginTop: 4 },
  inputHint: { marginTop: -4, textAlign: 'right' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  btnSend: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnSendContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  optimisticStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  successBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  successTitle: { fontWeight: '800' },
});
