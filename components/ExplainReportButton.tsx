import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * ExplainReportButton — репорт «Непонятно объяснили» для шторки объяснения.
 *
 * По тапу открывает МИНИ-ФОРМУ (вложенный Modal, дом-паттерн ReportErrorButton):
 * меню «что именно непонятно» (4 причины, single-select) + необязательный комментарий.
 * Отправляет callSubmitExplainReport({phraseEn, lang, reason, comment}).
 *
 * ПОЧЕМУ не ReportErrorButton: тот хардкодит submitErrorReport (CF error_reports).
 * Нам нужен submitExplainReport (CF explain_reports). Переиспользуем ТОЛЬКО визуал
 * icon-flag (Ionicons "flag", цвет t.wrong) и каркас модалки с KeyboardAvoidingView.
 *
 * ИНВАРИАНТ: шлём phraseEn СЫРЫМ — phraseHash считает сервер. Клиент хэш НЕ вычисляет
 * (иначе нормализация задвоится с планом 01). reason сервер сверяет с белым списком.
 */
import React, { memo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KitTouchable from './KitTouchable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { callSubmitExplainReport } from '../app/explain_phrase_client';
import { asLang } from '../app/explain_phrase_request';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

interface Props {
  /**
   * Какой кэш репортим: 'phrase' (объяснение фразы, дефолт) или 'mistake' (разбор ошибки).
   */
  kind?: 'phrase' | 'mistake';
  /**
   * Для kind='phrase' — английская фраза. Для kind='mistake' — правильный ответ.
   * Сервер сам выведет хэш; клиент хэш НЕ шлёт.
   */
  phraseEn: string;
  /**
   * Для kind='mistake' — неправильный ответ юзера (кэш per-(target,userAnswer,lang)).
   */
  userAnswer?: string;
  /** Язык объяснения, на которое жалуемся (кэш per-(…,lang)). Дефолт — язык интерфейса. */
  lang?: string;
}

/** Белый список причин — зеркало REPORT_REASONS на сервере (неизвестное → unclear). */
const REPORT_REASON_KEYS = ['unclear', 'incorrect', 'wrong_language', 'other'] as const;
type ReportReasonKey = (typeof REPORT_REASON_KEYS)[number];

const COMMENT_MAX_LEN = 300;

function reasonLabel(key: ReportReasonKey, uiLang: Lang): string {
  switch (key) {
    case 'unclear':
      return triLang(uiLang, {
        ru: 'Всё равно непонятно',
        uk: 'Все одно незрозуміло',
        en: "Still unclear",
        es: 'Sigue sin estar claro',
        'pt-BR': 'Continua confuso',
        vi: 'Vẫn khó hiểu',
        id: 'Masih kurang jelas',
        tr: 'Hâlâ anlaşılmıyor',
        pl: 'Nadal niejasne',
      });
    case 'incorrect':
      return triLang(uiLang, {
        ru: 'Кажется, есть ошибка',
        uk: 'Здається, є помилка',
        en: "There seems to be a mistake",
        es: 'Parece que hay un error',
        'pt-BR': 'Parece haver um erro',
        vi: 'Có vẻ có lỗi',
        id: 'Sepertinya ada kesalahan',
        tr: 'Bir hata var gibi',
        pl: 'Chyba jest błąd',
      });
    case 'wrong_language':
      return triLang(uiLang, {
        ru: 'Не на моём языке',
        uk: 'Не моєю мовою',
        en: "Not in my language",
        es: 'No está en mi idioma',
        'pt-BR': 'Não está no meu idioma',
        vi: 'Không phải ngôn ngữ của tôi',
        id: 'Bukan bahasa saya',
        tr: 'Benim dilimde değil',
        pl: 'Nie w moim języku',
      });
    case 'other':
      return triLang(uiLang, {
        ru: 'Другое',
        uk: 'Інше',
        en: "Other",
        es: 'Otra cosa',
        'pt-BR': 'Outra coisa',
        vi: 'Khác',
        id: 'Lainnya',
        tr: 'Başka bir şey',
        pl: 'Inne',
      });
  }
}

function ExplainReportButton({ kind = 'phrase', phraseEn, userAnswer, lang: langProp }: Props) {
  // зачем: форма жалобы на разбор — Liquid Glass по макету overlays-campaigns OS-EXPLAIN-REPORT-*.
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang: ctxLang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const lang = langProp || ctxLang;
  const uiLang = asLang(lang);

  const [formOpen, setFormOpen] = useState(false);
  const [reason, setReason] = useState<ReportReasonKey>('unclear');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const openForm = () => {
    if (sent) return;
    hapticTap();
    setReason('unclear');
    setComment('');
    setFailed(false);
    setFormOpen(true);
  };

  // зачем (координатор 10.10, Optimistic UI): state sending обновляется после рендера — второй тап в том же кадре отправил бы жалобу дважды
  const sendLockRef = useRef(false);
  const handleSend = async () => {
    if (sending) return;
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    hapticTap();
    setFailed(false);
    setSending(true);
    // зачем (координатор 11.10, Optimistic UI): форма закрывается и значок «отправлено» появляется сразу, не ждём ответ сервера;
    // при сбое откат: форма открывается снова с теми же причиной и текстом и с понятной ошибкой.
    setSent(true);
    setFormOpen(false);
    try {
      await callSubmitExplainReport({
        kind,
        phraseEn,
        userAnswer: kind === 'mistake' ? userAnswer : undefined,
        lang,
        reason,
        comment: comment.trim().slice(0, COMMENT_MAX_LEN),
      });
    } catch (error: unknown) {
      // Репорт — бэкстоп-сигнал, не критичный путь. Показываем мягкую ошибку в форме,
      // юзер может повторить; наружу (в шторку) сбой не пробрасываем.
      console.warn('[EXPLAIN-REPORT] отправка: исключение — показываем «не отправилось»', error instanceof Error ? error.message : String(error));
      sendLockRef.current = false;
      setSending(false);
      setSent(false);
      setFailed(true);
      setFormOpen(true);
      return;
    }
    sendLockRef.current = false;
    setSending(false);
  };

  return (
    <>
      <KitTouchable
        onPress={openForm}
        disabled={sent}
        style={[styles.trigger, sent && styles.triggerMuted]}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel={triLang(uiLang, {
          ru: 'Сообщить, что объяснение непонятное',
          uk: 'Повідомити, що пояснення незрозуміле',
          en: "Report that the explanation is unclear",
          es: 'Informar de que la explicación no es clara',
          'pt-BR': 'Informar que a explicação está confusa',
          vi: 'Báo rằng phần giải thích khó hiểu',
          id: 'Laporkan bahwa penjelasannya kurang jelas',
          tr: 'Açıklamanın belirsiz olduğunu bildir',
          pl: 'Zgłoś, że wyjaśnienie jest niejasne',
        })}
      >
        <Ionicons name={sent ? 'checkmark-circle' : 'flag'} size={18} color={sent ? glass.text : t.wrong} />
      </KitTouchable>

      {/* Мини-форма жалобы: причина + необязательный комментарий */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* guard-ok: скрим закрывает форму по тапу вне листа; смысловые элементы внутри. */}
          <Pressable style={[styles.overlay, { paddingTop: insets.top + 8 }]} onPress={() => setFormOpen(false)} accessible={false}>
            {/* guard-ok: гасит всплытие тапа из листа в скрим. */}
            <Pressable
              accessible={false}
              style={[
                styles.formSheet,
                { backgroundColor: glass.opaqueSheet, borderColor: glass.glassEdge, shadowColor: glass.bg, paddingBottom: 24 + bottomInset },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.grabberPill, { backgroundColor: glass.mutedText }]} />
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false} decelerationRate="fast"
              >
              <Text style={[styles.formTitle, { color: glass.text, fontSize: f.h3 }]}>
                {triLang(uiLang, {
                  ru: 'Что именно непонятно?',
                  uk: 'Що саме незрозуміло?',
                  en: "What exactly is unclear?",
                  es: '¿Qué no quedó claro?',
                  'pt-BR': 'O que ficou confuso?',
                  vi: 'Điều gì khó hiểu?',
                  id: 'Apa yang kurang jelas?',
                  tr: 'Tam olarak ne anlaşılmadı?',
                  pl: 'Co dokładnie jest niejasne?',
                })}
              </Text>

              {REPORT_REASON_KEYS.map((key) => {
                const selected = reason === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      hapticTap();
                      setReason(key);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.reasonRow,
                      { borderColor: selected ? `${glass.cta}66` : glass.line, backgroundColor: selected ? glass.buttonFill : glass.opaqueCard },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? glass.text : glass.secondary}
                    />
                    <Text style={[styles.reasonLabel, { color: glass.text, fontSize: f.body }]}>
                      {reasonLabel(key, uiLang)}
                    </Text>
                  </Pressable>
                );
              })}

              <TextInput
                style={[styles.input, { color: glass.text, borderColor: glass.line, backgroundColor: glass.opaqueControl, fontSize: f.body }]}
                placeholder={triLang(uiLang, {
                  ru: 'Расскажи своими словами (необязательно)',
                  uk: 'Розкажи своїми словами (необов’язково)',
                  en: "Tell us in your own words (optional)",
                  es: 'Cuéntalo con tus palabras (opcional)',
                  'pt-BR': 'Conte com suas palavras (opcional)',
                  vi: 'Kể bằng lời của bạn (không bắt buộc)',
                  id: 'Ceritakan dengan kata-katamu (opsional)',
                  tr: 'Kendi kelimelerinle anlat (isteğe bağlı)',
                  pl: 'Opisz własnymi słowami (opcjonalnie)',
                })}
                placeholderTextColor={glass.mutedText}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={COMMENT_MAX_LEN}
                textAlignVertical="top"
              />

              {failed ? (
                <Text style={[styles.failedHint, { color: t.wrong, fontSize: f.caption }]}>
                  {triLang(uiLang, {
                    ru: 'Не отправилось. Проверь интернет и попробуй ещё раз.',
                    uk: 'Не надіслалося. Перевір інтернет і спробуй ще раз.',
                    en: "Couldn't send. Check your connection and try again.",
                    es: 'No se envió. Revisa internet e inténtalo otra vez.',
                    'pt-BR': 'Não foi enviado. Verifique a internet e tente de novo.',
                    vi: 'Chưa gửi được. Kiểm tra mạng rồi thử lại.',
                    id: 'Gagal terkirim. Periksa internet lalu coba lagi.',
                    tr: 'Gönderilemedi. İnterneti kontrol edip tekrar dene.',
                    pl: 'Nie wysłano. Sprawdź internet i spróbuj ponownie.',
                  })}
                </Text>
              ) : null}

              <View style={styles.row}>
                <KitTouchable
                  onPress={() => setFormOpen(false)}
                  style={[styles.btn, styles.btnCancel, { backgroundColor: glass.opaqueControl }]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: glass.secondary, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(uiLang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                  </Text>
                </KitTouchable>
                <KitTouchable
                  onPress={handleSend}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: sending, busy: sending }}
                  style={[styles.btn, styles.btnSend, { backgroundColor: glass.accent }, sending && styles.btnBusy]}
                >
                  <View style={styles.btnSendContent}>
                    {sending ? <ActivityIndicator size="small" color={glass.ctaInk} /> : null}
                    <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>
                      {sending
                        ? triLang(uiLang, { ru: 'Отправляем…', uk: 'Надсилаємо…', en: 'Sending…', es: 'Enviando…', 'pt-BR': 'Enviando…', vi: 'Đang gửi…', id: 'Mengirim…', tr: 'Gönderiliyor…', pl: 'Wysyłanie…' })
                        : triLang(uiLang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                    </Text>
                  </View>
                </KitTouchable>
              </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default memo(ExplainReportButton);

const styles = StyleSheet.create({
  trigger: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    padding: 4,
  },
  triggerMuted: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
    justifyContent: 'flex-end',
  },
  formSheet: {
    maxHeight: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  grabberPill: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.5,
    marginBottom: 16,
  },
  formScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  formScrollContent: {
    gap: 8,
  },
  formTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  reasonLabel: {
    flex: 1,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  failedHint: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  btnCancel: {
    flex: 1,
  },
  btnSend: {
    flex: 2,
  },
  btnBusy: {
    opacity: 0.6,
  },
  btnSendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
