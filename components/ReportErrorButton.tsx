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
import { triLang } from '../constants/i18n';
import { ERROR_REPORT_COMMENT_MIN_LEN, submitErrorReport } from '../app/error_report';
import XpGainBadge from './XpGainBadge';

interface Props {
  screen: string;
  /** машинно-читаемый ключ для поиска в коде: "lesson_5_phrase_42", "irregular_verb_go" */
  dataId: string;
  /** человекочитаемый текст: фраза, вопрос, слово */
  dataText?: string;
  style?: object;
  onSuccess?: (xpGained: number) => void;
  /** Только красный флаг без подписи (напр. угол карточки описания) */
  variant?: 'default' | 'icon-flag';
  accessibilityLabel?: string;
}

const SCREEN_CATEGORIES: Record<string, { key: string; label: string }[]> = {
  lesson: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'audio',         label: 'Проблема с аудио|Проблема з аудіо|Problema con el audio' },
    { key: 'hint',          label: 'Неверная подсказка к уроку|Неправильна підказка до уроку|Pista equivocada en la lección' },
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
    { key: 'audio',         label: 'Проблема с аудио|Проблема з аудіо|Problema con el audio' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  lesson_words: [
    { key: 'wrong_answer',  label: 'Неверный правильный ответ|Неправильна правильна відповідь|La opción marcada como correcta es errónea' },
    { key: 'typo',          label: 'Опечатка / ошибка в тексте|Друкарська помилка / помилка в тексті|Error ortográfico o en el texto' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
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
  dialogs: [
    { key: 'typo',          label: 'Ошибка в тексте реплики|Помилка в тексті репліки|Error en el texto de la réplica' },
    { key: 'translation',   label: 'Неточный перевод|Неточний переклад|Traducción inexacta' },
    { key: 'logic_bug',     label: 'Логика диалога сломана|Логіка діалогу зламана|La lógica del diálogo no encaja' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  theory: [
    { key: 'explanation',   label: 'Ошибка в объяснении|Помилка в поясненні|Fallo en la explicación' },
    { key: 'typo',          label: 'Опечатка в тексте|Друкарська помилка в тексті|Error ortográfico en el texto' },
    { key: 'example',       label: 'Неточный пример|Неточний приклад|Ejemplo inexacto' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
  faq: [
    { key: 'outdated',      label: 'Неточный / устаревший ответ|Неточна / застаріла відповідь|Respuesta inexacta u obsoleta' },
    { key: 'typo',          label: 'Опечатка в тексте|Друкарська помилка в тексті|Error ortográfico en el texto' },
    { key: 'incomplete',    label: 'Вопрос не раскрыт|Питання не розкрито|La pregunta no queda resuelta' },
    { key: 'ui_bug',        label: 'Баг интерфейса|Баг інтерфейсу|Fallo de la interfaz' },
    { key: 'other',         label: 'Другое|Інше|Otro' },
  ],
};

function getCategoriesForScreen(screen: string) {
  if (screen.startsWith('lesson_') && !screen.includes('words') && !screen.includes('irregular')) {
    return SCREEN_CATEGORIES.lesson;
  }
  for (const key of Object.keys(SCREEN_CATEGORIES)) {
    if (screen.includes(key)) return SCREEN_CATEGORIES[key];
  }
  return SCREEN_CATEGORIES.lesson;
}

export default function ReportErrorButton({
  screen,
  dataId,
  dataText,
  style,
  onSuccess,
  variant = 'default',
  accessibilityLabel,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const maxSheetHeight = Math.max(360, Dimensions.get('window').height - insets.top - 12);
  const categories = getCategoriesForScreen(screen).map(cat => {
    const parts = cat.label.split('|');
    const labelRU = parts[0] ?? '';
    const labelUK = parts[1] ?? labelRU;
    const labelES = parts[2] ?? labelRU;
    return {
      ...cat,
      label: triLang(lang, { ru: labelRU, uk: labelUK, es: labelES }),
    };
  });
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
  });

  return (
    <>
      <TouchableOpacity
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
            style={[styles.triggerText, { color: t.textSecond, fontSize: f.sub }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {triLang(lang, {
              ru: 'Сообщить о баге',
              uk: 'Повідомити про баг',
              es: 'Informar de un fallo',
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
                  })}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Вы уже отправили репорт меньше минуты назад. Попробуйте через минуту.',
                    uk: 'Ви вже надіслали репорт менше хвилини тому. Спробуйте за хвилину.',
                    es: 'Enviaste un informe hace menos de un minuto. Espera un momento antes de volver a intentarlo.',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                >
                  <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>{triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}</Text>
                </TouchableOpacity>
              </View>
            ) : sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={[styles.successTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
                  {triLang(lang, { ru: 'Сообщение принято!', uk: 'Повідомлення прийнято!', es: '¡Mensaje recibido!' })}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Если баг подтвердится — получишь 💎 Осколок.',
                    uk: 'Якщо баг підтвердиться — отримаєш 💎 Осколок.',
                    es: 'Si confirmamos el fallo, recibirás un fragmento de conocimiento (💎).',
                  })}
                </Text>
                <XpGainBadge amount={10} visible={sent} />
                <TouchableOpacity
                  onPress={() => { setVisible(false); onSuccess?.(10); }}
                  style={[styles.btnSend, { backgroundColor: t.accent, marginTop: 8, alignSelf: 'stretch' }]}
                >
                  <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
                    {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
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
                  })}
                </Text>
                <Text style={[styles.sub, { color: t.textSecond, fontSize: f.sub }]}>
                  {triLang(lang, {
                    ru: 'Выберите тип проблемы — мы исправим как можно скорее',
                    uk: 'Оберіть тип проблеми — ми виправимо якомога швидше',
                    es: 'Elige el tipo de problema y lo revisaremos cuanto antes.',
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
                  placeholder={triLang(lang, { ru: 'Комментарий', uk: 'Коментар', es: 'Comentario' })}
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
                      {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!selected || sending}
                    style={[styles.btnSend, { backgroundColor: selected ? t.accent : t.border }]}
                  >
                    <Text style={{ color: selected ? t.correctText : t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                      {sending
                        ? triLang(lang, { ru: 'Отправка...', uk: 'Надсилання...', es: 'Enviando...' })
                        : triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar' })}
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
