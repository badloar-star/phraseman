import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';

const TEXT = {
  title: {
    ru: 'Добро пожаловать в новую версию',
    uk: 'Ласкаво просимо до нової версії',
    es: 'Te damos la bienvenida a la nueva versión',
  },
  body: {
    ru:
      'Новое: оценивайте фразы там, где учитесь и проходите квизы — так мы быстрее отделяем сильный контент от слабого.\n\n'
      + 'Изменилось: после ответа в уроке больше нет подсказок — на текущем объёме это давало слишком много некорректных подсказок. Карточки обновим — подсказки вернём.\n\n'
      + 'Арена: исправления внесены, соревнования и ранг работают стабильнее.\n\n'
      + 'Вы можете: в настройках отправить идею для улучшения приложения; если мы её реализуем — +100 осколков на ваш баланс.\n\n'
      + 'Все исправления по грамматике по вашим сообщениям попали в эту сборку.',
    uk:
      'Нове: оцінюйте фрази там, де ви навчаєтесь і проходите квізи — так ми швидше відокремимо сильний контент від слабшого.\n\n'
      + 'Змінилося: після відповіді в уроці більше немає підказок — на поточному обсязі це давало забагато некоректних підказок. Картки оновимо — підказки повернуться.\n\n'
      + 'Арена: усе виправлено — змагання та рейтинг працюють стабільніше.\n\n'
      + 'Ви можете: у налаштуваннях подати ідею для покращення застосунку; якщо ми її реалізуємо — +100 осколків на ваш баланс.\n\n'
      + 'Усі виправлення з граматики за вашими зверненнями потрапили до цього оновлення.',
    es:
      'Nuevo: valora las frases donde estudias y en los cuestionarios — así priorizamos mejor el contenido útil.\n\n'
      + 'Cambio: ya no hay pistas tras la respuesta en la lección — con el volumen actual había demasiadas pistas incorrectas. Mejoraremos las tarjetas y las pistas volverán.\n\n'
      + 'Arena: correcciones aplicadas; competición y rango van más estables.\n\n'
      + 'Puedes: en ajustes enviar una idea para mejorar la app; si la implementamos — +100 fragmentos a tu saldo.\n\n'
      + 'Las correcciones gramaticales que reportaste están en esta versión.',
  },
} as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ReleaseNotesModal({ visible, onClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  const title = useMemo(() => triLang(lang, TEXT.title), [lang]);
  const body = useMemo(() => triLang(lang, TEXT.body), [lang]);
  const dimColor = themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.62)';

  const closeOnce = () => {
    hapticTap();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeOnce}
    >
      <View style={[styles.root, { backgroundColor: dimColor, paddingBottom: insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnce}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити',
            ru: 'Закрыть',
            es: 'Cerrar',
          })}
        />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.accent }]}>
          <Text style={styles.emoji}>{'✨'}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
            bounces
          >
            <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>
          </ScrollView>
          <Pressable
            onPress={closeOnce}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: t.accent, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
              {triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  scroll: {
    alignSelf: 'stretch',
    maxHeight: 360,
    marginBottom: 4,
  },
  scrollInner: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
    alignItems: 'center',
    minHeight: 52,
  },
});
