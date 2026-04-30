import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { bundleLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { submitUserSuggestion } from './user_suggestion_submit';
import { textInputSystemEditMenuProps } from './textInputSystemMenuProps';

const COPY = {
  ru: {
    title: 'Идея для Phraseman',
    hintLead: 'Опишите коротко и по делу — так проще принять идею в работу.',
    hintBonus: 'Если идея зайдёт — +100 осколков знаний.',
    placeholder: 'Например: добавьте тёмную тему в тренажёре…',
    send: 'Отправить',
    sending: 'Отправка…',
    empty: 'Введите текст сообщения.',
    ok: 'Спасибо! Мы получили ваше сообщение.',
    throttle: 'Подождите немного перед следующей отправкой.',
    offline: 'Облако недоступно (например, Expo Go). Сообщение не сохранено.',
  },
  uk: {
    title: 'Ідея для Phraseman',
    hintLead: 'Опишіть коротко й по суті — так легше взяти ідею в роботу.',
    hintBonus: 'Якщо ідея сподобається — +100 осколків знань.',
    placeholder: 'Наприклад: додайте темну тему в тренажері…',
    send: 'Надіслати',
    sending: 'Надсилання…',
    empty: 'Введіть текст повідомлення.',
    ok: 'Дякуємо! Ми отримали ваше повідомлення.',
    throttle: 'Зачекайте трохи перед наступним надсиланням.',
    offline: 'Хмара недоступна (наприклад, Expo Go). Повідомлення не збережено.',
  },
  es: {
    title: 'Idea para Phraseman',
    hintLead: 'Descríbela en pocas palabras y ve al grano: así es más fácil que el equipo la tenga en cuenta.',
    hintBonus: 'Si encaja, puede haber hasta +100 fragmentos de conocimiento.',
    placeholder: 'Por ejemplo: modo oscuro en el entrenador…',
    send: 'Enviar',
    sending: 'Enviando…',
    empty: 'Escribe un mensaje.',
    ok: '¡Gracias! Hemos recibido tu mensaje.',
    throttle: 'Espera un momento antes de enviar otro mensaje.',
    offline: 'La nube no está disponible (p. ej., en Expo Go). No se ha guardado el mensaje.',
  },
};

export default function SuggestionScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const bl = bundleLang(lang);
  const tx = COPY[bl];

  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardPad(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardPad(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollInputIntoView = useCallback(() => {
    const delay = Platform.OS === 'ios' ? 220 : 120;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  useEffect(() => {
    if (keyboardPad <= 0) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(id);
  }, [keyboardPad]);

  const onSend = useCallback(async () => {
    hapticTap();
    const trimmed = body.trim();
    if (!trimmed) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: COPY.ru.empty,
        messageUk: COPY.uk.empty,
        messageEs: COPY.es.empty,
      });
      return;
    }
    setBusy(true);
    try {
      const name = (await AsyncStorage.getItem('user_name')) || 'unknown';
      const res = await submitUserSuggestion(trimmed, name, lang);
      if (res === 'throttled') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: COPY.ru.throttle,
          messageUk: COPY.uk.throttle,
          messageEs: COPY.es.throttle,
        });
        return;
      }
      if (res === 'offline') {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: COPY.ru.offline,
          messageUk: COPY.uk.offline,
          messageEs: COPY.es.offline,
        });
        return;
      }
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: COPY.ru.ok,
        messageUk: COPY.uk.ok,
        messageEs: COPY.es.ok,
      });
      router.back();
    } finally {
      setBusy(false);
    }
  }, [body, lang, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 2 : 0}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} numberOfLines={2}>
            {tx.title}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 28 + keyboardPad,
            flexGrow: 1,
          }}
        >
          <View
            style={{
              backgroundColor: t.bgCard,
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <Text style={{ fontSize: f.body, marginRight: 8 }}>💎</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: f.body * 1.35 }}>
                  {tx.hintLead}
                </Text>
                <Text
                  style={{
                    color: t.correct,
                    fontSize: f.caption,
                    marginTop: 8,
                    fontWeight: '700',
                    lineHeight: f.caption * 1.35,
                  }}
                >
                  {tx.hintBonus}
                </Text>
              </View>
            </View>
          </View>

          <TextInput
            {...textInputSystemEditMenuProps}
            value={body}
            onChangeText={setBody}
            onFocus={scrollInputIntoView}
            placeholder={tx.placeholder}
            placeholderTextColor={t.textGhost}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 180,
              maxHeight: 320,
              backgroundColor: t.bgCard,
              borderRadius: 14,
              padding: 14,
              fontSize: f.body,
              color: t.textPrimary,
              borderWidth: 1,
              borderColor: t.border,
            }}
          />

          <TouchableOpacity
            onPress={onSend}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              marginTop: 18,
              backgroundColor: busy ? t.textGhost : t.correct,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {busy ? <ActivityIndicator color={t.correctText} /> : null}
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
              {busy ? tx.sending : tx.send}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
