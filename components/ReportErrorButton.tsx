import React, { useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import {
  ERROR_REPORT_COMMENT_MIN_LEN,
  ERROR_REPORT_FREE_TEXT_CATEGORY,
  submitErrorReport,
} from '../app/error_report';
import XpGainBadge from './XpGainBadge';

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
    ru: 'Подписка, покупка или осколки',
    uk: 'Підписка, покупка або уламки',
    es: 'Suscripción, compra o fragmentos',
    'pt-BR': 'Assinatura, compra ou fragmentos',
    vi: 'Gói đăng ký, giao dịch mua hoặc mảnh thưởng',
    id: 'Langganan, pembelian, atau pecahan',
    tr: 'Abonelik, satın alma veya parçalar',
    pl: 'Subskrypcja, zakup albo odłamki',
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

  const handleSend = async () => {
    if (sending) return;
    if (!commentOk) {
      setCommentRequiredError(true);
      return;
    }
    setCommentRequiredError(false);
    setFailed(false);
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
        category: ERROR_REPORT_FREE_TEXT_CATEGORY,
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
    if (result === 'failed') {
      setFailed(true);
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
    ru: 'Сообщить о проблеме на этом экране',
    uk: 'Повідомити про проблему на цьому екрані',
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
              {failed ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, {
                      ru: 'Не удалось отправить',
                      uk: 'Не вдалося надіслати',
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
                      {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : throttled ? (
                <View style={styles.successBox}>
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
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : sent ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                    {triLang(lang, { ru: 'Сообщение принято!', uk: 'Повідомлення прийнято!', es: '¡Mensaje recibido!', 'pt-BR': 'Mensagem recebida!', vi: 'Đã nhận báo cáo!', id: 'Laporan diterima!', tr: 'Bildirim alındı!', pl: 'Zgłoszenie przyjęte!' })}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Если баг подтвердится — получишь осколок.',
                      uk: 'Якщо баг підтвердиться — отримаєш уламок.',
                      es: 'Si confirmamos el fallo, recibirás un fragmento de conocimiento.',
                      'pt-BR': 'Se confirmarmos o erro, você receberá um fragmento de conhecimento.',
                      vi: 'Nếu lỗi được xác nhận, bạn sẽ nhận một mảnh kiến thức.',
                      id: 'Jika bug terkonfirmasi, kamu akan menerima satu pecahan pengetahuan.',
                      tr: 'Hata doğrulanırsa bir bilgi parçası alacaksın.',
                      pl: 'Jeśli błąd się potwierdzi, otrzymasz odłamek wiedzy.',
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
                      ru: 'Опишите проблему.',
                      uk: 'Опишіть проблему.',
                      es: 'Describe el problema.',
                      'pt-BR': 'Descreva o problema.',
                      vi: 'Mô tả sự cố.',
                      id: 'Jelaskan masalahnya.',
                      tr: 'Sorunu açıkla.',
                      pl: 'Opisz problem.',
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
                        {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={sending}
                      style={[styles.btnSend, { backgroundColor: !sending ? t.accent : t.border }]}
                    >
                      <Text style={{ color: !sending ? t.correctText : t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                        {sending
                          ? triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })
                          : triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
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
  successBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  successTitle: { fontWeight: '800' },
});
