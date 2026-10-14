import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { ENABLE_DEV_TOOLS } from '../app/config';
import React, { memo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KitTouchable from './KitTouchable';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { isDevOverlaysOff } from '../app/dev_overlays_off';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import SheetSwipeClose, { SheetSwipeRoot } from './modal_fx/SheetSwipeClose';
import {
  ERROR_REPORT_COMMENT_MIN_LEN,
  ERROR_REPORT_FREE_TEXT_CATEGORY,
  submitErrorReport,
} from '../app/error_report';

export type ReportErrorSubmitOverride = (input: Readonly<{
  comment: string;
}>) => Promise<'sent' | 'throttled' | 'invalid_comment' | 'failed'>;

interface Props {
  screen: string;
  /** Машинно-читаемый ключ для поиска в коде: "lesson_5_phrase_42", "irregular_verb_go" */
  dataId: string;
  /** Человекочитаемый контекст: фраза, вопрос, слово или экран. */
  dataText?: string;
  /** What the user actually entered/assembled before sending the report. */
  userAnswer?: string;
  style?: object;
  /** Только красный флаг без подписи. */
  variant?: 'default' | 'icon-flag';
  accessibilityLabel?: string;
  testID?: string;
  textColor?: string;
  /** Typed transport override for a content surface with stronger server semantics. */
  submitOverride?: ReportErrorSubmitOverride;
  /**
   * зачем (макет «Панель», меню карточки ошибки: пункт «Сообщить о неточности»): открыть ту же форму из чужой кнопки.
   * Экран кладёт сюда ref и вызывает openRef.current?.(); сама кнопка при hideTrigger не рисуется, форма остаётся прежней.
   */
  openRef?: React.MutableRefObject<(() => void) | null>;
  hideTrigger?: boolean;
}

type ReportErrorCategory = {
  key: string;
  label: string;
};

type ReportErrorCategoryLang = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const REPORT_ERROR_CATEGORY_LABELS: Record<string, Record<ReportErrorCategoryLang, string>> = {
  typo_translation: {
    ru: 'Ошибка в тексте или переводе',
    uk: 'Помилка в тексті або перекладі',
    es: 'Error en el texto o la traducción', en: 'Error in text or translation',
    'pt-BR': 'Erro no texto ou na tradução',
    vi: 'Lỗi trong văn bản hoặc bản dịch',
    id: 'Kesalahan teks atau terjemahan',
    tr: 'Metin veya çeviri hatası',
    pl: 'Błąd w tekście albo tłumaczeniu',
  },
  audio_pronunciation: {
    ru: 'Проблема со звуком или произношением',
    uk: 'Проблема зі звуком або вимовою',
    es: 'Problema de audio o pronunciación', en: 'Audio or pronunciation problem',
    'pt-BR': 'Problema de áudio ou pronúncia',
    vi: 'Sự cố âm thanh hoặc phát âm',
    id: 'Masalah audio atau pelafalan',
    tr: 'Ses veya telaffuz sorunu',
    pl: 'Problem z dźwiękiem albo wymową',
  },
  exercise_logic: {
    ru: 'Неверный ответ или логика задания',
    uk: 'Неправильна відповідь або логіка завдання',
    es: 'Respuesta o lógica del ejercicio incorrecta', en: 'Wrong answer or exercise logic',
    'pt-BR': 'Resposta ou lógica do exercício incorreta',
    vi: 'Đáp án hoặc logic bài tập sai',
    id: 'Jawaban atau logika latihan keliru',
    tr: 'Yanıt veya alıştırma mantığı hatalı',
    pl: 'Nieprawidłowa odpowiedź albo logika ćwiczenia',
  },
  // зачем (решение владельца 2026-09-30): жемчуг удалён из приложения — из темы жалобы убран.
  payment_premium: {
    ru: 'Подписка или покупка',
    uk: 'Підписка або покупка',
    es: 'Suscripción o compra', en: 'Subscription or purchase',
    'pt-BR': 'Assinatura ou compra',
    vi: 'Gói đăng ký hoặc giao dịch mua',
    id: 'Langganan atau pembelian',
    tr: 'Abonelik veya satın alma',
    pl: 'Subskrypcja albo zakup',
  },
  other: {
    ru: 'Другая проблема',
    uk: 'Інша проблема',
    es: 'Otro problema', en: 'Another problem',
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
  return lang === 'uk' || lang === 'en' || lang === 'es' || lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl'
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
  variant = 'default',
  accessibilityLabel,
  testID,
  textColor,
  submitOverride,
  openRef,
  hideTrigger,
}: Props) {
  // зачем: форма «сообщить об ошибке» (~30 экранов) — Liquid Glass по макету overlays-campaigns OS-ERROR-REPORT-*.
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
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

  if (openRef) openRef.current = handleOpen;

  const commentTrimmed = comment.trim();
  const commentOk = commentTrimmed.length >= ERROR_REPORT_COMMENT_MIN_LEN;

  // зачем (координатор 10.10, Optimistic UI): state sending обновляется после рендера — второй тап в том же кадре отправил бы жалобу
  // дважды; ref-замок синхронный, снимается вместе с sending.
  const sendLockRef = useRef(false);
  const handleSend = () => {
    if (sending) return;
    if (sendLockRef.current) return;
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
    sendLockRef.current = true;

    void (async () => {
      let result: Awaited<ReturnType<typeof submitErrorReport>> = 'failed';
      try {
        if (submitOverride) {
          result = await submitOverride({ comment: optimisticComment });
        } else {
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
        }
      } catch (error: unknown) {
        console.warn('[REPORT-ERROR] отправка: исключение — показываем «не отправилось»', error instanceof Error ? error.message : String(error));
        result = 'failed';
      }
      sendLockRef.current = false;
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
      // зачем (решение владельца 2026-09-30): XP и жемчуг удалены — за жалобу ничего не начисляем.
      console.log(`[REPORT-ERROR] sent screen=${screen} dataId=${dataId ?? '-'}`); // guard-ok: итог отправки
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
      {hideTrigger ? null : (
      <KitTouchable
        testID={testID}
        onPress={handleOpen}
        style={[isFlag ? styles.triggerFlag : styles.trigger, style]}
        hitSlop={isFlag ? { top: 14, bottom: 14, left: 14, right: 14 } : { top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {isFlag ? (
          // зачем (R1 spire-gap-001/002/004/005, Сверка 12.10): флажок «пожаловаться» в макете — контурный (kit.js: древко + волна без заливки), у нас был залитый Ionicons "flag"; контурный даёт тот же вид, что в образцах Шпиля, сессий и теории
          <Ionicons name="flag-outline" size={17} color={t.wrong} />
        ) : (
          <Text
            style={[styles.triggerText, { color: textColor ?? glass.secondary, fontSize: f.sub }]}
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
      </KitTouchable>
      )}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <SheetSwipeRoot>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={[styles.overlay, { paddingTop: insets.top + 8 }]} onPress={() => setVisible(false)}>
            {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз закрывает форму тем же путём, что тап по фону; пока идёт отправка — свайп выключен и ручка спрятана */}
            <SheetSwipeClose name="report-error" onClose={() => setVisible(false)} enabled={!sending} wrapStyle={{ flexShrink: 1, maxHeight: '100%', minHeight: 0 }}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: glass.opaqueSheet,
                  borderColor: glass.glassEdge,
                  shadowColor: glass.bg,
                  paddingBottom: 36 + bottomInset,
                  maxHeight: '100%',
                },
              ]}
              onPress={e => e.stopPropagation()}
            >
              {sending ? null : <View style={[styles.grabber, { backgroundColor: glass.mutedText }]} />}
              <ScrollView style={{ flexShrink: 1, minHeight: 0 }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} decelerationRate="fast">
              {failed ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: glass.text, fontSize: f.h3 }]}>
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
                  <Text style={{ color: glass.secondary, fontSize: f.body, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Не отправилось. Попробуй ещё раз.',
                      uk: 'Не надіслалося. Спробуй ще раз.',
                      en: "Didn't send. Try again.",
                      es: 'No se envió. Inténtalo de nuevo.',
                      'pt-BR': 'Não foi enviado. Tente de novo.',
                      vi: 'Chưa gửi được. Hãy thử lại.',
                      id: 'Belum terkirim. Coba lagi.',
                      tr: 'Gönderilemedi. Tekrar dene.',
                      pl: 'Nie wysłano. Spróbuj ponownie.',
                    })}
                  </Text>
                  <KitTouchable
                    onPress={() => {
                      setFailed(false);
                      setSending(false);
                    }}
                    style={[styles.btnSend, { backgroundColor: glass.accent, marginTop: 8, alignSelf: 'stretch' }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                    </Text>
                  </KitTouchable>
                </View>
              ) : throttled ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: glass.text, fontSize: f.h3 }]}>
                    {triLang(lang, {
                      ru: 'Подожди минуту',
                      uk: 'Зачекай хвилину',
                      en: 'Wait a minute',
                      es: 'Espera un minuto',
                      'pt-BR': 'Espere um minuto',
                      vi: 'Vui lòng chờ một phút',
                      id: 'Tunggu sebentar',
                      tr: 'Bir dakika bekle',
                      pl: 'Poczekaj chwilę',
                    })}
                  </Text>
                  <Text style={{ color: glass.secondary, fontSize: f.body, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: 'Ты уже отправил репорт меньше минуты назад. Попробуй через минуту.',
                      uk: 'Ти вже надіслав(ла) репорт менше хвилини тому. Спробуй за хвилину.',
                      en: 'You sent a report less than a minute ago. Try again in a moment.',
                      es: 'Enviaste un informe hace menos de un minuto. Espera un momento antes de volver a intentarlo.',
                      'pt-BR': 'Você enviou um relatório há menos de um minuto. Tente novamente daqui a pouco.',
                      vi: 'Bạn vừa gửi báo cáo chưa đầy một phút trước. Hãy thử lại sau một lát.',
                      id: 'Kamu sudah mengirim laporan kurang dari satu menit lalu. Coba lagi sebentar lagi.',
                      tr: 'Bir dakikadan kısa süre önce bildirim gönderdin. Birazdan tekrar dene.',
                      pl: 'Wysłano już zgłoszenie mniej niż minutę temu. Spróbuj ponownie za chwilę.',
                    })}
                  </Text>
                  <KitTouchable
                    onPress={() => setVisible(false)}
                    style={[styles.btnSend, { backgroundColor: glass.accent, marginTop: 8, alignSelf: 'stretch' }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
                    </Text>
                  </KitTouchable>
                </View>
              ) : sent ? (
                <View style={styles.successBox}>
                  <Text style={[styles.successTitle, { color: glass.text, fontSize: f.h3 }]}>
                    {triLang(lang, { ru: 'Сообщение принято!', uk: 'Повідомлення прийнято!', en: 'Message received!', es: '¡Mensaje recibido!', 'pt-BR': 'Mensagem recebida!', vi: 'Đã nhận báo cáo!', id: 'Laporan diterima!', tr: 'Bildirim alındı!', pl: 'Zgłoszenie przyjęte!' })}
                  </Text>
                  <Text style={{ color: glass.secondary, fontSize: f.body, textAlign: 'center' }}>
                    {/* зачем (решение владельца 2026-09-30): жемчуг удалён — награды за
                        подтверждённую ошибку больше нет, обещать её нельзя. */}
                    {triLang(lang, {
                      ru: 'Спасибо! Проверим и исправим.',
                      uk: 'Дякуємо! Перевіримо й виправимо.',
                      en: 'Thanks! We’ll check it and fix it.',
                      es: '¡Gracias! Lo revisaremos y lo corregiremos.',
                      'pt-BR': 'Obrigado! Vamos verificar e corrigir.',
                      vi: 'Cảm ơn! Chúng mình sẽ kiểm tra và sửa.',
                      id: 'Terima kasih! Kami akan memeriksa dan memperbaikinya.',
                      tr: 'Teşekkürler! Kontrol edip düzelteceğiz.',
                      pl: 'Dzięki! Sprawdzimy i poprawimy.',
                    })}
                  </Text>
                  {sending ? (
                    <View style={styles.optimisticStatus}>
                      <ActivityIndicator size="small" color={glass.secondary} />
                      <Text style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Отправляем в фоне', uk: 'Надсилаємо у фоні', en: 'Sending in the background', es: 'Enviando en segundo plano', 'pt-BR': 'Enviando em segundo plano', vi: 'Đang gửi trong nền', id: 'Mengirim di latar belakang', tr: 'Arka planda gönderiliyor', pl: 'Wysyłanie w tle' })}
                      </Text>
                    </View>
                  ) : null}
                  <KitTouchable
                    onPress={() => setVisible(false)}
                    style={[styles.btnSend, { backgroundColor: glass.accent, marginTop: 8, alignSelf: 'stretch' }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>
                      {triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
                    </Text>
                  </KitTouchable>
                </View>
              ) : (
                <>
                  <Text style={[styles.title, { color: glass.text, fontSize: f.h3 }]}>
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
                  <Text style={[styles.sub, { color: glass.secondary, fontSize: f.sub }]}>
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
                      color: glass.text,
                      // зачем: ошибка валидации — тоном фона и цветом текста ошибки, без толстой/цветной рамки.
                      borderColor: glass.line,
                      backgroundColor:
                        commentRequiredError && !commentOk ? `${t.wrong}1F` : glass.opaqueControl,
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
                    placeholderTextColor={glass.mutedText}
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
                    <KitTouchable
                      onPress={() => setVisible(false)}
                      style={[styles.btnCancel, { backgroundColor: glass.opaqueControl }]}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: glass.secondary, fontSize: f.body, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                      </Text>
                    </KitTouchable>
                    <KitTouchable
                      onPress={handleSend}
                      disabled={sending}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: sending, busy: sending }}
                      style={[styles.btnSend, { backgroundColor: glass.accent }, sending && styles.btnBusy]}
                    >
                      <View style={styles.btnSendContent}>
                        {sending ? <ActivityIndicator size="small" color={glass.ctaInk} /> : null}
                        <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>
                          {sending
                            ? triLang(lang, { ru: 'Отправляю...', uk: 'Надсилаю...', en: 'Sending...', es: 'Enviando...', 'pt-BR': 'Enviando...', vi: 'Đang gửi...', id: 'Mengirim...', tr: 'Gönderiliyor...', pl: 'Wysyłanie...' })
                            : triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                        </Text>
                      </View>
                    </KitTouchable>
                  </View>
                </>
              )}
              </ScrollView>
            </Pressable>
            </SheetSwipeClose>
          </Pressable>
        </KeyboardAvoidingView>
        </SheetSwipeRoot>
      </Modal>
    </>
  );
}

/**
 * зачем (владелец 05.10 11:10, решение 6): «Нашёл ошибку?» видят только тестеры и разработка —
 * сборка разработки, DEV_MODE и тестерская TestFlight-сборка (ENABLE_DEV_TOOLS); в сборке магазина
 * кнопки и формы нет совсем. Экранам с пунктом меню «Сообщить об ошибке» — смотреть этот флаг.
 */
export const REPORT_ERROR_ENABLED: boolean = ENABLE_DEV_TOOLS;

function ReportErrorButtonGate(props: Props) {
  // Исключение: свой транспорт (submitOverride) — это не «Нашёл ошибку?», а рабочая функция режима
  // (Шпиль убирает плохое задание из забега), её не прячем.
  if (!REPORT_ERROR_ENABLED && !props.submitOverride) {
    if (props.openRef) props.openRef.current = null;
    return null;
  }
  // зачем (Макеты 12.10, community-020): тестерский триггер «Нашёл ошибку?» не должен попадать в кадры сверки — при dev `overlays=off` его нет (в сторе isDevOverlaysOff() всегда false;
  // рабочий флажок Шпиля со своим транспортом submitOverride не трогаем).
  if (!props.submitOverride && isDevOverlaysOff()) {
    if (props.openRef) props.openRef.current = null;
    return null;
  }
  return <ReportErrorButton {...props} />;
}

export default memo(ReportErrorButtonGate);

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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  sheet: {
    flexShrink: 1, // зачем: внутри внешнего слоя свайпа лист сжимается вместе с ним — прокрутка формы цела
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, opacity: 0.5, marginBottom: 4 },
  title: { fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: 4 },
  input: { borderRadius: 14, borderWidth: 1, padding: 12, minHeight: 150, textAlignVertical: 'top', marginTop: 4 },
  inputHint: { marginTop: -4, textAlign: 'right' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  btnSend: { flex: 2, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  btnBusy: { opacity: 0.6 },
  btnSendContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  optimisticStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  successBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  successTitle: { fontWeight: '800' },
});
