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
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { callSubmitExplainReport } from '../app/explain_phrase_client';
import { asLang } from '../app/explain_phrase_request';

interface Props {
  /**
   * Какой кэш репортим: 'phrase' (объяснение фразы, дефолт), 'mistake' (разбор ошибки) или
   * 'quiz' (ИИ-разбор тематического квиза). От kind зависит, какую кэш-запись затронет жалоба.
   */
  kind?: 'phrase' | 'mistake' | 'quiz';
  /**
   * Для kind='phrase' — английская фраза. Для kind='mistake'/'quiz' — ПРАВИЛЬНЫЙ (целевой) ответ.
   * Сервер сам выведет хэш; клиент хэш НЕ шлёт.
   */
  phraseEn: string;
  /**
   * Для kind='mistake' — неправильный ответ юзера (кэш per-(target,userAnswer,lang)).
   * Для kind='quiz' — необязательно: выбранный вариант (контекст для админа).
   */
  userAnswer?: string;
  /**
   * Только для kind='quiz': ВСЕ варианты вопроса (правильный + неверные). Кэш квиза
   * per-(correct, option-set, lang) — без набора жалоба попадёт не в тот док.
   */
  choices?: string[];
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
        es: 'Otra cosa',
        'pt-BR': 'Outra coisa',
        vi: 'Khác',
        id: 'Lainnya',
        tr: 'Başka bir şey',
        pl: 'Inne',
      });
  }
}

function ExplainReportButton({ kind = 'phrase', phraseEn, userAnswer, choices, lang: langProp }: Props) {
  const { theme: t, f } = useTheme();
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

  const handleSend = async () => {
    if (sending) return;
    hapticTap();
    setFailed(false);
    setSending(true);
    try {
      await callSubmitExplainReport({
        kind,
        phraseEn,
        // userAnswer: для разбора ошибки — обязателен (per-(target,userAnswer,lang));
        // для квиза — необязательный контекст (выбранный вариант).
        userAnswer: kind === 'mistake' || kind === 'quiz' ? userAnswer : undefined,
        // choices: только для квиза — весь набор вариантов (кэш per-(correct, option-set, lang)).
        choices: kind === 'quiz' ? choices : undefined,
        lang,
        reason,
        comment: comment.trim().slice(0, COMMENT_MAX_LEN),
      });
    } catch {
      // Репорт — бэкстоп-сигнал, не критичный путь. Показываем мягкую ошибку в форме,
      // юзер может повторить; наружу (в шторку) сбой не пробрасываем.
      setSending(false);
      setFailed(true);
      return;
    }
    setSending(false);
    setSent(true);
    setFormOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openForm}
        disabled={sent}
        style={[styles.trigger, sent && styles.triggerMuted]}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel={triLang(uiLang, {
          ru: 'Сообщить, что объяснение непонятное',
          uk: 'Повідомити, що пояснення незрозуміле',
          es: 'Informar de que la explicación no es clara',
          'pt-BR': 'Informar que a explicação está confusa',
          vi: 'Báo rằng phần giải thích khó hiểu',
          id: 'Laporkan bahwa penjelasannya kurang jelas',
          tr: 'Açıklamanın belirsiz olduğunu bildir',
          pl: 'Zgłoś, że wyjaśnienie jest niejasne',
        })}
      >
        <Ionicons name={sent ? 'checkmark-circle' : 'flag'} size={18} color={sent ? t.accent : t.wrong} />
      </TouchableOpacity>

      {/* Мини-форма жалобы: причина + необязательный комментарий */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.overlay} onPress={() => setFormOpen(false)}>
            <Pressable
              style={[
                styles.formSheet,
                { backgroundColor: t.bgCard, borderColor: t.border, paddingBottom: 24 + bottomInset },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.formTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                {triLang(uiLang, {
                  ru: 'Что именно непонятно?',
                  uk: 'Що саме незрозуміло?',
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
                      { borderColor: selected ? t.accent : t.border, backgroundColor: selected ? `${t.accent}14` : t.bgSurface2 },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? t.accent : t.textMuted}
                    />
                    <Text style={[styles.reasonLabel, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={2}>
                      {reasonLabel(key, uiLang)}
                    </Text>
                  </Pressable>
                );
              })}

              <TextInput
                style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.bgSurface, fontSize: f.body }]}
                placeholder={triLang(uiLang, {
                  ru: 'Расскажи своими словами (необязательно)',
                  uk: 'Розкажи своїми словами (необов’язково)',
                  es: 'Cuéntalo con tus palabras (opcional)',
                  'pt-BR': 'Conte com suas palavras (opcional)',
                  vi: 'Kể bằng lời của bạn (không bắt buộc)',
                  id: 'Ceritakan dengan kata-katamu (opsional)',
                  tr: 'Kendi kelimelerinle anlat (isteğe bağlı)',
                  pl: 'Opisz własnymi słowami (opcjonalnie)',
                })}
                placeholderTextColor={t.textSecond}
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
                <TouchableOpacity onPress={() => setFormOpen(false)} style={styles.btnCancel}>
                  <Text style={{ color: t.textSecond, fontSize: f.body }}>
                    {triLang(uiLang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={sending}
                  style={[styles.btnSend, { backgroundColor: !sending ? t.accent : t.border }]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={t.textPrimary} />
                  ) : (
                    <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                      {triLang(uiLang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    minWidth: 32,
    minHeight: 32,
    padding: 4,
  },
  triggerMuted: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  formTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reasonLabel: {
    flex: 1,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 84,
    textAlignVertical: 'top',
    marginTop: 2,
  },
  failedHint: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  btnCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  btnSend: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
});
